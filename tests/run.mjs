import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const suites = [
  'quota.test.mjs',
  'graduated.test.mjs',
  'handler.test.mjs',
  'admin-ip.test.mjs',
  'licence.test.mjs',
  'admin-assistant-generate.test.mjs',
  'assistant-ui.test.mjs',
  'dictation-transcript.test.mjs',
  'liquid-navigation.test.mjs',
  'prompt.test.mjs',
  'tenant-store.test.mjs',
  'wordpress-plugin.test.mjs',
  'context-awareness.test.mjs',
  'site-index.test.mjs',
  'nika-universal.test.mjs',
  'answer-extraction.test.mjs'
];

let failed = false;
for (const suite of suites) {
  console.log(`\n===== ${suite} =====`);
  const suitePath = fileURLToPath(new URL(suite, import.meta.url));
  const result = spawnSync(process.execPath, [suitePath], {
    stdio: 'inherit'
  });
  if (result.status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);
