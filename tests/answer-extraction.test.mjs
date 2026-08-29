import { readFileSync } from 'node:fs';

// The chat reply is the one place a provider can hand back a shape nobody
// planned for. Both adapters must recover an answer from every shape that
// still carries one, so a Detailed reply never dead-ends the visitor.
const server=readFileSync(new URL('../universal/nika-universal/server.mjs',import.meta.url),'utf8');
const php=readFileSync(new URL('../wordpress/nika-site-guide/nika-site-guide.php',import.meta.url),'utf8');

const start=server.indexOf('const ANSWER_KEYS');
const end=server.indexOf('function validateAction');
const { extractAnswer }=await import('data:text/javascript,'+encodeURIComponent(server.slice(start,end)+'\nexport { extractAnswer };'));

let failed=false;
const check=(label,value)=>{const pass=Boolean(value);console.log(`${pass?'PASS':'FAIL'}  ${label}`);if(!pass)failed=true;};

console.log('=== chat answer extraction ===');
check('the documented envelope still works',extractAnswer('{"message":"Yes, supported.","action":null}').message==='Yes, supported.');
check('an answer under another key is still an answer',extractAnswer('{"answer":"Yes, supported."}').message==='Yes, supported.');
check('an answer nested one level deeper is found',extractAnswer('{"message":{"text":"Yes, supported."}}').message==='Yes, supported.');
check('paragraphs split into a list are rejoined',extractAnswer('{"message":["First part.","Second part."]}').message==='First part.\n\nSecond part.');
check('a reply cut off at the token ceiling keeps what was written',extractAnswer('{"message":"Yes. GatherUp supports multi-location brands with flexible').message==='Yes. GatherUp supports multi-location brands with flexible');
check('preamble before the object does not lose the answer',extractAnswer('Sure! {"message":"Yes, supported."}').message==='Yes, supported.');
check('a fenced reply is unwrapped',extractAnswer('```json\n{"message":"Yes, supported."}\n```').message==='Yes, supported.');
check('prose with no envelope is passed through',extractAnswer('Yes, multiple locations are supported.').message==='Yes, multiple locations are supported.');
check('escaped quotes survive the salvage path',extractAnswer('{"message":"He said \\"yes\\" clearly."}').message==='He said "yes" clearly.');
check('an offered action survives a missing message',extractAnswer('{"message":"","action":{"href":"/pricing"}}').action?.href==='/pricing');
check('a genuinely empty reply reports nothing rather than JSON',extractAnswer('{"foo":{}}').message==='');
check('a navigation offer with no prose gets a sentence',server.includes('I can take you to ${action.label}')&&php.includes("I can take you to %s."));

// The two adapters are only consistent while they read the same keys.
const jsKeys=server.match(/const ANSWER_KEYS = \[(.*?)\]/s)?.[1].replace(/['\s]/g,'');
const phpKeys=php.match(/function nika_answer_keys\(\) \{\s*return array\((.*?)\);/s)?.[1].replace(/['\s]/g,'');
check('WordPress and Universal accept the same answer keys',Boolean(jsKeys)&&jsKeys===phpKeys);

console.log('=== conversation history in JSON mode ===');
// A past assistant reply replayed as prose makes a JSON-mode provider answer
// with nothing at all, which surfaced as a dead-end on the second question.
check('WordPress re-wraps historical assistant turns only when JSON mode is on',php.includes("$json_mode = 'json' === $mode && 'compatible' !== $s['provider'];")&&php.includes("if ( 'assistant' === $role && $json_mode ) $content = wp_json_encode( array( 'message' => $content, 'action' => null ) );"));
check('Universal re-wraps historical assistant turns when JSON mode is on',server.includes("const jsonMode = PROVIDER !== 'compatible';")&&server.includes("role === 'assistant' && jsonMode ? JSON.stringify({ message: content, action: null })"));
check('the visitor question is never re-wrapped',!php.includes("'user' === $role && $json_mode")&&!server.includes("role === 'user' && jsonMode"));
check('the live path is not overwritten while walking history',!php.includes("$current_path = sanitize_text_field( $page['path'] ?? '/' );\n\t\tif ( 'assistant'"));

process.exit(failed?1:0);
