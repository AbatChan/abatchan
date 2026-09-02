// POST /api/licence
//
// The one place that turns a licence key into an entitlement for a site that
// wants to know its own standing. Lemon Squeezy is the merchant of record and
// owns the key itself; this endpoint asks it the question, records what is
// Nika-specific (which sites a key is running on), and answers in terms the
// plugin and the Universal server both understand.
//
// The vocabulary it answers in lives in lib/licence/verify.js, because
// /api/download has to reach the same verdict about the same key and the two
// must not be able to drift apart.
//
// Three rules shape every branch below, and they are commitments made to
// customers on the pricing page rather than preferences:
//
//   1. A failure here never disables Nika. If Lemon Squeezy is unreachable, or
//      this endpoint is broken, the caller is told to carry on unchanged.
//   2. Being over the site count never disables Nika either. It is reported so
//      the owner can see it, and that is all.
//   3. Development and staging installs never consume an activation.

import { SUPABASE_URL, clean, entitlementFrom, lemon, serviceHeaders, siteKind, tierFrom } from '../lib/licence/verify.js';

// Activation records are the only Nika-specific part. Lemon Squeezy knows the
// key; it does not know which of a customer's sites is which, and the owner
// dashboard needs that. Stored in the existing settings table so this ships
// without a schema migration standing in front of it.
async function recordActivation(keyTail, host, instanceId, tier) {
  const headers = serviceHeaders();
  if (!headers) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{
        key: `nika.activation.${keyTail}.${Buffer.from(host).toString('base64url').slice(0, 40)}`,
        value: { host, instanceId: instanceId || null, tier, seenAt: new Date().toISOString() },
        is_public: false
      }])
    });
  } catch { /* the licence answer matters; the record is bookkeeping */ }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const action = clean(body.action, 16) || 'validate';
  const key = clean(body.key, 120);
  const host = clean(body.site, 200);
  const instanceId = clean(body.instanceId, 120);

  if (!key) return res.status(400).json({ error: 'A licence key is required.' });
  if (!['validate', 'activate', 'deactivate'].includes(action)) {
    return res.status(400).json({ error: 'Unknown action.' });
  }

  const kind = siteKind(host);
  // Never log or echo the key itself; the tail is enough to group activations.
  const keyTail = key.slice(-8);

  try {
    if (action === 'deactivate') {
      const checked = await lemon('validate', { license_key: key, instance_id: instanceId });
      const known = tierFrom(checked.meta);
      if (!Boolean(checked.valid) || !known) {
        return res.status(200).json({
          ok: false,
          valid: false,
          overLimit: false,
          instanceId: instanceId || null,
          entitlement: entitlementFrom(checked, host, known),
          message: known ? (checked.error || null) : 'This licence key was not issued for Nika.'
        });
      }
      const data = await lemon('deactivate', { license_key: key, instance_id: instanceId });
      return res.status(200).json({ ok: Boolean(data.deactivated), error: data.error || null });
    }

    // Validate before activation. This keeps an unrelated Lemon Squeezy key
    // from consuming an activation before we learn which product issued it.
    const checked = await lemon('validate', key && instanceId ? { license_key: key, instance_id: instanceId } : { license_key: key });
    const known = tierFrom(checked.meta);
    const checkedValid = Boolean(checked.valid);

    if (!checkedValid || !known) {
      return res.status(200).json({
        ok: false,
        valid: false,
        overLimit: false,
        instanceId: instanceId || null,
        entitlement: entitlementFrom(checked, host, known),
        message: known ? (checked.error || null) : 'This licence key was not issued for Nika.'
      });
    }

    // A development install stops after validation so it never consumes one
    // of the customer's production activations.
    const shouldActivate = action === 'activate' && kind === 'production';
    const data = shouldActivate
      ? await lemon('activate', { license_key: key, instance_name: host || 'nika' })
      : checked;

    const valid = Boolean(data.valid || data.activated);
    const entitlement = entitlementFrom(data, host, known);
    const newInstance = data.instance?.id || instanceId || null;

    // Lemon Squeezy refuses an activation past the limit. That is a fact to
    // report, not a failure: the customer keeps every site running and sees
    // that they are over. Chasing it is a conversation, not a shutdown.
    const overLimit = !valid && /activation limit/i.test(String(data.error || ''));

    if (valid && kind === 'production') await recordActivation(keyTail, host, newInstance, entitlement.tier);

    return res.status(200).json({
      ok: valid || overLimit,
      valid,
      overLimit,
      instanceId: newInstance,
      entitlement,
      // Only ever advisory. No caller may treat this as a reason to stop.
      message: data.error || null
    });
  } catch (error) {
    // The licence service being unreachable is our problem, never the
    // customer's. Report it plainly and tell the caller to carry on.
    return res.status(200).json({
      ok: true,
      degraded: true,
      valid: null,
      entitlement: null,
      message: 'The licence service could not be reached. Nika continues to run unchanged.'
    });
  }
}
