// Compact collapsible and draggable presentation for the existing Work manager.
(function adminWorkList(){
  'use strict';

  const VERSION=1;
  if((window.__ABATCHAN_WORK_LIST_VERSION__||0)>=VERSION)return;
  window.__ABATCHAN_WORK_LIST_VERSION__=VERSION;

  if(!/\/admin(?:\.html)?$/.test(location.pathname)||!window.sb)return;

  const q=(selector,context=document)=>context.querySelector(selector);
  const qa=(selector,context=document)=>[...context.querySelectorAll(selector)];
  const list=q('#items');
  if(!list)return;

  let records=[];
  let recordsPromise=null;
  let draggedId=null;
  let dropTarget=null;
  let processing=false;

  const dragIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="7" r="1"/><circle cx="16" cy="7" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/></svg>';
  const chevronIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';

  const style=document.createElement('style');
  style.dataset.adminWorkList=String(VERSION);
  style.textContent=`
    #items.adm-items{display:grid;gap:10px}
    #items>.adm-item.work-compact-item{position:relative;display:block;padding:0;border:1px solid var(--line);border-radius:18px;background:var(--panel);overflow:hidden;transition:border-color .22s,background .22s,opacity .22s,transform .22s var(--ease)}
    #items>.work-compact-item:hover{border-color:rgba(99,102,241,.38)}
    #items>.work-compact-item.is-open{border-color:rgba(99,102,241,.58);background:linear-gradient(145deg,rgba(99,102,241,.075),rgba(245,245,243,.018))}
    .work-compact-head{display:grid;grid-template-columns:minmax(0,1fr) 50px;align-items:stretch}
    .work-compact-toggle{display:grid;grid-template-columns:112px minmax(0,1fr) 36px;gap:16px;align-items:center;width:100%;min-width:0;padding:12px 10px 12px 12px;border:0;background:transparent;color:var(--paper);text-align:left;cursor:pointer}
    .work-compact-toggle .adm-thumb{width:112px;aspect-ratio:16/10}
    .work-compact-toggle .work-compact-copy{min-width:0}
    .work-compact-toggle h3{margin:0 0 4px;font-size:17px;letter-spacing:-.02em}
    .work-compact-toggle p{display:-webkit-box;overflow:hidden;margin:0;color:var(--muted);font-size:13px;-webkit-box-orient:vertical;-webkit-line-clamp:2}
    .work-compact-toggle .adm-tags{margin-top:8px}
    .work-compact-chevron{width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--line);border-radius:10px;color:var(--muted);transition:transform .25s var(--ease),color .2s,border-color .2s}
    .work-compact-chevron svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .work-compact-item.is-open .work-compact-chevron{transform:rotate(180deg);color:var(--paper);border-color:rgba(99,102,241,.5)}
    .work-compact-drag{width:50px;border:0;border-left:1px solid var(--line);background:transparent;color:var(--muted);cursor:grab;touch-action:none}
    .work-compact-drag:active{cursor:grabbing}
    .work-compact-drag:hover,.work-compact-drag:focus-visible{color:var(--paper);background:rgba(99,102,241,.08);outline:0}
    .work-compact-drag svg{width:22px;height:22px;fill:currentColor}
    .work-compact-panel{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:14px 16px;border-top:1px solid var(--line)}
    .work-compact-panel[hidden]{display:none}
    .work-compact-panel::before{content:"Edit project details, media, publishing and visibility.";margin-right:auto;color:var(--muted);font-size:12px}
    .work-compact-panel .adm-row-actions{display:flex;gap:8px}
    .work-compact-panel .adm-icon{width:auto;min-width:44px;padding:0 13px;gap:8px}
    .work-compact-panel .adm-icon::after{font-size:12px}
    .work-compact-panel .adm-icon[data-work-up]::after{content:"up"}
    .work-compact-panel .adm-icon[data-work-down]::after{content:"down"}
    .work-compact-panel .adm-icon[data-work-edit]::after{content:"edit"}
    .work-compact-panel .adm-icon[data-work-delete]::after{content:"delete"}
    .work-compact-item.is-dragging{opacity:.35;transform:scale(.985)}
    .work-compact-item.drop-before::before,.work-compact-item.drop-after::after{content:"";position:absolute;z-index:5;left:12px;right:12px;height:3px;border-radius:999px;background:var(--signal);box-shadow:0 0 16px rgba(99,102,241,.55)}
    .work-compact-item.drop-before::before{top:-2px}
    .work-compact-item.drop-after::after{bottom:-2px}
    html[data-theme="light"] #items>.work-compact-item{background:rgba(21,21,25,.018)}
    html[data-theme="light"] #items>.work-compact-item.is-open{background:linear-gradient(145deg,rgba(99,102,241,.08),rgba(21,21,25,.012))}
    html[data-theme="light"] .work-compact-toggle{color:#151519}
    @media(max-width:720px){
      .work-compact-toggle{grid-template-columns:82px minmax(0,1fr) 32px;gap:11px;padding:10px 8px 10px 10px}
      .work-compact-toggle .adm-thumb{width:82px}
      .work-compact-head{grid-template-columns:minmax(0,1fr) 44px}
      .work-compact-drag{width:44px}
      .work-compact-chevron{width:30px;height:30px}
      .work-compact-toggle p{display:none}
      .work-compact-panel{align-items:flex-start;flex-direction:column}
      .work-compact-panel::before{margin-right:0}
      .work-compact-panel .adm-row-actions{width:100%}
      .work-compact-panel .adm-icon{flex:1}
    }
  `;
  document.head.append(style);

  const loadRecords=(force=false)=>{
    if(recordsPromise&&!force)return recordsPromise;
    recordsPromise=sb.select('work_items','select=id,title,position&order=position.asc,created_at.asc')
      .then(rows=>{records=Array.isArray(rows)?rows:[];return records})
      .finally(()=>{recordsPromise=null});
    return recordsPromise;
  };

  const clearDropState=()=>{
    qa('.is-dragging,.drop-before,.drop-after',list).forEach(node=>node.classList.remove('is-dragging','drop-before','drop-after'));
    dropTarget=null;
  };

  const markDrop=(row,id,clientY)=>{
    if(!draggedId||draggedId===id)return;
    qa('.drop-before,.drop-after',list).forEach(node=>node.classList.remove('drop-before','drop-after'));
    const rect=row.getBoundingClientRect();
    const after=clientY>rect.top+rect.height/2;
    row.classList.add(after?'drop-after':'drop-before');
    dropTarget={id,after};
  };

  const saveOrder=async()=>{
    if(!draggedId||!dropTarget||draggedId===dropTarget.id)return clearDropState();
    const rows=qa(':scope>.work-compact-item',list);
    const ids=rows.map(row=>row.dataset.workId);
    const from=ids.indexOf(draggedId);
    if(from<0)return clearDropState();
    const [moving]=ids.splice(from,1);
    let to=ids.indexOf(dropTarget.id);
    if(to<0)to=ids.length;
    else if(dropTarget.after)to+=1;
    ids.splice(to,0,moving);

    const map=new Map(rows.map(row=>[row.dataset.workId,row]));
    ids.forEach(id=>list.append(map.get(id)));
    clearDropState();

    try{
      await Promise.all(ids.map((id,position)=>sb.update('work_items',`id=eq.${encodeURIComponent(id)}`,{position})));
      records=ids.map((id,position)=>({...(records.find(item=>String(item.id)===id)||{id}),position}));
      q('#toast')?.classList.remove('bad');
      const toast=q('#toast');
      if(toast){toast.textContent='Work order saved.';toast.classList.add('on');setTimeout(()=>toast.classList.remove('on'),2400)}
    }catch(error){
      const toast=q('#toast');
      if(toast){toast.textContent=`Order was not saved. ${error.message}`;toast.classList.add('bad','on');setTimeout(()=>toast.classList.remove('on'),3600)}
      await loadRecords(true);
      location.reload();
    }
    draggedId=null;
  };

  const enhanceRow=(row,index,record)=>{
    if(row.dataset.workCompact==='1')return;
    const thumb=q(':scope>.adm-thumb',row);
    const copy=q(':scope>div:not(.adm-thumb):not(.adm-row-actions)',row);
    const actions=q(':scope>.adm-row-actions',row);
    if(!thumb||!copy||!actions||!record)return;

    row.dataset.workCompact='1';
    row.dataset.workId=String(record.id);
    row.classList.add('work-compact-item');

    const buttons=qa(':scope>button',actions);
    const up=buttons[0];
    const down=buttons[1];
    const edit=buttons[2];
    const remove=buttons[3];
    if(up)up.dataset.workUp='1';
    if(down)down.dataset.workDown='1';
    if(edit)edit.dataset.workEdit='1';
    if(remove)remove.dataset.workDelete='1';

    copy.classList.add('work-compact-copy');
    const head=document.createElement('div');
    head.className='work-compact-head';
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='work-compact-toggle';
    toggle.setAttribute('aria-expanded','false');
    const chevron=document.createElement('span');
    chevron.className='work-compact-chevron';
    chevron.setAttribute('aria-hidden','true');
    chevron.innerHTML=chevronIcon;
    toggle.append(thumb,copy,chevron);

    const drag=document.createElement('button');
    drag.type='button';
    drag.className='work-compact-drag';
    drag.draggable=true;
    drag.setAttribute('aria-label',`Drag ${record.title||'project'} to reorder`);
    drag.title='Drag to reorder';
    drag.innerHTML=dragIcon;
    head.append(toggle,drag);

    const panel=document.createElement('div');
    panel.className='work-compact-panel';
    panel.hidden=true;
    panel.append(actions);

    toggle.addEventListener('click',()=>{
      const opening=panel.hidden;
      qa(':scope>.work-compact-item',list).forEach(other=>{
        if(other===row)return;
        other.classList.remove('is-open');
        q(':scope>.work-compact-panel',other)?.setAttribute('hidden','');
        q(':scope>.work-compact-head>.work-compact-toggle',other)?.setAttribute('aria-expanded','false');
      });
      panel.hidden=!opening;
      row.classList.toggle('is-open',opening);
      toggle.setAttribute('aria-expanded',String(opening));
    });

    drag.addEventListener('dragstart',event=>{
      draggedId=row.dataset.workId;
      row.classList.add('is-dragging');
      event.dataTransfer.effectAllowed='move';
      event.dataTransfer.setData('text/plain',draggedId);
    });
    drag.addEventListener('dragend',()=>{draggedId=null;clearDropState()});
    row.addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='move';markDrop(row,row.dataset.workId,event.clientY)});
    row.addEventListener('drop',event=>{event.preventDefault();saveOrder()});

    row.replaceChildren(head,panel);
  };

  const process=async()=>{
    if(processing)return;
    const rows=qa(':scope>.adm-item:not([data-work-compact])',list);
    if(!rows.length)return;
    processing=true;
    try{
      await loadRecords(true);
      rows.forEach(row=>{
        const index=qa(':scope>.adm-item',list).indexOf(row);
        enhanceRow(row,index,records[index]);
      });
    }finally{processing=false}
  };

  new MutationObserver(process).observe(list,{childList:true});
  loadRecords().then(process).catch(()=>{});
})();
