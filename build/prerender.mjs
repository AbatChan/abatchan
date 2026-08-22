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
// reviews.js clamps long quotes to four lines and hangs a "see more" on them.
// It can measure; this cannot, so it guesses from length — roughly four lines
// of ~62 characters in the review column. Getting a borderline quote wrong
// costs one line of shift on that row. Getting it right for the long ones is
// what matters: an unclamped 1,500-character quote is about twenty lines tall,
// and collapsing that after paint used to shove the rest of the page upward.
const CLAMP_CHARS = 250;
const willOverflow = quote => String(quote || '').length > CLAMP_CHARS;

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
    + `<div class="review-body">`
    + `<blockquote class="review-quote is-clamped">${escapeHtml(item.quote)}</blockquote>`
    + (willOverflow(item.quote) ? `<button type="button" class="review-toggle" aria-expanded="false">see more</button>` : '')
    + `</div>`
    + link
    + `</article>`;
}

// script.js rebuilds this on load with inline SVG icons. A crawler only needs
// the links and their text, so the prerendered version is plain anchors.
const FOOTER_NAV = [
  ['/brand', 'brand'], ['/process', 'process'],
  ['/reviews', 'reviews'],
  ['/privacy', 'privacy'], ['/terms', 'terms'], ['/contact', 'contact']
];
const FOOTER_WORK = [
  ['/work', 'all work'],
  ['/bookingkoala', 'BookingKoala']
];

// Public fallbacks keep the footer useful and crawlable when Supabase is
// unreachable during a deploy. A successful settings read replaces these.
const FOOTER_SOCIALS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/abatchan/' },
  { label: 'GitHub', href: 'https://github.com/AbatChan' },
  { label: 'X', href: 'https://x.com/abat_chan' },
  { label: 'Instagram', href: 'https://www.instagram.com/realabatchan/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@realabatchan' },
  { label: 'YouTube', href: 'https://www.youtube.com/@abatchan' },
  { label: 'Facebook', href: 'https://www.facebook.com/abat.chan.2025' },
  { label: 'Behance', href: 'https://www.behance.net/abatchan' },
  { label: 'Dribbble', href: 'https://dribbble.com/abatchan' },
  { label: 'Upwork', href: 'https://www.upwork.com/freelancers/abatchan' },
  { label: 'WhatsApp', href: 'https://wa.me/2347041857921' }
];

