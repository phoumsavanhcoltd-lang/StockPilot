# StockPilot v0.4.0

## Step 1 — Local AI engine

StockPilot now uses a local Node.js backend to keep the Gemini API key out of the browser extension.

### Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Put your Gemini API key in `GEMINI_API_KEY`.
3. Start the backend:

```powershell
cd backend
node server.js
```

4. Open Chrome/Edge → Extensions → Developer mode → Load unpacked → select `extension/`.
5. Open an Adobe Stock contributor page, open StockPilot, select an image, and click **Analyze image**.

The extension sends the image to `http://127.0.0.1:8787/analyze`. The backend calls Gemini and returns structured metadata: title, description, keywords, and category.

## Security

- Never commit `backend/.env`.
- The extension never contains the Gemini API key.
- StockPilot only fills fields; it does not auto-submit assets.

Gemini's `generateContent` API supports image input and structured JSON output, which is used by this milestone.
