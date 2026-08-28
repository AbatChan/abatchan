// The one file a Universal install adds to its pages.
//
//   <script src="/nika/nika.js" defer></script>
//
// It reads this install's public config, mounts the same guide shell the
// designed-for site runs, then hands over to the widget. Nothing about the
// guide itself lives here: this file only says where it is and who is asking.

(function nikaLoader() {
  const script = document.currentScript || document.querySelector('script[src*="/nika/nika.js"]');
  // Where this file came from is where the guide is, so a copied snippet cannot
  // point its script at one install and its questions at another.
  let base = '/nika';
  try { base = new URL(script.src, location.href).pathname.replace(/\/[^/]*$/, ''); } catch {}
  const at = path => `${base}${path}`;

  const start = async () => {
    let config = null;
    try {
      const response = await fetch(at('/config'), { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      if (!response.ok) return;
      config = await response.json();
    } catch {
      return;
    }
    if (!config || config.enabled === false) return;

    // Published before the widget loads, because it reads this as it starts.
    window.__guideEmbed = {
      apiBase: '',
      assetBase: base,
      routes: { chat: at('/chat-stream'), feedback: at('/guide-feedback') }
    };

    const { mountGuideShell } = await import(at('/guide-shell.js'));
    await mountGuideShell({
      name: config.name,
      siteName: config.name,
      subtitle: config.subtitle,
      avatar: config.avatar,
      launcherIcon: config.launcherIcon,
      assetBase: base,
      apiBase: '',
      accent: config.accent,
      position: config.position,
      panelColour: config.panelColour,
      panelOpacity: config.panelOpacity,
      gradientFrom: config.gradientFrom,
      gradientTo: config.gradientTo,
      scrollbarColour: config.scrollbarColour,
      shadowColour: config.shadowColour,
      textColour: config.textColour,
      iconColour: config.iconColour,
      customCss: config.customCss,
      logoSize: config.logoSize,
      markSize: config.markSize,
      stylesheet: at('/assistant.css'),
      placeholder: config.placeholder,
      disclaimer: config.disclaimer,
      chips: config.suggestions || [],
      // A packaged guide lands inside somebody else's site, so it is isolated.
      isolate: true,
      loadSettings: async () => null
    });

    const widget = document.createElement('script');
    widget.src = at('/assistant-v2.js');
    document.head.append(widget);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
