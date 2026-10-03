/* 43の解決4行。進行・保存・音声の正本はZONE_TALKのまま。 */
(function(global){
 'use strict';
 let current=null;const cache=new Map();
 function abortAll(){
  current?.close();
  if(typeof fieldZone!=='undefined'&&fieldZone===43&&typeof ztActive!=='undefined'&&ztActive){
   ztActive=false;heroLock=false;hakaseMsgSeq++;hakaseTapTrigger=null;stopBattleHakaseVoice();global.speechSynthesis?.cancel();hakaseDuckRelease();hideHakaseTalkWindow();
  }
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&typeof fieldZone!=='undefined'&&fieldZone===43&&typeof ztActive!=='undefined'&&ztActive){e.preventDefault();e.stopImmediatePropagation();abortAll();showScreen('screen-title');}},true);
 async function asset(src,col=0,row=0,cols=1,rows=1){
  const key=[src,col,row,cols,rows].join('|');if(cache.has(key))return cache.get(key);
  const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=Math.floor(img.naturalWidth/cols);c.height=Math.floor(img.naturalHeight/rows);
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,col*c.width,row*c.height,c.width,c.height,0,0,c.width,c.height);const a=ctx.getImageData(0,0,c.width,c.height).data;
  let x0=c.width,y0=c.height,x1=0,y1=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>=64){x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}
  if(y1<=y0)throw Error('Empty actor');const t=document.createElement('canvas');t.width=x1-x0;t.height=y1-y0;t.getContext('2d').drawImage(c,x0,y0,t.width,t.height,0,0,t.width,t.height);const result=t.toDataURL('image/png');cache.set(key,result);return result;
 }
 function create(){
  current?.close();const seq=fieldSeq,root=document.createElement('section');root.id='kuroshioStory';root.dataset.phase='loading';root.setAttribute('aria-label','くろしおの海でのすれ違い');
  root.innerHTML='<div class="kr-view"><img class="kr-bg" src="images/battle-tate/stage43.webp" alt="青い海に沿う広い土の道"><div class="kr-cast"><img class="kr-hero" alt="すれ違う男を見る主人公"><img class="kr-mana" alt="黙って見守るマナ"><img class="kr-man" alt="笠をかぶった大きな男"></div><b class="kr-location">くろしおの うみ</b><button class="kr-close" type="button">もどる</button></div><div class="kr-dialog"><div class="kr-slot"></div><span class="kr-next">▼ つづく</span></div>';
  document.body.appendChild(root);const slot=root.querySelector('.kr-slot'),man=root.querySelector('.kr-man');
  let live=true,ready=false,busy=true,raf=0,watch=0,deadline=0,pending=null;let front=[],side=[];
  const valid=()=>live&&seq===fieldSeq&&fieldZone===43&&ztActive&&$('screen-field')?.classList.contains('active');
  function mount(){const win=$('hakaseTalkWin');if(win)slot.appendChild(win);}
  function restore(){const win=slot.querySelector('#hakaseTalkWin'),wrap=$('fieldWrap');if(win&&wrap){wrap.appendChild(win);positionHakaseTalkWindow(win,wrap);}}
  function close(){if(!live)return;live=false;clearInterval(watch);clearTimeout(deadline);cancelAnimationFrame(raf);pending=null;restore();root.remove();if(current===api)current=null;}
  function fallback(){if(!valid()){close();return;}const p=pending;close();if(p)hakaseTalkOnce(p.ln.text,p.done,p.ln.snd||undefined);}
  function say(ln,done){if(!valid())return;busy=false;root.dataset.busy='false';hakaseTalkOnce(ln.text,()=>{if(valid())done();},ln.snd||undefined);mount();}
  function quiet(){busy=true;root.dataset.busy='true';hakaseMsgSeq++;hakaseTapTrigger=null;stopBattleHakaseVoice();hakaseDuckAcquire();showHakaseTalkWindow('……');mount();}
  function motion(depart,done){
   root.dataset.phase=depart?'depart':'approach';const start=performance.now(),duration=depart?1800:1600,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
   function tick(now){if(!valid())return;const elapsed=Math.max(0,now-start),t=reduced?1:Math.min(1,elapsed/duration),pose=Math.floor(elapsed/150)%2;man.src=(depart?side:front)[pose];
    man.style.left=(depart?50-80*t:70-20*t)+'%';man.style.bottom=(depart?20-18*t:43-23*t)+'%';man.style.height=(depart?45+8*t:28+17*t)+'cqh';man.style.transform='translateX(-50%)'+(depart?' scaleX(-1)':'');
    if(t<1)raf=requestAnimationFrame(tick);else done();
   }raf=requestAnimationFrame(tick);
  }
  function play(n,ln,done){
   quiet();motion(false,()=>motion(true,()=>{root.dataset.phase='gone';say(ln,done);}));
  }
  function playLine(n,ln,done){
   if(!live)return false;if(n!==0)return false;
   if(!ready){pending={n,ln,done};quiet();return true;}play(n,ln,done);return true;
  }
  function line(n){if(!valid())return;busy=false;root.dataset.busy='false';if(n>=2)root.dataset.phase='gone';mount();}
  const api={close,abort:abortAll,playLine,line};current=api;
  root.querySelector('.kr-close').onclick=()=>{abortAll();showScreen('screen-title');};
  root.querySelector('.kr-dialog').addEventListener('click',e=>{if(busy){e.preventDefault();e.stopImmediatePropagation();return;}if(!e.target.closest('#hakaseTalkWin'))hakaseTapAdvance();},true);
  watch=setInterval(()=>{if(!valid())abortAll();},80);deadline=setTimeout(fallback,4000);
  const gender=heroChar==='girl'?'girl':'boy';
  Promise.all([
   ...[...root.querySelectorAll('.kr-bg')].map(img=>img.decode()),
   asset('images/battle-tate/hero-back-'+gender+costumeSuffix()+'.webp'),asset('images/sprites/mana-conversation.webp'),
   ...[0,1].map(row=>asset('images/sprites/maro_walk.webp',0,row,3,2)),
   ...[0,1].map(row=>asset('images/sprites/maro_walk.webp',2,row,3,2))
  ]).then(async ([,hero,mana,f0,f1,s0,s1])=>{
   if(!valid())return;root.querySelector('.kr-hero').src=hero;root.querySelector('.kr-mana').src=mana;front=[f0,f1];side=[s0,s1];man.src=f0;
   await Promise.all([...root.querySelectorAll('.kr-cast img')].map(img=>img.decode()));if(!valid())return;clearTimeout(deadline);ready=true;root.classList.add('ready');const p=pending;pending=null;if(p)play(p.n,p.ln,p.done);
  }).catch(fallback);
  return api;
 }
 global.KuroshioStory={openTalk(lines){return fieldZone===43&&lines===ZONE_TALK[43].out?create():null;},abort:abortAll,beforeScreen(id){if(id!=='screen-field')abortAll();}};
})(window);
