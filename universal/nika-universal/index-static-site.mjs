import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';

const source = resolve(process.argv[2] || '.');
const destination = resolve(process.argv[3] || 'content.json');
const excluded = new Set((process.argv.find(value => value.startsWith('--exclude=')) || '--exclude=404.html').slice(10).split(',').map(value => value.trim()).filter(Boolean));

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return entry.name.startsWith('.') || entry.name === 'node_modules' ? [] : files(path);
    return entry.isFile() && entry.name.endsWith('.html') ? [path] : [];
  });
}

function entities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, code) => {
    if (code[0] !== '#') return named[code.toLowerCase()] || ' ';
    const number = Number.parseInt(code[1].toLowerCase() === 'x' ? code.slice(2) : code.slice(1), code[1].toLowerCase() === 'x' ? 16 : 10);
    return Number.isFinite(number) ? String.fromCodePoint(number) : ' ';
  });
}

function route(path) {
  let name = relative(source, path).split(sep).join('/');
  name = name.replace(/index\.html$/i, '').replace(/\.html$/i, '');
  return `/${name}`.replace(/\/$/, '') || '/';
}

const pages = files(source).flatMap(path => {
  const file = relative(source, path).split(sep).join('/');
  if (excluded.has(file) || [...excluded].some(item => item.endsWith('/') && file.startsWith(item))) return [];
  const html = readFileSync(path, 'utf8');
  const title = entities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || route(path)).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
  const text = entities(main.replace(/<(script|style|noscript|svg|form|nav|footer)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 4000);
  return [{ path: route(path), title: title.slice(0, 160), text }];
}).sort((a, b) => a.path.localeCompare(b.path));

writeFileSync(destination, `${JSON.stringify({ pages }, null, 2)}\n`, { mode: 0o600 });
console.log(`Indexed ${pages.length} published HTML pages into ${destination}`);
