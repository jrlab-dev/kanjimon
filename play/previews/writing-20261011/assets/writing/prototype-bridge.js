                                         
                                                   
(function(){
'use strict';
let engine,pad,session=null,generation=0,pendingSave=false,saveReturn=null;
const originalSave=save;
const $w=id=>document.getElementById('wb-'+id);
const questions=window.KanjimonWritingQuestions;
const zoneIndices=()=>stageKanji(1);
                                  
const bossLevelByZone=Object.freeze({1:9});
const policyEnemyLevel=()=>enemyIsBoss?(bossLevelByZone[curStage]??enemyLevelFor(enemyIdx,true)):enemyLevelFor(enemyIdx,false);
const policyDamage=att=>{
 return damageForMatch(levelOf(att),policyEnemyLevel(),affinity(typeOf(att),typeOf(enemyIdx)))*2;
};
const safeSave=()=>{
 try{if(window.WB_QA&&window.WB_QA.failSave)return false;return originalSave()===true;}
 catch(e){return false;}
};
function saveOrPause(after){
 if(safeSave()){pendingSave=false;saveReturn=null;after();pad?.setEnabled(session?.phase==='writing');refreshButtons();renderRoster();return true;}
 pendingSave=true;saveReturn=after;
 $w('message').textContent='ほぞん できませんでした。もういちど ほぞんしてね。';
 $w('retry-save').hidden=false;pad?.setEnabled(false);refreshButtons();return false;
}
function closeInk(){pad?.destroy();pad=null;}
function refreshButtons(){
 const busy=pendingSave||!session||session.phase!=='writing';
 for(const id of ['submit','undo','clear'])$w(id).disabled=busy;
 $w('exit').disabled=pendingSave;
 $w('next').disabled=pendingSave;
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
 const root=$w('party');root.replaceChildren();
 for(const i of party){
  const b=document.createElement('button'),same=!!session&&session.phase!=='won'&&i===enemyIdx;
  b.type='button';b.className='wb-partner'+(i===selectedAttacker?' selected':'');
  b.dataset.idx=i;b.textContent=(same?'なかま':K[i].c)+' Lv'+levelOf(i)+'　げんき '+genkiOf(i)+'/'+genkiMaxOf(i);
  b.disabled=pendingSave||!session||session.phase!=='writing'||genkiOf(i)<=GENKI_TIRED;
  b.onclick=()=>{if(!session||session.phase!=='writing'||pendingSave)return;selectedAttacker=i;renderRoster();};root.appendChild(b);
 }
 if(session&&selectedAttacker!=null){
  $w('power').textContent='1かいの こうげき：'+policyDamage(selectedAttacker)+'　てき Lv'+policyEnemyLevel();
 }
}
function selectAvailable(){
 const usable=party.filter(i=>genkiOf(i)>GENKI_TIRED);
 if(!usable.length){selectedAttacker=null;return false;}
 if(autoPick||!usable.includes(selectedAttacker))selectedAttacker=usable.reduce((a,b)=>{
  const ah=Math.ceil(enemyHp/policyDamage(a)),bh=Math.ceil(enemyHp/policyDamage(b));
  return bh<ah||(bh===ah&&levelOf(b)>levelOf(a))?b:a;
 });
 return true;
}
function renderHp(){$w('hp').textContent='てきの たいりょく '+enemyHp+' / '+enemyMaxHp;}
function question(){
 if(!session||session.phase==='won')return;
 const list=questions[K[enemyIdx].c];
 if(session.turn>=list.length){message('この しさくの もんだいが おわりました。ここで ちゅうだんします。');exit();return;}
 const q=list[session.turn];session.question=q;
 const focus=document.createElement('mark');focus.textContent=q.reading;
 $w('question').replaceChildren(document.createTextNode(q.before),focus,document.createTextNode(q.after));
 $w('enemy').textContent=q.reading;$w('instruction').textContent='「'+q.reading+'」を かんじ 1じで かこう。';
 $w('enemy').classList.remove('revealed');
 $w('next').hidden=true;$w('retry-save').hidden=true;
 session.phase='writing';pad?.clear();pad?.setEnabled(true);
 if(!selectAvailable()){
  session.phase='tired';pad?.setEnabled(false);message('みんな ヘトヘト。きょうは ここまで。やすんでから つづけよう。');
  $w('rest').hidden=false;
 }else{message('ぶんを よんで、じを かいてね。');$w('rest').hidden=true;}
 renderHp();renderRoster();refreshButtons();
}
function start(){
 if(pendingSave)return;
 generation++;closeInk();session=null;
 const ids=zoneIndices(),cursor=wbProgress.cursor||0;
 $w('home').hidden=true;$w('play').hidden=false;$w('complete').hidden=true;
 if(cursor>=ids.length){$w('play').hidden=true;$w('complete').hidden=false;return;}
 curStage=1;battleMode='party';battleSource='quick';difficulty='writing';
 queue=ids;enemyPos=cursor;enemyIdx=ids[cursor];enemyIsBoss=cursor===ids.length-1;
 enemyMaxHp=enemyHpFor(enemyIdx,enemyIsBoss);enemyHp=enemyMaxHp;
 if(!questions[K[enemyIdx].c]||!window.KAKITORI_STROKES[K[enemyIdx].c]){message('もんだいを よみこめませんでした。');return;}
 session={generation,phase:'writing',turn:0,committed:false,question:null};
 $w('progress').textContent=(cursor+1)+' / '+ids.length+' たいめ'+(enemyIsBoss?'・ボス':'');
 pad=window.KanjimonInkPad($w('canvas'));question();
}
function completeWin(att){
 if(session.committed)return;
 session.committed=true;
 const idx=enemyIdx,isNew=!caught.has(idx),upTimes=enemyMaxHp>=7?3:enemyMaxHp>=4?2:1;
 wbBatch=true;
 try{
  caught.add(idx);bodies.delete(idx);separated.delete(idx);delete soulZone[idx];
  if(firstBodyIdx===idx){forceTamashiiNext=false;firstBodyIdx=null;}
  if(isNew&&party.length<4)party.push(idx);
  coins+=playRewardYen(battleYen(enemyIsBoss)*enemyRewardMultiplier(policyEnemyLevel()),'writing');
  let growing=att;for(let n=0;n<upTimes;n++){
   const previousLevel=levelOf(growing),r=planLevelUp(growing);if(!r)break;
   if(r.to!=null){
    growing=r.to;
                                         
    if(levelOf(growing)<previousLevel){levels[growing]=previousLevel;genki[growing]=genkiMaxOf(growing);}
   }
  }
                                       
  caught.forEach(i=>{bodies.delete(i);separated.delete(i);delete soulZone[i];});
  wbProgress={...wbProgress,version:1,cursor:(wbProgress.cursor||0)+1};
  if(wbProgress.cursor>=zoneIndices().length){cleared.add(1);unlocked=Math.max(unlocked,2);}
 }finally{wbBatch=false;}
 session.phase='saving';
 saveOrPause(()=>{
  session.phase='won';$w('enemy').textContent=K[idx].c;$w('enemy').classList.add('revealed');
  $w('question').textContent='せいかい！';$w('instruction').textContent='';
  message(isNew?'かいた じが すがたに なった！ なかまに なったよ！':'やったね！ なかまが つよく なった！');
  $w('next').hidden=false;renderRoster();renderHp();refreshButtons();
 });
}
async function submit(strokes){
 if(!session||session.phase!=='writing'||pendingSave||pad?.isDrawing()||selectedAttacker==null)return {status:'ignored'};
 const s=session,seq=generation,att=selectedAttacker;
 if(genkiOf(att)<=GENKI_TIRED){question();return {status:'ignored'};}
 s.phase='evaluating';pad?.setEnabled(false);renderRoster();refreshButtons();
 await new Promise(r=>setTimeout(r,0));
 if(seq!==generation||s!==session)return {status:'cancelled'};
 const result=engine.judge(strokes,K[enemyIdx].c);
 if(result.status==='correct'){
  const damage=policyDamage(att);enemyHp=Math.max(0,enemyHp-damage);genkiSpendAttack(att);
  $w('scene').classList.add('wb-hit');setTimeout(()=>{if(generation===seq)$w('scene').classList.remove('wb-hit');},350);
  renderHp();
  if(enemyHp===0){completeWin(att);return result;}
  s.turn++;s.phase='saving';
  saveOrPause(()=>{
   message('せいかい！ '+damage+' ダメージ！');
   setTimeout(()=>{if(generation===seq&&session===s)question();},800);
  });return result;
 }
 s.phase='writing';pad?.setEnabled(true);refreshButtons();renderRoster();
 if(result.status==='otherKanji'){
  const other=K.findIndex(k=>k.c===result.char);
  const homophone=other>=0&&schoolAllowedReadings(other).includes(s.question.reading);
  if(homophone)message('その じも おなじ よみだね。もういちど ぶんを みてね。');
  else{
   genkiHitWrong(att);message('この ぶんの じとは ちがうみたい。もういちど！');
   saveOrPause(()=>{selectAvailable();renderRoster();if(selectedAttacker==null)question();});
  }
 }else message(result.reason==='insufficient-ink'?'せんを かいてから「かけた！」を おしてね。':'じを よみとれなかった。もういちど ためしてね。');
 return result;
}
function exit(){
 if(pendingSave)return;generation++;closeInk();session=null;
 $w('play').hidden=true;$w('complete').hidden=true;$w('home').hidden=false;
 $w('home-status').textContent='なかま '+caught.size+'たい・'+coins+'えん・つづき '+((wbProgress.cursor||0)+1)+'たいめ';
}
function init(){
 document.body.classList.add('writing-prototype');window.OpeningMovie?.cancel();bgmStop();soundOn=false;
 const root=document.createElement('main');root.id='wb-root';root.innerHTML=`
 <header class="wb-heading"><span>むずかしい・にほんばし</span><b>かいて なかまにしよう</b></header>
 <p class="wb-note">書き取り戦闘の試作です。通常版の記録とは別に保存します。日本橋の12字まで対応しています。</p>
 <section id="wb-home"><h1>よみから かんじを かこう</h1><p>ぶんを よんで、しろい わくに かいてね。せいかいすると なかまが こうげきするよ。</p><p>レベルや あいしょうで つよさが かわるよ。</p><p id="wb-home-status"></p><button id="wb-start">つづきから あそぶ</button></section>
 <section id="wb-play" hidden><div class="wb-top"><span id="wb-progress"></span><button id="wb-exit">おわる</button></div>
 <div class="wb-scene" id="wb-scene"><img class="wb-hero" src="/play/images/battle-tate/hero-back-boy.webp" alt="しゅじんこう"><div id="wb-enemy" class="wb-enemy"></div><div id="wb-hp"></div></div>
 <div id="wb-party" class="wb-party"></div><div id="wb-power" class="wb-power"></div>
 <p id="wb-question" class="wb-question"></p><p id="wb-instruction"></p>
 <canvas id="wb-canvas" aria-label="かんじを かく わく"></canvas>
 <div class="wb-actions"><button id="wb-undo">1かく もどす</button><button id="wb-clear">けす</button><button id="wb-submit">かけた！</button></div>
 <p id="wb-message" role="status" aria-live="polite"></p>
 <button id="wb-next" hidden>つぎの あいてへ</button><button id="wb-retry-save" hidden>もういちど ほぞん</button>
 <button id="wb-rest" hidden>しさくの きゅうけい（ぜんかいふく）</button></section>
 <section id="wb-complete" hidden><h1>にほんばし クリア！</h1><p>ここまでが こんかいの しさくです。なかまと レベルは ほぞんされています。</p><button id="wb-home-button">もどる</button></section>
 <footer>筆順データ：KanjiVG / © Ulrich Apel / CC BY-SA 3.0。書き取り判定は検証中です。</footer>`;
 document.body.append(root);
 engine=KanjimonWritingRecognizer.createEngine(sampleTemplates());
 $w('start').onclick=start;$w('next').onclick=start;$w('exit').onclick=exit;$w('home-button').onclick=exit;
 $w('undo').onclick=()=>pad?.undo();$w('clear').onclick=()=>pad?.clear();$w('submit').onclick=()=>submit(pad.getStrokes());
 $w('retry-save').onclick=()=>{if(saveReturn){const after=saveReturn;saveOrPause(()=>{$w('retry-save').hidden=true;after();});}};
 $w('rest').onclick=()=>{if(pendingSave)return;party.forEach(i=>genki[i]=genkiMaxOf(i));saveOrPause(question);};
 window.WritingPrototype=Object.freeze({start,exit,submit,getState:()=>({phase:session?.phase,cursor:wbProgress.cursor,enemyIdx,enemyHp,enemyMaxHp,selectedAttacker,caught:[...caught],bodies:[...bodies],party:[...party],levels:{...levels},coins,pendingSave,saveKey:SAVE_KEY})});
 exit();
}
if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
