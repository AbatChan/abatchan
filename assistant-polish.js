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
    @media(max-width:430px){
      .assist-panel{width:calc(100vw - 16px)!important;max-width:380px!important}
      .assist-head{column-gap:8px}
      .assist-clear.is-confirming{font-size:10px;padding:0 8px!important}
    }
    @media(prefers-reduced-motion:reduce){
      .assist-panel,.assist-launch{transition-duration:.01ms!important;filter:none!important}
    }
  `;
  document.head.appendChild(style);
})();
