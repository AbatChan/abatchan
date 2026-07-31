// Writes into the HTML what visitors currently only receive from JavaScript.
//
// /reviews served 4.7 KB, nearly all of it a JSON-LD blob, while 26 real client
// reviews sat in reviews-data.js waiting for JS to inject them. The footer was
// a stale three-link version that script.js replaced on load. A crawler that
// does not run JavaScript saw neither, which is why Google's AI Overview
// described the studio using Instagram rather than its own pages.
//
// The runtime is unchanged: reviews.js still calls replaceChildren() and
// script.js still rewrites the footer, so what a visitor sees is exactly what
// they saw before. This only fills in what was empty beforehand.
//
// Deliberate trade-off: crawlers get a snapshot from the last deploy. A review
// edited in the dashboard reaches visitors immediately and search engines at
// the next deploy.
//
// Never throws. A failed prerender must ship the site as it was, not break the
// deploy — the pages all work without this.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fdubcelrwfpzjjnqipku.supabase.co';
// Publishable, not secret: this reads the same public rows the browser reads.
// A build artifact must never carry the service key.
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
  || 'sb_publishable_b_pSIsSTOHTrYj87LJrY1A_WDFm_dF6';

const note = (...args) => console.log('[prerender]', ...args);
const warn = (...args) => console.warn('[prerender]', ...args);

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// ---------------------------------------------------------------- data

async function fromSupabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

// The dashboard's reviews.items wins; reviews-data.js is the fallback the site
// itself falls back to, so the two paths agree.
async function loadReviews() {
  try {
    const rows = await fromSupabase('settings?key=eq.reviews.items&is_public=eq.true&select=value');
    const stored = rows?.[0]?.value;
    if (Array.isArray(stored) && stored.length) {
      note(`reviews: ${stored.length} from the dashboard`);
      return stored;
    }
  } catch (err) {
    warn('reviews: dashboard read failed, using the bundled defaults —', err.message);
  }
  try {
    const source = await readFile(join(ROOT, 'reviews-data.js'), 'utf8');
    const start = source.indexOf('[');
    const end = source.lastIndexOf(']');
    if (start < 0 || end < 0) throw new Error('no array literal found');
    // The file is a plain array literal of object literals, so it parses as an
    // expression. Nothing in it is interpolated or computed.
    const items = new Function(`return ${source.slice(start, end + 1)}`)();
    note(`reviews: ${items.length} from reviews-data.js`);
    return items;
  } catch (err) {
    warn('reviews: no source available —', err.message);
    return [];
  }
}

async function loadWork() {
  try {
    const rows = await fromSupabase(
      'work_items?published=eq.true&select=*&order=position.asc,created_at.asc'
    );
    if (Array.isArray(rows) && rows.length) {
      note(`work: ${rows.length} published items from the dashboard`);
      return rows;
    }
  } catch (err) {
    warn('work: dashboard read failed, keeping the committed snapshot —', err.message);
  }
  return [];
}

// --------------------------------------------------------------- markup

const STAR = 'M12 3.6 14.5 9l5.9.8-4.3 4.1 1.1 5.9-5.2-2.9-5.2 2.9 1.1-5.9L3.6 9.8 9.5 9Z';

// Mirrors buildRow() in reviews.js, minus the `reveal` class. Prerendered rows
// must be visible without JavaScript — `.reveal` starts at opacity 0 and only
// becomes visible when the intersection observer runs, which would hand a
// crawler content that is technically present and visually hidden.
function reviewRow(item) {
  const rating = Number(item.rating);
  const stars = rating > 0
    ? (() => {
        const clamped = Math.max(0, Math.min(5, rating));
        const row = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}"/></svg>`.repeat(5);
        return `<span class="review-stars" style="--rating:${Math.round((clamped / 5) * 1000) / 10}%" role="img" aria-label="Rated ${clamped} out of 5">${row}<span class="review-stars-on">${row}</span></span>`;
      })()
    : '';
  const source = [item.source, item.client].filter(Boolean).join(' · ') || item.org || '';
  const meta = [source, item.date || item.place].filter(Boolean)
    .map(text => `<span class="review-meta">${escapeHtml(text)}</span>`).join('');
  const role = item.engagement || item.role;
  const link = item.project
    ? `<a class="review-link" href="/work#work-${escapeHtml(item.project)}">view the system <span class="arrow">↗</span></a>`
    : '';
  return `<article class="review-row">`
    + `<div class="review-who"><span class="review-dot" aria-hidden="true"></span><div>`
    + (role ? `<span class="review-role">${escapeHtml(role)}</span>` : '')
    + stars + meta
    + `</div></div>`
    + `<div class="review-body"><blockquote class="review-quote">${escapeHtml(item.quote)}</blockquote></div>`
    + link
    + `</article>`;
}

