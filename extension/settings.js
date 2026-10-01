const $ = id => document.getElementById(id);
const defaults = { provider: 'gemini', apiKey: '', model: 'gemini-2.5-flash', backend: 'http://127.0.0.1:8787' };
const models = { gemini: 'gemini-2.5-flash', openai: 'gpt-4.1-mini', claude: 'claude-sonnet-4-5' };

async function load() {
  const cfg = await chrome.storage.local.get(defaults);
  $('provider').value = cfg.provider;
  $('apiKey').value = cfg.apiKey;
  $('model').value = cfg.model || models[cfg.provider] || defaults.model;
  $('backend').value = cfg.backend;
  $('state').textContent = cfg.apiKey ? 'CONFIGURED' : 'NOT CONFIGURED';
}

$('provider').addEventListener('change', () => {
  const provider = $('provider').value;
  $('model').value = models[provider];
});

$('save').addEventListener('click', async () => {
  const cfg = {
    provider: $('provider').value,
    apiKey: $('apiKey').value.trim(),
    model: $('model').value.trim() || models[$('provider').value],
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
