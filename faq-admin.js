// Compact accordion editor for the pricing-page FAQs stored in faq.items.
(function faqAdmin(){
  'use strict';

  const VERSION=3;
  if((window.__ABATCHAN_FAQ_ADMIN_VERSION__||0)>=VERSION)return;
  window.__ABATCHAN_FAQ_ADMIN_VERSION__=VERSION;

  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;

  const q=(selector,context=document)=>context.querySelector(selector);
  const tabs=q('#tabs');
  const main=q('.adm-main');
  if(!tabs||!main||!window.sb)return;

  let items=[];
  let loaded=false;
  let loadingPromise=null;
  let dirty=false;
  let saveTimer=null;
  let expandedId=null;
  let draggedId=null;
  let dropTarget=null;

  const makeId=()=>`faq-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const dragIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="7" r="1"/><circle cx="16" cy="7" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/></svg>';
  const trashIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>';
  const chevronIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';

  const style=document.createElement('style');
  style.dataset.faqAdminStyles=String(VERSION);
  style.textContent=`
    .faq-admin-shell{max-width:940px}
    .faq-admin-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:-10px 0 22px}
    .faq-admin-count{margin-right:auto;color:var(--muted);font-size:13px}
    .faq-admin-status{min-height:20px;margin:-8px 0 12px;color:var(--muted);font-size:12px}
    .faq-admin-status.bad{color:#ff8f85}
    .faq-admin-list{display:grid;gap:10px}
    .faq-admin-item{position:relative;border:1px solid var(--line);border-radius:18px;background:var(--panel);overflow:hidden;transition:border-color .22s,background .22s,opacity .22s,transform .22s var(--ease)}
    .faq-admin-item:hover{border-color:rgba(99,102,241,.38)}
    .faq-admin-item.is-open{border-color:rgba(99,102,241,.58);background:linear-gradient(145deg,rgba(99,102,241,.075),rgba(245,245,243,.018))}
    .faq-admin-item.is-draft{opacity:.72}
    .faq-admin-head{display:grid;grid-template-columns:minmax(0,1fr) 48px;align-items:stretch}
    .faq-admin-toggle{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:13px;align-items:center;width:100%;min-width:0;padding:15px 10px 15px 16px;border:0;background:transparent;color:var(--paper);text-align:left;cursor:pointer}
    .faq-admin-index{width:38px;height:38px;display:grid;place-items:center;border:1px solid var(--line);border-radius:11px;color:var(--signal);background:rgba(99,102,241,.07);font:600 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.05em}
    .faq-admin-copy{min-width:0}
    .faq-admin-title{display:block;overflow:hidden;color:var(--paper);font-size:15px;font-weight:600;letter-spacing:-.02em;text-overflow:ellipsis;white-space:nowrap}
    .faq-admin-meta{display:block;margin-top:3px;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.07em}
    .faq-admin-chevron{width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--line);border-radius:10px;color:var(--muted);transition:transform .25s var(--ease),color .2s,border-color .2s}
    .faq-admin-chevron svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .faq-admin-item.is-open .faq-admin-chevron{transform:rotate(180deg);color:var(--paper);border-color:rgba(99,102,241,.5)}
    .faq-admin-drag{width:48px;border:0;border-left:1px solid var(--line);background:transparent;color:var(--muted);cursor:grab;touch-action:none}
    .faq-admin-drag:active{cursor:grabbing}
    .faq-admin-drag:hover,.faq-admin-drag:focus-visible{color:var(--paper);background:rgba(99,102,241,.08);outline:0}
    .faq-admin-drag svg{width:22px;height:22px;fill:currentColor}
    .faq-admin-panel{padding:18px;border-top:1px solid var(--line)}
    .faq-admin-fields{display:grid;gap:14px}
    .faq-admin-field label{display:block;margin:0 0 7px;color:var(--muted);font-size:12px}
    .faq-admin-field input,.faq-admin-field textarea{width:100%;padding:13px 14px;border:1px solid var(--edge,var(--line));border-radius:13px;background:transparent;color:var(--paper);font:inherit;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s}
    .faq-admin-field textarea{min-height:120px;resize:vertical;line-height:1.65}
    .faq-admin-field input:focus,.faq-admin-field textarea:focus{border-color:var(--signal);box-shadow:0 0 0 3px rgba(99,102,241,.1)}
    .faq-admin-footer{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:16px}
    .faq-admin-delete{display:inline-flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid rgba(224,86,74,.34);border-radius:11px;background:transparent;color:#ff8f85;cursor:pointer}
    .faq-admin-delete:hover{border-color:#e0564a;background:rgba(224,86,74,.09)}
    .faq-admin-delete svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    .faq-admin-empty{padding:42px 22px;border:1px dashed var(--line);border-radius:18px;text-align:center;color:var(--muted)}
    .faq-admin-empty b{display:block;margin-bottom:5px;color:var(--paper);font-size:16px}
    .faq-admin-item.is-dragging{opacity:.35;transform:scale(.985)}
    .faq-admin-item.drop-before::before,.faq-admin-item.drop-after::after{content:"";position:absolute;z-index:5;left:12px;right:12px;height:3px;border-radius:999px;background:var(--signal);box-shadow:0 0 16px rgba(99,102,241,.55)}
    .faq-admin-item.drop-before::before{top:-2px}
    .faq-admin-item.drop-after::after{bottom:-2px}
    html[data-theme="light"] .faq-admin-item{background:rgba(21,21,25,.018)}
    html[data-theme="light"] .faq-admin-item.is-open{background:linear-gradient(145deg,rgba(99,102,241,.08),rgba(21,21,25,.012))}
    html[data-theme="light"] .faq-admin-toggle,html[data-theme="light"] .faq-admin-field input,html[data-theme="light"] .faq-admin-field textarea{color:#151519}
    @media(max-width:820px){.adm-nav{grid-template-columns:repeat(5,minmax(0,1fr))!important}.faq-admin-shell{padding-bottom:12px}}
    @media(max-width:560px){
      .faq-admin-head{grid-template-columns:minmax(0,1fr) 44px}
      .faq-admin-toggle{grid-template-columns:34px minmax(0,1fr) 30px;gap:10px;padding:13px 8px 13px 13px}
      .faq-admin-index{width:34px;height:34px}
      .faq-admin-chevron{width:30px;height:30px}
      .faq-admin-drag{width:44px}
      .faq-admin-panel{padding:15px}
      .faq-admin-footer{align-items:flex-start;flex-direction:column}
    }
  `;
  document.head.appendChild(style);

  let tab=q('[data-view="faqs"]',tabs);
  if(!tab){
    tab=document.createElement('button');
    tab.type='button';
    tab.dataset.view='faqs';
    tab.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v11H9l-4 3V5Z"/><path d="M9 9h6M9 12h4"/></svg>FAQs';
    tabs.append(tab);
  }

  q('#view-faqs')?.remove();
  const section=document.createElement('section');
  section.id='view-faqs';
  section.className='adm-hide faq-admin-shell';
  section.innerHTML=`
    <div class="adm-head">
      <h2>FAQs</h2>
      <button class="btn primary sm" id="saveFaqs" type="button">save <span class="arrow">↗</span></button>
    </div>
    <p class="adm-sub">Pricing-page questions. Open a row to edit it, then drag the handle on the right to change the order.</p>
    <div class="faq-admin-toolbar">
      <span class="faq-admin-count" id="faqAdminCount">0 FAQs</span>
      <button class="btn sm" id="addFaq" type="button">add FAQ <span class="arrow">↗</span></button>
    </div>
    <div class="faq-admin-status" id="faqAdminStatus" role="status" aria-live="polite"></div>
    <div class="faq-admin-list" id="faqAdminList"></div>`;
  main.append(section);

  const list=q('#faqAdminList');
  const count=q('#faqAdminCount');
  const status=q('#faqAdminStatus');
  const saveButton=q('#saveFaqs');
  const addButton=q('#addFaq');

  const setStatus=(message='',bad=false)=>{
    status.textContent=message;
    status.classList.toggle('bad',bad);
  };

  const setDirty=value=>{
    dirty=value;
    section.dataset.dirty=String(value);
    if(value)setStatus('Unsaved changes');
    else if(status.textContent==='Unsaved changes')setStatus('');
  };

  const setSaveState=(label,disabled)=>{
    saveButton.disabled=disabled;
    saveButton.innerHTML=`${label}${disabled?'':' <span class="arrow">↗</span>'}`;
  };

  const clearDropState=()=>{
    list.querySelectorAll('.is-dragging,.drop-before,.drop-after').forEach(node=>{
      node.classList.remove('is-dragging','drop-before','drop-after');
    });
    dropTarget=null;
  };

  const reorder=(movingId,targetId,after=false)=>{
    const from=items.findIndex(item=>item.id===movingId);
    if(from<0)return;
    const [moving]=items.splice(from,1);
    let to=items.findIndex(item=>item.id===targetId);
    if(to<0)to=items.length;
    else if(after)to+=1;
    items.splice(to,0,moving);
    setDirty(true);
    render();
  };

  const markDrop=(card,targetId,clientY)=>{
    if(!draggedId||draggedId===targetId)return;
    list.querySelectorAll('.drop-before,.drop-after').forEach(node=>node.classList.remove('drop-before','drop-after'));
    const rect=card.getBoundingClientRect();
    const after=clientY>rect.top+rect.height/2;
    card.classList.add(after?'drop-after':'drop-before');
    dropTarget={id:targetId,after};
  };

  const render=()=>{
    count.textContent=`${items.length} FAQ${items.length===1?'':'s'}`;

    if(!items.length){
      const empty=document.createElement('div');
      empty.className='faq-admin-empty';
      empty.innerHTML='<b>No FAQs yet</b>Add the first pricing question, then save.';
      list.replaceChildren(empty);
      return;
    }

    const cards=items.map((item,index)=>{
      item.id=item.id||makeId();
      const isOpen=expandedId===item.id;
      const card=document.createElement('article');
      card.className=`faq-admin-item${isOpen?' is-open':''}${item.published===false?' is-draft':''}`;
      card.dataset.faqId=item.id;

      const head=document.createElement('div');
      head.className='faq-admin-head';

      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='faq-admin-toggle';
      toggle.setAttribute('aria-expanded',String(isOpen));
      const panelId=`${item.id}-editor`;
      toggle.setAttribute('aria-controls',panelId);

      const number=document.createElement('span');
      number.className='faq-admin-index';
      number.textContent=String(index+1).padStart(2,'0');

      const copy=document.createElement('span');
      copy.className='faq-admin-copy';
      const title=document.createElement('span');
      title.className='faq-admin-title';
      title.textContent=item.question?.trim()||'Untitled FAQ';
      const meta=document.createElement('span');
      meta.className='faq-admin-meta';
      meta.textContent=item.published===false?'draft':'published';
      copy.append(title,meta);

      const chevron=document.createElement('span');
      chevron.className='faq-admin-chevron';
      chevron.setAttribute('aria-hidden','true');
      chevron.innerHTML=chevronIcon;
      toggle.append(number,copy,chevron);
      toggle.addEventListener('click',()=>{
        expandedId=isOpen?null:item.id;
        render();
        if(!isOpen)requestAnimationFrame(()=>list.querySelector(`[data-faq-id="${CSS.escape(item.id)}"] input`)?.focus());
      });

      const drag=document.createElement('button');
      drag.type='button';
      drag.className='faq-admin-drag';
      drag.draggable=true;
      drag.innerHTML=dragIcon;
      drag.setAttribute('aria-label',`Drag to reorder: ${item.question?.trim()||'Untitled FAQ'}`);
      drag.title='Drag to reorder';

      drag.addEventListener('dragstart',event=>{
        draggedId=item.id;
        dropTarget=null;
        event.dataTransfer.effectAllowed='move';
        event.dataTransfer.setData('text/plain',item.id);
        requestAnimationFrame(()=>card.classList.add('is-dragging'));
      });
      drag.addEventListener('dragend',()=>{
        draggedId=null;
        clearDropState();
      });
      drag.addEventListener('keydown',event=>{
        if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;
        event.preventDefault();
        const to=index+(event.key==='ArrowUp'?-1:1);
        if(to<0||to>=items.length)return;
        const targetId=items[to].id;
        reorder(item.id,targetId,event.key==='ArrowDown');
        requestAnimationFrame(()=>list.querySelector(`[data-faq-id="${CSS.escape(item.id)}"] .faq-admin-drag`)?.focus());
      });

      let touchMoved=false;
      drag.addEventListener('pointerdown',event=>{
        if(event.pointerType==='mouse')return;
        draggedId=item.id;
        touchMoved=false;
        drag.setPointerCapture?.(event.pointerId);
        card.classList.add('is-dragging');
      });
      drag.addEventListener('pointermove',event=>{
        if(event.pointerType==='mouse'||draggedId!==item.id)return;
        touchMoved=true;
        event.preventDefault();
        const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.faq-admin-item');
        if(target)markDrop(target,target.dataset.faqId,event.clientY);
      });
      const finishTouch=event=>{
        if(event.pointerType==='mouse'||draggedId!==item.id)return;
        if(touchMoved&&dropTarget)reorder(item.id,dropTarget.id,dropTarget.after);
        draggedId=null;
        clearDropState();
      };
      drag.addEventListener('pointerup',finishTouch);
      drag.addEventListener('pointercancel',finishTouch);

      head.append(toggle,drag);

      const panel=document.createElement('div');
      panel.id=panelId;
      panel.className='faq-admin-panel';
      panel.hidden=!isOpen;

      if(isOpen){
        const fields=document.createElement('div');
        fields.className='faq-admin-fields';

        const questionField=document.createElement('div');
        questionField.className='faq-admin-field';
        questionField.innerHTML='<label>FAQ title</label>';
        const question=document.createElement('input');
        question.type='text';
        question.value=item.question||'';
        question.placeholder='What would a client ask?';
        question.addEventListener('input',()=>{
          item.question=question.value;
          title.textContent=question.value.trim()||'Untitled FAQ';
          drag.setAttribute('aria-label',`Drag to reorder: ${title.textContent}`);
          setDirty(true);
        });
        questionField.append(question);

        const answerField=document.createElement('div');
        answerField.className='faq-admin-field';
        answerField.innerHTML='<label>Answer</label>';
        const answer=document.createElement('textarea');
        answer.value=item.answer||'';
        answer.placeholder='Write a clear and useful answer.';
        answer.addEventListener('input',()=>{
          item.answer=answer.value;
          setDirty(true);
        });
        answerField.append(answer);
        fields.append(questionField,answerField);

        const footer=document.createElement('div');
        footer.className='faq-admin-footer';

        const publishLabel=document.createElement('label');
        publishLabel.className='adm-switch';
        const published=document.createElement('input');
        published.type='checkbox';
        published.checked=item.published!==false;
        const track=document.createElement('span');
        track.className='adm-switch-track';
        track.setAttribute('aria-hidden','true');
        const publishText=document.createElement('span');
        publishText.textContent='published';
        published.addEventListener('change',()=>{
          item.published=published.checked;
          card.classList.toggle('is-draft',!published.checked);
          meta.textContent=published.checked?'published':'draft';
          setDirty(true);
        });
        publishLabel.append(published,track,publishText);

        const remove=document.createElement('button');
        remove.type='button';
        remove.className='faq-admin-delete';
        remove.innerHTML=`${trashIcon}<span>delete FAQ</span>`;
        remove.addEventListener('click',()=>{
          if(!confirm(`Delete “${item.question?.trim()||'this FAQ'}”?`))return;
          items.splice(index,1);
          if(expandedId===item.id)expandedId=null;
          setDirty(true);
          render();
        });

        footer.append(publishLabel,remove);
        panel.append(fields,footer);
      }

      card.addEventListener('dragover',event=>{
        if(!draggedId||draggedId===item.id)return;
        event.preventDefault();
        event.dataTransfer.dropEffect='move';
        markDrop(card,item.id,event.clientY);
      });
      card.addEventListener('drop',event=>{
        if(!draggedId||draggedId===item.id)return;
        event.preventDefault();
        const target=dropTarget||{id:item.id,after:false};
        const moving=draggedId;
        draggedId=null;
        clearDropState();
        reorder(moving,target.id,target.after);
      });

      card.append(head,panel);
      return card;
    });

    list.replaceChildren(...cards);
  };

  const waitForDefaults=async()=>{
    for(let attempt=0;attempt<20&&!Array.isArray(window.ABATCHAN_FAQ_DEFAULTS);attempt++){
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    return Array.isArray(window.ABATCHAN_FAQ_DEFAULTS)?window.ABATCHAN_FAQ_DEFAULTS:[];
  };

  const load=()=>{
    if(loaded)return Promise.resolve();
    if(loadingPromise)return loadingPromise;
    setStatus('Loading FAQs…');

    loadingPromise=(async()=>{
      try{
        const rows=await sb.select('settings','key=eq.faq.items&select=value');
        const defaults=await waitForDefaults();
        const source=Array.isArray(rows?.[0]?.value)?rows[0].value:defaults;
        items=clone(source).map(item=>({...item,id:item.id||makeId(),page:'/pricing'}));
        loaded=true;
        setDirty(false);
        setStatus('');
        render();
      }catch(error){
        setStatus(`FAQs could not be loaded. ${error.message}`,true);
      }finally{
        loadingPromise=null;
      }
    })();

    return loadingPromise;
  };

  addButton.addEventListener('click',async()=>{
    await load();
    const item={id:makeId(),page:'/pricing',question:'',answer:'',published:true};
    items.push(item);
    expandedId=item.id;
    setDirty(true);
    render();
    const card=list.lastElementChild;
    card?.scrollIntoView({behavior:'smooth',block:'center'});
    requestAnimationFrame(()=>card?.querySelector('input')?.focus({preventScroll:true}));
  });

  saveButton.addEventListener('click',async()=>{
    await load();
    const invalid=items.find(item=>!String(item.question||'').trim()||!String(item.answer||'').trim());
    if(invalid){
      expandedId=invalid.id;
      render();
      setStatus('Every FAQ needs both a title and an answer.',true);
      const card=list.querySelector(`[data-faq-id="${CSS.escape(invalid.id)}"]`);
      card?.scrollIntoView({behavior:'smooth',block:'center'});
      requestAnimationFrame(()=>card?.querySelector(!String(invalid.question||'').trim()?'input':'textarea')?.focus());
      return;
    }

    clearTimeout(saveTimer);
    setSaveState('saving…',true);
    setStatus('Saving changes…');

    try{
      items=items.map((item,position)=>({
        id:item.id||makeId(),
        page:'/pricing',
        question:String(item.question).trim(),
        answer:String(item.answer).trim(),
        published:item.published!==false,
        position
      }));
      await sb.upsert('settings',[{key:'faq.items',value:items,is_public:true}]);
      setDirty(false);
      setStatus('All FAQ changes are live.');
      setSaveState('saved ✓',true);
      saveTimer=setTimeout(()=>setSaveState('save',false),1200);
      render();
    }catch(error){
      setStatus(`Save failed. ${error.message}`,true);
      setSaveState('save',false);
    }
  });

  tab.addEventListener('click',load);

  tabs.addEventListener('click',event=>{
    const next=event.target.closest('[data-view]');
    if(!next||next.dataset.view==='faqs'||section.classList.contains('adm-hide')||!dirty)return;
    if(confirm('Discard unsaved FAQ changes?')){
      dirty=false;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

  addEventListener('beforeunload',event=>{
    if(!dirty)return;
    event.preventDefault();
    event.returnValue='';
  });

  const app=q('#app');
  if(app&&!app.classList.contains('adm-hide'))load();
  else{
    const observer=new MutationObserver(()=>{
      if(app?.classList.contains('adm-hide'))return;
      observer.disconnect();
      load();
    });
    if(app)observer.observe(app,{attributes:true,attributeFilter:['class']});
  }
})();
