(function nikaWidget(global) {
  'use strict';

  const DEFAULTS = Object.freeze({
    name: 'Nika',
    greeting: 'Hi. What can I help you find?',
    placeholder: 'Ask about this website...',
    endpoint: '/wp-json/nika/v1',
    autoNavigate: true,
    dictation: true,
    accent: '#6366f1',
    position: 'right',
    contextCharacters: 12000,
    historyTurns: 10
  });

  const clean = value => String(value == null ? '' : value).trim();
  const escapeHtml = value => clean(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const normalizePath = value => {
    try {
      const url = new URL(value, location.href);
      return `${url.pathname.replace(/\/+$/, '') || '/'}${url.hash}`;
    } catch {
      return '';
    }
  };
  const textKey = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const visiblePixels = node => {
    if (!node || node.hidden || node.getAttribute('aria-hidden') === 'true') return 0;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return 0;
    const rect = node.getBoundingClientRect();
    const width = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
    return width * height;
  };

  const viewLabel = node => clean(
    node && (node.dataset.nikaLabel || node.getAttribute('aria-label') ||
      (node.getAttribute('aria-labelledby') && document.getElementById(node.getAttribute('aria-labelledby'))?.textContent) ||
      (node.matches('h1,h2,h3') ? node.textContent : node.querySelector('h1,h2,h3,[role="heading"]')?.textContent) ||
      (node.matches('summary') ? node.textContent : node.querySelector('summary')?.textContent) || node.textContent)
  ).replace(/\s+/g, ' ').slice(0, 180);

  function activeView(main) {
    const candidates = [
      ...document.querySelectorAll('dialog[open],[role="dialog"]:not([hidden]),[aria-modal="true"]:not([hidden])'),
      ...main.querySelectorAll('[role="tabpanel"]:not([hidden]),details[open],section,article,h1,h2,h3,[data-nika-label]')
    ];
    return candidates.map(node => {
      const pixels = visiblePixels(node);
      const rect = node.getBoundingClientRect();
      const priority = node.matches('dialog,[role="dialog"],[aria-modal="true"]') ? 4
        : node.matches('[role="tabpanel"]') ? 3
          : node.matches('details[open]') ? 2 : 1;
      return { node, pixels, priority, distance: Math.abs(rect.top - innerHeight * .3) };
    }).filter(item => item.pixels > 0 && viewLabel(item.node))
      .sort((a, b) => b.priority - a.priority || b.pixels - a.pixels || a.distance - b.distance)[0]?.node || null;
  }

  function pageContext(limit) {
    const main = document.querySelector('main,[role="main"],article') || document.body;
    const clone = main.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,svg,form,nav,footer,[aria-hidden="true"]').forEach(node => node.remove());
    const headings = [...main.querySelectorAll('h1,h2,h3')].slice(0, 40).map(node => ({
      id: clean(node.id),
      text: clean(node.textContent).slice(0, 180)
    })).filter(item => item.text);
    const active = activeView(main);
    const activeText = active ? clean(active.textContent).replace(/\s+/g, ' ').slice(0, 2000) : '';
    const path = `${location.pathname.replace(/\/+$/, '') || '/'}${/^#[a-z0-9_-]{1,100}$/i.test(location.hash) ? location.hash : ''}`;
    const limitations = [];
    if ([...main.querySelectorAll('iframe')].some(node => visiblePixels(node))) limitations.push('Visible embedded-frame content is not included in the text snapshot.');
    if ([...main.querySelectorAll('canvas')].some(node => visiblePixels(node))) limitations.push('Visible canvas pixels cannot be inspected as page text.');
    if ([...main.querySelectorAll('img')].some(node => visiblePixels(node))) limitations.push('Image pixels are not inspected; only surrounding text and accessible labels are available.');
    return {
      // Search parameters can contain account IDs, emails and temporary
      // tokens. Page awareness never needs them, so they are not transmitted.
      url: `${location.origin}${path}`,
      path,
      title: clean(document.title).slice(0, 180),
      heading: clean(main.querySelector('h1')?.textContent).replace(/\s+/g, ' ').slice(0, 180),
      activeSection: active ? {
        id: clean(active.id).slice(0, 100),
        label: viewLabel(active),
        kind: active.matches('dialog,[role="dialog"],[aria-modal="true"]') ? 'dialog'
          : active.matches('[role="tabpanel"]') ? 'tab'
            : active.matches('details[open]') ? 'details' : 'section',
        text: activeText
      } : null,
      limitations,
      headings,
      // innerText follows the rendered state, so CSS-hidden menus and inactive
      // responsive variants do not masquerade as visible content. The clone is
      // only a fallback for non-painting test/browser environments.
      text: clean(main.innerText || clone.textContent).replace(/\s+/g, ' ').slice(0, limit)
    };
  }

  function allowedDestination(href, pages) {
    let target;
    try { target = new URL(href, location.href); } catch { return null; }
    if (target.origin !== location.origin) return null;
    const allowed = pages.map(page => normalizePath(typeof page === 'string' ? page : page.url || page.path));
    const targetPath = normalizePath(target.href);
    const targetBase = targetPath.split('#')[0];
    if (!allowed.some(path => path.split('#')[0] === targetBase)) return null;
    return target;
  }

  function findTarget(url, label) {
    if (url.hash) {
      const byId = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (byId) return byId;
    }
    const wanted = textKey(label);
    if (!wanted) return null;
    const matches = [...document.querySelectorAll('h1,h2,h3,[data-nika-label]')].filter(node => {
      const candidate = textKey(node.dataset.nikaLabel || node.textContent);
      return candidate === wanted || candidate.includes(wanted) || wanted.includes(candidate);
    });
    if (matches.length < 2) return matches[0] || null;
    const explicit = matches.filter(node => textKey(node.dataset.nikaLabel) === wanted);
    if (explicit.length === 1) return explicit[0];
    const visible = matches.filter(node => visiblePixels(node) > 0);
    // A wrong highlight is worse than no highlight. Duplicate off-screen or
    // repeated responsive headings need an id/hash or one unique
    // data-nika-label before Nika will choose between them.
    return visible.length === 1 ? visible[0] : null;
  }

  function highlightTarget(target, label, accent) {
    if (!target) return false;
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    const old = { outline: target.style.outline, outlineOffset: target.style.outlineOffset, borderRadius: target.style.borderRadius };
    target.style.outline = `3px solid ${/^#[0-9a-f]{6}$/i.test(accent || '') ? accent : DEFAULTS.accent}`;
    target.style.outlineOffset = '8px';
    target.style.borderRadius = target.style.borderRadius || '6px';
    target.setAttribute('data-nika-highlight', clean(label) || 'Nika destination');
    setTimeout(() => {
      target.style.outline = old.outline;
      target.style.outlineOffset = old.outlineOffset;
      target.style.borderRadius = old.borderRadius;
      target.removeAttribute('data-nika-highlight');
    }, 9000);
    return true;
  }

  function navigate(action, pages, accent) {
    const target = allowedDestination(action && action.href, pages);
    if (!target) return { ok: false, reason: 'destination_not_allowed' };
    const current = `${location.pathname.replace(/\/+$/, '') || '/'}`;
    const next = `${target.pathname.replace(/\/+$/, '') || '/'}`;
    if (current === next) {
      const found = findTarget(target, action.label);
      return { ok: highlightTarget(found, action.label, accent), samePage: true, reason: found ? '' : 'target_not_unique' };
    }
    sessionStorage.setItem('nika.pending', JSON.stringify({ href: `${target.pathname}${target.hash}`, label: clean(action.label).slice(0, 180), accent }));
    location.assign(`${target.pathname}${target.search}${target.hash}`);
    return { ok: true, samePage: false };
  }

  function restorePending() {
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem('nika.pending') || 'null'); } catch {}
    if (!pending) return;
    sessionStorage.removeItem('nika.pending');
    const url = allowedDestination(pending.href, [pending.href]);
    if (!url || url.pathname !== location.pathname) return;
    setTimeout(() => highlightTarget(findTarget(url, pending.label), pending.label, pending.accent), 450);
  }

  function template(name, greeting, placeholder) {
    name = escapeHtml(name);
    greeting = escapeHtml(greeting);
    placeholder = escapeHtml(placeholder);
    return `<div class="nika-root">
      <button class="nika-launch" type="button" aria-label="Open ${name}"><span aria-hidden="true">✦</span><b>${name}</b></button>
      <section class="nika-panel" aria-label="${name} website guide" hidden>
        <header><div><strong>${name}</strong><span>website guide</span></div><button class="nika-close" type="button" aria-label="Close ${name}">×</button></header>
        <div class="nika-log" role="log" aria-live="polite"><div class="nika-message assistant">${greeting}</div></div>
        <div class="nika-status" aria-live="polite"></div>
        <form><textarea rows="1" maxlength="2000" placeholder="${placeholder}" aria-label="Message ${name}"></textarea><div class="nika-actions"><button class="nika-mic" type="button" aria-label="Start dictation">◉</button><button class="nika-send" type="submit">Send</button></div></form>
        <small>Answers use this website's configured content. Review important information.</small>
      </section>
    </div>`;
  }

  async function mount(options) {
    if (document.querySelector('[data-nika-mounted]')) return;
    const config = { ...DEFAULTS, ...(options || {}) };
    const endpoint = clean(config.endpoint).replace(/\/$/, '');
    let remote = {};
    try {
      const response = await fetch(`${endpoint}/config`, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      if (response.ok) remote = await response.json();
    } catch {}
    const settings = { ...config, ...remote };
    if (settings.enabled === false) return;
    const pages = Array.isArray(settings.pages) ? settings.pages : [];
    const currentBase = normalizePath(location.href).split('#')[0];
    const blocked = Array.isArray(settings.blockedPaths) ? settings.blockedPaths.map(path => normalizePath(path).split('#')[0]) : [];
    // Exclusion is a privacy boundary, not merely a search-index preference.
    // Do not mount or capture visible text on account, checkout, admin or other
    // routes the owner excluded.
    if (blocked.includes(currentBase)) return;

    const host = document.createElement('div');
    host.dataset.nikaMounted = 'true';
    const root = host.attachShadow({ mode: 'open' });
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = settings.stylesheet || new URL('nika-widget.css', document.currentScript && document.currentScript.src || location.href).href;
    const shell = document.createElement('div');
    shell.innerHTML = template(clean(settings.name) || DEFAULTS.name, clean(settings.greeting) || DEFAULTS.greeting, clean(settings.placeholder) || DEFAULTS.placeholder);
    root.append(css, shell.firstElementChild);
    document.body.append(host);

    const q = selector => root.querySelector(selector);
    const panel = q('.nika-panel');
    const launch = q('.nika-launch');
    const close = q('.nika-close');
    const form = q('form');
    const input = q('textarea');
    const send = q('.nika-send');
    const mic = q('.nika-mic');
    const log = q('.nika-log');
    const status = q('.nika-status');
    const accent = /^#[0-9a-f]{6}$/i.test(clean(settings.accent)) ? clean(settings.accent) : DEFAULTS.accent;
    q('.nika-root').style.setProperty('--nika', accent);
    if (settings.position === 'left') q('.nika-root').classList.add('nika-left');
    const historyKey = `nika.history:${clean(settings.siteId) || location.host}`;
    let history = [];
    try { history = JSON.parse(sessionStorage.getItem(historyKey) || '[]'); } catch {}
    if (!Array.isArray(history)) history = [];

    const setOpen = open => {
      panel.hidden = !open;
      launch.hidden = open;
      if (open) setTimeout(() => input.focus(), 0);
    };
    launch.addEventListener('click', () => setOpen(true));
    close.addEventListener('click', () => setOpen(false));

    const message = (role, text) => {
      const node = document.createElement('div');
      node.className = `nika-message ${role}`;
      node.textContent = clean(text);
      log.append(node);
      log.scrollTop = log.scrollHeight;
      return node;
    };
    const remember = (role, content, context = pageContext(1)) => {
      history.push({
        role,
        content: clean(content).slice(0, 4000),
        page: {
          path: clean(context.path).slice(0, 500),
          title: clean(context.title).slice(0, 180),
          activeSection: clean(context.activeSection?.label).slice(0, 180)
        }
      });
      history = history.slice(-(Number(settings.historyTurns) || DEFAULTS.historyTurns) * 2);
      try { sessionStorage.setItem(historyKey, JSON.stringify(history)); } catch {}
    };

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const question = clean(input.value);
      if (!question || send.disabled) return;
      input.value = '';
      message('user', question);
      const livePage = pageContext(Number(settings.contextCharacters) || DEFAULTS.contextCharacters);
      remember('user', question, livePage);
      send.disabled = true;
      status.textContent = 'Thinking...';
      try {
        const response = await fetch(`${endpoint}/chat`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ message: question, history, page: livePage })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(clean(result.message || result.error) || `Request failed (${response.status})`);
        const answer = clean(result.message) || 'I could not produce an answer for that.';
        message('assistant', answer);
        remember('assistant', answer, livePage);
        if (result.action && settings.autoNavigate !== false) {
          status.textContent = clean(result.action.departure) || `Opening ${clean(result.action.label) || 'that section'}...`;
          setTimeout(() => {
            const outcome = navigate(result.action, pages, accent);
            if (!outcome.ok && outcome.samePage) status.textContent = 'I found more than one matching section, so I did not guess. Use the page links or ask for a more specific heading.';
          }, 550);
        } else status.textContent = '';
      } catch (error) {
        message('assistant error', error.message || 'Nika could not answer. Please try again.');
        status.textContent = '';
      } finally {
        send.disabled = false;
        input.focus();
      }
    });

    const SpeechRecognition = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (settings.dictation === false || !SpeechRecognition) {
      mic.disabled = true;
      mic.title = settings.dictation === false ? 'Dictation is disabled by this site' : 'Dictation is not supported in this browser';
    } else {
      const recognition = new SpeechRecognition();
      recognition.lang = clean(settings.dictationLanguage) || document.documentElement.lang || navigator.language || 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      let start = '', listening = false;
      recognition.onstart = () => {
        start = input.value;
        listening = true;
        mic.classList.add('listening');
        mic.setAttribute('aria-label', 'Stop dictation');
        status.textContent = 'Listening... Tap the microphone again to stop.';
      };
      recognition.onresult = event => {
        let finalWords = '', interimWords = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalWords += event.results[i][0].transcript;
          else interimWords += event.results[i][0].transcript;
        }
        input.value = [clean(start), clean(`${finalWords} ${interimWords}`)].filter(Boolean).join(' ');
      };
      recognition.onerror = event => {
        listening = false;
        status.textContent = event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone permission was not granted. Allow microphone access in the browser and try again.'
          : event.error === 'no-speech'
            ? 'No speech was detected. Tap the microphone and try again.'
            : 'Dictation could not start in this browser.';
      };
      recognition.onend = () => {
        listening = false;
        mic.classList.remove('listening');
        mic.setAttribute('aria-label', 'Start dictation');
        if (status.textContent.startsWith('Listening...')) status.textContent = input.value ? 'Dictation added.' : '';
      };
      mic.addEventListener('click', () => {
        try {
          if (listening) recognition.stop();
          else recognition.start();
        } catch { status.textContent = 'Dictation is already changing state. Try again in a moment.'; }
      });
    }

    restorePending();
    return Object.freeze({ open: () => setOpen(true), close: () => setOpen(false) });
  }

  global.Nika = Object.freeze({ mount, navigate, pageContext, allowedDestination });
  if (global.NikaConfig) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount(global.NikaConfig), { once: true });
    else mount(global.NikaConfig);
  }
})(window);
