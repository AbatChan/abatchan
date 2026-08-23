// Resolves a site key to the tenant it identifies.
//
// Records live in code for now. The lookup is async and keyed so that moving
// them into a table later changes this file and nothing that calls it.
//
// A site key travels in the page source of whatever site embeds the guide, so
// it is public by design and secrecy is not what protects it. What protects it
// is the origin it is allowed to be used from: lifting abatchan's key onto
// another domain has to fail, or that domain spends abatchan's model budget and
// gets abatchan's answers.

import { composeTenant } from '../prompt/compose.js';
import { abatchan } from './abatchan.js';
import { northwind } from './northwind.js';

const RECORDS = new Map([abatchan, northwind].map(record => [record.siteKey, record]));

// The site this deployment serves when a request does not name one. Only ever
// applied to same-origin requests, so an embed on someone else's site cannot
// omit its key and silently inherit this one.
export const PRIMARY_SITE_KEY = abatchan.siteKey;

// Composition walks the entire instruction set, so it happens once per tenant
// rather than once per request.
const composed = new Map();

export async function resolveTenant(siteKey) {
  const record = RECORDS.get(siteKey);
  if (!record) return null;
  if (!composed.has(siteKey)) {
    composed.set(siteKey, Object.freeze({ record, siteKey, ...composeTenant(record) }));
  }
  return composed.get(siteKey);
}

// Quota rows are namespaced per tenant so one busy site cannot drain another's
// allowance. The primary site keeps an empty scope so its existing counters
// carry over rather than resetting on deploy.
export const quotaScope = tenant =>
  tenant.siteKey === PRIMARY_SITE_KEY ? '' : `.${tenant.record.id}`;

const hostOf = value => {
  try { return new URL(value).host.toLowerCase(); } catch { return ''; }
};

// Same-origin means the site is calling the API that serves it, which is the
// primary deployment talking to itself, previews included. Cross-origin means an
// embed, and that is the case worth checking.
export function originAllowed(tenant, { origin, host }) {
  const from = hostOf(origin);
  if (!from) return true;                       // no Origin header: not a browser embed
  if (host && from === String(host).toLowerCase()) return true;   // same origin
  const allowed = tenant.record.origins || [];
  return allowed.some(entry => {
    const pattern = String(entry).toLowerCase().trim();
    if (pattern.startsWith('*.')) return from === pattern.slice(2) || from.endsWith(pattern.slice(1));
    return from === pattern;
  });
}

export const knownSiteKeys = () => [...RECORDS.keys()];
