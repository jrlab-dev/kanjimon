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
    let root=setupRoot(host),generation=0,timers=[],easy=null,wordEl=null,ready=false,lineIndex=0,lines=[],afterTalk=null,near=options.near===true,crisisCancel=null;
    const gender=()=>options.gender==='girl'?'girl':'boy';
    const alive=g=>g===generation;
    function later(fn,ms,g=generation){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);if(alive(g))fn();},ms);timers.push(id);return id;}
    function clearTimers(){timers.forEach(id=>{clearTimeout(id);clearInterval(id);});timers=[];crisisCancel?.();crisisCancel=null;}
    function closeCut(){
      const cut=root.querySelector('.ask-cinema');if(!cut)return;
      global.AmamiMotion.stop();cut.remove();root.classList.remove('cinematic');delete root.dataset.shot;delete root.dataset.beat;
    }
    function openCut(){
      closeCut();global.AmamiMotion.stop();
      const cut=document.createElement('div');cut.className='ask-cinema';
      cut.innerHTML='<img class="ask-cinema-bg" src="images/fullart/amami-kinsakubaru-conversation.webp" alt="月明かりの金作原で向き合う"><div class="ask-cut-location">アマミ・金作原</div><button class="ask-cut-close" type="button" aria-label="会話を中断してタイトルへ戻る">とじる</button><div class="ask-cinema-stage"><img class="ask-shoulder" alt="イージーと向き合う主人公"><img class="ask-close-easy easy3d-frame" src="images/easy-motion/poster.png" alt="イージー"><img class="ask-close-hero" alt="わかった喜びを見せる主人公"></div>';
      const sf=typeof costumeSuffix==='function'?costumeSuffix():'';
      cut.querySelector('.ask-shoulder').src='images/battle-tate/hero-back-'+gender()+sf+'.webp';
      cut.querySelector('.ask-close-hero').src='images/battle-tate/hero-victory-'+gender()+sf+'.webp';
      for(const img of cut.querySelectorAll('img'))img.addEventListener('error',()=>{if(cut.isConnected)closeCut();},{once:true});
      cut.querySelector('button').addEventListener('click',e=>{e.stopPropagation();destroy();global.showScreen('screen-title');});
      root.prepend(cut);root.classList.add('cinematic');root.dataset.shot='easy';
      global.AmamiStoryUI.sizeConversation(cut,'ask');
      return cut;
    }
    function cutLine(row){
      const target=root.querySelector('.ask-close-easy')||easy;
      root.dataset.shot='easy';root.dataset.beat=({C04a:'watch',C04b:'share',C04c:'invent'})[row.id]||'';
      if(row.id==='C04a')global.AmamiMotion.play(target,'01');
      if(row.id==='C04b')global.AmamiMotion.play(target,'12');
      if(row.id==='C04c')global.AmamiMotion.play(target,'07');
    }
    function clearActors(){global.AmamiVoice.stop();global.AmamiMotion.stop();qa('.ask-field-enemy').forEach(n=>n.remove());qa('.amami-easy').forEach(n=>n.remove());wordEl=null;easy=null;}
    let musicToken=null;
    function resetTalk(){global.bgmSceneEnd(musicToken);musicToken=null;ready=false;lineIndex=0;lines=[];afterTalk=null;q('#askTalk',root)?.classList.remove('show');q('#askNext',root)?.classList.remove('ready');}
    function base(){
      closeCut();clearTimers();clearActors();resetTalk();
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
      const row=lines[lineIndex++];global.AmamiStoryUI.display(row,box,q('#askFace',root),q('#askWho',root),q('#askText',root));cutLine(row);
      later(()=>{ready=true;next.classList.add('ready');},520);
    }
    function talk(texts,done){musicToken=global.bgmSceneBegin('amami-4-talk','easy');lines=texts.slice();lineIndex=0;afterTalk=()=>{global.bgmSceneEnd(musicToken);musicToken=null;done?.();};showLine();}
    function next(){if(!ready||global.AmamiMotion.busy||global.AmamiVoice.busy)return false;showLine();return true;}
    root.addEventListener('click',next);
    function entry(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      openCut();
      const ch=q('#askChapter',root);later(()=>ch.classList.add('show'),120,g);later(()=>ch.classList.remove('show'),1550,g);
      q('#askChapter b',root).textContent=global.AmamiStory?.chapters?.[4]?.title||'答えを言わずに待つ';
      later(()=>talk(global.AmamiStoryUI.rows(4,'entry',['見えなくても、すすむ？']),()=>{closeCut();done?.();}),1850,g);
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
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g))talk(global.AmamiStoryUI.rows(4,'mid'),done);});},2270,g);
    }
    function retryMark(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);base();const g=generation,p=q('#askProgress',root);p.textContent='もういちど';p.classList.add('show');
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},1250,g);
    }
    function ending(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      q('#askGlow',root)?.classList.add('show');
      const cut=openCut();root.dataset.shot='hero';root.dataset.beat='joy';
      later(()=>{try{setHeroFacing(0,-1);}catch(e){}},950,g);
      const showEnding=()=>talk(global.AmamiStoryUI.rows(4,'ending',['ぼくが 言わなくても、見つけるんだ。']),()=>{
        closeCut();
        if(easy)global.AmamiMotion.walk(easy,{x:f.cx+1.15,y:f.cy+1.55},900);
        later(()=>walkHero({x:f.cx,y:f.cy+.75},900),1300,g);
        later(()=>global.AmamiMotion.after(()=>{if(alive(g))crisisCancel=global.AmamiStoryUI.crisisCut(root,()=>{crisisCancel=null;if(alive(g))done?.();});}),2350,g);
      });
      // 画像を待ってから喜びの間を置く。失敗・低速時にも進行を止めない。
      let begun=false;const beginJoy=()=>{if(begun||!alive(g))return;begun=true;later(showEnding,1200,g);};
      const face=cut.querySelector('.ask-close-hero');face.addEventListener('load',beginJoy,{once:true});face.addEventListener('error',beginJoy,{once:true});
      if(face.complete)beginJoy();else later(beginJoy,3000,g);
    }
    function hideForBattle(){generation++;closeCut();clearTimers();clearActors();resetTalk();root.classList.remove('active');document.body.classList.remove('amami-episode4-mode');}
    function destroy(){generation++;closeCut();clearTimers();clearActors();resetTalk();document.body.classList.remove('amami-episode4-mode');root?.remove();}
    return{entry:global.AmamiMotion.fieldEvent(entry),encounter:global.AmamiMotion.fieldEvent(encounter),mid:global.AmamiMotion.fieldEvent(mid),retryMark:global.AmamiMotion.fieldEvent(retryMark),ending:global.AmamiMotion.fieldEvent(ending),hideForBattle,next,destroy};
  }
  global.AmamiEpisodeFourView={create};
})(window);
