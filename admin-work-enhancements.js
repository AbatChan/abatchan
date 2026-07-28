// Homepage summary plus ordered gallery controls for every project.
(function adminWorkEnhancements(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s);
  let extras={},entries=[],loadedSlug='',pendingSave=false,busy=false,dragIndex=-1;
  const MAX_GALLERY_IMAGES=12;

  const style=document.createElement('style');
  style.dataset.adminWorkEnhancements='4';
  style.textContent=`
    .adm-work-extra{display:grid;gap:14px;padding:16px;border:1px solid var(--line);border-radius:16px;background:rgba(245,245,243,.018)}
    .adm-home-extra{display:grid;gap:10px;padding:14px;border:1px solid rgba(99,102,241,.28);border-radius:14px;background:rgba(99,102,241,.045)}
    .adm-home-extra[hidden]{display:none}.adm-mini-note{margin:0;color:var(--muted);font-size:12px;line-height:1.55}
    .adm-media-details{border-top:1px solid var(--line);padding-top:12px}.adm-media-details summary{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;color:var(--paper);font-size:14px;list-style:none}.adm-media-details summary::-webkit-details-marker{display:none}.adm-media-details summary::after{content:'+';color:var(--signal);font-size:18px}.adm-media-details[open] summary::after{content:'−'}
    .adm-media-body{display:grid;gap:12px;padding-top:14px}.adm-gallery-input{display:none}.adm-gallery-drop{display:grid;place-items:center;min-height:104px;padding:18px;border:1px dashed var(--edge);border-radius:14px;color:var(--muted);font-size:13px;text-align:center;cursor:pointer;transition:.22s}.adm-gallery-drop:hover,.adm-gallery-drop.over{border-color:var(--signal);background:rgba(99,102,241,.07);color:var(--paper)}
    .adm-gallery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.adm-gallery-card{position:relative;aspect-ratio:8/5;border-radius:12px;overflow:hidden;border:1px solid var(--line);background:#111;cursor:grab}.adm-gallery-card.dragging{opacity:.45}.adm-gallery-card img{width:100%;height:100%;object-fit:cover;display:block}.adm-gallery-order{position:absolute;left:7px;top:7px;min-width:25px;height:25px;padding:0 6px;border-radius:8px;background:rgba(8,8,12,.78);color:#fff;display:grid;place-items:center;font-size:11px}.adm-gallery-tools{position:absolute;right:7px;top:7px;display:flex;gap:5px}.adm-gallery-tools button{width:30px;height:30px;border:0;border-radius:9px;background:rgba(8,8,12,.78);color:#fff;display:grid;place-items:center;cursor:pointer}.adm-gallery-tools button:hover{background:var(--signal)}.adm-gallery-tools .remove:hover{background:#e0564a}.adm-enhance-status{min-height:18px;color:var(--muted);font-size:12px}
    html[data-theme="light"] .adm-work-extra{background:rgba(21,21,25,.018)}
    @media(max-width:620px){.adm-gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  const loadExtras=async()=>{try{const rows=await sb.select('settings','key=eq.work.enhancements&select=value');extras=rows?.[0]?.value&&typeof rows[0].value==='object'?rows[0].value:{}}catch{extras={}}};
  const currentSlug=()=>q('#f-slug')?.value.trim()||'';
  const setStatus=(text,bad=false)=>{const el=q('#enhanceStatus');if(el){el.textContent=text;el.style.color=bad?'#ff9e95':''}};
  const markDirty=()=>q('#editor')?.dispatchEvent(new Event('input',{bubbles:true}));
  const cleanupUrls=()=>entries.forEach(entry=>{if(entry.objectUrl)URL.revokeObjectURL(entry.objectUrl)});

  const move=(from,to)=>{if(to<0||to>=entries.length||from===to)return;const [entry]=entries.splice(from,1);entries.splice(to,0,entry);renderGallery();setStatus('Gallery order will save with the project.');markDirty()};
  const renderGallery=()=>{
    const grid=q('#galleryGrid');if(!grid)return;grid.replaceChildren();
    entries.forEach((entry,index)=>{
      const card=document.createElement('div');card.className='adm-gallery-card';card.draggable=true;
      card.addEventListener('dragstart',()=>{dragIndex=index;card.classList.add('dragging')});card.addEventListener('dragend',()=>{dragIndex=-1;card.classList.remove('dragging')});card.addEventListener('dragover',e=>e.preventDefault());card.addEventListener('drop',e=>{e.preventDefault();if(dragIndex>=0)move(dragIndex,index)});
      const img=document.createElement('img');img.src=entry.path?sb.publicUrl('work',entry.path):entry.objectUrl;img.alt='';
      const order=document.createElement('span');order.className='adm-gallery-order';order.textContent=String(index+1);
      const tools=document.createElement('div');tools.className='adm-gallery-tools';
      const left=document.createElement('button');left.type='button';left.textContent='←';left.disabled=index===0;left.setAttribute('aria-label','Move image earlier');left.addEventListener('click',()=>move(index,index-1));
      const right=document.createElement('button');right.type='button';right.textContent='→';right.disabled=index===entries.length-1;right.setAttribute('aria-label','Move image later');right.addEventListener('click',()=>move(index,index+1));
      const remove=document.createElement('button');remove.type='button';remove.className='remove';remove.textContent='×';remove.setAttribute('aria-label','Remove image');remove.addEventListener('click',()=>{if(entry.objectUrl)URL.revokeObjectURL(entry.objectUrl);entries.splice(index,1);renderGallery();setStatus('Gallery changes will save with the project.');markDirty()});
      tools.append(left,right,remove);card.append(img,order,tools);grid.append(card);
    });
  };

  const loadProject=async(force=false)=>{
    const slug=currentSlug();if(!force&&slug===loadedSlug)return;loadedSlug=slug;cleanupUrls();entries=[];await loadExtras();const extra=slug?(extras[slug]||{}):{};
    q('#f-home-summary').value=extra.homepage_summary||'';entries=(Array.isArray(extra.gallery_paths)?extra.gallery_paths:[]).map(path=>({path}));renderGallery();setStatus('');
  };
  const chooseFiles=files=>{
    const valid=[...files].filter(file=>file.type.startsWith('image/')&&file.size<=5*1024*1024);const room=Math.max(0,MAX_GALLERY_IMAGES-entries.length);
    valid.slice(0,room).forEach(file=>entries.push({file,objectUrl:URL.createObjectURL(file)}));renderGallery();markDirty();setStatus(valid.length>room?`Only ${MAX_GALLERY_IMAGES} extra images are kept. Drag them to set display order.`:'Drag images or use arrows to set display order.',valid.length>room);
  };
  const downscale=async file=>{const bitmap=await createImageBitmap(file),max=1800,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image processing failed')),'image/webp',.86))};

  const saveExtras=async()=>{
    if(busy)return;const slug=currentSlug();if(!slug)return;busy=true;const uploaded=[];setStatus('Saving project media…');
    try{await loadExtras();const previous=extras[slug]||{},ordered=[];for(const entry of entries){if(entry.path){ordered.push(entry.path);continue}const blob=await downscale(entry.file),path=`gallery/${slug}-${Date.now()}-${ordered.length}.webp`;await sb.upload('work',path,blob);uploaded.push(path);ordered.push(path)}extras[slug]={...previous,homepage_summary:q('#f-home-summary').value.trim()||null,gallery_paths:ordered};await sb.upsert('settings',[{key:'work.enhancements',value:extras,is_public:true}]);const removed=(Array.isArray(previous.gallery_paths)?previous.gallery_paths:[]).filter(path=>!ordered.includes(path));for(const path of removed){try{await sb.removeFile('work',path)}catch{}}cleanupUrls();entries=ordered.map(path=>({path}));renderGallery();setStatus('Project and gallery order saved.')}
    catch(err){for(const path of uploaded){try{await sb.removeFile('work',path)}catch{}}setStatus(`Media could not save. ${err.message}`,true)}finally{busy=false}
  };

  const wait=()=>{
    const editor=q('#editor'),featured=q('#f-featured'),actions=q('.adm-actions',editor);if(!editor||!featured||!actions)return false;
    q('#workEnhancements')?.remove();
    const block=document.createElement('section');block.className='adm-work-extra';block.id='workEnhancements';block.innerHTML=`<div class="adm-home-extra" id="homepageExtra"><div><label for="f-home-summary">homepage summary</label><textarea id="f-home-summary" maxlength="180" placeholder="Short version used only on the homepage."></textarea><p class="adm-mini-note">This field is used only when “add to homepage” is enabled. Leave it empty to reuse the main summary.</p></div></div><details class="adm-media-details" open><summary>Project gallery <span style="color:var(--muted);font-size:12px">available for every project · cover stays first</span></summary><div class="adm-media-body"><div class="adm-gallery-drop" id="galleryDrop" tabindex="0" role="button">Drop images here, or click to choose<br><small>Up to ${MAX_GALLERY_IMAGES} extras · drag to reorder</small></div><input class="adm-gallery-input" id="galleryInput" type="file" accept="image/*" multiple><div class="adm-gallery-grid" id="galleryGrid"></div></div></details><div class="adm-enhance-status" id="enhanceStatus"></div>`;actions.before(block);
    const homeBlock=q('#homepageExtra');const syncHomepageVisibility=()=>{homeBlock.hidden=!featured.checked};syncHomepageVisibility();
    featured.addEventListener('change',()=>{syncHomepageVisibility();markDirty()});q('#f-home-summary').addEventListener('input',markDirty);const drop=q('#galleryDrop'),input=q('#galleryInput');drop.addEventListener('click',()=>input.click());drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});input.addEventListener('change',()=>chooseFiles(input.files));['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('over')}));['dragleave','drop'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.remove('over')}));drop.addEventListener('drop',e=>chooseFiles(e.dataTransfer.files));
    editor.addEventListener('submit',()=>{pendingSave=true},{capture:true});const view=q('#view-editor');new MutationObserver(()=>{if(!view.classList.contains('adm-hide')){syncHomepageVisibility();setTimeout(()=>loadProject(true),0);return}if(pendingSave){pendingSave=false;saveExtras()}}).observe(view,{attributes:true,attributeFilter:['class']});q('#f-slug').addEventListener('change',()=>loadProject(true));return true;
  };
  const start=async()=>{await loadExtras();if(!wait()){const observer=new MutationObserver(()=>{if(wait())observer.disconnect()});observer.observe(document.documentElement,{childList:true,subtree:true})}};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
