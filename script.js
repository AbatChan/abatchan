const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];

document.title=document.title.replaceAll('—','|');
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),textNodes=[];
while(walker.nextNode())textNodes.push(walker.currentNode);
textNodes.forEach(node=>{if(node.nodeValue.includes('—'))node.nodeValue=node.nodeValue.replaceAll('—',', ')});

// The header is injected later, so create the keyboard escape hatch here while
// the document structure is still simple. Every public page has one <main>.
const main=q('main');
if(main&&!q('.skip-link')){
  main.id=main.id||'main-content';
  const skipLink=document.createElement('a');
  skipLink.className='skip-link';
  skipLink.href='#'+main.id;
  skipLink.textContent='skip to content';
  document.body.insertBefore(skipLink,document.body.firstChild);
}

const themeKey='abatchanTheme';
// No stored value means the OS decides, and keeps deciding — the toggle only
// pins a theme once the visitor has actually chosen one.
const themeQuery=matchMedia('(prefers-color-scheme: light)');
const systemTheme=()=>themeQuery.matches?'light':'dark';
let currentTheme=localStorage.getItem(themeKey)||systemTheme();
// Official horizontal lockups, used as-is. The symbol is #6366f1 indigo in both
// files; only the wordmark differs, so the mark never changes colour with theme.
//
// Both are rendered once and swapped by CSS on [data-theme]. Rebuilding the <img>
// on every theme change meant a fresh network fetch each flip, and an <img> with
// no width/height attributes reserves no box until it decodes, so the lockup
// popped in at the wrong size. The intrinsic 1416x286 is declared up front so the
// layout box exists before the file arrives.
const LOCKUP='/assets/abatchan-logo-horizontal-indigo-symbol-';
const brandMarkup=()=>['white','black'].map(ink=>
  `<img class="brand-lockup" data-ink="${ink}" width="1416" height="286" decoding="async" fetchpriority="high" src="${LOCKUP}${ink}-text.svg" alt="${ink==='white'?'abatchan':''}"${ink==='black'?' aria-hidden="true"':''}>`
).join('');
const renderBrand=()=>qa('.site-header .brand,.footer-mark').forEach(el=>{
  if(!el.querySelector('.brand-lockup'))el.innerHTML=brandMarkup();
});

document.documentElement.dataset.theme=currentTheme;
renderBrand();

// ---------------------------------------------------------------- chrome
// The header, tab bar and overlay layers were byte-identical in nine HTML
// files, so any nav change meant nine edits that could drift apart. They are
// built here instead: pages carry empty <header class="site-header">,
// <nav class="mobile-tabs"> and nothing else. Adding a destination is one row
// of NAV and it appears in both navigations at once.
const NAV=[
  ['/',        'home',    '<path d="M3.5 10.4 12 3.2l8.5 7.2V20a1.4 1.4 0 0 1-1.4 1.4H4.9A1.4 1.4 0 0 1 3.5 20Z"/><path d="M9.4 21.4v-6.6h5.2v6.6"/>'],
  ['/work',    'work',    '<rect x="2.8" y="7.2" width="18.4" height="13.6" rx="2.4"/><path d="M8.6 7.2V5.4a2.2 2.2 0 0 1 2.2-2.2h2.4a2.2 2.2 0 0 1 2.2 2.2v1.8"/><path d="M2.8 12.4h18.4"/>'],
  ['/about',   'about',   '<circle cx="12" cy="8" r="3.9"/><path d="M4.9 20.8a7.4 7.4 0 0 1 14.2 0"/>'],
  ['/pricing', 'pricing', '<path d="M20.5 13.6 13.6 20.5a2.2 2.2 0 0 1-3.1 0L3.6 13.6a2.2 2.2 0 0 1-.6-1.5V5.2A2.2 2.2 0 0 1 5.2 3h6.9a2.2 2.2 0 0 1 1.5.6l6.9 6.9a2.2 2.2 0 0 1 0 3.1Z"/><path d="M7.6 7.6h.01"/>'],
  ['/contact', 'contact', '<path d="M21.4 2.6 10.9 13.1"/><path d="M21.4 2.6 14.7 21.4l-3.8-8.3-8.3-3.8Z"/>']
];
// the one call to action that appears in the header on every page
const HEADER_CTA={href:'/contact',label:'start a project ↗'};

// fixed decorative layers, previously three copy-pasted divs per page
['page-transition','grid-bg','cursor-light'].forEach(cls=>{
  if(q('.'+cls))return;
  const el=document.createElement('div');el.className=cls;
  document.body.insertBefore(el,document.body.firstChild);
});

qa('.site-header').forEach(header=>{
  if(header.querySelector('.desktop-nav'))return;      // page supplied its own
  header.innerHTML=
    '<a class="brand" href="/" aria-label="abatchan home"></a>'+
    '<nav class="desktop-nav" aria-label="Primary">'+
      NAV.map(([href,label])=>`<a data-page="${href}" href="${href}">${label}</a>`).join('')+
    '</nav>'+
    `<div class="header-actions"><a class="btn primary sm header-cta" href="${HEADER_CTA.href}">${HEADER_CTA.label}</a></div>`;
});

qa('.mobile-tabs').forEach(nav=>{
  if(nav.querySelector('a'))return;
  nav.setAttribute('aria-label','Primary');
  nav.innerHTML=NAV.map(([href,label,icon])=>
    `<a data-page="${href}" href="${href}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg><span>${label}</span></a>`
  ).join('');
});

// Every button ends up with the same animated arrow whether the page wrote
// <span class="arrow">, a bare <span>, or just the glyph in the text. Direction
// is read from the glyph so the arrow leaves the way it points.
const ARROW_DIR={'\u2197':'up-right','\u2192':'right','\u2193':'down','\u2198':'down'};
qa('.btn').forEach(btn=>{
  const existing=q('span',btn);
  if(existing&&ARROW_DIR[existing.textContent.trim()]){
    existing.className='arrow';
    existing.dataset.dir=ARROW_DIR[existing.textContent.trim()];
    return;
  }
  // glyph sitting loose in the text node
  const last=btn.lastChild;
  if(!last||last.nodeType!==3)return;
  const m=last.nodeValue.match(/\s*([\u2197\u2192\u2193\u2198])\s*$/);
  if(!m)return;
  last.nodeValue=last.nodeValue.slice(0,m.index);
  const span=document.createElement('span');
  span.className='arrow';span.dataset.dir=ARROW_DIR[m[1]];span.textContent=m[1];
  btn.appendChild(span);
});

renderBrand();

