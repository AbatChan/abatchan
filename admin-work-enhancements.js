// Adds homepage selection copy and multi-image galleries without changing work_items.
// Extra data is stored in the existing public settings row: work.enhancements.
(function adminWorkEnhancements(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];
  let extras={},galleryPaths=[],newFiles=[],loadedSlug='',busy=false;

  const style=document.createElement('style');
  style.textContent=`
    .adm-enhance{display:grid;gap:14px;padding:18px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(145deg,rgba(99,102,241,.08),rgba(255,255,255,.015))}
    .adm-enhance-head{display:flex;align-items:start;justify-content:space-between;gap:18px}
    .adm-enhance-head h3{font-size:17px;margin:0 0 4px}.adm-enhance-head p{margin:0;color:var(--muted);font-size:12px;max-width:52ch}
    .adm-gallery-input{display:none}
    .adm-gallery-drop{display:grid;place-items:center;min-height:112px;padding:18px;border:1px dashed var(--edge);border-radius:15px;color:var(--muted);font-size:13px;text-align:center;cursor:pointer;transition:.22s}
    .adm-gallery-drop:hover,.adm-gallery-drop.over{border-color:var(--signal);background:rgba(99,102,241,.08);color:var(--paper)}
    .adm-gallery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .adm-gallery-card{position:relative;aspect-ratio:8/5;border-radius:13px;overflow:hidden;border:1px solid var(--line);background:#111}
    .adm-gallery-card img{width:100%;height:100%;object-fit:cover;display:block}
    .adm-gallery-card button{position:absolute;top:7px;right:7px;width:30px;height:30px;border:0;border-radius:9px;background:rgba(8,8,12,.72);color:#fff;display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(10px)}
    .adm-gallery-card button:hover{background:#e0564a}
    .adm-enhance-status{min-height:20px;color:var(--muted);font-size:12px}
    .adm-home-slots{font-size:12px;color:var(--signal-ink,var(--signal));white-space:nowrap}
    @media(max-width:620px){.adm-gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.adm-enhance-head{display:grid}}
  `;
  document.head.appendChild(style);

  const wait=()=>{
    const editor=q('#editor'),link=q('#f-link');
    if(!editor||!link)return false;
    const linkLabel=document.querySelector('label[for="f-link"]');
    if(linkLabel)linkLabel.textContent='project or site link (optional)';
    link.placeholder='https://your-project.com or /case-study';
    if(!q('#linkHelp')){
      const help=document.createElement('p');help.id='linkHelp';help.className='adm-sub';help.style.cssText='margin:7px 0 0;font-size:12px';
      help.textContent='Leave this empty and no “view project” button will appear.';link.parentElement.append(help);
    }

    const block=document.createElement('section');block.className='adm-enhance';block.id='workEnhancements';
    block.innerHTML=`
      <div class="adm-enhance-head"><div><h3>Homepage and gallery</h3><p>Published featured projects can fill the three homepage slots. Add a short homepage summary and optional extra images for a swipeable gallery.</p></div><span class="adm-home-slots" id="homeSlots"></span></div>
      <div><label for="f-home-summary">homepage summary</label><textarea id="f-home-summary" maxlength="180" placeholder="A sharp 18 to 32 word summary for the homepage card."></textarea></div>
      <div><label>gallery images</label><div class="adm-gallery-drop" id="galleryDrop" tabindex="0" role="button">Drop images here, or click to choose<br><small>WebP, JPG or PNG. Up to 6 extra images.</small></div><input class="adm-gallery-input" id="galleryInput" type="file" accept="image/*" multiple><div class="adm-gallery-grid" id="galleryGrid"></div></div>
      <div class="adm-enhance-status" id="enhanceStatus"></div>
      <div class="adm-actions"><button class="btn" type="button" id="saveEnhancements">save homepage and gallery</button></div>`;
    q('.adm-actions',editor).before(block);

    setupEvents();refreshSlots();observeEditor();return true;
  };

  const loadExtras=async()=>{
    try{const rows=await sb.select('settings','key=eq.work.enhancements&select=value');extras=rows?.[0]?.value&&typeof rows[0].value==='object'?rows[0].value:{}}
    catch{extras={}}
  };
  const refreshSlots=async()=>{
    try{
      const rows=await sb.select('work_items','published=eq.true&featured=eq.true&select=id&order=position.asc,created_at.asc');
      q('#homeSlots').textContent=`homepage slots: ${Math.min(rows.length,3)} / 3`;
    }catch{q('#homeSlots').textContent='homepage slots'}
  };
  const currentSlug=()=>q('#f-slug')?.value.trim()||'';
  const isExisting=()=>/^Edit\s/.test(q('#editorTitle')?.textContent||'');
  const setStatus=(text,bad=false)=>{const el=q('#enhanceStatus');if(el){el.textContent=text;el.style.color=bad?'#ff9e95':''}};

  const renderGallery=()=>{
    const grid=q('#galleryGrid');if(!grid)return;grid.replaceChildren();
    const stored=galleryPaths.map(path=>({path,url:sb.publicUrl('work',path),stored:true}));
    const pending=newFiles.map(file=>({file,url:URL.createObjectURL(file),stored:false}));
    [...stored,...pending].forEach((entry,index)=>{
      const card=document.createElement('div');card.className='adm-gallery-card';
      const img=document.createElement('img');img.src=entry.url;img.alt='';
      const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label','Remove image');remove.textContent='×';
      remove.addEventListener('click',()=>{
        if(entry.stored)galleryPaths=galleryPaths.filter(path=>path!==entry.path);else newFiles.splice(index-stored.length,1);
        renderGallery();setStatus('Unsaved gallery changes.');
      });
      card.append(img,remove);grid.append(card);
    });
  };

  const loadProject=async()=>{
    const slug=currentSlug();if(!slug||!isExisting()||slug===loadedSlug)return;
    loadedSlug=slug;await loadExtras();const extra=extras[slug]||{};
    q('#f-home-summary').value=extra.homepage_summary||'';galleryPaths=Array.isArray(extra.gallery_paths)?[...extra.gallery_paths]:[];newFiles=[];renderGallery();setStatus('');
  };
  const observeEditor=()=>{
    const section=q('#view-editor');
    new MutationObserver(()=>{if(!section.classList.contains('adm-hide'))setTimeout(loadProject,0)}).observe(section,{attributes:true,attributeFilter:['class']});
    q('#f-slug').addEventListener('change',()=>{loadedSlug='';loadProject()});
  };

  const chooseFiles=files=>{
    const valid=[...files].filter(file=>file.type.startsWith('image/')&&file.size<=5*1024*1024);
    const room=Math.max(0,6-galleryPaths.length-newFiles.length);newFiles.push(...valid.slice(0,room));renderGallery();
    if(valid.length>room)setStatus('Only six extra gallery images are kept.',true);else setStatus('Unsaved gallery changes.');
  };
  const downscale=async file=>{
    const bitmap=await createImageBitmap(file);const max=1800,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image processing failed')),'image/webp',.86));
  };

  const save=async()=>{
    if(busy)return;const slug=currentSlug();
    if(!slug||!isExisting())return setStatus('Save the project first, then reopen it to add homepage content and gallery images.',true);
    busy=true;const button=q('#saveEnhancements');button.disabled=true;button.textContent='saving…';setStatus('Uploading gallery images…');
    const uploaded=[];
    try{
      await loadExtras();
      for(const file of newFiles){const blob=await downscale(file);const path=`gallery/${slug}-${Date.now()}-${uploaded.length}.webp`;await sb.upload('work',path,blob);uploaded.push(path)}
      const previous=extras[slug]||{};const kept=[...galleryPaths,...uploaded];
      extras[slug]={...previous,homepage_summary:q('#f-home-summary').value.trim()||null,gallery_paths:kept};
      await sb.upsert('settings',[{key:'work.enhancements',value:extras,is_public:true}]);
      const removed=(Array.isArray(previous.gallery_paths)?previous.gallery_paths:[]).filter(path=>!kept.includes(path));
      for(const path of removed){try{await sb.removeFile('work',path)}catch{}}
      galleryPaths=kept;newFiles=[];renderGallery();setStatus('Homepage and gallery saved.');
    }catch(err){for(const path of uploaded){try{await sb.removeFile('work',path)}catch{}}setStatus(`Could not save. ${err.message}`,true)}
    finally{busy=false;button.disabled=false;button.textContent='save homepage and gallery'}
  };

  const setupEvents=()=>{
    const drop=q('#galleryDrop'),input=q('#galleryInput');
    drop.addEventListener('click',()=>input.click());drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});
    input.addEventListener('change',()=>chooseFiles(input.files));
    ['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('over')}));
    ['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('over')}));
    drop.addEventListener('drop',e=>chooseFiles(e.dataTransfer.files));q('#saveEnhancements').addEventListener('click',save);
  };

  const start=async()=>{await loadExtras();if(!wait()){const observer=new MutationObserver(()=>{if(wait())observer.disconnect()});observer.observe(document.documentElement,{childList:true,subtree:true})}};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
