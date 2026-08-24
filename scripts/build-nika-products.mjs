import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const version = '0.2.0';
const core = join(root, 'products', 'nika-core');
const wordpress = join(root, 'wordpress', 'nika-site-guide');
const universal = join(root, 'universal', 'nika-universal');
const downloads = join(root, 'downloads');

mkdirSync(join(wordpress, 'assets'), { recursive: true });
mkdirSync(join(universal, 'public'), { recursive: true });
mkdirSync(downloads, { recursive: true });
for (const name of ['nika-widget.js', 'nika-widget.css']) {
  cpSync(join(core, name), join(wordpress, 'assets', name));
  cpSync(join(core, name), join(universal, 'public', name));
}

const plugin = readFileSync(join(wordpress, 'nika-site-guide.php'), 'utf8');
const pkg = JSON.parse(readFileSync(join(universal, 'package.json'), 'utf8'));
if (!plugin.includes(`Version:           ${version}`) || pkg.version !== version) {
  throw new Error(`Adapter versions must both equal ${version}.`);
}

const checks = spawnSync(process.execPath, [join(root, 'tests', 'run.mjs')], { cwd: root, stdio: 'inherit' });
if (checks.status !== 0) process.exit(checks.status || 1);

const artifacts = [
  { cwd: join(root, 'wordpress'), source: 'nika-site-guide', output: `nika-site-guide-${version}.zip` },
  { cwd: join(root, 'universal'), source: 'nika-universal', output: `nika-universal-${version}.zip` }
];
for (const artifact of artifacts) {
  const destination = join(downloads, artifact.output);
  rmSync(destination, { force: true });
  const zip = spawnSync('zip', ['-q', '-r', destination, artifact.source, '-x', '*/data/*', '*/.env', '*.DS_Store'], { cwd: artifact.cwd, stdio: 'inherit' });
  if (zip.status !== 0) throw new Error(`Could not build ${artifact.output}. Install the zip command and retry.`);
  console.log(`built downloads/${artifact.output}`);
}
