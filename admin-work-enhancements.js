// Compact homepage summary and optional gallery controls.
// Extra data stays in the existing public settings row: work.enhancements.
(function adminWorkEnhancements(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s);
  let extras={},galleryPaths=[],newFiles=[],loadedSlug='',pendingSave=false,busy=false;

  const style=document.createElement('style');
  style.textContent=`
    .adm-feature-extra{display:grid;gap:14px;padding:16px;border:1px solid var(--line);border-radius:16px;background:rgba(99,102,241,.045)}
    .adm-feature-extra[hidden]{display:none}
    .adm-feature-extra .adm-mini-note{margin:0;color:var(--muted);font-size:12px;line-height:1.55}
    .adm-media-details{border-top:1px solid var(--line);padding-top:12px}
    .adm-media-details summary{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;color:var(--paper);font-size:14px;list-style:none}
    .adm-media-details summary::-webkit-details-marker{display:none}
    .adm-media-details summary::after{content:'+';color:var(--signal);font-size:18px;line-height:1}
    .adm-media-details[open] summary::after{content:'−'}
    .adm-media-body{display:grid;gap:12px;padding-top:14px}
    .adm-gallery-input{display:none}
    .adm-gallery-drop{display:grid;place-items:center;min-height:96px;padding:16px;border:1px dashed var(--edge);border-radius:14px;color:var(--muted);font-size:13px;text-align:center;cursor:pointer;transition:.22s}
    .adm-gallery-drop:hover,.adm-gallery-drop.over{border-color:var(--signal);background:rgba(99,102,241,.07);color:var(--paper)}
    .adm-gallery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .adm-gallery-card{position:relative;aspect-ratio:8/5;border-radius:12px;overflow:hidden;border:1px solid var(--line);background:#111}
    .adm-gallery-card img{width:100%;height:100%;object-fit:cover;display:block}
    .adm-gallery-card button{position:absolute;top:7px;right:7px;width:30px;height:30px;border:0;border-radius:9px;background:rgba(8,8,12,.76);color:#fff;display:grid;place-items:center;cursor:pointer}
    .adm-gallery-card button:hover{background:#e0564a}
    .adm-enhance-status{min-height:18px;color:var(--muted);font-size:12px}
    @media(max-width:620px){.adm-gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  const loadExtras=async()=>{
    try{const rows=await sb.select('settings','key=eq.work.enhancements&select=value');extras=rows?.[0]?.value&&typeof rows[0].value==='object'?rows[0].value:{}}
    catch{extras={}}
  };
  const currentSlug=()=>q('#f-slug')?.value.trim()||'';
  const setStatus=(text,bad=false)=>{const el=q('#enhanceStatus');if(el){el.textContent=text;el.style.color=bad?'#ff9e95':''}};
  const markDirty=()=>q('#editor')?.dispatchEvent(new Event('input',{bubbles:true}));

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
        renderGallery();setStatus('Gallery changes will save with the project.');markDirty();
      });
      card.append(img,remove);grid.append(card);
    });
  };

  const loadProject=async()=>{
    const slug=currentSlug();if(!slug||slug===loadedSlug)return;
    loadedSlug=slug;await loadExtras();const extra=extras[slug]||{};
    q('#f-home-summary').value=extra.homepage_summary||'';
    galleryPaths=Array.isArray(extra.gallery_paths)?[...extra.gallery_paths]:[];
    newFiles=[];renderGallery();setStatus('');
  };

  const chooseFiles=files=>{
    const valid=[...files].filter(file=>file.type.startsWith('image/')&&file.size<=5*1024*1024);
    const room=Math.max(0,6-galleryPaths.length-newFiles.length);
    newFiles.push(...valid.slice(0,room));renderGallery();markDirty();
    setStatus(valid.length>room?'Only six extra images are kept.':'Gallery changes will save with the project.',valid.length>room);
  };

  const downscale=async file=>{
    const bitmap=await createImageBitmap(file);const max=1800,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image processing failed')),'image/webp',.86));
  };

  const saveExtras=async()=>{
    if(busy)return;const slug=currentSlug();if(!slug)return;
    busy=true;const uploaded=[];setStatus('Saving project media…');
    try{
      await loadExtras();
      for(const file of newFiles){const blob=await downscale(file);const path=`gallery/${slug}-${Date.now()}-${uploaded.length}.webp`;await sb.upload('work',path,blob);uploaded.push(path)}
      const previous=extras[slug]||{};const kept=[...galleryPaths,...uploaded];
      extras[slug]={...previous,homepage_summary:q('#f-home-summary').value.trim()||null,gallery_paths:kept};
      await sb.upsert('settings',[{key:'work.enhancements',value:extras,is_public:true}]);
      const removed=(Array.isArray(previous.gallery_paths)?previous.gallery_paths:[]).filter(path=>!kept.includes(path));
      for(const path of removed){try{await sb.removeFile('work',path)}catch{}}
      galleryPaths=kept;newFiles=[];renderGallery();setStatus('Project and media saved.');
    }catch(err){for(const path of uploaded){try{await sb.removeFile('work',path)}catch{}}setStatus(`Media could not save. ${err.message}`,true)}
    finally{busy=false}
  };

  const wait=()=>{
    const editor=q('#editor'),featured=q('#f-featured'),actions=q('.adm-actions',editor);
    if(!editor||!featured||!actions)return false;
    const block=document.createElement('section');block.className='adm-feature-extra';block.id='workEnhancements';block.hidden=!featured.checked;
    block.innerHTML=`
      <div><label for="f-home-summary">homepage summary</label><textarea id="f-home-summary" maxlength="180" placeholder="Short version used only on the homepage."></textarea><p class="adm-mini-note">Shown only when this project is Featured. Leave empty to reuse the main summary.</p></div>
      <details class="adm-media-details"><summary>Gallery images <span style="color:var(--muted);font-size:12px">optional</span></summary><div class="adm-media-body"><div class="adm-gallery-drop" id="galleryDrop" tabindex="0" role="button">Drop images here, or click to choose<br><small>Up to 6 extra images</small></div><input class="adm-gallery-input" id="galleryInput" type="file" accept="image/*" multiple><div class="adm-gallery-grid" id="galleryGrid"></div></div></details>
      <div class="adm-enhance-status" id="enhanceStatus"></div>`;
    actions.before(block);

    featured.addEventListener('change',()=>{block.hidden=!featured.checked;markDirty()});
    q('#f-home-summary').addEventListener('input',markDirty);
    const drop=q('#galleryDrop'),input=q('#galleryInput');
    drop.addEventListener('click',()=>input.click());drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});
    input.addEventListener('change',()=>chooseFiles(input.files));
    ['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('over')}));
    ['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('over')}));
    drop.addEventListener('drop',e=>chooseFiles(e.dataTransfer.files));

    editor.addEventListener('submit',()=>{pendingSave=true},{capture:true});
    const view=q('#view-editor');
    new MutationObserver(()=>{
      if(!view.classList.contains('adm-hide')){block.hidden=!featured.checked;setTimeout(loadProject,0);return}
      if(pendingSave){pendingSave=false;saveExtras()}
    }).observe(view,{attributes:true,attributeFilter:['class']});
    q('#f-slug').addEventListener('change',()=>{loadedSlug='';loadProject()});
    return true;
  };

  const start=async()=>{await loadExtras();if(!wait()){const observer=new MutationObserver(()=>{if(wait())observer.disconnect()});observer.observe(document.documentElement,{childList:true,subtree:true})}};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();