// ------------------------------------------------------------------- lamp
// Theme control: a pull cord simulated as a Verlet rope.
//
// The cord lives on a viewport-sized layer, not in a small box, so the bead can
// never jam against a container edge. Its limit is the rope's own length,
// measured radially from the anchor. A deliberate short pull clicks immediately
// and springs back mid-drag; a quick flick is also recognised on release, and a
// tap remains available as the simple pointer alternative.
//
// One SVG path and one transform per frame, so nothing reflows while it moves,
// and the loop parks itself once the rope is still.
(function lamp(){
  if(q('.lamp'))return;

  const N=15, SEG=7, GRAV=0.62, DAMP=0.986, ITER=6;
  const REST=(N-1)*SEG;            // hanging length
  const STRETCH=46;                // how far past rest it can be pulled
  const PULL_MOUSE=22;             // deliberate travel before a mouse pull fires
  const PULL_TOUCH=18;             // fingers need a slightly more forgiving pull
  const FLICK=0.42;                // px/ms downward that counts as a yank
  const FLICK_MIN=12;              // ...provided it travelled far enough to be intentional
  const TAP_SLOP=7;                // a near-stationary press is the simple fallback
  const MAXLEN=REST+STRETCH;       // the click point

  const el=document.createElement('div');
  el.className='lamp';
  el.innerHTML='<svg aria-hidden="true"><path/></svg>'+
    '<button class="lamp-bead" type="button" aria-label="Switch colour theme"></button>'+
    '<span class="lamp-label" aria-hidden="true"></span>';
  document.body.appendChild(el);
  const svg=q('svg',el), path=q('path',el), bead=q('.lamp-bead',el), label=q('.lamp-label',el);

  const anchor={x:0,y:-6};
  const place=()=>{
    // The theme control stays on the right at every breakpoint. Mobile uses a
    // smaller inset while preserving the bead's 44px touch target.
    anchor.x=innerWidth-(innerWidth>900?44:26);
    svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);
  };
  place();

  const P=[];
  for(let i=0;i<N;i++)P.push({x:anchor.x,y:anchor.y+i*SEG,px:anchor.x,py:anchor.y+i*SEG});
  const tail=P[N-1];

  let dragging=false,grabId=null,target=null,running=false,still=0,taut=false;
  let startDist=0,startY=0,startT=0,lastY=0,lastT=0,peakVy=0,travel=0,pointerType='mouse';

  function step(){
    for(let i=1;i<N;i++){
      if(dragging&&i===N-1)continue;
      const p=P[i];
      const vx=(p.x-p.px)*DAMP, vy=(p.y-p.py)*DAMP;
      p.px=p.x; p.py=p.y;
      p.x+=vx; p.y+=vy+GRAV;
    }
    if(dragging&&target){tail.px=tail.x;tail.py=tail.y;tail.x=target.x;tail.y=target.y}
    for(let k=0;k<ITER;k++){
      P[0].x=anchor.x; P[0].y=anchor.y;
      for(let i=0;i<N-1;i++){
        const a=P[i],c=P[i+1];
        let dx=c.x-a.x, dy=c.y-a.y;
        const d=Math.hypot(dx,dy)||1e-4;
        const diff=(d-SEG)/d*0.5;
        dx*=diff; dy*=diff;
        if(i!==0){a.x+=dx;a.y+=dy}else{a.x=anchor.x;a.y=anchor.y}
        if(!(dragging&&i+1===N-1)){c.x-=dx;c.y-=dy}
      }
    }
  }

  function draw(){
    let d='M '+P[0].x.toFixed(1)+' '+P[0].y.toFixed(1);
    for(let i=1;i<N-1;i++){
      const mx=(P[i].x+P[i+1].x)/2, my=(P[i].y+P[i+1].y)/2;
      d+=' Q '+P[i].x.toFixed(1)+' '+P[i].y.toFixed(1)+' '+mx.toFixed(1)+' '+my.toFixed(1);
    }
    d+=' L '+tail.x.toFixed(1)+' '+tail.y.toFixed(1);
    path.setAttribute('d',d);
    bead.style.transform='translate('+tail.x.toFixed(1)+'px,'+tail.y.toFixed(1)+'px)';
    const onLeft=tail.x>innerWidth/2;
    label.style.transform='translate('+(tail.x+(onLeft?-14:14)).toFixed(1)+'px,'+(tail.y-6).toFixed(1)+'px)'+(onLeft?' translateX(-100%)':'');
  }

  function frame(){
    step(); draw();
    const moved=Math.abs(tail.x-tail.px)+Math.abs(tail.y-tail.py);
    still=(!dragging&&moved<0.08)?still+1:0;
    if(still>12){running=false;return}
    requestAnimationFrame(frame);
  }
  const wake=()=>{still=0;if(!running){running=true;requestAnimationFrame(frame)}};

  const setTaut=on=>{if(on!==taut){taut=on;el.classList.toggle('taut',on)}};

  // Let go for the visitor, so the rope rebounds while their finger is still down.
  // Mark the drag finished before releasing capture: lostpointercapture may run
  // immediately, and must not re-enter this function.
  function letGo(){
    const id=grabId;
    dragging=false; grabId=null; target=null; setTaut(false);
    el.classList.remove('is-dragging');
    if(id!==null&&bead.hasPointerCapture?.(id)){try{bead.releasePointerCapture(id)}catch{}}
    wake();
  }

  // How far from the anchor a pointer event is, and where the bead may sit for it.
  const reach=e=>{
    const dx=e.clientX-anchor.x, dy=e.clientY-anchor.y;
    const dist=Math.hypot(dx,dy)||1e-4;
    const k=dist>=MAXLEN?MAXLEN/dist:1;
    return {dist, x:anchor.x+dx*k, y:anchor.y+dy*k};
  };

  const pullLimit=()=>pointerType==='touch'?PULL_TOUCH:PULL_MOUSE;

  // Browsers may combine several fast hardware samples into one pointermove.
  // Read those samples when available, and always include pointerup itself.
  const sample=e=>{
    const samples=e.getCoalescedEvents?.()||[];
    const list=samples.length?[...samples,e]:[e];
    let r=reach(e);
    for(const s of list){
      const t=s.timeStamp,dt=Math.max(1,t-lastT);
      peakVy=Math.max(peakVy,(s.clientY-lastY)/dt);
      lastY=s.clientY;lastT=t;
      r=reach(s);
      travel=Math.max(travel,r.dist-startDist);
    }
    target={x:r.x,y:r.y};
    setTaut(travel>=pullLimit()*.58);
    wake();
    return r;
  };

  const fire=()=>{
    if(!dragging)return;
    tail.px=tail.x;tail.py=tail.y-18;
    letGo();
    toggleTheme();
  };

  bead.addEventListener('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    e.preventDefault();
    const r=reach(e);
    grabId=e.pointerId;dragging=true;pointerType=e.pointerType||'mouse';
    startDist=r.dist;startY=lastY=e.clientY;startT=lastT=e.timeStamp;
    peakVy=0;travel=0;
    bead.setPointerCapture(grabId);
    target={x:r.x,y:r.y};wake();
  });

  bead.addEventListener('pointermove',e=>{
    if(e.pointerId!==grabId)return;
    sample(e);
    // Crossing the click point operates the switch immediately. Release timing
    // is no longer part of the primary interaction.
    if(travel>=pullLimit())fire();
  });

  const release=(e,cancelled=false)=>{
    if(e.pointerId!==grabId)return;
    if(cancelled){letGo();return}
    sample(e);
    const elapsed=Math.max(1,e.timeStamp-startT);
    const averageVy=(e.clientY-startY)/elapsed;
    const yank=travel>=FLICK_MIN&&Math.max(peakVy,averageVy)>=FLICK;
    const tap=travel<TAP_SLOP&&Math.abs(e.clientY-startY)<TAP_SLOP;
    if(travel>=pullLimit()||yank||tap)fire();
    else letGo();
  };
  bead.addEventListener('pointerup',e=>release(e));
  bead.addEventListener('pointercancel',e=>release(e,true));
  bead.addEventListener('lostpointercapture',()=>{if(dragging)letGo()});

  bead.addEventListener('keydown',e=>{
    if(e.key!==' '&&e.key!=='Enter')return;
    e.preventDefault();
    if(e.repeat)return;
    tail.py=tail.y; tail.y+=STRETCH*.7;             // a real yank, then it rebounds
    wake(); toggleTheme();
  });

  bead.addEventListener('pointerdown',()=>{
    el.classList.add('is-dragging');
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>
    bead.addEventListener(t,()=>el.classList.remove('is-dragging')));

  addEventListener('resize',()=>{place();wake()});
  draw(); wake();
})();

// Keep the theme hint with the lamp that owns it. This used to arrive in a
// later patch file, which let the old label paint first on every navigation.
(function responsiveLampHint(){
  const sun='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.6"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>';
  const moon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.4 8.4 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"/></svg>';
  const nextTheme=()=>document.documentElement.dataset.theme==='light'?'dark':'light';
  const apply=()=>{
    const label=q('.lamp-label'),bead=q('.lamp-bead');
    if(!label||!bead)return;
    const next=nextTheme(),icon=innerWidth<=640;
    label.classList.toggle('is-icon',icon);
    if(icon)label.innerHTML=next==='light'?sun:moon;
    else label.textContent=innerWidth<=900?'pull or tap':`pull or tap for ${next}`;
    bead.setAttribute('aria-label',`Pull or tap to switch to ${next} mode`);
  };
  apply();
  new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  addEventListener('resize',apply,{passive:true});
  window.visualViewport?.addEventListener('resize',apply,{passive:true});
})();

