
(function(root){
'use strict';
root.KanjimonInkPad=function(canvas){
 let strokes=[],guide=[],current=null,pid=null,enabled=true,destroyed=false;
 const ctx=canvas.getContext('2d');canvas.width=327;canvas.height=327;
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*109/r.width,y:(e.clientY-r.top)*109/r.height};};
 function draw(){
  ctx.clearRect(0,0,327,327);ctx.lineWidth=9;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#d9e3dd';
  for(const s of guide){ctx.beginPath();s.forEach((p,i)=>i?ctx.lineTo(p.x*3,p.y*3):ctx.moveTo(p.x*3,p.y*3));ctx.stroke();}
  ctx.lineWidth=7;ctx.strokeStyle='#162d25';
  for(const s of [...strokes,...(current?[current]:[])]){
   if(s.length===1){ctx.beginPath();ctx.arc(s[0].x*3,s[0].y*3,3,0,Math.PI*2);ctx.fillStyle='#162d25';ctx.fill();continue;}
   ctx.beginPath();s.forEach((p,i)=>i?ctx.lineTo(p.x*3,p.y*3):ctx.moveTo(p.x*3,p.y*3));ctx.stroke();
  }
 }
 function down(e){if(!enabled||current||destroyed||e.button>0||e.isPrimary===false)return;e.preventDefault();pid=e.pointerId;current=[point(e)];canvas.setPointerCapture?.(pid);draw();}
 function move(e){if(pid!==e.pointerId||!current)return;e.preventDefault();const points=e.getCoalescedEvents?.();for(const p of (points?.length?points:[e])){if(current.length<4000)current.push(point(p));}draw();}
 function up(e){if(pid!==e.pointerId||!current)return;e.preventDefault();current.push(point(e));strokes.push(current);current=null;pid=null;draw();}
 function cancel(e){if(e&&pid!==e.pointerId)return;current=null;pid=null;draw();}
 const events={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,lostpointercapture:cancel};
 for(const [name,fn] of Object.entries(events))canvas.addEventListener(name,fn);
 const resize=()=>cancel();root.addEventListener('resize',resize);
 return Object.freeze({
  getStrokes:()=>strokes.map(s=>s.map(p=>({...p}))),isDrawing:()=>!!current,
  setGuide(value){guide=(value||[]).map(s=>s.map(p=>({x:p.x,y:p.y})));draw();},
  clear(){if(!current){strokes=[];draw();}},undo(){if(!current){strokes.pop();draw();}},
  setEnabled(v){enabled=!!v;if(!enabled)cancel();},
  destroy(){destroyed=true;for(const [n,f]of Object.entries(events))canvas.removeEventListener(n,f);root.removeEventListener('resize',resize);cancel();}
 });
};
})(window);
