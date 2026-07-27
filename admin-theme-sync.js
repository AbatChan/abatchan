// Keep the login gate and dashboard on the same theme selected on the public site.
// Shared brand lockups and glass tokens intentionally mirror the public header/dock.
(function adminThemeSync(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;

  const key='abatchanTheme';
  const query=matchMedia('(prefers-color-scheme: light)');
  const stored=()=>{
    const value=localStorage.getItem(key);
    return value==='light'||value==='dark'?value:null;
  };
  const system=()=>query.matches?'light':'dark';
  const LOCKUP='/assets/abatchan-logo-horizontal-indigo-symbol-';

  const style=document.createElement('style');
  style.textContent=`
    @media(max-width:820px){
      .adm-nav{
        --glass-tint:rgba(13,13,13,.01);
        --glass-blur:8px;
        --glass-ring:rgba(0,0,0,.05);
        --glass-spec:rgba(255,255,255,.05);
        overflow:hidden!important;
        isolation:isolate;
        border:0!important;
        border-radius:22px!important;
        background:var(--glass-tint)!important;
        backdrop-filter:blur(var(--glass-blur)) saturate(220%) brightness(1.07)!important;
        -webkit-backdrop-filter:blur(var(--glass-blur)) saturate(220%) brightness(1.07)!important;
        box-shadow:0 0 0 1px var(--glass-ring),inset 0 1px 0 var(--glass-spec),inset 0 -1px 0 rgba(255,255,255,.08),0 20px 50px rgba(0,0,0,.4)!important;
      }
      .adm-nav>.glass-edge{position:absolute;inset:0;z-index:0;pointer-events:none;display:block!important}
      .adm-nav::after{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;background:radial-gradient(180px 130px at var(--glass-x,50%) var(--glass-y,-35%),rgba(255,255,255,.07),transparent 72%)}
      .adm-nav>:not(.glass-edge){position:relative;z-index:2}
      html[data-theme='light'] .adm-nav{
        --glass-tint:rgba(255,255,255,.005);
        --glass-ring:rgba(21,21,25,.05);
        --glass-spec:rgba(255,255,255,.05);
        box-shadow:0 0 0 1px var(--glass-ring),inset 0 1px 0 var(--glass-spec),0 18px 44px rgba(27,28,34,.16)!important;
      }
      html[data-theme='light'] .adm-nav::after{background:radial-gradient(180px 130px at var(--glass-x,50%) var(--glass-y,-35%),rgba(255,255,255,.16),transparent 72%)}
    }
    @media(prefers-contrast:more) and (max-width:820px){
      .adm-nav{--glass-tint:rgba(13,13,13,.9);--glass-blur:8px}
      html[data-theme='light'] .adm-nav{--glass-tint:rgba(255,255,255,.94)}
      .adm-nav>.glass-edge{display:none!important}
    }
    @media(prefers-reduced-transparency:reduce) and (max-width:820px){
      .adm-nav{--glass-tint:rgba(13,13,13,.97);backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
      html[data-theme='light'] .adm-nav{--glass-tint:rgba(244,244,241,.98)}
      .adm-nav>.glass-edge,.adm-nav::after{display:none!important}
    }
  `;
  document.head.appendChild(style);

  function syncLogos(theme){
    const ink=theme==='light'?'black':'white';
    document.querySelectorAll('.adm-gate img,#sideMark').forEach(img=>{
      const src=`${LOCKUP}${ink}-text.svg`;
      if(img.getAttribute('src')!==src)img.setAttribute('src',src);
    });
  }

  function apply(theme=stored()||system()){
    document.documentElement.dataset.theme=theme;
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=theme==='light'?'#F5F5F3':'#0D0D0D';
    syncLogos(theme);
  }

  function trackGlassPointer(event){
    const nav=document.querySelector('.adm-nav');
    if(!nav||innerWidth>820)return;
    const rect=nav.getBoundingClientRect();
    nav.style.setProperty('--glass-x',`${event.clientX-rect.left}px`);
    nav.style.setProperty('--glass-y',`${event.clientY-rect.top}px`);
  }

  apply();
  addEventListener('pointermove',trackGlassPointer,{passive:true});
  query.addEventListener?.('change',()=>{if(!stored())apply()});
  addEventListener('storage',event=>{if(event.key===key)apply()});
  addEventListener('pageshow',()=>apply(),{passive:true});
})();