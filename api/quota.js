// Shared spend ceiling for both assistant routes.
//
// The per-IP Map inside each route is per-instance memory, so it trims obvious
// hammering and nothing more. These two counters live in Supabase, where every
// instance sees the same number:
//
//   assistant.usage      one row, the whole site's day
//   assistant.ip.<hash>  one row per connection per day
//
// Both gain a .<env> suffix outside production, so a preview cannot spend or
// reset the live counters. The sweep pattern still matches either form.
//
// The per-connection row is the one that matters. Without it a single visitor
// can spend the entire site's day on their own, because the burst limiter
// forgives them every ten minutes.
//
// IPs are never stored. The key is a salted hash that also mixes in the day, so
// yesterday's rows cannot be linked to today's and neither can be walked back to
// an address.

import { createHash } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fdubcelrwfpzjjnqipku.supabase.co';
const DAILY_MAX = Number(process.env.ASSISTANT_DAILY_MAX || 600);
const IP_DAILY_MAX = Number(process.env.ASSISTANT_IP_DAILY_MAX || 30);
// Preview and production share one Supabase project, so without a namespace
// they share one counter — and because assistant_consume clamps with
// least(count + 1, max + 1), a preview running a smaller limit does not just
// read that counter, it drags the stored value down to its own ceiling.
// Production keeps the bare keys so today's numbers carry over.
const ENV = process.env.VERCEL_ENV || 'development';
const SUFFIX = ENV === 'production' ? '' : `.${ENV}`;
const USAGE_KEY = `assistant.usage${SUFFIX}`;

const today = () => new Date().toISOString().slice(0, 10);

function serviceHeaders() {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!secret) return null;
  const headers = { apikey: secret, 'Content-Type': 'application/json' };
  if (!secret.startsWith('sb_secret_')) headers.Authorization = `Bearer ${secret}`;
  return headers;
}

function ipKey(ip, day) {
  const salt = process.env.ASSISTANT_IP_SALT || process.env.SUPABASE_SECRET_KEY || 'abatchan';
  return `assistant.ip${SUFFIX}.` + createHash('sha256').update(`${salt}:${day}:${ip}`).digest('hex').slice(0, 16);
}

const open = () => ({ allowed: true, reason: null, remaining: DAILY_MAX, personal: IP_DAILY_MAX });

// A flat per-visitor cap is the wrong shape: the first ten arrivals can each
// take their full allowance while the pool is healthy, and the eleventh gets
// nothing. Tightening as the pool drains spends the same budget but keeps the
// tail of the day open, so a late visitor asking three questions is still
// served. Mirrored in assistant_consume; change both together.
export function capFor(used) {
  const spent = used / DAILY_MAX;
  if (spent < 0.5) return IP_DAILY_MAX;
  if (spent < 0.8) return Math.max(1, Math.round(IP_DAILY_MAX * 0.4));
  return Math.max(1, Math.round(IP_DAILY_MAX * 0.17));
}

// Testing and demos should not spend what visitors need. Comma-separated.
const EXEMPT = new Set(
  String(process.env.ASSISTANT_EXEMPT_IPS || '').split(',').map(s => s.trim()).filter(Boolean)
);

// Yesterday's per-connection rows are dead weight the moment the date rolls, so
// the first request of a new day clears them. Fire-and-forget: a failed sweep
// costs storage, never a visitor.
function sweep(headers, day) {
  fetch(`${SUPABASE_URL}/rest/v1/settings?key=like.assistant.ip.*&value->>day=neq.${day}`, {
    method: 'DELETE',
    headers
  }).catch(() => {});
}

// One statement, one round trip, no lost updates. Present only once schema.sql
// has been applied; until then the REST path below stands in.
async function viaRpc(headers, day, key) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/assistant_consume`, {
    method: 'POST',
    headers: { ...headers, Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ p_usage_key: USAGE_KEY, p_ip_key: key, p_day: day, p_global_max: DAILY_MAX, p_ip_max: IP_DAILY_MAX })
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || typeof data.allowed !== 'boolean') return null;
  if (data.used === 1) sweep(headers, day);
  return { allowed: data.allowed, reason: data.reason || null, remaining: Number(data.remaining) || 0, personal: Number(data.personal) || 0 };
}

// Read-then-write. Two instances can read the same number and each write n+1,
// so this undercounts under load. It is the fallback precisely because the RPC
// above does not have that flaw.
async function viaRest(headers, day, key) {
  const read = await fetch(
    `${SUPABASE_URL}/rest/v1/settings?key=in.("${USAGE_KEY}","${key}")&select=key,value`,
    { headers, cache: 'no-store' }
  );
  const rows = read.ok ? await read.json() : [];
  const at = name => {
    const stored = (rows || []).find(row => row.key === name)?.value;
    return stored && stored.day === day ? Number(stored.count) || 0 : 0;
  };
  const used = at(USAGE_KEY);
  const mine = at(key);
  const cap = capFor(used);

  // Personal ceiling first: it is the cheaper refusal and the fairer one.
  if (mine >= cap) return { allowed: false, reason: 'ip_daily', remaining: Math.max(0, DAILY_MAX - used), personal: 0 };
  if (used >= DAILY_MAX) return { allowed: false, reason: 'daily', remaining: 0, personal: Math.max(0, cap - mine) };

  await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([
      { key: USAGE_KEY, value: { day, count: used + 1 }, is_public: false },
      { key, value: { day, count: mine + 1 }, is_public: false }
    ])
  });
  if (used === 0) sweep(headers, day);
  return { allowed: true, reason: null, remaining: Math.max(0, DAILY_MAX - used - 1), personal: Math.max(0, cap - mine - 1) };
}

// Returns {allowed, reason, remaining, personal}. A counter that cannot be read
// is not a reason to refuse a visitor, so every failure here opens rather than
// closes — the same call the original counter made.
export async function consume(ip) {
  const headers = serviceHeaders();
  if (!headers || EXEMPT.has(ip)) return open();
  const day = today();
  const key = ipKey(ip, day);
  try {
    return (await viaRpc(headers, day, key)) || (await viaRest(headers, day, key));
  } catch {
    return open();
  }
}

export const limits = { daily: DAILY_MAX, perIp: IP_DAILY_MAX };
