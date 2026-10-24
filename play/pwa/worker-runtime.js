/* A worker keeps one immutable release. Existing release caches are retained. */
const manifest=self.KanjimonAssets,core=self.KanjimonWorkerCore;
const base=new URL('./',self.location.href),cacheName='kanjimon-pwa-'+manifest.version;
const url=path=>new URL(path,base).href;
const entries=new Map(manifest.files.map(f=>[url(f.path),f]));
const jobs=new Map();
const installingController=new AbortController();
function entryFor(request){
  const u=new URL(typeof request==='string'?request:request.url);
  u.search='';u.hash='';
  return entries.get(u.href);
}
async function fetchVerified(entry,signal){
  const response=await fetch(url(entry.path),{cache:'no-store',signal,credentials:'same-origin'});
  return core.verified(response,entry,crypto);
}
async function cacheGroup(group,signal,onProgress=()=>{}){
  const list=manifest.files.filter(f=>f.group===group);
  if(!list.length)throw Error('保存する素材がありません。');
  const cache=await caches.open(cacheName);
  const total=list.reduce((n,f)=>n+f.bytes,0);let done=0;
  for(const entry of list){
    if(signal?.aborted)throw Error('ダウンロードを停止しました。途中までの素材は次回に利用できます。');
    const key=url(entry.path),cached=await cache.match(key);
    let valid=false;
    if(cached)try{await core.verified(cached,entry,crypto);valid=true;}catch(e){}
    if(!valid){
      const response=await fetchVerified(entry,signal);
      if(signal?.aborted)throw Error('ダウンロードを停止しました。');
      await cache.put(key,response);
    }
    done+=entry.bytes;onProgress(done/total);
  }
  // The manifest is generated from the exact bytes checked above.
  if(signal?.aborted)throw Error('ダウンロードを停止しました。');
  await cache.put(url('pwa/assets.json'),new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}}));
}
self.addEventListener('install',event=>{
  event.waitUntil(cacheGroup('core',installingController.signal,progress=>{
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
      for(const client of clients)if(client.url.startsWith(base.href))client.postMessage({type:'INSTALL_PROGRESS',progress});
    });
  }));
  // No skipWaiting: an installed update must wait for a safe user action.
});
self.addEventListener('activate',event=>{
  // No deletion and no clients.claim: already open games retain their worker.
  event.waitUntil(Promise.resolve());
});
self.addEventListener('message',event=>{
  const data=event.data||{},port=event.ports?.[0];
  const sourceURL=event.source?.url;
  if(!sourceURL||new URL(sourceURL).origin!==base.origin||new URL(sourceURL).pathname!==new URL('pwa.html',base).pathname)return;
  const jobKey=event.source.id+':'+data.id;
  if(data.type==='CANCEL_INSTALL'){installingController.abort();return;}
  if(data.type==='CANCEL'){jobs.get(jobKey)?.abort();return;}
  event.waitUntil((async()=>{
    try{
      if(data.type==='CACHE'){
        if(!['core','movie'].includes(data.group)||jobs.size)throw Error('別の保存が終わってから試してください。');
        const controller=new AbortController();jobs.set(jobKey,controller);
        try{await cacheGroup(data.group,controller.signal,progress=>port?.postMessage({progress}));}
        finally{jobs.delete(jobKey);}
      }else if(data.type==='ACTIVATE'){
        if(jobs.size)throw Error('素材の保存が終わってから更新してください。');
        const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
        if(windows.some(c=>c.id!==event.source.id&&c.url.startsWith(base.href)))throw Error('ほかのゲーム画面を閉じてから更新してください。');
        await cacheGroup('core');
        await self.skipWaiting();
      }else throw Error('Unknown request');
      port?.postMessage({ok:true,version:manifest.version});
    }catch(e){port?.postMessage({ok:false,error:e.name==='AbortError'?'ダウンロードを停止しました。':e.message});}
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(u.origin!==base.origin||!u.href.startsWith(base.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(cacheName);
    if(u.pathname===new URL('pwa/assets.json',base).pathname){
      return new Response(JSON.stringify(manifest),{headers:{'Content-Type':'application/json'}});
    }
    const entry=entryFor(event.request);
    if(!entry)return fetch(event.request);
    const cached=await cache.match(url(entry.path));
    if(cached){
      // Cache writes are verified; recheck before reuse to detect corruption.
      try{
        await core.verified(cached,entry,crypto);
        return event.request.headers.has('Range')?core.partial(cached,event.request.headers.get('Range')):cached;
      }catch(e){await cache.delete(url(entry.path));}
    }
    // Movies stream normally unless the user explicitly saved the complete file.
    if(entry.group==='movie')return fetch(event.request);
    try{
      const response=await fetchVerified(entry);
      if(entry.group==='core')try{await cache.put(url(entry.path),response.clone());}catch(e){}
      return event.request.headers.has('Range')?core.partial(response,event.request.headers.get('Range')):response;
    }catch(e){
      return new Response('通信できませんでした。オンラインで開き直してください。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
