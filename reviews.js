// Client outcome ledger, stored in reviews.items.
//
// A review is evidence, not a banner: each row carries who said it, what
// changed, and a link to the project it came from. Nothing renders until
// there is something real to show, so the section stays invisible on a
// site with no reviews yet rather than shipping an empty heading.
(function reviews(){
  'use strict';
  const VERSION=1;
  if((window.__ABATCHAN_REVIEWS_VERSION__||0)>=VERSION)return;
  window.__ABATCHAN_REVIEWS_VERSION__=VERSION;

  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
  const page=(String(location.pathname||'/').replace(/\/index(?:\.html)?$/,'/').replace(/\.html$/,'').replace(/\/+$/,'')||'/');

  // A review targets the homepage, the pricing page, or both.
  const showsOn=item=>{
    const where=item.pages||item.page||'home';
    if(where==='both')return page==='/'||page==='/pricing';
    if(where==='pricing')return page==='/pricing';
    return page==='/';
  };

  const line=(cls,text)=>{
    if(!text)return null;
    const el=document.createElement('span');
    el.className=cls;
    el.textContent=text;
    return el;
  };

  // Who said it: the engagement first, then where it was said and when, so a
  // reader can go and check it rather than take it on trust.
  const attribution=item=>{
    const source=[item.source,item.client].filter(Boolean).join(' · ');
    return [
      line('review-role',item.engagement||item.role),
      line('review-meta',source||item.org),
      line('review-meta',item.date||item.place)
    ].filter(Boolean);
  };

  const buildRow=item=>{
    const row=document.createElement('article');
    row.className='review-row reveal';

    const who=document.createElement('div');
    who.className='review-who';
    const dot=document.createElement('span');
    dot.className='review-dot';
    dot.setAttribute('aria-hidden','true');
    const stack=document.createElement('div');
    attribution(item).forEach(node=>stack.append(node));
    who.append(dot,stack);

    const quote=document.createElement('blockquote');
    quote.className='review-quote';
    quote.textContent=item.quote||'';

    row.append(who,quote);

    // Only link when the review names a project that still exists.
    if(item.project){
      const link=document.createElement('a');
      link.className='review-link';
      link.href=`/work#work-${item.project}`;
      link.innerHTML='view the system <span class="arrow">↗</span>';
      link.setAttribute('aria-label',`View the project behind this outcome: ${item.project}`);
      row.append(link);
    }
    return row;
  };

  const render=(container,items)=>{
    // A page shows its strongest few in admin order; the rest stay in the
    // collection rather than turning the page into a wall of praise.
    const limit=Number(container.dataset.reviewsLimit)||Infinity;
    const live=items
      .filter(item=>item&&item.published!==false&&String(item.quote||'').trim()&&showsOn(item))
      .sort((a,b)=>(a.position??0)-(b.position??0))
      .slice(0,limit);

    if(!live.length){
      // Hide the whole section, not just the list, so no orphan heading remains.
      const section=container.closest('section')||container;
      section.hidden=true;
      return;
    }
    container.replaceChildren(...live.map(buildRow));
    container.hidden=false;
    const section=container.closest('section');
    if(section)section.hidden=false;

    // script.js reveals on intersection; rows added later need observing too.
    if(window.__abatchanObserveReveal)qa('.reveal',container).forEach(window.__abatchanObserveReveal);
    else qa('.reveal',container).forEach(node=>node.classList.add('visible'));
  };

  const renderNote=(note,items)=>{
    const live=items.filter(item=>item&&item.published!==false&&String(item.quote||'').trim());
    const pick=live.find(item=>item.featured)||live[0];
    if(!pick){note.hidden=true;return}
    const quote=document.createElement('blockquote');
    quote.className='review-quote';
    quote.textContent=pick.quote;
    const meta=document.createElement('span');
    meta.className='review-meta';
    meta.textContent=[pick.engagement||pick.role,pick.source||pick.org,pick.date||pick.place]
      .filter(Boolean).join(' · ');
    note.replaceChildren(quote,meta);
    note.hidden=false;
  };

  const load=async()=>{
    const ledgers=qa('[data-reviews]');
    const note=q('[data-review-note]');
    if(!ledgers.length&&!note)return;
    const defaults=Array.isArray(window.ABATCHAN_REVIEW_DEFAULTS)?window.ABATCHAN_REVIEW_DEFAULTS:[];
    const paint=items=>{
      ledgers.forEach(el=>render(el,items));
      if(note)renderNote(note,items);
    };
    if(!window.sb?.configured?.()){paint(defaults);return}
    try{
      const rows=await sb.select('settings','key=eq.reviews.items&is_public=eq.true&select=value');
      // The dashboard's set wins once it exists; until then the authored
      // defaults are what visitors see, so the section is never empty.
      const stored=rows?.[0]?.value;
      paint(Array.isArray(stored)&&stored.length?stored:defaults);
    }catch{
      paint(defaults);
    }
  };

  document.readyState==='loading'
    ? addEventListener('DOMContentLoaded',load,{once:true})
    : load();
})();
