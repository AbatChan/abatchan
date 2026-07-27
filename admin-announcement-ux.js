// Turns the technical announcement form into a compact content-first editor.
(function announcementUx(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];

  const style=document.createElement('style');
  style.textContent=`
    #view-announcements{min-width:0}
    #view-announcements>.adm-sub{max-width:52ch;margin-bottom:18px}
    #view-announcements>.adm-note{margin-bottom:16px!important}
    #announcementList,.adm-news-item,.adm-news-main,.adm-news-options,.adm-news-options-body{min-width:0;max-width:100%}
    .adm-news-item{gap:16px}
    .adm-news-item .adm-news-top{padding-bottom:2px}
    .adm-news-item .adm-news-top strong{font-size:17px;letter-spacing:-.02em;min-width:0;overflow-wrap:anywhere}
    .adm-news-main{display:grid;gap:14px}
    .adm-news-main textarea{min-height:120px}
    .adm-news-options{border-top:1px solid var(--line);padding-top:12px}
    .adm-news-options summary{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;list-style:none;color:var(--paper);font-size:14px}
    .adm-news-options summary::-webkit-details-marker{display:none}
    .adm-news-options summary::after{content:'+';flex:0 0 auto;color:var(--signal);font-size:18px}
    .adm-news-options[open] summary::after{content:'−'}
    .adm-news-options-body{display:grid;gap:14px;padding-top:14px}
    .adm-news-id{display:none}
    .adm-news-select-wrap{position:relative;min-width:0}
    .adm-news-select-wrap::after{content:'';position:absolute;right:15px;top:50%;width:7px;height:7px;border-right:1.8px solid var(--signal);border-bottom:1.8px solid var(--signal);transform:translateY(-70%) rotate(45deg);pointer-events:none}
    .adm-news-select{width:100%;min-width:0;min-height:46px;padding:12px 42px 12px 14px;border:1px solid var(--edge);border-radius:13px;background:linear-gradient(145deg,rgba(99,102,241,.11),rgba(255,255,255,.025));color:var(--paper);appearance:none;font:inherit;cursor:pointer;outline:none}
    .adm-news-select:focus{border-color:var(--signal);box-shadow:0 0 0 3px rgba(99,102,241,.12)}
    html[data-theme="light"] .adm-news-select{color:#151519;background:linear-gradient(145deg,rgba(99,102,241,.08),rgba(255,255,255,.9))}
    .adm-news-preview{margin-top:2px;max-width:100%;overflow:hidden}
    .adm-news-preview p,.adm-news-preview h3{overflow-wrap:anywhere}
    @media(max-width:820px){
      #view-announcements{width:100%;overflow:hidden}
      #view-announcements .adm-head{align-items:flex-start}
      #view-announcements>.adm-sub{max-width:none;margin-bottom:16px}
      #announcementList{width:100%}
      .adm-news-item{width:100%;padding:15px;border-radius:16px;gap:14px;overflow:hidden}
      .adm-news-item .adm-news-top{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px}
      .adm-news-item .adm-news-top strong{grid-column:1/-1;font-size:16px}
      .adm-news-item .adm-news-top .adm-switch{justify-self:start}
      .adm-news-item .adm-news-top .adm-icon{justify-self:end;margin-left:0}
      .adm-news-item .adm-two,.adm-news-options-body .adm-two{grid-template-columns:minmax(0,1fr)!important;gap:12px}
      .adm-news-item input[type="text"],.adm-news-item textarea,.adm-news-select{max-width:100%;font-size:16px}
      .adm-news-main textarea{min-height:132px}
      .adm-news-options summary{min-height:44px;padding:2px 0}
      .adm-news-preview{padding:15px;border-radius:14px}
      .adm-news-preview .btn{width:100%;justify-content:center;white-space:normal;text-align:center}
      .adm-announcement-actions{width:100%}
      .adm-announcement-actions .btn{width:100%;justify-content:center}
    }
    @media(max-width:430px){
      .adm-news-item{padding:13px}
      .adm-news-item .adm-news-top{grid-template-columns:minmax(0,1fr) 42px}
      .adm-news-item .adm-news-top .adm-switch{grid-column:1/2}
      .adm-news-item .adm-news-top .adm-icon{grid-column:2/3;grid-row:2}
      .adm-news-preview{padding:13px}
    }
  `;
  document.head.appendChild(style);

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