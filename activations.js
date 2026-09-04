// The licence dashboard.
//
// The key is typed, used for the request, and kept only in memory for as long as
// the tab is open. It is never written to storage: a licence key in localStorage
// is a licence key in every backup, extension and shared machine that browser
// ever meets, and the cost of typing it again is one paste.
(() => {
  const form = document.querySelector('#act-form');
  if (!form) return;
  const field = document.querySelector('#act-key');
  const submit = document.querySelector('#act-submit');
  const status = document.querySelector('#act-status');
  const summary = document.querySelector('#act-summary');
  const list = document.querySelector('#act-list');

  let key = '';

  const say = (message, tone = '') => {
    status.textContent = message;
    status.dataset.tone = tone;
  };

  const ask = async (body) => {
    const response = await fetch('/api/activations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'That did not work. Please try again shortly.');
    return data;
  };

  const when = (value) => {
    const at = Date.parse(value);
    if (!Number.isFinite(at)) return '';
    const days = Math.floor((Date.now() - at) / 86400000);
    if (days <= 0) return 'seen today';
    if (days === 1) return 'seen yesterday';
    if (days < 30) return `seen ${days} days ago`;
    return `seen ${new Date(at).toLocaleDateString()}`;
  };

  const draw = (data) => {
    const used = Number(data.sitesUsed) || 0;
    const allowed = Number(data.sitesAllowed) || 0;
    const named = data.tier ? data.tier[0].toUpperCase() + data.tier.slice(1) : 'Your licence';
    const parts = [`${named}: ${used} of ${allowed} activations in use`];
    // Our record and the count that decides an overage are two different
    // numbers. Showing the difference is more use than picking one and hoping.
    if (data.sites.length !== used) parts.push(`${data.sites.length} recorded here`);
    if (data.updatesUntil) parts.push(`updates until ${new Date(data.updatesUntil).toLocaleDateString()}`);
    summary.textContent = parts.join(' · ');
    summary.hidden = false;

    list.innerHTML = '';
    list.hidden = data.sites.length === 0;
    if (!data.sites.length) { say('No production sites are recorded on this key yet.'); return; }

    for (const site of data.sites) {
      const row = document.createElement('li');
      const host = document.createElement('span');
      host.className = 'act-host';
      host.textContent = site.host;
      const meta = document.createElement('span');
      meta.className = 'act-meta';
      meta.textContent = when(site.seenAt);
      const release = document.createElement('button');
      release.type = 'button';
      release.className = 'btn act-release';
      release.textContent = 'Release';
      // Confirmed in the button itself. A second click on a changed label is
      // deliberate in a way a dialog dismissed by reflex is not.
      let armed = false;
      release.addEventListener('click', async () => {
        if (!armed) {
          armed = true;
          release.textContent = `Release ${site.host}?`;
          setTimeout(() => { armed = false; release.textContent = 'Release'; }, 4000);
          return;
        }
        release.disabled = true;
        say(`Releasing ${site.host}…`);
        try {
          draw(await ask({ key, action: 'deactivate', id: site.id, instanceId: site.instanceId }));
          say(`${site.host} released. That activation is free again.`);
        } catch (error) {
          release.disabled = false;
          release.textContent = 'Release';
          say(error.message, 'error');
        }
      });
      row.append(host, meta, release);
      list.append(row);
    }
    say(`${data.sites.length} site${data.sites.length === 1 ? '' : 's'} on this licence.`);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const typed = field.value.trim();
    if (!typed) { say('Enter your licence key.', 'error'); field.focus(); return; }
    submit.disabled = true;
    say('Checking your licence…');
    try {
      key = typed;
      draw(await ask({ key, action: 'list' }));
    } catch (error) {
      key = '';
      summary.hidden = true;
      list.hidden = true;
      say(error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });
})();
