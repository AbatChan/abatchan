const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];

document.title=document.title.replaceAll('—','|');
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
const textNodes=[];
while(walker.nextNode())textNodes.push(walker.currentNode);
textNodes.forEach(node=>{if(node.nodeValue.includes('—'))node.nodeValue=node.nodeValue.replaceAll('—',', ')});

const themeKey='abatchanTheme';
const systemTheme=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
const savedTheme=localStorage.getItem(themeKey);
let currentTheme=savedTheme||systemTheme;

const renderBrand=()=>{
  qa('.site-header .brand').forEach(brand=>{
    brand.innerHTML=currentTheme==='light'
      ?'<img class="brand-symbol" src="/assets/abatchan-symbol-indigo.svg" alt=""><span>abatchan</span>'
      :'<img class="brand-lockup" src="/assets/abatchan-logo-horizontal-indigo-symbol-white-text.svg" alt="abatchan">';
  });
};

document.documentElement.dataset.theme=currentTheme;
renderBrand();

qa('.desktop-nav').forEach(nav=>{
  if(!nav.querySelector('[data-page="/pricing"]')){
    const link=document.createElement('a');
    link.dataset.page='/pricing';
    link.href='/pricing';
    link.textContent='pricing';
    const contact=nav.querySelector('[data-page="/contact"]');
    nav.insertBefore(link,contact||null);
  }
});
qa('.mobile-tabs').forEach(nav=>{
  if(!nav.querySelector('[data-page="/pricing"]')){
    const link=document.createElement('a');
    link.dataset.page='/pricing';
    link.href='/pricing';
    link.innerHTML='<b>◇</b>pricing';
    const contact=nav.querySelector('[data-page="/contact"]');
    nav.insertBefore(link,contact||null);
  }
});

qa('.header-actions').forEach(actions=>{
  if(actions.querySelector('.theme-toggle'))return;
  const button=document.createElement('button');
  button.type='button';
  button.className='theme-toggle';
  button.setAttribute('aria-label','Switch color theme');
  button.setAttribute('title','Switch color theme');
  button.innerHTML='<span class="theme-icon" aria-hidden="true"></span>';
  actions.prepend(button);
});

const socialLinks={github:'https://github.com/AbatChan'};
qa('footer').forEach(footer=>{
  footer.innerHTML=`
    <div class="shell compact-footer">
      <a class="footer-mark" href="/" aria-label="abatchan home">
        <img src="/assets/abatchan-logo-horizontal-indigo-symbol-white-text.svg" alt="abatchan">
      </a>
      <div class="social-rail" aria-label="social profiles">
        <a href="${socialLinks.github}" target="_blank" rel="noreferrer" aria-label="GitHub">GH</a>
        <button type="button" data-social="x" aria-label="X link pending">X</button>
        <button type="button" data-social="instagram" aria-label="Instagram link pending">IG</button>
        <button type="button" data-social="facebook" aria-label="Facebook link pending">FB</button>
        <button type="button" data-social="behance" aria-label="Behance link pending">BE</button>
        <button type="button" data-social="dribbble" aria-label="Dribbble link pending">DR</button>
        <button type="button" data-social="upwork" aria-label="Upwork link pending">UP</button>
        <button type="button" data-social="fiverr" aria-label="Fiverr link pending">FI</button>
        <button type="button" data-social="whatsapp" aria-label="WhatsApp link pending">WA</button>
      </div>
      <div class="footer-meta">
        <a href="mailto:abatchan4@gmail.com">abatchan mail</a>
        <span>© 2026</span>
      </div>
    </div>`;
});

