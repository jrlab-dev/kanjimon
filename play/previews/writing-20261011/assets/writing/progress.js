(function(root){
'use strict';
const counts=Object.freeze({"1":12,"2":9,"3":10,"4":8,"5":11,"6":11,"7":10,"8":9,"9":10,"10":10,"11":12,"12":10,"13":11,"14":10,"15":10,"16":10,"17":10,"18":10,"19":10,"20":10,"21":10,"22":10,"23":10,"24":7,"25":10,"26":10,"27":10,"28":10,"29":10,"30":10,"31":10,"32":10,"33":10,"34":10,"35":10,"36":10,"37":10,"38":10,"39":10,"40":10,"41":10,"42":10,"43":10,"44":10,"45":10,"46":10,"47":10,"48":10,"49":10,"50":10,"51":10,"52":10,"53":11,"54":10,"55":10,"56":10,"57":11,"58":10,"59":10,"60":10,"61":10,"62":10,"63":10,"64":10,"65":11,"66":10,"67":11,"68":10,"69":10,"70":10,"71":10,"72":10,"73":11,"74":10,"75":10,"76":10,"77":10,"78":10,"79":10,"80":10,"81":10,"82":10,"83":10,"84":10,"85":10,"86":10,"87":10,"88":10,"89":10,"90":10,"91":10,"92":10,"93":10,"94":11,"95":10,"96":10,"97":10,"98":10,"99":10,"100":10,"101":10,"102":10});
const maxZone=Object.keys(counts).length;
function normalize(value){
 if(value?.version!=null&&![1,2].includes(value.version))return {version:2,zone:1,cursor:0,unavailable:true};
 const zone=value?.version===2?value.zone:1;
 if(!Number.isInteger(zone)||!counts[zone])return {version:2,zone:1,cursor:0,unavailable:true};
 const cursor=Number.isInteger(value?.cursor)?Math.max(0,Math.min(counts[zone],value.cursor)):0;
 return {version:2,zone,cursor};
}
const api=Object.freeze({counts,maxZone,normalize});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.KanjimonWritingProgress=api;
})(typeof window==='undefined'?globalThis:window);