// script.js rebuilds this on load with inline SVG icons. A crawler only needs
// the links and their text, so the prerendered version is plain anchors.
const FOOTER_NAV = [
  ['/about', 'about'], ['/process', 'process'],
  ['/brand', 'brand'], ['/reviews', 'reviews'], ['/pricing', 'pricing'],
  ['/privacy', 'privacy'], ['/terms', 'terms'], ['/contact', 'contact']
];
const FOOTER_WORK = [
  ['/work', 'all work'],
  ['/bookingkoala', 'BookingKoala']
];

async function footerMarkup() {
  let socials = [];
  try {
    const rows = await fromSupabase('settings?key=eq.social.links&is_public=eq.true&select=value');
    const stored = rows?.[0]?.value;
    if (Array.isArray(stored)) {
      socials = stored
        .map(row => (Array.isArray(row) ? { slug: row[0], label: row[1], href: row[2] } : row))
        .filter(row => row?.href && row?.label);
    }
  } catch (err) {
    warn('footer: social links unavailable —', err.message);
  }
  const rail = socials.length
    ? `<div class="social-rail" aria-label="social profiles">` + socials.map(row =>
        `<a class="social-chip" href="${escapeHtml(row.href)}" target="_blank" rel="noreferrer noopener" aria-label="${escapeHtml(row.label)}">${escapeHtml(row.label)}</a>`
      ).join('') + `</div>`
    : '';
  const work = `<details class="footer-submenu"><summary>work <span aria-hidden="true"></span></summary>`
    + `<div class="footer-submenu-links">`
    + FOOTER_WORK.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')
    + `</div></details>`;
  const nav = `<nav class="footer-nav" aria-label="More pages">${work}`
    + FOOTER_NAV.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')
    + `</nav>`;
  return `<div class="shell compact-footer">`
    + `<a class="footer-mark" href="/" aria-label="abatchan home">abatchan</a>`
    + rail
    + `<div class="footer-meta"><a href="mailto:abatchan4@gmail.com">abatchan mail</a><span>&copy; 2026</span></div>`
    + nav
    + `</div>`;
}

const storageUrl = path => path
  ? `${SUPABASE_URL}/storage/v1/object/public/work/${String(path).split('/').map(encodeURIComponent).join('/')}`
  : '';

function workCard(item) {
  const image = storageUrl(item.image_path);
  const visual = image
    ? `<div class="card-visual managed"><img class="work-art" src="${escapeHtml(image)}" loading="lazy" alt="${escapeHtml(item.image_alt || '')}"></div>`
    : `<div class="card-visual managed"></div>`;
  const link = typeof item.link_url === 'string' && /^(https:\/\/|\/)/.test(item.link_url)
    ? `<a class="btn sm" href="${escapeHtml(item.link_url)}"${item.link_url.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : ''}>view project <span class="arrow">↗</span></a>`
    : '';
  return `<article class="work-card${item.featured ? ' is-featured' : ''}" data-type="${escapeHtml(item.category || 'product')}"${item.slug ? ` id="work-${escapeHtml(item.slug)}"` : ''}>`
    + visual
    + `<div class="card-info"><div class="card-meta">`
    + `<span>${escapeHtml(item.kicker || item.category || 'project')}</span>`
    + `<span>${escapeHtml(item.status || 'selected work')}</span></div>`
    + `<h3>${escapeHtml(item.title)}</h3>`
    + `<p>${escapeHtml(item.summary || '')}</p>${link}</div></article>`;
}

// ---------------------------------------------------------------- schema