// Brand marks from simple-icons (CC0), inlined so the footer makes no third-party
// requests. Single path each, uniform 24x24 viewBox.
const ICONS={
  linkedin:'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  youtube:'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  github:'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  x:'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
  instagram:'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  tiktok:'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  facebook:'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  whatsapp:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
  behance:'M16.969 16.927a2.561 2.561 0 0 0 1.901.677 2.501 2.501 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.091 5.091 0 0 1-1.9 2.896 5.292 5.292 0 0 1-3.091.88 5.839 5.839 0 0 1-2.284-.433 4.871 4.871 0 0 1-1.723-1.211 5.657 5.657 0 0 1-1.08-1.874 7.057 7.057 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.313 5.313 0 0 1 5.088-3.604 4.87 4.87 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187ZM6.947 4.084a8.065 8.065 0 0 1 1.928.198 4.29 4.29 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.506 3.506 0 0 1-.506 1.961 3.726 3.726 0 0 1-1.503 1.287 3.588 3.588 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.593 4.593 0 0 1-.423 2.032 3.945 3.945 0 0 1-1.163 1.413 5.114 5.114 0 0 1-1.683.807 7.135 7.135 0 0 1-1.928.259H0V4.084h6.947Zm-.235 12.9c.308.004.616-.029.916-.099a2.18 2.18 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.618 2.618 0 0 0-1.696-.505h-3.54v4.279h3.471Zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.336 2.336 0 0 0-1.163.259 2.474 2.474 0 0 0-.738.62 2.359 2.359 0 0 0-.396.792c-.074.239-.12.485-.137.734h4.769a3.239 3.239 0 0 0-.679-1.785l-.002-.001Zm-13.813-.648a2.254 2.254 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.916 1.916 0 0 0-.178-.891 1.298 1.298 0 0 0-.495-.533 1.851 1.851 0 0 0-.711-.274 3.966 3.966 0 0 0-.835-.073H3.241v3.631h3.293v-.014ZM21.62 5.122h-5.976v1.527h5.976V5.122Z',
  dribbble:'M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z',
  upwork:'M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.22-1.834-2.148-4.036-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.548-1.405-.002-2.543-1.143-2.545-2.548V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z'
};
const SOCIALS=[
  ['linkedin','LinkedIn','https://www.linkedin.com/in/abatchan/'],
  ['github','GitHub','https://github.com/AbatChan'],
  ['x','X','https://x.com/abat_chan'],
  ['instagram','Instagram','https://www.instagram.com/realabatchan/'],
  ['tiktok','TikTok','https://www.tiktok.com/@realabatchan'],
  ['youtube','YouTube','https://www.youtube.com/@abatchan'],
  ['facebook','Facebook','https://www.facebook.com/abat.chan.2025'],
  ['behance','Behance','https://www.behance.net/abatchan'],
  ['dribbble','Dribbble','https://dribbble.com/abatchan'],
  ['upwork','Upwork','https://www.upwork.com/freelancers/abatchan'],
  // wa.me wants the number bare: no plus, spaces, or dashes.
  ['whatsapp','WhatsApp','https://wa.me/2347041857921']
];
// The dashboard can override these. A slug with no href is hidden, and a slug
// with no icon is dropped rather than rendered as an empty chip. The list above
// stays the fallback, so a missing or broken setting cannot empty the footer.
let socialLinks=SOCIALS;
window.setSocialLinks=rows=>{
  if(!Array.isArray(rows))return;
  const next=rows
    .map(row=>Array.isArray(row)?row:[row?.slug,row?.label,row?.href])
    .filter(([slug,,href])=>slug&&href&&ICONS[slug])
    .map(([slug,label,href])=>[slug,label||slug,href]);
  socialLinks=next;
};
const escapeAttr=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const socialRail=()=>socialLinks.map(([slug,label,href])=>
  `<a class="social-chip" href="${escapeAttr(href)}" target="_blank" rel="noreferrer noopener" aria-label="${escapeAttr(label)}" data-tip="${escapeAttr(label)}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICONS[slug]}"/></svg></a>`
).join('');

// Secondary pages live down here as a plain text menu, so the header can stay
// on the five primary destinations.
const FOOTER_WORK=[
  ['/work','all work'],
  ['/bookingkoala','BookingKoala']
];
const FOOTER_NAV=[
  ['/brand','brand'],
  ['/process','process'],
  ['/reviews','reviews'],
  ['/privacy','privacy'],
  ['/terms','terms'],
  ['/contact','contact']
];
const footerWorkMenu=()=>`<details class="footer-submenu">
  <summary>work <span aria-hidden="true"></span></summary>
  <div class="footer-submenu-links">${FOOTER_WORK.map(([href,label])=>
    `<a data-page="${href}" href="${href}">${label}</a>`).join('')}</div>
</details>`;
const footerNav=()=>FOOTER_NAV.map(([href,label])=>
  `${href==='/reviews'?footerWorkMenu():''}<a data-page="${href}" href="${href}">${label}</a>`).join('');

qa('footer').forEach(footer=>{
  footer.innerHTML=`<div class="shell compact-footer">
    <a class="footer-mark" href="/" aria-label="abatchan home">${brandMarkup()}</a>
    <div class="social-rail" aria-label="social profiles">${socialRail()}</div>
    <div class="footer-meta"><a href="mailto:abatchan4@gmail.com">abatchan mail</a><span>&copy; 2026</span></div>
    <nav class="footer-nav" aria-label="More pages">${footerNav()}</nav>
  </div>`;
});
qa('.footer-submenu').forEach(menu=>{
  document.addEventListener('pointerdown',event=>{
    if(menu.open&&!menu.contains(event.target))menu.open=false;
  });
  menu.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&menu.open){
      menu.open=false;
      q('summary',menu)?.focus();
    }
  });
});

