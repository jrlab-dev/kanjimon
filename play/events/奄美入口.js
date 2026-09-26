/* 奄美最終章：全国協力の後、一人で到着してイージーと再会する独立イベント。 */
(function(global){
  'use strict';
  const $=id=>document.getElementById(id),q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const LINES=[
    ['AR00','イージー','来てくれたんだ。'],
    ['AR01','イージー','……もっと むずかしくても、たのしい？'],
    ['AR02','イージー','じゃあ、ここから たしかめるよ。']
  ];
  const MAP='images/worldmap-amami-v2.webp';
  const EASY_FACE='images/bust/easy.webp';
  const EASY_SHEET='npc-mob-easy.webp';

  function setupRoot(host){
    let root=$('amamiArrivalRoot');
    if(root)root.remove();
    root=document.createElement('div');
    root.id='amamiArrivalRoot';
    root.innerHTML='<div id="amamiMap"><img alt="奄美大島の地図"><b>アマミおおしま</b></div><div id="amamiShade"></div><div id="amamiTalk"><img id="amamiFace" alt=""><div><b id="amamiWho"></b><p id="amamiText"></p><small id="amamiNext">▼ つづく</small></div></div>';
    (host||document.body).appendChild(root);
    q('#amamiMap img',root).src=MAP;
    return root;
  }

  function placeEasy(x,y,scale=1.25,dir='down'){
    const grid=$('fieldGrid');
    if(!grid)return null;
    qa('.amami-easy',grid).forEach(n=>n.remove());
    const el=document.createElement('span');
    el.id='amamiEasy';
    el.className='interior-npc has-sheet nd-field-actor amami-actor amami-easy';
    el.style.setProperty('--ix',x);
    el.style.setProperty('--iy',y);
    el.style.setProperty('--npc-scale',scale);
    el.dataset.x=x;
    el.dataset.y=y;
    const visual=document.createElement('span');
    visual.className='interior-npc-visual';
    visual.style.backgroundImage=`url('images/sprites/${EASY_SHEET}')`;
    el.appendChild(visual);
    el.dataset.dir=dir;
    try{setInteriorActorPose(el,dir,'a');}catch(e){}
    grid.appendChild(el);
    global.AmamiMotion.mount(el);
    return el;
  }

  function heroWalkFrame(sp,frame){
    if(!sp)return;const mirror=frame&&(heroFacing==='up'||heroFacing==='down');
    sp.style.setProperty('--bgy',frame?'100%':'0%');sp.style.setProperty('--hero-lift',frame?'-2px':'0px');sp.style.setProperty('--hero-sx',mirror?'-1':'1');
  }

  function stopWalk(el){
    if(!el)return;
    if(el._amamiWalkTimer){clearInterval(el._amamiWalkTimer);el._amamiWalkTimer=null;}
    if(el.id==='fieldHero'){
      const sp=q('.hero-sprite',el);
      heroWalkFrame(sp,false);
    }else{
      try{setInteriorActorPose(el,el.dataset.dir||'up','a');}catch(e){}
    }
    el.dataset.moving='false';
  }

  function walkHero(from,to,duration){
    const hero=$('fieldHero');
    if(!hero)return null;
    stopWalk(hero);
    hero.style.transition='none';
    hero.style.setProperty('--hx',from.x);
    hero.style.setProperty('--hy',from.y);
    try{setHeroFacing(Math.sign(to.x-from.x),Math.sign(to.y-from.y));}catch(e){}
    const sp=q('.hero-sprite',hero);
    let frame=false;
    hero.dataset.moving='true';
    hero._amamiWalkTimer=setInterval(()=>{
      frame=!frame;
      heroWalkFrame(sp,frame);
    },140);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      hero.style.transition=`left ${duration}ms linear,top ${duration}ms linear`;
      hero.style.setProperty('--hx',to.x);
      hero.style.setProperty('--hy',to.y);
    }));
    return hero;
  }

  function walkEasy(el,to,duration){
    if(!el)return;
    if(global.AmamiMotion.ownsMove(el))return;
    stopWalk(el);
    return global.AmamiMotion.walk(el,to,duration);
  }

  function showField(background,label,gender='boy'){
    q('#amamiMap')?.classList.remove('show');
    if(!global.NationalDeparture||typeof global.NationalDeparture.showField!=='function')throw new Error('全国協力のフィールド部品がありません');
    const field=global.NationalDeparture.showField(102,{gender:gender==='girl'?'girl':'boy',hero:true,label,adults:0,mana:false,monsters:0,background,point:{x:15,y:6}});
    document.body.classList.add('amami-arrival-mode');
    return field;
  }

  function create(host,options={}){
    let root=setupRoot(host),generation=0,index=-1,timers=[],ready=false,running=false,doneSent=false;
    let gender=options.gender==='girl'?'girl':'boy',easy=null,hero=null;
    const state={cut:null,line:null,ready:false,running:false,done:false};
    const alive=g=>g===generation&&running;
    const later=(fn,ms,g=generation)=>{const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);if(alive(g))fn();},ms);timers.push(id);return id;};
    function setCut(name){state.cut=name;if(options.onCut)options.onCut(name,state);}
    function hideTalk(){global.AmamiVoice.stop();const t=q('#amamiTalk',root);if(t)t.classList.remove('show');const n=q('#amamiNext',root);if(n)n.classList.remove('ready');ready=false;state.ready=false;state.line=null;}
    function clearActors(){global.AmamiMotion.stop();qa('.amami-actor').forEach(n=>{stopWalk(n);n.remove();});hero=$('fieldHero');stopWalk(hero);easy=null;}
    function cleanup(){timers.forEach(clearTimeout);timers=[];clearActors();hideTalk();q('#amamiMap',root)?.classList.remove('show');root.classList.remove('active');document.body.classList.remove('amami-arrival-mode');}
    function auto(name,ms,fn){setCut(name);hideTalk();fn&&fn();const g=generation;later(()=>global.AmamiMotion.after(()=>{if(g===generation)run();}),ms);}
    function showMap(){root.classList.add('active');const map=q('#amamiMap',root);map.classList.remove('show');void map.offsetWidth;map.classList.add('show');}
    function line(i){
      const row=LINES[i],g=generation;
      setCut(row[0]);state.line=i;hideTalk();
      const box=q('#amamiTalk',root);
      q('#amamiFace',root).src=EASY_FACE;
      q('#amamiWho',root).textContent=row[1];
      q('#amamiText',root).textContent=row[2];
      box.classList.add('show');global.AmamiVoice.play(row[2],box);
      if(easy&&i<2)global.AmamiMotion.play(easy,i===0?'04':'14');
      later(()=>{if(g===generation){ready=true;state.ready=true;q('#amamiNext',root).classList.add('ready');}},Math.max(900,row[2].length*65),g);
    }
    function finish(){
      global.AmamiMotion.endEventCamera();
      ready=false;running=false;state.ready=false;state.running=false;state.done=true;state.line=null;setCut('DONE');
      if(!doneSent){doneSent=true;if(options.onDone)options.onDone();}
    }
    const plan=[
      ()=>auto('A00_AMAMI_MAP',3600,showMap),
      // 船は描かれていないため、主人公は港の陸地を左から歩いて入る。
      ()=>auto('A01_AKAKINA_PORT',1900,()=>{root.classList.add('active');heroChar=gender;const f=showField('amami-side-01-akakina-port.png','赤木名港',gender);hero=walkHero({x:f.cx-3,y:f.cy-.65},{x:f.cx,y:f.cy-.65},1700);later(()=>{stopWalk(hero);setHeroFacing(0,1);},1740);}),
      // イージーは港の広場で主人公を待つ。
      ()=>auto('A02_EASY_APPEAR',1300,()=>{const f=global.__ND_FIELD;easy=placeEasy(f.cx+1.65,f.cy+1.65,1.25,'up');if(easy){easy.style.opacity='0';requestAnimationFrame(()=>requestAnimationFrame(()=>{easy.style.transition='opacity .8s ease';easy.style.opacity='1';}));}}),
      ()=>line(0),
      ()=>line(1),
      ()=>line(2),
      // 会話後は海へ戻らず、画面下の陸地へイージーが先導し、主人公が続く。
      ()=>auto('A04_FOLLOW_EASY',3000,()=>{const f=global.__ND_FIELD;if(!f)return;walkEasy(easy,{x:f.cx+1.65,y:f.cy+4.6},2350);hero=walkHero({x:f.cx,y:f.cy-.65},{x:f.cx,y:f.cy+2.2},2350);later(()=>stopWalk(hero),2400);}),
      ()=>auto('A05_ASHITOKU',2600,()=>{const f=showField('amami-main-01-ashitoku.png','芦徳・海辺の宿場',gender);hero=$('fieldHero');try{setHeroFacing(0,-1);}catch(e){}easy=placeEasy(f.cx+1.65,f.cy-2.05,1.25);}),
      ()=>finish()
    ];
    function run(){if(!running)return;index++;if(index>=plan.length)return finish();plan[index]();}
    function start(cfg={}){
      cleanup();generation++;index=-1;doneSent=false;gender=cfg.gender==='girl'?'girl':(cfg.gender==='boy'?'boy':gender);heroChar=gender;
      root=setupRoot(host);root.addEventListener('click',next);running=true;ready=false;state.cut=null;state.line=null;state.ready=false;state.running=true;state.done=false;run();
    }
    function next(){if(!running||!ready||global.AmamiMotion.busy||global.AmamiVoice.busy)return false;ready=false;state.ready=false;q('#amamiNext',root)?.classList.remove('ready');run();return true;}
    root.addEventListener('click',next);
    return{state,start,restart:start,next,stop(){generation++;running=false;cleanup();state.running=false;},destroy(){generation++;running=false;cleanup();root.remove();},get lines(){return LINES;}};
  }
  global.AmamiArrival={create,lines:LINES,placeEasy,heroWalkFrame};
})(window);
