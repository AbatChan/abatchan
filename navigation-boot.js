(()=>{
  const key='abatNavigationPending';
  try{
    if(sessionStorage.getItem(key)!=='1')return;
    sessionStorage.removeItem(key);
    document.documentElement.classList.add('nav-arriving');
    // Never strand the page behind the cover if the main bundle fails.
    setTimeout(()=>document.documentElement.classList.remove('nav-arriving'),1600);
  }catch{}
})();
