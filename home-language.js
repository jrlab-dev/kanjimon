(function(){
  'use strict';
  const key='kanjimon-display-language-v1',ack='kanjimon-pwa-migration-ack-v1';
  const params=new URLSearchParams(location.search),explicit=params.get('lang');
  const page=document.documentElement.lang==='en'?'en':'ja';
  let stored=null,confirmed=false;
  try{stored=localStorage.getItem(key);confirmed=localStorage.getItem(ack)==='1';}catch(e){}
  const valid=x=>x==='ja'||x==='en';
  const chosen=valid(explicit)?explicit:page==='en'?'en':valid(stored)?stored:/^ja(?:-|$)/i.test(navigator.language||'ja')?'ja':'en';
  if(valid(explicit)){try{localStorage.setItem(key,explicit);}catch(e){}}
  if(chosen!==page){
    const next=new URL(chosen==='en'?'/en/':'/',location.origin);
    next.searchParams.set('lang',chosen);next.hash=location.hash;
    location.replace(next.href);return;
  }
  const panel=document.getElementById('entry-check'),check=document.getElementById('other-games-closed');
  panel.hidden=confirmed;
  check.addEventListener('change',()=>panel.classList.remove('attention'));
  document.querySelectorAll('[data-play]').forEach(link=>{
    link.addEventListener('click',event=>{
      if(!confirmed&&!check.checked){
        event.preventDefault();panel.hidden=false;panel.classList.add('attention');
        panel.scrollIntoView({block:'center'});check.focus({preventScroll:true});return;
      }
      const target=new URL(link.href);
      target.searchParams.set('lang',page);target.searchParams.set('autostart','1');
      if(check.checked)target.searchParams.set('migration','confirmed');
      link.href=target.href;
    });
  });
})();
