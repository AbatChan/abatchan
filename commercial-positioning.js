// Keep public pricing and delivery expectations aligned with the studio's current workflow.
(function commercialPositioning(){
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/pricing')return;

  const scopeStrip=document.querySelector('.scope-strip');
  if(scopeStrip&&!document.querySelector('.delivery-strip')){
    const strip=document.createElement('div');
    strip.className='delivery-strip reveal visible';
    strip.innerHTML='<div class="delivery-item"><span>delivery</span><h3>Fast focused builds</h3><p>Templates, reusable systems, automation, and AI-assisted workflows reduce avoidable production time.</p></div><div class="delivery-item"><span>quality</span><h3>Speed without shortcuts</h3><p>Fast delivery still includes responsive behavior, testing, performance checks, and a clean handover.</p></div><div class="delivery-item"><span>brand</span><h3>Branding is separate</h3><p>Logo systems, identity direction, brand guidelines, and launch assets are scoped as premium creative work, not bundled as a free extra.</p></div>';
    scopeStrip.after(strip);
  }
})();
