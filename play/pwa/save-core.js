(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('../new-game-plus/core.js'):root.KanjimonNewGamePlus);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjimonBackup=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(legacy){
  'use strict';
  const KEY='kanjimon-save',KEYS=[KEY,KEY+'-ngplus-previous',KEY+'-ngplus-restore-safety'];
  const JOURNAL=KEY+'-import-journal',MAX=8388608;
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const integer=(v,min,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  function check(ok){if(!ok)throw Error('記録の項目や数値が不正です。');}
  function progress(p){
    check(object(p));
    for(const k of ['entrySeen','midSeen','done','episode1Done','castleDoorSeen','castleRoofPlaced'])if(p[k]!==undefined)check(typeof p[k]==='boolean');
    for(const k of ['mainIndex','retryIndex'])if(p[k]!==undefined)check(integer(p[k],0,1026));
    if(p.phase!==undefined)check(['entry','main','retry','ending','done'].includes(p.phase));
    if(p.retryWords!==undefined)check(Array.isArray(p.retryWords)&&p.retryWords.every(s=>typeof s==='string'&&s.length<=16));
    if(p.partIndex!==undefined)check(integer(p.partIndex,0,1));
    if(p.retryMasks!==undefined){check(object(p.retryMasks));for(const v of Object.values(p.retryMasks))check(integer(v,1,3));}
  }
  function route(r){
    check(object(r));
    if(['amami','amami-late'].includes(r.kind)){check(integer(r.episode,1,12));return;}
    check(integer(r.stage,1,102));
    if(r.kind==='field'){check(integer(r.zone,-14,102)&&Number.isFinite(r.x)&&Number.isFinite(r.y));return;}
    check(['quick','clear'].includes(r.kind)&&Array.isArray(r.queue)&&r.queue.length<=1026&&r.queue.every(i=>integer(i,0,1025))&&integer(r.pos,0,r.queue.length));
    if(r.intruder!=null)check(integer(r.intruder,0,1025));
    if(r.intrudeCount!=null)check(integer(r.intrudeCount,0,2));
  }
  const bytes=s=>new TextEncoder().encode(s).length;
  function tree(v,depth=0){
    if(depth>32)throw Error('記録の構造が深すぎます。');
    if(typeof v==='number'&&!Number.isFinite(v))throw Error('数値が不正です。');
    if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){
      if(['__proto__','constructor','prototype'].includes(k))throw Error('記録の項目が不正です。');
      tree(x,depth+1);
    }
  }
  function validateSave(d){
    if(!object(d)||!Array.isArray(d.caught)||!Number.isInteger(d.unlocked)||d.unlocked<1||d.unlocked>102)throw Error('ゲームの記録ではありません。');
    tree(d);
    const plain={...d};delete plain.writingState;
    legacy.validate(plain,{characterCount:1026});
    if(d.writingState!==undefined){
      const w=d.writingState;
      if(!object(w)||w.version!==1||typeof w.tutorial!=='boolean')throw Error('書くモードの記録が不正です。');
      for(const k of Object.keys(w))if(!['version','receipt','quick','tutorial','last'].includes(k))throw Error('新しい版の記録です。');
      for(const k of ['receipt','quick','last'])if(w[k]!=null&&!object(w[k]))throw Error('書くモードの記録が不正です。');
      if(w.receipt!=null){check(w.receipt.version===1&&typeof w.receipt.id==='string');route(w.receipt.route);}
      if(w.quick!=null){check(w.quick.kind==='quick');route(w.quick);}
      if(w.last!=null)check(typeof w.last.questionId==='string'&&typeof w.last.assisted==='boolean');
    }
    for(const k of ['cleared','zoneVisited','freeZones','eventBossDone','yojiHiddenIntroSeen'])if(d[k]?.some(n=>!integer(n,1,102)))throw Error('場所の記録が不正です。');
    if(d.autoPickNudged)check(d.autoPickNudged.every(n=>integer(n,1,6)));
    for(const k of ['jukugo','yoji'])if(d[k])check(d[k].every(s=>typeof s==='string'&&s.length<=16));
    if((d.party||[]).length>4||new Set(d.party||[]).size!==(d.party||[]).length||(d.party||[]).some(i=>!d.caught.includes(i)))throw Error('てもちの記録が不正です。');
    if((d.bodies||[]).some(i=>d.caught.includes(i))||(d.separated||[]).some(i=>d.caught.includes(i)))throw Error('なかまの記録が不正です。');
    if(d.newGamePlus!==undefined&&(!Number.isInteger(d.newGamePlus.cycle)||d.newGamePlus.cycle<0||d.newGamePlus.version!==1||!Number.isInteger(d.newGamePlus.maxGrade)||d.newGamePlus.maxGrade<1||d.newGamePlus.maxGrade>6))throw Error('周回の記録が不正です。');
    for(const k of ['genki','soulZone'])for(const [id,v]of Object.entries(d[k]||{}))if(!/^\d+$/.test(id)||Number(id)>=1026||!Number.isSafeInteger(v)||v<0)throw Error('なかまの状態が不正です。');
    for(const v of Object.values(d.soulZone||{}))check(integer(v,1,102));
    for(const [k,v]of Object.entries(d.gateBossPending||{}))check(/^\d+$/.test(k)&&integer(+k,1,102)&&['event','twin','twinFinal','jukugo'].includes(v));
    for(const k of ['evSeen','outSeen'])for(const [id,v]of Object.entries(d[k]||{}))check(/^\d+$/.test(id)&&integer(+id,1,102)&&typeof v==='boolean');
    for(const [k,v]of Object.entries(d.gradeCeremonySeen||{}))check(integer(+k,1,6)&&typeof v==='string');
    for(const v of Object.values(d.items||{}))check(integer(v,0));
    if(d.kakitoriDaily){check(typeof d.kakitoriDaily.date==='string'&&object(d.kakitoriDaily.done));for(const [k,v]of Object.entries(d.kakitoriDaily.done))check(/^\d+$/.test(k)&&integer(+k,0,1025)&&typeof v==='boolean');}
    if(d.fieldPos!=null){
      const f=d.fieldPos;check(integer(f.zone,-14,102)&&Number.isFinite(f.x)&&Number.isFinite(f.y));
      if(f.mode!==undefined)check(f.mode==='precision');
      for(const k of ['fx','fy'])if(f[k]!==undefined)check(integer(f[k],0));
    }
    if(d.heroCostume&&object(d.heroCostume))check(Object.values(d.heroCostume).every(s=>typeof s==='string'));
    if(d.ownedCostumes)check((Array.isArray(d.ownedCostumes)?[d.ownedCostumes]:Object.values(d.ownedCostumes)).every(a=>Array.isArray(a)&&a.every(s=>typeof s==='string')));
    if(d.zone102FinalPhase!==undefined)check(integer(d.zone102FinalPhase,0,2));
    if(d.amamiFinal){
      const a=d.amamiFinal;progress(a);
      if(a.episode!==undefined)check(integer(a.episode,1,12));
      for(let i=2;i<=12;i++)if(a['episode'+i]!==undefined)progress(a['episode'+i]);
      if(a.story!==undefined)check(object(a.story)&&a.story.version===2&&['split','E1','E2','E3','E4','E5','E6','E7','E8','done'].includes(a.story.phase)&&typeof a.story.legacy==='boolean');
      if(a.walk!==undefined){
        check(object(a.walk)&&a.walk.version===1&&object(a.walk.positions));
        for(const p of Object.values(a.walk.positions))check(Array.isArray(p)&&p.length===2&&integer(p[0],0,59)&&integer(p[1],0,39));
      }
    }
    if(d.iceDungeon){
      const i=d.iceDungeon;
      if(i.version!==undefined)check(i.version===1);
      if(i.floor!==undefined)check(integer(i.floor,0,4));
      for(const k of ['entered','bossWon','complete','legacy'])if(i[k]!==undefined)check(typeof i[k]==='boolean');
      if(i.pos!==undefined)check(object(i.pos)&&Number.isFinite(i.pos.x)&&Number.isFinite(i.pos.y));
      if(i.enemies!==undefined){check(object(i.enemies));for(const [k,p]of Object.entries(i.enemies))check(integer(+k,0,11)&&object(p)&&Number.isFinite(p.x)&&Number.isFinite(p.y));}
      if(i.won!==undefined)check(Array.isArray(i.won)&&i.won.every(n=>integer(n,0,11)));
      if(i.seen!==undefined){check(object(i.seen));check(Object.values(i.seen).every(v=>typeof v==='boolean'));}
      if(i.litTorches!==undefined)check(integer(i.litTorches,0,5));
      if(i.litTorchIds!==undefined)check(Array.isArray(i.litTorchIds)&&i.litTorchIds.every(s=>typeof s==='string'));
      if(i.torchPhase!==undefined)check(['approach','encircle','complete'].includes(i.torchPhase));
    }
    if(d.playerName?.length>100)throw Error('なまえが長すぎます。');
    return d;
  }
  function parse(text){
    if(typeof text!=='string'||bytes(text)>MAX)throw Error('記録ファイルは8MBまでです。');
    const doc=JSON.parse(text);tree(doc);
    if(!object(doc)||doc.format!=='kanjimon-backup'||doc.version!==1||!object(doc.records))throw Error('対応していない記録形式です。');
    if(Object.keys(doc.records).length!==KEYS.length||KEYS.some(k=>!Object.hasOwn(doc.records,k)))throw Error('記録の項目が不足しています。');
    for(const k of KEYS)if(doc.records[k]!==null)validateSave(doc.records[k]);
    if(doc.records[KEY]===null)throw Error('冒険の記録が入っていません。');
    return doc;
  }
  function read(storage){return Object.fromEntries(KEYS.map(k=>[k,storage.getItem(k)]));}
  function rawValid(rows,validate=false){
    if(!object(rows)||Object.keys(rows).length!==3||KEYS.some(k=>!Object.hasOwn(rows,k)))throw Error('復旧用の記録が不正です。');
    for(const k of KEYS)if(rows[k]!==null){if(typeof rows[k]!=='string'||bytes(rows[k])>MAX)throw Error('復旧用の記録が不正です。');if(validate)validateSave(JSON.parse(rows[k]));}
    return rows;
  }
  function apply(storage,rows){
    for(const k of KEYS){if(rows[k]===null)storage.removeItem(k);else storage.setItem(k,rows[k]);if(storage.getItem(k)!==rows[k])throw Error('記録を保存できませんでした。');}
  }
  function recover(storage){
    const raw=storage.getItem(JOURNAL);if(raw===null)return false;
    if(bytes(raw)>MAX*3)throw Error('復旧用の記録が大きすぎます。');
    const j=JSON.parse(raw);
    if(j.version!==1||!['prepared','committed'].includes(j.phase))throw Error('復旧用の記録を確認してください。');
    rawValid(j.before);rawValid(j.after,true);
    if(j.priorJournal!==undefined)check(typeof j.priorJournal==='string'&&bytes(j.priorJournal)<=MAX*3);
    apply(storage,j.phase==='committed'?j.after:j.before);
    if(j.phase==='prepared'&&j.priorJournal!==undefined)storage.setItem(JOURNAL,j.priorJournal);
    else storage.removeItem(JOURNAL);
    return true;
  }
  function exportText(storage,gameVersion=''){
    const raw=read(storage),records={};
    for(const k of KEYS)records[k]=raw[k]===null?null:validateSave(JSON.parse(raw[k]));
    const text=JSON.stringify({format:'kanjimon-backup',version:1,gameVersion,createdAt:new Date().toISOString(),records});
    parse(text);return text;
  }
  function restore(storage,text,options={}){
    const priorJournal=storage.getItem(JOURNAL);
    if(priorJournal!==null&&!options.replaceInterrupted)throw Error('先に中断した復元を回復してください。');
    const doc=parse(text),before=rawValid(read(storage));
    const after=Object.fromEntries(KEYS.map(k=>[k,doc.records[k]===null?null:JSON.stringify(doc.records[k])]));
    const j={version:1,phase:'prepared',before,after};
    if(priorJournal!==null)j.priorJournal=priorJournal;
    const raw=JSON.stringify(j);if(bytes(raw)>MAX*3)throw Error('復旧用の控えが大きすぎます。');
    try{
      storage.setItem(JOURNAL,raw);
      if(storage.getItem(JOURNAL)!==raw)throw Error('復元前の控えを保存できませんでした。');
    }catch(error){
      try{if(priorJournal===null)storage.removeItem(JOURNAL);else storage.setItem(JOURNAL,priorJournal);}catch(e){}
      throw error;
    }
    try{
      apply(storage,after);j.phase='committed';
      const committed=JSON.stringify(j);storage.setItem(JOURNAL,committed);
      if(storage.getItem(JOURNAL)!==committed)throw Error('復元を確定できませんでした。');
    }catch(error){
      try{apply(storage,before);if(priorJournal!==null)storage.setItem(JOURNAL,priorJournal);else storage.removeItem(JOURNAL);}catch(e){throw Error('復元を中断しました。控えを残しています。再起動して回復してください。');}
      throw error;
    }
    // A committed journal is safe to retain if cleanup is temporarily unavailable.
    try{storage.removeItem(JOURNAL);}catch(e){}
    return doc;
  }
  return {KEY,KEYS,JOURNAL,MAX,parse,validateSave,exportText,restore,recover,read};
});