// The glass rim. Chrome drops url(#svg-filter) from backdrop-filter, so real
// feDisplacementMap refraction is off the table; instead each strip samples the
// live content behind the bar at its own blur radius and hue offset, which
// colour-splits and smears whatever scrolls underneath at the edges.
const GLASS_EDGES=['t1','t2','b2','b1','l1','r1'];
qa('.site-header,.mobile-tabs').forEach(glass=>{
  if(!glass.querySelector('.glass-edge')){
    const edge=document.createElement('span');
    edge.className='glass-edge';edge.setAttribute('aria-hidden','true');
    edge.innerHTML=GLASS_EDGES.map(c=>`<i class="${c}"></i>`).join('');
    glass.prepend(edge);
  }
  glass.addEventListener('pointermove',e=>{
    const r=glass.getBoundingClientRect();
    glass.style.setProperty('--glass-x',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');
    glass.style.setProperty('--glass-y',((e.clientY-r.top)/r.height*100).toFixed(1)+'%');
  });
  glass.addEventListener('pointerleave',()=>{
    glass.style.removeProperty('--glass-x');glass.style.removeProperty('--glass-y');
  });
});

const updateThemeUI=()=>{
  document.documentElement.dataset.theme=currentTheme;
  renderBrand();
  qa('.lamp-bead').forEach(bead=>{
    const next=currentTheme==='dark'?'light':'dark';
    bead.setAttribute('aria-label',`Switch to ${next} mode`);
    bead.setAttribute('aria-pressed',String(currentTheme==='light'));
    const label=bead.parentElement&&bead.parentElement.querySelector('.lamp-label');
    if(label)label.textContent=`pull or tap for ${next}`;
  });
};
function toggleTheme(){
  currentTheme=currentTheme==='dark'?'light':'dark';
  localStorage.setItem(themeKey,currentTheme);
  updateThemeUI();
}
themeQuery.addEventListener('change',()=>{
  if(localStorage.getItem(themeKey))return;   // an explicit choice outranks the OS
  currentTheme=systemTheme();
  updateThemeUI();
});
updateThemeUI();

// A single glass lens tracks the active nav item and follows hover/focus, the way
// the selected pill behaves in an iOS tab bar.
qa('.desktop-nav').forEach(nav=>{
  if(nav.querySelector('.nav-lens'))return;
  const lens=document.createElement('span');
  lens.className='nav-lens';lens.setAttribute('aria-hidden','true');
  nav.prepend(lens);
  const place=el=>{
    if(!el){lens.style.opacity='0';return}
    lens.style.width=el.offsetWidth+'px';
    lens.style.transform='translateX('+el.offsetLeft+'px)';
    lens.style.opacity='1';
  };
  const settle=()=>place(nav.querySelector('a.active'));
  nav.addEventListener('pointerover',e=>{const a=e.target.closest('a');if(a&&nav.contains(a))place(a)});
  nav.addEventListener('pointerleave',settle);
  nav.addEventListener('focusin',e=>{const a=e.target.closest('a');if(a)place(a)});
  nav.addEventListener('focusout',settle);
  addEventListener('resize',settle);
  requestAnimationFrame(settle);
});

// Sidebar scrollspy on the document pages. Targets are mixed — <h2> on privacy
// and terms, .doc-step and <section> on process — so they are resolved by id
// rather than by selector. The active one is the last target that has passed
// under the header, which is what "the section you are reading" actually means.
qa('.doc-toc').forEach(toc=>{
  const links=qa('a[href^="#"]',toc);
  const targets=links.map(a=>document.getElementById(decodeURIComponent(a.hash.slice(1))))
                     .map((el,i)=>el&&{el,link:links[i]}).filter(Boolean);
  if(!targets.length)return;
  const OFFSET=140;                       // clears the fixed header
  let current=null;
  const settle=()=>{
    let found=targets[0];
    for(const t of targets)if(t.el.getBoundingClientRect().top<=OFFSET)found=t;
    // at the very bottom the last section may never reach the offset
    if(innerHeight+scrollY>=document.documentElement.scrollHeight-2)found=targets[targets.length-1];
    if(found===current)return;
    current=found;
    for(const t of targets)t.link.classList.toggle('active',t===found);
  };
  // a dozen getBoundingClientRect calls is cheap enough to run inline; deferring
  // to requestAnimationFrame just makes the highlight lag behind the scroll
  addEventListener('scroll',settle,{passive:true});
  addEventListener('resize',settle);
  links.forEach(a=>a.addEventListener('click',()=>{
    // paint the click straight away rather than waiting for the smooth scroll
    for(const t of targets)t.link.classList.toggle('active',t.link===a);
    current=targets.find(t=>t.link===a)||current;
  }));
  settle();
});

// ------------------------------------------------------------------ tooltip
// Native title= tooltips are slow, unstyled and inconsistent between systems.
// Anything carrying data-tip gets the site's own instead. One element is
// reused and lives on <body>, so no container can clip it.
const tip=document.createElement('div');
tip.className='tip';tip.setAttribute('role','tooltip');tip.hidden=true;
document.body.appendChild(tip);
let tipFor=null;
const placeTip=el=>{
  const r=el.getBoundingClientRect();
  const t=tip.getBoundingClientRect();
  const below=r.top-t.height-10<8;                 // not enough room above
  tip.classList.toggle('below',below);
  let x=r.left+r.width/2;
  x=Math.min(Math.max(x,t.width/2+8),innerWidth-t.width/2-8);
  tip.style.left=x+'px';
  tip.style.top=(below?r.bottom+10:r.top-t.height-10)+'px';
};
const showTip=el=>{
  const text=el.dataset.tip;
  if(!text)return;
  tipFor=el;tip.hidden=false;tip.textContent=text;
  placeTip(el);
  requestAnimationFrame(()=>{if(tipFor===el){placeTip(el);tip.classList.add('is-on')}});
};
const hideTip=()=>{
  tipFor=null;tip.classList.remove('is-on');
  setTimeout(()=>{if(!tipFor)tip.hidden=true},180);
};
document.addEventListener('pointerover',e=>{
  const el=e.target.closest('[data-tip]');
  if(el&&el!==tipFor)showTip(el);
});
document.addEventListener('pointerout',e=>{
  if(tipFor&&!e.relatedTarget?.closest?.('[data-tip]'))hideTip();
});
document.addEventListener('focusin',e=>{
  const el=e.target.closest('[data-tip]');
  if(el)showTip(el);else hideTip();
});
document.addEventListener('focusout',hideTip);
addEventListener('scroll',()=>{if(tipFor)placeTip(tipFor)},{passive:true});
addEventListener('keydown',e=>{if(e.key==='Escape')hideTip()});

// One public settings request feeds copy, the assistant and announcements.
// A failed request returns null so the complete HTML fallback stays visible.
let publicSettingsPromise;
const loadPublicSettings=()=>{
  if(publicSettingsPromise)return publicSettingsPromise;
  if(!window.sb?.configured?.())return Promise.resolve(null);
  publicSettingsPromise=sb.select('settings','is_public=eq.true&select=key,value')
    .then(rows=>Object.fromEntries((rows||[]).map(row=>[row.key,row.value])))
    .catch(()=>null);
  return publicSettingsPromise;
};

// The footer is built before settings arrive, so the rail is repainted once
// they do. Only when the dashboard actually holds a list — otherwise the
// markup already on the page is the right answer and is left alone.
(async function applySocialLinks(){
  const settings=await loadPublicSettings();
  const rows=settings?.['social.links'];
  if(!Array.isArray(rows))return;
  window.setSocialLinks(rows);
  qa('.social-rail').forEach(rail=>{rail.innerHTML=socialRail()});
  // Search engines and link previews should see the same identity graph as
  // visitors. Without this, changing a handle in the dashboard repaints the
  // footer but leaves every page's JSON-LD pointing at the old profile.
  const sameAs=rows
    .map(row=>Array.isArray(row)?{slug:row[0],href:row[2]}:row)
    .filter(row=>row?.href&&row.slug!=='whatsapp')
    .map(row=>row.href);
  qa('script[type="application/ld+json"]').forEach(tag=>{
    try{
      const data=JSON.parse(tag.textContent);
      const nodes=Array.isArray(data)?data:[data];
      nodes.forEach(node=>{
        const types=[].concat(node?.['@type']||[]);
        if(types.some(type=>['ProfessionalService','Organization','Person'].includes(type))){
          node.sameAs=sameAs;
        }
      });
      tag.textContent=JSON.stringify(data);
    }catch{/* A malformed schema block should not affect the footer. */}
  });
})();

(async function applyPublicCopy(){
  const settings=await loadPublicSettings();
  if(!settings)return;
  // These two values were the original schema seeds. Treat them as an
  // uncustomised placeholder so the stronger launch copy in the HTML wins.
  // Any real dashboard edit still applies immediately.
  const legacyCopy={
    'copy.home.eyebrow':'digital engineering studio',
    'copy.home.sub':'We design and engineer the interfaces, infrastructure, and integrations behind modern digital products.',
    'copy.pricing.website':'$750'
  };
  const targets={
    'copy.home.h1':q('.hero h1'),
    'copy.home.sub':q('.hero-copy'),
    'copy.pricing.website':q('.price-card:nth-child(1) .price'),
    'copy.pricing.platform':q('.price-card:nth-child(2) .price'),
    'copy.pricing.system':q('.price-card:nth-child(3) .price'),
    'copy.contact.email':q('.contact-mail')
  };
  const eyebrow=q('.hero .eyebrow');
  if(eyebrow&&typeof settings['copy.home.eyebrow']==='string'&&settings['copy.home.eyebrow']!==legacyCopy['copy.home.eyebrow']){
    const text=[...eyebrow.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
    if(text)text.nodeValue=settings['copy.home.eyebrow'];
  }
  Object.entries(targets).forEach(([key,el])=>{
    const value=settings[key];
    if(!el||typeof value!=='string'||value===legacyCopy[key])return;
    const small=el.querySelector?.('small');
    if(small){
      const text=[...el.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
      if(text)text.nodeValue=`${value} `;
    }else{
      el.textContent=value;
    }
    if(key==='copy.contact.email')el.href=`mailto:${value}`;
  });
  qa('[data-copy]').forEach(el=>{
    const value=settings[el.dataset.copy];
    if(typeof value!=='string')return;
    el.textContent=value;
    if(el.dataset.copy==='copy.contact.email'&&el.tagName==='A')el.href=`mailto:${value}`;
  });
})();

// ---------------------------------------------------------------- assistant
// The endpoint is server-side so the provider key never reaches the browser.
// Canned answers remain a useful fallback if the endpoint is unavailable.
const ASSISTANT={
  // assistant-v2.js owns the network and replaces the form below on load.
  // This path only runs if that never happens, so it answers from CANNED
  // rather than calling an endpoint whose shape it no longer parses.
  endpoint:null,
  greeting:"Hey, I'm the abatchan guide. I know the work, pricing, process, and how to reach Abat. What are you trying to build?",
  chips:['What do you build?','How much does it cost?','How long does it take?','What can you help with?']
};
const LEGACY_ASSISTANT_GREETING="Hi. Ask me anything about the work, pricing, or how a project runs.";
const ASSISTANT_FALLBACK_ERROR={
  code:'network',
  title:'I lost the connection.',
  message:'Try the question once more. If it keeps happening, Abat is still reachable directly.',
  retryable:true,
  contact:{label:'Contact support',href:'/contact'}
};
const assistantPageContext=()=>{
  const description=document.querySelector('meta[name="description"]')?.content||'';
  const text=(q('main')?.innerText||'').replace(/\s+/g,' ').trim().slice(0,3500);
  return {title:document.title.slice(0,160),description:description.slice(0,320),text};
};
const CANNED=[
  // "pric" not "price", so pricing and prices match too — the words visitors
  // actually type. Same reason "how much" is here.
  [/pric|cost|budget|charge|quote|afford|how much|expensive/i,"Focused landing pages start at $150, platforms at $1,500, and connected systems at $3,500. Those are starting points, not quotes. The real number comes from scope, with the full breakdown on the pricing page."],
  [/how long|timeline|deadline|when/i,"It depends on scope, but work is split into milestones so you see something usable at each one. The process page walks through all five stages."],
  [/what.*(build|do)|services|offer/i,"Connected web and mobile products, automation and workflow systems, APIs and integrations, dashboards, and the infrastructure under them."],
  [/small|tiny|fix|quick/i,"Yes. Small fixes and consultations are quoted separately, usually from $100, and ongoing work is $30/hour when project pricing does not fit."],
  [/hire|available|start|book/i,"I am taking on new projects. Send the problem, the current setup, and the deadline through the contact page."],
  [/what can you help|can you do|your limits|do.?s|don.?ts/i,"I can explain the site, work, pricing, process, and how to start a project. I cannot access accounts, take payments, send messages, write code for visitors, or make binding promises."],
  [/hello|hi|hey|good (morning|afternoon|evening)/i,"Hello. What are you building?"]
];

// assistant-v2.js replaces the form below to stream, which detaches these
// answers with it. Hand them over so a capped or unreachable guide can still
// answer the questions visitors actually ask.
window.ASSISTANT_CANNED=CANNED;

// The assistant's styles are not in styles.css. They were 19KB of rules for a
// panel most visitors never open, and every page waited for them before it
// could paint. They load here instead — started in parallel with the settings
// call this function already waits on, so the launcher costs no extra time and
// is never painted before the rules that position it arrive.
const ASSISTANT_CSS='/assistant.css?v=1';
const loadAssistantStyles=()=>new Promise(resolve=>{
  if(document.querySelector('link[data-assist-css]'))return resolve();
  const link=document.createElement('link');
  link.rel='stylesheet';link.href=ASSISTANT_CSS;link.dataset.assistCss='1';
  // Resolve either way: a missing stylesheet should leave the guide reachable
  // and plain, not remove it from the page.
  link.onload=resolve;link.onerror=resolve;
  document.head.append(link);
});

(async function assistant(){
  if(q('.assist-launch'))return;
  const styles=loadAssistantStyles();
  const settings=await loadPublicSettings();
  if(settings?.['assistant.enabled']===false)return;
  await styles;
  if(typeof settings?.['assistant.greeting']==='string'&&settings['assistant.greeting']!==LEGACY_ASSISTANT_GREETING){
    ASSISTANT.greeting=settings['assistant.greeting'];
  }
  const ICON_CHAT='<svg class="chat" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-2.8-.4L4 21.5l1.4-4.2A8.3 8.3 0 0 1 3.5 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8.5 8.4Z"/></svg>';
  const ICON_CLOSE='<svg class="close" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  const launch=document.createElement('button');
  launch.type='button';launch.className='assist-launch';
  launch.setAttribute('aria-label','Open the assistant');
  launch.setAttribute('aria-expanded','false');
  launch.dataset.tip='Ask about the work';
  launch.innerHTML=ICON_CHAT+ICON_CLOSE;

  const panel=document.createElement('div');
  panel.className='assist-panel';panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','abatchan assistant');panel.setAttribute('aria-modal','false');
  panel.innerHTML=
    '<div class="assist-head">'+
      '<img src="/assets/abatchan-symbol-indigo-tight.svg" alt="" width="504" height="309">'+
      '<div><b>abatchan guide</b><span>site answers, with a human fallback</span></div>'+
      '<i class="assist-dot" aria-hidden="true"></i>'+
    '</div>'+
    '<div class="assist-log" role="log" aria-live="polite"></div>'+
    '<div class="assist-chips">'+ASSISTANT.chips.map(c=>`<button type="button">${c}</button>`).join('')+'</div>'+
    '<form class="assist-form">'+
      '<textarea name="q" rows="1" autocomplete="off" maxlength="1000" placeholder="Ask a question…" aria-label="Your question"></textarea>'+
      '<button class="assist-send" type="submit" aria-label="Send">'+
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.4 2.6 10.9 13.1"/><path d="M21.4 2.6 14.7 21.4l-3.8-8.3-8.3-3.8Z"/></svg>'+
      '</button>'+
    '</form>'+
    '<p class="assist-note">I can explain the site and projects. I cannot access accounts, take payments, or make binding promises.</p>';

  document.body.append(launch,panel);

  const log=q('.assist-log',panel), form=q('.assist-form',panel), input=q('textarea,input',form);
  const chips=q('.assist-chips',panel);
  const history=[];
  let greeted=false,pending=false,lastQuestion='';

  const add=(text,who)=>{
    const el=document.createElement('div');
    el.className='assist-msg '+who;el.textContent=text;
    log.appendChild(el);log.scrollTop=log.scrollHeight;
    return el;
  };
  const ensureGreeting=()=>{
    let el=q('[data-guide-intro="true"]',log);
    if(!el){
      el=document.createElement('div');
      el.className='assist-msg bot assist-intro';
      el.dataset.guideIntro='true';
    }
    el.textContent=ASSISTANT.greeting;
    if(log.firstElementChild!==el)log.prepend(el);
    return el;
  };
  const addError=(issue,question)=>{
    const safe=issue&&typeof issue==='object'?issue:ASSISTANT_FALLBACK_ERROR;
    const el=document.createElement('div');
    el.className='assist-msg bot assist-error';
    el.setAttribute('role','alert');
    const title=document.createElement('b');
    title.textContent=safe.title||ASSISTANT_FALLBACK_ERROR.title;
    const message=document.createElement('span');
    message.textContent=safe.message||ASSISTANT_FALLBACK_ERROR.message;
    const actions=document.createElement('div');
    actions.className='assist-error-actions';
    if(safe.retryable!==false){
      const retry=document.createElement('button');
      retry.type='button';retry.textContent='Try again';
      retry.addEventListener('click',()=>reply(question||lastQuestion));
      actions.appendChild(retry);
    }
    const contact=document.createElement('a');
    contact.href=safe.contact?.href||'/contact';
    contact.textContent=safe.contact?.label||'Contact support';
    actions.appendChild(contact);
    el.append(title,message,actions);
    log.appendChild(el);log.scrollTop=log.scrollHeight;
    return el;
  };
  const thinking=()=>{
    const el=document.createElement('div');
    el.className='assist-typing';el.setAttribute('role','status');
    el.setAttribute('aria-label','abatchan is thinking');
    el.innerHTML='<i></i><i></i><i></i>';
    log.appendChild(el);log.scrollTop=log.scrollHeight;
    return el;
  };
  const reply=async text=>{
    if(pending||!text)return;
    pending=true;lastQuestion=text;
    input.disabled=true;
    q('.assist-send',form).disabled=true;
    log.setAttribute('aria-busy','true');
    const dots=thinking();
    let answer,issue;
    if(ASSISTANT.endpoint){
      try{
        const res=await fetch(ASSISTANT.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({message:text,history:history.slice(-6),page:location.pathname,pageContext:assistantPageContext()})});
        let data={};
        try{data=await res.json()}catch{}
        if(!res.ok||data.error){issue=data.error||ASSISTANT_FALLBACK_ERROR}
        else answer=data.reply;
      }catch{issue=ASSISTANT_FALLBACK_ERROR}
    }else{
      await new Promise(r=>setTimeout(r,420+Math.random()*380));
      answer=(CANNED.find(([re])=>re.test(text))||[])[1];
      if(!answer)issue=ASSISTANT_FALLBACK_ERROR;
    }
    dots.remove();
    if(answer){
      add(answer,'bot');
      history.push(
        {role:'user',content:text},
        {role:'assistant',content:answer}
      );
      if(history.length>8)history.splice(0,history.length-8);
    }else{
      addError(issue,text);
    }
    pending=false;input.disabled=false;
    q('.assist-send',form).disabled=false;
    log.setAttribute('aria-busy','false');
    input.focus();
  };

  const open=on=>{
    panel.classList.toggle('is-open',on);
    launch.classList.toggle('is-open',on);
    launch.setAttribute('aria-expanded',String(on));
    launch.setAttribute('aria-label',on?'Close the assistant':'Open the assistant');
    launch.dataset.tip=on?'Close':'Ask about the work';
    if(on){
      launch.style.setProperty('animation','none');
      if(!greeted){greeted=true;ensureGreeting()}
      setTimeout(()=>input.focus(),260);
    }
  };
  launch.addEventListener('click',()=>open(!panel.classList.contains('is-open')));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('is-open')){open(false);launch.focus()}});
  document.addEventListener('pointerdown',e=>{
    if(!panel.classList.contains('is-open'))return;
    if(!panel.contains(e.target)&&!launch.contains(e.target))open(false);
  });

  const ask=text=>{
    if(!text.trim()||pending)return;
    add(text.trim(),'me');
    chips.hidden=true;
    input.value='';
    reply(text.trim());
  };
  form.addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
  chips.addEventListener('click',e=>{
    const b=e.target.closest('button');if(b)ask(b.textContent);
  });
})();

