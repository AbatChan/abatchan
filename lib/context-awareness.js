const compact = (value, limit = 500) => String(value == null ? '' : value)
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, limit);

export function normalizeCurrentPath(value) {
  const raw = compact(value, 500);
  if (!raw.startsWith('/')) return '/';
  try {
    const url = new URL(raw, 'https://nika.invalid');
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const hash = /^#[a-z0-9_-]{1,100}$/i.test(url.hash) ? url.hash : '';
    return `${path}${hash}`;
  } catch {
    return '/';
  }
}

export function isCurrentLocationQuestion(value) {
  const message = compact(value, 1000).toLowerCase().replace(/[’]/g, "'");
  if (!message || /\b(?:take|send|bring|navigate|go|open|move)\s+(?:me|us)\b/.test(message)) return false;
  return /\bwhere\s+(?:am\s+i|are\s+we)(?:\s+(?:now|currently|right now))?\b/.test(message)
    || /\b(?:what|which)\s+page\s+(?:(?:am\s+i|are\s+we)\s+on|is\s+this|we(?:'re|\s+are)\s+on)\b/.test(message)
    || /\b(?:what|which)\s+section\s+(?:(?:am\s+i|are\s+we)\s+(?:in|on|viewing)|is\s+this)\b/.test(message)
    || /\bwhat\s+(?:am\s+i|are\s+we)\s+looking\s+at\b/.test(message)
    || /\bwhat(?:'s|\s+is)\s+(?:currently\s+)?in\s+view\b/.test(message)
    || /\bwhat(?:'s|\s+is)\s+(?:currently\s+)?on\s+(?:the\s+)?screen(?:\s+(?:rn|now|right now|currently))?\b/.test(message);
}

function titleWithoutSiteSuffix(value) {
  return compact(value, 180).split(/\s+(?:\||·|–|—)\s+/)[0].trim();
}

function pathLabel(path) {
  const base = normalizeCurrentPath(path).split('#')[0];
  if (base === '/') return 'Home';
  const segment = decodeURIComponent(base.split('/').filter(Boolean).at(-1) || 'page');
  return segment.replace(/[-_]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}

export function currentLocationAnswer(message, current = {}) {
  if (!isCurrentLocationQuestion(message)) return '';
  const path = normalizeCurrentPath(current.path || '/');
  const page = compact(current.heading, 180) || titleWithoutSiteSuffix(current.title) || pathLabel(path);
  const active = current.activeSection && typeof current.activeSection === 'object' ? current.activeSection : {};
  const section = compact(active.label, 180);
  const kind = compact(active.kind, 30);
  if (!section || section.toLowerCase() === page.toLowerCase()) return `You're on the ${page} page.`;
  if (kind === 'dialog') return `You're on the ${page} page, with ${section} open.`;
  if (kind === 'tab') return `You're on the ${page} page, viewing the ${section} tab.`;
  if (kind === 'details') return `You're on the ${page} page, with ${section} expanded.`;
  return `You're on the ${page} page, in the ${section} section.`;
}

const intentKey = value => compact(value, 240)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Exact, owner-authored section names do not need model interpretation. This
// keeps common chips and explicit "show me X" requests reliable even when an
// upstream provider returns malformed tool-call framing. Anything ambiguous or
// merely conversational still goes through the model and normal validation.
export function explicitSectionNavigation(message, pages = [], currentPath = '/') {
  const text = intentKey(message);
  if (!text || isCurrentLocationQuestion(message)) return null;
  if (!/\b(?:show|take|bring|send) (?:me|us)\b/.test(text)) return null;
  const current = normalizeCurrentPath(currentPath).split('#')[0];
  const matches = [];
  for (const page of Array.isArray(pages) ? pages : []) {
    const path = normalizeCurrentPath(page?.path || page?.url || '/').split('#')[0];
    if (path !== current) continue;
    for (const section of Array.isArray(page?.sections) ? page.sections : []) {
      const label = compact(section?.label, 120);
      const anchor = compact(section?.anchor, 100);
      const key = intentKey(label);
      if (!label || !/^[a-z0-9_-]+$/i.test(anchor) || !key) continue;
      if (new RegExp(`(?:^| )${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: |$)`).test(text)) {
        matches.push({ href: `${path}#${anchor}`, label, current: true });
      }
    }
  }
  return matches.length === 1 ? matches[0] : null;
}

export function historicalContext(content, turnPage, currentPath, role) {
  const text = compact(content, 4000);
  if (!text || role !== 'assistant') return text;
  const previous = normalizeCurrentPath(turnPage || '/').split('#')[0];
  const current = normalizeCurrentPath(currentPath || '/').split('#')[0];
  if (!turnPage || previous === current) return text;
  return `Historical reply from ${previous}. Any page, section, or visible-state claim below is not current.\n${text}`;
}
