(function () {
  'use strict';

  const button = document.getElementById('nika-generate-suggestions');
  const status = document.getElementById('nika-generator-status');
  const feedback = document.querySelector('.nika-feedback');
  const dismissFeedback = document.querySelector('.nika-feedback__dismiss');
  if (dismissFeedback && feedback) dismissFeedback.addEventListener('click', () => feedback.remove());
  if (feedback && feedback.querySelector('.nika-feedback__message')) window.setTimeout(() => feedback.remove(), 6000);
  if (!window.NikaAdmin) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const request = (url, options) => fetch(url, Object.assign({
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.NikaAdmin.nonce }
  }, options || {}));

  /* Model list ------------------------------------------------------------ */

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

    // A compatible endpoint may start with no known model at all.
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
      modelRefresh.disabled = true;
      modelRefresh.setAttribute('aria-busy', 'true');
      setModelStatus('Loading models from your provider.', 'loading');
      try {
        const response = await request(window.NikaAdmin.modelsEndpoint, { method: 'GET' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Models could not be loaded.');
        const count = fillModels(Array.isArray(data.models) ? data.models : []);
        setModelStatus(`${count} models loaded. Pick one, then save changes.`, 'success');
      } catch (error) {
        setModelStatus(error.message || 'Models could not be loaded.', 'error');
      } finally {
        modelRefresh.disabled = false;
        modelRefresh.removeAttribute('aria-busy');
      }
    });
  }

  /* Starter suggestions --------------------------------------------------- */

  if (!button || !status) return;

  const setStatus = (message, type) => {
    status.textContent = message;
    status.className = `nika-generator-status${type ? ` is-${type}` : ''}`;
    status.setAttribute('role', type === 'error' ? 'alert' : 'status');
  };

  const typeInto = (input, text, delay) => new Promise((resolve) => {
    const finish = () => {
      input.value = text;
      input.classList.remove('is-typing');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      resolve();
    };
    if (reducedMotion) { finish(); return; }
    input.value = '';
    input.classList.add('is-typing');
    let index = 0;
    const step = () => {
      index += 1;
      if (index >= text.length) { finish(); return; }
      input.value = text.slice(0, index);
      window.setTimeout(step, 10);
    };
    window.setTimeout(step, delay);
  });

  const applySuggestions = (suggestions) => {
    const labels = document.querySelectorAll('input[name*="[suggestions]"][name$="[label]"]');
    const descriptions = document.querySelectorAll('input[name*="[suggestions]"][name$="[description]"]');
    if (suggestions.length !== 3 || labels.length < 3 || descriptions.length < 3) throw new Error('The generated suggestions could not be applied.');
    return Promise.all(suggestions.flatMap((item, index) => [
      typeInto(labels[index], item.label, index * 130),
      typeInto(descriptions[index], item.description, index * 130 + 65)
    ]));
  };

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
    } catch (error) {
      setStatus(error.message || 'Suggestions could not be generated.', 'error');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });
}());
