// The two pieces of state that are ours rather than Lemon Squeezy's.
//
// Lemon Squeezy owns the key, the term and the activation count. It does not
// know which build a customer has been served, and it cannot hold the archive.
// Both live here, in the settings table that already exists, so this ships
// without a schema migration standing in front of it.

import { SUPABASE_URL, serviceHeaders } from './verify.js';
import { higherVersion, parseVersion, releasePath } from './releases.js';

const RELEASE_BUCKET = process.env.NIKA_RELEASE_BUCKET || 'releases';
const entitlementKey = keyTail => `nika.entitled.${keyTail}`;

async function settingsRow(key) {
  const headers = serviceHeaders();
  if (!headers) return null;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.${encodeURIComponent(key)}&select=value`, { headers });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => null);
  return Array.isArray(rows) && rows.length ? rows[0].value : null;
}

async function writeSetting(key, value) {
  const headers = serviceHeaders();
  if (!headers) return false;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([{ key, value, is_public: false }])
  });
  return response.ok;
}

/** The highest version of an edition this licence has ever been served. */
export async function entitledTo(keyTail, edition) {
  try {
    const record = await settingsRow(entitlementKey(keyTail));
    const version = record && typeof record === 'object' ? record[edition] : null;
    return parseVersion(version) ? version : null;
  } catch {
    return null;
  }
}

/**
 * Raise the high-water mark after a download that the update term covered.
 *
 * Only ever raises. A customer who reinstalls 1.4.0 has not given up their claim
 * on 1.5.2, and lowering the mark here would take it away the next time their
 * term lapsed.
 */
export async function recordEntitlement(keyTail, edition, version) {
  if (!parseVersion(version)) return;
  try {
    const record = await settingsRow(entitlementKey(keyTail));
    const current = record && typeof record === 'object' ? { ...record } : {};
    const kept = parseVersion(current[edition]) ? higherVersion(current[edition], version) : version;
    if (kept === current[edition]) return;
    current[edition] = kept;
    current.seenAt = new Date().toISOString();
    await writeSetting(entitlementKey(keyTail), current);
  } catch { /* the download matters; the record is bookkeeping */ }
}

/**
 * A URL for one build that stops working shortly after it is issued.
 *
 * The bucket is private, so this is the only way the bytes leave storage. The
 * link is minted per request and lives about a minute: long enough for
 * WordPress core to follow the redirect, too short to be worth passing around.
 */
export async function signedRelease(edition, version, seconds = 90) {
  const path = releasePath(edition, version);
  const headers = serviceHeaders();
  if (!path || !headers) return null;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${RELEASE_BUCKET}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ expiresIn: seconds })
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  const signed = data && typeof data.signedURL === 'string' ? data.signedURL : '';
  if (!signed) return null;
  return `${SUPABASE_URL}/storage/v1${signed.startsWith('/') ? signed : `/${signed}`}`;
}

export { RELEASE_BUCKET };
