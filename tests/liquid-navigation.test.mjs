import { readFileSync } from 'node:fs';

const script=readFileSync(new URL('../script.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
let failed=false;
const check=(label,value)=>{
  const pass=Boolean(value);
  console.log(`${pass?'PASS':'FAIL'}  ${label}`);
  if(!pass)failed=true;
};

console.log('=== one liquid lens serves both navigation bars ===');
check('desktop and mobile share the controller',script.includes("qa('.desktop-nav,.mobile-tabs').forEach(nav=>{"));
check('the lens is exposed for rendered QA',script.includes("nav.dataset.liquidReady='true'")&&script.includes('nav.dataset.liquidTarget='));
check('the first painted lens already has measured dimensions',script.indexOf('settle(true);')<script.indexOf("nav.dataset.liquidReady='true'"));
check('the lens is transform-driven',script.includes('translate3d(${x}px,0,0) scaleX(${1+stretch})'));
check('the material bends the live backdrop',styles.includes('backdrop-filter:blur(2px) brightness(1.18) saturate(1.55)'));
check('the glass rim cannot expose rectangular filter seams',styles.includes('overflow:hidden;border-radius:inherit')&&styles.includes('.glass-edge i{display:none}'));

console.log('\n=== drag selection has velocity and spring behaviour ===');
check('horizontal intent is separated from page scrolling',script.includes("Math.abs(dx)<=Math.abs(dy)*1.08")&&styles.includes('touch-action:pan-y'));
check('touch capture starts before intent can be stolen',script.includes("event.pointerType==='touch'||event.pointerType==='pen'")&&script.indexOf("event.pointerType==='touch'||event.pointerType==='pen'")<script.indexOf("Math.abs(dx)<=Math.abs(dy)*1.08"));
check('mouse clicks keep native behavior until deliberate drag',script.includes("event.pointerType==='mouse'?10:6")&&script.indexOf("event.pointerType==='mouse'?10:6")<script.lastIndexOf('nav.setPointerCapture(pointerId)'));
check('the resizing chrome is frozen before drag hit-testing',script.includes("chrome.classList.add('is-drag-primed')")&&styles.includes('.site-header.is-drag-primed,.mobile-tabs.is-drag-primed{transition:none}'));
check('velocity drives stretch and skew',script.includes('Math.abs(velocity)/1650')&&script.includes('velocity/85'));
check('release commits the destination',script.includes('committing=true;chosen.click();committing=false'));
check('release resolves the item beneath the final coordinate',script.includes('dragging&&!cancelled?nearest(event.clientX):null'));
check('spring stops when settled',script.includes('if(dragging||moving>.08)frame=requestAnimationFrame(tick)'));

console.log('\n=== scroll and accessibility behaviour stay available ===');
check('downward scroll minimizes the chrome',script.includes('apply(direction>0&&y>120)'));
check('the dock collapses to the current destination',styles.includes('.mobile-tabs.is-minimized a:not(.active):not(.is-lens-current){display:none}')&&script.includes("classList.toggle('is-lens-current'"));
check('the morph never swaps in a duplicate temporary layout',!styles.includes('is-chrome-transition')&&!script.includes('is-chrome-transition'));
check('the lens tracks the shell throughout its width transition',script.includes("document.addEventListener('liquid-nav-layout'")&&script.includes('syncLiquidLayout()'));
check('the single-icon shell replaces the duplicate inner lens',styles.includes('.mobile-tabs.is-minimized .nav-lens{top:6px;height:calc(100% - 12px);opacity:0!important}'));
check('the real route corrects the lens before interaction',script.lastIndexOf("document.dispatchEvent(new CustomEvent('liquid-nav-layout'))")>script.indexOf("qa('[data-page]').forEach"));
check('the mobile header keeps one centre anchor while resizing',styles.includes('.site-header{height:60px;padding:0 12px 0 16px;gap:12px}')&&!styles.includes('.site-header{left:16px;right:16px;width:auto'));
check('focus and touch restore full navigation',script.includes("item.addEventListener('pointerdown',expand")&&script.includes("item.addEventListener('focusin',expand)"));
check('reduced motion removes the spring',script.includes("matchMedia('(prefers-reduced-motion: reduce)')")&&styles.includes('@media(prefers-reduced-motion:reduce)'));

if(failed)process.exit(1);
console.log('\nall passed');
