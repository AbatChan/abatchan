import { abatchan } from '../lib/tenants/abatchan.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fdubcelrwfpzjjnqipku.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_b_pSIsSTOHTrYj87LJrY1A_WDFm_dF6';
const API_URL = 'https://api.deepseek.com/chat/completions';
const GENERATION_ATTEMPTS = 2;

const fail = (res, status, message) => res.status(status).json({ error: { message } });
const clean = (value, limit) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit) : '';

async function signedIn(authorization) {
  const token = String(authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

function model(value) {
  return value === 'deepseek-v4-pro' || value === 'deepseek-v4-flash' ? value : 'deepseek-v4-flash';
}

function sourceContent() {
  return `${abatchan.factsText || ''}\n\n${abatchan.commercialText || ''}`.slice(0, 26000);
}

async function completion(messages, selectedModel, json = false) {
  const key = process.env.DEEPSEEK_API_KEY || '';
  if (!key) throw Object.assign(new Error('DEEPSEEK_API_KEY is not configured in Vercel.'), { status: 503 });
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model(selectedModel), messages, temperature: json ? 0.85 : 0.5, max_tokens: json ? 900 : 700, ...(json ? { response_format: { type: 'json_object' } } : {}) })
    });
  } catch {
    throw Object.assign(new Error('The AI provider could not be reached.'), { status: 502 });
  }
  if (!response.ok) throw Object.assign(new Error('The AI provider rejected the request. Check the Vercel key and selected model.'), { status: 502 });
  let data;
  try { data = await response.json(); }
  catch { throw Object.assign(new Error('The AI provider returned an invalid response.'), { status: 502 }); }
  const output = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? data?.output_text ?? '';
  if (typeof output !== 'string' || !output.trim()) throw Object.assign(new Error('The selected model returned an empty response.'), { status: 502 });
  return output.trim().replace(/^```(?:json)?\s*|\s*```$/gi, '');
}

function jsonObject(value) {
  const source = String(value || '').trim().replace(/^```(?:json)?\s*|\s*```$/gi, '');
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(source.slice(start, end + 1)); }
  catch { return null; }
}

function suggestionsFrom(value) {
  const parsed = jsonObject(value);
  const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions.slice(0, 3).map(item => ({
    label: clean(item?.label, 90),
    description: clean(item?.description, 120)
  })).filter(item => item.label && item.description) : [];
  return suggestions.length === 3 ? suggestions : null;
}

async function retryGeneration(generate, fallbackMessage) {
  let lastError;
  for (let attempt = 0; attempt < GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const value = await generate(attempt);
      if (value) return value;
      lastError = Object.assign(new Error(fallbackMessage), { status: 502 });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || Object.assign(new Error(fallbackMessage), { status: 502 });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'Use POST.');
  }
  if (!(await signedIn(req.headers.authorization))) return fail(res, 401, 'Sign in again, then retry.');
  const kind = clean(req.body?.kind, 20);
  const selectedModel = clean(req.body?.model, 80);
  const mode = clean(req.body?.mode, 20) === 'refine' ? 'refine' : 'fresh';
  const currentDraft = clean(req.body?.currentDraft, 4000);
  const currentSuggestions = Array.isArray(req.body?.currentSuggestions)
    ? req.body.currentSuggestions.slice(0, 3).map(item => ({
      label: clean(item?.label, 90),
      description: clean(item?.description, 120)
    })).filter(item => item.label || item.description)
    : [];
  const content = sourceContent();
  try {
    if (kind === 'instructions') {
      const refine = mode === 'refine' && currentDraft;
      const task = refine
        ? `Improve the existing website-assistant instructions below. Preserve its useful user-written preferences and boundaries, correct any outdated facts using the official content, remove repetition, and return one complete replacement draft.\n\nEXISTING INSTRUCTIONS:\n${currentDraft}`
        : 'Draft new website-assistant instructions from the official content.';
      const prompt = `${task}\n\nCover what Abatchan does, who it serves, the tone to use, important facts, pricing boundaries, and when to defer to Abat. Do not invent facts. No markdown, headings, or bullets. Stay under 220 words.\n\nOFFICIAL CONTENT:\n${content}`;
      const instructions = await retryGeneration(async attempt => {
        const retry = attempt ? '\n\nYour previous response was empty or unusable. Return the complete plain-prose draft now.' : '';
        return clean(await completion([
          { role: 'system', content: 'Write factual configuration notes for the Abatchan website assistant. Return plain prose only.' },
          { role: 'user', content: prompt + retry }
        ], selectedModel), 4000) || null;
      }, 'The model did not return usable instructions. Try again.');
      return res.status(200).json({ instructions });
    }
    if (kind === 'suggestions') {
      // One angle across all three made every card cover the same ground, and a
      // quarter of the time that ground was a single product. These three cards
      // are a visitor's first impression of the whole site, so each one takes a
      // different angle and the order is shuffled for variety between runs.
      const angles = ['the services offered and who they suit', 'how a project runs and the published work', 'the Nika product, its plans and setup', 'practical buying questions such as cost, timelines and getting started'];
      const chosen = angles.slice().sort(() => Math.random() - 0.5).slice(0, 3);
      const brief = chosen.map((item, index) => `${index + 1}. ${item}`).join('\n');
      const refine = mode === 'refine' && currentSuggestions.length;
      const existing = refine
        ? `\n\nImprove the existing suggestions below. Preserve useful subjects and visitor intent, but correct outdated facts and make all three distinct.\nEXISTING SUGGESTIONS:\n${JSON.stringify(currentSuggestions)}`
        : '';
      const prompt = `Create exactly three distinct starter questions for the Abatchan website using only the official content below. Each question must cover a different subject, in this order:\n${brief}${existing}\n\nNo two questions may be about the same product or page. Each item must have a complete visitor question in "label" (70 characters maximum) and useful supporting text in "description" (95 characters maximum). Avoid filler, repeated ideas, hype, or invented facts. Return JSON only: {"suggestions":[{"label":"...","description":"..."}]}.\n\nOFFICIAL CONTENT:\n${content}`;
      const suggestions = await retryGeneration(async attempt => {
        const retry = attempt ? '\n\nThe previous response was invalid. Return only the required JSON object with exactly three complete items.' : '';
        const raw = await completion([
          { role: 'system', content: 'Write concise, factual website starter questions. Return valid JSON only.' },
          { role: 'user', content: prompt + retry }
        ], selectedModel, true);
        return suggestionsFrom(raw);
      }, 'The model did not return three usable suggestions. Try again.');
      return res.status(200).json({ suggestions });
    }
    return fail(res, 400, 'Choose suggestions or instructions.');
  } catch (error) {
    return fail(res, error.status || 500, error.message || 'The draft could not be generated.');
  }
}
