(function(root){
  'use strict';
  const contract=root.KanjimonLanguageContract;
  if(!contract)return;
  const localeKey='kanjimon-display-language-v1';
  const preview=new URLSearchParams(root.location.search).get('languagePreview')==='1';
  const original=contract.source,englishKeys=Object.keys(original);
  const reverse=new Map(Object.entries(original).map(([key,value])=>[value,key]));
  let locale='ja',messages=null,manifest=null,changing=false,canChange=()=>false,connected=false;
  let deferredPreference=null,preferenceScheduled=false;
  const $=id=>document.getElementById(id);
  const fields=s=>[...s.matchAll(/\{(p\d+)\}/g)].map(m=>m[1]).sort();
  function format(text,params){return text.replace(/\{(p\d+)\}/g,(_,key)=>{
    if(!Object.hasOwn(params,key))throw Error('Missing translation parameter');return String(params[key]);
  });}
  function t(key,params={},fallback){
    if(locale==='ja')return format(original[key]??fallback??'',params);
    if(!messages||!Object.hasOwn(messages,key))throw Error('Missing English message');
    return format(messages[key],params);
  }
  function error(e){
    const value=e?.message||String(e);if(locale==='ja')return value;
    const key=reverse.get(value);if(key)return t(key);
    if(messages&&Object.values(messages).includes(value))return value;
    return 'Something went wrong. Keep this screen open and try again. Your saved adventure has not been cleared.';
  }
  function render(){
    // Reformat existing status text once at a language boundary, never per frame.
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    for(const node of nodes){
      if(node.parentElement?.closest('script,style,#language-settings,[data-i18n]'))continue;
      for(const key of englishKeys){
        let matched=false;
        for(const text of [original[key],messages?.[key]]){
          if(!text)continue;
          const names=[];let pattern='',cursor=0;
          for(const m of text.matchAll(/\{(p\d+)\}/g)){pattern+=escape(text.slice(cursor,m.index))+'([0-9]+(?:\\.[0-9]+)?)';names.push(m[1]);cursor=m.index+m[0].length;}
          pattern+=escape(text.slice(cursor));
          const match=new RegExp('^'+pattern+'$').exec(node.nodeValue);
          if(match){node.nodeValue=t(key,Object.fromEntries(names.map((n,i)=>[n,match[i+1]])));matched=true;break;}
        }
        if(matched)break;
      }
    }
    document.documentElement.lang=locale;
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
    document.querySelectorAll('[data-i18n-attrs]').forEach(el=>{
      for(const pair of el.dataset.i18nAttrs.split(' ')){const split=pair.indexOf(':');el.setAttribute(pair.slice(0,split),t(pair.slice(split+1)));}
    });
    if($('language-choice'))$('language-choice').value=locale;
    if($('language-note'))$('language-note').textContent=locale==='en'
      ?(gameReady()?'English text · Japanese voices. Your saved adventure continues in either language.':'English save settings are ready. Adventure translation is still in progress. Choose 日本語 to play; your saved adventure is kept.')
      :'表示言語を変えても、同じ冒険の記録を引き継ぎます。';
    if($('language-back'))$('language-back').hidden=locale!=='en'||gameReady();
    sync();
  }
  function gameReady(){return contract.gameLocales.includes(locale)||(locale==='en'&&preview&&!!root.KanjimonGamePacks?.bundle);}
  function validatePage(){
    const keys=Array.from(document.querySelectorAll('[data-i18n]'),el=>el.dataset.i18n);
    document.querySelectorAll('[data-i18n-attrs]').forEach(el=>{for(const pair of el.dataset.i18nAttrs.split(' '))keys.push(pair.slice(pair.indexOf(':')+1));});
    if(keys.some(key=>!Object.hasOwn(original,key)))throw Error('Page and language contract do not match');
  }
  function sync(){
    if($('language-choice'))$('language-choice').disabled=changing||!canChange();
    if($('language-back'))$('language-back').disabled=changing||!canChange();
    if(deferredPreference&&!changing&&canChange()&&!preferenceScheduled){
      preferenceScheduled=true;queueMicrotask(()=>{
        preferenceScheduled=false;if(!canChange()||changing)return;
        const next=deferredPreference;deferredPreference=null;if(next)change(next,false);
      });
    }
  }
  async function loadEnglish(){
    const name='i18n/en/shell.json';
    const row=manifest?.files?.find(f=>f.path===name);
    if(!row||row.group!=='locale-en'||row.bytes>200000||!/^[a-f0-9]{64}$/.test(row.sha256))throw Error('Invalid language manifest');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(new URL(name,document.baseURI),{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw Error('Language download failed');
      const body=await response.arrayBuffer();if(body.byteLength!==row.bytes)throw Error('Language size mismatch');
      const digest=await crypto.subtle.digest('SHA-256',body);
      const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
      if(hash!==row.sha256)throw Error('Language hash mismatch');
      const pack=JSON.parse(new TextDecoder().decode(body));
      if(pack.schema!==1||pack.revision!==contract.revision||pack.locale!=='en'||!pack.messages||typeof pack.messages!=='object'||Array.isArray(pack.messages))throw Error('Language version mismatch');
      if(Object.keys(pack.messages).length!==englishKeys.length)throw Error('Language keys mismatch');
      for(const key of englishKeys){
        const text=pack.messages[key];
        if(!Object.hasOwn(pack.messages,key)||typeof text!=='string'||!text.trim()||JSON.stringify(fields(text))!==JSON.stringify(fields(original[key])))throw Error('Incomplete language pack');
      }
      return Object.freeze(pack.messages);
    }finally{clearTimeout(timer);}
  }
  async function change(next,persist=true){
    if(persist)deferredPreference=null;
    if(!['ja','en'].includes(next)||changing||!canChange()||(next==='en'&&!preview&&!contract.gameLocales.includes('en'))){
      if($('language-choice'))$('language-choice').value=locale;return false;
    }
    changing=true;sync();root.dispatchEvent(new CustomEvent('kanjimon-language-busy'));
    if($('language-error'))$('language-error').textContent='';
    try{
      const nextMessages=next==='en'?(messages||await loadEnglish()):null;
      if(next==='en'&&root.KanjimonGamePacks){
        root.KanjimonGamePacks.connect(manifest);
        let zone=1;const raw=localStorage.getItem('kanjimon-save');
        if(raw){const save=JSON.parse(raw);zone=Math.max(save.field?.zone||save.fieldZone||1,save.unlocked||1);}
        await root.KanjimonGamePacks.ensure(zone);
      }
      if(!canChange())throw Error('Language change is no longer safe');
      if(next==='en')validatePage();
      if(persist)localStorage.setItem(localeKey,next);
      if(nextMessages)messages=nextMessages;
      locale=next;render();root.dispatchEvent(new CustomEvent('kanjimon-language-change'));
      return true;
    }catch(e){
      if($('language-choice'))$('language-choice').value=locale;
      if($('language-error'))$('language-error').textContent='English could not be enabled. Check your connection and select English to retry. / 英語に切り替えられませんでした。再度選び直してください。';
      return false;
    }finally{changing=false;sync();root.dispatchEvent(new CustomEvent('kanjimon-language-busy'));}
  }
  async function connect(info,check){
    manifest=info;canChange=check;
    if(!connected){
      connected=true;
      const panel=document.createElement('section');panel.id='language-settings';panel.hidden=!preview&&!contract.gameLocales.includes('en');
      const label=document.createElement('label');label.htmlFor='language-choice';label.textContent='Language / 表示言語';
      const select=document.createElement('select');select.id='language-choice';
      let suggestEnglish=false;try{suggestEnglish=!localStorage.getItem(localeKey)&&/^en\b/i.test(navigator.language);}catch(e){}
      for(const [value,text]of [['ja','日本語'],['en',suggestEnglish?'English (suggested)':'English']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
      select.onchange=()=>change(select.value);
      const note=document.createElement('p');note.id='language-note';
      const problem=document.createElement('p');problem.id='language-error';problem.setAttribute('role','status');
      const back=document.createElement('button');back.id='language-back';back.textContent='Play in Japanese / 日本語で遊ぶ';back.onclick=()=>change('ja');
      panel.append(label,select,note,problem,back);$('home').insertBefore(panel,$('status'));
    }
    render();let preference='ja';try{preference=localStorage.getItem(localeKey)||'ja';}catch(e){}
    if(preference==='en'&&(preview||contract.gameLocales.includes('en'))){
      if(canChange())await change('en',false);else deferredPreference='en';
    }
    sync();
  }
  root.KanjimonLanguage=Object.freeze({t,error,connect,change,sync,gameReady,get locale(){return locale;},get busy(){return changing;}});
})(window);
