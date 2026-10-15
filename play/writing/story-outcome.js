/* Commit rewards and progress together before revealing a handwriting victory. */
(function(){
  'use strict';
  let batch=false,locked=false,checkpointId=0;
  const tx=KanjimonWritingTransaction.create({read:()=>{try{return localStorage.getItem(SAVE_KEY);}catch(e){return '__storage_unavailable__';}},write:json=>localStorage.setItem(SAVE_KEY,json)});
  function dialog(){
    let box=$('writing-save-dialog');if(!box){
      box=document.createElement('div');box.id='writing-save-dialog';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
      box.innerHTML='<div><p id="writing-save-message"></p><button id="writing-save-retry" type="button">もういちど ほぞんする</button><button id="writing-save-reload" type="button">まえの ほぞんから やりなおす</button></div>';document.body.append(box);
      $('writing-save-retry').onclick=()=>{if(!tx.retry())showFailure();};
      $('writing-save-reload').onclick=()=>location.reload();
    }return box;
  }
  function showFailure(){
    locked=true;dialog().hidden=false;
    $('writing-save-message').textContent=tx.external?'べつの タブで たびが すすんだよ。よみなおして つづけよう。':'ほぞん できませんでした。もういちど ほぞんしてね。「やりなおす」と、まだ ほぞんしていない ぶんは もどるよ。';
    $('writing-save-retry').hidden=tx.external;
  }
  function commit(id,build,done){
    let ok=false;
    try{ok=tx.commit(id,()=>{batch=true;try{return build();}finally{batch=false;}},()=>{locked=false;dialog().hidden=true;done();});}
    catch(error){console.error(error);locked=true;showFailure();return false;}
    if(!ok&&(tx.pending||tx.external))showFailure();return ok;
  }
  function capture(idx){
    const isNew=!caught.has(idx);caught.add(idx);bodies.delete(idx);separated.delete(idx);delete soulZone[idx];
    if(firstBodyIdx===idx){firstBodyIdx=null;forceTamashiiNext=false;}
    if(isNew&&party.length<4)party.push(idx);
    return isNew;
  }
  function grow(att,times){
    if(att==null)return null;
    let current=att,evolution=null;
    for(let i=0;i<times;i++){const old=levelOf(current),r=planLevelUp(current);if(!r)break;if(r.to!=null){evolution??=r;current=r.to;levels[current]=Math.max(levelOf(current),old);}}
    // Evolution is another direct acquisition, with the same disjoint-set invariant.
    caught.forEach(i=>{bodies.delete(i);separated.delete(i);delete soulZone[i];});
    return evolution;
  }
  function fieldProgress(zone){
    let nextBoss=null;
    if(!cleared.has(zone)&&!eventBossDone.has(zone)){
      if(isEventBossZone(zone))nextBoss='event';
      else if(isTwinBossZone(zone)||zone!==83&&isYojiHiddenBossZone(zone))nextBoss=zone===102&&zone102FinalPhase===1?'twinFinal':'twin';
    }
    if(nextBoss){gateBossPending[zone]=nextBoss;return{nextBoss,firstClear:false};}
    const firstClear=!cleared.has(zone);cleared.add(zone);freeZones.add(zone);delete gateBossPending[zone];
    if(zone!==83&&zone<STAGE_COUNT)unlocked=Math.max(unlocked,zone+1);
    return{firstClear,lab:firstClear&&zone===2&&!labSeen};
  }
  function baseRoute(){return{kind:'field',zone:fieldZone,x:fieldHx,y:fieldHy,stage:curStage};}
  function quickNext(){
    const route={kind:'quick',stage:curStage,queue:[...queue],pos:enemyPos+1,intrudeCount};
    if(!isIntruder&&cleared.has(4)&&curStage>=3&&intrudeCount<2&&Math.random()<.2){
      const here=new Set(stageKanji(curStage)),pool=[...caught].filter(i=>!here.has(i));
      if(pool.length){route.intruder=pool[Math.floor(Math.random()*pool.length)];route.pos=enemyPos;route.intrudeCount++;}
    }
    if(route.pos>=queue.length){route.lab=curStage===2&&!cleared.has(2)&&!labSeen;cleared.add(curStage);unlocked=Math.min(STAGE_COUNT,Math.max(unlocked,curStage+1));route.kind='clear';}
    writingState.quick=route.kind==='clear'?null:route;return route;
  }
  function win(s,att){
    if(s.committed||s.seq!==spawnSeq)return;s.committed=true;s.phase='saving';
    let presentation='',evolution=null,route,half=false;
    commit(s.id,()=>{
      route=baseRoute();
      if(window.AmamiLate?.battle){
        const result=AmamiLate.prepareWritingWin();half=result.half;
        route={kind:'amami-late',episode:result.episode,half};presentation='『'+s.question.word+'』が かけた！';
      }else if(amamiEpisodeOneBattle){
        const b=amamiEpisodeOneBattle,state=amamiBattleState(b),words=amamiBattleWords(b);
        jukugo.add(b.word);if(b.isRetry)state.retryIndex=Math.min(state.retryWords.length,state.retryIndex+1);else state.mainIndex=Math.min(words.length,state.mainIndex+1);
        route={kind:'amami',episode:b.episode};presentation='『'+b.word+'』を たおした！';
      }else if(isTamashii){
        capture(tamashiiIdx);tamashiiFirstSeen=true;presentation='『'+K[tamashiiIdx].c+'』が なかまに なった！';
      }else{
        let reward=true,times=1;
        if(iceDungeonBattle){
          const b=iceDungeonBattle;reward=b.floor===4?!iceDungeon.bossWon:!iceDungeon.won.includes(b.key);
          if(b.floor===4){iceDungeon.bossWon=true;eventBossDone.add(83);jukugo.add('精神');jukugo.add('統一');}
          else{if(!iceDungeon.won.includes(b.key))iceDungeon.won.push(b.key);jukugo.add(ICE_DUNGEON_WORDS[b.floor][b.n]);iceDungeon.enemies[b.key]=iceDungeonEnemyPos(b.floor,b.n,true);}
          route.ice=true;
        }else if(isTwinBoss){
          const d=twinBossBattleDefOf(twinBossZoneCur),zone=twinBossZoneCur;
          if(d.fuse){[d.first,d.second].forEach(w=>{if(JUKUGO_BY_KEY[w]!==undefined)jukugo.add(w);});}else yoji.add(d.first+d.second);
          if(zone===102&&zone102FinalPhase===0){zone102FinalPhase=1;gateBossPending[zone]='twinFinal';}
          else{if(zone===102)zone102FinalPhase=2;eventBossDone.add(zone);}
          route.boss=true;Object.assign(route,fieldProgress(zone));
        }else if(isJukugoBoss){
          jukugo.add(jukugoBossWordObj.w);if(isEventBoss)eventBossDone.add(jukugoBossZoneCur);
          route.boss=true;Object.assign(route,fieldProgress(jukugoBossZoneCur));
        }else{
          tallyZone1AutoDefeat();if(battleSource==='field')firstFieldBattleHelped=true;
          if(!isReviewIntruder&&!isIntruder)capture(enemyIdx);
          if(enemyShiny){shiny.add(enemyIdx);shinySeen=true;}
          times=isIntruder?1:enemyMaxHp>=7?3:enemyMaxHp>=4?2:1;
          if(battleSource==='quick')route=quickNext();
          else if(fieldIsBoss){route.boss=true;Object.assign(route,fieldProgress(curStage));}
        }
        const before=coins;
        if(reward){grantPlayReward(battleYen(enemyIsBoss)*enemyRewardMultiplier(battleRewardLevel()),'writing');evolution=grow(att,times);}
        presentation='『'+s.question.word+'』を たおした！<br>＋'+(coins-before)+'円';
        if(!isTwinBoss&&!isJukugoBoss&&!isReviewIntruder&&!isIntruder)presentation='『'+s.question.word+'』が なかまに なった！<br>＋'+(coins-before)+'円';
      }
      writingState.receipt={version:1,id:s.id,route};
      writingState.last={questionId:s.question.id,assisted:!!s.assisted};
      return getSaveData();
    },()=>{
      if(half){
        consume(()=>{AmamiLate.continueWriting(true);s.committed=false;s.id+='-next';s.seq=spawnSeq;KanjimonStoryBattle.nextQuestion();});return;
      }
      KanjimonStoryBattle.won(presentation,()=>consume(()=>{
        const advance=()=>runRoute(route,false);
        if(evolution)playEvolution(evolution.from,evolution.to,advance);else advance();
      }));
    });
  }
  function consume(done){
    const r=writingState.receipt;if(!r){done();return;}
    commit(r.id+'-return',()=>{writingState.receipt=null;return getSaveData();},done);
  }
  function runRoute(r,reloaded){
    KanjimonStoryBattle.cancel();
    if(r.ice&&!reloaded&&iceDungeonBattle){iceDungeonWin(null);return;}
    if(r.kind==='amami-late'){
      if(!reloaded&&AmamiLate.battle)AmamiLate.continueWriting(false);else startAmamiContinuation();return;
    }
    if(r.kind==='amami'){
      spawnSeq++;amamiEpisodeOneBattle=null;isJukugoBoss=false;jukugoBossWordObj=null;isEventBoss=false;amamiEpisodeOneClearBattleVisual();
      if(reloaded)startAmamiContinuation();else if(r.episode===4)amamiEpisodeFourShowNext();else if(r.episode===3)amamiEpisodeThreeShowNext();else if(r.episode===2)amamiEpisodeTwoShowNext();else amamiEpisodeOneShowNext();return;
    }
    isTamashii=false;tamashiiIdx=null;isJukugoBoss=false;jukugoBossWordObj=null;isTwinBoss=false;twinBossZoneCur=null;isEventBoss=false;isReviewIntruder=false;isIntruder=false;
    if(r.kind==='quick'||r.kind==='clear'){
      setupBattleCommon(r.stage,true);queue=[...r.queue];enemyPos=r.pos;intrudeCount=r.intrudeCount;showScreen('screen-battle');
      if(r.kind==='clear')stageClear(!!r.lab);else if(r.intruder!=null)spawnIntruder(r.intruder);else spawnEnemy();return;
    }
    fieldZone=r.zone;fieldHx=r.x;fieldHy=r.y;curStage=r.stage;
    if(r.ice){iceDungeonRestoreEnemy();iceDungeonBattle=null;iceDungeonBusy=false;}
    battleSource='quick';fieldBattleFromAuto=false;tutorialShinyBattle=false;
    if(r.boss){fieldBossDown(r.stage);if(r.firstClear&&!storyZoneNeedsEnding(r.zone)){fieldLabOpenPending=!!r.lab;$('freeOverlay').classList.add('show');}return;}
    fieldReturn();
  }
  function resume(){
    const receipt=writingState.receipt;
    if(receipt){consume(()=>runRoute(receipt.route,true));return true;}
    if(writingState.quick){runRoute(writingState.quick,true);return true;}
    return false;
  }
  function saved(){tx.saved();}
  function canSave(){if(!tx.observe()){showFailure();return false;}return !locked&&!tx.pending;}
  function checkpoint(done){return commit('checkpoint-'+Date.now()+'-'+(++checkpointId),()=>getSaveData(),done);}
  window.addEventListener('storage',e=>{if((e.key===null||e.key===SAVE_KEY)&&!tx.observe()&&KanjimonStoryBattle.session)showFailure();});
  window.KanjimonStoryOutcome={win,resume,saved,checkpoint,canSave,get batch(){return batch;},get locked(){return locked||tx.pending||tx.external;}};
})();
