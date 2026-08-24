import { readFileSync } from 'node:fs';

const script=readFileSync(new URL('../script.js',import.meta.url),'utf8');
const assistant=readFileSync(new URL('../assistant-v2.js',import.meta.url),'utf8');
// The shell moved out of script.js so the embed and this site share one copy.
const shell=readFileSync(new URL('../guide-shell.js',import.meta.url),'utf8');
const embed=readFileSync(new URL('../embed.js',import.meta.url),'utf8');

let failed=false;
const check=(label,value)=>{
  const pass=Boolean(value);
  console.log(`${pass?'PASS':'FAIL'}  ${label}`);
  if(!pass)failed=true;
};

console.log('=== assistant shell starts independently of slow settings ===');
check('settings wait has a short upper bound',shell.includes('Promise.race([')&&shell.includes('setTimeout(()=>resolve(null),240)'));
check('authoritative disabled state still removes the shell',shell.includes("fresh?.['assistant.enabled']===false")&&shell.includes('launch.remove();panel.remove()'));

console.log('\n=== greeting receives the shared message utility row ===');
check('intro is normalized into the shared content structure',assistant.includes("content.className='assist-message-content'")&&assistant.includes('intro.replaceChildren(content)'));
check('intro gets message tools without rating controls',assistant.includes("isIntro:true")&&assistant.includes("entry.role==='assistant'&&!entry.isIntro"));
check('intro is treated as latest until a real reply exists',assistant.includes("||log.querySelector('[data-guide-intro=\"true\"]')"));
check('copy reads the live greeting after settings refresh',assistant.includes("element.querySelector('.assist-message-content')?.textContent||entry.content"));

console.log('\n=== guided highlight is one synchronized state ===');
check('one cleanup removes both border and title pill',assistant.includes("document.querySelectorAll('.assist-guided-target')")&&assistant.includes("document.querySelectorAll('.assist-guide-marker')"));
check('one timer clears the complete guidance state',assistant.includes('guidanceTimer=setTimeout(clearGuidance,GUIDANCE_DURATION)'));

console.log('\n=== mobile cross-page arrival keeps the target visible ===');
check('phone handoff stays minimized',assistant.includes("const keepPageVisible=matchMedia('(max-width:640px)').matches")&&assistant.includes("if(!keepPageVisible&&!panel.classList.contains('is-open'))launch.click()"));

console.log('\n=== a hidden tab never strands a reply or a journey ===');
// requestAnimationFrame is suspended while the tab is hidden. Anything that
// resolves a promise or starts an action from inside a rAF tick would stall
// there forever, leaving a blank reply and a permanently disabled composer.
check('buffered reveal commits immediately when hidden',assistant.includes("if(!plainText||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)"));
check('leaving mid-reveal still settles the reveal',assistant.includes("const onHidden=()=>{if(document.hidden)finish()}")&&assistant.includes("document.addEventListener('visibilitychange',onHidden)"));
check('the reveal promise cannot resolve twice',assistant.includes('let settled=false;')&&assistant.includes('if(settled)return;settled=true;'));
check('journey starts fall back to a timer when hidden',assistant.includes('const afterPaint=run=>{')&&assistant.includes('if(document.hidden){setTimeout(run,0);return}'));
check('same-page journeys use that fallback',assistant.includes('afterPaint(()=>{\n        if(publicPath(url)!==pagePath()){'));
check('cross-page handoffs use that fallback',assistant.includes('afterPaint(()=>{\n          const keepPageVisible='));
check('scroll settling does not wait on frames when hidden',assistant.includes('if(document.hidden)return void run();'));

console.log('\n=== manual navigation keeps what the visitor supplied ===');
// Dropping the whole journey turn also deleted the message carrying the
// visitor's own details, so a later "put those back" had nothing to work from
// and the server could not verify the values either.
check('the journey turn is kept, not deleted',assistant.includes("journeyRoute:false}")&&assistant.includes('Done, at the time it was asked.'));
// Keeping the reply's own wording, departure included, reads as a location
// claim and made "where am I" answer with the old destination.
check('no wording from the journey reply survives',!assistant.includes("String(item.content||'').split('\\n')[0]"));
check('the visitor message is no longer removed with it',!assistant.includes('journeyQuestions'));
// Dropping the reply while keeping the question left it unanswered, and the
// model then re-proposed the same action on every following turn.
check('the reply is not dropped outright',!assistant.includes('recent.filter(item=>!item.journeyRoute)'));
check('a fresh tab also neutralizes old journey claims',!assistant.includes("if(navigationState.source!=='visitor')return budget(recent)"));

