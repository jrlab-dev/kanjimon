/* 21だけ：背面の人影→マナの一言→既存の入口2行。台詞・保存・出題は本体が担当。 */
(function(global){
 'use strict';
 let current=null,failedSeq=-1;
 const cache=new Map();
 function bounds(img){
  if(cache.has(img.src))return cache.get(img.src);
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data;
  let top=c.height,bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>=64){top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
  if(bottom<=top)throw Error('Empty character');const b={fill:(bottom-top)/c.height,pad:(c.height-bottom)/c.height};cache.set(img.src,b);return b;
 }
 function create(walk,onDone){
  current?.close();const seq=fieldSeq,root=document.createElement('section');root.id='nokogiriStory';root.dataset.beat=walk?'walk':'notice';root.setAttribute('aria-label','のこぎりやまの 石段');
  root.innerHTML='<div class="ng-view"><div class="ng-art"><img class="ng-bg" src="images/fullart/nokogiri-conversation.webp" alt="切り出された岩壁の間を奥へ上る石段と手前の踊り場"><div class="ng-walker" role="img" aria-label="石段を上って去る、大きな背中の人"></div></div><b class="ng-location">のこぎりやま・いしだん</b><button class="ng-close" type="button">もどる</button><div class="ng-stage"><img class="ng-hero" alt="石段を見る主人公"><img class="ng-mana" src="images/sprites/mana-conversation.webp" alt="マナ"></div></div><div class="ng-dialog"><b class="ng-speaker">マナ</b><div class="ng-slot"></div></div>';
  const stage=root.querySelector('.ng-stage'),slot=root.querySelector('.ng-slot'),walker=root.querySelector('.ng-walker');
  root.querySelector('.ng-hero').src='images/battle-tate/hero-back-'+(heroChar==='girl'?'girl':'boy')+costumeSuffix()+'.webp';document.body.appendChild(root);
  let musicToken=walk?global.bgmSceneBegin('maros-passerby-21',BGM_MAROS_PASSERBY_THEMES[21]):null,live=true,ready=false,watch=0,timeout=0,raf=0,callback=onDone,beat=walk?'walk':'notice';
  function restore(){const win=slot.querySelector('#hakaseTalkWin'),wrap=$('fieldWrap');if(win&&wrap){wrap.appendChild(win);positionHakaseTalkWindow(win,wrap);}}
  let talkGeneration=walk?null:ztMusicGeneration;
  function claimTalk(){talkGeneration=ztMusicGeneration;}
  function endMusic(){global.bgmSceneEnd(musicToken);musicToken=null;}
  function close(){if(!live)return;live=false;endMusic();clearInterval(watch);clearTimeout(timeout);cancelAnimationFrame(raf);callback=null;document.removeEventListener('keydown',key);restore();root.remove();if(current===api)current=null;}
  function abort(){if(!live)return;if(talkGeneration!==ztMusicGeneration){if(talkGeneration===null&&!ztActive){pbActive=false;heroLock=false;}close();return;}cancelZoneTalkMusic(talkGeneration);pbActive=false;heroLock=false;ztActive=false;hakaseMsgSeq++;hakaseTapTrigger=null;stopBattleHakaseVoice();global.speechSynthesis?.cancel();hakaseDuckRelease();close();hideHakaseTalkWindow();}
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();abort();showScreen('screen-title');}}
  function line(next){if(!live)return;if(next!=='walk'&&next!=='notice')endMusic();beat=next;root.dataset.beat=next;if(ready){const win=$('hakaseTalkWin');if(win)slot.appendChild(win);}}
  function finishWalk(){if(!live)return;pbActive=false;heroLock=false;walker.style.opacity='0';line('notice');const done=callback;callback=null;done?.();}
  function animate(){
   const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,start=performance.now(),duration=reduced?1200:PB_MS;
   walker.style.backgroundImage="url('images/sprites/maro-back-walk3.webp?walk=20261003d')";
   // 採用背景1024x1536の中央石段：足元y=860→480、x=512。両者を同じ絵座標で移す。
   const frame=now=>{if(!live)return;const t=Math.min(1,(now-start)/duration),progress=reduced?1:t;
    const sc=1-(1-PB_END_SC)*progress;walker.style.top=(56-24.75*progress)+'%';walker.style.setProperty('--scale',sc);
    const pose=reduced?1:[0,1,2,1][Math.floor((now-start)/PB_STEP_MS)%4];
    walker.style.backgroundPosition=(pose*50)+'% 0%';walker.dataset.pose=String(pose);
    walker.style.opacity=String(t>.89?Math.max(0,(1-t)/.11):1);walker.dataset.progress=String(progress);walker.dataset.reduced=String(reduced);
    if(t<1)raf=requestAnimationFrame(frame);else finishWalk();};
   raf=requestAnimationFrame(frame);
  }
  const api={close,abort,line,endMusic,claimTalk};current=api;root.querySelector('.ng-close').onclick=()=>{abort();showScreen('screen-title');};document.addEventListener('keydown',key);
  root.querySelector('.ng-dialog').onclick=e=>{if(!e.target.closest('#hakaseTalkWin'))hakaseTapAdvance();};
  watch=setInterval(()=>{if(seq!==fieldSeq||fieldZone!==21||!$('screen-field')?.classList.contains('active'))abort();},80);
  function fallback(){if(!live)return;failedSeq=seq;const done=callback;callback=null;pbActive=false;heroLock=false;close();if(seq===fieldSeq&&fieldZone===21)done?.();}
  const sheet=new Image();sheet.src='images/sprites/maro-back-walk3.webp?walk=20261003d';
  timeout=setTimeout(fallback,4000);
  Promise.all([...root.querySelectorAll('img'),sheet].map(img=>img.decode())).then(()=>{
   if(!live)return;if(seq!==fieldSeq||fieldZone!==21){abort();return;}clearTimeout(timeout);
   for(const name of ['hero','mana']){const b=bounds(root.querySelector('.ng-'+name));stage.style.setProperty('--'+name+'-fill',b.fill);stage.style.setProperty('--'+name+'-pad',b.pad);}
   ready=true;root.classList.add('ready');line(beat);if(walk)animate();
  }).catch(fallback);
  return api;
 }
 global.NokogiriStory={
  start(zone,onDone){if(zone!==21)return false;failedSeq=-1;pbActive=true;pbSeq=fieldSeq;stopAutoExplore();heroLock=true;create(true,onDone);return true;},
  openTalk(lines){
   if(fieldZone!==21||failedSeq===fieldSeq)return null;
   const intro=lines===ZONE_TALK[21].in,notice=lines.length===1&&lines[0].text===PASSERBY[21].mana;
   if(!intro&&!notice)return null;
   const scene=current||create(false);scene.claimTalk();return{line(n){scene.line(notice?'notice':n===0?'stone':'warning');},close(){if(notice){scene.endMusic();scene.line('notice');}else scene.close();}};
  },
  abort(){current?.abort();},beforeScreen(id){if(id!=='screen-field')current?.abort();}
 };
})(window);
