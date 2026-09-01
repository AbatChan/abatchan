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
check('compound journeys expose one clickable fallback per target',assistant.includes("journey.steps:[journey]")&&assistant.includes('destinations.forEach(destination=>')&&assistant.includes('completeLinkHandoff(destination,href,label)'));
check('fallback links preserve a complete cross-page handoff',assistant.includes('const completeLinkHandoff=')&&assistant.includes('status:String(target.status')&&assistant.includes('arrival:String(target.arrival'));
check('an existing answer link inherits the verified journey target',assistant.includes('alreadyLinked.__nikaHandoff=completeLinkHandoff(destination,href,label)')&&assistant.includes('link.__nikaHandoff||'));
check('highlight rings adapt to the surface outside the target',assistant.includes('effectiveTargetBackground(node,false)')&&assistant.includes('luminance<.42')&&assistant.includes("dark?'#ffffff':'#312e81'"));
check('adaptive highlight styles are removed with the guidance state',assistant.includes('clearAdaptiveGuidance(node)')&&assistant.includes("removeProperty(name)"));
check('theme-important control styles cannot suppress the adaptive ring',assistant.includes("setProperty('outline',`3px solid ${border}`,'important')")&&assistant.includes("setProperty('outline-offset','6px','important')")&&assistant.includes('guidanceInlineRestore'));
check('guided outlines are rounded without adding a glow shadow',assistant.includes("setProperty('--assist-guide-radius',radius)")&&!assistant.includes("setProperty('box-shadow',`0 0 0 7px"));
check('the title pill uses the saved accent with readable text',assistant.includes('const accent=configuredGuideAccent()')&&assistant.includes("setProperty('--assist-guide-marker-bg',accent)")&&assistant.includes('colourLuminance(accent)>.48'));
check('the title pill is compact and shadow-free',assistantCss.includes('.assist-guide-marker{')&&assistantCss.includes('border-radius:999px')&&assistantCss.includes('box-shadow:none')&&assistantCss.includes('.assist-guide-marker::before'));
check('compact controls do not receive a duplicate floating label',assistant.includes("!visualTarget.matches('button,a[href],input,select,textarea,h1,h2,h3,h4,h5,h6,[role=\"button\"],[role=\"link\"],[role=\"tab\"],[role=\"heading\"]')"));
check('the page footer root itself is a first-class semantic highlight target',assistant.includes("node.matches('footer,[role=\"contentinfo\"]')")&&assistant.includes("document.querySelectorAll('footer,[role=\"contentinfo\"]')")&&assistant.includes("root.matches?.(selector)?[root]:[]"));
check('relative price requests resolve to the actual price heading',assistant.includes('const relativePriceTarget=label=>')&&assistant.includes('node:heading,labelNode')&&assistant.includes("if(relative)return relative"));
check('named plans and sections promote headings to meaningful visual containers',assistant.includes('const semanticVisualTarget=(target,label)=>')&&assistant.includes('const isPlan=')&&assistant.includes('const isSection=')&&assistant.includes('semanticVisualTarget(target,label)'));
check('generic card item step and row structures highlight as a unit',assistant.includes('const structuralCard=')&&assistant.includes('structuralCard&&headings<=4'));
check('headings do not receive a duplicate marker inside their text',assistant.includes('textarea,h1,h2,h3,h4,h5,h6,[role="button"]'));

console.log('\n=== sites without semantic markup are still indexed ===');
check('repeated sibling blocks are found by shape, not by tag or class',assistant.includes('const repeatedBlocks=root=>')&&assistant.includes('const blockSignature=node=>')&&assistant.includes('...repeatedBlocks(root)'));
check('only matching siblings count as a set',assistant.includes('if(group.length>=2)blocks.push(...group)')&&assistant.includes('a heading followed by a'));
check('table cells and list items join the registry',assistant.includes('p,td,th,li,dd,blockquote,figure,b,strong'));
check('bold text can title a block on pages older than sectioning',assistant.includes('const boldTitle=')&&assistant.includes('text.length>=3&&text.length<=60')&&assistant.includes('heading?.textContent||boldTitle'));
check('a block identity is not limited to semantic containers',assistant.includes('let host=node,depth=0;')&&assistant.includes('while(host.children.length===1&&depth++<2)host=host.children[0];'));
check('context is decided by contents, not by tag name',assistant.includes('Whether a node is a composed block is a question about its contents')&&!assistant.includes("if(!node.matches('article,section,[role=\"region\"],[role=\"tabpanel\"],details,form,fieldset,[class$=\"-card\"]"));
check('leaf controls still carry no surrounding context',assistant.includes("if(node.matches('input,select,textarea,button,a[href],label,summary,img,p,span,h1,h2,h3,h4,h5,h6,[role=\"heading\"],[role=\"button\"],[role=\"link\"]'))return '';"));
check('the model still receives a capped, compact index',assistant.includes('.slice(0,80)')&&assistant.includes('kind:targetKind(node)'));

