(() => {
  const TYPES = {
    title: ['title', 'caption'],
    description: ['description'],
    keywords: ['keywords', 'keyword', 'tags'],
    category: ['category', 'categories']
  };
  const norm = v => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const visible = el => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  function context(el) {
    const bits = ['aria-label','placeholder','name','data-testid','data-test','role']
      .map(a => el.getAttribute(a)).filter(Boolean);
    const id = el.id;
    if (id) {
      const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (label) bits.push(label.textContent);
    }
    const parent = el.closest('label,[role="group"],fieldset,section,form,div');
    if (parent) bits.push(parent.textContent?.slice(0, 300));
    return norm(bits.join(' '));
  }

  function score(el, type) {
    if (!visible(el) || el.disabled || el.readOnly) return -1;
    const text = context(el);
    let value = 0;
    TYPES[type].forEach(token => { if (text.includes(token)) value += token === type ? 12 : 5; });
    if (type === 'title' && el.matches('input')) value += 2;
    if (type === 'description' && el.matches('textarea,[contenteditable="true"]')) value += 4;
    if (type === 'keywords' && el.matches('textarea,[contenteditable="true"],[role="textbox"]')) value += 4;
    if (type === 'category' && el.matches('select,[role="combobox"]')) value += 5;
    return value;
  }

  function find(type) {
    const els = [...document.querySelectorAll('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="combobox"]')];
    return els.map(el => ({el, score: score(el,type)})).filter(x => x.score > 0).sort((a,b) => b.score-a.score)[0] || null;
  }

  function scan() {
    const fields = {};
    Object.keys(TYPES).forEach(type => {
      const x = find(type);
      fields[type] = x ? {found:true, score:x.score, tag:x.el.tagName.toLowerCase(), id:x.el.id || '', name:x.el.getAttribute('name') || '', placeholder:x.el.getAttribute('placeholder') || ''} : {found:false,score:0};
    });
    const detected = Object.values(fields).filter(x => x.found).length;
    return {page:location.href,title:document.title,detected,total:4,ready:detected >= 3,fields};
  }

  function setValue(el, value) {
    if (!el) return false;
    if (el.isContentEditable) el.textContent = value;
    else {
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value); else el.value = value;
    }
    el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:String(value)}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    el.dispatchEvent(new Event('blur',{bubbles:true}));
    return true;
  }

  function setCategory(el, value) {
    if (!el || !value) return false;
    if (el.tagName === 'SELECT') {
      const wanted = norm(value);
      const option = [...el.options].find(o => norm(o.textContent) === wanted || norm(o.value) === wanted);
      if (option) { el.value = option.value; el.dispatchEvent(new Event('change',{bubbles:true})); return true; }
    }
    return setValue(el,value);
  }

  function fill(m) {
    const title=find('title')?.el, description=find('description')?.el, keywords=find('keywords')?.el, category=find('category')?.el;
    return {
      title:setValue(title,m.title || ''), description:setValue(description,m.description || ''),
      keywords:setValue(keywords,Array.isArray(m.keywords) ? m.keywords.join(', ') : String(m.keywords || '')),
      category:setCategory(category,m.category), detected:{title:!!title,description:!!description,keywords:!!keywords,category:!!category}
    };
  }

  chrome.runtime.onMessage.addListener((message,sender,sendResponse) => {
    if (message?.type === 'STOCKPILOT_SCAN') { sendResponse(scan()); return true; }
    if (message?.type === 'STOCKPILOT_FILL') { sendResponse(fill(message.metadata || {})); return true; }
  });
})();