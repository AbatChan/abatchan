// POST /api/refresh — rebuild the crawler-visible snapshot on demand.
//
// Publishing work in the dashboard reaches visitors immediately, because the
// browser reads Supabase directly. It does not reach Google, because the
// server-rendered HTML is written at build time. Until something redeploys,
// the snapshot a crawler sees is the one from the last deploy.
//
// This lets the dashboard trigger that redeploy, so publishing a project is one
// action rather than "publish, then remember to redeploy".
//
// The secret here is a Vercel deploy hook URL, deliberately, because it is the
// least privileged thing that does the job: it can start a build of one branch
// and nothing else. A Vercel API token would work too and would also be able to
// read and delete every project on the account, so it is not used.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fdubcelrwfpzjjnqipku.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
  || 'sb_publishable_b_pSIsSTOHTrYj87LJrY1A_WDFm_dF6';

function fail(res, status, message) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json({ error: { message } });
}

// The dashboard is the only caller, so the caller must prove it holds a signed
// -in session. Supabase verifies its own token; this route never sees a
// password and cannot mint a session of its own.
async function signedIn(authorization) {
  const token = String(authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

// One build at a time. Vercel would queue duplicates happily, but a dashboard
// button invites double-clicks and each build costs minutes and money.
let lastFired = 0;
const COOLDOWN_MS = 60_000;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return fail(res, 405, 'Use POST.');
  }

  const user = await signedIn(req.headers.authorization);
  if (!user) return fail(res, 401, 'Sign in again, then retry.');

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) {
    return fail(res, 503, 'No deploy hook is configured yet. Add VERCEL_DEPLOY_HOOK_URL in Vercel and redeploy once.');
  }

  const since = Date.now() - lastFired;
  if (lastFired && since < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - since) / 1000);
    return fail(res, 429, `A rebuild just started. Try again in ${wait}s.`);
  }

  try {
    const upstream = await fetch(hook, { method: 'POST', signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('refresh hook rejected', upstream.status, detail.slice(0, 300));
      return fail(res, 502, 'Vercel refused the rebuild. Check the deploy hook URL.');
    }
    lastFired = Date.now();
    console.log('refresh triggered by', user.email || user.id);
    return res.status(202).json({
      started: true,
      message: 'Rebuild started. Google sees the new content once it finishes, usually a minute or two.'
    });
  } catch (err) {
    console.error('refresh failed', err);
    return fail(res, 502, 'Could not reach Vercel. Try again shortly.');
  }
}