console.log('\n=== the page steps back so the answer reads as the answer ===');
check('a scrim dims the rest of the page with the highlight',assistant.includes("guidanceScrim.className='assist-guide-scrim'")&&assistantCss.includes('.assist-guide-scrim{')&&assistantCss.includes('.assist-guide-scrim.is-on{opacity:1}'));
check('the scrim never intercepts a click',assistant.includes('pointer-events:none')&&assistantCss.includes('.assist-guide-scrim{position:fixed;inset:0;z-index:2147482000;pointer-events:none'));
check('the scrim recedes the page on dark palettes too',assistantCss.includes('backdrop-filter:blur(3px) brightness(.66)')&&assistant.includes('Dimming alone is invisible on a dark site')&&assistantCss.includes('-webkit-backdrop-filter:blur(3px)'));
check('the scrim styles inline too, for embeds without the stylesheet',assistant.includes('const SCRIM_STYLE=')&&assistant.includes('guidanceScrim.style.cssText=SCRIM_STYLE'));
check('the target is lifted in place, never re-parented',assistant.includes("node.classList.add('is-guide-lifted')")&&assistantCss.includes('.assist-guided-target.is-guide-lifted{z-index:2147482500}')&&!assistant.includes('appendChild(visualTarget)'));
check('the lift and its z-index are restored on clear',assistant.includes("const guidanceInlineProperties=['outline','outline-offset','z-index']")&&assistant.includes("node.classList?.remove('is-guide-lifted')")&&assistant.includes('hideGuidanceScrim()'));
check('reduced motion drops the scrim fade',assistantCss.includes('@media(prefers-reduced-motion:reduce){.assist-guide-scrim{transition:none}}'));

console.log('\n=== a theme flip repaints the ring while it is up ===');
check('all three theme signals are watched, not just one',assistant.includes("matchMedia('(prefers-color-scheme: dark)')")&&assistant.includes("attributeFilter:['class','style','data-theme','data-color-scheme','data-mode','color-scheme']")&&assistant.includes("scheme.addEventListener?.('change',repaintGuidance)"));
check('the ring is recomputed in place, without a re-reveal',assistant.includes('const repaintGuidance=()=>')&&assistant.includes('if(node.isConnected)applyAdaptiveGuidance(node)')&&!assistant.includes('repaintGuidance(){revealResolvedTarget'));
check('the watcher is started with the highlight and stopped with it',assistant.includes('watchGuidanceTheme();')&&assistant.includes('unwatchGuidanceTheme();')&&assistant.indexOf('unwatchGuidanceTheme();')<assistant.indexOf('hideGuidanceScrim();'));
check('the watcher is never installed twice',assistant.includes('if(guidanceThemeWatch)return;'));

