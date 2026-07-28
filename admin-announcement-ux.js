// Turns the technical announcement form into a compact content-first editor.
(function announcementUx(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];

  const slugify=value=>value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

  function enhanceCard(card){
    if(card.dataset.uxReady)return;card.dataset.uxReady='1';
    const index=card.dataset.index;
    const fields={
      id:q(`#news-${index}-id`,card),tag:q(`#news-${index}-tag`,card),title:q(`#news-${index}-title`,card),
      cta:q(`#news-${index}-cta`,card),href:q(`#news-${index}-href`,card),body:q(`#news-${index}-body`,card)
    };
    if(!fields.title||!fields.body)return;

    const top=q('.adm-news-top',card),preview=q('.adm-news-preview',card);
    const rows=qa(':scope > .adm-two',card);
    const wrappers={};
    Object.entries(fields).forEach(([key,field])=>{if(field)wrappers[key]=field.parentElement});

    wrappers.id?.classList.add('adm-news-id');
    const main=document.createElement('div');main.className='adm-news-main';
    if(wrappers.title)main.append(wrappers.title);
    if(wrappers.body)main.append(wrappers.body);

    if(fields.tag){
      fields.tag.type='hidden';
      const wrap=document.createElement('div');
      const label=document.createElement('label');label.textContent='label';
      const shell=document.createElement('div');shell.className='adm-news-select-wrap';
      const select=document.createElement('select');select.className='adm-news-select';
      [['what\'s new',"what's new"],['product update','product update'],['new project','new project'],['notice','notice'],['coming soon','coming soon']].forEach(([text,value])=>{const o=document.createElement('option');o.textContent=text;o.value=value;select.append(o)});
      if(![...select.options].some(o=>o.value===fields.tag.value)){const o=document.createElement('option');o.textContent=fields.tag.value;o.value=fields.tag.value;select.append(o)}
      select.value=fields.tag.value||"what's new";
      select.addEventListener('change',()=>{fields.tag.value=select.value;fields.tag.dispatchEvent(new Event('input',{bubbles:true}))});
      shell.append(select);wrap.append(label,shell);wrappers.tag=wrap;
    }

    const options=document.createElement('details');options.className='adm-news-options';
    const summary=document.createElement('summary');summary.textContent='Button and advanced options';
    const body=document.createElement('div');body.className='adm-news-options-body';
    if(wrappers.tag)body.append(wrappers.tag);
    const buttonRow=document.createElement('div');buttonRow.className='adm-two';
    if(wrappers.cta)buttonRow.append(wrappers.cta);
    if(wrappers.href)buttonRow.append(wrappers.href);
    if(buttonRow.children.length)body.append(buttonRow);
    if(wrappers.id)body.append(wrappers.id);
    options.append(summary,body);

    rows.forEach(row=>row.remove());
    card.insertBefore(main,preview);
    card.insertBefore(options,preview);

    const updateHeading=()=>{const strong=q('.adm-news-top strong',card);if(strong)strong.textContent=fields.title.value.trim()||`Announcement ${Number(index)+1}`};
    let autoId=!fields.id.value||/-new$/.test(fields.id.value);
    fields.title.addEventListener('input',()=>{
      updateHeading();
      if(autoId&&fields.id){fields.id.value=`${new Date().toISOString().slice(0,10)}-${slugify(fields.title.value)||'announcement'}`;fields.id.dispatchEvent(new Event('input',{bubbles:true}))}
    });
    fields.id?.addEventListener('input',e=>{if(e.isTrusted)autoId=false});
    updateHeading();
  }

  function refresh(){
    const section=q('#view-announcements');if(section){
      const sub=q(':scope > .adm-sub',section);if(sub)sub.textContent='Create short updates that visitors see once. Put the newest announcement first.';
      const note=q(':scope > .adm-note',section);if(note){note.innerHTML='<b>Technical details are handled automatically.</b><br>The announcement ID is generated from the date and title. Open advanced options only when you need a button or custom label.'}
    }
    qa('#announcementList .adm-news-item').forEach(enhanceCard);
  }

  const start=()=>{
    refresh();
    const list=q('#announcementList');
    if(list)new MutationObserver(refresh).observe(list,{childList:true,subtree:true});
    else{const observer=new MutationObserver(()=>{if(q('#announcementList')){observer.disconnect();start()}});observer.observe(document.documentElement,{childList:true,subtree:true})}
  };
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();