/* 2年14：善意の読み上げと、自分で読む楽しさ。既存の台詞・音声・進行を使う。 */
(function(global){
 'use strict';
 let current=null;
 const silhouettes=new Map();
 function bounds(img){
  if(silhouettes.has(img.src))return silhouettes.get(img.src);
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;
  let top=c.height,bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>=64){top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
  if(bottom<=top)throw Error('Empty character');const b={fill:(bottom-top)/c.height,pad:(c.height-bottom)/c.height};silhouettes.set(img.src,b);return b;
 }
 function open(){
  current?.close();const seq=fieldSeq,root=document.createElement('section');root.id='utsunomiyaStory';root.dataset.beat='place';root.dataset.speaker='mana';root.setAttribute('aria-label','石のひろまでの会話');
  root.innerHTML='<div class="uq-view"><div class="uq-art"><img class="uq-bg" src="images/fullart/utsunomiya-conversation.webp" alt="切り出し跡のある石の角柱と、あたたかな見学照明の地下広間"></div><b class="uq-location">うつのみや・いしの ひろま</b><button class="uq-close" type="button">もどる</button><div class="uq-board" aria-label="見学の時刻。午前10、時の字が欠けている、半"><small>けんがく</small><div><span>午前</span><b>10</b><i aria-hidden="true"></i><span>半</span></div></div><div class="uq-stage"><img class="uq-hero" alt="話を聞く主人公"><img class="uq-mana" src="images/sprites/mana-conversation.webp" alt="マナ"><img class="uq-easy" src="images/easy-motion/easy_01_attend/frame-000.webp" alt="イージー"></div></div><div class="uq-dialog"><b class="uq-speaker">マナ</b><div class="uq-slot"></div></div>';
  const stage=root.querySelector('.uq-stage'),slot=root.querySelector('.uq-slot');
  root.querySelector('.uq-hero').src='images/battle-tate/hero-back-'+(heroChar==='girl'?'girl':'boy')+costumeSuffix()+'.webp';document.body.appendChild(root);
  let live=true,ready=false,index=0,row=null,timer=0,motion=null,motionStarted=false;
  function restore(){const box=slot.querySelector('#evBox');if(box)$('evOverlay').appendChild(box);}
  function close(){
   if(!live)return;live=false;clearInterval(timer);document.removeEventListener('keydown',key);
   if(motion){if(global.AmamiMotion.current===motion)global.AmamiMotion.stop();else motion.stop();motion=null;}
   restore();root.remove();if(current===api)current=null;
  }
  function abort(){if(!live)return;close();if(evActive&&evZone===14)evFinish(false);}
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();abort();showScreen('screen-title');}}
  function line(n,s){
   if(!live)return;index=n;row=s;const who=s?.who==='easy'?'easy':'mana';root.dataset.speaker=who;root.querySelector('.uq-speaker').textContent=who==='easy'?'イージー':'マナ';
   root.dataset.beat=n===0?'place':n===1?'sign':n<4?'help':n===4?'thanks':n===5?'pause':'your-turn';
   if(ready){slot.appendChild($('evBox'));
    if(n>=2&&!motionStarted){motionStarted=true;if(!matchMedia('(prefers-reduced-motion:reduce)').matches&&global.AmamiMotion){const easy=root.querySelector('.uq-easy');motion=global.AmamiMotion.play(easy,'02',{onDone({fallback}){if(live&&fallback)easy.src='images/easy-motion/easy_01_attend/frame-000.webp';}});}}
   }
  }
  root.querySelector('.uq-close').onclick=e=>{e.stopPropagation();abort();showScreen('screen-title');};root.addEventListener('click',()=>{if(live&&ready)evAdvance();});document.addEventListener('keydown',key);
  const api={close,abort,line};current=api;
  timer=setInterval(()=>{if(fieldSeq!==seq||fieldZone!==14||!$('screen-field')?.classList.contains('active'))abort();},80);
  Promise.all([...root.querySelectorAll('img')].map(img=>img.decode())).then(()=>{
   if(!live)return;if(fieldSeq!==seq||fieldZone!==14){abort();return;}
   for(const name of ['hero','mana','easy']){const b=bounds(root.querySelector('.uq-'+name));stage.style.setProperty('--'+name+'-fill',b.fill);stage.style.setProperty('--'+name+'-pad',b.pad);}
   ready=true;root.classList.add('ready');line(index,row);
  }).catch(()=>{if(!live)return;ready=false;restore();root.remove();});
  return api;
 }
 global.UtsunomiyaStory={openEvent(zone,phase){if(zone===14&&phase==='in'&&fieldZone===14)return open();return null;},eventLine(n,s){current?.line(n,s);},finishEvent(){current?.close();},abort(){current?.abort();},beforeScreen(id){if(id!=='screen-field')current?.abort();}};
})(window);
