import { readFileSync } from 'node:fs';

const script=readFileSync(new URL('../script.js',import.meta.url),'utf8');
const assistant=readFileSync(new URL('../assistant-v2.js',import.meta.url),'utf8');
// The shell moved out of script.js so the embed and this site share one copy.
const shell=readFileSync(new URL('../guide-shell.js',import.meta.url),'utf8');
const assistantCss=readFileSync(new URL('../assistant.css',import.meta.url),'utf8');
const embed=readFileSync(new URL('../embed.js',import.meta.url),'utf8');
const admin=readFileSync(new URL('../admin.js',import.meta.url),'utf8');
const adminHtml=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
const adminCss=readFileSync(new URL('../admin-polish.css',import.meta.url),'utf8');
const adminGenerator=readFileSync(new URL('../api/admin-assistant-generate.js',import.meta.url),'utf8');
const faqAdmin=readFileSync(new URL('../faq-admin.js',import.meta.url),'utf8');
const reviewsAdmin=readFileSync(new URL('../reviews-admin.js',import.meta.url),'utf8');
const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

let failed=false;
const check=(label,value)=>{
  const pass=Boolean(value);
  console.log(`${pass?'PASS':'FAIL'}  ${label}`);
  if(!pass)failed=true;
};

console.log('=== assistant shell starts independently of slow settings ===');
check('settings wait has a short upper bound',shell.includes('Promise.race([')&&shell.includes('setTimeout(()=>resolve(null),240)'));
check('authoritative disabled state still removes the shell',shell.includes("fresh?.['assistant.enabled']===false")&&shell.includes('launch.remove();panel.remove()'));

console.log('\n=== the visitor starts the transcript ===');
check('opening the panel does not insert an assistant greeting',!shell.includes('ensureGreeting')&&!shell.includes('data-guide-intro'));
check('the empty state contains guidance without a chat message',shell.includes('assist-chips')&&shell.includes('<div class="assist-log" role="log" aria-live="polite"></div>'));
check('only persisted assistant replies can become the latest reply',assistant.includes("log.querySelectorAll('.assist-msg.bot[data-chat-entry=\"true\"]')")&&!assistant.includes('data-guide-intro'));

console.log('\n=== first-use suggestions guide without cluttering chat ===');
check('empty state uses three structured suggestion cards',shell.includes(".slice(0,3)")&&shell.includes('assist-chip-copy')&&shell.includes('assist-chip-icon'));
check('owner-configured prompts keep the same card structure',shell.includes("settings?.['assistant.suggestions']")&&shell.includes('renderSuggestions')&&!assistant.includes('const pagePrompts='));
check('suggestions carry their question separately from supporting copy',shell.includes('data-question=')&&assistant.includes('button.dataset.question'));
check('suggestions disappear after the first question',assistant.includes("panel.classList.remove('is-empty')")&&assistant.includes('chips.hidden=true'));
check('clearing the conversation restores the empty state',assistant.includes("panel.classList.add('is-empty')")&&assistant.includes('chips.hidden=false'));
check('clearing also removes transient errors and typing rows',assistant.includes("[data-chat-entry=\"true\"],.assist-error,.assist-typing"));
check('cards retain visible keyboard focus',assistantCss.includes('.assist-chips button:focus-visible'));

console.log('\n=== message times explain themselves without a tooltip ===');
const timeSource=assistant.match(/const timeLabel=(\([\s\S]*?\n    \};)/)?.[1];
const timeLabel=timeSource?Function(`return (${timeSource.replace(/;$/,'')})`)():null;
const now=new Date(2026,7,26,15,0).getTime();
check('today shows only the time',timeLabel?.(new Date(2026,7,26,14,55).getTime(),now)==='2:55 PM');
check('another day this week includes the weekday',timeLabel?.(new Date(2026,7,25,14,55).getTime(),now)==='Tuesday 2:55 PM');
check('older messages use an abbreviated date',timeLabel?.(new Date(2026,6,27,4,33).getTime(),now)==='Jul 27, 4:33 AM');
check('message times do not create hover tooltips',!assistant.includes('time.dataset.tip=absoluteTime'));

