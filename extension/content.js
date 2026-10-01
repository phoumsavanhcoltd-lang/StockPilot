function findField(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

function setValue(element, value) {
  if (!element) return false;
  const prototype = Object.getPrototypeOf(element);
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'STOCKPILOT_FILL') return;
  const metadata = message.metadata || {};
  const titleField = findField(['input[name="title"]', 'textarea[name="title"]', '[aria-label*="Title" i]']);
  const descriptionField = findField(['textarea[name="description"]', '[aria-label*="Description" i]']);
  const keywordField = findField(['textarea[name="keywords"]', '[aria-label*="Keywords" i]']);
  const categoryField = findField(['select[name="category"]', '[aria-label*="Category" i]']);

  const result = {
    title: setValue(titleField, metadata.title || ''),
    description: setValue(descriptionField, metadata.description || ''),
    keywords: setValue(keywordField, metadata.keywords || ''),
    category: setValue(categoryField, metadata.category || '')
  };
  console.info('StockPilot fill result', result);
});
