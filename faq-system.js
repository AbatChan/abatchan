// Shared FAQ content and motion for static, injected, and admin-managed accordions.
(function faqSystem(){
  const selector='.faq-list details,[data-faq] details,.faq-group details';
  const page=location.pathname.replace(/\/+$/,'')||'/';
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const running=new WeakMap();

  window.ABATCHAN_FAQ_DEFAULTS=[
    {id:'pricing-starting-points',page:'/pricing',question:'Why are the prices shown as starting points?',answer:'Two projects can look similar but have very different content, integrations, account systems, technical debt, or deadline pressure. The starting price gives you the correct budget range before the detailed scope is prepared.',published:true},
    {id:'pricing-payments',page:'/pricing',question:'How do payments work?',answer:'Payments are handled by invoice, not a generic checkout button. Medium and large projects are split into milestones tied to clear deliverables, and each invoice lists the available payment method.',published:true},
    {id:'pricing-phases',page:'/pricing',question:'Can I start smaller and add more later?',answer:'Yes, provided the first version is designed with the later phases in mind. The scope can be arranged as a focused first release followed by measured improvements.',published:true},
    {id:'pricing-existing-work',page:'/pricing',question:'Do you work with existing websites and products?',answer:'Yes. Existing work is reviewed first because poor structure, outdated plugins, missing documentation, or unstable integrations can affect the quote.',published:true},
    {id:'pricing-timeline',page:'/pricing',question:'How quickly can a website be delivered?',answer:'A focused landing page is commonly completed in 2–3 working days, while a focused five-page business website can often be completed in about 5 working days when content, access, references, and feedback are ready. Ecommerce, dashboards, migrations, custom functionality, and integrations take longer.',published:true},
    {id:'pricing-existing-systems',page:'/pricing',question:'Can you work on an existing website or system?',answer:'Yes. Existing WordPress, Shopify, Wix, Framer, BookingKoala, directory, membership, and automation setups can be reviewed, repaired, extended, migrated, or redesigned. The current structure is checked first because technical debt, unstable plugins, and missing documentation can affect the scope.',published:true},
    {id:'pricing-integrations',page:'/pricing',question:'Can you connect forms, payments, booking tools, and other platforms?',answer:'Yes. Past work includes Stripe, HubSpot, Google Maps and Places, BookingKoala, Calendly, Tally, GoHighLevel, Zapier, OpenPhone, analytics, ecommerce, and custom API integrations. Access requirements and each system’s limitations are confirmed during scope.',published:true},
    {id:'pricing-custom-work',page:'/pricing',question:'Do you build custom features or only use templates?',answer:'Both. Templates and established components are used when they save time without limiting the result. Custom code is used for unique workflows, plugins, dashboards, account logic, APIs, forms, product structures, and frontend behavior that off-the-shelf tools cannot handle cleanly.',published:true},
    {id:'pricing-revisions',page:'/pricing',question:'How are revisions and changing requirements handled?',answer:'The agreed scope is divided into milestones with clear deliverables. Normal feedback within that scope is handled during the relevant milestone. New pages, integrations, workflows, or requirements are estimated separately before work continues.',published:true},
    {id:'pricing-requirements',page:'/pricing',question:'What do you need from me before work starts?',answer:'Usually the content, brand assets, references, required access, integrations, deadline, and the outcome the project must achieve. Fast timelines depend on those items being available and feedback arriving without long delays.',published:true},
    {id:'pricing-branding',page:'/pricing',question:'Do you provide branding as part of a website project?',answer:'Branding can be added, but it is a separate premium service. Logo systems, identity direction, typography, colours, brand guidelines, social assets, and launch materials require their own creative scope rather than being treated as a free website extra.',published:true},
    {id:'pricing-after-launch',page:'/pricing',question:'What happens after launch?',answer:'Projects include testing, deployment, and an agreed handover. Ongoing maintenance, improvements, product updates, analytics, technical support, and automation monitoring can continue under hourly work or a monthly support arrangement.',published:true}
  ];

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
    summary.addEventListener('click',event=>{event.preventDefault();toggle(details,!details.open)});
  };

  const animate=async(details,opening)=>{
    prepare(details);
    const summary=details.querySelector(':scope>summary'),answer=answerFor(details);
    if(!summary||!answer)return;
    running.get(details)?.cancel();
    const start=details.getBoundingClientRect().height;
    if(opening)details.open=true;
    const end=summary.getBoundingClientRect().height+(opening?answer.scrollHeight:0);
    summary.setAttribute('aria-expanded',String(opening));
    if(reduceMotion.matches){details.open=opening;details.style.height='';return}
    details.style.height=`${start}px`;details.style.overflow='hidden';
    const animation=details.animate([{height:`${start}px`},{height:`${end}px`}],{duration:300,easing:'cubic-bezier(.2,.75,.2,1)'});
    running.set(details,animation);
    try{await animation.finished}catch{}
    if(running.get(details)!==animation)return;
    running.delete(details);details.open=opening;details.style.height='';details.style.overflow='';
  };

  const toggle=(details,opening)=>{
    if(opening){
      const group=groupFor(details);
      group?.querySelectorAll('details[open]').forEach(other=>{if(other!==details)animate(other,false)});
    }
    animate(details,opening);
  };

  const scan=root=>{
    if(root.matches?.(selector))prepare(root);
    root.querySelectorAll?.(selector).forEach(prepare);
  };

  const renderItems=(container,items)=>{
    container.replaceChildren(...items.filter(item=>item.published!==false&&item.page===page).map(item=>{
      const details=document.createElement('details');
      details.dataset.faqId=item.id;
      const summary=document.createElement('summary');summary.textContent=item.question;
      const paragraph=document.createElement('p');paragraph.textContent=item.answer;
      details.append(summary,paragraph);return details;
    }));
  };

  const loadManaged=async()=>{
    const container=document.querySelector('.faq-list,[data-faq-page]');
    if(!container||!window.sb?.configured?.())return;
    try{
      const rows=await sb.select('settings','key=eq.faq.items&is_public=eq.true&select=value');
      const items=rows?.[0]?.value;
      if(Array.isArray(items))renderItems(container,items);
      else if(page==='/pricing')renderItems(container,window.ABATCHAN_FAQ_DEFAULTS);
    }catch{
      if(page==='/pricing'&&!container.children.length)renderItems(container,window.ABATCHAN_FAQ_DEFAULTS);
    }
  };

  scan(document);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)scan(node)}))).observe(document.documentElement,{childList:true,subtree:true});
  loadManaged();
})();