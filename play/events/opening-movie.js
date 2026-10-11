/* OP27 起動PV。ゲーム進行/セーブ/名前入力には触れない。 */
(function(){
 'use strict';
 // 遅い読込み中に既にゲームへ進んだ場合、その画面へPVを割り込ませない。
 if(window.openingMovieDismissed||!document.getElementById('screen-title')?.classList.contains('active')||document.getElementById('worldmapOverlay')?.classList.contains('show'))return;
 const host=document.createElement('div');
 host.id='openingMovie';host.tabIndex=-1;host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','かんじモン オープニング');
 host.innerHTML='<video playsinline preload="metadata" poster="videos/opening-20261008-poster.jpg" aria-label="オープニングムービー"></video><div class="opening-start" hidden><p>かんじモン RPG</p><button type="button" data-play>再生する</button></div><div class="opening-controls"><button type="button" data-sound>音を消す</button><button type="button" data-skip>スキップ</button></div><p class="opening-hint">タップ・クリックでスキップ</p>';
 document.body.appendChild(host);
 const video=host.querySelector('video'),start=host.querySelector('.opening-start'),play=host.querySelector('[data-play]'),mute=host.querySelector('[data-sound]'),skip=host.querySelector('[data-skip]'),app=document.getElementById('app');
 const oldOverflow=document.body.style.overflow;
 const background=Array.from(document.body.children).filter(el=>el!==host).map(el=>[el,el.inert]);
 let active=true,state='loading',attempt=0,resumeAfterHidden=false,lastTime=0,lastProgress=performance.now();
 function setState(s){state=s;host.dataset.state=s;}
 function syncSound(){video.muted=!soundOn;mute.textContent=soundOn?'音を消す':'音を出す';}
 function finish(reason,restoreTitle=true){
  if(!active)return;
  active=false;attempt++;setState('finished');clearInterval(watchdog);
  document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',key,true);
  video.pause();video.removeAttribute('src');video.load();host.hidden=true;background.forEach(([el,inert])=>{el.inert=inert;});document.body.style.overflow=oldOverflow;
  if(restoreTitle){
   // 動画に予告曲を含むため、タイトルでは主人公曲へ接続。
   bgmOpeningTitleActive=true;bgmOpeningFinished=true;_bgmTitle();
   const button=document.querySelector('#screen-title .title-btns button[onclick="goField()"]');button?.focus({preventScroll:true});
   continueAfterOpeningMovie();
  }
  host.dataset.finishReason=reason;
 }
 function blocked(){setState('ready');start.hidden=false;play.focus({preventScroll:true});}
 function begin(){
  if(!active||document.hidden)return;
  const id=++attempt;start.hidden=true;setState('loading');lastProgress=performance.now();syncSound();
  try{
   const p=video.play();
   if(p&&p.catch)p.catch(e=>{
    if(!active||id!==attempt)return;
    if(e.name==='NotAllowedError'||e.name==='AbortError')blocked();else finish('play-error');
   });
  }catch(e){if(e.name==='NotAllowedError')blocked();else finish('play-error');}
 }
 function visibility(){
  if(!active)return;
  if(document.hidden){resumeAfterHidden=state==='playing'||state==='loading';attempt++;video.pause();}
  else{lastProgress=performance.now();if(resumeAfterHidden){resumeAfterHidden=false;begin();}}
 }
 function key(e){
  if(!active||!['Escape','Enter',' '].includes(e.key))return;
  if(e.key!=='Escape'&&e.target.closest('button'))return;
  e.preventDefault();e.stopImmediatePropagation();finish('keyboard');
 }
 host.addEventListener('click',e=>{
  e.stopPropagation();if(!active)return;
  if(e.target.closest('[data-play]')){begin();return;}
  if(e.target.closest('[data-sound]')){toggleSound();syncSound();return;}
  finish('skip');
 });
 video.addEventListener('playing',()=>{if(!active){video.pause();return;}setState('playing');start.hidden=true;lastProgress=performance.now();});
 video.addEventListener('timeupdate',()=>{if(video.currentTime!==lastTime){lastTime=video.currentTime;lastProgress=performance.now();}});
 video.addEventListener('ended',()=>finish('ended'));
 video.addEventListener('error',()=>finish('load-error'));
 document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',key,true);
 const watchdog=setInterval(()=>{if(active&&!document.hidden&&state!=='ready'&&performance.now()-lastProgress>15000)finish('timeout');},1000);
 window.OpeningMovie={isActive:()=>active,skip:()=>finish('skip'),cancel:()=>finish('navigation',false),syncSound};
 background.forEach(([el])=>{el.inert=true;});document.body.style.overflow='hidden';bgmPause();syncSound();setState('loading');host.focus({preventScroll:true});
 video.src='videos/opening-20261008-op27.mp4';
 if(document.hidden)resumeAfterHidden=true;else begin();
})();
