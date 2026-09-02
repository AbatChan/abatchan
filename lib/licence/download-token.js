// A short-lived grant that WordPress core can follow on its own.
//
// The plugin authenticates with its licence key, but the plugin is not what
// fetches the zip: WordPress core takes the `package` URL out of the update
// transient and requests it with no headers of ours. Putting the licence key in
// that URL would write it into every server log and update transient on the
// site, so the manifest hands back a signed grant instead. It names one edition
// and one version, it expires, and it is worthless for anything else.

import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.NIKA_DOWNLOAD_SECRET || '';
export const TOKEN_LIFETIME_SECONDS = 60 * 60;

// No secret means no grants. Falling back to a default or to unsigned tokens
// would turn a missing environment variable into an open archive, which is the
// exact failure this endpoint exists to close.
export const tokensAvailable = () => SECRET.length >= 16;

const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = body => createHmac('sha256', SECRET).update(body).digest('base64url');

export function signDownload({ edition, version, keyTail, seconds = TOKEN_LIFETIME_SECONDS }) {
  if (!tokensAvailable()) return null;
  const body = encode({ e: edition, v: version, k: keyTail, x: Math.floor(Date.now() / 1000) + seconds });
  return `${body}.${sign(body)}`;
}

export function verifyDownload(token) {
  if (!tokensAvailable()) return { ok: false, reason: 'tokens-unavailable' };
  const text = String(token || '');
  const split = text.lastIndexOf('.');
  if (split < 1) return { ok: false, reason: 'malformed' };
  const body = text.slice(0, split), signature = text.slice(split + 1);
  const expected = sign(body);
  // Compare in constant time, and only after the lengths match: timingSafeEqual
  // throws on a length mismatch rather than returning false.
  if (signature.length !== expected.length) return { ok: false, reason: 'bad-signature' };
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return { ok: false, reason: 'bad-signature' };
  let claims;
  try { claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return { ok: false, reason: 'malformed' }; }
  if (!claims || typeof claims !== 'object') return { ok: false, reason: 'malformed' };
  if (Number(claims.x || 0) * 1000 < Date.now()) return { ok: false, reason: 'expired' };
  return { ok: true, edition: String(claims.e || ''), version: String(claims.v || ''), keyTail: String(claims.k || '') };
}
