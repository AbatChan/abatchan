// GET /api/update
//
// The WordPress update manifest, answered per licence rather than served as a
// file. The old one was a static json at /downloads that told anybody who asked
// which build was current and exactly where to fetch it, with no key involved.
//
// What is public here and what is not:
//
//   public   the version number, what it requires, and the changelog. A site
//            with no key still learns an update exists and what is in it. That
//            is honest, and hiding it would only make people email to ask.
//   earned   `package`. The URL that yields bytes is minted for one licence,
//            one edition and one version, and expires within the hour.
//
// The plugin never has to decide any of this. It sends its key and installs what
// it is given, which keeps one rule in one place.

import { clean, identify } from '../lib/licence/verify.js';
import { EDITIONS } from '../lib/licence/releases.js';
import { signDownload, tokensAvailable } from '../lib/licence/download-token.js';
import release from '../lib/licence/wordpress-release.json' with { type: 'json' };

const SITE = process.env.NIKA_SITE_ORIGIN || 'https://abatchan.com';

export default async function handler(req, res) {
  // Six hours matches the transient the plugin keeps, so a forced check gets a
  // fresh answer and a routine one costs nothing.
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use GET.' });
  }

  const query = { ...(req.query || {}), ...(typeof req.body === 'object' && req.body ? req.body : {}) };
  const edition = clean(query.edition, 24).toLowerCase() || 'wordpress';
  const key = clean(query.key, 120);
  const host = clean(query.site, 200);

  if (!EDITIONS[edition]) return res.status(400).json({ error: 'Name an edition: wordpress or universal.' });

  const manifest = {
    version: release.version,
    package: '',
    homepage: release.homepage,
    requires: release.requires,
    requires_php: release.requires_php,
    tested: release.tested,
    sections: release.sections,
    licence: { state: 'none', message: 'Add your licence key under Settings to install updates automatically.' }
  };

  if (!key) return res.status(200).json(manifest);

  let checked;
  try {
    checked = await identify(key, host);
  } catch {
    // Nothing about a bad minute at Lemon Squeezy should look like an invalid
    // key to the person reading this screen.
    manifest.licence = { state: 'unreachable', message: 'The licence service could not be reached. Nika keeps running; try checking for updates again shortly.' };
    return res.status(200).json(manifest);
  }

  if (!checked.valid) {
    manifest.licence = { state: 'invalid', message: checked.message || 'That licence key is not valid.' };
    return res.status(200).json(manifest);
  }

  const entitlement = checked.entitlement;
  if (!entitlement.updatesActive) {
    manifest.licence = {
      state: 'expired',
      updatesUntil: entitlement.updatesUntil,
      message: 'Your update term has ended. Nika keeps running exactly as it is, and renewing brings new versions back.'
    };
    return res.status(200).json(manifest);
  }

  const token = signDownload({ edition, version: release.version, keyTail: key.slice(-8) });
  if (!token) {
    // A missing signing secret must not quietly become an open archive, so say
    // nothing is available rather than falling back to an unsigned URL.
    manifest.licence = { state: 'unavailable', message: 'Updates are briefly unavailable. Nika keeps running; try again shortly.' };
    return res.status(200).json(manifest);
  }

  manifest.package = `${SITE}/api/download?edition=${encodeURIComponent(edition)}&version=${encodeURIComponent(release.version)}&token=${encodeURIComponent(token)}`;
  manifest.licence = {
    state: 'valid',
    tier: entitlement.tier,
    updatesUntil: entitlement.updatesUntil,
    sitesAllowed: entitlement.sitesAllowed,
    sitesUsed: entitlement.sitesUsed,
    message: ''
  };
  return res.status(200).json(manifest);
}

export { tokensAvailable };
