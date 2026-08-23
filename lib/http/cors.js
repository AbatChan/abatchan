// Cross-origin access for the embeddable guide.
//
// The primary site calls its own API and needs none of this. An embed on a
// buyer's domain is cross-origin, so the browser sends a preflight OPTIONS
// before the real request and refuses to hand the response back without the
// matching headers.
//
// The preflight carries no body and no custom headers, only the Origin and a
// list of headers the real request intends to send. The site key therefore is
// not available yet, so a preflight can only be answered on the origin: is this
// a domain any tenant has authorised? The real request still checks that the
// key and the origin belong together, which is the check that matters.

import { originAllowedForAny } from '../tenants/registry.js';

const ALLOWED_HEADERS = 'Content-Type, X-Site-Key';
const ALLOWED_METHODS = 'POST, OPTIONS';

export const isCrossOrigin = req => {
  const origin = String(req.headers.origin || '');
  if (!origin) return false;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  return Boolean(host) && !origin.endsWith(host);
};

// Vary matters here: without it a shared cache can answer one origin with the
// headers minted for another.
export const applyCors = (req, res, origin) => {
  res.setHeader('Vary', 'Origin');
  if (!origin) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Expose-Headers', 'X-Guide-Remaining, X-Guide-Personal, X-Abatchan-Action-Token');
};

// Returns true when the request was a preflight and has been answered, so the
// caller should stop. Credentials are deliberately not allowed: the guide holds
// no session and an embed must never be able to ride a visitor's cookies.
export const handlePreflight = async (req, res) => {
  if (req.method !== 'OPTIONS') return false;
  const origin = String(req.headers.origin || '');
  res.setHeader('Vary', 'Origin');
  if (!origin || !(await originAllowedForAny(origin))) {
    res.statusCode = 403;
    res.end();
    return true;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.setHeader('Access-Control-Max-Age', '86400');
  res.statusCode = 204;
  res.end();
  return true;
};
