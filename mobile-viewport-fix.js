// Real-device mobile viewport stabilizer.
// iOS browsers resize the visual viewport as their address and toolbar chrome
// expands and collapses, often without a matching layout viewport resize.
(function mobileViewportFix(){
  const root=document.documentElement;
  const viewport=window.visualViewport;
  let frame=0,settleTimer=0,lastWidth=0,lastHeight=0;

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

    // When browser chrome expands, WebKit can preserve a scroll position that is
    // now beyond the document's new maximum and briefly reveal empty page space.
    clearTimeout(settleTimer);
    settleTimer=setTimeout(()=>{
      const scrolling=root;
      const max=Math.max(0,scrolling.scrollHeight-height);
      if(scrollY>max+2)scrollTo({top:max,left:0,behavior:'instant'});
    },80);
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
  viewport?.addEventListener('resize',schedule,{passive:true});
  viewport?.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
  schedule();
})();
