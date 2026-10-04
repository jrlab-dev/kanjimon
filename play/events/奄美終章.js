/* 奄美第12話の後。五画面とE1〜E8を、戦闘とは別の保存点で再生する。 */
(function(global){
 'use strict';
 const $=id=>document.getElementById(id);
 const phases=['split','E1','E2','E3','E4','E5','E6','E7','E8','done'];
 let root=null,splitView=null,zoneObserver=null,voyageResize=null,generation=0,ambientSerial=0,timers=[],lines=[],lineIndex=0,ready=false,afterTalk=null,lineHook=null,running=false;
 const heroSheet=()=>heroChar==='girl'?'hero-girl.webp':'hero.webp';
 let closePair=null,staging=false;
 let musicToken=null;
 // E1だけの寄り。床と人物を同じfieldGridで動かし、会話の実寸を避ける。
 function focusPair(){
  const grid=$('fieldGrid'),wrap=$('fieldWrap'),hero=$('fieldHero'),easy=grid?.querySelector('.aen-easy');
  if(!grid||!wrap||!hero||!easy)return;
  const original={transform:grid.style.transform,transformOrigin:grid.style.transformOrigin,transition:grid.style.transition};
  let frame=0,closed=false;
  function fit(){
   frame=0;if(closed||!root?.isConnected)return;
   const before=grid.style.transform;grid.style.transition='none';grid.style.transformOrigin='0 0';grid.style.transform='none';
   const g=grid.getBoundingClientRect(),w=wrap.getBoundingClientRect(),talkBox=$('aenTalk').getBoundingClientRect();
   const boxes=[hero.querySelector('.hero-sprite')||hero,easy.querySelector('.easy3d-frame')||easy].map(n=>n.getBoundingClientRect());
   const left=Math.min(...boxes.map(r=>r.left))-g.left,right=Math.max(...boxes.map(r=>r.right))-g.left;
   const top=Math.min(...boxes.map(r=>r.top))-g.top,bottom=Math.max(...boxes.map(r=>r.bottom))-g.top;
   const safeTop=Math.max(w.top,96),safeBottom=Math.min(w.bottom,talkBox.top-20);
   if(right<=left||bottom<=top||safeBottom<=safeTop){Object.assign(grid.style,original);return;}
   const scale=Math.min(4.5,w.width*.82/(right-left),(safeBottom-safeTop)*.78/(bottom-top));
   const x=w.left+w.width*.5-g.left-(left+right)*scale/2;
   const y=(safeTop+safeBottom)/2-g.top-(top+bottom)*scale/2;
   grid.style.transform=before;grid.getBoundingClientRect();
   grid.style.transition=matchMedia('(prefers-reduced-motion:reduce)').matches?'none':'transform 900ms cubic-bezier(.2,.65,.25,1)';
   grid.style.transform=`translate(${x}px,${y}px) scale(${scale})`;
  }
  function schedule(){if(!frame&&!closed)frame=requestAnimationFrame(fit);}
  const observer=new ResizeObserver(schedule);observer.observe(wrap);observer.observe($('aenTalk'));schedule();
  closePair=()=>{closed=true;cancelAnimationFrame(frame);observer.disconnect();Object.assign(grid.style,original);hero.classList.remove('aen-listening-nod');closePair=null;};
 }
 function e1Pose(kind){
  if(!root)return;root.dataset.beat=kind;
  const easy=document.querySelector('#fieldGrid .aen-easy .easy3d-frame');
  if(easy){easy.src=kind==='realize'?'images/easy-motion/easy_12_settle/frame-030.webp':'images/easy-motion/easy_15_walk_left/stand.png';easy.style.setProperty('--motion-x','0%');easy.style.setProperty('--motion-y','0%');}
 }
 function later(fn,ms){const g=generation,id=setTimeout(()=>{timers=timers.filter(t=>t!==id);if(g===generation&&running)fn();},ms);timers.push(id);return id;}
 function stopTimers(){timers.forEach(clearTimeout);timers=[];}
 function cleanup(){global.bgmSceneEnd(musicToken);musicToken=null;generation++;ambientSerial++;running=false;staging=false;closePair?.();stopTimers();zoneObserver?.disconnect();zoneObserver=null;lineHook=null;if(voyageResize){window.removeEventListener('resize',voyageResize);voyageResize=null;}global.AmamiVoice?.stop();global.AmamiMotion?.stop();splitView?.destroy();splitView=null;root?.remove();root=null;$('aenOpening')?.remove();document.querySelectorAll('.aen-easy,.aen-child,.aen-monster-reading').forEach(n=>n.remove());document.body.classList.remove('amami-ending-mode');if($('fieldHero'))$('fieldHero').style.visibility='';}
 function ensureRoot(){
  root=document.createElement('div');root.id='amamiEndingRoot';
  root.innerHTML='<div id="aenMontage" aria-hidden="true"></div><div id="aenPhone" aria-hidden="true"><div class="aen-screen"><div class="aen-title">かんじモン<small>RPG</small></div></div></div><div id="aenTalk"><img id="aenFace" alt=""><div><b id="aenWho"></b><p id="aenText"></p><small id="aenNext">▼ つづく</small></div></div><button id="aenQuit" type="button" aria-label="タイトルへ戻る">とじる</button>';
  document.body.appendChild(root);root.addEventListener('click',e=>{if(e.target.closest('#aenQuit'))return;nextLine();});$('aenQuit').addEventListener('click',e=>{e.stopPropagation();abort();});
  document.body.classList.add('amami-ending-mode','nd-event-mode');
 }
 function showLine(afterPause=false){
  global.AmamiVoice?.stop();ready=false;const box=$('aenTalk');$('aenNext').classList.remove('ready');
  if(lineIndex>=lines.length){box.classList.remove('show');const callback=afterTalk;afterTalk=null;lineHook=null;callback?.();return;}
  // 主人公の言葉を受けてから気づく。連打では飛ばさず、退出時は既存のlaterで取り消す。
  if(!afterPause&&lines[lineIndex]?.id==='E103'){e1Pose('pause');later(()=>showLine(true),1000);return;}
  const row=lines[lineIndex++];global.AmamiStoryUI.display(row,box,$('aenFace'),$('aenWho'),$('aenText'));lineHook?.(row);
  later(()=>{ready=true;if(!staging)$('aenNext')?.classList.add('ready');},Math.min(1400,Math.max(500,$('aenText').textContent.length*25)));
 }
 function talk(rows,done,hook=null){lines=rows||[];lineIndex=0;afterTalk=done;lineHook=hook;showLine();}
 // 背景の首振りは会話と独立。発話中だけを待ち、無限演技で送りを止めない。
 function nextLine(){if(!ready||staging||global.AmamiVoice?.busy)return;showLine();}
 function animateEasies(items){
  const ticket=++ambientSerial;let clip='13';
  function cycle(){
   if(ticket!==ambientSerial||!running||!items.some(el=>el.isConnected))return;
   const motion=global.AmamiMotion?.play(items,clip);clip=clip==='13'?'14':'13';
   motion?.done?.then(result=>{if(result.cancelled||ticket!==ambientSerial)return;later(cycle,result.fallback?3000:120);});
  }
  cycle();
 }
 function placeEasies(field,count,positions,ambient=true){
  const grid=$('fieldGrid'),items=[];if(!grid)return items;
  for(let i=0;i<count;i++){
   const p=positions?.[i]||{x:field.cx+(i-(count-1)/2)*1.85,y:field.cy+(i%2)*.45};
   const el=document.createElement('span');el.className='interior-npc has-sheet nd-field-actor amami-actor amami-easy aen-easy';
   el.style.setProperty('--ix',p.x);el.style.setProperty('--iy',p.y);el.style.setProperty('--npc-scale',1.25);el.style.setProperty('--aen-delay',(-i*.62)+'s');el.dataset.x=p.x;el.dataset.y=p.y;el.dataset.dir='down';
   const visual=document.createElement('span');visual.className='interior-npc-visual';visual.style.backgroundImage="url('images/sprites/npc-mob-easy.webp')";el.appendChild(visual);grid.appendChild(el);
   try{global.setInteriorActorPose(el,'down','a');}catch(e){}
   global.AmamiMotion?.mount(el);el.style.opacity='0';later(()=>{if(el.isConnected)el.style.opacity='1';},220+i*150);items.push(el);
  }
  if(ambient)animateEasies(items);return items;
 }
 function placeChild(field,scared,reading=false,position=null){
  const img=document.createElement('img');img.className='aen-child'+(scared?' scared':'');img.alt='別の子ども';
  img.src=reading?'images/amami-cast/child-reading-phone-v2.png':'images/sprites/'+(scared?'kid-scared-front-m-a.webp':'kid-front-m-a.webp');
  if(reading)img.classList.add('has-phone');
  const p=position||{x:field.cx+2.35,y:field.cy+.6};img.style.setProperty('--ax',p.x);img.style.setProperty('--ay',p.y);$('fieldGrid').appendChild(img);return img;
 }
 function scene(zone,opts={}){
  ambientSerial++;global.AmamiMotion?.stop();
  document.querySelectorAll('.aen-monster-reading').forEach(n=>n.remove());
  zoneObserver?.disconnect();zoneObserver=null;
  const field=global.NationalDeparture.showField(zone,{gender:heroChar,hero:opts.hero!==false,label:opts.label||'',monsters:opts.monsters||0,adults:opts.adults||0,mana:!!opts.mana,hokkaido:!!opts.hokkaido,background:opts.background||'',point:{x:15,y:6}});
  const label=$('fieldZoneName');if(label&&opts.label){label.textContent=opts.label;zoneObserver=new MutationObserver(()=>{if(running&&label.textContent!==opts.label)label.textContent=opts.label;});zoneObserver.observe(label,{childList:true,characterData:true,subtree:true});}
  document.body.classList.add('amami-ending-mode','nd-event-mode');if(root)root.dataset.scene=opts.scene||'';
  return field;
 }
 function picture(src,kind,alt=''){
  const el=document.createElement('img');el.className='aen-picture '+kind;el.src=src;el.alt=alt;root.appendChild(el);return el;
 }
 function storyRows(phase){return global.AmamiStoryUI.ending(phase);}
 function sleepMonsters(mobs){
  mobs.forEach(n=>{n.classList.remove('nd-frozen','aen-calm');n.querySelector('.icd-ice-shell')?.remove();const face=n.querySelector('.face');if(face){face.classList.remove('angry');face.classList.add('sleeping');}n._aenReading?.remove();n._aenReading=null;});
 }
 function showRescueReadings(key,mobs){
  const spoken=global.AmamiRescueVoiceData?.[key]?.items||[];
  mobs.forEach((n,index)=>{
   const char=n.querySelector('.fc')?.textContent?.trim()||'';
   const item=spoken.find(x=>x.char===char),reading=item?.reading||K.find(k=>k.c===char)?.y||'';
   if(!reading)return;
   const label=document.createElement('span');label.className='aen-monster-reading';label.textContent=reading;
   label.style.left=`calc(${Number(n.dataset.x)+.5} * var(--tile))`;label.style.top=`calc(${Number(n.dataset.y)-.18} * var(--tile))`;
   $('fieldGrid').appendChild(label);n._aenReading=label;
   const delay=Number.isFinite(item?.delayMs)?item.delayMs:index*65;
   later(()=>label.classList.add('show'),Math.max(0,delay));
  });
 }
 function advance(){
  const index=phases.indexOf(amamiFinal.story.phase);if(index<0)return abort();
  amamiFinal.story.phase=phases[index+1]||'done';save();
  if(amamiFinal.story.phase==='done'){cleanup();showScreen('screen-title');return;}
  runPhase();
 }
 function e3(){
  const places=[
   {zone:102,label:'オキナワ',count:3,background:'okinawa-ferry-entrance-field-20260921.png',mana:true,monsters:4},
   {zone:1,label:'トウキョウ',count:3,mana:true,monsters:6},
   {zone:102,label:'別の町',count:3,background:'town-bg-south.webp',mana:false,monsters:4},
   {zone:83,label:'ホッカイドウ',count:5,mana:true,adults:0,hokkaido:true,monsters:16}
  ];
  function cut(i){
   const p=places[i],f=scene(p.zone,{...p,hero:false,scene:'rescue'});
   const positions=p.count===5?
    [{x:f.cx-2.75,y:f.cy+1},{x:f.cx-1.35,y:f.cy+1.45},{x:f.cx,y:f.cy+1},{x:f.cx+1.35,y:f.cy+1.45},{x:f.cx+2.75,y:f.cy+1}]:
    [{x:f.cx-2.2,y:f.cy+1.05},{x:f.cx,y:f.cy+1.4},{x:f.cx+2.2,y:f.cy+1.05}];
   placeEasies(f,p.count,positions);
   if(i===3){
    const mana=f.actors.find(n=>n.classList.contains('nd-field-mana'));
    if(mana){mana.style.setProperty('--mx',f.cx-.7);mana.style.setProperty('--my',f.cy-.4);}
    global.NationalDeparture.placeActor({kind:'maros',x:f.cx-3.2,y:f.cy-2.2,extra:'aen-maros'});
    f.mobs.forEach(n=>n.classList.add('nd-frozen'));
   }
   const key=['okinawa','tokyo','town','hokkaido'][i];
   const started=performance.now(),voice=global.AmamiRescueVoice?.play(key,root);
   if(voice?.started)voice.started.then(result=>{if(!result.cancelled&&running)showRescueReadings(key,f.mobs);});
   else showRescueReadings(key,f.mobs);
   const finish=()=>later(()=>{sleepMonsters(f.mobs);if(i<places.length-1)later(()=>cut(i+1),1350);else talk(storyRows('E3'),advance);},Math.max(0,2000-(performance.now()-started)));
   if(voice?.done)voice.done.then(result=>{if(result.reason!=='cancelled'&&running)finish();});else finish();
  }
  cut(0);
 }
 function copyHero(className){
  const actor=document.createElement('span');actor.className=className;actor.setAttribute('aria-label','主人公');
  const source=$('fieldHero')?.querySelector('.hero-sprite');if(source){global.AmamiArrival.heroWalkFrame(source,false);const sprite=document.createElement('span'),cs=getComputedStyle(source);sprite.className='aen-hero-copy';for(const k of ['backgroundImage','backgroundSize','backgroundPosition','width','height'])sprite.style[k]=cs[k];actor.appendChild(sprite);}return actor;
 }
 function showMontage(){
  const art=$('aenMontage');art.innerHTML='<img src="images/fullart/amami-toy-castle-floor1.png" alt="城の遊び"><img src="images/fullart/amami-main-03-naze-town.png" alt="主人公が歩いた町"><img src="images/title/title-hero-field.webp" alt="かんじモンのゲーム画面">';
  art.classList.add('show');let i=0;const imgs=[...art.querySelectorAll('img')];
  imgs[0].classList.add('on');[1500,3000].forEach(ms=>later(()=>{imgs[i].classList.remove('on');imgs[++i].classList.add('on');},ms));
  const reader=copyHero('aen-making-reader'),answer=document.createElement('span');answer.className='aen-making-reading';answer.textContent=global.AmamiLate.definition(AMAMI_LATE_WORDS[5][0]).y;reader.appendChild(answer);art.appendChild(reader);
  later(()=>reader.classList.add('show'),1900);later(()=>reader.remove(),3000);
  later(()=>$('aenPhone')?.classList.add('show'),3500);
  const making=document.createElement('div');making.id='aenMakingWords';const word=AMAMI_LATE_WORDS[5][0];making.innerHTML='<span></span><span></span><i class="aen-making-hand"></i>';making.children[0].textContent=word.slice(0,2);making.children[1].textContent=word.slice(2);root.appendChild(making);
  later(()=>making.classList.add('together'),700);later(()=>making.classList.add('chosen'),1200);later(()=>making.classList.add('read'),1700);later(()=>making.classList.add('into-phone'),2900);later(()=>making.remove(),3900);
 }
 function runPhase(){
  const phase=amamiFinal?.story?.phase;if(!phases.includes(phase)||phase==='done')return;
  cleanup();running=true;
  global.bgmAmamiEpisode=null;
  const theme=({E1:'easy',E2:'hero',E3:'easy',E5:'easy',E6:'easy',E7:'easy',E8:'easy'})[phase];
  musicToken=global.bgmSceneBegin('amami-ending-'+phase,theme);
  if(phase==='split'){
   splitView=global.AmamiCastle.createView(12);splitView.epilogue(()=>{splitView?.destroy();splitView=null;advance();});return;
  }
  ensureRoot();root.dataset.phase=phase;
  if(phase==='E1'||phase==='E2'){
   const f=scene(102,{label:'おもちゃの城 4階',background:'amami-toy-castle-floor4.png',hero:true,scene:'castle'});placeEasies(f,1,[{x:f.cx+1.75,y:f.cy-.35}],phase!=='E1');
   if(phase==='E2'){
    const memory=document.createElement('div');memory.className='aen-memory-frame';memory.innerHTML='<img src="images/sprites/mana-farewell-20260920.png" alt="出発時のマナを思い出す">';root.appendChild(memory);
    later(()=>memory.classList.add('show'),250);
    later(()=>talk(storyRows(phase),advance,row=>{if(row?.id==='E201'){try{setHeroFacing(0,1);}catch(e){}}else{memory.classList.remove('show');later(()=>memory.remove(),450);}}),850);
   }else{
    try{setHeroFacing(1,0);}catch(e){}
    talk(storyRows(phase),advance,row=>{
     e1Pose(row?.id==='E103'||row?.id==='E104'?'realize':'listening');
     if(row?.id==='E101'&&global.AmamiBlocks){staging=true;global.AmamiBlocks.recall(root,later,()=>{staging=false;if(ready)$('aenNext')?.classList.add('ready');});}
     else root.querySelector('.acb-memory')?.remove();
     if(row?.id==='E104')$('fieldHero')?.classList.add('aen-listening-nod');
    });
    focusPair();
   }
   return;
  }
  if(phase==='E3'){e3();return;}
  if(phase==='E4'){
   scene(102,{label:'かえりの船',background:'ship-view-okinawa-20260920.png',hero:false,mana:false,scene:'sailing'});
   // フィールド背景はカメラ拡縮で海が画面外へ出るため、海と船を同じ固定枠に描く。
   const sea=document.createElement('div');sea.className='aen-voyage-scene';root.appendChild(sea);
   voyageResize=()=>{const wr=$('fieldWrap').getBoundingClientRect(),rr=root.getBoundingClientRect();Object.assign(sea.style,{left:(wr.left-rr.left)+'px',top:(wr.top-rr.top-10)+'px',width:wr.width+'px',height:(wr.height+10)+'px'});};
   voyageResize();window.addEventListener('resize',voyageResize);
   const voyage=document.createElement('img');voyage.className='aen-picture aen-voyage';voyage.src='images/fullart/ship-side-clear.webp';voyage.alt='奄美から沖縄へ戻る船';sea.appendChild(voyage);
   later(()=>voyage.classList.add('show'),100);
   later(()=>{if(voyageResize){window.removeEventListener('resize',voyageResize);voyageResize=null;}sea.remove();const f=scene(102,{label:'フェリーのりば',background:'okinawa-ferry-entrance-field-20260921.png',hero:true,mana:true,scene:'return'});placeEasies(f,1,[{x:f.cx+2.4,y:f.cy+.25}]);talk(storyRows(phase),advance,row=>{if(row?.id==='E401')musicToken=global.bgmSceneBegin('amami-ending-E4','mana');});},2600);
   return;
  }
  if(phase==='E5'){
   const f=scene(102,{label:'オキナワの町',background:'town-bg-south.webp',hero:true,monsters:1,scene:'child'}),mon=f.mobs[0];
   // 眠ったかんじモンと子の間へイージーを置く。眠りの状態はここで変えない。
   if(mon){mon.style.left=`calc(${f.cx+2.7} * var(--tile))`;mon.style.top=`calc(${f.cy-1.85} * var(--tile))`;mon.dataset.x=f.cx+2.7;mon.dataset.y=f.cy-1.85;}
   sleepMonsters(f.mobs);const easies=placeEasies(f,1,[{x:f.cx+.25,y:f.cy+.7}]),child=placeChild(f,true,false,{x:f.cx+1.6,y:f.cy+1.25});
   const frameChild=()=>{if(!running||!root?.isConnected)return;const grid=$('fieldGrid'),wrap=$('fieldWrap'),g=grid.getBoundingClientRect(),scale=g.width/grid.offsetWidth||1;const boxes=[$('fieldHero'),easies[0],child,mon].filter(Boolean).map(n=>n.getBoundingClientRect());const left=Math.min(...boxes.map(r=>r.left)),right=Math.max(...boxes.map(r=>r.right)),top=Math.min(...boxes.map(r=>r.top)),bottom=Math.max(...boxes.map(r=>r.bottom));const zoom=Math.min(2.2,wrap.clientWidth*.8/((right-left)/scale),wrap.clientHeight*.5/((bottom-top)/scale));grid.style.transformOrigin='0 0';grid.style.transition='transform .75s ease';grid.style.transform=`translate(${wrap.clientWidth*.5-((left+right)/2-g.left)/scale*zoom}px,${wrap.clientHeight*.38-((top+bottom)/2-g.top)/scale*zoom}px) scale(${zoom})`;};
   later(()=>{if(easies[0])global.AmamiMotion.walk(easies[0],{x:f.cx+1.8,y:f.cy+.05},750);},350);
   later(frameChild,550);voyageResize=frameChild;window.addEventListener('resize',voyageResize);
   talk(storyRows(phase),advance,row=>{
    if(row?.id==='E501')child.classList.add('retreat');
    if(row?.id==='E502')child.classList.add('listening');
   });return;
  }
  if(phase==='E6'){
   const f=scene(102,{label:'あたらしい遊び',background:'amami-toy-castle-floor1.png',hero:true,scene:'making'});placeEasies(f,1,[{x:f.cx+1.5,y:f.cy-.2}]);showMontage();
   // フェードが終わって実際に読める状態から1.5秒を確保する。
   const phoneAppearsAt=performance.now()+4100;
   talk(storyRows(phase),()=>later(advance,Math.max(800,phoneAppearsAt+1500-performance.now())));return;
  }
  if(phase==='E7'||phase==='E8'){
   const f=scene(102,{label:'オキナワの町',background:'town-bg-south.webp',hero:phase==='E7',scene:'handoff'});
   if(phase==='E7'){
    root.dataset.scene='later';const observer=copyHero('aen-observer');root.appendChild(observer);$('fieldHero').style.visibility='hidden';
    const pair=document.createElement('div');pair.id='aenE7Pair';pair.innerHTML='<img id="aenE7Easy" src="images/easy-motion/poster.png" alt="イージー"><img id="aenE7Child" src="images/sprites/kid-scared-front-m-a.webp" alt="不安そうな子ども">';root.appendChild(pair);
    const showHandoff=()=>{if($('aenHandoff'))return;pair.remove();const handoff=document.createElement('img');handoff.id='aenHandoff';handoff.src='images/amami-cast/phone-handoff-v2.png';handoff.alt='イージーが子どもへスマホを差し出す';root.appendChild(handoff);const screen=$('aenPhone');screen.classList.add('show','handoff');screen.setAttribute('aria-label','渡すスマホの画面：かんじモンRPG');screen.removeAttribute('aria-hidden');};
    const pause=document.createElement('div');pause.className='aen-time-pause';pause.innerHTML='<span>それから、あるひ。</span>';root.appendChild(pause);later(()=>{pause.remove();talk(storyRows(phase),advance,row=>{
     if(row?.id==='E713'){const child=$('aenE7Child');if(child){child.src='images/sprites/kid-front-m-a.webp';child.alt='話を聞く子ども';child.classList.add('calming');}}
     if(row?.id==='E714')showHandoff();
     if(row?.id==='E715')$('aenHandoff')?.classList.add('receiving');
    });},1500);return;
   }
   root.dataset.scene='final';
   const pair=document.createElement('div');pair.id='aenFinalPair';pair.innerHTML='<div id="aenFinalEasy"><img class="easy3d-frame" src="images/easy-motion/poster.png" alt="イージー"></div><img id="aenFinalChild" src="images/amami-cast/child-reading-phone-v2.png" alt="スマホを持って自分からゲームを始める子ども"><span id="aenTap" aria-hidden="true"></span>';root.appendChild(pair);animateEasies([$('aenFinalEasy')]);
   $('aenFinalChild').classList.add('tapping');
   later(()=>{
    ambientSerial++;global.AmamiMotion?.stop();
    const opening=document.createElement('div');opening.id='aenOpening';opening.innerHTML='<div class="op1-voice" id="aenOpeningText">だいじょうぶ。なにも おぼえなくて いいよ。たのしむだけで いいんだ。<span class="op1-key">イージーだよ</span></div><button type="button" id="aenOpeningQuit" aria-label="タイトルへ戻る">とじる</button>';
    document.body.appendChild(opening);$('aenOpeningQuit').addEventListener('click',abort);
    later(()=>$('aenOpeningText')?.classList.add('show'),100);
    const row=storyRows('E8').find(r=>r.id==='E701');
    global.AmamiVoice?.playRow(row,opening);
    const readableMs=Math.max(6200,((global.AmamiVoiceRows?.E701?.duration||5.81)+.9)*1000);
    const finishWhenQuiet=()=>{if(!running)return;const voice=global.AmamiVoice?.current;if(voice?.busy)voice.done.then(r=>{if(r.reason!=='cancelled')later(finishWhenQuiet,80);});else advance();};
    later(finishWhenQuiet,readableMs);
   },1900);
  }
 }
 function start(){if(!amamiFinal?.episode12?.done)return false;if(amamiFinal.story?.phase==='done')return false;runPhase();return true;}
 function preview(phase='split'){
  if(!phases.includes(phase)||phase==='done'||typeof amamiFinal!=='object'||!amamiFinal)return false;
  amamiFinal.episode12={...(amamiFinal.episode12||{}),done:true};
  amamiFinal.story={version:2,phase,legacy:false};
  runPhase();return true;
 }
 function abort(){cleanup();showScreen('screen-title');}
 function beforeScreen(id){if(id!=='screen-field'&&id!=='screen-battle'&&running)cleanup();}
 global.AmamiEnding={start,preview,abort,beforeScreen,get active(){return running;}};
})(window);
