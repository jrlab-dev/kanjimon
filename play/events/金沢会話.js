/* 49の解決3行。進行・保存・音声の正本はZONE_TALKのまま。 */
(function(global){
 'use strict';
 let current=null;const cache=new Map();
 function abortAll(){
  current?.close();
  if(typeof fieldZone!=='undefined'&&fieldZone===49&&typeof ztActive!=='undefined'&&ztActive){
   ztActive=false;heroLock=false;hakaseMsgSeq++;hakaseTapTrigger=null;stopBattleHakaseVoice();global.speechSynthesis?.cancel();hakaseDuckRelease();hideHakaseTalkWindow();
  }
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&typeof fieldZone!=='undefined'&&fieldZone===49&&typeof ztActive!=='undefined'&&ztActive){e.preventDefault();e.stopImmediatePropagation();abortAll();showScreen('screen-title');}},true);
 async function asset(src,col=0,row=0,cols=1,rows=1){
  const key=[src,col,row,cols,rows].join('|');if(cache.has(key))return cache.get(key);
  const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=Math.floor(img.naturalWidth/cols);c.height=Math.floor(img.naturalHeight/rows);
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,col*c.width,row*c.height,c.width,c.height,0,0,c.width,c.height);const a=ctx.getImageData(0,0,c.width,c.height).data;
  let x0=c.width,y0=c.height,x1=0,y1=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>=64){x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}
  if(y1<=y0)throw Error('Empty actor');const t=document.createElement('canvas');t.width=x1-x0;t.height=y1-y0;t.getContext('2d').drawImage(c,x0,y0,t.width,t.height,0,0,t.width,t.height);const result=t.toDataURL('image/png');cache.set(key,result);return result;
 }
 function create(){
  current?.close();const seq=fieldSeq,root=document.createElement('section');root.id='kanazawaStory';root.dataset.phase='loading';root.setAttribute('aria-label','金沢の角を曲がる背中と三体');
  root.innerHTML='<div class="kz-view"><div class="kz-plane"><img class="kz-bg" src="images/fullart/kanazawa-conversation.webp" alt="右奥の町家の裏へ曲がる石畳の路地"><img class="kz-man" alt="角へ去る笠の男の背中">'+['街','各','案'].map((letter,i)=>'<div class="kz-letter dk face-host" data-order="'+i+'"><span class="fc">'+letter+'</span><span class="face normal"><span class="eyes"><span class="eye"></span><span class="eye"></span></span><span class="mouth"></span></span></div>').join('')+'<img class="kz-wall" src="images/fullart/kanazawa-conversation.webp" alt=""></div><div class="kz-cast"><img class="kz-hero" alt="路地を見る主人公"><img class="kz-mana" alt="路地を見るマナ"></div><b class="kz-location">かなざわ じょうかまち</b><button class="kz-close" type="button">もどる</button></div><div class="kz-dialog"><div class="kz-slot"></div><span class="kz-next">▼ つづく</span></div>';
  document.body.appendChild(root);const slot=root.querySelector('.kz-slot'),man=root.querySelector('.kz-man');
  let live=true,ready=false,busy=true,raf=0,watch=0,deadline=0,pending=null;let backs=[];const plane=root.querySelector('.kz-plane'),view=root.querySelector('.kz-view'),letters=[...root.querySelectorAll('.kz-letter')];
  function layout(){const v=view.getBoundingClientRect(),w=Math.max(v.width,v.height*2/3),h=w*1.5;Object.assign(plane.style,{width:w+'px',height:h+'px',left:(v.width-w)/2+'px',top:(v.height-h)*(innerHeight<=500?.35:.75)+'px'});}const resize=new ResizeObserver(layout);resize.observe(view);layout();
  const valid=()=>live&&seq===fieldSeq&&fieldZone===49&&ztActive&&$('screen-field')?.classList.contains('active');
  function mount(){const win=$('hakaseTalkWin');if(win)slot.appendChild(win);}
  function restore(){const win=slot.querySelector('#hakaseTalkWin'),wrap=$('fieldWrap');if(win&&wrap){wrap.appendChild(win);positionHakaseTalkWindow(win,wrap);}}
  function close(){if(!live)return;live=false;clearInterval(watch);clearTimeout(deadline);cancelAnimationFrame(raf);resize.disconnect();pending=null;restore();root.remove();if(current===api)current=null;}
  function fallback(){if(!valid()){close();return;}const p=pending;close();if(p)hakaseTalkOnce(p.ln.text,p.done,p.ln.snd||undefined);}
  function say(ln,done){if(!valid())return;busy=false;root.dataset.busy='false';hakaseTalkOnce(ln.text,()=>{if(valid())done();},ln.snd||undefined);mount();}
  function quiet(){busy=true;root.dataset.busy='true';hakaseMsgSeq++;hakaseTapTrigger=null;stopBattleHakaseVoice();hakaseDuckAcquire();showHakaseTalkWindow('……');mount();}
  const path=[[-.75,340,1240],[-.5,395,1160],[-.25,420,1080],[0,450,1000],[.45,455,750],[.72,490,620],[1,730,600]];
  function point(u){u=Math.max(-.75,Math.min(1,u));const route=innerHeight<=500?[[-.75,340,990],[-.5,395,930],[-.25,420,870],[0,450,810],[.45,455,710],[.72,490,620],[1,730,600]]:path;for(let i=1;i<route.length;i++)if(u<=route[i][0]){const a=route[i-1],b=route[i],t=(u-a[0])/(b[0]-a[0]);return[a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}}
  function place(el,u,frame){const [x,y]=point(u);el.style.left=x/1024*100+'%';el.style.top=y/1536*100+'%';el.style.setProperty('--scale',1-.35*Math.max(0,Math.min(1,u)));el.dataset.path=u.toFixed(3);if(el===man)el.src=backs[frame%3];el.style.visibility=u>=1?'hidden':'visible';}
  function pose(t,frame){place(man,t*1.75,frame);letters.forEach((el,i)=>place(el,t*1.75-.25*(i+1),frame));}
  function motion(done){root.dataset.phase='turn';const start=performance.now(),duration=5000,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;function tick(now){if(!valid())return;const t=reduced?1:Math.min(1,(now-start)/duration);pose(t,Math.floor((now-start)/170));if(t<1)raf=requestAnimationFrame(tick);else{root.dataset.phase='gone';done();}}raf=requestAnimationFrame(tick);}
  function play(n,ln,done){if(n===2){quiet();motion(()=>say(ln,done));}else say(ln,done);}
  function playLine(n,ln,done){
   if(!live)return false;if(n!==0&&n!==2)return false;
   if(!ready){pending={n,ln,done};quiet();return true;}play(n,ln,done);return true;
  }
  function line(n){if(!valid())return;busy=false;root.dataset.busy='false';mount();}
  const api={close,abort:abortAll,playLine,line};current=api;
  root.querySelector('.kz-close').onclick=()=>{abortAll();showScreen('screen-title');};
  root.querySelector('.kz-dialog').addEventListener('click',e=>{if(busy){e.preventDefault();e.stopImmediatePropagation();return;}if(!e.target.closest('#hakaseTalkWin'))hakaseTapAdvance();},true);
  watch=setInterval(()=>{if(!valid())abortAll();},80);deadline=setTimeout(fallback,4000);
  const gender=heroChar==='girl'?'girl':'boy';
  Promise.all([
   ...[...root.querySelectorAll('.kz-bg,.kz-wall')].map(img=>img.decode()),
   asset('images/battle-tate/hero-back-'+gender+costumeSuffix()+'.webp'),asset('images/mana-back-b.webp?walk=20261003d'),
   ...[0,1,2].map(col=>asset('images/sprites/maro-back-walk3.webp?walk=20261003d',col,0,3,1))
  ]).then(async ([,,hero,mana,...frames])=>{
   if(!valid())return;root.querySelector('.kz-hero').src=hero;root.querySelector('.kz-mana').src=mana;backs=frames;pose(0,1);
   await Promise.all([...root.querySelectorAll('.kz-cast img,.kz-man')].map(img=>img.decode()));if(!valid())return;clearTimeout(deadline);ready=true;root.dataset.phase='notice';root.classList.add('ready');const p=pending;pending=null;if(p)play(p.n,p.ln,p.done);
  }).catch(fallback);
  return api;
 }
 global.KanazawaStory={openTalk(lines){return fieldZone===49&&lines===ZONE_TALK[49].out?create():null;},abort:abortAll,beforeScreen(id){if(id!=='screen-field')abortAll();}};
})(window);
