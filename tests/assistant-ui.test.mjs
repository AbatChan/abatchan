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

if(failed)process.exit(1);
console.log('\nall passed');
