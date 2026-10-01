const imageInput = document.querySelector('#image');
const analyzeButton = document.querySelector('#analyze');
const status = document.querySelector('#status');
const title = document.querySelector('#title');
const description = document.querySelector('#description');
const keywords = document.querySelector('#keywords');
const category = document.querySelector('#category');
const fillButton = document.querySelector('#fill');

imageInput.addEventListener('change', () => {
  const selected = imageInput.files?.[0];
  analyzeButton.disabled = !selected;
  status.textContent = selected ? `Ready: ${selected.name}` : 'Choose an image to begin.';
});

analyzeButton.addEventListener('click', async () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  status.textContent = 'Demo analyzer running...';
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  title.value = base ? `${base.charAt(0).toUpperCase()}${base.slice(1)}` : 'Stock image';
  description.value = 'AI-generated metadata placeholder. Connect a multimodal provider in the backend to analyze the image.';
  keywords.value = base ? `${base}, stock, background, commercial, creative, image` : 'stock, commercial, creative, image';
  category.value = 'Technology';
  status.textContent = 'Generated demo metadata. Review before filling.';
});

fillButton.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, {
    type: 'STOCKPILOT_FILL',
    metadata: {
      title: title.value,
      description: description.value,
      keywords: keywords.value,
      category: category.value
    }
  });
  status.textContent = 'Fill request sent to the active Adobe Stock page.';
});