const transitionStyles=document.createElement('style');
transitionStyles.textContent=`
.site-header .brand{min-width:146px}.site-header .brand-lockup{width:146px!important;height:auto!important;display:block!important;object-fit:contain!important;aspect-ratio:auto!important}.site-header .brand-symbol{width:31px!important;height:31px!important;display:block!important;object-fit:contain!important}.site-header .brand span{font-weight:650;font-size:22px;letter-spacing:-.045em;color:var(--paper)}
.theme-toggle{width:42px;height:42px;border-radius:13px;border:1px solid var(--line);background:transparent;color:var(--paper);display:grid;place-items:center;cursor:pointer;transition:transform .22s,background .22s,border-color .22s}.theme-toggle:hover{transform:translateY(-2px);background:rgba(99,102,241,.12);border-color:rgba(99,102,241,.55)}.theme-icon{width:17px;height:17px;border-radius:50%;display:block;background:currentColor;box-shadow:-6px -5px 0 -4px var(--ink),6px -5px 0 -4px var(--ink),0 7px 0 -4px var(--ink)}
html[data-theme="light"]{--ink:#f4f4f1;--paper:#151519;--muted:#66676d;--line:rgba(21,21,25,.14);--panel:#ffffff;color-scheme:light}html[data-theme="light"] body{background:#f4f4f1;color:#151519}html[data-theme="light"] .grid-bg{opacity:.12}html[data-theme="light"] .site-header{background:rgba(244,244,241,.78);box-shadow:0 18px 60px rgba(27,28,34,.1)}html[data-theme="light"] .desktop-nav a:hover,html[data-theme="light"] .desktop-nav a.active{background:rgba(21,21,25,.08)}html[data-theme="light"] .system-core,html[data-theme="light"] .work-card,html[data-theme="light"] .process-card,html[data-theme="light"] .contact-card,html[data-theme="light"] .pricing-card,html[data-theme="light"] .quote-step,html[data-theme="light"] .faq-item{background:#fff}html[data-theme="light"] .node,html[data-theme="light"] .arch-node{background:#f7f7f4}html[data-theme="light"] .card-visual,html[data-theme="light"] .terminal,html[data-theme="light"] .dashboard{background:#ededeb}html[data-theme="light"] .terminal pre{color:#55575d}html[data-theme="light"] .footer-mark img{filter:brightness(0)}html[data-theme="light"] .social-rail a,html[data-theme="light"] .social-rail button{background:rgba(21,21,25,.025)}html[data-theme="light"] .theme-icon{background:transparent;border:2px solid currentColor;box-shadow:none}html[data-theme="light"] .theme-icon:after{content:"";position:absolute;width:5px;height:5px;border-radius:50%;background:currentColor;transform:translate(4px,-5px)}
.intro{background:#0c0c0c!important;overflow:hidden!important}.intro video{position:absolute!important;left:50%!important;top:50%!important;width:min(30vw,460px)!important;height:auto!important;max-width:460px!important;max-height:30vh!important;transform:translate(-50%,-50%)!important;object-fit:contain!important;background:#0c0c0c!important;display:block!important}.skip{z-index:2}
footer{padding:22px 0 28px!important;border-top:1px solid var(--line)!important}.compact-footer{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:24px}.footer-mark{display:inline-flex;align-items:center}.footer-mark img{display:block;width:118px;height:auto}.social-rail{display:flex;justify-content:center;gap:7px;flex-wrap:wrap}.social-rail a,.social-rail button{width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:rgba(245,245,243,.025);color:var(--muted);display:grid;place-items:center;font:600 10px/1 Geist,Inter,sans-serif;letter-spacing:.03em;transition:transform .22s,background .22s,color .22s,border-color .22s}.social-rail a:hover{transform:translateY(-3px);background:rgba(99,102,241,.14);border-color:rgba(99,102,241,.6);color:var(--paper)}.social-rail button{cursor:not-allowed;opacity:.48}.footer-meta{display:flex;align-items:center;gap:16px;color:var(--muted);font-size:12px;white-space:nowrap}.footer-meta a:hover{color:var(--paper)}
.page-transition{transition:none!important;animation:none!important;background:#6366f1!important;transform:scaleY(0);transform-origin:bottom;will-change:transform}.page-transition.is-leaving{transform:scaleY(1);transition:transform .42s cubic-bezier(.2,.75,.2,1)!important;transform-origin:bottom;pointer-events:auto}.page-transition.is-arriving{transform:scaleY(1);transform-origin:top;pointer-events:auto}.page-transition.is-loaded{transform:scaleY(0);transition:transform .52s cubic-bezier(.2,.75,.2,1)!important;transform-origin:top}
@media(max-width:900px){.site-header .brand{min-width:118px}.site-header .brand-lockup{width:118px!important}.site-header .brand-symbol{width:28px!important;height:28px!important}.site-header .brand span{font-size:19px}.theme-toggle{width:38px;height:38px}.intro video{width:min(52vw,320px)!important;max-height:34vh!important}.compact-footer{grid-template-columns:1fr;text-align:center;justify-items:center;gap:16px}.footer-meta{white-space:normal}.mobile-tabs a{font-size:9px}}
@media(prefers-reduced-motion:reduce){.page-transition{transition:none!important}.page-transition.is-loaded{transform:scaleY(0)}}`;
document.head.appendChild(transitionStyles);

