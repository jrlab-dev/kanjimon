/* 正本：積み木の城_完成形と演出_20260927。11個を一度だけ作り、同じ床の上で動かす。 */
(function(global){
 'use strict';
 const atlas={pillar:[82,159,198,519],beam:[335,497,560,169],gold:[919,416,276,260],teal:[61,813,291,286],red:[410,833,395,260],blue:[834,833,394,260]};
 // 座標は1000×1100の同一床。下段は散らばった部品の保管位置。
 const parts=[
  ['P1','pillar',332,300,100,272,74,633,-8,1],['P2','pillar',618,300,100,272,790,680,9,1],
  ['B1','beam',330,215,390,90,321,810,-5,2],
  ['L1','gold',139,425,166,151,221,656,-9,3],['R1','gold',743,425,166,151,595,683,8,3],
  ['L2','teal',139,275,166,153,58,870,-10,4],['R2','teal',743,275,166,153,821,882,9,4],
  ['L3','red',121,145,204,135,430,681,8,5],['R3','red',724,145,204,135,618,940,-12,5],
  ['C1','gold',437,93,175,128,240,919,5,5],['C2','blue',414,-43,222,145,440,980,-7,6]
 ].map(([id,type,x,y,w,h,sx,sy,angle,step])=>({id,type,x,y:y+80,w,h,sx,sy,angle,step}));
 function create(owner,{step=0,roof=false,field=false,point=null,memory=false,later=(fn,ms)=>setTimeout(fn,ms)}={}){
  const root=document.createElement('div');root.className='acb-scene'+(field?' acb-field':'')+(memory?' acb-memory':'');root.setAttribute('aria-label',memory?'青い屋根を二人で載せた思い出':'二人で作る積み木の城');
  const board=document.createElement('div');board.className='acb-board';root.appendChild(board);
  if(field&&point){root.style.setProperty('--acb-x',point.x);root.style.setProperty('--acb-y',point.y);}
  const nodes=new Map();
  function position(n,p,built){const scale=built?1:.67;n.style.left=(built?p.x:p.sx)/10+'%';n.style.top=(built?p.y:p.sy)/11+'%';n.style.width=p.w*scale/10+'%';n.style.height=p.h*scale/11+'%';n.style.setProperty('--turn',built?'0deg':p.angle+'deg');n.dataset.placed=String(built);n.style.zIndex=String(built?Math.round(600-p.y):10);}
  for(const p of parts){
   const n=document.createElement('div');n.className='acb-piece';n.dataset.part=p.id;n.dataset.step=p.step;n.classList.toggle('grounded',['P1','P2','L1','R1'].includes(p.id));
   const sprite=document.createElement('i'),r=atlas[p.type];sprite.className='acb-sprite';sprite.style.backgroundSize=`${1254/r[2]*100}% ${1254/r[3]*100}%`;sprite.style.backgroundPosition=`${r[0]/(1254-r[2])*100}% ${r[1]/(1254-r[3])*100}%`;n.appendChild(sprite);board.appendChild(n);nodes.set(p.id,n);position(n,p,p.step<=step||(p.id==='C2'&&roof));
  }
  owner.appendChild(root);
  function hand(n,who){const h=document.createElement('span');h.className='acb-hand '+who;n.appendChild(h);return h;}
  function place(ids,done,onPlaced){
   board.querySelectorAll('.acb-suggestion').forEach(n=>n.remove());
   const list=parts.filter(p=>ids.includes(p.id)&&nodes.get(p.id).dataset.placed!=='true');
   if(!list.length){done?.();return;}
   root.classList.add('working');
   list.forEach((p,i)=>later(()=>{
    if(!root.isConnected)return;const n=nodes.get(p.id);n.classList.add('carried');n.style.zIndex='900';
    const hands=[hand(n,i%2?'easy':'hero')];if(p.id==='C2')hands.push(hand(n,'easy'));
    later(()=>{if(!n.isConnected)return;n.classList.add('travelling');position(n,p,true);n.style.zIndex='900';},260);
    later(()=>{if(!n.isConnected)return;n.classList.remove('carried','travelling');n.classList.add('landed');hands.forEach(h=>h.classList.add('released'));n.style.zIndex=String(Math.round(600-p.y));onPlaced?.(p.id);},1330);
    later(()=>hands.forEach(h=>h.remove()),1710);
   },i*1720));
   later(()=>{if(!root.isConnected)return;root.classList.remove('working');done?.();},list.length*1720+250);
  }
  async function setWide(){
   root.classList.add('wide');
   if(board.querySelector('.acb-friends'))return;
   const friends=document.createElement('div');friends.className='acb-friends';
   const hero=document.createElement('span');hero.className='acb-child';
   const sprite=document.createElement('span'),sheet=new Image();sprite.className='acb-child-sprite';sheet.src=heroSheetUrl();sprite.style.backgroundImage='url("'+sheet.src+'")';sprite.setAttribute('role','img');sprite.setAttribute('aria-label','一緒に作った城を見る主人公');hero.appendChild(sprite);
   const easy=document.createElement('img');easy.className='acb-easy';easy.src='images/easy-motion/easy_15_walk_up/stand.png';easy.alt='一緒に作った城を見るイージー';friends.append(hero,easy);board.appendChild(friends);
   let timeout;try{
    await Promise.race([Promise.all([sheet.decode(),easy.decode()]),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('friends images')),4000);})]);
    if(!root.isConnected)return;
    function bounds(img,col=0,cols=1,rows=1){const w=img.naturalWidth/cols,h=img.naturalHeight/rows,c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,col*w,0,w,h,0,0,w,h);const data=ctx.getImageData(0,0,w,h).data;let top=h,bottom=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>64){top=Math.min(top,y);bottom=Math.max(bottom,y+1);}if(bottom<=top)throw Error('empty friend');return{fill:(bottom-top)/h,pad:(h-bottom)/h};}
    const hb=bounds(sheet,1,3,2),eb=bounds(easy);
    for(const [who,b] of [['hero',hb],['easy',eb]]){friends.style.setProperty('--'+who+'-fill',b.fill);friends.style.setProperty('--'+who+'-pad',b.pad);}
    friends.classList.add('ready');
   }catch(e){friends.remove();}finally{clearTimeout(timeout);}
  }
  function suggestRoof(){const n=nodes.get('C2');if(n.dataset.placed==='true'||n.querySelector('.acb-suggestion'))return;hand(n,'hero').classList.add('acb-suggestion');}
  return{root,board,place,suggestRoof,close(){root.remove();},setWide,focus(){root.classList.add('close');},get placed(){return [...nodes.values()].filter(n=>n.dataset.placed==='true').length;}};
 }
 function recall(owner,later,onDone){const scene=create(owner,{step:5,memory:true,later});scene.focus();scene.place(['C2'],()=>{scene.root.classList.add('fade');later(()=>{scene.close();onDone?.();},450);});return scene;}
 global.AmamiBlocks={create,recall,parts};
})(window);
