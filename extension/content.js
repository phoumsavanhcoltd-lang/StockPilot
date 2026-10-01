(() => {
  const ALIASES = {
    title: ['title', 'caption'],
    description: ['description'],
    keywords: ['keywords', 'keyword'],
    category: ['category', 'categories']
  };
  const norm = (v) => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const visible = (e) => e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);

  function context(e) {
    const parts = [e.getAttribute('aria-label'), e.getAttribute('placeholder'), e.getAttribute('name')];
    const id = e.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (label) parts.push(label.textContent);
    }
    const group = e.closest('label, fieldset, [role="group"]');
    if (group) parts.push(group.textContent.slice(0, 250));
    return norm(parts.filter(Boolean).join(' '));
  }

  function findField(type) {
    const nodes = [...document.querySelectorAll('input, textarea, select, [contenteditable="true"], [role="textbox"]')];
    return nodes.map((el) => {
      if (!visible(el) || el.disabled || el.readOnly) return { el, score: -1 };
      const text = context(el);
      let score = 0;
      for (const word of ALIASES[type]) if (text.includes(word)) score += word === type ? 10 : 4;
      if (type === 'title' && el.tagName === 'INPUT') score += 2;
      if (type === 'description' && el.tagName === 'TEXTAREA') score += 4;
      if (type === 'keywords' && el.getAttribute('role') === 'textbox') score += 4;
      if (type === 'category' && el.tagName === 'SELECT') score += 6;
      return { el, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)[0]?.el || null;
  }

  function setValue(el, value) {
    if (!el) return false;
    if (el.isContentEditable) el.textContent = value;
    else {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
      if (setter) setter.call(el, value); else el.value = value;
    }
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: String(value) }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function setCategory(el, value) {
    if (!el || !value) return false;
    if (el.tagName === 'SELECT') {
      const wanted = norm(value);
      const option = [...el.options].find((o) => norm(o.textContent) === wanted || norm(o.value) === wanted);
      if (option) { el.value = option.value; el.dispatchEvent(new Event('change', { bubbles: true })); return true; }
    }
    return setValue(el, value);
  }

  function fill(metadata) {
    const fields = {
      title: findField('title'),
      description: findField('description'),
      keywords: findField('keywords'),
      category: findField('category')
    };
    return {
      title: setValue(fields.title, metadata.title || ''),
      description: setValue(fields.description, metadata.description || ''),
      keywords: setValue(fields.keywords, Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : (metadata.keywords || '')),
      category: setCategory(fields.category, metadata.category || ''),
      detected: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, !!v]))
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'STOCKPILOT_FILL') return;
    const result = fill(message.metadata || {});
    console.info('StockPilot smart autofill', result);
    sendResponse(result);
  });
})();
