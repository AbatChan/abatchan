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
