// Shared pricing FAQ content, styling, CMS rendering, and accordion motion.
(function faqSystem(){
  'use strict';

  const VERSION=4;
  if((window.__ABATCHAN_FAQ_SYSTEM_VERSION__||0)>=VERSION)return;
  window.__ABATCHAN_FAQ_SYSTEM_VERSION__=VERSION;

  const detailSelector='.faq-list details,[data-faq] details,.faq-group details';
  const detailCss=':is(.faq-list details,[data-faq] details,.faq-group details)';
  const groupSelector='.faq-list,[data-faq],.faq-group';
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const states=new WeakMap();
  let uid=0;

  const normalisePage=value=>{
    const path=String(value||'/').split(/[?#]/,1)[0]
      .replace(/\/index(?:\.html)?$/,'/')
      .replace(/\.html$/,'')
      .replace(/\/+$/,'');
    return path||'/';
  };
  const page=normalisePage(location.pathname);

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
  style.dataset.faqStyles=String(VERSION);
  style.textContent=`
    :is(.faq-list,[data-faq],.faq-group){display:grid;gap:12px;border:0!important}
    ${detailCss}{position:relative;padding:0!important;border:1px solid var(--line)!important;border-radius:22px;background:linear-gradient(145deg,rgba(245,245,243,.055),rgba(245,245,243,.018));overflow:hidden;isolation:isolate;transition:border-color .28s var(--ease),background .28s var(--ease),box-shadow .28s var(--ease),transform .28s var(--ease)}
    ${detailCss}::before{content:"";position:absolute;z-index:-1;width:180px;height:180px;right:-115px;top:-125px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,.22),transparent 68%);opacity:0;transform:scale(.72);transition:opacity .32s var(--ease),transform .4s var(--ease);pointer-events:none}
    ${detailCss}:hover{border-color:rgba(99,102,241,.42)!important;transform:translateY(-2px)}
    ${detailCss}[data-state="open"]{border-color:rgba(99,102,241,.68)!important;background:linear-gradient(145deg,rgba(99,102,241,.115),rgba(245,245,243,.026));box-shadow:0 24px 70px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.045)}
    ${detailCss}[data-state="open"]::before{opacity:1;transform:scale(1)}
    ${detailCss}>summary{position:relative;display:grid;grid-template-columns:42px minmax(0,1fr) 42px;align-items:center;gap:14px;min-height:82px;padding:18px 20px;cursor:pointer;list-style:none;user-select:none;outline:none}
    ${detailCss}>summary::-webkit-details-marker{display:none}
    ${detailCss}>summary::marker{display:none;content:""}
    ${detailCss}>summary::before,${detailCss}>summary::after{content:none!important;display:none!important}
    ${detailCss}>summary:focus-visible{box-shadow:inset 0 0 0 2px var(--signal);border-radius:21px}
    .faq-index{width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--line);border-radius:13px;color:var(--muted);background:rgba(245,245,243,.025);font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.05em;transition:color .25s,border-color .25s,background .25s,transform .3s var(--ease)}
    .faq-question{min-width:0;color:var(--paper);font-size:clamp(17px,1.55vw,21px);font-weight:520;line-height:1.3;letter-spacing:-.025em;transition:color .25s}
    .faq-toggle{position:relative;width:42px;height:42px;justify-self:end;border:1px solid var(--line);border-radius:50%;background:rgba(245,245,243,.025);transition:background .25s,border-color .25s,transform .36s var(--ease)}
    .faq-toggle::before,.faq-toggle::after{content:"";position:absolute;left:50%;top:50%;width:15px;height:1.5px;border-radius:999px;background:currentColor;transform:translate(-50%,-50%);transition:transform .32s var(--ease),opacity .22s}
    .faq-toggle::after{transform:translate(-50%,-50%) rotate(90deg)}
    ${detailCss}:hover .faq-toggle{border-color:rgba(99,102,241,.55);background:rgba(99,102,241,.09)}
    ${detailCss}[data-state="open"] .faq-index{color:#fff;border-color:var(--signal);background:var(--signal);transform:scale(1.04)}
    ${detailCss}[data-state="open"] .faq-toggle{color:#fff;border-color:var(--signal);background:var(--signal);transform:rotate(180deg)}
    ${detailCss}[data-state="open"] .faq-toggle::after{opacity:0;transform:translate(-50%,-50%) rotate(0)}
    .faq-answer{overflow:hidden}
    .faq-answer-inner{max-width:800px;padding:0 76px 25px;color:var(--muted);font-size:15px;line-height:1.75}
    .faq-answer-inner>p{margin:0}
    .faq-answer-inner>:last-child{margin-bottom:0}
    html[data-theme="light"] ${detailCss}{background:linear-gradient(145deg,rgba(21,21,25,.035),rgba(21,21,25,.012));box-shadow:0 14px 40px rgba(27,28,34,.035)}
    html[data-theme="light"] ${detailCss}[data-state="open"]{background:linear-gradient(145deg,rgba(99,102,241,.105),rgba(21,21,25,.018));box-shadow:0 22px 54px rgba(27,28,34,.09),inset 0 1px 0 rgba(255,255,255,.6)}
    html[data-theme="light"] .faq-index,html[data-theme="light"] .faq-toggle{background:rgba(21,21,25,.025)}
    @media(max-width:700px){
      :is(.faq-list,[data-faq],.faq-group){gap:10px}
      ${detailCss}{border-radius:18px}
      ${detailCss}>summary{grid-template-columns:34px minmax(0,1fr) 36px;gap:11px;min-height:72px;padding:15px 14px}
      ${detailCss}>summary:focus-visible{border-radius:17px}
      .faq-index{width:34px;height:34px;border-radius:10px;font-size:10px}
      .faq-toggle{width:36px;height:36px}
      .faq-question{font-size:16px;line-height:1.36}
      .faq-answer-inner{padding:0 15px 20px 59px;font-size:14px;line-height:1.68}
    }
    @media(prefers-reduced-motion:reduce){${detailCss},${detailCss}::before,.faq-index,.faq-toggle,.faq-toggle::before,.faq-toggle::after{transition:none!important}}
  `;
  document.head.appendChild(style);

  const groupFor=details=>details.closest(groupSelector)||details.parentElement;
  const stateFor=details=>{
    if(!states.has(details))states.set(details,{open:details.open,animation:null});
    return states.get(details);
  };

  const ensureAnswer=details=>{
    const summary=details.querySelector(':scope>summary');
    let answer=details.querySelector(':scope>.faq-answer');

    if(!answer){
      answer=document.createElement('div');
      answer.className='faq-answer';
      [...details.children].filter(node=>node!==summary).forEach(node=>answer.append(node));
      details.append(answer);
    }

    let inner=answer.querySelector(':scope>.faq-answer-inner');
    if(!inner){
      inner=document.createElement('div');
      inner.className='faq-answer-inner';
      while(answer.firstChild)inner.append(answer.firstChild);
      answer.append(inner);
    }

    return answer;
  };

  const decorateSummary=(details,summary)=>{
    let question=summary.querySelector(':scope>.faq-question');

    if(!question){
      question=document.createElement('span');
      question.className='faq-question';
      while(summary.firstChild)question.append(summary.firstChild);

      const index=document.createElement('span');
      index.className='faq-index';
      index.setAttribute('aria-hidden','true');

      const toggle=document.createElement('span');
      toggle.className='faq-toggle';
      toggle.setAttribute('aria-hidden','true');

      summary.append(index,question,toggle);
    }else{
      if(!summary.querySelector(':scope>.faq-index')){
        const index=document.createElement('span');
        index.className='faq-index';
        index.setAttribute('aria-hidden','true');
        summary.prepend(index);
      }
      if(!summary.querySelector(':scope>.faq-toggle')){
        const toggle=document.createElement('span');
        toggle.className='faq-toggle';
        toggle.setAttribute('aria-hidden','true');
        summary.append(toggle);
      }
    }

    const answer=ensureAnswer(details);
    const id=details.dataset.faqId||`faq-${++uid}`;
    if(!answer.id)answer.id=`${id}-answer`;
    summary.setAttribute('aria-controls',answer.id);
    return answer;
  };

  const finish=(details,open)=>{
    const current=stateFor(details);
    current.animation=null;
    details.open=open;
    details.dataset.state=open?'open':'closed';
    details.style.removeProperty('height');
    details.style.removeProperty('overflow');
    details.style.removeProperty('will-change');
    details.querySelector(':scope>summary')?.setAttribute('aria-expanded',String(open));
  };

  const animateTo=(details,open,immediate=false)=>{
    const summary=details.querySelector(':scope>summary');
    const answer=details.querySelector(':scope>.faq-answer');
    if(!summary||!answer)return;

    const current=stateFor(details);
    current.open=open;
    current.animation?.cancel();
    current.animation=null;
    details.dataset.state=open?'open':'closed';
    summary.setAttribute('aria-expanded',String(open));

    if(immediate||reduceMotion.matches){
      finish(details,open);
      return;
    }

    const start=details.getBoundingClientRect().height;
    if(open&&!details.open)details.open=true;
    details.style.height=`${start}px`;
    details.style.overflow='hidden';
    details.style.willChange='height';

    requestAnimationFrame(()=>{
      if(stateFor(details).open!==open)return;

      const end=open
        ? summary.getBoundingClientRect().height+answer.getBoundingClientRect().height
        : summary.getBoundingClientRect().height;

      const animation=details.animate(
        [{height:`${start}px`},{height:`${end}px`}],
        {duration:open?360:280,easing:'cubic-bezier(.2,.75,.2,1)'}
      );

      current.animation=animation;
      animation.onfinish=()=>{
        if(stateFor(details).animation!==animation)return;
        finish(details,open);
      };
      animation.oncancel=()=>{};
    });
  };

  const closeSiblings=details=>{
    const group=groupFor(details);
    if(!group)return;

    group.querySelectorAll(':scope>details').forEach(other=>{
      if(other===details||other.dataset.faqVersion!==String(VERSION))return;
      if(stateFor(other).open)animateTo(other,false);
    });
  };

  const toggle=details=>{
    const next=!stateFor(details).open;
    if(next)closeSiblings(details);
    animateTo(details,next);
  };

  const prepare=details=>{
    if(details.dataset.faqVersion===String(VERSION))return;

    let summary=details.querySelector(':scope>summary');
    if(!summary)return;

    details.getAnimations?.().forEach(animation=>animation.cancel());
    details.style.removeProperty('height');
    details.style.removeProperty('overflow');
    details.style.removeProperty('will-change');

    if(details.dataset.faqReady){
      const clean=summary.cloneNode(true);
      summary.replaceWith(clean);
      summary=clean;
    }

    details.dataset.faqReady='1';
    details.dataset.faqVersion=String(VERSION);
    decorateSummary(details,summary);

    const current=stateFor(details);
    details.dataset.state=current.open?'open':'closed';
    summary.setAttribute('aria-expanded',String(current.open));
    summary.addEventListener('click',event=>{
      event.preventDefault();
      toggle(details);
    });
  };

  const refreshGroup=group=>{
    const details=[...group.querySelectorAll(':scope>details')];
    details.forEach(prepare);

    details.forEach((item,index)=>{
      const badge=item.querySelector(':scope>summary>.faq-index');
      if(badge)badge.textContent=String(index+1).padStart(2,'0');
    });

    let openSeen=false;
    details.forEach(item=>{
      if(!stateFor(item).open)return;
      if(openSeen)animateTo(item,false,true);
      else openSeen=true;
    });
  };

  const scan=root=>{
    if(root.matches?.(groupSelector))refreshGroup(root);

    if(root.matches?.(detailSelector)){
      prepare(root);
      const group=groupFor(root);
      if(group)refreshGroup(group);
    }

    root.querySelectorAll?.(groupSelector).forEach(refreshGroup);
  };

  const renderItems=(container,items)=>{
    const scoped=items.filter(item=>
      item&&item.published!==false&&normalisePage(item.page)===page&&
      String(item.question||'').trim()&&String(item.answer||'').trim()
    );

    const fragment=document.createDocumentFragment();

    scoped.forEach(item=>{
      const details=document.createElement('details');
      details.dataset.faqId=String(item.id||`faq-${++uid}`);

      const summary=document.createElement('summary');
      summary.textContent=String(item.question).trim();

      const paragraph=document.createElement('p');
      paragraph.textContent=String(item.answer).trim();

      details.append(summary,paragraph);
      fragment.append(details);
    });

    container.replaceChildren(fragment);
    refreshGroup(container);
  };

  const loadManaged=async()=>{
    const container=document.querySelector('[data-faq-page],.faq-list');
    if(!container||!window.sb?.configured?.())return;

    try{
      const rows=await sb.select('settings','key=eq.faq.items&is_public=eq.true&select=value');
      const value=rows?.[0]?.value;

      if(Array.isArray(value))renderItems(container,value);
      else if(page==='/pricing')renderItems(container,window.ABATCHAN_FAQ_DEFAULTS);
    }catch(error){
      console.warn('Managed FAQs could not be loaded; keeping the page fallback.',error);
      if(page==='/pricing'&&!container.querySelector('details'))renderItems(container,window.ABATCHAN_FAQ_DEFAULTS);
    }
  };

  scan(document);

  new MutationObserver(records=>{
    const groups=new Set();

    records.forEach(record=>{
      if(record.target?.matches?.(groupSelector))groups.add(record.target);

      record.addedNodes.forEach(node=>{
        if(node.nodeType!==1)return;
        scan(node);
        const group=node.closest?.(groupSelector);
        if(group)groups.add(group);
      });
    });

    groups.forEach(refreshGroup);
  }).observe(document.documentElement,{childList:true,subtree:true});

  loadManaged();
})();
