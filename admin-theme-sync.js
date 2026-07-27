// Keep the login gate and dashboard on the same theme selected on the public site.
(function adminThemeSync(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;

  const key='abatchanTheme';
  const query=matchMedia('(prefers-color-scheme: light)');
  const stored=()=>{
    const value=localStorage.getItem(key);
    return value==='light'||value==='dark'?value:null;
  };
  const system=()=>query.matches?'light':'dark';

  function apply(theme=stored()||system()){
    document.documentElement.dataset.theme=theme;
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=theme==='light'?'#F5F5F3':'#0D0D0D';
  }

  apply();
  query.addEventListener?.('change',()=>{if(!stored())apply()});
  addEventListener('storage',event=>{
    if(event.key===key)apply();
  });
  addEventListener('pageshow',()=>apply(),{passive:true});
})();