async function footerMarkup() {
  let socials = FOOTER_SOCIALS;
  try {
    const rows = await fromSupabase('settings?key=eq.social.links&is_public=eq.true&select=value');
    const stored = rows?.[0]?.value;
    if (Array.isArray(stored)) {
      const configured = stored
        .map(row => (Array.isArray(row) ? { slug: row[0], label: row[1], href: row[2] } : row))
        .filter(row => row?.href && row?.label);
      if (configured.length) socials = configured;
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
  const nav = `<nav class="footer-nav" aria-label="More pages">`
    + FOOTER_NAV.map(([href, label]) =>
      `${href === '/reviews' ? work : ''}<a href="${href}">${label}</a>`).join('')
    + `</nav>`;
  return `<div class="shell compact-footer">`
    + `<a class="footer-mark" href="/" aria-label="abatchan home">abatchan</a>`
    + rail
    + `<div class="footer-meta"><a href="mailto:abatchan4@gmail.com">abatchan mail</a><span>&copy; 2026</span></div>`
    + nav
    + `</div>`;
}

// Mirrors sb.imageUrl in supabase-config.js: /img is rewritten to Supabase's
// transform endpoint, so the served image is a resized WebP rather than the
// original upload, it caches, and it is not hidden from Google Images by
// storage's "x-robots-tag: none".
const IMAGE_WIDTHS = [640, 1024, 1600];
const storageUrl = (path, width = 1024) => path
  ? `/img/w${width}/work/${String(path).split('/').map(encodeURIComponent).join('/')}`
  : '';

// Category order and labels for the grouped work page. script.js holds the
// same table and must stay in step with it: the build writes these sections
// and the script rebuilds them from Supabase a moment later, so if the two
// disagree on order or wording the page visibly reshuffles after it loads.
// Anything with an unrecognised category falls into "more work" at the end
// rather than vanishing.
const WORK_CATEGORIES = [
  ['product', 'products'],
  ['platform', 'platforms'],
  ['web', 'web development'],
  ['product-design', 'product design'],
  ['branding', 'branding'],
  ['automation', 'automation'],
  ['concept', 'concepts']
];
// Beyond this many projects the page shows a first batch and a "load more".
// script.js repeats both numbers; changing one alone reintroduces the shift.
const WORK_PAGINATE_FROM = 20;
const WORK_PAGE_SIZE = 12;

// The filter bar used to be a fixed list of eight chips, so a page with four
// categories painted four dead chips until script.js hid them. Writing only
// the categories that have work means nothing empty is ever on screen, and the
// bar does not reflow a moment after load.
function filterBarMarkup(groups, total) {
  const chip = (slug, label, count, active) =>
    `<button class="btn chip${active ? ' active' : ''}" data-filter="${escapeHtml(slug)}">`
    + `${escapeHtml(label)}<span class="chip-count">${count}</span></button>`;
  return chip('all', 'all systems', total, true)
    + groups.map(group => chip(group.slug, group.label, group.items.length, false)).join('');
}

function replaceFilterBar(html, inner) {
  const pattern = /(<div class="filter-bar[^"]*"[^>]*>)[\s\S]*?(<\/div>)/;
  if (!pattern.test(html)) return { html, ok: false };
  return { html: html.replace(pattern, `$1${inner}$2`), ok: true };
}

function groupWork(items) {
  const known = new Map(WORK_CATEGORIES.map(([slug, label]) => [slug, { slug, label, items: [] }]));
  const spare = { slug: 'other', label: 'more work', items: [] };
  for (const item of items) {
    const bucket = known.get(item.category) || spare;
    bucket.items.push(item);
  }
  return [...known.values(), spare].filter(group => group.items.length);
}

function workCard(item, beyondFirstBatch = false) {
  const image = storageUrl(item.image_path);
  const srcset = item.image_path
    ? IMAGE_WIDTHS.map(w => `${storageUrl(item.image_path, w)} ${w}w`).join(', ')
    : '';
  const visual = image
    ? `<div class="card-visual managed"><img class="work-art" src="${escapeHtml(image)}" srcset="${escapeHtml(srcset)}" sizes="(max-width:900px) 100vw, 620px" loading="lazy" width="1600" height="1000" alt="${escapeHtml(item.image_alt || '')}"></div>`
    : `<div class="card-visual managed"></div>`;
  const link = typeof item.link_url === 'string' && /^(https:\/\/|\/)/.test(item.link_url)
    ? `<a class="btn sm" href="${escapeHtml(item.link_url)}"${item.link_url.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : ''}>view project <span class="arrow">↗</span></a>`
    : '';
  return `<article class="work-card${item.featured ? ' is-featured' : ''}" data-type="${escapeHtml(item.category || 'product')}"${item.slug ? ` id="work-${escapeHtml(item.slug)}"` : ''}${beyondFirstBatch ? ' hidden' : ''}>`
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
      // Structured data is read off-site, so the image has to be absolute here
      // even though the same helper is a site-relative src in the markup.
      const image = storageUrl(item.image_path, 1600);
      if (image) node.image = `https://abatchan.com${image}`;
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

  const open = html.match(/<div class="work-groups"[^>]*>/);
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

// Keep first-paint ownership in the document itself. These behaviours used to
// arrive as four tiny patch scripts after styles and markup had already painted,
// which caused the Work grid to briefly show its older two-column state. Their
// logic now lives in script.js/assistant-v2.js and their CSS lives in styles.css.
function normalizeRuntime(html, page) {
  html = html
    .replace(/<script src="\/(?:assistant-polish|mobile-viewport-fix|responsive-lamp|work-grid-layout-fix)\.js\?v=\d+"><\/script>/g, '')
    .replace(/\/styles\.css\?v=20/g, '/styles.css?v=21')
    .replace(/\/script\.js\?v=(?:21|22|23|24|25|26|27|28|29|30|31|32|33)/g, '/script.js?v=34')
    .replace(/\/assistant-v2\.js\?v=(?:10|11|12|13|14|15|16|17|18|19|20|21|22)/g, '/assistant-v2.js?v=23')
    .replace(/\/dynamic-work\.js\?v=11/g, '/dynamic-work.js?v=12');

  html = html.replace(/<img class="work-art"([^>]*)>/g, (tag, attrs) =>
    /\bwidth=/.test(attrs)
      ? tag
      : `<img class="work-art"${attrs} width="1600" height="1000">`
  );

  if (page === 'index.html' && !/<body[^>]*\bdata-home-grid=/.test(html)) {
    html = html.replace(/<body([^>]*)>/, '<body$1 data-home-grid="aligned">');
  }
  if (page === 'work.html' && !/<body[^>]*\bdata-work-grid=/.test(html)) {
    html = html.replace(/<body([^>]*)>/, '<body$1 data-work-grid="three">');
  }
  return html;
}

// The reviews section is authored hidden so the page never flashes an empty
// heading while reviews.js is still fetching. Once the rows are written into
// the HTML there is nothing to wait for, and leaving it hidden was costing
// twice over: visitors saw the section pop in and shove the page down — the
// whole of this page's layout-shift score — and a crawler was handed 26
// reviews inside a hidden element, which is exactly what prerendering them
// was meant to avoid.
// Matched by what it wraps rather than by its exact attributes, so restyling
// the section does not silently turn the fix off. After the first build the
// attribute is gone and this is a no-op, which is why a miss is not a warning.
function unhideReviewSection(html) {
  return html.replace(
    /<section([^>]*?)\s+hidden([^>]*)>(\s*<div class="review-ledger review-archive")/,
    '<section$1$2>$3'
  );
}

// The home and pricing teasers sit in their own hidden section, for the same
// reason and with the same cost: reviews.js reveals it, so a crawler saw a
// heading promising client reviews above an empty, hidden box.
function unhideTeaserSection(html) {
  return html.replace(
    /<section([^>]*?)\s+hidden([^>]*)>((?:(?!<\/section>)[\s\S])*?data-reviews-latest)/,
    '<section$1$2>$3'
  );
}

// Mirrors the ordering in reviews.js: a date like "January 2025" becomes a
// sortable number, and anything unparseable sorts last rather than pretending
// to be recent. The two have to agree — if the server picks a different five
// than the client, the client swaps them out after paint and the section
// jumps, which is the bug this whole pass exists to remove.
const REVIEW_MONTHS =
  'january february march april may june july august september october november december'.split(' ');
const reviewWhen = item => {
  const parts = String(item.date || '').trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return 0;
  const month = REVIEW_MONTHS.indexOf(parts[0]);
  const year = Number(parts[1]);
  return month < 0 || !year ? 0 : year * 12 + month + 1;
};
const latestFirst = (a, b) => reviewWhen(b) - reviewWhen(a) || (a.position ?? 0) - (b.position ?? 0);
const TEASER_REVIEW_IDS = [
  'review-cleaning-2026-05',
  'review-rescue-2025-01',
  'review-ghl-2025-10',
  'review-bandzoogle-2024-04',
  'review-fix-2026-03'
];
const curatedReviewsFirst = items => {
  const byId = new Map(items.map(item => [item.id, item]));
  const selected = TEASER_REVIEW_IDS.map(id => byId.get(id)).filter(Boolean);
  const selectedIds = new Set(selected.map(item => item.id));
  return selected.concat(items.filter(item => !selectedIds.has(item.id)).sort(latestFirst));
};

// Writes the newest few reviews into a page that only teases them, then opens
// the section and, when there are more than fit, the "see all" link.
async function writeTeaser(file, published) {
  let html = await read(file);
  const declared = html.match(/data-reviews-limit="(\d+)"/);
  const limit = declared ? Number(declared[1]) : 5;
  const live = curatedReviewsFirst(published).slice(0, limit);

  const injected = injectInto(
    html,
    /<div class="review-ledger"[^>]*data-reviews-latest[^>]*>/,
    'reviews-teaser',
    live.map(reviewRow).join('')
  );
  if (!injected.ok) {
    warn(`${file}: review teaser ledger not found, left alone`);
    return;
  }
  html = unhideTeaserSection(injected.html);

  if (published.length > live.length) {
    html = html.replace(/(<div class="review-more[^>]*?data-reviews-more)\s+hidden(>)/, '$1$2');
  }
  html = html.replace(
    /(<span data-reviews-count>)\d+(<\/span>)/,
    `$1${published.length}$2`
  );

  await write(file, html);
  note(`${file}: ${live.length} teaser reviews written, ${published.length} published`);
}

// pricing.html is intentionally minified in the repository. Keep its public,
// crawler-visible commercial copy current here instead of painting newer
// words over old HTML after load. Every replacement is deliberately exact so
// an owner edit is preserved rather than silently overwritten.
async function updatePricingPositioning() {
  let html = await read('pricing.html');
  const replacements = [
    ['<span class="signal"></span>clear starting points</div><h1 class="reveal">Pricing built around outcomes.</h1>', '<span class="signal"></span>clear scope, no inflated agency overhead</div><h1 class="reveal">Serious systems. Sensible starting points.</h1>'],
    ['<p class="pricing-intro">Choose the closest starting point. I scope every project before work begins, so you know what is included, what it costs, and what happens next.</p><div class="price-note">Prices are starting points in USD. Final quotes depend on scope, integrations, content readiness, deadlines, and the condition of any existing system.</div>', '<p class="pricing-intro">Tell me what needs to work. I will recommend the smallest sensible scope, explain the trade-offs, and quote it before anything begins.</p><div class="price-note">Prices are starting points in USD. Reusable systems and AI cut waste; scope, risk, integrations, content readiness, and support still determine the final quote.</div>'],
    ['<div class="price">$150 <small>landing pages from</small></div><p>For focused landing pages and business websites built quickly without sacrificing clarity, responsiveness, or conversion.</p><ul class="price-list"><li>landing pages from $150</li><li>focused landing pages commonly delivered in 2–3 working days</li><li>focused 5-page business websites commonly delivered in about 5 working days</li><li>responsive design, enquiry flow, SEO, deployment, and handover</li><li>final price depends on sections, content, integrations, and functionality</li>', '<div class="price">$500 <small>landing pages from</small></div><p>For a focused landing page or small business website that needs to look credible, load quickly, and turn interest into enquiries.</p><ul class="price-list"><li>focused landing pages from $500</li><li>small business websites commonly $1,200–$2,000</li><li>typical landing-page build: 3–5 working days once content and access are ready</li><li>responsive UI, enquiry flow, basic technical SEO, analytics, deployment, and handover</li><li>final price follows pages, content, integrations, and functionality</li>'],
    ['<div class="price">$1,500 <small>starting</small></div>', '<div class="price">$2,500 <small>starting</small></div>'],
    ['<div class="price">$3,500 <small>starting</small></div>', '<div class="price">$5,000 <small>starting</small></div>'],
    ['<li>testing, deployment, and support plan</li>', '<li>permissions, error handling, monitoring, and documentation</li>'],
    ['Ongoing technical work starts at $30 per hour when project pricing is not suitable.', 'Ongoing technical work starts at $45 per hour when project pricing is not suitable.'],
    ['Maintenance, improvements, and technical support start at $600 per month.', 'A reserved support plan starts at $600 per month. Included time and response windows are agreed before it begins.'],
    ['<h3>Custom scope</h3><p>Large systems are split into milestones, so risk and delivery stay controlled.</p>', '<h3>Brand and product design</h3><p>Identity systems, interface direction, and launch assets are scoped separately so creative work is not treated as a free extra.</p>'],
    ['<h2>No mystery around the price.</h2>', '<h2>Quote the work, not the hype.</h2>'],
    ['<div><h2>Delivered at these prices.</h2><p>Unedited feedback from paid contracts on Upwork and Fiverr.</p>', '<div><h2>What clients say after delivery.</h2><p>Their words, unedited, from paid Upwork and Fiverr contracts.</p>']
  ];
  for (const [before, after] of replacements) {
    if (html.includes(before)) html = html.replace(before, after);
    else if (!html.includes(after)) warn(`pricing.html: expected commercial copy not found: ${before.slice(0, 64)}…`);
  }

  const publicFaqs = [
    ['What will my project actually cost?', 'The figures above are honest starting points, not bait prices or automatic quotes. Once I understand the pages, workflows, integrations, content, deadline, and current setup, I send a written scope with the final price before work begins.'],
    ['How do payments work?', 'You receive an invoice rather than a generic checkout link. Small jobs are usually funded upfront. Larger builds are split into clear milestones, so you approve and fund the work in manageable stages.'],
    ['How quickly can you deliver?', 'A focused landing page usually takes 3–5 working days once the content, references, access, and feedback are ready. A small business website commonly takes 1–2 weeks. Ecommerce, dashboards, migrations, custom workflows, and integrations need a schedule based on the real scope.'],
    ['Can we start small and add more later?', 'Yes. We can launch the smallest version that solves the immediate problem, as long as the foundation accounts for what you may add later. That avoids paying twice for the same structure.'],
    ['Can you repair or extend something that already exists?', 'Yes. I work with existing websites, booking systems, ecommerce stores, WordPress builds, automations, and custom products. I review the current setup first, then tell you what is worth keeping, what is causing risk, and the smallest sensible route forward.'],
    ['Do you use templates, AI, or custom code?', 'I use proven components, automation, and AI when they save real time. I write custom code where your workflow needs it. Everything is still reviewed, tested, and owned as part of the project.'],
    ['How are feedback and scope changes handled?', 'Each milestone says what is included and where feedback belongs. Normal revisions inside that scope are part of the work. If a new page, workflow, or integration appears later, I price it clearly before building it.'],
    ['What happens after launch?', 'I test, deploy, and hand over the finished work with the access and documentation we agreed on. If you want ongoing improvements, monitoring, or technical support, we can continue hourly or under a monthly support plan.']
  ].map(([question, answer]) => `<details><summary>${question}</summary><p>${answer}</p></details>`).join('');
  html = html.replace(/<div class="faq-list reveal">[\s\S]*?<\/div><\/div><\/section><section class="shell pricing-cta">/, `<div class="faq-list reveal">${publicFaqs}</div></div></section><section class="shell pricing-cta">`);
  html = html
    .replace('/script.js?v=24', '/script.js?v=25')
    .replace('/commercial-positioning.js?v=5', '/commercial-positioning.js?v=6')
    .replace('/faq-data.js?v=1', '/faq-data.js?v=2')
    .replace('/faq-system.js?v=12', '/faq-system.js?v=13')
    .replace('/reviews.js?v=5', '/reviews.js?v=6');
  await write('pricing.html', html);
}

async function updateChangedAssetVersions() {
  for (const file of ['index.html', 'reviews.html', 'admin.html']) {
    let html = await read(file);
    html = html
      .replace('/reviews.js?v=5', '/reviews.js?v=6')
      .replace('/faq-data.js?v=1', '/faq-data.js?v=2')
      .replace('/faq-admin.js?v=15', '/faq-admin.js?v=16');
    await write(file, html);
  }
}

async function run() {
  await updatePricingPositioning();
  await updateChangedAssetVersions();
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
      html = addSchema(unhideReviewSection(injected.html), 'reviewschema', reviewSchema(published));
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
      const groups = groupWork(work);
      // Past the threshold the page opens on a first batch. The cards beyond
      // it are written out in full and marked hidden, so the "load more"
      // button reveals markup that is already here rather than fetching, and
      // the first paint is the same height the script will settle on.
      const paginate = work.length >= WORK_PAGINATE_FROM;
      let rendered = 0;
      const cards = groups.map(group => {
        const inner = group.items.map(item => {
          const beyond = paginate && rendered >= WORK_PAGE_SIZE;
          rendered += 1;
          return workCard(item, beyond);
        }).join('');
        return `<section class="work-group" data-group="${escapeHtml(group.slug)}">`
          + `<h2 class="work-group-head">${escapeHtml(group.label)}`
          + `<span class="work-group-count">${group.items.length}</span></h2>`
          + `<div class="work-grid">${inner}</div>`
          + `</section>`;
      }).join('');
      const injected = replaceWorkGrid(html, cards);
      if (injected.ok) {
        const bar = replaceFilterBar(injected.html, filterBarMarkup(groups, work.length));
        if (!bar.ok) warn('work.html: filter bar not found, chips left as authored');
        html = addSchema(bar.html, 'workschema', workSchema(work));
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

  // ---- home and pricing review teasers
  // Runs before the pricing FAQ step below, which reads pricing.html again.
  if (published.length) {
    for (const file of ['index.html', 'pricing.html']) {
      try {
        await writeTeaser(file, published);
      } catch (err) {
        warn(`${file} teaser:`, err.message);
      }
    }
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
      const html = normalizeRuntime(await read(page), page);
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
