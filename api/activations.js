// POST /api/activations
//
// The sites a licence is running on, and the way to free one.
//
// A customer who moves a site, or finishes with a client, has until now had no
// way to release that activation except by writing to us. That is a support
// ticket for something they should simply be able to do, and at fifty sites it
// is the difference between a licence you manage and a number you hope about.
//
// The key is the credential. There is no account to create, because there is
// nothing here that a licence key does not already prove ownership of: it is
// checked with Lemon Squeezy on every request before a single row is read, and
// the tail used to find those rows is derived from a key that has just been
// validated rather than from anything the caller supplies.
//
// Available to every package on purpose. Seeing which of your own sites are
// using your own licence, and releasing one, is not a premium feature; refusing
// it only produces mail. What Agency buys is fifty activations rather than two,
// and the rest of its package.

import { clean, identify, lemon, serviceHeaders, SUPABASE_URL } from '../lib/licence/verify.js';

const PREFIX = 'nika.activation.';

async function rowsFor(keyTail) {
  const headers = serviceHeaders();
  if (!headers) return [];
  const url = `${SUPABASE_URL}/rest/v1/settings?key=like.${encodeURIComponent(`${PREFIX}${keyTail}.%`)}&select=key,value`;
  const response = await fetch(url, { headers });
  if (!response.ok) return [];
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

async function forget(key) {
  const headers = serviceHeaders();
  if (!headers) return false;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.${encodeURIComponent(key)}`, { method: 'DELETE', headers });
  return response.ok;
}

// The shape a page can render: host, when it was last seen, and the instance id
// it would need to release it. Nothing else, and never the key.
const present = rows => rows
  .map(row => ({
    id: String(row.key || ''),
    host: String(row.value?.host || ''),
    instanceId: String(row.value?.instanceId || ''),
    seenAt: String(row.value?.seenAt || '')
  }))
  .filter(row => row.host)
  .sort((a, b) => String(b.seenAt).localeCompare(String(a.seenAt)));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const key = clean(body.key, 120);
  const action = clean(body.action, 16) || 'list';
  if (!key) return res.status(400).json({ error: 'Enter your licence key.' });
  if (!['list', 'deactivate'].includes(action)) return res.status(400).json({ error: 'Unknown action.' });

  let checked;
  try {
    checked = await identify(key, '');
  } catch {
    // Unreachable is our problem. Say so rather than implying the key is wrong.
    return res.status(503).json({ error: 'The licence service could not be reached. Nothing has changed; please try again shortly.' });
  }
  if (!checked.valid) return res.status(403).json({ error: checked.message || 'That licence key is not valid.' });

  const keyTail = key.slice(-8);
  const entitlement = checked.entitlement;

  if (action === 'deactivate') {
    const instanceId = clean(body.instanceId, 120);
    const rowKey = clean(body.id, 200);
    // The row has to belong to this key. Without this a valid customer could
    // pass any row id and release somebody else's site.
    if (!rowKey.startsWith(`${PREFIX}${keyTail}.`)) return res.status(403).json({ error: 'That site is not on this licence.' });
    if (instanceId) {
      // Lemon Squeezy owns the count, so it has to hear about this first. A
      // failure there must not leave our list saying the slot is free when it
      // is not.
      const result = await lemon('deactivate', { license_key: key, instance_id: instanceId }).catch(() => null);
      if (!result?.deactivated) return res.status(502).json({ error: 'That site could not be released. Nothing has changed; please try again shortly.' });
    }
    await forget(rowKey);
  }

  const rows = present(await rowsFor(keyTail));
  return res.status(200).json({
    ok: true,
    tier: entitlement.tier,
    sitesAllowed: entitlement.sitesAllowed,
    // What Lemon Squeezy counts, which is the number that decides an overage,
    // beside what we have a record of. They can differ, and saying so is more
    // use than quietly showing one of them.
    sitesUsed: entitlement.sitesUsed,
    updatesUntil: entitlement.updatesUntil,
    sites: rows
  });
}
