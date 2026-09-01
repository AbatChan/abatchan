(function () {
  'use strict';

  const feedback = document.querySelector('.nika-feedback');
  const dismissFeedback = document.querySelector('.nika-feedback__dismiss');
  if (dismissFeedback && feedback) dismissFeedback.addEventListener('click', () => feedback.remove());
  if (feedback && feedback.querySelector('.nika-feedback__message')) window.setTimeout(() => feedback.remove(), 6000);
  if (!window.NikaAdmin) return;

  const form = document.querySelector('form.nika-shell');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const request = (url, options) => fetch(url, Object.assign({
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.NikaAdmin.nonce }
  }, options || {}));
  const byName = (suffix) => form && form.querySelector(`[name$="[${suffix}]"]`);
  const escapeText = (text) => String(text == null ? '' : text).replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]);
  const escapeAttribute = (text) => escapeText(text).replace(/"/g, '&quot;');

  /* Fields that only matter for one choice ---------------------------------- */

  const conditionals = [...document.querySelectorAll('[data-nika-when]')];
  const syncConditionals = () => {
    conditionals.forEach((field) => {
      const source = byName(field.dataset.nikaWhen);
      if (!source) return;
      const shown = field.dataset.nikaChecked ? source.checked : source.value === field.dataset.nikaEquals;
      field.hidden = !shown;
    });
  };
  if (form && conditionals.length) {
    form.addEventListener('change', syncConditionals);
    syncConditionals();
  }

  /* Header logo and bubble icon --------------------------------------------- */

  document.querySelectorAll('[data-nika-image]').forEach((field) => {
    const input = field.querySelector('.nika-image__input');
    const preview = field.querySelector('.nika-image__preview');
    const image = preview && preview.querySelector('img');
    const clear = field.querySelector('.nika-image__clear');
    const choose = field.querySelector('.nika-image__choose');
    if (!input || !preview || !image || !clear || !choose) return;
    const fallback = image.getAttribute('src');

    const size = field.querySelector('.nika-image__size input');
    const sync = () => {
      const value = input.value.trim();
      const shown = value || fallback;
      // The preview shows what a visitor gets, which is the bundled mark when
      // the field is empty and nothing at all when there is no default.
      const isLauncher = preview.classList.contains('nika-image__preview--launch');
      image.src = shown;
      image.hidden = !shown;
      preview.hidden = !shown && !isLauncher;
      preview.classList.toggle('is-default-glyph', isLauncher && !shown);
      clear.hidden = !value;
      if (size && size.value) {
        // Scale the tile's contents the way the guide will.
        const px = Math.min(Number(size.max) || 44, Math.max(Number(size.min) || 14, Number(size.value)));
        image.style.width = `${px}px`;
        image.style.height = preview.classList.contains('nika-image__preview--launch') ? `${px}px` : 'auto';
      }
      if (preview.classList.contains('nika-image__preview--launch')) {
        const from = (byName('gradient_from') || {}).value || '#8184ff';
        const to = (byName('gradient_to') || {}).value || '#4338ca';
        const accent = (byName('accent') || {}).value || '#6366f1';
        preview.style.background = `linear-gradient(150deg, ${from}, ${accent} 55%, ${to})`;
      } else {
        const colour = (byName('panel_colour') || {}).value || '#0f0f12';
        preview.style.background = colour;
      }
    };
    if (size) size.addEventListener('input', sync);
    if (form) form.addEventListener('input', (event) => { if (event.target !== input) sync(); });
    input.addEventListener('input', sync);
    clear.addEventListener('click', () => {
      input.value = '';
      sync();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    let picker;
    choose.addEventListener('click', () => {
      if (!window.wp || !window.wp.media) return input.focus();
      if (!picker) {
        picker = window.wp.media({ title: choose.textContent, library: { type: 'image' }, button: { text: choose.textContent }, multiple: false });
        picker.on('select', () => {
          const chosen = picker.state().get('selection').first();
          const sizes = chosen && chosen.get('sizes');
          const url = (sizes && (sizes.medium || sizes.full) || {}).url || (chosen && chosen.get('url'));
          if (!url) return;
          input.value = url;
          sync();
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }
      picker.open();
    });
  });

  /* Collapsible sections ----------------------------------------------------- */

  // Long pages are easier to work through a section at a time. Visibility is a
  // per-administrator convenience, so it is remembered locally and every section
  // is open again if that memory is unavailable.
  const collapsible = [...document.querySelectorAll('.nika-card[id]')].filter((card) => card.querySelector('.nika-card__head h2'));
  if (collapsible.length) {
    let closed = [];
    try { closed = JSON.parse(window.localStorage.getItem('nika.admin.closed') || '[]'); } catch {}
    if (!Array.isArray(closed)) closed = [];
    const remember = () => {
      try { window.localStorage.setItem('nika.admin.closed', JSON.stringify(closed)); } catch {}
    };
    collapsible.forEach((card) => {
      const head = card.querySelector('.nika-card__head');
      const heading = head.querySelector('h2');
      const rest = [...card.children].filter((child) => child !== head);
      if (!rest.length) return;
      // The body moves into one wrapper so its height can be animated without
      // anyone having to know how tall it is.
      const body = document.createElement('div');
      body.className = 'nika-card__body';
      const inner = document.createElement('div');
      inner.className = 'nika-card__inner';
      inner.append(...rest);
      body.append(inner);
      card.append(body);
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'nika-card__toggle';
      toggle.innerHTML = '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" focusable="false"><path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
      const id = card.id;
      const apply = (open, animate) => {
        if (!animate) body.classList.add('is-instant');
        card.classList.toggle('is-collapsed', !open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} ${heading.textContent.trim()}`);
        // A collapsed section must leave the tab order as well as the view.
        body.inert = !open;
        if (!animate) requestAnimationFrame(() => body.classList.remove('is-instant'));
      };
      apply(!closed.includes(id), false);
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        apply(open, true);
        closed = closed.filter((entry) => entry !== id);
        if (!open) closed.push(id);
        remember();
      });
      head.append(toggle);
    });

    // A jump from the section list opens what it lands on, then scrolls to it.
    document.querySelectorAll('.nika-jump a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const card = document.querySelector(link.getAttribute('href'));
        if (!card) return;
        event.preventDefault();
        card.querySelector('.nika-card__toggle[aria-expanded="false"]')?.click();
        card.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', link.getAttribute('href'));
      });
    });
  }

  // A button whose result is inside a collapsed section has to open it, or the
  // owner clicks and sees nothing happen.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('button');
    if (!trigger || trigger.classList.contains('nika-card__toggle')) return;
    const card = trigger.closest('.nika-card.is-collapsed');
    card?.querySelector('.nika-card__toggle')?.click();
  }, true);

  /* Match the site's own palette -------------------------------------------- */

  // The theme's designer already chose these colours, so an owner starts from
  // their own site rather than from hex codes, then adjusts. Nothing is written
  // until they save, and the guide shows the result immediately.
  const matchTheme = document.querySelector('#nika-match-theme');
  const palette = window.NikaAdmin.themePalette || {};
  const paletteEntries = Object.entries(palette);
  if (form && matchTheme && paletteEntries.length) {
    matchTheme.hidden = false;
    const luminance = (hex) => {
      const value = hex.replace('#', '');
      const full = value.length === 3 ? value.split('').map((part) => part + part).join('') : value;
      const [r, g, b] = [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16) / 255);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const saturation = (hex) => {
      const value = hex.replace('#', '');
      const full = value.length === 3 ? value.split('').map((part) => part + part).join('') : value;
      const [r, g, b] = [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16) / 255);
      const high = Math.max(r, g, b);
      const low = Math.min(r, g, b);
      return high === 0 ? 0 : (high - low) / high;
    };
    const pick = (...wanted) => {
      for (const want of wanted) {
        const hit = paletteEntries.find(([slug, entry]) => slug.includes(want) || (entry.name || '').toLowerCase().includes(want));
        if (hit) return hit[1].color;
      }
      return '';
    };
    const pickAccent = () => {
      const colourful = paletteEntries
        .map(([slug, entry]) => ({ slug, name: (entry.name || '').toLowerCase(), color: entry.color }))
        .filter((entry) => saturation(entry.color) > 0.18 && luminance(entry.color) > 0.12 && luminance(entry.color) < 0.88);
      if (!colourful.length) return '';
      for (const want of ['primary', 'accent', 'brand', 'link', 'secondary']) {
        const hit = colourful.find((entry) => entry.slug.includes(want) || entry.name.includes(want));
        if (hit) return hit.color;
      }
      return colourful.sort((a, b) => saturation(b.color) - saturation(a.color))[0].color;
    };
    const darkest = () => paletteEntries.map(([, entry]) => entry.color).sort((a, b) => luminance(a) - luminance(b))[0] || '';
    const lightest = () => paletteEntries.map(([, entry]) => entry.color).sort((a, b) => luminance(b) - luminance(a))[0] || '';

    matchTheme.addEventListener('click', () => {
      const accent = pickAccent() || pick('primary', 'accent', 'brand', 'link') || paletteEntries[0][1].color;
      const surface = pick('background', 'base', 'dark', 'contrast') || darkest();
      const ink = pick('foreground', 'text', 'contrast') || lightest();
      // A dark panel needs light text on it, whatever the theme calls its pair.
      const readable = luminance(ink) > luminance(surface) ? ink : lightest();
      const apply = { accent, panel_colour: surface, gradient_from: accent, gradient_to: accent, scrollbar_colour: accent, shadow_colour: accent, text_colour: readable, icon_colour: readable };
      Object.entries(apply).forEach(([name, value]) => {
        if (!value) return;
        const field = byName(name);
        if (!field) return;
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  /* Reset appearance --------------------------------------------------------- */

  // Restores the look a fresh install has. It only touches appearance, so a
  // provider, key, instructions and limits are never lost to a stray click, and
  // nothing is written until the owner saves.
  const resetAppearance = document.querySelector('#nika-reset-appearance');
  if (form && resetAppearance) {
    let defaults = {};
    try { defaults = JSON.parse(resetAppearance.dataset.nikaDefaults || '{}'); } catch {}
    const resetLabel = resetAppearance.querySelector('span');
    const resetText = resetLabel ? resetLabel.textContent : '';
    resetAppearance.addEventListener('click', () => {
      Object.entries(defaults).forEach(([name, value]) => {
        const field = byName(name);
        if (!field) return;
        field.value = value === null || value === undefined ? '' : String(value);
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
      if (resetLabel) {
        resetLabel.textContent = 'Appearance reset. Save to apply.';
        window.setTimeout(() => { resetLabel.textContent = resetText; }, 4000);
      }
    });
  }

  /* Opacity readout --------------------------------------------------------- */

  const opacity = byName('panel_opacity');
  const opacityOut = opacity && opacity.parentElement.querySelector('output');
  if (opacity && opacityOut) {
    const syncOpacity = () => {
      opacityOut.textContent = `${opacity.value}%`;
      const min = Number(opacity.min) || 0;
      const span = (Number(opacity.max) || 100) - min;
      opacity.style.setProperty('--nika-fill', `${span ? ((Number(opacity.value) - min) / span) * 100 : 0}%`);
    };
    opacity.addEventListener('input', syncOpacity);
    syncOpacity();
  }

  /* Accent readout ---------------------------------------------------------- */

  // The hex beside the swatch is rendered server-side, so it has to follow the
  // picker or it keeps naming the saved colour while the widget shows the new one.
  ['accent', 'panel_colour', 'gradient_from', 'gradient_to', 'scrollbar_colour', 'shadow_colour', 'text_colour', 'icon_colour'].forEach((name) => {
    const picker = byName(name);
    const label = picker && picker.parentElement.querySelector('code');
    if (!picker || !label) return;
    const syncSwatch = () => { label.textContent = picker.value.toUpperCase(); };
    picker.addEventListener('input', syncSwatch);
    picker.addEventListener('change', syncSwatch);
  });

  /* Live preview ------------------------------------------------------------ */

  // The guide floats on this page exactly as it does on the site, from the same
  // files a visitor gets, and every edit is applied to it as it is typed.
  if (form && window.NikaAdmin.shell) {
    const value = (suffix) => {
      const el = byName(suffix);
      return el ? el.value.trim() : '';
    };
    const previewSettings = () => ({
      name: value('name') || 'Nika',
      siteName: document.title,
      subtitle: 'website guide',
      avatar: value('avatar') || window.NikaAdmin.bundledAvatar,
      launcherIcon: value('launcher_icon'),
      accent: value('accent') || '#6366f1',
      position: value('position'),
      panelColour: value('panel_colour'),
      panelOpacity: value('panel_opacity'),
      gradientFrom: value('gradient_from'),
      gradientTo: value('gradient_to'),
      scrollbarColour: value('scrollbar_colour'),
      shadowColour: value('shadow_colour'),
      textColour: value('text_colour'),
      iconColour: value('icon_colour'),
      customCss: value('custom_css'),
      logoSize: value('logo_size'),
      markSize: value('mark_size'),
      disclaimer: value('disclaimer') || "Answers use this website's configured content. Review important information.",
      placeholder: value('placeholder'),
      chips: [0, 1, 2].map((index) => ({
        label: (form.querySelector(`[name$="[suggestions][${index}][label]"]`) || {}).value || '',
        description: (form.querySelector(`[name$="[suggestions][${index}][description]"]`) || {}).value || ''
      })).filter((item) => item.label)
    });

    let guide;
    // A low-contrast choice is flagged, never overruled: the owner may have a
    // reason, and a settings box that rewrites what was typed is worse than an
    // unusual colour. The readable value is offered as one click instead.
    const contrastHint = (field, suggestion) => {
      if (!field) return;
      const wrap = field.closest('.nika-field');
      if (!wrap) return;
      let note = wrap.querySelector('.nika-field__contrast');
      if (!suggestion) { note?.remove(); return; }
      if (!note) {
        note = document.createElement('small');
        note.className = 'nika-field__contrast';
        wrap.append(note);
      }
      if (note.dataset.suggestion === suggestion) return;
      note.dataset.suggestion = suggestion;
      note.replaceChildren();
      note.append('This may be hard to read on your panel colour. ');
      const fix = document.createElement('button');
      fix.type = 'button';
      fix.className = 'nika-field__contrast-fix';
      fix.textContent = `Use ${suggestion.toUpperCase()}`;
      fix.addEventListener('click', () => {
        field.value = suggestion;
        const label = field.parentElement.querySelector('code');
        if (label) label.textContent = suggestion.toUpperCase();
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
      note.append(fix);
    };
    const showResolved = () => {
      if (!guide || !guide.resolved) return;
      contrastHint(byName('text_colour'), guide.resolved.suggestedText);
      contrastHint(byName('icon_colour'), guide.resolved.suggestedIcon);
    };
    const render = () => {
      if (guide) { guide.update(previewSettings()); return showResolved(); }
      // Settings come from the form, not the database, so unsaved edits show.
      window.__guideEmbed = {
        apiBase: '',
        assetBase: window.NikaAdmin.assetBase,
        routes: {
          chat: `${window.NikaAdmin.chatEndpoint}/chat-stream`,
          feedback: `${window.NikaAdmin.chatEndpoint}/guide-feedback`
        },
        headers: { 'X-WP-Nonce': window.NikaAdmin.nonce },
        preview: { name: value('name'), instructions: value('instructions') }
      };
      import(window.NikaAdmin.shell)
        .then((module) => module.mountGuideShell({
          ...previewSettings(),
          assetBase: window.NikaAdmin.assetBase,
          apiBase: '',
          stylesheet: window.NikaAdmin.stylesheet,
          attachments: false,
          isolate: true,
          loadSettings: async () => null
        }))
        .then((handle) => {
          guide = handle;
          showResolved();
          const widget = document.createElement('script');
          widget.src = window.NikaAdmin.widget;
          document.head.append(widget);
        });
    };
    let previewName = value('name');
    const syncPreviewIdentity = () => {
      if (window.__guideEmbed) window.__guideEmbed.preview = { name: value('name'), instructions: value('instructions') };
      if (value('name') === previewName) return;
      previewName = value('name');
      const control = document.querySelector('[data-assist-host]')?.shadowRoot?.querySelector('.assist-clear');
      if (!control) return;
      control.click();
      if (control.classList.contains('is-confirming')) control.click();
    };
    form.addEventListener('input', syncPreviewIdentity);
    form.addEventListener('input', render);
    form.addEventListener('change', render);
    render();
  }

  /* Unsaved changes --------------------------------------------------------- */

  const savebar = document.querySelector('.nika-savebar');
  const savebarNote = savebar && savebar.querySelector('span');
  const savedNote = savebarNote ? savebarNote.textContent : '';
  const controls = form ? [...form.elements].filter((el) => el.name && el.type !== 'hidden' && el.type !== 'submit') : [];
  const initial = new Map(controls.map((el) => [el, el.type === 'checkbox' || el.type === 'radio' ? String(el.checked) : el.value]));
  const providerFields = ['provider', 'api_key', 'endpoint'];

  const dirtyControls = () => controls.filter((el) => {
    const now = el.type === 'checkbox' || el.type === 'radio' ? String(el.checked) : el.value;
    return initial.has(el) && initial.get(el) !== now;
  });
  const isDirty = () => dirtyControls().length > 0;
  const providerDirty = () => dirtyControls().some((el) => providerFields.some((name) => el.name.endsWith(`[${name}]`)));

  const syncSavebar = () => {
    if (!savebar || !savebarNote) return;
    const dirty = isDirty();
    savebar.classList.toggle('is-dirty', dirty);
    savebarNote.textContent = dirty ? 'You have unsaved changes.' : savedNote;
  };
  if (form) {
    form.addEventListener('input', syncSavebar);
    form.addEventListener('change', syncSavebar);
    // A real submit is not an abandoned change.
    form.addEventListener('submit', () => {
      controls.forEach((el) => initial.set(el, el.type === 'checkbox' || el.type === 'radio' ? String(el.checked) : el.value));
      const submit = form.querySelector('#submit, [type="submit"]');
      if (submit) {
        submit.value = 'Saving...';
        // Disabling now would drop the button from the post, so wait a tick.
        window.setTimeout(() => { submit.disabled = true; }, 0);
      }
      if (savebar && savebarNote) { savebar.classList.remove('is-dirty'); savebarNote.textContent = 'Saving your changes.'; }
    });
    syncSavebar();
  }

  /* API key ----------------------------------------------------------------- */

  const keyInput = document.getElementById('nika-key');
  const keyReveal = document.getElementById('nika-key-reveal');
  const keyCopy = document.getElementById('nika-key-copy');
  const keyStatus = document.getElementById('nika-key-status');
  let revealed = null;

  const setKeyStatus = (message, type) => {
    if (!keyStatus) return;
    keyStatus.textContent = message || '';
    keyStatus.className = `nika-key-status${type ? ` is-${type}` : ''}`;
  };

  const fetchKey = async () => {
    if (revealed) return revealed;
    const response = await request(window.NikaAdmin.keyEndpoint, { method: 'GET' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'The saved key could not be read.');
    revealed = data;
    return data;
  };

  if (keyInput && keyReveal) {
    const keyFieldName = keyInput.getAttribute('name');
    keyReveal.addEventListener('click', async () => {
      if (keyReveal.getAttribute('aria-pressed') === 'true') {
        keyInput.type = 'password';
        keyInput.value = '';
        keyInput.readOnly = false;
        keyInput.setAttribute('name', keyFieldName);
        keyReveal.setAttribute('aria-pressed', 'false');
        setKeyStatus('');
        return;
      }
      try {
        const data = await fetchKey();
        keyInput.type = 'text';
        keyInput.value = data.key;
        keyReveal.setAttribute('aria-pressed', 'true');
        if (data.source === 'wp-config') {
          // Defined in wp-config.php on purpose, so never let it post into the database.
          keyInput.readOnly = true;
          keyInput.removeAttribute('name');
          setKeyStatus('Read-only: this key lives in wp-config.php.', 'note');
        } else {
          setKeyStatus('');
        }
      } catch (error) {
        setKeyStatus(error.message || 'The saved key could not be read.', 'error');
      }
    });
  }

  if (keyCopy) {
    // The clipboard is refused in insecure contexts, without focus, or by policy,
    // so fall back to handing the administrator a selected key to copy themselves.
    const offerManualCopy = (key) => {
      if (!keyInput) return false;
      const restore = keyInput.type;
      keyInput.type = 'text';
      keyInput.value = key;
      keyInput.focus();
      keyInput.setSelectionRange(0, key.length);
      let copied = false;
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
      if (copied) keyInput.type = restore === 'password' ? 'password' : 'text';
      if (copied && restore === 'password') keyInput.value = '';
      return copied;
    };

    keyCopy.addEventListener('click', async () => {
      let data;
      try {
        data = await fetchKey();
      } catch (error) {
        setKeyStatus(error.message || 'The saved key could not be read.', 'error');
        return;
      }
      try {
        await navigator.clipboard.writeText(data.key);
        setKeyStatus('API key copied to the clipboard.', 'success');
      } catch (error) {
        if (offerManualCopy(data.key)) setKeyStatus('API key copied to the clipboard.', 'success');
        else setKeyStatus('This browser blocked the clipboard. The key is selected, so copy it with Ctrl or Cmd and C.', 'note');
      }
    });
  }

  /* Model list -------------------------------------------------------------- */

  const modelSelect = document.getElementById('nika-model');
  const modelCustom = document.getElementById('nika-model-custom');
  const modelRefresh = document.getElementById('nika-model-refresh');
  const modelStatus = document.getElementById('nika-model-status');
  const CUSTOM = '__custom__';

  if (modelSelect && modelCustom && modelRefresh && modelStatus) {
    const fieldName = modelSelect.getAttribute('name');

    const setModelStatus = (message, type) => {
      modelStatus.textContent = message || '';
      modelStatus.className = `nika-model-status${type ? ` is-${type}` : ''}`;
    };

    // Only one of the two controls carries the field name, so exactly one value posts.
    const syncCustomMode = () => {
      const custom = modelSelect.value === CUSTOM;
      modelCustom.hidden = !custom;
      if (custom) {
        modelSelect.removeAttribute('name');
        modelCustom.setAttribute('name', fieldName);
      } else {
        modelCustom.removeAttribute('name');
        modelSelect.setAttribute('name', fieldName);
      }
      return custom;
    };

    modelSelect.addEventListener('change', () => {
      if (syncCustomMode()) modelCustom.focus();
    });

    // A model list belongs to one provider, so switching provider resets it to
    // that provider's default rather than leaving another provider's model behind.
    const provider = byName('provider');
    if (provider) {
      provider.addEventListener('change', () => {
        const fallback = (window.NikaAdmin.defaultModels || {})[provider.value] || '';
        modelSelect.textContent = '';
        if (fallback) {
          const option = document.createElement('option');
          option.value = fallback;
          option.textContent = fallback;
          modelSelect.appendChild(option);
        }
        const custom = document.createElement('option');
        custom.value = CUSTOM;
        custom.textContent = modelCustom.getAttribute('placeholder') || 'Custom model...';
        modelSelect.appendChild(custom);
        modelSelect.value = fallback || CUSTOM;
        if (!fallback) modelCustom.value = '';
        syncCustomMode();
        setModelStatus(fallback
          ? `Model reset to ${fallback} for this provider. Save, then reload the list.`
          : 'Enter the model this endpoint expects, then save.', 'note');
      });
    }

    if (!modelSelect.querySelector(`option:not([value="${CUSTOM}"])`)) modelSelect.value = CUSTOM;
    syncCustomMode();

    const fillModels = (models) => {
      const chosen = modelSelect.value === CUSTOM ? modelCustom.value.trim() : modelSelect.value;
      const known = new Set(models);
      if (chosen) known.add(chosen);
      const ordered = Array.from(known).sort();
      modelSelect.textContent = '';
      ordered.forEach((id) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id;
        modelSelect.appendChild(option);
      });
      const custom = document.createElement('option');
      custom.value = CUSTOM;
      custom.textContent = modelCustom.getAttribute('placeholder') || 'Custom model...';
      modelSelect.appendChild(custom);
      if (chosen && known.has(chosen)) modelSelect.value = chosen;
      syncCustomMode();
      return ordered.length;
    };

    modelRefresh.addEventListener('click', async () => {
      // The list is fetched with the saved provider and key, not what is on screen.
      if (providerDirty()) {
        setModelStatus('Save your provider changes first. The model list uses the saved provider and key.', 'error');
        return;
      }
      modelRefresh.disabled = true;
      modelRefresh.setAttribute('aria-busy', 'true');
      setModelStatus('Loading models from your provider.', 'loading');
      try {
        const response = await request(`${window.NikaAdmin.modelsEndpoint}?refresh=1`, { method: 'GET' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Models could not be loaded.');
        const count = fillModels(Array.isArray(data.models) ? data.models : []);
        setModelStatus(`${count} models loaded. Pick one, then save changes.`, 'success');
        syncSavebar();
      } catch (error) {
        setModelStatus(error.message || 'Models could not be loaded.', 'error');
      } finally {
        modelRefresh.disabled = false;
        modelRefresh.removeAttribute('aria-busy');
      }
    });
  }

  /* Rate-limit exemptions -------------------------------------------------- */

  const exemptField = document.getElementById('nika-exempt-ips');
  const checkIp = document.getElementById('nika-check-ip');
  const addIp = document.getElementById('nika-add-ip');
  const ipStatus = document.getElementById('nika-ip-status');
  let currentIp = '';
  const ipItems = () => (exemptField ? exemptField.value.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean) : []);
  const syncIp = () => {
    if (!addIp || !ipStatus || !currentIp) return;
    const listed = ipItems().includes(currentIp);
    addIp.hidden = listed;
    ipStatus.textContent = listed ? `${currentIp} is already exempt.` : `${currentIp} is using this browser connection.`;
  };
  if (checkIp && exemptField && addIp && ipStatus) {
    checkIp.addEventListener('click', async () => {
      checkIp.disabled = true;
      ipStatus.textContent = 'Checking this connection.';
      try {
        const response = await request(window.NikaAdmin.ipEndpoint, { method: 'GET' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ip) throw new Error(data.message || 'The current IP could not be detected.');
        currentIp = String(data.ip);
        syncIp();
      } catch (error) {
        currentIp = '';
        addIp.hidden = true;
        ipStatus.textContent = error.message || 'The current IP could not be detected.';
      } finally {
        checkIp.disabled = false;
      }
    });
    addIp.addEventListener('click', () => {
      if (!currentIp || ipItems().includes(currentIp)) return;
      exemptField.value = [...ipItems(), currentIp].join('\n');
      exemptField.dispatchEvent(new Event('input', { bubbles: true }));
      syncIp();
    });
    exemptField.addEventListener('input', syncIp);
  }

  /* Starter suggestions ----------------------------------------------------- */

  const button = document.getElementById('nika-generate-suggestions');
  const status = document.getElementById('nika-generator-status');
  if (!button || !status) return;

  const setStatus = (message, type) => {
    status.textContent = message;
    status.className = `nika-generator-status${type ? ` is-${type}` : ''}`;
    status.setAttribute('role', type === 'error' ? 'alert' : 'status');
  };

  // All fields fill together over one short beat, rather than one after another.
  const TYPE_MS = 420;
  const typeInto = (input, text) => new Promise((resolve) => {
    const finish = () => {
      input.value = text;
      input.classList.remove('is-typing');
      // Hold the highlight briefly so it is obvious which fields just changed.
      input.classList.add('is-filled');
      window.setTimeout(() => input.classList.remove('is-filled'), 2600);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      resolve();
    };
    if (reducedMotion || !text) { finish(); return; }
    input.value = '';
    input.classList.add('is-typing');
    const started = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / TYPE_MS);
      if (progress >= 1) { finish(); return; }
      input.value = text.slice(0, Math.max(1, Math.round(text.length * progress)));
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });

  const applySuggestions = (suggestions) => {
    const labels = document.querySelectorAll('input[name*="[suggestions]"][name$="[label]"]');
    const descriptions = document.querySelectorAll('input[name*="[suggestions]"][name$="[description]"]');
    if (suggestions.length !== 3 || labels.length < 3 || descriptions.length < 3) throw new Error('The generated suggestions could not be applied.');
    return Promise.all(suggestions.flatMap((item, index) => [
      typeInto(labels[index], item.label),
      typeInto(descriptions[index], item.description)
    ]));
  };

  /* Website instructions ---------------------------------------------------- */

  const draftButton = document.getElementById('nika-generate-instructions');
  const draftStatus = document.getElementById('nika-instructions-status');
  const instructions = byName('instructions');
  if (draftButton && draftStatus && instructions) {
    const setDraftStatus = (message, type) => {
      draftStatus.textContent = message;
      draftStatus.className = `nika-generator-status${type ? ` is-${type}` : ''}`;
    };
    // Two-step confirm rather than a modal, which would block the whole page.
    let armed = false;
    draftButton.addEventListener('click', async () => {
      if (instructions.value.trim() && !armed) {
        armed = true;
        setDraftStatus('This replaces the instructions already written here. Click Draft again to continue.', 'note');
        window.setTimeout(() => { armed = false; }, 8000);
        return;
      }
      armed = false;
      draftButton.disabled = true;
      draftButton.setAttribute('aria-busy', 'true');
      setDraftStatus('Reading published content and drafting instructions.', 'loading');
      try {
        const response = await request(window.NikaAdmin.instructionsEndpoint, { method: 'POST', body: '{}' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Instructions could not be drafted.');
        await typeInto(instructions, String(data.instructions || ''));
        setDraftStatus('Draft ready. Edit it to taste, then save changes.', 'success');
        syncSavebar();
      } catch (error) {
        setDraftStatus(error.message || 'Instructions could not be drafted.', 'error');
      } finally {
        draftButton.disabled = false;
        draftButton.removeAttribute('aria-busy');
      }
    });
  }

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setStatus('Reading published content and creating three suggestions.', 'loading');
    try {
      const response = await request(window.NikaAdmin.suggestionsEndpoint, { method: 'POST', body: '{}' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Suggestions could not be generated.');
      await applySuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setStatus('New suggestions are ready. Review them, then save changes.', 'success');
      syncSavebar();
    } catch (error) {
      setStatus(error.message || 'Suggestions could not be generated.', 'error');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });
}());

// Field help.
//
// Opens on click, tap and keyboard focus; hover is handled in CSS as an
// accelerator only. The button sits inside a <label>, so a click would
// otherwise activate the field it describes — a checkbox would toggle just
// from someone reading its note.
(function () {
  const notes = () => document.querySelectorAll('.nika-help-note');
  const closeAll = (except) => {
    notes().forEach((note) => {
      if (note === except) return;
      note.hidden = true;
      note.previousElementSibling?.setAttribute('aria-expanded', 'false');
    });
  };
  const noteFor = (button) => button.nextElementSibling;
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('.nika-help');
    if (!button) { closeAll(); return; }
    event.preventDefault();
    event.stopPropagation();
    const note = noteFor(button);
    if (!note) return;
    const open = note.hidden;
    closeAll(note);
    note.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open && !note.id) {
      note.id = 'nika-help-' + Math.random().toString(36).slice(2, 9);
      button.setAttribute('aria-describedby', note.id);
    }
  });
  // A <label> forwards focus to the control it wraps, so focusing the mark can
  // land on the field a moment later. Revealing on focus is therefore done in
  // CSS, where it cannot be undone by the next event; this only closes a note
  // that was opened by click once focus genuinely leaves it.
  document.addEventListener('focusin', (event) => {
    if (event.target.closest?.('.nika-help, .nika-help-note')) return;
    closeAll();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll();
  });
})();