console.log('\n=== prepared form values survive leaving the page ===');
check('applied values are stored',assistant.includes('writePrepared(Object.fromEntries(appliedFields.map'));
check('they travel with page context',assistant.includes('preparedForm:readPrepared()'));
check('clearing the chat clears them',assistant.includes('localStorage.removeItem(PREPARED_STORE)'));
check('only non-empty values are kept',assistant.includes('.filter(([,text])=>String(text||\'\').trim())'));

console.log('\n=== history is budgeted, not capped at four messages ===');
check('a size budget replaces the fixed slice',assistant.includes('if(chars+content.length>200*1024)break;'));
check('no four-message truncation remains',!assistant.includes('.slice(-4);'));
check('the stored window feeds the budget',assistant.includes('history.slice(-MAX_STORED)')&&assistant.includes('if(history.length>MAX_STORED)'));

console.log('\n=== model limits are recorded, not guessed ===');
const server=readFileSync(new URL('../api/chat-stream.js',import.meta.url),'utf8');
check('both configured models have a context entry',server.includes("'deepseek-v4-flash':{context:1048576")&&server.includes("'deepseek-v4-pro':{context:1048576"));
check('every model model() accepts is in the table',['deepseek-v4-flash','deepseek-v4-pro'].every(name=>server.includes(`'${name}':{context:`)));
check('the budget is derived from the window, not hardcoded',server.includes('contextTokens(name)*TOKEN_CHARS*HISTORY_SHARE'));
check('the share is tunable',server.includes('ASSISTANT_HISTORY_SHARE'));

console.log('\n=== the shell has one implementation, shared with the embed ===');
check('script.js no longer builds it',!script.includes("panel.className='assist-panel'"));
check('the shell module does',shell.includes("panel.className='assist-panel'"));
check('the site still mounts it',script.includes('mountGuideShell('));
check('and so does the embed',embed.includes('mountGuideShell('));
check('identity is parameterised, not hardcoded',!shell.includes('<b>Nika</b>')&&shell.includes('${cfg.name}'));
check('assets resolve against the guide origin',shell.includes('${cfg.assetBase}/assets/icons/'));

console.log('\n=== the widget can be served from another origin ===');
check('api calls go through a base',assistant.includes("apiUrl('/api/chat-stream')")&&assistant.includes("apiUrl('/api/guide-feedback')"));
check('no same-origin api calls remain',!assistant.includes("fetch('/api/"));
check('the site key travels with every call',assistant.includes("'X-Site-Key':SITE_KEY"));
check('vendor scripts resolve against the same base',assistant.includes('${API_BASE}/assets/vendor/'));
check('the primary site stays relative',assistant.includes("String(EMBED.apiBase||'')"));

console.log('\n=== the embed asks for nothing the buyer must configure twice ===');
check('the origin is derived from the script src',embed.includes('new URL(script.src, location.href).origin'));
check('a missing key fails loudly rather than silently',embed.includes('no data-site on the embed script'));
check('config is fetched before painting',embed.includes('/api/guide-config?site='));
check('a disabled or unauthorised site paints nothing',embed.includes('config.enabled === false'));

console.log('\n=== navigation is allowed against the tenant own routes ===');
// The widget shipped with abatchan's routes hardcoded. On a buyer's site none
// of their pages are in that set, so every destination was refused and
// navigation silently did nothing.
check('the allowlist comes from the embed when present',assistant.includes('Array.isArray(EMBED.paths)&&EMBED.paths.length'));
check('the primary site keeps its own list as the fallback',assistant.includes("'/bookingkoala','/privacy','/terms']"));
check('the service publishes the routes',embed.includes('window.__guideEmbed.paths = Array.isArray(config.paths)'));

if(failed)process.exit(1);
console.log('\nall passed');