// ------------------------------------------------------------- managed work
// A successful empty result means there are no published projects. A network
// failure leaves the authored HTML cards in place as the resilient fallback.
// Category order and labels for the grouped work page. build/prerender.mjs
// holds the same table: it writes these sections into the HTML and this
// rebuilds them from Supabase a moment later, so if the two disagree on order
// or wording the page visibly reshuffles after it loads.
const WORK_CATEGORIES=[
  ['product','products'],
  ['platform','platforms'],
  ['web','web development'],
  ['product-design','product design'],
  ['branding','branding'],
  ['automation','automation'],
  ['concept','concepts']
];
// Past this many projects the page opens on a first batch with a "load more".
// Both numbers are repeated in build/prerender.mjs.
const WORK_PAGINATE_FROM=20;
const WORK_PAGE_SIZE=12;

(async function managedWork(){
  const groups=q('body[data-page="work"] .work-groups')||(
    /\/work(?:\.html)?$/.test(location.pathname.replace(/\/+$/,''))?q('.work-groups'):null
  );
  if(!groups)return;
  groups.dataset.loadingWork='true';
  groups.setAttribute('aria-busy','true');
  const fallbackVisuals=new Map(qa('.work-card',groups).map(card=>[
    q('.card-info h3',card)?.textContent.trim().toLowerCase(),
    q('.card-visual',card)?.cloneNode(true)
  ]).filter(([title,visual])=>title&&visual));
  const bar=q('.filter-bar');
  // Queried live rather than captured: the bar is rebuilt whenever the set of
  // categories changes, so a stale list would leave dead buttons wired up.
  const filters=()=>qa('[data-filter]',bar||document);
  const moreWrap=q('[data-work-more]');
  const moreBtn=q('[data-work-more-btn]');
  let shown=Infinity;

  const activeFilter=()=>filters().find(b=>b.classList.contains('active'))?.dataset.filter||'all';

  // One pass owns what is on screen: the chosen category first, then how much
  // of it has been revealed. Keeping both in one place means a filter change
  // and a "load more" can never disagree about which cards are showing.
  const applyView=()=>{
    const filter=activeFilter();
    let seen=0,total=0;
    qa('.work-group',groups).forEach(section=>{
      const inCategory=filter==='all'||section.dataset.group===filter;
      let visibleHere=0;
      qa('.work-card',section).forEach(card=>{
        if(!inCategory){card.hidden=true;return}
        total+=1;
        const reveal=seen<shown;
        card.hidden=!reveal;
        if(reveal){seen+=1;visibleHere+=1}
      });
      section.hidden=!visibleHere;
    });
    if(moreWrap)moreWrap.hidden=seen>=total;
    return {seen,total};
  };

  // The bar is rebuilt from what is actually on the page, so a category with
  // nothing in it has no chip at all rather than a chip reading zero, and a
  // category the last build never saw still gets one.
  const syncFilterAvailability=()=>{
    if(!bar)return;
    const keep=activeFilter();
    const present=[...qa('.work-group',groups)].map(section=>({
      slug:section.dataset.group,
      label:q('.work-group-head',section)?.firstChild?.textContent?.trim()||section.dataset.group,
      count:qa('.work-card',section).length
    })).filter(group=>group.count);
    const chip=(slug,label,count,active)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='btn chip'+(active?' active':'');
      button.dataset.filter=slug;
      button.textContent=label;
      const badge=document.createElement('span');
      badge.className='chip-count';
      badge.textContent=count;
      button.append(badge);
      return button;
    };
    const total=qa('.work-card',groups).length;
    const wanted=[['all','all systems',total],...present.map(g=>[g.slug,g.label,g.count])];
    // Only touch the DOM when the bar would actually differ, so a re-sync does
    // not throw away the button the visitor is mid-click on.
    const signature=wanted.map(([s,,c])=>`${s}:${c}`).join('|');
    if(bar.dataset.signature===signature)return;
    bar.dataset.signature=signature;
    bar.replaceChildren(...wanted.map(([slug,label,count])=>
      chip(slug,label,count,slug===keep||(keep==='all'&&slug==='all'))));
    if(!filters().some(b=>b.classList.contains('active')))
      filters()[0]?.classList.add('active');
  };

  const resetPaging=()=>{
    const total=qa('.work-card',groups).length;
    shown=total>=WORK_PAGINATE_FROM?WORK_PAGE_SIZE:Infinity;
  };

  syncFilterAvailability();
  resetPaging();
  applyView();

  // Delegated, because syncFilterAvailability replaces the buttons whenever the
  // categories change and per-button listeners would go with them.
  bar?.addEventListener('click',event=>{
    const button=event.target.closest('[data-filter]');
    if(!button||!bar.contains(button))return;
    filters().forEach(other=>other.classList.toggle('active',other===button));
    resetPaging();
    applyView();
  });
  moreBtn?.addEventListener('click',()=>{
    shown+=WORK_PAGE_SIZE;
    const {seen}=applyView();
    // Move focus to the first newly revealed card so the keyboard and a screen
    // reader land on the new work rather than staying on a button that may
    // have just disappeared.
    const cards=qa('.work-card',groups).filter(card=>!card.hidden);
    cards[Math.max(0,seen-WORK_PAGE_SIZE)]?.querySelector('h3')?.focus?.();
  });
  const settle=()=>{
    delete groups.dataset.loadingWork;
    groups.removeAttribute('aria-busy');
  };
  if(!window.sb?.configured?.()){settle();return}
  let rows;
  try{
    rows=await sb.select('work_items','published=eq.true&select=*&order=position.asc,created_at.asc');
  }catch{settle();return}
  groups.replaceChildren();
  if(!rows.length){
    filters().forEach(button=>{button.hidden=button.dataset.filter!=='all'});
    if(moreWrap)moreWrap.hidden=true;
    const empty=document.createElement('p');
    empty.className='work-empty';
    empty.textContent='New work is being prepared. Check back soon.';
    groups.append(empty);
    settle();
    return;
  }
  // Same buckets and order the build used, so replacing its markup with this
  // does not move anything.
  const buckets=new Map(WORK_CATEGORIES.map(([slug,label])=>[slug,{slug,label,items:[]}]));
  const spare={slug:'other',label:'more work',items:[]};
  rows.forEach(item=>{(buckets.get(item.category)||spare).items.push(item)});
  const ordered=[...buckets.values(),spare].filter(group=>group.items.length);
  const gridFor=new Map();
  ordered.forEach(group=>{
    const section=document.createElement('section');
    section.className='work-group';
    section.dataset.group=group.slug;
    const head=document.createElement('h2');
    head.className='work-group-head';
    head.textContent=group.label;
    const count=document.createElement('span');
    count.className='work-group-count';
    count.textContent=group.items.length;
    head.append(count);
    const inner=document.createElement('div');
    inner.className='work-grid';
    section.append(head,inner);
    groups.append(section);
    group.items.forEach(item=>gridFor.set(item,inner));
  });
  ordered.flatMap(group=>group.items).forEach(item=>{
    const card=document.createElement('article');
    card.className='work-card reveal visible'+(item.featured?' is-featured':'');
    card.dataset.type=item.category||'product';
    if(item.slug)card.id='work-'+item.slug;
    // Featured status is content metadata. The page grid owns card sizing, so
    // a database refresh cannot briefly expand this card to an old layout.
    const fallbackVisual=fallbackVisuals.get(String(item.title||'').trim().toLowerCase());
    const visual=fallbackVisual||document.createElement('div');
    if(!fallbackVisual)visual.className='card-visual managed';
    if(item.image_path){
      // A database upload owns the visual. Clear any authored fallback image
      // first so matching titles never render two full-height images at once.
      visual.replaceChildren();
      visual.className='card-visual managed';
      const img=document.createElement('img');
      img.src=sb.imageUrl('work',item.image_path,1024);
      img.srcset=[640,1024,1600].map(w=>`${sb.imageUrl('work',item.image_path,w)} ${w}w`).join(', ');
      img.sizes='(max-width:900px) 100vw, 620px';
      img.alt=item.image_alt||'';
      img.loading='lazy';
      img.width=1600;
      img.height=1000;
      img.className='work-art';
      visual.append(img);
    }
    const info=document.createElement('div');
    info.className='card-info';
    const meta=document.createElement('div');
    meta.className='card-meta';
    const kicker=document.createElement('span');
    kicker.textContent=item.kicker||item.category||'project';
    const status=document.createElement('span');
    status.textContent=item.status||'selected work';
    meta.append(kicker,status);
    const title=document.createElement('h3');
    title.textContent=item.title;
    const summary=document.createElement('p');
    summary.textContent=item.summary||'';
    info.append(meta,title,summary);
    if(item.link_url&&/^(https:\/\/|\/)/.test(item.link_url)){
      const link=document.createElement('a');
      link.className='btn sm';
      link.textContent='view project ↗';
      link.href=item.link_url;
      if(/^https:\/\//.test(item.link_url)){link.target='_blank';link.rel='noopener noreferrer'}
      info.append(link);
    }
    card.append(visual,info);
    gridFor.get(item).append(card);
  });
  syncFilterAvailability();
  resetPaging();
  applyView();
  settle();
})();

