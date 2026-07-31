// Client outcome ledger, stored in reviews.items.
//
// A review is evidence, not a banner: each row carries who said it, what
// changed, and a link to the project it came from. Nothing renders until
// there is something real to show, so the section stays invisible on a
// site with no reviews yet rather than shipping an empty heading.
(function reviews(){
  'use strict';
  const VERSION=4;
  if((window.__ABATCHAN_REVIEWS_VERSION__||0)>=VERSION)return;
  window.__ABATCHAN_REVIEWS_VERSION__=VERSION;

  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
  const page=(String(location.pathname||'/').replace(/\/index(?:\.html)?$/,'/').replace(/\.html$/,'').replace(/\/+$/,'')||'/');

  // "March 2026" -> a sortable number. Marketplace reviews with no date sort
  // last rather than pretending to be recent.
  const MONTHS='january february march april may june july august september october november december'.split(' ');
  const when=item=>{
    const parts=String(item.date||'').trim().toLowerCase().split(/\s+/);
    if(parts.length<2)return 0;
    const month=MONTHS.indexOf(parts[0]),year=Number(parts[1]);
    return month<0||!year?0:year*12+month+1;
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
  // Rows are built already clamped, so this only ever relaxes a quote that
  // turned out to fit. Clamping here instead would mean painting every quote
  // at full height first and collapsing it a frame later, which moved
  // everything below the list and was the page's whole layout-shift score.
  const applyClamp=body=>{
    const quote=body.querySelector('.review-quote');
    if(!quote)return;
    if(quote.scrollHeight-quote.clientHeight<4){
      quote.classList.remove('is-clamped');
      body.querySelector('.review-toggle')?.remove();
      return;
    }
    // Prerendered markup ships its own toggle so the row is the right height
    // on first paint. Adopt that button rather than adding a second one, so it
    // ends up wired to the same handler either way.
    const existing=body.querySelector('.review-toggle');
    if(existing&&existing.dataset.bound)return;
    const toggle=existing||document.createElement('button');
    toggle.type='button';
    toggle.className='review-toggle';
    toggle.dataset.bound='1';
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
    if(!existing)body.append(toggle);
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
    // Clamped up front to match the prerendered markup; applyClamp relaxes it
    // a frame later if it turns out to fit. A short quote is unaffected by a
    // four-line clamp, so relaxing one costs no movement.
    quote.className='review-quote is-clamped';
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
    // Home and pricing take the newest few automatically; the reviews page
    // keeps the order set in the dashboard.
    const newest='reviewsLatest' in container.dataset;
    const eligible=items
      .filter(item=>item&&item.published!==false&&String(item.quote||'').trim())
      .sort(newest
        ? (a,b)=>when(b)-when(a)||(a.position??0)-(b.position??0)
        : (a,b)=>(a.position??0)-(b.position??0));
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
    const live=items
      .filter(item=>item&&item.published!==false&&String(item.quote||'').trim())
      .sort((a,b)=>(a.position??0)-(b.position??0));
    if(!live.length){note.hidden=true;return}

    // The quote is the way through to the rest of them.
    const link=document.createElement('a');
    link.className='review-note-link';
    link.href='/reviews';
    link.setAttribute('aria-label',`Read all ${live.length} client reviews`);
    const stage=document.createElement('div');
    stage.className='review-note-stage';
    const quote=document.createElement('blockquote');
    quote.className='review-quote';
    const meta=document.createElement('span');
    meta.className='review-meta';
    const more=document.createElement('span');
    more.className='review-note-more';
    more.innerHTML=`read all ${live.length} reviews <span class="arrow">\u2197</span>`;
    stage.append(quote,meta);
    link.append(stage,more);
    note.replaceChildren(link);
    note.hidden=false;

    const paint=item=>{
      quote.textContent=item.quote;
      meta.textContent=[item.engagement||item.role,item.source||item.org,item.date||item.place]
        .filter(Boolean).join(' · ');
    };
    paint(live[0]);

    // One quote is a fact; a rotation is a fact you can keep reading. It only
    // earns the motion when there is more than one and the visitor wants it.
    if(live.length<2||REDUCED.matches)return;

    let index=0,timer=null,swapping=false;
    const advance=()=>{
      if(swapping)return;
      swapping=true;
      stage.classList.add('is-out');
      setTimeout(()=>{
        index=(index+1)%live.length;
        paint(live[index]);
        stage.classList.remove('is-out');
        swapping=false;
      },280);
    };
    const start=()=>{if(!timer)timer=setInterval(advance,7000)};
    const stop=()=>{clearInterval(timer);timer=null};

    // Never rotate a quote out from under someone reading it, and never run
    // the timer for a tab nobody is looking at.
    note.addEventListener('pointerenter',stop);
    note.addEventListener('pointerleave',start);
    note.addEventListener('focusin',stop);
    note.addEventListener('focusout',start);
    document.addEventListener('visibilitychange',()=>{document.hidden?stop():start()});
    start();
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
