// What a licence key means, in one place.
//
// Two endpoints ask this question for different reasons. /api/licence answers it
// for a site that wants to know its own standing; /api/download answers it before
// handing over a build. They must agree, so the vocabulary lives here rather than
// being written twice and drifting.
//
// Three rules shape every caller, and they are commitments made to customers on
// the pricing page rather than preferences:
//
//   1. A failure here never disables Nika. If Lemon Squeezy is unreachable, the
//      caller is told to carry on unchanged.
//   2. Being over the site count never disables Nika either. It is reported so
//      the owner can see it, and that is all.
//   3. Development and staging installs never consume an activation.

export const LS_API = 'https://api.lemonsqueezy.com/v1/licenses';
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fdubcelrwfpzjjnqipku.supabase.co';

// Lemon Squeezy variant ids map to the three packages, set in Vercel once the
// live store exists.
//
// Built by filtering out the unset ones first. An object literal keyed on empty
// strings collapses to a single '' entry holding whichever came last, so before
// the variants are configured every unknown key resolved as Agency with 50
// sites, the most generous possible reading of a key nobody could identify.
export const TIERS = Object.fromEntries([
  [process.env.NIKA_VARIANT_PERSONAL, { tier: 'personal', sites: 2 }],
  [process.env.NIKA_VARIANT_BUSINESS, { tier: 'business', sites: 5 }],
  [process.env.NIKA_VARIANT_AGENCY, { tier: 'agency', sites: 50 }]
].filter(([id]) => id));

const EXPECTED_STORE_ID = String(process.env.NIKA_LEMON_STORE_ID || '').trim();

// A valid Lemon Squeezy key is not automatically a Nika key. Variant ids are
// globally unique, and the optional store check adds a second boundary once the
// live store is configured. Unknown keys receive no entitlement at all.
export function tierFrom(meta = {}) {
  if (EXPECTED_STORE_ID && String(meta.store_id || '') !== EXPECTED_STORE_ID) return null;
  return TIERS[String(meta.variant_id || '')] || null;
}

// Strips control characters only. Licence keys contain hyphens, so any wider
// character class here quietly corrupts every key it is handed.
export const clean = (value, max) => String(value == null ? '' : value).replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, max);

export function serviceHeaders() {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!secret) return null;
  const headers = { apikey: secret, 'Content-Type': 'application/json' };
  if (!secret.startsWith('sb_secret_')) headers.Authorization = `Bearer ${secret}`;
  return headers;
}

// A site someone is building on is not a site they are selling from. Charging an
// activation for localhost is how you make a customer feel cheated on day one,
// so these resolve as development and are validated without ever activating.
export function siteKind(rawHost) {
  const host = String(rawHost || '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  if (!host) return 'unknown';
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.test')) return 'development';
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host === '::1') return 'development';
  if (/(^|\.)(?:staging|stage|dev|test|preview|sandbox|uat|qa)\./.test(host)) return 'development';
  if (/\.(?:wpengine\.com|wpenginepowered\.com|kinsta\.cloud|pantheonsite\.io|vercel\.app|netlify\.app|pages\.dev|ngrok\.io|ngrok-free\.app|myftpupload\.com)$/.test(host)) return 'development';
  return 'production';
}

export async function lemon(path, body) {
  const response = await fetch(`${LS_API}/${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString()
  });
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object') throw new Error('Unreadable response from the licence service.');
  return data;
}

export function entitlementFrom(data, host, known) {
  const licence = data.license_key || {};
  const meta = data.meta || {};
  const expiresAt = licence.expires_at || null;
  // expires_at is the end of the update term, not the end of the software. An
  // expired licence still runs; it simply stops receiving new versions.
  const inTerm = !expiresAt || Date.parse(expiresAt) > Date.now();
  return {
    tier: known?.tier || null,
    status: clean(licence.status, 24) || 'unknown',
    sitesAllowed: known ? (Number(licence.activation_limit) || known.sites) : 0,
    sitesUsed: Number(licence.activation_usage) || 0,
    updatesUntil: expiresAt,
    updatesActive: Boolean(data.valid || data.activated) && inTerm,
    siteKind: siteKind(host),
    customerEmail: clean(meta.customer_email, 160) || null
  };
}

// Identify a key without spending an activation on it. Every caller that is
// about to hand something over asks this first.
export async function identify(key, host) {
  const checked = await lemon('validate', { license_key: key });
  const known = tierFrom(checked.meta);
  return {
    raw: checked,
    known,
    valid: Boolean(checked.valid) && Boolean(known),
    entitlement: entitlementFrom(checked, host, known),
    // A key that is real but belongs to another product must not be told it is
    // "invalid": it is valid, just not ours, and saying so saves a support round.
    message: known ? (checked.error || null) : 'This licence key was not issued for Nika.'
  };
}
