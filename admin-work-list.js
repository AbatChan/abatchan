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

  let draggedId=null;
  let dropTarget=null;
  let processing=false;

  const dragIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="7" r="1"/><circle cx="16" cy="7" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/></svg>';
  const chevronIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';

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
      q('#toast')?.classList.remove('bad');
      const toast=q('#toast');
      if(toast){toast.textContent='Work order saved.';toast.classList.add('on');setTimeout(()=>toast.classList.remove('on'),2400)}
    }catch(error){
      const toast=q('#toast');
      if(toast){toast.textContent=`Order was not saved. ${error.message}`;toast.classList.add('bad','on');setTimeout(()=>toast.classList.remove('on'),3600)}
      location.reload();
    }
    draggedId=null;
  };

  const enhanceRow=row=>{
    if(row.dataset.workCompact==='1')return;
    const thumb=q(':scope>.adm-thumb',row);
    const copy=q(':scope>div:not(.adm-thumb):not(.adm-row-actions)',row);
    const actions=q(':scope>.adm-row-actions',row);
    const id=row.dataset.workId;
    const title=row.dataset.workTitle||q('h3',copy)?.textContent||'project';
    if(!thumb||!copy||!actions||!id)return;

    row.dataset.workCompact='1';
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
    drag.setAttribute('aria-label',`Drag ${title} to reorder`);
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

  const process=()=>{
    if(processing)return;
    const rows=qa(':scope>.adm-item:not([data-work-compact])',list);
    if(!rows.length)return;
    processing=true;
    try{
      rows.forEach(enhanceRow);
      list.dataset.workListReady='true';
    }finally{processing=false}
  };

  new MutationObserver(process).observe(list,{childList:true});
  process();
})();
