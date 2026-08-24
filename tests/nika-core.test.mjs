import { readFileSync } from 'node:fs';

const widget=readFileSync(new URL('../products/nika-core/nika-widget.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../products/nika-core/nika-widget.css',import.meta.url),'utf8');

let failed=false;
const check=(label,value)=>{const pass=Boolean(value);console.log(`${pass?'PASS':'FAIL'}  ${label}`);if(!pass)failed=true;};

console.log('=== shared self-hosted widget ===');
check('uses same-origin credentials',widget.includes("credentials: 'same-origin'"));
check('never reads an AI key in the browser',!/(api[_-]?key|authorization)/i.test(widget));
check('caps visible page context',widget.includes('.slice(0, limit)'));
check('removes forms and scripts from captured context',widget.includes("'script,style,noscript,svg,form,nav,footer"));
check('rejects cross-origin navigation',widget.includes('target.origin !== location.origin'));
check('checks destinations against configured pages',widget.includes('allowed.some(path =>'));
check('persists only short session history',widget.includes('sessionStorage.setItem(historyKey'));
check('does not submit forms for visitors',!widget.includes('.submit()')&&!widget.includes('requestSubmit'));
check('isolates its interface with Shadow DOM',widget.includes("attachShadow({ mode: 'open' })"));
check('includes responsive styling',css.includes('@media(max-width:520px)'));

if(failed)process.exit(1);
console.log('\nall passed');
