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
check('the brand accent is the ring until it is unreadable',assistant.includes('const contrastRatio=(a,b)=>')&&assistant.includes('contrastRatio(colourLuminance(accent),luminance)>=2.4?accent:'));
check('the ring is drawn inside anything that clips its overflow',assistant.includes('const clippedByAncestor=node=>')&&assistant.includes("style.overflowX!=='visible'||style.overflowY!=='visible'")&&assistant.includes("clippedByAncestor(node)?'-2px':'4px'"));
check('the ring is a thin 2px line in every copy',assistant.includes('`2px solid ${border}`')&&assistant.includes('outline:2px solid var(--assist-guide-border,#312e81)!important')&&assistantCss.includes('outline:2px solid var(--assist-guide-border,rgba(129,132,255,.78))'));
check('the offset travels with the rest of the guide variables',assistant.includes("'--assist-guide-offset'")&&assistant.includes("node.style.setProperty('--assist-guide-offset',offset)"));
check('adaptive highlight styles are removed with the guidance state',assistant.includes('clearAdaptiveGuidance(node)')&&assistant.includes("removeProperty(name)"));
check('theme-important control styles cannot suppress the adaptive ring',assistant.includes("setProperty('outline',`2px solid ${border}`,'important')")&&assistant.includes("setProperty('outline-offset',offset,'important')")&&assistant.includes('guidanceInlineRestore'));
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

console.log('\n=== the launcher glow follows its setting in every state ===');
check('hover lifts the configured glow instead of a built-in one',assistantCss.includes('.assist-launch:hover{box-shadow:0 0 0 1px rgba(255,255,255,.2),0 22px 44px var(--assist-launch-glow-hover,')&&shell.includes("set('--assist-launch-glow-hover'"));
check('resting and hover glow come from the same setting',shell.includes('const glow=hexToRgb(cfg.shadowColour);')&&shell.includes("rgba(${glow.join(',')},.5)")&&shell.includes('The hover state lifts the same glow'));

