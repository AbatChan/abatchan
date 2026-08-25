// The one file a buyer adds to their site.
//
//   <script src="https://abatchan.com/embed.js" data-site="site_xxx" async></script>
//
// Everything else, the styles, the shell, the widget, is fetched from wherever
// this script came from, so the buyer copies one line and hosts nothing.
//
// It deliberately does very little: read the key, work out its own origin,
// fetch the tenant's public config, then hand off. Anything that needs the
// tenant record stays on the server, where the buyer cannot read it and cannot
// break it.

(function guideEmbed() {
  const script = document.currentScript
    || document.querySelector('script[data-site][src*="embed.js"]');
  if (!script) return;

  const siteKey = String(script.dataset.site || '').trim();
  if (!siteKey) {
    console.warn('[guide] no data-site on the embed script, nothing to load');
    return;
  }

  // Where this file came from is where the API is. Deriving it means a buyer
  // never configures a second URL, and a copied snippet cannot end up pointing
  // its script at one deployment and its questions at another.
  let apiBase = '';
  try {
    apiBase = new URL(script.src, location.href).origin;
  } catch {
    console.warn('[guide] could not resolve the guide origin from the embed script');
    return;
  }
  const sameOrigin = apiBase === location.origin;

  // Published before anything else loads, because assistant-v2.js reads it as
  // it initialises.
  window.__guideEmbed = { siteKey, apiBase: sameOrigin ? '' : apiBase, paths: null };

  const asset = path => `${sameOrigin ? '' : apiBase}${path}`;

  const load = src => new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = src;
    tag.async = false;          // order matters: the shell exists before the widget
    tag.onload = resolve;
    tag.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.append(tag);
  });

  const start = async () => {
    let config = null;
    try {
      const res = await fetch(`${apiBase}/api/guide-config?site=${encodeURIComponent(siteKey)}`, {
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) {
        // A wrong key or an unauthorised domain is the buyer's setup problem,
        // and it is better to say so once in their console than to paint a
        // guide that fails on the first question.
        console.warn(`[guide] not enabled for this site (${res.status})`);
        return;
      }
      config = await res.json();
    } catch {
      console.warn('[guide] could not reach the guide service');
      return;
    }
    if (!config || config.enabled === false) return;
    // Published before the widget loads, because it reads this as it starts.
    window.__guideEmbed.paths = Array.isArray(config.paths) ? config.paths : [];

    const { mountGuideShell } = await import(`${asset('/guide-shell.js')}?v=1`);
    await mountGuideShell({
      name: config.name,
      siteName: config.name,
      subtitle: config.subtitle,
      avatar: config.avatar,
      assetBase: sameOrigin ? '' : apiBase,
      apiBase: sameOrigin ? '' : apiBase,
      stylesheet: asset('/assistant.css?v=25'),
      placeholder: config.placeholder,
      disclaimer: config.disclaimer,
      greeting: config.greeting,
      chips: config.chips || [],
      loadSettings: async () => null   // the config call above already answered this
    });

    await load(asset('/assistant-v2.js?v=48'));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
