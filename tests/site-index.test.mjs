import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { indexStaticSite } from '../universal/nika-universal/site-index.mjs';

const site = mkdtempSync(join(tmpdir(), 'nika-site-index-'));
const write = (name, body) => {
  const path = join(site, name);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, body);
};

try {
  write('index.html', '<title>Test Home</title><main><h1>Welcome</h1><p>Original home content.</p><form>Private form value</form></main>');
  write('about.html', '<title>About Us</title><main><p>Original about content.</p></main>');
  write('private/hidden.html', '<title>Hidden</title><main>Never index this.</main>');

  const first = indexStaticSite(site, { excluded: ['private/'] });
  assert.deepEqual(first.map(page => page.path), ['/', '/about']);
  assert.match(first.find(page => page.path === '/')?.text || '', /Original home content/);
  assert.doesNotMatch(first.find(page => page.path === '/')?.text || '', /Private form value/);

  write('about.html', '<title>About Us</title><main><p>Freshly updated content.</p></main>');
  write('news.html', '<title>Latest News</title><main><h1>Launch update</h1><p>This is a newly published page.</p></main>');

  const second = indexStaticSite(site, { excluded: ['private/'] });
  assert.deepEqual(second.map(page => page.path), ['/', '/about', '/news']);
  assert.match(second.find(page => page.path === '/about')?.text || '', /Freshly updated content/);
  assert.match(second.find(page => page.path === '/news')?.text || '', /newly published page/);
  console.log('PASS  discovers a newly published HTML page');
  console.log('PASS  refreshes changed page content');
  console.log('PASS  excludes private paths and form contents');
} finally {
  rmSync(site, { recursive: true, force: true });
}
