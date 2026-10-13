(function(root){
'use strict';
const counts=Object.freeze({1:12,2:9});
function normalize(value){
 const zone=value?.version===2&&value.zone===2?2:1;
 const cursor=Number.isInteger(value?.cursor)?Math.max(0,Math.min(counts[zone],value.cursor)):0;
 return {version:2,zone,cursor};
}
const api=Object.freeze({counts,normalize});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.KanjimonWritingProgress=api;
})(typeof window==='undefined'?globalThis:window);
