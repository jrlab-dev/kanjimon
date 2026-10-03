/* 城前・第9〜12話・終章。正本=城4階と終章_20260922。新規台詞は奄美音声台帳の44本を接続。 */
(function(global){
 'use strict';const $=id=>document.getElementById(id);let endingAudio=null;
 Object.assign(AmamiLate.config,{
  9:{name:'おもちゃの城1F',title:'問題が遊びになる',field:'amami-toy-castle-floor1.png',battle:'amami-toy-castle-floor1-v1.png',pos:'73.98% 100%',size:'auto 105.36%',mid:2,entry:['ここは、ぼくが つくった。','どこまで 当てられるかな。'],ending:['つぎの階は、もう少し……。']},
  10:{name:'おもちゃの城2F',title:'答えを奪わない',field:'amami-toy-castle-floor2.png',battle:'amami-toy-castle-floor2-v2.png',pos:'99.87% 50%',size:'auto 150.51%',mid:2,entry:['こんどは、くらしの ことば。','知ってるだけじゃ、えらべないよ。'],ending:['……言わない。','自分で 見つけたいんだよね。']},
  11:{name:'おもちゃの城3F',title:'まだ知らない楽しさ',field:'amami-toy-castle-floor3.png',battle:'amami-toy-castle-floor3-v1.png',pos:'98.82% 100%',size:'auto 105.36%',mid:2,entry:[],ending:['きみと あそんでると、まだ しらないことが でてくる。']},
  12:{name:'おもちゃの城4F',title:'もう一つ、やってみたい',field:'amami-toy-castle-floor4.png',battle:'amami-toy-castle-floor4-v1.png',pos:'100% 94.34%',size:'auto 105.36%',mid:2,entry:['さいごは、二人の ことば。'],ending:['……もう、おわりなんだね。','……もう一つ、やってみたい。']}
 });
 const FINAL_LINE='だいじょうぶ。なにも おぼえなくて いいよ。たのしむだけで いいんだ。イージーだよ';
 function createView(episode){
  const basic=AmamiLate.createView(episode),s=basic.scene,c=AmamiLate.config[episode];let finalAudio=null,disposed=false,glimpseId=0;
  const state=()=>amamiFinal['episode'+episode];
  const add=(id,html,cls='')=>{const el=document.createElement('div');el.id=id;el.className=cls;el.innerHTML=html;$('amamiLateRoot').appendChild(el);return el;};
  const heroSheet=()=>heroSheetUrl();
  function decor(){
   if(episode===9){const f=global.__ND_FIELD;global.AmamiBlocks.create($('fieldGrid'),{step:state().mainIndex,roof:state().castleRoofPlaced,field:true,point:{x:f.cx+.5,y:f.cy-1},later:s.later});}
   if(episode===10)add('ayGear','⚙');
  }
  function normalEntry(done){const f=s.base();decor();document.querySelector('#ayChapter b').textContent=global.AmamiStory?.chapters?.[episode]?.title||c.title;AmamiMotion.play($('amamiEasy'),episode===9?'07':'01');$('ayChapter').classList.add('show');s.later(()=>$('ayChapter').classList.remove('show'),1400);
   if(episode===9){s.moveHero(f.cx-.4,f.cy+.7,750);s.later(()=>{document.querySelector('.acb-field')?.remove();const cut=global.AmamiBlocks.create($('amamiLateRoot'),{step:state().mainIndex,roof:state().castleRoofPlaced,later:s.later});cut.focus();s.later(()=>s.talk(global.AmamiStoryUI.rows(9,'entry'),()=>{cut.close();decor();s.finish(done);}),900);},1800);}
   else s.later(()=>s.talk(global.AmamiStoryUI.rows(episode,'entry',c.entry),done),1700);
  }
  function afterWord(done){
   if(episode===10){s.base();decor();$('ayGear').classList.add('answer-turn');s.later(()=>s.finish(done),1100);return;}
   if(episode!==9){done();return;}s.base();const step=state().mainIndex;
   const cut=global.AmamiBlocks.create($('amamiLateRoot'),{step:Math.max(0,step-1),later:s.later});cut.focus();
   const ids=global.AmamiBlocks.parts.filter(p=>p.step===step).map(p=>p.id);
   s.later(()=>cut.place(ids,()=>{if(step===1)s.talk(global.AmamiStoryUI.rows(9,'first'),()=>s.finish(done));else s.later(()=>s.finish(done),600);}),600);
  }
  function entry(done){
   if(episode!==9||state().castleDoorSeen){normalEntry(done);return;}
   const f=s.base('amami-main-08-toy-castle.png','おもちゃの城');
   const choiceMotion=AmamiMotion.play($('amamiEasy'),'10');
   s.moveHero(f.cx-.2,f.cy+1.15,950);
   const pan=add('ayCastlePan','');s.later(()=>pan.classList.add('look-up'),1450);s.later(()=>pan.classList.add('look-back'),6650);s.later(()=>{pan.remove();s.talk(global.AmamiStoryUI.castle(['ここで おわっても いいよ。']),()=>{
    const el=add('ayDoorWrap','<button id="ayDoor" type="button">扉に ふれる</button>');
    $('ayDoor').addEventListener('click',e=>{e.stopPropagation();choiceMotion.choose();el.remove();s.moveHero(f.cx,f.cy+.2,1500);s.later(()=>s.moveEasy(f.cx+1.15,f.cy+.2,900),650);s.later(()=>{state().castleDoorSeen=true;save();normalEntry(done);},1700);},{once:true});
   });},8100);
  }
  function focus(word){const both=word==='一心同体',who=state().mainIndex%2?'hero':'easy';const child='<span class="ay-focus-sprite" style="background-image:url('+heroSheet()+')"></span>';const robot='<img class="ay-focus-easy" src="images/easy-motion/poster.png" alt="イージー">';const el=add('ayFocus',(who==='hero'?child:robot)+(both?(who==='hero'?robot:child):''));el.classList.toggle('both',both);}
  function encounter(word,label,done){const f=s.base();decor();$('ayProgress').textContent=label;s.pair(word,f);if(episode===12)focus(word);s.later(()=>s.moveHero(f.cx,f.cy+.6,650),400);s.later(done,episode===12?1800:1400);}
  function mid(done){const f=s.base();decor();$('ayProgress').textContent='2／5語';
   if(episode===9){AmamiMotion.play($('amamiEasy'),'07');}
   if(episode===10){AmamiMotion.play($('amamiEasy'),'06');$('ayGear').classList.add('slow');}
   if(episode===12){focus('大願成就');}
   s.later(()=>s.talk(global.AmamiStoryUI.rows(episode,'mid'),()=>s.finish(done)),2400);
  }
  function ending(done){const f=s.base();decor();AmamiMotion.play($('amamiEasy'),episode===10?'06':'01');
   const rows=global.AmamiStoryUI.rows(episode,'ending',c.ending);
   const afterWords=()=>{
   if(episode===12){s.finish(done);return;}
   s.moveEasy(f.cx+1.35,f.cy-1.6,1100);s.later(()=>{const easy=$('amamiEasy');if(easy)setInteriorActorPose(easy,'down','a');},1150);s.later(()=>s.moveHero(f.cx,f.cy-1.6,1300),600);s.later(()=>s.finish(done),2250);
   };
   if(episode===9){
    document.querySelector('.acb-field')?.remove();
    const cut=global.AmamiBlocks.create($('amamiLateRoot'),{step:5,roof:state().castleRoofPlaced,later:s.later});cut.focus();
    const linger=()=>{cut.setWide();s.later(()=>s.talk(global.AmamiStoryUI.rows(9,'after'),()=>{cut.close();decor();afterWords();}),2000);};
    if(state().castleRoofPlaced){linger();return;}
    s.later(()=>{cut.suggestRoof();s.talk(rows,()=>cut.place(['C2'],linger,()=>{state().castleRoofPlaced=true;save();}));},900);
   }else s.later(()=>s.talk(rows,afterWords),900);
  }
  async function epilogue(done){
   s.base();const owner=$('amamiLateRoot'),id=++glimpseId;
   const hero=$('fieldHero'),easy=$('amamiEasy'),heroVisibility=hero.style.visibility,easyVisibility=easy.style.visibility;
   const panels=[['amami-toy-castle-floor4.png',null],['zone47.webp','traveler'],['zone78.webp','historian'],['amami-toy-castle-floor3.png','inventor'],['amami-main-03-naze-town.png','older']];
   const sheet=heroSheetUrl(),peer='images/easy-motion/easy_15_walk_down/stand.png';
   const split=add('aySplit',panels.map((p,i)=>'<section class="ay-pane" style="background-image:url(images/fullart/'+p[0]+')">'+(i===0?'<span class="ay-main-child" role="img" aria-label="主人公の後ろ姿" style="background-image:url('+sheet+')"></span>':'<span class="ay-new-child" role="img" aria-label="見知らぬ人物の後ろ姿" style="background-image:url(images/amami-cast/'+p[1]+'.png)"></span>')+'<img class="ay-copy-easy" src="'+peer+'" alt="向き合うイージー"></section>').join(''));
   split.dataset.beat='loading';split.setAttribute('aria-hidden','true');
   const alive=()=>!disposed&&id===glimpseId&&owner.isConnected&&split.isConnected;
   let finished=false,timeout;
   const finish=()=>{if(finished||!alive())return;finished=true;split.remove();owner.classList.remove('final-stage');hero.style.visibility=heroVisibility;easy.style.visibility=easyVisibility;done();};
   try{
    const urls=[sheet,peer,...panels.map(p=>'images/fullart/'+p[0]),...panels.filter(p=>p[1]).map(p=>'images/amami-cast/'+p[1]+'.png')];
    await Promise.race([Promise.all([...new Set(urls)].map(src=>{const image=new Image();image.src=src;return image.decode();})),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('glimpse images')),4000);})]);
    if(!alive())return;
    AmamiMotion.stop();owner.classList.add('final-stage');hero.style.visibility='hidden';easy.style.visibility='hidden';
    split.dataset.beat='glimpse';split.removeAttribute('aria-hidden');
    s.later(finish,1800);
   }catch(e){finish();}finally{clearTimeout(timeout);}
  }
  function destroy(){disposed=true;glimpseId++;AmamiMotion.stop();if(finalAudio){finalAudio.pause();finalAudio=null;endingAudio=null;}const h=$('fieldHero');if(h)h.style.visibility='';basic.destroy();}
  return {entry:AmamiMotion.fieldEvent(entry),encounter:AmamiMotion.fieldEvent(encounter),mid:AmamiMotion.fieldEvent(mid),ending:AmamiMotion.fieldEvent(ending),afterWord:AmamiMotion.fieldEvent(afterWord),epilogue:AmamiMotion.fieldEvent(epilogue),retry:basic.retry,hide:basic.hide,destroy};
 }
 global.AmamiCastle={createView,finalLine:FINAL_LINE,onSoundToggle(){global.AmamiVoice.onSoundToggle();if(endingAudio){if(!soundOn)endingAudio.pause();else endingAudio.play().catch(()=>{});}}};
})(window);
