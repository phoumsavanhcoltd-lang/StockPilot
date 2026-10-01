import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = Number(process.env.PORT || 8787);

app.use(cors({ origin: true }));
app.use(express.json({ limit: '15mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'stockpilot-backend', version: '0.2.0' });
});

app.post('/analyze', async (req, res) => {
  const apiKey = String(req.header('x-gemini-api-key') || '').trim();
  const { imageBase64, mimeType, model = 'gemini-2.5-flash' } = req.body || {};

  if (!apiKey) return res.status(400).json({ error: 'Gemini API key is required.' });
  if (!imageBase64 || !mimeType?.startsWith('image/')) {
    return res.status(400).json({ error: 'A valid image is required.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are StockPilot, an expert stock-content metadata assistant.
Analyze the supplied image for Adobe Stock submission.
Return ONLY valid JSON with this schema:
{
  "title": "clear commercial title, concise, no hype",
  "description": "accurate one-sentence description",
  "keywords": ["30 to 50 relevant keywords, most important first"],
  "category": "best matching Adobe Stock category"
}
Rules: describe only visible content; do not invent people, brands, locations, events, or concepts that are not supported by the image. Avoid duplicate keywords and keyword stuffing.`;

    const response = await ai.models.generateContent({
      model,
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } }
        ]
      }],
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text?.trim();
    if (!text) throw new Error('Gemini returned an empty response.');
    const metadata = JSON.parse(text);
    res.json({ ok: true, metadata, model });
  } catch (error) {
    const message = error?.message || 'AI analysis failed.';
    res.status(502).json({ error: message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`StockPilot backend listening on http://127.0.0.1:${PORT}`);
});
