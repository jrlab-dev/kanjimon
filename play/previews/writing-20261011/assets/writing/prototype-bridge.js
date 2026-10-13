
(function(){
'use strict';
let engine,pad,templates,session=null,generation=0,pendingSave=false,saveReturn=null,assetsLoaded=false,hintTimer=null,loadingZone=false,externalSave=false;
const loadedZones=new Set(),maxZone=KanjimonWritingProgress.maxZone;
const originalSave=save;
const $w=id=>document.getElementById('wb-'+id);
const questions=window.KanjimonWritingQuestions;
const activeZone=()=>wbProgress.zone||1;
const zoneIndices=()=>stageKanji(activeZone());
const bossLevelByZone=Object.freeze({1:9});
const policyEnemyLevel=()=>enemyIsBoss?(bossLevelByZone[curStage]??enemyLevelFor(enemyIdx,true)):enemyLevelFor(enemyIdx,false);
const policyDamage=att=>damageForMatch(levelOf(att),policyEnemyLevel(),affinity(typeOf(att),typeOf(enemyIdx)))*2;
const valid=(s,seq)=>session===s&&generation===seq;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const safeSave=()=>{try{if(wbProgress.unavailable||externalSave||window.WB_QA?.failSave)return false;return originalSave()===true;}catch(e){return false;}};
async function loadZone(zone){
 if(loadedZones.has(zone))return true;
 const assets=sceneImages.assets(zone).filter(([url])=>url.includes('sprites/')||url.includes('battle-tate/'));
 const loaded=await Promise.all(assets.map(async([url,mark])=>{try{const ok=await sceneImages.load(url);if(ok)mark();return ok;}catch(e){return false;}}));
 if(loaded.every(Boolean)){loadedZones.add(zone);return true;}return false;
}
function saveOrPause(after){
 if(safeSave()){pendingSave=false;saveReturn=null;$w('travel-retry').hidden=true;after();pad?.setEnabled(session?.phase==='writing');refreshButtons();renderRoster();return true;}
 pendingSave=true;saveReturn=after;message('ほぞん できませんでした。もういちど ほぞんしてね。');
 $w('retry-save').hidden=false;pad?.setEnabled(false);refreshButtons();return false;
}
function completeScreen(){
 const zone=activeZone();
 $w('complete-title').textContent=stageName(zone)+' クリア！';
 $w('complete-message').textContent=zone<maxZone?zoneIndices().length+'字を なかまにしたよ！ つぎは '+stageName(zone+1)+'。':'ぜんぶの フィールドを クリア！ 1026字の ぼうけん、おめでとう！';
 $w('travel').textContent=zone<maxZone?stageName(zone+1)+'へ すすむ':'';
 $w('travel').hidden=zone>=maxZone;$w('travel').disabled=pendingSave||loadingZone||externalSave;
 $w('travel-retry').hidden=!pendingSave;$w('travel-status').textContent='';
 showScreen('wb-root');$w('home').hidden=true;$w('complete').hidden=false;
}
async function travel(){
 if(pendingSave||evoLock||loadingZone||externalSave||wbProgress.unavailable||!assetsLoaded||activeZone()>=maxZone||wbProgress.cursor<zoneIndices().length)return;
 const next=activeZone()+1;
 if(!stageKanji(next).every(i=>questions[K[i].c]?.length&&templates[K[i].c])){$w('travel-status').textContent='つぎの フィールドを じゅんびしています。';return;}
 loadingZone=true;refreshButtons();$w('travel-status').textContent='つぎの フィールドを よみこみ中…';
 const loaded=await loadZone(next);loadingZone=false;refreshButtons();
 if(!loaded){$w('travel-status').textContent='画像を よみこめませんでした。もういちど「すすむ」を おしてね。';return;}
 if(externalSave)return;
 generation++;closeInk();session=null;
 wbProgress={version:2,zone:next,cursor:0};
 const begin=()=>{pendingSave=false;saveReturn=null;$w('travel-retry').hidden=true;$w('home-button').disabled=false;start();};
 if(safeSave()){begin();return;}
 pendingSave=true;saveReturn=begin;$w('travel').disabled=true;$w('home-button').disabled=true;
 $w('travel-status').textContent='ほぞん できませんでした。もういちど ほぞんしてね。';$w('travel-retry').hidden=false;
}
function hideHint(){clearTimeout(hintTimer);hintTimer=null;if(session)session.hint=false;pad?.setGuide([]);}
function closeInk(){hideHint();pad?.destroy();pad=null;}
function showHint(s,seq){
 clearTimeout(hintTimer);hintTimer=null;s.hint=true;pad?.setGuide(templates[K[enemyIdx].c]);
 $w('instruction').textContent='うすい じを ヒントに かこう';
 if(s.misses<6){
  const questionId=s.question.id;
  hintTimer=setTimeout(()=>{
   if(!valid(s,seq)||s.question.id!==questionId)return;
   hideHint();
   if(['writing','evaluating','tired'].includes(s.phase))$w('instruction').textContent='「'+s.question.reading+'」を かんじで かこう';
  },(s.misses-2)*1000);
 }
}
function refreshButtons(){
 const busy=pendingSave||loadingZone||externalSave||!session||session.phase!=='writing';
 for(const id of ['submit','undo','clear'])$w(id).disabled=busy;
 $w('exit').disabled=pendingSave||loadingZone||externalSave||['attacking','celebrating'].includes(session?.phase);
 $w('next').disabled=pendingSave||loadingZone||externalSave||session?.phase!=='won';
 $w('travel').disabled=pendingSave||loadingZone||externalSave;
 $w('home-button').disabled=pendingSave||loadingZone||externalSave;
}
function message(text){$w('message').textContent=text;}
function sampleTemplates(){
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');
 return Object.fromEntries(Object.entries(window.KAKITORI_STROKES).map(([char,ds])=>[char,ds.map(d=>{
  path.setAttribute('d',d);const len=path.getTotalLength(),n=Math.max(12,Math.ceil(len/2));
  return Array.from({length:n},(_,i)=>{const p=path.getPointAtLength(len*i/(n-1));return {x:p.x,y:p.y};});
 })]));
}
function renderRoster(){

 phase='writing';renderParty();
 for(const b of $('partyRow').querySelectorAll('.pbtn')){
  const i=Number(b.dataset.idx),same=!!session&&!['won','celebrating'].includes(session.phase)&&i===enemyIdx;
  if(same){const pc=b.querySelector('.pc');pc.querySelector('.fc').textContent=session.question?.reading||questions[K[i].c][0].reading;pc.classList.add('writing-same-answer');}
  b.disabled=pendingSave||externalSave||loadingZone||!session||session.phase!=='writing'||genkiOf(i)<=GENKI_TIRED;
  b.onclick=()=>{if(!session||session.phase!=='writing'||pendingSave||externalSave||loadingZone)return;selectedAttacker=i;renderRoster();};
 }
 updateBattleHud();
 if(session&&selectedAttacker!=null)$w('power').textContent='こうげき '+policyDamage(selectedAttacker)+'・てき Lv'+policyEnemyLevel();
}
function selectAvailable(){
 const usable=party.filter(i=>genkiOf(i)>GENKI_TIRED);
 if(!usable.length){selectedAttacker=null;return false;}
 if(autoPick||!usable.includes(selectedAttacker))selectedAttacker=usable.reduce((a,b)=>{
  const ah=Math.ceil(enemyHp/policyDamage(a)),bh=Math.ceil(enemyHp/policyDamage(b));
  return bh<ah||(bh===ah&&levelOf(b)>levelOf(a))?b:a;
 });return true;
}
function renderHp(){renderEnemyHp();updateBattleHud();}
function question(){
 if(!session||session.phase==='won')return;
 const list=questions[K[enemyIdx].c];
 const q=list[session.turn%list.length];
 if(session.questionTurn!==session.turn){hideHint();session.misses=0;}
 session.questionTurn=session.turn;
 session.question=q;
 const focus=document.createElement('mark');focus.textContent=q.reading;
 $w('question').replaceChildren(document.createTextNode(q.before),focus,document.createTextNode(q.after));
 $('enemyCharText').textContent=q.reading;$('enemyChar').classList.add('writing-reading');
 $('enemyChar').style.setProperty('--wb-reading-length',Math.max(2,[...q.reading].length));
 $('enemyChar').classList.toggle('wb-long-reading',[...q.reading].length>2);
 $w('instruction').textContent=session.hint?'うすい じを ヒントに かこう':'「'+q.reading+'」を かんじで かこう';
 $w('next').hidden=true;$w('retry-save').hidden=true;$w('ink-area').hidden=false;
 session.phase='writing';answering=false;pad?.clear();pad?.setEnabled(true);
 if(!selectAvailable()){
  session.phase='tired';pad?.setEnabled(false);message('みんな ヘトヘト。やすんで つづけよう。');$w('rest').hidden=false;
 }else{message('');$w('rest').hidden=true;}
 renderHp();renderRoster();refreshButtons();
}
function start(){
 if(pendingSave||evoLock||loadingZone||externalSave||wbProgress.unavailable||!assetsLoaded)return;
 if(!loadedZones.has(activeZone())){loadingZone=true;refreshButtons();return loadZone(activeZone()).then(ok=>{loadingZone=false;refreshButtons();if(ok)start();else{$w('home-status').textContent='画像を よみこめませんでした。もういちど はじめてね。';}});}
 generation++;spawnSeq++;autoPickSeq++;autoPickArmed=false;clearDashClones();closeInk();session=null;
 const ids=zoneIndices(),cursor=wbProgress.cursor||0;
 if(cursor>=ids.length){completeScreen();return;}
 const zone=activeZone();
 setupBattleCommon(zone,true);battleMode='party';battleSource='quick';difficulty='writing';battleRewardDifficulty='writing';
 queue=ids;enemyPos=cursor;enemyIdx=ids[cursor];enemyIsBoss=cursor===ids.length-1;
 enemyShiny=false;enemyAlt=null;enemyType=typeOf(enemyIdx);phase='writing';answering=true;
 enemyMaxHp=enemyHpFor(enemyIdx,enemyIsBoss);enemyHp=enemyMaxHp;
 session={generation,phase:'writing',turn:0,committed:false,question:null,misses:0,hint:false};
 applySceneBg(zone,K[enemyIdx]);showScreen('screen-battle');
 $('screen-battle').classList.add('writing-battle');$('bStageName').textContent=stageName(zone);
 $('bStageName').classList.toggle('wb-long-name',stageName(zone).length>7);
 $('affHelp').style.display='none';hideBattleHakase();
 $('enemyWrap').className='enemy-wrap'+(enemyIsBoss?' boss':'')+' entering';
 $('enemyChar').className='enemy-char face-host writing-reading';$('enemyChar').style.color=K[enemyIdx].cl;
 $('enemyInfo').style.display='';$('eType').innerHTML='<span class="tbadge t-'+enemyType+'">'+TYPE_EMOJI[enemyType]+' '+enemyType+(enemyIsBoss?' 👑ボス':'')+'</span>';
 $('orb').classList.remove('show');$('dmgPop').classList.remove('show');$('cryBubble').classList.remove('show');
 setEnemyFace(restExpr());resetHeroVictoryPose();
 setMsg('<span id="wb-question"></span><small id="wb-instruction"></small><small id="wb-message" role="status" aria-live="polite"></small>');
 $w('play').hidden=false;pad=window.KanjimonInkPad($w('canvas'));question();
 const seq=generation;playEncounterSe(spawnSeq);bgmPlay(enemyIsBoss?'boss':'battle');
 setTimeout(()=>{if(generation===seq)$('enemyWrap').classList.remove('entering');},enemyIsBoss?BOSS_ENTRY_MS:ENTRY_MS);
}
async function presentWin(idx,isNew,growing,evolution,s,seq,reward){
 s.phase='celebrating';pad?.setEnabled(false);$('enemyCharText').textContent=K[idx].c;$('enemyChar').classList.remove('writing-reading');
 setEnemyFace('heart');$('orb').classList.add('show');triggerHeroVictoryPose();
 $w('question').textContent=isNew?'「'+K[idx].c+'」が なかまに なった！':'「'+K[idx].c+'」に かった！';
 $w('instruction').textContent='＋'+reward+'円';message('バトルに かった！');
 $w('retry-save').hidden=true;$w('rest').hidden=true;$w('ink-area').hidden=true;renderRoster();renderHp();refreshButtons();snd('get');
 if(evolution){
  await wait(1000);if(!valid(s,seq))return;
  await new Promise(resolve=>playEvolution(evolution.from,evolution.to,resolve));
 }else{ sfxLevelup();cheerParty(growing,'doya',1500); }
 if(!valid(s,seq))return;
 s.phase='won';$w('next').hidden=false;message('なかま Lv'+levelOf(growing)+'・ほぞんしたよ');renderRoster();refreshButtons();
}
async function completeWin(att){
 if(session.committed)return;
 const s=session,seq=generation;s.committed=true;
 const idx=enemyIdx,isNew=!caught.has(idx),upTimes=enemyMaxHp>=7?3:enemyMaxHp>=4?2:1;
 const reward=playRewardYen(battleYen(enemyIsBoss)*enemyRewardMultiplier(policyEnemyLevel()),'writing');
 let growing=att,evolution=null;wbBatch=true;
 try{
  caught.add(idx);bodies.delete(idx);separated.delete(idx);delete soulZone[idx];
  if(firstBodyIdx===idx){forceTamashiiNext=false;firstBodyIdx=null;}
  if(isNew&&party.length<4)party.push(idx);coins+=reward;
  for(let n=0;n<upTimes;n++){
   const previousLevel=levelOf(growing),r=planLevelUp(growing);if(!r)break;
   if(r.to!=null){if(!evolution)evolution=r;growing=r.to;
    if(levelOf(growing)<previousLevel){levels[growing]=previousLevel;genki[growing]=genkiMaxOf(growing);}
   }
  }
  caught.forEach(i=>{bodies.delete(i);separated.delete(i);delete soulZone[i];});
  wbProgress={...wbProgress,version:2,zone:activeZone(),cursor:(wbProgress.cursor||0)+1};
  if(wbProgress.cursor>=zoneIndices().length){cleared.add(activeZone());unlocked=Math.max(unlocked,activeZone()+1);}
 }finally{wbBatch=false;}
 s.phase='saving';let presentation;
 if(saveOrPause(()=>{presentation=presentWin(idx,isNew,growing,evolution,s,seq,reward);}))await presentation;
}
function animateAttack(att,damage,s,seq){
 return new Promise(resolve=>{
  let contacted=false,finished=false;
  const finish=ok=>{if(finished)return;finished=true;resolve(ok);};
  const contact=()=>{
   if(contacted)return;contacted=true;if(!valid(s,seq)){finish(false);return;}
   const aff=affinity(typeOf(att),typeOf(enemyIdx));
   let delay=0,duration=700;
   if(aff>=2){
    const rel=levelRelOf(levelOf(att),policyEnemyLevel()),mlv=rel==='yuri'?'max':rel==='furi'?'weak':'mid';
    playMagicFx(typeOf(att),mlv);const timing=window.KanjimonMagic?.timing?.(mlv,typeOf(att));
    delay=timing?.hitDelay||(mlv==='max'?1000:600);duration=Math.max(700,(timing?.duration||delay+950)-delay+80);
   }else playHitFx($('enemyChar'),false);
   setTimeout(()=>{
    if(!valid(s,seq)){finish(false);return;}
    genkiSpendAttack(att);enemyHp=Math.max(0,enemyHp-damage);setEnemyFace('pain');
    $('enemyChar').classList.add('attacked');$('dmgPop').textContent='⭐−'+damage+'！';$('dmgPop').className='dmg-pop show';
    sfxCorrect();renderHp();renderRoster();cheerParty(att,'wink',850);
    setTimeout(()=>{
     if(!valid(s,seq)){finish(false);return;}
     $('enemyChar').classList.remove('attacked');$('dmgPop').classList.remove('show');setEnemyFace(restExprHit());finish(true);
    },duration);
   },delay);
  };
  playAttackDash(att,contact);
  setTimeout(()=>{if(!valid(s,seq))finish(false);else if(!contacted)contact();},800);
 });
}
async function submit(strokes){
 if(!session||session.phase!=='writing'||pendingSave||externalSave||loadingZone||pad?.isDrawing()||selectedAttacker==null)return {status:'ignored'};
 const s=session,seq=generation,att=selectedAttacker;
 if(genkiOf(att)<=GENKI_TIRED){question();return {status:'ignored'};}
 s.phase='evaluating';pad?.setEnabled(false);renderRoster();refreshButtons();await wait(0);
 if(!valid(s,seq))return {status:'cancelled'};
 const result=engine.judge(strokes,K[enemyIdx].c);
 if(result.status==='correct'){
  hideHint();
  s.phase='attacking';answering=true;refreshButtons();message('せいかい！ こうげき！');
  if(!await animateAttack(att,policyDamage(att),s,seq))return {status:'cancelled'};
  if(enemyHp===0){await completeWin(att);return result;}
  s.turn++;s.phase='saving';saveOrPause(question);return result;
 }
 s.phase='writing';pad?.setEnabled(true);refreshButtons();renderRoster();
 if(result.status==='otherKanji'||(result.status==='unjudgeable'&&result.reason!=='missing-data')){
  s.misses++;
  if(s.misses>=3)showHint(s,seq);
 }
 if(result.status==='otherKanji'){
  const other=K.findIndex(k=>k.c===result.char),homophone=other>=0&&schoolAllowedReadings(other).includes(s.question.reading);
  if(homophone)message('おなじ よみだね。ぶんを もういちど みてね。');
  else{
   genkiHitWrong(att);message('この ぶんの じとは ちがうみたい。もういちど！');sfxWrong();
   $('dmgFlash').classList.add('on');setTimeout(()=>{if(valid(s,seq))$('dmgFlash').classList.remove('on');},400);
   saveOrPause(()=>{selectAvailable();renderRoster();if(selectedAttacker==null)question();});
  }
 }else message(result.reason==='insufficient-ink'?'じを かいてから「かけた！」を おしてね。':'よみとれなかった。もういちど ためしてね。');
 return result;
}
function exit(){
 if(pendingSave||evoLock||loadingZone||externalSave)return;
 generation++;spawnSeq++;autoPickSeq++;autoPickArmed=false;clearDashClones();closeInk();session=null;answering=false;
 $('enemyChar').classList.remove('attacked');$('dmgFlash').classList.remove('on');
 $w('complete').hidden=true;$w('home').hidden=false;showScreen('wb-root');bgmStop();
 const count=zoneIndices().length;
 $w('home-status').textContent=stageName(activeZone())+'・なかま '+caught.size+'たい・'+coins+'円・'+Math.min(count,(wbProgress.cursor||0)+1)+'／'+count+' たいめ';
 $w('start').textContent=(wbProgress.cursor||0)>=count?(activeZone()<maxZone?'つぎの フィールドへ':'クリアした きろくを みる'):'書き取りバトルへ';
}
function init(){
 document.body.classList.add('writing-prototype');window.OpeningMovie?.cancel();window.openingMovieDismissed=true;bgmStop();
 const root=document.createElement('section');root.id='wb-root';root.className='screen';root.innerHTML=`
 <section id="wb-home"><h1>かんじモン</h1><h2>書き取りバトル</h2><p>にほんばしから おきなわへ。<br>102の フィールドで、1026字を なかまにしよう。</p><p id="wb-home-status"></p><button class="btn btn-primary" id="wb-start" disabled>よみこみ中…</button><p>通常版とは別に記録します。</p></section>
 <section id="wb-complete" hidden><h1 id="wb-complete-title"></h1><p id="wb-complete-message"></p><button class="btn btn-primary" id="wb-travel">うえのへ すすむ</button><p id="wb-travel-status" role="status"></p><button class="btn btn-primary" id="wb-travel-retry" hidden>もういちど ほぞん</button><button class="btn btn-primary" id="wb-home-button">もどる</button></section>
 <footer>筆順：KanjiVG / © Ulrich Apel / <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a></footer>`;
 $('app').append(root);
 $('bOptions').innerHTML=`<div id="wb-play"><div id="wb-ink-area"><canvas id="wb-canvas" aria-label="かんじを かく わく"></canvas><div class="wb-actions"><button id="wb-undo">1かく<br>もどす</button><button id="wb-clear">けす</button><button id="wb-submit">かけた！</button><small id="wb-power"></small></div></div><button id="wb-next" hidden>つぎの あいてへ</button><button id="wb-retry-save" hidden>もういちど ほぞん</button><button id="wb-rest" hidden>やすんで つづける</button></div>`;
 const exitButton=$('screen-battle').querySelector('.battle-exit');exitButton.removeAttribute('onclick');exitButton.id='wb-exit';exitButton.onclick=exit;
 templates=sampleTemplates();engine=KanjimonWritingRecognizer.createEngine(templates);
 $w('start').onclick=start;$w('next').onclick=start;$w('home-button').onclick=exit;
 $w('travel').onclick=travel;
 $w('travel-retry').onclick=()=>{if(pendingSave&&saveReturn){const after=saveReturn;if(safeSave())after();}};
 $w('undo').onclick=()=>pad?.undo();$w('clear').onclick=()=>pad?.clear();$w('submit').onclick=()=>submit(pad.getStrokes());
 $w('retry-save').onclick=()=>{if(saveReturn){const after=saveReturn;saveOrPause(()=>{$w('retry-save').hidden=true;after();});}};
 $w('rest').onclick=()=>{if(pendingSave||externalSave||loadingZone)return;party.forEach(i=>genki[i]=genkiMaxOf(i));saveOrPause(question);};
 const ready=(wbProgress.unavailable?Promise.resolve(false):loadZone(activeZone())).then(loaded=>{
  assetsLoaded=loaded;$w('start').disabled=!assetsLoaded;
  if(!assetsLoaded)$w('home-status').textContent=wbProgress.unavailable?'この記録は この版では ひらけません。記録は そのまま のこしています。':'画像を よみこめませんでした。ページを ひらきなおしてね。';
  return assetsLoaded;
 });
 window.WritingPrototype=Object.freeze({start,exit,submit,travel,ready,getState:()=>({phase:session?.phase,zone:activeZone(),cursor:wbProgress.cursor,enemyIdx,enemyHp,enemyMaxHp,selectedAttacker,caught:[...caught],bodies:[...bodies],party:[...party],levels:{...levels},coins,pendingSave,saveKey:SAVE_KEY})});
 exit();
 window.addEventListener('storage',e=>{if(e.key!==null&&e.key!==SAVE_KEY)return;externalSave=true;generation++;closeInk();refreshButtons();renderRoster();$w('rest').disabled=true;$w('start').disabled=true;const text='べつの タブで 記録が かわりました。ページを ひらきなおしてね。';$w('home-status').textContent=text;$w('travel-status').textContent=text;message(text);});
}
if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
