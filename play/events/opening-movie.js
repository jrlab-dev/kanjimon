/* OP30 起動PV。ゲーム進行/セーブ/名前入力には触れない。 */
(function(){
 'use strict';
 if(window.KanjimonGameI18n?.active)return;
 // 遅い読込み中に既にゲームへ進んだ場合、その画面へPVを割り込ませない。
 if(window.openingMovieDismissed||!document.getElementById('screen-title')?.classList.contains('active')||document.getElementById('worldmapOverlay')?.classList.contains('show'))return;
 const host=document.createElement('div');
 host.id='openingMovie';host.tabIndex=-1;host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','かんじモン オープニング');
 host.innerHTML='<video playsinline preload="none" poster="videos/opening-20261008-poster.jpg" aria-label="オープニングムービー"></video><div class="opening-start"><p>かんじモン RPG</p><button type="button" data-play>タップして はじめる</button></div><div class="opening-controls"><button type="button" data-sound>音を消す</button><button type="button" data-skip>ムービーを とばす</button></div><p class="opening-hint">音あり・音なしを えらんで はじめよう</p>';
 document.body.appendChild(host);
 const video=host.querySelector('video'),start=host.querySelector('.opening-start'),play=host.querySelector('[data-play]'),mute=host.querySelector('[data-sound]'),skip=host.querySelector('[data-skip]'),app=document.getElementById('app');
 const oldOverflow=document.body.style.overflow;
 const background=Array.from(document.body.children).filter(el=>el!==host).map(el=>[el,el.inert]);
 let active=true,state='ready',attempt=0,resumeAfterHidden=false,lastTime=0,lastProgress=performance.now();
 function setState(s){state=s;host.dataset.state=s;}
 function syncSound(){video.muted=!soundOn;mute.textContent=soundOn?'音を消す':'音を出す';}
 function finish(reason,restoreTitle=true){
  if(!active)return;
  active=false;attempt++;setState('finished');clearInterval(watchdog);
  document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',key,true);
  video.pause();video.removeAttribute('src');video.load();host.hidden=true;background.forEach(([el,inert])=>{el.inert=inert;});document.body.style.overflow=oldOverflow;
  if(restoreTitle){
   // 動画の曲を引き継がず、タイトル・初回登録用の曲へ接続。
   bgmOpeningTitleActive=true;bgmOpeningFinished=true;_bgmTitle();
   const button=document.querySelector('#screen-title .title-btns button[onclick="goField()"]');button?.focus({preventScroll:true});
   continueAfterOpeningMovie();
  }
  host.dataset.finishReason=reason;
 }
 function blocked(message='タップして はじめる'){setState('ready');start.hidden=false;play.textContent=message;play.focus({preventScroll:true});}
 function failed(){
  if(!active)return;
  attempt++;video.pause();video.removeAttribute('src');video.load();
  blocked('もういちど 再生する');
  host.querySelector('.opening-hint').textContent='読みこめませんでした。再生するか、ムービーを とばしてね';
 }
 function begin(){
  if(!active||document.hidden||state==='loading'||state==='playing')return;
  const id=++attempt;start.hidden=true;setState('loading');lastProgress=performance.now();syncSound();
  if(!video.getAttribute('src'))video.src='videos/opening-20261019-op30.mp4';
  try{
   const p=video.play();
   if(p&&p.catch)p.catch(e=>{
    if(!active||id!==attempt)return;
    if(e.name==='NotAllowedError'||e.name==='AbortError')blocked();else failed();
   });
  }catch(e){if(e.name==='NotAllowedError')blocked();else failed();}
 }
 function visibility(){
  if(!active)return;
  if(document.hidden){resumeAfterHidden=state==='playing'||state==='loading';attempt++;video.pause();setState('ready');}
  else{lastProgress=performance.now();if(resumeAfterHidden){resumeAfterHidden=false;begin();}}
 }
 function key(e){
  if(!active||e.key!=='Escape')return;
  e.preventDefault();e.stopImmediatePropagation();finish('keyboard');
 }
 host.addEventListener('click',e=>{
  e.stopPropagation();if(!active)return;
  if(e.target.closest('[data-play]')){begin();return;}
  if(e.target.closest('[data-sound]')){toggleSound();syncSound();return;}
  if(e.target.closest('[data-skip]'))finish('skip');
 });
 video.addEventListener('playing',()=>{if(!active){video.pause();return;}setState('playing');start.hidden=true;lastProgress=performance.now();});
 video.addEventListener('timeupdate',()=>{if(video.currentTime!==lastTime){lastTime=video.currentTime;lastProgress=performance.now();}});
 video.addEventListener('ended',()=>finish('ended'));
 video.addEventListener('error',()=>{if(active&&video.getAttribute('src'))failed();});
 document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',key,true);
 const watchdog=setInterval(()=>{if(active&&!document.hidden&&state!=='ready'&&performance.now()-lastProgress>15000)failed();},1000);
 window.OpeningMovie={isActive:()=>active,skip:()=>finish('skip'),cancel:()=>finish('navigation',false),syncSound};
 background.forEach(([el])=>{el.inert=true;});document.body.style.overflow='hidden';bgmPause();syncSound();setState('ready');play.focus({preventScroll:true});
})();
