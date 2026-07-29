// Client outcome ledger, stored in reviews.items.
//
// A review is evidence, not a banner: each row carries who said it, what
// changed, and a link to the project it came from. Nothing renders until
// there is something real to show, so the section stays invisible on a
// site with no reviews yet rather than shipping an empty heading.
(function reviews(){
  'use strict';
  const VERSION=3;
  if((window.__ABATCHAN_REVIEWS_VERSION__||0)>=VERSION)return;
  window.__ABATCHAN_REVIEWS_VERSION__=VERSION;

  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
  const page=(String(location.pathname||'/').replace(/\/index(?:\.html)?$/,'/').replace(/\.html$/,'').replace(/\/+$/,'')||'/');

  // A review targets the homepage, the pricing page, both, or the reviews
  // page alone. The reviews page itself carries every published review, so a
  // container marked data-reviews-all ignores targeting entirely.
  const showsOn=(item,all)=>{
    if(all)return true;
    const where=item.pages||item.page||'home';
    if(where==='both')return page==='/'||page==='/pricing';
    if(where==='pricing')return page==='/pricing';
    if(where==='archive')return false;
    return page==='/';
  };

  const STAR='M12 3.6 14.5 9l5.9.8-4.3 4.1 1.1 5.9-5.2-2.9-5.2 2.9 1.1-5.9L3.6 9.8 9.5 9Z';
  const stars=rating=>{
    const value=Number(rating);
    if(!(value>0))return null;
    const clamped=Math.max(0,Math.min(5,value));
    const wrap=document.createElement('span');
    wrap.className='review-stars';
    wrap.style.setProperty('--rating',`${Math.round((clamped/5)*1000)/10}%`);
    wrap.setAttribute('role','img');
    wrap.setAttribute('aria-label',`Rated ${clamped} out of 5`);
    // Two identical rows: the stylesheet outlines the lower one and fills the
    // upper, which is clipped to --rating so 4.9 reads as 4.9 and not 5.
    const row=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}"/></svg>`.repeat(5);
    wrap.innerHTML=`${row}<span class="review-stars-on">${row}</span>`;
    return wrap;
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
      stars(item.rating),
      line('review-meta',source||item.org),
      line('review-meta',item.date||item.place)
    ].filter(Boolean);
  };

  const REDUCED=matchMedia('(prefers-reduced-motion: reduce)');

  // Measured after paint: only quotes that actually overflow get a control.
  const applyClamp=body=>{
    const quote=body.querySelector('.review-quote');
    if(!quote)return;
    quote.classList.add('is-clamped');
    if(quote.scrollHeight-quote.clientHeight<4){quote.classList.remove('is-clamped');return}
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='review-toggle';
    toggle.setAttribute('aria-expanded','false');
    const label=()=>{
      const open=!quote.classList.contains('is-clamped');
      toggle.textContent=open?'see less':'see more';
      toggle.setAttribute('aria-expanded',String(open));
    };
    toggle.addEventListener('click',()=>{
      const start=body.getBoundingClientRect().height;
      quote.classList.toggle('is-clamped');
      label();
      if(REDUCED.matches)return;
      const end=body.getBoundingClientRect().height;
      body.animate([{height:`${start}px`},{height:`${end}px`}],
        {duration:Math.min(520,220+Math.abs(end-start)*0.35),easing:'cubic-bezier(.2,.75,.2,1)'});
    });
    label();
    body.append(toggle);
  };

  const buildRow=(item,collect)=>{
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

    // Long reviews are clamped rather than cut: the whole thing is in the DOM
    // and opens in place, so nothing is edited down to the flattering part.
    const body=document.createElement('div');
    body.className='review-body';
    const quote=document.createElement('blockquote');
    quote.className='review-quote';
    quote.textContent=item.quote||'';
    body.append(quote);
    row.append(who,body);
    collect.push(body);

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
    const all='reviewsAll' in container.dataset;
    const eligible=items
      .filter(item=>item&&item.published!==false&&String(item.quote||'').trim()&&showsOn(item,all))
      .sort((a,b)=>(a.position??0)-(b.position??0));
    const live=eligible.slice(0,limit);
    const published=items.filter(item=>item&&item.published!==false&&String(item.quote||'').trim()).length;

    if(!live.length){
      // Hide the whole section, not just the list, so no orphan heading remains.
      const section=container.closest('section')||container;
      section.hidden=true;
      return;
    }
    const bodies=[];
    container.replaceChildren(...live.map(item=>buildRow(item,bodies)));
    container.hidden=false;
    const section=container.closest('section');
    if(section)section.hidden=false;

    // Only offer the full list when there is more to see than is shown here.
    const more=section?.querySelector('[data-reviews-more]');
    if(more){
      const hasMore=published>live.length;
      more.hidden=!hasMore;
      const label=more.querySelector('[data-reviews-count]');
      if(label&&hasMore)label.textContent=String(published);
    }

    // Clamping needs a laid-out element, so measure on the next frame.
    requestAnimationFrame(()=>bodies.forEach(applyClamp));

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
