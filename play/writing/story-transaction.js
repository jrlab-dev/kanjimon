/* A single-key, retryable commit. Mutation and presentation belong to the caller. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KanjimonWritingTransaction=api;
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  function create({read,write}){
    let pending=null,claimed=new Set(),external=false,last=read();
    function retry(){
      if(!pending||external)return false;
      // Another tab's progress must never be overwritten by an old retry.
      if(read()!==last){external=true;return false;}
      try{write(pending.json);}catch(e){return false;}
      last=pending.json;
      const done=pending.done;pending=null;
      if(done)done();
      return true;
    }
    function commit(id,build,done){
      if(external||pending||claimed.has(id))return false;
      if(read()!==last){external=true;return false;}
      // Claim before invoking application code, including synchronous re-entry.
      claimed.add(id);
      try{pending={id,json:JSON.stringify(build()),done};}
      catch(e){claimed.delete(id);throw e;}
      return retry();
    }
    function observe(){
      if(read()!==last){external=true;return false;}return true;
    }
    function saved(){if(!pending&&!external)last=read();}
    return Object.freeze({commit,retry,observe,saved,
      get pending(){return !!pending;},get external(){return external;},
      get snapshot(){return pending?.json||null;}});
  }
  return Object.freeze({create});
});
