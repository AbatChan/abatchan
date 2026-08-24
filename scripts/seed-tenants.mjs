// One-time migration from the checked-in tenant fixtures to the private store.
// Run without --apply to inspect the target and row names without writing.

import { abatchan } from '../lib/tenants/abatchan.js';
import { northwind } from '../lib/tenants/northwind.js';
import { tenantSettingKey } from '../lib/tenants/store.js';

const apply = process.argv.includes('--apply');
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
const records = [abatchan, northwind];
const rows = records.map(record => ({
  key: tenantSettingKey(record.siteKey),
  value: record,
  is_public: false
}));

console.log(`Tenant store target: ${url || '(SUPABASE_URL is not set)'}`);
for (const row of rows) console.log(`- ${row.key} (${row.value.siteDomain})`);

if (!apply) {
  console.log('\nDry run only. Add --apply to upsert these private rows.');
  process.exit(0);
}
if (!url || !secret) {
  console.error('SUPABASE_URL and SUPABASE_SECRET_KEY are required with --apply.');
  process.exit(1);
}

const response = await fetch(`${url}/rest/v1/settings?on_conflict=key`, {
  method: 'POST',
  headers: {
    apikey: secret,
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal'
  },
  body: JSON.stringify(rows)
});

if (!response.ok) {
  console.error(`Tenant seed failed (${response.status}): ${await response.text()}`);
  process.exit(1);
}
console.log(`Seeded ${rows.length} private tenant records.`);
