/* 第1学年の本筋2場面。台詞・音声・進行は既存EV/ZONE_TALKを使う。 */
(function(global){
 'use strict';
 let current=null;
 const silhouettes=new Map();
 function bounds(img){
  if(silhouettes.has(img.src))return silhouettes.get(img.src);
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  let top=canvas.height,bottom=0;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>=64){top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
  if(bottom<=top)throw Error('Empty character');
  const value={fill:(bottom-top)/canvas.height,pad:(canvas.height-bottom)/canvas.height};silhouettes.set(img.src,value);return value;
 }
 function open(kind){
  current?.close();
  const zone=kind==='asakusa'?5:6,isEvent=zone===5,seq=fieldSeq;
  const root=document.createElement('section');root.id='gradeOneStory';root.dataset.place=kind;root.dataset.beat='place';root.dataset.speaker='mana';
  root.setAttribute('aria-label',isEvent?'あさくさでの であい':'とうきょうえきの よみがな');
  const background=isEvent?'asakusa-conversation.webp':'tokyo-station-conversation.webp';
  root.innerHTML='<div class="ig-view"><div class="ig-art"><img class="ig-bg" src="images/fullart/'+background+'" alt="'+(isEvent?'大きな提灯のある浅草の門':'赤煉瓦と白いアーチの駅の待合所')+'">'+(isEvent?'<span class="ig-lantern">あさくさ</span>':'')+'</div><b class="ig-location">'+(isEvent?'あさくさ':'とうきょうえき')+'</b><button class="ig-close" type="button">もどる</button>'+
  (!isEvent?'<div class="ig-board" aria-label="町、村、学校への案内札"><div class="ig-board-heading">いきさき</div><div class="ig-destinations"><span><small>まち</small><b>町</b></span><span><small>むら</small><b>村</b></span><span><small>がっこう</small><b>学校</b></span></div><i class="ig-trace" aria-hidden="true"></i></div>':'')+
  '<div class="ig-stage"><img class="ig-hero" alt="話を聞く主人公"><img class="ig-mana" src="images/sprites/mana-conversation.webp" alt="マナ">'+(isEvent?'<img class="ig-easy" src="images/easy-motion/easy_01_attend/frame-000.webp" alt="イージー">':'')+'</div></div><div class="ig-dialog"><b class="ig-speaker">マナ</b><div class="ig-slot"></div></div>';
  const hero=root.querySelector('.ig-hero'),stage=root.querySelector('.ig-stage'),slot=root.querySelector('.ig-slot');
  hero.src='images/battle-tate/hero-back-'+(heroChar==='girl'?'girl':'boy')+costumeSuffix()+'.webp';
  document.body.appendChild(root);
  let live=true,ready=false,index=0,row=null,timer=0,motion=null,motionStarted=false;
  function startMotion(){
   if(!isEvent||!ready||index<3||motionStarted)return;
   motionStarted=true;
   if(matchMedia('(prefers-reduced-motion:reduce)').matches||!global.AmamiMotion)return;
   const easy=root.querySelector('.ig-easy');
   // 初対話で左右を向く演技を一度だけ。行送りで巻き戻さず、入力も止めない。
   motion=global.AmamiMotion.play(easy,'13',{onDone({fallback}){
    if(live&&fallback)easy.src='images/easy-motion/easy_01_attend/frame-000.webp';
   }});
  }
  function restore(){
   if(isEvent){const box=slot.querySelector('#evBox');if(box)$('evOverlay').appendChild(box);}
   else{const box=slot.querySelector('#hakaseTalkWin');if(box){$('fieldWrap').appendChild(box);positionHakaseTalkWindow(box,$('fieldWrap'));}}
  }
  function close(){
   if(!live)return;live=false;clearInterval(timer);
   if(motion){if(global.AmamiMotion.current===motion)global.AmamiMotion.stop();else motion.stop();motion=null;}
   document.removeEventListener('keydown',key);restore();root.remove();if(current===api)current=null;
  }
  function abort(){
   if(!live)return;
   close();
   if(isEvent){if(evActive&&evZone===5)evFinish(false);}
   else{hakaseMsgSeq++;hakaseTapTrigger=null;ztActive=false;heroLock=false;stopBattleHakaseVoice();hakaseDuckRelease();hideHakaseTalkWindow();}
  }
  function key(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();abort();showScreen('screen-title');}}
  function line(n,s){
   if(!live)return;index=n;row=s;
   const who=isEvent&&s?.who==='easy'?'easy':'mana';root.dataset.speaker=who;
   root.querySelector('.ig-speaker').textContent=who==='easy'?'イージー':'マナ';
   root.dataset.beat=isEvent?(n===0?'place':n<3?'explain':n<5?'greet':'reply'):(n===0?'destinations':n===1?'trace':'remember');
   if(ready){const box=$(isEvent?'evBox':'hakaseTalkWin');if(box)slot.appendChild(box);startMotion();}
  }
  root.querySelector('.ig-close').onclick=e=>{e.stopPropagation();abort();showScreen('screen-title');};
  if(isEvent)root.addEventListener('click',()=>{if(live&&ready)evAdvance();});
  else root.querySelector('.ig-dialog').addEventListener('click',e=>{if(live&&ready&&!e.target.closest('#hakaseTalkWin'))hakaseTapAdvance();});
  document.addEventListener('keydown',key);
  const api={close,abort,line,kind};current=api;
  timer=setInterval(()=>{if(fieldSeq!==seq||fieldZone!==zone||!$('screen-field')?.classList.contains('active'))abort();},80);
  Promise.all([...root.querySelectorAll('img')].map(img=>img.decode())).then(()=>{
   if(!live)return;
   if(fieldSeq!==seq||fieldZone!==zone){abort();return;}
   for(const name of ['hero','mana',...(isEvent?['easy']:[])]){const b=bounds(root.querySelector('.ig-'+name));stage.style.setProperty('--'+name+'-fill',b.fill);stage.style.setProperty('--'+name+'-pad',b.pad);}
   ready=true;root.classList.add('ready');line(index,row);
  }).catch(()=>{if(!live)return;ready=false;restore();root.remove();});
  return api;
 }
 global.GradeOneStory={
  openEvent(zone,phase){if(zone===5&&phase==='in'&&fieldZone===5)return open('asakusa');return null;},
  openTalk(lines){if(fieldZone===6&&lines===ZONE_TALK[6].out)return open('station');return null;},
  eventLine(n,s){if(current?.kind==='asakusa')current.line(n,s);},
  finishEvent(){if(current?.kind==='asakusa')current.close();},
  abort(){current?.abort();},
  beforeScreen(id){if(id!=='screen-field')current?.abort();}
 };
})(window);
