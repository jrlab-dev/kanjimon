/* 奄美専用の地面・自由歩行。通常102面の座標/通行/自動探索は使用しない。 */
(function(global){
 'use strict';
 const D=global.AmamiWalkData,dirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
 const keyDirs={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
 let active=null;
 function valid(map,p){return Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)&&p[0]>=0&&p[0]<D.cols&&p[1]>=0&&p[1]<D.rows&&map.grid[p[1]][p[0]]==='.';}
 function readSave(src){const out={version:D.version,positions:{}};if(src?.version!==D.version)return out;
  for(const [id,map] of Object.entries(D.maps))if(valid(map,src.positions?.[id]))out.positions[id]=src.positions[id].slice();return out;
 }
 function path(map,start,end){if(!valid(map,start)||!valid(map,end))return null;
  const key=p=>p[1]*D.cols+p[0],q=[start],prev=new Map([[key(start),null]]);
  for(let i=0;i<q.length;i++){const p=q[i];if(key(p)===key(end)){const result=[];let k=key(p);while(prev.get(k)!==null){result.push([k%D.cols,Math.floor(k/D.cols)]);k=prev.get(k);}return result.reverse();}
   for(const [dx,dy] of Object.values(dirs)){const n=[p[0]+dx,p[1]+dy],k=key(n);if(valid(map,n)&&!prev.has(k)){prev.set(k,key(p));q.push(n);}}
  }return null;
 }
 function close(){if(!active)return;const a=active;active=null;a.dispose();}
 function open({episode,word='',index=0,label='',exit=false,onArrive,onQuit,preview=false}){
  close();const map=D.maps[String(episode)];if(!map)throw Error('奄美の通行設定がありません');
  stopAutoExplore();heroLock=true;showScreen('screen-field');
  // 回答進行は既存の本体が保持。歩行だけを独立した座標で保存する。
  if(!preview)amamiFinal.walk=readSave(amamiFinal.walk);
  let pos=preview?map.start.slice():(amamiFinal.walk.positions[map.id]||map.start).slice();
  const target=(exit?map.exit:map.targets[Math.max(0,Math.min(map.targets.length-1,index))]||map.exit).slice();
  let route=[],held=null,timer=0,saveTimer=0,walking=false,disposed=false,fired=false,overview=false,frame=0,step=0,width=720,height=480,assetsReady=false;
  const root=document.createElement('section');root.id='amamiWalk';root.setAttribute('aria-label',map.name+'の探索');
  root.innerHTML='<header id="awHeader"><div><b id="awName"></b><small id="awProgress"></small></div><button id="awBack" type="button">もどる</button></header><div id="awView" tabindex="0" aria-label="地面をタップして歩く"><div id="awWorld"><div id="awHero" aria-label="主人公"><span class="hero-sprite"></span></div><div id="awTarget"></div></div></div><footer id="awFooter"><p id="awHint" role="status">地面を タップすると 歩けるよ</p><div id="awActions"><button id="awGo" type="button"></button><button id="awOverview" type="button" aria-pressed="false">全体を見る</button></div><div id="awPad" aria-label="歩く方向"><button data-d="up" aria-label="上へ">↑</button><button data-d="left" aria-label="左へ">←</button><button data-d="down" aria-label="下へ">↓</button><button data-d="right" aria-label="右へ">→</button></div></footer>';
  document.body.appendChild(root);document.body.classList.add('amami-walk-mode');
  // 背面の通常フィールドへTab/Enterが抜けないよう、元の状態を控えて入力を止める。
  const inertBefore=[...document.body.children].filter(el=>el!==root&&!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>[el,el.inert]);
  inertBefore.forEach(([el])=>{el.inert=true;});
  const $=id=>root.querySelector('#'+id),world=$('awWorld'),viewport=$('awView'),hero=$('awHero'),sprite=hero.firstElementChild,enemy=$('awTarget'),hint=$('awHint');
  $('awName').textContent=map.name;$('awProgress').textContent=label||'奄美の冒険';$('awGo').textContent=exit?'出口へ すすむ':'ことばへ すすむ';
  world.style.backgroundImage='url("'+map.background+'")';sprite.style.backgroundImage='url("images/sprites/'+(heroChar==='girl'?'hero-girl.webp':'hero.webp')+'")';sprite.style.setProperty('--bgx','50%');
  if(exit){enemy.classList.add('aw-exit');enemy.textContent=String(episode)==='12'?'イージーの ところへ':'つぎへ ↑';}
  else for(const w of word.length===4?[word.slice(0,2),word.slice(2)]:[word]){const n=document.createElement('span');AmamiMotion.fieldMonster(n,w);enemy.appendChild(n);}
  const objects=map.obstacles.map(o=>{const img=new Image();img.className='aw-obstacle';img.src=o.file;img.alt='';world.appendChild(img);return {img,o};});
  function persist(force=false){if(preview)return;amamiFinal.walk.positions[map.id]=pos.slice();if(force){clearTimeout(saveTimer);saveTimer=0;save();}else if(!saveTimer)saveTimer=setTimeout(()=>{saveTimer=0;save();},300);}
  function draw(){
   const px=(pos[0]+.5)*width/D.cols,py=(pos[1]+.5)*height/D.rows;
   hero.style.left=px+'px';hero.style.top=py+'px';hero.style.zIndex=String(100+Math.round(py));
   enemy.style.left=(target[0]+.5)*width/D.cols+'px';enemy.style.top=(target[1]+.5)*height/D.rows+'px';enemy.style.zIndex=String(100+Math.round((target[1]+.5)*height/D.rows));
   const x=width<=viewport.clientWidth?(viewport.clientWidth-width)/2:Math.max(viewport.clientWidth-width,Math.min(0,viewport.clientWidth/2-px));
   const y=height<=viewport.clientHeight?(viewport.clientHeight-height)/2:Math.max(viewport.clientHeight-height,Math.min(0,viewport.clientHeight*.55-py));
   world.style.transform=`translate(${x}px,${y}px)`;
  }
  function resize(){
   width=overview?Math.min(viewport.clientWidth,viewport.clientHeight*1.5):Math.max(720,viewport.clientWidth,viewport.clientHeight*1.5);height=width/1.5;
   world.style.width=width+'px';world.style.height=height+'px';hero.style.width=width*.052+'px';hero.style.height=width*.052+'px';
   enemy.style.setProperty('--tile',width*.04+'px');
   objects.forEach(({img,o})=>{img.style.left=o.x*width+'px';img.style.top=o.y*height+'px';img.style.width=o.width*width+'px';img.style.height=o.height*height+'px';img.style.zIndex=String(100+Math.round(o.y*height));});draw();
  }
  function stop(){route=[];held=null;walking=false;clearTimeout(timer);timer=0;sprite.style.setProperty('--bgy','0%');sprite.style.setProperty('--hero-lift','0px');}
  function arrive(){if(fired||disposed||preview||!assetsReady)return;fired=true;persist();const cb=onArrive;close();cb?.();}
  function facing(dx,dy){const ud=!dx;step++;sprite.style.setProperty('--bgx',ud?(dy<0?'50%':'0%'):'100%');sprite.style.setProperty('--bgy',step%2?'100%':'0%');sprite.style.setProperty('--hero-sx',dx<0?'-1':ud&&step%2?'-1':'1');}
  function tick(){timer=0;if(disposed||document.hidden){stop();return;}
   const next=held?[pos[0]+dirs[held][0],pos[1]+dirs[held][1]]:route.shift();
   if(!next){walking=false;sprite.style.setProperty('--bgy','0%');return;}
   if(!valid(map,next)){stop();hint.textContent='ここは 通れないよ。地面を えらんでね。';return;}
   facing(next[0]-pos[0],next[1]-pos[1]);pos=next;draw();persist();
   if(pos[0]===target[0]&&pos[1]===target[1]){arrive();return;}
   walking=true;timer=setTimeout(tick,90);
  }
  function go(end){if(!assetsReady||disposed)return;held=null;const found=path(map,pos,end);
   if(!found){hint.textContent='そこは 通れないよ。地面を えらんでね。';return;}
   route=found;hint.textContent='歩いているよ。方向ボタンで 止められるよ。';if(!route.length&&end[0]===target[0]&&end[1]===target[1]){arrive();return;}if(!timer)tick();
  }
  function manual(d){if(!assetsReady||disposed)return;route=[];held=d;if(!timer)tick();}
  function onKey(e){if(disposed)return;const d=keyDirs[e.key]||keyDirs[e.key.toLowerCase()];if(!d)return;e.preventDefault();if(e.type==='keyup'){if(held===d){held=null;}}else{e.stopImmediatePropagation();manual(d);}}
  function release(){held=null;}
  function onHide(){if(document.hidden){stop();persist(true);}}
  function onUnload(){persist(true);}
  viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const r=world.getBoundingClientRect();go([Math.floor((e.clientX-r.left)/width*D.cols),Math.floor((e.clientY-r.top)/height*D.rows)]);});
  $('awGo').onclick=()=>go(target);$('awOverview').onclick=()=>{overview=!overview;$('awOverview').setAttribute('aria-pressed',String(overview));$('awOverview').textContent=overview?'近くを見る':'全体を見る';resize();};
  $('awBack').onclick=()=>{persist();close();if(onQuit)onQuit();else showScreen('screen-title');};
  root.querySelectorAll('[data-d]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);manual(b.dataset.d);};b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
   b.onclick=e=>{if(e.detail===0){manual(b.dataset.d);held=null;}};
  });
  window.addEventListener('keydown',onKey,true);window.addEventListener('keyup',onKey,true);window.addEventListener('blur',stop);window.addEventListener('pagehide',onUnload);document.addEventListener('visibilitychange',onHide);
  const observer=new ResizeObserver(resize);observer.observe(viewport);
  function dispose(){if(disposed)return;disposed=true;persist(true);stop();cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',onKey,true);window.removeEventListener('keyup',onKey,true);window.removeEventListener('blur',stop);window.removeEventListener('pagehide',onUnload);document.removeEventListener('visibilitychange',onHide);root.remove();inertBefore.forEach(([el,value])=>{el.inert=value;});document.body.classList.remove('amami-walk-mode');}
  active={dispose,map,target,get position(){return pos.slice();},get ready(){return assetsReady;},get moving(){return walking||!!timer;},go,preview};resize();
  const bg=new Image();bg.src=map.background;
  const readyImage=img=>img.decode().then(()=>true,()=>false);
  $('awGo').disabled=true;
  Promise.all([readyImage(bg),...objects.map(({img})=>readyImage(img))]).then(ok=>{if(disposed)return;if(ok.some(v=>!v)){hint.textContent='絵を 読みこめませんでした。「もどる」から やりなおしてね。';return;}assetsReady=true;$('awGo').disabled=false;viewport.focus({preventScroll:true});});
 }
 global.AmamiWalk={open,close,readSave,path,valid,get current(){return active;},beforeScreen(id){if(id!=='screen-field')close();}};
})(window);
