// Small visual layer for the preview assistant. Kept separate from the transport
// so layout refinements cannot interfere with streaming or stored conversations.
(function assistantPolish(){
  const style=document.createElement('style');
  style.textContent=`
    .assist-panel{
      width:min(380px,calc(100vw - 24px))!important;
      max-width:380px!important;
      opacity:0;
      transform:translateY(18px) scale(.955);
      transform-origin:calc(100% - 28px) 100%;
      filter:blur(5px);
      visibility:hidden;
      pointer-events:none;
      transition:opacity .26s ease,transform .38s cubic-bezier(.2,.8,.2,1),filter .28s ease,visibility 0s linear .38s!important;
      will-change:transform,opacity,filter;
    }
    .assist-panel.is-open{
      opacity:1;
      transform:translateY(0) scale(1);
      filter:blur(0);
      visibility:visible;
      pointer-events:auto;
      transition-delay:0s!important;
    }
    .assist-launch{
      transition:transform .34s cubic-bezier(.2,.8,.2,1),box-shadow .28s ease,background .24s ease!important;
    }
    .assist-launch:hover{transform:translateY(-2px) scale(1.035)}
    .assist-launch:active{transform:scale(.94)}
    .assist-launch.is-open{transform:rotate(90deg) scale(.96)}
    .assist-head{
      display:grid!important;
      grid-template-columns:auto minmax(0,1fr) auto auto;
      align-items:center;
      column-gap:11px;
    }
    .assist-head>div{min-width:0}
    .assist-clear{
      margin:0!important;
      justify-self:end;
      white-space:nowrap;
      line-height:1;
      flex:none!important;
    }
    .assist-clear.is-confirming{
      width:auto!important;
      min-width:max-content;
      padding:0 10px!important;
      white-space:nowrap;
    }
    .assist-form input{
      font-size:16px!important;
    }
    .assist-backdrop{
      position:fixed;
      inset:0;
      z-index:438;
      border:0;
      padding:0;
      background:rgba(4,4,7,.48);
      backdrop-filter:blur(3px);
      -webkit-backdrop-filter:blur(3px);
      opacity:0;
      visibility:hidden;
      pointer-events:none;
      transition:opacity .26s ease,visibility 0s linear .3s;
    }
    .assist-backdrop.is-on{
      opacity:1;
      visibility:visible;
      pointer-events:auto;
      transition-delay:0s;
    }

    @media(max-width:900px){
      .assist-panel{
        left:auto!important;
        right:18px!important;
        bottom:104px!important;
        width:min(380px,calc(100vw - 36px))!important;
        max-height:min(680px,calc(100dvh - 150px))!important;
        z-index:450!important;
      }
      .assist-log{
        min-height:0!important;
      }
    }

    @media(max-width:640px){
      body.assist-sheet-open{
        overflow:hidden!important;
        overscroll-behavior:none;
      }
      body.assist-sheet-open .mobile-tabs{
        opacity:0!important;
        transform:translateY(24px)!important;
        pointer-events:none!important;
      }
      .assist-panel{
        left:0!important;
        right:0!important;
        bottom:0!important;
        width:100vw!important;
        max-width:none!important;
        height:min(82dvh,720px)!important;
        max-height:calc(100dvh - env(safe-area-inset-top,0px) - 12px)!important;
        border-radius:24px 24px 0 0!important;
        transform:translateY(104%) scale(.985);
        transform-origin:50% 100%;
        filter:none;
        box-shadow:0 -28px 80px rgba(0,0,0,.48)!important;
      }
      .assist-panel.is-open{
        transform:translateY(0) scale(1);
      }
      .assist-head{
        grid-template-columns:auto minmax(0,1fr) auto!important;
        min-height:76px;
        padding-right:64px!important;
        column-gap:8px;
      }
      .assist-clear{
        grid-column:3;
      }
      .assist-clear.is-confirming{
        font-size:10px;
        padding:0 8px!important;
      }
      .assist-launch.is-open{
        top:calc(env(safe-area-inset-top,0px) + 18px)!important;
        right:14px!important;
        bottom:auto!important;
        width:44px!important;
        height:44px!important;
        z-index:470!important;
      }
      .assist-log{
        flex:1 1 auto!important;
        min-height:0!important;
        padding-bottom:18px!important;
      }
      .assist-chips{
        gap:8px!important;
      }
      .assist-chips button{
        min-height:40px;
        padding:9px 12px!important;
      }
      .assist-form{
        padding-bottom:max(12px,env(safe-area-inset-bottom,0px))!important;
      }
      .assist-reply-peek{
        right:12px!important;
        bottom:82px!important;
      }
    }

    @media(max-width:380px){
      .assist-panel{
        height:min(88dvh,720px)!important;
        border-radius:20px 20px 0 0!important;
      }
      .assist-head{
        padding-left:14px!important;
      }
      .assist-head>div p{
        display:none;
      }
      .assist-chips{
        grid-template-columns:1fr!important;
      }
    }

    @media(prefers-reduced-motion:reduce){
      .assist-panel,.assist-launch,.assist-backdrop{transition-duration:.01ms!important;filter:none!important}
    }
  `;
  document.head.appendChild(style);

  const setup=()=>{
    const panel=document.querySelector('.assist-panel');
    const launch=document.querySelector('.assist-launch');
    if(!panel||!launch)return false;

    let backdrop=document.querySelector('.assist-backdrop');
    if(!backdrop){
      backdrop=document.createElement('button');
      backdrop.type='button';
      backdrop.className='assist-backdrop';
      backdrop.setAttribute('aria-label','Close chat');
      document.body.appendChild(backdrop);
    }

    const sync=()=>{
      const open=panel.classList.contains('is-open');
      document.body.classList.toggle('assist-sheet-open',open&&matchMedia('(max-width:640px)').matches);
      backdrop.classList.toggle('is-on',open&&matchMedia('(max-width:900px)').matches);
    };

    new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['class']});
    addEventListener('resize',sync,{passive:true});
    backdrop.addEventListener('click',()=>{
      if(panel.classList.contains('is-open'))launch.click();
    });
    sync();
    return true;
  };

  if(!setup()){
    const observer=new MutationObserver(()=>{if(setup())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();