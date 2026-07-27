// Dynamic homepage selections and project galleries.
(function dynamicWork(){
  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validLink=v=>typeof v==='string'&&/^(https:\/\/|\/)/.test(v);

  const style=document.createElement('style');
  style.textContent=`
    .managed-gallery{position:relative;width:100%;height:100%;min-height:300px;overflow:hidden;background:#111116}
    .managed-gallery-track{display:flex;width:100%;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain}
    .managed-gallery-track::-webkit-scrollbar{display:none}
    .managed-gallery-slide{flex:0 0 100%;width:100%;height:100%;scroll-snap-align:start;position:relative}
    .managed-gallery-slide img{width:100%;height:100%;display:block;object-fit:cover}
    .managed-gallery-nav{position:absolute;left:16px;right:16px;bottom:14px;display:flex;align-items:center;justify-content:space-between;pointer-events:none}
    .managed-gallery-dots{display:flex;gap:6px;padding:7px 9px;border-radius:999px;background:rgba(10,10,14,.62);backdrop-filter:blur(12px)}
    .managed-gallery-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.36);transition:width .22s,background .22s}
    .managed-gallery-dot.is-on{width:18px;border-radius:999px;background:var(--signal)}
    .managed-gallery-count{padding:7px 9px;border-radius:999px;background:rgba(10,10,14,.62);color:#fff;font-size:11px;line-height:1;backdrop-filter:blur(12px)}
    .home-managed-card .card-info{display:flex;flex-direction:column;align-items:flex-start}
    .home-managed-card .card-info .btn{margin-top:14px}
    .work-grid.home-dynamic-grid>.home-slot-card:nth-child(1){grid-column:span 12;min-height:570px}
    .work-grid.home-dynamic-grid>.home-slot-card:nth-child(2),.work-grid.home-dynamic-grid>.home-slot-card:nth-child(3){grid-column:span 6}
    @media(max-width:900px){.work-grid.home-dynamic-grid>.home-slot-card:nth-child(n){grid-column:span 12;min-height:500px}}
    @media(max-width:620px){.managed-gallery{min-height:240px}.work-grid.home-dynamic-grid>.home-slot-card:nth-child(n){min-height:430px}}
  `;
  document.head.appendChild(style);

  const loadSettings=async()=>{
    try{
      const rows=await sb.select('settings','key=eq.work.enhancements&is_public=eq.true&select=value');
      return rows?.[0]?.value&&typeof rows[0].value==='object'?rows[0].value:{};
    }catch{return {}}
  };

  const imageUrls=(item,extra)=>{
    const paths=[];
    if(item.image_path)paths.push(item.image_path);
    if(Array.isArray(extra?.gallery_paths))extra.gallery_paths.forEach(path=>{if(path&&!paths.includes(path))paths.push(path)});
    return paths.map(path=>sb.publicUrl('work',path));
  };

  const makeGallery=(item,extra)=>{
    const urls=imageUrls(item,extra);
    if(!urls.length)return null;
    const wrap=document.createElement('div');wrap.className='managed-gallery';
    const track=document.createElement('div');track.className='managed-gallery-track';
    urls.forEach((url,index)=>{
      const slide=document.createElement('div');slide.className='managed-gallery-slide';
      const img=document.createElement('img');img.src=url;img.alt=index===0?(item.image_alt||''):'';img.loading='lazy';
      slide.append(img);track.append(slide);
    });
    wrap.append(track);
    if(urls.length>1){
      const nav=document.createElement('div');nav.className='managed-gallery-nav';
      const dots=document.createElement('div');dots.className='managed-gallery-dots';
      urls.forEach((_,i)=>{const dot=document.createElement('i');dot.className='managed-gallery-dot'+(i===0?' is-on':'');dots.append(dot)});
      const count=document.createElement('span');count.className='managed-gallery-count';count.textContent=`1 / ${urls.length}`;
      nav.append(dots,count);wrap.append(nav);
      let raf=0;
      track.addEventListener('scroll',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
        const index=Math.max(0,Math.min(urls.length-1,Math.round(track.scrollLeft/Math.max(1,track.clientWidth))));
        qa('.managed-gallery-dot',dots).forEach((dot,i)=>dot.classList.toggle('is-on',i===index));count.textContent=`${index+1} / ${urls.length}`;
      })},{passive:true});
    }
    return wrap;
  };

  const createCard=(item,extra,fallbackVisual)=>{
    const card=document.createElement('article');
    card.className='work-card reveal visible home-managed-card home-slot-card';
    card.dataset.type=item.category||'product';
    let visual=document.createElement('div');visual.className='card-visual managed';
    const gallery=makeGallery(item,extra);
    if(gallery)visual.append(gallery);
    else if(fallbackVisual)visual=fallbackVisual.cloneNode(true);
    const info=document.createElement('div');info.className='card-info';
    info.innerHTML=`<div class="card-meta"><span>${esc(item.kicker||item.category||'project')}</span><span>${esc(item.status||'selected work')}</span></div><h3>${esc(item.title)}</h3><p>${esc(extra?.homepage_summary||item.summary||'')}</p>`;
    if(validLink(item.link_url)){
      const link=document.createElement('a');link.className='btn sm';link.href=item.link_url;link.innerHTML='view project <span class="arrow">↗</span>';
      if(item.link_url.startsWith('https://')){link.target='_blank';link.rel='noopener noreferrer'}
      info.append(link);
    }
    card.append(visual,info);return card;
  };

  const normalizeFallbacks=nodes=>nodes.map(node=>{
    const clone=node.cloneNode(true);
    clone.classList.add('home-slot-card');
    return clone;
  });

  const renderHome=async()=>{
    const path=location.pathname.replace(/\/+$/,'')||'/';
    if(path!=='/'||!window.sb?.configured?.())return;
    const heading=qa('.section-index').find(el=>/selected systems/i.test(el.textContent));
    const grid=heading?.closest('section')?.querySelector('.work-grid');
    if(!grid)return;
    const original=[...grid.children];
    const fallback=normalizeFallbacks(original);
    if(!fallback.length)return;
    grid.classList.add('home-dynamic-grid');
    try{
      const [rows,extras]=await Promise.all([
        sb.select('work_items','published=eq.true&featured=eq.true&select=*&order=position.asc,created_at.asc&limit=3'),
        loadSettings()
      ]);
      const cards=(rows||[]).slice(0,3).map((item,index)=>{
        const fallbackVisual=q('.card-visual',original[index]||original[0]);
        return createCard(item,extras[item.slug]||{},fallbackVisual);
      });
      while(cards.length<3&&fallback.length)cards.push(fallback.shift());
      grid.replaceChildren(...cards.slice(0,3));
    }catch{
      grid.replaceChildren(...fallback.slice(0,3));
    }
  };

  const enhanceWork=async()=>{
    const path=location.pathname.replace(/\/+$/,'');
    if(path!=='/work'||!window.sb?.configured?.())return;
    try{
      const [rows,extras]=await Promise.all([
        sb.select('work_items','published=eq.true&select=slug,title,image_path,image_alt&order=position.asc,created_at.asc'),
        loadSettings()
      ]);
      const apply=()=>{
        rows.forEach(item=>{
          const extra=extras[item.slug]||{};if(!Array.isArray(extra.gallery_paths)||!extra.gallery_paths.length)return;
          const card=qa('.work-card').find(el=>q('.card-info h3',el)?.textContent.trim()===item.title);
          const visual=card&&q('.card-visual',card);if(!visual||visual.dataset.galleryReady)return;
          const gallery=makeGallery(item,extra);if(!gallery)return;
          visual.replaceChildren(gallery);visual.dataset.galleryReady='1';
        });
      };
      apply();
      const grid=q('.work-grid');
      if(grid)new MutationObserver(apply).observe(grid,{childList:true});
    }catch{}
  };

  const start=()=>{renderHome();enhanceWork()};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();