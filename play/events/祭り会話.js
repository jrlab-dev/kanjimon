/* 33だけ：背面の人影→マナの一言→既存の入口2行。台詞・保存・出題は本体が担当。 */
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
  current?.close();const seq=fieldSeq,root=document.createElement('section');root.id='festivalStory';root.dataset.beat=walk?'walk':'notice';root.setAttribute('aria-label','にぎわいの まつり');
  root.innerHTML='<div class="fs-view"><div class="fs-art"><img class="fs-bg" src="images/fullart/festival-conversation.webp" alt="提灯と屋台にはさまれた夕方の祭りの通り"><div class="fs-walker" role="img" aria-label="笠をかぶり、無言で去る大きな人"></div><div class="fs-crowd" data-person="woman" role="img" aria-label="祭りを楽しむ町の人の後ろ姿" style="left:40%;top:59%;width:24%;background-image:url(images/sprites/npc-mob-otona-f-a.webp)"></div><div class="fs-crowd" data-person="man" role="img" aria-label="祭りを楽しむ町の人の後ろ姿" style="left:57%;top:67%;width:29%;background-image:url(images/sprites/npc-mob-otona-m-a.webp)"></div><div class="fs-crowd" data-person="woman2" role="img" aria-label="祭りを楽しむ町の人の後ろ姿" style="left:76%;top:63%;width:26%;background-image:url(images/sprites/npc-mob-otona-f-b.webp)"></div><div class="fs-crowd" data-person="man2" role="img" aria-label="祭りを楽しむ町の人の後ろ姿" style="left:70%;top:49%;width:18%;z-index:0;background-image:url(images/sprites/npc-mob-otona-m-b.webp)"></div></div><b class="fs-location">にぎわいの まつり</b><button class="fs-close" type="button">もどる</button><div class="fs-stage"><img class="fs-hero" alt="祭りでマナの話を聞く主人公"><img class="fs-mana" src="images/sprites/mana-conversation.webp" alt="マナ"></div></div><div class="fs-dialog"><b class="fs-speaker">マナ</b><div class="fs-slot"></div></div>';
  const stage=root.querySelector('.fs-stage'),slot=root.querySelector('.fs-slot'),walker=root.querySelector('.fs-walker');
  root.querySelector('.fs-hero').src='images/battle-tate/hero-back-'+(heroChar==='girl'?'girl':'boy')+costumeSuffix()+'.webp';document.body.appendChild(root);
  let live=true,ready=false,watch=0,timeout=0,raf=0,callback=onDone,beat=walk?'walk':'notice';
  function restore(){const win=slot.querySelector('#hakaseTalkWin'),wrap=$('fieldWrap');if(win&&wrap){wrap.appendChild(win);positionHakaseTalkWindow(win,wrap);}}
  function close(){if(!live)return;live=false;clearInterval(watch);clearTimeout(timeout);cancelAnimationFrame(raf);callback=null;document.removeEventListener('keydown',key);restore();root.remove();if(current===api)current=null;}
  function abort(){if(!live)return;pbActive=false;heroLock=false;ztActive=false;hakaseMsgSeq++;hakaseTapTrigger=null;stopBattleHakaseVoice();global.speechSynthesis?.cancel();hakaseDuckRelease();close();hideHakaseTalkWindow();}
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();abort();showScreen('screen-title');}}
  function line(next){if(!live)return;beat=next;root.dataset.beat=next;if(ready){const win=$('hakaseTalkWin');if(win)slot.appendChild(win);}}
  function finishWalk(){if(!live)return;pbActive=false;heroLock=false;walker.style.opacity='0';line('notice');const done=callback;callback=null;done?.();}
  function animate(){
   root.dataset.motion='stand';walker.style.visibility='visible';walker.dataset.pose='1';walker.dataset.progress='0';walker.style.backgroundPosition='50% 0%';
   const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,start=performance.now(),hold=reduced?600:1200,duration=reduced?1200:PB_MS;
   walker.style.backgroundImage="url('images/sprites/maro-back-walk3.webp')";
   const frame=now=>{if(!live)return;const elapsed=now-start,standing=elapsed<hold,t=Math.min(1,Math.max(0,(elapsed-hold)/duration)),progress=reduced?0:t;
    root.dataset.motion=standing?'stand':'walk';walker.style.visibility='visible';
    const sc=1-(1-PB_END_SC)*progress;walker.style.top=(66-18*progress)+'%';walker.style.left=(60+12*progress)+'%';walker.style.setProperty('--scale',sc);
    const pose=(reduced||standing)?1:[0,1,2,1][Math.floor(Math.max(0,elapsed-hold)/PB_STEP_MS)%4];
    walker.style.backgroundPosition=(pose*50)+'% 0%';walker.dataset.pose=String(pose);
    walker.style.opacity=String(t>.89?Math.max(0,(1-t)/.11):1);walker.dataset.progress=String(progress);walker.dataset.reduced=String(reduced);
    if(t<1)raf=requestAnimationFrame(frame);else finishWalk();};
   raf=requestAnimationFrame(frame);
  }
  const api={close,abort,line};current=api;root.querySelector('.fs-close').onclick=()=>{abort();showScreen('screen-title');};document.addEventListener('keydown',key);
  root.querySelector('.fs-dialog').onclick=e=>{if(!e.target.closest('#hakaseTalkWin'))hakaseTapAdvance();};
  watch=setInterval(()=>{if(seq!==fieldSeq||fieldZone!==33||!$('screen-field')?.classList.contains('active'))abort();},80);
  function fallback(){if(!live)return;failedSeq=seq;const done=callback;callback=null;pbActive=false;heroLock=false;close();if(seq===fieldSeq&&fieldZone===33)done?.();}
  const sheet=new Image();sheet.src='images/sprites/maro-back-walk3.webp';
  timeout=setTimeout(fallback,4000);
  const crowdImages=["npc-mob-otona-f-a.webp", "npc-mob-otona-m-a.webp", "npc-mob-otona-f-b.webp", "npc-mob-otona-m-b.webp"].map(file=>{const img=new Image();img.src='images/sprites/'+file;return img;});
  Promise.all([...root.querySelectorAll('img'),sheet,...crowdImages].map(img=>img.decode())).then(()=>{
   if(!live)return;if(seq!==fieldSeq||fieldZone!==33){abort();return;}clearTimeout(timeout);
   for(const name of ['hero','mana']){const b=bounds(root.querySelector('.fs-'+name));stage.style.setProperty('--'+name+'-fill',b.fill);stage.style.setProperty('--'+name+'-pad',b.pad);}
   ready=true;root.classList.add('ready');line(beat);if(walk)animate();
  }).catch(fallback);
  return api;
 }
 global.FestivalStory={
  start(zone,onDone){if(zone!==33)return false;failedSeq=-1;pbActive=true;pbSeq=fieldSeq;stopAutoExplore();heroLock=true;create(true,onDone);return true;},
  openTalk(lines){
   if(fieldZone!==33||failedSeq===fieldSeq)return null;
   const intro=lines===ZONE_TALK[33].in,notice=lines.length===1&&lines[0].text===PASSERBY[33].mana;
   if(!intro&&!notice)return null;
   const scene=current||create(false);return{line(n){scene.line(notice?'notice':n===0?'stone':'warning');},close(){if(notice){scene.line('notice');}else scene.close();}};
  },
  abort(){current?.abort();},beforeScreen(id){if(id!=='screen-field')current?.abort();}
 };
})(window);
