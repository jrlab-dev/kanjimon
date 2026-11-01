/* 後日談の舞台。冒険記録・フィールド位置へは書き込まない。 */
(function(global){
 'use strict';
 const BASE='images/ending-life/';
 const scenes=[
  {kind:'region',grade:6,zone:102,place:['オキナワ・首里城','OKINAWA · SHURI'],title:['あまい名前の、友達。','A sweet new friend'],char:'糖',crop:[1650,330],adult:'otona-f-a',style:'stroll',invite:['おかしを作ろう！', 'Let’s make sweets!'],end:['いっしょに、黒砂糖の\nおかしを作ろう！', 'Let’s make brown sugar sweets together!']},
  {kind:'region',grade:6,zone:98,place:['キュウシュウ・別府','KYUSHU · BEPPU'],title:['湯けむりの向こうから。','A friend in the steam'],char:'泉',crop:[900,750],adult:'ojii-a',style:'welcome',invite:['温泉に行こう！', 'Let’s visit the hot springs!'],end:['いっしょに、あったかい\n温泉に行こう！', 'Let’s visit the warm hot springs together!']},
  {kind:'region',grade:6,zone:84,place:['チュウゴク・鳥取砂丘','CHUGOKU · TOTTORI DUNES'],title:['砂の上で、遊ぼう。','Come play on the sand'],char:'砂',crop:[1600,120],adult:'otona-f-a',style:'play',invite:['砂丘で遊ぼう！', 'Let’s play in the dunes!'],end:['砂丘で、いっしょに遊ぼう！', 'Let’s play in the dunes together!']},
  {kind:'ice',grade:5,place:['ホッカイドウ・氷の城','HOKKAIDO · ICE CASTLE'],title:['筆を止めたら。','A quiet afternoon']},
  {kind:'region',grade:5,zone:75,place:['トウホク・ねぶたの夜祭り','TOHOKU · NEBUTA FESTIVAL'],title:['喜びを、いっしょに。','Sharing the joy'],char:'喜',crop:[1500,250],adult:'otona-m-b',style:'festival',invite:['お祭りを楽しもう！', 'Let’s enjoy the festival!'],end:['いっしょに、お祭りを楽しもう！', 'Let’s enjoy the festival together!']},
  {kind:'region',grade:4,zone:59,place:['チュウブ・茶畑','CHUBU · TEA FIELDS'],title:['いい香りの道。','A fragrant path'],char:'香',crop:[1300,300],adult:'obaa-a',style:'stroll',invite:['お茶の香りをかごう！', 'Let’s smell the tea!'],end:['いっしょに、お茶の香りを\nかぎに行こう！', 'Let’s go and smell the tea together!']},
  {kind:'children',grade:3,place:['シコク・道後温泉','SHIKOKU · DOGO ONSEN'],title:['広場の友達','Friends in the square']},
  {kind:'region',grade:3,zone:30,place:['カンサイ・伝統工芸の町','KANSAI · CRAFT TOWN'],title:['お店の仲間。','A workshop friend'],char:'皿',crop:[500,200],adult:'otona-m-a',style:'workshop',invite:['お皿を作ろう！', 'Let’s make plates!'],end:['いっしょに、お皿を\n作ってみよう！', 'Let’s try making plates together!']},
  {kind:'research',grade:2,place:['カントウ・つくばの研究室','KANTO · TSUKUBA RESEARCH LAB'],title:['いっしょに、発見。','A discovery, together']},
  {kind:'home',grade:1,place:['トウキョウ・始まりの町','TOKYO · HOME TOWN'],title:['ただいま。','Back where it began']}
 ];
 function mount(root,{later,done,startAt=0,intro=true}){
  const en=!!global.KanjimonGameI18n?.active,reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let closed=false,serial=0,current=0;
  const layer=document.createElement('section');layer.className='ael-layer';
  layer.innerHTML='<header class="ael-heading"><small></small><h2></h2></header><div class="ael-view"><div class="ael-world"></div></div><footer class="ael-footer"><p aria-live="polite"></p><div class="ael-dots" aria-hidden="true"></div></footer><div class="ael-loading" role="status"></div><button class="ael-next" type="button"></button><div class="ael-fade"></div>';
  root.appendChild(layer);root.classList.add('aen-life','ael-active');root.dataset.scene='life';
  const q=s=>layer.querySelector(s),world=q('.ael-world'),view=q('.ael-view'),next=q('.ael-next'),shade=q('.ael-fade'),loading=q('.ael-loading');
  next.textContent=en?'Next':'次へ';
  const fit=()=>{const s=Math.min(view.clientWidth/800,view.clientHeight/800);world.style.transform=`translate(-50%,-50%) scale(${s})`;};
  const resize=new ResizeObserver(fit);resize.observe(view);fit();
  function cleanup(){if(closed)return;closed=true;++serial;resize.disconnect();layer.remove();root.classList.remove('aen-life','ael-active');}
  function image(src,cls){const img=document.createElement('img');img.src=src;img.alt='';img.draggable=false;img.className=cls||'';return img;}
  function put(el,x,y,w){el.style.left=x+'px';el.style.top=y+'px';if(w)el.style.width=w+'px';world.appendChild(el);return el;}
  function mon(char,x,y){const k=K.find(k=>k.c===char);if(!k)return null;const el=document.createElement('div');el.className='ael-mon aen-life-mon aen-life-actor';el.dataset.char=char;el.setAttribute('aria-label',char);el.innerHTML='<div class="ael-mon-body face-host">'+fuji52FieldFaceHtml(k)+'</div>';return put(el,x,y,100);}
  function mood(el,happy){const f=el?.querySelector('.face');if(f)f.className='face '+(happy?'happy':'normal');}
  function person(name,x,y,w){const el=document.createElement('div');el.className='ael-person aen-life-actor';el.setAttribute('aria-label',name==='mana'?'マナ':'マローズ');el.dataset.person=name;put(el,x,y,w);return el;}
  function pose(el,src){
   const ink=el.querySelector('.ael-ink');
   const img=image(src,'ael-pose');
   if(el.dataset.person==='maros'&&src.endsWith('maros-smile.png')){
    // 笑顔の差分は上半身だけ。座卓と紙と足元は元の位置を保つ。
    const base=image(BASE+'maros-write.png','ael-desk-base'),upper=document.createElement('div');upper.className='ael-smile-upper';upper.appendChild(img);el.replaceChildren(base,upper);el.classList.add('smiling');
   }else{el.classList.remove('smiling');el.replaceChildren(img);}
   if(ink)el.appendChild(ink);
  }
  function child(gender,x,y,sheet){const el=document.createElement('div');el.className='ael-child aen-life-actor';el.setAttribute('aria-label',en?'Child':'こども');const sp=document.createElement('i');sp.style.backgroundImage=`url('images/sprites/npc-mob-${sheet||('kodomo-'+gender+'-a')}.webp')`;el.appendChild(sp);return put(el,x,y,175);}
  function town(){
   world.className='ael-world ael-town';
   const town=document.createElement('div');town.className='ael-town-map';town.appendChild(image('images/fullart/town-bg.webp','ael-town-ground'));
   // 同じ町の北側と同じ建物位置。新しい家や別の東京を作らない。
   TOWN_BUILDINGS.slice(0,4).forEach(b=>{const el=image('images/buildings/'+b.img,'ael-building');el.style.cssText=`left:${b.x/30*100}%;top:${b.y/20*100}%;width:${b.w/30*100}%;height:${b.h/20*100}%;`;town.appendChild(el);});world.appendChild(town);
  }
  function cut(index){
   if(closed)return;if(index>=scenes.length){cleanup();done();return;}
   const def=scenes[index],kind=def.kind;const ticket=++serial;current=index;let finished=false;root.dataset.lifeGrade=String(def.grade);
   root.dataset.lifeCut=String(index);root.dataset.lifeBeat='loading';world.replaceChildren();world.className='ael-world';next.disabled=true;shade.classList.add('on');
   q('.ael-heading small').textContent=def.place[en?1:0];q('.ael-heading h2').textContent=def.title[en?1:0];q('.ael-footer p').textContent='';q('.ael-dots').innerHTML=scenes.map((_,i)=>`<i class="${index===i?'on':''}"></i>`).join('');
   const alive=()=>!closed&&serial===ticket&&!finished;
   function at(ms,fn){later(()=>{if(alive())fn();},ms);}
   function say(ja,english){q('.ael-footer p').textContent=en?english:ja;}
   function beat(name){root.dataset.lifeBeat=name;}
   function go(){if(!alive()||next.disabled)return;finished=true;next.disabled=true;shade.classList.add('on');later(()=>{if(!closed&&serial===ticket)cut(index+1);},reduce?0:700);}
   next.onclick=e=>{e.stopPropagation();go();};
   function move(el,x,y,ms=2200,dir='right'){
    if(!el)return;
    const dx=x-parseFloat(el.style.left),dy=y-parseFloat(el.style.top);
    if(dx||dy)dir=Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');
    el.style.transition=reduce?'none':`left ${ms}ms linear,top ${ms}ms linear`;el.style.left=x+'px';el.style.top=y+'px';el.classList.add('moving');
    const sp=el.querySelector('i');let step=0;
    function walk(){if(!alive()||!el.classList.contains('moving'))return;
     if(sp){step^=1;const hero=el.classList.contains('ael-hero'),legacy=hero&&HeroWalkQuality.legacyB(!!step,sp.style.backgroundImage);sp.style.backgroundPosition=(dir==='up'?'50%':dir==='down'?'0%':'100%')+' '+(step?'100%':'0%');sp.style.transform=`scaleX(${dir==='left'?-1:1}) translateY(${legacy&&step?-2:0}px)`;}
     at(300,walk);
    }
    function rest(){el.classList.remove('moving');if(sp){const side=dir==='left'||dir==='right';sp.style.backgroundPosition=(dir==='up'?'50%':dir==='down'?'0%':'100%')+' '+(side&&el.classList.contains('ael-child')?'100%':'0%');sp.style.transform=dir==='left'?'scaleX(-1)':'';}}
    if(reduce)rest();else{walk();at(ms,rest);}
   }
   function acknowledge(el){if(!el)return;mood(el,true);el.classList.add('respond');at(850,()=>el.classList.remove('respond'));}
   function regional(){
    world.classList.add('ael-region');
    const ground=image('images/fullart/'+ZONE_FULLART[def.zone-1],'ael-region-ground');
    ground.style.left=-def.crop[0]+'px';ground.style.top=-def.crop[1]+'px';world.appendChild(ground);
    const reverse=def.style==='welcome'||def.style==='workshop',a=child('m',reverse?500:300,665),b=child('f',reverse?650:150,560,def.adult),friend=mon(def.char,reverse?180:650,640);
    const reading=K.find(k=>k.c===def.char)?.y;
    const bubble=document.createElement('span');bubble.className='ael-reading';bubble.style.left=reverse?'0%':'100%';a.appendChild(bubble);
    function face(el,left){const sp=el.querySelector('i');sp.style.backgroundPosition='100% 100%';sp.style.transform=left?'scaleX(-1)':'';}
    face(a,reverse);face(b,reverse);b.setAttribute('aria-label',en?'Watching adult':'見守る大人');
    at(1300,()=>{beat('reading');bubble.textContent=reading+'！';bubble.classList.add('show');say('「'+reading+'！」',reading+'!');});
    at(3000,()=>{beat('answering');acknowledge(friend);});
    at(4100,()=>{beat('approaching');bubble.classList.remove('show');move(friend,reverse?335:465,660,2000,reverse?'right':'left');});
    at(6400,()=>{beat('befriended');friend.classList.add('befriended');acknowledge(friend);bubble.textContent=def.invite[en?1:0];bubble.classList.add('show');say(...def.end);});
    at(8500,()=>{bubble.classList.remove('show');beat('together');
     // 子どもと仲間を、大人が一歩後ろから見守ったまま一緒に歩く。
     const dx=reverse?-160:160;
     [a,friend,b].forEach(el=>move(el,parseFloat(el.style.left)+dx,parseFloat(el.style.top),3200));
    });
    at(11700,()=>{beat('living-together');say(...def.end);acknowledge(friend);});
   }
   function start(){
    if(!alive())return;loading.hidden=true;shade.classList.remove('on');beat('establish');
    if(kind==='region'){
     regional();
    }else if(kind==='children'){
     world.classList.add('ael-dogo');world.appendChild(image('images/fullart/zone42-field-20260922.webp','ael-dogo-ground'));const a=child('m',200,590),b=child('f',570,630),wood=mon('木',330,600),water=mon('水',710,640);
     at(2000,()=>{beat('calling');say('「き！」','“Ki!”');a.querySelector('i').style.backgroundPosition='100% 0%';});
     at(3600,()=>{beat('answering');acknowledge(wood);});
     at(5600,()=>{say('「みず！」','“Mizu!”');b.querySelector('i').style.backgroundPosition='100% 0%';});
     at(7100,()=>acknowledge(water));
     const dancers=[a,wood,b,water],angles=[Math.PI,Math.PI/2,0,-Math.PI/2];
     function ringPoint(angle){return{x:400+240*Math.cos(angle),y:580+140*Math.sin(angle)};}
     at(8000,()=>{beat('circle');say('かんじモンは僕達の友達','Kanjimon are our friends.');dancers.forEach((el,i)=>{const p=ringPoint(angles[i]);move(el,p.x,p.y,900,i<2?'left':'right');mood(el,true);});});
     at(9200,()=>{beat('dancing');dancers.forEach(el=>el.classList.add('moving'));});
     // 同じ輪の上で等間隔を保つ。世代ガード付きタイマーで退出後は動かさない。
     for(let step=1;step<=80;step++)at(9200+step*100,()=>{
      if(reduce)return;
      dancers.forEach((el,i)=>{const angle=angles[i]+Math.PI*2*step/80,p=ringPoint(angle),dx=-Math.sin(angle),dy=Math.cos(angle);
       el.style.transition='left 100ms linear,top 100ms linear';el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.zIndex=String(Math.round(p.y));
       const sp=el.querySelector('i');if(sp){const side=Math.abs(dx)>.45;sp.style.backgroundPosition=(side?'100%':dy<0?'50%':'0%')+' '+(Math.floor(step/2)%2?'100%':'0%');sp.style.transform='scaleX('+(side&&dx<0?-1:1)+') translateY('+(-Math.abs(Math.sin(step*Math.PI/4))*10)+'px)';}
      });
     });
     at(17300,()=>{beat('dance-finish');dancers.forEach((el,i)=>{el.classList.remove('moving');const sp=el.querySelector('i');if(sp){sp.style.backgroundPosition='100% 0%';sp.style.transform=i===2?'scaleX(-1)':'';}});say('呼ぶと、答えてくれる。','Call, and a friend answers.');acknowledge(wood);});
     at(18000,()=>acknowledge(water));
    }else if(kind==='research'){
     world.classList.add('ael-research');world.appendChild(image(BASE+'research-room.png','ael-background'));
     const mana=person('mana',300,700,315);pose(mana,BASE+'mana-read.png');const ken=mon('研',610,676),ka=mon('科',685,744);
     at(2200,()=>{beat('question');say('どうして、こうなるのかな。','Why does it work this way?');move(ken,490,675,2200,'left');});
     at(5200,()=>{beat('compare');pose(mana,BASE+'mana-share.png');mana.classList.add('sharing');move(ka,580,728,1800,'left');});
     at(7400,()=>{ken.classList.add('looking');ka.classList.add('looking');});
     at(10500,()=>{beat('discovery');say('いっしょに調べると、新しい発見。','A new discovery, made together.');acknowledge(ken);});
     at(12300,()=>acknowledge(ka));
     at(15000,()=>{mana.classList.add('ael-nod');});
    }else if(kind==='ice'){
     world.classList.add('ael-ice');world.appendChild(image('images/fullart/ice-castle-boss-room-japanese-v1.png','ael-background'));
     const maros=person('maros',400,675,540);pose(maros,BASE+'maros-write.png');const ji=mon('字',90,710),sho=mon('書',735,720),ice=mon('氷',725,520);
     const ink=document.createElementNS('http://www.w3.org/2000/svg','svg');ink.setAttribute('viewBox','0 0 1202 1309');ink.classList.add('ael-ink');ink.setAttribute('aria-label','紙に書いた一の字');const stroke=document.createElementNS('http://www.w3.org/2000/svg','path');stroke.setAttribute('d','M477 875 Q570 882 696 875');stroke.setAttribute('pathLength','1');ink.appendChild(stroke);maros.appendChild(ink);maros.classList.add('writing');
     at(2000,()=>{beat('writing');say('一文字、一文字。','One careful stroke at a time.');});
     at(3200,()=>{beat('stroke');pose(maros,BASE+'maros-stroke.png');ink.classList.add('written');});
     at(4200,()=>{beat('first-friend');move(ji,180,714,2600);});
     at(7400,()=>{beat('gathering');move(sho,620,715,2500,'left');move(ice,663,578,3000,'left');});
     at(10800,()=>{beat('noticing');maros.classList.remove('writing');});
     at(12000,()=>{beat('smiling');pose(maros,BASE+'maros-smile.png');say('今日は、先生がいっぱい。','Plenty of teachers today.');acknowledge(ji);});
     at(13800,()=>acknowledge(sho));at(15500,()=>acknowledge(ice));
    }else{
     town();const hero=document.createElement('div');hero.className='ael-hero aen-life-actor';hero.setAttribute('aria-label',en?'Hero returning home':'まちに かえってきた しゅじんこう');const sp=document.createElement('i');sp.style.backgroundImage=`url('${heroSheetUrl()}')`;hero.appendChild(sp);put(hero,400,760,180);
     const owned=party.find(i=>caught.has(i)&&K[i])??[...caught].find(i=>K[i]);const friend=owned===undefined?null:mon(K[owned].c,525,775);
     at(1800,()=>{beat('homeward');move(hero,400,650,4300,'up');move(friend,525,675,4900,'up');});
     at(7300,()=>{beat('home');sp.style.backgroundPosition='50% 0%';sp.style.transform='';say('旅の始まりの、あの町へ。','Back to the town where it all began.');});
     at(10300,()=>{beat('companion');sp.style.backgroundPosition='100% 0%';acknowledge(friend);});
     at(13500,()=>{say(friend?'ただいま。今度は、いっしょに。':'ただいま。',friend?'Home again. Together this time.':'Home again.');});
    }
    at(kind==='region'?12500:kind==='children'?18500:kind==='ice'?16500:15000,()=>{next.disabled=false;});at(kind==='region'?14000:kind==='ice'?22000:20000,go);
   }
   const urls=kind==='region'?['images/fullart/'+ZONE_FULLART[def.zone-1],'images/sprites/npc-mob-kodomo-m-a.webp','images/sprites/npc-mob-'+def.adult+'.webp']:kind==='research'?[BASE+'research-room.png',BASE+'mana-read.png',BASE+'mana-share.png']:kind==='ice'?['images/fullart/ice-castle-boss-room-japanese-v1.png',BASE+'maros-write.png',BASE+'maros-stroke.png',BASE+'maros-smile.png']:kind==='children'?['images/fullart/zone42-field-20260922.webp','images/sprites/npc-mob-kodomo-m-a.webp','images/sprites/npc-mob-kodomo-f-a.webp']:['images/fullart/town-bg.webp',...TOWN_BUILDINGS.slice(0,4).map(b=>'images/buildings/'+b.img),heroSheetUrl()];
   let attempt=0;
   function load(){next.disabled=true;const request=++attempt;loading.hidden=false;loading.textContent='';let settled=false;
    const fail=()=>{if(settled||!alive()||request!==attempt)return;settled=true;loading.replaceChildren();const msg=document.createElement('p');msg.textContent=en?'The scene could not load.':'えが よみこめませんでした。';const retry=document.createElement('button');retry.type='button';retry.textContent=en?'Retry':'もういちど';retry.onclick=e=>{e.stopPropagation();load();};loading.append(msg,retry);next.disabled=false;shade.classList.remove('on');beat('load-error');};
    Promise.all(urls.map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=src;}))).then(()=>{if(settled||!alive()||request!==attempt)return;settled=true;at(650,start);},fail);at(15000,fail);
   }
   load();
  }
  const first=Math.max(0,Math.min(scenes.length-1,startAt|0));
  if(first===0&&intro){
   layer.classList.add('ael-intro');loading.hidden=false;loading.textContent=en?'The world after our journey':'その後の世界';next.disabled=true;root.dataset.lifeBeat='intro';
   later(()=>{if(closed)return;layer.classList.remove('ael-intro');cut(first);},3200);
  }else cut(first);
  return cleanup;
 }
 global.AmamiLifeScenes={mount,count:scenes.length};
})(window);
