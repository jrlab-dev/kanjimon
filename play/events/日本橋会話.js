/* 日本橋の既存4台詞に背景と演技を添える。会話進行・音声・保存は本体が担当。 */
(function(global){
 'use strict';
 let current=null;
 const cache=new Map();
 function bounds(img){
  if(cache.has(img.src))return cache.get(img.src);
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
  const a=ctx.getImageData(0,0,c.width,c.height).data;let top=c.height,bottom=0,left=c.width,right=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>=64){top=Math.min(top,y);bottom=Math.max(bottom,y+1);left=Math.min(left,x);right=Math.max(right,x+1);}
  if(bottom<=top)throw Error('Empty character');
  const result={fill:(bottom-top)/c.height,pad:(c.height-bottom)/c.height,left,right,top,bottom,width:c.width,height:c.height};cache.set(img.src,result);return result;
 }
 function open(lines){
  if(fieldZone!==1||typeof ZONE_TALK==='undefined')return null;
  const phase=lines===ZONE_TALK[1].in?'in':lines===ZONE_TALK[1].out?'out':null;
  if(!phase)return null;
  current?.close();
  const seq=fieldSeq,root=document.createElement('section');root.id='nihonbashiScene';root.dataset.phase=phase;root.dataset.beat='arrival';
  root.setAttribute('aria-label','にほんばしの みちしるべ');
  root.innerHTML='<div class="nh-view"><img class="nh-bg" src="images/fullart/nihonbashi-conversation.webp" alt="川にかかる日本橋と町へ続く道"><b class="nh-location">にほんばし</b><button class="nh-close" type="button" aria-label="会話を中断してタイトルへ戻る">もどる</button><div class="nh-sign" aria-label="まだ数が読めない道しるべ"><img class="nh-sign-art" src="images/parts/びわこ_案内板.webp" alt=""><div class="nh-board"><span>一</span><span>二</span><span>三</span><i class="nh-unread" aria-hidden="true"></i></div></div><div class="nh-stage"><img class="nh-hero" alt="道しるべを見ている主人公"><img class="nh-mana" src="images/sprites/mana-conversation.webp" alt="マナ"></div></div><div class="nh-talk-slot"></div>';
  const hero=root.querySelector('.nh-hero'),mana=root.querySelector('.nh-mana'),stage=root.querySelector('.nh-stage'),slot=root.querySelector('.nh-talk-slot');
  hero.src='images/battle-tate/hero-back-'+(heroChar==='girl'?'girl':'boy')+costumeSuffix()+'.webp';
  document.body.appendChild(root);
  let live=true,ready=false,index=0,watch=0,run=0;
  function returnWindow(){
   const win=slot.querySelector('#hakaseTalkWin'),wrap=document.getElementById('fieldWrap');
   if(win&&wrap){wrap.appendChild(win);positionHakaseTalkWindow(win,wrap);}
  }
  function close(){
   if(!live)return;live=false;clearInterval(watch);run++;
   document.removeEventListener('keydown',key);
   returnWindow();root.remove();if(current===api)current=null;
  }
  function abort(){
   if(!live)return;
   hakaseMsgSeq++;hakaseTapTrigger=null;ztActive=false;heroLock=false;
   stopBattleHakaseVoice();hakaseDuckRelease();close();hideHakaseTalkWindow();
  }
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();abort();showScreen('screen-title');}}
  function line(n){
   if(!live)return;index=n;root.dataset.beat=phase==='in'?'arrival':n===0?'read':n===1?'understand':'remember';
   root.querySelector('.nh-sign').setAttribute('aria-label',phase==='in'?'まだ数が読めない道しるべ':'一、二、三と読める道しるべ');
   if(ready){const win=document.getElementById('hakaseTalkWin');if(win)slot.appendChild(win);}
  }
  root.querySelector('.nh-close').onclick=()=>{abort();showScreen('screen-title');};
  document.addEventListener('keydown',key);
  const api={close,abort,line};current=api;
  watch=setInterval(()=>{if(fieldSeq!==seq||fieldZone!==1||!document.getElementById('screen-field')?.classList.contains('active'))abort();},80);
  const token=++run;
  Promise.all([...root.querySelectorAll('img')].map(img=>img.decode())).then(()=>{
   if(!live||run!==token)return;
   if(fieldSeq!==seq||fieldZone!==1){abort();return;}
   for(const [name,img]of[['hero',hero],['mana',mana]]){const b=bounds(img);stage.style.setProperty('--'+name+'-fill',b.fill);stage.style.setProperty('--'+name+'-pad',b.pad);img.dataset.bounds=JSON.stringify(b);}
   ready=true;root.classList.add('ready');line(index);
  }).catch(()=>{if(!live)return;ready=false;returnWindow();root.remove();});
  return api;
 }
 global.NihonbashiScene={open,abort:()=>current?.abort(),beforeScreen:id=>{if(id!=='screen-field')current?.abort();}};
})(window);
