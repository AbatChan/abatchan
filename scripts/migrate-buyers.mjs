// Reconcile PayPal history into a licence migration list.
//
//   node scripts/migrate-buyers.mjs paypal-export.csv > migration.json
//
// Reads a PayPal activity export and produces one row per buyer: who they are,
// which package the amount corresponds to, and what their update term should
// be. It does not issue anything. Issuing licences is a deliberate, reviewable
// step you take with that list in front of you.
//
// The rule this encodes, from the plan: an existing buyer's twelve months start
// at migration, not at their original purchase. They bought before any of this
// existed, so the clock starts when the system does.

import { readFileSync } from 'node:fs';

const PACKAGES = [
  { tier: 'personal', amount: 99, sites: 2 },
  { tier: 'business', amount: 199, sites: 5 },
  { tier: 'agency', amount: 399, sites: 50 }
];

// PayPal exports vary by account and locale, so match on meaning rather than a
// fixed column order.
const COLUMNS = {
  date: /^date$/i,
  name: /^name$/i,
  email: /^from ?email ?address$|^payer ?email$|^email$/i,
  gross: /^gross$/i,
  currency: /^currency$/i,
  status: /^status$/i,
  type: /^type$/i,
  transaction: /^transaction ?id$/i
};

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ',') { row.push(field); field = ''; continue; }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (char !== '\r') field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(item => item.some(cell => cell.trim() !== ''));
}

function indexHeaders(header) {
  const found = {};
  header.forEach((name, index) => {
    const trimmed = name.trim();
    for (const [key, pattern] of Object.entries(COLUMNS)) {
      if (found[key] === undefined && pattern.test(trimmed)) found[key] = index;
    }
  });
  return found;
}

// Someone who paid $199 bought Business, whatever the line item was called.
// Anything that matches no package is reported rather than guessed at.
function packageFor(gross) {
  const amount = Math.round(Math.abs(Number(String(gross).replace(/[^0-9.-]/g, '')) || 0));
  return PACKAGES.find(item => item.amount === amount) || null;
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/migrate-buyers.mjs <paypal-export.csv>');
  process.exit(1);
}

const rows = parseCsv(readFileSync(file, 'utf8'));
if (rows.length < 2) { console.error('That export has no rows.'); process.exit(1); }

const at = indexHeaders(rows[0]);
if (at.gross === undefined || at.email === undefined) {
  console.error('Could not find the Gross and payer email columns in that export.');
  console.error('Columns seen:', rows[0].map(name => name.trim()).filter(Boolean).join(', '));
  process.exit(1);
}

const cell = (row, key) => (at[key] === undefined ? '' : String(row[at[key]] || '').trim());
const migratedAt = new Date();
const updatesUntil = new Date(migratedAt);
updatesUntil.setFullYear(updatesUntil.getFullYear() + 1);

const buyers = new Map();
const skipped = [];
// A refund is not just a row to skip. It cancels the purchase it refers to, and
// a refunded buyer who still receives a licence is product given away.
const refunded = new Map();

for (const row of rows.slice(1)) {
  const status = cell(row, 'status').toLowerCase();
  const type = cell(row, 'type').toLowerCase();
  const gross = cell(row, 'gross');
  const email = cell(row, 'email').toLowerCase();
  const amount = Number(String(gross).replace(/[^0-9.-]/g, '')) || 0;

  // Refunds and reversals are negative. Record what was returned to whom before
  // skipping the row, so it can be netted off below.
  if (amount <= 0) {
    if (email) refunded.set(email, (refunded.get(email) || 0) + Math.abs(amount));
    skipped.push({ email, gross, why: 'not a positive payment' });
    continue;
  }
  if (status && !/complete|completed|success/i.test(status)) { skipped.push({ email, gross, why: `status ${status}` }); continue; }
  if (/subscription|authorization|dispute/i.test(type)) { skipped.push({ email, gross, why: `type ${type}` }); continue; }
  if (!email) { skipped.push({ email: '', gross, why: 'no payer email' }); continue; }

  const chosen = packageFor(gross);
  if (!chosen) { skipped.push({ email, gross, why: 'amount matches no package' }); continue; }

  // Someone who bought twice keeps the larger package rather than two licences.
  const existing = buyers.get(email);
  if (!existing || chosen.amount > existing.amount) {
    buyers.set(email, {
      email,
      name: cell(row, 'name'),
      tier: chosen.tier,
      sites: chosen.sites,
      amount: chosen.amount,
      paidOn: cell(row, 'date'),
      transaction: cell(row, 'transaction'),
      purchases: (existing?.purchases || 0) + 1
    });
  } else {
    existing.purchases += 1;
  }
}

// Net refunds against what each buyer paid. Anyone refunded at least what their
// package cost is not migrated, and is listed so the decision is visible rather
// than silent.
const reversed = [];
for (const [email, total] of refunded) {
  const buyer = buyers.get(email);
  if (!buyer) continue;
  if (total >= buyer.amount) {
    buyers.delete(email);
    reversed.push({ ...buyer, refunded: total });
  } else {
    buyer.partialRefund = total;
  }
}

const list = [...buyers.values()].sort((a, b) => b.amount - a.amount);
const totals = PACKAGES.map(item => ({ tier: item.tier, buyers: list.filter(row => row.tier === item.tier).length }));

console.log(JSON.stringify({
  migratedAt: migratedAt.toISOString(),
  updatesUntil: updatesUntil.toISOString(),
  note: 'Update terms start at migration, not at the original purchase date.',
  totals,
  buyers: list,
  // Refunded in full, so deliberately not migrated. Check this list: a partial
  // refund leaves the buyer in place with partialRefund set.
  reversed,
  // Never silently dropped: every skipped row is listed so it can be checked by
  // hand. A buyer missed here becomes a support ticket the day downloads close.
  skipped
}, null, 2));

console.error(`${list.length} buyers, ${reversed.length} refunded and excluded, ${skipped.length} rows skipped.`);
console.error('Review "skipped" and "reversed" before issuing anything.');
