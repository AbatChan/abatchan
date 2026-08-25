import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const MAX_PAGES = 250;
const MAX_PAGE_TEXT = 4000;

function files(directory, found = []) {
  if (found.length >= MAX_PAGES) return found;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (found.length >= MAX_PAGES) break;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') files(path, found);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      found.push(path);
    }
  }
  return found;
}

function entities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, code) => {
    if (code[0] !== '#') return named[code.toLowerCase()] || ' ';
    const hex = code[1].toLowerCase() === 'x';
    const number = Number.parseInt(hex ? code.slice(2) : code.slice(1), hex ? 16 : 10);
    return Number.isFinite(number) ? String.fromCodePoint(number) : ' ';
  });
}

function route(source, path) {
  let name = relative(source, path).split(sep).join('/');
  name = name.replace(/index\.html$/i, '').replace(/\.html$/i, '');
  return `/${name}`.replace(/\/$/, '') || '/';
}

function excludedFile(file, excluded) {
  return excluded.has(file) || [...excluded].some(item => item.endsWith('/') && file.startsWith(item));
}

export function indexStaticSite(sourcePath, { excluded = ['404.html'] } = {}) {
  const source = resolve(sourcePath);
  const omitted = new Set(excluded.map(value => String(value).trim().replace(/^\//, '')).filter(Boolean));
  return files(source).flatMap(path => {
    const file = relative(source, path).split(sep).join('/');
    if (excludedFile(file, omitted)) return [];
    const html = readFileSync(path, 'utf8');
    const pageRoute = route(source, path);
    const title = entities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || pageRoute).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1]
      || html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]
      || '';
    const text = entities(main
      .replace(/<(script|style|noscript|svg|form|nav|footer)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_PAGE_TEXT);
    return [{ path: pageRoute, title: title.slice(0, 160), text }];
  }).sort((a, b) => a.path.localeCompare(b.path));
}
