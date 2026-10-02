/* 相性魔法 2026-10-02。描画専用：戦闘判定・音・ダメージは本体に残す。 */
(function(){
  'use strict';
  let active=null;
  const textures={};
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
  const TAU=Math.PI*2, clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const ease=v=>1-Math.pow(1-clamp(v),3);
  const noise=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
  const TIMING={
    weak:{duration:1600,impact:470,hitDelay:110,soundCues:[{level:'mid',at:0,volume:.45}]},
    mid:{duration:2000,impact:850,hitDelay:490,soundCues:[{level:'max',at:0,volume:.55}]},
    max:{duration:4000,impact:1800,hitDelay:1440,soundCues:[{level:'mid',at:0,volume:.22},{level:'max',at:1000,volume:.55},{level:'mid',at:2450,volume:.18}]}
  };
  Object.values(TIMING).forEach(t=>{t.soundCues.forEach(Object.freeze);Object.freeze(t.soundCues);Object.freeze(t);});Object.freeze(TIMING);
  const timing=level=>TIMING[level]||TIMING.mid;
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
    const ultimate=level==='max',rank=level==='weak'?1:2,spec=timing(level),duration=spec.duration;
    const impact=spec.impact,S=[.52,.78,1.18][rank];
    const targetX=er&&er.width?er.left+er.width*.5-sr.left:w*.78;
    const x=rank===2?Math.min(targetX,w*.56):targetX;
    const floor=clamp(er&&er.height?er.bottom-sr.top-8:effectH*.55,65,effectH-26);
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
    function stop(){if(stopped)return;stopped=true;cancelAnimationFrame(raf);clearTimeout(cleanup);clearTimeout(shakeTimer);box.remove();if(shook&&app)app.classList.remove('shake');if(active&&active.box===box)active=null;}
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
        const b=(i/(n-1)-.5),height=Math.min(floor-74,R*2.15)*(.44+noise(i+24)*.56)*rise*(.92+.08*Math.sin(t*.013+i));
        const bx=x+b*R*.92,by=floor-4+noise(i+92)*15,wind=Math.sin(t*.012+i)*R*.10,thick=R*(.035+noise(i+45)*.055);
        if(textured){texture('hi',bx,by,R*(.85+noise(i)*.25),Math.min(floor-68,R*1.6)*rise*(.75+noise(i+24)*.25),t+i*70,energy*(i===1?.92:.66),b*.18+Math.sin(t*.008+i)*.045);continue;}
        c.beginPath();c.moveTo(bx-thick,by-5);c.bezierCurveTo(bx-thick*2+wind,by-height*.23,bx+thick*2+wind,by-height*.63,bx+b*R*.2+wind,by-height);c.bezierCurveTo(bx-thick*.3+wind,by-height*.65,bx+thick*2,by-height*.32,bx+thick,by-7);c.quadraticCurveTo(bx,by+7,bx-thick,by-5);c.closePath();
        const g=c.createLinearGradient(0,by,0,by-height);g.addColorStop(0,'rgba(240,75,17,0)');g.addColorStop(.12,'#ff8832');g.addColorStop(.28,i%3?'#ffd35c':'#fff2b8');g.addColorStop(.48,'#ffad2f');g.addColorStop(.8,'#ef471d');g.addColorStop(1,'rgba(180,21,16,0)');c.fillStyle=g;c.globalAlpha=energy*(.3+noise(i)*.4);c.fill();c.globalAlpha=1;
      }
      for(let i=0;i<(rank+1)*16;i++){const age=clamp((t-impact-noise(i)*280)/800),ang=noise(i+12)*TAU;const px=x+Math.cos(ang)*R*age,py=floor-R*.3-R*(1.2+noise(i))*age;bright([[px,py+4],[px-2*Math.sin(ang),py]],'#ff9538',1.2,(1-age)*energy);}
      glow('#ffe9ac',x,floor-8,R*.42,R*.30,Math.max(0,1-u*4)*.65);
      if(rank===2)bright([[x+R*.3,floor-15],[targetX-18,floor-33],[targetX,floor-8]],'#ffb73d',8,Math.max(0,1-u)*.7);
    }
    function water(t,q,u,tail){
      c.globalCompositeOperation='screen';const a=t<impact?ease(q):Math.max(0,1-tail);
      const height=Math.min(floor-72,R*(rank===0?.65:rank===1?1.2:1.8)),progress=t<impact?q*.5:ease(u*3);
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
        const height=Math.min(floor-64,R*(rank===0?.85:rank===1?1.4:2))*grown;
        const width=height*(textures.ki.width/textures.ki.height)*.92;
        texture('ki',x,floor+8,width,height,t,a,Math.sin(t*.003)*.045);
      }
      for(let k=0;k<n;k++){
        const height=Math.min(floor-24,R*(rank===0?.72:rank===1?1.45:2.15)*(1+noise(k)*.2)),progress=ease((t-(impact*.12+k*25))/(impact+150));
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
    const UH=Math.max(50,Math.min(floor-52,UR*1.45));
    const UX=Math.min(targetX-UR*.26,w*.56), UY=floor-UH*.46;
    const ultimateFade=t=>1-ease((t-2600)/1400);
    function chargeLine(points,color,width,a){
      line(points,color,width*7,a*.035);line(points,color,width*3,a*.10);line(points,color,width,a*.65);line(points,'#fff7de',width*.28,a*.9);
    }
    function curve(points,color,width,a){
      c.beginPath();c.moveTo(points[0][0],points[0][1]);c.bezierCurveTo(...points[1],...points[2],...points[3]);stroke(color,width,a);
    }
    function maxFire(t){
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
      const gathered=ease(t/1150),age=clamp((t-1800)/1500),fade=ultimateFade(t);
      c.globalCompositeOperation='source-over';
      if(t<1700)for(let i=0;i<22;i++){
        const angle=noise(i+4)*TAU+t*.0012,r=UR*(.25+noise(i+8)*.6)*(1-gathered*.48),px=UX+Math.cos(angle)*r,py=floor-UH*.30+Math.sin(angle)*r*.24-gathered*UH*.30;
        boulder(px,py,3+noise(i)*10,angle,gathered*.75,1,i*31);
      }
      if(t>850&&t<1880){
        const v=Math.pow(clamp((t-850)/950),2.0),sx=UX-UR*.9,sy=-UR*.18,ex=targetX-UR*.10,ey=floor-UR*.13,px=sx+(ex-sx)*v,py=sy+(ey-sy)*v;
        const dx=ex-sx,dy=ey-sy,len=Math.hypot(dx,dy),size=UR*(.23+v*.19),tail=UR*(.8+v*1.2);
        c.globalCompositeOperation='screen';chargeLine([[px-dx/len*tail,py-dy/len*tail],[px,py]],'#ec7538',30,.70);glow('#dc6028',px,py,size*1.45,size*1.5,.55);c.globalCompositeOperation='source-over';boulder(px,py,size,t*.00065,clamp((t-850)/200));
      }
      if(t>=1800){
        for(let k=0;k<3;k++){
          const wave=clamp((t-1800-k*110)/1000),a=Math.max(0,1-wave);ellipse(targetX-UR*.20,floor+9,UR*(.15+wave*1.4),UR*(.04+wave*.26),'#b19b76',2.1,a*fade*.58);
        }
        for(let i=0;i<9;i++){
          const v=ease((t-1800-noise(i)*90)/360),size=UR*(.08+noise(i+7)*.16),px=UX+(noise(i+12)-.5)*UR*1.5,py=floor+Math.sin(i*2.5)*UR*.08-size*.16;
          boulder(px,py,size*v,noise(i)*2-1,fade,.45+noise(i+21)*.30,i*19);
        }
        // 放物線の飛び方と着地点がばらばらな重い破片。
        for(let i=0;i<65;i++){
          const v=clamp((t-1800-noise(i)*250)/1800),dir=noise(i+32)*2-1,px=targetX-UR*.15+dir*UR*v*1.7,py=floor-Math.sin(v*Math.PI)*UH*(.3+noise(i+19)*.8)+v*v*UR*.12;
          if(i%5===0)boulder(px,py,4+noise(i)*10,t*.002+i,(1-v)*fade,1,i*17);else rock(px,py,2+noise(i)*5,t*.003+i,(1-v)*fade);
        }
        for(let i=0;i<13;i++){
          const v=clamp((t-1950-noise(i)*250)/1500),px=UX+(noise(i+24)-.5)*UR*(1.4+v),py=floor+8-v*UH*.11;
          glow('#9f8260',px,py,UR*(.12+v*.18),UR*(.03+v*.07),fade*v*(1-v)*.65);
        }
        c.globalCompositeOperation='screen';glow('#f9c88a',targetX,floor-10,UR*(.35+ease(age*4)*.5),UR*.22,Math.max(0,1-age*3)*.45);
      }
    }
    function maxLightning(t){
      const gather=ease(t/1300),unfold=ease((t-1800)/700),fade=ultimateFade(t),chargeY=Math.max(64,floor-UH*.58);
      // 明るい空にも残る青紫の電離芯。背景を暗く塗る面は作らない。
      c.globalCompositeOperation='source-over';
      if(t<1840){
        for(let i=0;i<17;i++){
          const ang=noise(i+8)*TAU,r=UR*(.7+noise(i+10))*(1-gather*.42),px=UX+Math.cos(ang)*r,py=chargeY+Math.sin(ang)*r*.58,v=(t/750+noise(i))%1;
          const length=.28+v*.50,ex=px+(UX-px)*length,ey=py+(chargeY-py)*length;
          const pts=[[px,py],[px+(ex-px)*.28+Math.sin(i)*10,py+(ey-py)*.28-6],[px+(ex-px)*.62-7,py+(ey-py)*.62+5],[ex,ey]];
          line(pts,'#292ca6',4.5,gather*.72);line(pts,'#887bff',2.3,gather*.88);line(pts,'#f4f1ff',.9,gather*.96);
        }
        glow('#352d9b',UX,chargeY,UR*(.12+gather*.20),UH*.31,gather*.65);
        glow('#8e72fa',UX,chargeY,9+gather*22,9+gather*22,gather*.92);glow('#f4edff',UX,chargeY,3+gather*10,3+gather*10,gather*.95);
      }
      if(t>=1530&&t<3350){
        const flicker=Math.floor(t/68),flash=(t%68<44?1:.72),a=clamp((t-1530)/270)*Math.max(0,1-(t-2600)/750)*flash;
        const pts=[];for(let i=0;i<=18;i++){const v=i/18;pts.push([UX+(targetX-UX)*v+(i===0||i===18?0:(noise(i+flicker*31)-.5)*UR*.19),60+(floor-60)*v]);}
        c.shadowColor='#7161ee';c.shadowBlur=19;line(pts,'#3531a1',18,a*.52);c.shadowBlur=0;
        line(pts,'#6550d8',12,a*.94);line(pts,'#bcb0ff',7,a);line(pts,'#ffffff',3.3,a);
        for(let k=3;k<16;k+=3){
          const p=pts[k],dir=k%2?1:-1,len=UR*(.18+noise(k+flicker)*.3),branch=[p,[p[0]+dir*len*.30,p[1]-len*.12],[p[0]+dir*len*.61,p[1]+len*.04],[p[0]+dir*len,p[1]+len*.29]];
          for(let j=1;j<branch.length;j++){const pair=[branch[j-1],branch[j]],bw=6.8-j*1.5;line(pair,'#4135ac',bw*1.6,a*.78);line(pair,'#afa1ff',bw,a*.9);line(pair,'#fffaff',bw*.38,a);}
        }
      }
      if(t>=1800){
        const radius=Math.min(UR*(.20+unfold*1.35),Math.max(70,(floor-46)/.85)),split=clamp((t-2200)/1000),a=fade*(1-split*.45);
        // 膨張膜が一枚に広がり、遅れて部分ごとに裂けて光へほどける。
        c.save();c.translate(UX,floor);c.scale(1,.85);const dome=c.createRadialGradient(0,0,0,0,0,radius);dome.addColorStop(0,'rgba(96,69,200,0)');dome.addColorStop(.62,'rgba(74,53,153,.04)');dome.addColorStop(.86,'rgba(58,54,155,.26)');dome.addColorStop(.94,'rgba(91,72,212,.52)');dome.addColorStop(1,'transparent');c.fillStyle=dome;c.globalAlpha=a;c.beginPath();c.arc(0,0,radius,Math.PI,TAU);c.closePath();c.fill();c.restore();
        for(let k=0;k<14;k++){
          const start=Math.PI+k*Math.PI/14,end=start+Math.PI/14*(1-split*.8),r=radius+split*UR*noise(k)*.35;
          c.beginPath();c.ellipse(UX,floor,r,r*.85,0,start,end);stroke('#4936aa',5.5,a*(.5+noise(k)*.4));
          c.beginPath();c.ellipse(UX,floor,r,r*.85,0,start,end);stroke('#d2caff',1.6,a*(.7+noise(k)*.3));
        }
        for(let i=0;i<36;i++){
          const ang=noise(i+3)*TAU,len=UR*(.5+unfold*1.1),inner=12+unfold*UR*.3;
          const ray=[[UX+Math.cos(ang)*inner,chargeY+Math.sin(ang)*inner],[UX+Math.cos(ang)*len,chargeY+Math.sin(ang)*len]],ra=Math.max(0,1-(t-1800)/1450)*.65;
          line(ray,'#5745bd',i%5===0?3.1:1.4,ra);line(ray,'#e9e2ff',i%5===0?1.2:.55,ra*.9);
        }
        for(let i=0;i<28;i++){
          const v=clamp((t-2200-noise(i)*700)/1200),ang=noise(i+9)*TAU,px=UX+Math.cos(ang)*UR*(.4+v*.6),py=floor+Math.sin(ang)*UR*.17-UH*noise(i+4)*.45;
          const pts=[[px,py],[px-4,py-5],[px+2,py-10]];line(pts,'#5c46b1',2.2,(1-v)*fade*.78);line(pts,'#e6daff',.8,(1-v)*fade*.78);
        }
        glow('#eee6ff',targetX,floor-7,UR*.48,UR*.13,Math.max(0,1-(t-1800)/800)*.35);
      }
    }
    function render(ms){
      const t=clamp(ms,0,duration),q=clamp(t/impact),u=(t-impact)/560,tail=clamp((t-impact)/(duration-impact));
      c.clearRect(0,0,w,h);
      if(ultimate)({ 'ひ':maxFire,'みず':maxWater,'き':maxWood,'岩':maxEarth,'かみなり':maxLightning }[type]||maxLightning)(t);
      else{ambient(t,q,tail);({'ひ':fire,'みず':water,'き':wood,'岩':earth,'かみなり':lightning}[type]||lightning)(t,q,u,tail);}
      c.globalAlpha=1;c.globalCompositeOperation='source-over';
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
  window.KanjimonMagic={play,timing,stop:()=>{if(active)active.stop();},loadedTextures:()=>Object.keys(textures)};
})();
