// Supabase connection, and a small client built on fetch.
//
// No SDK on purpose: the rest of this site ships zero dependencies and no build
// step, and the three endpoints needed here (auth, REST, storage) are plain
// HTTP. That also means nothing third-party executes on your visitors' pages.
//
// The anon key below is meant to be public. It is not a secret — every request
// it makes is filtered by the row level security policies in
// supabase/schema.sql. The service key must NEVER appear in this file.
window.SUPABASE = {
  url: 'https://YOUR-PROJECT.supabase.co',   // Settings -> API -> Project URL
  anonKey: 'YOUR-ANON-KEY'                   // Settings -> API -> anon public
};

(function () {
  const cfg = window.SUPABASE;
  const configured = () => cfg.url.startsWith('https://') && !cfg.url.includes('YOUR-PROJECT');
  const TOKEN_KEY = 'abatAdminSession';

  const session = {
    get() {
      try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
    },
    set(v) { v ? localStorage.setItem(TOKEN_KEY, JSON.stringify(v)) : localStorage.removeItem(TOKEN_KEY); },
    get token() { return this.get()?.access_token || null; }
  };

  const headers = (auth = true) => {
    const h = { apikey: cfg.anonKey, 'Content-Type': 'application/json' };
    const t = auth && session.token;
    h.Authorization = `Bearer ${t || cfg.anonKey}`;
    return h;
  };

  async function req(path, opts = {}) {
    const res = await fetch(cfg.url + path, { ...opts, headers: { ...headers(opts.auth !== false), ...(opts.headers || {}) } });
    if (res.status === 204) return null;
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw Object.assign(new Error(data?.message || data?.error_description || res.statusText), { status: res.status, data });
    return data;
  }

  window.sb = {
    configured,
    session,

    async signIn(email, password) {
      const data = await req('/auth/v1/token?grant_type=password', {
        method: 'POST', auth: false, body: JSON.stringify({ email, password })
      });
      session.set(data);
      return data;
    },
    async signOut() {
      try { await req('/auth/v1/logout', { method: 'POST' }); } catch { /* token may already be dead */ }
      session.set(null);
    },
    async refresh() {
      const s = session.get();
      if (!s?.refresh_token) return null;
      try {
        const data = await req('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST', auth: false, body: JSON.stringify({ refresh_token: s.refresh_token })
        });
        session.set(data);
        return data;
      } catch { session.set(null); return null; }
    },

    // ---- data -------------------------------------------------------------
    select: (table, query = '') => req(`/rest/v1/${table}?${query}`),
    insert: (table, row) => req(`/rest/v1/${table}`, {
      method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row)
    }),
    update: (table, query, patch) => req(`/rest/v1/${table}?${query}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch)
    }),
    upsert: (table, rows) => req(`/rest/v1/${table}`, {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(rows)
    }),
    remove: (table, query) => req(`/rest/v1/${table}?${query}`, { method: 'DELETE' }),

    // ---- storage ----------------------------------------------------------
    async upload(bucket, path, file) {
      const res = await fetch(`${cfg.url}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
        method: 'POST',
        headers: { apikey: cfg.anonKey, Authorization: `Bearer ${session.token}`, 'x-upsert': 'true' },
        body: file
      });
      if (!res.ok) throw new Error((await res.text()) || 'upload failed');
      return path;
    },
    publicUrl: (bucket, path) => `${cfg.url}/storage/v1/object/public/${bucket}/${encodeURI(path)}`,
    removeFile: (bucket, path) => fetch(`${cfg.url}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
      method: 'DELETE', headers: { apikey: cfg.anonKey, Authorization: `Bearer ${session.token}` }
    })
  };
})();
