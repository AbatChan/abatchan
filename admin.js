(() => {
  'use strict';

  const q = (s, c = document) => c.querySelector(s);
  const qa = (s, c = document) => [...c.querySelectorAll(s)];
  const gate = q('#gate');
  const app = q('#app');
  const login = q('#login');
  const loginBtn = q('#loginBtn');
  const gateMsg = q('#gateMsg');
  const resetPassword = q('#resetPassword');
  const resetBtn = q('#resetBtn');
  const resetMsg = q('#resetMsg');
  const toastEl = q('#toast');
  const dirty = new Set();
  const ROUTE_VIEWS = new Set(['work', 'copy', 'assistant', 'announcements', 'faqs', 'reviews']);
  let activeView = 'work';
  let toastTimer;

  const icons = {
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l3.8-.8L19 8a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>'
  };

  function toast(message, bad = false) {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.toggle('bad', bad);
    toastEl.classList.add('on');
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 3600);
  }

  function pending(button, on, label = 'saving') {
    if (!button) return;
    if (on) {
      button.dataset.label = button.textContent;
      button.textContent = `${label}…`;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.label || button.textContent;
      button.disabled = button.dataset.clean === 'true';
    }
  }

  function saveState(button, changed) {
    if (!button) return;
    button.dataset.clean = String(!changed);
    button.disabled = !changed;
    button.innerHTML = changed
      ? 'save <span class="arrow">↗</span>'
      : 'saved <span aria-hidden="true">✓</span>';
  }

  function routeFromUrl() {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    return {
      view: ROUTE_VIEWS.has(view) ? view : 'work',
      item: params.get('item') || ''
    };
  }

  function writeRoute(view, item = '', mode = 'replace') {
    const url = new URL(location.href);
    const publicView = view === 'editor' ? 'work' : (ROUTE_VIEWS.has(view) ? view : 'work');
    url.searchParams.set('view', publicView);
    if (view === 'editor' && item) url.searchParams.set('item', item);
    else url.searchParams.delete('item');
    history[mode === 'push' ? 'pushState' : 'replaceState']({ view: publicView, item }, '', url);
  }

  function showGate() {
    app.classList.add('adm-hide');
    gate.classList.remove('adm-hide');
    login.classList.remove('adm-hide');
    resetPassword.classList.add('adm-hide');
    q('#password').value = '';
  }

  function showRecovery() {
    app.classList.add('adm-hide');
    gate.classList.remove('adm-hide');
    login.classList.add('adm-hide');
    resetPassword.classList.remove('adm-hide');
    q('#newPassword').focus();
  }

  async function showApp(user) {
    q('#who').textContent = user.email || '';
    gate.classList.add('adm-hide');
    app.classList.remove('adm-hide');
    await Promise.all([loadWork(), loadCopy(), loadSocials(), loadAssistant(), loadAnnouncements()]);
    const route = routeFromUrl();
    if (route.view === 'work' && route.item) {
      if (route.item === 'new') {
        openEditor(null, { routeMode: 'replace' });
        return;
      }
      const item = workItems.find(row => row.slug === route.item || String(row.id) === route.item);
      if (item) {
        openEditor(item, { routeMode: 'replace' });
        return;
      }
    }
    showView(route.view, { routeMode: 'replace' });
  }

  login.addEventListener('submit', async e => {
    e.preventDefault();
    gateMsg.textContent = '';
    pending(loginBtn, true, 'signing in');
    try {
      await sb.signIn(q('#email').value.trim(), q('#password').value);
      await showApp(await sb.user());
    } catch {
      gateMsg.textContent = 'That email and password do not match.';
      q('#password').value = '';
      q('#password').focus();
    } finally {
      pending(loginBtn, false);
    }
  });

  resetPassword.addEventListener('submit', async e => {
    e.preventDefault();
    const password = q('#newPassword');
    const confirmation = q('#confirmPassword');
    resetMsg.textContent = '';
    if (password.value !== confirmation.value) {
      resetMsg.textContent = 'Those passwords do not match.';
      confirmation.focus();
      return;
    }
    pending(resetBtn, true, 'updating');
    try {
      await sb.updatePassword(password.value);
      await sb.signOut();
      password.value = '';
      confirmation.value = '';
      showGate();
      gateMsg.textContent = 'Password updated. Sign in with your new password.';
      q('#email').focus();
    } catch (err) {
      resetMsg.textContent = err.status === 401
        ? 'That recovery link has expired. Request a new one and use only the newest email.'
        : `The password could not be updated. ${err.message}`;
    } finally {
      pending(resetBtn, false);
    }
  });

  q('#signOut').addEventListener('click', async () => {
    if (dirty.size && !confirm('Discard unsaved changes and sign out?')) return;
    await sb.signOut();
    dirty.clear();
    showGate();
  });

  addEventListener('beforeunload', e => {
    if (!dirty.size) return;
    e.preventDefault();
    e.returnValue = '';
  });

  function showView(name, { routeMode = 'replace', item = '' } = {}) {
    qa('[id^="view-"]').forEach(el => el.classList.add('adm-hide'));
    q(`#view-${name}`)?.classList.remove('adm-hide');
    const tabName = name === 'editor' ? 'work' : name;
    qa('#tabs [data-view]').forEach(btn => btn.setAttribute('aria-current', String(btn.dataset.view === tabName)));
    activeView = name;
    writeRoute(name, item, routeMode);
  }
  window.__adminShowView = showView;

  q('#tabs').addEventListener('click', e => {
    const button = e.target.closest('[data-view]');
    if (!button || button.dataset.view === activeView) return;
    if (dirty.size && !confirm('Discard unsaved changes?')) return;
    dirty.clear();
    showView(button.dataset.view, { routeMode: 'push' });
  });

  addEventListener('popstate', () => {
    if (dirty.size && !confirm('Discard unsaved changes?')) {
      history.forward();
      return;
    }
    dirty.clear();
    const route = routeFromUrl();
    if (route.view === 'work' && route.item) {
      if (route.item === 'new') {
        openEditor(null, { routeMode: 'replace' });
        return;
      }
      const item = workItems.find(row => row.slug === route.item || String(row.id) === route.item);
      if (item) {
        openEditor(item, { routeMode: 'replace' });
        return;
      }
    }
    showView(route.view, { routeMode: 'replace' });
  });

  // ---------------------------------------------------------------- work
  const itemsEl = q('#items');
  const editor = q('#editor');
  let workItems = [];
  let editing = null;
  let imageFile = null;
  let previewUrl = null;
  let slugTouched = false;
  const FEATURED_LIMIT = 3;

  function publishedFeatured(excludingId = null) {
    return workItems.filter(item => item.published && item.featured && item.id !== excludingId);
  }

  function updateFeaturedHelp() {
    const help = q('#featuredHelp');
    const toggle = q('#f-featured');
    if (!help || !toggle) return;
    const used = publishedFeatured(editing?.id).length + (editing?.published && editing?.featured ? 1 : 0);
    const otherFeatured = publishedFeatured(editing?.id);
    const blocked = otherFeatured.length >= FEATURED_LIMIT && !editing?.featured;
    toggle.disabled = blocked;
    help.classList.toggle('bad', blocked);
    help.textContent = blocked
      ? `All ${FEATURED_LIMIT} homepage slots are in use by ${otherFeatured.map(item => item.title).join(', ')}. Turn off “show on homepage” on one of them first.`
      : `${used} of ${FEATURED_LIMIT} homepage slots currently used. Only published projects appear there.`;
  }

  async function loadWork() {
    try {
      workItems = await sb.select('work_items', 'select=*&order=position.asc,created_at.asc');
      renderWork();
    } catch (err) {
      itemsEl.replaceChildren(empty(`Work could not be loaded. ${err.message}`));
    }
  }

  function empty(text) {
    const el = document.createElement('div');
    el.className = 'adm-empty';
    el.textContent = text;
    return el;
  }

  function tag(text, cls = '') {
    const el = document.createElement('span');
    el.className = `adm-tag ${cls}`.trim();
    el.textContent = text;
    return el;
  }

  function iconButton(label, icon, handler, options = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `adm-icon${options.danger ? ' danger' : ''}`;
    button.setAttribute('aria-label', label);
    button.innerHTML = icon;
    // Real text, not ::after content: a pseudo-element is not in the
    // accessibility tree and cannot be selected or translated.
    if (options.text) {
      const caption = document.createElement('span');
      caption.className = 'adm-icon-text';
      caption.textContent = options.text;
      button.append(caption);
    }
    button.disabled = !!options.disabled;
    button.addEventListener('click', handler);
    return button;
  }

  const workTools = window.admListTools && admListTools({
    label: 'work',
    text: item => [item.title, item.slug, item.kicker, item.status, item.category, item.summary].filter(Boolean).join(' '),
    isDraft: item => !item.published,
    onChange: () => renderWork()
  });
  if (workTools) itemsEl.before(workTools.element);

  function renderWork() {
    const featured = publishedFeatured();
    const featuredSummary = q('#featuredSummary');
    if (featuredSummary) {
      featuredSummary.textContent = `${featured.length} of ${FEATURED_LIMIT} homepage slots used${featured.length ? `: ${featured.map(item => item.title).join(', ')}` : ''}.`;
    }
    itemsEl.replaceChildren();
    workTools?.sync(workItems.length);
    if (!workItems.length) {
      itemsEl.append(empty('No work items yet. Add the first project, keep it as a draft while editing, then publish it when it is ready.'));
      return;
    }
    // Index must stay the true position: moveItem reorders the real array, and
    // a filtered view's neighbours are not the item's real neighbours.
    const filtering = Boolean(workTools?.filtering);
    // admin-work-list.js writes positions from DOM order on drop, so a filtered
    // list must not be draggable or it would renumber only the visible rows.
    itemsEl.dataset.filtered = filtering ? '1' : '';
    const visible = workItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !workTools || workTools.matches(item));
    if (!visible.length) {
      itemsEl.append(empty('Nothing matches that filter.'));
      return;
    }
    visible.forEach(({ item, index }) => {
      const row = document.createElement('article');
      row.className = 'adm-item';
      row.dataset.workId = String(item.id);
      row.dataset.workTitle = item.title || 'project';

      const thumb = document.createElement('div');
      thumb.className = 'adm-thumb';
      if (item.image_path) {
        const img = document.createElement('img');
        img.src = sb.publicUrl('work', item.image_path);
        img.alt = item.image_alt || '';
        thumb.append(img);
      } else {
        const text = document.createElement('span');
        text.textContent = 'no image';
        thumb.append(text);
      }

      const copy = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = item.title;
      const summary = document.createElement('p');
      summary.textContent = item.summary || 'No summary yet.';
      const tags = document.createElement('div');
      tags.className = 'adm-tags';
      tags.append(tag(item.category), tag(item.published ? 'published' : 'draft', item.published ? 'on' : 'off'));
      if (item.featured) tags.append(tag('featured'));
      copy.append(title, summary, tags);

      const actions = document.createElement('div');
      actions.className = 'adm-row-actions';
      actions.append(
        iconButton(`Move ${item.title} up`, icons.up, () => moveItem(index, -1), { disabled: index === 0 || filtering, text: 'Up' }),
        iconButton(`Move ${item.title} down`, icons.down, () => moveItem(index, 1), { disabled: index === workItems.length - 1 || filtering, text: 'Down' }),
        iconButton(`Edit ${item.title}`, icons.edit, () => openEditor(item), { text: 'Edit' }),
        iconButton(`Delete ${item.title}`, icons.trash, () => removeItem(item), { danger: true, text: 'Delete' })
      );
      row.append(thumb, copy, actions);
      itemsEl.append(row);
    });
  }

  async function moveItem(index, delta) {
    const otherIndex = index + delta;
    const a = workItems[index];
    const b = workItems[otherIndex];
    if (!a || !b) return;
    const aPosition = Number.isFinite(a.position) ? a.position : index;
    const bPosition = Number.isFinite(b.position) ? b.position : otherIndex;
    try {
      await Promise.all([
        sb.update('work_items', `id=eq.${encodeURIComponent(a.id)}`, { position: bPosition }),
        sb.update('work_items', `id=eq.${encodeURIComponent(b.id)}`, { position: aPosition })
      ]);
      [workItems[index], workItems[otherIndex]] = [b, a];
      workItems[index].position = aPosition;
      workItems[otherIndex].position = bPosition;
      renderWork();
      toast('Order saved.');
    } catch (err) {
      toast(`Order was not saved. ${err.message}`, true);
      await loadWork();
    }
  }

  async function removeItem(item) {
    if (!confirm(`Delete “${item.title}”? This also removes its cover and gallery images.`)) return;
    try {
      await sb.remove('work_items', `id=eq.${encodeURIComponent(item.id)}`);
      const cleanupFailures = [];
      if (item.image_path) {
        try { await sb.removeFile('work', item.image_path); } catch (error) { cleanupFailures.push(error); }
      }
      try {
        const rows = await sb.select('settings', 'key=eq.work.enhancements&select=value');
        const extras = rows?.[0]?.value && typeof rows[0].value === 'object' ? rows[0].value : {};
        const media = Array.isArray(extras[item.slug]?.gallery_paths) ? extras[item.slug].gallery_paths : [];
        for (const path of media) {
          try { await sb.removeFile('work', path); } catch (error) { cleanupFailures.push(error); }
        }
        if (Object.prototype.hasOwnProperty.call(extras, item.slug)) {
          delete extras[item.slug];
          await sb.upsert('settings', [{ key: 'work.enhancements', value: extras, is_public: true }]);
        }
      } catch (error) {
        cleanupFailures.push(error);
      }
      workItems = workItems.filter(row => row.id !== item.id);
      renderWork();
      toast(cleanupFailures.length ? 'Project deleted, but some media cleanup needs attention.' : 'Project and stored media deleted.', cleanupFailures.length > 0);
      if (editing?.id === item.id) {
        editing = null;
        showView('work', { routeMode: 'replace' });
      }
    } catch (err) {
      toast(`Delete failed. ${err.message}`, true);
      await loadWork();
    }
  }

  function slugify(value) {
    return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    q('#preview').classList.add('adm-hide');
    q('#preview').removeAttribute('src');
    q('#dropText').classList.remove('adm-hide');
  }

  function setPreview(src, alt = '') {
    q('#preview').src = src;
    q('#preview').alt = alt;
    q('#preview').classList.remove('adm-hide');
    q('#dropText').classList.add('adm-hide');
  }

  function openEditor(item = null, { routeMode = 'push' } = {}) {
    editing = item ? { ...item } : null;
    imageFile = null;
    slugTouched = !!item;
    clearPreview();
    editor.reset();
    q('#editorTitle').textContent = item ? `Edit ${item.title}` : 'New item';
    q('#f-title').value = item?.title || '';
    q('#f-slug').value = item?.slug || '';
    q('#f-kicker').value = item?.kicker || '';
    q('#f-status').value = item?.status || '';
    q('#f-category').value = item?.category || 'product';
    q('#f-link').value = item?.link_url || '';
    q('#f-summary').value = item?.summary || '';
    q('#f-alt').value = item?.image_alt || '';
    q('#f-featured').checked = !!item?.featured;
    q('#f-published').checked = !!item?.published;
    updateFeaturedHelp();
    q('#deleteItem').classList.toggle('adm-hide', !item);
    if (item?.image_path) setPreview(sb.publicUrl('work', item.image_path), item.image_alt || '');
    dirty.delete('editor');
    showView('editor', { routeMode, item: item?.slug || 'new' });
    q('#f-title').focus();
  }

  q('#newItem').addEventListener('click', () => openEditor());
  q('#cancelItem').addEventListener('click', () => {
    if (dirty.has('editor') && !confirm('Discard this edit?')) return;
    dirty.delete('editor');
    showView('work', { routeMode: 'push' });
  });
  q('#deleteItem').addEventListener('click', () => editing && removeItem(editing));

  editor.addEventListener('input', e => {
    dirty.add('editor');
    if (e.target === q('#f-title') && !slugTouched) q('#f-slug').value = slugify(e.target.value);
    if (e.target === q('#f-slug') && e.isTrusted) slugTouched = true;
    if (e.target === q('#f-featured') || e.target === q('#f-published')) updateFeaturedHelp();
  });

  const drop = q('#drop');
  const fileInput = q('#f-image');
  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  ['dragenter', 'dragover'].forEach(type => drop.addEventListener(type, e => {
    e.preventDefault(); drop.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach(type => drop.addEventListener(type, e => {
    e.preventDefault(); drop.classList.remove('over');
  }));
  drop.addEventListener('drop', e => chooseImage(e.dataTransfer.files[0]));
  fileInput.addEventListener('change', () => chooseImage(fileInput.files[0]));

  function chooseImage(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Choose an image file.', true);
    if (file.size > 5 * 1024 * 1024) return toast('That image is over 5 MB. Choose a smaller file.', true);
    imageFile = file;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl, q('#f-alt').value);
    dirty.add('editor');
  }

  async function downscale(file) {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= 2000) { bitmap.close(); return file; }
    const scale = 2000 / longest;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d', { alpha: false }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return new Promise((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Image processing failed')),
      'image/webp', .88
    ));
  }

  function validateWork() {
    const competingFeatured = publishedFeatured(editing?.id);
    const checks = [
      [q('#f-title'), q('#f-title').value.trim(), 'Add a title.'],
      [q('#f-slug'), /^[a-z0-9-]+$/.test(q('#f-slug').value.trim()), 'Use only lowercase letters, numbers, and hyphens in the slug.'],
      [q('#f-link'), !q('#f-link').value.trim() || /^(https:\/\/|\/)/.test(q('#f-link').value.trim()), 'The link must start with https:// or /.'],
      [q('#f-alt'), !(imageFile || editing?.image_path) || q('#f-alt').value.trim(), 'Add image alt text.']
    ];
    for (const [field, valid, message] of checks) {
      field.setCustomValidity(valid ? '' : message);
      if (!valid) { field.reportValidity(); field.focus(); return false; }
    }
    if (q('#f-featured').checked && q('#f-published').checked && competingFeatured.length >= FEATURED_LIMIT) {
      toast(`The homepage already has ${FEATURED_LIMIT} projects: ${competingFeatured.map(item => item.title).join(', ')}. Remove one from the homepage first.`, true);
      q('#f-featured').focus();
      return false;
    }
    return true;
  }

  editor.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validateWork()) return;
    const button = q('#saveItem');
    pending(button, true);
    let uploadedPath = null;
    try {
      if (imageFile) {
        const blob = await downscale(imageFile);
        const ext = blob.type === 'image/webp' ? 'webp' : (imageFile.name.split('.').pop() || 'jpg').toLowerCase();
        uploadedPath = `work/${q('#f-slug').value.trim()}-${Date.now()}.${ext}`;
        const progress = q('#uploadProgress');
        progress.classList.remove('adm-hide');
        await sb.upload('work', uploadedPath, blob, value => q('i', progress).style.width = `${value}%`);
      }
      const row = {
        title: q('#f-title').value.trim(),
        slug: q('#f-slug').value.trim(),
        kicker: q('#f-kicker').value.trim() || null,
        status: q('#f-status').value.trim() || null,
        category: q('#f-category').value,
        link_url: q('#f-link').value.trim() || null,
        summary: q('#f-summary').value.trim() || null,
        image_alt: q('#f-alt').value.trim() || null,
        image_path: uploadedPath || editing?.image_path || null,
        featured: q('#f-featured').checked,
        published: q('#f-published').checked
      };
      if (editing) {
        const result = await sb.update('work_items', `id=eq.${encodeURIComponent(editing.id)}`, row);
        if (uploadedPath && editing.image_path && editing.image_path !== uploadedPath) await sb.removeFile('work', editing.image_path);
        editing = result?.[0] || { ...editing, ...row };
      } else {
        row.position = workItems.length ? Math.max(...workItems.map(x => x.position || 0)) + 1 : 0;
        const result = await sb.insert('work_items', row);
        editing = result?.[0] || row;
      }
      dirty.delete('editor');
      q('#uploadProgress').classList.add('adm-hide');
      q('#uploadProgress i').style.width = '0';
      await loadWork();
      showView('work', { routeMode: 'replace' });
      toast('Work item saved.');
    } catch (err) {
      if (uploadedPath) {
        try { await sb.removeFile('work', uploadedPath); } catch {}
      }
      toast(`Save failed. ${err.message}`, true);
    } finally {
      pending(button, false);
    }
  });

  // ------------------------------------------------------------ site copy
  let copyRows = [];
  async function loadCopy() {
    const form = q('#copyForm');
    try {
      copyRows = await sb.select('settings', 'key=like.copy.%25&select=key,value,is_public&order=key.asc');
      const currentPrices = {
        'copy.pricing.website': { legacy: ['$750', '$150'], value: '$500' },
        'copy.pricing.platform': { legacy: ['$1,500'], value: '$2,500' },
        'copy.pricing.system': { legacy: ['$3,500'], value: '$5,000' }
      };
      const priceMigrations = copyRows.flatMap(row => {
        const rule = currentPrices[row.key];
        if (!rule || !rule.legacy.includes(row.value)) return [];
        row.value = rule.value;
        return [{ key: row.key, value: row.value, is_public: true }];
      });
      if (priceMigrations.length) await sb.upsert('settings', priceMigrations);
      form.replaceChildren();
      copyRows.forEach(row => {
        const wrap = document.createElement('div');
        const label = document.createElement('label');
        label.htmlFor = `copy-${row.key}`;
        label.textContent = row.key.split('.').slice(1).join(' · ');
        const key = document.createElement('code');
        key.className = 'adm-key';
        key.textContent = row.key;
        label.append(key);
        const value = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
        const field = value.length > 80 ? document.createElement('textarea') : document.createElement('input');
        field.id = `copy-${row.key}`;
        if (field instanceof HTMLInputElement) field.type = 'text';
        field.value = value;
        field.dataset.key = row.key;
        field.dataset.original = value;
        field.addEventListener('input', () => {
          dirty.add('copy');
          saveState(q('#saveCopy'), true);
        });
        wrap.append(label, field);
        form.append(wrap);
      });
      if (!copyRows.length) form.append(empty('No copy.* settings exist yet. Add rows in Supabase and they will appear here automatically.'));
      saveState(q('#saveCopy'), false);
    } catch (err) {
      form.replaceChildren(empty(`Site copy could not be loaded. ${err.message}`));
    }
  }

  q('#saveCopy').addEventListener('click', async () => {
    const changed = qa('[data-key]', q('#copyForm')).filter(el => el.value !== el.dataset.original);
    if (!changed.length) return toast('No copy changes to save.');
    const button = q('#saveCopy');
    pending(button, true);
    try {
      await sb.upsert('settings', changed.map(el => ({ key: el.dataset.key, value: el.value, is_public: true })));
      changed.forEach(el => { el.dataset.original = el.value; });
      dirty.delete('copy');
      toast('Site copy saved.');
    } catch (err) {
      toast(`Copy was not saved. ${err.message}`, true);
    } finally {
      pending(button, false);
      saveState(button, dirty.has('copy'));
    }
  });

  // ------------------------------------------------- rebuild for search
  // Publishing reaches visitors immediately and search engines only at the
  // next deploy, so this closes that gap without leaving the dashboard.
  q('#refreshSnapshot')?.addEventListener('click', async () => {
    const button = q('#refreshSnapshot');
    const status = q('#refreshStatus');
    status.textContent = '';
    pending(button, true, 'starting');
    try {
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sb.session.token || ''}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'The rebuild could not be started.');
      status.textContent = data.message || 'Rebuild started.';
      toast('Rebuild started.');
    } catch (err) {
      status.textContent = err.message;
      toast(err.message, true);
    } finally {
      pending(button, false);
      button.disabled = false;
    }
  });

  // ------------------------------------------------------- exempt addresses
  // Accepts newlines or commas, because both are what people actually paste.
  // Anything that is not an IPv4 or IPv6 address is dropped rather than saved,
  // since a typo here silently fails to exempt rather than announcing itself.
  const IP_SHAPE = /^(\d{1,3}(\.\d{1,3}){3}|[0-9a-f:]{3,45})$/i;
  const exemptList = value => [...new Set(
    String(value || '').split(/[\s,]+/).map(s => s.trim()).filter(s => IP_SHAPE.test(s))
  )];

  // ------------------------------------------------------------- socials
  // Icons ship with the site, so the platforms are fixed. You type the handle;
  // the full URL is built from the pattern. Pasting a whole URL still works and
  // is kept verbatim, which is the escape hatch for a profile that does not fit
  // the usual shape. What gets stored is always the finished link, so the site
  // and the guide never need to know about any of this.
  const SOCIAL_PLATFORMS = [
    ['linkedin',  'LinkedIn',  'https://www.linkedin.com/in/%s/',        'abatchan'],
    ['github',    'GitHub',    'https://github.com/%s',                  'AbatChan'],
    ['x',         'X',         'https://x.com/%s',                       'abat_chan'],
    ['instagram', 'Instagram', 'https://www.instagram.com/%s/',          'realabatchan'],
    ['tiktok',    'TikTok',    'https://www.tiktok.com/@%s',             'realabatchan'],
    ['youtube',   'YouTube',   'https://www.youtube.com/@%s',            'abatchan'],
    ['facebook',  'Facebook',  'https://www.facebook.com/%s',            'abat.chan.2025'],
    ['behance',   'Behance',   'https://www.behance.net/%s',             'abatchan'],
    ['dribbble',  'Dribbble',  'https://dribbble.com/%s',                'abatchan'],
    ['upwork',    'Upwork',    'https://www.upwork.com/freelancers/%s',  'abatchan'],
    ['whatsapp',  'WhatsApp',  'https://wa.me/%s',                       '0704 185 7921']
  ];
  const PLATFORM = Object.fromEntries(SOCIAL_PLATFORMS.map(p => [p[0], { label: p[1], pattern: p[2], sample: p[3] }]));

  // wa.me wants bare digits with a country code and no plus.
  //
  // "+44 7700 900123" and "0044 7700 900123" both already carry their country,
  // so they work anywhere. A bare "0704…" does not, and the only sane guess is
  // the country the studio is in — which is the one assumption here. Any other
  // country needs the + or 00 form, and the preview under the field shows the
  // result either way, so a wrong guess is visible before it is saved.
  const HOME_DIALLING_CODE = '234';
  const waDigits = value => {
    // "+44 (0)7700 900123" means dial 07700 at home or +44 7700 abroad. Keeping
    // that bracketed trunk 0 produces a number that does not exist.
    const raw = String(value).trim().replace(/\(\s*0\s*\)/g, '');
    let digits = raw.replace(/\D/g, '');
    if (raw.startsWith('+')) return digits;
    if (digits.startsWith('00')) return digits.slice(2);
    if (digits.startsWith('0')) return `${HOME_DIALLING_CODE}${digits.slice(1)}`;
    return digits;
  };

  const socialHref = (slug, raw) => {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (slug === 'whatsapp') {
      const digits = waDigits(value);
      return digits ? `https://wa.me/${digits}` : '';
    }
    const handle = value.replace(/^@+/, '').replace(/^\/+|\/+$/g, '');
    return handle ? PLATFORM[slug].pattern.replace('%s', encodeURIComponent(handle)) : '';
  };

  // Show the saved link back as the handle it came from, so the field reads the
  // way it was typed rather than as a URL that has to be re-parsed by eye.
  const socialHandle = (slug, href) => {
    if (!href) return '';
    if (slug === 'whatsapp') return (href.match(/wa\.me\/(\d+)/) || [, href])[1];
    const [prefix, suffix] = PLATFORM[slug].pattern.split('%s');
    if (!href.startsWith(prefix)) return href;
    let rest = href.slice(prefix.length);
    if (suffix && rest.endsWith(suffix)) rest = rest.slice(0, -suffix.length);
    try { rest = decodeURIComponent(rest); } catch { /* leave as written */ }
    return rest;
  };

  async function loadSocials() {
    const form = q('#socialsForm');
    if (!form) return;
    let saved = {};
    let hasSaved = false;
    try {
      const rows = await sb.select('settings', 'key=eq.social.links&select=value');
      const stored = rows?.[0]?.value;
      if (Array.isArray(stored)) {
        hasSaved = true;
        saved = Object.fromEntries(stored
          .map(row => Array.isArray(row) ? row : [row?.slug, row?.label, row?.href])
          .filter(([slug]) => slug)
          .map(([slug, , href]) => [slug, href || '']));
      }
    } catch (err) {
      toast(`Social links could not be loaded. ${err.message}`, true);
      return;
    }
    // Nothing saved yet means the site is rendering its built-in list, so the
    // fields start on those handles. Showing them empty would claim every
    // profile is hidden while the footer is plainly displaying all of them.
    // An explicitly saved [] is different: it means the owner hid every link.

    form.innerHTML = '';
    for (const [slug, label, , sample] of SOCIAL_PLATFORMS) {
      const wrap = document.createElement('div');
      const field = document.createElement('input');
      field.type = 'text';
      field.id = `soc-${slug}`;
      field.dataset.slug = slug;
      field.dataset.label = label;
      field.placeholder = slug === 'whatsapp' ? sample : `@${sample}`;
      field.value = hasSaved ? socialHandle(slug, saved[slug] ?? '') : sample;
      field.autocomplete = 'off';
      field.spellcheck = false;

      // The built link, shown as you type, so there is no guessing about what
      // a handle turns into or whether it is the right one.
      const preview = document.createElement('p');
      preview.className = 'adm-field-help adm-social-preview';
      const paint = () => {
        const href = socialHref(slug, field.value);
        preview.textContent = href || (field.value.trim() ? 'not a usable handle yet' : 'hidden');
        preview.classList.toggle('is-off', !href);
      };
      field.addEventListener('input', () => {
        paint();
        dirty.add('socials');
        saveState(q('#saveSocials'), true);
      });
      paint();

      const tag = document.createElement('label');
      tag.setAttribute('for', field.id);
      tag.textContent = slug === 'whatsapp' ? `${label} number` : `${label} username`;
      wrap.append(tag, field, preview);
      if (slug === 'whatsapp') {
        const hint = document.createElement('p');
        hint.className = 'adm-field-help';
        hint.textContent = `A number starting 0 is read as +${HOME_DIALLING_CODE}. For any other country, start with + or 00.`;
        wrap.append(hint);
      }
      form.append(wrap);
    }
    saveState(q('#saveSocials'), false);
  }

  q('#saveSocials')?.addEventListener('click', async () => {
    const button = q('#saveSocials');
    const bad = qa('#socialsForm input').find(el => el.value.trim() && !socialHref(el.dataset.slug, el.value));
    if (bad) {
      toast(bad.dataset.slug === 'whatsapp'
        ? 'WhatsApp needs a phone number.'
        : `${bad.dataset.label} needs a username, or a full https:// link.`, true);
      bad.focus();
      return;
    }
    pending(button, true);
    try {
      const links = qa('#socialsForm input')
        .map(el => ({ slug: el.dataset.slug, label: el.dataset.label, href: socialHref(el.dataset.slug, el.value) }))
        .filter(row => row.href);
      await sb.upsert('settings', [{ key: 'social.links', value: links, is_public: true }]);
      dirty.delete('socials');
      toast(links.length ? 'Social profiles saved.' : 'All social profiles hidden.');
    } catch (err) {
      toast(`Social profiles were not saved. ${err.message}`, true);
    } finally {
      pending(button, false);
      saveState(button, dirty.has('socials'));
    }
  });

  // ------------------------------------------------------------ assistant
  let assistantRows = {};
  const DEFAULT_SUGGESTIONS = [
    { label: 'What makes Nika different?', description: 'See the four core moves' },
    { label: 'How does WordPress setup work?', description: 'Review the installation steps' },
    { label: 'Show me the product plans', description: 'Compare Personal, Business, and Agency' }
  ];
  const CANONICAL_OWNER_PROMPT = 'Sound like a warm, practical studio guide rather than a support script. Lead with the answer, keep it concise, and give one useful next step. Refer to the owner as Abat. Prices are starting points, never quotes. If a visitor needs a human decision or a fact you do not have, say so plainly and point them to the contact page.';
  const normalizeSuggestions = value => {
    if (typeof value === 'string') try { value = JSON.parse(value); } catch { value = []; }
    if (!Array.isArray(value)) value = [];
    const cleaned = value.slice(0, 3).map(item => typeof item === 'string'
      ? { label: item.trim(), description: '' }
      : { label: String(item?.label || '').trim(), description: String(item?.description || '').trim() }
    ).filter(item => item.label);
    return cleaned.length ? cleaned : DEFAULT_SUGGESTIONS;
  };
  const paintSuggestions = value => normalizeSuggestions(value).forEach((item, index) => {
    q(`#a-suggestion-${index + 1}-label`).value = item.label;
    q(`#a-suggestion-${index + 1}-description`).value = item.description;
  });
  const readSuggestions = () => [1, 2, 3].map(index => {
    const label = q(`#a-suggestion-${index}-label`).value.trim();
    const description = q(`#a-suggestion-${index}-description`).value.trim();
    return label ? { label, description, question: label } : null;
  }).filter(Boolean);
  async function loadAssistant() {
    try {
      const rows = await sb.select('settings', 'key=like.assistant.%25&select=key,value,is_public');
      assistantRows = Object.fromEntries(rows.map(row => [row.key, row.value]));
      const suggestions = normalizeSuggestions(assistantRows['assistant.suggestions']);
      const ownerPrompt = !assistantRows['assistant.system'] || String(assistantRows['assistant.system']).includes('Websites start at $750')
        ? CANONICAL_OWNER_PROMPT
        : assistantRows['assistant.system'];
      const migrations = [];
      if (!assistantRows['assistant.suggestions']) migrations.push({ key: 'assistant.suggestions', value: suggestions, is_public: true });
      if (ownerPrompt !== assistantRows['assistant.system']) migrations.push({ key: 'assistant.system', value: ownerPrompt, is_public: false });
      if (migrations.length) await sb.upsert('settings', migrations);
      q('#a-enabled').checked = assistantRows['assistant.enabled'] !== false;
      paintSuggestions(suggestions);
      q('#a-system').value = ownerPrompt;
      q('#a-model').value = assistantRows['assistant.model'] === 'deepseek-chat'
        ? 'deepseek-v4-flash'
        : (assistantRows['assistant.model'] || 'deepseek-v4-flash');
      const exempt = assistantRows['assistant.exempt_ips'];
      q('#a-exempt').value = Array.isArray(exempt) ? exempt.join('\n') : String(exempt || '');
      qa('#assistantForm input,#assistantForm textarea').forEach(el => {
        if (el === q('#a-enabled') || el === q('#a-test')) return;
        el.addEventListener('input', () => {
          dirty.add('assistant');
          saveState(q('#saveAssistant'), true);
        });
      });
      q('#a-enabled').addEventListener('change', async event => {
        const field = event.currentTarget;
        const next = field.checked;
        field.disabled = true;
        try {
          await sb.upsert('settings', [{ key: 'assistant.enabled', value: next, is_public: true }]);
          toast(next ? 'Assistant is visible on the site.' : 'Assistant is hidden from the site.');
        } catch (err) {
          field.checked = !next;
          toast(`Assistant visibility was not updated. ${err.message}`, true);
        } finally {
          field.disabled = false;
        }
      });
      saveState(q('#saveAssistant'), false);
    } catch (err) {
      toast(`Assistant settings could not be loaded. ${err.message}`, true);
    }
  }

  q('#saveAssistant').addEventListener('click', async () => {
    const button = q('#saveAssistant');
    pending(button, true);
    try {
      await sb.upsert('settings', [
        { key: 'assistant.enabled', value: q('#a-enabled').checked, is_public: true },
        { key: 'assistant.suggestions', value: readSuggestions(), is_public: true },
        { key: 'assistant.system', value: q('#a-system').value.trim(), is_public: false },
        { key: 'assistant.model', value: q('#a-model').value.trim(), is_public: false },
        // Private: this list is what turns the daily ceiling off.
        { key: 'assistant.exempt_ips', value: exemptList(q('#a-exempt').value), is_public: false }
      ]);
      dirty.delete('assistant');
      toast('Assistant settings saved.');
    } catch (err) {
      toast(`Assistant settings were not saved. ${err.message}`, true);
    } finally {
      pending(button, false);
      saveState(button, dirty.has('assistant'));
    }
  });

  q('#testAssistant').addEventListener('click', async () => {
    const message = q('#a-test').value.trim();
    if (!message) return q('#a-test').focus();
    const button = q('#testAssistant');
    pending(button, true, 'sending');
    q('#a-test-output').textContent = 'Waiting for the assistant…';
    try {
      const res = await fetch('/api/chat-stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, page: '/' }) });
      if (!res.ok) {
        let issue = {};
        try { issue = (await res.json())?.error || {}; } catch {}
        q('#a-test-output').textContent = [issue.title, issue.message].filter(Boolean).join(' ') || 'The assistant could not reply just now.';
        return;
      }
      q('#a-test-output').textContent = (await res.text()).trim() || 'No reply returned.';
    } catch (err) {
      q('#a-test-output').textContent = err.message;
    } finally {
      pending(button, false);
    }
  });

  // --------------------------------------------------------- announcements
  let announcements = [];
  const markAnnouncementsDirty = () => {
    dirty.add('announcements');
    saveState(q('#saveAnnouncements'), true);
  };
  async function loadAnnouncements() {
    try {
      const rows = await sb.select('settings', 'key=eq.news.items&select=key,value,is_public');
      announcements = Array.isArray(rows?.[0]?.value) ? structuredClone(rows[0].value) : [];
      renderAnnouncements();
      saveState(q('#saveAnnouncements'), false);
    } catch (err) {
      q('#announcementList').replaceChildren(empty(`Announcements could not be loaded. ${err.message}`));
    }
  }

  function newsField(item, index, name, labelText, long = false) {
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.htmlFor = `news-${index}-${name}`;
    label.textContent = labelText;
    const field = long ? document.createElement('textarea') : document.createElement('input');
    if (!long) field.type = 'text';
    field.id = `news-${index}-${name}`;
    field.value = item[name] || '';
    field.addEventListener('input', () => {
      announcements[index][name] = field.value;
      markAnnouncementsDirty();
      renderNewsPreview(index);
    });
    wrap.append(label, field);
    return wrap;
  }

  let newsTools = null;
  function renderAnnouncements() {
    const list = q('#announcementList');
    if (!newsTools && window.admListTools) {
      newsTools = admListTools({
        label: 'announcements',
        text: item => [item.title, item.body, item.cta_label, item.cta_href].filter(Boolean).join(' '),
        onChange: () => renderAnnouncements()
      });
      list.before(newsTools.element);
    }
    list.replaceChildren();
    newsTools?.sync(announcements.length);
    if (!announcements.length) list.append(empty('No announcement is active. Add one when there is something genuinely new to show.'));
    // Index must stay the true position: every handler writes announcements[index].
    const shown = announcements
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !newsTools || newsTools.matches(item));
    if (announcements.length && !shown.length) list.append(empty('Nothing matches that filter.'));
    shown.forEach(({ item, index }) => {
      const card = document.createElement('article');
      card.className = 'adm-news-item';
      card.dataset.index = index;
      const top = document.createElement('div');
      top.className = 'adm-news-top';
      const strong = document.createElement('strong');
      strong.textContent = item.title || `Announcement ${index + 1}`;
      const soonLabel = document.createElement('label');
      soonLabel.className = 'adm-switch';
      const soon = document.createElement('input');
      soon.type = 'checkbox';
      soon.checked = !!item.soon;
      soon.addEventListener('change', () => { announcements[index].soon = soon.checked; markAnnouncementsDirty(); renderNewsPreview(index); });
      const soonTrack = document.createElement('span');
      soonTrack.className = 'adm-switch-track';
      soonTrack.setAttribute('aria-hidden', 'true');
      const soonText = document.createElement('span');
      soonText.textContent = 'coming soon';
      soonLabel.append(soon, soonTrack, soonText);
      const remove = iconButton(`Remove ${strong.textContent}`, icons.trash, () => {
        announcements.splice(index, 1);
        markAnnouncementsDirty();
        renderAnnouncements();
      }, { danger: true });
      top.append(strong, soonLabel, remove);
      const row1 = document.createElement('div');
      row1.className = 'adm-two';
      row1.append(newsField(item, index, 'id', 'id'), newsField(item, index, 'tag', 'tag'));
      const row2 = document.createElement('div');
      row2.className = 'adm-two';
      row2.append(newsField(item, index, 'title', 'title'), newsField(item, index, 'cta', 'button label'));
      const row3 = document.createElement('div');
      row3.className = 'adm-two';
      row3.append(newsField(item, index, 'href', 'button link'), newsField(item, index, 'body', 'body', true));
      const preview = document.createElement('div');
      preview.className = 'adm-news-preview';
      preview.dataset.preview = index;
      card.append(top, row1, row2, row3, preview);
      list.append(card);
      renderNewsPreview(index);
    });
  }

  function renderNewsPreview(index) {
    const item = announcements[index];
    const preview = q(`[data-preview="${index}"]`);
    if (!preview || !item) return;
    preview.replaceChildren();
    const tagText = document.createElement('span');
    tagText.textContent = item.tag || (item.soon ? 'coming soon' : "what's new");
    const title = document.createElement('h3');
    title.textContent = item.title || 'Announcement title';
    const body = document.createElement('p');
    body.textContent = item.body || 'Keep this short enough to scan without covering the page.';
    preview.append(tagText, title, body);
  }

  q('#addAnnouncement').addEventListener('click', () => {
    announcements.push({
      id: `${new Date().toISOString().slice(0, 10)}-new`,
      tag: "what's new",
      title: '',
      body: '',
      href: '',
      cta: '',
      soon: false
    });
    markAnnouncementsDirty();
    renderAnnouncements();
    q('#announcementList .adm-news-item:last-child input')?.focus();
  });

  q('#saveAnnouncements').addEventListener('click', async () => {
    for (let i = 0; i < announcements.length; i++) {
      if (!announcements[i].id.trim() || !announcements[i].title.trim() || !announcements[i].body.trim()) {
        toast(`Announcement ${i + 1} needs an ID, title, and body.`, true);
        q(`#news-${i}-id`)?.focus();
        return;
      }
      if (announcements[i].href.trim() && !/^(https:\/\/|\/)/.test(announcements[i].href.trim())) {
        toast(`Announcement ${i + 1} link must start with https:// or /.`, true);
        q(`#news-${i}-href`)?.focus();
        return;
      }
    }
    const button = q('#saveAnnouncements');
    pending(button, true);
    try {
      await sb.upsert('settings', [{ key: 'news.items', value: announcements, is_public: true }]);
      dirty.delete('announcements');
      toast('Announcements saved.');
    } catch (err) {
      toast(`Announcements were not saved. ${err.message}`, true);
    } finally {
      pending(button, false);
      saveState(button, dirty.has('announcements'));
    }
  });

  // --------------------------------------------------------------- startup
  (async () => {
    if (!window.sb?.configured?.()) {
      gateMsg.textContent = 'Connect Supabase in supabase-config.js before signing in.';
      loginBtn.disabled = true;
      return;
    }
    const recovery = sb.consumeRecoveryUrl();
    if (recovery?.error) {
      sb.session.set(null);
      gateMsg.textContent = 'That recovery link is invalid or expired. Request a new one and use only the newest email.';
      return;
    }
    if (recovery?.recovery) {
      showRecovery();
      return;
    }
    if (!sb.session.get()) return;
    try { await showApp(await sb.user()); }
    catch { showGate(); }
  })();
})();