// ------------------------------------------------------------- what's new
// Announcements come from the dashboard (settings key "news.items"), with this
// list as the fallback so the site still works before Supabase is connected.
// One card at a time; dismissing writes the id so that visitor never sees it
// again. A "soon" item is an upcoming-work notice rather than a shipped one.
const NEWS_FALLBACK=[
  {
    id:'2026-07-brand-and-assistant',
    tag:"what's new",
    title:'Brand page, process, and an assistant',
    body:'The full brand system with downloadable lockups is up, along with how projects actually run. There is also a chat bubble now if you would rather ask than read.',
    href:'/brand',
    cta:'see the brand page'
  }
];

async function loadNews(){
  const settings=await loadPublicSettings();
  if(!settings)return NEWS_FALLBACK;
  const list=settings['news.items'];
  return Array.isArray(list)?list:NEWS_FALLBACK;
}

(async function news(){
  const list=await loadNews();
  const item=list.find(n=>n&&n.id&&!localStorage.getItem('abatNews:'+n.id));
  if(!item)return;

  const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const el=document.createElement('aside');
  const href=typeof item.href==='string'&&/^(https:\/\/|\/)/.test(item.href)?item.href:'';
  el.className='news'+(item.soon?' soon':'');
  el.setAttribute('role','status');
  el.setAttribute('aria-label',"What's new");
  el.innerHTML=
    '<button class="news-x" type="button" aria-label="Dismiss">'+
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'+
    `<span class="news-tag">${esc(item.tag||(item.soon?'coming soon':"what's new"))}</span>`+
    `<h3>${esc(item.title)}</h3><p>${esc(item.body)}</p>`+
    (href?`<div class="news-foot"><a class="btn primary" href="${esc(href)}">${esc(item.cta||'take a look')} <span class="arrow">↗</span></a></div>`:'');
  document.body.appendChild(el);

  const dismiss=()=>{
    localStorage.setItem('abatNews:'+item.id,'1');
    el.classList.remove('is-on');
    setTimeout(()=>el.remove(),420);
  };
  q('.news-x',el).addEventListener('click',dismiss);
  el.querySelector('a')?.addEventListener('click',()=>localStorage.setItem('abatNews:'+item.id,'1'));

  setTimeout(()=>el.classList.add('is-on'),1400);
})();

