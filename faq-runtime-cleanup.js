// Final ownership guard for the shared FAQ UI: exactly one toggle per summary.
(function faqRuntimeCleanup(){
  'use strict';
  const VERSION=1;
  if((window.__ABATCHAN_FAQ_CLEANUP_VERSION__||0)>=VERSION)return;
  window.__ABATCHAN_FAQ_CLEANUP_VERSION__=VERSION;

  const summarySelector=':is(.faq-list,[data-faq],.faq-group) details>summary';

  // Older FAQ revisions injected their own plus through summary pseudo-elements.
  // Keep this final stylesheet after every FAQ upgrade so only .faq-toggle draws an icon.
  document.querySelectorAll('style[data-faq-runtime-cleanup]').forEach(node=>node.remove());
  const style=document.createElement('style');
  style.dataset.faqRuntimeCleanup=String(VERSION);
  style.textContent=`
    ${summarySelector}::before,
    ${summarySelector}::after{
      content:none!important;
      display:none!important;
      width:0!important;
      height:0!important;
      border:0!important;
      background:none!important;
    }
    ${summarySelector}>.faq-toggle~.faq-toggle{display:none!important}
  `;
  document.head.appendChild(style);

  const cleanSummary=summary=>{
    const toggles=[...summary.querySelectorAll(':scope>.faq-toggle')];
    toggles.slice(1).forEach(toggle=>toggle.remove());

    // Remove known legacy icon nodes while preserving the index, question and current toggle.
    [...summary.children].forEach(child=>{
      if(child.matches('.faq-index,.faq-question,.faq-toggle'))return;
      if(child.matches('.faq-icon,.accordion-icon,.plus,.plus-icon,[data-faq-icon]'))child.remove();
    });
  };

  const scan=root=>{
    if(root.matches?.(summarySelector))cleanSummary(root);
    root.querySelectorAll?.(summarySelector).forEach(cleanSummary);
  };

  scan(document);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
    if(node.nodeType===1)scan(node);
  }))).observe(document.documentElement,{childList:true,subtree:true});
})();