console.log('\n=== near-limit warning stays out of the transcript ===');
check('warning is a labelled header control with a tooltip',assistant.includes('assist-budget-trigger')&&assistant.includes("setAttribute('aria-describedby'")&&assistant.includes("setAttribute('role','tooltip')"));
check('hover focus and tap reveal the same warning',assistantCss.includes('.assist-budget-indicator:hover .assist-budget-tooltip')&&assistantCss.includes('.assist-budget-indicator:focus-within .assist-budget-tooltip')&&assistantCss.includes('.assist-budget-indicator.is-open .assist-budget-tooltip'));
check('warning is announced without becoming a chat message',assistant.includes("budgetStatus.setAttribute('aria-live','polite')")&&!assistant.includes("note.className='assist-budget'"));
check('escape and outside press dismiss the tooltip',assistant.includes("event.key==='Escape'")&&assistant.includes('if(!budgetIndicator.contains(event.target))closeBudgetTip()'));

console.log('\n=== guided highlight is one synchronized state ===');
check('one cleanup removes both border and title pill',assistant.includes("document.querySelectorAll('.assist-guided-target')")&&assistant.includes("document.querySelectorAll('.assist-guide-marker')"));
check('one timer clears the complete guidance state',assistant.includes('guidanceTimer=setTimeout(clearGuidance,GUIDANCE_DURATION)'));
check('compound journeys expose one clickable fallback per target',assistant.includes("journey.steps:[journey]")&&assistant.includes('destinations.forEach(destination=>')&&assistant.includes('section_requested:destination.section_requested===true'));

console.log('\n=== difficult elements are indexed locally before AI ===');
check('semantic controls and fields join the safe target registry',assistant.includes('button,a[href],input:not([type="hidden"]),select,textarea')&&assistant.includes("node.labels?.[0]")&&assistant.includes("node.getAttribute('aria-label')"));
check('open shadow roots can register and paint their own targets',assistant.includes('if(node.shadowRoot)')&&assistant.includes("style.dataset.assistTargetStyle='true'")&&assistant.includes('automaticTargetNodes.get(id)'));
check('void form controls highlight a safe visual wrapper',assistant.includes("target.matches('input,select,textarea,img,option')")&&assistant.includes("target.closest('label,.field,[role=\"group\"],fieldset')"));
check('specific field placeholders can identify hard controls',assistant.includes("node.matches('input,select,textarea')?(node.getAttribute('aria-label')||node.getAttribute('placeholder')||labelled?.textContent||node.getAttribute('name'))"));
check('accessible same-origin frames join the compact target registry',assistant.includes("const frameDoc=frame.contentDocument")&&assistant.includes('found.push(...collectTargetCandidates(frameDoc))'));
check('an inaccessible exact target never falls back to the whole page',assistant.includes("if(ranked?.score>=.6)return ranked.node;\n          return null;"));
check('the browser sends compact labels and kinds, never page HTML',assistant.includes(".slice(0,80)")&&assistant.includes('kind:targetKind(node)')&&!assistant.includes('outerHTML'));

console.log('\n=== mobile cross-page arrival keeps the target visible ===');
check('phone handoff stays minimized',assistant.includes("const keepPageVisible=matchMedia('(max-width:640px)').matches")&&assistant.includes("if(!keepPageVisible&&!panel.classList.contains('is-open'))launch.click()"));
check('phone same-page guidance minimizes the full-height sheet',assistant.includes("if(matchMedia('(max-width:640px)').matches&&panel.classList.contains('is-open'))launch.click()"));

console.log('\n=== viewport context includes automatic hero targets ===');
check('top-level hero headings can win the active-section resolver',assistant.includes('main h1[id],main h2[id],main h3[id],main [data-assist-target][id]'));
check('the focal-point lookup includes every supported heading level',assistant.includes("closest('main section[id],main article[id],main h1[id],main h2[id],main h3[id],main [data-assist-target]')"));
check('heading context expands to its containing section when available',assistant.includes("active?.matches('h1,h2,h3')"));
check('automatic body copy cannot become a section title',assistant.includes("node.dataset.assistAuto='true'")&&assistant.includes("node.matches('p,.field')"));

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

