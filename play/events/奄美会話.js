/* 奄美物語の話者・台本を各イベント画面へ渡す共通部品。 */
(function(global){
 'use strict';
 const names={easy:'イージー',hero:'しゅじんこう',mana:'マナ',maroz:'マローズ',child:'こども'};
 const faces={easy:'images/bust/easy.webp',mana:'images/bust/mana_normal.webp',maroz:'images/bust/maros-face.webp',child:'images/sprites/kid-scared-front-m-a.webp'};
 function heroFace(){return 'images/battle-tate/hero-victory-'+(heroChar==='girl'?'girl':'boy')+'.webp';}
 function rows(episode,section,fallback=[]){
  const chapter=global.AmamiStory?.chapters?.[episode];
  const value=chapter?.[section];
  return Array.isArray(value)?value:fallback.map((text,i)=>({id:'legacy-'+episode+'-'+section+'-'+i,speaker:'easy',text}));
 }
 function arrival(fallback=[]){
  const value=global.AmamiStory?.arrival;
  return Array.isArray(value)?value:fallback.map((line,i)=>({id:line[0]||'arrival-'+i,speaker:'easy',text:line[2]||''}));
 }
 function castle(fallback=[]){
  const value=global.AmamiStory?.castle;
  return Array.isArray(value)?value:fallback.map((text,i)=>({id:'castle-'+i,speaker:'easy',text}));
 }
 function ending(section,fallback=[]){
  const value=global.AmamiStory?.ending?.[section];
  return Array.isArray(value)?value:fallback.map((text,i)=>({id:section+'-'+i,speaker:'easy',text}));
 }
 function display(raw,box,face,who,text){
  const row=typeof raw==='string'?{speaker:'easy',text:raw}:raw||{speaker:'easy',text:''};
  const speaker=names[row.speaker]?row.speaker:'easy';
  global.AmamiVoice?.stop();
  box.dataset.speaker=speaker;
  who.textContent=names[speaker];
  text.textContent=row.text||'';
  face.src=row.portrait||faces[speaker]||(speaker==='hero'?heroFace():'images/bust/easy.webp');
  face.alt=names[speaker];
  box.classList.add('show');
  if(speaker==='easy'||speaker==='mana'){
   if(global.AmamiVoice?.playRow)return global.AmamiVoice.playRow(row,box);
   return global.AmamiVoice?.play(row.text||'',box);
  }
  return{busy:false,done:Promise.resolve({reason:'silent'})};
 }
 function crisisCut(owner,done){
  const cut=document.createElement('div');cut.className='amami-crisis-cut';cut.setAttribute('aria-label','各地でマナたちがかんじモンを抑え続けている');
  cut.innerHTML='<section class="amami-crisis-tokyo"><img class="mana" src="images/mana-back-a.webp" alt=""><i class="adult" aria-hidden="true"></i><span class="monster one">暴</span><span class="monster two">難</span></section><section class="amami-crisis-hokkaido"><img class="mana" src="images/mana-back-a.webp" alt=""><i class="maroz" aria-hidden="true"></i><span class="monster one">暴</span><span class="monster two">難</span></section>';
  document.body.appendChild(cut);
  let finished=false,first=0,last=0;const observer=new MutationObserver(()=>{if(!owner.isConnected)finish(false);});
  function finish(complete){if(finished)return;finished=true;clearTimeout(first);clearTimeout(last);observer.disconnect();cut.remove();if(complete&&owner.isConnected)done?.();}
  observer.observe(document.body,{childList:true,subtree:true});
  first=setTimeout(()=>{if(owner.isConnected)cut.classList.add('second');else finish(false);},1350);
  last=setTimeout(()=>finish(true),2750);
  return()=>finish(false);
 }
 // 会話の二人を同距離・同じ足元で表示する。画像矩形でなく透明余白を除く。
 const silhouetteCache=new Map();
 function sizeConversation(cut,prefix){
  const stage=cut.querySelector('.'+prefix+'-cinema-stage');
  const hero=cut.querySelector('.'+prefix+'-shoulder');
  stage.classList.add('amami-dialog-stage');
  hero.classList.add('amami-dialog-listener');
  cut.querySelector('.'+prefix+'-close-easy').classList.add('amami-dialog-peer');
  const calibrate=()=>{
   if(!hero.naturalWidth)return;
   let bounds=silhouetteCache.get(hero.src);
   if(!bounds){
    const c=document.createElement('canvas');c.width=hero.naturalWidth;c.height=hero.naturalHeight;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(hero,0,0);
    const pixels=ctx.getImageData(0,0,c.width,c.height).data;
    let top=c.height,bottom=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>64){top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
    if(bottom<=top)return;
    bounds={fill:(bottom-top)/c.height,bottom:(c.height-bottom)/c.height};silhouetteCache.set(hero.src,bounds);
   }
   stage.style.setProperty('--listener-fill',bounds.fill);
   stage.style.setProperty('--listener-pad',bounds.bottom);
   stage.dataset.sized='true';
  };
  hero.addEventListener('load',calibrate,{once:true});
  if(hero.complete)calibrate();
 }
 global.AmamiStoryUI={rows,arrival,castle,ending,display,crisisCut,sizeConversation};
})(window);
