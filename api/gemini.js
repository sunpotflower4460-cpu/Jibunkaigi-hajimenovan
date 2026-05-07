const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_TEXT_LENGTH = 12000;

const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const readBody = async req => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Invalid JSON body');
    error.status = 400;
    error.code = 'INVALID_JSON';
    throw error;
  }
};

const toSafeText = value => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_TEXT_LENGTH);
};

const normalizeModel = value => {
  if (typeof value !== 'string') return DEFAULT_MODEL;
  const safe = value.trim();
  if (!safe || !/^[a-zA-Z0-9._-]+$/.test(safe)) return DEFAULT_MODEL;
  return safe;
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'POST only' });
    return;
  }

  const serverSecret = process.env.GEMINI_API_KEY;
  if (!serverSecret) {
    sendJson(res, 503, {
      ok: false,
      code: 'GEMINI_API_KEY_MISSING',
      message: 'Gemini API key is not configured on the server.',
    });
    return;
  }

  try {
    const body = await readBody(req);
    const prompt = toSafeText(body.prompt);
    const systemInstruction = toSafeText(body.systemInstruction);
    const model = normalizeModel(body.model);
    const jsonMode = Boolean(body.jsonMode);

    if (!prompt) {
      sendJson(res, 400, { ok: false, code: 'PROMPT_REQUIRED', message: 'prompt is required.' });
      return;
    }

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
      ...(jsonMode ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
    };

    const upstream = await fetch(`${GEMINI_ENDPOINT_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': serverSecret,
      },
      body: JSON.stringify(payload),
    });

    const upstreamText = await upstream.text();
    let upstreamJson = null;
    try {
      upstreamJson = upstreamText ? JSON.parse(upstreamText) : null;
    } catch {
      upstreamJson = null;
    }

    if (!upstream.ok) {
      sendJson(res, upstream.status >= 500 ? 502 : upstream.status, {
        ok: false,
        code: 'GEMINI_UPSTREAM_ERROR',
        message: 'Gemini API request failed.',
        status: upstream.status,
        details: upstreamJson?.error?.message || undefined,
      });
      return;
    }

    const text = (upstreamJson?.candidates?.[0]?.content?.parts || [])
      .map(part => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    if (!text) {
      sendJson(res, 502, { ok: false, code: 'GEMINI_EMPTY_RESPONSE', message: 'Gemini returned an empty response.' });
      return;
    }

    sendJson(res, 200, { ok: true, text, model });
  } catch (error) {
    sendJson(res, error.status || 500, {
      ok: false,
      code: error.code || 'GEMINI_API_ROUTE_ERROR',
      message: error.message || 'Gemini API route failed.',
    });
  }
}
