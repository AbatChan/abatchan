// Keep public pricing and delivery expectations aligned with the studio's current workflow.
(function commercialPositioning(){
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/pricing')return;

  const scopeStrip=document.querySelector('.scope-strip');
  if(scopeStrip&&!document.querySelector('.delivery-strip')){
    const strip=document.createElement('div');
    strip.className='delivery-strip reveal visible';
    strip.innerHTML='<div class="delivery-item"><span>diagnosis</span><h3>Start with the real bottleneck</h3><p>The first job is finding the workflow where a better interface, integration, or AI system will create measurable value.</p></div><div class="delivery-item"><span>delivery</span><h3>AI where it earns its place</h3><p>Reusable systems and AI shorten production. Human judgment, review, testing, and accountability stay in the loop.</p></div><div class="delivery-item"><span>reliability</span><h3>Built for everyday use</h3><p>Permissions, error handling, integrations, monitoring, documentation, and a human fallback are planned with the feature.</p></div>';
    scopeStrip.after(strip);
  }
})();
