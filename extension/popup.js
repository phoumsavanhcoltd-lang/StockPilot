const $ = (id) => document.querySelector(`#${id}`);
const imageInput = $('image');
const analyzeButton = $('analyze');
const status = $('status');
const title = $('title');
const description = $('description');
const keywords = $('keywords');
const category = $('category');

imageInput.addEventListener('change', () => {
  const file = imageInput.files?.[0];
  analyzeButton.disabled = !file;
  status.textContent = file ? `Ready: ${file.name}` : 'Choose an image to begin.';
});

$('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

analyzeButton.addEventListener('click', async () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  analyzeButton.disabled = true;
  status.textContent = 'Analyzing image with Gemini...';
  try {
    const cfg = await chrome.storage.local.get({
      apiKey: '', model: 'gemini-2.5-flash', backend: 'http://127.0.0.1:8787'
    });
    if (!cfg.apiKey) throw new Error('Add your Gemini API key in Settings first.');
    const imageBase64 = await fileToBase64(file);
    const response = await fetch(`${cfg.backend}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gemini-api-key': cfg.apiKey },
      body: JSON.stringify({ imageBase64, mimeType: file.type, model: cfg.model })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'AI request failed.');
    const m = result.metadata;
    title.value = m.title || '';
    description.value = m.description || '';
    keywords.value = Array.isArray(m.keywords) ? m.keywords.join(', ') : (m.keywords || '');
    category.value = m.category || '';
    status.textContent = `Generated with ${result.model}. Review before filling.`;
  } catch (error) {
    status.textContent = error.message;
  } finally {
    analyzeButton.disabled = !imageInput.files?.[0];
  }
});

$('fill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, {
    type: 'STOCKPILOT_FILL',
    metadata: { title: title.value, description: description.value, keywords: keywords.value, category: category.value }
  });
  status.textContent = 'Fill request sent. Review the Adobe Stock fields before submitting.';
});