console.log('\n=== difficult elements are indexed locally before AI ===');
check('semantic controls and fields join the safe target registry',assistant.includes('button,a[href],input:not([type="hidden"]),select,textarea')&&assistant.includes("node.labels?.[0]")&&assistant.includes("node.getAttribute('aria-label')"));
check('owner labels are portable across arbitrary site structures',assistant.includes('[data-nika-target],[data-nika-label]')&&assistant.includes("node.getAttribute?.('data-nika-target')")&&assistant.includes("node.getAttribute?.('data-nika-label')"));
check('the shared resolver contains no customer-specific selector map',!assistant.includes('SECTION_TITLES')&&!assistant.includes('PRECISE_TARGETS')&&!assistant.includes("'.scope-strip .scope-item:nth-child(3)'"));
check('open shadow roots can register and paint their own targets',assistant.includes('if(node.shadowRoot)')&&assistant.includes("style.dataset.assistTargetStyle='true'")&&assistant.includes('automaticTargetNodes.get(id)'));
check('void form controls highlight a safe visual wrapper',assistant.includes("target?.matches('input,select,textarea,img,option')")&&assistant.includes("target.closest('label,.field,[role=\"group\"],fieldset')"));
check('specific field placeholders can identify hard controls',assistant.includes("node.matches('input,select,textarea')?(node.getAttribute('aria-label')||node.getAttribute('placeholder')||labelled?.textContent||node.getAttribute('name'))"));
check('an inaccessible exact target never falls back to the whole page',assistant.includes("if(ranked?.score>=.6)return ranked.node;\n          return null;"));
check('authored anchors outrank conversational wording',assistant.includes('if(raw&&!raw.dataset.assistGeneratedId)return raw;')&&assistant.includes('never throw away a real')&&!assistant.includes("targetScore(label,targetText(raw))<.6"));
check('ids Nika mints are marked as its own suggestion',assistant.includes("node.dataset.assistGeneratedId='true'")&&assistant.includes('Minted here, not authored by the site'));
check('a generated anchor loses to a clearly better answer',assistant.includes('if(raw&&preferExact&&label){')&&assistant.includes('ranked.score>targetMatch(label,raw,request)+.15'));
check('a generated anchor still wins when nothing beats it',assistant.includes("ranked.node!==raw&&")&&assistant.indexOf('ranked.score>targetMatch(label,raw,request)+.15')<assistant.indexOf('if(raw)return raw;'));
check('fuzzy confidence is based on target evidence, not page position',assistant.includes('const targetMatch=(label,node,request=\'\')=>')&&assistant.includes('b.score-a.score||b.priority-a.priority||a.area-b.area')&&!assistant.includes("node.closest('main,[role=\"main\"]')?0.25:0"));
check('dynamic destinations wait for live DOM mutations before falling back',assistant.includes('const waitForTarget=')&&assistant.includes('new MutationObserver(attempt)')&&assistant.includes("url.hash?1100:0")&&assistant.includes('revealTargetWhenReady'));
check('detached hidden and zero-size targets are discarded before success',assistant.includes('owner!==document||!node.isConnected')&&assistant.includes('node.getClientRects().length>0&&rect.width>1&&rect.height>1')&&assistant.includes('.filter(node=>targetReachable(node))'));
check('the reachability filter never receives the array index as a flag',!assistant.includes('.filter(targetReachable)')&&assistant.includes('.filter(node=>targetReachable(node))'));
check('a scroll-reveal target is not disqualified for being transparent',assistant.includes('const targetReachable=(node,requireOpaque=false)=>')&&assistant.includes("if(requireOpaque&&!(Number(style.opacity||1)>.01))return false;")&&assistant.includes('Scroll-triggered reveal animations are everywhere'));
check('deliberately hidden elements are still excluded',assistant.includes("node.hidden||node.getAttribute?.('aria-hidden')==='true'")&&assistant.includes("if(node.closest('[hidden],[aria-hidden=\"true\"]'))return;"));
check('unverified actions never reuse an optimistic arrival sentence',assistant.includes("result?.outcome==='completed'")&&assistant.includes("I couldn't find or highlight"));
check('the browser sends compact labels and kinds, never page HTML',assistant.includes(".slice(0,80)")&&assistant.includes('kind:targetKind(node)')&&!assistant.includes('outerHTML'));

console.log('\n=== a named kind ranks targets instead of diluting the match ===');
check('kind words are read as structure, not as content',assistant.includes('const targetKindHint=label=>')&&assistant.includes('const withoutKindWords=label=>')&&assistant.includes('const hint=targetKindHint(label)||targetKindHint(request)'));
check('structure only reorders targets that already matched on content',assistant.includes('if(!hint||!base)return base;')&&assistant.includes('targetKindAgrees(node,hint)?base+.5:targetKindConflicts(node,hint)?base*.55:base'));
check('container shape is judged structurally, not by class vocabulary',assistant.includes('const structuralContainer=node=>')&&assistant.includes('headings>=1&&headings<=3&&(controls>0||node.querySelectorAll(\'li\').length>=2)'));
check('headings are never a conflict for container requests',assistant.includes("card:['button','link','field','media']")&&assistant.includes("section:['button','link','field','media']"));