console.log('\n=== concise and detailed are meaningfully different modes ===');
check('concise has a clear word target',server.includes('stay under 120 words'));
check('concise must finish rather than token-cut',server.includes('finish cleanly')&&server.includes('Never begin a point you cannot finish'));
check('detailed has a useful multi-part range',server.includes('normally use 180 to 420 words'));
check('answer depth never clips the response',server.includes('max_tokens:receipt?400:1200')&&!server.includes("answerDepth==='detailed'?"));

console.log('\n=== admin controls remain usable and understandable ===');
const validIpSource=admin.match(/const validIp = (value => \{[\s\S]*?\n  \});/)?.[1];
const validIp=validIpSource?Function(`return (${validIpSource})`)():null;
check('manual IPv4 validation rejects impossible octets',validIp?.('999.999.999.999')===false&&validIp?.('198.51.100.21')===true);
check('IPv6 exemptions remain supported',validIp?.('2001:db8::7')===true);
check('IP lookup is explicit and announced',adminHtml.includes('id="checkAssistantIp"')&&adminHtml.includes('id="a-ip-status" role="status" aria-live="polite"'));
check('IP lookup errors are visually distinct',admin.includes("classList.add('is-error')")&&adminCss.includes('.adm-field-help.is-error'));
check('IP add action stays hidden until lookup succeeds',adminCss.includes('.adm-ip-actions [hidden]{display:none!important}'));
check('connections that do not count explain the permanent Vercel floor',adminHtml.includes('Connections not counted')&&adminHtml.includes('Addresses in Vercel always stay exempt'));
check('Abatchan admin generation stays server-side and requires a signed-in user',adminHtml.includes('generateAssistantSuggestions')&&adminHtml.includes('draftAssistantInstructions')&&admin.includes('/api/admin-assistant-generate')&&adminGenerator.includes('signedIn(req.headers.authorization)')&&adminGenerator.includes('process.env.DEEPSEEK_API_KEY'));
check('Abatchan admin never receives the provider key',!admin.includes('DEEPSEEK_API_KEY')&&!adminGenerator.includes('key: process.env.DEEPSEEK_API_KEY'));
check('mobile keeps the sign-out control',adminCss.includes('.adm-side footer #signOut{display:inline-flex'));
check('long mobile tab labels have short variants',adminHtml.includes('<span class="adm-nav-narrow">copy</span>')&&adminHtml.includes('<span class="adm-nav-narrow">guide</span>'));
check('generated FAQ fields have associated labels',faqAdmin.includes('for="faq-question-${index}"')&&faqAdmin.includes('for="faq-answer-${index}"'));
check('generated review fields associate their labels',reviewsAdmin.includes('label.htmlFor=field.id'));

console.log('\n=== the shell has one implementation, shared with the embed ===');
check('script.js no longer builds it',!script.includes("panel.className='assist-panel'"));
check('the shell module does',shell.includes("panel.className='assist-panel is-empty'"));
check('the site still mounts it',script.includes('mountGuideShell('));
check('and so does the embed',embed.includes('mountGuideShell('));
check('identity is parameterised, not hardcoded',!shell.includes('<b>Nika</b>')&&shell.includes('${cfg.name}'));
check('assets resolve against the guide origin',shell.includes('${cfg.assetBase}/assets/icons/'));

console.log('\n=== the widget can be served from another origin ===');
check('a burst is revealed at a readable pace, not dropped in one frame',assistant.includes('Math.min(REVEAL_MAX,Math.max(REVEAL_MIN,Math.ceil(behind/24)))')&&assistant.includes('paint(false)')&&assistant.includes('paint(true)'));
check('this site keeps its attachment control',shell.includes('attachments: true,'));
check('a reply already on screen is never cleared and retyped unless a leaked JSON envelope must be removed',assistant.includes('}else if(paintedFrames===0||answer!==rawAnswer){')&&assistant.includes('const rawAnswer=navigation.text;')&&!assistant.includes('paintedFrames<2'));
check('likely navigation requests wait for a validated action marker before they paint',assistant.includes('const isLikelyNavigationRequest=text=>')&&assistant.includes('const likelyNavigationRequest=isLikelyNavigationRequest(text);')&&assistant.includes('if(likelyNavigationRequest&&!complete)return;'));
check('api calls go through a base',assistant.includes('apiUrl(ROUTES.chat)')&&assistant.includes('apiUrl(ROUTES.feedback)')&&assistant.includes("chat:'/api/chat-stream',feedback:'/api/guide-feedback'"));
check('no same-origin api calls remain',!assistant.includes("fetch('/api/"));
check('the site key travels with every call',assistant.includes("'X-Site-Key':SITE_KEY"));
check('vendor scripts resolve against the guide\'s own asset base',assistant.includes("assetUrl('/assets/vendor/")&&assistant.includes('const ASSET_BASE=String(EMBED.assetBase??API_BASE)'));
check('the primary site stays relative',assistant.includes("String(EMBED.apiBase||'')"));

