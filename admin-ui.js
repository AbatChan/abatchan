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
  window.admToggleHeight=(panel,open,{duration=280}={})=>{
    if(!panel)return;

    // Height alone cannot close these panels: the work rows carry a
    // min-height, which outranks height entirely, and every panel has padding,
    // which under border-box is a floor height can never get below. Both have
    // to come down with it or the panel sits at full size for the whole
    // animation and then vanishes, which reads as a hang before it closes.
    const clear=()=>{
      panel.style.transition='';panel.style.height='';panel.style.overflow='';
      panel.style.minHeight='';panel.style.paddingTop='';panel.style.paddingBottom='';
    };
    const stop=()=>{
      clearTimeout(panel.__admTimer);
      if(panel.__admEnd)panel.removeEventListener('transitionend',panel.__admEnd);
      panel.__admTimer=null;panel.__admEnd=null;
    };
    stop();
    if(REDUCED.matches){clear();panel.hidden=!open;return}

    const from=panel.hidden?0:panel.getBoundingClientRect().height;

    // Measure the resting size with nothing of ours applied, so opening
    // restores exactly what the stylesheet asks for.
    panel.style.transition='none';
    clear();
    panel.hidden=false;
    const style=getComputedStyle(panel);
    const padTop=style.paddingTop,padBottom=style.paddingBottom;
    const to=open?panel.scrollHeight:0;
    if(from===to&&!open){clear();panel.hidden=true;return}

    // Opening decelerates into place; closing accelerates away, because the
    // same ease-out in both directions leaves the last pixels crawling.
    const ease=open?'cubic-bezier(.2,.75,.2,1)':'cubic-bezier(.5,0,.85,.4)';
    const ms=Math.round(Math.min((open?duration:duration*0.8)+Math.abs(to-from)*0.15,460));

    panel.style.overflow='hidden';
    panel.style.minHeight='0px';
    panel.style.height=`${from}px`;
    panel.style.paddingTop=open?'0px':padTop;
    panel.style.paddingBottom=open?'0px':padBottom;

    // Flush the start state, or the browser folds both into a single frame
    // and there is no transition to watch.
    void panel.offsetHeight;

    panel.style.transition=`height ${ms}ms ${ease},padding-top ${ms}ms ${ease},padding-bottom ${ms}ms ${ease},opacity ${Math.round(ms*0.7)}ms ${ease}`;
    panel.style.height=`${to}px`;
    panel.style.paddingTop=open?padTop:'0px';
    panel.style.paddingBottom=open?padBottom:'0px';

    const finish=()=>{stop();clear();panel.hidden=!open};
    panel.__admEnd=event=>{if(event.target===panel&&event.propertyName==='height')finish()};
    panel.addEventListener('transitionend',panel.__admEnd);
    // transitionend never arrives if the transition is interrupted or the tab
    // is backgrounded, so the panel must never be left stuck mid-collapse.
    panel.__admTimer=setTimeout(finish,ms+140);
  };
})();
