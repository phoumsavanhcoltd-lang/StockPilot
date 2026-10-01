# StockPilot

StockPilot is a Manifest V3 Chrome/Edge extension for assisted stock metadata workflows.

## MVP v0.1

- Popup UI
- Image selection
- Metadata editor
- Demo metadata generation
- Adobe Stock page fill bridge
- No automatic submission

## Install locally

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the `extension` folder.
5. Open the extension popup.

## Architecture

`popup.js` handles the UI and metadata state. `content.js` runs on supported Adobe Stock contributor pages and receives fill requests from the popup.

The current analyzer is intentionally a local demo placeholder. The next milestone adds a secure backend/API layer for multimodal AI generation.

## Security

Never commit API keys, access tokens, cookies, or contributor credentials. API secrets must stay outside the browser extension.
