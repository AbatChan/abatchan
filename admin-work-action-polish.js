// Final visual polish for expanded Work actions.
(function adminWorkActionPolish(){
  'use strict';
  const VERSION=2;
  if((window.__ABATCHAN_WORK_ACTION_POLISH__||0)>=VERSION)return;
  window.__ABATCHAN_WORK_ACTION_POLISH__=VERSION;
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;

  document.querySelectorAll('style[data-work-action-polish]').forEach(node=>node.remove());
  const style=document.createElement('style');
  style.dataset.workActionPolish=String(VERSION);
  style.textContent=`
    #items .work-compact-panel{
      display:flex!important;
      align-items:center!important;
      justify-content:flex-end!important;
      min-height:58px!important;
      gap:8px!important;
      padding:10px 14px!important;
      border-top:1px solid var(--line)!important;
      background:rgba(245,245,243,.012)!important;
    }
    #items .work-compact-panel[hidden]{display:none!important}
    #items .work-compact-panel::before{content:none!important;display:none!important}
    #items .work-compact-panel .adm-row-actions{
      display:flex!important;
      align-items:center!important;
      justify-content:flex-end!important;
      gap:7px!important;
      width:auto!important;
      margin:0!important;
    }
    #items .work-compact-panel .adm-icon{
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      width:auto!important;
      min-width:0!important;
      height:36px!important;
      min-height:36px!important;
      padding:0 12px!important;
      gap:7px!important;
      border:1px solid transparent!important;
      border-radius:10px!important;
      background:transparent!important;
      color:var(--muted)!important;
      box-shadow:none!important;
      font:inherit!important;
      line-height:1!important;
      cursor:pointer!important;
      transition:color .18s,border-color .18s,background .18s,transform .18s var(--ease)!important;
    }
    #items .work-compact-panel .adm-icon:hover{
      color:var(--paper)!important;
      border-color:var(--line)!important;
      background:rgba(245,245,243,.055)!important;
      transform:translateY(-1px)!important;
    }
    #items .work-compact-panel .adm-icon:focus-visible{
      outline:2px solid var(--signal)!important;
      outline-offset:2px!important;
    }
    #items .work-compact-panel .adm-icon.danger{
      color:#d98b85!important;
      border-color:transparent!important;
      background:transparent!important;
    }
    #items .work-compact-panel .adm-icon.danger:hover{
      color:#ffaaa2!important;
      border-color:rgba(224,86,74,.24)!important;
      background:rgba(224,86,74,.075)!important;
    }
    #items .work-compact-panel .adm-icon svg{
      display:block!important;
      width:14px!important;
      height:14px!important;
      flex:0 0 14px!important;
    }
    #items .work-compact-panel .adm-icon::after{
      display:block!important;
      font-size:12px!important;
      font-weight:600!important;
      line-height:1!important;
      letter-spacing:0!important;
      text-transform:none!important;
      white-space:nowrap!important;
    }
    #items .work-compact-panel .adm-icon[data-work-edit]::after{content:"Edit project"!important}
    #items .work-compact-panel .adm-icon[data-work-delete]::after{content:"Delete"!important}
    html[data-theme="light"] #items .work-compact-panel{background:rgba(21,21,25,.01)!important}
    html[data-theme="light"] #items .work-compact-panel .adm-icon:hover{color:#151519!important;background:rgba(21,21,25,.05)!important}
    @media(max-width:620px){
      #items .work-compact-panel{padding:10px!important}
      #items .work-compact-panel .adm-row-actions{width:100%!important}
      #items .work-compact-panel .adm-icon{flex:1 1 0!important}
    }
  `;
  document.head.appendChild(style);
})();