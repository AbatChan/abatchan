// Keep public pricing, delivery expectations, and FAQs aligned with real studio work.
(function commercialPositioning(){
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/pricing')return;

  const style=document.createElement('style');
  style.textContent=`
    .delivery-strip{margin-top:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--line);border-radius:24px;overflow:hidden}
    .delivery-item{padding:24px;border-right:1px solid var(--line)}
    .delivery-item:last-child{border-right:0}
    .delivery-item span{color:var(--signal);font-size:11px}
    .delivery-item h3{font-size:20px;margin:15px 0 8px}
    .delivery-item p{color:var(--muted);font-size:13px;margin:0}
    @media(max-width:900px){.delivery-strip{grid-template-columns:1fr}.delivery-item{border-right:0;border-bottom:1px solid var(--line)}.delivery-item:last-child{border-bottom:0}}
  `;
  document.head.appendChild(style);

  const cards=[...document.querySelectorAll('.price-card')];
  const website=cards.find(card=>card.querySelector('h2')?.textContent.trim()==='Website');
  if(website){
    const price=website.querySelector('.price');
    const copy=website.querySelector(':scope>p');
    const list=website.querySelector('.price-list');
    if(price)price.innerHTML='$150 <small>landing pages from</small>';
    if(copy)copy.textContent='For focused landing pages and business websites built quickly without sacrificing clarity, responsiveness, or conversion.';
    if(list)list.innerHTML='<li>landing pages from $150</li><li>focused landing pages commonly delivered in 2–3 working days</li><li>focused 5-page business websites commonly delivered in about 5 working days</li><li>responsive design, enquiry flow, SEO, deployment, and handover</li><li>final price depends on sections, content, integrations, and functionality</li>';
  }

  const scopeStrip=document.querySelector('.scope-strip');
  if(scopeStrip&&!document.querySelector('.delivery-strip')){
    const strip=document.createElement('div');
    strip.className='delivery-strip reveal visible';
    strip.innerHTML='<div class="delivery-item"><span>delivery</span><h3>Fast focused builds</h3><p>Templates, reusable systems, automation, and AI-assisted workflows reduce avoidable production time.</p></div><div class="delivery-item"><span>quality</span><h3>Speed without shortcuts</h3><p>Fast delivery still includes responsive behavior, testing, performance checks, and a clean handover.</p></div><div class="delivery-item"><span>brand</span><h3>Branding is separate</h3><p>Logo systems, identity direction, brand guidelines, and launch assets are scoped as premium creative work, not bundled as a free extra.</p></div>';
    scopeStrip.after(strip);
  }

  const faq=document.querySelector('.faq-list');
  if(faq&&!faq.dataset.realWorkFaqs){
    faq.dataset.realWorkFaqs='1';
    const items=[
      ['How quickly can a website be delivered?','A focused landing page is commonly completed in 2–3 working days, while a focused five-page business website can often be completed in about 5 working days when content, access, references, and feedback are ready. Ecommerce, dashboards, migrations, custom functionality, and integrations take longer.'],
      ['Can you work on an existing website or system?','Yes. Existing WordPress, Shopify, Wix, Framer, BookingKoala, directory, membership, and automation setups can be reviewed, repaired, extended, migrated, or redesigned. The current structure is checked first because technical debt, unstable plugins, and missing documentation can affect the scope.'],
      ['Can you connect forms, payments, booking tools, and other platforms?','Yes. Past work includes Stripe, HubSpot, Google Maps and Places, BookingKoala, Calendly, Tally, GoHighLevel, Zapier, OpenPhone, analytics, ecommerce, and custom API integrations. Access requirements and each system’s limitations are confirmed during scope.'],
      ['Do you build custom features or only use templates?','Both. Templates and established components are used when they save time without limiting the result. Custom code is used for unique workflows, plugins, dashboards, account logic, APIs, forms, product structures, and frontend behavior that off-the-shelf tools cannot handle cleanly.'],
      ['How are revisions and changing requirements handled?','The agreed scope is divided into milestones with clear deliverables. Normal feedback within that scope is handled during the relevant milestone. New pages, integrations, workflows, or requirements are estimated separately before work continues, preventing surprise charges and uncontrolled scope changes.'],
      ['What do you need from me before work starts?','Usually the content, brand assets, references, required access, integrations, deadline, and the outcome the project must achieve. Fast timelines depend on those items being available and feedback arriving without long delays.'],
      ['Do you provide branding as part of a website project?','Branding can be added, but it is a separate premium service. Logo systems, identity direction, typography, colours, brand guidelines, social assets, and launch materials require their own creative scope rather than being treated as a free website extra.'],
      ['What happens after launch?','Projects include testing, deployment, and an agreed handover. Ongoing maintenance, improvements, product updates, analytics, technical support, and automation monitoring can continue under hourly work or a monthly support arrangement.']
    ];
    faq.replaceChildren(...items.map(([question,answer])=>{
      const details=document.createElement('details');
      details.innerHTML=`<summary>${question}</summary><p>${answer}</p>`;
      return details;
    }));
  }
})();