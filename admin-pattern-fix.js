// Keep HTML validation patterns compatible with browsers using the Unicode Sets `v` flag.
(function adminPatternFix(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;

  function apply(){
    const slug=document.querySelector('#f-slug');
    if(!slug)return;
    slug.setAttribute('pattern','[a-z0-9]+(?:-[a-z0-9]+)*');
    slug.setAttribute('title','Use lowercase letters and numbers separated by single hyphens, for example estimatio-ai.');
  }

  document.readyState==='loading'
    ? addEventListener('DOMContentLoaded',apply,{once:true})
    : apply();

  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