const updateThemeUI=()=>{
  document.documentElement.dataset.theme=currentTheme;
  renderBrand();
  qa('.theme-toggle').forEach(button=>{
    const next=currentTheme==='dark'?'light':'dark';
    button.setAttribute('aria-label',`Switch to ${next} mode`);
    button.setAttribute('title',`Switch to ${next} mode`);
  });
};

qa('.theme-toggle').forEach(button=>button.addEventListener('click',()=>{
  currentTheme=currentTheme==='dark'?'light':'dark';
  localStorage.setItem(themeKey,currentTheme);
  updateThemeUI();
}));
updateThemeUI();

const transition=q('.page-transition');
const navigationKey='abatNavigationPending';
if(sessionStorage.getItem(navigationKey)==='1'&&transition){
  transition.classList.add('is-arriving');
  const revealPage=()=>{requestAnimationFrame(()=>requestAnimationFrame(()=>{transition.classList.add('is-loaded');sessionStorage.removeItem(navigationKey);setTimeout(()=>transition.classList.remove('is-arriving','is-loaded'),600)}))};
  if(document.readyState==='complete')revealPage();else window.addEventListener('load',revealPage,{once:true});
}

const intro=q('.intro');
if(intro){
  const video=q('video',intro),skip=q('.skip',intro);
  const close=()=>{intro.classList.add('hidden');sessionStorage.setItem('abatIntro','1');setTimeout(()=>intro.remove(),800)};
  if(sessionStorage.getItem('abatIntro'))close();
  else{video?.play().catch(()=>{});video?.addEventListener('ended',close);skip?.addEventListener('click',close);setTimeout(close,6500)}
}

const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.12});
qa('.reveal').forEach(e=>observer.observe(e));
document.addEventListener('mousemove',e=>{const light=q('.cursor-light');if(light){light.style.left=e.clientX+'px';light.style.top=e.clientY+'px'}});
const stage=q('.system-stage'),core=q('.system-core');
if(stage&&core){stage.addEventListener('mousemove',e=>{const r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;core.style.transform=`rotateY(${x*12}deg) rotateX(${-y*10}deg)`});stage.addEventListener('mouseleave',()=>core.style.transform='')}

const internal=h=>!!h&&h.startsWith('/')&&!h.startsWith('//');
qa('a[href]').forEach(a=>a.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0||a.target==='_blank')return;const href=a.getAttribute('href');if(!internal(href)||href===location.pathname)return;e.preventDefault();sessionStorage.setItem(navigationKey,'1');transition?.classList.add('is-leaving');setTimeout(()=>location.assign(href),430)}));
const path=location.pathname.replace(/\.html$/,'').replace(/\/index$/,'/').replace(/(.)\/$/,'$1')||'/';
qa('[data-page]').forEach(a=>a.classList.toggle('active',a.dataset.page===path));
qa('.filter-btn').forEach(btn=>btn.addEventListener('click',()=>{qa('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.filter;qa('.work-card').forEach(card=>card.style.display=(f==='all'||card.dataset.type===f)?'flex':'none')}));
const form=q('#project-form');
if(form)form.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(form);const subject=encodeURIComponent(`Project enquiry: ${d.get('name')}`);const body=encodeURIComponent(`Name: ${d.get('name')}\nEmail: ${d.get('email')}\nProject type: ${d.get('type')}\n\n${d.get('message')}`);location.href=`mailto:abatchan4@gmail.com?subject=${subject}&body=${body}`});