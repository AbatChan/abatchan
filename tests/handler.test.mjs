// Drives the real api/chat-stream.js handler with stubbed request, response and
// network objects. This checks the error bodies, retry flags and quota headers
// the browser consumes without calling DeepSeek or Supabase.
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
process.env.SUPABASE_URL = 'https://stub.local';
process.env.DEEPSEEK_API_KEY = 'test';
process.env.ASSISTANT_DAILY_MAX = '4';
process.env.ASSISTANT_IP_DAILY_MAX = '2';

const table = new Map();
let deepSeekMode = 'content';
let lastDeepSeekBody = null;

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const method = opts.method || 'GET';
  if (u.includes('/rpc/assistant_consume')) {
    return { ok: false, status: 404, json: async () => ({}) };
  }
  if (u.includes('api.deepseek.com')) {
    lastDeepSeekBody = JSON.parse(opts.body);
    const sse = deepSeekMode === 'tool'
      ? 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"navigate_site","arguments":"{\\"departure\\":\\"I’ll bring up the animated logo for you.\\",\\"progress\\":[\\"Finding the symbol sequence…\\"],\\"arrival\\":\\"You’re at the animated logo now. Want to explore how the symbol is constructed next?\\",\\"href\\":\\"/brand#symbol\\",\\"label\\":\\"animated logo\\"}"}}]}}]}\n\ndata: [DONE]\n\n'
      : 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"answer_site","arguments":"{\\"answer\\":\\"Connected systems, end to end.\\"}"}}]}}]}\n\ndata: [DONE]\n\n';
    const bytes = new TextEncoder().encode(sse);
    let sent = false;
    return {
      ok: true,
      body: {
        getReader: () => ({
          read: async () => sent
            ? { done: true }
            : (sent = true, { done: false, value: bytes })
        })
      }
    };
  }
  if (method === 'DELETE') return { ok: true };
  if (method === 'POST') {
    for (const row of JSON.parse(opts.body)) table.set(row.key, row.value);
    return { ok: true };
  }
  const keys = [...u.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  if (u.includes('work_items') || u.includes('key=in.(assistant.system')) {
    return { ok: true, json: async () => [] };
  }
  return {
    ok: true,
    json: async () => keys
      .filter(key => table.has(key))
      .map(key => ({ key, value: table.get(key) }))
  };
};

const { default: handler } = await import('../api/chat-stream.js');

const call = async (ip, message = 'what do you build?') => {
  const headers = {};
  const chunks = [];
  let status = 200;
  let json = null;
  const res = {
    setHeader: (key, value) => { headers[key.toLowerCase()] = String(value); },
    status(code) {
      status = code;
      return this;
    },
    json(body) {
      json = body;
      return body;
    },
    write: chunk => chunks.push(chunk),
    end: () => {},
    flushHeaders: () => {},
    get headersSent() { return false; },
    set statusCode(code) { status = code; }
  };
  await handler({
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': '60',
      'x-forwarded-for': ip
    },
    body: { message, page: '/' }
  }, res);
  return { status, json, headers, text: chunks.join('') };
};

let failures = 0;
const check = (label, got, want) => {
  const ok = String(got) === String(want);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}\n        ${got}${ok ? '' : `\n        expected: ${want}`}`);
};

console.log('=== visitor 1, within their allowance ===');
let result = await call('1.1.1.1');
check('answers', result.text, 'Connected systems, end to end.');
check('site budget header', result.headers['x-guide-remaining'], '3');
check('personal budget header', result.headers['x-guide-personal'], '1');

result = await call('1.1.1.1');
check('second answer still served', result.status, 200);

console.log('\n=== visitor 1 hits their personal ceiling ===');
result = await call('1.1.1.1');
check('status', result.status, 429);
check('code', result.json.error.code, 'ip_daily_limit');
check('title is not a connection error', result.json.error.title, 'That is your limit for today.');
check('NOT retryable -> no dead-end button', result.json.error.retryable, false);
check('contact route offered', result.json.error.contact.href, '/contact');

console.log('\n=== the site ceiling, reached by others ===');
// The per-IP cap tightens past half the pool, so distinct visitors drain it.
await call('2.2.2.2');
await call('3.3.3.3');
result = await call('4.4.4.4');
check('status', result.status, 429);
check('code', result.json.error.code, 'daily_limit');
check('NOT retryable', result.json.error.retryable, false);

console.log('\n=== a transient upstream failure stays retryable ===');
table.clear();
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => String(url).includes('api.deepseek.com')
  ? { ok: false, status: 502, text: async () => 'boom' }
  : realFetch(url, opts);
result = await call('4.4.4.4');
check('code', result.json.error.code, 'upstream');
check('IS retryable -> button shown', result.json.error.retryable, true);

console.log('\n=== semantic navigation uses a structured model tool ===');
table.clear();
globalThis.fetch = realFetch;
deepSeekMode = 'tool';
result = await call('5.5.5.5', 'The animated logo section is where I want to be; please move me there now.');
check('answer tool is offered to DeepSeek', lastDeepSeekBody.tools[0].function.name, 'answer_site');
check('navigation tool is offered to DeepSeek', lastDeepSeekBody.tools[1].function.name, 'navigate_site');
check('model must make a semantic action choice', lastDeepSeekBody.tool_choice, 'required');
check('plain answers cannot fake an arrival', lastDeepSeekBody.messages[0].content.includes('Never claim that you are moving the visitor'), true);
check('model-authored departure is streamed', result.text.startsWith('I’ll bring up the animated logo for you.'), true);
check('server action is bound to response token', result.text.includes(`<!--abatchan-nav:${result.headers['x-abatchan-action-token']}:`), true);
check('action carries exact verified destination', decodeURIComponent(result.text).includes('"href":"/brand#symbol"'), true);
check('action carries one model-authored progress update', decodeURIComponent(result.text).includes('"progress":["Finding the symbol sequence…"]'), true);
check('action carries model-authored arrival', decodeURIComponent(result.text).includes('"arrival":"You’re at the animated logo now.'), true);

console.log(`\n${failures ? `${failures} FAILED` : 'all passed'}`);
process.exit(failures ? 1 : 0);
