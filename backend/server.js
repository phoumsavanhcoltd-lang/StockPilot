import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { qualityCheck } from './metadata-engine.js';

const app = express();
const PORT = Number(process.env.PORT || 8787);
app.use(cors({ origin: true }));
app.use(express.json({ limit: '15mb' }));

app.get('/health', (_req, res) => res.json({
  ok: true,
  service: 'stockpilot-backend',
  version: '0.4.0'
}));

const SYSTEM_PROMPT = `You are StockPilot, an expert stock-content metadata assistant.
Analyze the supplied image for commercial stock submission.
Return ONLY JSON: {"title":"string","description":"string","keywords":["30-50 strings"],"category":"string"}.
Describe only visible content. Never invent people, brands, locations, events or concepts.
Put the strongest, most specific keywords first. Avoid duplicates, vague filler and keyword stuffing.
Use natural commercial English suitable for stock metadata.`;

async function analyzeGemini({ apiKey, model, imageBase64, mimeType }) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: model || 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [
      { text: SYSTEM_PROMPT },
      { inlineData: { mimeType, data: imageBase64 } }
    ] }],
    config: { responseMimeType: 'application/json' }
  });
  return JSON.parse(response.text?.trim() || '{}');
}
async function analyzeOpenAI({ apiKey, model, imageBase64, mimeType }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: [
        { type: 'text', text: 'Analyze this image.' },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
      ] }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'OpenAI request failed.');
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

async function analyzeClaude({ apiKey, model, imageBase64, mimeType }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-5', max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
        { type: 'text', text: 'Analyze this image and return only the requested JSON.' }
      ] }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Claude request failed.');
  const text = data.content?.find(x => x.type === 'text')?.text || '{}';
  return JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim());
}
app.post('/analyze', async (req, res) => {
  const { provider = 'gemini', apiKey, imageBase64, mimeType, model } = req.body || {};
  if (!apiKey) return res.status(400).json({ error: 'API key is required.' });
  if (!imageBase64 || !mimeType?.startsWith('image/')) {
    return res.status(400).json({ error: 'A valid image is required.' });
  }

  try {
    let raw;
    if (provider === 'openai') {
      raw = await analyzeOpenAI({ apiKey, model, imageBase64, mimeType });
    } else if (provider === 'claude') {
      raw = await analyzeClaude({ apiKey, model, imageBase64, mimeType });
    } else {
      raw = await analyzeGemini({ apiKey, model, imageBase64, mimeType });
    }

    const metadata = qualityCheck(raw);
    res.json({ ok: true, provider, model, metadata });
  } catch (error) {
    res.status(502).json({ error: error?.message || 'AI analysis failed.' });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`StockPilot backend listening on http://127.0.0.1:${PORT}`);
});