console.log('\n=== an isolated guide still styles what it puts on the page ===');
check('the page gets the target stylesheet when the guide is isolated',assistant.includes('const ensurePageTargetStyle=()=>')&&assistant.includes('if(uiScope()===document)return;')&&assistant.includes('ensurePageTargetStyle();'));
check('it is injected once, and not where the page already has the rules',assistant.includes("if(document.querySelector('style[data-assist-target-style]'))return;"));
// The pill sits above the scrim and below the panel. raiseGuideSurfaces lifts
// guide surfaces to SCRIM_ABOVE, so comparing the two numbers is the check.
check('the pill never rides above the conversation',Number(assistant.match(/MARKER_STYLE='position:fixed;z-index:(\d+)/)[1])<Number(assistant.match(/SCRIM_ABOVE='(\d+)'/)[1])&&assistantCss.includes('.assist-guide-marker{position:fixed;z-index:2147482550'));
check('both definitions of the pill agree on its stacking',assistant.includes('a near-maximum z-index made it float over the conversation instead'));
check('the pill is positioned out of flow, so it adds no layout space',assistant.includes("MARKER_STYLE='position:fixed;")&&assistant.includes('.assist-guided-target{position:relative!important'));
check('the same definition serves nested shadow roots and the page',assistant.includes('style.textContent=TARGET_STYLE')&&assistant.split('style.textContent=TARGET_STYLE').length===3);

console.log('\n=== generated starters cover the site, not one product ===');
check('each of the three questions takes a different angle',adminGenerator.includes('const chosen = angles.slice().sort(() => Math.random() - 0.5).slice(0, 3);')&&adminGenerator.includes('Each question must cover a different subject'));
check('no single angle can claim all three cards',!adminGenerator.includes('const angle = angles[Math.floor(Math.random() * angles.length)];')&&adminGenerator.includes('No two questions may be about the same product or page'));
check('the reason is recorded next to the fix',adminGenerator.includes('a quarter of the time that ground was a single product')||adminGenerator.includes('quarter of the time'));

console.log('\n=== nothing is put in the model\'s mouth ===');
// A stand-in sentence in the assistant's own voice gets reused as a reply. "That
// request was completed earlier." was well formed enough to look like an answer,
// and a visitor who asked to see a specific line got it twice in a row. Swapping
// it for a different canned sentence only lowers the odds, so there is none.
const guide=readFileSync(new URL('../assistant-v2.js',import.meta.url),'utf8');
const role=readFileSync(new URL('../lib/prompt/engine.js',import.meta.url),'utf8');
check('no sentence is written on the model\'s behalf',!/content:'[^']*[a-z]{4}[^']*'/.test(guide.slice(guide.indexOf('return budget(recent.map'),guide.indexOf('const rememberJourney'))));
check('what it said is what it gets back',guide.includes('content:item.journeyConclusion||item.content'));
// The replacement for the canned line is guidance, not another string: the model
// is told to treat a repeat or a refinement as live work.
check('a repeated request is work to do, not something to defer',role.includes('Every visitor message is a live request')&&role.includes('never a reason to decline, defer, or reply that something was handled before'));
check('and a short follow-up is resolved from the conversation',role.includes('Resolve what a short follow-up refers to from the conversation')&&role.includes('Highlight it')&&role.includes('section_requested true'));

console.log('\n=== a cross-page journey resumes in its own bubble ===');
// The handoff attached to whichever bot bubble was last in the log. After
// another turn that is somebody else's, so the card showed two progress rows:
// its own, done, plus a stale one that span for ever because the bubble it
// landed on had already completed and completeJourney returns early on those.
check('the bubble that starts a journey is stamped',assistant.includes("bubble.dataset.journeyId=`j${Date.now().toString(36)}"));
check('and the stamp is stored, because the page is about to reload',assistant.includes('const stored=transcript.find(item=>item.journey===journey);')&&assistant.includes('stored.journey.journeyId=bubble.dataset.journeyId;writeStored(transcript)'));
check('it is restored onto the rebuilt bubble',assistant.includes('if(metadata?.journey?.journeyId)el.dataset.journeyId=metadata.journey.journeyId;'));
check('the handoff carries it across the navigation',assistant.includes("journeyId:bubble?.dataset.journeyId||''"));
check('and resumes on that bubble by name',assistant.includes('const own=handoff.journeyId?bubbles.find(item=>item.dataset.journeyId===handoff.journeyId):null;'));
// A handoff written by an older release has no stamp. Borrowing a finished
// bubble is what caused the permanent spinner, so it is never borrowed.
check('a finished bubble is never borrowed as a fallback',assistant.includes("const bubble=own||(newest&&!newest.dataset.journeyComplete?newest:null);")&&assistant.includes('if(!bubble)return;'));

console.log('\n=== a page that opened without its section says so ===');
// A page journey carrying a hash was judged on the page alone. When the anchor
// did not exist the browser scrolled nowhere, the visitor sat at the top, and
// the guide still reported arrival at the section. That is how a request for the
// middle of the homepage was answered with the footer, twice.
check('the hash has to resolve before the journey counts as arrived',assistant.includes('const hashResolves=!wantedHash||Boolean(hashTarget(wantedHash));')&&assistant.includes('routeMatches&&hashResolves'));
check('id or the legacy name attribute both count',assistant.includes('const byId=document.getElementById(id);')&&assistant.includes('[name="'));
// An id is whatever a site author typed, and it goes into a selector.
check('the id is escaped before it becomes a selector',assistant.includes('CSS.escape?CSS.escape(id)'));
check('and decoded, because a hash arrives percent-encoded',assistant.includes('return decodeURIComponent(raw)'));

// Two different editions write the conclusion in two different places, and both
// had to learn this. WordPress and Universal refuse a result-only chat request,
// so their conclusion is the client fallback.
check('the browser tells the model what actually happened',assistant.includes('it has no ${wantedHash} section, so nothing was scrolled to'));
check('and the packaged editions get their own honest sentence',assistant.includes("result?.outcome==='partial'&&result?.target_found===false")&&assistant.includes('I opened the page, but there is no'));
check('the old wording is not reused, because the page did open',assistant.includes("`I couldn't confirm opening ${journey.label||'that page'}.`")&&assistant.includes('would be false, because the page did open'));

console.log('\n=== closing the panel to see a highlight does not destroy it ===');
// A press anywhere released the highlight, including the launcher. The commonest
// reason to touch the launcher while a highlight is up is that the panel is
// covering the thing being pointed at, so closing it to look wiped out what the
// visitor was trying to see.
check('a press on the guide\'s own furniture is not a dismissal',assistant.includes("node?.classList?.contains?.('assist-panel')")&&assistant.includes("node?.classList?.contains?.('assist-launch')"));
check('it reads the composed path, so a shadow-root guide counts too',assistant.includes('const path=event.composedPath?.()||[];'));
// The close chip still dismisses, because that is the one control that means it.
check('the close chip still dismisses deliberately',assistant.includes("guidanceDismiss.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();dismiss?.()})"));
check('and a press on the page still releases the highlight',assistant.includes('if(path.some(ours))return;')&&assistant.includes('clearGuidance();'));

console.log('\n=== the highlight label does not sit on the words it points at ===');
// The pill is absolutely positioned in the target's top-right. On a card that
// corner is empty; on the contact form the first row is a full-width note, and
// the pill landed on it and cut the sentence in half.
check('the pill is placed outside the highlighted box',assistant.includes('const placeGuidanceMarker=rect=>')&&assistant.includes('const above=rect.top-SCRIM_PAD-height-8;'));
check('and drops below the target when there is no room above',assistant.includes('above>=6?above:Math.min(rect.bottom+SCRIM_PAD+8,innerHeight-height-6)'));
// A child of the target was clipped by a target with hidden overflow and covered
// whatever sat in the corner it chose. Neither can happen from <body>.
check('it is a body child, not a child of the target',assistant.includes('document.body.appendChild(guidanceMarker);')&&!assistant.includes('visualTarget.appendChild(marker);'));
check('the same loop that tracks the cutout tracks the pill',assistant.includes('{placeGuidanceDismiss(rect);placeGuidanceMarker(rect);}'));
// Left-aligned with the cutout, and the close chip is centred on the opposite
// corner, so the two cannot collide.
check('the pill and the close chip take opposite corners',assistant.includes('rect.left-SCRIM_PAD),innerWidth-width-6')&&assistant.includes('rect.right+SCRIM_PAD-size/2'));
// The close chip is centred on the cutout corner precisely so it never sits on
// the pill; moving the pill down must not undo that.
check('the close chip still owns the top-right corner',assistant.includes('Centred on the cutout')&&assistant.includes('rect.top-SCRIM_PAD-size/2'));

console.log('\n=== the form trusts the model, and the visitor reviews ===');
// Name and email used to be matched against the visitor's own words and emptied
// when they did not appear there, which threw away every correct inference from
// loose phrasing. The form composes a mailto: the visitor opens in their own
// client, so a value is a suggestion they read and edit, never a claim made for
// them, and the matching is gone.
const chatStream=readFileSync(new URL('../api/chat-stream.js',import.meta.url),'utf8');
check('nothing matches a proposed value against the visitor\'s words',!chatStream.includes('suppliedText')&&!chatStream.includes('previouslyPrepared'));
check('and no value is emptied for where it came from',!/formPrefill\?\.(name|email)&&[^\n]*\)formPrefill\.(name|email)=''/.test(chatStream));
check('the reason is recorded where the guard used to be',chatStream.includes('It composes a mailto: link the visitor opens in')&&chatStream.includes('costs a keystroke rather than a mistake'));

// The three journey sentences are the model's own. The server templates are the
// fallback for a journey that arrives without them.
check('the model writes the journey, the server fills gaps',chatStream.includes('const safeDepartureBase=ownVoice(departure)')&&chatStream.includes('const safeArrival=ownVoice(authoredArrival)'));
// The one thing prose still cannot do: name an address other than the one going
// into the form. The likeliest wrong answer is the studio's own address, printed
// on the page the model is reading.
check('a sentence naming a different address loses to the template',chatStream.includes('const namesOtherAddress=')&&chatStream.includes('This checks the prose against the value, not the value'));

// The last canned sentence in this path. It only fires when the model asked to
// replace a field and sent nothing to put in it, and even then its own question
// is preferred when it wrote one.
check('a replacement with no value asks in the model\'s words first',chatStream.includes("const asked=[departure,authoredArrival].map(item=>String(item||'').trim()).find(item=>item.includes('?'));")&&chatStream.includes('asked||`What exact'));

check('the model is told to work values out from loose phrasing',role.includes('however loosely they put it')&&role.includes('my email is my name at gmail'));
check('to ask only when it has nothing to go on',role.includes('nothing to base a value on, ask for it rather than inventing'));
check('and to close by asking for a review, in its own words',role.includes('check the fields before sending, in your own words and different each time'));

// The server used to re-derive this and ignore a false from the browser, so the
// browser's new answer would have been thrown away on abatchan.com.
check('the server honours a browser that reports the target missing',chatStream.includes('const targetVerified=routeVerified&&actionResult.target_found===true;')&&chatStream.includes('can only ever downgrade the outcome'));

console.log('\n=== the licence endpoint answers, it never blocks ===');
// The endpoint and the vocabulary it answers in are two files now, because
// /api/download has to reach the same verdict about the same key. Read both:
// these rules must hold wherever they ended up living.
const licence=readFileSync(new URL('../api/licence.js',import.meta.url),'utf8')
  +readFileSync(new URL('../lib/licence/verify.js',import.meta.url),'utf8');
check('a failure tells the caller to carry on',licence.includes('ok: true,')&&licence.includes('degraded: true')&&licence.includes('Nika continues to run unchanged'));
check('development and staging never consume an activation',licence.includes("function siteKind")&&licence.includes("kind === 'production'")&&licence.includes("staging|stage|dev|test|preview|sandbox|uat|qa"));
check('being over the limit is reported, not refused',licence.includes('const overLimit =')&&licence.includes('ok: valid || overLimit')&&licence.includes('not a shutdown'));
check('the key itself is never stored or logged',licence.includes('const keyTail = key.slice(-8);')&&licence.includes('Never log or echo the key itself'));
check('control characters are stripped but hyphens survive',licence.includes('Licence keys contain hyphens'));
// A valid key for another Lemon Squeezy product is still not a Nika licence.
check('unset variants cannot collapse into one generous tier',licence.includes('Object.fromEntries([')&&licence.includes('.filter(([id]) => id)'));
check('an unrecognised variant receives no Nika entitlement',licence.includes('function tierFrom')&&licence.includes('return TIERS[')&&licence.includes('|| null;')&&licence.includes('This licence key was not issued for Nika.'));
check('the key is identified before an activation is spent',licence.includes('Validate before activation')&&licence.indexOf("lemon('validate'")<licence.indexOf("lemon('activate'"));

console.log('\n=== the guide states its own box model ===');
// The value changed when the note moved above the composer; the reason it is
// stated at all did not. A host theme's bare `p` rule would otherwise decide
// the spacing between this line and the input.
check('the note pins its own margin against theme and UA defaults',assistantCss.includes('.assist-note{padding:0 16px;')&&/\.assist-note\{[^}]*margin:[^;}]*!important/.test(assistantCss));
// A caution about the answers belongs where it is read before typing, not under
// the reply the visitor has already acted on.
check('the note sits above the composer, the credit below it',shell.indexOf('assist-note')<shell.indexOf("'<form class=\"assist-form\">'")&&shell.indexOf('assist-brand')>shell.indexOf("'</form>'"));
check('the reasoning names the user-agent default, not just themes',assistantCss.includes('Margin is not inherited')&&assistantCss.includes('What it does not block is the user-agent default'));
check('the conversation keeps the spacing its markdown needs',assistantCss.includes('The conversation itself is excluded')&&!assistantCss.includes('.assist-log p{margin:0!important}'));
// The reset is more specific than the note's own rule, so listing the note in
// it silently replaced the 6px the note asks for with 0.
check('the reset does not overwrite the margin the note declares',!assistantCss.includes('.assist-panel .assist-note,')&&assistantCss.includes('listing it here would override the value it asks for'));

console.log('\n=== every guide surface follows the configured colour ===');
check('the close control inherits nothing, so the accent is copied to it',assistant.includes("for(const name of ['--assist-guide-marker-bg','--assist-guide-marker-text'])")&&assistant.includes('inherits none of them'));
check('links follow the accent, with no separate setting to keep in step',shell.includes("set('--signal-ink',cfg.accent)")&&!shell.includes('linkColour'));
check('no built-in indigo is left hard-coded on links',!assistantCss.includes('a.assist-action-link{color:#4f46e5}')&&assistantCss.includes('html[data-theme="light"] .assist-msg.bot a.assist-action-link{color:var(--signal-ink)}')&&assistantCss.includes('a.assist-action-link:focus-visible{outline:2px solid currentColor'));

console.log('\n=== the visitor can end the highlight early ===');
check('a dismiss control is pinned to the cutout, not nested in the target',assistant.includes('const DISMISS_STYLE=')&&assistant.includes("guidanceDismiss.className='assist-guide-dismiss'")&&assistant.includes('const placeGuidanceDismiss=rect=>'));
check('the dismiss sits on the corner, clear of the label pill',assistant.includes('never sits')&&assistant.includes('rect.right+SCRIM_PAD-size/2')&&assistant.includes('rect.top-SCRIM_PAD-size/2'));
check('it cannot be pushed off screen by an oversized target',assistant.includes('innerWidth-size-6')&&assistant.includes('innerHeight-size-6'));
check('the dismiss exists even where the scrim cannot',assistant.indexOf('guidanceDismiss=document.createElement')<assistant.indexOf("if(!CSS?.supports?.('clip-path'"));
check('it is the one part of the overlay that takes clicks',assistant.includes('pointer-events:auto')&&assistant.includes('the one part of the overlay that takes clicks'));
check('escape and a deliberate press also release it',assistant.includes("if(event.key==='Escape')clearGuidance()")&&assistant.includes("addEventListener('pointerdown',onPress,{passive:true})"));
check('the press listener is armed a frame late',assistant.includes('cannot immediately dismiss it')&&assistant.includes('const arm=requestAnimationFrame('));
check('releasing tears down its own listeners',assistant.includes('unwatchGuidanceRelease();')&&assistant.includes("removeEventListener('pointerdown',guidanceReleaseWatch.onPress)")&&assistant.includes('guidanceDismiss=null;'));
check('the dismiss is a thumb target on a phone',assistantCss.includes('.assist-guide-dismiss{')&&assistantCss.includes('width:40px!important;'));
check('the cross is drawn, not typed, so it centres exactly',assistant.includes('<svg viewBox="0 0 16 16" width="11" height="11"')&&assistant.includes('M4.5 4.5l7 7M11.5 4.5l-7 7')&&!assistant.includes("guidanceDismiss.textContent='\\u00d7'"));
check('the drawn cross is centred by the flex box, not a line box',assistant.includes('line-height:0;cursor:pointer')&&assistantCss.includes('.assist-guide-dismiss svg{display:block;width:11px;height:11px}'));

console.log('\n=== a settled page does not wait for an anchor that is not coming ===');
check('the grace period is skipped once the page is settled',assistant.includes("const waitForTarget=(url,label,preferExact=false,request='',settled=false)=>")&&assistant.includes('const fallbackTimer=setTimeout(()=>{allowFallback=true;attempt()},settled||!url.hash?0:1100);'));
check('the arrival ceiling is short on a settled page',assistant.includes('const ceiling=setTimeout(()=>finish(ready(true)),settled?450:1900);'));
check('every same-page reveal is marked settled',assistant.includes("handoff?.request||'',true)")&&assistant.includes("journey.request||'',true)"));
check('a cross-page arrival keeps the full grace',assistant.includes("revealTargetWhenReady(url,handoff.label,handoff.section_requested===true,handoff.request||'')")&&assistant.includes('On arrival, give a destination with a named anchor time'));
check('the resolved flag no longer shadows the settled flag',assistant.includes('let done=false,allowFallback=settled||!url.hash;')&&assistant.includes('const finish=target=>{if(done)return;done=true;'));

console.log('\n=== the page steps back so the answer reads as the answer ===');
check('a scrim dims the rest of the page with the highlight',assistant.includes("guidanceScrim.className='assist-guide-scrim'")&&assistantCss.includes('.assist-guide-scrim{')&&assistantCss.includes('.assist-guide-scrim.is-on{opacity:1}'));
check('the scrim never intercepts a click',assistant.includes('pointer-events:none')&&assistantCss.includes('.assist-guide-scrim{position:fixed;inset:0;z-index:2147482000;pointer-events:none'));
check('the scrim recedes the page on dark palettes too',assistantCss.includes('backdrop-filter:blur(3px) brightness(.66)')&&assistant.includes('Dimming alone is invisible on a dark site')&&assistantCss.includes('-webkit-backdrop-filter:blur(3px)'));
check('the scrim styles inline too, for embeds without the stylesheet',assistant.includes('const SCRIM_STYLE=')&&assistant.includes('guidanceScrim.style.cssText=SCRIM_STYLE'));
check('the target is cut out of the scrim, not raised above it',assistant.includes('const scrimCutout=node=>')&&assistant.includes('polygon(evenodd, 0px 0px,')&&!assistant.includes('is-guide-lifted'));
check('the cutout asks nothing of the page stacking context',assistant.includes('Clipping asks')&&!assistant.includes("guidanceInlineProperties=['outline','outline-offset','z-index']")&&!assistant.includes('appendChild(visualTarget)'));
check('the guide panel and launcher stay above the scrim',assistant.includes("const SCRIM_ABOVE='2147482600'")&&assistant.includes("scope.querySelectorAll?.('.assist-panel,.assist-launch,.assist-backdrop,.assist-reply-peek')")&&assistant.includes('restoreGuideSurfaces()'));
check('a reply bubble born after the scrim is raised too',assistant.includes('const guidanceScrimRaised=new Map();')&&assistant.includes('if(guidanceScrimRaised.has(node))continue;')&&assistant.includes('uiHome().appendChild(peek);raiseGuideSurfaces();'));
check('every raised surface keeps its own original z-index',assistant.includes('guidanceScrimRaised.set(node,[node.style.getPropertyValue(\'z-index\'),node.style.getPropertyPriority(\'z-index\')]);')&&assistant.includes('guidanceScrimRaised.clear();'));
check('the hole follows the target through the scroll',assistant.includes('guidanceScrimFrame=requestAnimationFrame(track)')&&assistant.includes('cancelAnimationFrame(guidanceScrimFrame)'));
check('a browser without even-odd clipping shows no scrim at all',assistant.includes("CSS?.supports?.('clip-path','polygon(evenodd, 0px 0px, 1px 0px, 1px 1px)')"));
check('the scrim, its tracking frame and the raised panels are all released',assistant.includes('hideGuidanceScrim()')&&assistant.includes('restoreGuideSurfaces();')&&assistant.includes('guidanceScrimFrame=0;'));
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
check('a generated anchor loses to a clearly better answer',assistant.includes('if(raw&&label){')&&assistant.includes('ranked.score>targetMatch(label,raw,request)+.15'));
check('that check does not depend on the action being flagged a section',!assistant.includes('if(raw&&preferExact&&label){'));
check('a generated anchor still wins when nothing beats it',assistant.includes("ranked.node!==raw&&")&&assistant.indexOf('ranked.score>targetMatch(label,raw,request)+.15')<assistant.indexOf('if(raw)return raw;'));
check('fuzzy confidence is based on target evidence, not page position',assistant.includes('const targetMatch=(label,node,request=\'\')=>')&&assistant.includes('b.score-a.score||b.priority-a.priority||a.area-b.area')&&!assistant.includes("node.closest('main,[role=\"main\"]')?0.25:0"));
check('dynamic destinations wait for live DOM mutations before falling back',assistant.includes('const waitForTarget=')&&assistant.includes('new MutationObserver(attempt)')&&assistant.includes("settled||!url.hash?0:1100")&&assistant.includes('revealTargetWhenReady'));
check('detached hidden and zero-size targets are discarded before success',assistant.includes('owner!==document||!node.isConnected')&&assistant.includes('node.getClientRects().length>0&&rect.width>1&&rect.height>1')&&assistant.includes('.filter(node=>targetReachable(node))'));
check('the reachability filter never receives the array index as a flag',!assistant.includes('.filter(targetReachable)')&&assistant.includes('.filter(node=>targetReachable(node))'));
check('a scroll-reveal target is not disqualified for being transparent',assistant.includes('const targetReachable=(node,requireOpaque=false)=>')&&assistant.includes("if(requireOpaque&&!(Number(style.opacity||1)>.01))return false;")&&assistant.includes('Scroll-triggered reveal animations are everywhere'));
check('deliberately hidden elements are still excluded',assistant.includes("node.hidden||node.getAttribute?.('aria-hidden')==='true'")&&assistant.includes("if(node.closest('[hidden],[aria-hidden=\"true\"]'))return;"));
check('unverified actions never reuse an optimistic arrival sentence',assistant.includes("result?.outcome==='completed'")&&assistant.includes("I couldn't find or highlight"));
check('the browser sends compact labels and kinds, never page HTML',assistant.includes(".slice(0,80)")&&assistant.includes('kind:targetKind(node)')&&!assistant.includes('outerHTML'));

console.log('\n=== a named kind ranks targets instead of diluting the match ===');
check('kind words are read as structure, not as content',assistant.includes('const targetKindHint=label=>')&&assistant.includes('const withoutKindWords=label=>')&&assistant.includes('const hint=targetKindHint(label)||targetKindHint(request)'));
check('structure only reorders targets that already matched on content',assistant.includes('if(!hint||!scored)return scored;')&&assistant.includes('targetKindAgrees(node,hint)?scored+.5:targetKindConflicts(node,hint)?scored*.55:scored'));
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

console.log('\n=== navigation chrome does not stand in for content ===');
check('chrome is found by landmark, not by page position',assistant.includes("const CHROME_LANDMARKS='nav,[role=\"navigation\"],header,[role=\"banner\"],footer,[role=\"contentinfo\"]'")&&assistant.includes('const inChrome=node=>')&&!assistant.includes("node.closest('main,[role=\"main\"]')?0.25:0"));
check('only links and buttons inside chrome are demoted',assistant.includes("['link','button'].includes(targetKind(node))")&&assistant.includes('base*.45'));
check('the landmark itself is never demoted',assistant.includes('return Boolean(landmark)&&landmark!==node;')&&assistant.includes('asking for the footer still finds the footer'));
check('asking for a link or a menu turns the rule off',assistant.includes('const CHROME_WORDS=')&&assistant.includes('CHROME_WORDS.test(`${label} ${request}`)'));

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

console.log('\n=== the reply bubble is usable on a phone ===');
check('the bubble clears the launcher it points at',assistantCss.includes('bottom:150px!important;')&&assistantCss.includes('covered the very control it is telling the visitor to tap'));
check('the dismiss target meets the touch minimum',assistantCss.includes('.assist-reply-peek button{')&&assistantCss.includes('width:44px!important;')&&assistantCss.includes('height:44px!important;'));

console.log('\n=== a phone sheet never covers what it just highlighted ===');
check('a saved action link minimizes the sheet like a journey does',assistant.includes("matchMedia('(max-width:640px)').matches&&panel.classList.contains('is-open'))launch.click()")&&assistant.includes('needs the same courtesy'));
check('the sheet only minimizes once a target was really painted',assistant.includes('.then(result=>{if(result?.found&&'));

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
check('the journey turn is kept, and carries what was really said',assistant.includes("journeyRoute:false}")&&assistant.includes('content:item.journeyConclusion||item.content'));
// The departure is a claim about where the visitor is heading and goes stale on
// arrival. The conclusion is written after the browser reports what happened, so
// it is an answer rather than a location claim, and it is the half that is kept.
check('the departure is dropped and the conclusion kept',assistant.includes('journeyConclusion:conclusion')&&assistant.includes("journeyConclusion:item.journey.arrival||''"));
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
check('connections that do not count explain the permanent Vercel floor',adminHtml.includes('Connections not counted')&&adminHtml.includes('Addresses set in Vercel always stay exempt'));
check('Abatchan admin generation stays server-side and requires a signed-in user',adminHtml.includes('generateAssistantSuggestions')&&adminHtml.includes('draftAssistantInstructions')&&admin.includes('/api/admin-assistant-generate')&&adminGenerator.includes('signedIn(req.headers.authorization)')&&adminGenerator.includes('process.env.DEEPSEEK_API_KEY'));
check('AI controls distinguish improving current input from starting afresh',adminHtml.includes('freshAssistantSuggestions')&&adminHtml.includes('freshAssistantInstructions')&&admin.includes("generateAssistantDraft('instructions', 'refine'")&&admin.includes("generateAssistantDraft('instructions', 'fresh'"));
check('current suggestions and instructions are sent only as generation context',admin.includes('currentSuggestions, currentDraft')&&adminGenerator.includes('currentSuggestions')&&adminGenerator.includes('currentDraft'));
check('AI generation retries empty or invalid output once',adminGenerator.includes('GENERATION_ATTEMPTS = 2')&&adminGenerator.includes('retryGeneration'));
check('invalid AI output cannot replace existing admin fields',admin.indexOf("if (!response.ok) throw")<admin.indexOf('paintSuggestions(data.suggestions)')&&admin.indexOf("if (!response.ok) throw")<admin.indexOf("q('#a-system').value"));
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
