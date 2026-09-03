// GET /api/download
//
// The only way a Nika build leaves the archive.
//
// Until this existed, every release was a public URL. /downloads held 115 zips
// of a paid plugin and an unauthenticated manifest naming the newest one, so
// anyone who guessed one filename had the product and anyone who read the
// manifest did not have to guess. The zips now sit in a private bucket, and this
// is the door.
//
// Two ways in, because two different clients knock:
//
//   key=    a person, or the plugin acting for one, with the licence key
//   token=  WordPress core following the `package` URL from /api/update, which
//           it fetches with none of our headers, so the grant travels in the URL
//
// Refusing here is safe in a way that refusing in /api/licence is not. A licence
// failure must never stop Nika running on a site that already has it; not being
// handed a new build is a different thing entirely, and is what was bought.

import { clean, identify, siteKind } from '../lib/licence/verify.js';
import { EDITIONS, downloadAllowed, parseVersion } from '../lib/licence/releases.js';
import { entitledTo, recordEntitlement, signedRelease } from '../lib/licence/store.js';
import { verifyDownload } from '../lib/licence/download-token.js';

const LATEST = { wordpress: process.env.NIKA_WORDPRESS_VERSION || '1.6.2', universal: process.env.NIKA_UNIVERSAL_VERSION || '1.6.2' };

const refuse = (res, status, message, extra = {}) => res.status(status).json({ ok: false, message, ...extra });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return refuse(res, 405, 'Use GET.');
  }

  const query = { ...(req.query || {}), ...(typeof req.body === 'object' && req.body ? req.body : {}) };
  const edition = clean(query.edition, 24).toLowerCase();
  const token = clean(query.token, 800);
  const key = clean(query.key, 120);
  const host = clean(query.site, 200);

  if (!EDITIONS[edition]) return refuse(res, 400, 'Name an edition: wordpress or universal.');

  // Version is optional. Asking for the current build is the common case and the
  // caller should not have to know its number to get it.
  const requested = clean(query.version, 24) || LATEST[edition];
  if (!parseVersion(requested)) return refuse(res, 400, 'That is not a version number.');

  let keyTail = '', updatesActive = false, mark = null;

  if (token) {
    const grant = verifyDownload(token);
    if (!grant.ok) return refuse(res, 403, 'That download link has expired. Check for updates again to get a fresh one.', { reason: grant.reason });
    // A grant is for exactly what it names. Rewriting the edition or version in
    // the URL must not widen it.
    if (grant.edition !== edition || grant.version !== requested) return refuse(res, 403, 'That download link is for a different build.');
    keyTail = grant.keyTail;
    updatesActive = true;
  } else {
    if (!key) return refuse(res, 401, 'A licence key is required to download Nika.');
    let checked;
    try {
      checked = await identify(key, host);
    } catch {
      // Unlike /api/licence, an unreachable licence service cannot be waved
      // through here: doing so would open the archive whenever Lemon Squeezy
      // had a bad minute. Say plainly that it is our fault, not theirs.
      return refuse(res, 503, 'The licence service could not be reached, so this download cannot be authorised yet. Please try again shortly.');
    }
    if (!checked.valid) return refuse(res, 403, checked.message || 'That licence key is not valid.');
    keyTail = key.slice(-8);
    updatesActive = Boolean(checked.entitlement.updatesActive);
    mark = await entitledTo(keyTail, edition);
  }

  const verdict = downloadAllowed({ version: requested, updatesActive, entitledTo: mark });
  if (!verdict.allowed) {
    return refuse(res, 403, verdict.reason === 'term-ended'
      ? `Your update term has ended, so ${requested} is not included. Everything you were served during the term is still available, and renewing restores the rest.`
      : 'That version is not in the archive.', { reason: verdict.reason });
  }

  const url = await signedRelease(edition, requested);
  if (!url) return refuse(res, 404, `${EDITIONS[edition].label} ${requested} is not in the archive.`);

  if (updatesActive) await recordEntitlement(keyTail, edition, requested);

  // 302 rather than proxying the bytes: the file is tens of megabytes and a
  // serverless function is the wrong thing to stream it through.
  res.setHeader('Location', url);
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(302).end();
}

export { LATEST, siteKind };
