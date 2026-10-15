(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjimonNewGamePlus=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const CARRY=['caught','bodies','levels','party','sound','tut','jukugo','shiny','difficulty','difficultyVersion','autoPick','autoPickExplained','autoPartySwapSeen','autoPickNudged','labSeen','shinySeen','intrudeSeen','introSeen','heroChar','playerName','mayoigoLoreSeen','tamashiiFirstSeen','tamashiiLoreSeen','jukugoLoreSeen','jukugoFuseUnlocked','reviewIntrudeFirstSeen','firstFieldBattleHelped','tutorialShinySeen','partyFullGuideSeen','jukugoBossGuideSeen','yoji','twinBossGuideSeen','genkiGuideSeen','sepGuideSeen','manualSwapGuideSeen','coins','items','townGuideSeen','shopGuideSeen','innGuideSeen','otetsudaiGuideSeen','interiorGuideSeen','schoolTestGuideSeen','shodoGuideSeen','kakitoriDaily','kakitoriTotalCorrect','ownsForest','heroCostume','ownedCostumes'];
  const RESET=['unlocked','cleared','fieldPos','fieldMapRev52','fieldMapRev63','zoneVisited','freeZones','firstBodyIdx','forceTamashiiNext','zone1AutoDefeatCount','tutorialForceShinyNext','allClearCelebrated','zone102FinalPhase','zone102CertificateReceived','nationalDepartureSeen','amamiArrivalSeen','amamiFinal','kansaiHakaseSeen','stationSceneSeen','shipSceneSeen','planeSceneSeen','iceDungeon','iceCastleSeen','gradeCeremonySeen','evSeen','fuji52PanoramaSeen','fuji52ChaseReady','fuji52SegmentSeen','nagoya63ChaseReady','nagoya63SegmentSeen','outSeen','travelContinueSeen','chubuHakaseSeen','travelContinueSeen2','travelContinueSeen3','eventBossDone','eventBossIntroSeen','twinEventIntroSeen','yojiHiddenIntroSeen','gateBossPending','genki','separated','soulZone'];
  const CLASSIFICATION=Object.freeze(Object.fromEntries([...CARRY.map(k=>[k,'carry']),...RESET.map(k=>[k,'reset']),['newGamePlus','cycle']]));
  const ARRAY=new Set(['caught','bodies','party','jukugo','shiny','autoPickNudged','cleared','zoneVisited','freeZones','yoji','eventBossDone','yojiHiddenIntroSeen','separated']);
  const OBJECT=new Set(['levels','amamiFinal','iceDungeon','gradeCeremonySeen','evSeen','outSeen','gateBossPending','genki','soulZone','items','kakitoriDaily','newGamePlus']);
  const NUMBERS=new Set(['unlocked','fieldMapRev52','fieldMapRev63','zone1AutoDefeatCount','zone102FinalPhase','fuji52SegmentSeen','nagoya63SegmentSeen','coins','kakitoriTotalCorrect','difficultyVersion']);
  const SPECIAL=new Set(['difficulty','heroChar','playerName','fieldPos','firstBodyIdx','heroCostume','ownedCostumes']);
  const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const clone=v=>JSON.parse(JSON.stringify(v));
  function assertClassified(keys){const unknown=keys.filter(k=>!Object.hasOwn(CLASSIFICATION,k));if(unknown.length)throw new Error('Unclassified save fields: '+unknown.join(', '));return true;}
  function validate(save,options={}){
    if(!record(save))throw new Error('Invalid save');
    assertClassified(Object.keys(save));
    for(const [k,v] of Object.entries(save)){
      if(ARRAY.has(k)&&!Array.isArray(v))throw new Error('Invalid '+k);
      if(OBJECT.has(k)&&!record(v))throw new Error('Invalid '+k);
      if(NUMBERS.has(k)&&(!Number.isSafeInteger(v)||v<0))throw new Error('Invalid '+k);
      if(!ARRAY.has(k)&&!OBJECT.has(k)&&!NUMBERS.has(k)&&!SPECIAL.has(k)&&typeof v!=='boolean')throw new Error('Invalid '+k);
    }
    const count=options.characterCount||Infinity;
    for(const k of ['caught','bodies','party','shiny','separated'])for(const i of save[k]||[])if(!Number.isInteger(i)||i<0||i>=count)throw new Error('Invalid '+k);
    for(const [i,lv] of Object.entries(save.levels||{}))if(!/^\d+$/.test(i)||Number(i)>=count||!Number.isInteger(lv)||lv<1||lv>59)throw new Error('Invalid level');
    if(save.difficulty!==undefined&&!['easy','normal','hard','writing'].includes(save.difficulty))throw new Error('Invalid difficulty');
    if(save.heroChar!==undefined&&!['boy','girl'].includes(save.heroChar))throw new Error('Invalid hero');
    if(save.playerName!==undefined&&typeof save.playerName!=='string')throw new Error('Invalid name');
    if(save.firstBodyIdx!=null&&(!Number.isInteger(save.firstBodyIdx)||save.firstBodyIdx<0||save.firstBodyIdx>=count))throw new Error('Invalid first body');
    if(save.fieldPos!=null&&!record(save.fieldPos))throw new Error('Invalid position');
    for(const k of ['heroCostume','ownedCostumes'])if(save[k]!==undefined&&!(record(save[k])||(k==='heroCostume'?typeof save[k]==='string':Array.isArray(save[k]))))throw new Error('Invalid costume');
    return true;
  }
  function normalizeInfo(save,gradeForZone){
    const src=record(save.newGamePlus)?save.newGamePlus:{};
    const cycle=Number.isSafeInteger(src.cycle)&&src.cycle>=0&&src.cycle<Number.MAX_SAFE_INTEGER?src.cycle:0;
    let maxGrade=Number.isInteger(src.maxGrade)?Math.min(6,Math.max(1,src.maxGrade)):1;
    const grade=gradeForZone||function(z){return z<=8?1:z<=24?2:z<=44?3:z<=64?4:z<=83?5:6;};
    for(const z of [save.unlocked,save.fieldPos?.zone,...(Array.isArray(save.cleared)?save.cleared:[]),...(Array.isArray(save.zoneVisited)?save.zoneVisited:[])])if(Number.isInteger(z)&&z>=1&&z<=102)maxGrade=Math.max(maxGrade,Math.min(6,Math.max(1,grade(z))));
    if(save.amamiFinal?.episode12?.done===true)maxGrade=6;
    return {version:1,cycle,maxGrade};
  }
  function canStart(save){
    const af=save?.amamiFinal;
    return af?.episode12?.done===true&&(af.story?.phase==='done'||af.story?.version!==2);
  }
  function makeInitialSave(options={}){
    const out={};
    for(const k of Object.keys(CLASSIFICATION))out[k]=ARRAY.has(k)?[]:OBJECT.has(k)?{}:NUMBERS.has(k)?0:false;
    Object.assign(out,{unlocked:1,fieldMapRev52:4,fieldMapRev63:4,fieldPos:clone(options.startPosition||{zone:1,x:0,y:0}),firstBodyIdx:null,sound:true,difficulty:'easy',autoPick:true,heroChar:'boy',playerName:'',coins:200,items:{genkidama:0,fue:0},heroCostume:{boy:'std',girl:'std'},ownedCostumes:{boy:['std'],girl:['std']},kakitoriDaily:{date:'',done:{}},newGamePlus:{version:1,cycle:0,maxGrade:1},amamiFinal:clone(options.amamiInitial||{episode:1,episode12:{done:false},story:{version:2,phase:'split',legacy:false}}),iceDungeon:clone(options.iceInitial||{version:1,entered:false,complete:false})});
    return out;
  }
  function transform(save,options={}){
    validate(save,options);
    if(!canStart(save))throw new Error('Journey is not complete');
    const next=makeInitialSave(options);
    for(const k of CARRY)if(Object.hasOwn(save,k))next[k]=clone(save[k]);
    const info=normalizeInfo(save,options.gradeForZone);
    next.newGamePlus={...info,cycle:info.cycle+1};
    const reunited=new Set([...(next.caught||[]),...(save.separated||[]).filter(i=>(save.bodies||[]).includes(i))]);
    next.caught=[...reunited];next.bodies=(next.bodies||[]).filter(i=>!reunited.has(i));
    next.party=(next.party||[]).filter((i,n,a)=>reunited.has(i)&&a.indexOf(i)===n).slice(0,4);
    next.genki={};next.separated=[];next.soulZone={};
    // These first-journey encounters must never be scheduled again.
    next.introSeen=true;next.firstFieldBattleHelped=true;next.tutorialShinySeen=true;
    next.zone1AutoDefeatCount=3;next.forceTamashiiNext=false;next.tutorialForceShinyNext=false;
    if(save.autoPick===undefined){next.autoPick=(save.unlocked||1)<9;next.autoPickExplained=!next.autoPick;}
    if(next.difficulty==='hard')next.difficulty='normal';
    next.difficultyVersion=2;
    validate(next,options);return next;
  }
  function createController(storage,saveKey,options={}){
    const previousKey=saveKey+'-ngplus-previous',safetyKey=saveKey+'-ngplus-restore-safety';
    let locked=false;
    function commit(current,target,backupKey){
      if(locked)return {ok:false,reason:'busy'};
      locked=true;let oldRaw,oldBackup,wrote=false;
      try{
        validate(current,options);validate(target,options);
        const backup=JSON.stringify(current),next=JSON.stringify(target);
        oldRaw=storage.getItem(saveKey);oldBackup=storage.getItem(backupKey);
        storage.setItem(backupKey,backup);
        if(storage.getItem(backupKey)!==backup)throw new Error('Backup verification failed');
        wrote=true;storage.setItem(saveKey,next);
        if(storage.getItem(saveKey)!==next)throw new Error('Save verification failed');
        return {ok:true,save:clone(target)};
      }catch(error){
        let recoveryFailed=false;
        if(wrote)try{
          if(storage.getItem(saveKey)!==oldRaw){if(oldRaw===null)storage.removeItem(saveKey);else storage.setItem(saveKey,oldRaw);}
          if(storage.getItem(saveKey)!==oldRaw)recoveryFailed=true;
        }catch(e){recoveryFailed=true;}
        // Keep the verified recovery copy whenever restoring the active record fails.
        if(!recoveryFailed&&oldBackup!==undefined)try{if(oldBackup===null)storage.removeItem(backupKey);else storage.setItem(backupKey,oldBackup);}catch(e){}
        locked=false;return {ok:false,reason:'storage',error:error.message,recoveryFailed};
      }
    }
    return {previousKey,safetyKey,
      start(current){if(locked)return {ok:false,reason:'busy'};try{return commit(current,transform(current,options),previousKey);}catch(error){return {ok:false,reason:'invalid',error:error.message};}},
      restore(current){if(locked)return {ok:false,reason:'busy'};try{const raw=storage.getItem(previousKey);if(!raw)return {ok:false,reason:'missing'};const target=JSON.parse(raw);validate(target,options);return commit(current,target,safetyKey);}catch(error){return {ok:false,reason:'invalid',error:error.message};}},
      hasPrevious(){try{const raw=storage.getItem(previousKey);if(!raw)return false;validate(JSON.parse(raw),options);return true;}catch(e){return false;}}
    };
  }
  function damageMultiplier(selfLv,enemyLv,cycle){
    if(!Number.isSafeInteger(cycle)||cycle<1||!Number.isFinite(selfLv)||!Number.isFinite(enemyLv)||selfLv<1||enemyLv<=0)return 1;
    return Math.max(1,Math.min(4,Math.floor(selfLv/enemyLv)));
  }
  return Object.freeze({CARRY,RESET,CLASSIFICATION,validate,assertClassified,normalizeInfo,canStart,makeInitialSave,transform,createController,damageMultiplier});
});
