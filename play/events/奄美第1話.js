/* 奄美最終章・第1話「芦徳：それでも進む」のフィールドと会話。戦闘進行は本体が担当する。 */
(function(global){
  'use strict';
  const $=id=>document.getElementById(id),q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const EASY_FACE='images/bust/easy.webp';

  function setupRoot(host){
    $('amamiEpisode1Root')?.remove();
    const root=document.createElement('div');
    root.id='amamiEpisode1Root';
    root.innerHTML='<div id="aseChapter"><small>第1話</small><b>それでも進む</b></div><div id="aseProgress"></div><div id="aseTalk"><img id="aseFace" alt="イージー"><div><b id="aseWho">イージー</b><p id="aseText"></p><small id="aseNext">▼ つづく</small></div></div>';
    (host||document.body).appendChild(root);
    $('aseFace').src=EASY_FACE;
    return root;
  }

  function create(host,options={}){
    let root=setupRoot(host),generation=0,timers=[],easy=null,wordEl=null,ready=false,lineIndex=0,lines=[],afterTalk=null;
    const gender=()=>options.gender==='girl'?'girl':'boy';
    const alive=g=>g===generation;
    function later(fn,ms,g=generation){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);if(alive(g))fn();},ms);timers.push(id);return id;}
    function clearTimers(){timers.forEach(clearTimeout);timers=[];}
    function closeCut(){
      if(!root.querySelector('.ase-cinema'))return;
      global.AmamiMotion.stop();root.querySelector('.ase-cinema')?.remove();root.classList.remove('cinematic');delete root.dataset.shot;
    }
    function openCut(){
      closeCut();global.AmamiMotion.stop();
      const cut=document.createElement('div');cut.className='ase-cinema';
      cut.innerHTML='<img class="ase-cinema-bg" src="images/fullart/amami-ashitoku-conversation.webp" alt="海辺の芦徳で向き合う"><div class="ase-cut-location">アマミ・芦徳</div><button class="ase-cut-close" type="button" aria-label="会話を中断してタイトルへ戻る">とじる</button><div class="ase-cinema-stage"><img class="ase-shoulder" alt="イージーに向き合う主人公"><img class="ase-close-easy easy3d-frame" src="images/easy-motion/poster.png" alt="イージー"><img class="ase-close-hero" alt="次の言葉を楽しみにする主人公"></div>';
      const sf=typeof costumeSuffix==='function'?costumeSuffix():'';
      cut.querySelector('.ase-shoulder').src='images/battle-tate/hero-ready-'+gender()+sf+'.webp';
      // 読込の先行取得状態に左右されず、今着ている服の実画像を使う。
      cut.querySelector('.ase-close-hero').src='images/battle-tate/hero-victory-'+gender()+sf+'.webp';
      for(const img of cut.querySelectorAll('img'))img.addEventListener('error',()=>{if(cut.isConnected)closeCut();},{once:true});
      cut.querySelector('button').addEventListener('click',e=>{e.stopPropagation();destroy();global.showScreen('screen-title');});
      root.prepend(cut);root.classList.add('cinematic');root.dataset.shot='easy';
      global.AmamiStoryUI.sizeConversation(cut,'ase');
    }
    function cutLine(row){
      const cut=root.querySelector('.ase-cinema');if(!cut)return;
      const isHero=row.speaker==='hero';root.dataset.shot=isHero?'hero':'easy';
      if(isHero)global.AmamiMotion.stop();
      else if(row.id==='C01b')global.AmamiMotion.play(cut.querySelector('.ase-close-easy'),'13');
      else if(row.id==='C01d')global.AmamiMotion.play(cut.querySelector('.ase-close-easy'),'05');
    }
    function clearActors(){global.AmamiVoice.stop();global.AmamiMotion.stop();qa('.ase-field-enemy').forEach(n=>n.remove());qa('.amami-easy').forEach(n=>n.remove());wordEl=null;easy=null;}
    function resetTalk(){ready=false;lineIndex=0;lines=[];afterTalk=null;q('#aseTalk',root)?.classList.remove('show');q('#aseNext',root)?.classList.remove('ready');}
    function base(){
      closeCut();clearTimers();clearActors();resetTalk();
      if(!global.NationalDeparture||!global.AmamiArrival)throw new Error('奄美フィールド部品がありません');
      const f=global.NationalDeparture.showField(102,{gender:gender(),hero:true,label:'芦徳・海辺の宿場',adults:0,mana:false,monsters:0,background:'amami-main-01-ashitoku.png',point:{x:15,y:6}});
      document.body.classList.add('amami-episode1-mode');root.classList.add('active');
      q('#aseChapter',root)?.classList.remove('show');q('#aseProgress',root)?.classList.remove('show');
      const hero=$('fieldHero');if(hero){hero.style.transition='none';hero.style.setProperty('--hx',f.cx);hero.style.setProperty('--hy',f.cy+1.45);try{setHeroFacing(0,-1);}catch(e){}}
      easy=global.AmamiArrival.placeEasy(f.cx+1.65,f.cy-1.55,1.25,'down');
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
      wordEl=document.createElement('div');wordEl.className='ase-field-enemy arrive';wordEl.style.setProperty('--ase-x',x);wordEl.style.setProperty('--ase-y',y);
      global.AmamiMotion.fieldMonster(wordEl,word);
      $('fieldGrid').appendChild(wordEl);return wordEl;
    }
    function showLine(){global.AmamiVoice.stop();
      const box=q('#aseTalk',root),next=q('#aseNext',root);ready=false;next.classList.remove('ready');
      if(lineIndex>=lines.length){box.classList.remove('show');const cb=afterTalk;afterTalk=null;if(cb)cb();return;}
      const row=lines[lineIndex++];
      const shown=row?.speaker==='hero'?{...row,portrait:'images/battle-tate/hero-victory-'+gender()+(typeof costumeSuffix==='function'?costumeSuffix():'')+'.webp'}:row;
      global.AmamiStoryUI.display(shown,box,q('#aseFace',root),q('#aseWho',root),q('#aseText',root));cutLine(row);
      later(()=>{ready=true;next.classList.add('ready');},520);
    }
    function talk(texts,done){lines=texts.slice();lineIndex=0;afterTalk=done;showLine();}
    function next(){if(!ready||global.AmamiMotion.busy||global.AmamiVoice.busy)return false;showLine();return true;}
    root.addEventListener('click',next);
    function entry(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      openCut();global.AmamiMotion.play(root.querySelector('.ase-close-easy')||easy,'04');
      const ch=q('#aseChapter',root);later(()=>ch.classList.add('show'),120,g);later(()=>ch.classList.remove('show'),1550,g);
      q('#aseChapter b',root).textContent=global.AmamiStory?.chapters?.[1]?.title||'それでも進む';
      later(()=>talk(global.AmamiStoryUI.rows(1,'entry',['ここからは、ぼくが えらんだ ことば。','……かんたんじゃ ないよ。']),()=>{closeCut();done?.();}),1850,g);
      if(easy){easy.style.opacity='0';later(()=>{if(easy)easy.style.opacity='1';},250,g);}
      return f;
    }
    function encounter(data,done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      const p=q('#aseProgress',root);p.textContent=data.label;p.classList.add('show');
      placeWord(data.word,f.cx+.35,f.cy-2.85);
      later(()=>walkHero({x:f.cx,y:f.cy+.55},820),280,g);
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},1350,g);
    }
    function mid(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      const p=q('#aseProgress',root);p.textContent='3／12語';p.classList.add('show');
      later(()=>walkHero({x:f.cx,y:f.cy-.15},1050),250,g);
      later(()=>{if(easy)global.AmamiMotion.play(easy,'01');},720,g);
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g))talk(global.AmamiStoryUI.rows(1,'mid'),done);});},1650,g);
    }
    function retryMark(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);base();const g=generation,p=q('#aseProgress',root);p.textContent='もういちど';p.classList.add('show');
      if(easy){global.AmamiMotion.play(easy,'01');}
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},1250,g);
    }
    function ending(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      if(easy){easy.style.setProperty('--ix',f.cx+1.35);easy.style.setProperty('--iy',f.cy-.7);}
      later(()=>walkHero({x:f.cx-.25,y:f.cy-2.05},1700),260,g);
      later(()=>{openCut();talk(global.AmamiStoryUI.rows(1,'ending',['……まだ、いくんだね。']),()=>{closeCut();walkHero({x:f.cx-.25,y:f.cy-3.8},1150);later(()=>global.AmamiMotion.after(()=>{if(alive(g)&&done)done();}),1250,g);});},2000,g);
    }
    function hideForBattle(){closeCut();clearTimers();clearActors();resetTalk();root.classList.remove('active');document.body.classList.remove('amami-episode1-mode');}
    function destroy(){generation++;closeCut();clearTimers();clearActors();resetTalk();document.body.classList.remove('amami-episode1-mode');root?.remove();}
    return{entry:global.AmamiMotion.fieldEvent(entry),encounter:global.AmamiMotion.fieldEvent(encounter),mid:global.AmamiMotion.fieldEvent(mid),retryMark:global.AmamiMotion.fieldEvent(retryMark),ending:global.AmamiMotion.fieldEvent(ending),hideForBattle,next,destroy};
  }
  global.AmamiEpisodeOneView={create};
})(window);
