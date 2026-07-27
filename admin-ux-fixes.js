// Final dashboard UX corrections shared across the work and announcement editors.
(function adminUxFixes(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];

  const style=document.createElement('style');
  style.textContent=`
    .adm-switch,.adm-form label.adm-switch,.adm-news-item label.adm-switch{min-height:0!important}
    .adm-featured-control{padding:14px 16px;border:1px solid rgba(99,102,241,.38);border-radius:15px;background:linear-gradient(145deg,rgba(99,102,241,.12),rgba(255,255,255,.02))}
    .adm-featured-help{margin:7px 0 0 55px;color:var(--muted);font-size:12px;line-height:1.45}
    .adm-preview-label{display:flex;align-items:center;gap:8px;margin:2px 0 8px;color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
    .adm-preview-label::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--signal);box-shadow:0 0 12px rgba(99,102,241,.65)}
    .adm-preview-cta{display:inline-flex;align-items:center;gap:8px;margin-top:14px;padding:10px 13px;border:1px solid var(--line);border-radius:11px;color:var(--paper);font-size:12px;font-weight:600;background:rgba(255,255,255,.035)}
    html[data-theme="light"] .adm-preview-cta{color:#151519;background:rgba(21,21,25,.035)}
    .adm-preview-cta .arrow{color:var(--signal)}
    .adm-sticky-save{position:fixed;right:24px;bottom:24px;z-index:410;display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--line);border-radius:17px;background:rgba(13,13,13,.88);backdrop-filter:blur(18px) saturate(180%);-webkit-backdrop-filter:blur(18px) saturate(180%);box-shadow:0 18px 50px rgba(0,0,0,.38)}
    html[data-theme="light"] .adm-sticky-save{background:rgba(245,245,243,.92);box-shadow:0 18px 50px rgba(27,28,34,.18)}
    .adm-sticky-save span{color:var(--muted);font-size:12px}
    #view-announcements.adm-hide .adm-sticky-save{display:none}
    @media(max-width:820px){
      .adm-sticky-save{left:14px;right:14px;bottom:calc(88px + env(safe-area-inset-bottom));justify-content:space-between}
      .adm-sticky-save .btn{flex:0 0 auto}
    }
  `;
  document.head.appendChild(style);

  function enhanceFeatured(){
    const input=q('#f-featured');
    if(!input||input.dataset.uxFixed)return;
    input.dataset.uxFixed='1';
    const label=input.closest('label.adm-switch');
    if(!label)return;
    label.classList.add('adm-featured-control');
    const text=label.querySelector('span:last-child');
    if(text)text.textContent='show on homepage';
    const help=document.createElement('p');
    help.className='adm-featured-help';
    help.textContent='Featured projects can fill the first three homepage slots, using the project order.';
    label.after(help);
  }

  function updatePreview(card){
    const index=card.dataset.index;
    const preview=q('.adm-news-preview',card);
    if(!preview)return;
    let label=card.querySelector('.adm-preview-label');
    if(!label){
      label=document.createElement('div');
      label.className='adm-preview-label';
      label.textContent='Live preview';
      preview.before(label);
    }
    const cta=q(`#news-${index}-cta`,card)?.value.trim()||'';
    const href=q(`#news-${index}-href`,card)?.value.trim()||'';
    let button=preview.querySelector('.adm-preview-cta');
    if(cta||href){
      if(!button){
        button=document.createElement('span');
        button.className='adm-preview-cta';
        preview.append(button);
      }
      button.innerHTML=`${cta||'view update'} <span class="arrow">↗</span>`;
      button.title=href?`Links to ${href}`:'Add a button link in advanced options';
    }else button?.remove();
  }

  function enhanceAnnouncementCard(card){
    if(card.dataset.finalUx)return;
    card.dataset.finalUx='1';
    const index=card.dataset.index;
    ['title','body','cta','href','tag'].forEach(name=>{
      q(`#news-${index}-${name}`,card)?.addEventListener('input',()=>setTimeout(()=>updatePreview(card),0));
      q(`#news-${index}-${name}`,card)?.addEventListener('change',()=>setTimeout(()=>updatePreview(card),0));
    });
    const preview=q('.adm-news-preview',card);
    if(preview)new MutationObserver(()=>{
      if(!preview.querySelector('.adm-preview-cta'))setTimeout(()=>updatePreview(card),0);
    }).observe(preview,{childList:true});
    updatePreview(card);
  }

  function enhanceAnnouncements(){
    const section=q('#view-announcements');
    if(!section)return;
    const note=q(':scope > .adm-note',section);
    if(note)note.remove();
    qa('#announcementList .adm-news-item').forEach(enhanceAnnouncementCard);
    if(!q('.adm-sticky-save',section)){
      const bar=document.createElement('div');
      bar.className='adm-sticky-save';
      const hint=document.createElement('span');
      hint.textContent='Unsaved announcement changes stay here until saved.';
      const button=document.createElement('button');
      button.type='button';button.className='btn primary sm';button.innerHTML='save changes <span class="arrow">↗</span>';
      button.addEventListener('click',()=>q('#saveAnnouncements')?.click());
      bar.append(hint,button);section.append(bar);
    }
  }

  function refresh(){enhanceFeatured();enhanceAnnouncements()}
  const start=()=>{
    refresh();
    new MutationObserver(refresh).observe(document.documentElement,{childList:true,subtree:true});
  };
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();