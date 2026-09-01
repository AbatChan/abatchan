import assert from 'node:assert/strict';

process.env.DEEPSEEK_API_KEY = 'test-key';
process.env.SUPABASE_URL = 'https://stub.local';
process.env.SUPABASE_PUBLISHABLE_KEY = 'stub-public-key';

const originalFetch = global.fetch;
let providerResponses = [];
let providerBodies = [];

global.fetch = async (url, options = {}) => {
  if (String(url).includes('/auth/v1/user')) {
    return { ok: true, json: async () => ({ id: 'admin-user' }) };
  }
  if (String(url).includes('api.deepseek.com')) {
    providerBodies.push(JSON.parse(options.body));
    const content = providerResponses.shift();
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content } }] })
    };
  }
  throw new Error(`Unexpected request: ${url}`);
};

const { default: handler } = await import('../api/admin-assistant-generate.js?test=refine');

const response = () => ({
  code: 200,
  headers: {},
  body: null,
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; }
});

{
  providerBodies = [];
  providerResponses = ['', 'Keep the current warm voice. Always call an introductory consultation a scope call.'];
  const res = response();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid' },
    body: {
      kind: 'instructions',
      mode: 'refine',
      model: 'deepseek-v4-flash',
      currentDraft: 'Always call an introductory consultation a scope call.'
    }
  }, res);
  assert.equal(res.code, 200);
  assert.match(res.body.instructions, /scope call/i);
  assert.equal(providerBodies.length, 2, 'empty instruction output should be retried once');
  assert.match(providerBodies[0].messages.at(-1).content, /EXISTING INSTRUCTIONS/);
  assert.match(providerBodies[0].messages.at(-1).content, /scope call/);
}

{
  providerBodies = [];
  providerResponses = [
    '{"suggestions":[{"label":"Only one","description":"Incomplete"}]}',
    'Here is the JSON:\n```json\n{"suggestions":[{"label":"What does Nika do?","description":"See how live guidance works"},{"label":"How does a project run?","description":"Review the delivery process"},{"label":"Which Nika plan fits?","description":"Compare the 2, 5 and 50-site options"}]}\n```'
  ];
  const res = response();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid' },
    body: {
      kind: 'suggestions',
      mode: 'refine',
      model: 'deepseek-v4-flash',
      currentSuggestions: [
        { label: 'Old plan question', description: 'Compare 1, 5 and 25 sites' },
        { label: 'How does setup work?', description: 'Review the steps' },
        { label: 'What does Abatchan build?', description: 'Browse the services' }
      ]
    }
  }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.suggestions.length, 3);
  assert.match(res.body.suggestions[2].description, /2, 5 and 50/);
  assert.equal(providerBodies.length, 2, 'invalid suggestion output should be retried once');
  assert.match(providerBodies[0].messages.at(-1).content, /EXISTING SUGGESTIONS/);
  assert.match(providerBodies[0].messages.at(-1).content, /Old plan question/);
}

global.fetch = originalFetch;
console.log('admin assistant generation: ok');
