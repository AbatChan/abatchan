// Compact pricing FAQ editor stored in faq.items.
(function faqAdmin(){
  'use strict';
  const VERSION=8;
  if((window.__ABATCHAN_FAQ_ADMIN_VERSION__||0)>=VERSION)return;
  window.__ABATCHAN_FAQ_ADMIN_VERSION__=VERSION;
  if(!/\/admin(?:\.html)?$/.test(location.pathname)||!window.sb)return;

  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
  const tabs=q('#tabs'),main=q('.adm-main');if(!tabs||!main)return;
  let items=[],loaded=false,dirty=false,expanded=null,dragged=null,target=null,revision=0,saveQueue=Promise.resolve();
  const makeId=()=>`faq-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const dragIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="7" r="1"/><circle cx="16" cy="7" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/></svg>';
  const chevron='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
  const trash='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>';
  const upIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5"/></svg>';
  const downIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';

  let tab=q('[data-view="faqs"]',tabs);if(!tab){tab=document.createElement('button');tab.type='button';tab.dataset.view='faqs';tab.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 5h14v11H9l-4 3V5Z"/><path d="M9 9h6M9 12h4"/></svg>FAQs';tabs.append(tab)}
  q('#view-faqs')?.remove();const section=document.createElement('section');section.id='view-faqs';section.className='adm-hide faq-admin-shell';section.innerHTML=`<div class="adm-head"><h2>FAQs</h2><button class="btn primary sm" id="saveFaqs" type="button">save <span class="arrow">↗</span></button></div><p class="adm-sub">Pricing-page questions. Drag on desktop, or use the up and down buttons on any screen.</p><div class="faq-admin-toolbar"><span class="faq-admin-count" id="faqAdminCount">0 FAQs</span><button class="btn sm" id="addFaq" type="button">add FAQ <span class="arrow">↗</span></button></div><div class="faq-admin-status" id="faqAdminStatus"></div><div class="faq-admin-list" id="faqAdminList"></div>`;main.append(section);
  if(new URLSearchParams(location.search).get('view')==='faqs')queueMicrotask(()=>window.__adminShowView?.('faqs',{routeMode:'replace'}));
  const list=q('#faqAdminList'),count=q('#faqAdminCount'),status=q('#faqAdminStatus'),save=q('#saveFaqs'),add=q('#addFaq');
  const setSaveState=changed=>{
    save.dataset.clean=String(!changed);
    save.disabled=!changed;
    save.innerHTML=changed?'save <span class="arrow">↗</span>':'saved <span aria-hidden="true">✓</span>';
  };
  const setDirty=value=>{dirty=value;if(value)revision++;status.textContent=value?'Unsaved changes':'';setSaveState(value)};
  const normalizeItems=()=>items.map((item,position)=>({...item,page:'/pricing',position,question:item.question.trim(),answer:item.answer.trim()}));
  const persist=(message='Saved')=>{
    saveQueue=saveQueue.then(async()=>{
      const invalid=items.find(item=>!item.question?.trim()||!item.answer?.trim());
      if(invalid){
        expanded=invalid.id;render();status.textContent='Every FAQ needs a question and answer.';status.classList.add('bad');setDirty(true);return false;
      }
      save.disabled=true;save.textContent='saving…';status.classList.remove('bad');status.textContent='Saving…';
      try{
        const savingRevision=revision;
        items=normalizeItems();
        await sb.upsert('settings',[{key:'faq.items',value:items,is_public:true}]);
        dirty=revision!==savingRevision;status.textContent=dirty?'Unsaved changes':message;setSaveState(dirty);
        setTimeout(()=>{if(!dirty&&status.textContent===message)status.textContent=''},1800);
        return true;
      }catch(err){
        dirty=true;status.textContent=`Save failed. ${err.message}`;status.classList.add('bad');setSaveState(true);return false;
      }
    });
    return saveQueue;
  };
  const clearDrop=()=>{qa('.is-dragging,.drop-before,.drop-after',list).forEach(node=>node.classList.remove('is-dragging','drop-before','drop-after'));target=null};
  const reorder=()=>{if(!dragged||!target||dragged===target.id)return clearDrop();const from=items.findIndex(x=>x.id===dragged);if(from<0)return clearDrop();const [moving]=items.splice(from,1);let to=items.findIndex(x=>x.id===target.id);if(to<0)to=items.length;else if(target.after)to++;items.splice(to,0,moving);clearDrop();setDirty(true);render();persist('Order saved.')};
  const move=(index,delta)=>{const next=index+delta;if(!items[index]||!items[next])return;[items[index],items[next]]=[items[next],items[index]];expanded=items[next].id;setDirty(true);render();persist('Order saved.')};

  // Degrade to an unfiltered list rather than taking the editor down with it
  // if the shared module is missing.
  const tools=(window.admListTools||(()=>({element:document.createComment('no list tools'),
    filtering:false,matches:()=>true,sync:()=>false,
    countLabel:(s,t,n)=>`${t} ${n}${t===1?'':'s'}`})))({
    label:'FAQs',
    text:item=>[item.question,item.answer].filter(Boolean).join(' '),
    isDraft:item=>item.published===false,
    onChange:()=>render()
  });
  q('.faq-admin-toolbar',section).before(tools.element);
  const render=()=>{
    tools.sync(items.length);
    const filtering=tools.filtering;
    // Keep the true index so ordering acts on the collection, not the view.
    const view=items.map((item,index)=>({item,index})).filter(({item})=>tools.matches(item));
    count.textContent=tools.countLabel(view.length,items.length,'FAQ');
    if(!items.length){list.innerHTML='<div class="faq-admin-empty">No FAQs yet. Add your first pricing question.</div>';return}
    if(!view.length){list.innerHTML='<div class="faq-admin-empty">Nothing matches that filter.</div>';return}
    list.replaceChildren(...view.map(({item,index})=>{
    item.id=item.id||makeId();item.page='/pricing';const open=expanded===item.id;const card=document.createElement('article');card.className=`faq-admin-item${open?' is-open':''}${item.published===false?' is-draft':''}`;card.dataset.faqId=item.id;
    const head=document.createElement('div');head.className='faq-admin-head';const toggle=document.createElement('button');toggle.type='button';toggle.className='faq-admin-toggle';toggle.setAttribute('aria-expanded',String(open));toggle.innerHTML=`<span class="faq-admin-index">${String(index+1).padStart(2,'0')}</span><span class="faq-admin-copy"><span class="faq-admin-title"></span><span class="faq-admin-meta">${item.published===false?'draft':'published'}</span></span><span class="faq-admin-chevron">${chevron}</span>`;q('.faq-admin-title',toggle).textContent=item.question?.trim()||'Untitled FAQ';toggle.addEventListener('click',()=>{
    const opening=expanded!==item.id;
    // Toggle in place rather than re-rendering, so both directions animate
    // and the row keeps its scroll position.
    qa('.faq-admin-item.is-open',list).forEach(other=>{
      if(other===card)return;
      other.classList.remove('is-open');
      q('.faq-admin-toggle',other)?.setAttribute('aria-expanded','false');
      window.admToggleHeight?.(q(':scope>.faq-admin-panel',other),false);
    });
    expanded=opening?item.id:null;
    card.classList.toggle('is-open',opening);
    toggle.setAttribute('aria-expanded',String(opening));
    const own=q(':scope>.faq-admin-panel',card);
    if(window.admToggleHeight)window.admToggleHeight(own,opening);
    else if(own)own.hidden=!opening;
    });
    const rowOrder=document.createElement('div');rowOrder.className='faq-admin-row-order';const rowUp=document.createElement('button');rowUp.type='button';rowUp.className='faq-admin-move';rowUp.disabled=index===0||filtering;rowUp.setAttribute('aria-label',`Move ${item.question||'FAQ'} up`);rowUp.innerHTML=upIcon;rowUp.addEventListener('click',()=>move(index,-1));const rowDown=document.createElement('button');rowDown.type='button';rowDown.className='faq-admin-move';rowDown.disabled=index===items.length-1||filtering;rowDown.setAttribute('aria-label',`Move ${item.question||'FAQ'} down`);rowDown.innerHTML=downIcon;rowDown.addEventListener('click',()=>move(index,1));rowOrder.append(rowUp,rowDown);
    const drag=document.createElement('button');drag.type='button';drag.className='faq-admin-drag';drag.draggable=true;drag.innerHTML=dragIcon;drag.setAttribute('aria-label','Drag to reorder');if(filtering){drag.draggable=false;drag.disabled=true;drag.title='Clear the filter to reorder'}drag.addEventListener('dragstart',e=>{if(filtering){e.preventDefault();status.textContent='Clear the filter to reorder.';return}dragged=item.id;card.classList.add('is-dragging');e.dataTransfer.effectAllowed='move'});drag.addEventListener('dragend',()=>{dragged=null;clearDrop()});head.append(toggle,rowOrder,drag);
    card.addEventListener('dragover',e=>{e.preventDefault();if(!dragged||dragged===item.id)return;qa('.drop-before,.drop-after',list).forEach(n=>n.classList.remove('drop-before','drop-after'));const rect=card.getBoundingClientRect();const after=e.clientY>rect.top+rect.height/2;card.classList.add(after?'drop-after':'drop-before');target={id:item.id,after}});card.addEventListener('drop',e=>{e.preventDefault();reorder()});
    const panel=document.createElement('div');panel.className='faq-admin-panel';panel.hidden=!open;panel.innerHTML=`<div class="faq-admin-fields"><div class="faq-admin-field"><label>question</label><input data-question></div><div class="faq-admin-field"><label>answer</label><textarea data-answer></textarea></div></div><div class="faq-admin-footer"><div class="faq-admin-order"><button class="faq-admin-move" data-up type="button" aria-label="Move FAQ up">${upIcon}</button><button class="faq-admin-move" data-down type="button" aria-label="Move FAQ down">${downIcon}</button></div><button class="faq-admin-delete" type="button">${trash}<span>Delete FAQ</span></button><label class="adm-switch"><input data-published type="checkbox"><span class="adm-switch-track" aria-hidden="true"></span><span>published</span></label></div>`;q('[data-up]',panel).disabled=index===0||filtering;q('[data-down]',panel).disabled=index===items.length-1||filtering;q('[data-up]',panel).addEventListener('click',()=>move(index,-1));q('[data-down]',panel).addEventListener('click',()=>move(index,1));q('[data-question]',panel).value=item.question||'';q('[data-answer]',panel).value=item.answer||'';q('[data-published]',panel).checked=item.published!==false;q('[data-question]',panel).addEventListener('input',e=>{item.question=e.target.value;q('.faq-admin-title',toggle).textContent=e.target.value.trim()||'Untitled FAQ';setDirty(true)});q('[data-answer]',panel).addEventListener('input',e=>{item.answer=e.target.value;setDirty(true)});q('[data-published]',panel).addEventListener('change',e=>{item.published=e.target.checked;setDirty(true);render();persist('Visibility updated.')});q('.faq-admin-delete',panel).addEventListener('click',()=>{if(confirm('Delete this FAQ?')){items.splice(index,1);expanded=null;setDirty(true);render();persist('FAQ deleted.')}});card.append(head,panel);return card
  }))};

  const load=async()=>{if(loaded)return;loaded=true;status.textContent='Loading FAQs…';try{const rows=await sb.select('settings','key=eq.faq.items&select=value');const stored=Array.isArray(rows?.[0]?.value);items=(stored?rows[0].value:(window.ABATCHAN_FAQ_DEFAULTS||[])).map(x=>({...x,page:'/pricing'}));status.textContent=stored?'':`${items.length} site defaults loaded. Reorder or save an edit to start managing them here.`;setSaveState(false);render()}catch(err){status.textContent=`FAQs could not load. ${err.message}`;status.classList.add('bad')}};
  add.addEventListener('click',()=>{const item={id:makeId(),page:'/pricing',question:'',answer:'',published:true};items.push(item);expanded=item.id;setDirty(true);render();requestAnimationFrame(()=>q(`[data-faq-id="${CSS.escape(item.id)}"] input`,list)?.focus())});
  save.addEventListener('click',()=>persist('Saved.'));
  tab.addEventListener('click',load);const wait=setInterval(()=>{if(!q('#app')?.classList.contains('adm-hide')){clearInterval(wait);load()}},300);addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
})();
