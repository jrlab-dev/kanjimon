/* 2年17：調査を一緒に見て、未解明の因果を保留する。既存の台詞・音声・進行を使う。 */
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
  current?.close();const seq=fieldSeq,root=document.createElement('section');root.id='tsukubaStory';root.dataset.beat='place';root.dataset.speaker='mana';root.setAttribute('aria-label','研究所での会話');
  root.innerHTML='<div class="tq-view"><div class="tq-art"><img class="tq-bg" src="images/fullart/tsukuba-conversation.webp" alt="白い研究棟と丸い屋根を望む、昼の研究所前庭"></div><b class="tq-location">つくば・けんきゅうじょ</b><button class="tq-close" type="button">もどる</button><div class="tq-notes" aria-label="マナの研究資料"><b class="tq-note-title">しらべている こと</b><div class="tq-records"><span>字が あばれた ところ</span><span>大きな せなかの 人</span></div><div class="tq-orders"><div><span>人が 来る</span><b>→</b><span>字が あばれる</span></div><div><span>字が あばれる</span><b>→</b><span>人が 来る</span></div></div><b class="tq-question">どちらが さき？</b></div><div class="tq-stage"><img class="tq-hero" alt="資料を見る主人公"><img class="tq-mana" src="images/sprites/mana-conversation.webp" alt="マナ"></div></div><div class="tq-dialog"><b class="tq-speaker">マナ</b><div class="tq-slot"></div></div>';
  const stage=root.querySelector('.tq-stage'),slot=root.querySelector('.tq-slot');
  root.querySelector('.tq-hero').src='images/battle-tate/hero-back-'+(heroChar==='girl'?'girl':'boy')+costumeSuffix()+'.webp';document.body.appendChild(root);
  let live=true,ready=false,index=0,row=null,timer=0;
  function restore(){const box=slot.querySelector('#evBox');if(box)$('evOverlay').appendChild(box);}
  function close(){
   if(!live)return;live=false;clearInterval(timer);document.removeEventListener('keydown',key);
   restore();root.remove();if(current===api)current=null;
  }
  function abort(){if(!live)return;close();if(evActive&&evZone===17)evFinish(false);}
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();abort();showScreen('screen-title');}}
  function line(n,s){
   if(!live)return;index=n;row=s;const who='mana';root.dataset.speaker=who;root.querySelector('.tq-speaker').textContent=who==='easy'?'イージー':'マナ';
   root.dataset.beat=n===0?'place':n===1?'show':n===2?'records':n===3?'question':'hold';
   root.querySelector('.tq-question').textContent=n===4?'まだ わからない':'どちらが さき？';
   if(ready){slot.appendChild($('evBox'));
   }
  }
  root.querySelector('.tq-close').onclick=e=>{e.stopPropagation();abort();showScreen('screen-title');};root.addEventListener('click',()=>{if(live&&ready)evAdvance();});document.addEventListener('keydown',key);
  const api={close,abort,line};current=api;
  timer=setInterval(()=>{if(fieldSeq!==seq||fieldZone!==17||!$('screen-field')?.classList.contains('active'))abort();},80);
  Promise.all([...root.querySelectorAll('img')].map(img=>img.decode())).then(()=>{
   if(!live)return;if(fieldSeq!==seq||fieldZone!==17){abort();return;}
   for(const name of ['hero','mana']){const b=bounds(root.querySelector('.tq-'+name));stage.style.setProperty('--'+name+'-fill',b.fill);stage.style.setProperty('--'+name+'-pad',b.pad);}
   ready=true;root.classList.add('ready');line(index,row);
  }).catch(()=>{if(!live)return;ready=false;restore();root.remove();});
  return api;
 }
 global.TsukubaStory={openEvent(zone,phase){if(zone===17&&phase==='in'&&fieldZone===17)return open();return null;},eventLine(n,s){current?.line(n,s);},finishEvent(){current?.close();},abort(){current?.abort();},beforeScreen(id){if(id!=='screen-field')current?.abort();}};
})(window);
