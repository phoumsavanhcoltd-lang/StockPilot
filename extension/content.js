const FIELD_HINTS={
 title:['title','caption'],
 description:['description','desc'],
 keywords:['keywords','keyword','tags'],
 category:['category','categories']
};
const norm=v=>String(v||'').replace(/\s+/g,' ').trim().toLowerCase();
const visible=e=>!!e&&(e.offsetWidth||e.offsetHeight||e.getClientRects().length)>0;
function context(e){
 const a=['aria-label','placeholder','name','data-testid','data-test','role'].map(x=>e.getAttribute(x)).filter(Boolean);
 if(e.id){const l=document.querySelector(`label[for="${CSS.escape(e.id)}"]`);if(l)a.push(l.textContent)}
 const p=e.closest('label,fieldset,[role="group"],section,form');if(p)a.push(p.textContent?.slice(0,240));
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
function scan(){const fields={};Object.keys(FIELD_HINTS).forEach(type=>{const cs=candidates(type);fields[type]=cs.slice(0,5).map(x=>({score:x.score,tag:x.element.tagName.toLowerCase(),id:x.element.id||'',name:x.element.getAttribute('name')||'',placeholder:x.element.getAttribute('placeholder')||'',context:x.context.slice(0,180)}));});
 const best=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v[0]||null]));const detected=Object.values(best).filter(Boolean).length;return {url:location.href,detected,total:4,ready:detected===4,fields,best};}
function setValue(e,value){if(!e)return false;if(e.isContentEditable)e.textContent=value;else{const p=Object.getPrototypeOf(e),s=Object.getOwnPropertyDescriptor(p,'value')?.set;s?s.call(e,value):e.value=value}e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:String(value)}));e.dispatchEvent(new Event('change',{bubbles:true}));e.dispatchEvent(new Event('blur',{bubbles:true}));return true;}
function fill(m,selected){const s=selected||{};const out={};for(const type of Object.keys(FIELD_HINTS)){if(!s[type]){out[type]=false;continue}const e=candidates(type)[0]?.element;out[type]=setValue(e,type==='keywords'?Array.isArray(m.keywords)?m.keywords.join(', '):m.keywords:m[type]||'')}return out;}
chrome.runtime.onMessage.addListener((msg,_,send)=>{if(msg?.type==='STOCKPILOT_SCAN'){send(scan());return true}if(msg?.type==='STOCKPILOT_VERIFY_FILL'){const r=scan();const ok=r.ready&&Object.values(msg.selected||{}).every(Boolean);send({verified:ok,scan:r});return true}if(msg?.type==='STOCKPILOT_FILL'){send({filled:fill(msg.metadata,msg.selected),scan:scan()});return true}});