// The vocabulary and the score arithmetic are pure, so they are exercised for
// real rather than asserted as source text. This is the exact live failure that
// closed 1.4.1: "Highlight the Business package" resolved to nothing, because
// "package" halved the score of the card whose visible word is "Business".
const vocabulary=assistant.split('/* nika:kind-vocabulary:start */')[1]?.split('/* nika:kind-vocabulary:end */')[0]||'';
const targetTokens=value=>new Set(String(value||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').match(/[a-z0-9]{2,}/g)||[]);
const targetScore=(query,candidate)=>{
  const wanted=targetTokens(query),available=targetTokens(candidate);
  if(!wanted.size||!available.size)return 0;
  let matches=0;wanted.forEach(token=>{if(available.has(token))matches++});
  const normalizedQuery=[...wanted].join(' '),normalizedCandidate=[...available].join(' ');
  return matches/wanted.size+(normalizedCandidate.includes(normalizedQuery)?1:0);
};
const kind=vocabulary
  ? new Function('targetTokens',`${vocabulary};return{targetKindHint,withoutKindWords}`)(targetTokens)
  : {targetKindHint:()=>'',withoutKindWords:label=>label};
check('the vocabulary block is extractable for behavioural testing',Boolean(vocabulary));
check('"Business package" asks for a card named Business',kind.targetKindHint('Business package')==='card'&&kind.withoutKindWords('Business package')==='business');
check('"signup button" and "pricing section" keep their own kinds',kind.targetKindHint('signup button')==='button'&&kind.withoutKindWords('signup button')==='signup'&&kind.targetKindHint('pricing section')==='section'&&kind.withoutKindWords('pricing section')==='pricing');
check('a bare kind request keeps its literal label',kind.withoutKindWords('the packages')==='the packages');
check('ordinary labels are left completely alone',kind.targetKindHint('cheapest price')===''&&kind.targetKindHint('Monthly support')===''&&kind.withoutKindWords('Monthly support')==='monthly support');
// Scored against the real markup of a plan card: its own words never contain
// "package", while the buy button carries the plan name verbatim.
const planCard='Business A growing portfolio $199 one time 5 websites WordPress + Universal installers customer-hosted data and usage remove Nika branding priority email support buy Business';
const otherCard='Personal One useful site $99 one time 1 website choose WordPress or Universal';
const query=kind.withoutKindWords('Business package');
const cardScore=targetScore(query,planCard)*.84+.5;
const buttonScore=targetScore(query,'buy Business')*.55;
check('the named card outscores its own buy button',cardScore>buttonScore&&cardScore>=0.6);
check('a differently named card is not a candidate at all',targetScore(query,otherCard)===0);
check('a card is identified by its own eyebrow label, not its prose',assistant.includes('const containerIdentity=node=>')&&assistant.includes('containerIdentity(node),')&&assistant.includes("text.length<=40?text:''"));
// A card that merely mentions the word scores only through context (x.84),
// while the card actually named by it matches an alias at full weight. Without
// that separation both land on 2.18 and the smaller box wins the tie.
const namedByEyebrow=targetScore(query,'Business')+.5;
const mentionsInProse=targetScore(query,'01 Select the installer at checkout Personal includes one platform. Business includes both.')*.84+.5;
check('the card named Business outranks one that only mentions it',namedByEyebrow>mentionsInProse);
check('the old scoring really did miss this target',targetScore('Business package',planCard)*.84<0.6);

console.log('\n=== the visitor\'s own wording survives the model summary ===');
check('the live question is attached to the validated action only',assistant.includes("if(navigation.action)navigation.action.request=String(text||'')")&&assistant.includes('never sent anywhere and never becomes visible copy'));
check('the resolver reads a kind from the request when the label has none',assistant.includes('const hint=targetKindHint(label)||targetKindHint(request)')&&assistant.includes('query=targetKindHint(label)?withoutKindWords(label):label'));
check('the request only supplies a kind, never content tokens',assistant.includes('never contributes content tokens'));
check('every reveal path forwards the remembered request',assistant.includes("handoff?.request||''")&&assistant.includes("journey.request||''")&&assistant.includes("handoff.request||''"));
check('the cross-page handoff keeps the request across the reload',assistant.includes('{...handoff,href:destination+url.hash,label,at:Date.now()}'));
// The model summarised "the Business package" down to "Business", which is the
// exact wording that let the buy button outrank the card it sits in.
const labelOnly=kind.targetKindHint('Business')||kind.targetKindHint('Highlight the Business package.');
check('a summarised label still resolves to a card request',labelOnly==='card');
const summarised=targetScore('Business',planCard)*.84+.5;
check('the card outranks its buy button even from a bare label',summarised>targetScore('Business','buy Business')*.55);

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
check('same-page journeys use that fallback',assistant.includes('afterPaint(async()=>{\n        if(publicPath(url)!==pagePath()){'));
check('cross-page handoffs use that fallback',assistant.includes('afterPaint(async()=>{\n          const keepPageVisible='));
check('scroll settling does not wait on frames when hidden',assistant.includes('if(document.hidden)return void run();'));

console.log('\n=== manual navigation keeps what the visitor supplied ===');
// Dropping the whole journey turn also deleted the message carrying the
// visitor's own details, so a later "put those back" had nothing to work from
// and the server could not verify the values either.
check('the journey turn is kept with neutral conversational history',assistant.includes("journeyRoute:false}")&&assistant.includes('That request was completed earlier.')&&!assistant.includes('live route check is the only authority'));
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
check('the primary site mounts interface layers in the body, never on Document',assistant.includes('return root===document?document.body:root;'));
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
