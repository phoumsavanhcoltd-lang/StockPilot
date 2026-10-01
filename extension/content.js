const FIELD_HINTS={
 title:['title','caption'],
 description:['description','desc'],
 keywords:['keywords','keyword','tags'],
 category:['category','categories']
};
const norm=v=>String(v??'').replace(/\s+/g,' ').trim().toLowerCase();
const visible=e=>!!e&&(e.offsetWidth||e.offsetHeight||e.getClientRects().length)>0;
function context(e){
 const a=['aria-label','placeholder','name','data-testid','data-test','role'].map(x=>e.getAttribute(x)).filter(Boolean);
 if(e.id){const l=document.querySelector(`label[for="${CSS.escape(e.id)}"]`);if(l)a.push(l.textContent)}
 const p=e.closest('label,fieldset,[role="group"]');if(p)a.push(p.textContent?.slice(0,180));
 const prev=e.previousElementSibling;if(prev?.tagName==='LABEL')a.push(prev.textContent);
 return norm(a.join(' '));
}
function candidates(type){
 const hints=FIELD_HINTS[type];
 return [...document.querySelectorAll('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="combobox"]')]
 .filter(e=>visible(e)&&!e.disabled&&!e.readOnly).map(e=>{const c=context(e);let score=0;
 hints.forEach(h=>{if(c.includes(h))score+=h===type?12:5});
 if(type==='title'&&e.matches('input'))score+=2;
 if(type==='description'&&e.matches('textarea,[contenteditable="true"]'))score+=4;
 if(type==='keywords'&&e.matches('textarea,[contenteditable="true"],[role="textbox"]'))score+=4;
 if(type==='category'&&e.matches('select,[role="combobox"]'))score+=5;
 return {element:e,score,context:c};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
}
function readValue(e){if(!e)return '';if(e.isContentEditable)return e.textContent||'';if(e.matches('select'))return e.selectedOptions?.[0]?.textContent?.trim()||e.value||'';return e.value??'';}
function describe(e,score){return {score,tag:e.tagName.toLowerCase(),id:e.id||'',name:e.getAttribute('name')||'',placeholder:e.getAttribute('placeholder')||'',context:context(e).slice(0,180)};}
function scan(){const fields={};Object.keys(FIELD_HINTS).forEach(type=>{fields[type]=candidates(type).slice(0,5).map(x=>describe(x.element,x.score));});
 const best=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v[0]||null]));const detected=Object.values(best).filter(Boolean).length;return {url:location.href,detected,total:4,ready:detected===4,fields,best};}
function setValue(e,value){if(!e)return false;const text=String(value??'');
 if(e.matches('select')){const o=[...e.options].find(x=>norm(x.value)===norm(text)||norm(x.textContent)===norm(text));if(!o)return false;e.value=o.value;}
 else if(e.isContentEditable)e.textContent=text;
 else{const p=Object.getPrototypeOf(e),s=Object.getOwnPropertyDescriptor(p,'value')?.set;s?s.call(e,text):e.value=text;}
 e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text.slice(0,64)}));e.dispatchEvent(new Event('change',{bubbles:true}));e.dispatchEvent(new Event('blur',{bubbles:true}));return true;
}
function expected(type,m){return type==='keywords'?(Array.isArray(m.keywords)?m.keywords.join(', '):m.keywords||''):m[type]||'';}
const MIN_SCORE=10;
const pickedTypes=sel=>Object.keys(FIELD_HINTS).filter(t=>!sel||sel[t]);
// Tag-style inputs: type each keyword and press Enter.
function fillTags(e,list){for(const k of list){setValue(e,k);for(const t of ['keydown','keyup'])e.dispatchEvent(new KeyboardEvent(t,{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));}}
function fill(m,sel){const out={};for(const type of pickedTypes(sel)){const c=candidates(type)[0];
 if(!c){out[type]={filled:false,verified:false,reason:'field-not-found'};continue}
 if(c.score<MIN_SCORE){out[type]={filled:false,verified:false,reason:'low-confidence-field',score:c.score};continue}
 const wanted=expected(type,m);if(!norm(wanted)){out[type]={filled:false,verified:false,reason:'empty-value'};continue}
 let filled=setValue(c.element,wanted);let actual=readValue(c.element);
 if(type==='keywords'&&filled&&norm(actual)!==norm(wanted)&&Array.isArray(m.keywords)){fillTags(c.element,m.keywords);actual=readValue(c.element)||c.element.parentElement?.textContent||'';
  filled=true;out[type]={filled,verified:m.keywords.slice(0,3).every(k=>norm(c.element.closest('form,main,body')?.textContent).includes(norm(k))),score:c.score,actual:actual.slice(0,300)};continue}
 const ok=type==='category'?norm(actual).includes(norm(wanted))||norm(actual)===norm(wanted):norm(actual)===norm(wanted);
 out[type]={filled,verified:filled&&ok,score:c.score,actual:actual.slice(0,300)};}return out;}
// Dry run: no writes. A field passes if it is found, confident, and clearly beats the runner-up.
function verify(m,sel){const r=scan();const fields={};
 for(const type of pickedTypes(sel)){const list=r.fields[type]||[];const best=list[0],next=list[1];
  const ok=!!best&&best.score>=MIN_SCORE&&(!next||best.score>next.score);
  fields[type]={ok,reason:!best?'field-not-found':best.score<MIN_SCORE?'low-confidence-field':(next&&best.score===next.score)?'ambiguous-field':'ready',score:best?.score||0};}
 const verified=Object.keys(fields).length>0&&Object.values(fields).every(f=>f.ok);
 return {verified,fields,scan:r};}
chrome.runtime.onMessage.addListener((msg,_,send)=>{
 if(msg?.type==='STOCKPILOT_SCAN'){send(scan());return true}
 if(msg?.type==='STOCKPILOT_VERIFY_FILL'){send(verify(msg.metadata||{},msg.selected));return true}
 if(msg?.type==='STOCKPILOT_FILL'){const result=fill(msg.metadata||{},msg.selected);send({filled:result,allVerified:Object.values(result).every(x=>x.verified),scan:scan()});return true}});
