/* 奄美最終章・第2話「戸口：迷っても戻らない」のフィールドと会話。戦闘進行は本体が担当する。 */
(function(global){
  'use strict';
  const $=id=>document.getElementById(id),q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const EASY_FACE='images/bust/easy.webp';

  function setupRoot(host){
    $('amamiEpisode2Root')?.remove();
    const root=document.createElement('div');
    root.id='amamiEpisode2Root';
    root.innerHTML='<div id="astChapter"><small>第2話</small><b>迷っても戻らない</b></div><div id="astProgress"></div><div id="astWave" aria-hidden="true"><i></i><i></i><i></i></div><div id="astTalk"><img id="astFace" alt="イージー"><div><b id="astWho">イージー</b><p id="astText"></p><small id="astNext">▼ つづく</small></div></div>';
    (host||document.body).appendChild(root);
    $('astFace').src=EASY_FACE;
    return root;
  }

  function create(host,options={}){
    let root=setupRoot(host),generation=0,timers=[],easy=null,wordEl=null,ready=false,lineIndex=0,lines=[],afterTalk=null;
    const gender=()=>options.gender==='girl'?'girl':'boy';
    const alive=g=>g===generation;
    function later(fn,ms,g=generation){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);if(alive(g))fn();},ms);timers.push(id);return id;}
    function clearTimers(){timers.forEach(id=>{clearTimeout(id);clearInterval(id);});timers=[];}
    function clearActors(){global.AmamiVoice.stop();global.AmamiMotion.stop();qa('.ast-field-enemy').forEach(n=>n.remove());qa('.amami-easy').forEach(n=>n.remove());wordEl=null;easy=null;}
    function resetTalk(){ready=false;lineIndex=0;lines=[];afterTalk=null;q('#astTalk',root)?.classList.remove('show');q('#astNext',root)?.classList.remove('ready');}
    function base(){
      clearTimers();clearActors();resetTalk();
      if(!global.NationalDeparture||!global.AmamiArrival)throw new Error('奄美フィールド部品がありません');
      const f=global.NationalDeparture.showField(102,{gender:gender(),hero:true,label:'戸口・海を望む崖',adults:0,mana:false,monsters:0,background:'amami-main-02-toguchi-cliff.png',point:{x:15,y:6}});
      document.body.classList.add('amami-episode2-mode');root.classList.add('active');
      q('#astChapter',root)?.classList.remove('show');q('#astProgress',root)?.classList.remove('show');q('#astWave',root)?.classList.remove('show');
      const hero=$('fieldHero');if(hero){hero.style.transition='none';hero.style.setProperty('--hx',f.cx);hero.style.setProperty('--hy',f.cy+1.55);try{setHeroFacing(0,-1);}catch(e){}}
      easy=global.AmamiArrival.placeEasy(f.cx+1.8,f.cy-1.45,1.25,'down');
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
      wordEl=document.createElement('div');wordEl.className='ast-field-enemy arrive';wordEl.style.setProperty('--ast-x',x);wordEl.style.setProperty('--ast-y',y);
      global.AmamiMotion.fieldMonster(wordEl,word);
      $('fieldGrid').appendChild(wordEl);return wordEl;
    }
    function showLine(){global.AmamiVoice.stop();
      const box=q('#astTalk',root),next=q('#astNext',root);ready=false;next.classList.remove('ready');
      if(lineIndex>=lines.length){box.classList.remove('show');const cb=afterTalk;afterTalk=null;if(cb)cb();return;}
      q('#astText',root).textContent=lines[lineIndex++];box.classList.add('show');global.AmamiVoice.play(q('#astText',root).textContent,box);
      later(()=>{ready=true;next.classList.add('ready');},520);
    }
    function talk(texts,done){lines=texts.slice();lineIndex=0;afterTalk=done;showLine();}
    function next(){if(!ready||global.AmamiMotion.busy||global.AmamiVoice.busy)return false;showLine();return true;}
    root.addEventListener('click',next);
    function entry(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      global.AmamiMotion.play(easy,'13');
      const ch=q('#astChapter',root);later(()=>ch.classList.add('show'),120,g);later(()=>ch.classList.remove('show'),1550,g);
      later(()=>talk(['同じ字でも、ちがう ことばに したよ。','さっきより、まようかも。'],done),1850,g);
      if(easy){easy.style.opacity='0';later(()=>{if(easy)easy.style.opacity='1';},250,g);}
      return f;
    }
    function encounter(data,done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      const p=q('#astProgress',root);p.textContent=data.label;p.classList.add('show');
      // 戸口の中央上部は海。熟語は手前の陸の道に置く。
      placeWord(data.word,f.cx+1.8,f.cy+.2);
      later(()=>walkHero({x:f.cx,y:f.cy+.6},850),280,g);
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},1380,g);
    }
    function mid(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      const p=q('#astProgress',root),wave=q('#astWave',root);p.textContent='4／12語';p.classList.add('show');
      later(()=>wave.classList.add('show'),260,g);
      later(()=>walkHero({x:f.cx,y:f.cy+.3},720),1050,g);
      later(()=>wave.classList.remove('show'),1480,g);
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},1780,g);
    }
    function retryMark(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);base();const g=generation,p=q('#astProgress',root);p.textContent='もういちど';p.classList.add('show');
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},1250,g);
    }
    function ending(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      if(easy){easy.style.setProperty('--ix',f.cx+1);easy.style.setProperty('--iy',f.cy+1.2);}
      later(()=>talk(['止まったのに、もどらなかった。'],()=>{
        // 戸口は北側が海。二人とも右へ続く陸の道を進む。
        walkHero({x:f.cx+3,y:f.cy+.1},1500);
        later(()=>{if(easy)global.AmamiMotion.walk(easy,{x:f.cx+2,y:f.cy+.9},1250);},330,g);
        later(()=>global.AmamiMotion.after(()=>{if(alive(g)&&done)done();}),1620,g);
      }),560,g);
    }
    function hideForBattle(){clearTimers();clearActors();resetTalk();root.classList.remove('active');document.body.classList.remove('amami-episode2-mode');}
    function destroy(){generation++;clearTimers();clearActors();resetTalk();document.body.classList.remove('amami-episode2-mode');root?.remove();}
    return{entry:global.AmamiMotion.fieldEvent(entry),encounter:global.AmamiMotion.fieldEvent(encounter),mid:global.AmamiMotion.fieldEvent(mid),retryMark:global.AmamiMotion.fieldEvent(retryMark),ending:global.AmamiMotion.fieldEvent(ending),hideForBattle,next,destroy};
  }
  global.AmamiEpisodeTwoView={create};
})(window);
