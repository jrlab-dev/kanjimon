/* 奄美最終章・第4話「金作原：答えを言わずに待つ」のフィールドと会話。戦闘進行は本体が担当する。 */
(function(global){
  'use strict';
  const $=id=>document.getElementById(id),q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const EASY_FACE='images/bust/easy.webp';

  function setupRoot(host){
    $('amamiEpisode4Root')?.remove();
    const root=document.createElement('div');
    root.id='amamiEpisode4Root';
    root.innerHTML='<div id="askRabbit"></div><div id="askGlow"></div><div id="askHush">……</div><div id="askChapter"><small>第4話</small><b>答えを言わずに待つ</b></div><div id="askProgress"></div><div id="askTalk"><img id="askFace" alt="イージー"><div><b id="askWho">イージー</b><p id="askText"></p><small id="askNext">▼ つづく</small></div></div>';
    (host||document.body).appendChild(root);
    $('askFace').src=EASY_FACE;
    return root;
  }

  function create(host,options={}){
    let root=setupRoot(host),generation=0,timers=[],easy=null,wordEl=null,ready=false,lineIndex=0,lines=[],afterTalk=null,near=options.near===true;
    const gender=()=>options.gender==='girl'?'girl':'boy';
    const alive=g=>g===generation;
    function later(fn,ms,g=generation){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);if(alive(g))fn();},ms);timers.push(id);return id;}
    function clearTimers(){timers.forEach(id=>{clearTimeout(id);clearInterval(id);});timers=[];}
    function clearActors(){global.AmamiVoice.stop();global.AmamiMotion.stop();qa('.ask-field-enemy').forEach(n=>n.remove());qa('.amami-easy').forEach(n=>n.remove());wordEl=null;easy=null;}
    function resetTalk(){ready=false;lineIndex=0;lines=[];afterTalk=null;q('#askTalk',root)?.classList.remove('show');q('#askNext',root)?.classList.remove('ready');}
    function base(){
      clearTimers();clearActors();resetTalk();
      if(!global.NationalDeparture||!global.AmamiArrival)throw new Error('奄美フィールド部品がありません');
      const f=global.NationalDeparture.showField(102,{gender:gender(),hero:true,label:'金作原の夜の森',adults:0,mana:false,monsters:0,background:'amami-main-04-kinsakubaru-night.png',point:{x:15,y:6}});
      document.body.classList.add('amami-episode4-mode');root.classList.add('active');
      q('#askChapter',root)?.classList.remove('show');q('#askProgress',root)?.classList.remove('show');
      const hero=$('fieldHero');if(hero){hero.style.transition='none';hero.style.setProperty('--hx',f.cx);hero.style.setProperty('--hy',f.cy+1.55);try{setHeroFacing(0,-1);}catch(e){}}
      easy=global.AmamiArrival.placeEasy(f.cx+(near?1.3:1.8),f.cy+(near?.25:-1.45),1.25,'down');
      return f;
    }
    function walkHero(to,duration=900){
      const hero=$('fieldHero');if(!hero)return;
      try{setHeroFacing(Math.sign(to.x-Number(hero.style.getPropertyValue('--hx')||0)),Math.sign(to.y-Number(hero.style.getPropertyValue('--hy')||0)));}catch(e){}
      const sp=q('.hero-sprite',hero);let frame=false;const tick=setInterval(()=>{frame=!frame;global.AmamiArrival.heroWalkFrame(sp,frame);},140);timers.push(tick);
      hero.style.transition=`left ${duration}ms linear,top ${duration}ms linear`;hero.style.setProperty('--hx',to.x);hero.style.setProperty('--hy',to.y);
      later(()=>{clearInterval(tick);timers=timers.filter(x=>x!==tick);global.AmamiArrival.heroWalkFrame(sp,false);},duration+30);
    }
    function placeWord(word,x,y){
      wordEl=document.createElement('div');wordEl.className='ask-field-enemy arrive';wordEl.style.setProperty('--ask-x',x);wordEl.style.setProperty('--ask-y',y);
      global.AmamiMotion.fieldMonster(wordEl,word);
      $('fieldGrid').appendChild(wordEl);return wordEl;
    }
    function showLine(){global.AmamiVoice.stop();
      const box=q('#askTalk',root),next=q('#askNext',root);ready=false;next.classList.remove('ready');
      if(lineIndex>=lines.length){box.classList.remove('show');const cb=afterTalk;afterTalk=null;if(cb)cb();return;}
      q('#askText',root).textContent=lines[lineIndex++];box.classList.add('show');global.AmamiVoice.play(q('#askText',root).textContent,box);
      later(()=>{ready=true;next.classList.add('ready');},520);
    }
    function talk(texts,done){lines=texts.slice();lineIndex=0;afterTalk=done;showLine();}
    function next(){if(!ready||global.AmamiMotion.busy||global.AmamiVoice.busy)return false;showLine();return true;}
    root.addEventListener('click',next);
    function entry(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      global.AmamiMotion.play(easy,'06');
      const ch=q('#askChapter',root);later(()=>ch.classList.add('show'),120,g);later(()=>ch.classList.remove('show'),1550,g);
      later(()=>talk(['見えなくても、すすむ？'],done),1850,g);
      later(()=>q('#askRabbit',root)?.classList.add('pass'),450,g);
      if(easy){easy.style.opacity='0';later(()=>{if(easy)easy.style.opacity='1';},250,g);}
      return f;
    }
    function encounter(data,done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      const p=q('#askProgress',root);p.textContent=data.label;p.classList.add('show');
      placeWord(data.word,f.cx+.4,f.cy-2.9);
      const pause=['規律','創意','難題','誤字'].includes(data.word)?1050:0;
      if(pause){later(()=>{if(easy)global.AmamiMotion.walk(easy,{x:f.cx+1.3,y:Number(easy.style.getPropertyValue('--iy'))},350);q('#askHush',root)?.classList.add('show');},180,g);later(()=>q('#askHush',root)?.classList.remove('show'),850,g);}
      later(()=>walkHero({x:f.cx,y:f.cy+.6},850),280+pause,g);
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},1380+pause,g);
    }
    function mid(done){
      near=true;generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      const p=q('#askProgress',root);p.textContent='4／12語';p.classList.add('show');
      if(easy){easy.style.setProperty('--iy',f.cy-.8);later(()=>global.AmamiMotion.walk(easy,{x:Number(easy.style.getPropertyValue('--ix')),y:f.cy+.25},800),250,g);}
      later(()=>{try{setHeroFacing(0,-1);}catch(e){}},1300,g);
      later(()=>walkHero({x:f.cx,y:f.cy+.3},720),1450,g);
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},2270,g);
    }
    function retryMark(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);base();const g=generation,p=q('#askProgress',root);p.textContent='もういちど';p.classList.add('show');
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},1250,g);
    }
    function ending(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      q('#askGlow',root)?.classList.add('show');
      later(()=>{try{setHeroFacing(0,-1);}catch(e){}},950,g);
      later(()=>talk(['ぼくが 言わなくても、見つけるんだ。'],()=>{
        if(easy)global.AmamiMotion.walk(easy,{x:f.cx+1.15,y:f.cy+1.55},900);
        later(()=>walkHero({x:f.cx,y:f.cy+.75},900),1300,g);
        later(()=>global.AmamiMotion.after(()=>{if(alive(g)&&done)done();}),2350,g);
      }),1200,g);
    }
    function hideForBattle(){clearTimers();clearActors();resetTalk();root.classList.remove('active');document.body.classList.remove('amami-episode4-mode');}
    function destroy(){generation++;clearTimers();clearActors();resetTalk();document.body.classList.remove('amami-episode4-mode');root?.remove();}
    return{entry:global.AmamiMotion.fieldEvent(entry),encounter:global.AmamiMotion.fieldEvent(encounter),mid:global.AmamiMotion.fieldEvent(mid),retryMark:global.AmamiMotion.fieldEvent(retryMark),ending:global.AmamiMotion.fieldEvent(ending),hideForBattle,next,destroy};
  }
  global.AmamiEpisodeFourView={create};
})(window);
