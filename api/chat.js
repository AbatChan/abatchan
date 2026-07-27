// POST /api/chat  —  assistant proxy.
//
// The whole point of this file is that DEEPSEEK_API_KEY never reaches the
// browser. Set it in Vercel: Project -> Settings -> Environment Variables.
// Swapping providers is the two constants below plus the body shape.
//
// Optional: SUPABASE_URL + SUPABASE_SERVICE_KEY lets the system prompt be
// edited from the dashboard. Without them it falls back to FALLBACK_SYSTEM.

const API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

const FALLBACK_SYSTEM =
  'You are the assistant on abatchan.com, a digital engineering studio. ' +
  'Answer briefly and concretely about services, pricing and process. ' +
  'Websites start at $750, platforms at $1,500, connected systems at $3,500 — ' +
  'always say these are starting points, not quotes. Never invent a firm quote ' +
  'or a delivery date. If you do not know, say so and point to the contact page.';

// crude per-IP limiter. Serverless instances are not shared, so this trims
// obvious abuse rather than guaranteeing a global ceiling.
const hits = new Map();
const RATE = { max: 20, windowMs: 10 * 60 * 1000 };

function allowed(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) {
    hits.set(ip, { n: 1, reset: now + RATE.windowMs });
    return true;
  }
  if (rec.n >= RATE.max) return false;
  rec.n++;
  return true;
}

async function systemPrompt() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return FALLBACK_SYSTEM;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/settings?key=eq.assistant.system&select=value`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const rows = await res.json();
    return (Array.isArray(rows) && rows[0]?.value) || FALLBACK_SYSTEM;
  } catch {
    return FALLBACK_SYSTEM;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!allowed(ip)) {
    return res.status(429).json({ reply: 'That is a lot of questions at once. Try again in a few minutes, or email abatchan4@gmail.com.' });
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(200).json({
      reply: "I'm not connected to a model yet, so that one needs a human. Email abatchan4@gmail.com and you'll get a reply within a working day."
    });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const message = String(body.message || '').slice(0, 1000).trim();
  if (!message) return res.status(400).json({ error: 'message required' });

  // last few turns only — keeps the cached prefix stable, which is where
  // DeepSeek's ~98% cache discount comes from
  const history = Array.isArray(body.history)
    ? body.history.slice(-6).filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
        .map(m => ({ role: m.role, content: String(m.content).slice(0, 1000) }))
    : [];

  try {
    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        temperature: 0.3,
        messages: [
          { role: 'system', content: await systemPrompt() },
          ...history,
          { role: 'user', content: message }
        ]
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('assistant upstream error', upstream.status, detail.slice(0, 400));
      return res.status(200).json({ reply: "Something went wrong reaching the model. Email abatchan4@gmail.com and I'll answer directly." });
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    return res.status(200).json({
      reply: reply || "I did not get that. Try rephrasing, or email abatchan4@gmail.com."
    });
  } catch (err) {
    console.error('assistant failed', err);
    return res.status(200).json({ reply: "Something went wrong reaching the model. Email abatchan4@gmail.com and I'll answer directly." });
  }
}
