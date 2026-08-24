(function nikaWidget(global) {
  'use strict';

  const DEFAULTS = Object.freeze({
    name: 'Nika',
    greeting: 'Hi. What can I help you find?',
    placeholder: 'Ask about this website...',
    endpoint: '/wp-json/nika/v1',
    autoNavigate: true,
    contextCharacters: 12000,
    historyTurns: 10
  });

  const clean = value => String(value == null ? '' : value).trim();
  const normalizePath = value => {
    try {
      const url = new URL(value, location.href);
      return `${url.pathname.replace(/\/+$/, '') || '/'}${url.hash}`;
    } catch {
      return '';
    }
  };
  const textKey = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  function pageContext(limit) {
    const main = document.querySelector('main,[role="main"],article') || document.body;
    const clone = main.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,svg,form,nav,footer,[aria-hidden="true"]').forEach(node => node.remove());
    const headings = [...main.querySelectorAll('h1,h2,h3')].slice(0, 40).map(node => ({
      id: clean(node.id),
      text: clean(node.textContent).slice(0, 180)
    })).filter(item => item.text);
    return {
      url: location.href,
      path: `${location.pathname}${location.hash}`,
      title: document.title,
      headings,
      text: clean(clone.textContent).replace(/\s+/g, ' ').slice(0, limit)
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
    return [...document.querySelectorAll('h1,h2,h3,[data-nika-label]')].find(node => {
      const candidate = textKey(node.dataset.nikaLabel || node.textContent);
      return candidate === wanted || candidate.includes(wanted) || wanted.includes(candidate);
    }) || null;
  }

  function highlightTarget(target, label) {
    if (!target) return false;
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    const old = { outline: target.style.outline, outlineOffset: target.style.outlineOffset, borderRadius: target.style.borderRadius };
    target.style.outline = '3px solid #6366f1';
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

  function navigate(action, pages) {
    const target = allowedDestination(action && action.href, pages);
    if (!target) return { ok: false, reason: 'destination_not_allowed' };
    const current = `${location.pathname.replace(/\/+$/, '') || '/'}`;
    const next = `${target.pathname.replace(/\/+$/, '') || '/'}`;
    if (current === next) return { ok: highlightTarget(findTarget(target, action.label), action.label), samePage: true };
    sessionStorage.setItem('nika.pending', JSON.stringify({ href: `${target.pathname}${target.hash}`, label: clean(action.label).slice(0, 180) }));
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
    setTimeout(() => highlightTarget(findTarget(url, pending.label), pending.label), 450);
  }

  function template(name, greeting, placeholder) {
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
    const remember = (role, content) => {
      history.push({ role, content: clean(content).slice(0, 4000) });
      history = history.slice(-(Number(settings.historyTurns) || DEFAULTS.historyTurns) * 2);
      try { sessionStorage.setItem(historyKey, JSON.stringify(history)); } catch {}
    };

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const question = clean(input.value);
      if (!question || send.disabled) return;
      input.value = '';
      message('user', question);
      remember('user', question);
      send.disabled = true;
      status.textContent = 'Thinking...';
      try {
        const response = await fetch(`${endpoint}/chat`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ message: question, history, page: pageContext(Number(settings.contextCharacters) || DEFAULTS.contextCharacters) })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(clean(result.message || result.error) || `Request failed (${response.status})`);
        const answer = clean(result.message) || 'I could not produce an answer for that.';
        message('assistant', answer);
        remember('assistant', answer);
        if (result.action && settings.autoNavigate !== false) {
          status.textContent = clean(result.action.departure) || `Opening ${clean(result.action.label) || 'that section'}...`;
          setTimeout(() => navigate(result.action, pages), 550);
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
    if (!SpeechRecognition) {
      mic.disabled = true;
      mic.title = 'Dictation is not supported in this browser';
    } else {
      const recognition = new SpeechRecognition();
      recognition.lang = document.documentElement.lang || navigator.language || 'en-US';
      recognition.interimResults = true;
      let start = '';
      recognition.onstart = () => { start = input.value; mic.classList.add('listening'); status.textContent = 'Listening...'; };
      recognition.onresult = event => {
        let words = '';
        for (let i = event.resultIndex; i < event.results.length; i++) words += event.results[i][0].transcript;
        input.value = [clean(start), clean(words)].filter(Boolean).join(' ');
      };
      recognition.onerror = event => { status.textContent = event.error === 'not-allowed' ? 'Microphone permission was not granted.' : 'Dictation could not start.'; };
      recognition.onend = () => { mic.classList.remove('listening'); if (status.textContent === 'Listening...') status.textContent = input.value ? 'Dictation added.' : ''; };
      mic.addEventListener('click', () => { try { recognition.start(); } catch {} });
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
