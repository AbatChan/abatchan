// One FAQ interaction system for static, injected, and future admin-managed accordions.
(function faqSystem(){
  const selector='.faq-list details,[data-faq] details,.faq-group details';
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const running=new WeakMap();

  const style=document.createElement('style');
  style.textContent=`
    ${selector}{overflow:hidden}
    ${selector}>summary{position:relative;padding-right:42px;cursor:pointer;list-style:none}
    ${selector}>summary::-webkit-details-marker{display:none}
    ${selector}>summary::before,${selector}>summary::after{content:"";position:absolute;right:4px;top:50%;width:16px;height:1.5px;border-radius:2px;background:currentColor;transform:translateY(-50%);transition:transform .28s var(--ease),opacity .28s var(--ease)}
    ${selector}>summary::after{transform:translateY(-50%) rotate(90deg)}
    ${selector}[open]>summary::after{transform:translateY(-50%) rotate(0);opacity:0}
    .faq-answer{overflow:hidden}
  `;
  document.head.appendChild(style);

  const groupFor=details=>details.closest('.faq-list,[data-faq],.faq-group')||details.parentElement;
  const answerFor=details=>details.querySelector(':scope>.faq-answer');

  const prepare=details=>{
    if(details.dataset.faqReady)return;
    const summary=details.querySelector(':scope>summary');
    if(!summary)return;
    details.dataset.faqReady='1';

    let answer=answerFor(details);
    if(!answer){
      answer=document.createElement('div');
      answer.className='faq-answer';
      [...details.children].filter(node=>node!==summary).forEach(node=>answer.append(node));
      details.append(answer);
    }

    summary.setAttribute('aria-expanded',String(details.open));
    summary.addEventListener('click',event=>{
      event.preventDefault();
      toggle(details,!details.open);
    });
  };

  const animate=async(details,opening)=>{
    prepare(details);
    const summary=details.querySelector(':scope>summary');
    const answer=answerFor(details);
    if(!summary||!answer)return;

    running.get(details)?.cancel();
    const start=details.getBoundingClientRect().height;
    if(opening)details.open=true;
    const end=summary.getBoundingClientRect().height+(opening?answer.scrollHeight:0);
    summary.setAttribute('aria-expanded',String(opening));

    if(reduceMotion.matches){
      details.open=opening;
      details.style.height='';
      return;
    }

    details.style.height=`${start}px`;
    details.style.overflow='hidden';
    const animation=details.animate(
      [{height:`${start}px`,opacity:opening?.88:1},{height:`${end}px`,opacity:1}],
      {duration:300,easing:'cubic-bezier(.2,.75,.2,1)'}
    );
    running.set(details,animation);
    try{await animation.finished}catch{}
    if(running.get(details)!==animation)return;
    running.delete(details);
    details.open=opening;
    details.style.height='';
    details.style.overflow='';
  };

  const toggle=(details,opening)=>{
    if(opening){
      const group=groupFor(details);
      group?.querySelectorAll(':scope>details[open],details[data-faq-ready][open]').forEach(other=>{
        if(other!==details)animate(other,false);
      });
    }
    animate(details,opening);
  };

  const scan=root=>{
    if(root.matches?.(selector))prepare(root);
    root.querySelectorAll?.(selector).forEach(prepare);
  };

  scan(document);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
    if(node.nodeType===1)scan(node);
  }))).observe(document.documentElement,{childList:true,subtree:true});
})();