// Shared dashboard primitives: list filtering and height animation.
//
// The search box and status filter were about to exist in four copies, one
// per collection, which is how the rest of this dashboard drifted apart in
// the first place. One owner here, four callers.
(function adminUI(){
  'use strict';
  const VERSION=1;
  if((window.__ABATCHAN_ADMIN_UI__||0)>=VERSION)return;
  window.__ABATCHAN_ADMIN_UI__=VERSION;

  const REDUCED=matchMedia('(prefers-reduced-motion: reduce)');

  const SEARCH_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>';

  /**
   * Search + status filter for a collection.
   *
   * text(item)    -> the searchable string for one item
   * isDraft(item) -> true when the item is unpublished; omit for collections
   *                  that have no draft state, and the status filter is left out
   * onChange()    -> called whenever the filter changes
   * minItems      -> below this many items the controls stay hidden, because
   *                  filtering one row is noise, not help
   */
  window.admListTools=({label='items',text,isDraft,onChange,minItems=2}={})=>{
    let query='',status='all';
    const wrap=document.createElement('div');
    wrap.className='adm-list-tools';
    wrap.hidden=true;

    const search=document.createElement('label');
    search.className='adm-search';
    search.innerHTML=`${SEARCH_ICON}<input type="search" placeholder="Search ${label}" aria-label="Search ${label}">`;
    const input=search.querySelector('input');
    input.addEventListener('input',()=>{query=input.value.trim().toLowerCase();onChange?.()});
    wrap.append(search);

    let seg=null;
    if(isDraft){
      seg=document.createElement('div');
      seg.className='adm-seg';
      seg.setAttribute('role','group');
      seg.setAttribute('aria-label','Filter by status');
      [['all','all'],['published','published'],['draft','drafts']].forEach(([value,copy])=>{
        const button=document.createElement('button');
        button.type='button';
        button.dataset.status=value;
        button.textContent=copy;
        button.setAttribute('aria-pressed',String(value==='all'));
        button.addEventListener('click',()=>{
          status=value;
          [...seg.children].forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
          onChange?.();
        });
        seg.append(button);
      });
      wrap.append(seg);
    }

    const api={
      element:wrap,
      get filtering(){return Boolean(query)||status!=='all'},
      matches(item){
        if(isDraft){
          if(status==='published'&&isDraft(item))return false;
          if(status==='draft'&&!isDraft(item))return false;
        }
        if(!query)return true;
        return String(text?.(item)??'').toLowerCase().includes(query);
      },
      // Called on every render: a collection too small to need filtering
      // hides the controls, and resets so nothing stays filtered out of view.
      sync(total){
        const useful=total>=minItems;
        if(!useful&&api.filtering){
          query='';status='all';input.value='';
          if(seg)[...seg.children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.status==='all')));
        }
        wrap.hidden=!useful;
        return useful;
      },
      countLabel(shown,total,noun=label){
        return api.filtering?`${shown} of ${total} shown`:`${total} ${noun}${total===1?'':'s'}`;
      }
    };
    return api;
  };

  /**
   * Open or close a panel by animating its real height. Panels used `hidden`,
   * which snaps; this keeps the same markup and adds the motion.
   */
  window.admToggleHeight=(panel,open,{duration=300}={})=>{
    if(!panel)return;
    panel.__admAnim?.cancel();
    if(REDUCED.matches){panel.hidden=!open;return}

    const start=panel.hidden?0:panel.getBoundingClientRect().height;
    panel.hidden=false;
    panel.style.overflow='hidden';
    const end=open?panel.scrollHeight:0;
    if(start===end&&open){panel.style.overflow='';return}

    const animation=panel.animate(
      [{height:`${start}px`,opacity:start===0?0:1},{height:`${end}px`,opacity:end===0?0:1}],
      {duration:Math.min(duration+Math.abs(end-start)*0.18,520),easing:'cubic-bezier(.2,.75,.2,1)'}
    );
    panel.__admAnim=animation;
    animation.onfinish=()=>{
      if(panel.__admAnim!==animation)return;
      panel.style.overflow='';
      panel.hidden=!open;
      panel.__admAnim=null;
    };
  };
})();
