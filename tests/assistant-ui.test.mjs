import { readFileSync } from 'node:fs';

const script=readFileSync(new URL('../script.js',import.meta.url),'utf8');
const assistant=readFileSync(new URL('../assistant-v2.js',import.meta.url),'utf8');

let failed=false;
const check=(label,value)=>{
  const pass=Boolean(value);
  console.log(`${pass?'PASS':'FAIL'}  ${label}`);
  if(!pass)failed=true;
};

console.log('=== assistant shell starts independently of slow settings ===');
check('settings wait has a short upper bound',script.includes('Promise.race([')&&script.includes('setTimeout(()=>resolve(null),240)'));
check('authoritative disabled state still removes the shell',script.includes("fresh?.['assistant.enabled']===false")&&script.includes('launch.remove();panel.remove()'));

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
check('the journey turn is kept, not deleted',assistant.includes("? {...item,content:String(item.content||'').split('\\n')[0],journeyRoute:false}"));
check('the visitor message is no longer removed with it',!assistant.includes('journeyQuestions'));
// Dropping the reply while keeping the question left it unanswered, and the
// model then re-proposed the same action on every following turn.
check('the reply is not dropped outright',!assistant.includes('recent.filter(item=>!item.journeyRoute)'));

if(failed)process.exit(1);
console.log('\nall passed');
