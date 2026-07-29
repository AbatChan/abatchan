// Client review editor stored in reviews.items.
//
// Same shape as the FAQ manager: a compact list where one row expands at a
// time, ordering saves itself, and the save button goes inactive once there
// is nothing left to save.
(function reviewsAdmin(){
  'use strict';
  const VERSION=1;
  if((window.__ABATCHAN_REVIEWS_ADMIN_VERSION__||0)>=VERSION)return;
  window.__ABATCHAN_REVIEWS_ADMIN_VERSION__=VERSION;
  if(!/\/admin(?:\.html)?$/.test(location.pathname)||!window.sb)return;

  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
  const tabs=q('#tabs'),main=q('.adm-main');if(!tabs||!main)return;
  let items=[],projects=[],loaded=false,dirty=false,expanded=null,revision=0,saveQueue=Promise.resolve();
  const makeId=()=>`review-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const chevron='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
  const trash='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>';
  const upIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5"/></svg>';
  const downIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';

  let tab=q('[data-view="reviews"]',tabs);
  if(!tab){
    tab=document.createElement('button');tab.type='button';tab.dataset.view='reviews';
    tab.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 3.5 14.6 9l6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 20l1.1-6L3.4 9.8 9.4 9Z"/></svg>reviews';
    tabs.append(tab);
  }
  q('#view-reviews')?.remove();
  const section=document.createElement('section');
  section.id='view-reviews';
  section.className='adm-hide faq-admin-shell';
  section.innerHTML=`<div class="adm-head"><h2>Reviews</h2><button class="btn primary sm" id="saveReviews" type="button">save <span class="arrow">↗</span></button></div><p class="adm-sub">What clients said the work changed. These read as a record, so keep them specific: what was broken, and what it is now.</p><div class="faq-admin-toolbar"><span class="faq-admin-count" id="reviewCount">0 reviews</span><button class="btn sm" id="addReview" type="button">add review <span class="arrow">↗</span></button></div><div class="faq-admin-status" id="reviewStatus"></div><div class="faq-admin-list" id="reviewList"></div>`;
  main.append(section);
  if(new URLSearchParams(location.search).get('view')==='reviews')queueMicrotask(()=>window.__adminShowView?.('reviews',{routeMode:'replace'}));

  const list=q('#reviewList'),count=q('#reviewCount'),status=q('#reviewStatus'),save=q('#saveReviews'),add=q('#addReview');

  const setSaveState=changed=>{
    save.dataset.clean=String(!changed);
    save.disabled=!changed;
    save.innerHTML=changed?'save <span class="arrow">↗</span>':'saved <span aria-hidden="true">✓</span>';
  };
  const setDirty=value=>{dirty=value;if(value)revision++;status.textContent=value?'Unsaved changes':'';setSaveState(value)};
  const normalize=()=>items.map((item,position)=>({
    id:item.id,
    position,
    quote:(item.quote||'').trim(),
    engagement:(item.engagement||'').trim(),
    source:(item.source||'').trim(),
    client:(item.client||'').trim(),
    date:(item.date||'').trim(),
    project:(item.project||'').trim(),
    pages:item.pages||'home',
    featured:!!item.featured,
    published:item.published!==false
  }));

  const persist=(message='Saved')=>{
    saveQueue=saveQueue.then(async()=>{
      const invalid=items.find(item=>!item.quote?.trim()||!item.engagement?.trim());
      if(invalid){
        expanded=invalid.id;render();
        status.textContent='Every review needs the quote and what the work was.';
        status.classList.add('bad');setDirty(true);return false;
      }
      save.disabled=true;save.textContent='saving…';
      status.classList.remove('bad');status.textContent='Saving…';
      try{
        const savingRevision=revision;
        items=normalize();
        await sb.upsert('settings',[{key:'reviews.items',value:items,is_public:true}]);
        dirty=revision!==savingRevision;
        status.textContent=dirty?'Unsaved changes':message;
        setSaveState(dirty);
        setTimeout(()=>{if(!dirty&&status.textContent===message)status.textContent=''},1800);
        return true;
      }catch(err){
        dirty=true;status.textContent=`Save failed. ${err.message}`;
        status.classList.add('bad');setSaveState(true);return false;
      }
    });
    return saveQueue;
  };

  const move=(index,delta)=>{
    const next=index+delta;
    if(!items[index]||!items[next])return;
    [items[index],items[next]]=[items[next],items[index]];
    expanded=items[next].id;setDirty(true);render();persist('Order saved.');
  };

  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const projectOptions=selected=>{
    const options=['<option value="">no project link</option>'];
    const known=projects.some(p=>p.slug===selected);
    projects.forEach(p=>{
      options.push(`<option value="${esc(p.slug)}"${p.slug===selected?' selected':''}>${esc(p.title||p.slug)}</option>`);
    });
    // Keep a slug that no longer matches a published project rather than
    // silently dropping the link on the next save.
    if(selected&&!known)options.push(`<option value="${esc(selected)}" selected>${esc(selected)} (not published)</option>`);
    return options.join('');
  };

  const render=()=>{
    count.textContent=`${items.length} review${items.length===1?'':'s'}`;
    if(!items.length){
      list.innerHTML='<div class="faq-admin-empty">No reviews yet. Add one once a client has told you what changed.</div>';
      return;
    }
    list.replaceChildren(...items.map((item,index)=>{
      item.id=item.id||makeId();
      const open=expanded===item.id;
      const card=document.createElement('article');
      card.className=`faq-admin-item${open?' is-open':''}${item.published===false?' is-draft':''}`;
      card.dataset.reviewId=item.id;

      const head=document.createElement('div');
      head.className='faq-admin-head';
      const toggle=document.createElement('button');
      toggle.type='button';toggle.className='faq-admin-toggle';
      toggle.setAttribute('aria-expanded',String(open));
      toggle.innerHTML=`<span class="faq-admin-index">${String(index+1).padStart(2,'0')}</span><span class="faq-admin-copy"><span class="faq-admin-title"></span><span class="faq-admin-meta"></span></span><span class="faq-admin-chevron">${chevron}</span>`;
      q('.faq-admin-title',toggle).textContent=item.quote?.trim()||'Untitled review';
      q('.faq-admin-meta',toggle).textContent=[
        item.published===false?'draft':'published',
        [item.engagement,item.source].filter(Boolean).join(' · ')
      ].filter(Boolean).join(' · ');
      toggle.addEventListener('click',()=>{expanded=open?null:item.id;render()});

      const rowOrder=document.createElement('div');
      rowOrder.className='faq-admin-row-order';
      const rowUp=document.createElement('button');
      rowUp.type='button';rowUp.className='faq-admin-move';rowUp.disabled=index===0;
      rowUp.setAttribute('aria-label','Move review up');rowUp.innerHTML=upIcon;
      rowUp.addEventListener('click',()=>move(index,-1));
      const rowDown=document.createElement('button');
      rowDown.type='button';rowDown.className='faq-admin-move';rowDown.disabled=index===items.length-1;
      rowDown.setAttribute('aria-label','Move review down');rowDown.innerHTML=downIcon;
      rowDown.addEventListener('click',()=>move(index,1));
      rowOrder.append(rowUp,rowDown);
      head.append(toggle,rowOrder);

      const panel=document.createElement('div');
      panel.className='faq-admin-panel';panel.hidden=!open;
      panel.innerHTML=`<div class="faq-admin-fields">
        <div class="faq-admin-field"><label>what they said</label><textarea data-quote placeholder="Within 3 hours he was able to completely fix and complete it for me."></textarea><p class="adm-field-help">The client\u2019s own words. Trim to one continuous passage rather than stitching sentences together.</p></div>
        <div class="adm-two">
          <div class="faq-admin-field"><label>what the work was</label><input data-engagement placeholder="BookingKoala integration"></div>
          <div class="faq-admin-field"><label>where they said it</label><input data-source placeholder="Upwork"></div>
        </div>
        <div class="adm-two">
          <div class="faq-admin-field"><label>client name or handle (optional)</label><input data-client placeholder="missashleigh20"></div>
          <div class="faq-admin-field"><label>when (optional)</label><input data-date placeholder="March 2026"></div>
        </div>
        <div class="faq-admin-field"><label>links to project</label><div class="adm-select-wrap"><select data-project>${projectOptions(item.project||'')}</select></div></div>
        <div class="faq-admin-field"><label>show on</label><div class="adm-select-wrap"><select data-pages>
          <option value="home">homepage</option>
          <option value="pricing">pricing page</option>
          <option value="both">both</option>
        </select></div></div>
        <label class="adm-switch"><input data-featured type="checkbox"><span class="adm-switch-track" aria-hidden="true"></span><span>use beside the contact form</span></label>
      </div>
      <div class="faq-admin-footer">
        <div class="faq-admin-order"><button class="faq-admin-move" data-up type="button" aria-label="Move review up">${upIcon}</button><button class="faq-admin-move" data-down type="button" aria-label="Move review down">${downIcon}</button></div>
        <button class="faq-admin-delete" type="button">${trash}<span>Delete review</span></button>
        <label class="adm-switch"><input data-published type="checkbox"><span class="adm-switch-track" aria-hidden="true"></span><span>published</span></label>
      </div>`;

      q('[data-up]',panel).disabled=index===0;
      q('[data-down]',panel).disabled=index===items.length-1;
      q('[data-up]',panel).addEventListener('click',()=>move(index,-1));
      q('[data-down]',panel).addEventListener('click',()=>move(index,1));

      q('[data-quote]',panel).value=item.quote||'';
      q('[data-engagement]',panel).value=item.engagement||'';
      q('[data-source]',panel).value=item.source||'';
      q('[data-client]',panel).value=item.client||'';
      q('[data-date]',panel).value=item.date||'';
      q('[data-pages]',panel).value=item.pages||'home';
      q('[data-featured]',panel).checked=!!item.featured;
      q('[data-published]',panel).checked=item.published!==false;

      q('[data-quote]',panel).addEventListener('input',e=>{
        item.quote=e.target.value;
        q('.faq-admin-title',toggle).textContent=e.target.value.trim()||'Untitled review';
        setDirty(true);
      });
      ['engagement','source','client','date','project','pages'].forEach(key=>{
        q(`[data-${key}]`,panel).addEventListener('input',e=>{item[key]=e.target.value;setDirty(true)});
      });
      q('[data-featured]',panel).addEventListener('change',e=>{
        item.featured=e.target.checked;
        // Only one review sits beside the contact form.
        if(e.target.checked)items.forEach(other=>{if(other!==item)other.featured=false});
        setDirty(true);render();persist('Contact review updated.');
      });
      q('[data-published]',panel).addEventListener('change',e=>{
        item.published=e.target.checked;setDirty(true);render();persist('Visibility updated.');
      });
      q('.faq-admin-delete',panel).addEventListener('click',()=>{
        if(confirm('Delete this review?')){items.splice(index,1);expanded=null;setDirty(true);render();persist('Review deleted.')}
      });

      card.append(head,panel);
      return card;
    }));
  };

  const load=async()=>{
    if(loaded)return;
    loaded=true;
    status.textContent='Loading reviews…';
    try{
      const [rows,work]=await Promise.all([
        sb.select('settings','key=eq.reviews.items&select=value'),
        sb.select('work_items','published=eq.true&select=slug,title&order=position.asc').catch(()=>[])
      ]);
      projects=Array.isArray(work)?work:[];
      const stored=Array.isArray(rows?.[0]?.value)&&rows[0].value.length;
      items=stored?rows[0].value:(window.ABATCHAN_REVIEW_DEFAULTS||[]).map(x=>({...x}));
      status.textContent=stored?'':`${items.length} site defaults loaded. Save an edit to start managing them here.`;
      setSaveState(false);
      render();
    }catch(err){
      status.textContent=`Reviews could not load. ${err.message}`;
      status.classList.add('bad');
    }
  };

  add.addEventListener('click',()=>{
    const item={id:makeId(),quote:'',engagement:'',source:'',client:'',date:'',project:'',pages:'home',featured:false,published:true};
    items.push(item);expanded=item.id;setDirty(true);render();
    requestAnimationFrame(()=>q(`[data-review-id="${CSS.escape(item.id)}"] textarea`,list)?.focus());
  });
  save.addEventListener('click',()=>persist('Saved.'));
  tab.addEventListener('click',load);
  const wait=setInterval(()=>{if(!q('#app')?.classList.contains('adm-hide')){clearInterval(wait);load()}},300);
  addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
})();
