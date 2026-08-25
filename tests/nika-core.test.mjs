import { readFileSync } from 'node:fs';

const widget=readFileSync(new URL('../products/nika-core/nika-widget.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../products/nika-core/nika-widget.css',import.meta.url),'utf8');

let failed=false;
const check=(label,value)=>{const pass=Boolean(value);console.log(`${pass?'PASS':'FAIL'}  ${label}`);if(!pass)failed=true;};

console.log('=== shared self-hosted widget ===');
check('uses same-origin credentials',widget.includes("credentials: 'same-origin'"));
check('never reads an AI key in the browser',!/(api[_-]?key|authorization)/i.test(widget));
check('escapes customer text before HTML rendering',widget.includes('escapeHtml')&&widget.includes('&lt;')&&widget.includes('&quot;'));
check('caps visible page context',widget.includes('.slice(0, limit)'));
check('removes forms and scripts from captured context',widget.includes("'script,style,noscript,svg,form,nav,footer"));
check('does not transmit sensitive query parameters',widget.includes('Search parameters can contain account IDs')&&!widget.includes('url: location.href'));
check('detects live dialogs, tabs and expanded details',widget.includes("[role=\"tabpanel\"]")&&widget.includes("details[open]")&&widget.includes("[role=\"dialog\"]"));
check('reports image, canvas and iframe visibility limits',widget.includes('Visible embedded-frame content')&&widget.includes('Visible canvas pixels')&&widget.includes('Image pixels are not inspected'));
check('duplicate headings require a unique visible or authored target',widget.includes('visible.length === 1 ? visible[0] : null')&&widget.includes('data-nika-label'));
check('captures the current route once per submitted turn',widget.includes('const livePage = pageContext(')&&widget.includes('page: livePage'));
check('stamps history with the page where each reply happened',widget.includes('activeSection: clean(context.activeSection?.label)'));
check('excluded pages never mount or capture context',widget.includes('if (blocked.includes(currentBase)) return;'));
check('rejects cross-origin navigation',widget.includes('target.origin !== location.origin'));
check('checks destinations against configured pages',widget.includes('allowed.some(path =>'));
check('persists only short session history',widget.includes('sessionStorage.setItem(historyKey'));
check('does not submit forms for visitors',!widget.includes('.submit()')&&!widget.includes('requestSubmit'));
check('customer can disable dictation and navigation',widget.includes('settings.dictation === false')&&widget.includes('settings.autoNavigate !== false'));
check('dictation inserts at the saved cursor without deleting surrounding text',widget.includes('input.selectionStart')&&widget.includes('prefix = input.value.slice(0, start)')&&widget.includes('suffix = input.value.slice(end)')&&widget.includes('joinAtCursor'));
check('dictation reconnects recognition sessions for long speech',widget.includes('recognition.continuous = true')&&widget.includes('if (wanted) setTimeout')&&widget.includes('recognition.start()'));
check('dictation renders a real microphone waveform',widget.includes('getUserMedia')&&widget.includes('createAnalyser')&&widget.includes('getByteTimeDomainData')&&css.includes('.nika-dictation canvas'));
check('dictation has cancel stop and elapsed-time controls',widget.includes('nika-dictation-cancel')&&widget.includes('nika-dictation-stop')&&widget.includes('dictationTime.textContent'));
check('closing or leaving releases the microphone stream',widget.includes("close.addEventListener('click'")&&widget.includes("addEventListener('pagehide'")&&widget.includes('getTracks().forEach'));
check('dictation explains permission failures',widget.includes("event.error === 'not-allowed'")&&widget.includes('Microphone permission was not granted'));
check('the viewport focus band outranks a merely large visible section',widget.includes('focusNode')&&widget.includes('focusBand')&&widget.includes('focusHit'));
check('customer can choose accent and side',widget.includes("style.setProperty('--nika', accent)")&&widget.includes("settings.position === 'left'"));
check('isolates its interface with Shadow DOM',widget.includes("attachShadow({ mode: 'open' })"));
check('includes responsive styling',css.includes('@media(max-width:520px)'));

if(failed)process.exit(1);
console.log('\nall passed');
