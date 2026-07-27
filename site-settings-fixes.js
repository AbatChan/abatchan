// Keep global contact settings consistent across every page and mail action.
(function siteSettingsFixes(){
  if(!window.sb?.configured?.())return;
  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
  const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let contactEmail='abatchan4@gmail.com';

  const applyEmail=email=>{
    if(!EMAIL_RE.test(email))return;
    contactEmail=email;
    window.__abatContactEmail=email;

    qa('a[href^="mailto:"]').forEach(link=>{
      const old=link.getAttribute('href')||'';
      const query=old.includes('?')?'?'+old.split('?').slice(1).join('?'):'';
      link.href=`mailto:${email}${query}`;
      if(EMAIL_RE.test(link.textContent.trim()))link.textContent=email;
    });

    qa('[data-copy="copy.contact.email"],.contact-mail').forEach(el=>{
      if(el.tagName==='A')el.href=`mailto:${email}`;
      el.textContent=email;
    });

    qa('script[type="application/ld+json"]').forEach(script=>{
      try{
        const data=JSON.parse(script.textContent);
        const patch=node=>{
          if(Array.isArray(node))return node.forEach(patch);
          if(!node||typeof node!=='object')return;
          if('email' in node)node.email=email;
          Object.values(node).forEach(patch);
        };
        patch(data);script.textContent=JSON.stringify(data);
      }catch{}
    });
  };

  sb.select('settings','key=eq.copy.contact.email&is_public=eq.true&select=value')
    .then(rows=>{const value=rows?.[0]?.value;if(typeof value==='string')applyEmail(value.trim())})
    .catch(()=>{});

  const form=q('#project-form');
  if(form){
    form.addEventListener('submit',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      const data=new FormData(form);
      const subject=encodeURIComponent(`Project enquiry: ${data.get('name')||''}`);
      const body=encodeURIComponent(`Name: ${data.get('name')||''}\nEmail: ${data.get('email')||''}\nProject type: ${data.get('type')||''}\n\n${data.get('message')||''}`);
      location.href=`mailto:${contactEmail}?subject=${subject}&body=${body}`;
    },true);
  }
})();