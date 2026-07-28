// Turns repetitive free-text dashboard fields into guided, editable controls.
(function adminGuidedControls(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s);

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
      ['product design + UX','Product design + UX'],
      ['brand identity + systems','Brand identity + systems'],
      ['e-commerce','E-commerce'],
      ['data + dashboards','Data + dashboards'],
      ['UI/UX + frontend','UI/UX + frontend']
    ],'This short label appears at the top-left of the project card.');

    styleExistingSelect('f-category');
    const category=q('#f-category');
    if(category&&!q('#categoryHelp')){
      const p=document.createElement('p');p.id='categoryHelp';p.className='adm-field-help';p.textContent='Used by the Work page filters. Choose the main discipline visitors should use to find this project: product, platform, web development, product design, branding, automation, or concept.';category.parentElement.after(p);
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
