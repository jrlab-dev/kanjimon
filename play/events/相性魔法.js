/* 相性魔法 2026-10-02。描画専用：戦闘判定・音・ダメージは本体に残す。 */
(function(){
  'use strict';
  let active=null;
  const textures={};
  const thunderTextures={};
  const ultimateTextures={};
  let rockLarge=null,rockSmall=null;
  const source=document.currentScript&&document.currentScript.src;
  if(source){['hi','mizu','tsuchi','ki'].forEach(key=>{const image=new Image();image.onload=()=>{
    // 原本は変更せず、薄いalphaが四辺へ残る素材もメモリ上で有機的に消す。
    const clean=document.createElement('canvas');clean.width=image.width;clean.height=image.height;const ctx=clean.getContext('2d');ctx.drawImage(image,0,0);ctx.globalCompositeOperation='destination-in';
    const vertical=ctx.createLinearGradient(0,0,0,image.height);vertical.addColorStop(0,'transparent');vertical.addColorStop(.15,'#000');vertical.addColorStop(.80,'#000');vertical.addColorStop(1,'transparent');ctx.fillStyle=vertical;ctx.fillRect(0,0,image.width,image.height);
    const horizontal=ctx.createLinearGradient(0,0,image.width,0);horizontal.addColorStop(0,'transparent');horizontal.addColorStop(.13,'#000');horizontal.addColorStop(.87,'#000');horizontal.addColorStop(1,'transparent');ctx.fillStyle=horizontal;ctx.fillRect(0,0,image.width,image.height);textures[key]=clean;
    // 新最強の小破片だけに使う縮小控え。legacy描画は元解像度を保持する。
    if(key==='tsuchi'){
      const reduced=width=>{const out=document.createElement('canvas');out.width=width;out.height=Math.round(width*clean.height/clean.width);out.getContext('2d').drawImage(clean,0,0,out.width,out.height);return out;};
      rockLarge=reduced(512);rockSmall=reduced(128);
    }
  };image.onerror=()=>{};image.src=new URL('../images/magic/texture-'+key+'.png',source).href;});}
  if(source)['plasma','thunder'].forEach(key=>{const image=new Image();image.onload=()=>{
    const out=document.createElement('canvas');out.width=key==='plasma'?640:1024;out.height=Math.round(out.width*image.height/image.width);const ctx=out.getContext('2d');ctx.drawImage(image,0,0,out.width,out.height);ctx.globalCompositeOperation='destination-in';
    for(const axis of [0,1]){const g=ctx.createLinearGradient(0,0,axis?0:out.width,axis?out.height:0);g.addColorStop(0,'transparent');g.addColorStop(.055,'#000');g.addColorStop(.945,'#000');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,out.width,out.height);}
    ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,out.width,1);ctx.clearRect(0,out.height-1,out.width,1);ctx.clearRect(0,0,1,out.height);ctx.clearRect(out.width-1,0,1,out.height);thunderTextures[key]=out;
  };image.onerror=()=>{};image.src=new URL('../images/magic/texture-'+key+'-v2.png',source).href;});
  if(source)[['tsunami','tsunami-away-v4',1024],['dome','impact-dome-v3',768]].forEach(([key,file,width])=>{const image=new Image();image.onload=()=>{
    const out=document.createElement('canvas');out.width=width;out.height=Math.round(width*image.height/image.width);const ctx=out.getContext('2d');ctx.drawImage(image,0,0,out.width,out.height);ctx.globalCompositeOperation='destination-in';
    for(const axis of [0,1]){const g=ctx.createLinearGradient(0,0,axis?0:out.width,axis?out.height:0);g.addColorStop(0,'transparent');g.addColorStop(.065,'#000');g.addColorStop(.935,'#000');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,out.width,out.height);}
    ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,out.width,1);ctx.clearRect(0,out.height-1,out.width,1);ctx.clearRect(0,0,1,out.height);ctx.clearRect(out.width-1,0,1,out.height);
    // 断面を先に小さな画像へ切り出す。毎フレーム巨大画像を64回縮放しない。
    if(key==='tsunami'){out.magicSlices=[];for(let j=0;j<64;j++){const part=document.createElement('canvas');part.width=out.width;part.height=Math.ceil(out.height/64)+4;part.getContext('2d').drawImage(out,0,out.height*j/64-2,out.width,out.height/64+4,0,0,part.width,part.height);out.magicSlices.push(part);}}
    ultimateTextures[key]=out;
  };image.onerror=()=>{};image.src=new URL('../images/magic/texture-'+file+'.png',source).href;});
  const TAU=Math.PI*2, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const ease=v=>1-Math.pow(1-clamp(v),3);
  const noise=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
  const TIMING={
    weak:{duration:1600,impact:470,hitDelay:110,soundCues:[{level:'mid',at:0,volume:.45}]},
    mid:{duration:2000,impact:850,hitDelay:490,soundCues:[{level:'max',at:0,volume:.55}]},
    max:{duration:4000,impact:3150,hitDelay:2790,flashAt:3150,soundCues:[{level:'mid',at:0,volume:.22},{level:'max',at:1000,volume:.55},{level:'mid',at:2450,volume:.18}]}
  };
  Object.values(TIMING).forEach(t=>{t.soundCues.forEach(Object.freeze);Object.freeze(t.soundCues);Object.freeze(t);});Object.freeze(TIMING);
  const FIRE_TIMING={
    mid:{duration:2000,impact:850,hitDelay:490,soundCues:[{level:'max',at:0,volume:.4},{sound:'magic-hi-burst',at:850,volume:.65}]},
    max:{duration:4000,impact:3150,hitDelay:2790,flashAt:3150,soundCues:[{level:'mid',at:0,volume:.22},{level:'max',at:1000,volume:.45},{sound:'magic-hi-vortex',at:1800,volume:.5},{sound:'magic-hi-burst',at:3150,volume:.85}]}
  };
  Object.values(FIRE_TIMING).forEach(t=>{t.soundCues.forEach(Object.freeze);Object.freeze(t.soundCues);Object.freeze(t);});Object.freeze(FIRE_TIMING);
  const EARTH_MAX={duration:4000,impact:3150,hitDelay:2790,flashAt:3150,soundCues:[{level:'mid',at:0,volume:.22},{sound:'magic-hi-burst',at:1100,volume:.25},{sound:'magic-hi-burst',at:1800,volume:.35},{sound:'magic-hi-burst',at:2500,volume:.45},{sound:'magic-hi-burst',at:3150,volume:.8}]};
  EARTH_MAX.soundCues.forEach(Object.freeze);Object.freeze(EARTH_MAX.soundCues);Object.freeze(EARTH_MAX);
  const timing=(level,type)=>type==='ひ'&&FIRE_TIMING[level]||type==='岩'&&level==='max'&&EARTH_MAX||TIMING[level]||TIMING.mid;
  function play(scene,type,level){
    if(active) active.stop();
    const screen=document.getElementById('screen-battle'), enemy=document.getElementById('enemyChar');
    const sr=screen.getBoundingClientRect(), er=enemy&&enemy.getBoundingClientRect();
    const msg=screen.querySelector('.msg'), mr=msg&&msg.getBoundingClientRect();
    // 描画面はバトル全体。配置の基準だけ従来の舞台高さに保持する。
    const w=sr.width, h=sr.height;
    const effectH=Math.max(150,Math.min(h,(mr&&mr.top>sr.top+150?mr.top-sr.top-8:h*.65)));
    if(w<1||h<1) return;
    // 新弱＝旧中、新中＝旧最強。legacyの数式と経過時刻をそのまま保持する。
    const ultimate=level==='max',rank=level==='weak'?1:2,spec=timing(level,type),duration=spec.duration;
    const impact=spec.impact,S=[.52,.78,1.18][rank];
    const targetX=er&&er.width?er.left+er.width*.5-sr.left:w*.78;
    const x=targetX;
    const geometryFloor=clamp(er&&er.height?er.bottom-sr.top-8:effectH*.55,65,effectH-26);
    const floor=er&&er.height?er.bottom-sr.top:geometryFloor;
    const y=er&&er.height?er.top+er.height*.5-sr.top:floor-55;
    const R=Math.min(w*(rank===2?.37:.30),effectH*(rank===2?.42:.35),rank===2?185:148)*S;
    const box=document.createElement('div');box.className='magic-fx '+level;
    box.style.width=w+'px';box.style.height=h+'px';box.setAttribute('aria-hidden','true');box.dataset.element=type;
    const canvas=document.createElement('canvas');canvas.className='magic-canvas';box.appendChild(canvas);screen.appendChild(box);
    const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);
    const c=canvas.getContext('2d',{alpha:true});if(!c){box.remove();return;}
    c.scale(dpr,dpr);c.lineCap='round';c.lineJoin='round';
    let raf=0, cleanup=0, shakeTimer=0, stopped=false, shook=false;
    const seq=typeof spawnSeq==='undefined'?null:spawnSeq;
    const started=performance.now();
    const app=document.getElementById('app');
    const partyRow=ultimate&&type==='みず'?document.getElementById('partyRow'):null,partyLayer=partyRow&&partyRow.style?{z:partyRow.style.zIndex||'',position:partyRow.style.position||''}:null;
    const partyRects=partyRow&&partyRow.querySelectorAll?Array.from(partyRow.querySelectorAll('.pbtn.pfield .pc,.hero-back img')).map(el=>{const r=el.getBoundingClientRect();return {left:r.left-sr.left,top:r.top-sr.top,width:r.width,height:r.height,bottom:r.bottom-sr.top,hero:el.tagName==='IMG'};}).filter(r=>r.width>0&&r.height>0):[];
    const firstAlly=partyRects.find(r=>!r.hero),departureX=Math.min(targetX-w*.18,firstAlly?firstAlly.left+firstAlly.width*.5:w*.30),departureY=Math.max(floor+Math.min(90,w*.24),Math.min(firstAlly?firstAlly.bottom-20:floor+w*.30,h*.65));
    if(partyLayer){partyRow.style.zIndex='5';if(window.getComputedStyle&&window.getComputedStyle(partyRow).position==='static')partyRow.style.position='relative';box.magicPartyProtection={originalZ:partyLayer.z,activeZ:'5',rects:partyRects,restored:false};}
    function stop(){if(stopped)return;stopped=true;cancelAnimationFrame(raf);clearTimeout(cleanup);clearTimeout(shakeTimer);box.remove();if(partyLayer){partyRow.style.zIndex=partyLayer.z;partyRow.style.position=partyLayer.position;box.magicPartyProtection.restored=true;}if(shook&&app)app.classList.remove('shake');if(active&&active.box===box)active=null;}
    function path(points){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));}
    function stroke(col,width,a=1){c.globalAlpha=clamp(a);c.strokeStyle=col;c.lineWidth=width;c.stroke();c.globalAlpha=1;}
    function glow(col,cx,cy,rx,ry,a=1){if(rx<=0||ry<=0||a<=0)return;c.save();c.translate(cx,cy);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,col);g.addColorStop(.3,col);g.addColorStop(1,'transparent');c.globalAlpha=clamp(a);c.fillStyle=g;c.beginPath();c.arc(0,0,rx,0,TAU);c.fill();c.restore();}
    function ellipse(cx,cy,rx,ry,col,width,a=1){if(rx<=0||ry<=0)return;c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,TAU);stroke(col,width,a);}
    function line(points,col,width,a=1){path(points);stroke(col,width,a);}
    function bright(points,col,width,a=1){line(points,col,width*5,a*.10);line(points,col,width*2,a*.4);line(points,'#fff9e8',width*.55,a);}
    function shard(cx,cy,size,ang,col,a){c.save();c.translate(cx,cy);c.rotate(ang);path([[0,-size*1.5],[size*.7,0],[0,size],[-size*.45,0]]);c.globalAlpha=clamp(a);c.fillStyle=col;c.fill();line([[0,-size*1.5],[0,size]],'#e9fbff',.9,a*.8);c.restore();}
    function rock(cx,cy,size,ang,a){c.save();c.translate(cx,cy);c.rotate(ang);const pts=[[-size*.7,-size*.55],[size*.1,-size],[size*.75,-size*.35],[size*.7,size*.7],[-size*.5,size*.8]];path(pts);c.globalAlpha=clamp(a);c.fillStyle='#564743';c.fill();path([pts[0],pts[1],[size*.05,size*.1],pts[4]]);c.fillStyle='#ad8b68';c.fill();path([pts[1],pts[2],pts[3],[size*.05,size*.1]]);c.fillStyle='#745949';c.fill();line([pts[0],pts[1],pts[2]],'#ebc79a',Math.max(.8,size*.035),a);line([[size*.05,size*.1],pts[1]],'#c19f75',Math.max(.5,size*.02),a*.7);c.restore();}
    function boulder(cx,cy,size,ang,a,flatten=1,seed=0){
      const image=ultimate?(size*dpr>30?rockLarge:rockSmall)||textures.tsuchi:textures.tsuchi;if(!image){c.save();c.translate(cx,cy);c.scale(1,flatten);rock(0,0,size,ang,a);c.restore();return;}
      c.save();c.translate(cx,cy);c.rotate(ang);c.scale(1,flatten);const pts=[];for(let i=0;i<17;i++){const rad=size*(.81+noise(i+seed)*.25),theta=i*TAU/17;pts.push([Math.cos(theta)*rad,Math.sin(theta)*rad]);}path(pts);c.closePath();c.clip();c.globalAlpha=clamp(a);if(rank<2)c.filter='saturate(.4) brightness(.83)';c.drawImage(image,-size*1.58,-size*1.58,size*3.16,size*3.16);c.restore();
    }
    function leaf(cx,cy,size,ang,a){c.save();c.translate(cx,cy);c.rotate(ang);c.globalAlpha=clamp(a);const g=c.createLinearGradient(-size,0,size,0);g.addColorStop(0,'#164a30');g.addColorStop(.4,'#48a753');g.addColorStop(1,'#c7ee84');c.fillStyle=g;c.beginPath();c.moveTo(-size,0);c.quadraticCurveTo(0,-size*.8,size,0);c.quadraticCurveTo(0,size*.75,-size,0);c.fill();line([[-size*.8,0],[size*.8,0]],'#e5f1ac',.7,a*.8);for(let j=-1;j<=1;j++)line([[j*size*.4,0],[(j+.3)*size*.4,-size*.27]],'#93d475',.5,a*.5);c.restore();}
    function texture(key,cx,base,width,height,t,a,lean=0){
      const image=textures[key];if(!image)return false;
      c.save();c.translate(cx,base);c.rotate(lean);c.transform(1,0,Math.sin(t*.006)*.05,1,0,0);
      // 外周を曲線で切り、更に透明な原画の余白を保つ。矩形の境界は描かない。
      c.beginPath();c.moveTo(-width*.44,0);c.bezierCurveTo(-width*.65,-height*.22,-width*.22,-height*.73,-width*.17,-height);c.quadraticCurveTo(width*.26,-height*1.13,width*.24,-height*.71);c.bezierCurveTo(width*.55,-height*.5,width*.49,-height*.15,width*.43,0);c.quadraticCurveTo(0,height*.04,-width*.44,0);c.clip();
      c.globalAlpha=clamp(a);c.drawImage(image,-width*.64,-height*1.08,width*1.28,height*1.10);c.restore();return true;
    }
    function ambient(t,q,tail){
      if(rank!==2)return;
      c.globalCompositeOperation='source-over';
      if(type==='かみなり'){
        for(let i=0;i<34;i++){const sx=noise(i+7)*w,sy=noise(i+77)*effectH;glow('#f4df7e',sx,sy,1+noise(i)*2,1+noise(i)*2,clamp(q)*Math.max(0,1-tail)*.6);}
      }
      if(type==='岩'){
        const activity=t<220?ease(t/220):t<1120?1:1-ease((t-1120)/580);
        for(let i=0;i<30;i++){const v=(t/700+noise(i+88))%1;line([[noise(i)*w-v*25,noise(i+4)*effectH*.4+v*25],[noise(i)*w,noise(i+4)*effectH*.4]],'#d5ad78',1,activity*.312);}
      }
    }
    function fire(t,q,u,tail){
      const energy=t<impact?ease(q):Math.pow(Math.max(0,1-tail),.65), rise=ease(u*3+q*.08);
      c.globalCompositeOperation='screen';
      glow('#d24a17',x,floor,R*1.35,R*.36,energy*.55);
      // 火種の渦は上へ吸い込まれ、着弾後は細い炎の束に変わる。
      for(let i=0;i<(rank+1)*7;i++){
        const v=(t/670+noise(i+4))%1,ang=noise(i)*TAU+t*.004;
        const px=x+Math.cos(ang)*R*(1-v)*.66,py=floor-v*R*.65;
        glow(i%3?'#ff7832':'#fff0a7',px,py,2.1+noise(i)*2,3+noise(i)*4,energy*(t<impact?1:.55));
      }
      if(u<0)return;
      if(rank===2){
        const expansion=ease(u*2.5),fade=Math.max(0,1-u*1.1);
        // 爆炎が扇状に展開してから巻き上がる。最強専用の広い発現。
        for(let k=0;k<8;k++){
          const ang=Math.PI+(k/7)*Math.PI,rad=R*(.35+expansion*1.5),px=x+Math.cos(ang)*rad,py=floor+Math.sin(ang)*rad*.8;
          c.beginPath();c.moveTo(x,floor);c.bezierCurveTo(x+Math.cos(ang)*rad*.5,floor+Math.sin(ang)*rad*.18,px-R*.15,py+R*.32,px,py);c.bezierCurveTo(px+R*.12,py+R*.12,x+Math.cos(ang)*rad*.65,floor-R*.07,x,floor);c.closePath();
          const g=c.createLinearGradient(x,floor,px,py);g.addColorStop(0,'rgba(255,214,107,0)');g.addColorStop(.55,'rgba(255,123,26,.65)');g.addColorStop(1,'rgba(213,40,12,0)');c.fillStyle=g;c.globalAlpha=fade*.6;c.fill();c.globalAlpha=1;
        }
        glow('#f3661e',x,y,R*1.5,R,fade*.20);
      }
      const textured=!!textures.hi,n=textured?3:rank===0?5:rank===1?11:18;
      for(let i=0;i<n;i++){
        const b=(i/(n-1)-.5),height=Math.min(geometryFloor-74,R*2.15)*(.44+noise(i+24)*.56)*rise*(.92+.08*Math.sin(t*.013+i));
        const bx=x+b*R*.92,by=floor-4+noise(i+92)*15,wind=Math.sin(t*.012+i)*R*.10,thick=R*(.035+noise(i+45)*.055);
        if(textured){texture('hi',bx,by,R*(.85+noise(i)*.25),Math.min(geometryFloor-68,R*1.6)*rise*(.75+noise(i+24)*.25),t+i*70,energy*(i===1?.92:.66),b*.18+Math.sin(t*.008+i)*.045);continue;}
        c.beginPath();c.moveTo(bx-thick,by-5);c.bezierCurveTo(bx-thick*2+wind,by-height*.23,bx+thick*2+wind,by-height*.63,bx+b*R*.2+wind,by-height);c.bezierCurveTo(bx-thick*.3+wind,by-height*.65,bx+thick*2,by-height*.32,bx+thick,by-7);c.quadraticCurveTo(bx,by+7,bx-thick,by-5);c.closePath();
        const g=c.createLinearGradient(0,by,0,by-height);g.addColorStop(0,'rgba(240,75,17,0)');g.addColorStop(.12,'#ff8832');g.addColorStop(.28,i%3?'#ffd35c':'#fff2b8');g.addColorStop(.48,'#ffad2f');g.addColorStop(.8,'#ef471d');g.addColorStop(1,'rgba(180,21,16,0)');c.fillStyle=g;c.globalAlpha=energy*(.3+noise(i)*.4);c.fill();c.globalAlpha=1;
      }
      for(let i=0;i<(rank+1)*16;i++){const age=clamp((t-impact-noise(i)*280)/800),ang=noise(i+12)*TAU;const px=x+Math.cos(ang)*R*age,py=floor-R*.3-R*(1.2+noise(i))*age;bright([[px,py+4],[px-2*Math.sin(ang),py]],'#ff9538',1.2,(1-age)*energy);}
      glow('#ffe9ac',x,floor-8,R*.42,R*.30,Math.max(0,1-u*4)*.65);
      if(rank===2)bright([[x+R*.3,floor-15],[targetX-18,floor-33],[targetX,floor-8]],'#ffb73d',8,Math.max(0,1-u)*.7);
    }
    function water(t,q,u,tail){
      c.globalCompositeOperation='screen';const a=t<impact?ease(q):Math.max(0,1-tail);
      const height=Math.min(geometryFloor-72,R*(rank===0?.65:rank===1?1.2:1.8)),progress=t<impact?q*.5:ease(u*3);
      if(u>=0){
        // 厚みのある水膜。反射の縁と透ける内部を別々に描く。
        const left=[],right=[];for(let j=0;j<=36;j++){const v=j/36,bend=Math.sin(v*TAU+t*.006)*R*.13,width=R*(.10+(1-v)*.20)*(1+.15*Math.sin(v*12+t*.01));left.push([x+bend-width,floor-height*v*progress]);right.push([x+bend+width,floor-height*v*progress]);}
        path(left.concat(right.slice().reverse()));const g=c.createLinearGradient(x-R*.4,0,x+R*.4,0);g.addColorStop(0,'rgba(37,133,178,0)');g.addColorStop(.2,'rgba(36,154,197,.28)');g.addColorStop(.45,'rgba(180,251,255,.42)');g.addColorStop(.58,'rgba(21,111,172,.10)');g.addColorStop(.78,'rgba(110,240,253,.65)');g.addColorStop(1,'rgba(51,145,185,0)');c.fillStyle=g;c.globalAlpha=a;c.fill();c.globalAlpha=1;line(left,'#75e8f0',2.3,a*.5);line(right,'#e6ffff',1.8,a*.7);
        texture('mizu',x,floor+8,R*(1.1+rank*.2),height*progress,t,a*.9,Math.sin(t*.004)*.10);
      }
      for(let k=0;k<rank+1;k++){
        const points=[];
        for(let j=0;j<=80;j++){const v=j/80,ang=v*TAU*1.5+t*.004+k*TAU/(rank+1),r=R*(.16+v*.28);points.push([x+Math.cos(ang)*r,floor-height*v*progress+Math.sin(ang)*r*.20]);}
        line(points,'#158fc0',14*S,a*.18);line(points,'#61d7ec',5*S,a*.48);line(points,'#e8ffff',1.3*S,a*(textures.mizu?.3:.68));
      }
      glow('#167ba7',x,floor-R*.5,R*.7,R, a*.20);
      if(u<0)return;
      if(rank===2){
        const wave=ease(u*2),fade=Math.max(0,1-u*1.15),base=floor+12,crestY=floor-R*(.75+wave*.25),left=x-w*.8*wave;
        c.beginPath();c.moveTo(left,base);c.bezierCurveTo(left+w*.18,base-R*.1,x-R*.95,crestY-R*.2,x-R*.22,crestY);c.bezierCurveTo(x+R*.55,crestY+R*.15,x+R*.22,floor-R*.08,x+R*.04,floor-R*.22);c.bezierCurveTo(x-R*.15,floor-R*.5,x+R*.12,crestY+R*.38,x-R*.45,crestY+R*.25);c.bezierCurveTo(x-R*.85,crestY+R*.17,left+w*.19,base+14,left,base);c.closePath();
        const g=c.createLinearGradient(0,crestY,0,base);g.addColorStop(0,'rgba(191,254,255,.80)');g.addColorStop(.18,'rgba(34,174,216,.55)');g.addColorStop(.7,'rgba(30,90,143,.15)');g.addColorStop(1,'rgba(80,210,230,0)');c.fillStyle=g;c.globalAlpha=fade;c.fill();c.globalAlpha=1;
        for(let i=0;i<36;i++){const v=i/36;glow('#e6ffff',x-R*.7+v*R*.9,crestY+Math.sin(v*3)*R*.18,2+noise(i)*3,2+noise(i)*2,fade*.7);}
      }
      for(let i=0;i<(rank+1)*20;i++){
        const age=clamp((t-impact-noise(i)*190)/730),ang=noise(i+3)*TAU;
        const px=x+Math.cos(ang)*R*1.28*age,py=floor-R*.4-Math.sin(age*Math.PI)*R*(.6+noise(i+2));
        shard(px,py,(2+noise(i+7)*6)*S,ang+age*2,i%3?'#74d7e4':'#d9fcff',(1-age)*a);
        line([[px-4*Math.cos(ang),py+5],[px,py]],'#ccfbff',.7,(1-age)*a*.65);
      }
      for(let i=0;i<rank+2;i++){const v=clamp(u*.85-i*.14);ellipse(x,floor+5,R*(.12+v*1.3),R*(.05+v*.3),'#baf7fb',1.7*S,a*(1-v));ellipse(x,floor+8,R*(.14+v*1.32),R*(.05+v*.31),'#369dbd',3*S,a*.35*(1-v));}
      glow('#d8ffff',x,floor-R*.45,R*.28,R*.4,Math.max(0,1-u*3)*.55);
    }
    function wood(t,q,u,tail){
      c.globalCompositeOperation='source-over';const a=t<impact?ease(q):Math.max(0,1-tail*.85);
      glow('#80a950',x,floor,R,R*.2,a*.22);
      const n=rank===0?1:rank===1?2:2;
      const grown=ease(t/(impact+160));
      if(textures.ki){
        // 太い古木の主幹は一つの質量として成長し、枝葉は独立して開く。
        const height=Math.min(geometryFloor-64,R*(rank===0?.85:rank===1?1.4:2))*grown;
        const width=height*(textures.ki.width/textures.ki.height)*.92;
        texture('ki',x,floor+8,width,height,t,a,Math.sin(t*.003)*.045);
      }
      for(let k=0;k<n;k++){
        const height=Math.min(geometryFloor-24,R*(rank===0?.72:rank===1?1.45:2.15)*(1+noise(k)*.2)),progress=ease((t-(impact*.12+k*25))/(impact+150));
        const pts=[];for(let j=0;j<=50;j++){const v=j/50*progress;const bend=k===0?Math.sin(v*Math.PI*.9)*R*.32:-(v*v)*R*.35+Math.sin(v*2.8)*R*.13;pts.push([x+bend+(k?R*.10:-R*.10),floor-height*v]);}
        const widths=pts.map((p,j)=>(rank===2?18:10)*S*(1-j/pts.length*.74));
        if(!textures.ki){path(pts.map((p,j)=>[p[0]-widths[j]*.5,p[1]]).concat(pts.slice().reverse().map((p,j)=>[p[0]+widths[pts.length-1-j]*.5,p[1]])));c.globalAlpha=a;c.fillStyle='#183322';c.fill();
        path(pts.map((p,j)=>[p[0]-widths[j]*.35,p[1]]).concat(pts.slice().reverse().map((p,j)=>[p[0]+widths[pts.length-1-j]*.18,p[1]])));const bark=c.createLinearGradient(x-R*.3,0,x+R*.35,0);bark.addColorStop(0,'#34402a');bark.addColorStop(.6,'#74854b');bark.addColorStop(1,'#304c2d');c.fillStyle=bark;c.fill();c.globalAlpha=1;line(pts.map((p,j)=>[p[0]-widths[j]*.24,p[1]]),'#99ae6e',1.2*S,a*.65);}
        for(let j=1;j<7;j++){
          const v=j/7;if(v>progress)continue;const bend=k===0?Math.sin(v*Math.PI*.9)*R*.32:-(v*v)*R*.35+Math.sin(v*2.8)*R*.13,px=x+bend+(k?R*.10:-R*.10),py=floor-height*v;
          if(!textures.ki)ellipse(px,py,3*S,2*S,'#b0c979',1,a*.8);
          const opened=ease((progress-v)*6),dir=j%2?1:-1,branch=R*(.17+noise(j+k*12)*.25)*opened,ex=px+dir*branch,ey=py-R*.12*opened;
          c.beginPath();c.moveTo(px,py);c.quadraticCurveTo(px+dir*branch*.6,py+R*.025,ex,ey);stroke('#254b2e',Math.max(1,4*S*(1-v)),a);stroke('#91b55c',.9*S,a*.65);
          leaf(ex,ey,(6+rank*3)*opened*S,j%2?-.6:2.8,a);if(rank===2){leaf(ex-dir*9,ey+7,7*opened*S,j%2?.6:2.2,a);leaf(ex+dir*4,ey-8,8*opened*S,j%2?-.8:3.5,a);}
        }
      }
      // 着弾はツタの締め付けと、芽が花のように一斉に開く瞬間。
      if(u<0)return;
      if(rank===2){
        const spread=ease(u*2.7),fade=Math.max(0,1-tail);
        for(let k=0;k<5;k++){
          const ang=k*TAU/5+.28,dist=R*(.75+noise(k)*.5)*spread,endX=x+Math.cos(ang)*dist,endY=floor+Math.sin(ang)*dist*.20,dir=Math.cos(ang);
          c.beginPath();c.moveTo(x,floor);c.bezierCurveTo(x+dir*dist*.18,floor+Math.sin(ang)*dist*.05,x+dir*dist*.69,endY+R*.035,endX,endY);stroke('#302c21',(4+noise(k)*6)*S,fade);stroke('#5b603a',(2+noise(k)*3)*S,fade);stroke('#87945b',.9*S,fade*.7);
          leaf(endX,endY,8*S*spread,k,fade*.75);
        }
      }
      for(let i=0;i<(rank+1)*10;i++){
        const v=clamp((t-impact-noise(i)*220)/900),ang=noise(i+21)*TAU;
        const px=x+Math.cos(ang)*R*(.4+v*.8)+Math.sin(t*.008+i)*10,py=floor-R*(.4+noise(i)*1.1)+v*v*R;
        leaf(px,py,(5+noise(i)*6)*S,ang+v*3,Math.max(0,1-tail)*(1-v));
      }
      c.globalCompositeOperation='screen';for(let i=0;i<rank*6+5;i++){const ang=noise(i)*TAU;glow('#d7ed89',x+Math.cos(ang)*R*.8,floor-R*noise(i+17)*1.8,2,3,a*Math.max(0,1-u*.65));}
      glow('#aee782',x,floor-R*.5,R*.46,R*.65,Math.max(0,1-u*4)*.38);
    }
    function earth(t,q,u,tail){
      c.globalCompositeOperation='source-over';const a=t<impact?ease(q):Math.max(0,1-tail);
      // 放射状の亀裂：雷と違い、低い地面に枝分かれして留まる。
      for(let i=0;i<rank*3+4;i++){
        const ang=i*TAU/(rank*3+4),r=R*ease(q)*(.6+noise(i)*.5);
        const pts=[[x,floor],[x+Math.cos(ang)*r*.36,floor+Math.sin(ang)*r*.13],[x+Math.cos(ang+.17)*r*.7,floor+Math.sin(ang+.17)*r*.26],[x+Math.cos(ang)*r,floor+Math.sin(ang)*r*.35]];
        line(pts,'#2f211c',2.6*S,a);line(pts.map(p=>[p[0],p[1]+1]),'#e2ba78',.7,a*.6);
      }
      // 最強：巨大な一つの質量が加速して落ちる。空の尾と岩肌は分離して描く。
      if(rank===2&&t>230&&t<impact+65){
        const v=Math.pow(clamp((t-230)/(impact-230)),2.1),sx=w*.25,sy=-R*.24,ex=targetX-22,ey=floor-22;
        const px=sx+(ex-sx)*v,py=sy+(ey-sy)*v,dx=ex-sx,dy=ey-sy,len=Math.hypot(dx,dy),trail=R*(.8+v*.8),size=R*(.22+v*.15);
        c.globalCompositeOperation='screen';glow('#d9541d',px,py,size*1.6,size*1.45,.8);bright([[px-dx/len*trail,py-dy/len*trail],[px,py]],'#ff6f24',28*S,.65);bright([[px-dx/len*trail*.8-11,py-dy/len*trail*.8],[px,py]],'#ffd18d',5*S,.8);c.globalCompositeOperation='source-over';boulder(px,py,size,t*.0007,Math.min(1,(t-230)/100));
      }
      if(u<0)return;
      if(rank===2){c.globalCompositeOperation='screen';const blast=Math.max(0,1-u*2.8);glow('#fb9f49',x,floor,R*(.4+ease(u*4)*1.7),R*(.16+ease(u*4)*.6),blast*.68);c.globalCompositeOperation='source-over';}
      const n=rank===0?3:rank===1?5:7;
      // 低く不規則な岩塊。柱やピラミッドにはせず、重さが地面に残る。
      for(let i=0;i<n;i++){
        const p=ease((u-noise(i)*.18)*5),size=R*(.10+noise(i+9)*.16),px=x+(i/(n-1)-.5)*R*1.45,py=floor+Math.sin(i*2.4)*R*.06-size*.23*p;
        glow('#342b24',px,floor+size*.15,size*1.3,size*.17,a*.7);boulder(px,py,size*p,noise(i)*2-1,a,.48+noise(i+3)*.25,i*23);
      }
      for(let i=0;i<(rank+1)*15;i++){
        const v=clamp((t-impact-noise(i)*200)/850),ang=noise(i+19)*TAU,px=x+Math.cos(ang)*R*v*1.5,py=floor-Math.sin(v*Math.PI)*R*(.3+noise(i+12)*.65);
        if(i%4===0)boulder(px,py,(4+noise(i)*8)*S,ang+v*5,a*(1-v),1,i*27);else rock(px,py,(2+noise(i)*6)*S,ang+v*5,a*(1-v));
      }
      for(let i=0;i<rank*4+5;i++){
        const v=clamp(u*.7),px=x+(noise(i)-.5)*R*(1+v*2),py=floor+6-noise(i+21)*R*.13-v*8;
        glow('#b39064',px,py,R*(.12+v*.3),R*(.04+v*.09),a*(1-v)*.39);
      }
      c.globalCompositeOperation='screen';glow('#edb36e',x,floor,R*.8,R*.13,Math.max(0,1-u*5)*.5);
    }
    function lightning(t,q,u,tail){
      c.globalCompositeOperation='screen';const a=t<impact?ease(q):Math.max(0,1-tail);
      const chargeY=Math.max(28,y-R*.65);
      glow('#7771ce',x,chargeY,R*.8,R*.65,a*.25);
      if(t<impact){
        for(let i=0;i<rank*5+5;i++){const ang=i*TAU/(rank*5+5)+t*.002,r=R*(1-q*.6);const px=x+Math.cos(ang)*r,py=chargeY+Math.sin(ang)*r*.45;bright([[px,py],[px+Math.sin(i*3)*6,py-5],[px+3,py-10]],'#baacfc',1,q*.7);}
        glow('#fff2b6',x,chargeY,4+q*9,4+q*9,q);
        return;
      }
      const beat=Math.floor((t-impact)/75),flash=(t-impact)%75<44;
      const boltA=(u<.6?(flash?1:.23):Math.max(0,1-u)*.5)*a;
      const bolts=1;
      for(let k=0;k<bolts;k++){
        const startX=x+R*.10,startY=rank===2?58:chargeY-R*.65,pts=[];
        for(let i=0;i<=16;i++){const v=i/16;pts.push([startX+(targetX-startX)*v+(i===0||i===16?0:(noise(i+k*32+beat*31)-.5)*R*.13),startY+(floor-startY)*v]);}
        line(pts,'#9584f0',22*S,boltA*.035);line(pts,'#a091e5',13*S,boltA*.08);line(pts,'#c3b7f1',6*S,boltA*.23);line(pts,'#e9e4ff',2.8*S,boltA*.75);
        c.shadowColor='#c9bfff';c.shadowBlur=11;line(pts,'#ffffff',1.2*S,boltA);c.shadowBlur=0;
        if(rank>0)for(let b=4;b<14;b+=4){const p=pts[b],dir=b%2?1:-1,dist=R*(.16+noise(b+beat)*.18);const branch=[p,[p[0]+dir*dist*.35,p[1]-dist*.22],[p[0]+dir*dist*.60,p[1]+dist*.05],[p[0]+dir*dist,p[1]+dist*.43]];line(branch,'#b6a7e5',5*S,boltA*.08);for(let j=1;j<branch.length;j++)line([branch[j-1],branch[j]],'#fff4ff',(1.3-j*.32)*S,boltA*(.78-j*.14));}
      }
      if(rank===2){
        // 光の大技：中心から放射線が走る。白い幕にはせず背景が残る。
        const radius=R*ease(u*3)*2.5,fade=Math.max(0,1-u*.9)*.7;
        for(let i=0;i<36;i++){const ang=i*TAU/36,inner=12+R*.2;bright([[x+Math.cos(ang)*inner,y+Math.sin(ang)*inner],[x+Math.cos(ang)*radius,y+Math.sin(ang)*radius]],i%3?'#bcaaff':'#ffefb6',i%3?1:2.2,fade*.55);}
        glow('#b4a4ed',x,y,R*1.7,R*1.6,Math.max(0,1-u*2)*.26);
        const expand=ease(u*2.5),membraneFade=Math.max(0,1-u*1.25),domeRadius=R*(.18+expand*1.7);
        // 半球状の電離膜が膨張し、外周が光へほどける。
        c.beginPath();c.ellipse(x,floor,domeRadius,domeRadius*.92,0,Math.PI,TAU);stroke('#a498eb',8*S,membraneFade*.17);stroke('#f0eaff',1.8*S,membraneFade*.6);
        const dome=c.createRadialGradient(x,floor,0,x,floor,domeRadius);dome.addColorStop(0,'rgba(238,231,255,0)');dome.addColorStop(.70,'rgba(155,138,238,.10)');dome.addColorStop(.91,'rgba(220,211,255,.30)');dome.addColorStop(1,'transparent');c.fillStyle=dome;c.globalAlpha=membraneFade;c.beginPath();c.ellipse(x,floor,domeRadius,domeRadius*.92,0,Math.PI,TAU);c.closePath();c.fill();c.globalAlpha=1;
        for(let k=0;k<3;k++){c.beginPath();c.ellipse(x,floor,domeRadius*(.24+k*.28),domeRadius*.91,0,Math.PI,TAU);stroke('#c4b5f3',.8*S,membraneFade*.17);}
      }
      glow('#fff7c4',x,floor,R*(.4+u*.35),R*.13,boltA*.8);
      for(let i=0;i<rank*7+8;i++){const ang=noise(i)*TAU,r=R*clamp(u*1.7);const px=x+Math.cos(ang)*r,py=floor+Math.sin(ang)*r*.3-R*noise(i+8)*clamp(u*.9);bright([[px,py],[px-4,py-5],[px+2,py-9]],'#c7bcff',.8,a*Math.max(0,1-u)*.8);}
    }
    /* 新最強は独立の4秒構成。旧rendererを拡大/減速して呼ばない。 */
    const UR=Math.min(w*.46,effectH*.52,235);
    const UH=Math.max(50,Math.min(geometryFloor-52,UR*1.45));
    const UX=targetX, UY=floor-UH*.46;
    const ultimateFade=t=>1-ease((t-2600)/1400);
    function chargeLine(points,color,width,a){
      line(points,color,width*7,a*.035);line(points,color,width*3,a*.10);line(points,color,width,a*.65);line(points,'#fff7de',width*.28,a*.9);
    }
    function curve(points,color,width,a){
      c.beginPath();c.moveTo(points[0][0],points[0][1]);c.bezierCurveTo(...points[1],...points[2],...points[3]);stroke(color,width,a);
    }
    function maxFire(t){
      if(t>1800){
        if(textures.hi&&!maxFire.fireImage){const im=document.createElement('canvas');im.width=512;im.height=Math.round(512*textures.hi.height/textures.hi.width);im.getContext('2d').drawImage(textures.hi,0,0,im.width,im.height);maxFire.fireImage=im;}
        const image=maxFire.fireImage;
        function flame(bx,base,width,ht,a,lean=0){
          if(!image)return;
          c.save();c.translate(bx,base);c.rotate(lean);c.beginPath();c.moveTo(-width*.44,0);c.bezierCurveTo(-width*.65,-ht*.22,-width*.22,-ht*.73,-width*.17,-ht);c.quadraticCurveTo(width*.26,-ht*1.13,width*.24,-ht*.71);c.bezierCurveTo(width*.55,-ht*.5,width*.49,-ht*.15,width*.43,0);c.quadraticCurveTo(0,ht*.04,-width*.44,0);c.clip();c.globalAlpha=a;c.drawImage(image,-width*.64,-ht*1.08,width*1.28,ht*1.10);c.restore();
        }
        const form=ease((t-1800)/420),burst=clamp((t-3150)/700),collapse=t>=3150?1-ease((t-3150)/280):1;
        const height=Math.min(geometryFloor-46,UH*1.08)*(1+clamp((t-2970)/180)*.11),cx=UX+Math.sin(t*.005)*UR*.025;
        const radius=UR*(.07+form*.47)*(1+clamp((t-2970)/180)*.23),spin=(t-1800)*.011;
        const live=collapse,emberFade=t<3150?1:Math.pow(Math.max(0,1-burst),.8);
        // 爆炎の広がりを細い根元へ吸い込み、斜めの炎帯を前後で分けて巻く。
        c.globalCompositeOperation='source-over';
        if(t<2250){
          const age=clamp((t-1800)/450),a=1-age;
          for(let i=0;i<7;i++)flame(UX+(i/6-.5)*UR*1.1,floor+8,UR*.65,UH*(.55+noise(i)*.3),a*.75,(i-3)*.13);
        }
        function ribbon(k,front){
          const segments=[];let run=[];
          for(let j=0;j<=64;j++){
            const v=j/64,ang=spin+k*TAU/4-v*TAU*1.20,r=radius*(.14+.86*Math.pow(v,1.18)),depth=Math.sin(ang),px=cx+Math.cos(ang)*r,py=floor-height*v+depth*r*.19;
            if((depth>=0)===front){run.push({px,py,v,depth,r});}else if(run.length){segments.push(run);run=[];}
          }
          if(run.length)segments.push(run);
          for(const pts of segments){if(pts.length<2)continue;
            const edge=(p,dir)=>{const feather=(.65+.25*Math.sin(p.v*48+t*.015+k*2))*Math.min(1,(p.v-pts[0].v)*30,(pts[pts.length-1].v-p.v)*30);return[p.px+dir*(4+p.v*17)*form*feather,p.py+dir*(2+p.v*5)*feather];};
            c.save();c.beginPath();pts.forEach((p,i)=>{const a=edge(p,-1);i?c.lineTo(...a):c.moveTo(...a);});pts.slice().reverse().forEach(p=>c.lineTo(...edge(p,1)));c.closePath();
            if(image){c.clip();c.globalAlpha=live*(front?.98:.43);const minX=Math.min(...pts.map(p=>p.px))-25,maxX=Math.max(...pts.map(p=>p.px))+25,minY=Math.min(...pts.map(p=>p.py))-12,maxY=Math.max(...pts.map(p=>p.py))+12,ratio=image.width/textures.hi.width;
              c.drawImage(image,(85+((k*103+Math.floor(t*.04))%550))*ratio,120*ratio,440*ratio,850*ratio,minX,minY,maxX-minX,maxY-minY);
            }else{
              c.fillStyle=front?'#ffb955':'#a3431e';c.globalAlpha=live*.48;c.fill();
            }
            c.restore();if(front)line(pts.map(p=>[p.px-1,p.py]),'#ffdf91',.9,live*.32);
          }
        }
        for(let k=0;k<4;k++)ribbon(k,false);
        // 明るい核は内部だけ。炎の縦の襞が背面と前面の間を透けて動く。
        c.globalCompositeOperation='screen';glow('#f56e20',cx,floor-height*.48,radius*.57,height*.55,form*live*.40);
        c.save();c.beginPath();for(let j=0;j<=30;j++){const v=j/30,r=radius*(.14+.86*Math.pow(v,1.18)),px=cx-r+Math.sin(v*38+spin)*4,py=floor-height*v;j?c.lineTo(px,py):c.moveTo(px,py);}for(let j=30;j>=0;j--){const v=j/30,r=radius*(.14+.86*Math.pow(v,1.18));c.lineTo(cx+r+Math.sin(v*35+spin)*4,floor-height*v);}c.closePath();c.clip();
        for(let i=0;i<5;i++)flame(cx+(i-2)*radius*.20+Math.sin(spin+i)*radius*.08,floor+height*.12,UR*.70,height*1.15,live*form*(i===2?.82:.56),Math.sin(spin+i)*.09);
        c.restore();
        c.globalCompositeOperation='source-over';for(let k=0;k<4;k++)ribbon(k,true);
        c.globalCompositeOperation='screen';glow('#ffedaa',cx,floor-10,radius*.20,UR*.11,live*.58);
        // 火の粉は高さにつれて外へ開く。回転中に上へ運ばれ、破裂後は外へ散る。
        for(let i=0;i<85;i++){
          const v=((t-1800)/1250+noise(i))%1,ang=spin*.8+i*2.40+v*3,r=radius*(.12+v*.98),px=cx+Math.cos(ang)*r,py=floor-height*v+Math.sin(ang)*r*.16;
          if(t<3150)chargeLine([[px-Math.sin(ang)*4,py+6],[px,py]],i%3?'#ff9e30':'#fff1b5',.8+noise(i)*.7,form*.77);
        }
        if(t>=3150){
          const v=ease(burst),rad=UR*(.18+v*1.52),by=floor-height*.42;
          c.globalCompositeOperation='source-over';
          for(let i=0;i<9;i++){
            const ang=i*TAU/9+.1,px=cx+Math.cos(ang)*rad*.60,py=by+Math.sin(ang)*rad*.42;
            flame(px,py+UR*.24,UR*(.72+v*.26),UH*(.70+v*.26),emberFade*.83,ang*.12);
          }
          c.globalCompositeOperation='screen';glow('#ff7629',cx,by,rad,rad*.72,emberFade*.60);glow('#fff0bb',cx,by,UR*(.20+v*.26),UH*.44,Math.max(0,1-burst*2.5)*.91);
          for(let i=0;i<70;i++){
            const a=noise(i+14)*TAU,dist=UR*(.2+v*(1.15+noise(i)*.35)),px=cx+Math.cos(a)*dist,py=by+Math.sin(a)*dist*.59+burst*burst*UR*.35;
            chargeLine([[px-Math.cos(a)*8,py-Math.sin(a)*5],[px,py]],i%4?'#ff8430':'#ffe3a0',1+noise(i)*1.4,emberFade*.8);
          }
        }
        return;
      }
      const gather=ease(t/1200),grow=ease((t-1050)/760),released=clamp((t-1800)/1100),fade=ultimateFade(t);
      c.globalCompositeOperation='screen';
      // 遠くの火線が核へ向かい、先に太い柱を作ってから爆炎を解放。
      if(t<1850)for(let i=0;i<26;i++){
        const age=(t/950+noise(i))%1,ang=noise(i+33)*TAU,dist=UR*(1.2+noise(i+15)),end=1-age;
        const px=UX+Math.cos(ang)*dist*end,py=UY+Math.sin(ang)*dist*.47*end;
        chargeLine([[px-Math.cos(ang)*14,py-Math.sin(ang)*7],[px,py]],'#ff8c32',1.1,gather*.8);
        glow('#ff952e',px,py,2+noise(i)*2,3+noise(i)*2,gather*.5);
      }
      glow('#c63512',UX,UY,UR*(.18+gather*.18),UH*.50,gather*fade*.45);
      glow('#fff1b8',UX,UY,6+gather*12,10+gather*20,gather*Math.max(.2,1-released)*.7);
      if(t>980){
        for(let i=0;i<5;i++){
          const theta=t*.004+i*1.25,bx=UX+Math.sin(theta)*UR*.22,base=floor+Math.cos(theta)*10,height=UH*(.75+noise(i)*.25)*grow;
          texture('hi',bx,base,UR*(.75+noise(i+5)*.3),height,t+i*300,fade*(.62+noise(i)*.22),Math.sin(theta)*.17);
        }
        if(!textures.hi)for(let i=0;i<9;i++){
          const bx=UX+(i/8-.5)*UR*.8,ht=UH*(.6+noise(i)*.4)*grow;
          curve([[bx,floor],[bx-UR*.25,floor-ht*.25],[bx+UR*.35,floor-ht*.72],[bx+Math.sin(t*.006+i)*18,floor-ht]],'#ff9340',12,fade*.55);
          curve([[bx,floor],[bx-UR*.25,floor-ht*.25],[bx+UR*.35,floor-ht*.72],[bx+Math.sin(t*.006+i)*18,floor-ht]],'#ffe6a3',3,fade*.75);
        }
        for(let i=0;i<3;i++){
          const pts=[];for(let j=0;j<=50;j++){const v=j/50,ang=v*TAU*1.5+t*.005+i*2.1;pts.push([UX+Math.cos(ang)*UR*(.14+v*.27),floor-UH*v*grow+Math.sin(ang)*UR*.12]);}
          line(pts,'#e45617',8,fade*.12);line(pts,'#ffd484',1.4,fade*.46);
        }
      }
      if(t>=1800){
        for(let k=0;k<3;k++){
          const age=(t-1800-k*210)/720;if(age<0||age>1.3)continue;
          const rad=UR*(.18+ease(age)*1.28),a=Math.max(0,1-age)*fade;
          for(let i=0;i<10;i++){
            const ang=Math.PI+i*Math.PI/9,px=UX+Math.cos(ang)*rad,py=floor+Math.sin(ang)*rad*.62;
            curve([[UX,floor],[UX+Math.cos(ang)*rad*.3,floor-UR*.13],[px-12,py+UR*.18],[px,py]],i%2?'#ff7024':'#ffdd92',(11-k*2)*(1-age*.5),a*.42);
            glow('#ff6624',px,py,UR*.18,UR*.10,a*.28);
          }
          glow('#ffd697',targetX,floor-14,UR*(.3+age*.5),UR*.19,a*.32);
        }
        for(let i=0;i<70;i++){
          const age=clamp((t-1800-noise(i)*700)/1900),ang=noise(i+8)*TAU,px=UX+Math.cos(ang)*UR*age*1.4,py=floor-UH*.2-UH*(.7+noise(i+2))*age;
          chargeLine([[px,py+5],[px-1,py]],'#f79c36',1,(1-age)*fade*.75);
        }
      }
    }
    function maxWater(t){
      const image=ultimateTextures.tsunami,form=ease((t-350)/650),p=clamp((t-1000)/1450),progress=p*p*(3-2*p),crash=clamp((t-2450)/700),recede=t<3150?1:Math.pow(Math.max(0,1-(t-3150)/850),.9);
      const centerX=departureX+(UX-departureX)*progress,base=departureY+(floor-departureY)*progress;
      const waveWidth=w*1.62*(.30+.70*form)*(1-progress*.32)*(1+ease(crash)*.26),waveHeight=Math.min(waveWidth*.626,Math.max(110,(base-42)/.76))*(.10+.90*form)*(1-ease(crash)*.68),crest=base-waveHeight*.76,alpha=ease((t-350)/220)*recede*(1-ease(crash)*.65);
      c.globalCompositeOperation='source-over';
      if(image&&!maxWater.seaMaterial){
        const sample=document.createElement('canvas');sample.width=512;sample.height=Math.round(512*image.height*.36/(image.width*.53));const sc=sample.getContext('2d');sc.drawImage(image,image.width*.23,image.height*.42,image.width*.53,image.height*.36,0,0,sample.width,sample.height);const src=sc.getImageData(0,0,sample.width,sample.height).data;
        const material=document.createElement('canvas');material.width=640;material.height=640;const mc=material.getContext('2d'),out=mc.createImageData(640,640),mirror=q=>{const r=q-Math.floor(q/2)*2;return r<=1?r:2-r;};
        // 海面の奥行き座標を透視変換。奥は密に、手前は広く、泡模様を横長にする。
        for(let py=0;py<640;py++){
          const v=(py+.5)/640,depth=.18+.82*v,sy=mirror((1/depth-1)*3.8)*Math.max(1,sample.height-1),iy=Math.floor(sy),ny=Math.min(sample.height-1,iy+1),fy=sy-iy;
          for(let px=0;px<640;px++){
            const sx=mirror(.5+((px+.5)/640-.5)/depth*.68)*(sample.width-1),ix=Math.floor(sx),nx=Math.min(sample.width-1,ix+1),fx=sx-ix,k=(py*640+px)*4,a=(iy*sample.width+ix)*4,b=(iy*sample.width+nx)*4,d=(ny*sample.width+ix)*4,e=(ny*sample.width+nx)*4;
            for(let ch=0;ch<4;ch++)out.data[k+ch]=(src[a+ch]*(1-fx)+src[b+ch]*fx)*(1-fy)+(src[d+ch]*(1-fx)+src[e+ch]*fx)*fy;
          }
        }
        mc.putImageData(out,0,0);maxWater.seaMaterial=material;
      }
      const seaTop=floor-w*.20,seaBottom=h+70,seaDepth=seaBottom-seaTop,farSpan=w*.95,seaAlpha=ease(t/220)*recede;
      c.save();c.beginPath();c.moveTo(UX-farSpan,seaTop+18);c.bezierCurveTo(UX-farSpan*.63,seaTop-8,UX+farSpan*.47,seaTop-6,UX+farSpan,seaTop+14);c.bezierCurveTo(UX+farSpan*1.2,seaTop+seaDepth*.22,w*1.40,seaBottom-45,w*1.65,seaBottom);c.lineTo(-w*.65,seaBottom);c.bezierCurveTo(-w*.35,seaBottom-45,UX-farSpan*1.25,seaTop+seaDepth*.26,UX-farSpan,seaTop+18);c.closePath();c.clip();
      // 海の水量を波の底へ重ね、遠景は細かく手前は大きい反射へ投影する。
      const sea=c.createLinearGradient(0,seaTop,0,seaBottom);sea.addColorStop(0,'#105967');sea.addColorStop(.22,'#218d9c');sea.addColorStop(.55,'#237f94');sea.addColorStop(1,'#104e6f');c.fillStyle=sea;c.globalAlpha=seaAlpha*(image?.52:.88);c.fillRect(-w,seaTop-18,w*3,seaDepth+36);
      // 波と同じ材質の細かな屈折/凹凸を一続きに敷く。断面の切れ目を作らない。
      if(maxWater.seaMaterial){c.globalAlpha=seaAlpha*.88;c.drawImage(maxWater.seaMaterial,-w*.65+Math.sin(t*.0014)*w*.012,seaTop-30,w*2.3,seaDepth+60);}
      for(let i=0;i<42;i++){
        const v=Math.pow(noise(i+133),1.4),py=seaTop+seaDepth*v,span=farSpan+(w*1.7-farSpan)*v,mid=UX+(w*.48-UX)*v,px=mid+(noise(i+38)-.5)*span*2,len=(3+noise(i+87)*34)*(.24+v*1.7),sway=Math.sin(t*.003+i)*(.8+v*4);
        curve([[px-len,py+sway],[px-len*.35,py-1-v*3],[px+len*.45,py+1+v*2],[px+len,py-sway*.4]],i%4?'#94d9d9':'#d8f7ed',.5+v*1.2,seaAlpha*(.10+noise(i+12)*.20));
      }
      // 泡筋は幅と間隔を遠近へ合わせ、波の下へ向かって進む短い流れ。
      for(let i=0;i<18;i++){
        const v=1-((t/4200+noise(i+19))%1),next=Math.max(0,v-.035-noise(i+71)*.045),side=noise(i+45)*2-1,point=q=>[UX+(w*.48-UX)*q+side*(farSpan+(w*1.55-farSpan)*q),seaTop+seaDepth*Math.pow(q,1.35)];
        const a=point(v),b=point(next);line([a,[(a[0]+b[0])*.5+Math.sin(t*.002+i)*3,(a[1]+b[1])*.5],b],i%3?'#77cdc8':'#d6f7ef',.6+v*1.6,seaAlpha*(.16+noise(i)*.18));
      }
      const seaEdge=c.createLinearGradient(0,seaTop,0,seaTop+24);seaEdge.addColorStop(0,'transparent');seaEdge.addColorStop(1,'#000');c.globalCompositeOperation='destination-in';c.globalAlpha=1;c.fillStyle=seaEdge;c.fillRect(-w,seaTop-30,w*3,seaDepth+100);c.globalCompositeOperation='source-over';
      c.restore();
      box.magicSeaState={top:seaTop,bottom:seaBottom,farCenter:[UX,floor],farSpan,nearSpan:w*1.65,waveOverlap:base-seaTop,alpha:seaAlpha,fullWidth:true,perspectiveMaterial:!!maxWater.seaMaterial,edgeFeather:24,fixed:true};
      // 味方の前方から奥へ送る。凸の背面を見せ、敵へ着いてから砕ける。
      c.save();c.translate(centerX,base);c.transform(1,0,-.10*progress,1,0,0);c.globalAlpha=alpha;
      if(image)c.drawImage(image,-waveWidth*.50,-waveHeight*.90,waveWidth,waveHeight);
      else{
        const g=c.createLinearGradient(0,-waveHeight*.78,0,0);g.addColorStop(0,'#b5eef0');g.addColorStop(.24,'#43b9c5');g.addColorStop(.72,'#137a99');g.addColorStop(1,'transparent');c.fillStyle=g;c.beginPath();c.moveTo(-waveWidth*.45,0);c.bezierCurveTo(-waveWidth*.35,-waveHeight*.3,-waveWidth*.10,-waveHeight*.55,waveWidth*.15,-waveHeight*.78);c.bezierCurveTo(waveWidth*.35,-waveHeight*.90,waveWidth*.45,-waveHeight*.45,waveWidth*.48,-waveHeight*.12);c.quadraticCurveTo(0,waveHeight*.06,-waveWidth*.45,0);c.fill();
        for(let i=0;i<20;i++){const v=i/19,px=(v-.5)*waveWidth*.84,py=-waveHeight*(.35+.40*v);glow('#e4ffff',px,py,2+noise(i)*5,2+noise(i+8)*4,alpha*.7);}
      }
      c.restore();
      if(t>=2450){
        const power=ease(crash),a=recede;
        // 敵の足元で圧壊。高い飛沫と泡の噴出が、後退して消える波との違いになる。
        for(let i=0;i<94;i++){
          const age=clamp((t-2450-noise(i)*220)/1200),dir=noise(i+31)*2-1,px=UX+dir*w*.48*age,py=floor-Math.sin(age*Math.PI)*w*(.24+noise(i+9)*.35)+age*age*w*.12;
          c.globalCompositeOperation='source-over';shard(px,py,2+noise(i)*7,dir+age*3,i%4?'#a0e3e8':'#f0ffff',a*(1-age)*power*.8);
          if(i%2)glow('#e9ffff',px,py,2+noise(i)*5,2+noise(i+11)*4,a*(1-age)*power*.52);
        }
        for(let i=0;i<16;i++){const angle=Math.PI+i*Math.PI/15,rad=w*(.06+power*.31);glow('#dcffff',UX+Math.cos(angle)*rad,floor+Math.sin(angle)*rad*.52,10+power*12,4+power*7,a*(1-crash*.6)*.55);}
      }
      box.magicWaveState={origin:[UX,floor],departure:[departureX,departureY],target:[UX,floor],center:[centerX,base],base,crest,width:waveWidth,height:waveHeight,progress,crash,formation:form,alpha,imageBased:!!image};
    }
    function maxWaterFallback(t){
      if(t>1800){
        const approach=ease((t-1800)/1200),recede=t<3150?1:Math.pow(Math.max(0,1-(t-3150)/850),.85),front=floor+(h-floor+60)*approach,span=UR*.90+(w+UR)*approach,crest=floor-UH*.82-(floor+UH)*approach;
        c.globalCompositeOperation='source-over';
        // 波頭が奥から手前へ広がる。全画面への水膜にも屈折と流れを残す。
        c.save();c.beginPath();c.moveTo(UX-span,front);c.bezierCurveTo(UX-span*.93,crest+UH*.55,UX-span*.46,crest-UH*.30,UX+span*.14,crest);c.bezierCurveTo(UX+span*.6,crest+UH*.04,UX+span*.82,front-UH*.35,UX+span,front);c.lineTo(UX+span,front+100);c.lineTo(UX-span,front+100);c.closePath();c.clip();
        const film=c.createLinearGradient(0,crest,0,front);film.addColorStop(0,'rgba(42,164,194,.10)');film.addColorStop(.18,'rgba(29,142,180,.30)');film.addColorStop(.55,'rgba(12,91,145,.43)');film.addColorStop(1,'rgba(62,194,212,.28)');c.fillStyle=film;c.globalAlpha=recede;c.fillRect(UX-span,crest-UH,span*2,front-crest+UH+100);c.globalAlpha=1;
        texture('mizu',UX,front+UH*.12,w*(1.05+approach*.90),front-crest+UH*.10,t,recede*.90,-.08+approach*.07);
        for(let k=0;k<9;k++){
          const by=crest+(front-crest)*(k/8),wave=(20+approach*35)*Math.sin(t*.006+k);
          curve([[-w*.10,by+wave],[w*.23,by-UH*.20],[w*.64,by+UH*.13],[w*1.10,by-wave]],k%3?'#96eaf0':'#e6ffff',1.3+approach*2,recede*.56);
          curve([[-w*.10,by+wave+9],[w*.23,by-UH*.20+9],[w*.64,by+UH*.13+9],[w*1.10,by-wave+9]],'#13688e',6,recede*.23);
        }
        c.restore();
        c.globalCompositeOperation='screen';
        for(let i=0;i<75;i++){
          const px=UX+(noise(i+8)-.5)*span*1.85,py=crest+(front-crest)*noise(i+3)+Math.sin(t*.008+i)*18;
          shard(px,py,(2+noise(i)*6)*(1+approach*.8),noise(i+5)*TAU+t*.0015,i%3?'#8eddea':'#eaffff',recede*.55);
        }
        // 波を追う前縁の泡。3000msには前縁が画面外へ抜けて全員を包む。
        for(let i=0;i<35;i++){const px=UX+(i/34-.5)*span*1.9,py=front-12+Math.sin(i*.9+t*.01)*12;glow('#e5ffff',px,py,8+approach*13,3+approach*6,recede*.55);}
        return;
      }
      const gather=ease(t/1150),fold=ease((t-800)/1000),crash=ease((t-1650)/640),fade=ultimateFade(t);
      c.globalCompositeOperation='screen';
      // 左右の水が違う高さを走って、厚い波頭へ折り畳まれる。
      for(let side=-1;side<=1;side+=2)for(let k=0;k<3;k++){
        const start=UX+side*UR*(1.25+k*.12),end=UX+side*UR*.12,base=floor+8-k*8;
        curve([[start,base],[start-side*UR*.30,base-UH*.22*gather],[end+side*UR*.35,floor-UH*(.4+k*.14)*fold],[end,floor-UH*.55*fold]],'#4abed1',12,gather*fade*.20);
        curve([[start,base],[start-side*UR*.30,base-UH*.22*gather],[end+side*UR*.35,floor-UH*(.4+k*.14)*fold],[end,floor-UH*.55*fold]],'#d1fdff',1.6,gather*fade*.50);
      }
      if(t>700){
        const base=floor+crash*UH*.30,height=UH*(.40+fold*.60)*(1-crash*.18),a=fade*(1-crash*.33);
        texture('mizu',UX-UR*.13,base,UR*1.58,height,t,a,-.2+fold*.23);
        texture('mizu',UX+UR*.32,base-16,UR*.93,height*.83,t+800,a*.62,.23-crash*.25);
        if(!textures.mizu){
          c.beginPath();c.moveTo(UX-UR*1.2,base);c.bezierCurveTo(UX-UR*.3,base,UX-UR*.7,base-height*1.2,UX+UR*.12,base-height);c.bezierCurveTo(UX+UR*.8,base-height*.9,UX+UR*.3,base-height*.3,UX,base-height*.6);c.bezierCurveTo(UX+UR*.3,base-height*.2,UX+UR*.1,base,UX-UR*1.2,base);c.fillStyle='#82e3ea';c.globalAlpha=a*.4;c.fill();c.globalAlpha=1;
        }
        for(let i=0;i<38;i++){
          const v=i/38,px=UX-UR*.56+v*UR*1.04,py=base-height*(.78+.12*Math.sin(v*4+t*.002));
          glow('#efffff',px,py,1+noise(i)*3,2+noise(i)*2,a*.65);
        }
      }
      if(t>=1700){
        for(let i=0;i<90;i++){
          const age=clamp((t-1730-noise(i)*430)/1700),ang=noise(i+14)*TAU,px=UX+Math.cos(ang)*UR*age*1.5,py=floor-UH*.15-Math.sin(age*Math.PI)*UH*(.7+noise(i+2)*.5)+age*age*UH*.25;
          shard(px,py,2+noise(i+29)*7,ang+age*4,i%4?'#79d4e0':'#e2ffff',(1-age)*fade*.86);
          if(i%3===0)line([[px-Math.cos(ang)*8,py+8],[px,py]],'#b9f7fa',.7,(1-age)*fade*.4);
        }
        for(let k=0;k<4;k++){
          const age=clamp((t-1800-k*170)/1800);ellipse(UX,floor+10,UR*(.22+age*1.2),UR*(.04+age*.21),'#b6f0f1',1.2,fade*(1-age)*.7);
        }
        glow('#c9ffff',targetX,floor-12,UR*.34,UR*.22,Math.max(0,1-(t-1800)/700)*.32);
      }
    }
    function maxWood(t){
      const roots=ease(t/1050),growth=ease((t-600)/1300),opening=ease((t-1650)/700),fade=ultimateFade(t);
      c.globalCompositeOperation='source-over';
      // 先に地面を走る根。太い蔦は別々の傾き・高さで時間差をつけて編む。
      for(let i=0;i<7;i++){
        const ang=i*TAU/7+.15,dist=UR*(.7+noise(i)*.8)*roots,ex=UX+Math.cos(ang)*dist,ey=floor+Math.sin(ang)*dist*.18;
        curve([[UX,floor],[UX+Math.cos(ang)*dist*.2,floor+Math.sin(ang)*dist*.06],[ex-Math.cos(ang)*dist*.3,ey+8],[ex,ey]],'#253524',9-roots*2,fade*.82);
        curve([[UX,floor],[UX+Math.cos(ang)*dist*.2,floor+Math.sin(ang)*dist*.06],[ex-Math.cos(ang)*dist*.3,ey+8],[ex,ey]],'#81995b',1.4,fade*.68);
      }
      if(t>500)for(let k=0;k<3;k++){
        const progress=ease((t-520-k*230)/1180),height=UH*(.75+noise(k)*.25)*progress,width=height*(textures.ki?textures.ki.width/textures.ki.height:.88)*(.78+k*.04);
        const bx=UX+(k-1)*UR*.30+Math.sin(t*.002+k)*UR*.035,lean=(k-1)*.19+Math.sin(t*.0015+k)*.055;
        texture('ki',bx,floor+6-k*5,width,height,t+k*700,fade*.87,lean);
        if(!textures.ki)curve([[bx,floor],[bx-UR*.3,floor-height*.2],[bx+UR*.35,floor-height*.65],[bx+Math.sin(k)*35,floor-height]],'#4f7140',18,fade*.8);
        for(let j=1;j<6;j++){
          const v=j/6;if(v>progress)continue;const dir=j%2?1:-1,px=bx+Math.sin(v*3+k)*UR*.14,py=floor-height*v;
          const branch=UR*(.16+noise(j+k*12)*.16)*ease((progress-v)*7);
          curve([[px,py],[px+dir*branch*.4,py+3],[px+dir*branch*.7,py-UH*.1],[px+dir*branch,py-UH*.08]],'#5e7941',2.5,fade*.8);
          leaf(px+dir*branch,py-UH*.08,(5+opening*6)*growth,j*.8+k,fade*.9);
        }
      }
      if(t>=1650){
        for(let i=0;i<75;i++){
          const age=clamp((t-1700-noise(i)*450)/2100),ang=noise(i+30)*TAU,px=UX+Math.cos(ang)*UR*(.2+age*1.4)+Math.sin(t*.005+i)*10,py=floor-UH*(.25+noise(i+5)*.8)-Math.sin(age*Math.PI)*UH*.22+age*age*UH*.65;
          if(i%3)leaf(px,py,3+noise(i)*7,ang+age*4,(1-age)*fade*.8);
          else{c.globalCompositeOperation='screen';glow('#d7e994',px,py,1+noise(i)*2,1+noise(i)*2,(1-age)*fade*.75);c.globalCompositeOperation='source-over';}
        }
        c.globalCompositeOperation='screen';glow('#b9e999',targetX,floor-UH*.3,UR*.34,UH*.4,Math.max(0,1-(t-1800)/900)*.20);
      }
    }
    function maxEarth(t){
      const gathered=ease(t/850),final=clamp((t-3150)/850),fade=t<3150?1:Math.pow(1-final,.8),strikes=[1100,1800,2500];
      c.globalCompositeOperation='source-over';
      if(t<1000)for(let i=0;i<22;i++){
        const angle=noise(i+4)*TAU+t*.0012,r=UR*(.25+noise(i+8)*.6)*(1-gathered*.48),px=UX+Math.cos(angle)*r,py=floor-UH*.30+Math.sin(angle)*r*.24-gathered*UH*.30;
        boulder(px,py,3+noise(i)*10,angle,gathered*.75,1,i*31);
      }
      for(let k=0;k<3;k++){
        const hit=strikes[k],start=hit-[700,800,920][k],ex=UX+UR*[-.18,.33,.10][k],ey=floor-UR*.10;
        if(t>start&&t<hit+85){
          const v=Math.pow(clamp((t-start)/(hit-start)),2),sx=[UX-UR*1.1,w+UR*.15,UX-UR*.42][k],sy=-UR*[.18,.30,.5][k],px=sx+(ex-sx)*v,py=sy+(ey-sy)*v;
          const dx=ex-sx,dy=ey-sy,len=Math.hypot(dx,dy),size=UR*([.22,.29,.34][k]+v*.10),tail=UR*(.7+v*1.2);
          c.globalCompositeOperation='screen';chargeLine([[px-dx/len*tail,py-dy/len*tail],[px,py]],'#ed7430',22+k*5,.74);glow('#d85b22',px,py,size*1.35,size*1.40,.55);c.globalCompositeOperation='source-over';boulder(px,py,size,t*.0006*(k%2?-1:1),clamp((t-start)/150),1,k*31);
        }
        if(t>=hit){
          const age=clamp((t-hit)/1100),a=Math.max(0,1-age);
          for(let j=0;j<2;j++){const wave=clamp((t-hit-j*100)/850);ellipse(ex,floor+8,UR*(.12+wave*(.8+k*.2)),UR*(.03+wave*.17),'#b49c76',2,a*fade*.62);}
          c.globalCompositeOperation='source-over';
          for(let i=0;i<5;i++){const v=ease((t-hit-noise(i)*60)/260),size=UR*(.07+noise(i+k*6)*.14);boulder(ex+(noise(i+k*12)-.5)*UR*.70,floor+8-size*.17,size*v,noise(i)*2,fade,.5+noise(i)*.2,i+k*19);}
          for(let i=0;i<23;i++){
            const v=clamp((t-hit-noise(i)*150)/1300),dir=noise(i+k*32)*2-1,px=ex+dir*UR*v*(1.0+k*.18),py=floor-Math.sin(v*Math.PI)*UH*(.4+noise(i+19)*.8)+v*v*UR*.12;
            if(i%5===0)boulder(px,py,3+noise(i)*8,t*.002+i,(1-v)*fade,1,i*17);else rock(px,py,2+noise(i)*5,t*.003+i,(1-v)*fade);
          }
          for(let i=0;i<5;i++)glow('#957654',ex+(noise(i+k*7)-.5)*UR*(.8+age),floor+9-age*UH*.10,UR*(.12+age*.20),UR*(.035+age*.06),fade*age*(1-age)*.55);
          c.globalCompositeOperation='screen';glow('#f5bb76',ex,floor-8,UR*(.25+ease(age*4)*.30),UR*.18,a*.40);
        }
      }
      if(t>=2500&&ultimateTextures.dome){
        const expansion=clamp((t-2500)/650),radius=w*(.028+.84*Math.pow(expansion,1.34)),domeWidth=radius*2/.90,domeHeight=radius*.97/.60;
        c.globalCompositeOperation='source-over';c.save();c.translate(UX,floor);c.globalAlpha=ease((t-2500)/95)*fade;
        // 原画の接地底面(.50,.80)を固定。半球の質量が地面から一気に膨張する。
        c.drawImage(ultimateTextures.dome,-domeWidth*.50,-domeHeight*.80,domeWidth,domeHeight);c.restore();
        box.magicDomeState={origin:[UX,floor],radius,width:domeWidth,height:domeHeight,expansion,imageBased:true};
      }
      if(t>=3150){
        const expansion=ease(final),cy=y;
        c.globalCompositeOperation='screen';glow('#f08638',UX,cy,UR*(.3+expansion*1.15),UH*(.45+expansion*.32),fade*.62);glow('#fff0bb',UX,cy,UR*(.18+expansion*.24),UH*.35,Math.max(0,1-final*3)*.86);
        for(let i=0;i<60;i++){
          const ang=noise(i+44)*TAU,dist=UR*(.1+expansion*(.5+noise(i)*1.0)),px=UX+Math.cos(ang)*dist,py=cy+Math.sin(ang)*dist*.65+final*final*UH*.4;
          c.globalCompositeOperation='source-over';if(i%4===0)boulder(px,py,3+noise(i)*12,t*.003+i,fade,1,i*21);else rock(px,py,2+noise(i)*5,t*.004+i,fade);
          c.globalCompositeOperation='screen';chargeLine([[px-Math.cos(ang)*9,py-Math.sin(ang)*7],[px,py]],'#f4a555',1.2,fade*.58);
        }
      }
    }
    let lightningMaskCanvas=null;
    function maskedLightning(bolt,progress,wide,pulse=null,arrival=false){
      if(!lightningMaskCanvas){lightningMaskCanvas=document.createElement('canvas');lightningMaskCanvas.width=Math.min(768,bolt.width);lightningMaskCanvas.height=Math.round(lightningMaskCanvas.width*bolt.height/bolt.width);}
      const m=lightningMaskCanvas,mc=m.getContext('2d'),mw=m.width,mh=m.height;
      mc.globalCompositeOperation='source-over';mc.globalAlpha=1;mc.clearRect(0,0,mw,mh);mc.drawImage(bolt,0,0,mw,mh);
      mc.globalCompositeOperation='destination-in';
      // 雷筋のalphaを残して先端を45pxほどで減衰。矩形clipの直線を露出しない。
      if(progress<1){const head=(.11+.79*ease(progress))*mw,feather=Math.max(8,Math.min(mw*.42,45/Math.max(1,wide)*mw)),g=mc.createLinearGradient(head-feather,0,head,0);g.addColorStop(0,'#000');g.addColorStop(1,'transparent');mc.fillStyle=g;mc.fillRect(0,0,mw,mh);}
      if(pulse!==null){const center=(.11+.79*pulse)*mw,g=mc.createLinearGradient(center-mw*.11,0,center+mw*.08,0);g.addColorStop(0,'transparent');g.addColorStop(.42,'#000');g.addColorStop(.60,'#000');g.addColorStop(1,'transparent');mc.fillStyle=g;mc.fillRect(0,0,mw,mh);}
      if(arrival){const g=mc.createLinearGradient(mw*.46,0,mw*.64,0);g.addColorStop(0,'transparent');g.addColorStop(1,'#000');mc.fillStyle=g;mc.fillRect(0,0,mw,mh);}
      mc.globalCompositeOperation='source-over';return m;
    }
    function maxLightning(t){
      const core=thunderTextures.plasma,bolt=thunderTextures.thunder;if(!core||!bolt){maxLightningFallback(t);return;}
      const cx=targetX,cy=y,basis=Math.max(UR,w*.46),growth=Math.pow(clamp(t/2650),1.45),release=clamp((t-2650)/500),tail=t<3150?1:Math.max(0,1-(t-3150)/850);
      const radius=basis*(.515+1.05*growth),coreAlpha=ease(t/200)*(1-ease((t-2900)/450)),size=radius*2/.70;
      const corners=[[12,42],[w-12,42],[12,h-36],[w-12,h-36]],endpoints=[],flows=[],arrivals=[];
      c.globalCompositeOperation='source-over';
      for(let k=0;k<4;k++){
        const start=300+k*150,progress=clamp((t-start)/650),a=ease((t-start)/150)*(1-ease((t-2800)/250));if(a<=0)continue;
        const [sx,sy]=corners[k],len=Math.hypot(cx-sx,cy-sy),angle=Math.atan2(cy-sy,cx-sx),aspect=bolt.width/bolt.height,anchorAngle=Math.atan2(.05/aspect,.79),scaleLen=Math.hypot(.79,.05/aspect),wide=len/scaleLen,thick=wide/aspect;
        c.save();c.translate(sx,sy);c.rotate(angle-anchorAngle);
        // 発光先端が角から核へ進む。各幹の向きは生成原画の実測アンカーに一致。
        c.globalAlpha=a*(.80+.15*Math.sin(t*.027+k*1.8));c.drawImage(maskedLightning(bolt,progress,wide),-wide*.11,-thick*.48,wide,thick);
        const pulse=((t-start)/440)%1;
        c.save();c.globalCompositeOperation='screen';c.globalAlpha=a*.85;c.drawImage(maskedLightning(bolt,progress,wide,pulse),-wide*.11,-thick*.48,wide,thick);c.restore();c.restore();
        endpoints.push([cx,cy]);flows.push({start,progress,origin:[sx,sy],destination:[cx,cy]});arrivals.push({sx,sy,angle:angle-anchorAngle,wide,thick,a,progress});
      }
      if(coreAlpha>0){
        c.save();c.translate(cx,cy);c.rotate(Math.sin(t*.002)*.075+t*.00012);c.globalAlpha=coreAlpha;c.drawImage(core,-size*.50,-size*.53,size,size);c.restore();
        c.globalCompositeOperation='screen';glow('#edfbff',cx,cy,radius*.35,radius*.37,coreAlpha*(.14+growth*.20));c.globalCompositeOperation='source-over';
      }
      // 大核の前面にも到達の雷筋を残し、上側の短い2方向が核に消えないようにする。
      for(const p of arrivals){if(p.progress<.72)continue;c.save();c.translate(p.sx,p.sy);c.rotate(p.angle);c.globalAlpha=p.a*.38*coreAlpha;c.drawImage(maskedLightning(bolt,p.progress,p.wide,null,true),-p.wide*.11,-p.thick*.48,p.wide,p.thick);c.restore();}
      const coverage=Math.hypot(Math.max(cx,w-cx),Math.max(cy,h-cy)),waveRadius=t>=2650?radius+(coverage-radius)*Math.pow(release,1.08):0;
      if(t>=2650){
        // 生成電弧を円の前縁へ曲げ、均一線ではない白青の衝撃波として解放。
        const alpha=tail*(1-release*.15),sectors=24;
        for(let k=0;k<sectors;k++){
          const angle=k*TAU/sectors,arcLen=waveRadius*TAU/sectors*1.18,radial=12+basis*.10+noise(k)*basis*.035;
          c.save();c.translate(cx+Math.cos(angle)*waveRadius,cy+Math.sin(angle)*waveRadius);c.rotate(angle+Math.PI*.5);c.globalAlpha=alpha*(.70+noise(k)*.25);
          c.drawImage(bolt,bolt.width*.22,bolt.height*.13,bolt.width*.57,bolt.height*.72,-arcLen*.5,-radial*.5,arcLen,radial);c.restore();
        }
        c.globalCompositeOperation='screen';const g=c.createRadialGradient(cx,cy,0,cx,cy,Math.max(1,waveRadius));g.addColorStop(0,'rgba(233,248,255,.02)');g.addColorStop(.75,'rgba(197,236,255,.06)');g.addColorStop(.94,'rgba(195,239,255,.15)');g.addColorStop(1,'transparent');c.fillStyle=g;c.globalAlpha=alpha;c.beginPath();c.arc(cx,cy,waveRadius,0,TAU);c.fill();c.globalAlpha=1;
      }
      box.magicLightningState={center:[cx,cy],incomingEndpoints:endpoints,flows,sphereRadius:radius,waveRadius,coverageRadius:coverage,imageBased:true};
    }
    function maxLightningFallback(t){
      const cx=targetX,cy=y,inflow=clamp((t-1500)/1150),opening=clamp((t-2650)/500),fade=t<3150?1:Math.max(0,1-(t-3150)/850);
      const sphereR=Math.max(UR,w*.46)*(.515+1.05*Math.pow(clamp(t/2650),1.45)),visible=ease(t/180)*(1-ease((t-2850)/500));
      const farthest=Math.hypot(Math.max(cx,w-cx),Math.max(cy,h-cy)),waveR=t>=2650?sphereR+(farthest-sphereR)*Math.pow(opening,1.22):0;
      const flicker=Math.floor(t/58),starts=[[12,42],[w-12,42],[12,h-36],[w-12,h-36]],ends=[];
      c.globalCompositeOperation='source-over';
      if(t>=1500&&t<2950){
        const a=ease((t-1500)/180)*(1-ease((t-2650)/300))*(.78+.22*Math.sin(t*.031));
        for(let k=0;k<4;k++){
          const [sx,sy]=starts[k],dx=cx-sx,dy=cy-sy,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len,pts=[];
          for(let j=0;j<=18;j++){const v=j/18,bend=j===0||j===18?0:(noise(j+k*81+flicker*23)-.5)*UR*.20;pts.push([sx+dx*v+nx*bend,sy+dy*v+ny*bend]);}
          ends.push(pts[18]);line(pts,'#343098',8,a*.65);line(pts,'#8c79f2',4.8,a*.94);c.shadowColor='#b5a2ff';c.shadowBlur=8;line(pts,'#fff5ff',2.4,a);c.shadowBlur=0;
          for(let j=3;j<16;j+=4){
            const p=pts[j],side=(j+k)%2?1:-1,size=UR*(.12+noise(j+k*9)*.16),branch=[p,[p[0]+nx*side*size*.40-dx/len*size*.14,p[1]+ny*side*size*.40-dy/len*size*.14],[p[0]+nx*side*size*.75,p[1]+ny*side*size*.75],[p[0]+nx*side*size+dx/len*size*.16,p[1]+ny*side*size+dy/len*size*.16]];
            line(branch,'#4b36af',4.8,a*.80);line(branch,'#c2b3ff',2.1,a);line(branch,'#fffaff',.75,a);
          }
          const pulse=((t-1500)/420+k*.23)%1,px=sx+dx*pulse,py=sy+dy*pulse;glow('#d6bcff',px,py,5+inflow*4,5+inflow*4,a*.65);
        }
      }
      if(visible>0){
        // 紫青の厚い球殻と白い核。球の表面・内部の電弧は別に揺れる。
        c.save();const g=c.createRadialGradient(cx-sphereR*.22,cy-sphereR*.28,sphereR*.03,cx,cy,sphereR);
        g.addColorStop(0,'rgba(250,239,255,.92)');g.addColorStop(.21,'rgba(191,151,253,.82)');g.addColorStop(.48,'rgba(109,80,211,.71)');g.addColorStop(.77,'rgba(42,41,120,.80)');g.addColorStop(.93,'rgba(115,82,225,.89)');g.addColorStop(1,'rgba(173,140,249,0)');c.fillStyle=g;c.globalAlpha=visible;c.beginPath();c.arc(cx,cy,sphereR,0,TAU);c.fill();c.restore();
        for(let k=0;k<10;k++){
          const pts=[],phase=t*.003+k*.87,angle=k*TAU/10;
          for(let j=0;j<=16;j++){const v=j/16,phi=(v-.5)*Math.PI,ex=Math.sin(phi)*sphereR*.87,ey=Math.cos(phi)*sphereR*(.15+.63*Math.sin(phase)),rotation=angle+t*.0005;pts.push([cx+ex*Math.cos(rotation)-ey*Math.sin(rotation)+(noise(j+k*27+flicker)-.5)*sphereR*.06,cy+ex*Math.sin(rotation)+ey*Math.cos(rotation)+(noise(j+k*17+flicker)-.5)*sphereR*.06]);}
          line(pts,'#5d42bb',3.8,visible*.48);line(pts,'#d5c0ff',1.8,visible*.78);line(pts,'#fff2ff',.65,visible*.92);
        }
        for(let k=0;k<8;k++){
          const pts=[],start=k*TAU/8+t*.0025;
          for(let j=0;j<=10;j++){const theta=start+j/10*TAU*.073,r=sphereR*(.94+noise(j+k*19+flicker)*.09);pts.push([cx+Math.cos(theta)*r,cy+Math.sin(theta)*r]);}
          line(pts,'#533cb3',5.2,visible*.8);line(pts,'#e2caff',1.7,visible*.93);line(pts,'#fff4ff',.65,visible);
        }
        c.globalCompositeOperation='screen';glow('#ecd5ff',cx-sphereR*.15,cy-sphereR*.17,sphereR*.28,sphereR*.29,visible*.54);c.globalCompositeOperation='source-over';
      }
      if(t>=2650){
        // 同じ中心から真円の光が全画面へ広がる。暗幕や半円は使わない。
        const a=fade*(1-opening*.22),g=c.createRadialGradient(cx,cy,0,cx,cy,Math.max(1,waveR));
        g.addColorStop(0,'rgba(246,237,255,.08)');g.addColorStop(.6,'rgba(225,204,255,.10)');g.addColorStop(.87,'rgba(215,194,253,.18)');g.addColorStop(.97,'rgba(217,196,255,.35)');g.addColorStop(1,'rgba(238,224,255,0)');c.fillStyle=g;c.globalAlpha=a;c.beginPath();c.arc(cx,cy,waveR,0,TAU);c.fill();c.globalAlpha=1;
        for(let k=0;k<3;k++){const r=waveR*(1-k*.045);if(r<=0)continue;ellipse(cx,cy,r,r,k===0?'#6d50c9':'#cfc0fa',k===0?8:2.3,a*(1-k*.20));}
        for(let k=0;k<18;k++){
          const ang=k*TAU/18+t*.002,pts=[];for(let j=0;j<=6;j++){const th=ang+j*.010,r=waveR*(.98+(noise(j+k*9+flicker)-.5)*.035);pts.push([cx+Math.cos(th)*r,cy+Math.sin(th)*r]);}line(pts,'#fff5ff',1.3,a*.86);
        }
        c.globalCompositeOperation='screen';glow('#f9e5ff',cx,cy,sphereR*(.35+opening*.45),sphereR*(.35+opening*.45),fade*Math.max(0,1-opening)*.75);
      }
      box.magicLightningState={center:[cx,cy],incomingEndpoints:ends,sphereRadius:sphereR,waveRadius:waveR,coverageRadius:farthest};
    }
    function render(ms){
      const t=clamp(ms,0,duration),q=clamp(t/impact),u=(t-impact)/560,tail=clamp((t-impact)/(duration-impact));
      c.clearRect(0,0,w,h);
      if(ultimate)({ 'ひ':maxFire,'みず':maxWater,'き':maxWood,'岩':maxEarth,'かみなり':maxLightning }[type]||maxLightning)(t);
      else{ambient(t,q,tail);({'ひ':fire,'みず':water,'き':wood,'岩':earth,'かみなり':lightning}[type]||lightning)(t,q,u,tail);}
      if(ultimate){
        const elapsed=t-spec.flashAt,flash=elapsed<0?0:elapsed<40?elapsed/40:elapsed<90?1:Math.max(0,1-(elapsed-90)/240);
        box.style.zIndex=flash>0?'2147480000':type==='かみなり'&&t<3480?'55':'4';
        if(flash>0){c.globalCompositeOperation='source-over';c.globalAlpha=flash;c.fillStyle='#ffffff';c.fillRect(0,0,w,h);}
      }
      c.globalAlpha=1;c.globalCompositeOperation='source-over';
      box.magicTargetState={enemyCenter:[targetX,y],feet:[targetX,floor],originX:x,ultimateX:UX};
      box.dataset.phase=t<impact?'charge':t<impact+400?'impact':'afterglow';
    }
    function frame(now){
      if(stopped)return;
      if(!box.isConnected||!screen.classList.contains('active')||(seq!==null&&seq!==spawnSeq)){stop();return;}
      const t=now-started;if(t>=duration){stop();return;}
      render(t);
      if(rank===2&&!shook&&t>=impact){shook=true;if(app)app.classList.add('shake');shakeTimer=setTimeout(()=>{if(app)app.classList.remove('shake');},280);}
      raf=requestAnimationFrame(frame);
    }
    // 検品は実描画を同じ関数で任意時点へ進める。ゲーム中は自動で再生。
    box.magicSeek=ms=>{cancelAnimationFrame(raf);clearTimeout(cleanup);render(ms);};
    box.magicStop=stop;box.dataset.duration=duration;box.dataset.targetX=targetX.toFixed(1);box.dataset.targetY=floor.toFixed(1);
    active={box,stop};render(0);raf=requestAnimationFrame(frame);cleanup=setTimeout(stop,duration+80);
    return box;
  }
  window.KanjimonMagic={play,timing,stop:()=>{if(active)active.stop();},loadedTextures:()=>Object.keys(textures),loadedThunderTextures:()=>Object.keys(thunderTextures),loadedUltimateTextures:()=>Object.keys(ultimateTextures)};
})();
