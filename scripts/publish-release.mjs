// Put a built release into the private archive.
//
//   node scripts/publish-release.mjs 1.5.3            both editions
//   node scripts/publish-release.mjs 1.5.3 wordpress  one of them
//   node scripts/publish-release.mjs --backfill       every zip in releases/
//
// Needs SUPABASE_SECRET_KEY in the environment. The bucket is private, so
// nothing uploaded here has a public URL: /api/download mints a signed link per
// request, and only after a licence key has been checked.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EDITIONS, parseVersion, releaseFile, releasePath } from '../lib/licence/releases.js';
import { SUPABASE_URL, serviceHeaders } from '../lib/licence/verify.js';
import { RELEASE_BUCKET } from '../lib/licence/store.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const archive = join(root, 'releases');

const headers = serviceHeaders();
if (!headers) {
  console.error('Set SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_KEY) before publishing a release.');
  process.exit(1);
}

async function upload(edition, version) {
  const file = releaseFile(edition, version);
  const source = join(archive, file);
  if (!existsSync(source)) return { file, ok: false, why: 'not built' };
  const body = readFileSync(source);
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${RELEASE_BUCKET}/${releasePath(edition, version)}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/zip', 'x-upsert': 'true' },
    body
  });
  return { file, ok: response.ok, why: response.ok ? `${(body.length / 1048576).toFixed(1)} MB` : `${response.status} ${await response.text().catch(() => '')}`.slice(0, 200) };
}

// Every version in the archive, read from the filenames rather than a list kept
// by hand, so a build that exists is a build that can be published.
function everything() {
  const found = [];
  for (const [edition, { slug }] of Object.entries(EDITIONS)) {
    for (const name of readdirSync(archive)) {
      const match = name.match(new RegExp(`^${slug}-(\\d+\\.\\d+\\.\\d+)\\.zip$`));
      if (match) found.push([edition, match[1]]);
    }
  }
  return found.sort();
}

const args = process.argv.slice(2);
const jobs = args[0] === '--backfill'
  ? everything()
  : (parseVersion(args[0])
    ? (args[1] ? [[args[1], args[0]]] : Object.keys(EDITIONS).map(edition => [edition, args[0]]))
    : null);

if (!jobs) {
  console.error('Usage: node scripts/publish-release.mjs <version> [wordpress|universal]');
  console.error('       node scripts/publish-release.mjs --backfill');
  process.exit(1);
}

let failed = 0;
for (const [edition, version] of jobs) {
  if (!EDITIONS[edition]) { console.error(`unknown edition: ${edition}`); failed++; continue; }
  const result = await upload(edition, version);
  console.log(`${result.ok ? 'published' : 'skipped  '} ${result.file}  ${result.why}`);
  if (!result.ok && result.why !== 'not built') failed++;
}
process.exit(failed ? 1 : 0);
