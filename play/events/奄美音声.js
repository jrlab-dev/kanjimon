/* 奄美会話：イージーとマナのみ音声、人間は文字表示。発話重複と離脱後の再生を防ぐ。 */
(function(global){
 'use strict';let active=null,silent=null;const stats={played:[],failures:0,missing:[]};
 function stop(){silent=null;if(active){active.finish('cancelled');active=null;}global.AmamiRescueVoice?.stop();document.body.classList.remove('amami-voice-busy');}
 function play(text,owner=null,storyRow=null){
  stop();const key=String(text).replace(/\s+/g,''),row=storyRow?global.AmamiVoiceRows?.[storyRow.id]:global.AmamiVoiceData?.[key];
  if(!row){stats.missing.push(key);return{done:Promise.resolve({reason:'missing'})};}
  if(!soundOn){silent={text,owner,storyRow};return{done:Promise.resolve({reason:'muted'})};}
  const audio=new Audio(row.file);let timer,resolve,finished=false;
  const handle={audio,owner,text,storyRow,busy:true,done:new Promise(r=>resolve=r),finish(reason){if(finished)return;finished=true;handle.busy=false;clearTimeout(timer);audio.onended=audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();document.body.classList.remove('amami-voice-busy');resolve({reason});}};
  active=handle;document.body.classList.add('amami-voice-busy');audio.onended=()=>handle.finish('ended');audio.onerror=()=>{stats.failures++;handle.finish('error');};
  timer=setTimeout(()=>{stats.failures++;handle.finish('timeout');},(row.duration+5)*1000);
  stats.played.push({id:storyRow?.id||null,speaker:storyRow?.speaker||'easy',text:key,file:row.file});audio.play().catch(()=>{if(!finished){stats.failures++;handle.finish('blocked');}});return handle;
 }
 function playRow(row,owner=null){if(!row||!['easy','mana'].includes(row.speaker)){stop();return{busy:false,done:Promise.resolve({reason:'unvoiced'})};}return play(row.text,owner,row);}
 new MutationObserver(()=>{if(active?.owner&&!active.owner.isConnected)stop();if(silent?.owner&&!silent.owner.isConnected)silent=null;}).observe(document.documentElement,{childList:true,subtree:true});
 addEventListener('pagehide',stop);
 global.AmamiVoice={play,playRow,stop,stats,get busy(){return !!active?.busy;},get current(){return active;},after(fn){const a=active;if(a?.busy)a.done.then(r=>{if(r.reason!=='cancelled')fn();});else fn();},onSoundToggle(){global.AmamiRescueVoice?.onSoundToggle();if(!soundOn&&active){if(active.busy)silent={text:active.text,owner:active.owner,storyRow:active.storyRow};active.finish('muted');active=null;}else if(soundOn&&silent&&(!silent.owner||silent.owner.isConnected)){const row=silent;play(row.text,row.owner,row.storyRow);}}};
})(window);

/* 救援の複数体が同時に読む約2秒だけ、事前に混ぜた専用音声を使用する。 */
(function(global){
 'use strict';let current=null;
 const stats={played:[],failures:0};
 function stop(){current?.finish('cancelled');}
 function play(key,owner){
  stop();const row=global.AmamiRescueVoiceData?.[key];
  if(!row)return{done:Promise.resolve({reason:'missing'}),busy:false};
  const audio=new Audio(row.file);let started=null,timer,loadTimer,resolve,resolveStart,finished=false,muted=!soundOn;
  const handle={audio,owner,key,busy:true,started:new Promise(r=>resolveStart=r),done:new Promise(r=>resolve=r),finish(reason){if(finished)return;finished=true;clearTimeout(timer);clearTimeout(loadTimer);handle.busy=false;audio.onended=audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();if(current===handle)current=null;resolveStart({cancelled:reason==='cancelled'});resolve({reason});}};
  current=handle;
  function begin(){if(finished||started!==null)return;started=Date.now();clearTimeout(loadTimer);resolveStart({cancelled:false});timer=setTimeout(()=>handle.finish('ended'),row.duration*1000);}
  function resume(){
   if(finished||muted||!soundOn)return;
   const elapsed=started===null?0:(Date.now()-started)/1000;if(elapsed>=row.duration)return;
   try{audio.currentTime=elapsed;}catch(e){}
   audio.play().then(()=>{if(finished||muted||!soundOn)audio.pause();begin();}).catch(()=>{if(!finished&&!muted)stats.failures++;begin();});
  }
  handle.toggle=()=>{muted=!soundOn;if(muted){audio.pause();begin();}else resume();};
  audio.onerror=()=>{if(!finished){stats.failures++;begin();}};
  loadTimer=setTimeout(begin,4000);
  stats.played.push({key,file:row.file,requestedAt:Date.now()});if(muted)begin();else resume();return handle;
 }
 new MutationObserver(()=>{if(current?.owner&&!current.owner.isConnected)stop();}).observe(document.documentElement,{childList:true,subtree:true});
 addEventListener('pagehide',stop);
 global.AmamiRescueVoice={play,stop,stats,get busy(){return !!current?.busy;},get current(){return current;},onSoundToggle(){current?.toggle();}};
})(window);
