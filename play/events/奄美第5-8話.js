/* 正本：第5-8話_四字熟語と森_20260922。既存ツイン表示を使う奄美専用進行。 */
(function(global){
 'use strict';
 const $=id=>document.getElementById(id);
 const CONFIG={
  5:{name:'住用マングローブ',title:'組み合わせを作る',field:'amami-main-05-sumiyo-mangrove.png',battle:'amami-sumiyo-v2.png',pos:'81.20% 89.34%',size:'auto 150.51%',mid:4,entry:['こんどは、二つずつ。','合う ことばを 見つけて。'],ending:['ちがう 組み合わせも、つくれる。','……つぎも、あるよ。']},
  6:{name:'ホノホシ海岸',title:'つぎ、これも',field:'amami-main-06-honohoshi.png',battle:'amami-honohoshi-v1.png',pos:'100% 100%',size:'auto 105.36%',mid:4,entry:['波が くるたび、一つ。','……ぼくが 順番を かえたよ。'],ending:['つぎ、これも！','……まだ、つづける？']},
  7:{name:'最終決戦の森・入口',title:'何を出そう',field:'amami-main-07-final-forest.png',battle:'amami-final-forest-entrance-v2.png',pos:'82.85% 59.90%',size:'auto 150.51%',mid:3,entry:['こんどは……何を 出そう。'],ending:['ぜんぶ 知ってるのに、えらぶのは すぐじゃ ないんだね。','……まだ 出したい。']},
  8:{name:'最終決戦の森・奥',title:'待っている側になる',field:'amami-main-07b-final-forest-depths.png',battle:'amami-final-forest-depths-v1.png',pos:'100% 100%',size:'auto 105.36%',mid:4,entry:[],ending:['はやく。つぎ、思いついた。']}
 };
 const NEW_READINGS={'起死回生':['きし','かいせい'],'臨機応変':['りんき','おうへん'],'温故知新':['おんこ','ちしん'],'有言実行':['ゆうげん','じっこう'],'心機一転':['しんき','いってん'],'前代未聞':['ぜんだい','みもん'],'電光石火':['でんこう','せっか']};
 function definition(word){
  const existing=word==='大願成就'?ZONE102_FINAL_YOJI:Object.values(YOJI_BOSS).find(d=>d.first+d.second===word);
  if(existing)return {...existing,fuse:false,hidden:false};
  const y=NEW_READINGS[word]||({'一石二鳥':['いっせき','にちょう'],'百発百中':['ひゃっぱつ','ひゃくちゅう'],'以心伝心':['いしん','でんしん']})[word];if(!y)throw Error('奄美四字熟語の読みがありません: '+word);
  return {first:word.slice(0,2),second:word.slice(2),fy:y[0],sy:y[1],y:y.join(''),fuse:false};
 }
 function createView(episode){
  const c=CONFIG[episode];let root=null,easy=null,generation=0,timers=[],ready=false,lines=[],nextLine=0,afterTalk=null;
  const state=()=>amamiFinal['episode'+episode];
  function finish(done){const g=generation;AmamiMotion.after(()=>{if(g===generation)done?.();});}
  function later(fn,ms){const g=generation,id=setTimeout(()=>{timers=timers.filter(t=>t!==id);if(g===generation)fn();},ms);timers.push(id);}
  function clear(){global.AmamiVoice.stop();AmamiMotion.stop();generation++;timers.forEach(clearTimeout);timers=[];document.querySelectorAll('.ay-field-word,.amami-easy').forEach(n=>n.remove());root?.remove();easy=null;ready=false;}
  function base(background=c.field,label=c.name){
   clear();const f=NationalDeparture.showField(102,{gender:heroChar,hero:true,label,adults:0,mana:false,monsters:0,background,point:{x:15,y:6}});
   document.body.classList.add('amami-late-mode');
   root=document.createElement('div');root.id='amamiLateRoot';
   root.innerHTML='<div id="ayChapter"><small>第'+episode+'話</small><b></b></div><div id="ayProgress"></div><div id="ayWater"><i></i><i></i></div><div id="ayGlow"></div><div id="ayTalk"><img src="images/bust/easy.webp" alt="イージー"><div><b>イージー</b><p id="ayText"></p><small id="ayNext">▼ つづく</small></div></div>';
   root.querySelector('#ayChapter b').textContent=c.title;document.body.appendChild(root);root.addEventListener('click',()=>{if(ready&&!root.dataset.inputLocked&&!AmamiMotion.busy&&!global.AmamiVoice.busy)showLine();});
   const h=$('fieldHero');h.style.transition='none';h.style.setProperty('--hx',f.cx);h.style.setProperty('--hy',f.cy+1.55);setHeroFacing(0,-1);
   easy=AmamiArrival.placeEasy(f.cx+1.35,episode>=7?f.cy+1.55:f.cy-.4,1.25,episode>=7?'up':'down');return f;
  }
  function moveHero(x,y,ms=850){const h=$('fieldHero');setHeroFacing(Math.sign(x-Number(h.style.getPropertyValue('--hx'))),Math.sign(y-Number(h.style.getPropertyValue('--hy'))));h.style.transition=`left ${ms}ms linear,top ${ms}ms linear`;h.style.setProperty('--hx',x);h.style.setProperty('--hy',y);const sp=h.querySelector('.hero-sprite');for(let t=0;t<ms;t+=140)later(()=>{global.AmamiArrival.heroWalkFrame(sp,!!(t%280));},t);later(()=>{global.AmamiArrival.heroWalkFrame(sp,false);},ms);}
  function moveEasy(x,y,ms=850,dir='up'){if(!easy||AmamiMotion.ownsMove(easy))return;return AmamiMotion.walk(easy,{x,y},ms);}
  function showLine(){global.AmamiVoice.stop();ready=false;if(nextLine>=lines.length){$('ayTalk').classList.remove('show');const cb=afterTalk;afterTalk=null;if(cb)cb();return;}$('ayText').textContent=lines[nextLine++];$('ayTalk').classList.add('show');if($('ayText').textContent!==global.AmamiCastle?.finalLine)global.AmamiVoice.play($('ayText').textContent,$('ayTalk'));$('ayNext').classList.remove('ready');later(()=>{ready=true;$('ayNext').classList.add('ready');},520);}
  function talk(texts,done){lines=texts;nextLine=0;afterTalk=done;showLine();}
  function pair(word,f){const nodes=[];[word.slice(0,2),word.slice(2)].forEach((w,i)=>{const n=document.createElement('span');n.className='ay-field-word';AmamiMotion.fieldMonster(n,w);n.style.setProperty('--ax',f.cx+(i?1.5:-.6));n.style.setProperty('--ay',f.cy-2.5);n.style.animationDelay=i*180+'ms';$('fieldGrid').appendChild(n);nodes.push(n);});return nodes;}
  function water(){if(episode<=6)$('ayWater').classList.add('show');}
  function entry(done){const f=base();if(episode===5||episode===7)AmamiMotion.play(easy,'07');if(episode===8)AmamiMotion.play(easy,'09');$('ayChapter').classList.add('show');later(()=>$('ayChapter').classList.remove('show'),1400);
   if(episode===8){moveEasy(f.cx+1.35,f.cy-.6,850);later(()=>setInteriorActorPose(easy,'down','a'),900);later(()=>moveHero(f.cx,f.cy+.2,1000),1250);later(()=>finish(done),2700);}
   else later(()=>talk(c.entry,done),1700);
  }
  function encounter(word,label,done){const f=base();$('ayProgress').textContent=label;water();pair(word,f);const fast=state().midSeen;
   if(episode===5)later(()=>document.querySelectorAll('.ay-field-word').forEach((n,i)=>n.style.setProperty('--ax',f.cx+(i?1.3:-.8))),380);
   if(episode===6&&fast)moveEasy(f.cx+1.35,f.cy-.8,500);
   later(()=>moveHero(f.cx,f.cy+.6,650),fast?180:400);later(()=>finish(done),fast?1050:1500);
  }
  function mid(done){const f=base();if(episode===5||episode===7)AmamiMotion.play(easy,'07');if(episode===6)AmamiMotion.play(easy,'08');if(episode===8)AmamiMotion.play(easy,'09');$('ayProgress').textContent=c.mid+'／'+AMAMI_LATE_WORDS[episode].length+'語';
   if(episode===5||episode===7){water();const ns=pair(AMAMI_LATE_WORDS[episode][c.mid],f);later(()=>ns.forEach((n,i)=>n.style.setProperty('--ax',f.cx+(i?2:-1))),400);later(()=>ns.forEach((n,i)=>n.style.setProperty('--ax',f.cx+(i?1.2:-.2))),1100);}
   if(episode===6){water();moveEasy(f.cx+1.35,f.cy-1,650);later(()=>setInteriorActorPose(easy,'down','a'),700);later(()=>moveHero(f.cx,f.cy+.5),1200);}
   if(episode===8){moveEasy(f.cx+1.35,f.cy-.5,650);later(()=>setInteriorActorPose(easy,'down','a'),700);later(()=>moveHero(f.cx,f.cy+.4,900),1500);}
   later(()=>finish(done),episode===8?2750:2350);
  }
  function retry(done){base();$('ayProgress').textContent='もういちど';later(()=>finish(done),1000);}
  function ending(done){const f=base();if(episode===6)AmamiMotion.play(easy,'08');if(episode===8)AmamiMotion.play(easy,'09');if(episode===8)$('ayGlow').classList.add('show');later(()=>talk(c.ending,()=>{
   if(episode===6){moveHero(f.cx,f.cy+.5,850);later(()=>moveEasy(f.cx+1.35,f.cy-2,1000),500);}
   else if(episode===8){moveEasy(f.cx+1.35,f.cy+1.55,600);later(()=>{moveHero(f.cx,f.cy-.5,1300);moveEasy(f.cx+1.35,f.cy-.5,1300);},800);}
   else{moveHero(f.cx,f.cy-.4,1300);later(()=>moveEasy(f.cx+1.35,f.cy-.4,1000),400);}
   later(()=>finish(done),2300);
  }),850);}
  function hide(){clear();document.body.classList.remove('amami-late-mode');}
  return {entry:AmamiMotion.fieldEvent(entry),encounter:AmamiMotion.fieldEvent(encounter),mid:AmamiMotion.fieldEvent(mid),retry:AmamiMotion.fieldEvent(retry),ending:AmamiMotion.fieldEvent(ending),hide,destroy:hide,scene:{base,later,talk,moveHero,moveEasy,pair,finish,lockInput(ms){const target=root;target.dataset.inputLocked='true';later(()=>delete target.dataset.inputLocked,ms);}}};
 }
 let view=null,current=5;
 const api={battle:null,config:CONFIG,definition};
 const state=()=>amamiFinal['episode'+current];
 function clearBattle(){spawnSeq++;api.battle=null;isTwinBoss=false;twinBossZoneCur=null;fieldBattleFromAuto=false;battleSource='quick';const s=$('screen-battle');s.classList.remove('amami-late-battle');s.style.backgroundImage='';s.style.backgroundSize='';s.style.backgroundPosition='';}
 api.start=function(episode){
  if(!CONFIG[episode])return;const previous=episode===5?amamiFinal.episode4:amamiFinal['episode'+(episode-1)];
  if(!previous.done){startAmamiContinuation();return;}if(amamiFinal['episode'+episode].done){showScreen('screen-title');return;}
  destroyFinalChapterEvent();destroyAmamiEpisodeOneView();destroyAmamiEpisodeTwoView();destroyAmamiEpisodeThreeView();destroyAmamiEpisodeFourView();view?.destroy();clearBattle();current=episode;view=episode>=9?AmamiCastle.createView(episode):createView(episode);
  const s=state();if(!s.entrySeen||s.phase==='entry'){s.phase='entry';save();view.entry(()=>{s.entrySeen=true;s.phase='main';save();next();});}else next();
 };
 function next(){const s=state(),words=AMAMI_LATE_WORDS[current];
  if(s.phase==='main'&&s.mainIndex>=words.length){s.phase=s.retryWords.length?'retry':'ending';s.partIndex=0;save();if(s.phase==='retry'){view.retry(next);return;}}
  if(s.phase==='retry'&&s.retryIndex>=s.retryWords.length){s.phase='ending';save();}
  if(s.phase==='ending'){walkAmamiExit(current,()=>view.ending(()=>{s.done=true;s.phase='done';save();view.destroy();view=null;showScreen('screen-title');}));return;}
  if(s.phase==='main'&&!s.midSeen&&s.mainIndex===CONFIG[current].mid){view.mid(()=>{s.midSeen=true;save();next();});return;}
  const word=s.phase==='retry'?s.retryWords[s.retryIndex]:words[s.mainIndex];
  walkAmamiEncounter(current,word,progress(),()=>view.encounter(word,progress(),()=>launch(word)));
 }
 function progress(){const s=state();return s.phase==='retry'?'もういちど '+(s.retryIndex+1)+'／'+s.retryWords.length:(s.mainIndex+1)+'／'+AMAMI_LATE_WORDS[current].length+'語';}
 api.progress=progress;
 function launch(word){const s=state(),mask=s.phase==='retry'?s.retryMasks[word]:3;
  if(!setupBattleCommon(102,true))return;view.hide();
  if(s.partIndex===0&&!(mask&1))s.partIndex=1;
  api.battle={episode:current,word,isRetry:s.phase==='retry',def:definition(word)};
  isTwinBoss=true;twinBossZoneCur=102;twinTurn=s.partIndex===0?'isshin':'doutai';twinHp={isshin:s.partIndex===0&&(mask&1)?1:0,doutai:mask&2?1:0};
  battleSource='field';fieldBattleFromAuto=true;fieldIsBoss=false;isEventBoss=false;queue=[];
  showScreen('screen-battle');$('bStageName').textContent=CONFIG[current].name;$('affHelp').style.display='none';spawnTwinBossEnemy();
 }
 api.applyVisual=function(){const c=CONFIG[current],s=$('screen-battle');s.classList.add('tate','amami-late-battle');s.style.backgroundImage=`url('images/battle-tate/${c.battle}')`;s.style.backgroundPosition=c.pos;s.style.backgroundSize=c.size;$('bScene').className='scene battle tatebg';$('bScene').style.backgroundImage='';};
 api.renderHp=function(){['isshin','doutai'].forEach((key,i)=>{$('twinHp'+(i+1)).innerHTML='<span'+(twinHp[key]?'':' class="edim"')+'>⭐</span>';$('enemyChar'+(i?'2':'')).classList.toggle('ay-half-done',!twinHp[key]);});};
 api.answer=function(btn,correct){const battle=api.battle;if(!battle)return;const s=state(),part=s.partIndex,seq=spawnSeq,def=battle.def,word=part?def.second:def.first,y=part?def.sy:def.fy;
  btn.classList.add(correct?'correct':'wrong');combo=0;
  if(!correct){sfxWrong();document.querySelectorAll('#bOptions .opt').forEach(n=>{if(curCorrectSet.has(n.textContent))n.classList.add('correct');});
   if(!battle.isRetry){if(!s.retryWords.includes(battle.word))s.retryWords.push(battle.word);s.retryMasks[battle.word]=(s.retryMasks[battle.word]||0)|(part?2:1);save();}
   setMsg('『'+word+'』は 『'+y+'』と よむよ！');setTimeout(()=>{if(seq===spawnSeq)finishHalf();},1500);return;
  }
  playAttackDash(selectedAttacker,()=>{if(seq!==spawnSeq)return;sfxCorrect();const target=$('enemyChar'+(part?'2':''));target.classList.add('attacked');playHitFx(target,false);setTimeout(()=>{if(seq!==spawnSeq)return;target.classList.remove('attacked');finishHalf();},650);});
 };
 function finishHalf(){const b=api.battle;if(!b)return;const s=state(),part=s.partIndex;const mask=b.isRetry?s.retryMasks[b.word]:3;
  twinHp[part?'doutai':'isshin']=0;renderTwinHp();
  if(part===0&&(mask&2)){s.partIndex=1;save();twinTurn='doutai';twinBossUpdateHighlight();answering=false;phase='select';$('bOptions').innerHTML='';setMsg('つぎは 『'+b.def.second+'』！<br>かんじもんを えらぼう');renderParty();return;}
  s.partIndex=0;if(b.isRetry)s.retryIndex++;else s.mainIndex++;save();
  $('enemyWrap').classList.add('defeated');const entry=YOJIJUKUGO[YOJIJUKUGO_BY_KEY[b.word]];
  setMsg('『'+b.word+'』<br>'+b.def.y+(entry?'<br><span class="meaning">'+entry.mean+'</span>':''));
  const seq=spawnSeq;setTimeout(()=>{if(seq!==spawnSeq)return;clearBattle();next();},1000);
 }
 api.abort=function(){save();clearBattle();view?.destroy();view=null;showScreen('screen-title');};
 api.createView=createView;
 global.AmamiLate=api;
})(window);
