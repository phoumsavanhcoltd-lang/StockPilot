import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_KEY = process.env.GEMINI_API_KEY;

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 15 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { ok: true, configured: Boolean(API_KEY), model: MODEL });
  }
  if (req.method !== 'POST' || req.url !== '/analyze') return send(res, 404, { error: 'Not found' });
  if (!API_KEY) return send(res, 503, { error: 'GEMINI_API_KEY is not configured in backend/.env' });

  try {
    const input = JSON.parse(await readBody(req));
    if (!input.image?.data || !input.image?.mimeType) return send(res, 400, { error: 'image.data and image.mimeType are required' });

    const prompt = `You are StockPilot, an AI metadata assistant for stock contributors. Analyze the supplied image and return accurate, commercially useful metadata. Do not invent brands, people, locations, or facts that are not visually supported. Prefer concrete visual concepts over generic filler. Return 30-50 concise English keywords, most relevant first. Keep the title descriptive and natural, not keyword-stuffed. Return JSON only matching the requested schema.\n\nRequired output: title, description, keywords, category.`;
    const body = {
      contents: [{ role: 'user', parts: [
        { text: prompt },
        { inline_data: { mime_type: input.image.mimeType, data: input.image.data } }
      ]}],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            keywords: { type: 'ARRAY', items: { type: 'STRING' } },
            category: { type: 'STRING' }
          },
          required: ['title', 'description', 'keywords', 'category']
        }
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify(body)
    });
    const raw = await response.text();
    if (!response.ok) return send(res, 502, { error: `Gemini API error (${response.status})`, details: raw.slice(0, 2000) });

    const data = JSON.parse(raw);
    const text = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
    if (!text) return send(res, 502, { error: 'Gemini returned no text response' });
    const metadata = JSON.parse(text);
    if (!Array.isArray(metadata.keywords)) metadata.keywords = [];
    metadata.keywords = metadata.keywords.map(String).filter(Boolean).slice(0, 50);
    return send(res, 200, metadata);
  } catch (error) {
    return send(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`StockPilot AI backend listening on http://127.0.0.1:${PORT}`));

