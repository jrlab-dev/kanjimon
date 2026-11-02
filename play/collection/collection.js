/* Collection goals use the existing game state and never write save data. */
(function () {
  'use strict';
  const names = ['トウキョウ', 'カントウ', 'カンサイ／シコク', 'チュウブ', 'トウホク／ホッカイドウ', 'チュウゴク／キュウシュウ／オキナワ'];
  let selectedGrade = 0, selectedZone = 0, initialized = false;
  let root, modal, previousFocus = null;
  let inertBefore = [], overflowBefore = null;
  let lastCaught = new Set(caught), lastRef = caught, pendingNotice = false;
  const announced = new Set();
  const en = () => !!window.KanjimonGameI18n?.active;
  const tr = (ja, eng) => en() ? eng : ja;
  const escape = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function split(indices) {
    const items = Array.from(indices || []), result = [];
    if (!items.length) return result;
    while (items.length > 5) {
      result.push(items.splice(0, 3));
    }
    if (items.length) result.push(items);
    return result;
  }
  function stats(indices) {
    const items = Array.from(new Set(indices || []));
    const count = items.filter(i => caught.has(i)).length, total = items.length;
    const percent = total ? Math.floor(count * 100 / total) : 0, complete = total > 0 && count === total;
    return {count, total, remaining: total - count, percent, pct:percent, complete, full:complete, isFull:complete};
  }
  function gradeFor(zone) { return GRADE_ZONES.find(g => zone >= g.from && zone <= g.to)?.grade || 1; }
  function gradeLabel(g) { return en() ? 'Grade ' + g : g + 'ねん・' + names[g - 1]; }
  function gradeLabelHtml(g) { return gradeLabel(g).split(/([・／])/).map(part=>/^[・／]$/.test(part)?part+'<wbr>':'<span class="col-region-part">'+escape(part)+'</span>').join(''); }
  function zoneLabel(z) { return z + '　' + STAGE_DEFS[z - 1].name; }
  function validDate(grade) {
    const value = gradeCeremonySeen[grade] || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
  }
  function certificateAvailable(grade) { return grade >= 1 && grade <= 6 && validDate(grade) && (grade !== 6 || zone102CertificateReceived); }
  function nextRank(s) {
    if (s.complete) return tr('ぜんぶ なかま！', 'All friends!');
    const target = [20, 40, 60, 80, 100].find(n => n > s.percent) || 100;
    return tr('つぎの しょうごうまで あと ', 'Next title: ') + Math.max(0, Math.ceil(s.total * target / 100) - s.count) + tr('しゅるい', ' more');
  }
  function face(i, small) {
    if (!caught.has(i)) return '<span class="col-face col-unknown'+(small?' col-face-small':'')+'" aria-label="'+tr('まだ','Not found')+'">？</span>';
    const k = K[i];
    if (!k) return '';
    return '<span class="col-face face-host'+(small?' col-face-small':'')+'"><span class="fc" style="color:'+escape(k.cl)+'">'+escape(k.c)+'</span><span class="face normal"><span class="eyes"><span class="eye"></span><span class="eye"></span></span><span class="mouth"></span><span class="cheek l"></span><span class="cheek r"></span></span></span>';
  }
  function snapshot() {
    return {grade:selectedGrade, zone:selectedZone, grades:GRADE_ZONES.map(g=>({grade:g.grade,...stats(gradeIndices(g.grade))})), zones:STAGE_DEFS.map((sd,i)=>({zone:i+1,...stats(sd.indices),sets:split(sd.indices).map(stats)}))};
  }
  function init() {
    if (root) return;
    const grid = document.getElementById('zGrid');
    if (!grid) return;
    root = document.createElement('div'); root.className = 'col-root'; root.id = 'collectionGoals';
    document.querySelector('#screen-zukan .zukan-head').before(root);
    modal = document.createElement('div'); modal.className = 'col-backdrop'; modal.hidden = true;
    modal.innerHTML = '<div class="col-dialog" role="dialog" aria-modal="true" tabindex="-1"><div class="col-dialog-body"></div><button type="button" class="col-close"></button></div>';
    document.body.appendChild(modal);
    new MutationObserver(() => {
      if (!modal.hidden && !document.getElementById('screen-zukan')?.classList.contains('active')) closeModal();
    }).observe(document.getElementById('screen-zukan'), {attributes:true, attributeFilter:['class']});
    modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('.col-close')) closeModal(); });
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
      if (event.key !== 'Tab') return;
      const list = [...modal.querySelectorAll('button:not([disabled]), [href], select, [tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden);
      if (!list.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === list[0]) { event.preventDefault(); list[list.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === list[list.length - 1]) { event.preventDefault(); list[0].focus(); }
    });
    root.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      if (button.dataset.grade !== undefined) { selectedGrade = Number(button.dataset.grade); selectedZone = 0; renderZukan(); }
      else if (button.dataset.memory) openMemory(Number(button.dataset.memory));
      else if (button.dataset.certificate) openCertificate(Number(button.dataset.certificate));
    });
    root.addEventListener('change', event => {
      if (event.target.matches('.col-zone-select')) { selectedZone = Number(event.target.value); renderZukan(); }
    });
  }
  function openModal(html) {
    init(); if (!modal) return;
    if (!modal.hidden) closeModal();
    previousFocus = document.activeElement;
    modal.querySelector('.col-dialog-body').innerHTML = html;
    modal.querySelector('.col-close').textContent = tr('とじる', 'Close');
    inertBefore = [...document.body.children].filter(el=>el !== modal).map(el=>({el, inert:el.inert}));
    inertBefore.forEach(item=>{ item.el.inert = true; });
    overflowBefore = {body:document.body.style.overflow, html:document.documentElement.style.overflow};
    document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden';
    modal.hidden = false;
    modal.querySelector('.col-close').focus({preventScroll:true});
    modal.querySelector('.col-dialog').scrollTop = 0;
    modal.querySelector('.col-dialog-body').scrollTop = 0;
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.querySelector('.col-dialog-body').replaceChildren();
    inertBefore.forEach(item=>{ item.el.inert = item.inert; }); inertBefore = [];
    if (overflowBefore) { document.body.style.overflow = overflowBefore.body; document.documentElement.style.overflow = overflowBefore.html; overflowBefore = null; }
    if (previousFocus && previousFocus.isConnected && document.getElementById('screen-zukan')?.classList.contains('active')) previousFocus.focus();
    previousFocus = null;
  }
  function openMemory(zone) {
    zone = Number(zone); if (!Number.isInteger(zone) || zone < 1 || zone > STAGE_DEFS.length) return false;
    const sd = STAGE_DEFS[zone - 1], state = stats(sd.indices), grade = gradeFor(zone);
    openModal('<h2 id="col-modal-title">'+escape(zoneLabel(zone))+'</h2><p>'+tr('いまの なかま', 'Current friends')+'　'+state.count+'／'+state.total+'</p><div class="col-memory col-grade-'+grade+'"><img class="col-memory-bg" alt=""><div class="col-memory-shade"></div><div class="col-memory-content"><div class="col-medal '+(state.complete?'is-complete':'')+'">'+zone+'</div><div class="col-memory-faces">'+sd.indices.map(i=>face(i)).join('')+'</div></div></div><p>'+ (state.complete ? tr('ぜんいん そろったね！','Everyone is here!') : tr('あと '+state.remaining+'しゅるい',''+state.remaining+' more to collect')) +'</p>');
    modal.querySelector('.col-dialog').setAttribute('aria-labelledby', 'col-modal-title');
    const image = modal.querySelector('.col-memory-bg');
    image.addEventListener('error', () => { image.hidden = true; }, {once:true});
    const file = zoneFullartOf(zone);
    if (file) image.src = 'images/fullart/' + file; else image.hidden = true;
    return true;
  }
  function openCertificate(grade) {
    grade = Number(grade); if (!Number.isInteger(grade) || !certificateAvailable(grade)) return false;
    const rank = sjRankInfo(grade), date = sjFormatDate(gradeCeremonySeen[grade]);
    const player = playerName ? '<div class="sj-name">'+escape(playerName)+(en()?'':' さん')+'</div>' : '';
    openModal('<div class="sj-paper col-certificate '+(rank.isFull?'kami':'')+'"><div class="sj-title" id="col-modal-title">'+tr('しょうじょう','Certificate')+'</div>'+(rank.isFull?'<div class="sj-star">★</div>':'')+player+'<div class="sj-rank">'+escape(rank.rankText)+'</div><div class="sj-body">'+(en()?'Completed the Grade '+grade+' adventure':grade+'ねんせいの ぼうけんを やりとげました')+'</div><div class="sj-count">'+tr('なかまに なった かんじ','Friends')+'　'+'<span>'+rank.count+'／'+rank.total+'</span></div><div class="sj-chars">'+gradeIndices(grade).map(sjCharCellHtml).join('')+'</div><div class="sj-date">'+escape(date)+'</div><div class="sj-foot">'+tr('おうちの ひとに みせよう！','Show your family!')+'</div></div>');
    modal.querySelector('.col-dialog').setAttribute('aria-labelledby', 'col-modal-title');
    return true;
  }
  function renderGoals() {
    init(); if (!root) return;
    if ([...lastCaught].some(i=>!caught.has(i))) pendingNotice = false;
    if (caught !== lastRef) { lastCaught = new Set(caught); lastRef = caught; initialized = false; pendingNotice = false; }
    root.hidden = zukanTab !== 'kanji';
    if (root.hidden) return;
    if (!initialized) {
      const current = Number.isInteger(curStage) && curStage >= 1 && curStage <= unlocked ? curStage : unlocked;
      selectedZone = Math.max(1, Math.min(STAGE_DEFS.length, current));
      selectedGrade = gradeFor(selectedZone); initialized = true;
    }
    const grades = GRADE_ZONES.map(g => {
      const s = stats(gradeIndices(g.grade));
      const full = gradeLabel(g.grade), short = en() ? 'G'+g.grade : g.grade+'ねん';
      return '<button type="button" class="col-grade-button '+(selectedGrade===g.grade?'selected':'')+'" data-grade="'+g.grade+'" title="'+escape(full)+'" aria-label="'+escape(full)+' '+s.percent+'%" aria-pressed="'+(selectedGrade===g.grade)+'"><span>'+short+'</span><b>'+s.percent+'%</b></button>';
    }).join('');
    const scope = selectedZone ? STAGE_DEFS[selectedZone - 1].indices : selectedGrade ? gradeIndices(selectedGrade) : K.map((_,i)=>i);
    const indices = new Set(scope);
    document.querySelectorAll('#zGrid > *').forEach((el,i) => { el.hidden = !indices.has(i); });
    const scopeStats = stats(scope), both = [...indices].filter(i=>caught.has(i) && shiny.has(i)).length;
    const sleeping = [...indices].filter(i=>bodies.has(i)).length;
    document.getElementById('zCount').textContent = tr('ゲット：','Got: ')+scopeStats.count+'／'+scopeStats.total;
    document.getElementById('zBothCount').textContent = tr('✨りょうほう：','✨Both: ')+both+tr('　　ねむっている子：','　Sleeping: ')+sleeping;
    let section = '';
    if (selectedGrade) {
      const gradeStats = stats(gradeIndices(selectedGrade)), info = sjRankInfo(selectedGrade), gz = GRADE_ZONES.find(g=>g.grade===selectedGrade);
      let options = '<option value="0">'+tr('このがくねん ぜんぶ','All in grade')+'</option>';
      for(let z=gz.from;z<=gz.to;z++) options += '<option value="'+z+'" '+(selectedZone===z?'selected':'')+'>'+escape(zoneLabel(z))+(z>unlocked?tr('（まだ いけない）',' (locked)'):'')+'</option>';
      const cert = certificateAvailable(selectedGrade) ? '<button class="col-action" data-certificate="'+selectedGrade+'">'+tr('しょうじょうを みる','View certificate')+'</button>' : '<span class="col-hint">'+(selectedGrade===6?tr('ぼうけんを クリアして しょうじょうを とじると みられるよ','Complete the adventure and close the certificate to view it.'):tr('このがくねんの ぼうけんを クリアすると しょうじょうが もらえるよ','Complete this grade adventure to receive a certificate.'))+'</span>';
      section += '<div class="col-grade-summary '+(gradeStats.complete?'col-gold':'')+'"><div class="col-summary-line"><strong>'+gradeLabelHtml(selectedGrade)+'</strong><b>'+gradeStats.count+'／'+gradeStats.total+'　'+gradeStats.percent+'%</b></div><div class="col-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+gradeStats.percent+'"><span style="width:'+gradeStats.percent+'%"></span></div><div>'+escape(info.rankText)+' · '+escape(nextRank(gradeStats))+'</div>'+cert+'</div><label class="col-select-label">'+tr('ばしょを えらぶ','Choose a place')+'<select class="col-zone-select">'+options+'</select></label>';
      if (selectedZone) {
        const sd = STAGE_DEFS[selectedZone-1], state = stats(sd.indices), sets = split(sd.indices), next = sets.find(s=>!stats(s).complete);
        section += '<div class="col-field"><div class="col-summary-line"><strong>'+escape(zoneLabel(selectedZone))+'</strong><b>'+state.count+'／'+state.total+'</b></div><p>'+ (next ? tr('つぎの スタンプまで あと '+stats(next).remaining+'しゅるい',stats(next).remaining+' more for the next stamp') : tr('スタンプ ぜんぶ そろった！','All stamps collected!')) +'</p><div class="col-sets">'+sets.map((set,i)=>{const st=stats(set); return '<div class="col-set '+(st.complete?'is-complete':'')+'"><div><b>'+tr('セット','Set')+' '+(i+1)+'</b><span class="col-stamp">'+(st.complete?'★':'☆')+'</span></div><div class="col-set-faces">'+set.map(x=>face(x,true)).join('')+'</div><small>'+(st.complete?tr('そろった！','Complete!'):tr('あと '+st.remaining,'Need '+st.remaining))+'</small></div>';}).join('')+'</div><button class="col-action" data-memory="'+selectedZone+'">'+tr('きねんの 1まい','Memory picture')+'</button></div>';
      }
      section += '<details class="col-medals"><summary>'+tr('このがくねんの くんしょう','Grade medals')+'</summary><div class="col-medal-list">';
      for(let z=gz.from;z<=gz.to;z++) { const s=stats(STAGE_DEFS[z-1].indices); section += '<button type="button" class="col-medal-entry" data-memory="'+z+'" aria-label="'+escape(zoneLabel(z))+' '+s.count+'/'+s.total+'"><span class="col-medal '+(s.complete?'is-complete':'')+' col-grade-'+selectedGrade+'">'+z+'</span><small>'+s.count+'/'+s.total+'</small></button>'; }
      section += '</div><p class="col-hint">'+tr('くんしょうを おすと きねんの 1まいが みられるよ','Choose a medal to see the picture.')+'</p></details>';
    }
    root.innerHTML = '<div class="col-guide"><img src="images/sprites/hakase-face.webp" alt="" onerror="this.hidden=true"><span>'+tr('なかまを あつめて スタンプを そろえよう！<br>いまの なかまで あつめよう','Collect friends to earn stamps!<br>Progress uses your current friends.')+'</span></div><div class="col-grade-nav" aria-label="'+tr('がくねん','Grade')+'"><button type="button" class="col-grade-button '+(!selectedGrade?'selected':'')+'" data-grade="0" title="'+tr('ぜんぶ','All')+'" aria-pressed="'+(!selectedGrade)+'"><span>'+tr('ぜんぶ','All')+'</span></button>'+grades+'</div>'+section;
    if (pendingNotice && document.getElementById('screen-zukan')?.classList.contains('active') && (!modal || modal.hidden)) {
      pendingNotice = false;
      showToast(tr('スタンプや くんしょうが そろったよ！','A stamp or medal is complete!'));
    }
  }
  const originalRender = renderZukan;
  renderZukan = function () { const result = originalRender.apply(this, arguments); renderGoals(); return result; };
  function refresh() { renderZukan(); }
  function completedKeys(set) {
    const result = new Set();
    STAGE_DEFS.forEach((sd,i) => {
      split(sd.indices).forEach((group,j) => { if(group.length && group.every(x=>set.has(x))) result.add('s'+i+':'+j); });
      if(sd.indices.length && sd.indices.every(x=>set.has(x))) result.add('z'+i);
    });
    GRADE_ZONES.forEach(g => { const indices=gradeIndices(g.grade); if(indices.length && indices.every(i=>set.has(i))) result.add('g'+g.grade); });
    return result;
  }
  function poll() {
    if (caught === lastRef && caught.size === lastCaught.size && [...caught].every(i=>lastCaught.has(i))) return;
    const added = [...caught].filter(i=>!lastCaught.has(i));
    const removed = [...lastCaught].some(i=>!caught.has(i));
    const replaced = caught !== lastRef;
    const reset = replaced || removed || added.length === 0;
    const before = completedKeys(lastCaught), after = completedKeys(caught);
    const fresh = [...after].filter(key=>!before.has(key) && !announced.has(key));
    lastCaught = new Set(caught); lastRef = caught;
    if (reset) { pendingNotice = false; if (replaced) initialized = false; return; }
    fresh.forEach(key=>announced.add(key));
    if (fresh.length) pendingNotice = true;
    const screen = document.getElementById('screen-zukan');
    if (fresh.length && screen?.classList.contains('active') && zukanTab === 'kanji' && (!modal || modal.hidden)) {
      renderZukan();
    }
  }
  window.KanjimonCollection = {split, stats, refresh, openMemory, openCertificate, snapshot};
  window.setInterval(poll, 1200);
})();
