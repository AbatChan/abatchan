// Real-device mobile viewport stabilizer.
// iOS browsers resize the visual viewport as their address and toolbar chrome
// expands and collapses, often without a matching layout viewport resize.
(function mobileViewportFix(){
  const isAdmin=/\/admin(?:\.html)?$/.test(location.pathname);
  const root=document.documentElement;
  const scroller=document.scrollingElement||root;
  const viewport=window.visualViewport;
  let frame=0,settleTimer=0,lastWidth=0,lastHeight=0;

  const realPageEnd=()=>{
    const footer=document.querySelector('body > footer');
    if(!footer)return scroller.scrollHeight;
    const rect=footer.getBoundingClientRect();
    return Math.max(0,Math.round(rect.bottom+scroller.scrollTop));
  };

  const clampToContent=()=>{
    if(isAdmin||innerWidth>900||document.body.classList.contains('assist-sheet-open'))return;
    const height=Math.round(viewport?.height||root.clientHeight||innerHeight);
    const max=Math.max(0,realPageEnd()-height);
    if(scroller.scrollTop>max+2){
      scroller.scrollTop=max;
      window.scrollTo(0,max);
    }
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
    const top=Math.round(viewport?.offsetTop||0);
    const left=Math.round(viewport?.offsetLeft||0);

    root.style.setProperty('--visual-width',width+'px');
    root.style.setProperty('--visual-height',height+'px');
    root.style.setProperty('--visual-top',top+'px');
    root.style.setProperty('--visual-left',left+'px');

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
