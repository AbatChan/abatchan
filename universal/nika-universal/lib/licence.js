// What a licence entitles this installation to.
//
// The same three commitments the endpoint makes, restated on the client that
// depends on them, because this is the code that could break them:
//
//   1. Nothing here can stop Nika running. Every failure path returns a package
//      and carries on. A network error, a missing key, a malformed reply and an
//      outright invalid key all leave the guide answering visitors.
//   2. Being over the site count is not a downgrade, and never a shutdown.
//   3. Development and staging installs never consume an activation, which the
//      endpoint decides from the host it is given.
//
// The package table is duplicated from the WordPress plugin on purpose: the two
// editions ship separately and neither can import from the other. A test reads
// both and fails if they disagree, which is the part that actually matters.

import { readFileSync, writeFileSync, renameSync } from 'node:fs';

export const PACKAGES = {
  personal: [],
  business: ['theme_match', 'unbranded', 'config_transfer', 'question_report'],
  agency: ['white_label', 'client_presets', 'activation_dashboard']
};

export const PACKAGE_ORDER = ['personal', 'business', 'agency'];

export const PACKAGE_NAMES = { personal: 'Personal', business: 'Business', agency: 'Agency' };

/** Everything a package includes, Personal upward. */
export function capabilitiesFor(tier) {
  const granted = [];
  for (const name of PACKAGE_ORDER) {
    granted.push(...PACKAGES[name]);
    if (name === tier) break;
  }
  return granted;
}

/** The package a capability first appears in, for the message that explains it. */
export function packageFor(capability) {
  return PACKAGE_ORDER.find(name => PACKAGES[name].includes(capability)) || '';
}

const readState = path => {
  try {
    const stored = JSON.parse(readFileSync(path, 'utf8'));
    return stored && typeof stored === 'object' ? stored : {};
  } catch {
    return {};
  }
};

const writeState = (path, value) => {
  try {
    const temporary = `${path}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporary, path);
  } catch { /* remembering is a convenience; the guide does not depend on it */ }
};

/**
 * A licence that answers immediately and corrects itself in the background.
 *
 * Construction never waits on the network. The package is whatever was last
 * confirmed on disk, so a restart during an outage keeps the features the
 * customer paid for, and the first refresh replaces it with a fresh answer.
 */
export function createLicence({ key = '', site = '', statePath = '', endpoint = '', fetchImpl = globalThis.fetch, now = () => Date.now() } = {}) {
  const stored = statePath ? readState(statePath) : {};
  let state = {
    status: key ? 'unchecked' : 'none',
    tier: key ? (stored.tier || 'personal') : 'personal',
    confirmed: stored.tier || '',
    instanceId: stored.instanceId || '',
    sitesAllowed: stored.sitesAllowed || 0,
    sitesUsed: stored.sitesUsed || 0,
    updatesUntil: stored.updatesUntil || '',
    siteKind: stored.siteKind || '',
    message: '',
    checkedAt: 0
  };

  const remember = () => {
    if (!statePath) return;
    writeState(statePath, {
      tier: state.confirmed,
      instanceId: state.instanceId,
      sitesAllowed: state.sitesAllowed,
      sitesUsed: state.sitesUsed,
      updatesUntil: state.updatesUntil,
      siteKind: state.siteKind
    });
  };

  async function refresh({ activate = false } = {}) {
    if (!key) {
      state = { ...state, status: 'none', tier: 'personal', message: '' };
      return state;
    }
    let data = null;
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action: activate ? 'activate' : 'validate', key, site, instanceId: state.instanceId || '' })
      });
      data = await response.json();
    } catch {
      data = null;
    }

    // Unreachable is not invalid. Keep the confirmed package and say so.
    if (!data || typeof data !== 'object' || data.degraded) {
      state = { ...state, status: 'unreachable', tier: state.confirmed || 'personal', checkedAt: now(), message: 'The licence service could not be reached. Nika is running normally and will check again later.' };
      return state;
    }

    const entitlement = data.entitlement && typeof data.entitlement === 'object' ? data.entitlement : {};
    const tier = Object.prototype.hasOwnProperty.call(PACKAGES, entitlement.tier) ? entitlement.tier : 'personal';
    // Over the limit is a real customer using a real package on more sites than
    // it covers. They keep the package, and the count is reported.
    const entitled = Boolean(data.valid) || Boolean(data.overLimit);

    state = {
      status: data.valid ? 'valid' : (data.overLimit ? 'over-limit' : 'invalid'),
      tier: entitled ? tier : 'personal',
      confirmed: entitled ? tier : 'personal',
      instanceId: String(data.instanceId || state.instanceId || ''),
      sitesAllowed: Number(entitlement.sitesAllowed) || 0,
      sitesUsed: Number(entitlement.sitesUsed) || 0,
      updatesUntil: String(entitlement.updatesUntil || ''),
      siteKind: String(entitlement.siteKind || ''),
      message: String(data.message || ''),
      checkedAt: now()
    };
    remember();
    return state;
  }

  return {
    refresh,
    state: () => ({ ...state }),
    tier: () => state.tier,
    capabilities: () => capabilitiesFor(state.tier),
    can: capability => capabilitiesFor(state.tier).includes(capability)
  };
}
