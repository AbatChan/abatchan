// Supabase connection, and a small client built on fetch.
//
// No SDK on purpose: the rest of this site ships zero dependencies and no build
// step, and the three endpoints needed here (auth, REST, storage) are plain
// HTTP. That also means nothing third-party executes on your visitors' pages.
//
// The anon key below is meant to be public. It is not a secret. Every request
// it makes is filtered by the row level security policies in
// supabase/schema.sql. The service key must NEVER appear in this file.
window.SUPABASE = {
  url: 'https://fdubcelrwfpzjjnqipku.supabase.co',
  anonKey: 'sb_publishable_b_pSIsSTOHTrYj87LJrY1A_WDFm_dF6'
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
    if (t) h.Authorization = `Bearer ${t}`;
    else if (!cfg.anonKey.startsWith('sb_publishable_')) h.Authorization = `Bearer ${cfg.anonKey}`;
    return h;
  };

  async function parse(res) {
    if (res.status === 204) return null;
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) throw Object.assign(new Error(data?.message || data?.error_description || res.statusText), { status: res.status, data });
    return data;
  }

  async function raw(path, opts = {}) {
    const res = await fetch(cfg.url + path, { ...opts, headers: { ...headers(opts.auth !== false), ...(opts.headers || {}) } });
    return parse(res);
  }

  async function refresh() {
    const s = session.get();
    if (!s?.refresh_token) return null;
    try {
      const data = await raw('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', auth: false, body: JSON.stringify({ refresh_token: s.refresh_token })
      });
      session.set(data);
      return data;
    } catch { session.set(null); return null; }
  }

  async function req(path, opts = {}, retried = false) {
    try { return await raw(path, opts); }
    catch (err) {
      if (err.status === 401 && opts.auth !== false && !retried && await refresh()) {
        return req(path, opts, true);
      }
      throw err;
    }
  }

  async function storageRequest(method, bucket, path, body, onProgress, retried = false) {
    const url = `${cfg.url}/storage/v1/object/${bucket}/${encodeURI(path)}`;
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.setRequestHeader('apikey', cfg.anonKey);
      if (session.token) xhr.setRequestHeader('Authorization', `Bearer ${session.token}`);
      else if (!cfg.anonKey.startsWith('sb_publishable_')) xhr.setRequestHeader('Authorization', `Bearer ${cfg.anonKey}`);
      if (method === 'POST') xhr.setRequestHeader('x-upsert', 'true');
      if (xhr.upload && onProgress) xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300
        ? resolve(path)
        : reject(Object.assign(new Error(xhr.responseText || 'storage request failed'), { status: xhr.status }));
      xhr.onerror = () => reject(new Error('storage request failed'));
      xhr.send(body || null);
    }).catch(async err => {
      if (err.status === 401 && !retried && await refresh()) return storageRequest(method, bucket, path, body, onProgress, true);
      throw err;
    });
    return result;
  }

  window.sb = {
    configured,
    session,
    consumeRecoveryUrl() {
      const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
      const query = new URLSearchParams(location.search);
      const params = hash.size ? hash : query;
      const error = params.get('error_description') || params.get('error');
      if (error) { history.replaceState(null, '', location.pathname); return { error }; }
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');
      if (type !== 'recovery' || !accessToken || !refreshToken) return null;
      const expiresIn = Number(params.get('expires_in')) || 3600;
      session.set({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: params.get('token_type') || 'bearer',
        expires_in: expiresIn,
        expires_at: Math.floor(Date.now() / 1000) + expiresIn
      });
      history.replaceState(null, '', location.pathname);
      return { recovery: true };
    },
    async signIn(email, password) {
      const data = await raw('/auth/v1/token?grant_type=password', {
        method: 'POST', auth: false, body: JSON.stringify({ email, password })
      });
      session.set(data);
      return data;
    },
    async signOut() {
      try { await req('/auth/v1/logout', { method: 'POST' }); } catch {}
      session.set(null);
    },
    refresh,
    user: () => req('/auth/v1/user'),
    updatePassword: password => req('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password }) }),
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
    upload: (bucket, path, file, onProgress) => storageRequest('POST', bucket, path, file, onProgress),
    publicUrl: (bucket, path) => `${cfg.url}/storage/v1/object/public/${bucket}/${encodeURI(path)}`,
    removeFile: (bucket, path) => storageRequest('DELETE', bucket, path)
  };
})();

addEventListener('DOMContentLoaded', () => {
  [
    ['/assistant-v2.js?v=4','stream-markdown'],
    ['/assistant-polish.js?v=1','visual-polish'],
    ['/mobile-viewport-fix.js?v=4','mobile-viewport-fix'],
    ['/responsive-lamp.js?v=5','responsive-lamp'],
    ['/dynamic-work.js?v=1','dynamic-work'],
    ['/admin-work-enhancements.js?v=2','admin-work-enhancements'],
    ['/admin-guided-controls.js?v=1','admin-guided-controls'],
    ['/admin-announcement-ux.js?v=2','admin-announcement-ux'],
    ['/admin-ux-fixes.js?v=3','admin-ux-fixes'],
    ['/admin-validation-fix.js?v=1','admin-validation-fix'],
    ['/admin-pattern-fix.js?v=1','admin-pattern-fix'],
    ['/admin-password-toggle.js?v=1','admin-password-toggle'],
    ['/admin-theme-sync.js?v=2','admin-theme-sync'],
    ['/admin-auth-gallery-fix.js?v=1','admin-auth-gallery-fix']
  ].forEach(([src,label]) => {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.siteUpgrade = label;
    document.head.appendChild(script);
  });
}, { once: true });
