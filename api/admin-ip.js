// GET /api/admin-ip — show a signed-in dashboard user the public IP address
// Vercel sees for this connection. The endpoint never returns the private
// exemption list and never changes settings; the dashboard decides whether to
// prepare the returned address for saving.

import { isIP } from 'node:net';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fdubcelrwfpzjjnqipku.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
  || 'sb_publishable_b_pSIsSTOHTrYj87LJrY1A_WDFm_dF6';

const fail = (res, status, message) => res.status(status).json({ error: { message } });

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

function requestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const candidate = forwarded || String(req.headers['x-real-ip'] || '').trim() || String(req.socket?.remoteAddress || '').trim();
  const normalized = candidate.startsWith('::ffff:') ? candidate.slice(7) : candidate;
  return isIP(normalized) ? normalized : '';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return fail(res, 405, 'Use GET.');
  }
  if (!(await signedIn(req.headers.authorization))) return fail(res, 401, 'Sign in again, then retry.');
  const ip = requestIp(req);
  if (!ip) return fail(res, 400, 'This connection did not provide a valid public IP address.');
  return res.status(200).json({ ip });
}

export { requestIp };
