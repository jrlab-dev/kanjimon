/* 正本：第5-8話_四字熟語と森_20260922。既存ツイン表示を使う奄美専用進行。 */
(function(global){
 'use strict';
 const $=id=>document.getElementById(id);
 // 第6話だけの実録環境音。BGMと独立し、会話のカットや回答では頭に戻さない。
 const coastAudio=(()=>{
  let active=null;const stats={requests:0,failures:0,starts:0};
  function pause(a){if(!a.source)return;a.offset=(a.offset+a.ctx.currentTime-a.startedAt)%a.buffer.duration;a.source.stop();a.source.disconnect();a.source=null;a.gain.gain.cancelScheduledValues(a.ctx.currentTime);a.gain.gain.value=0;}
  function stop(){const a=active;if(!a)return;active=null;a.ctl.abort();clearTimeout(a.timeout);clearInterval(a.timer);a.observer.disconnect();document.removeEventListener('visibilitychange',a.sync);global.removeEventListener('pointerdown',a.sync);global.removeEventListener('pagehide',a.stop);a.ctx?.removeEventListener('statechange',a.sync);pause(a);a.gain?.disconnect();a.buffer=null;}
  function start(){
   stop();const a={ctl:new AbortController(),buffer:null,source:null,ctx:null,gain:null,offset:0,loading:false,failed:false,entered:false,volume:0};active=a;
   const alive=()=>active===a;
   a.stop=()=>{if(alive())stop();};
   a.sync=()=>{
    if(!alive())return;
    const inside=$('screen-field')?.classList.contains('active')||$('screen-battle')?.classList.contains('active');
    if(inside)a.entered=true;else if(a.entered){a.stop();return;}
    if(!inside||!soundOn||document.hidden){pause(a);return;}
    if(a.failed)return;
    if(!a.ctx){ensureAudio();a.ctx=audioCtx;if(!a.ctx){a.failed=true;return;}a.gain=a.ctx.createGain();a.gain.gain.value=0;a.gain.connect(a.ctx.destination);a.ctx.addEventListener('statechange',a.sync);}
    if(a.ctx.state!=='running'){pause(a);return;}
    if(!a.buffer){
     if(a.loading)return;a.loading=true;stats.requests++;a.timeout=setTimeout(()=>a.ctl.abort(),12000);
     fetch('audio/amami/honohoshi-waves.mp3',{signal:a.ctl.signal}).then(r=>{if(!r.ok)throw Error('wave');return r.arrayBuffer();}).then(data=>{if(!alive())return null;return a.ctx.decodeAudioData(data);}).then(buffer=>{if(!alive()||!buffer)return;clearTimeout(a.timeout);a.buffer=buffer;a.loading=false;a.sync();}).catch(()=>{if(alive()){clearTimeout(a.timeout);a.loading=false;a.failed=true;stats.failures++;}});return;
    }
    const volume=(global.AmamiVoice?.busy||bgmDuckCount>0)?0.14:0.32;
    if(!a.source){const source=a.ctx.createBufferSource();source.buffer=a.buffer;source.loop=true;source.connect(a.gain);a.source=source;a.startedAt=a.ctx.currentTime;source.start(0,a.offset);a.gain.gain.cancelScheduledValues(a.ctx.currentTime);a.gain.gain.setValueAtTime(0,a.ctx.currentTime);a.gain.gain.linearRampToValueAtTime(volume,a.ctx.currentTime+.8);a.volume=volume;stats.starts++;}
    else if(volume!==a.volume){a.gain.gain.cancelScheduledValues(a.ctx.currentTime);a.gain.gain.setTargetAtTime(volume,a.ctx.currentTime,.12);a.volume=volume;}
   };
   a.observer=new MutationObserver(a.sync);a.observer.observe(document.body,{attributes:true,attributeFilter:['class']});if($('soundBtn'))a.observer.observe($('soundBtn'),{childList:true,subtree:true});for(const id of ['screen-field','screen-battle','screen-title'])if($(id))a.observer.observe($(id),{attributes:true,attributeFilter:['class']});
   a.timer=setInterval(a.sync,100);document.addEventListener('visibilitychange',a.sync);global.addEventListener('pointerdown',a.sync,{passive:true});global.addEventListener('pagehide',a.stop);a.sync();return a.stop;
  }
  return{start,stop,stats,get active(){return !!active;},get playing(){return !!active?.source;},get volume(){return active?.source?active.volume:0;},get position(){return active?.buffer?(active.offset+(active.source?active.ctx.currentTime-active.startedAt:0))%active.buffer.duration:0;},get decodedBytes(){return active?.buffer?active.buffer.length*active.buffer.numberOfChannels*4:0;}};
 })();
 const CONFIG={
  5:{name:'住用マングローブ',title:'組み合わせを作る',field:'amami-main-05-sumiyo-mangrove.png',battle:'amami-sumiyo-v2.png',pos:'81.20% 89.34%',size:'auto 150.51%',mid:4,entry:['こんどは、二つずつ。','合う ことばを 見つけて。'],ending:['ちがう 組み合わせも、つくれる。','……つぎも、あるよ。']},
  6:{name:'ホノホシ海岸',title:'つぎ、これも',field:'amami-main-06-honohoshi.png',battle:'amami-honohoshi-v1.png',pos:'100% 100%',size:'auto 105.36%',mid:4,entry:['波が くるたび、一つ。','……ぼくが 順番を かえたよ。'],ending:['つぎ、これも！','……まだ、つづける？']},
  7:{name:'最終決戦の森・入口',title:'何を出そう',field:'amami-main-07-final-forest.png',battle:'amami-final-forest-entrance-v2.png',pos:'82.85% 59.90%',size:'auto 150.51%',mid:3,entry:['こんどは……何を 出そう。'],ending:['ぜんぶ 知ってるのに、えらぶのは すぐじゃ ないんだね。','……まだ 出したい。']},
  8:{name:'最終決戦の森・奥',title:'待っている側になる',field:'amami-main-07b-final-forest-depths.png',battle:'amami-final-forest-depths-v1.png',pos:'100% 100%',size:'auto 105.36%',mid:4,entry:[],ending:['はやく。つぎ、思いついた。']}
 };
 const NEW_READINGS={'起死回生':['きし','かいせい'],'臨機応変':['りんき','おうへん'],'温故知新':['おんこ','ちしん'],'有言実行':['ゆうげん','じっこう'],'心機一転':['しんき','いってん'],'前代未聞':['ぜんだい','みもん'],'電光石火':['でんこう','せっか']};
 function definition(word){
  const existing=word==='大願成就'?ZONE102_FINAL_YOJI:Object.values(YOJI_BOSS).find(d=>d.first+d.second===word);
  if(existing)return {...existing,fuse:false,hidden:false};
  const y=NEW_READINGS[word]||({'一石二鳥':['いっせき','にちょう'],'百発百中':['ひゃっぱつ','ひゃくちゅう'],'以心伝心':['いしん','でんしん']})[word];if(!y)throw Error('奄美四字熟語の読みがありません: '+word);
  return {first:word.slice(0,2),second:word.slice(2),fy:y[0],sy:y[1],y:y.join(''),fuse:false};
 }
 function createView(episode){
  const c=CONFIG[episode];let root=null,easy=null,generation=0,timers=[],ready=false,lines=[],nextLine=0,afterTalk=null,forestCamera=null,forestFit=null,vista=null,cancelCrisis=null;
  const stopCoast=episode===6?coastAudio.start():null;
  const state=()=>amamiFinal['episode'+episode];
  function finish(done){const g=generation;AmamiMotion.after(()=>{if(g===generation)done?.();});}
  function later(fn,ms){const g=generation,id=setTimeout(()=>{timers=timers.filter(t=>t!==id);if(g===generation)fn();},ms);timers.push(id);}
  function resetForestCamera(){if(!forestCamera)return;const grid=forestCamera;forestCamera=null;grid.style.transform='';grid.style.transformOrigin='';grid.style.transition='';updateCamera(true);}
  function clear(){global.AmamiVoice.stop();AmamiMotion.stop();cancelCrisis?.();cancelCrisis=null;vista=null;resetForestCamera();forestFit=null;generation++;timers.forEach(clearTimeout);timers=[];document.querySelectorAll('.ay-field-word,.amami-easy,#aySteps,.acb-field,#ayCastleLight').forEach(n=>n.remove());root?.remove();easy=null;ready=false;}
  function closeCut(){const cut=root?.querySelector('.ay-cinema');if(!cut)return;AmamiMotion.stop();cut.remove();root.classList.remove('cinematic');delete root.dataset.beat;}
  function heroImage(pose){return 'images/battle-tate/hero-'+pose+'-'+(heroChar==='girl'?'girl':'boy')+(typeof costumeSuffix==='function'?costumeSuffix():'')+'.webp';}
  function openCut(word,complete=false){
   if(episode!==5)return;AmamiMotion.stop();
   const cut=document.createElement('div');cut.className='ay-cinema';
   cut.innerHTML='<img class="ay-cinema-bg" src="images/fullart/amami-sumiyo-conversation.webp" alt="住用のマングローブに囲まれた木道"><div class="ay-cut-location">アマミ・住用マングローブ</div><button class="ay-cut-close" type="button" aria-label="会話を中断してタイトルへ戻る">とじる</button><div class="ay-cinema-stage"><img class="ay-shoulder" alt="言葉を見て話を聞く主人公"><img class="ay-close-easy easy3d-frame" src="images/easy-motion/poster.png" alt="イージー"></div><div class="ay-word-pair" aria-label="二文字ずつで一つの四字熟語"><span></span><span></span></div>';
   cut.querySelector('.ay-shoulder').src=heroImage('back');
   cut.querySelectorAll('.ay-word-pair span').forEach((n,i)=>{n.textContent=word.slice(i*2,i*2+2);});
   for(const img of cut.querySelectorAll('img'))img.addEventListener('error',()=>{if(cut.isConnected)closeCut();},{once:true});
   cut.querySelector('button').addEventListener('click',e=>{e.stopPropagation();destroy();global.showScreen('screen-title');});
   root.prepend(cut);root.classList.add('cinematic');root.dataset.beat=complete?'assembled':'introduce';
   global.AmamiStoryUI.sizeConversation(cut,'ay');
   if(complete)later(()=>cut.querySelector('.ay-word-pair')?.classList.add('assembled'),700);
  }
  function cutLine(row){
   if(episode===8&&vista?.cut.isConnected){root.dataset.beat=row.id;vista.pose(row.id==='C08b'?'right':'up',row.id==='C08d'?'up':'left');return;}
   if(episode===7){const peer=root.querySelector('.ay-close-easy');if(peer){root.dataset.beat=row.id;AmamiMotion.play(peer,row.id==='C07c'?'01':'07');}return;}
   if(episode===6){const peer=root.querySelector('.ay-close-easy');if(peer)seaMotion(peer,({C06a:'01',C06b:'08',C06c:'08',C06d:'12'})[row.id]||'01');return;}
   if(episode!==5)return;const cut=root.querySelector('.ay-cinema');if(!cut)return;
   const peer=cut.querySelector('.ay-close-easy');
   if(row.id==='C05a')AmamiMotion.play(peer,'07');
   if(row.id==='C05b')AmamiMotion.play(peer,'12');
   if(row.id==='C05c'){
    root.dataset.beat='joy';const hero=cut.querySelector('.ay-shoulder');hero.alt='次もやろうと喜ぶ主人公';
    delete cut.querySelector('.ay-cinema-stage').dataset.sized;hero.src=heroImage('victory');global.AmamiStoryUI.sizeConversation(cut,'ay');AmamiMotion.play(peer,'01');
   }
  }
  function seaMotion(peer,clip){const ripple=root.querySelector('.ay-sea-word i');const startWave=()=>{if(ripple?.isConnected&&ripple.style.animationPlayState==='paused')ripple.style.animationPlayState='running';};AmamiMotion.play(peer,clip,{onFrame:startWave,onDone:startWave});}
  function seaCut(word='',wave=false){
   AmamiMotion.stop();const cut=document.createElement('div');cut.className='ay-cinema';
   cut.innerHTML='<img class="ay-cinema-bg" src="images/fullart/amami-honohoshi-conversation.webp" alt="丸い石の浜に波が寄せるホノホシ海岸"><div class="ay-cut-location">アマミ・ホノホシ海岸</div><button class="ay-cut-close" type="button" aria-label="会話を中断してタイトルへ戻る">とじる</button><div class="ay-cinema-stage"><img class="ay-shoulder" alt="イージーの様子を見守る主人公"><img class="ay-close-easy easy3d-frame" src="images/easy-motion/poster.png" alt="イージー"></div>';
   cut.querySelector('.ay-shoulder').src=heroImage('back');
   if(word){const row=document.createElement('div');row.className='ay-sea-word'+(wave?' answer-wave':'');row.setAttribute('aria-label','読み終えた言葉');const card=document.createElement('span');card.textContent=word;row.appendChild(card);if(wave){const ripple=document.createElement('i');ripple.setAttribute('aria-hidden','true');ripple.style.animationPlayState='paused';row.appendChild(ripple);}cut.appendChild(row);}
   for(const img of cut.querySelectorAll('img'))img.addEventListener('error',()=>{if(cut.isConnected)closeCut();},{once:true});
   cut.querySelector('button').addEventListener('click',e=>{e.stopPropagation();destroy();global.showScreen('screen-title');});
   root.prepend(cut);root.classList.add('cinematic');global.AmamiStoryUI.sizeConversation(cut,'ay');return cut.querySelector('.ay-close-easy');
  }
  function forestCut(){
   AmamiMotion.stop();const cut=document.createElement('div');cut.className='ay-cinema';
   cut.innerHTML='<img class="ay-cinema-bg" src="images/fullart/amami-main-07-final-forest.png" alt="光が差し込むアマミの森の入口"><div class="ay-cut-location">アマミ・森の入口</div><button class="ay-cut-close" type="button" aria-label="会話を中断してタイトルへ戻る">とじる</button><div class="ay-cinema-stage"><img class="ay-shoulder" alt="イージーに向き合って話を聞く主人公"><img class="ay-close-easy easy3d-frame" src="images/easy-motion/poster.png" alt="イージー"></div>';
   cut.querySelector('.ay-shoulder').src=heroImage('back');
   const images=[...cut.querySelectorAll('img')];
   for(const img of images)img.addEventListener('error',()=>{if(cut.isConnected)closeCut();},{once:true});
   cut.querySelector('button').addEventListener('click',e=>{e.stopPropagation();destroy();global.showScreen('screen-title');});
   root.prepend(cut);root.classList.add('cinematic');global.AmamiStoryUI.sizeConversation(cut,'ay');
   // 遅い背景や衣装を待ち続けず、既存フィールドの会話へ戻す。
   later(()=>{if(cut.isConnected&&images.some(img=>!img.complete||!img.naturalWidth))closeCut();},4000);
  }
  function base(background=c.field,label=c.name){
   clear();const f=NationalDeparture.showField(102,{gender:heroChar,hero:true,label,adults:0,mana:false,monsters:0,background,point:{x:15,y:6}});
   document.body.classList.add('amami-late-mode');
   root=document.createElement('div');root.id='amamiLateRoot';root.dataset.episode=episode;
   root.innerHTML='<div id="ayChapter"><small>第'+episode+'話</small><b></b></div><div id="ayProgress"></div><div id="ayWater"><i></i><i></i></div><div id="ayGlow"></div><div id="ayTalk"><img src="images/bust/easy.webp" alt="イージー"><div><b>イージー</b><p id="ayText"></p><small id="ayNext">▼ つづく</small></div></div>';
   root.querySelector('#ayChapter b').textContent=c.title;document.body.appendChild(root);root.addEventListener('click',()=>{if(ready&&!root.dataset.inputLocked&&!AmamiMotion.busy&&!global.AmamiVoice.busy)showLine();});
   const h=$('fieldHero');h.style.transition='none';h.style.setProperty('--hx',f.cx);h.style.setProperty('--hy',f.cy+1.55);setHeroFacing(0,-1);
   easy=AmamiArrival.placeEasy(f.cx+1.35,episode>=7?f.cy+1.55:f.cy-.4,1.25,episode>=7?'up':'down');return f;
  }
  function moveHero(x,y,ms=850){const h=$('fieldHero');setHeroFacing(Math.sign(x-Number(h.style.getPropertyValue('--hx'))),Math.sign(y-Number(h.style.getPropertyValue('--hy'))));h.style.transition=`left ${ms}ms linear,top ${ms}ms linear`;h.style.setProperty('--hx',x);h.style.setProperty('--hy',y);const sp=h.querySelector('.hero-sprite');for(let t=0;t<ms;t+=140)later(()=>{global.AmamiArrival.heroWalkFrame(sp,!!(t%280));},t);later(()=>{global.AmamiArrival.heroWalkFrame(sp,false);},ms);}
  function moveEasy(x,y,ms=850,dir='up'){if(!easy||AmamiMotion.ownsMove(easy))return;return AmamiMotion.walk(easy,{x,y},ms);}
  function forestLook(dir){
   if(!easy)return;setInteriorActorPose(easy,dir,'a');
   // 旧スプライトは3D画像の下で非表示。実際に見える立ち姿の向きも変える。
   const img=easy.querySelector('.easy3d-frame');if(!img)return;
   img.src='images/easy-motion/easy_15_walk_'+dir+'/stand.png';
   img.onerror=()=>{img.onerror=null;if(img.isConnected)img.src='images/easy-motion/poster.png';};
   forestFit?.(dir);
  }
  async function forestPresentation(nodes,zoom,done){
   const g=generation,actor=easy,hero=$('fieldHero')?.querySelector('.hero-sprite'),img=actor?.querySelector('img');
   const sheet=new Image();sheet.src=heroSheetUrl();const side=new Image();side.src='images/easy-motion/easy_15_walk_left/stand.png';
   let timeout;try{
    await Promise.race([Promise.all([sheet.decode(),img.decode(),side.decode()]),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('forest images')),2000);})]);
    if(g!==generation||!actor.isConnected)return;
    function bounds(source,x,w,h){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.drawImage(source,x,0,w,h,0,0,w,h);const data=ctx.getImageData(0,0,w,h).data;let top=h,bottom=0;for(let y=0;y<h;y++)for(let px=0;px<w;px++)if(data[(y*w+px)*4+3]>64){top=Math.min(top,y);bottom=Math.max(bottom,y+1);}if(bottom<=top)throw Error('empty silhouette');return{fill:(bottom-top)/h,bottom:bottom/h};}
    const heroBounds=[0,1,2].map(col=>bounds(sheet,col*sheet.naturalWidth/3,sheet.naturalWidth/3,sheet.naturalHeight/2)),easyBounds={up:bounds(img,0,img.naturalWidth,img.naturalHeight),left:bounds(side,0,side.naturalWidth,side.naturalHeight)};
    forestFit=dir=>{const hb=heroBounds[heroFacing==='up'?1:heroFacing==='down'?0:2],eb=easyBounds[dir];if(!eb)return;const hr=hero.getBoundingClientRect(),er=img.getBoundingClientRect(),size=parseFloat(actor.style.getPropertyValue('--easy-size'));actor.style.setProperty('--easy-size',size*(hr.height*hb.fill*1.25)/(er.height*eb.fill)+'px');const adjusted=img.getBoundingClientRect(),scale=actor.getBoundingClientRect().width/actor.offsetWidth;img.style.bottom=(parseFloat(getComputedStyle(img).bottom)+(adjusted.top+adjusted.height*eb.bottom-hr.top-hr.height*hb.bottom)/scale)+'px';};
    forestFit('up');
    if(zoom){const grid=$('fieldGrid'),wrap=$('fieldWrap'),gr=grid.getBoundingClientRect(),scale=gr.width/grid.offsetWidth,boxes=[hero,img,...nodes].map(n=>n.getBoundingClientRect()),left=Math.min(...boxes.map(r=>r.left)),right=Math.max(...boxes.map(r=>r.right)),top=Math.min(...boxes.map(r=>r.top)),bottom=Math.max(...boxes.map(r=>r.bottom)),z=Math.min(1.8,wrap.clientWidth*.9/((right-left)/scale),wrap.clientHeight*.75/((bottom-top)/scale));forestCamera=grid;grid.style.transition='none';grid.style.transformOrigin='0 0';grid.style.transform=`translate(${wrap.clientWidth*.5-((left+right)/2-gr.left)/scale*z}px,${wrap.clientHeight*.45-((top+bottom)/2-gr.top)/scale*z}px) scale(${z})`;}
   }catch(e){/* 読込失敗では既存の引き画面で進行する。 */}finally{clearTimeout(timeout);if(g===generation&&actor?.isConnected)done();}
  }
  function showLine(){global.AmamiVoice.stop();ready=false;if(nextLine>=lines.length){$('ayTalk').classList.remove('show');const cb=afterTalk;afterTalk=null;if(cb)cb();return;}const box=$('ayTalk'),row=lines[nextLine++];global.AmamiStoryUI.display(row,box,box.querySelector('img'),box.querySelector('b'),$('ayText'));if(episode===5&&row.speaker==='hero')box.querySelector('img').src=heroImage('victory');cutLine(row);$('ayNext').classList.remove('ready');later(()=>{ready=true;$('ayNext').classList.add('ready');},520);}
  function talk(texts,done){lines=texts;nextLine=0;afterTalk=done;showLine();}
  function pair(word,f){const nodes=[];[word.slice(0,2),word.slice(2)].forEach((w,i)=>{const n=document.createElement('span');n.className='ay-field-word';AmamiMotion.fieldMonster(n,w);n.style.setProperty('--ax',f.cx+(i?1.5:-.6));n.style.setProperty('--ay',f.cy-2.5);n.style.animationDelay=(episode===7?0:i*180)+'ms';$('fieldGrid').appendChild(n);nodes.push(n);});return nodes;}
  function water(){if(episode<=6)$('ayWater').classList.add('show');}
  function entry(done){const f=base();root.querySelector('#ayChapter b').textContent=global.AmamiStory?.chapters?.[episode]?.title||c.title;if(episode===5||episode===7)AmamiMotion.play(easy,'07');if(episode===8)AmamiMotion.play(easy,'09');$('ayChapter').classList.add('show');later(()=>$('ayChapter').classList.remove('show'),1400);
   if(episode===5)openCut(AMAMI_LATE_WORDS[5][0]);
   if(episode===6)seaCut();
   if(episode===7)forestCut();
   if(episode===8){moveEasy(f.cx+1.35,f.cy-.6,850);later(()=>setInteriorActorPose(easy,'down','a'),900);later(()=>moveHero(f.cx,f.cy+.2,1000),1250);later(()=>talk(global.AmamiStoryUI.rows(episode,'entry',c.entry),()=>finish(done)),2700);}
   else later(()=>talk(global.AmamiStoryUI.rows(episode,'entry',c.entry),()=>{closeCut();done?.();}),1700);
  }
  function encounter(word,label,done){const f=base();$('ayProgress').textContent=label;water();const wordParts=pair(word,f);const fast=state().midSeen;
   if(episode===7)forestLook('up');
   // 最初の二組で「見る→工夫した提示を見る」を一度ずつ。再挑戦では繰り返さない。
   const compare=episode===7&&state().phase==='main'&&state().mainIndex<2;
   const staggered=episode===7&&state().phase==='main'&&state().mainIndex===1;
   if(staggered){wordParts[1].style.visibility='hidden';wordParts[1].style.setProperty('--ay',f.cy-3);}
   function present(){
   if(staggered)later(()=>{wordParts[1].style.visibility='';wordParts[1].classList.add('ay-delayed-word');},480);
   if(compare){root.dataset.beat=state().mainIndex===0?'together':'staggered';later(()=>setHeroFacing(-1,0),400);later(()=>setHeroFacing(1,0),850);later(()=>forestLook('left'),900);later(()=>setHeroFacing(0,-1),1250);later(()=>forestLook('up'),1650);}
   if(episode===5)later(()=>document.querySelectorAll('.ay-field-word').forEach((n,i)=>n.style.setProperty('--ax',f.cx+(i?1.3:-.8))),380);
   if(episode===6&&fast)moveEasy(f.cx+1.35,f.cy-.8,500);
   later(()=>moveHero(f.cx,f.cy+.6,650),compare?1700:(fast?180:400));later(()=>{resetForestCamera();finish(done);},compare?2450:(fast?1050:1500));
   }
   if(episode===7)forestPresentation(wordParts,compare,present);else present();
  }
  function mid(done){const f=base();if(episode===5||episode===7)AmamiMotion.play(easy,'07');if(episode===6)AmamiMotion.play(easy,'08');if(episode===8)AmamiMotion.play(easy,'09');$('ayProgress').textContent=c.mid+'／'+AMAMI_LATE_WORDS[episode].length+'語';
   if(episode===5||episode===7){water();const ns=pair(AMAMI_LATE_WORDS[episode][c.mid],f);later(()=>ns.forEach((n,i)=>n.style.setProperty('--ax',f.cx+(i?2:-1))),400);later(()=>ns.forEach((n,i)=>n.style.setProperty('--ax',f.cx+(i?1.2:-.2))),1100);}
   if(episode===6){const word=AMAMI_LATE_WORDS[6][Math.max(0,state().mainIndex-1)],correct=!state().retryMasks[word];seaCut(correct?word:'',correct);}
   if(episode===8){moveEasy(f.cx+1.35,f.cy-.5,650);later(()=>setInteriorActorPose(easy,'down','a'),700);later(()=>moveHero(f.cx,f.cy+.4,900),1500);}
   later(()=>talk(global.AmamiStoryUI.rows(episode,'mid'),()=>{finish(()=>{closeCut();done?.();});}),episode===8?2750:2350);
  }
  function retry(done){base();$('ayProgress').textContent='もういちど';later(()=>finish(done),1000);}
  function afterWord(done){if(episode!==6){done();return;}base();const word=AMAMI_LATE_WORDS[6][Math.max(0,state().mainIndex-1)],peer=seaCut(word,true);seaMotion(peer,'08');later(()=>finish(()=>{closeCut();done?.();}),1450);}
  async function castleVista(done){
   const g=generation,cut=document.createElement('div');cut.className='ay-cinema ay-vista';
   cut.innerHTML='<img class="ay-cinema-bg" src="images/fullart/amami-main-07b-final-forest-depths.png" alt="森の奥へ続く道"><div class="ay-cut-location">アマミ・森の奥</div><button class="ay-cut-close" type="button" aria-label="会話を中断してタイトルへ戻る">とじる</button><div class="ay-vista-stage"><img class="ay-vista-castle" src="images/fullart/amami-main-08-toy-castle.png" alt="目の前にそびえるおもちゃの城"><div class="ay-vista-hero" role="img" aria-label="イージーを向く主人公"></div><div class="ay-vista-easy"><img class="easy3d-frame" alt="主人公を向くイージー"></div></div>';
   root.prepend(cut);root.classList.add('cinematic');root.dataset.beat='loading';
   cut.querySelector('button').onclick=e=>{e.stopPropagation();destroy();global.showScreen('screen-title');};
   const stage=cut.querySelector('.ay-vista-stage'),hero=cut.querySelector('.ay-vista-hero'),peer=cut.querySelector('.ay-vista-easy img'),sheet=new Image(),up=new Image(),left=new Image();
   sheet.src=heroSheetUrl();up.src='images/easy-motion/easy_15_walk_up/stand.png';left.src='images/easy-motion/easy_15_walk_left/stand.png';peer.src=left.src;hero.style.backgroundImage='url("'+sheet.src+'")';
   let timeout;try{
    await Promise.race([Promise.all([sheet,up,left,...cut.querySelectorAll('img')].map(i=>i.decode())),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('vista images')),4000);})]);
    if(g!==generation||!cut.isConnected)return;
    function silhouette(img,col=0,cols=1,rows=1){const w=img.naturalWidth/cols,h=img.naturalHeight/rows,cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d');ctx.drawImage(img,col*w,0,w,h,0,0,w,h);const data=ctx.getImageData(0,0,w,h).data;let top=h,bottom=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>64){top=Math.min(top,y);bottom=Math.max(bottom,y+1);}if(bottom<=top)throw Error('empty sprite');return{fill:(bottom-top)/h,pad:(h-bottom)/h};}
    const hs={right:silhouette(sheet,2,3,2),up:silhouette(sheet,1,3,2)},es={left:silhouette(left),up:silhouette(up)};
    vista={cut,stage,hero,peer,pose(h,e){const hb=hs[h],eb=es[e];stage.style.setProperty('--vista-hero-fill',hb.fill);stage.style.setProperty('--vista-hero-pad',hb.pad);stage.style.setProperty('--vista-easy-fill',eb.fill);stage.style.setProperty('--vista-easy-pad',eb.pad);hero.dataset.dir=h;hero.style.backgroundPosition=(h==='up'?'50%':'100%')+' 0%';hero.setAttribute('aria-label',h==='up'?'城の灯りを向く主人公':'イージーを向く主人公');peer.src=(e==='up'?up:left).src;peer.dataset.dir=e;peer.alt=e==='up'?'城の灯りを向くイージー':'主人公を向くイージー';}};
    vista.pose('right','left');cut.classList.add('ready');root.dataset.beat='castle-visible';
    later(()=>talk(global.AmamiStoryUI.rows(8,'ending',c.ending),()=>vistaWalk(done)),800);
   }catch(e){if(g===generation&&cut.isConnected)ending(done,true);}finally{clearTimeout(timeout);}
  }
  function vistaWalk(done){
   const v=vista;if(!v?.cut.isConnected)return;
   const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;root.dataset.beat='hero-first';v.pose('up','up');v.stage.classList.add('hero-go');
   if(!reduced)for(let t=0;t<1400;t+=140)later(()=>{v.hero.style.backgroundPosition='50% '+(t%280?'100%':'0%');v.hero.style.setProperty('--vista-step',HeroWalkQuality.legacyB(t%280,v.hero.style.backgroundImage)?-1:1);},t);
   later(()=>{v.hero.style.backgroundPosition='50% 0%';v.hero.style.setProperty('--vista-step',1);},1400);
   later(()=>{
    root.dataset.beat='easy-follows';let started=false;
    const start=()=>{if(started||!v.cut.isConnected)return;started=true;v.stage.classList.add('easy-go');later(()=>{AmamiMotion.stop();v.peer.src='images/easy-motion/easy_15_walk_up/stand.png';root.dataset.beat='together';later(()=>{closeCut();cancelCrisis=global.AmamiStoryUI.crisisCut(root,()=>{cancelCrisis=null;done?.();});},650);},1000);};
    if(reduced)start();else AmamiMotion.play(v.peer,'15_walk_up',{onFrame:start,onDone:start});
   },600);
  }
  function ending(done,fieldOnly=false){const f=base();if(episode===8&&!fieldOnly){castleVista(done);return;}if(episode===6)AmamiMotion.play(easy,'08');if(episode===8)$('ayGlow').classList.add('show');
   if(episode===5){const words=AMAMI_LATE_WORDS[5],solved=(state().retryIndex>0?state().retryWords[state().retryIndex-1]:null)||words[Math.max(0,Math.min(words.length-1,state().mainIndex-1))];openCut(solved,true);}
   if(episode===6){const words=AMAMI_LATE_WORDS[6],last=(state().retryIndex>0?state().retryWords[state().retryIndex-1]:null)||words[Math.max(0,Math.min(words.length-1,state().mainIndex-1))];seaCut(last);}
   if(episode===7)forestCut();
   if(episode===8){const light=document.createElement('div');light.id='ayCastleLight';light.setAttribute('aria-label','森の先に見えるおもちゃの城');light.style.setProperty('--castle-x',f.cx+1.15);light.style.setProperty('--castle-y',f.cy-1.6);$('fieldGrid').appendChild(light);later(()=>light.classList.add('show'),350);later(()=>moveHero(f.cx,f.cy+.85,600),700);later(()=>moveEasy(f.cx+1.35,f.cy+.85,600),1200);}
   later(()=>talk(global.AmamiStoryUI.rows(episode,'ending',c.ending),()=>{
   closeCut();
   if(episode===6){moveHero(f.cx,f.cy+.5,850);later(()=>moveEasy(f.cx+1.35,f.cy-2,1000),500);}
   else if(episode===8){moveHero(f.cx,f.cy-.5,1300);moveEasy(f.cx+1.35,f.cy-.5,1300);}
   else{moveHero(f.cx,f.cy-.4,1300);later(()=>moveEasy(f.cx+1.35,f.cy-.4,1000),400);}
   later(()=>{if(episode===8){const g=generation;AmamiMotion.after(()=>{if(g!==generation)return;cancelCrisis=global.AmamiStoryUI.crisisCut(root,()=>{cancelCrisis=null;if(g===generation)done?.();});});}else finish(done);},2300);
  }),episode===8?1950:(episode===5?1450:850));}
  function hide(){clear();document.body.classList.remove('amami-late-mode');}
  function destroy(){hide();stopCoast?.();}
  return {entry:AmamiMotion.fieldEvent(entry),encounter:AmamiMotion.fieldEvent(encounter),mid:AmamiMotion.fieldEvent(mid),retry:AmamiMotion.fieldEvent(retry),ending:AmamiMotion.fieldEvent(ending),afterWord:AmamiMotion.fieldEvent(afterWord),hide,destroy,scene:{base,later,talk,moveHero,moveEasy,pair,finish,lockInput(ms){const target=root;target.dataset.inputLocked='true';later(()=>delete target.dataset.inputLocked,ms);}}};
 }
 let view=null,current=5;
 const api={battle:null,config:CONFIG,definition,coastAudio};
 const state=()=>amamiFinal['episode'+current];
 function clearBattle(){spawnSeq++;api.battle=null;$('ayBattleGear')?.remove();isTwinBoss=false;twinBossZoneCur=null;fieldBattleFromAuto=false;battleSource='quick';const s=$('screen-battle');s.classList.remove('amami-late-battle');s.style.backgroundImage='';s.style.backgroundSize='';s.style.backgroundPosition='';}
 api.start=function(episode){
  if(!CONFIG[episode])return;const previous=episode===5?amamiFinal.episode4:amamiFinal['episode'+(episode-1)];
  if(!previous.done){startAmamiContinuation();return;}if(amamiFinal['episode'+episode].done){showScreen('screen-title');return;}
  destroyFinalChapterEvent();destroyAmamiEpisodeOneView();destroyAmamiEpisodeTwoView();destroyAmamiEpisodeThreeView();destroyAmamiEpisodeFourView();view?.destroy();clearBattle();current=episode;view=episode>=9?AmamiCastle.createView(episode):createView(episode);
  const s=state();if(!s.entrySeen||s.phase==='entry'){s.phase='entry';save();view.entry(()=>{s.entrySeen=true;s.phase='main';save();next();});}else next();
 };
 function next(){const s=state(),words=AMAMI_LATE_WORDS[current];
  if(s.phase==='main'&&s.mainIndex>=words.length){s.phase=s.retryWords.length?'retry':'ending';s.partIndex=0;save();if(s.phase==='retry'){view.retry(next);return;}}
  if(s.phase==='retry'&&s.retryIndex>=s.retryWords.length){s.phase='ending';save();}
  if(s.phase==='ending'){walkAmamiExit(current,()=>view.ending(()=>{s.done=true;s.phase='done';save();view.destroy();view=null;if(current===12&&global.AmamiEnding)global.AmamiEnding.start();else showScreen('screen-title');}));return;}
  if(s.phase==='main'&&!s.midSeen&&s.mainIndex===CONFIG[current].mid){view.mid(()=>{s.midSeen=true;save();next();});return;}
  const word=s.phase==='retry'?s.retryWords[s.retryIndex]:words[s.mainIndex];
  walkAmamiEncounter(current,word,progress(),()=>view.encounter(word,progress(),()=>launch(word)));
 }
 function progress(){const s=state();return s.phase==='retry'?'もういちど '+(s.retryIndex+1)+'／'+s.retryWords.length:(s.mainIndex+1)+'／'+AMAMI_LATE_WORDS[current].length+'語';}
 api.progress=progress;
 function launch(word){const s=state(),mask=s.phase==='retry'?s.retryMasks[word]:3;
  if(!setupBattleCommon(102,true))return;view.hide();
  if(s.partIndex===0&&!(mask&1))s.partIndex=1;
  api.battle={episode:current,word,isRetry:s.phase==='retry',def:definition(word)};
  isTwinBoss=true;twinBossZoneCur=102;twinTurn=s.partIndex===0?'isshin':'doutai';twinHp={isshin:s.partIndex===0&&(mask&1)?1:0,doutai:mask&2?1:0};
  battleSource='field';fieldBattleFromAuto=true;fieldIsBoss=false;isEventBoss=false;queue=[];
  showScreen('screen-battle');$('bStageName').textContent=CONFIG[current].name;$('affHelp').style.display='none';spawnTwinBossEnemy();
 }
 api.applyVisual=function(){const c=CONFIG[current],s=$('screen-battle');s.classList.add('tate','amami-late-battle');s.style.backgroundImage=`url('images/battle-tate/${c.battle}')`;s.style.backgroundPosition=c.pos;s.style.backgroundSize=c.size;$('bScene').className='scene battle tatebg';$('bScene').style.backgroundImage='';if(current===10&&!$('ayBattleGear')){const gear=document.createElement('span');gear.id='ayBattleGear';gear.textContent='⚙';gear.setAttribute('aria-hidden','true');$('bScene').appendChild(gear);}};
 api.renderHp=function(){['isshin','doutai'].forEach((key,i)=>{$('twinHp'+(i+1)).innerHTML='<span'+(twinHp[key]?'':' class="edim"')+'>⭐</span>';$('enemyChar'+(i?'2':'')).classList.toggle('ay-half-done',!twinHp[key]);});};
 api.answer=function(btn,correct){const battle=api.battle;if(!battle)return;const s=state(),part=s.partIndex,seq=spawnSeq,def=battle.def,word=part?def.second:def.first,y=part?def.sy:def.fy;
  btn.classList.add(correct?'correct':'wrong');combo=0;
  if(!correct){battle.hadMistake=true;sfxWrong();document.querySelectorAll('#bOptions .opt').forEach(n=>{if(curCorrectSet.has(n.textContent))n.classList.add('correct');});
   if(!battle.isRetry){if(!s.retryWords.includes(battle.word))s.retryWords.push(battle.word);s.retryMasks[battle.word]=(s.retryMasks[battle.word]||0)|(part?2:1);save();}
   setMsg('『'+word+'』は 『'+y+'』と よむよ！');setTimeout(()=>{if(seq===spawnSeq)finishHalf();},1500);return;
  }
  playAttackDash(selectedAttacker,()=>{if(seq!==spawnSeq)return;sfxCorrect();const target=$('enemyChar'+(part?'2':''));target.classList.add('attacked');playHitFx(target,false);setTimeout(()=>{if(seq!==spawnSeq)return;target.classList.remove('attacked');finishHalf();},650);});
 };
 function finishHalf(){const b=api.battle;if(!b)return;const s=state(),part=s.partIndex;const mask=b.isRetry?s.retryMasks[b.word]:3;
  twinHp[part?'doutai':'isshin']=0;renderTwinHp();
  if(part===0&&(mask&2)){s.partIndex=1;save();twinTurn='doutai';twinBossUpdateHighlight();answering=false;phase='select';$('bOptions').innerHTML='';setMsg('つぎは 『'+b.def.second+'』！<br>かんじもんを えらぼう');renderParty();return;}
  s.partIndex=0;if(b.isRetry)s.retryIndex++;else s.mainIndex++;save();
  $('enemyWrap').classList.add('defeated');const entry=YOJIJUKUGO[YOJIJUKUGO_BY_KEY[b.word]];
  setMsg('『'+b.word+'』<br>'+b.def.y+(entry?'<br><span class="meaning">'+entry.mean+'</span>':''));
  const seq=spawnSeq;setTimeout(()=>{if(seq!==spawnSeq)return;clearBattle();if(!b.isRetry&&view?.afterWord&&(current===9||!s.retryMasks[b.word]))view.afterWord(next);else next();},1000);
 }
 api.abort=function(){save();clearBattle();view?.destroy();view=null;showScreen('screen-title');};
 api.createView=createView;
 global.AmamiLate=api;
})(window);
