(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjimonWorkerCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function range(header,size){
    const m=/^bytes=(\d*)-(\d*)$/.exec(header||'');
    if(!m||(!m[1]&&!m[2])||size<1)return null;
    let start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));
    let end=m[1]?(m[2]?Math.min(size-1,Number(m[2])):size-1):size-1;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start||!m[1]&&Number(m[2])===0)return null;
    return {start,end};
  }
  async function partial(response,header){
    const bytes=await response.arrayBuffer(),r=range(header,bytes.byteLength);
    if(!r)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
    const headers=new Headers(response.headers);
    headers.set('Content-Range',`bytes ${r.start}-${r.end}/${bytes.byteLength}`);
    headers.set('Content-Length',String(r.end-r.start+1));headers.set('Accept-Ranges','bytes');
    headers.delete('Content-Encoding');
    return new Response(bytes.slice(r.start,r.end+1),{status:206,headers});
  }
  async function verified(response,entry,cryptoApi){
    if(response.status!==200||response.type==='opaque')throw Error('完全な素材を取得できませんでした。');
    const body=await response.clone().arrayBuffer();
    if(body.byteLength!==entry.bytes)throw Error('素材の容量が一致しません。時間をおいて再試行してください。');
    const hash=Array.from(new Uint8Array(await cryptoApi.subtle.digest('SHA-256',body)),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==entry.sha256)throw Error('更新中の素材が混ざっています。時間をおいて再試行してください。');
    return response;
  }
  return {range,partial,verified};
});