const transition=q('.page-transition'),navigationKey='abatNavigationPending';
// A solid indigo sheet sliding up reads as a loading block. Five columns that
// stagger, with the symbol landing in the middle, reads as a transition.
if(transition&&!transition.querySelector('i')){
  transition.innerHTML='<i></i><i></i><i></i><i></i><i></i>'+
    '<img class="pt-mark" src="/assets/abatchan-symbol-white-tight.svg" alt="" width="504" height="309" aria-hidden="true">';
}
if(transition&&document.documentElement.classList.contains('nav-arriving')){
  // navigation-boot.js makes the destination fully covered before first paint.
  // With that stable starting frame in place, the columns can descend cleanly
  // to reveal the new page without the old half-painted staircase flash.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    transition.classList.add('is-arriving');
    document.documentElement.classList.remove('nav-arriving');
    setTimeout(()=>transition.classList.remove('is-arriving'),650);
  }));
}
const intro=q('.intro');
if(intro){
  const video=q('video',intro),skip=q('.skip',intro);
  let closed=false;
  const close=()=>{
    if(closed)return;closed=true;
    intro.classList.add('hidden');sessionStorage.setItem('abatIntro','1');
    setTimeout(()=>intro.remove(),420);
  };
  if(sessionStorage.getItem('abatIntro')||matchMedia('(prefers-reduced-motion: reduce)').matches)close();
  else{
    video?.play().catch(close);
    video?.addEventListener('ended',close,{once:true});
    skip?.addEventListener('click',close,{once:true});
    // The asset is deliberately cut to a complete 1.35-second sequence. This
    // timeout is only a safety exit if media playback stalls; normal playback
    // closes on `ended`, and visitors can still skip immediately.
    setTimeout(close,2600);
  }
}

