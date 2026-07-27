// Turns repetitive free-text dashboard fields into guided, editable controls.
(function adminGuidedControls(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s);

  const style=document.createElement('style');
  style.textContent=`
    .adm-select-wrap{position:relative}
    .adm-select-wrap select{width:100%;min-height:48px;padding:12px 46px 12px 14px;border:1px solid var(--edge);border-radius:14px;
      appearance:none;-webkit-appearance:none;background:linear-gradient(145deg,rgba(99,102,241,.09),rgba(255,255,255,.025));
      color:var(--paper);font:inherit;font-size:14px;cursor:pointer;outline:none;transition:border-color .2s,box-shadow .2s,background .2s}
    html[data-theme="light"] .adm-select-wrap select{color:#151519;background:linear-gradient(145deg,rgba(99,102,241,.08),rgba(255,255,255,.9))}
    .adm-select-wrap select:focus{border-color:var(--signal);box-shadow:0 0 0 3px rgba(99,102,241,.13)}
    .adm-select-wrap::after{content:"";position:absolute;right:16px;top:50%;width:8px;height:8px;border-right:1.8px solid var(--signal);border-bottom:1.8px solid var(--signal);transform:translateY(-68%) rotate(45deg);pointer-events:none}
    .adm-field-help{margin:7px 0 0;color:var(--muted);font-size:12px;line-height:1.45}
    .adm-slug-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}
    .adm-slug-action{min-height:48px;padding:0 13px;border:1px solid var(--edge);border-radius:13px;background:rgba(99,102,241,.08);color:var(--paper);cursor:pointer}
    html[data-theme="light"] .adm-slug-action{color:#151519}
    .adm-slug-action:hover{border-color:var(--signal);background:rgba(99,102,241,.14)}
    .adm-model-note{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;padding:12px 14px;border:1px solid var(--line);border-radius:13px;background:rgba(99,102,241,.055);font-size:12px;color:var(--muted)}
    .adm-model-note b{display:block;color:var(--paper);font-size:13px;margin-bottom:2px}html[data-theme="light"] .adm-model-note b{color:#151519}
    .adm-model-badge{padding:4px 8px;border-radius:999px;border:1px solid rgba(99,102,241,.4);color:var(--signal-ink,var(--signal));white-space:nowrap}
    @media(max-width:620px){.adm-slug-row{grid-template-columns:1fr}.adm-slug-action{width:max-content}.adm-model-note{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const replaceWithSelect=(id,options,help)=>{
    const old=q('#'+id);if(!old||old.tagName==='SELECT')return old;
    const current=old.value;
    const select=document.createElement('select');
    [...old.attributes].forEach(attr=>select.setAttribute(attr.name,attr.value));
    select.removeAttribute('type');
    options.forEach(([value,label])=>{
      const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);
    });
    if(current&&!options.some(([value])=>value===current)){
      const option=document.createElement('option');option.value=current;option.textContent=current+' (existing)';select.append(option);
    }
    select.value=current||options[0]?.[0]||'';
    const wrap=document.createElement('div');wrap.className='adm-select-wrap';old.replaceWith(wrap);wrap.append(select);
    if(help){const p=document.createElement('p');p.className='adm-field-help';p.textContent=help;wrap.after(p)}
    return select;
  };

  const styleExistingSelect=id=>{
    const select=q('#'+id);if(!select||select.parentElement?.classList.contains('adm-select-wrap'))return;
    const wrap=document.createElement('div');wrap.className='adm-select-wrap';select.replaceWith(wrap);wrap.append(select);
  };

  const slugify=value=>value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

  const enhanceSlug=()=>{
    const slug=q('#f-slug'),title=q('#f-title');if(!slug||q('#slugRegenerate'))return;
    const parent=slug.parentElement;
    const row=document.createElement('div');row.className='adm-slug-row';
    const button=document.createElement('button');button.type='button';button.id='slugRegenerate';button.className='adm-slug-action';button.textContent='regenerate';
    slug.replaceWith(row);row.append(slug,button);
    const help=document.createElement('p');help.className='adm-field-help';help.textContent='Generated automatically from the title. Leave it as-is, or edit it for a cleaner URL.';row.after(help);
    button.addEventListener('click',()=>{slug.value=slugify(title.value);slug.dispatchEvent(new Event('input',{bubbles:true}));slug.focus()});
  };

  const enhanceModel=()=>{
    const model=replaceWithSelect('a-model',[
      ['deepseek-v4-flash','DeepSeek V4 Flash, fast and cost-effective'],
      ['deepseek-v4-pro','DeepSeek V4 Pro, strongest quality']
    ]);
    if(!model||q('#modelNote'))return;
    const note=document.createElement('div');note.id='modelNote';note.className='adm-model-note';
    const update=()=>{
      const flash=model.value==='deepseek-v4-flash';
      note.innerHTML=`<div><b>${flash?'V4 Flash':'V4 Pro'}</b>${flash?'Best default for the site guide: fast, capable, and inexpensive.':'Use when response quality matters more than latency and cost.'}</div><span class="adm-model-badge">${flash?'recommended':'premium'}</span>`;
    };
    model.parentElement.after(note);model.addEventListener('change',update);update();
  };

  const enhanceWork=()=>{
    replaceWithSelect('f-status',[
      ['active development','Active development'],
      ['live project','Live project'],
      ['shipped','Shipped'],
      ['client delivery','Client delivery'],
      ['product in development','Product in development'],
      ['prototype','Prototype'],
      ['prototype concept','Prototype concept'],
      ['case study','Case study'],
      ['paused','Paused']
    ],'Choose the clearest current state. You can still preserve an older custom value when editing an existing project.');

    replaceWithSelect('f-kicker',[
      ['developer tooling','Developer tooling'],
      ['product engineering','Product engineering'],
      ['wordpress + AI','WordPress + AI'],
      ['wordpress + integrations','WordPress + integrations'],
      ['automation platform','Automation platform'],
      ['hardware + software','Hardware + software'],
      ['web design + development','Web design + development'],
      ['e-commerce','E-commerce'],
      ['data + dashboards','Data + dashboards'],
      ['UI/UX + frontend','UI/UX + frontend']
    ],'This short label appears at the top-left of the project card.');

    styleExistingSelect('f-category');
    const category=q('#f-category');
    if(category&&!q('#categoryHelp')){
      const p=document.createElement('p');p.id='categoryHelp';p.className='adm-field-help';p.textContent='Used by the Work page filters. Product is software you own, platform is a larger client or connected system, and concept is exploratory work.';category.parentElement.after(p);
    }
    enhanceSlug();
  };

  const start=()=>{
    enhanceWork();enhanceModel();
    if(!q('#f-status')||!q('#a-model')){
      const observer=new MutationObserver(()=>{enhanceWork();enhanceModel();if(q('#f-status')&&q('#a-model'))observer.disconnect()});
      observer.observe(document.documentElement,{childList:true,subtree:true});
    }
  };
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();