// Google grants review rich results only when the review text is in the served
// HTML, which is why this ships in the same change as the markup above and not
// before it.
function reviewSchema(items) {
  const rated = items.filter(item => Number(item.rating) > 0);
  if (!rated.length) return null;
  const total = rated.reduce((sum, item) => sum + Number(item.rating), 0);
  const reviews = rated.slice(0, 20).map(item => {
    const node = {
      // Most of these reviews are anonymous on the marketplace. Falling back to
      // item.source would name "Upwork" as the person who wrote the review,
      // which is false — the platform is the publisher, not the author.
      author: { '@type': 'Person', name: item.client || 'Verified client' },
      '@type': 'Review',
      reviewBody: String(item.quote || '').trim(),
      reviewRating: { '@type': 'Rating', ratingValue: Number(item.rating), bestRating: 5 }
    };
    // Undated marketplace reviews stay undated rather than being given a date
    // that would be invented.
    const date = monthToIso(item.date);
    if (date) node.datePublished = date;
    if (item.source) node.publisher = { '@type': 'Organization', name: item.source };
    return node;
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': 'https://abatchan.com/#studio',
    name: 'abatchan',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: Math.round((total / rated.length) * 10) / 10,
      reviewCount: rated.length,
      bestRating: 5
    },
    review: reviews
  };
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'];
function monthToIso(value) {
  const parts = String(value || '').trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return '';
  const month = MONTHS.indexOf(parts[0]);
  const year = Number(parts[1]);
  if (month < 0 || !year) return '';
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

// The questions and answers already exist as <details><summary> in pricing.html.
// The schema has to quote the visible text exactly, so it is read back out of
// the markup rather than maintained separately.
function faqSchema(html) {
  const items = [...html.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)];
  const strip = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const entries = items
    .map(match => ({ q: strip(match[1]), a: strip(match[2]) }))
    .filter(entry => entry.q && entry.a);
  if (!entries.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map(entry => ({
      '@type': 'Question',
      name: entry.q,
      acceptedAnswer: { '@type': 'Answer', text: entry.a }
    }))
  };
}

function workSchema(items) {
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Selected abatchan digital product and systems work',
    url: 'https://abatchan.com/work',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => {
      const projectUrl = typeof item.link_url === 'string' && /^https:\/\//.test(item.link_url)
        ? item.link_url
        : `https://abatchan.com/work#work-${item.slug}`;
      const node = {
        '@type': 'CreativeWork',
        name: item.title,
        description: item.summary || '',
        url: projectUrl,
        creator: { '@id': 'https://abatchan.com/#studio' }
      };
      const image = storageUrl(item.image_path);
      if (image) node.image = image;
      return { '@type': 'ListItem', position: index + 1, item: node };
    })
  };
}

function breadcrumbSchema(name, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://abatchan.com/'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name,
        item: `https://abatchan.com${path}`
      }
    ]
  };
}

// ---------------------------------------------------------------- writing

// Markers keep this idempotent. Running twice replaces the block rather than
// nesting a second copy inside the first.
function replaceBlock(html, name, inner) {
  const open = `<!--prerender:${name}-->`;
  const close = `<!--/prerender:${name}-->`;
  const block = `${open}${inner}${close}`;
  const existing = new RegExp(`${open}[\\s\\S]*?${close}`);
  return existing.test(html) ? html.replace(existing, block) : block;
}

// Injects into an element that is empty in the source, keeping whatever else is
// inside it. Used for the reviews archive container.
function injectInto(html, openTagPattern, name, inner) {
  const match = html.match(openTagPattern);
  if (!match) return { html, ok: false };
  const openTag = match[0];
  const start = match.index + openTag.length;
  const rest = html.slice(start);
  const existing = new RegExp(`^<!--prerender:${name}-->[\\s\\S]*?<!--/prerender:${name}-->`);
  const cleaned = rest.replace(existing, '');
  return {
    html: html.slice(0, start) + replaceBlock('', name, inner) + cleaned,
    ok: true
  };
}

// Replaces an element's entire contents. The footer is not empty — it holds an
// older three-link version that script.js overwrites at runtime — so prepending
// would ship both.
function replaceContents(html, tag, name, inner) {
  const pattern = new RegExp(`(<${tag}[^>]*>)[\\s\\S]*?(</${tag}>)`);
  if (!pattern.test(html)) return { html, ok: false };
  return {
    html: html.replace(pattern, (_, open, close) => open + replaceBlock('', name, inner) + close),
    ok: true
  };
}