console.log('\n=== the embed asks for nothing the buyer must configure twice ===');
check('the origin is derived from the script src',embed.includes('new URL(script.src, location.href).origin'));
check('a missing key fails loudly rather than silently',embed.includes('no data-site on the embed script'));
check('config is fetched before painting',embed.includes('/api/guide-config?site='));
check('a disabled or unauthorised site paints nothing',embed.includes('config.enabled === false'));

console.log('\n=== dictation is allowed without widening other device access ===');
const siteHeaders=vercel.headers.find(rule=>rule.source==='/(.*)')?.headers||[];
const permissions=siteHeaders.find(header=>header.key==='Permissions-Policy')?.value||'';
check('the microphone is allowed only for the site itself',permissions.includes('microphone=(self)'));
check('camera and location remain disabled',permissions.includes('camera=()')&&permissions.includes('geolocation=()'));
check('page context admits visual and embedded-content limits',assistant.includes('Visible embedded-frame content')&&assistant.includes('Visible canvas pixels')&&assistant.includes('Image pixels are not inspected'));
check('dictation shell includes waveform cancel stop and timer controls',shell.includes('assist-dictation-wave')&&shell.includes('assist-dictation-cancel')&&shell.includes('assist-dictation-stop')&&shell.includes('assist-dictation-time'));
check('waveform reacts to microphone samples',assistant.includes('getByteTimeDomainData')&&assistant.includes('createAnalyser')&&assistant.includes('getUserMedia'));
check('long dictation reconnects after browser recognition ends',assistant.includes('recognition.continuous=true')&&assistant.includes('if(dictationWanted)setTimeout'));
check('dictation preserves text around the cursor',assistant.includes('input.selectionStart')&&assistant.includes('dictationPrefix=input.value.slice(0,start)')&&assistant.includes('dictationSuffix=input.value.slice(end)'));
check('speech chunks are joined with normalized spaces',assistant.includes('const joinDictationParts=')&&assistant.includes(".filter(Boolean).join(' ')"));
check('final speech segments survive later interim revisions',assistant.includes('dictationSegments[index]=')&&assistant.includes('segment?.final')&&assistant.includes('updateDictationSegments(event)'));
check('provisional speech cannot flicker inside the editable message',assistant.includes('joinDictationParts([dictationCommitted,dictationSessionFinal])'));
check('an automatic recognition restart preserves its last interim phrase',assistant.includes('joinDictationParts([dictationCommitted,dictationSessionFinal,dictationInterim])'));
check('closing or leaving releases the microphone stream',assistant.includes("launch.addEventListener('click'")&&assistant.includes("addEventListener('pagehide'")&&assistant.includes('getTracks().forEach'));
check('the focus point and center band determine the live section',assistant.includes('focusNode=document.elementFromPoint')&&assistant.includes('focusBand')&&assistant.includes('focusHit'));
check('Nika never mistakes its own dialog for page content',assistant.includes(".filter(node=>!node.closest('.assist-panel')"));

console.log('\n=== navigation is allowed against the tenant own routes ===');
// The widget shipped with abatchan's routes hardcoded. On a buyer's site none
// of their pages are in that set, so every destination was refused and
// navigation silently did nothing.
check('the allowlist comes from the embed when present',assistant.includes('Array.isArray(EMBED.paths)&&EMBED.paths.length'));
check('the primary site keeps its own list as the fallback',assistant.includes("'/bookingkoala','/privacy','/terms']"));
check('the service publishes the routes',embed.includes('window.__guideEmbed.paths = Array.isArray(config.paths)'));

if(failed)process.exit(1);
console.log('\nall passed');
