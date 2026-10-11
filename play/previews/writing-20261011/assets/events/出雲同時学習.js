                                             
(function(global){
 'use strict';
 const base=new URL('../images/',document.currentScript.src),W=390,H=664,DURATION=22;
 let current=null;
 const groups=[
  {x:148,y:563,h:76,kid:'sprites/kid-front-m-a.webp',word:'山',read:'やま',color:'#f1be46',start:0,type:'body'},
  {x:97,y:297,h:56,kid:'sprites/kid-front-f-a.webp',word:'花',read:'はな',color:'#ef8cb7',start:6.5,type:'body'},
  {x:287,y:300,h:57,kid:'sprites/kid-front-m-b.webp',word:'水',read:'みず',color:'#69bfe3',start:8,type:'body'},
  {x:104,y:429,h:70,kid:'amami-cast/child-reading-phone-v2.png',word:'鳥',read:'とり',color:'#16a34a',start:10.3,type:'phone'},
  {x:283,y:451,h:72,kid:'izumo-learning/goggles.png',word:'星',read:'ほし',color:'#e8c94e',start:14.5,type:'goggles'}
 ];
 const clips=[['easy_08_eager',120],['easy_13_neck_only',144],['easy_14_neck_spin',144]];
 async function motion([name,count]){
  const frames=await Promise.all(Array.from({length:count/2},(_,i)=>load('easy-motion/'+name+'/frame-'+String(i*2).padStart(3,'0')+'.webp')));
  const sx=Math.min(...frames.map(f=>f.sx)),sy=Math.min(...frames.map(f=>f.sy)),right=Math.max(...frames.map(f=>f.sx+f.sw)),bottom=Math.max(...frames.map(f=>f.sy+f.sh));
  frames.forEach(f=>Object.assign(f,{sx,sy,sw:right-sx,sh:bottom-sy}));return frames;
 }
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
 const mix=(a,b,p)=>a+(b-a)*p;
 async function load(path,crop=true){
  const im=new Image();im.src=new URL(path,base).href;await im.decode();
  const canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
  if(!crop)return {im,sx:0,sy:0,sw:im.width,sh:im.height};
  const data=ctx.getImageData(0,0,im.width,im.height).data;let x0=im.width,y0=im.height,x1=0,y1=0;
  for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(data[(y*im.width+x)*4+3]>64){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  if(x1<=x0)throw Error('empty actor');return {im,sx:x0,sy:y0,sw:x1-x0+1,sh:y1-y0+1};
 }
 function open(options={}){
  current?.close();const root=document.createElement('section');root.id='izumoLearning';root.setAttribute('aria-label','イージーと子どもたちの学び');
  root.style.cssText='position:fixed;inset:0;z-index:9900;background:#18251d;display:grid;place-items:center;opacity:0;transition:opacity .35s;pointer-events:auto';
  const canvas=document.createElement('canvas');canvas.width=780;canvas.height=1328;
  canvas.style.cssText='width:min(100vw,58.735vh);height:auto;max-height:100dvh;display:block';root.append(canvas);
  const skip=document.createElement('button');skip.textContent='スキップ';skip.style.cssText='position:absolute;right:max(14px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));border:1px solid #ffffff70;border-radius:22px;padding:10px 17px;background:#22382990;color:white;font-size:13px';root.append(skip);
  document.body.append(root);
  const ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let live=true,ready=false,raf=0,watch=0,deadline=0,t=0,last=null,assets=null,finishing=false,returnTimer=0;
  const alive=()=>live&&(!options.valid||options.valid());
  function close(){if(!live)return;live=false;cancelAnimationFrame(raf);clearInterval(watch);clearTimeout(deadline);clearTimeout(returnTimer);document.removeEventListener('keydown',key,true);root.remove();assets=null;if(current===api)current=null;}
  function finish(){if(!live||finishing)return;finishing=true;cancelAnimationFrame(raf);clearTimeout(deadline);const valid=alive();root.style.opacity=0;returnTimer=setTimeout(()=>{close();if(valid&&(!options.valid||options.valid()))options.onDone?.();},350);}
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();options.onAbort?.();}}
  document.addEventListener('keydown',key,true);skip.onclick=e=>{e.stopPropagation();finish();};
  const api={close,finish,get ready(){return ready;},get time(){return t;},get busy(){return live;},seek(seconds){if(ready){t=clamp(seconds,0,DURATION);draw(t);}},canvas,root};current=api;
  deadline=setTimeout(finish,4000);watch=setInterval(()=>{if(!alive()){close();options.onAbort?.();}},100);
  function actor(a,x,y,h,lean=0){ctx.save();ctx.translate(x,y);ctx.rotate(lean);const w=h*a.sw/a.sh;ctx.drawImage(a.im,a.sx,a.sy,a.sw,a.sh,-w/2,-h,w,h);ctx.restore();}
  function shadow(x,y,w){ctx.fillStyle='#254a3828';ctx.beginPath();ctx.ellipse(x,y,w,w*.19,0,0,Math.PI*2);ctx.fill();}
  function balloon(x,y,w,h,tip,r=12){
   const l=x-w/2,rr=x+w/2,top=y-h/2,b=y+h/2,join=clamp(tip.x,l+r+7,rr-r-7);
   ctx.beginPath();ctx.moveTo(l+r,top);ctx.lineTo(rr-r,top);ctx.quadraticCurveTo(rr,top,rr,top+r);ctx.lineTo(rr,b-r);ctx.quadraticCurveTo(rr,b,rr-r,b);
   ctx.lineTo(join+7,b);ctx.lineTo(tip.x,tip.y);ctx.lineTo(join-7,b);ctx.lineTo(l+r,b);ctx.quadraticCurveTo(l,b,l,b-r);ctx.lineTo(l,top+r);ctx.quadraticCurveTo(l,top,l+r,top);ctx.closePath();
   ctx.fillStyle='#fffef9';ctx.strokeStyle='#40534a';ctx.lineWidth=1.6;ctx.lineJoin='round';ctx.fill();ctx.stroke();
  }
  function bubble(x,y,text,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.font='bold 15px sans-serif';const w=Math.max(39,ctx.measureText(text).width+20);balloon(x,y-10,w,29,{x:x+1,y:y+12},10);ctx.fillStyle='#334536';ctx.textAlign='center';ctx.fillText(text,x,y-5);ctx.restore();}
  function easyFrame(i,now){const frames=assets.motion[i%3];return frames[reduced?0:Math.floor((now+i*.73)*12)%frames.length];}
  function monster(g,x,y,phase,now,mode='normal',scale=1){
   const size=g.h*.59,asleep=mode==='body'||(mode==='normal'&&phase>=4),friend=mode==='friend',soul=mode==='soul';
   shadow(x,y,size*.38*scale);ctx.save();ctx.translate(x,y-size*.48*scale+(asleep?0:Math.sin(now*4+g.x)*(friend?1:2)));ctx.scale(scale,scale);
   if(!asleep&&!friend)ctx.rotate(Math.sin(now*4+g.x)*.035);
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+size*(soul?.65:1)+'px "Zen Maru Gothic",sans-serif';ctx.lineJoin='round';ctx.strokeStyle='#fffbe5';ctx.lineWidth=3.8;ctx.strokeText(soul?g.read:g.word,0,0);ctx.fillStyle=g.color;ctx.fillText(soul?g.read:g.word,0,0);
   ctx.strokeStyle='white';ctx.fillStyle='#253027';ctx.lineWidth=2;
   for(const dx of [-size*.095,size*.095]){ctx.beginPath();if(asleep){ctx.moveTo(dx-2,-size*.055);ctx.lineTo(dx+2,-size*.055);ctx.stroke();ctx.lineWidth=1.5;ctx.strokeStyle='#253027';ctx.stroke();ctx.strokeStyle='white';}else{ctx.ellipse(dx,-size*.055,2,friend?3.3:3,0,0,Math.PI*2);ctx.stroke();ctx.fill();}}
   ctx.beginPath();ctx.arc(0,size*.1,3,0,Math.PI);ctx.strokeStyle='#253027';ctx.lineWidth=1.4;ctx.stroke();
   if(asleep){ctx.font='bold 10px sans-serif';ctx.fillStyle='#577b82';ctx.fillText('Zzz',size*.34,-size*.43-Math.sin(now*2)*2);}
   ctx.restore();
  }
  function phoneMonster(g,p,now){
   const offer=smooth((p-3.2)/1.8),join=smooth((p-6.2)/1.2),awake=p>=5.6;
   const sx=g.x+46,sy=g.y-4,bx=mix(g.x-6,sx,offer),by=mix(g.y-g.h*.36,sy,offer);
                                         
   if(p<5.6){ctx.save();ctx.globalAlpha=1-smooth((p-3.7)/1.9);monster(g,sx,sy,p,now,'soul',mix(1,.3,smooth((p-3.2)/2.4)));ctx.restore();}
   monster(g,mix(bx,g.x+12,join),mix(by,g.y+2,join),p,now,awake?'friend':'body',mix(.58,1,offer));
   if(p>=3.8&&p<5.8){const a=Math.sin(clamp((p-3.8)/2)*Math.PI)*.75;ctx.save();ctx.globalAlpha=a;const glow=ctx.createRadialGradient(sx,sy-20,0,sx,sy-20,34);glow.addColorStop(0,'#fffbd9');glow.addColorStop(1,'#fffbd900');ctx.fillStyle=glow;ctx.fillRect(sx-34,sy-54,68,68);ctx.restore();}
  }
  function device(g,i,now,phase){
   if(phase<.1)return;
   const kidX=g.x-22,tip={x:kidX+(g.type==='phone'?-8:10),y:g.y-g.h*(g.type==='phone'?.51:.79)};
   const x=g.x+14,y=g.y-g.h-31;
   ctx.save();ctx.globalAlpha=smooth(phase/.6);balloon(x,y,66,57,tip,19);
   ctx.save();ctx.beginPath();ctx.roundRect(x-28,y-23,56,46,15);ctx.clip();
   const a=easyFrame(i,now),head={...a,sh:a.sh*.52};actor(head,x,y+25,47,reduced?0:Math.sin(now*2+i)*.035);
   ctx.restore();ctx.restore();
  }
  function group(g,i,now){
   const p=(now-g.start)*(i===0?1:1.7),join=smooth((p-5.5)/1.1),kidX=g.x-22,kidY=g.y;
   const isPhone=g.type==='phone';
   let bounce=isPhone&&p>=7.4&&p<8.8?Math.abs(Math.sin((p-7.4)*Math.PI*2))*5:0;
   if(reduced)bounce=0;
   if(g.type==='body'){
    shadow(g.x-66,g.y,g.h*.28);
    const beat=now*(i===0?3.7:2.8)+i*1.9,hop=reduced?0:Math.abs(Math.sin(beat))*(i===0?3:1.5),sway=reduced?0:Math.sin(beat)*.045;
    actor(easyFrame(i,now),g.x-66,g.y-hop,g.h*1.25,sway);
   }
   shadow(kidX,kidY,g.h*.22);actor(assets.kids[i],kidX,kidY-bounce,g.h,!isPhone&&p>=2.8&&p<4&&!reduced?Math.sin(now*8)*.015:0);
   const mx=mix(g.x+44,kidX+17,join),my=mix(g.y-4,g.y-g.h*.23,join);
   if(isPhone)phoneMonster(g,p,now);else monster(g,mx,my,p,now,'normal',mix(1,.58,join));
   if(!isPhone&&p>=2.8&&p<4.1)bubble(kidX-(g.type==='body'?0:25),g.y-g.h-8,g.read,smooth((p-2.8)/.2));
   if(isPhone&&p>=7.4&&p<9){const a=smooth((p-7.4)/.4)*smooth((9-p)/.5);ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#fff4af';for(let j=0;j<6;j++){const ang=j*Math.PI/3+now*.3;ctx.beginPath();ctx.arc(g.x+12+Math.cos(ang)*24,g.y-20+Math.sin(ang)*19,1.8,0,Math.PI*2);ctx.fill();}ctx.restore();}
   if(g.type!=='body')device(g,i,now,p);
  }
  function camera(now){
   const wide={x:195,y:332,z:1},near={x:132,y:495,z:2},phone={x:104,y:386,z:1.85},vr={x:266,y:405,z:1.85};
   const lerp=(a,b,p)=>({x:mix(a.x,b.x,p),y:mix(a.y,b.y,p),z:mix(a.z,b.z,p)});
   if(reduced)return wide;if(now<8)return near;if(now<10)return lerp(near,wide,smooth((now-8)/2));if(now<11)return wide;
   if(now<12)return lerp(wide,phone,smooth(now-11));if(now<15.5)return phone;if(now<16.5)return lerp(phone,vr,smooth(now-15.5));if(now<19.7)return vr;if(now<21)return lerp(vr,wide,smooth((now-19.7)/1.3));return wide;
  }
  function draw(now){
   if(!assets)return;ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,W,H);const c=camera(now);
   const tx=clamp(W/2-c.x*c.z,W-W*c.z,0),ty=clamp(H/2-c.y*c.z,H-H*c.z,0);
   ctx.save();ctx.translate(tx,ty);ctx.scale(c.z,c.z);ctx.drawImage(assets.bg.im,0,0,W,H);
                                   
   [1,2,3,4,0].forEach(i=>group(groups[i],i,now));
   if(!reduced){ctx.fillStyle='#fff9d777';for(let i=0;i<14;i++){const x=(i*83+now*(4+i%3))%W,y=210+(i*47+Math.sin(now+i)*9)%390;ctx.beginPath();ctx.arc(x,y,.7+(i%3)*.25,0,Math.PI*2);ctx.fill();}}
   ctx.restore();root.dataset.time=now.toFixed(3);root.dataset.stage=now<8?'foreground':now<11?'all':now<15.5?'phone':now<19.7?'goggles':'all';
  }
  function tick(now){if(!alive()){close();options.onAbort?.();return;}if(document.hidden){last=null;raf=requestAnimationFrame(tick);return;}if(last!==null)t+=Math.min(.1,(now-last)/1000);last=now;draw(Math.min(t,DURATION));if(t>=DURATION){finish();return;}raf=requestAnimationFrame(tick);}
  (async()=>{try{
   const all=await Promise.all([load('izumo-learning/clearing.png',false),...groups.map(g=>load(g.kid)),...clips.map(motion)]);
   if(!alive()||finishing)return;assets={bg:all[0],kids:all.slice(1,6),motion:all.slice(6)};ready=true;clearTimeout(deadline);draw(0);root.style.opacity=1;if(!options.manual)raf=requestAnimationFrame(tick);
  }catch(e){root.dataset.error='asset';finish();}})();
  return api;
 }
 global.IzumoLearning={open,get current(){return current;},busy:()=>!!current,close(){current?.close();},beforeScreen(id){if(id!=='screen-field'&&typeof evActive!=='undefined'&&evActive&&evZone===85){current?.close();evFinish(false);}}};
})(window);
