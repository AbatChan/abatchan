// Final dashboard UX corrections shared across the work and settings editors.
(function adminUxFixes(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];

  function removeLegacySmartSave(){
    q('#admSmartSave')?.remove();
  }

  function moveSaveButton(buttonSelector,anchorSelector,position='afterend'){
    const button=q(buttonSelector),anchor=q(anchorSelector);
    if(!button||!anchor||button.closest('.adm-form-save'))return;
    let actions=document.createElement('div');
    actions.className='adm-form-save';
    if(position==='append')anchor.append(actions);
    else anchor.insertAdjacentElement(position,actions);
    actions.append(button);
  }

  function relocateSettingsSaves(){
    moveSaveButton('#saveCopy','#copyForm','afterend');
    moveSaveButton('#saveAssistant','#assistantForm','append');
    const announcementActions=q('#view-announcements .adm-announcement-actions');
    const saveAnnouncements=q('#saveAnnouncements');
    if(announcementActions&&saveAnnouncements&&!saveAnnouncements.closest('.adm-form-save')){
      announcementActions.classList.add('adm-form-save');
      announcementActions.append(saveAnnouncements);
    }
  }

  function enhanceCoverUpload(){
    const input=q('#f-image');
    if(!input||input.dataset.coverUx)return;
    input.dataset.coverUx='1';
    const label=document.querySelector('label[for="f-image"]');
    if(label)label.textContent='project cover image';
    const drop=q('#drop');
    if(drop&&!q('.adm-cover-help',drop.parentElement)){
      const help=document.createElement('p');
      help.className='adm-cover-help';
      help.textContent='This is the main image shown on the Work page and homepage. If it is empty, the homepage uses an authored fallback visual.';
      drop.after(help);
    }
  }

  function enhanceFeatured(){
    const input=q('#f-featured');
    if(!input||input.dataset.uxFixed)return;
    input.dataset.uxFixed='1';
    const label=input.closest('label.adm-switch');
    if(!label)return;
    label.classList.add('adm-featured-control');
    const text=label.querySelector('span:last-child');
    if(text)text.textContent='show on homepage';
    const help=document.createElement('p');
    help.className='adm-featured-help';
    help.textContent='Featured projects can fill the first three homepage slots, using the project order.';
    label.after(help);
  }

  function updatePreview(card){
    const index=card.dataset.index;
    const preview=q('.adm-news-preview',card);
    if(!preview)return;
    let label=card.querySelector('.adm-preview-label');
    if(!label){
      label=document.createElement('div');
      label.className='adm-preview-label';
      label.textContent='Live preview';
      preview.before(label);
    }
    const cta=q(`#news-${index}-cta`,card)?.value.trim()||'';
    const href=q(`#news-${index}-href`,card)?.value.trim()||'';
    let button=preview.querySelector('.adm-preview-cta');
    if(cta||href){
      if(!button){
        button=document.createElement('a');
        button.className='btn primary sm adm-preview-cta';
        button.addEventListener('click',e=>e.preventDefault());
        preview.append(button);
      }
      button.href=href||'#';
      button.innerHTML=`${cta||'view update'} <span class="arrow">↗</span>`;
      button.title=href?`Links to ${href}`:'Add a button link in advanced options';
    }else button?.remove();
  }

  function enhanceAnnouncementCard(card){
    if(card.dataset.finalUx)return;
    card.dataset.finalUx='1';
    const index=card.dataset.index;
    ['title','body','cta','href','tag'].forEach(name=>{
      q(`#news-${index}-${name}`,card)?.addEventListener('input',()=>requestAnimationFrame(()=>updatePreview(card)));
      q(`#news-${index}-${name}`,card)?.addEventListener('change',()=>requestAnimationFrame(()=>updatePreview(card)));
    });
    updatePreview(card);
  }

  function enhanceAnnouncements(){
    const section=q('#view-announcements');
    if(!section)return;
    const note=q(':scope > .adm-note',section);if(note)note.remove();
    qa('#announcementList .adm-news-item').forEach(enhanceAnnouncementCard);
  }

  function initialEnhance(){
    removeLegacySmartSave();
    relocateSettingsSaves();
    enhanceCoverUpload();
    enhanceFeatured();
    enhanceAnnouncements();
  }

  const start=()=>{
    initialEnhance();
    const list=q('#announcementList');
    if(list)new MutationObserver(enhanceAnnouncements).observe(list,{childList:true});
    new MutationObserver(()=>{removeLegacySmartSave();relocateSettingsSaves()}).observe(document.body,{childList:true,subtree:true});
  };
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
