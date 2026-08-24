import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';

const root = resolve(import.meta.dirname, '..');
const temporary = mkdtempSync(join(tmpdir(), 'nika-abatchan-qa-'));
const content = join(temporary, 'content.json');
const config = join(temporary, 'nika.config.json');
const data = join(temporary, 'data');
const adapterPort = 8891;
const providerPort = 8892;

const indexer = spawn(process.execPath, [join(root, 'universal/nika-universal/index-static-site.mjs'), root, content, '--exclude=404.html,admin.html,embed.html,audit/'], { stdio: 'inherit' });
if ((await once(indexer, 'exit'))[0] !== 0) process.exit(1);
writeFileSync(config, JSON.stringify({
  enabled: true,
  name: 'Nika',
  greeting: 'Hi. I can guide you around Abatchan.',
  instructions: 'Explain Abatchan services using published content. Guide visitors only when explicitly asked.',
  navigation: true,
  dictation: true,
  accent: '#6366f1',
  position: 'right',
  hourlyLimit: 5,
  dailyLimit: 20,
  excludedPaths: ['/privacy']
}, null, 2));

const provider = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const prompt = request.messages?.[0]?.content || '';
  const pass = prompt.includes('Web development and product engineering pricing') && prompt.includes('/pricing') && !prompt.includes('(/privacy)');
  res.writeHead(pass ? 200 : 400, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ message: 'Monthly Support is on the pricing page.', action: { href: '/pricing#monthly-support', label: 'Monthly Support', departure: 'Opening monthly support...' } }) } }] }));
});
provider.listen(providerPort, '127.0.0.1');
await once(provider, 'listening');

const adapter = spawn(process.execPath, [join(root, 'universal/nika-universal/server.mjs')], {
  env: { ...process.env, NIKA_PORT: String(adapterPort), NIKA_PUBLIC_ORIGIN: `http://127.0.0.1:${adapterPort}`, NIKA_HASH_SECRET: 'qa-only-secret', NIKA_AI_PROVIDER: 'compatible', NIKA_AI_API_KEY: 'qa-only-key', NIKA_AI_ENDPOINT: `http://127.0.0.1:${providerPort}/chat`, NIKA_ALLOW_INSECURE_LOCAL_PROVIDER: '1', NIKA_CONFIG_FILE: config, NIKA_CONTENT_FILE: content, NIKA_DATA_DIR: data },
  stdio: ['ignore', 'pipe', 'inherit']
});
await new Promise((resolveReady, reject) => {
  const timer = setTimeout(() => reject(new Error('Nika adapter did not start.')), 10000);
  adapter.stdout.on('data', chunk => { if (chunk.toString().includes('listening')) { clearTimeout(timer); resolveReady(); } });
  adapter.once('exit', code => reject(new Error(`Nika adapter exited ${code}`)));
});

let failed = false;
const check = (label, pass) => { console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`); failed ||= !pass; };
try {
  const base = `http://127.0.0.1:${adapterPort}`;
  const configured = await fetch(`${base}/nika/config`, { headers: { origin: base } });
  const publicConfig = await configured.json();
  check('Abatchan pages were indexed', publicConfig.pages.some(page => page.path === '/pricing'));
  check('customer-excluded privacy route stays unavailable', !publicConfig.pages.some(page => page.path === '/privacy'));
  check('customer appearance and microphone settings reach the widget', publicConfig.accent === '#6366f1' && publicConfig.dictation === true);
  const answer = await fetch(`${base}/nika/chat`, { method: 'POST', headers: { origin: base, 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Take me to monthly support', history: [], page: { path: '/', text: 'Abatchan home page' } }) });
  const result = await answer.json();
  check('full chat request completed through the provider adapter', answer.status === 200 && result.message.includes('Monthly Support'));
  check('Abatchan navigation action passed the server allowlist', result.action?.href === '/pricing#monthly-support');
  const foreign = await fetch(`${base}/nika/config`, { headers: { origin: 'https://foreign.example' } });
  check('foreign origin was rejected', foreign.status === 403);
} finally {
  adapter.kill('SIGTERM');
  provider.close();
  rmSync(temporary, { recursive: true, force: true });
}
if (failed) process.exit(1);
console.log('Abatchan Universal QA passed. No real provider key or visitor data was used.');
