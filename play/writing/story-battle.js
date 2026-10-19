/* Handwriting battle controller. Story progression is handled by story-outcome. */
(function(){
  'use strict';
  let session=null,pad=null,engine=null,templates=null,hintTimer=null;
  const el=id=>document.getElementById('wb-'+id);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const active=s=>session===s&&s.seq===spawnSeq&&$('screen-battle').classList.contains('active');
  const simple=()=>battleMode==='simple'&&!isTamashii&&!isJukugoBoss&&!isTwinBoss;
  function sample(){
    if(engine)return;
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    templates=Object.fromEntries(Object.entries(window.KAKITORI_STROKES).map(([c,ds])=>[c,ds.map(d=>{
      path.setAttribute('d',d);const len=path.getTotalLength(),n=Math.max(12,Math.ceil(len/2));
      return Array.from({length:n},(_,i)=>{const p=path.getPointAtLength(len*i/(n-1));return{x:p.x,y:p.y};});
    })]));
    engine=KanjimonWritingRecognizer.createEngine(templates);
  }
  function clearHint(){clearTimeout(hintTimer);hintTimer=null;pad?.setGuide([]);}
  function cancel(){clearHint();pad?.destroy();pad=null;session=null;el('play')?.remove();$('screen-battle').classList.remove('writing-battle');}
  function controls(){
    const busy=!session||session.phase!=='writing'||itemUseMode||!isTamashii&&!simple()&&selectedAttacker==null;
    for(const name of ['submit','clear','undo'])if(el(name))el(name).disabled=busy;
    pad?.setEnabled(!busy);
  }
  function damage(att){
    const lv=curStage===1&&enemyIsBoss?9:(isTwinBoss||isJukugoBoss?capOfZone(curStage):enemyLevelFor(enemyIdx,enemyIsBoss));
    return damageForMatch(levelOf(att),lv,affinity(typeOf(att),enemyType))*2;
  }
  function roster(){
    phase='writing';renderParty();
    const s=session;if(!s)return;
    $('partyRow').style.display=isTamashii?'none':'';
    for(const b of $('partyRow').querySelectorAll('.pbtn')){
      const idx=Number(b.dataset.idx),fc=b.querySelector('.fc');
      const hiddenWord=isTwinBoss?(()=>{const d=twinBossBattleDefOf(twinBossZoneCur);return d.first+d.second;})():s.question.word;
      if(fc&&hiddenWord.includes(K[idx].c)&&s.phase!=='won'){
        fc.textContent=K[idx].y.split('／')[0];fc.parentElement.classList.add('writing-same-answer');
      }
      b.disabled=s.phase!=='writing';
      b.onclick=()=>{if(s.phase!=='writing')return;if(itemUseMode){recover(idx);return;}if(genkiOf(idx)<=GENKI_TIRED&&curStage<=AUTO_SWAP_MAX_ZONE){genkiRejectTap(idx);return;}selectedAttacker=idx;roster();controls();};
    }
    if(!isTamashii&&battleMode==='party'&&items.genkidama>0){
      const button=document.createElement('button');button.className='genki-item-btn'+(itemUseMode?' arming':'');
      button.textContent='🍙×'+items.genkidama;button.setAttribute('aria-label','げんきだま '+items.genkidama+'こ');button.disabled=s.phase!=='writing';
      button.onclick=()=>{if(!active(s)||s.phase!=='writing')return;itemUseMode=!itemUseMode;el('status').textContent=itemUseMode?'かいふくする なかまを えらんでね。':'つづきを かこう。';roster();controls();};
      $('partyRow').append(button);
    }
    updateBattleHud();
    if(el('power'))el('power').textContent=isTamashii?'1もじ かいて たましいを もどそう':simple()?'かんじを かいて なかまに しよう':selectedAttacker==null?'こうげきする なかまを えらぼう':'こうげき '+damage(selectedAttacker);
  }
  function recover(idx){
    const s=session;if(!s||!active(s)||s.phase!=='writing'||!itemUseMode||items.genkidama<=0)return;
    if(genkiOf(idx)>=genkiMaxOf(idx)){el('status').textContent='この なかまは げんき いっぱいだよ。';return;}
    s.phase='recovering';itemUseMode=false;items.genkidama--;genki[idx]=genkiMaxOf(idx);roster();controls();
    KanjimonStoryOutcome.checkpoint(()=>{if(!active(s))return;s.phase='writing';choose();roster();controls();el('status').textContent='げんきに なった！ つづきを かこう。';});
  }
  function choose(){
    if(isTamashii||simple())return;
    const fresh=party.filter(i=>genkiOf(i)>GENKI_TIRED);
    if(!fresh.length){selectedAttacker=null;el('status').textContent=party.length?'みんな ヘトヘト。おわって やすもう。':'てもちが いないよ。おわって なかまを えらぼう。';return;}
    if(autoPick||!fresh.includes(selectedAttacker))selectedAttacker=fresh.reduce((a,b)=>damage(b)>damage(a)?b:a);
  }
  function slots(){
    const s=session,box=el('slots');box.replaceChildren();
    if(s.question.word.length===1)return;
    [...s.question.word].forEach((_,i)=>{
      const c=document.createElement('canvas');c.width=c.height=109;c.setAttribute('aria-label',(i+1)+'もじめ'+(i<s.cursor?' かけた':''));
      if(i===s.cursor)c.className='wb-current';box.append(c);
      const ctx=c.getContext('2d');ctx.strokeStyle='#224c37';ctx.lineWidth=3;ctx.lineCap='round';
      for(const st of s.ink[i]||[]){ctx.beginPath();st.forEach((p,j)=>j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
    });
  }
  function prompt(){
    const s=session,q=s.question;clearHint();pad.clear();s.phase='writing';answering=false;
    setMsg('<span id="wb-question"></span><small id="wb-instruction"></small>');
    const focus=document.createElement('mark');focus.textContent=q.focus;
    el('question').replaceChildren(document.createTextNode(q.before),focus,document.createTextNode(q.after));
    el('instruction').textContent=(q.word.length>1?(s.cursor+1)+'もじめを かこう。':'かんじを 1もじ かこう。')+(q.note?' '+q.note:'');
    slots();choose();roster();controls();hideAnswers();
  }
  function nextQuestion(){const s=session;s.turn++;s.cursor=0;s.ink=[];s.misses=0;s.question=KanjimonStoryQuestions.current(s.turn);prompt();}
  function hint(){
    const s=session;if(s.misses<3)return;
    clearHint();s.assisted=true;pad.setGuide(templates[[...s.question.word][s.cursor]]);
    if(s.misses<6){const cursor=s.cursor,turn=s.turn;hintTimer=setTimeout(()=>{if(active(s)&&cursor===s.cursor&&turn===s.turn)clearHint();},(s.misses-2)*1000);}
  }
  async function submit(){
    const s=session;if(!s||s.phase!=='writing'||itemUseMode||pad.isDrawing()||!isTamashii&&!simple()&&selectedAttacker==null)return;
    s.phase='evaluating';controls();const cursor=s.cursor,strokes=pad.getStrokes();
    await wait(0);if(!active(s)||s.cursor!==cursor)return;
    const result=engine.judge(strokes,[...s.question.word][cursor]);
    if(result.status!=='correct'){
      if(result.status==='otherKanji'||result.status==='unjudgeable'&&result.reason!=='missing-data')s.misses++;
      if(result.status==='otherKanji'){
        s.phase='hurt';sfxWrong();
        if(window.AmamiLate?.battle)AmamiLate.writingMiss();
        else if(amamiEpisodeOneBattle&&!amamiEpisodeOneBattle.isRetry){const b=amamiEpisodeOneBattle,st=amamiBattleState(b);if(!st.retryWords.includes(b.word))st.retryWords.push(b.word);}
        const other=K.findIndex(k=>k.c===result.char),sameReading=s.question.word.length===1&&other>=0&&schoolAllowedReadings(other).includes(s.question.focus);
        if(simple()&&!sameReading){
          hp--;updateBattleHud();$('dmgFlash').classList.add('on');await wait(600);$('dmgFlash').classList.remove('on');if(!active(s))return;
          if(hp<=0){KanjimonStoryOutcome.checkpoint(()=>{if(active(s)){cancel();faint();}});return;}
        }else if(!isTamashii&&!sameReading){
          const att=selectedAttacker,separate=genkiHitWrong(att);combo=0;roster();cheerParty(att,'pain',600);
          await wait(600);if(!active(s))return;cheerParty(att,'cry',900);
          await wait(900);if(!active(s))return;
          if(separate){soulSeparate(att);choose();}
        }
        el('status').textContent=sameReading?'おなじ よみだね。ぶんを もういちど みてね。':'ぶんを みて、もういちど かこう。';pad.clear();
      }else{el('status').textContent=result.reason==='insufficient-ink'?'じを かいてから おしてね。':'うまく よみとれなかった。もういちど ためしてね。';}
      KanjimonStoryOutcome.checkpoint(()=>{if(!active(s))return;s.phase='writing';choose();roster();controls();hint();});return;
    }
    s.ink[cursor]=strokes;s.cursor++;s.misses=0;clearHint();
    if(s.cursor<s.question.word.length){el('status').textContent='かけた！ つぎの じへ。';prompt();return;}
    s.phase='attacking';answering=true;controls();el('status').textContent='せいかい！';
    if(isTamashii||simple()){sfxCorrect();finishWin(s,null);return;}
    const att=selectedAttacker;if(genkiOf(att)<=GENKI_TIRED){s.phase='writing';s.cursor=0;s.ink=[];el('status').textContent='つかれて こうげき できないよ。なかまを かえよう。';prompt();return;}
    genkiSpendAttack(att);roster();
    const target=isTwinBoss&&twinTurn==='doutai'?$('enemyChar2'):$('enemyChar');
    const dmg=amamiEpisodeOneBattle||window.AmamiLate?.battle?1:damage(att);
    let contacted=false;
    playAttackDash(att,async()=>{
      if(contacted||!active(s))return;contacted=true;
      const magic=affinity(typeOf(att),enemyType)>=2&&!isTwinBoss&&!isJukugoBoss&&!iceDungeonBattle&&!amamiEpisodeOneBattle&&!window.AmamiLate?.battle;
      let finishDelay=950;
      if(magic){
        const level=magicLevelOf(att,enemyIdx,enemyIsBoss),timing=window.KanjimonMagic?.timing(level,typeOf(att));
        const impact=timing?.impact??(level==='max'?1360:960);
        setEnemyFace('surprised');playMagicFx(typeOf(att),level);
        await wait(impact);if(!active(s))return;
        finishDelay=Math.max(950,(timing?.duration??4000)-impact+80);
      }else playHitFx(target,false);
      sfxCorrect();setEnemyFace('pain');
      if(isTwinBoss){twinHp[twinTurn]=Math.max(0,twinHp[twinTurn]-dmg);renderTwinHp();}
      else{enemyHp=Math.max(0,enemyHp-dmg);renderEnemyHp();}
      const pop=isTwinBoss&&twinTurn==='doutai'?$('dmgPop2'):$('dmgPop');pop.textContent='⭐−'+dmg+'！';pop.className='dmg-pop show';
      cheerParty(att,'wink',1000);await wait(finishDelay);if(!active(s))return;
      if(window.AmamiLate?.battle){KanjimonStoryOutcome.win(s,att);return;}
      if(isTwinBoss){
        if(twinHp.isshin<=0&&twinHp.doutai<=0){finishWin(s,att);return;}
        twinTurn=twinTurn==='isshin'?'doutai':'isshin';
        if(twinHp[twinTurn]<=0)twinHp[twinTurn]=1;
        twinBossUpdateHighlight();renderTwinHp();KanjimonStoryOutcome.checkpoint(()=>{if(active(s))nextQuestion();});return;
      }
      if(enemyHp<=0){finishWin(s,att);return;}
      setEnemyFace(restExprHit());KanjimonStoryOutcome.checkpoint(()=>{if(active(s))nextQuestion();});
    });
  }
  async function finishWin(s,att){
    if(!active(s))return;
    if(!isTamashii){
      s.phase='defeated';controls();
      setEnemyFace('pain');
      setMsg('たおした！');el('status').textContent='たおした！';
      await wait(680);if(!active(s))return;
    }
    KanjimonStoryOutcome.win(s,att);
  }
  function hideAnswers(){
    const s=session;if(!s||s.phase==='won')return;
    const d=isTwinBoss?twinBossBattleDefOf(twinBossZoneCur):null;
    for(const [suffix,read] of d?[['',d.fy],['2',d.sy]]:[['',s.question.reading]]){
      const t=$('enemyCharText'+suffix),c=$('enemyChar'+suffix);t.textContent=read;
      c.classList.add('writing-reading');c.classList.toggle('wb-long-reading',read.length>2);c.style.setProperty('--wb-reading-length',Math.max(2,read.length));
    }
  }
  function start(){
    if(difficulty!=='writing')return false;
    cancel();phase='writing';autoPickArmed=false;autoPickSeq++;
    $('screen-battle').classList.add('writing-battle');$('bOptions').replaceChildren();$('affHelp').style.display='none';hideBattleHakase();
    $('bStageName').classList.toggle('wb-long-name',$('bStageName').textContent.length>7);
    session={id:Date.now().toString(36)+'-'+spawnSeq,seq:spawnSeq,turn:0,cursor:0,ink:[],misses:0,phase:'loading',assisted:battleSource==='field',committed:false};
    try{sample();session.question=KanjimonStoryQuestions.current(0);}catch(error){
      $('enemyCharText').textContent='？';$('enemyCharText2').textContent='？';
      setMsg('この もんだいを よみこめませんでした。「おわる」で もどってね。');console.error(error);return true;
    }
    const box=document.createElement('div');box.id='wb-play';
    box.innerHTML='<div id="wb-slots"></div><div id="wb-status" role="status" aria-live="polite"></div><div id="wb-ink-area"><canvas id="wb-canvas" width="327" height="327" aria-label="かんじを かく らん"></canvas><div class="wb-actions"><small id="wb-power"></small><button id="wb-undo" type="button">1かく もどす</button><button id="wb-clear" type="button">けす</button><button id="wb-submit" type="button">かけた！</button></div></div><button id="wb-next" type="button" hidden>つづける</button>';
    $('bOptions').append(box);pad=KanjimonInkPad(el('canvas'));el('undo').onclick=()=>pad.undo();el('clear').onclick=()=>pad.clear();el('submit').onclick=submit;
    $('enemyWrap').classList.remove('entering','intruding');prompt();if(!writingState.tutorial)tutorial();return true;
  }
  async function tutorial(){
    const s=session,d=isTwinBoss?twinBossBattleDefOf(twinBossZoneCur):null,hidden=d?d.first+d.second:s.question.word;
    const practice=['一','二','三','十','木'].find(c=>!hidden.includes(c));s.phase='tutorial';controls();
    setMsg('<span class="wb-teacher"><img src="images/sprites/hakase-face.webp" alt="はかせ">ぶんを よんで、かんじを かこう！<br>これは れんしゅうの「'+practice+'」。かけたら、したの「かけた！」を おしてね。</span>');
    const button=el('next');button.hidden=false;button.textContent='やってみる';
    button.onclick=()=>{if(!active(s)||s.phase!=='tutorial')return;writingState.tutorial=true;s.phase='saving';KanjimonStoryOutcome.checkpoint(()=>{if(!active(s))return;button.hidden=true;button.textContent='つづける';prompt();});};
    const strokes=templates[practice];
    for(let n=0;n<strokes.length;n++){
      for(let k=2;k<=strokes[n].length;k+=2){
        if(!active(s)||s.phase!=='tutorial')return;
        pad.setGuide([...strokes.slice(0,n),strokes[n].slice(0,k)]);await wait(35);
      }
      if(!active(s)||s.phase!=='tutorial')return;pad.setGuide(strokes.slice(0,n+1));await wait(300);
    }
  }
  function won(text,after){
    const s=session;s.phase='won';clearHint();controls();el('ink-area').hidden=true;el('slots').replaceChildren();setMsg(text);el('status').textContent='ほぞんしたよ';
    if(isTwinBoss){const d=twinBossBattleDefOf(twinBossZoneCur);$('enemyCharText').textContent=d.first;$('enemyCharText2').textContent=d.second;}
    else $('enemyCharText').textContent=s.question.word;
    for(const id of ['enemyChar','enemyChar2'])$(id).classList.remove('writing-reading','wb-long-reading');
    setEnemyFace('heart');triggerHeroVictoryPose();snd('get');
    el('next').hidden=false;el('next').onclick=()=>{el('next').disabled=true;after();};roster();
  }
  function protectLabels(){
    const selectors='#fieldGrid .fc,#screen-field .boss-jukugo-npc .fc,#screen-field .tsugaru-field-bosses .fc,.icd-word .fc,.deatta-clone .fc,.amami-field-monster .fc';
    for(const node of document.querySelectorAll(selectors)){
      const word=node.dataset.writingWord||node.textContent;
      if(difficulty!=='writing'){if(node.dataset.writingWord){node.textContent=word;delete node.dataset.writingWord;node.classList.remove('writing-field-reading');}continue;}
      const idx=IDX[word],entry=JUKUGO.find(x=>x.w===word)||YOJIJUKUGO.find(x=>x.w===word);
      let reading=idx!==undefined?K[idx].y.split('／')[0]:entry?.y;
      if(!reading)for(const d of [...Object.values(YOJI_BOSS),ZONE102_FINAL_YOJI,...Object.values(AMAMI_LATE_WORDS).flat().map(w=>AmamiLate.definition(w))]){if(d.first===word)reading=d.fy;if(d.second===word)reading=d.sy;}
      if(!reading)continue;
      if(node.textContent!==reading){node.dataset.writingWord=word;node.textContent=reading;node.classList.add('writing-field-reading');}
      for(const name of ['title','aria-label'])if(node.hasAttribute(name))node.setAttribute(name,reading);
    }
    if(session&&session.phase!=='won'&&session.question){
      const d=isTwinBoss?twinBossBattleDefOf(twinBossZoneCur):null,word=d?d.first+d.second:session.question.word;
      for(const b of $('partyRow').querySelectorAll('.pbtn')){const idx=Number(b.dataset.idx),fc=b.querySelector('.fc');if(fc&&word.includes(K[idx]?.c)&&fc.textContent===K[idx].c){fc.textContent=K[idx].y.split('／')[0];fc.parentElement.classList.add('writing-same-answer');}}
    }
  }
  const observer=new MutationObserver(()=>{observer.disconnect();protectLabels();observer.observe(document.body,{subtree:true,childList:true});});
  observer.observe(document.body,{subtree:true,childList:true});
  window.KanjimonStoryBattle={start,cancel,won,nextQuestion,roster,damage,get session(){return session;},get busy(){return !!session&&session.phase!=='writing';}};
})();
