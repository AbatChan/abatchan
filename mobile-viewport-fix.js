// Real-device mobile viewport stabilizer.
// iOS browsers resize the visual viewport as their address and toolbar chrome
// expands and collapses, often without a matching layout viewport resize.
(function mobileViewportFix(){
  const root=document.documentElement;
  const scroller=document.scrollingElement||root;
  const viewport=window.visualViewport;
  let frame=0,settleTimer=0,lastWidth=0,lastHeight=0;

  const realPageEnd=()=>{
    const footer=document.querySelector('footer');
    if(!footer)return scroller.scrollHeight;
    const rect=footer.getBoundingClientRect();
    return Math.max(0,Math.round(rect.bottom+scroller.scrollTop));
  };

  const clampToContent=()=>{
    if(innerWidth>900||document.body.classList.contains('assist-sheet-open'))return;
    const height=Math.round(viewport?.height||root.clientHeight||innerHeight);
    const max=Math.max(0,realPageEnd()-height);
    if(scroller.scrollTop>max+2){
      scroller.scrollTop=max;
      window.scrollTo(0,max);
    }
  };

  const queueClamp=(delay=90)=>{
    clearTimeout(settleTimer);
    settleTimer=setTimeout(()=>requestAnimationFrame(clampToContent),delay);
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

    // The lamp's physics listens to window resize. Forward visual viewport
    // changes so its right-side anchor cannot become stale on iOS browser chrome.
    if(width!==lastWidth||height!==lastHeight){
      lastWidth=width;lastHeight=height;
      dispatchEvent(new Event('resize'));
    }

    // WebKit can inflate the root scroll extent while its dynamic toolbar moves.
    // The footer is the final in-flow element, so its measured bottom is a more
    // dependable page boundary than document.scrollHeight on affected iPhones.
    queueClamp();
  };

  const schedule=()=>{
    if(!frame)frame=requestAnimationFrame(measure);
  };

  const style=document.createElement('style');
  style.textContent=`
    html,body{min-height:100%;overscroll-behavior-y:none}
    @supports(height:100dvh){body{min-height:100dvh}}
    @media(max-width:900px){
      .grid-bg,.cursor-light{height:var(--visual-height,100dvh)}
      .mobile-tabs{max-width:calc(var(--visual-width,100vw) - 24px)}
    }
  `;
  document.head.appendChild(style);

  addEventListener('resize',schedule,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(schedule,80),{passive:true});
  addEventListener('pageshow',schedule,{passive:true});
  addEventListener('touchend',()=>queueClamp(40),{passive:true});
  addEventListener('scrollend',()=>queueClamp(20),{passive:true});
  viewport?.addEventListener('resize',schedule,{passive:true});
  viewport?.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  schedule();
})();

// Small feature modules shared by public pages and the dashboard.
(function loadSiteEnhancements(){
  const scripts=['/responsive-lamp.js?v=1','/dynamic-work.js?v=1'];
  if(/\/admin(?:\.html)?$/.test(location.pathname))scripts.push('/admin-work-enhancements.js?v=1');
  scripts.forEach(src=>{
    if(document.querySelector(`script[src="${src}"]`))return;
    const script=document.createElement('script');script.src=src;script.defer=true;document.head.appendChild(script);
  });
})();