function addSchema(html, name, data) {
  if (!data) return html;
  const tag = `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  const block = replaceBlock('', name, tag);
  const existing = new RegExp(`<!--prerender:${name}-->[\\s\\S]*?<!--/prerender:${name}-->`);
  if (existing.test(html)) return html.replace(existing, block);
  return html.replace('</head>', `${block}</head>`);
}

function replaceWorkGrid(html, inner) {
  const marker = /<!--prerender:work-->[\s\S]*?<!--\/prerender:work-->/;
  const block = replaceBlock('', 'work', inner);
  if (marker.test(html)) return { html: html.replace(marker, block), ok: true };

  const open = html.match(/<div class="work-grid"[^>]*>/);
  if (!open) return { html, ok: false };
  const start = open.index + open[0].length;
  const rest = html.slice(start);
  const close = rest.match(/<\/div>\s*<\/section>/);
  if (!close) return { html, ok: false };
  return {
    html: html.slice(0, start) + block + rest.slice(close.index),
    ok: true
  };
}

const read = file => readFile(join(ROOT, file), 'utf8');
const write = (file, html) => writeFile(join(ROOT, file), html);

async function run() {
  const reviews = await loadReviews();
  const published = reviews.filter(item =>
    item && item.published !== false && String(item.quote || '').trim());
  const work = await loadWork();

  // ---- /reviews
  if (published.length) {
    let html = await read('reviews.html');
    const rows = published
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(reviewRow).join('');
    const injected = injectInto(html, /<div class="review-ledger review-archive"[^>]*>/, 'reviews', rows);
    if (injected.ok) {
      html = addSchema(injected.html, 'reviewschema', reviewSchema(published));
      await write('reviews.html', html);
      note(`reviews.html: ${published.length} rows written`);
    } else {
      warn('reviews.html: archive container not found, left alone');
    }
  }

  // ---- /work
  if (work.length) {
    try {
      let html = await read('work.html');
      const cards = work.map(workCard).join('');
      const injected = replaceWorkGrid(html, cards);
      if (injected.ok) {
        html = addSchema(injected.html, 'workschema', workSchema(work));
        html = addSchema(html, 'workbreadcrumbs', breadcrumbSchema('Work', '/work'));
        await write('work.html', html);
        note(`work.html: ${work.length} published cards written`);
      } else {
        warn('work.html: work grid not found, left alone');
      }
    } catch (err) {
      warn('work.html:', err.message);
    }
  }

  // ---- /bookingkoala proof and FAQ
  try {
    let html = await read('bookingkoala.html');
    const related = published
      .filter(item => /booking\s*koala|bookingkoala/i.test(
        `${item.engagement || ''} ${item.quote || ''}`
      ))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const injected = injectInto(
      html,
      /<div class="review-ledger service-proof-ledger"[^>]*>/,
      'bookingkoala-reviews',
      related.map(reviewRow).join('')
    );
    if (injected.ok) html = injected.html;
    else warn('bookingkoala.html: review ledger not found');
    const faq = faqSchema(html);
    if (faq) html = addSchema(html, 'bookingkoala-faqschema', faq);
    html = addSchema(
      html,
      'bookingkoala-breadcrumbs',
      breadcrumbSchema('BookingKoala services', '/bookingkoala')
    );
    await write('bookingkoala.html', html);
    note(`bookingkoala.html: ${related.length} relevant reviews written`);
  } catch (err) {
    warn('bookingkoala.html:', err.message);
  }

  // ---- /pricing FAQ
  try {
    let html = await read('pricing.html');
    const schema = faqSchema(html);
    if (schema) {
      await write('pricing.html', addSchema(html, 'faqschema', schema));
      note(`pricing.html: ${schema.mainEntity.length} FAQ entries`);
    } else {
      warn('pricing.html: no <details><summary> pairs found');
    }
  } catch (err) {
    warn('pricing.html:', err.message);
  }

  // ---- footer, every page
  const footer = await footerMarkup();
  const pages = ['index.html', 'work.html', 'about.html', 'pricing.html', 'process.html',
    'contact.html', 'reviews.html', 'bookingkoala.html', 'brand.html', 'privacy.html',
    'terms.html', '404.html'];
  let count = 0;
  for (const page of pages) {
    try {
      const html = await read(page);
      const injected = replaceContents(html, 'footer', 'footer', footer);
      if (!injected.ok) { warn(`${page}: no <footer>`); continue; }
      await write(page, injected.html);
      count++;
    } catch (err) {
      warn(`${page}:`, err.message);
    }
  }
  note(`footer written into ${count} pages`);
}

try {
  await run();
  note('done');
} catch (err) {
  // Shipping the site unchanged beats failing the deploy.
  warn('failed, site ships as-is —', err?.stack || err);
}
