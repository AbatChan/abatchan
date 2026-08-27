(function nikaWidget(global) {
  'use strict';

  const DEFAULTS = Object.freeze({
    name: 'Nika',
    suggestions: [
      { label: 'Find the right service', description: 'See what fits your needs' },
      { label: 'How does it work?', description: 'Review the process' },
      { label: 'Compare the options', description: 'See plans or packages' }
    ],
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
  const normalizeSuggestions = value => (Array.isArray(value) ? value : []).slice(0, 3).map(item => typeof item === 'string'
    ? { label: clean(item), description: '' }
    : { label: clean(item?.label), description: clean(item?.description), question: clean(item?.question) }
  ).filter(item => item.label);

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
    const focusNode = document.elementFromPoint(
      Math.max(1, Math.min(innerWidth - 1, innerWidth * .34)),
      Math.max(1, Math.min(innerHeight - 1, innerHeight * .5))
    )?.closest('section,article,h1,h2,h3,[data-nika-label]');
    return candidates.map(node => {
      const pixels = visiblePixels(node);
      const rect = node.getBoundingClientRect();
      const focusBand = Math.max(0, Math.min(rect.bottom, innerHeight * .66) - Math.max(rect.top, innerHeight * .34));
      const priority = node.matches('dialog,[role="dialog"],[aria-modal="true"]') ? 4
        : node.matches('[role="tabpanel"]') ? 3
          : node.matches('details[open]') ? 2 : 1;
      return { node, pixels, priority, focusBand, focusHit: node === focusNode || node.contains(focusNode), distance: Math.abs((rect.top + rect.bottom) / 2 - innerHeight * .5) };
    }).filter(item => item.pixels > 0 && viewLabel(item.node))
      .sort((a, b) => b.priority - a.priority || Number(b.focusHit) - Number(a.focusHit) || b.focusBand - a.focusBand || a.distance - b.distance)[0]?.node || null;
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

  function template(name, suggestions, placeholder) {
    name = escapeHtml(name);
    placeholder = escapeHtml(placeholder);
    const starters = normalizeSuggestions(suggestions).map(item => `<button type="button" data-question="${escapeHtml(item.question || item.label)}"><strong>${escapeHtml(item.label)}</strong>${item.description ? `<span>${escapeHtml(item.description)}</span>` : ''}</button>`).join('');
    return `<div class="nika-root">
      <button class="nika-launch" type="button" aria-label="Open ${name}"><span aria-hidden="true">✦</span><b>${name}</b></button>
      <section class="nika-panel" aria-label="${name} website guide" hidden>
        <header><div><strong>${name}</strong><span>website guide</span></div><button class="nika-close" type="button" aria-label="Close ${name}">×</button></header>
        <div class="nika-log" role="log" aria-live="polite"></div>
        <div class="nika-suggestions" aria-label="Suggested questions">${starters}</div>
        <div class="nika-status" aria-live="polite"></div>
        <form><textarea rows="1" maxlength="4000" placeholder="${placeholder}" aria-label="Message ${name}"></textarea><div class="nika-dictation" role="group" aria-label="Voice dictation" hidden><button class="nika-dictation-cancel" type="button" aria-label="Cancel dictation">×</button><canvas aria-hidden="true"></canvas><time aria-label="Dictation duration">0:00</time><button class="nika-dictation-stop" type="button" aria-label="Stop dictation">■</button></div><div class="nika-actions"><button class="nika-mic" type="button" aria-label="Start dictation">◉</button><button class="nika-send" type="submit">Send</button></div></form>
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
    const suggestions = normalizeSuggestions(settings.suggestions);
    shell.innerHTML = template(clean(settings.name) || DEFAULTS.name, suggestions.length ? suggestions : DEFAULTS.suggestions, clean(settings.placeholder) || DEFAULTS.placeholder);
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
    const dictation = q('.nika-dictation');
    const dictationCanvas = q('.nika-dictation canvas');
    const dictationTime = q('.nika-dictation time');
    const dictationCancel = q('.nika-dictation-cancel');
    const dictationStop = q('.nika-dictation-stop');
    const log = q('.nika-log');
    const starters = q('.nika-suggestions');
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
      if (starters) starters.hidden = true;
      const node = document.createElement('div');
      node.className = `nika-message ${role}`;
      node.textContent = clean(text);
      log.append(node);
      log.scrollTop = log.scrollHeight;
      return node;
    };
    starters?.addEventListener('click', event => {
      const button = event.target.closest('button[data-question]');
      if (!button) return;
      input.value = button.dataset.question || '';
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
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
            // The mobile panel fills nearly the whole viewport. Once a
            // same-page action is verified, reveal the highlighted target and
            // keep the completed reply in history for when the visitor reopens.
            if (outcome.ok && outcome.samePage && matchMedia('(max-width:520px)').matches) setOpen(false);
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
      const limit = Number(input.maxLength) || 4000;
      let listening = false, wanted = false, cancelled = false, dictationError = '', prefix = '', suffix = '', committed = '', sessionFinal = '', interim = '', segments = [];
      let startedAt = 0, timer = 0, stream = null, audioContext = null, analyser = null, frame = 0, wave = [];
      const joinParts = parts => parts.map(clean).filter(Boolean).join(' ');
      // The browser may rewrite interim recognition several times. Only put
      // stable chunks in the editable field; the waveform remains live while
      // the current phrase is still provisional.
      const transcript = () => joinParts([committed, sessionFinal]);
      const updateSegments = event => {
        const start = Number.isInteger(event.resultIndex) ? event.resultIndex : 0;
        for (let i = start; i < event.results.length; i++) {
          const result = event.results[i];
          segments[i] = { text: result?.[0]?.transcript || '', final: Boolean(result?.isFinal) };
        }
        if (event.results.length < segments.length) segments = segments.filter((segment, index) => index < event.results.length || segment?.final);
        sessionFinal = joinParts(segments.filter(segment => segment?.final).map(segment => segment.text));
        interim = joinParts(segments.filter(segment => segment && !segment.final).map(segment => segment.text));
      };
      const joinAtCursor = (left, speech, right) => {
        speech = clean(speech);
        const before = speech && left && /\S$/.test(left) && /^\S/.test(speech) ? ' ' : '';
        const after = speech && right && /\S$/.test(speech) && /^\S/.test(right) ? ' ' : '';
        const room = Math.max(0, limit - left.length - right.length - before.length - after.length);
        return `${left}${before}${speech.slice(0, room)}${after}${right}`.slice(0, limit);
      };
      const renderTranscript = () => {
        input.value = joinAtCursor(prefix, transcript(), suffix);
        const caret = Math.min(input.value.length, prefix.length + transcript().length + 1);
        try { input.setSelectionRange(caret, caret); } catch {}
      };
      const drawWave = () => {
        if (!wanted) return;
        const dpr = Math.min(2, devicePixelRatio || 1), width = Math.max(1, Math.round(dictationCanvas.clientWidth * dpr)), height = Math.max(1, Math.round(dictationCanvas.clientHeight * dpr));
        if (dictationCanvas.width !== width || dictationCanvas.height !== height) { dictationCanvas.width = width; dictationCanvas.height = height; }
        let level = .035;
        if (analyser) { const data = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(data); let sum = 0; for (const sample of data) { const value = (sample - 128) / 128; sum += value * value; } level = Math.min(1, Math.sqrt(sum / data.length) * 4.8); }
        wave.push(level); if (wave.length > 54) wave.shift();
        const context = dictationCanvas.getContext('2d'); context.clearRect(0, 0, width, height); context.fillStyle = '#d7d7d7'; context.globalAlpha = .68;
        const gap = width / 54, center = height / 2, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        for (let index = 0; index < 54; index++) { const sample = wave[index] ?? .025; const barHeight = reduced ? Math.max(2 * dpr, Math.min(height * .24, sample * height)) : Math.max(2 * dpr, Math.min(height * .88, sample * height)); const barWidth = sample > .09 ? Math.max(2 * dpr, gap * .42) : Math.max(1.5 * dpr, gap * .22); context.beginPath(); context.roundRect(index * gap + (gap - barWidth) / 2, center - barHeight / 2, barWidth, barHeight, barWidth / 2); context.fill(); }
        frame = requestAnimationFrame(drawWave);
      };
      const stopWave = () => { cancelAnimationFrame(frame); frame = 0; stream?.getTracks().forEach(track => track.stop()); stream = null; analyser = null; if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; } };
      const startWave = async () => { wave = []; drawWave(); try { stream = await navigator.mediaDevices?.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); if (!wanted) return stopWave(); audioContext = new (global.AudioContext || global.webkitAudioContext)(); analyser = audioContext.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = .55; audioContext.createMediaStreamSource(stream).connect(analyser); } catch { analyser = null; } };
      const finish = () => {
        listening = false; wanted = false; clearInterval(timer); timer = 0; stopWave(); form.classList.remove('dictating'); dictation.hidden = true; mic.classList.remove('listening'); mic.setAttribute('aria-label', 'Start dictation');
        if (cancelled) input.value = joinAtCursor(prefix, '', suffix); else { committed = joinParts([committed, sessionFinal, interim]); sessionFinal = ''; interim = ''; segments = []; renderTranscript(); }
        status.textContent = dictationError || (cancelled ? 'Dictation cancelled.' : input.value ? 'Dictation added.' : 'Dictation stopped.'); input.focus();
      };
      const stop = cancel => { if (!wanted && !listening) return; cancelled = Boolean(cancel); wanted = false; try { cancel ? recognition.abort() : recognition.stop(); } catch { finish(); } };
      const begin = () => {
        const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length, end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
        prefix = input.value.slice(0, start); suffix = input.value.slice(end); committed = ''; sessionFinal = ''; interim = ''; segments = []; cancelled = false; dictationError = ''; wanted = true; startedAt = Date.now();
        form.classList.add('dictating'); dictation.hidden = false; mic.classList.add('listening'); mic.setAttribute('aria-label', 'Stop dictation'); dictationTime.textContent = '0:00'; status.textContent = 'Listening...';
        timer = setInterval(() => { const seconds = Math.floor((Date.now() - startedAt) / 1000); dictationTime.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }, 250); startWave();
        try { recognition.start(); } catch { wanted = false; finish(); status.textContent = 'Dictation is already changing state. Try again in a moment.'; }
      };
      recognition.onstart = () => { listening = true; };
      recognition.onresult = event => { updateSegments(event); renderTranscript(); };
      recognition.onerror = event => {
        if (event.error === 'aborted') return;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') { wanted = false; dictationError = 'Microphone permission was not granted. Allow microphone access and try again.'; }
        else if (event.error !== 'no-speech') status.textContent = 'Dictation paused; reconnecting...';
      };
      recognition.onend = () => {
        listening = false;
        committed = joinParts([committed, sessionFinal, interim]); sessionFinal = ''; interim = ''; segments = []; renderTranscript();
        if (wanted) setTimeout(() => { if (wanted) try { recognition.start(); } catch { wanted = false; finish(); } }, 180); else finish();
      };
      mic.addEventListener('click', () => wanted ? stop(false) : begin());
      dictationStop.addEventListener('click', () => stop(false));
      dictationCancel.addEventListener('click', () => stop(true));
      close.addEventListener('click', () => { if (wanted) stop(false); });
      addEventListener('pagehide', () => { if (wanted) stop(false); else stopWave(); }, { once: true });
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
