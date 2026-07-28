// Dynamic homepage selections, ordered galleries, and image lightbox.
(function dynamicWork() {
  const q = (selector, context = document) => context.querySelector(selector);
  const qa = (selector, context = document) => [...context.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
  const validLink = value => typeof value === 'string' && /^(https:\/\/|\/)/.test(value);

  const loadSettings = async () => {
    try {
      const rows = await sb.select('settings', 'key=eq.work.enhancements&is_public=eq.true&select=value');
      return rows?.[0]?.value && typeof rows[0].value === 'object' ? rows[0].value : {};
    } catch {
      return {};
    }
  };

  const imageUrls = (item, extra) => {
    const paths = [];
    if (item.image_path) paths.push(item.image_path);
    if (Array.isArray(extra?.gallery_paths)) {
      extra.gallery_paths.forEach(path => {
        if (path && !paths.includes(path)) paths.push(path);
      });
    }
    return paths.map(path => sb.publicUrl('work', path));
  };

  const makeGallery = (item, extra) => {
    const urls = imageUrls(item, extra);
    if (!urls.length) return null;

    const wrap = document.createElement('div');
    wrap.className = 'managed-gallery';
    const track = document.createElement('div');
    track.className = 'managed-gallery-track';

    urls.forEach((url, index) => {
      const slide = document.createElement('div');
      slide.className = 'managed-gallery-slide';
      const img = document.createElement('img');
      img.src = url;
      img.alt = index === 0 ? (item.image_alt || '') : '';
      img.loading = 'lazy';
      slide.append(img);
      track.append(slide);
    });

    wrap.append(track);

    if (urls.length > 1) {
      const nav = document.createElement('div');
      nav.className = 'managed-gallery-nav';
      const dots = document.createElement('div');
      dots.className = 'managed-gallery-dots';

      urls.forEach((_, index) => {
        const dot = document.createElement('i');
        dot.className = `managed-gallery-dot${index === 0 ? ' is-on' : ''}`;
        dots.append(dot);
      });

      const count = document.createElement('span');
      count.className = 'managed-gallery-count';
      count.textContent = `1 / ${urls.length}`;
      nav.append(dots, count);
      wrap.append(nav);

      let raf = 0;
      track.addEventListener('scroll', () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const index = Math.max(
            0,
            Math.min(urls.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)))
          );
          qa('.managed-gallery-dot', dots).forEach((dot, dotIndex) => {
            dot.classList.toggle('is-on', dotIndex === index);
          });
          count.textContent = `${index + 1} / ${urls.length}`;
        });
      }, { passive: true });
    }

    return wrap;
  };

  const createCard = (item, extra) => {
    const card = document.createElement('article');
    card.className = 'work-card reveal visible home-managed-card home-slot-card';
    card.dataset.type = item.category || 'product';

    const visual = document.createElement('div');
    visual.className = 'card-visual managed';
    const gallery = makeGallery(item, extra);
    if (gallery) visual.append(gallery);

    const info = document.createElement('div');
    info.className = 'card-info';
    info.innerHTML = `<div class="card-meta"><span>${esc(item.kicker || item.category || 'project')}</span><span>${esc(item.status || 'selected work')}</span></div><h3>${esc(item.title)}</h3><p>${esc(extra?.homepage_summary || item.summary || '')}</p>`;

    if (validLink(item.link_url)) {
      const link = document.createElement('a');
      link.className = 'btn sm';
      link.href = item.link_url;
      link.innerHTML = 'view project <span class="arrow">↗</span>';
      if (item.link_url.startsWith('https://')) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      info.append(link);
    }

    card.append(visual, info);
    return card;
  };

  const renderHome = async () => {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (path !== '/' || !window.sb?.configured?.()) return;
    const heading = qa('.section-index').find(element => /selected systems/i.test(element.textContent));
    const grid = heading?.closest('section')?.querySelector('.work-grid');
    if (!grid) return;
    grid.classList.add('home-dynamic-grid');
    grid.dataset.loadingWork = 'true';
    grid.setAttribute('aria-busy', 'true');

    try {
      const [rows, extras] = await Promise.all([
        sb.select('work_items', 'published=eq.true&featured=eq.true&select=*&order=position.asc,created_at.asc&limit=3'),
        loadSettings()
      ]);
      const cards = (rows || []).slice(0, 3).map(item => createCard(item, extras[item.slug] || {}));
      if (cards.length) grid.replaceChildren(...cards);
    } catch {
      // Authored cards remain the resilient fallback.
    } finally {
      delete grid.dataset.loadingWork;
      grid.removeAttribute('aria-busy');
    }
  };

  const enhanceWork = async () => {
    const path = location.pathname.replace(/\/+$/, '');
    if (path !== '/work' || !window.sb?.configured?.()) return;

    try {
      const [rows, extras] = await Promise.all([
        sb.select('work_items', 'published=eq.true&select=slug,title,image_path,image_alt&order=position.asc,created_at.asc'),
        loadSettings()
      ]);

      const apply = () => {
        rows.forEach(item => {
          const extra = extras[item.slug] || {};
          if (!Array.isArray(extra.gallery_paths) || !extra.gallery_paths.length) return;
          const card = qa('.work-card').find(element => q('.card-info h3', element)?.textContent.trim() === item.title);
          const visual = card && q('.card-visual', card);
          if (!visual || visual.dataset.galleryReady) return;
          const gallery = makeGallery(item, extra);
          if (!gallery) return;
          visual.replaceChildren(gallery);
          visual.dataset.galleryReady = '1';
        });
      };

      apply();
      const grid = q('.work-grid');
      if (grid) new MutationObserver(apply).observe(grid, { childList: true });
    } catch {}
  };

  const setupLightbox = () => {
    const lightbox = document.createElement('div');
    lightbox.className = 'work-lightbox';
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.innerHTML = '<div class="work-lightbox-stage" role="dialog" aria-modal="true" aria-label="Project image viewer"><img alt=""><button class="work-lightbox-close" type="button" aria-label="Close image">×</button><button class="work-lightbox-prev" type="button" aria-label="Previous image">‹</button><button class="work-lightbox-next" type="button" aria-label="Next image">›</button><span class="work-lightbox-count"></span></div>';
    document.body.append(lightbox);

    const lbImg = q('img', lightbox);
    const lbPrev = q('.work-lightbox-prev', lightbox);
    const lbNext = q('.work-lightbox-next', lightbox);
    const lbCount = q('.work-lightbox-count', lightbox);
    const closeButton = q('.work-lightbox-close', lightbox);
    let lbUrls = [];
    let lbIndex = 0;

    const show = () => {
      lbImg.src = lbUrls[lbIndex];
      lbImg.alt = 'Project image';
      const many = lbUrls.length > 1;
      lbPrev.hidden = !many;
      lbNext.hidden = !many;
      lbCount.hidden = !many;
      lbCount.textContent = `${lbIndex + 1} / ${lbUrls.length}`;
    };

    const open = (urls, index) => {
      lbUrls = urls;
      lbIndex = index;
      show();
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('work-lightbox-open');
      closeButton.focus();
    };

    const close = () => {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('work-lightbox-open');
      setTimeout(() => {
        if (!lightbox.classList.contains('open')) lbImg.removeAttribute('src');
      }, 220);
    };

    const step = delta => {
      if (!lbUrls.length) return;
      lbIndex = (lbIndex + delta + lbUrls.length) % lbUrls.length;
      show();
    };

    closeButton.addEventListener('click', close);
    lbPrev.addEventListener('click', () => step(-1));
    lbNext.addEventListener('click', () => step(1));
    lightbox.addEventListener('click', event => {
      if (event.target === lightbox) close();
    });
    addEventListener('keydown', event => {
      if (!lightbox.classList.contains('open')) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    });
    document.addEventListener('click', event => {
      const img = event.target.closest('.work-card .card-visual img');
      if (!img) return;
      event.preventDefault();
      const visual = img.closest('.card-visual');
      const images = qa('img', visual).filter(node => node.currentSrc || node.src);
      open(images.map(node => node.currentSrc || node.src), Math.max(0, images.indexOf(img)));
    });
  };

  const start = () => {
    setupLightbox();
    renderHome();
    enhanceWork();
  };

  document.readyState === 'loading'
    ? addEventListener('DOMContentLoaded', start, { once: true })
    : start();
})();
