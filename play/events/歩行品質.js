/* 歩行品質修正_20261003：実際に逆足を描いた素材だけB全身反転を止める。
   左へ進むための方向反転とは別。未登録の素材は旧規則を維持する。 */
(function(global){
 'use strict';
 const modes=Object.freeze({
  'hero.webp':'nativeReverseB',
  'hero-girl-pink.webp':'nativeReverseB',
  'hero-girl-wafuku.webp':'nativeReverseB',
  'hero-girl.webp':'nativeReverseB',
  'hero-wafuku.webp':'nativeReverseB',
  'hero-suit.webp':'nativeReverseB',
  'hero-space.webp':'nativeReverseB',
  'hero-rpg.webp':'nativeReverseB',
  'hero-robo.webp':'nativeReverseB',
  'hero-girl-suit.webp':'nativeReverseB',
  'hero-girl-rpg.webp':'nativeReverseB',
  'hero-girl-snow.webp':'nativeReverseB'
 });
 function native(sheet){
  const name=String(sheet||'').match(/(?:^|\/)(hero(?:-[a-z]+)*\.webp)(?=[?'"\s)]|$)/);
  return !!name&&modes[name[1]]==='nativeReverseB';
 }
 function legacyB(useB,sheet){return !!useB&&!native(sheet);}
 function transform(el,useB,col){
  const legacy=legacyB(useB,el.style.backgroundImage||global.heroSheetUrl());
  const ud=col==='0%'||col==='50%';
  const facing=col==='100%'&&el.style.getPropertyValue('--walk-facing')==='-1'?-1:1;
  el.style.transformOrigin='center bottom';
  el.style.transform='translateY('+(legacy?'-3%':'0')+') scaleX('+facing*((legacy&&ud)?-1:1)+')';
 }
 global.HeroWalkQuality=Object.freeze({modes,native,legacyB,transform});
})(window);
