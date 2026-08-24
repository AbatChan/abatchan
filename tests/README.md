# Tests

The default suites use in-memory `fetch` stubs. They do not call Supabase,
DeepSeek, or the deployed site, and they do not spend assistant quota.

```bash
node tests/run.mjs
```

Run syntax checks alongside them before a deploy:

```bash
node --check api/quota.js
node --check api/chat-stream.js
node --check script.js
node --check admin.js
node tests/run.mjs
node tests/wordpress-plugin.test.mjs
```

## Live refusal probes

`tests/live/` calls the production assistant and can spend real quota. It is
guarded so an ordinary `node` command refuses to run it.

After confirming your connection is exempt:

```bash
LIVE_ASSISTANT_TESTS=1 node tests/live/redteam.mjs
LIVE_ASSISTANT_TESTS=1 ASSISTANT_TEST_RUNS=5 node tests/live/determinism.mjs
```

Use `ASSISTANT_TEST_URL` to target a non-production deployment. Do not lower a
preview limit to force quota errors: preview and production share Supabase, and
the quota keys are the only environment-namespaced part of that database.
