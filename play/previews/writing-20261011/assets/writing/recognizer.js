                                    
                                     
                                  
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KanjimonWritingRecognizer=api;
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const POLICY=Object.freeze({version:2,samples:24,maxStrokes:40,maxPoints:4000,
    minExtent:12,minLength:12,maxScore:.14,maxStrokeScore:.24,minMargin:.012});
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function length(points){let n=0;for(let i=1;i<points.length;i++)n+=dist(points[i-1],points[i]);return n;}
  function sample(points,n=POLICY.samples){
    const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+dist(points[i-1],points[i]));
    const total=lengths.at(-1);if(!total)return Array.from({length:n},()=>({...points[0]}));
    const out=[];let j=1;
    for(let i=0;i<n;i++){
      const t=total*i/(n-1);while(j<lengths.length-1&&lengths[j]<t)j++;
      const span=lengths[j]-lengths[j-1],f=span?(t-lengths[j-1])/span:0;
      out.push({x:points[j-1].x+(points[j].x-points[j-1].x)*f,y:points[j-1].y+(points[j].y-points[j-1].y)*f});
    }return out;
  }
  function normalize(input){
    if(!Array.isArray(input)||!input.length||input.length>POLICY.maxStrokes)return null;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,total=0;
    const strokes=[];
    for(const raw of input){
      if(!Array.isArray(raw)||raw.length<2||raw.length>POLICY.maxPoints)return null;
      const pts=[];
      for(const p of raw){
        if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>500||Math.abs(p.y)>500)return null;
        if(!pts.length||dist(pts.at(-1),p)>.00001)pts.push({x:p.x,y:p.y});
      }
      if(pts.length<2||length(pts)<.8)return null;
      for(const p of pts){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
      total+=length(pts);strokes.push(sample(pts));
    }
    const size=Math.max(maxX-minX,maxY-minY);
    if(size<POLICY.minExtent||total<POLICY.minLength)return null;
    const cx=(maxX+minX)/2,cy=(maxY+minY)/2;
    return strokes.map(s=>s.map(p=>({x:(p.x-cx)/size,y:(p.y-cy)/size})));
  }
  function strokeCost(a,b){
    let f=0,r=0;
    for(let i=0;i<a.length;i++){f+=dist(a[i],b[i])**2;r+=dist(a[i],b[b.length-1-i])**2;}
    return Math.sqrt(Math.min(f,r)/a.length);
  }
                                         
  function assignment(cost){
    const n=cost.length,u=Array(n+1).fill(0),v=Array(n+1).fill(0),p=Array(n+1).fill(0),way=Array(n+1).fill(0);
    for(let i=1;i<=n;i++){
      p[0]=i;let j0=0;const min=Array(n+1).fill(Infinity),used=Array(n+1).fill(false);
      do{
        used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;
        for(let j=1;j<=n;j++)if(!used[j]){
          const cur=cost[i0-1][j-1]-u[i0]-v[j];if(cur<min[j]){min[j]=cur;way[j]=j0;}
          if(min[j]<delta){delta=min[j];j1=j;}
        }
        for(let j=0;j<=n;j++){if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else min[j]-=delta;}
        j0=j1;
      }while(p[j0]!==0);
      do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
    }
    const picked=[];for(let j=1;j<=n;j++)picked.push(cost[p[j]-1][j-1]);
    return {score:picked.reduce((a,b)=>a+b,0)/n,worst:Math.max(...picked)};
  }
  function compare(a,b){
    if(a.length!==b.length)return {score:Infinity,worst:Infinity};
    return assignment(a.map(s=>b.map(t=>strokeCost(s,t))));
  }
  function createEngine(rawTemplates){
    const templates=new Map(),groups=new Map();
    for(const [char,raw] of Object.entries(rawTemplates)){
      const normalized=normalize(raw);if(!normalized)throw new Error('invalid template: '+char);
      templates.set(char,normalized);const list=groups.get(normalized.length)||[];list.push([char,normalized]);groups.set(normalized.length,list);
    }
    function judge(strokes,target){
      if(!templates.has(target))return {status:'unjudgeable',reason:'missing-data'};
      const input=normalize(strokes);
      if(!input)return {status:'retry',reason:'insufficient-ink'};
      const scored=(groups.get(input.length)||[]).map(([char,t])=>({char,...compare(input,t)})).sort((a,b)=>a.score-b.score);
      const best=scored[0],next=scored[1];
      if(!best||best.score>POLICY.maxScore||best.worst>POLICY.maxStrokeScore)return {status:'unjudgeable',reason:'shape-uncertain'};
      if(next&&next.score-best.score<POLICY.minMargin)return {status:'unjudgeable',reason:'ambiguous',candidates:scored.slice(0,2).map(x=>x.char)};
      return {status:best.char===target?'correct':'otherKanji',char:best.char,score:best.score,margin:next?next.score-best.score:1};
    }
    return Object.freeze({judge,count:templates.size,policy:POLICY});
  }
  return Object.freeze({createEngine,normalize,compare,sample,POLICY});
});
