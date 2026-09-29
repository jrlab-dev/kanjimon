/* 奄美最終章・第2話「戸口：迷っても戻らない」のフィールドと会話。戦闘進行は本体が担当する。 */
(function(global){
  'use strict';
  const $=id=>document.getElementById(id),q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const EASY_FACE='images/bust/easy.webp';

  function setupRoot(host){
    $('amamiEpisode2Root')?.remove();
    const root=document.createElement('div');
    root.id='amamiEpisode2Root';
    root.innerHTML='<div id="astChapter"><small>第2話</small><b>迷っても戻らない</b></div><div id="astProgress"></div><div id="astWave" aria-hidden="true"><i></i><i></i><i></i></div><div id="astCompare" aria-label="復習、往復、回復という三つの熟語を見比べる"><span><b>復</b>習</span><span>往<b>復</b></span><span>回<b>復</b></span></div><div id="astTalk"><img id="astFace" alt="イージー"><div><b id="astWho">イージー</b><p id="astText"></p><small id="astNext">▼ つづく</small></div></div>';
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
    function closeCut(){
      const cut=root.querySelector('.ast-cinema');if(!cut)return;
      global.AmamiMotion.stop();const compare=q('#astCompare',root);
      if(compare){root.insertBefore(compare,q('#astTalk',root));compare.classList.remove('show','follow-second');delete compare.dataset.focus;}
      cut.remove();root.classList.remove('cinematic');delete root.dataset.shot;
    }
    function openCut(comparing=false){
      closeCut();global.AmamiMotion.stop();const cut=document.createElement('div');cut.className='ast-cinema';
      cut.innerHTML='<img class="ast-cinema-bg" src="images/fullart/amami-toguchi-conversation.webp" alt="戸口の草地から望む海"><div class="ast-cut-location">アマミ・戸口</div><button class="ast-cut-close" type="button" aria-label="会話を中断してタイトルへ戻る">とじる</button><div class="ast-cinema-stage"><img class="ast-shoulder" alt="イージーに向き合う主人公"><img class="ast-close-easy easy3d-frame" src="images/easy-motion/poster.png" alt="イージー"><img class="ast-close-hero" alt="言葉のつながりを見つけた主人公"></div>';
      const sf=typeof costumeSuffix==='function'?costumeSuffix():'';
      cut.querySelector('.ast-shoulder').src='images/battle-tate/hero-ready-'+gender()+sf+'.webp';
      cut.querySelector('.ast-close-hero').src='images/battle-tate/hero-victory-'+gender()+sf+'.webp';
      for(const img of cut.querySelectorAll('img'))img.addEventListener('error',()=>{if(cut.isConnected){closeCut();if(comparing)q('#astCompare',root)?.classList.add('show');}},{once:true});
      cut.querySelector('button').addEventListener('click',e=>{e.stopPropagation();destroy();global.showScreen('screen-title');});
      if(comparing){const compare=q('#astCompare',root);compare.classList.add('show');cut.append(compare);}
      root.prepend(cut);root.classList.add('cinematic');root.dataset.shot=comparing?'words':'easy';
      global.AmamiStoryUI.sizeConversation(cut,'ast');
    }
    function cutLine(row){
      const cut=root.querySelector('.ast-cinema');if(!cut)return;
      const isHero=row?.speaker==='hero';root.dataset.shot=isHero?'hero':'easy';
      if(isHero)global.AmamiMotion.stop();
      else if(row?.id==='C02c')global.AmamiMotion.play(cut.querySelector('.ast-close-easy'),'13');
    }
    function clearActors(){global.AmamiVoice.stop();global.AmamiMotion.stop();qa('.ast-field-enemy').forEach(n=>n.remove());qa('.amami-easy').forEach(n=>n.remove());wordEl=null;easy=null;}
    function resetTalk(){ready=false;lineIndex=0;lines=[];afterTalk=null;q('#astTalk',root)?.classList.remove('show');q('#astNext',root)?.classList.remove('ready');}
    function base(){
      closeCut();clearTimers();clearActors();resetTalk();
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
      const row=lines[lineIndex++],shown=row?.speaker==='hero'?{...row,portrait:'images/battle-tate/hero-victory-'+gender()+(typeof costumeSuffix==='function'?costumeSuffix():'')+'.webp'}:row;
      global.AmamiStoryUI.display(shown,box,q('#astFace',root),q('#astWho',root),q('#astText',root));cutLine(row);
      later(()=>{ready=true;next.classList.add('ready');},520);
    }
    function talk(texts,done){lines=texts.slice();lineIndex=0;afterTalk=done;showLine();}
    function next(){if(!ready||global.AmamiMotion.busy||global.AmamiVoice.busy)return false;showLine();return true;}
    root.addEventListener('click',next);
    function entry(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      openCut();global.AmamiMotion.play(root.querySelector('.ast-close-easy')||easy,'13');
      const ch=q('#astChapter',root);later(()=>ch.classList.add('show'),120,g);later(()=>ch.classList.remove('show'),1550,g);
      q('#astChapter b',root).textContent=global.AmamiStory?.chapters?.[2]?.title||'迷っても戻らない';
      later(()=>talk(global.AmamiStoryUI.rows(2,'entry',['同じ字でも、ちがう ことばに したよ。','さっきより、まようかも。']),()=>{closeCut();done?.();}),1850,g);
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
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g))talk(global.AmamiStoryUI.rows(2,'mid'),done);});},1780,g);
    }
    function retryMark(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);base();const g=generation,p=q('#astProgress',root);p.textContent='もういちど';p.classList.add('show');
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},1250,g);
    }
    function ending(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      if(easy){easy.style.setProperty('--ix',f.cx+1);easy.style.setProperty('--iy',f.cy+1.2);}
      const compare=q('#astCompare',root),rows=global.AmamiStoryUI.rows(2,'ending',['止まったのに、もどらなかった。']);
      // 既出の三語を先に読む時間。台詞を送るまで三枚とも残す。
      openCut(true);
      [0,1,2].forEach((n)=>later(()=>{compare.dataset.focus=String(n);},300+n*450,g));
      later(()=>talk(rows.slice(0,1),()=>talk(rows.slice(1),()=>{
        closeCut();compare.classList.remove('show','follow-second');delete compare.dataset.focus;walkHero({x:f.cx+3,y:f.cy+.1},1500);later(()=>{if(easy)global.AmamiMotion.walk(easy,{x:f.cx+2,y:f.cy+.9},1250);},330,g);later(()=>global.AmamiMotion.after(()=>{if(alive(g)&&done)done();}),1620,g);
      })),1850,g);
    }
    function hideForBattle(){closeCut();clearTimers();clearActors();resetTalk();q('#astCompare',root)?.classList.remove('show','follow-second');root.classList.remove('active');document.body.classList.remove('amami-episode2-mode');}
    function destroy(){generation++;closeCut();clearTimers();clearActors();resetTalk();document.body.classList.remove('amami-episode2-mode');root?.remove();}
    return{entry:global.AmamiMotion.fieldEvent(entry),encounter:global.AmamiMotion.fieldEvent(encounter),mid:global.AmamiMotion.fieldEvent(mid),retryMark:global.AmamiMotion.fieldEvent(retryMark),ending:global.AmamiMotion.fieldEvent(ending),hideForBattle,next,destroy};
  }
  global.AmamiEpisodeTwoView={create};
})(window);
