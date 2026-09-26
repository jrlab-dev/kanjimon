/* 奄美専用の3D書き出し演技。1場面1再生器、失敗時は同モデル静止画で進行。 */
(function(global){
 'use strict';
 const script=document.currentScript,base=new URL('../images/easy-motion/',script.src).href;
 let active=null,serial=0,manifestPromise=null;
 const stats={retainedFrames:0,sourceBytes:0,phase:'idle',clip:null,frame:0,failures:0};
 const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
 const manifest=()=>manifestPromise||(manifestPromise=fetch(base+'manifest.json').then(r=>{if(!r.ok)throw Error('manifest');return r.json();}).catch(e=>{manifestPromise=null;throw e;}));
 function stop(){active?.stop();active=null;document.body.classList.remove('easy-motion-busy');}
 function mount(el){if(!el)return el;const img=document.createElement('img');img.className='easy3d-frame';img.alt='イージー';img.src=base+'poster.png';el.classList.add('has-easy3d');el.append(img);const grid=document.getElementById('fieldGrid'),wrap=document.getElementById('fieldWrap');if(grid&&wrap){const scale=grid.getBoundingClientRect().width/grid.offsetWidth||1;el.style.setProperty('--easy-size',(wrap.clientWidth*.16/scale)+'px');}return el;}
 function targetsOf(target){return (Array.isArray(target)?target:[target]).filter(Boolean).map(el=>el.tagName==='IMG'?el:el.querySelector('.easy3d-frame')).filter(Boolean);}
 function walk(el,to,duration=850){
  if(!el||!el.isConnected)return;const from={x:Number(el.style.getPropertyValue('--ix')),y:Number(el.style.getPropertyValue('--iy'))};const dx=to.x-from.x,dy=to.y-from.y;
  if(Math.hypot(dx,dy)<.005)return;const dir=Math.abs(dy)>=Math.abs(dx)?(dy<0?'up':'down'):(dx<0?'left':'right');
  const img=el.querySelector('.easy3d-frame'),tile=el.getBoundingClientRect().width,size=img?.getBoundingClientRect().width||64;
  const projectedStride=.56/2.85*size*((dir==='up'||dir==='down') ? .25 : 1),cycles=Math.max(.25,Math.hypot(dx,dy)*tile/projectedStride);
  el.style.transition='none';el.dataset.dir=dir;el.dataset.moving='true';
  // 足踏み数の下限から移動時間を延ばさない。主人公より約15%ゆっくり進む。
  const travelMs=duration*1.15,walkCycles=Math.min(cycles,Math.max(.25,travelMs/420));
  return play(el,'15_walk_'+dir,{walk:{el,from,to,cycles:walkCycles,duration:travelMs}});
 }
 function play(target,shortId,options={}){
  stop();if(options.walk)options.walk.el.dataset.moving='true';const targets=targetsOf(target);if(!targets.length)return{done:Promise.resolve({cancelled:false,fallback:true}),choose(){},stop(){}};
  const id=++serial,ctl=new AbortController();let frames=[],urls=[],positions=[],clip=null,raf=0,timer=0,loadTimer=0,elapsed=0,last=0,ended=false,disposed=false,chosen=!!options.afterChoice,doneResolve,busy=true,unblockedResolve;
  const done=new Promise(resolve=>doneResolve=resolve);
  let unblocked=new Promise(resolve=>unblockedResolve=resolve);
  const alive=()=>!disposed&&active===handle&&targets.some(n=>n.isConnected);
  const handle={done,id,shortId,targets,get busy(){return busy;},get unblocked(){return unblocked;},choose(){if(!clip||chosen)return;chosen=true;elapsed=(clip.holdFrameRange?.[1]||0)/clip.fps*1000;last=0;setBusy(true);stats.phase='afterChoice';},stop(){if(disposed)return;disposed=true;if(options.walk)options.walk.el.dataset.moving='false';clearTimeout(timer);clearTimeout(loadTimer);cancelAnimationFrame(raf);ctl.abort();frames.forEach(im=>{im.src='';});frames=[];urls.forEach(u=>URL.revokeObjectURL(u));urls=[];stats.retainedFrames=0;stats.sourceBytes=0;stats.phase='stopped';busy=false;unblockedResolve({cancelled:true});doneResolve({cancelled:true});}};
  active=handle;stats.clip=shortId;stats.phase='loading';stats.frame=0;document.body.classList.add('easy-motion-busy');targets.forEach(im=>{im.dataset.motion=shortId;im.dataset.frame='0';});
  function setBusy(value){if(value&&!busy)unblocked=new Promise(resolve=>unblockedResolve=resolve);if(!value&&busy)unblockedResolve({cancelled:false});busy=value;document.body.classList.toggle('easy-motion-busy',value);}
  function frameURL(n){return base+clip.id+'/frame-'+String(n).padStart(3,'0')+'.webp';}
  function draw(n){if(!alive()||!clip)return;n=Math.max(0,Math.min(clip.frames-1,n));const off=positions[n]?.spriteOffset||positions[n]?.screenOffset||[0,0];targets.forEach(im=>{im.src=frames[n]?.src||frameURL(n);im.style.setProperty('--motion-x',off[0]*100+'%');im.style.setProperty('--motion-y',off[1]*100+'%');im.dataset.frame=n;});stats.frame=n;options.onFrame?.(n,clip);}
  function complete(fallback=false){if(ended||!alive())return;ended=true;if(options.walk){move(1);options.walk.el.dataset.moving='false';targets.forEach(im=>{im.src=base+'easy_'+shortId+'/stand.png';im.dataset.frame='stand';});}setBusy(false);clearTimeout(loadTimer);stats.phase=fallback?'fallback':'ended';// 最後の1枚だけ残し、次の演技まで全フレームを保持しない。
   const keep=new Set(targets.map(im=>im.src));frames.forEach(im=>im.src='');frames=[];urls=urls.filter(u=>{if(keep.has(u))return true;URL.revokeObjectURL(u);return false;});stats.retainedFrames=urls.length;stats.sourceBytes=urls.length*256*256*4;doneResolve({cancelled:false,fallback});options.onDone?.({fallback});}
  function move(p){const w=options.walk;if(!w)return;w.el.style.setProperty('--ix',w.from.x+(w.to.x-w.from.x)*p);w.el.style.setProperty('--iy',w.from.y+(w.to.y-w.from.y)*p);w.el.dataset.x=w.from.x+(w.to.x-w.from.x)*p;w.el.dataset.y=w.from.y+(w.to.y-w.from.y)*p;}
  function tick(now){if(!alive())return stop();if(document.hidden){last=0;raf=requestAnimationFrame(tick);return;}if(last)elapsed+=Math.min(100,now-last);last=now;let n=Math.floor(elapsed*clip.fps/1000),hold=clip.holdFrameRange&&!chosen?clip.holdFrameRange:null;
   if(options.walk){const w=options.walk,p=Math.min(1,elapsed/w.duration);move(p);draw(reduced()?0:Math.floor(p*w.cycles*clip.frames)%clip.frames);if(p===1){complete();return;}raf=requestAnimationFrame(tick);return;}
   if(reduced())n=Math.floor(n/14)*14;
   if(hold&&n>=hold[0]){setBusy(false);stats.phase='hold';n=reduced()?hold[0]:hold[0]+(n-hold[0])%(hold[1]-hold[0]);}
   if(options.final&&elapsed>=(clip.frames-1)/clip.fps*1000){draw(clip.frames-1);stats.phase='last-frame';timer=setTimeout(()=>complete(),1000/clip.fps);return;}
   draw(n);if(!hold&&elapsed>=clip.frames/clip.fps*1000){draw(clip.frames-1);complete();return;}raf=requestAnimationFrame(tick);
  }
  (async()=>{loadTimer=setTimeout(()=>ctl.abort(),15000);try{
   const m=await Promise.race([manifest(),new Promise((_,reject)=>ctl.signal.addEventListener('abort',()=>reject(Error('timeout')),{once:true}))]);if(!alive())return;
   clip=m.clips.find(c=>c.id==='easy_'+shortId||c.id.startsWith('easy_'+shortId+'_'));if(!clip)throw Error('clip');if(clip.frames*256*256*4>48*1024*1024)throw Error('budget');
   const r=await fetch(base+clip.id+'/motion.json',{signal:ctl.signal});if(!r.ok)throw Error('motion');positions=await r.json();let next=0;
   await Promise.all(Array.from({length:4},async()=>{while(next<clip.frames){const n=next++,r=await fetch(frameURL(n),{signal:ctl.signal});if(!r.ok)throw Error('frame');const blob=await r.blob();if(!alive()||ended)return;const url=URL.createObjectURL(blob);urls.push(url);const im=new Image();im.src=url;await im.decode();if(!alive()||ended){im.src='';return;}frames[n]=im;stats.retainedFrames=frames.filter(Boolean).length;stats.sourceBytes=stats.retainedFrames*256*256*4;}}));
   if(!alive())return;clearTimeout(loadTimer);elapsed=chosen?(clip.holdFrameRange?.[1]||0)/clip.fps*1000:0;stats.phase='playing';draw(0);raf=requestAnimationFrame(tick);
  }catch(e){if(!alive())return;ctl.abort();stats.failures++;targets.forEach(im=>{im.src=base+'poster.png';im.style.setProperty('--motion-x','0%');im.style.setProperty('--motion-y','0%');});
   if(options.final){const still=new Image();still.src=base+'final-pose.png';await Promise.race([still.decode().catch(()=>{}),new Promise(resolve=>timer=setTimeout(resolve,2000))]);clearTimeout(timer);if(!alive()){still.src='';return;}if(still.naturalWidth)targets.forEach(im=>im.src=still.src);options.onFrame?.(59,{frames:60,fps:24});stats.frame=59;stats.phase='last-frame';timer=setTimeout(()=>{still.src='';complete(true);},1000/24);}else complete(true);}})();
  return handle;
 }
 const observer=new MutationObserver(()=>{if(active&&!active.targets.some(n=>n.isConnected))stop();});observer.observe(document.documentElement,{childList:true,subtree:true});
 // 奄美のフィールド演出専用。背景と人物を同じ倍率で寄せ、会話欄はそのまま。
 let cameraFrame=0,cameraGrid=null,cameraX=null,cameraY=null;
 function closeEventCamera(){
  if(cameraFrame)cancelAnimationFrame(cameraFrame);cameraFrame=0;
  if(cameraGrid){cameraGrid.style.transition='';cameraGrid.style.transform='';cameraGrid.style.transformOrigin='';cameraGrid=null;cameraX=cameraY=null;if(typeof updateCamera==='function')updateCamera(true);}
 }
 function endEventCamera(){document.body.classList.add('amami-camera-wide');closeEventCamera();}
 function fieldEvent(fn){return function(...args){const i=args.length-1,done=args[i];if(typeof done==='function')args[i]=(...values)=>{endEventCamera();return done(...values);};return fn.apply(this,args);};}
 function fieldMonster(el,word){
  el.classList.add('amami-field-monster');
  el.innerHTML='<span class="face-host"><span class="fc"></span><span class="face face-jukugo angry"><span class="eyes"><span class="eye"></span><span class="eye"></span></span><span class="mouth"></span></span></span>';
  el.querySelector('.fc').textContent=word;endEventCamera();return el;
 }
 function eventCamera(){
  cameraFrame=0;
  const field=document.getElementById('screen-field'),grid=document.getElementById('fieldGrid'),wrap=document.getElementById('fieldWrap');
  const enabled=/(?:^|\s)amami-(?:arrival|episode[1-4]|late)-mode(?:\s|$)/.test(document.body.className);
  const actors=grid?[...grid.querySelectorAll('#fieldHero,.amami-easy')].filter(el=>getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none'):[];
  if(!enabled||document.body.classList.contains('amami-camera-wide')||!field?.classList.contains('active')||!wrap||actors.length<2){closeEventCamera();return;}
  cameraGrid=grid;
  const g=grid.getBoundingClientRect(),scale=new DOMMatrix(getComputedStyle(grid).transform).a||1;
  const boxes=actors.map(el=>el.getBoundingClientRect());
  const left=Math.min(...boxes.map(r=>r.left)),right=Math.max(...boxes.map(r=>r.right)),top=Math.min(...boxes.map(r=>r.top)),bottom=Math.max(...boxes.map(r=>r.bottom));
  const x=wrap.clientWidth*.5-((left+right)/2-g.left)/scale*1.8;
  const y=wrap.clientHeight*.43-((top+bottom)/2-g.top)/scale*1.8;
  cameraX=cameraX===null?x:cameraX+(x-cameraX)*.16;cameraY=cameraY===null?y:cameraY+(y-cameraY)*.16;
  grid.style.transition='none';grid.style.transformOrigin='0 0';grid.style.transform=`translate(${cameraX}px,${cameraY}px) scale(1.8)`;
  cameraFrame=requestAnimationFrame(eventCamera);
 }
 const cameraObserver=new MutationObserver(()=>{if(!cameraFrame)eventCamera();});
 cameraObserver.observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
 addEventListener('pagehide',()=>{stop();closeEventCamera();});
 global.AmamiMotion={endEventCamera,fieldEvent,fieldMonster,mount,play,walk,stop,stats,get busy(){return !!active?.busy;},get current(){return active;},after(fn){const run=active;if(run?.busy)run.unblocked.then(r=>{if(!r.cancelled)fn();});else fn();},ownsMove(el){return !!active&&active.busy&&active.targets.some(n=>el?.contains(n))&&['05','09'].includes(active.shortId);}};
})(window);
