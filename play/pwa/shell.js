(function(){
  'use strict';
  const $=id=>document.getElementById(id),B=KanjimonBackup;
  let owned=false,available=false,recoveryBlocked=false,epoch=0,gameActive=false,busy=false,registration=null;
  let manifestFailed=false;
  let expected=null,release=null,manifest=null,pending=null,downloadId=0,downloadJob=null,installPrompt=null;
  const status=text=>{$('status').textContent=text;};
  const notify=error=>status(error?.message||String(error));
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('kanjimon-save-state'):null;
  const migrationKey='kanjimon-pwa-migration-ack-v1';
  try{$('closed').checked=localStorage.getItem(migrationKey)==='1';}catch(e){}
  $('migration').hidden=$('closed').checked;
  function readyStatus(){
    if(owned&&available&&!gameActive)status(manifest?.game?($('closed').checked?'じゅんびが できたよ！':'はじめの かくにんを してね。'):manifestFailed?'ゲームの準備情報を読み込めませんでした。通信を確認して、この画面を開き直してください。':'ゲームの じゅんび中だよ。少しまってね。');
  }
  function refresh(){
    $('start').disabled=!manifest?.game||!owned||!available||!$('closed').checked||busy||!!downloadJob;
    $('import').disabled=!owned||!(available||recoveryBlocked)||!$('closed').checked||busy||!!downloadJob;
    $('export').disabled=busy||!!downloadJob;
    $('update').disabled=busy||!!downloadJob;
    $('check-update').disabled=!registration?.active||!!downloadJob;
    $('retry').hidden=owned&&available;
    try{
      const raw=localStorage.getItem(B.KEY);
      if(raw===null){$('summary').textContent='この端末には、まだ記録がありません。';return;}
      const d=B.validateSave(JSON.parse(raw));
      $('summary').textContent=`なかま ${d.caught.length}体・到達した場所 ${d.unlocked}・${(d.newGamePlus?.cycle||0)+1}しゅうめの たび`;
    }catch(e){$('summary').textContent='記録を確認できません。ファイルから復元できます。';}
  }
  function assertOwner(token,repair=false){
    if(!owned||!(available||repair&&recoveryBlocked&&!gameActive)||token!==epoch)throw Error('記録の編集権がありません。ゲームを開き直してください。');
    for(const k of B.KEYS)if(localStorage.getItem(k)!==expected[k]){
      available=false;saveFailed(epoch);refresh();
      throw Error('別の画面で記録が変わりました。今の記録をファイルに保存してください。');
    }
  }
  function saveFailed(token){
    if(token!==epoch||!gameActive)return;
    $('game').inert=true;$('save-error').hidden=false;
    setTimeout(()=>{
      if(token===epoch&&$('game').contentWindow.KanjimonStoryOutcome?.locked)$('retry-save').textContent='ゲームの保存画面へ もどる';
    },0);
    $('rescue').focus();
  }
  window.KanjimonShell={
    get epoch(){return epoch;},
    owns:token=>owned&&available&&token===epoch,
    read(token,k){if(!B.KEYS.includes(k))throw Error('Unknown save key');assertOwner(token);return localStorage.getItem(k);},
    write(token,k,v){
      if(!B.KEYS.includes(k)||!gameActive)throw Error('Game is not active');
      assertOwner(token);
      try{B.validateSave(JSON.parse(v));localStorage.setItem(k,v);if(localStorage.getItem(k)!==v)throw Error('記録を保存できませんでした。');expected[k]=v;}
      catch(e){saveFailed(token);throw e;}
    },
    remove(token,k){
      if(!B.KEYS.includes(k)||!gameActive)throw Error('Game is not active');
      assertOwner(token);
      try{localStorage.removeItem(k);expected[k]=null;}catch(e){saveFailed(token);throw e;}
    },
    saveFailed,
    gameReady(token){if(token!==epoch)return;$('manage').disabled=false;}
  };
  function initialize(){
    try{
      B.recover(localStorage);
      if(localStorage.getItem(B.JOURNAL)!==null)throw Error('中断した復元の控えを確認できませんでした。');
      expected=B.read(localStorage);
      for(const raw of Object.values(expected))if(raw!==null)B.validateSave(JSON.parse(raw));
      available=true;recoveryBlocked=false;
      // A corrupt record may be restored, but must never boot as a new game.
      readyStatus();
    }catch(e){
      available=false;recoveryBlocked=false;
      try{expected=B.read(localStorage);recoveryBlocked=true;}catch(readError){}
      notify(e);
      $('settings').open=true;
    }
    refresh();
  }
  async function acquire(){
    if(owned){initialize();return;}
    if(!navigator.locks?.request){status('このブラウザでは記録を安全に編集できません。新しいSafariまたはChromeで開いてください。記録の書き出しはできます。');refresh();return;}
    $('retry').disabled=true;
    try{
      await navigator.locks.request('kanjimon-save-writer',{mode:'exclusive',ifAvailable:true},async lock=>{
        $('retry').disabled=false;
        if(!lock){status('別の画面で開いています。そちらを閉じてから「もういちど かくにん」を押してください。');refresh();return;}
        owned=true;initialize();channel?.postMessage('owned');
        await new Promise(resolve=>{release=resolve;});
        available=false;owned=false;release=null;refresh();channel?.postMessage('released');
      });
    }catch(e){$('retry').disabled=false;notify(e);refresh();}
  }
  function download(text,name){
    const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  function exportSave(emergency=false){
    try{
      if(localStorage.getItem(B.JOURNAL)!==null&&!emergency){
        download(localStorage.getItem(B.JOURNAL),'kanjimon-recovery.json');
        status('中断した復元の控えを保存しました。通常の引き継ぎファイルではありません。');return;
      }
      let storage=localStorage;
      if(emergency){
        const current=$('game').contentWindow.KanjimonPwaGame?.emergency();
        B.validateSave(current);
        storage={getItem:k=>k===B.KEY?JSON.stringify(current):localStorage.getItem(k)};
      }
      download(B.exportText(storage,manifest?.version||''),'kanjimon-backup.json');
      if(!emergency)status('記録ファイルの保存を開きました。端末の保存先を確認してください。');
    }catch(e){notify(e);if(emergency)$('save-error').querySelector('p').textContent='書き出しできませんでした。この画面を閉じずに、もう一度保存してください。';}
  }
  function closeGame(){
    const bridge=$('game').contentWindow.KanjimonPwaGame;
    bridge?.stop();epoch++;gameActive=false;
    $('game').src='about:blank';$('play').hidden=true;$('home').hidden=false;
    $('game').inert=false;refresh();
    $('settings').open=true;
    $('migration').hidden=$('closed').checked;
  }
  $('start').onclick=()=>{
    if($('start').disabled||gameActive)return;
    try{
      assertOwner(epoch);
      if(!manifest?.game)throw Error('ゲームの準備情報を読み込めませんでした。通信を確認して、この画面を開き直してください。');
      for(const raw of Object.values(expected))if(raw!==null)B.validateSave(JSON.parse(raw));
      epoch++;gameActive=true;$('manage').disabled=true;$('home').hidden=true;$('play').hidden=false;
      $('game').src=manifest.game+(location.search||'')+(location.hash||'');
      navigator.storage?.persist?.().catch(()=>{});
    }catch(e){notify(e);}
  };
  $('manage').onclick=()=>{
    try{
      const bridge=$('game').contentWindow.KanjimonPwaGame;
      if(!bridge?.safe()){alert('ゲームのタイトル画面へもどってから開いてください。');return;}
      bridge.snapshot();closeGame();status('記録を保存しました。');
    }catch(e){saveFailed(epoch);}
  };
  $('rescue').onclick=()=>exportSave(true);
  $('retry-save').onclick=()=>{
    try{
      assertOwner(epoch);
      const child=$('game').contentWindow;
      if(child.KanjimonStoryOutcome?.locked){$('game').inert=false;$('save-error').hidden=true;child.document.getElementById('writing-save-retry')?.focus();return;}
      const d=child.KanjimonPwaGame.emergency();B.validateSave(d);
      KanjimonShell.write(epoch,B.KEY,JSON.stringify(d));
      $('game').inert=false;$('save-error').hidden=true;
    }catch(e){$('save-error').querySelector('p').textContent=e.message;}
  };
  $('export').onclick=()=>exportSave();
  $('retry').onclick=()=>acquire();
  $('closed').onchange=()=>{
    try{localStorage.setItem(migrationKey,$('closed').checked?'1':'0');}catch(e){}
    if(owned&&available)readyStatus();
    refresh();
  };
  $('import').onclick=()=>{if(!$('import').disabled)$('file').click();};
  $('file').onchange=async()=>{
    const file=$('file').files[0];$('file').value='';if(!file)return;
    busy=true;refresh();
    try{
      assertOwner(epoch,true);
      if(file.size>B.MAX)throw Error('記録ファイルは8MBまでです。');
      const text=await file.text();assertOwner(epoch,true);
      const doc=B.parse(text);pending=text;
      $('restore-summary').textContent=`なかま ${doc.records[B.KEY].caught.length}体・場所 ${doc.records[B.KEY].unlocked}までの記録に戻します。`;
      if(recoveryBlocked&&localStorage.getItem(B.JOURNAL)!==null)$('restore-summary').textContent+=' 中断した復元の控えをファイルに退避し、この記録で置き換えます。';
      $('restore').hidden=false;
    }catch(e){pending=null;notify(e);}
    finally{busy=false;refresh();}
  };
  $('cancel-restore').onclick=()=>{pending=null;$('restore').hidden=true;};
  $('confirm-restore').onclick=()=>{
    if(!pending||busy||gameActive)return;
    busy=true;refresh();
    try{
      assertOwner(epoch,true);epoch++;
      if(recoveryBlocked&&localStorage.getItem(B.JOURNAL)!==null)download(localStorage.getItem(B.JOURNAL),'kanjimon-recovery.json');
      B.restore(localStorage,pending,{replaceInterrupted:recoveryBlocked});
      pending=null;$('restore').hidden=true;expected=B.read(localStorage);
      available=true;recoveryBlocked=false;
      status('記録を戻しました。「ゲームを はじめる」から続けられます。');
    }catch(e){
      try{B.recover(localStorage);expected=B.read(localStorage);if(localStorage.getItem(B.JOURNAL)!==null)available=false;}catch(recovery){available=false;}
      notify(e);
    }finally{busy=false;refresh();}
  };
  addEventListener('storage',e=>{
    if(owned&&B.KEYS.includes(e.key)&&e.newValue!==expected?.[e.key]){
      available=false;saveFailed(epoch);status('別の画面で記録が変わりました。先に開いていたゲームを閉じてください。');refresh();
    }
  });
  addEventListener('pagehide',()=>{epoch++;gameActive=false;release?.();});
  addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
  function message(worker,type,extra={}){
    return new Promise((resolve,reject)=>{
      if(!worker){reject(Error('保存の準備ができていません。'));return;}
      const port=new MessageChannel(),timer=setTimeout(()=>{port.port1.close();reject(Error('通信が途切れました。もう一度試してください。'));},180000);
      port.port1.onmessage=e=>{
        const d=e.data;
        if(d.progress!==undefined){if(extra.id===downloadId){$('progress').value=d.progress;$('download-status').textContent=`${Math.round(d.progress*100)}% 保存中`;}return;}
        clearTimeout(timer);port.port1.close();
        if(d.ok)resolve(d);else reject(Error(d.error||'保存できませんでした。'));
      };
      worker.postMessage({type,...extra},[port.port2]);
    });
  }
  async function prepare(group){
    if(downloadJob||busy)return;
    const id=++downloadId,job={id,cancelled:false};downloadJob=job;refresh();
    const check=()=>{if(job.cancelled||id!==downloadId)throw Error('ダウンロードを停止しました。途中までの素材は次回に利用できます。');};
    $('download').disabled=true;$('movie').disabled=true;$('cancel-download').hidden=false;
    $('progress').hidden=false;$('progress').value=0;$('cancel-download').disabled=false;
    try{
      if(!registration?.active){
        registration=await navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'});
        observeRegistration();
        if(job.cancelled)registration.installing?.postMessage({type:'CANCEL_INSTALL'});
        check();
        const worker=registration.installing||registration.waiting;
        if(worker&&worker.state!=='activated')await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error('保存に時間がかかっています。通信を確認して再試行してください。')),180000);
          const check=()=>{
            if(worker.state==='activated'){clearTimeout(timer);resolve();}
            if(worker.state==='redundant'){clearTimeout(timer);reject(Error('基本の保存を完了できませんでした。途中までの素材は再試行に利用できます。'));}
          };
          worker.addEventListener('statechange',check);check();
        });
      }
      check();
      await message(registration?.active,'CACHE',{group,id});
      check();
      if(id===downloadId)$('download-status').textContent='保存が完了しました。';
    }catch(e){if(id===downloadId)$('download-status').textContent=e.message;}
    finally{if(downloadJob===job){downloadJob=null;$('download').disabled=false;$('movie').disabled=false;$('cancel-download').hidden=true;$('progress').hidden=true;refresh();}}
  }
  $('download').onclick=()=>prepare('core');
  $('movie').onclick=()=>prepare('movie');
  $('cancel-download').onclick=()=>{
    if(!downloadJob)return;
    downloadJob.cancelled=true;const cancelledId=downloadJob.id;downloadId++;
    registration?.installing?.postMessage({type:'CANCEL_INSTALL'});
    registration?.active?.postMessage({type:'CANCEL',id:cancelledId});
    $('cancel-download').disabled=true;
    $('download-status').textContent='ダウンロードを停止しました。途中までの素材は次回に利用できます。';
  };
  $('check-update').onclick=async()=>{
    if(downloadJob||busy||gameActive||!registration)return;
    $('check-update').disabled=true;
    try{await registration.update();$('update').hidden=!registration.waiting;$('update-status').textContent=registration.waiting?'新しい版の準備ができました。':'更新の確認を開始しました。';}
    catch(e){$('update-status').textContent='通信できませんでした。今の版はそのまま使えます。';}
    finally{$('check-update').disabled=false;}
  };
  $('update').onclick=async()=>{
    if(gameActive||busy||downloadJob||!owned)return;
    $('update').disabled=true;
    try{
      assertOwner(epoch);
      const worker=registration.waiting;
      await message(worker,'ACTIVATE');
      if(worker.state!=='activated')await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('更新の準備を待っています。少し後でもう一度お試しください。')),15000);
        worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timer);resolve();}});
      });
      location.reload();
    }catch(e){$('update-status').textContent=e.message;$('update').disabled=false;}
  };
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});
  $('install').onclick=async()=>{if(!installPrompt)return;await installPrompt.prompt();installPrompt=null;$('install').hidden=true;};
  async function setup(){
    try{const r=await fetch('pwa/assets.json',{cache:'no-store'});if(!r.ok)throw Error();manifest=await r.json();if(!manifest?.game)throw Error();}
    catch(e){manifest=null;manifestFailed=true;$('download-status').textContent='通信できないため、保存の準備ができませんでした。';}
    readyStatus();refresh();
    if('serviceWorker' in navigator&&isSecureContext){
      try{
        registration=await navigator.serviceWorker.getRegistration('pwa.html');
        $('download').disabled=false;$('movie').disabled=false;
        if(registration)observeRegistration();
        $('download-status').textContent=manifest?`基本の画面は約${(manifest.files.filter(f=>f.group==='core').reduce((n,f)=>n+f.bytes,0)/1000000).toFixed(1)}MB、動画は約18.8MBです。`:'保存を始めると基本画面をダウンロードします。';
      }catch(e){$('download-status').textContent='保存の準備に失敗しました。通信を確認して、この画面を開き直してください。';}
    }else $('download-status').textContent='この開き方では素材を保存できません。公開後のHTTPS画面で利用できます。';
  }
  function observeRegistration(){
    const state=()=>{
      $('check-update').disabled=!registration.active||!!downloadJob;
      $('update').hidden=!registration.waiting;
      if(registration.waiting)$('update-status').textContent='新しい版の準備ができました。ゲームを閉じたこの画面で更新できます。';
      else if($('update-status').textContent==='新しい版の準備ができました。ゲームを閉じたこの画面で更新できます。')$('update-status').textContent='';
    };
    registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',state));
    registration.installing?.addEventListener('statechange',state);state();
  }
  navigator.serviceWorker?.addEventListener('message',e=>{
    if(e.source!==registration?.installing||downloadJob?.cancelled)return;
    if(e.data?.type==='INSTALL_PROGRESS'){
      $('progress').value=e.data.progress;
      $('download-status').textContent=`基本の画面 ${Math.round(e.data.progress*100)}% 保存中`;
    }
  });
  acquire();setup();
})();
