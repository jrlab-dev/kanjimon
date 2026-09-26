/* 城前・第9〜12話・終章。正本=城4階と終章_20260922。新規台詞は奄美音声台帳の44本を接続。 */
(function(global){
 'use strict';const $=id=>document.getElementById(id);let endingAudio=null;
 Object.assign(AmamiLate.config,{
  9:{name:'おもちゃの城1F',title:'問題が遊びになる',field:'amami-toy-castle-floor1.png',battle:'amami-toy-castle-floor1-v1.png',pos:'73.98% 100%',size:'auto 105.36%',mid:2,entry:['ここは、ぼくが つくった。','どこまで 当てられるかな。'],ending:['つぎの階は、もう少し……。']},
  10:{name:'おもちゃの城2F',title:'答えを奪わない',field:'amami-toy-castle-floor2.png',battle:'amami-toy-castle-floor2-v2.png',pos:'99.87% 50%',size:'auto 150.51%',mid:2,entry:['こんどは、くらしの ことば。','知ってるだけじゃ、えらべないよ。'],ending:['……言わない。','自分で 見つけたいんだよね。']},
  11:{name:'おもちゃの城3F',title:'知らない答えを待つ',field:'amami-toy-castle-floor3.png',battle:'amami-toy-castle-floor3-v1.png',pos:'98.82% 100%',size:'auto 105.36%',mid:2,entry:['同じ 問題でも、みんな 同じには えらばない。'],ending:['だれが どれを えらぶか、ぼくにも わからない。','……だから、待ってみたい。']},
  12:{name:'おもちゃの城4F',title:'もう一つ、やってみたい',field:'amami-toy-castle-floor4.png',battle:'amami-toy-castle-floor4-v1.png',pos:'100% 94.34%',size:'auto 105.36%',mid:2,entry:['さいごは、二人の ことば。'],ending:['……もう、おわりなんだね。','……もう一つ、やってみたい。']}
 });
 const FINAL_LINE='だいじょうぶ。なにも おぼえなくて いいよ。たのしむだけで いいんだ。イージーだよ';
 function createView(episode){
  const basic=AmamiLate.createView(episode),s=basic.scene,c=AmamiLate.config[episode];let finalAudio=null;
  const state=()=>amamiFinal['episode'+episode];
  const add=(id,html,cls='')=>{const el=document.createElement('div');el.id=id;el.className=cls;el.innerHTML=html;$('amamiLateRoot').appendChild(el);return el;};
  const heroSheet=()=>heroChar==='girl'?'hero-girl.webp':'hero.webp';
  function decor(){
   if(episode===9){const count=state().mainIndex;add('aySteps',Array.from({length:5},(_,i)=>'<i class="'+(i<count?'built':'')+'"></i>').join(''));}
   if(episode===10)add('ayGear','⚙');
   if(episode===11)add('ayWindows',['traveler','historian','inventor','older'].map(name=>'<i style="--cast:url(images/amami-cast/'+name+'.png)"></i>').join(''));
  }
  function normalEntry(done){s.base();decor();AmamiMotion.play($('amamiEasy'),episode===9?'07':'01');$('ayChapter').classList.add('show');s.later(()=>$('ayChapter').classList.remove('show'),1400);s.later(()=>s.talk(c.entry,done),1700);}
  function entry(done){
   if(episode!==9||state().castleDoorSeen){normalEntry(done);return;}
   const f=s.base('amami-main-08-toy-castle.png','おもちゃの城');
   const choiceMotion=AmamiMotion.play($('amamiEasy'),'10');
   s.later(()=>s.talk(['ここで おわっても いいよ。'],()=>{
    const el=add('ayDoorWrap','<button id="ayDoor" type="button">扉に ふれる</button>');
    $('ayDoor').addEventListener('click',e=>{e.stopPropagation();choiceMotion.choose();el.remove();s.moveHero(f.cx,f.cy-2.6,1500);s.later(()=>s.moveEasy(f.cx+1.15,f.cy-2.6,900),650);s.later(()=>s.talk(['……うん。ぼくも、いく。'],()=>{state().castleDoorSeen=true;save();normalEntry(done);}),1700);},{once:true});
   }),1000);
  }
  function focus(word){const both=word==='一心同体',who=state().mainIndex%2?'hero':'easy';const child='<span class="ay-focus-sprite" style="background-image:url(images/sprites/'+heroSheet()+')"></span>';const robot='<img class="ay-focus-easy" src="images/easy-motion/poster.png" alt="イージー">';const el=add('ayFocus',(who==='hero'?child:robot)+(both?(who==='hero'?robot:child):''));el.classList.toggle('both',both);}
  function encounter(word,label,done){const f=s.base();decor();$('ayProgress').textContent=label;s.pair(word,f);if(episode===12)focus(word);s.later(()=>s.moveHero(f.cx,f.cy+.6,650),400);s.later(done,episode===12?1800:1400);}
  function mid(done){const f=s.base();decor();$('ayProgress').textContent='2／5語';
   if(episode===9){$('aySteps').classList.add('rebuild');AmamiMotion.play($('amamiEasy'),'07');}
   if(episode===10){global.AmamiVoice.play('む……',add('ayAlmost','む……'));AmamiMotion.play($('amamiEasy'),'06');s.later(()=>$('ayAlmost')?.remove(),1100);$('ayGear').classList.add('slow');}
   if(episode===11){$('ayWindows').classList.add('children');}
   if(episode===12){focus('大願成就');}
   s.later(()=>s.finish(done),2400);
  }
  function ending(done){const f=s.base();decor();AmamiMotion.play($('amamiEasy'),episode===10?'06':'01');s.later(()=>s.talk(c.ending,()=>{
   if(episode===12){epilogue(done);return;}
   s.moveEasy(f.cx+1.35,f.cy-1.6,1100);s.later(()=>{const easy=$('amamiEasy');if(easy)setInteriorActorPose(easy,'down','a');},1150);s.later(()=>s.moveHero(f.cx,f.cy-1.6,1300),600);s.later(()=>s.finish(done),2250);
  }),900);}
  function epilogue(done){
   s.base();$('amamiLateRoot').classList.add('final-stage');$('fieldHero').style.visibility='hidden';$('amamiEasy').style.visibility='hidden';const answers=[false,false,false,false,false];let settled=false;
   const panels=[['amami-toy-castle-floor4.png',null],['zone47.webp','traveler'],['zone78.webp','historian'],['amami-toy-castle-floor3.png','inventor'],['amami-main-03-naze-town.png','older']];
   const split=add('aySplit',panels.map((p,i)=>'<section class="ay-pane" style="background-image:url(images/fullart/'+p[0]+')">'+(i===0?'<b>あなた</b><span class="ay-main-child" style="background-image:url(images/sprites/'+heroSheet()+')"></span>':'<span class="ay-new-child" style="background-image:url(images/amami-cast/'+p[1]+'.png)"></span>')+'<img class="ay-copy-easy easy3d-frame" src="images/easy-motion/poster.png" alt="イージー"><small id="ayAnswer'+i+'"></small></section>').join(''));
   AmamiMotion.play([...split.querySelectorAll('.easy3d-frame')],'01');
   add('ayFinalChoices','<p>「一心同体」は なんて よむ？</p><button type="button">いっしんどうたい</button><button type="button">いっしんとうたい</button><button type="button">いちしんどうたい</button>');
   function joy(){if(!$("ayJoy")){const el=add("ayJoy","イージー　……たのしいな");global.AmamiVoice.play('……たのしいな',el);}}
   function beachAfterVoice(){global.AmamiVoice.after(()=>{if(split.isConnected)finalBeach(done);});}
   function check(){if(settled||!answers.every(Boolean)||!split.isConnected)return;settled=true;$('ayFinalChoices').remove();split.classList.add('together');const motion=AmamiMotion.play([...split.querySelectorAll('.easy3d-frame')],'11',{onFrame(n){if(n>=52)joy();if(n>=52)split.querySelectorAll('small').forEach(el=>el.textContent='……たのしいな');}});motion.done.then(r=>{if(!r.cancelled&&split.isConnected){if(r.fallback){joy();split.querySelectorAll('small').forEach(el=>el.textContent='……たのしいな');s.later(beachAfterVoice,1800);}else beachAfterVoice();}});}
   $('ayFinalChoices').addEventListener('click',e=>{if(e.target.tagName!=='BUTTON'||answers[0])return;const correct=e.target.textContent==='いっしんどうたい';if(!correct){$('ayFinalChoices').querySelector('p').textContent='「いっしんどうたい」と よむよ。';return;}answers[0]=true;$('ayAnswer0').textContent='いっしんどうたい';e.target.classList.add('chosen');$('ayFinalChoices').querySelectorAll('button').forEach(n=>n.disabled=true);check();});
   [1200,2300,3400,4500].forEach((ms,i)=>s.later(()=>{answers[i+1]=true;split.children[i+1].classList.add('responded');check();},ms));
  }
  function finalBeach(done){
   s.base('amami-ending-beach.png','奄美');$('amamiLateRoot').classList.add('beach-stage');$('fieldHero').style.visibility='hidden';$('amamiEasy').style.visibility='hidden';
   const last=add('ayLastFrame','<span class="ay-beach-hero" style="background-image:url(images/sprites/'+heroSheet()+')"></span><img id="aySmile" src="images/battle-tate/hero-victory-'+(heroChar==='girl'?'girl':'boy')+'.webp" alt="無言で笑う主人公"><span id="ayEndEasy"><img class="easy3d-frame" src="images/easy-motion/poster.png" alt="イージー"><img id="ayFinalGlint" src="images/easy-motion/final-eye-glint.png" alt="" hidden></span>');
   AmamiMotion.play($('ayEndEasy'),'01');let completed=false;
   bgmStop();
   if(soundOn){finalAudio=new Audio('audio/op/op1_s0_easy.mp3');endingAudio=finalAudio;finalAudio.play().catch(()=>{});}
   s.talk([FINAL_LINE],()=>{if(finalAudio){finalAudio.pause();finalAudio=null;endingAudio=null;}last.querySelector('.ay-beach-hero').hidden=true;$('aySmile').classList.add('show');s.later(()=>{const motion=AmamiMotion.play($('ayEndEasy'),'12',{final:true,onFrame(n,c){const final=n===c.frames-1;$('ayFinalGlint').hidden=!final;$('ayEndEasy').classList.toggle('grounded',final);}});motion.done.then(r=>{if(r.cancelled||!last.isConnected||completed)return;completed=true;add('ayBlack','');s.later(()=>{if(last.isConnected){$('fieldHero').style.visibility='';done();}},900);});},600);});
   /* 既存音声の実ファイルは約5.8秒。文章を読む間も含め7.4秒を確保する。 */
   s.lockInput(7400);$('ayTalk').style.pointerEvents='none';s.later(()=>{$('ayTalk').style.pointerEvents='auto';},7400);
  }
  function destroy(){AmamiMotion.stop();if(finalAudio){finalAudio.pause();finalAudio=null;endingAudio=null;}const h=$('fieldHero');if(h)h.style.visibility='';basic.destroy();}
  return {entry:AmamiMotion.fieldEvent(entry),encounter:AmamiMotion.fieldEvent(encounter),mid:AmamiMotion.fieldEvent(mid),ending:AmamiMotion.fieldEvent(ending),epilogue:AmamiMotion.fieldEvent(epilogue),retry:basic.retry,hide:basic.hide,destroy};
 }
 global.AmamiCastle={createView,finalLine:FINAL_LINE,onSoundToggle(){global.AmamiVoice.onSoundToggle();if(endingAudio){if(!soundOn)endingAudio.pause();else endingAudio.play().catch(()=>{});}}};
})(window);
