(function(){
  'use strict';
  if(parent===window||!parent.KanjimonShell)return;
  const shell=parent.KanjimonShell,epoch=shell.epoch;
  function safe(){
    return document.getElementById('screen-title')?.classList.contains('active')&&!window.OpeningMovie?.isActive()
      &&!op1Active&&!nmActive&&!document.querySelector('.overlay.show,.language-intro,.op1-overlay.show,dialog[open]')&&!window.KanjimonStoryOutcome?.locked;
  }
  window.KanjimonPwaGame={
    safe,
    snapshot(){if(!safe())throw Error('タイトルへもどってから開いてください。');if(!save())throw Error('記録を保存できませんでした。');return getSaveData();},
    emergency(){return getSaveData();},
    stop(){window.OpeningMovie?.cancel();op1AbortMusic();stopBattleHakaseVoice();window.speechSynthesis?.cancel();bgmPause();stopAutoExplore();document.body.inert=true;}
  };
  const timer=setInterval(()=>{
    if(!shell.owns(epoch)){clearInterval(timer);window.KanjimonPwaGame.stop();}
  },1000);
  addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  shell.gameReady(epoch);
})();
