// Every anchor the guide's page directory promises must exist on the page it
// names.
//
// A directory entry pointing at nothing is worse than no entry at all. The model
// trusts the directory, routes to the anchor, the browser finds nothing, and the
// guide then reports arrival at a section it never reached. A visitor asking for
// the middle of the homepage was taken to the footer and told it was Selected
// Work, twice, and the follow-up link was dead for the same reason.
//
// Sixteen of the fifty-four were missing when this was written, including
// /pricing#monthly-support, which is the anchor every highlight used to spend a
// second waiting for before giving up.

import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const tenant = readFileSync(new URL('lib/tenants/abatchan.js', root), 'utf8');

// Read the links out of the tenant facts rather than a list kept beside them: a
// list would be one more thing to forget to update.
const promised = new Map();
for (const match of tenant.matchAll(/\]\((\/[a-z-]*)#([a-z-]+)\)/g)) {
  const page = match[1] || '/';
  promised.set(`${page}#${match[2]}`, { page, id: match[2] });
}

const fileFor = page => (page === '/' ? 'index.html' : `${page.replace(/^\//, '')}.html`);
const pages = new Map();
const html = page => {
  if (!pages.has(page)) {
    try { pages.set(page, readFileSync(new URL(fileFor(page), root), 'utf8')); }
    catch { pages.set(page, null); }
  }
  return pages.get(page);
};

let failed = false;
const check = (label, value) => {
  const pass = Boolean(value);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
  if (!pass) failed = true;
};

console.log('=== every promised anchor exists on its page ===');
check('the directory promises anchors at all', promised.size > 40);

const missing = [...promised.values()].filter(({ page, id }) => {
  const source = html(page);
  return !source || !source.includes(`id="${id}"`);
});
check(`all ${promised.size} resolve${missing.length ? `, missing: ${missing.map(a => `${a.page}#${a.id}`).join(' ')}` : ''}`, missing.length === 0);

// The five the homepage never had, named individually because they are the ones
// the reported failure went through.
for (const id of ['selected-work', 'services', 'delivery-process', 'client-reviews', 'start-project']) {
  check(`the homepage has #${id}`, html('/').includes(`id="${id}"`));
}
check('pricing still has #monthly-support', html('/pricing').includes('id="monthly-support"'));

// An id used twice makes the browser pick one and the guide look wrong half the
// time, which is the same failure wearing a different hat.
console.log('\n=== and exactly once ===');
for (const page of new Set([...promised.values()].map(item => item.page))) {
  const source = html(page) || '';
  const duplicated = [...promised.values()]
    .filter(item => item.page === page)
    .filter(item => (source.match(new RegExp(`id="${item.id}"`, 'g')) || []).length > 1)
    .map(item => item.id);
  check(`${fileFor(page)} has no duplicate anchor${duplicated.length ? `: ${duplicated.join(' ')}` : ''}`, duplicated.length === 0);
}

if (failed) process.exit(1);
console.log('\nall passed');
