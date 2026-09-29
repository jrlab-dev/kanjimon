/* 37の解決3行だけ。言葉と音声、バナーと保存の進行は既存本体が担当。 */
(function(global){
 'use strict';
 let current=null;
 const cache=new Map();
 function bounds(img){
  if(cache.has(img.src))return cache.get(img.src);
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data;
  let top=c.height,bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>=64){top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
  if(bottom<=top)throw Error('Empty character');const b={fill:(bottom-top)/c.height,pad:(c.height-bottom)/c.height};cache.set(img.src,b);return b;
 }
 function create(){
  current?.close();const seq=fieldSeq,root=document.createElement('section');root.id='miyakoStory';root.dataset.beat='earth';root.setAttribute('aria-label','ナラの古代の都跡での会話');
  root.innerHTML='<div class="my-view"><div class="my-art"><img class="my-bg" src="images/fullart/miyako-conversation.webp" alt="低い礎石と浅い発掘跡のある草原、遠くに丸い丘"><div class="my-hat" role="img" aria-label="丘の向こうから現れ、背を向けて去る笠の人"><div class="my-traveler"><img class="my-front" src="images/sprites/maros-full-front-clean.webp" alt=""><div class="my-back"></div></div></div></div><b class="my-location">ナラ・こだいの みやこあと</b><button class="my-close" type="button">もどる</button><div class="my-stage"><img class="my-hero" alt="マナの話を聞く主人公"><img class="my-mana" src="images/sprites/mana-conversation.webp" alt="マナ"></div></div><div class="my-dialog"><b class="my-speaker">マナ</b><div class="my-slot"></div></div>';
  const stage=root.querySelector('.my-stage'),slot=root.querySelector('.my-slot');
  root.querySelector('.my-hero').src='images/battle-tate/hero-back-'+(heroChar==='girl'?'girl':'boy')+costumeSuffix()+'.webp';document.body.appendChild(root);
  let live=true,ready=false,index=0,watch=0,timeout=0,raf=0;const timers=new Set();
  const hat=root.querySelector('.my-hat'),traveler=root.querySelector('.my-traveler'),front=root.querySelector('.my-front'),back=root.querySelector('.my-back');
  function later(fn,ms){const id=setTimeout(()=>{timers.delete(id);if(live)fn();},ms);timers.add(id);}
  function motion(depart,done){
   const start=performance.now(),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
   function tick(now){
    if(!live)return;
    const t=reduced?(depart?2100:1500):now-start;
    const phase=depart?(t<300?'turn':t<2100?'leave':'gone'):(t<1500?'climb':'stand');
    const y=depart?(t<300?0:Math.min(100,(t-300)/18)):Math.max(0,100*(1-t/1500));
    const turn=phase==='turn'?t/300:0,rear=phase==='leave'||phase==='gone'||(phase==='turn'&&turn>=.5);
    const scale=phase==='turn'?.6+.4*Math.abs(1-2*turn):1;
    const pose=phase==='leave'?[0,1,2,1][Math.floor((t-300)/150)%4]:1;
    hat.dataset.phase=phase;hat.dataset.progress=String(y);back.dataset.pose=String(pose);
    traveler.style.transform='translateY('+(y+(phase==='climb'?Math.sin(t/150*Math.PI)*.8:0))+'%) scaleX('+scale+')';
    front.style.visibility=rear?'hidden':'visible';back.style.visibility=rear?'visible':'hidden';
    back.style.backgroundPosition=(pose*50)+'% 0%';
    if(t<(depart?2100:1500))raf=requestAnimationFrame(tick);else done();
   }
   raf=requestAnimationFrame(tick);
  }
  function playLine(n,ln,done){
   if(n!==2||!live)return false;
   if(!ready){close();return false;}
   index=2;root.dataset.beat='hill';root.dataset.sequence='reveal';root.classList.add('my-sequencing');
   hakaseMsgSeq++;hakaseTapTrigger=null;stopBattleHakaseVoice();heroLock=true;hakaseDuckAcquire();
   showHakaseTalkWindow('……');slot.appendChild($('hakaseTalkWin'));
   motion(false,()=>later(()=>{
    root.dataset.sequence='notice';showHakaseTalkWindow('……あの おか。');slot.appendChild($('hakaseTalkWin'));
    playBattleHakaseVoice('zt37o3_hill');const voice=battleHakaseAudioEl,started=performance.now();
    function awaitVoice(){
     if(!live)return;
     const elapsed=performance.now()-started;
     if(elapsed<1600||(voice&&!voice.ended&&!voice.error&&battleHakaseAudioEl===voice&&elapsed<6000)){later(awaitVoice,40);return;}
     stopBattleHakaseVoice();later(()=>{
      root.dataset.sequence='depart';motion(true,()=>later(()=>{
       root.dataset.sequence='remember';root.classList.remove('my-sequencing');
       hakaseTalkOnce('かさが 一つ、見えた 気が した。',()=>{if(live)done();},'zt37o3_hat');slot.appendChild($('hakaseTalkWin'));
      },300));
     },300);
    }
    awaitVoice();
   },350));return true;
  }
  function restore(){const win=slot.querySelector('#hakaseTalkWin'),wrap=$('fieldWrap');if(win&&wrap){wrap.appendChild(win);positionHakaseTalkWindow(win,wrap);}}
  function close(){if(!live)return;live=false;clearInterval(watch);clearTimeout(timeout);cancelAnimationFrame(raf);for(const id of timers)clearTimeout(id);timers.clear();document.removeEventListener('keydown',key);restore();root.remove();if(current===api)current=null;}
  function abort(){if(!live)return;ztActive=false;heroLock=false;hakaseMsgSeq++;hakaseTapTrigger=null;stopBattleHakaseVoice();global.speechSynthesis?.cancel();hakaseDuckRelease();close();hideHakaseTalkWindow();}
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();abort();showScreen('screen-title');}}
  function line(n){if(!live)return;index=n;root.dataset.beat=['earth','memory','hill'][n]||'earth';if(ready){const win=$('hakaseTalkWin');if(win)slot.appendChild(win);}}
  const api={close,abort,line,playLine};current=api;
  root.querySelector('.my-close').onclick=()=>{abort();showScreen('screen-title');};document.addEventListener('keydown',key);
  root.querySelector('.my-dialog').onclick=e=>{if(!e.target.closest('#hakaseTalkWin'))hakaseTapAdvance();};
  watch=setInterval(()=>{if(seq!==fieldSeq||fieldZone!==37||!$('screen-field')?.classList.contains('active'))abort();},80);
  const sheet=new Image();sheet.src='images/sprites/maro-back-walk3.webp';
  timeout=setTimeout(close,4000);
  Promise.all([...root.querySelectorAll('img'),sheet].map(img=>img.decode())).then(()=>{
   if(!live)return;if(seq!==fieldSeq||fieldZone!==37){abort();return;}clearTimeout(timeout);
   for(const name of ['hero','mana']){const b=bounds(root.querySelector('.my-'+name));stage.style.setProperty('--'+name+'-fill',b.fill);stage.style.setProperty('--'+name+'-pad',b.pad);}
   const fb=bounds(front);hat.style.setProperty('--front-height',(87.5/fb.fill)+'%');hat.style.setProperty('--front-bottom',(6.25-87.5/fb.fill*fb.pad)+'%');
   ready=true;root.classList.add('ready');line(index);
  }).catch(close);
  return api;
 }
 global.MiyakoStory={
  openTalk(lines){return fieldZone===37&&lines===ZONE_TALK[37].out?create():null;},
  abort(){current?.abort();},beforeScreen(id){if(id!=='screen-field')current?.abort();}
 };
})(window);
