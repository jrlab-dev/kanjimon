                                                             
(function(global){
 'use strict';
 const packURL=new URL('../images/amami-comic/assets.json',document.currentScript.src).href;
 const DURATION=10030;
 function createRenderer(canvas,images){
  const ctx=canvas.getContext('2d'),W=390,H=600,GAP=6,PH=(H-GAP*3)/4;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
                   
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const frameAt=(time,index=0)=>{if(reduced)return 0;const durations=[6000,7000,5000,6000];const step=Math.floor(Math.max(0,Number.isFinite(time)?time:0)/durations[index]*32)%62;return step<=31?step:62-step;};
function actor(im,x,foot,height,flip=false,angle=0){
 const width=height*im.width/im.height;
 ctx.save();ctx.translate(x,foot);if(flip)ctx.scale(-1,1);ctx.rotate(angle);ctx.drawImage(im,-width/2,-height,width,height);ctx.restore();
}
function scene(index,y,height,time,alpha=1,offset=0){
 const full=clamp((height-PH)/(H-PH)),reverse=index%2===1;
 ctx.save();ctx.beginPath();ctx.rect(0,y,W,height);ctx.clip();ctx.globalAlpha=alpha;ctx.translate(offset,y);
 const bg=images['bg'+index],sourceH=Math.min(bg.height,bg.width*height/W),sourceY=(bg.height-sourceH)*((index===2?.10:.31)*(1-full));
 ctx.save();if(reverse){ctx.translate(W,0);ctx.scale(-1,1);}ctx.drawImage(bg,0,sourceY,bg.width,sourceH,0,0,W,height);ctx.restore();
 const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'rgba(12,22,35,.17)');shade.addColorStop(.6,'rgba(12,22,35,0)');shade.addColorStop(1,'rgba(12,22,35,.23)');ctx.fillStyle=shade;ctx.fillRect(0,0,W,height);
 const nearH=PH*1.18+(270-PH*1.18)*full,farH=nearH*(.60-.08*full);
 const nearX=W*(reverse?.80:.20),farX=W*(reverse?.20:.80);
 const nearFoot=height*(1.21-.32*full),farFoot=height*(.76-.25*full);
 const frame=frameAt(time,index);
 ctx.fillStyle='rgba(18,26,27,.25)';ctx.beginPath();ctx.ellipse(farX,farFoot+4,farH*.23,farH*.045,0,0,Math.PI*2);ctx.fill();
 const dance=!reduced&&index===1?Math.sin(time/170)*farH*.055:0;
 const bounce=!reduced&&index===2?Math.abs(Math.sin(time/240))*farH*.07:0;
 actor(images['easy'+index+'_'+frame],farX+dance,farFoot-bounce,farH,reverse,!reduced&&index===1?Math.sin(time/170)*.10:0);
 ctx.fillStyle='rgba(18,26,27,.28)';ctx.beginPath();ctx.ellipse(nearX,nearFoot+1,nearH*.19,nearH*.035,0,0,Math.PI*2);ctx.fill();
 const readyStart=4050+index*350;
 const ready=reduced?(time>=readyStart?1:0):ease((time-readyStart)/180);
 if(ready<1){ctx.save();ctx.globalAlpha*=1-ready;actor(images['hero'+index],nearX,nearFoot,nearH,reverse);ctx.restore();}
 if(ready>0){ctx.save();ctx.globalAlpha*=ready;actor(images[index===0?'heroReady':'heroReady'+index],nearX,nearFoot,nearH*(index===0?.84:1.00),reverse);ctx.restore();}
 ctx.restore();
}
function glint(index,age){
 if(reduced||age<0||age>320)return;
 const y=index*(PH+GAP),reverse=index%2===1,p=clamp(age/320);
 const strength=Math.sin(Math.PI*Math.pow(p,.65));
 const x=W*(reverse?1-ease(p):ease(p)),cy=y+PH*.40;
 ctx.save();ctx.beginPath();ctx.rect(0,y,W,PH);ctx.clip();
 ctx.globalCompositeOperation='screen';
 const wash=ctx.createLinearGradient(0,y,W,y+PH);
 wash.addColorStop(0,'rgba(255,205,81,0)');wash.addColorStop(.5,'rgba(255,243,191,'+(strength*.25)+')');wash.addColorStop(1,'rgba(255,205,81,0)');
 ctx.fillStyle=wash;ctx.fillRect(0,y,W,PH);
 const beam=ctx.createLinearGradient(0,0,W,0);
 beam.addColorStop(0,'rgba(255,207,88,0)');beam.addColorStop(.5,'rgba(255,249,225,'+strength+')');beam.addColorStop(1,'rgba(255,207,88,0)');
 ctx.strokeStyle=beam;ctx.lineWidth=2+strength*3;ctx.shadowColor='#ffd66a';ctx.shadowBlur=15*strength;
 ctx.beginPath();ctx.moveTo(0,cy+PH*.12);ctx.lineTo(W,cy-PH*.12);ctx.stroke();
 ctx.translate(x,cy+PH*.12*(1-2*x/W));
 ctx.rotate(-.13);ctx.globalAlpha=strength;
 function sparkle(long,short,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-long,0);ctx.lineTo(-short,-short);ctx.lineTo(0,-long*.62);ctx.lineTo(short,-short);ctx.lineTo(long,0);ctx.lineTo(short,short);ctx.lineTo(0,long*.62);ctx.lineTo(-short,short);ctx.closePath();ctx.fill();}
 sparkle(57,7,'#ffd270');sparkle(43,3,'#fffef2');
 ctx.rotate(Math.PI/4);sparkle(22,2,'#fff9da');
 ctx.restore();
}
function render(time){
 time=Number.isFinite(time)?Math.max(0,time):0;
 ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle='#101916';ctx.fillRect(0,0,W,H);
 let phase='hero',count=0;
 if(time<500){scene(0,0,H,time);}
 else{
  for(let i=0;i<4;i++){
   const age=time-(500+i*950);if(age<0)continue;count++;
   const p=reduced?1:1-Math.pow(1-clamp(age/180),3);
   scene(i,i*(PH+GAP),PH,time,reduced?1:clamp(age/60),(i%2?-1:1)*(1-p)*W);
   glint(i,age);
  }
  phase=count<4?'enter':'hold';
  if(time>=7530){const p=reduced?1:ease((time-7530)/1400);scene(0,0,PH+(H-PH)*p,time);phase=p<1?'expand':'returned';}
 }
 const lightAge=time-7530;
 const light=reduced||lightAge<0||lightAge>=1800?0:.90*(lightAge<650?ease(lightAge/650):1-ease((lightAge-650)/1150));
 if(light>0){ctx.save();ctx.fillStyle='rgba(255,250,232,'+light+')';ctx.fillRect(0,0,W,H);ctx.restore();}
 canvas.dataset.returnLight=String(light);
 canvas.dataset.elapsed=String(Math.round(time));
 canvas.dataset.heroPose=time>=4230?'ready':'standing';
 canvas.dataset.readyCount=String([0,1,2,3].filter(i=>time>=4230+i*350).length);
 canvas.dataset.phase=phase;canvas.dataset.panels=String(count);canvas.dataset.motionFrame=String(frameAt(time));
}
                 
  return render;
 }
 function trim(image){
  const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
  const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,c.width,c.height).data;
  let left=c.width,top=c.height,right=-1,bottom=-1;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>0){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)throw Error('empty hero');
  const result=document.createElement('canvas');result.width=right-left+1;result.height=bottom-top+1;
  result.getContext('2d').drawImage(c,left,top,result.width,result.height,0,0,result.width,result.height);
  c.width=c.height=0;return result;
 }
 function play({host,heroBack,heroReady,onReady,onDone}){
  const root=document.createElement('div');root.id='ayComic';root.dataset.beat='loading';
  root.setAttribute('aria-hidden','true');
  const canvas=document.createElement('canvas');canvas.width=780;canvas.height=1200;
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','4つの場所で向き合う人物とイージー。光に包まれて主人公へ戻る。');
  root.appendChild(canvas);host.appendChild(root);
  const controller=new AbortController(),pending=new Map(),images={};
  let disposed=false,finished=false,timer=0,raf=0,elapsed=0,last=null;
  const alive=()=>!disposed&&host.isConnected&&root.isConnected;
  function stop(){
   if(disposed)return;disposed=true;clearTimeout(timer);cancelAnimationFrame(raf);controller.abort();
   document.removeEventListener('visibilitychange',visibility);
   pending.forEach((reject,im)=>{im.onload=im.onerror=null;im.src='';reject(Error('comic cancelled'));});pending.clear();
   for(const key of Object.keys(images)){const im=images[key];if(im instanceof HTMLCanvasElement)im.width=im.height=0;else im.src='';delete images[key];}
   canvas.width=canvas.height=0;root.remove();
  }
  function finish(fallback=false){if(finished)return;finished=true;const notify=alive();stop();if(notify)onDone({fallback});}
  function visibility(){last=null;}
  document.addEventListener('visibilitychange',visibility);
  function load(src){return new Promise((resolve,reject)=>{
   const image=new Image();pending.set(image,reject);
   image.onload=async()=>{try{await image.decode();if(!alive()){reject(Error('comic cancelled'));return;}pending.delete(image);image.onload=image.onerror=null;resolve(image);}catch(error){reject(error);}};
   image.onerror=()=>reject(Error('comic image'));image.src=src;
  });}
  timer=setTimeout(()=>finish(true),4000);
  (async()=>{
   try{
    const response=await fetch(packURL,{signal:controller.signal});if(!response.ok)throw Error('comic pack');
    const assets=await response.json();if(!alive())return;
    assets.hero0=heroBack;assets.heroReady=heroReady;
    await Promise.all(Object.entries(assets).map(async([name,src])=>{const im=await load(src);if(!alive())return;images[name]=(name==='hero0'||name==='heroReady')?trim(im):im;}));
    if(!alive())return;clearTimeout(timer);
    const render=createRenderer(canvas,images);render(0);onReady();
    root.dataset.beat='playing';root.removeAttribute('aria-hidden');
    function tick(){
     if(!alive()){stop();return;}
     const now=performance.now();if(document.hidden){last=null;raf=requestAnimationFrame(tick);return;}
     if(last!==null)elapsed+=Math.min(100,Math.max(0,now-last));last=now;
     try{render(Math.min(elapsed,DURATION));}catch(error){finish(true);return;}
     if(elapsed>=DURATION){finish();return;}raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
   }catch(error){finish(true);}
  })();
  return {stop,root};
 }
 global.AmamiComic={play};
})(window);
