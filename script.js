const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];

// Keep the visible copy natural and avoid long-dash punctuation in older static pages.
document.title=document.title.replaceAll('—','|');
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
const textNodes=[];
while(walker.nextNode())textNodes.push(walker.currentNode);
textNodes.forEach(node=>{if(node.nodeValue.includes('—'))node.nodeValue=node.nodeValue.replaceAll('—',', ')});

// Use the horizontal logo in every header. Vector, so it stays sharp at any
// density and can't pick up the aspect distortion the old raster export had.
qa('.site-header .brand').forEach(brand=>{
  brand.innerHTML='<img src="/assets/abatchan-logo-horizontal-indigo-symbol-white-text.svg" alt="abatchan">';
});

// Inject shared visual and navigation states across every existing page.
const transitionStyles=document.createElement('style');
transitionStyles.textContent=`
.site-header .brand img{width:146px!important;height:auto!important;display:block!important;object-fit:contain!important;aspect-ratio:auto!important}
.intro{background:#0c0c0c!important;overflow:hidden!important}
.intro video{position:absolute!important;inset:0!important;width:100vw!important;height:100vh!important;max-width:none!important;object-fit:cover!important;background:#0c0c0c!important;display:block!important}
.skip{z-index:2}
.page-transition{transition:none!important;animation:none!important;background:#6366f1!important;transform:scaleY(0);transform-origin:bottom;will-change:transform}
.page-transition.is-leaving{transform:scaleY(1);transition:transform .42s cubic-bezier(.2,.75,.2,1)!important;transform-origin:bottom;pointer-events:auto}
.page-transition.is-arriving{transform:scaleY(1);transform-origin:top;pointer-events:auto}
.page-transition.is-loaded{transform:scaleY(0);transition:transform .52s cubic-bezier(.2,.75,.2,1)!important;transform-origin:top}
@media(max-width:900px){.site-header .brand img{width:118px!important}}
@media (prefers-reduced-motion:reduce){.page-transition{transition:none!important}.page-transition.is-loaded{transform:scaleY(0)}}`;
document.head.appendChild(transitionStyles);

const transition=q('.page-transition');
const navigationKey='abatNavigationPending';
if(sessionStorage.getItem(navigationKey)==='1'&&transition){
  transition.classList.add('is-arriving');
  const revealPage=()=>{
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      transition.classList.add('is-loaded');
      sessionStorage.removeItem(navigationKey);
      setTimeout(()=>transition.classList.remove('is-arriving','is-loaded'),600);
    }));
  };
  if(document.readyState==='complete')revealPage();
  else window.addEventListener('load',revealPage,{once:true});
}

const intro=q('.intro');
if(intro){
  const video=q('video',intro),skip=q('.skip',intro);
  const close=()=>{intro.classList.add('hidden');sessionStorage.setItem('abatIntro','1');setTimeout(()=>intro.remove(),800)};
  if(sessionStorage.getItem('abatIntro'))close();
  else{
    video?.play().catch(()=>{});
    video?.addEventListener('ended',close);
    skip?.addEventListener('click',close);
    setTimeout(close,6500);
  }
}

const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.12});
qa('.reveal').forEach(e=>observer.observe(e));

document.addEventListener('mousemove',e=>{const light=q('.cursor-light');if(light){light.style.left=e.clientX+'px';light.style.top=e.clientY+'px'}});

const stage=q('.system-stage'),core=q('.system-core');
if(stage&&core){
  stage.addEventListener('mousemove',e=>{const r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;core.style.transform=`rotateY(${x*12}deg) rotateX(${-y*10}deg)`});
  stage.addEventListener('mouseleave',()=>core.style.transform='');
}

const internal=h=>!!h&&h.startsWith('/')&&!h.startsWith('//');
qa('a[href]').forEach(a=>a.addEventListener('click',e=>{
  if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0||a.target==='_blank')return;
  const href=a.getAttribute('href');
  if(!internal(href)||href===location.pathname)return;
  e.preventDefault();
  sessionStorage.setItem(navigationKey,'1');
  transition?.classList.add('is-leaving');
  setTimeout(()=>location.assign(href),430);
}));

const path=location.pathname.replace(/\.html$/,'').replace(/\/index$/,'/').replace(/(.)\/$/,'$1')||'/';
qa('[data-page]').forEach(a=>a.classList.toggle('active',a.dataset.page===path));

qa('.filter-btn').forEach(btn=>btn.addEventListener('click',()=>{
  qa('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const f=btn.dataset.filter;
  qa('.work-card').forEach(card=>card.style.display=(f==='all'||card.dataset.type===f)?'flex':'none');
}));

const form=q('#project-form');
if(form)form.addEventListener('submit',e=>{
  e.preventDefault();
  const d=new FormData(form);
  const subject=encodeURIComponent(`Project enquiry: ${d.get('name')}`);
  const body=encodeURIComponent(`Name: ${d.get('name')}\nEmail: ${d.get('email')}\nProject type: ${d.get('type')}\n\n${d.get('message')}`);
  location.href=`mailto:abatchan4@gmail.com?subject=${subject}&body=${body}`;
});