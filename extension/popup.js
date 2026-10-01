const imageInput = document.querySelector('#image');
const analyzeButton = document.querySelector('#analyze');
const status = document.querySelector('#status');
const title = document.querySelector('#title');
const description = document.querySelector('#description');
const keywords = document.querySelector('#keywords');
const category = document.querySelector('#category');
const fillButton = document.querySelector('#fill');

function setStatus(message, error = false) {
  status.textContent = message;
  status.dataset.error = error ? 'true' : 'false';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error || new Error('Unable to read image'));
    reader.readAsDataURL(file);
  });
}

imageInput.addEventListener('change', () => {
  const selected = imageInput.files?.[0];
  analyzeButton.disabled = !selected;
  setStatus(selected ? `Ready: ${selected.name}` : 'Choose an image to begin.');
});

analyzeButton.addEventListener('click', async () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  analyzeButton.disabled = true;
  setStatus('Analyzing image with Gemini...');
  try {
    const data = await fileToBase64(file);
    const response = await fetch('http://127.0.0.1:8787/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: { mimeType: file.type, data } })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Backend error ${response.status}`);

    title.value = result.title || '';
    description.value = result.description || '';
    keywords.value = Array.isArray(result.keywords) ? result.keywords.join(', ') : (result.keywords || '');
    category.value = result.category || '';
    setStatus(`AI metadata generated: ${Array.isArray(result.keywords) ? result.keywords.length : 0} keywords. Review before filling.`);
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'AI analysis failed. Check the local backend.', true);
  } finally {
    analyzeButton.disabled = !imageInput.files?.[0];
  }
});

fillButton.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'STOCKPILOT_FILL',
      metadata: {
        title: title.value,
        description: description.value,
        keywords: keywords.value,
        category: category.value
      }
    });
    setStatus('Fill request sent. Review the Adobe Stock fields before submitting.');
  } catch (error) {
    setStatus('Open an Adobe Stock contributor page first, then try again.', true);
  }
});
