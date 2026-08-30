import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const version = '1.3.1';

// Versions iterate in .9s: the patch digit runs 0-9, then the minor rolls over.
// 0.3.9 is followed by 0.4.0, never 0.3.10.
const parts = version.split('.').map(Number);
if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 9)) {
  throw new Error(`Version ${version} must be three digits, each 0-9. After x.y.9 comes x.(y+1).0.`);
}
const brandAssets = join(root, 'assets');
const wordpress = join(root, 'wordpress', 'nika-site-guide');
const universal = join(root, 'universal', 'nika-universal');
const downloads = join(root, 'downloads');

mkdirSync(join(wordpress, 'assets'), { recursive: true });
mkdirSync(join(universal, 'public'), { recursive: true });
mkdirSync(downloads, { recursive: true });
// The guide a customer installs is the guide this site runs. These files are
// copied, never rewritten, so the packaged experience cannot drift from the one
// the design was made for; tests assert the copies stay byte-identical.
const guideFiles = ['guide-shell.js', 'assistant-v2.js', 'assistant.css'];
const guideIcons = [
  'alert-circle.svg', 'arrow-up.svg', 'chevron-down.svg', 'file-description.svg', 'microphone.svg',
  'photo.svg', 'plus.svg', 'shield-check.svg', 'square.svg',
  'suggestion-capabilities.svg', 'suggestion-process.svg', 'suggestion-work.svg', 'x.svg'
];
// Pinned bytes, served from the customer's own domain rather than a CDN, for
// the same reason this site pins them: they render model output.
const guideVendor = ['marked-15.0.12.min.js', 'purify-3.4.7.min.js'];

for (const target of [join(wordpress, 'assets'), join(universal, 'public')]) {
  mkdirSync(join(target, 'assets', 'icons'), { recursive: true });
  mkdirSync(join(target, 'assets', 'vendor'), { recursive: true });
  for (const name of guideFiles) cpSync(join(root, name), join(target, name));
  for (const name of guideIcons) cpSync(join(root, 'assets', 'icons', name), join(target, 'assets', 'icons', name));
  for (const name of guideVendor) cpSync(join(root, 'assets', 'vendor', name), join(target, 'assets', 'vendor', name));
}
cpSync(join(brandAssets, 'abatchan-symbol-white-tight-504x308.png'), join(wordpress, 'assets', 'nika-admin-icon.png'));
cpSync(join(brandAssets, 'abatchan-symbol-white-tight-504x308.png'), join(universal, 'public', 'nika-logo.png'));

const plugin = readFileSync(join(wordpress, 'nika-site-guide.php'), 'utf8');
const pkg = JSON.parse(readFileSync(join(universal, 'package.json'), 'utf8'));
if (!plugin.includes(`Version:           ${version}`) || pkg.version !== version) {
  throw new Error(`Adapter versions must both equal ${version}.`);
}

const checks = spawnSync(process.execPath, [join(root, 'tests', 'run.mjs')], { cwd: root, stdio: 'inherit' });
if (checks.status !== 0) process.exit(checks.status || 1);

const artifacts = [
  { cwd: join(root, 'wordpress'), source: 'nika-site-guide', output: `nika-site-guide-${version}.zip`, latest: 'nika-site-guide-latest.zip' },
  { cwd: join(root, 'universal'), source: 'nika-universal', output: `nika-universal-${version}.zip`, latest: 'nika-universal-latest.zip' }
];
for (const artifact of artifacts) {
  const destination = join(downloads, artifact.output);
  if (existsSync(destination)) throw new Error(`Refusing to overwrite immutable release ${artifact.output}. Bump the version first.`);
  const zip = spawnSync('zip', ['-q', '-r', destination, artifact.source, '-x', '*/data/*', '*/.env', '*.DS_Store'], { cwd: artifact.cwd, stdio: 'inherit' });
  if (zip.status !== 0) throw new Error(`Could not build ${artifact.output}. Install the zip command and retry.`);
  // A buyer is sent one link that has to keep working after the next release, so
  // the versioned file, which stays immutable, is also published under a stable
  // name that always points at the current build.
  cpSync(destination, join(downloads, artifact.latest));
  console.log(`built downloads/${artifact.output} (and ${artifact.latest})`);
}
