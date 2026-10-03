/* 3年40：既存7行の会話と保存を維持し、子どもの退場を台詞より先に見せる。 */
(function(global){
 'use strict';
 let current=null;
 const cache=new Map();
 const $id=id=>document.getElementById(id);
 // 専用画像に失敗して旧演出へ戻った後も、40の中断を受け持つ。
 function abortAll(){
  current?.close();
  if(evActive&&evZone===40){evFinish(false);if(EvCutScene.isActive())EvCutScene.skip();}
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&evActive&&evZone===40){e.preventDefault();e.stopImmediatePropagation();abortAll();showScreen('screen-title');}},true);
 async function asset(src,col=0,row=0,cols=1,rows=1){
  const key=[src,col,row,cols,rows].join(':');if(cache.has(key))return cache.get(key);
  const img=new Image();img.src=src;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth/cols;canvas.height=img.naturalHeight/rows;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,col*canvas.width,row*canvas.height,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let x0=canvas.width,y0=canvas.height,x1=0,y1=0;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>=64){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);}
  if(y1<=y0)throw Error('Empty actor');
  const trimmed=document.createElement('canvas');trimmed.width=x1-x0;trimmed.height=y1-y0;trimmed.getContext('2d').drawImage(canvas,x0,y0,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);
  const result={src:trimmed.toDataURL('image/png'),ratio:trimmed.width/trimmed.height};cache.set(key,result);return result;
 }
 function open(){
  current?.close();const seq=fieldSeq,root=document.createElement('section');root.id='udonStory';root.dataset.beat='arrival';root.setAttribute('aria-label','うどんの里の出来事');
  root.innerHTML='<div class="ud-view"><img class="ud-bg" src="images/fullart/udon-conversation.webp" alt="瓦屋根の店と田園に囲まれた土の広場"><b class="ud-location">うどんの さと</b><button class="ud-close" type="button">もどる</button><div class="ud-cast"><img class="ud-man" alt="笠で目を隠した大きな男の正面姿"><img class="ud-kid k0" alt="男の子"><img class="ud-kid k1" alt="女の子"><img class="ud-kid k2" alt="男の子"><img class="ud-hero" alt="見守る主人公"><img class="ud-mana" alt="マナ"></div></div><div class="ud-dialog"><b class="ud-speaker">マナ</b><div class="ud-slot"></div><p class="ud-cut-text" aria-live="polite"></p><span class="ud-next">▼ つづく</span></div>';
  document.body.appendChild(root);
  const slot=root.querySelector('.ud-slot'),cutText=root.querySelector('.ud-cut-text'),kids=[...root.querySelectorAll('.ud-kid')],speaker=root.querySelector('.ud-speaker');
  let live=true,ready=false,index=0,scene=false,cut=-1,running=false,raf=0,deadline=0,watch=0,onDone=null,frames=[];
  const valid=()=>live&&fieldSeq===seq&&fieldZone===40&&evActive;
  function restore(){const box=slot.querySelector('#evBox');if(box)$id('evOverlay').appendChild(box);}
  function close(){if(!live)return;live=false;clearTimeout(deadline);clearInterval(watch);cancelAnimationFrame(raf);document.removeEventListener('keydown',key,true);restore();root.remove();if(current===api)current=null;}
  function abort(){abortAll();}
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();abort();showScreen('screen-title');}}
  function line(n){if(!live)return;index=n;root.dataset.beat=n===0?'arrival':n===1?'gather':'after';speaker.textContent='マナ';root.dataset.scene='false';if(ready)slot.appendChild($id('evBox'));}
  function showCut(n){
   if(!valid())return;cut=n;const row=EV_CUT_SCENES.udon40.cuts[n];root.dataset.cut=String(n);root.dataset.beat=n===2?'after':'gather';root.dataset.scene='true';
   speaker.innerHTML=global.talkText?global.talkText(row.maros?'かさの おとこ':row.who,40):(row.maros?'かさの おとこ':row.who);cutText.innerHTML=global.talkText?global.talkText(row.text,40):row.text;
   if(row.snd)playBattleHakaseVoice(row.snd);else stopBattleHakaseVoice();
  }
  function escapeKids(){
   running=true;root.dataset.running='true';root.dataset.beat='run';cutText.textContent='';stopBattleHakaseVoice();
   const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,start=performance.now();
   function tick(){
    if(!valid())return;const elapsed=Math.max(0,performance.now()-start);
    kids.forEach((img,i)=>{
     const t=reduced?1:Math.max(0,Math.min(1,(elapsed-i*130)/1450));
     const a=frames[i].run[Math.floor(elapsed/140)%2];img.src=a.src;
     img.style.setProperty('--dx',(i===0?-1:1)*t*110+'cqw');img.style.setProperty('--dy',t*8+'cqh');
     img.style.setProperty('--flip',i===0?-1:1);
    });
    if(reduced||elapsed>=1800){kids.forEach(k=>k.style.visibility='hidden');running=false;root.dataset.running='false';showCut(2);return;}
    raf=requestAnimationFrame(tick);
   }tick();
  }
  function next(){
   if(!valid()||!ready||running)return;
   if(!scene){evAdvance();return;}
   if(cut===0){showCut(1);return;}
   if(cut===1){escapeKids();return;}
   scene=false;root.dataset.scene='false';const done=onDone;onDone=null;done?.();
  }
  function startScene(name,done){
   if(name!=='udon40')return false;
   if(!ready){close();return false;}
   scene=true;onDone=done;showCut(0);return true;
  }
  const api={close,abort,line,startScene,busy:()=>scene,next};current=api;
  root.querySelector('.ud-close').onclick=e=>{e.stopPropagation();abort();showScreen('screen-title');};root.addEventListener('click',next);document.addEventListener('keydown',key,true);
  deadline=setTimeout(close,4000);
  watch=setInterval(()=>{if(!valid()||!$id('screen-field')?.classList.contains('active'))abort();},80);
  const gender=heroChar==='girl'?'girl':'boy',paths=['m-a','f-a','m-b'];
  Promise.all([
   root.querySelector('.ud-bg').decode(),
   asset(heroSheetUrl(),0,1,3,2),asset('images/sprites/mana-conversation.webp'),
   asset('images/sprites/maros-full-front-clean.webp'),
   ...paths.map(async name=>({front:await asset('images/sprites/kid-scared-'+name+'.webp?walk=20261003d',1,1,3,2),run:await Promise.all([0,1].map(row=>asset('images/sprites/kid-scared-'+name+'.webp?walk=20261003d',2,row,3,2)))}))
  ]).then(async ([,hero,mana,man,...people])=>{
   if(!valid())return;frames=people;
   for(const [selector,a]of [['.ud-hero',hero],['.ud-mana',mana],['.ud-man',man],...people.map((a,i)=>['.k'+i,a.front])])root.querySelector(selector).src=a.src;
   await Promise.all([...root.querySelectorAll('.ud-cast img')].map(img=>img.decode()));
   if(!valid())return;clearTimeout(deadline);ready=true;root.classList.add('ready');line(index);
  }).catch(close);
  return api;
 }
 global.UdonStory={openEvent(z,phase){if(z===40&&phase==='in'&&fieldZone===40)return open();},eventLine(n){current?.line(n);},scene(name,done){return current?.startScene(name,done)||false;},busy(){return current?.busy()||false;},finishEvent(){current?.close();},abort:abortAll,beforeScreen(id){if(id!=='screen-field')abortAll();}};
})(window);