// Scroll reveals hide only what the visitor has not reached yet.
//
// Every .reveal used to start at opacity 0 and wait for this file to load and
// parse before anything appeared. For a section far down the page that is the
// point; for the heading and copy already on screen it was pure delay, and it
// was what Largest Contentful Paint was measuring — the text sat in the HTML,
// painted, and invisible for seconds.
//
// So nothing is hidden by the stylesheet any more. Elements below the fold are
// hidden here, at the moment we can tell where they are, and revealed on
// approach as before. Anything already on screen is simply left alone.
const observer=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting)return;
  e.target.classList.remove('pending');
  e.target.classList.add('visible');
  observer.unobserve(e.target);
}),{threshold:.12});
const hideUntilSeen=e=>{
  if(e.classList.contains('visible'))return;
  if(e.getBoundingClientRect().top<innerHeight)return;
  e.classList.add('pending');
  observer.observe(e);
};
qa('.reveal').forEach(hideUntilSeen);
// CMS-rendered sections arrive after this runs, so they need the same observer
// rather than a second one with its own threshold.
window.__abatchanObserveReveal=hideUntilSeen;
document.addEventListener('mousemove',e=>{const light=q('.cursor-light');if(light){light.style.left=e.clientX+'px';light.style.top=e.clientY+'px'}});
// System map. Connectors are measured from the real node boxes rather than
// drawn at fixed angles, so they always terminate on the node edge instead of
// crossing the middle at random. Redrawn on resize and when fonts settle.
qa('[data-sysmap]').forEach(map=>{
  const plane=q('.sysmap-plane',map)||map;
  const core=q('.sysmap-core',map);
  const nodes=qa('.sysmap-node',map);
  // a node can opt out of being wired up, which the 404 page uses
  const linked=nodes.filter(n=>!n.hasAttribute('data-unlinked'));
  if(!core||!nodes.length)return;
  let svg=q('.sysmap-links',map);
  if(!svg){
    svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','sysmap-links');
    svg.setAttribute('aria-hidden','true');
    plane.insertBefore(svg,plane.firstChild);
  }
  // stop the line short of each box so it meets the edge, not the label
  const edge=(from,to,box)=>{
    const dx=to.x-from.x, dy=to.y-from.y;
    const len=Math.hypot(dx,dy)||1;
    const inset=Math.min(box.w/2,box.h/2)+8;
    return {x:from.x+dx/len*inset, y:from.y+dy/len*inset};
  };
  const draw=()=>{
    const r=map.getBoundingClientRect();
    if(!r.width)return;
    svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
    const centreOf=el=>{const b=el.getBoundingClientRect();
      return {x:b.left-r.left+b.width/2, y:b.top-r.top+b.height/2, w:b.width, h:b.height}};
    const c=centreOf(core);
    svg.textContent='';
    linked.forEach(n=>{
      const p=centreOf(n);
      const a=edge(p,c,p), z=edge(c,p,c);
      // bow the line slightly so four links do not read as one X through the middle
      const mx=(a.x+z.x)/2, my=(a.y+z.y)/2;
      const nx=-(z.y-a.y), ny=(z.x-a.x);
      const nl=Math.hypot(nx,ny)||1, bow=Math.min(46,Math.hypot(z.x-a.x,z.y-a.y)*.16);
      const d=`M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${(mx+nx/nl*bow).toFixed(1)} ${(my+ny/nl*bow).toFixed(1)} ${z.x.toFixed(1)} ${z.y.toFixed(1)}`;
      const trace=document.createElementNS('http://www.w3.org/2000/svg','path');
      trace.setAttribute('d',d);trace.setAttribute('class','trace');
      const flow=document.createElementNS('http://www.w3.org/2000/svg','path');
      flow.setAttribute('d',d);
      flow.style.animationDelay=(linked.indexOf(n)*-.5)+'s';
      svg.append(trace,flow);
    });
  };
  draw();
  addEventListener('resize',draw);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(draw);
  addEventListener('load',draw);

  // parallax tilt, driven through custom properties so CSS owns the transform
  const host=map.closest('.system-stage')||map;
  host.addEventListener('pointermove',e=>{
    const r=host.getBoundingClientRect();
    plane.style.setProperty('--ry',(((e.clientX-r.left)/r.width-.5)*13).toFixed(2)+'deg');
    plane.style.setProperty('--rx',(((e.clientY-r.top)/r.height-.5)*-11).toFixed(2)+'deg');
  });
  host.addEventListener('pointerleave',()=>{
    plane.style.removeProperty('--rx');plane.style.removeProperty('--ry');
  });
});

const internal=h=>!!h&&h.startsWith('/')&&!h.startsWith('//');
qa('a[href]').forEach(a=>a.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0||a.target==='_blank')return;const href=a.getAttribute('href');if(!internal(href)||href===location.pathname)return;e.preventDefault();if(!transition){location.assign(href);return}try{sessionStorage.setItem(navigationKey,'1')}catch{}transition.classList.add('is-leaving');setTimeout(()=>location.assign(href),500)}));

// Real-device mobile viewport stabilizer. It belongs with the shared site
// shell instead of arriving after the shell in a separate corrective script.
(function mobileViewport(){
  const isAdmin=/\/admin(?:\.html)?$/.test(location.pathname);
  const root=document.documentElement;
  const scroller=document.scrollingElement||root;
  const viewport=window.visualViewport;
  let frame=0,settleTimer=0,lastWidth=0,lastHeight=0;

  const realPageEnd=()=>{
    const footer=q('body > footer');
    if(!footer)return scroller.scrollHeight;
    const rect=footer.getBoundingClientRect();
    return Math.max(0,Math.round(rect.bottom+scroller.scrollTop));
  };
  const clampToContent=()=>{
    if(isAdmin||innerWidth>900||document.body.classList.contains('assist-sheet-open'))return;
    const height=Math.round(viewport?.height||root.clientHeight||innerHeight);
    const max=Math.max(0,realPageEnd()-height);
    if(scroller.scrollTop>max+2){scroller.scrollTop=max;window.scrollTo(0,max)}
  };
  const queueClamp=(delay=90)=>{
    if(isAdmin)return;
    clearTimeout(settleTimer);
    settleTimer=setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(clampToContent)),delay);
  };
  const settleClamp=()=>{
    queueClamp(30);
    setTimeout(()=>queueClamp(80),140);
    setTimeout(()=>queueClamp(80),420);
  };
  const measure=()=>{
    frame=0;
    const width=Math.round(viewport?.width||root.clientWidth||innerWidth);
    const height=Math.round(viewport?.height||root.clientHeight||innerHeight);
    root.style.setProperty('--visual-width',width+'px');
    root.style.setProperty('--visual-height',height+'px');
    root.style.setProperty('--visual-top',Math.round(viewport?.offsetTop||0)+'px');
    root.style.setProperty('--visual-left',Math.round(viewport?.offsetLeft||0)+'px');
    if(width!==lastWidth||height!==lastHeight){
      lastWidth=width;lastHeight=height;
      dispatchEvent(new Event('resize'));
    }
    queueClamp();
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure)};
  addEventListener('resize',schedule,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(()=>{schedule();settleClamp()},80),{passive:true});
  addEventListener('pageshow',()=>{schedule();settleClamp()},{passive:true});
  addEventListener('touchend',settleClamp,{passive:true});
  addEventListener('scrollend',settleClamp,{passive:true});
  viewport?.addEventListener('resize',()=>{schedule();settleClamp()},{passive:true});
  viewport?.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){schedule();settleClamp()}});
  schedule();
})();
const path=location.pathname.replace(/\.html$/,'').replace(/\/index$/,'/').replace(/(.)\/$/,'$1')||'/';
qa('[data-page]').forEach(a=>{
  const active=a.dataset.page===path;
  a.classList.toggle('active',active);
  if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
});
qa('.btn.chip').forEach(btn=>{
  btn.setAttribute('aria-pressed',String(btn.classList.contains('active')));
  btn.addEventListener('click',()=>{
    qa('.btn.chip').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});
    btn.classList.add('active');btn.setAttribute('aria-pressed','true');
    const f=btn.dataset.filter;
    qa('.work-card').forEach(card=>card.style.display=(f==='all'||card.dataset.type===f)?'flex':'none');
  });
});
const form=q('#project-form');
if(form)form.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(form);const subject=encodeURIComponent(`Project enquiry: ${d.get('name')}`);const body=encodeURIComponent(`Name: ${d.get('name')}\nEmail: ${d.get('email')}\nProject type: ${d.get('type')}\n\n${d.get('message')}`);location.href=`mailto:abatchan4@gmail.com?subject=${subject}&body=${body}`});
