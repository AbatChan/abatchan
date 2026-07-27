// Refresh expired Supabase sessions across REST/storage and prevent stale homepage/editor gallery state.
(function adminAuthGalleryFix(){
  if(!window.sb)return;

  const expiredTokenError=error=>{
    const text=[error?.message,error?.data,typeof error==='string'?error:'']
      .map(value=>typeof value==='string'?value:JSON.stringify(value||''))
      .join(' ')
      .toLowerCase();
    return text.includes('exp claim timestamp check failed')||
      text.includes('jwt expired')||
      text.includes('token has expired')||
      text.includes('invalid jwt');
  };

  let refreshPromise=null;
  const refreshSession=async()=>{
    if(!refreshPromise)refreshPromise=Promise.resolve(sb.refresh()).finally(()=>{refreshPromise=null});
    const session=await refreshPromise;
    if(!session)throw new Error('Your session expired. Sign in again and retry.');
    return session;
  };

  ['select','insert','update','upsert','remove','upload','removeFile','user','updatePassword'].forEach(name=>{
    const original=sb[name];
    if(typeof original!=='function'||original.__expiryRetry)return;
    const wrapped=async function(...args){
      try{return await original.apply(sb,args)}
      catch(error){
        if(!expiredTokenError(error))throw error;
        await refreshSession();
        return original.apply(sb,args);
      }
    };
    wrapped.__expiryRetry=true;
    sb[name]=wrapped;
  });

  const removeHomepageFallbacks=()=>{
    const path=location.pathname.replace(/\/+$/,'')||'/';
    if(path!=='/')return;
    const heading=[...document.querySelectorAll('.section-index')].find(el=>/selected systems/i.test(el.textContent));
    const grid=heading?.closest('section')?.querySelector('.work-grid');
    if(!grid)return;
    const prune=()=>{
      const managed=[...grid.querySelectorAll(':scope > .home-managed-card')];
      if(!managed.length)return;
      [...grid.children].forEach(card=>{
        if(card.classList.contains('home-slot-card')&&!card.classList.contains('home-managed-card'))card.remove();
      });
    };
    prune();
    new MutationObserver(prune).observe(grid,{childList:true});
  };

  const preventGalleryCarryover=()=>{
    if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
    const newButton=document.querySelector('#newItem');
    const title=document.querySelector('#f-title');
    const slug=document.querySelector('#f-slug');
    const editor=document.querySelector('#editor');
    if(!newButton||!title||!slug||!editor)return;

    let creating=false;
    let lastLoadedSlug='';
    newButton.addEventListener('click',()=>{
      creating=true;
      lastLoadedSlug='';
      document.querySelector('#galleryGrid')?.replaceChildren();
      const summary=document.querySelector('#f-home-summary');
      if(summary)summary.value='';
      const status=document.querySelector('#enhanceStatus');
      if(status)status.textContent='';
    });

    title.addEventListener('input',()=>{
      if(!creating)return;
      setTimeout(()=>{
        const next=slug.value.trim();
        if(!next||next===lastLoadedSlug)return;
        lastLoadedSlug=next;
        slug.dispatchEvent(new Event('change',{bubbles:true}));
      },0);
    });

    editor.addEventListener('submit',()=>{creating=false},{capture:true});
    document.querySelector('#cancelItem')?.addEventListener('click',()=>{creating=false});
  };

  const loadUpgrade=(src,label)=>{
    const previous=document.querySelector(`script[data-site-upgrade="${label}"]`);
    if(previous&&!label.startsWith('faq-'))return;
    previous?.remove();
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    script.dataset.siteUpgrade=label;
    document.head.appendChild(script);
  };

  const start=()=>{
    removeHomepageFallbacks();
    preventGalleryCarryover();
    loadUpgrade('/work-grid-layout-fix.js?v=3','work-grid-layout');
    loadUpgrade('/faq-system.js?v=5','faq-system');
    loadUpgrade('/commercial-positioning.js?v=3','commercial-positioning');
    if(/\/admin(?:\.html)?$/.test(location.pathname))loadUpgrade('/faq-admin.js?v=4','faq-admin');
  };
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();