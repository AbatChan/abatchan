// Final dashboard UX corrections shared across the work and settings editors.
(function adminUxFixes(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];

  const style=document.createElement('style');
  style.textContent=`
    .adm-switch,.adm-form label.adm-switch,.adm-news-item label.adm-switch{min-height:0!important}
    .adm-featured-control{padding:14px 16px;border:1px solid rgba(99,102,241,.38);border-radius:15px;background:linear-gradient(145deg,rgba(99,102,241,.12),rgba(255,255,255,.02))}
    .adm-featured-help{margin:0;color:var(--muted);font-size:12px;line-height:1.45}
    .adm-preview-label{display:flex;align-items:center;gap:8px;margin:2px 0 8px;color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
    .adm-preview-label::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--signal);box-shadow:0 0 12px rgba(99,102,241,.65)}
    .adm-news-preview .btn.primary{margin-top:14px}
    .adm-sticky-save{position:fixed;right:24px;bottom:24px;z-index:410;display:flex;flex-direction:column-reverse;gap:10px;padding:10px;border:1px solid var(--line);border-radius:17px;background:rgba(13,13,13,.88);backdrop-filter:blur(18px) saturate(180%);-webkit-backdrop-filter:blur(18px) saturate(180%);box-shadow:0 18px 50px rgba(0,0,0,.38)}
    html[data-theme="light"] .adm-sticky-save{background:rgba(245,245,243,.92);box-shadow:0 18px 50px rgba(27,28,34,.18)}
    .adm-sticky-save[hidden]{display:none!important}
    .adm-sticky-save-main{display:flex;align-items:center;gap:10px}
    .adm-sticky-save-main span{color:var(--muted);font-size:12px;max-width:210px}
    .adm-sticky-discard{align-self:flex-end;width:32px;height:32px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--muted);display:grid;place-items:center;cursor:pointer}
    .adm-sticky-discard:hover{color:#e0564a;border-color:rgba(224,86,74,.5);background:rgba(224,86,74,.1)}
    .adm-sticky-discard svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round}
    @media(max-width:820px){
      .adm-sticky-save{left:14px;right:14px;bottom:calc(88px + env(safe-area-inset-bottom))}
      .adm-sticky-save-main{justify-content:space-between}
      .adm-sticky-save-main .btn{flex:0 0 auto}
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
        button=document.createElement('a');
        button.className='btn primary sm adm-preview-cta';
        preview.append(button);
      }
      button.href=href||'#';
      button.innerHTML=`${cta||'view update'} <span class="arrow">↗</span>`;
      button.title=href?`Links to ${href}`:'Add a button link in advanced options';
      button.addEventListener('click',e=>e.preventDefault(),{once:true});
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

  const contexts=[
    {view:'view-editor',save:'#saveItem',label:'Save project changes',hint:'Project changes are ready to save.'},
    {view:'view-copy',save:'#saveCopy',label:'Save site copy',hint:'Copy changes are ready to save.'},
    {view:'view-assistant',save:'#saveAssistant',label:'Save assistant settings',hint:'Assistant settings are ready to save.'},
    {view:'view-announcements',save:'#saveAnnouncements',label:'Save announcements',hint:'Announcement changes are ready to save.'}
  ];

  function buildStickySave(){
    let bar=q('#admSmartSave');
    if(bar)return bar;
    bar=document.createElement('div');
    bar.id='admSmartSave';bar.className='adm-sticky-save';bar.hidden=true;
    const main=document.createElement('div');main.className='adm-sticky-save-main';
    const hint=document.createElement('span');hint.id='admSmartSaveHint';
    const save=document.createElement('button');save.type='button';save.className='btn primary sm';save.id='admSmartSaveButton';
    const discard=document.createElement('button');discard.type='button';discard.className='adm-sticky-discard';discard.setAttribute('aria-label','Discard unsaved changes');discard.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    save.addEventListener('click',()=>{
      const ctx=contexts.find(x=>!q(`#${x.view}`)?.classList.contains('adm-hide'));
      if(ctx)q(ctx.save)?.click();
    });
    discard.addEventListener('click',()=>{
      const ctx=contexts.find(x=>!q(`#${x.view}`)?.classList.contains('adm-hide'));
      if(!ctx)return;
      if(!confirm('Discard unsaved changes on this page?'))return;
      if(ctx.view==='view-editor')q('#cancelItem')?.click();
      else location.reload();
    });
    main.append(hint,save);bar.append(main,discard);document.body.append(bar);return bar;
  }

  function updateStickySave(){
    const bar=buildStickySave();
    const ctx=contexts.find(x=>!q(`#${x.view}`)?.classList.contains('adm-hide'));
    if(!ctx){bar.hidden=true;return}
    bar.hidden=false;
    q('#admSmartSaveHint').textContent=ctx.hint;
    q('#admSmartSaveButton').innerHTML=`${ctx.label} <span class="arrow">↗</span>`;
  }

  function enhanceAnnouncements(){
    const section=q('#view-announcements');
    if(!section)return;
    const note=q(':scope > .adm-note',section);
    if(note)note.remove();
    qa('#announcementList .adm-news-item').forEach(enhanceAnnouncementCard);
  }

  function refresh(){enhanceFeatured();enhanceAnnouncements();updateStickySave()}
  const start=()=>{
    refresh();
    new MutationObserver(refresh).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  };
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();