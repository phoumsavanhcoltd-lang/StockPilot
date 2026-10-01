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
function fill(m){const out={};for(const type of Object.keys(FIELD_HINTS)){const c=candidates(type)[0];if(!c){out[type]={filled:false,verified:false,reason:'field-not-found'};continue}const wanted=expected(type,m);const filled=setValue(c.element,wanted);const actual=readValue(c.element);out[type]={filled,verified:filled&&norm(actual)===norm(wanted),score:c.score,actual:actual.slice(0,300)};}return out;}
function verify(m){const r=scan();const thresholds={title:10,description:10,keywords:10,category:10};const eligible=Object.entries(r.best).every(([k,v])=>v&&v.score>=thresholds[k]);return {verified:eligible,reason:eligible?'ready':'low-confidence-field',scan:r};}
chrome.runtime.onMessage.addListener((msg,_,send)=>{if(msg?.type==='STOCKPILOT_SCAN'){send(scan());return true}if(msg?.type==='STOCKPILOT_VERIFY_FILL'){send(verify(msg.metadata||{}));return true}if(msg?.type==='STOCKPILOT_FILL'){const result=fill(msg.metadata||{});send({filled:result,allVerified:Object.values(result).every(x=>x.verified),scan:scan()});return true}});
