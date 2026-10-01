const $ = (id) => document.getElementById(id);
const defaults = { provider: 'gemini', apiKey: '', model: 'gemini-2.5-flash', backend: 'http://127.0.0.1:8787' };

async function load() {
  const cfg = await chrome.storage.local.get(defaults);
  $('provider').value = cfg.provider;
  $('apiKey').value = cfg.apiKey;
  $('model').value = cfg.model;
  $('backend').value = cfg.backend;
  $('state').textContent = cfg.apiKey ? 'CONFIGURED' : 'NOT CONFIGURED';
}

$('save').addEventListener('click', async () => {
  const cfg = {
    provider: $('provider').value,
    apiKey: $('apiKey').value.trim(),
    model: $('model').value.trim() || defaults.model,
    backend: $('backend').value.trim().replace(/\/$/, '') || defaults.backend
  };
  await chrome.storage.local.set(cfg);
  $('state').textContent = cfg.apiKey ? 'CONFIGURED' : 'NOT CONFIGURED';
  $('message').textContent = 'Settings saved locally.';
});

$('test').addEventListener('click', async () => {
  const backend = $('backend').value.trim().replace(/\/$/, '');
  $('message').textContent = 'Testing local backend...';
  try {
    const response = await fetch(`${backend}/health`);
    const data = await response.json();
    $('message').textContent = data.ok ? `Backend OK — ${data.version}` : 'Backend returned an error.';
  } catch (error) {
    $('message').textContent = `Cannot reach backend: ${error.message}`;
  }
});

load();
