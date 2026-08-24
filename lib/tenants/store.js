// Private tenant-record storage backed by the Supabase settings table.
//
// Records contain the guide's prompt material and origin allowlist, so they
// must never be public settings. The service key is only available inside the
// Vercel functions that import this module.

const PREFIX = 'assistant.tenant.';
const DEFAULT_TTL_MS = 60_000;

const asRecord = value => {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
};

const validSiteKey = value => /^[a-zA-Z0-9_-]+$/.test(String(value || ''));

export function createSupabaseTenantStore({
  fetchImpl = (...args) => globalThis.fetch(...args),
  url = process.env.SUPABASE_URL,
  secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY,
  ttlMs = Number(process.env.TENANT_CACHE_TTL_MS) || DEFAULT_TTL_MS,
  now = () => Date.now()
} = {}) {
  const byKey = new Map();
  let all = null;

  const headers = () => {
    if (!url || !secret) throw new Error('Tenant store is not configured');
    return { apikey: secret, Authorization: `Bearer ${secret}` };
  };

  const read = async params => {
    const query = new URLSearchParams({ select: 'value', ...params });
    const response = await fetchImpl(`${url}/rest/v1/settings?${query}`, {
      headers: headers(),
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Tenant store returned ${response.status}`);
    const rows = await response.json();
    return (Array.isArray(rows) ? rows : [])
      .map(row => asRecord(row?.value))
      .filter(Boolean);
  };

  const fresh = entry => entry && entry.expiresAt > now();

  return Object.freeze({
    async get(siteKey) {
      if (!validSiteKey(siteKey)) return null;
      const cached = byKey.get(siteKey);
      if (fresh(cached)) return cached.value;

      try {
        const records = await read({ key: `eq.${PREFIX}${siteKey}`, limit: '1' });
        const value = records.find(record => record.siteKey === siteKey) || null;
        byKey.set(siteKey, { value, expiresAt: now() + ttlMs });
        return value;
      } catch (error) {
        // A warm function can keep answering from its last verified record
        // during a short Supabase incident. Cold functions still fail closed.
        if (cached) return cached.value;
        throw error;
      }
    },

    async all() {
      if (fresh(all)) return all.value;
      try {
        const records = await read({ key: `like.${PREFIX}*` });
        const value = records.filter(record => validSiteKey(record.siteKey));
        all = { value, expiresAt: now() + ttlMs };
        for (const record of value) {
          byKey.set(record.siteKey, { value: record, expiresAt: all.expiresAt });
        }
        return value;
      } catch (error) {
        if (all) return all.value;
        throw error;
      }
    }
  });
}

export const tenantSettingKey = siteKey => `${PREFIX}${siteKey}`;
