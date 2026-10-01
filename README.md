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

## Database (SQLite)

The backend stores every analysis in a local SQLite file (`backend/data/stockpilot.db`, override with `DB_PATH`) using Node's built-in `node:sqlite` (Node 22.13+; no extra dependency). Images and API keys are never stored.

| Endpoint | Purpose |
|---|---|
| `GET /history?limit=&offset=` | List recent analyses |
| `GET /history/:id` | Get one |
| `PATCH /history/:id` | Save edited title/description/keywords/category (`filled: true` marks it as filled) |
| `DELETE /history/:id` | Delete |

The popup has a **History** dropdown to reload earlier results; edits and fills are saved automatically.
