/* The shell owns all writes. Direct game navigation is a migration entry. */
(function(){
  'use strict';
  let owner=null,epoch=null;
  try{if(parent!==window&&parent.location.origin===location.origin){owner=parent.KanjimonShell;epoch=owner?.epoch;}}catch(e){}
  const allowed=k=>/^kanjimon-save(?:$|-ngplus-(?:previous|restore-safety)$)/.test(k);
  window.gameStorage={
    getItem(k){if(!allowed(k))throw Error('Unknown save key');return owner?owner.read(epoch,k):localStorage.getItem(k);},
    setItem(k,v){if(!owner||!allowed(k))throw Error('Open the game from its start screen');owner.write(epoch,k,String(v));},
    removeItem(k){if(!owner||!allowed(k))throw Error('Open the game from its start screen');owner.remove(epoch,k);}
  };
  window.KanjimonSaveNotice=function(){
    if(owner)owner.saveFailed(epoch);
  };
  if(!owner){
    window.openingMovieDismissed=true;
    const destination=new URL('pwa.html',location.href);
    destination.search=location.search||'';destination.hash=location.hash||'';
    // Only real entry pages redirect; test harnesses receive a read-only store.
    if(/\/(?:kanjimon|index)\.html$/.test(location.pathname)||location.pathname.endsWith('/'))location.replace(destination.href);
  }
})();
