import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { indexStaticSite } from './site-index.mjs';

const source = resolve(process.argv[2] || '.');
const destination = resolve(process.argv[3] || 'content.json');
const excluded = (process.argv.find(value => value.startsWith('--exclude=')) || '--exclude=404.html')
  .slice(10).split(',').map(value => value.trim()).filter(Boolean);
const pages = indexStaticSite(source, { excluded });

writeFileSync(destination, `${JSON.stringify({ pages }, null, 2)}\n`, { mode: 0o600 });
console.log(`Indexed ${pages.length} published HTML pages into ${destination}`);
