// Final visual polish for expanded Work actions.
(function adminWorkActionPolish(){
  'use strict';
  const VERSION=1;
  if((window.__ABATCHAN_WORK_ACTION_POLISH__||0)>=VERSION)return;
  window.__ABATCHAN_WORK_ACTION_POLISH__=VERSION;
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;

  document.querySelectorAll('style[data-work-action-polish]').forEach(node=>node.remove());
  const style=document.createElement('style');
  style.dataset.workActionPolish=String(VERSION);
  style.textContent=`
    .work-compact-panel{display:flex!important;align-items:center!important;gap:14px!important;padding:12px 14px!important;background:rgba(245,245,243,.018)}
    .work-compact-panel[hidden]{display:none!important}
    .work-compact-panel::before{content:"Manage this project"!important;margin-right:auto!important;color:var(--muted)!important;font-size:12px!important;letter-spacing:.01em}
    .work-compact-panel .adm-row-actions{display:flex!important;gap:8px!important;align-items:center!important}
    .work-compact-panel .adm-icon{width:auto!important;min-width:0!important;height:38px!important;padding:0 13px!important;border-radius:11px!important;gap:8px!important;background:rgba(245,245,243,.025)!important;color:var(--paper)!important;box-shadow:none!important;transition:background .2s,border-color .2s,transform .2s var(--ease)!important}
    .work-compact-panel .adm-icon:hover{transform:translateY(-1px)!important;border-color:rgba(99,102,241,.55)!important;background:rgba(99,102,241,.1)!important}
    .work-compact-panel .adm-icon.danger{color:#ff9b92!important;border-color:rgba(224,86,74,.28)!important;background:rgba(224,86,74,.035)!important}
    .work-compact-panel .adm-icon.danger:hover{border-color:rgba(224,86,74,.62)!important;background:rgba(224,86,74,.1)!important}
    .work-compact-panel .adm-icon svg{width:14px!important;height:14px!important}
    .work-compact-panel .adm-icon::after{font-size:12px!important;font-weight:600!important;letter-spacing:.01em!important;text-transform:lowercase}
    html[data-theme="light"] .work-compact-panel{background:rgba(21,21,25,.018)}
    html[data-theme="light"] .work-compact-panel .adm-icon{background:rgba(21,21,25,.025)!important;color:#151519!important}
    @media(max-width:620px){
      .work-compact-panel{align-items:stretch!important;flex-direction:column!important}
      .work-compact-panel::before{margin-right:0!important}
      .work-compact-panel .adm-row-actions{width:100%!important}
      .work-compact-panel .adm-icon{flex:1!important;justify-content:center!important}
    }
  `;
  document.head.appendChild(style);
})();