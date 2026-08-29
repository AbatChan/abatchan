import { strict as assert } from 'node:assert';
import {
  currentLocationAnswer,
  explicitSectionNavigation,
  historicalContext,
  isCurrentLocationQuestion,
  normalizeCurrentPath
} from '../lib/context-awareness.js';

const cases = [
  ['where am I now?', true],
  ['which page are we on?', true],
  ["do you know what page we're on", true],
  ['what section am I viewing?', true],
  ["what's in view?", true],
  ["what's on the screen rn?", true],
  ['what is currently on screen?', true],
  ['where am I and what is the main promise?', false],
  ['where is the pricing page?', false],
  ['take me to the page we were on', false],
  ['which page should I open?', false]
];

console.log('=== current-location intent ===');
for (const [message, expected] of cases) {
  const actual = isCurrentLocationQuestion(message);
  console.log(`${actual === expected ? 'PASS' : 'FAIL'}  ${message}`);
  assert.equal(actual, expected);
}

console.log('\n=== live view always wins ===');
assert.equal(
  currentLocationAnswer('which page are we on?', {
    path: '/nika', title: 'Nika | Abatchan', heading: 'Meet Nika',
    activeSection: { label: 'Answers that lead somewhere', kind: 'section' }
  }),
  "You're on the Meet Nika page, in the Answers that lead somewhere section."
);
assert.equal(
  currentLocationAnswer('what am I looking at?', {
    path: '/account', title: 'Account · Example', heading: 'Account',
    activeSection: { label: 'Delete account', kind: 'dialog' }
  }),
  "You're on the Account page, with Delete account open."
);
assert.equal(
  currentLocationAnswer("what's in view?", {
    path: '/docs', title: 'Docs | Example', activeSection: { label: 'API keys', kind: 'tab' }
  }),
  "You're on the Docs page, viewing the API keys tab."
);
assert.equal(
  currentLocationAnswer('where are we?', { path: '/brand-new-page' }),
  "You're on the Brand New Page page."
);

console.log('\n=== privacy and stale-history boundaries ===');
assert.equal(normalizeCurrentPath('/account?email=visitor@example.com#billing'), '/account#billing');
assert.equal(normalizeCurrentPath('/account#not safe'), '/account');
assert.match(historicalContext('You are on Pricing.', '/pricing', '/nika', 'assistant'), /^Historical reply from \/pricing/);
assert.equal(historicalContext('My budget is $500.', '/pricing', '/nika', 'user'), 'My budget is $500.');

console.log('\n=== exact section navigation does not depend on the model ===');
const pages = [
  { path: '/nika', sections: [{ label: 'product plans', anchor: 'beta-plans' }] },
  { path: '/pricing', sections: [{ label: 'monthly support', anchor: 'monthly-support' }] }
];
assert.deepEqual(explicitSectionNavigation('Show me the product plans on this page.', pages, '/nika'), {
  href: '/nika#beta-plans', label: 'product plans', current: true
});
assert.equal(explicitSectionNavigation('What are the product plans?', pages, '/nika'), null);
assert.equal(explicitSectionNavigation('Show me plans', pages, '/nika'), null);

console.log('\nall passed');
