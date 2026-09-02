// The shape of a release, and which of them a given licence may have.
//
// Nika versions run x.y.z with each digit 0 to 9, so 1.5.9 is followed by 1.6.0.
// That makes ordering a plain numeric comparison; it does not make string
// comparison safe, because "1.10.0" would sort under "1.9.0" the moment the
// scheme ever widened.

export const EDITIONS = {
  wordpress: { slug: 'nika-site-guide', label: 'Nika Site Guide for WordPress' },
  universal: { slug: 'nika-universal', label: 'Nika Universal' }
};

export const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function parseVersion(value) {
  const text = String(value || '').trim();
  if (!VERSION_PATTERN.test(text)) return null;
  return text.split('.').map(Number);
}

// Returns -1, 0 or 1, or null when either side is not a version. Callers must
// check for null rather than treating it as "equal", which would quietly let an
// unparseable version through a boundary test.
export function compareVersions(a, b) {
  const left = parseVersion(a), right = parseVersion(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

export const higherVersion = (a, b) => (compareVersions(a, b) === 1 ? a : b);

export function releaseFile(edition, version) {
  const known = EDITIONS[edition];
  if (!known || !parseVersion(version)) return null;
  return `${known.slug}-${version}.zip`;
}

// One flat prefix per edition inside the private bucket, so a signed URL never
// has to encode anything but the file it grants.
export const releasePath = (edition, version) => {
  const file = releaseFile(edition, version);
  return file ? `${edition}/${file}` : null;
};

/**
 * Which versions this licence may download.
 *
 * In term, everything. Out of term, everything up to the highest version the
 * customer was ever served, which is the thing they actually bought: lifetime
 * use of the versions their update term covered.
 *
 * The high-water mark is why this is not a date comparison. Release dates would
 * have to be inferred from the archive, and the archive was committed in
 * batches, so several versions share a timestamp and one pair is out of order.
 * A wrong date here refuses a paying customer a reinstall.
 */
export function downloadAllowed({ version, updatesActive, entitledTo }) {
  if (!parseVersion(version)) return { allowed: false, reason: 'unknown-version' };
  if (updatesActive) return { allowed: true, reason: 'in-term' };
  if (!entitledTo) return { allowed: false, reason: 'term-ended' };
  const order = compareVersions(version, entitledTo);
  if (order === null) return { allowed: false, reason: 'term-ended' };
  return order <= 0
    ? { allowed: true, reason: 'covered-by-earlier-term' }
    : { allowed: false, reason: 'term-ended' };
}
