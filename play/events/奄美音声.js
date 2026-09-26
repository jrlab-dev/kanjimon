/* 奄美のイージーのみ。文字と同じ収録台帳、1回1音声、離脱時停止。 */
(function(global){
 'use strict';let active=null,silent=null;const stats={played:[],failures:0,missing:[]};
 function stop(){silent=null;if(active){active.finish('cancelled');active=null;}}
 function play(text,owner=null){
  stop();const key=String(text).replace(/\s+/g,''),row=global.AmamiVoiceData?.[key];
  if(!row){stats.missing.push(key);return{done:Promise.resolve({reason:'missing'})};}
  if(!soundOn){silent={text,owner};return{done:Promise.resolve({reason:'muted'})};}
  const audio=new Audio(row.file);let timer,resolve,finished=false;
  const handle={audio,owner,text,busy:true,done:new Promise(r=>resolve=r),finish(reason){if(finished)return;finished=true;handle.busy=false;clearTimeout(timer);audio.onended=audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();document.body.classList.remove('amami-voice-busy');resolve({reason});}};
  active=handle;document.body.classList.add('amami-voice-busy');audio.onended=()=>handle.finish('ended');audio.onerror=()=>{stats.failures++;handle.finish('error');};
  timer=setTimeout(()=>{stats.failures++;handle.finish('timeout');},(row.duration+5)*1000);
  stats.played.push({text:key,file:row.file});audio.play().catch(()=>{if(!finished){stats.failures++;handle.finish('blocked');}});return handle;
 }
 new MutationObserver(()=>{if(active?.owner&&!active.owner.isConnected)stop();}).observe(document.documentElement,{childList:true,subtree:true});
 addEventListener('pagehide',stop);
 global.AmamiVoice={play,stop,stats,get busy(){return !!active?.busy;},get current(){return active;},after(fn){const a=active;if(a?.busy)a.done.then(r=>{if(r.reason!=='cancelled')fn();});else fn();},onSoundToggle(){if(!soundOn&&active){if(active.busy)silent={text:active.text,owner:active.owner};active.finish('muted');active=null;}else if(soundOn&&silent&&(!silent.owner||silent.owner.isConnected)){const row=silent;play(row.text,row.owner);}}};
})(window);
