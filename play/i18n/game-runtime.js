(function(root){
  'use strict';
  // English is enabled only by a host that has verified the language packs.
  let bundle=null;
  try{if(root.parent!==root)bundle=root.parent.KanjimonGameLanguage;}catch(e){}
  const active=!!(bundle&&bundle.schema===1&&bundle.locale==='en');
  const messages=active?bundle.messages:{},learning=active?bundle.learning:{};
  const missing=new Set();
  const translatedNodes=new WeakMap();
  const regexEscape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const patterns=Object.entries(messages).filter(([source])=>/\{[pcw]\d+\}/.test(source)).map(([source,target])=>{
    const names=[];let pattern='',cursor=0;
    for(const m of source.matchAll(/\{([pcw]\d+)\}/g)){pattern+=regexEscape(source.slice(cursor,m.index))+(m[1][0]==='p'?'([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)':m[1][0]==='c'?'([一-鿿]{1,4})':'([ぁ-ゖァ-ヶ一-鿿ー・／]{1,40})');names.push(m[1]);cursor=m.index+m[0].length;}
    return {re:new RegExp('^'+pattern+regexEscape(source.slice(cursor))+'$'),target,names};
  });
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function t(source){
    source=String(source??'');if(!active)return source;
    if(Object.hasOwn(messages,source))return messages[source];
    const trim=source.trim();
    if(Object.hasOwn(messages,trim))return source.slice(0,source.indexOf(trim))+messages[trim]+source.slice(source.indexOf(trim)+trim.length);
    const badge=source.match(/^(\S+ (?:みず|ひ|き|岩|かみなり|ふつう))　(👑ボス|👹おじゃま)$/);
    if(badge){
      const base=t(badge[1]),parts=badge[1].split(' ');
      return (base===badge[1]?parts[0]+' '+t(parts[1]):base)+' '+t(badge[2]);
    }
    const chapter=source.match(/^だい(\d+)わ「([^」]+)」 おしまい$/);
    if(chapter)return 'Episode '+chapter[1]+': '+t(chapter[2])+' — Complete';
    for(const {re,target,names}of patterns){const m=re.exec(source);if(m)return target.replace(/\{([pcw]\d+)\}/g,(_,k)=>m[names.indexOf(k)+1]);}
    if(/[ぁ-ヶ一-鿿]/.test(source)&&!/[A-Za-z]/.test(source)&&source.length>2&&missing.size<5000)missing.add(source);
    return source;
  }
  const kana='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゔぁぃぅぇぉゃゅょ';
  const sounds='a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa o n ga gi gu ge go za ji zu ze zo da ji zu de do ba bi bu be bo pa pi pu pe po vu a i u e o ya yu yo'.split(' ');
  const table=Object.fromEntries([...kana].map((c,i)=>[c,sounds[i]]));
  const digraph={き:'ky',ぎ:'gy',し:'sh',じ:'j',ち:'ch',ぢ:'j',に:'ny',ひ:'hy',び:'by',ぴ:'py',み:'my',り:'ry'};
  function romaji(value){
    const s=String(value).normalize('NFC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));
    let out='',geminate=false;
    for(let i=0;i<s.length;i++){
      const c=s[i];if(c==='っ'){geminate=true;continue;}
      let part=table[c]||c;
      if(digraph[c]&&/[ゃゅょ]/.test(s[i+1]||'!')){part=digraph[c]+({ゃ:'a',ゅ:'u',ょ:'o'}[s[++i]]);}
      if(c==='ん'&&/[あいうえおやゆよ]/.test(s[i+1]||'!'))part="n'";
      if(c==='ー')part=(out.match(/[aeiou](?=[^aeiou]*$)/)||['-'])[0];
      if(c==='／'||c==='・')part=' / ';
      if(geminate){if(/^[bcdfghjklmnpqrstvwxyz]/.test(part))out+=part.startsWith('ch')?'t':part[0];else out+="'";geminate=false;}
      out+=part;
    }
    return out+(geminate?"'":'');
  }
  const protectedSelector='script,style,textarea,input,rt,.fc,.nm-key,#nmInput,.ink-run,[data-language-original],.ig-destinations,.ig-lantern,.uq-board div,.g4-timetable strong,.g4-letters,.g4-kanji,.g4-kid span';
  function nodeText(node){
    if(translatedNodes.get(node)===node.nodeValue)return;
    const el=node.parentElement;if(!el||el.closest(protectedSelector)||el.closest('.school-paper-reading,.school-paper-char'))return;
    // Answer text is also used by the original grading and highlighting code.
    if(el.closest('.opt')&&node.nodeValue!=='つぎへ')return;
    const translated=t(node.nodeValue);if(translated!==node.nodeValue){node.nodeValue=translated;translatedNodes.set(node,translated);}
  }
  function reading(el){
    const text=el.textContent.trim();
    if(!/^[ぁ-ゖァ-ヶー／・]+$/.test(text)||text==='つぎへ')return;
    const roman=romaji(text);el.dataset.romaji=roman;el.lang='ja';
    el.setAttribute('aria-label',text+' ('+roman+')');
  }
  function localize(node){
    if(!active||!node)return;
    if(node.nodeType===3){nodeText(node);return;}
    if(node.nodeType!==1&&node.nodeType!==9)return;
    if(node.nodeType===1&&node.closest(protectedSelector))return;
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodeText(walker.currentNode);
    const elements=[...(node.nodeType===1?[node]:[]),...node.querySelectorAll('[aria-label],[title],[placeholder],.opt,.dy,.jr,.school-paper-reading')];
    for(const el of elements){
      if(el.closest(protectedSelector))continue;
      if(el.matches('.opt,.dy,.jr,.school-paper-reading'))reading(el);
      if(el.matches('.opt,.dy,.jr,.school-paper-reading'))continue;
      for(const attr of ['aria-label','title','placeholder'])if(el.hasAttribute(attr)){
        const old=el.getAttribute(attr),next=t(old);if(old!==next)el.setAttribute(attr,next);
      }
    }
  }
  function html(source){
    if(!active)return source;
    const template=document.createElement('template');template.innerHTML=source;
    const plain=template.content.textContent,translated=t(plain);
    if(translated!==plain)return escape(translated);
    const walker=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT);
    while(walker.nextNode())nodeText(walker.currentNode);
    return template.innerHTML;
  }
  function clearNext(host){host?.querySelector(':scope > .language-next')?.remove();}
  function battleMessage(kind,k){
    const character=escape(k.c),reading=escape(k.y)+' · '+escape(romaji(k.y));
    const gloss=learning[k.c]?.meaning;
    const label='<span class="yomi" lang="ja" data-language-original>'+character+'</span>';
    const detail='<span class="meaning" data-language-original>'+reading+(gloss?' · '+escape(gloss):'')+'</span>';
    if(kind==='body')return 'You calmed '+label+' and found its body!<br>Find its wandering spirit in the field.';
    if(kind==='sleeping')return 'You already have the body of '+label+'.<br>Find its spirit to wake it up!';
    if(kind==='restored')return 'Spirit and body reunited! '+label+' has its energy back.'+detail;
    return 'Spirit and body reunited! '+label+' is your friend!'+detail;
  }
  function syncMute(){
    const on=root.getSaveData?.().sound!==false;
    if(!on){root.stopBattleHakaseVoice?.();root.op1StopAllSnd?.();root.speechSynthesis?.cancel();}
    return on;
  }
  function next(host,callback){
    if(!active||!host)return;clearNext(host);
    const button=document.createElement('button');button.type='button';button.className='language-next';button.textContent='Next';
    let used=false;
    button.onclick=e=>{e.stopPropagation();if(used)return;used=true;if(callback()===false)used=false;};
    host.append(button);
    queueMicrotask(()=>{if(button.isConnected&&!used)button.focus({preventScroll:true});});
  }
  function intro(lines,onFinish){
    const host=document.createElement('section');host.className='language-intro';host.setAttribute('role','dialog');host.setAttribute('aria-label','Welcome to KanjiMon');
    host.innerHTML='<img src="images/sprites/hakase.webp" alt="Mana"><h1>Welcome to KanjiMon</h1><p class="language-intro-text"></p><small>English text · Japanese voices</small><button type="button" class="language-sound"></button>';
    document.body.append(host);let index=0,closed=false;
    const mute=host.querySelector('.language-sound');
    const label=()=>{mute.textContent=syncMute()?'Mute':'Unmute';};
    mute.onclick=()=>{root.toggleSound?.();label();};label();
    const saved=Array.from(document.body.children).filter(el=>el!==host).map(el=>[el,el.inert]);saved.forEach(([el])=>{el.inert=true;});
    function show(){
      if(closed)return;
      if(index>=lines.length){closed=true;root.stopBattleHakaseVoice?.();root.op1StopAllSnd?.();host.remove();saved.forEach(([el,inert])=>{el.inert=inert;});onFinish();return;}
      const line=lines[index++];host.querySelector('p').textContent=t(line.text);
      root.stopBattleHakaseVoice?.();root.op1StopAllSnd?.();
      if(line.opSound)root.op1PlaySnd?.(line.opSound);else if(line.snd)root.playBattleHakaseVoice?.(line.snd);
      next(host,show);host.querySelector('.language-next').focus();
    }
    show();
  }
  function dialogue(host,text,advance,position){
    if(!active||!host||!text)return;
    const words=text.textContent.split(/\s+/).filter(Boolean),pages=[];
    const lineHeight=parseFloat(getComputedStyle(text).lineHeight)||28;
    const available=Math.max(lineHeight*2,Math.min(lineHeight*6,(host.parentElement?.clientHeight||400)-110));
    let offset=0;
    while(offset<words.length){
      let low=1,high=words.length-offset,best=1;
      while(low<=high){
        const count=Math.floor((low+high)/2);text.textContent=words.slice(offset,offset+count).join(' ');
        if(text.scrollHeight<=available+1){best=count;low=count+1;}else high=count-1;
      }
      pages.push(words.slice(offset,offset+best).join(' '));offset+=best;
    }
    if(!pages.length)pages.push('');
    let page=0,done=false;
    const show=()=>{
      text.textContent=pages[page];host.dataset.languagePage=String(page+1);host.dataset.languagePages=String(pages.length);
      next(host,step);host.querySelector('.language-next').textContent=pages.length>1?'Next · '+(page+1)+' / '+pages.length:'Next';
      position?.();host.scrollTop=0;
    };
    const step=()=>{if(done)return;if(++page<pages.length)show();else{done=true;advance();}};
    host.onclick=step;show();
  }
  const storyPages=new WeakMap();
  const storyHosts=new Set();
  let loadState=null;
  for(const type of ['keydown','keyup'])root.addEventListener(type,e=>{if(loadState){if(!loadState.box.contains(e.target))e.preventDefault();e.stopImmediatePropagation();}},true);
  function cancelLoad(){if(!loadState)return;const state=loadState;loadState=null;state.box.remove();state.siblings.forEach(([el,inert])=>{if(el.isConnected)el.inert=inert;});}
  function gate(zone,done){
    if(!active||!bundle.ensure||bundle.ready(zone))return false;
    cancelLoad();root.stopAutoExplore?.();root.clearFieldHeldKeys?.();
    const box=document.createElement('section');box.className='language-loading';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
    box.innerHTML='<div><p role="status">Preparing English for this region…</p><button type="button" data-retry hidden>Retry</button><button type="button" data-back>Back to title</button></div>';
    const siblings=[...document.body.children].filter(e=>!['SCRIPT','STYLE'].includes(e.tagName)).map(e=>[e,e.inert]);siblings.forEach(([e])=>e.inert=true);document.body.append(box);
    const state=loadState={box,siblings};const retry=box.querySelector('[data-retry]'),status=box.querySelector('p');
    const run=async()=>{
      retry.hidden=true;status.textContent='Preparing English for this region…';
      try{await bundle.ensure(zone);if(loadState!==state)return;cancelLoad();done();}
      catch(e){if(loadState!==state)return;status.textContent='English for this region could not be loaded. Your progress and current location are unchanged. Connect to the internet and retry.';retry.hidden=false;retry.focus();}
    };
    retry.onclick=run;box.querySelector('[data-back]').onclick=()=>{cancelLoad();root.showScreen('screen-title');};run();return true;
  }
  function clearStory(host){
    const state=host&&storyPages.get(host);if(!state)return;
    storyPages.delete(host);storyHosts.delete(host);state.observer.disconnect();host.onclick=state.previousClick;
    clearNext(host);delete host.dataset.languagePage;delete host.dataset.languagePages;
  }
  function advanceStory(host){
    const state=host&&storyPages.get(host);if(!state||state.finishing)return false;
    state.step();return true;
  }
  function story(host,text,advance,valid,canAdvance){
    if(!active||!host||!text)return;
    clearStory(host);
    const words=text.textContent.trim().split(/\s+/).filter(Boolean);
    let offset=0,end=0,page=1,lastWidth=0,lastHeight=0,lastFont='';
    const state={previousClick:host.onclick,observer:null,step:null};
    const alive=()=>storyPages.get(host)===state&&host.isConnected&&(!valid||valid());
    const show=()=>{
      if(!alive())return;
      const style=getComputedStyle(text),lineHeight=parseFloat(style.lineHeight)||28;
      const limit=Math.max(lineHeight,Math.min(6*lineHeight,innerHeight>500?innerHeight*.28:innerHeight-180));
      let low=1,high=words.length-offset,best=1;
      while(low<=high){
        const count=Math.floor((low+high)/2);text.textContent=words.slice(offset,offset+count).join(' ');
        if(text.scrollHeight<=limit+1){best=count;low=count+1;}else high=count-1;
      }
      end=Math.min(words.length,offset+best);text.textContent=words.slice(offset,end).join(' ');
      host.dataset.languagePage=String(page);
      next(host,state.step);host.querySelector(':scope > .language-next').textContent=end<words.length?'Next · more':'Next';
      lastWidth=text.clientWidth;lastHeight=innerHeight;lastFont=style.fontSize;
    };
    state.step=()=>{
      if(!alive())return;
      if(canAdvance&&!canAdvance())return false;
      if(end<words.length){offset=end;page++;show();}
      else{
        state.finishing=true;
        try{
          if(advance()===false)return false;
          if(storyPages.get(host)===state)clearStory(host);
        }finally{state.finishing=false;}
      }
    };
    state.observer=new ResizeObserver(()=>{
      if(alive()&&(text.clientWidth!==lastWidth||innerHeight!==lastHeight||getComputedStyle(text).fontSize!==lastFont))show();
    });
    storyPages.set(host,state);storyHosts.add(host);
    host.onclick=e=>{e.stopPropagation();state.step();};
    show();state.observer.observe(text);state.observer.observe(document.documentElement);
  }
  function workQuestion(q){
    if(!active)return q;
    const m=q.meta,time=n=>Math.floor(n/60)+':'+String(n%60).padStart(2,'0');
    const route=o=>o==='AB'?'Bakery → Florist':'Florist → Bakery';
    let prompt,context,explanation,options;
    switch(q.type){
      case 'read':
        prompt='What time is it?';context='The short hand shows hours. The long hand shows minutes.';
        explanation='The short hand is '+(m.m?'past ':'at ')+m.h+'. The long hand is at '+(m.m===0?12:m.m/5)+', so it is '+time(m.value)+'.';break;
      case 'after':
        prompt='What time will you finish?';context='Start at '+time(m.start)+' and help for '+m.duration+' minutes.';
        explanation='From '+time(m.start)+', add '+(60-m.start%60)+' minutes to the next hour, then '+(m.duration-(60-m.start%60))+' more minutes: '+time(m.end)+'.';break;
      case 'elapsed':
        prompt='How many minutes did it take?';context='Started at '+time(m.start)+' and finished at '+time(m.end)+'.';
        explanation=(60-m.start%60)+' minutes to the next hour, plus '+m.end%60+' minutes: '+m.duration+' minutes in all.';break;
      case 'before':
        prompt='What is the latest time you can start and still finish on time?';context='Finish by '+time(m.end)+'. The job takes '+m.duration+' minutes.';
        explanation='Count back '+m.duration+' minutes from '+time(m.end)+': '+time(m.start)+'. Starting later would be too late.';break;
      case 'departure':case 'route':{
        context='Home to bakery: '+m.a+' min. Home to florist: '+m.b+' min. Between shops: '+m.between+' min. Each delivery takes '+m.service+' min. Finish at the bakery by '+time(m.closeA)+' and the florist by '+time(m.closeB)+'. Both open at '+time(m.start-30)+'.';
        if(q.type==='departure'){
          prompt=route(m.order)+'. What is the latest departure that meets both deadlines?';
          const first=(m.order==='AB'?m.closeA:m.closeB)-(m.order==='AB'?m.a:m.b)-m.service;
          const second=(m.order==='AB'?m.closeB:m.closeA)-(m.order==='AB'?m.a:m.b)-m.service-m.between-m.service;
          explanation='The first deadline gives '+time(first)+', and the second gives '+time(second)+'. Leave by the earlier time, '+time(m.start)+', to meet both.';
        }else{
          prompt='Which plan meets both delivery deadlines?';options=m.plans.map(p=>time(p.start)+' → '+route(p.order));
          const p=m.plans[q.answer],first=p.start+(p.order==='AB'?m.a:m.b)+m.service,second=first+m.between+m.service;
          explanation='Leave at '+time(p.start)+'; '+route(p.order)+'. Finish at the bakery at '+time(p.order==='AB'?first:second)+' and the florist at '+time(p.order==='AB'?second:first)+'. Both are on time. The other plans miss a deadline.';
        }break;
      }
      case 'match':case 'heavy':case 'light':
        prompt=q.type==='match'?'Choose the '+m.value+' g pack.':q.type==='heavy'?'Which pack is heaviest?':'Which pack is lightest?';context='Grams (g) measure weight.';
        explanation=q.type==='match'?'Choose '+m.value+' g to match the order.':[...m.weights].sort((a,b)=>a-b).join(' g < ')+' g. The '+(q.type==='heavy'?'largest':'smallest')+' weight is '+m.value+' g.';break;
      case 'convert':
        prompt='How many grams is that?';context='Prepare '+m.amount/1000+' kg of meat.';explanation='1 kg = 1000 g. '+m.amount/1000+' × 1000 = '+m.amount+' g.';break;
      case 'missing':
        prompt='How many more grams do you need?';context='You need '+m.amount/1000+' kg and already have '+m.part+' g.';explanation=m.amount/1000+' kg = '+m.amount+' g. '+m.amount+' − '+m.part+' = '+m.value+' g.';break;
      case 'sum':
        prompt='How many grams altogether?';context=m.count+' packs, each weighing '+m.part+' g.';explanation=m.part+' × '+m.count+' = '+m.value+' g.';break;
      case 'servings':
        prompt='How many grams for '+m.people+' people?';context='A recipe for '+m.base+' people uses '+m.amount+' g. Each serving is the same size.';explanation='Per person: '+m.amount+' ÷ '+m.base+' = '+m.per+' g. For '+m.people+' people: '+m.per+' × '+m.people+' = '+m.value+' g.';break;
      case 'price':
        prompt='How much does it cost?';context='Buy '+m.amount+' g of meat at ¥'+m.unit+' per 100 g.';explanation=m.amount/100+' lots of 100 g: '+m.unit+' × '+m.amount/100+' = ¥'+m.value+'.';break;
      case 'budget':
        prompt='Which purchase gives you enough meat within your budget?';context='Each 200 g pack costs ¥'+m.unit+'. You need at least '+m.required+' g and can spend up to ¥'+m.budget+'.';options=m.plans.map(p=>'Buy '+p.count+' packs');
        explanation=m.required/200+' packs give '+m.required+' g for ¥'+m.required/200*m.unit+'. Fewer packs are not enough; more cost at least ¥'+(m.required/200+1)*m.unit+', over your budget.';break;
      default:throw Error('Missing English work question');
    }
    if(!options)options=m.values.map(v=>['read','after','before','departure'].includes(q.type)?time(v):q.type==='elapsed'?v+' min':q.type==='price'?'¥'+v:v+' g');
    return {...q,prompt,context,explanation,options};
  }
  root.KanjimonGameI18n={active,t,html,escape,romaji,localize,next,clearNext,intro,battleMessage,dialogue,story,advanceStory,clearStory,workQuestion,gate,cancelLoad,
    writingContext:q=>{
      if(!active)return null;
      const sentence=bundle.writingById?.[(q.id||'').replace(/-alternate$/,'')];
      if(sentence)return sentence;
      if((q.id||'').startsWith('story-')){
        const source=q.id.split('-').slice(1,-1).map(s=>String.fromCodePoint(parseInt(s,16))).join('');
        const gloss=bundle.compounds?.[source];
        if(gloss)return gloss+(q.assisted?' Write the '+(source.startsWith(q.word)?'first':'last')+' two kanji.':'');
      }
      const template=bundle.writing?.[q.before+'|'+q.after],meaning=learning[q.word]?.meaning;
      if(!template||!meaning)return null;
      const text=template.replace('{meaning}',meaning);
      return meaning==='one'?text.replace(/one (plates|sheets|cards|stickers)\b/g,(_,noun)=>'one '+noun.slice(0,-1)):text;
    },
    textHTML:s=>String(s).split(/<br\s*\/?>/i).map(line=>escape(t(line))).join('<br> '),
    meaning:k=>learning[k.c]?.meaning,
    note:k=>learning[k.c]?.note,
    compound:word=>bundle?.compounds?.[word],
    regions:active?bundle.regions:[],
    get missing(){return [...missing];}
  };
  if(!active)return;
  document.documentElement.classList.add('game-english');
  document.addEventListener('DOMContentLoaded',()=>{
    localize(document.body);
    document.documentElement.lang='en';
    document.getElementById('soundBtn')?.addEventListener('click',syncMute);
    document.getElementById('gfClues')?.addEventListener('click',e=>e.stopPropagation());
    // Text changes only: walking transforms, animation frames and styles are not observed.
    const observer=new MutationObserver(records=>{
      const nodes=new Set();for(const r of records){if(r.type==='characterData')nodes.add(r.target);else for(const n of r.addedNodes)nodes.add(n);}
      for(const node of nodes)if(node.isConnected)localize(node);
      for(const host of storyHosts)if(!host.isConnected)clearStory(host);
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  },{once:true});
})(window);
