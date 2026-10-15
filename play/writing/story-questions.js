/* Battle prompts reuse the reviewed sentence and dictionary data. */
(function(){
  'use strict';
  const hira=s=>s.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
  const contexts={
    '流氷':'うみに うかんで ながれる こおり',
    '知識':'まなんで おぼえた ことがら',
    '伝統':'むかしから うけつがれてきた ならわし',
    '清潔':'よごれが なく きれいな こと',
    '暴風':'はげしく ふく かぜ',
    '復習':'まなんだ ことを もういちど べんきょうする こと',
    '重複':'おなじ ことが かさなる こと',
    '責務':'せきにんを もって はたすべき つとめ',
    '統一':'ばらばらの ものを ひとつに まとめる こと',
    '逆風':'すすむ ほうから ふいてくる かぜ',
    '暴力':'らんぼうな ちからで あいてを きずつける こと',
    '臨時':'いつもと ちがい、その ときだけ おこなう こと',
    '疑問':'ほんとうか どうか わからず、ふしぎに おもう こと',
    '磁石':'てつを ひきつける もの',
    '尊敬':'すぐれた ひとを うやまう こと',
    '臨海':'うみに めんしている こと',
    '縮尺':'ちずなどで、ほんとうの ながさを ちいさくする わりあい',
    '質疑':'わからない ことを といただす こと',
    '敬老':'おとしよりを うやまい たいせつにする こと',
    '難題':'かんたんには とけない むずかしい もんだい',
    '難問':'こたえるのが むずかしい もんだい',
    '磁力':'じしゃくが てつなどを ひきつける ちから',
    '誤字':'まちがえて かいた もじ',
    '文武両道':'べんきょうも うんどうも、ともに はげむ こと',
    '不言実行':'あれこれ いわず、やるべき ことを おこなう こと',
    '品行方正':'おこないが ただしく きちんとしている こと',
    '牛飲馬食':'たくさん のみ、たくさん たべる こと',
    '日進月歩':'ひび どんどん しんぽする こと',
    '臨機応変':'その ときの ようすに あわせて、やりかたを かえる こと',
    '温故知新':'むかしの ことを まなんで、あたらしい ちしきを える こと',
    '有言実行':'いった ことを、かならず おこなう こと',
    '前代未聞':'これまでに きいた ことも ない ほど めずらしい こと',
    '一石二鳥':'ひとつの ことをして、ふたつの よい けっかを える こと'
  };
  function single(idx,turn,alternate){
    const k=K[idx],list=window.KanjimonWritingQuestions[k.c];
    if(!list?.length)throw Error('Missing writing sentence');
    const q=list[turn%list.length];
    return {id:q.id+(alternate?'-alternate':''),word:k.c,reading:alternate||q.reading,
      before:q.before,focus:q.reading,after:q.after,
      note:alternate&&hira(alternate)!==hira(q.reading+(q.okurigana||''))?'この じの べつの よみ：'+alternate:'',
      assisted:false};
  }
  function compound(word,reading,whole){
    const source=whole||word;
    const entry=JUKUGO.find(x=>x.w===source)||YOJIJUKUGO.find(x=>x.w===source);
    const meaning=contexts[source]||entry?.mean;
    if(!meaning)throw Error('Missing writing context: '+source);
    if([...source].some(c=>meaning.includes(c)))throw Error('Answer in writing context: '+source);
    return {id:'story-'+[...source].map(c=>c.codePointAt(0).toString(16)).join('-')+'-'+word,
      word,reading,before:meaning+'。',focus:whole?entry.y:reading,
      after:whole?'の '+(source.startsWith(word)?'まえ':'うしろ')+'の 2もじ。':'',note:'',assisted:!!whole};
  }
  function current(turn){
    if(isTamashii)return single(tamashiiIdx,turn,null);
    if(isTwinBoss){const d=twinBossBattleDefOf(twinBossZoneCur);return compound(twinTurn==='isshin'?d.first:d.second,twinTurn==='isshin'?d.fy:d.sy,d.first+d.second);}
    if(isJukugoBoss)return compound(jukugoBossWordObj.w,jukugoBossWordObj.y);
    return single(enemyIdx,turn,enemyShiny?enemyAlt:null);
  }
  window.KanjimonStoryQuestions=Object.freeze({single,compound,current});
})();
