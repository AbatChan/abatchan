// Polished Admin CRUD for the shared faq.items setting.
(function faqAdmin(){
  'use strict';
  if(!/\/admin(?:\.html)?$/.test(location.pathname)||window.__ABATCHAN_FAQ_ADMIN__)return;
  window.__ABATCHAN_FAQ_ADMIN__=true;

  const q=(selector,context=document)=>context.querySelector(selector);
  const tabs=q('#tabs');
  const main=q('.adm-main');
  if(!tabs||!main||!window.sb)return;

  let items=[];
  let loaded=false;
  let loadingPromise=null;
  let dirty=false;
  let saveTimer=null;

  const makeId=()=>`faq-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const pageLabel=page=>({"/pricing":"pricing","/":"home","/contact":"contact","/work":"work"}[page]||page||'pricing');
  const icons={
    up:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>',
    down:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg>',
    trash:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>'
  };

  const style=document.createElement('style');
  style.dataset.faqAdminStyles='2';
  style.textContent=`
    .faq-admin-shell{max-width:940px}
    .faq-admin-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:-10px 0 22px}
    .faq-admin-count{margin-right:auto;color:var(--muted);font-size:13px}
    .faq-admin-list{display:grid;gap:14px}
    .faq-admin-card{position:relative;display:grid;gap:16px;padding:20px;border:1px solid var(--line);border-radius:22px;background:var(--panel);background:linear-gradient(145deg,rgba(245,245,243,.045),rgba(245,245,243,.015));transition:border-color .22s,opacity .22s,transform .22s var(--ease)}
    .faq-admin-card:focus-within{border-color:rgba(99,102,241,.62)}
    .faq-admin-card.is-draft{opacity:.72}
    .faq-admin-card.is-draft::after{content:"draft";position:absolute;right:18px;top:-8px;padding:4px 8px;border:1px solid rgba(224,162,74,.42);border-radius:999px;background:var(--ink);color:#e0a24a;font-size:10px;letter-spacing:.08em;text-transform:uppercase}
    .faq-admin-top{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:14px;align-items:center}
    .faq-admin-number{width:46px;height:46px;display:grid;place-items:center;border:1px solid var(--line);border-radius:14px;color:var(--signal);font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.05em;background:rgba(99,102,241,.07)}
    .faq-admin-heading{min-width:0}
    .faq-admin-heading h3{overflow:hidden;margin:0 0 4px;font-size:17px;letter-spacing:-.025em;text-overflow:ellipsis;white-space:nowrap}
    .faq-admin-meta{display:flex;gap:8px;align-items:center;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.07em}
    .faq-admin-meta i{width:3px;height:3px;border-radius:50%;background:currentColor}
    .faq-admin-actions{display:flex;gap:6px}
    .faq-admin-actions .adm-icon{width:40px;height:40px}
    .faq-admin-fields{display:grid;gap:14px;padding-top:2px}
    .faq-admin-field label{display:block;margin:0 0 7px;color:var(--muted);font-size:12px}
    .faq-admin-field input,.faq-admin-field textarea,.faq-admin-field select{width:100%;padding:13px 14px;border:1px solid var(--edge,var(--line));border-radius:13px;background:transparent;color:var(--paper);font:inherit;font-size:14px;outline:none;transition:border-color .2s,box-shadow .2s}
    .faq-admin-field textarea{min-height:120px;resize:vertical;line-height:1.65}
    .faq-admin-field select{appearance:none;cursor:pointer}
    .faq-admin-field input:focus,.faq-admin-field textarea:focus,.faq-admin-field select:focus{border-color:var(--signal);box-shadow:0 0 0 3px rgba(99,102,241,.1)}
    .faq-admin-bottom{display:grid;grid-template-columns:minmax(180px,260px) 1fr;gap:16px;align-items:end}
    .faq-admin-publish{display:flex;justify-content:flex-end;padding-bottom:1px}
    .faq-admin-empty{padding:48px 24px;border:1px dashed var(--line);border-radius:22px;text-align:center;color:var(--muted)}
    .faq-admin-empty b{display:block;margin-bottom:5px;color:var(--paper);font-size:17px}
    .faq-admin-status{min-height:20px;color:var(--muted);font-size:12px}
    .faq-admin-status.bad{color:#ff8f85}
    html[data-theme="light"] .faq-admin-card{background:linear-gradient(145deg,rgba(21,21,25,.03),rgba(21,21,25,.01))}
    html[data-theme="light"] .faq-admin-card.is-draft::after{background:var(--ink)}
    html[data-theme="light"] .faq-admin-field input,html[data-theme="light"] .faq-admin-field textarea,html[data-theme="light"] .faq-admin-field select{color:#151519}
    @media(max-width:820px){.adm-nav{grid-template-columns:repeat(5,minmax(0,1fr))!important}.faq-admin-shell{padding-bottom:12px}}
    @media(max-width:650px){
      .faq-admin-card{padding:16px;border-radius:18px}
      .faq-admin-top{grid-template-columns:38px minmax(0,1fr)}
      .faq-admin-number{width:38px;height:38px;border-radius:12px}
      .faq-admin-actions{grid-column:1/-1;justify-content:flex-end;padding-top:2px}
      .faq-admin-bottom{grid-template-columns:1fr}
      .faq-admin-publish{justify-content:flex-start}
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

  let section=q('#view-faqs');
  if(!section){
    section=document.createElement('section');
    section.id='view-faqs';
    section.className='adm-hide faq-admin-shell';
    section.innerHTML=`
      <div class="adm-head">
        <h2>FAQs</h2>
        <button class="btn primary sm" id="saveFaqs" type="button">save <span class="arrow">↗</span></button>
      </div>
      <p class="adm-sub">Manage the questions shown across the public site. Changes stay local here until you press save.</p>
      <div class="faq-admin-toolbar">
        <span class="faq-admin-count" id="faqAdminCount">0 FAQs</span>
        <button class="btn sm" id="addFaq" type="button">add FAQ <span class="arrow">↗</span></button>
      </div>
      <div class="faq-admin-status" id="faqAdminStatus" role="status" aria-live="polite"></div>
      <div class="faq-admin-list" id="faqAdminList"></div>`;
    main.append(section);
  }

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

  const iconButton=(label,icon,handler,{disabled=false,danger=false}={})=>{
    const button=document.createElement('button');
    button.type='button';
    button.className=`adm-icon${danger?' danger':''}`;
    button.setAttribute('aria-label',label);
    button.innerHTML=icon;
    button.disabled=disabled;
    button.addEventListener('click',handler);
    return button;
  };

  const move=(from,to)=>{
    if(to<0||to>=items.length)return;
    [items[from],items[to]]=[items[to],items[from]];
    setDirty(true);
    render();
    list.children[to]?.scrollIntoView({behavior:'smooth',block:'nearest'});
  };

  const render=()=>{
    count.textContent=`${items.length} FAQ${items.length===1?'':'s'}`;
    if(!items.length){
      const empty=document.createElement('div');
      empty.className='faq-admin-empty';
      empty.innerHTML='<b>No FAQs yet</b>Add the first question, choose its page, then save.';
      list.replaceChildren(empty);
      return;
    }

    const cards=items.map((item,index)=>{
      const card=document.createElement('article');
      card.className=`faq-admin-card${item.published===false?' is-draft':''}`;

      const top=document.createElement('div');
      top.className='faq-admin-top';
      const number=document.createElement('span');
      number.className='faq-admin-number';
      number.textContent=String(index+1).padStart(2,'0');
      const heading=document.createElement('div');
      heading.className='faq-admin-heading';
      const title=document.createElement('h3');
      title.textContent=item.question?.trim()||'Untitled FAQ';
      const meta=document.createElement('div');
      meta.className='faq-admin-meta';
      meta.innerHTML=`<span>${pageLabel(item.page)}</span><i></i><span>${item.published===false?'draft':'published'}</span>`;
      heading.append(title,meta);
      const actions=document.createElement('div');
      actions.className='faq-admin-actions';
      actions.append(
        iconButton('Move FAQ up',icons.up,()=>move(index,index-1),{disabled:index===0}),
        iconButton('Move FAQ down',icons.down,()=>move(index,index+1),{disabled:index===items.length-1}),
        iconButton('Delete FAQ',icons.trash,()=>{
          if(!confirm(`Delete “${item.question?.trim()||'this FAQ'}”?`))return;
          items.splice(index,1);
          setDirty(true);
          render();
        },{danger:true})
      );
      top.append(number,heading,actions);

      const fields=document.createElement('div');
      fields.className='faq-admin-fields';
      const questionField=document.createElement('div');
      questionField.className='faq-admin-field';
      questionField.innerHTML='<label>question</label>';
      const question=document.createElement('input');
      question.type='text';
      question.value=item.question||'';
      question.placeholder='What would a client ask?';
      question.addEventListener('input',()=>{
        item.question=question.value;
        title.textContent=question.value.trim()||'Untitled FAQ';
        setDirty(true);
      });
      questionField.append(question);

      const answerField=document.createElement('div');
      answerField.className='faq-admin-field';
      answerField.innerHTML='<label>answer</label>';
      const answer=document.createElement('textarea');
      answer.value=item.answer||'';
      answer.placeholder='Give a clear, useful answer.';
      answer.addEventListener('input',()=>{item.answer=answer.value;setDirty(true)});
      answerField.append(answer);
      fields.append(questionField,answerField);

      const bottom=document.createElement('div');
      bottom.className='faq-admin-bottom';
      const pageField=document.createElement('div');
      pageField.className='faq-admin-field';
      pageField.innerHTML='<label>show on page</label>';
      const select=document.createElement('select');
      [['/pricing','pricing'],['/','home'],['/contact','contact'],['/work','work']].forEach(([value,label])=>{
        const option=document.createElement('option');
        option.value=value;option.textContent=label;option.selected=item.page===value;
        select.append(option);
      });
      select.addEventListener('change',()=>{
        item.page=select.value;
        meta.firstElementChild.textContent=pageLabel(item.page);
        setDirty(true);
      });
      pageField.append(select);

      const publish=document.createElement('div');
      publish.className='faq-admin-publish';
      const publishLabel=document.createElement('label');
      publishLabel.className='adm-switch';
      const checkbox=document.createElement('input');
      checkbox.type='checkbox';
      checkbox.checked=item.published!==false;
      const track=document.createElement('span');
      track.className='adm-switch-track';track.setAttribute('aria-hidden','true');
      const text=document.createElement('span');text.textContent='published';
      checkbox.addEventListener('change',()=>{
        item.published=checkbox.checked;
        setDirty(true);
        render();
      });
      publishLabel.append(checkbox,track,text);
      publish.append(publishLabel);
      bottom.append(pageField,publish);

      card.append(top,fields,bottom);
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
        items=Array.isArray(rows?.[0]?.value)?clone(rows[0].value):clone(defaults);
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
    items.push({id:makeId(),page:'/pricing',question:'',answer:'',published:true});
    setDirty(true);
    render();
    const card=list.lastElementChild;
    card?.scrollIntoView({behavior:'smooth',block:'center'});
    card?.querySelector('input')?.focus({preventScroll:true});
  });

  saveButton.addEventListener('click',async()=>{
    await load();
    const invalid=items.find(item=>!String(item.question||'').trim()||!String(item.answer||'').trim());
    if(invalid){
      setStatus('Every FAQ needs both a question and an answer.',true);
      const index=items.indexOf(invalid);
      list.children[index]?.scrollIntoView({behavior:'smooth',block:'center'});
      list.children[index]?.querySelector(!String(invalid.question||'').trim()?'input':'textarea')?.focus();
      return;
    }

    clearTimeout(saveTimer);
    setSaveState('saving…',true);
    setStatus('Saving changes…');
    try{
      items=items.map((item,position)=>({
        id:item.id||makeId(),
        page:item.page||'/pricing',
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
