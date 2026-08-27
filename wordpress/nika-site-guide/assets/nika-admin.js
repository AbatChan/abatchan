(function () {
  'use strict';

  const button = document.getElementById('nika-generate-suggestions');
  const status = document.getElementById('nika-generator-status');
  const feedback = document.querySelector('.nika-feedback');
  const dismissFeedback = document.querySelector('.nika-feedback__dismiss');
  if (dismissFeedback && feedback) dismissFeedback.addEventListener('click', () => feedback.remove());
  if (feedback && feedback.querySelector('.nika-feedback__message')) window.setTimeout(() => feedback.remove(), 6000);
  if (!button || !status || !window.NikaAdmin) return;

  const setStatus = (message, type) => {
    status.textContent = message;
    status.className = `nika-generator-status${type ? ` is-${type}` : ''}`;
    status.setAttribute('role', type === 'error' ? 'alert' : 'status');
  };

  const applySuggestions = (suggestions) => {
    const labels = document.querySelectorAll('input[name*="[suggestions]"][name$="[label]"]');
    const descriptions = document.querySelectorAll('input[name*="[suggestions]"][name$="[description]"]');
    if (suggestions.length !== 3 || labels.length < 3 || descriptions.length < 3) throw new Error('The generated suggestions could not be applied.');
    suggestions.forEach((item, index) => {
      labels[index].value = item.label;
      descriptions[index].value = item.description;
      labels[index].dispatchEvent(new Event('input', { bubbles: true }));
      descriptions[index].dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    setStatus('Reading published content and creating three suggestions.', 'loading');
    try {
      const response = await fetch(window.NikaAdmin.suggestionsEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.NikaAdmin.nonce },
        body: '{}'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Suggestions could not be generated.');
      applySuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setStatus('New suggestions are ready. Review them, then save changes.', 'success');
    } catch (error) {
      setStatus(error.message || 'Suggestions could not be generated.', 'error');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });
}());
