/* 奄美最終章・第3話「名瀬：戻ってもいい」のフィールドと会話。戦闘進行は本体が担当する。 */
(function(global){
  'use strict';
  const $=id=>document.getElementById(id),q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const EASY_FACE='images/bust/easy.webp';

  function setupRoot(host){
    $('amamiEpisode3Root')?.remove();
    const root=document.createElement('div');
    root.id='amamiEpisode3Root';
    root.innerHTML='<div id="asnChapter"><small>第3話</small><b>戻ってもいい</b></div><div id="asnProgress"></div><div id="asnTalk"><img id="asnFace" alt="イージー"><div><b id="asnWho">イージー</b><p id="asnText"></p><small id="asnNext">▼ つづく</small></div></div>';
    (host||document.body).appendChild(root);
    $('asnFace').src=EASY_FACE;
    return root;
  }

  function create(host,options={}){
    let root=setupRoot(host),generation=0,timers=[],easy=null,field=null,wordEl=null,ready=false,lineIndex=0,lines=[],afterTalk=null;
    const gender=()=>options.gender==='girl'?'girl':'boy';
    const alive=g=>g===generation;
    function later(fn,ms,g=generation){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);if(alive(g))fn();},ms);timers.push(id);return id;}
    function clearTimers(){timers.forEach(id=>{clearTimeout(id);clearInterval(id);});timers=[];}
    function closeCut(){
      const cut=root.querySelector('.asn-cinema');if(!cut)return;
      global.AmamiMotion.stop();cut.remove();root.classList.remove('cinematic');delete root.dataset.shot;delete root.dataset.beat;
    }
    function openCut(){
      closeCut();global.AmamiMotion.stop();
      const cut=document.createElement('div');cut.className='asn-cinema';
      cut.innerHTML='<img class="asn-cinema-bg" src="images/fullart/amami-naze-conversation.webp" alt="名瀬の街角で向き合う"><div class="asn-cut-location">アマミ・名瀬</div><button class="asn-cut-close" type="button" aria-label="会話を中断してタイトルへ戻る">とじる</button><div class="asn-cinema-stage"><img class="asn-shoulder" alt="イージーと向き合う主人公"><img class="asn-close-easy easy3d-frame" src="images/easy-motion/poster.png" alt="イージー"><img class="asn-close-hero" alt="自分でわかったことを喜ぶ主人公"></div>';
      const sf=typeof costumeSuffix==='function'?costumeSuffix():'';
      cut.querySelector('.asn-shoulder').src='images/battle-tate/hero-back-'+gender()+sf+'.webp';
      cut.querySelector('.asn-close-hero').src='images/battle-tate/hero-victory-'+gender()+sf+'.webp';
      for(const img of cut.querySelectorAll('img'))img.addEventListener('error',()=>{if(cut.isConnected)closeCut();},{once:true});
      cut.querySelector('button').addEventListener('click',e=>{e.stopPropagation();destroy();global.showScreen('screen-title');});
      root.prepend(cut);root.classList.add('cinematic');root.dataset.shot='easy';
      global.AmamiStoryUI.sizeConversation(cut,'asn');
    }
    function cutLine(row){
      const cut=root.querySelector('.asn-cinema');if(!cut)return false;
      global.AmamiMotion.stop();root.dataset.shot=row.id==='C03d'?'hero':'easy';
      root.dataset.beat=({C03a:'offer',C03b:'stop',C03c:'wait',C03d:'joy',C03e:'reflect'})[row.id]||'';
      if(row.id==='C03c')global.AmamiMotion.play(cut.querySelector('.asn-close-easy'),'06');
      if(row.id==='C03e')global.AmamiMotion.play(cut.querySelector('.asn-close-easy'),'13');
      return true;
    }
    function clearActors(){global.AmamiVoice.stop();global.AmamiMotion.stop();qa('.asn-field-enemy,.amami-easy').forEach(n=>n.remove());wordEl=null;easy=null;field=null;}
    function resetTalk(){ready=false;lineIndex=0;lines=[];afterTalk=null;q('#asnTalk',root)?.classList.remove('show');q('#asnNext',root)?.classList.remove('ready');}
    function base(){
      closeCut();clearTimers();clearActors();resetTalk();
      if(!global.NationalDeparture||!global.AmamiArrival)throw new Error('奄美フィールド部品がありません');
      const f=global.NationalDeparture.showField(102,{gender:gender(),hero:true,label:'名瀬の街',adults:0,mana:false,monsters:0,background:'amami-main-03-naze-town.png',point:{x:15,y:6}});
      document.body.classList.add('amami-episode3-mode');root.classList.add('active');
      q('#asnChapter',root)?.classList.remove('show');q('#asnProgress',root)?.classList.remove('show');
      const hero=$('fieldHero');if(hero){hero.style.transition='none';hero.style.setProperty('--hx',f.cx);hero.style.setProperty('--hy',f.cy+1.55);try{setHeroFacing(0,-1);}catch(e){}}
      easy=global.AmamiArrival.placeEasy(f.cx+1.8,f.cy-1.45,1.25,'down');field=f;
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
      wordEl=document.createElement('div');wordEl.className='asn-field-enemy arrive';wordEl.style.setProperty('--asn-x',x);wordEl.style.setProperty('--asn-y',y);
      global.AmamiMotion.fieldMonster(wordEl,word);
      $('fieldGrid').appendChild(wordEl);return wordEl;
    }
    function showLine(){global.AmamiVoice.stop();
      const box=q('#asnTalk',root),next=q('#asnNext',root);ready=false;next.classList.remove('ready');
      if(lineIndex>=lines.length){box.classList.remove('show');const cb=afterTalk;afterTalk=null;if(cb)cb();return;}
      const row=lines[lineIndex++],shown=row?.speaker==='hero'?{...row,portrait:'images/battle-tate/hero-victory-'+gender()+(typeof costumeSuffix==='function'?costumeSuffix():'')+'.webp'}:row;
      global.AmamiStoryUI.display(shown,box,q('#asnFace',root),q('#asnWho',root),q('#asnText',root));
      const hasCut=cutLine(row);
      if(!hasCut&&row?.id==='C03b'&&field)walkHero({x:field.cx+.25,y:field.cy+.7},480);
      if(!hasCut&&row?.id==='C03c'&&easy)global.AmamiMotion.play(easy,'06');
      if((typeof row==='string'?row:row.text)==='……もどっても いいよ。'&&easy)global.AmamiMotion.play(easy,'05');
      later(()=>{ready=true;next.classList.add('ready');},520);
    }
    function talk(texts,done){lines=texts.slice();lineIndex=0;afterTalk=done;showLine();}
    function next(){if(!ready||global.AmamiMotion.busy||global.AmamiVoice.busy)return false;showLine();return true;}
    root.addEventListener('click',next);
    function entry(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      openCut();
      const ch=q('#asnChapter',root);later(()=>ch.classList.add('show'),120,g);later(()=>ch.classList.remove('show'),1550,g);
      q('#asnChapter b',root).textContent=global.AmamiStory?.chapters?.[3]?.title||'戻ってもいい';
      later(()=>talk(global.AmamiStoryUI.rows(3,'entry',['ここからは 6年のことば。','……もどっても いいよ。']),()=>{closeCut();done?.();}),1850,g);
      if(easy){easy.style.opacity='0';later(()=>{if(easy)easy.style.opacity='1';},250,g);}
      return f;
    }
    function encounter(data,done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      const p=q('#asnProgress',root);p.textContent=data.label;p.classList.add('show');
      placeWord(data.word,f.cx+.4,f.cy-2.9);
      const pause=['疑問','困難','誤解','秘密'].includes(data.word)?1050:0;
      later(()=>walkHero({x:f.cx,y:f.cy+.6},850),280+pause,g);
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},1380+pause,g);
    }
    function mid(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      const p=q('#asnProgress',root);p.textContent='4／12語';p.classList.add('show');
      later(()=>{try{setHeroFacing(0,1);}catch(e){}},250,g);
      later(()=>{try{setHeroFacing(0,-1);}catch(e){}},1300,g);
      later(()=>walkHero({x:f.cx,y:f.cy+.3},720),1450,g);
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g))talk(global.AmamiStoryUI.rows(3,'mid'),done);});},2270,g);
    }
    function retryMark(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);base();const g=generation,p=q('#asnProgress',root);p.textContent='もういちど';p.classList.add('show');
      later(()=>{global.AmamiMotion.after(()=>{if(alive(g)&&done)done();});},1250,g);
    }
    function ending(done){
      generation++;root=setupRoot(host);root.addEventListener('click',next);const f=base(),g=generation;
      later(()=>{try{setHeroFacing(0,1);}catch(e){}},180,g);
      later(()=>{try{setHeroFacing(0,-1);}catch(e){}},950,g);
      later(()=>{openCut();talk(global.AmamiStoryUI.rows(3,'ending',['止まるのに、やめない。','……どうして？']),()=>{
        closeCut();
        walkHero({x:f.cx-.25,y:f.cy-1.25},1500);
        later(()=>global.AmamiMotion.after(()=>{if(alive(g)&&done)done();}),1620,g);
      });},1200,g);
    }
    function hideForBattle(){closeCut();clearTimers();clearActors();resetTalk();root.classList.remove('active');document.body.classList.remove('amami-episode3-mode');}
    function destroy(){generation++;closeCut();clearTimers();clearActors();resetTalk();document.body.classList.remove('amami-episode3-mode');root?.remove();}
    return{entry:global.AmamiMotion.fieldEvent(entry),encounter:global.AmamiMotion.fieldEvent(encounter),mid:global.AmamiMotion.fieldEvent(mid),retryMark:global.AmamiMotion.fieldEvent(retryMark),ending:global.AmamiMotion.fieldEvent(ending),hideForBattle,next,destroy};
  }
  global.AmamiEpisodeThreeView={create};
})(window);
