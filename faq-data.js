// One shared fallback for the public pricing page and the authenticated editor.
(function faqData(){
  'use strict';
  if(Array.isArray(window.ABATCHAN_FAQ_DEFAULTS))return;
  window.ABATCHAN_FAQ_DEFAULTS=[
    {id:'pricing-starting-points',page:'/pricing',question:'What will my project actually cost?',answer:'The figures above are honest starting points, not bait prices or automatic quotes. Once I understand the pages, workflows, integrations, content, deadline, and current setup, I send a written scope with the final price before work begins.',published:true},
    {id:'pricing-payments',page:'/pricing',question:'How do payments work?',answer:'You receive an invoice rather than a generic checkout link. Small jobs are usually funded upfront. Larger builds are split into clear milestones, so you approve and fund the work in manageable stages.',published:true},
    {id:'pricing-timeline',page:'/pricing',question:'How quickly can you deliver?',answer:'A focused landing page usually takes 3–5 working days once the content, references, access, and feedback are ready. A small business website commonly takes 1–2 weeks. Ecommerce, dashboards, migrations, custom workflows, and integrations need a schedule based on the real scope.',published:true},
    {id:'pricing-phases',page:'/pricing',question:'Can we start small and add more later?',answer:'Yes. We can launch the smallest version that solves the immediate problem, as long as the foundation accounts for what you may add later. That avoids paying twice for the same structure.',published:true},
    {id:'pricing-existing-systems',page:'/pricing',question:'Can you repair or extend something that already exists?',answer:'Yes. I work with existing websites, booking systems, ecommerce stores, WordPress builds, automations, and custom products. I review the current setup first, then tell you what is worth keeping, what is causing risk, and the smallest sensible route forward.',published:true},
    {id:'pricing-custom-work',page:'/pricing',question:'Do you use templates, AI, or custom code?',answer:'I use proven components, automation, and AI when they save real time. I write custom code where your workflow needs it. Everything is still reviewed, tested, and owned as part of the project.',published:true},
    {id:'pricing-revisions',page:'/pricing',question:'How are feedback and scope changes handled?',answer:'Each milestone says what is included and where feedback belongs. Normal revisions inside that scope are part of the work. If a new page, workflow, or integration appears later, I price it clearly before building it.',published:true},
    {id:'pricing-after-launch',page:'/pricing',question:'What happens after launch?',answer:'I test, deploy, and hand over the finished work with the access and documentation we agreed on. If you want ongoing improvements, monitoring, or technical support, we can continue hourly or under a monthly support plan.',published:true}
  ];

  // The first dashboard release stored a twelve-question set. Replace that
  // exact authored set on the public page, but preserve anything the owner has
  // actually edited. The admin persists the upgrade after authentication.
  window.ABATCHAN_UPGRADE_FAQS=items=>{
    if(!Array.isArray(items))return window.ABATCHAN_FAQ_DEFAULTS;
    const ids=new Set(items.map(item=>item?.id));
    const legacy=items.length===12&&ids.has('pricing-existing-work')&&ids.has('pricing-existing-systems')&&items.some(item=>
      item?.id==='pricing-phases'&&item.answer==='Yes, provided the first version is designed with the later phases in mind. The scope can be arranged as a focused first release followed by measured improvements.'
    );
    return legacy?window.ABATCHAN_FAQ_DEFAULTS:items;
  };
})();
