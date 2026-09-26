/* 全国協力：正本の地図・フィールド・船を隔離ハーネス内で再利用する独立イベント。 */
(function(global){
  'use strict';
  const $=id=>document.getElementById(id),q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const LINES=[
    ['R00','沖縄のマナ','東京のマナから 通信が 入った。……なんだろう。','nd_r00'],
    ['R01','東京のマナ','マナ、大変よ。かんじモンが 暴走し始めたの。おさえるので いっぱい。そっちも 気をつけて。','nd_r01'],
    ['R02','沖縄のマナ','……どうして、急に？','nd_r02'],
    ['R03','東京のマナ','こっちは、大人も いっしょに 読んでる。でも、前より 数が 多い。','nd_r03'],
    ['R04','関東の先生','子どもは 下がって。読める 字から、いっしょに 読むよ。',null],
    ['R05','関西・四国のマナ','次から 次へ 来る。みんなで 読んでも、おさえきれない。','nd_r05'],
    ['R06','中部のマナ','……そういえば、この地方で イージーが かんじモンを おさえているの、最近 見てない。','nd_r06'],
    ['R07','東北のマナ','そういえば、こっちも。','nd_r07'],
    ['R08','関東のマナ','ここでも、見てない……。','nd_r08'],
    ['R09','沖縄のマナ','……私たちが、話し合った 結果だ。','nd_r09'],
    ['R10','沖縄のマナ','ここも 危ない。……どうしよう。','nd_r10'],
    ['R11','北海道のマナ','もう、だめ……おさえられない！','nd_r11'],
    ['R11A','北海道のマナ','マローズさん……来てくれたのね！',null],
    ['R12','マローズ','……止める ことは、できる。だが、読まれなければ、また 暴れる。',null],
    ['R13','マローズ','ここは 私たちに 任せて、{name}は イージーを 止めてくれ。',null],
    ['R14','沖縄のマナ','私は、ここに 残る。','nd_r14'],
    ['R15','沖縄のマナ','あの子が 知りたいのは、あなたの こと。……行っておいで。','nd_r15']
  ];
  const FACES={mana:'images/bust/mana_normal.webp',maros:'images/bust/maros-face.webp',adult:'images/bust/mob_otona_f_a_normal.webp'};
  const HOKKAIDO_CHARS=['留','厚','精','統','解','液','減','象','暴','務','資','脈','賛','略','性','毒','査','告','件','婦','粉','混','河','移','貧','可','基','証','責'];
  const HOKKAIDO_POSITIONS=[
    [-3.65,-.6],[-2.35,-.6],[2.35,-.6],[-3.65,-1.75],[3.65,-.6],[3.65,-1.75],[-2.35,-1.75],[2.35,-1.75],
    [-3.65,-2.9],[-2.35,-2.9],[2.35,-2.9],[-3.65,-4.05],[-2.35,-4.05],[2.35,-4.05],[3.65,-2.9],[3.65,-4.05],
    [-3.65,-5.2],[-2.35,-5.2],[2.35,-5.2],[3.65,-5.2],
    [-1.1,-3.2],[0,-3.2],[1.1,-3.2],[-1.1,-2.05],[0,-2.05],[1.1,-2.05],[-1.1,-.9],[0,-.9],[1.1,-.9]
  ];

  function restoreEventAudio(on){
    if(global.__ND_NATIVE_AUDIO)global.Audio=global.__ND_NATIVE_AUDIO;
    if(global.__ND_NATIVE_AUDIO_CONTEXT){global.AudioContext=global.__ND_NATIVE_AUDIO_CONTEXT;global.webkitAudioContext=global.__ND_NATIVE_AUDIO_CONTEXT;}
    try{soundOn=!!on;if(on){if(audioCtx&&global.__ND_SILENT_AUDIO_CONTEXT&&audioCtx instanceof global.__ND_SILENT_AUDIO_CONTEXT)audioCtx=null;ensureAudio();}}catch(e){}
  }
  function placeActor({kind,x,y,sheet,scale=1.4,extra=''}){
    const grid=$('fieldGrid');
    if(kind==='mana'){
      const el=document.createElement('div');el.className='fuji52-story-mana nd-field-actor nd-field-mana '+extra;
      el.style.setProperty('--mx',x+.5);el.style.setProperty('--my',y+1);el.dataset.x=x+.5;el.dataset.y=y+1;
      const sprite=document.createElement('i');sprite.className='nd-mana-sprite';el.appendChild(sprite);
      el.setAttribute('aria-label','本編フィールド用マナ');grid.appendChild(el);return el;
    }
    if(kind==='maros'){
      const el=document.createElement('div');el.className='nagoya63-segment-maros show nd-field-actor nd-field-maros '+extra;
      el.style.setProperty('--mx',x+.5);el.style.setProperty('--my',y+1);el.style.setProperty('--fz',y+1);
      const sprite=document.createElement('i');sprite.className='nd-maros-sprite';el.appendChild(sprite);
      el.dataset.x=x+.5;el.dataset.y=y+1;grid.appendChild(el);return el;
    }
    const el=document.createElement('div');el.className='interior-npc nd-field-actor nd-field-adult '+extra;
    el.style.setProperty('--ix',x);el.style.setProperty('--iy',y);el.style.setProperty('--npc-scale',scale);el.dataset.x=x;el.dataset.y=y;
    const visual=document.createElement('i');visual.className='interior-npc-visual';visual.style.backgroundImage=`url('images/sprites/${sheet}')`;el.appendChild(visual);
    setInteriorActorPose(el,'up','a');grid.appendChild(el);return el;
  }
  function moveActor(el,x,y,duration=2600){
    if(!el)return;el.style.transition=`left ${duration}ms linear,top ${duration}ms linear`;
    const walking=el.classList.contains('nd-field-mana')||el.classList.contains('nd-field-maros');
    if(walking){clearTimeout(el._ndWalkTimer);el.classList.add('nd-walking');el.dataset.moving='true';}
    if(el.classList.contains('nd-field-adult')){el.style.setProperty('--ix',x);el.style.setProperty('--iy',y);el.dataset.x=x;el.dataset.y=y;}
    else{el.style.setProperty('--mx',x+.5);el.style.setProperty('--my',y+1);el.style.setProperty('--fz',y+1);el.dataset.x=x+.5;el.dataset.y=y+1;}
    if(walking)el._ndWalkTimer=setTimeout(()=>{if(el.isConnected){el.classList.remove('nd-walking');el.dataset.moving='false';}},duration+40);
  }
  function cloneFieldMonster(source,x,y){
    if(!source)return null;const el=source.cloneNode(true);el.classList.remove('nd-base-hidden');el.classList.add('nd-event-spot');el.style.left=`calc(${x} * var(--tile))`;el.style.top=`calc(${y} * var(--tile))`;el.dataset.x=x;el.dataset.y=y;
    const face=q('.face',el);if(face)face.className='face angry';$('fieldGrid').appendChild(el);return el;
  }
  function moveMonster(el,x,y,duration=2800){if(!el)return;el.style.transition=`left ${duration}ms linear,top ${duration}ms linear`;el.style.left=`calc(${x} * var(--tile))`;el.style.top=`calc(${y} * var(--tile))`;el.dataset.x=x;el.dataset.y=y;}
  function clearEventActors(){qa('.nd-field-actor,.nd-event-spot').forEach(n=>{if(n._ndWalkTimer)clearTimeout(n._ndWalkTimer);n.remove();});qa('.tile.t-spot').forEach(n=>n.classList.remove('nd-base-hidden'));}
  function setMonsterMood(nodes,mood){nodes.forEach(n=>{const f=q('.face',n);if(f)f.className='face '+mood;const frozen=mood==='sleeping';n.classList.toggle('nd-frozen',frozen);let shell=q('.icd-ice-shell',n);if(frozen&&!shell){shell=document.createElement('i');shell.className='icd-ice-shell';n.appendChild(shell);}if(!frozen&&shell)shell.remove();});}
  function waitAssets(zone,done){const started=performance.now();(function poll(){const a=typeof fullartOK!=='undefined'&&fullartOK.has(zone),b=typeof heroCharImgOK==='function'&&heroCharImgOK();if((!a||!b)&&performance.now()-started<10000)return requestAnimationFrame(poll);done();})();}
  function stagePoint(zone){
    const rows=zoneGridOf(zone),H=rows.length,W=rows[0].length;let best={x:Math.floor(W/2),y:Math.floor(H/2),score:-1e9};
    for(let y=4;y<H-4;y++)for(let x=4;x<W-4;x++){
      let open=0;for(let yy=y-3;yy<=y+2;yy++)for(let xx=x-4;xx<=x+4;xx++)if(rows[yy]&&rows[yy][xx]==='.')open++;
      const score=open-Math.abs(x-W/2)*.08-Math.abs(y-H/2)*.05;if(score>best.score)best={x,y,score};
    }
    return{x:best.x,y:best.y};
  }

  function showField(zone,{gender='boy',hero=false,label='',monsters=0,adults=1,mana=true,pressure=false,hokkaido=false,background='',point=null}={}){
    closeWorldMap();hideMapRegion();document.body.classList.remove('amami-camera-wide','nd-map-mode','nd-ship-mode');document.body.classList.add('nd-event-mode');
    try{stopAutoExplore();autoExploring=false;heldKeys.clear();if(keyTimer){clearTimeout(keyTimer);keyTimer=null;}heroLock=true;}catch(e){}
    qa('.overlay.show').forEach(n=>n.classList.remove('show'));qa('.screen').forEach(n=>n.classList.remove('active'));$('screen-field').classList.add('active');heroChar=gender;fieldZone=zone;
    try{introSeen=true;evSeen[zone]=true;freeZones.add(zone);}catch(e){}
    const s=point||stagePoint(zone);setFieldStandardPosition(zone,s.x,s.y);fieldZoomLastZone=zone;renderField();try{stopAutoExplore();autoExploring=false;heroLock=true;}catch(e){}clearEventActors();
    const grid=$('fieldGrid');if(background){grid.classList.add('has-fullart');grid.style.setProperty('--fullart-img',`url('images/fullart/${background}')`);if($('fieldZoneName'))$('fieldZoneName').textContent=label;const pbg=$('fieldParallaxBg');if(pbg)pbg.classList.remove('show');}const sources=qa('.tile.t-spot',grid);sources.forEach(n=>n.classList.add('nd-base-hidden'));$('fieldHero').style.visibility=hero?'visible':'hidden';
    const cx=fieldHx,cy=fieldHy,actors=[],mobs=[];
    if(mana)actors.push(placeActor({kind:'mana',x:cx+(hero?1.2:(zone===9?1.35:0)),y:cy+(hero?.15:.7),extra:hokkaido?'nd-hokkaido-mana':''}));
    const adultXs=zone===9?[cx-2.45,cx+2.75]:Array.from({length:adults},(_,i)=>cx-1.65+i*3.3/Math.max(1,adults-1));
    for(let i=0;i<adults;i++)actors.push(placeActor({kind:'adult',x:adultXs[i],y:cy+1.15,sheet:i%2?'npc-mob-otona-m-a.webp':'npc-mob-otona-f-a.webp',scale:1.4,extra:hokkaido?'nd-hokkaido-adult':''}));
    const cols=monsters<=3?[cx-2.5,cx,cx+2.5]:monsters>=12?[cx-3.25,cx-1.95,cx-.65,cx+.65,cx+1.95,cx+3.25]:monsters>=9?[cx-3,cx-1.5,cx,cx+1.5,cx+3]:[cx-3,cx-1,cx+1,cx+3];
    for(let i=0;i<monsters;i++){
      const row=Math.floor(i/cols.length);
      const zone9Pos=zone===9?[[-2,-2.8],[-.4,-2.8],[.85,-2.8],[0,-1.3],[-2,-4.3]][i]:null;
      const hokkaidoPos=hokkaido?HOKKAIDO_POSITIONS[i]:null;
      const fixedPos=zone9Pos||hokkaidoPos;
      const x=fixedPos?cx+fixedPos[0]:cols[i%cols.length];
      const restY=fixedPos?cy+fixedPos[1]:cy-2.5-row*1.8;
      const restToSouth=pressure&&(zone===1||zone===9||zone===25||zone===65);
      const startY=restToSouth?restY:restY-(pressure?(hokkaido?.15:2.2):0);
      const targetY=restToSouth?restY+2.2:restY;
      const mob=cloneFieldMonster(sources[i%sources.length],x,startY);
      if(mob){
        if(hokkaido){const fc=q('.fc',mob);if(fc)fc.textContent=HOKKAIDO_CHARS[i];mob.dataset.ndChar=HOKKAIDO_CHARS[i];}
        mob.dataset.startX=x;mob.dataset.startY=startY;mob.dataset.targetY=targetY;mob.dataset.route=restToSouth?'rest-to-south':'north-to-rest';mobs.push(mob);
        if(pressure)requestAnimationFrame(()=>requestAnimationFrame(()=>moveMonster(mob,x,targetY,3000)));
      }
    }
    if(pressure)actors.forEach((a,i)=>setTimeout(()=>moveActor(a,Number(a.dataset.x)-(a.classList.contains('nd-field-adult')?0:.5),cy+1.35+(i%2)*.12,3000),80));
    if($('ndPlace'))$('ndPlace').textContent=label;global.__ND_FIELD={zone,cx,cy,actors,mobs,label,hero,background};return global.__ND_FIELD;
  }
  function hideMapRegion(){const el=$('ndMapRegion');if(el)el.classList.remove('show');}
  function showMap(region,zone,label){
    clearEventActors();if($('fieldHero'))$('fieldHero').style.visibility='hidden';document.body.classList.add('nd-map-mode');fieldZone=zone;openWorldMap(region);if($('ndPlace'))$('ndPlace').textContent=label;
    if(region==='tokyo'&&typeof wmPlayIntroZoom==='function'&&typeof WM_COORDS_TOKYO!=='undefined'){
      const point=WM_COORDS_TOKYO[Math.max(0,Math.min(WM_COORDS_TOKYO.length-1,zone-1))]||{x:50,y:50};wmPlayIntroZoom(1.35,point.x,point.y);
    }
    const name=$('ndMapRegion');if(name){const viewport=$('wmViewport'),vr=viewport&&viewport.getBoundingClientRect();name.textContent=label;if(vr)name.style.top=Math.round(vr.top+Math.max(44,Math.min(58,vr.height*.11)))+'px';name.classList.remove('show');void name.offsetWidth;name.classList.add('show');}
    global.__ND_TRANSITIONS=(global.__ND_TRANSITIONS||[]).concat({region,zone,label,order:['map','zoom','field'],at:performance.now()});
  }
  function metrics(view,zone){
    const grid=$('fieldGrid'),wrap=$('fieldWrap'),tile=parseFloat(grid.style.getPropertyValue('--tile')),rect=n=>{if(!n)return null;const r=n.getBoundingClientRect();return{w:+r.width.toFixed(2),h:+r.height.toFixed(2),x:+r.x.toFixed(2),y:+r.y.toFixed(2)};},cs=getComputedStyle(grid);
    const data={type:'nd-field-metrics',view,zone,tile,wrap:rect(wrap),grid:rect(grid),fieldStyle:{className:grid.className,fw:grid.style.getPropertyValue('--fw'),fh:grid.style.getPropertyValue('--fh'),tile:grid.style.getPropertyValue('--tile'),camX:grid.style.getPropertyValue('--cam-x'),camY:grid.style.getPropertyValue('--cam-y'),fullart:grid.style.getPropertyValue('--fullart-img'),transform:cs.transform,backgroundImage:cs.backgroundImage,backgroundSize:cs.backgroundSize,backgroundPosition:cs.backgroundPosition},hero:rect(q('.hero-sprite')),spot:rect(q('.tile.t-spot .spot-char')),building:rect(q('.town-building,.field-object')),buildingSource:q('.town-building,.field-object')?'field DOM':'fullart background',mana:rect(q('.nd-field-mana')),adult:rect(q('.nd-field-adult .interior-npc-visual')),storageWrites:global.__ND_MEMORY_STORAGE?.local.writes.length||0,sourceSha:global.__ND_SOURCE_SHA};
    global.__ND_FIELD_METRICS=data;try{parent.postMessage(data,'*');}catch(e){}return data;
  }
  function addComparisonActors(){const y=Math.max(3,fieldHy-2),cx=fieldHx;placeActor({kind:'adult',x:Math.max(1,cx-2),y:y+1,sheet:'npc-mob-otona-f-a.webp'});placeActor({kind:'mana',x:cx,y});placeActor({kind:'adult',x:cx+2,y:y+1,sheet:'npc-mob-otona-m-a.webp'});qa('.tile.t-spot').slice(0,3).forEach((n,i)=>cloneFieldMonster(n,Math.max(0,cx-3+i*3),Math.max(0,y-3)));}
  function mountFieldHarness({view='baseline',zone=45,gender='boy'}={}){
    document.body.classList.add('nd-field-harness');document.body.dataset.ndView=view;try{soundOn=false;heroChar=gender;}catch(e){}const no=$('nmOverlay');if(no)no.classList.remove('show');try{nmActive=false;nmClearAdvanceTimer();}catch(e){}
    waitAssets(zone,()=>{qa('.screen').forEach(n=>n.classList.remove('active'));$('screen-field').classList.add('active');fieldZone=zone;const s=zoneStartOf(zone);setFieldStandardPosition(zone,s.x,zone===45?Math.min(s.y,8):s.y);fieldZoomLastZone=zone;renderField();if(view==='event')addComparisonActors();q('.field-h').insertAdjacentHTML('beforeend',`<span class="nd-harness-label">${view==='event'?'新版：本体描画＋同座標演出':'本編基準'} / zone${zone}</span>`);setTimeout(()=>metrics(view,zone),1600);});
  }

  function setupRoot(host){let root=$('ndEventRoot');if(root)root.remove();root=document.createElement('div');root.id='ndEventRoot';root.innerHTML='<div id="ndIceFlash" aria-hidden="true"></div><div id="ndPlace"></div><div id="ndMapRegion"></div><div id="ndIncoming"><span>●</span><b>トウキョウから　つうしん</b></div><div id="ndTalk"><img id="ndFace" alt=""><div><b id="ndWho"></b><p id="ndText"></p><small id="ndNext">▼ つづく</small></div></div>';(host||document.body).appendChild(root);return root;}
  function shipAssets(){q('#spBgTerminal img').src='images/fullart/ship-terminal-okinawa-20260920.png';q('#spBgPier img').src='images/fullart/ship-pier-okinawa-20260920.png';$('spHeroCut').src='images/fullart/ship-hero-okinawa-20260920.png';q('#spBgMt img').src='images/fullart/ship-bg-okinawa-20260920.png';}
  function startShipS0(done,alive){
    shipAssets();document.body.classList.add('nd-ship-mode');shipSceneSeq++;const seq=shipSceneSeq;shipSceneActive=true;shipSceneResetLayers();$('shipSceneOverlay').classList.add('show');$('spBgTerminal').classList.add('show');spHarborStart(.09);spChime();
    const bh=$('spBoardHero'),mw=$('spManaWalk'),put=(x,y,w,d)=>{bh.style.transitionDuration=d+'s,'+d+'s,'+d+'s,.35s';bh.style.left=x+'%';bh.style.top=y+'%';bh.style.width=w+'%';},mput=(x,y,w,d)=>{mw.style.transitionDuration=d+'s,'+d+'s,'+d+'s,.4s';mw.style.left=x+'%';mw.style.top=y+'%';mw.style.width=w+'%';};
    bh.classList.remove('pose');bh.style.backgroundImage=`url('${heroSheetUrl()}')`;bh.style.backgroundSize='300% 200%';bh.style.zIndex='7';put(34,70,32,0);mput(50,64,30,0);bh.style.opacity='1';mw.classList.add('show');let row=false;
    const tick=setInterval(()=>{row=!row;bh.style.backgroundPosition='50% '+(row?'100%':'0%');spWalkFrame(bh,row,'50%');mw.src=MANA_BACK_A;mw.style.transformOrigin='center bottom';mw.style.transform=`scaleX(${row?-1:1})`;},320);let walkStopped=false;const stopWalk=()=>{if(walkStopped)return;walkStopped=true;clearInterval(tick);if(!bh.classList.contains('pose'))bh.style.transform='none';mw.src=MANA_BACK_A;mw.style.transform='none';};shipSceneWalkHandles.push({stop:stopWalk});
    setTimeout(()=>{if(alive()&&seq===shipSceneSeq){put(38,60,26,.9);mput(52,54,25,.9);}},100);setTimeout(()=>{if(alive()&&seq===shipSceneSeq){put(42,50,21,.9);mput(54,44,20,.9);}},1000);setTimeout(()=>{if(alive()&&seq===shipSceneSeq){put(45,43,17,.8);mput(56,37,16,.8);}},1900);setTimeout(()=>{if(alive()&&seq===shipSceneSeq)stopWalk();},2740);
    setTimeout(()=>{if(!alive()||seq!==shipSceneSeq)return;shipSceneStopWalkAnims();mw.src=MANA_FRONT;put(47,36,14,.9);setTimeout(()=>{if(alive()&&seq===shipSceneSeq){bh.style.opacity='0';startShipS1(done,alive,seq);}},1200);},4300);
  }
  function startShipS1(done,alive,seq){
    $('spBgPier').classList.add('show');setTimeout(()=>{if(seq===shipSceneSeq)$('spBgTerminal').classList.remove('show');},550);const bh=$('spBoardHero'),mw=$('spManaWalk'),mb=$('spManaBack');mw.classList.remove('show');mw.style.transform='none';mb.src=MANA_BACK_A;mb.classList.add('show');
    const put=(x,y,w,d)=>{bh.style.transitionDuration=d+'s,'+d+'s,'+d+'s,.35s';bh.style.left=x+'%';bh.style.top=y+'%';bh.style.width=w+'%';};bh.style.backgroundImage=`url('${heroSheetUrl()}')`;bh.style.backgroundSize='300% 200%';bh.style.zIndex='5';put(27,66.5,50,0);bh.style.opacity='1';let row=false;const tick=setInterval(()=>{row=!row;bh.style.backgroundPosition='50% '+(row?'100%':'0%');spWalkFrame(bh,row,'50%');},150);shipSceneWalkHandles.push({stop(){clearInterval(tick);}});
    [[300,46,58.8,40,.8],[1100,69,51.1,30,.8],[1900,61,47.8,26,.6],[2500,52,41.4,20,.7],[3200,42.5,37.6,15,.7]].forEach(v=>setTimeout(()=>{if(alive()&&seq===shipSceneSeq)put(v[1],v[2],v[3],v[4]);},v[0]));
    setTimeout(()=>{if(!alive()||seq!==shipSceneSeq)return;shipSceneStopWalkAnims();bh.classList.remove('pose');bh.style.backgroundImage=`url('${heroSheetUrl()}')`;bh.style.backgroundSize='300% 200%';bh.style.backgroundPosition='50% 0%';bh.style.animation='none';bh.style.transform='none';},3900);
    setTimeout(()=>{if(!alive()||seq!==shipSceneSeq)return;bh.style.opacity='0';spHorn(0,2.6,.30,false);},5000);setTimeout(()=>{if(alive()&&seq===shipSceneSeq)startShipS2(done,alive,seq);},5900);
  }
  function startShipS2(done,alive,seq){
    shipSceneStopWalkAnims();const hc=$('spHeroCut');hc.style.transition='opacity .3s ease';hc.style.left='.1%';hc.style.width='305%';hc.classList.add('show');$('shipSceneStage').classList.add('sp-shake');$('spSpeedLines').classList.add('show');$('spManaWalk').classList.remove('show');const mb=$('spManaBack');mb.style.transition='none';mb.classList.remove('show');requestAnimationFrame(()=>{mb.style.transition='';});spFadeOut('harbor',.8);spEngineStart(.10);spWavesStart(.035);spNoise(0,2.2,240,1300,.10);$('spBgPier').classList.remove('show');requestAnimationFrame(()=>{hc.style.transition='opacity .3s ease,left 1.2s linear,width 1.2s linear';hc.style.left='-96.9%';});
    setTimeout(()=>{if(alive()&&seq===shipSceneSeq){hc.style.transition='opacity .3s ease,left .8s ease-in,width .8s ease-in';hc.style.left='-188%';hc.style.width='336%';}},1200);setTimeout(()=>{if(alive()&&seq===shipSceneSeq){hc.style.left='-262%';hc.style.width='372%';}},2000);setTimeout(()=>{if(alive()&&seq===shipSceneSeq){hc.style.left='-322%';hc.style.width='432%';hc.style.top='-7%';}},2600);setTimeout(()=>{if(alive()&&seq===shipSceneSeq)startShipS3(done,alive,seq);},3000);
  }
  function startShipS3(done,alive,seq){
    $('spBgSky').classList.add('show');$('spBgMt').classList.add('show','run');['spClouds','spSeaFar','spWavesFar','spWavesMid','spWaves','spSeaFill','spShipSide'].forEach(id=>$(id).classList.add('run'));$('shipSceneStage').classList.remove('sp-shake');$('shipSceneStage').classList.add('sp-roll');$('spSpeedLines').classList.remove('show');spGullCry(.5);spGullFly(-12,17,1,3.4,240,-30,300);setTimeout(()=>{if(seq===shipSceneSeq)$('spHeroCut').classList.remove('show');},550);
    setTimeout(()=>{if(!alive()||seq!==shipSceneSeq)return;shipSceneActive=false;spBusKill();shipSceneStopWalkAnims();$('shipSceneOverlay').classList.remove('show');shipSceneResetLayers();done();},7000);
  }

  function create(host,options={}){
    let root=setupRoot(host),timers=[],audio=null,generation=0,index=-1,doneSent=false,gender=options.gender==='girl'?'girl':'boy',sound=options.sound!==false,linePlayerName=typeof options.playerName==='string'?options.playerName.trim():'';
    const state={ready:false,done:false,line:null,cut:null,running:false};
    function playerNameForLine(){let name=linePlayerName;if(!name)try{name=typeof playerName==='string'?playerName.trim():'';}catch(e){}return name||'君';}
    const later=(fn,ms,g=generation)=>{const t=setTimeout(()=>{if(g===generation)fn();},ms);timers.push(t);return t;},alive=g=>()=>g===generation&&state.running;
    function hideCue(){q('#ndIncoming',root)?.classList.remove('show');qa('.nd-field-mana.nd-notice').forEach(n=>n.classList.remove('nd-notice'));qa('.nd-mana-attention').forEach(n=>n.remove());}
    function showIncoming(){hideCue();q('#ndIncoming',root)?.classList.add('show');if(sound)try{spTone(880,0,.1,'sine',.08);spTone(1174,.18,.14,'sine',.08);}catch(e){}}
    function showManaNotice(){q('#ndIncoming',root)?.classList.remove('show');const mana=q('.nd-field-mana');if(mana){mana.classList.add('nd-notice');const bang=document.createElement('i');bang.className='nd-mana-attention';bang.textContent='！';mana.appendChild(bang);}}
    function freezeHokkaido(){const f=global.__ND_FIELD,flash=q('#ndIceFlash',root),flashAt=performance.now();global.__ND_FREEZE_FX={flashAt,soundAt:flashAt,freezeAt:null,sound:'magic-mizu-max',soundRequested:sound};if(flash){flash.classList.remove('show');void flash.offsetWidth;flash.classList.add('show');}if(sound){try{if(typeof sePlay==='function')sePlay('magic-mizu-max',{volume:.55});else snd('magicmax');}catch(e){}}later(()=>{if(f){setMonsterMood(f.mobs,'sleeping');global.__ND_FREEZE_FX.freezeAt=performance.now();}},260);}
    function hideTalk(){q('#ndTalk',root)?.classList.remove('show');if(audio){try{audio.pause();audio.currentTime=0;}catch(e){}audio=null;}}
    function cleanupVisuals(){hideTalk();hideCue();hideMapRegion();clearEventActors();closeWorldMap();document.body.classList.remove('nd-map-mode','nd-ship-mode');if($('fieldHero'))$('fieldHero').style.visibility='';try{stopAutoExplore();autoExploring=false;heldKeys.clear();heroLock=true;shipSceneSeq++;shipSceneActive=false;spBusKill();shipSceneStopWalkAnims();$('shipSceneOverlay').classList.remove('show');shipSceneResetLayers();}catch(e){}}
    function clear(){generation++;timers.forEach(clearTimeout);timers=[];cleanupVisuals();state.ready=false;state.running=false;}
    function cut(name){state.cut=name;if(options.onCut)options.onCut(name,state);}
    function auto(name,ms,fn){cut(name);state.ready=false;state.line=null;hideTalk();fn&&fn();later(run,ms);}
    function line(i){
      const row=LINES[i],g=generation,text=row[2].replace('{name}',playerNameForLine());cut(row[0]);state.line=i;state.ready=false;hideTalk();hideCue();const box=q('#ndTalk',root),who=q('#ndWho',root),txt=q('#ndText',root),face=q('#ndFace',root);who.textContent=row[1];txt.textContent=text;face.src=row[1].includes('マローズ')?FACES.maros:(row[1].includes('先生')?FACES.adult:FACES.mana);box.classList.add('show');
      let marked=false;const mark=()=>{if(marked||g!==generation)return;marked=true;later(()=>{if(g===generation){state.ready=true;q('#ndNext',root).classList.add('ready');}},2000,g);};
      if(sound&&row[3]){try{audio=new Audio('audio/battle/'+row[3]+'.mp3');audio.addEventListener('ended',mark,{once:true});audio.addEventListener('error',()=>later(mark,4200,g),{once:true});const p=audio.play();if(p&&p.catch)p.catch(()=>later(mark,4200,g));later(mark,14000,g);}catch(e){later(mark,4200,g);}}else later(mark,Math.max(4200,text.length*115),g);
    }
    function finish(){state.ready=false;state.done=true;state.running=false;state.line=null;cut('DONE');if(!doneSent){doneSent=true;if(options.onDone)options.onDone();}}
    const plan=[
      ()=>auto('C01_FERRY_ENTRANCE',2400,()=>showField(102,{gender,hero:true,label:'フェリーのりば',adults:0,mana:true,background:'okinawa-ferry-entrance-field-20260921.png',point:{x:15,y:6}})),
      ()=>auto('C01A_TOKYO_INCOMING',1700,showIncoming),()=>auto('C01B_MANA_NOTICE',1500,showManaNotice),()=>line(0),
      ()=>auto('C02_TOKYO_MAP',3400,()=>showMap('tokyo',1,'トウキョウ')),()=>auto('C02_TOKYO_FIELD',4200,()=>showField(1,{gender,label:'トウキョウ',monsters:6,adults:1,mana:true,pressure:true})),()=>line(1),()=>line(2),()=>line(3),
      ()=>auto('C03_KANTO_MAP',3400,()=>showMap('kanto',9,'カントウ')),()=>auto('C04_KANTO_FIELD',4400,()=>showField(9,{gender,label:'カントウ',monsters:7,adults:2,mana:true,pressure:true})),()=>line(4),
      ()=>auto('C05_KANSAI_MAP',3400,()=>showMap('kansai',25,'カンサイ・シコク')),()=>auto('C06_KANSAI_FIELD',4700,()=>showField(25,{gender,label:'カンサイ・シコク',monsters:8,adults:2,mana:true,pressure:true})),()=>line(5),
      ()=>auto('C07_CHUBU_MAP',3400,()=>showMap('chubu',45,'チュウブ')),()=>auto('C08_CHUBU_FIELD',5200,()=>showField(45,{gender,label:'チュウブ',monsters:9,adults:2,mana:true,pressure:true})),()=>line(6),
      ()=>auto('C09_TOHOKU_MAP',3400,()=>showMap('tohoku',65,'トウホク')),()=>auto('C10_TOHOKU_FIELD',5000,()=>showField(65,{gender,label:'トウホク',monsters:10,adults:2,mana:true,pressure:true})),()=>line(7),
      ()=>auto('C11_KANTO_RETURN_MAP',3400,()=>showMap('kanto',12,'カントウ')),()=>auto('C12_KANTO_RETURN_FIELD',3600,()=>showField(12,{gender,label:'カントウ',monsters:8,adults:2,mana:true,pressure:true})),()=>line(8),
      ()=>auto('C14_OKINAWA_FIELD',2800,()=>showField(102,{gender,hero:true,label:'フェリーのりば',monsters:0,adults:0,mana:true,background:'okinawa-ferry-entrance-field-20260921.png',point:{x:15,y:6}})),()=>line(9),()=>line(10),
      ()=>auto('C15_HOKKAIDO_MAP',3400,()=>showMap('tohoku',83,'ホッカイドウ')),()=>auto('C16_HOKKAIDO_APPROACH',5600,()=>showField(83,{gender,label:'ホッカイドウ',monsters:29,adults:2,mana:true,pressure:true,hokkaido:true})),()=>line(11),
      ()=>auto('C17_HOKKAIDO_RETREAT',3600,()=>{const f=global.__ND_FIELD;if(f){f.actors.forEach((a,i)=>moveActor(a,Number(a.dataset.x)-(a.classList.contains('nd-field-adult')?0:.5),f.cy+2+(i%2)*.15,3000));f.mobs.forEach(m=>moveMonster(m,Number(m.dataset.x),Number(m.dataset.y)+1.1,3000));}}),
      ()=>auto('C18_HOKKAIDO_FREEZE',4200,freezeHokkaido),
      ()=>auto('C19_MAROS_WALK',5600,()=>{const f=global.__ND_FIELD;if(f){const m=placeActor({kind:'maros',x:f.cx,y:f.cy-8.2,extra:'nd-hokkaido-maros'});global.__ND_MAROS=m;global.__ND_MAROS_SAMPLES=[];const sample=()=>{const r=m.getBoundingClientRect(),sprite=q('.nd-maros-sprite',m),sr=sprite.getBoundingClientRect(),cs=getComputedStyle(sprite),mx=new DOMMatrix(cs.transform);global.__ND_MAROS_SAMPLES.push({t:performance.now(),left:+r.left.toFixed(2),top:+r.top.toFixed(2),right:+r.right.toFixed(2),bottom:+r.bottom.toFixed(2),width:+r.width.toFixed(2),height:+r.height.toFixed(2),spriteLeft:+sr.left.toFixed(2),spriteRight:+sr.right.toFixed(2),spriteBottom:+sr.bottom.toFixed(2),spriteHeight:+sr.height.toFixed(2),x:m.dataset.x,y:m.dataset.y,bg:cs.backgroundPosition,duration:cs.animationDuration,flip:Math.sign(mx.a)||1,moving:m.dataset.moving==='true'});};sample();later(()=>moveActor(m,f.cx,f.cy-4,4200),250);[360,540,720,900,1080,1440,2400,3300,4300,4800].forEach(t=>later(sample,t));}}),
      ()=>line(12),()=>line(13),()=>line(14),
      ()=>auto('C21_OKINAWA_FAREWELL',2800,()=>showField(102,{gender,hero:true,label:'フェリーのりば',monsters:0,adults:0,mana:true,background:'okinawa-ferry-entrance-field-20260921.png',point:{x:15,y:6}})),()=>line(15),()=>line(16),
      ()=>{const g=generation;cut('C22_SHIP_S0_S3');state.ready=false;state.line=null;hideTalk();startShipS0(()=>{if(g===generation)finish();},alive(g));}
    ];
    function run(){if(!state.running)return;index++;if(index>=plan.length)return finish();plan[index]();}
    function start(cfg={}){clear();generation++;const g=generation;index=-1;doneSent=false;gender=cfg.gender==='girl'?'girl':(cfg.gender==='boy'?'boy':gender);sound=cfg.sound==null?sound:!!cfg.sound;if(typeof cfg.playerName==='string')linePlayerName=cfg.playerName.trim();state.done=false;state.running=true;state.line=null;state.cut=null;root=setupRoot(host);root.addEventListener('click',()=>next());restoreEventAudio(sound);const no=$('nmOverlay');if(no)no.classList.remove('show');try{nmActive=false;nmClearAdvanceTimer();}catch(e){}waitAssets(102,()=>{if(g===generation&&state.running)run();});}
    function next(){if(!state.running||!state.ready)return false;state.ready=false;q('#ndNext',root)?.classList.remove('ready');run();return true;}
    root.addEventListener('click',()=>next());
    return{state,start,restart:start,next,stop:clear,destroy(){clear();root.remove();},setSound(v){sound=!!v;restoreEventAudio(sound);if(!sound)hideTalk();},get lines(){return LINES;}};
  }
  global.NationalDeparture={create,lines:LINES,mountFieldHarness,placeActor,cloneFieldMonster,metrics,showField,showMap};
})(window);
