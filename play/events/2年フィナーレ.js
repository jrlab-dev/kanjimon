/* 学年2の見た目だけ。台詞・手がかり・声・終了条件は既存gfが担当。 */
(function(global){
 'use strict';let current=null;const cache=new Map();
 function bounds(im){if(cache.has(im.src))return cache.get(im.src);const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);const a=x.getImageData(0,0,c.width,c.height).data;let t=c.height,b=0;for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++)if(a[(y*c.width+xx)*4+3]>=64){t=Math.min(t,y);b=Math.max(b,y+1);}if(b<=t)throw Error('empty actor');const v={fill:(b-t)/c.height,pad:(c.height-b)/c.height};cache.set(im.src,v);return v;}
 function begin(grade){
  close();if(grade!==2)return;const seq=fieldSeq,ov=$('gfOverlay'),clues=$('gfClues');
  const view=document.createElement('div');view.className='g2-view';
  view.innerHTML='<img class="g2-bg" src="images/fullart/kamakura-finale.webp" alt="静かな境内に座る大仏の大きな背中"><b class="g2-place">かまくら・おおきな せなか</b><div class="g2-actors"><img class="g2-hero" alt="手前からマナの話を聞く主人公"><img class="g2-mana" src="images/sprites/mana-conversation.webp" alt="主人公と向き合うマナ"></div><b class="g2-clue-title">たびで あつめた てがかり</b>';
  view.querySelector('.g2-hero').src='images/battle-tate/hero-back-'+(heroChar==='girl'?'girl':'boy')+costumeSuffix()+'.webp';ov.prepend(view);
  let live=true,watch=0,timeout=0;
  const api={seq,view,ov,close(){if(!live)return;live=false;clearInterval(watch);clearTimeout(timeout);document.removeEventListener('keydown',key);if(clues.parentNode===view)ov.insertBefore(clues,$('gfBox'));ov.classList.remove('grade2-finale');delete ov.dataset.g2Beat;view.remove();if(current===api)current=null;}};current=api;
  function key(e){if(e.key==='Escape'&&current===api){e.preventDefault();abort();showScreen('screen-title');}}
  document.addEventListener('keydown',key);
  watch=setInterval(()=>{if(seq!==fieldSeq||fieldZone!==24||!$('screen-field')?.classList.contains('active'))abort();},80);
  timeout=setTimeout(()=>api.close(),4000);
  Promise.all([...view.querySelectorAll('img')].map(im=>im.decode())).then(()=>{
   if(!live||!gfActive||seq!==fieldSeq)return;clearTimeout(timeout);const stage=view.querySelector('.g2-actors');
   for(const name of ['hero','mana']){const b=bounds(view.querySelector('.g2-'+name));stage.style.setProperty('--'+name+'-fill',b.fill);stage.style.setProperty('--'+name+'-pad',b.pad);}
   view.appendChild(clues);ov.classList.add('grade2-finale');
  }).catch(()=>api.close());
 }
 function step(s){if(current)current.ov.dataset.g2Beat=s?.k==='clues'?'clues':'say';}
 function close(){current?.close();}
 function abort(){if(!current)return;close();if(gfActive)gfClose(false);}
 global.GradeTwoFinale={begin,step,close,abort,beforeScreen(id){if(id!=='screen-field')abort();}};
})(window);
