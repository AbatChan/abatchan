// Keep public pricing and delivery expectations aligned with the studio's current workflow.
(function commercialPositioning(){
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/pricing')return;

  const style=document.createElement('style');
  style.textContent=`
    .delivery-strip{margin-top:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--line);border-radius:24px;overflow:hidden}
    .delivery-item{padding:24px;border-right:1px solid var(--line)}
    .delivery-item:last-child{border-right:0}
    .delivery-item span{color:var(--signal);font-size:11px}
    .delivery-item h3{font-size:20px;margin:15px 0 8px}
    .delivery-item p{color:var(--muted);font-size:13px;margin:0}
    @media(max-width:900px){.delivery-strip{grid-template-columns:1fr}.delivery-item{border-right:0;border-bottom:1px solid var(--line)}.delivery-item:last-child{border-bottom:0}}
  `;
  document.head.appendChild(style);

  const scopeStrip=document.querySelector('.scope-strip');
  if(scopeStrip&&!document.querySelector('.delivery-strip')){
    const strip=document.createElement('div');
    strip.className='delivery-strip reveal visible';
    strip.innerHTML='<div class="delivery-item"><span>delivery</span><h3>Fast focused builds</h3><p>Templates, reusable systems, automation, and AI-assisted workflows reduce avoidable production time.</p></div><div class="delivery-item"><span>quality</span><h3>Speed without shortcuts</h3><p>Fast delivery still includes responsive behavior, testing, performance checks, and a clean handover.</p></div><div class="delivery-item"><span>brand</span><h3>Branding is separate</h3><p>Logo systems, identity direction, brand guidelines, and launch assets are scoped as premium creative work, not bundled as a free extra.</p></div>';
    scopeStrip.after(strip);
  }
})();
