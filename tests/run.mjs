import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const suites = [
  'quota.test.mjs',
  'graduated.test.mjs',
  'handler.test.mjs',
  'assistant-ui.test.mjs',
  'prompt.test.mjs'
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
