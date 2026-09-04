(() => {
  const login=document.querySelector('#login'),loginForm=document.querySelector('#login-form'),settings=document.querySelector('#settings'),tokenInput=document.querySelector('#token'),loginStatus=document.querySelector('#login-status'),toast=document.querySelector('#toast'),suggestions=document.querySelector('#suggestions');
  let token=sessionStorage.getItem('nika.admin.token')||'',currentIp='';
  const fields=()=>Object.fromEntries([...settings.elements].filter(el=>el.name).map(el=>[el.name,el]));
  const request=async(path,options={})=>{const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...options.headers}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Request failed.');return data};
  const notify=(message,error=false)=>{toast.textContent=message;toast.className=`nika-toast show${error?' error':''}`;setTimeout(()=>toast.className='nika-toast',4200)};
  const split=value=>String(value||'').split(/[\s,]+/).map(item=>item.trim()).filter(Boolean);
  const suggestionMarkup=(items=[])=>{suggestions.innerHTML='';[0,1,2].forEach(index=>{const item=items[index]||{};const node=document.createElement('div');node.className='nika-suggestion';node.innerHTML=`<label>Title<input name="suggestion-${index}-label" maxlength="90"></label><label>Supporting text<input name="suggestion-${index}-description" maxlength="120"></label>`;node.querySelector(`[name$="label"]`).value=item.label||'';node.querySelector(`[name$="description"]`).value=item.description||'';suggestions.append(node)})};
  const fill=data=>{const map=fields();for(const [name,el] of Object.entries(map)){if(name.startsWith('suggestion-'))continue;const value=data[name];if(el.type==='checkbox')el.checked=Boolean(value);else if(name==='excludedPaths'||name==='exemptIps')el.value=Array.isArray(value)?value.join('\n'):value||'';else if(value!==undefined)el.value=value}suggestionMarkup(data.suggestions);document.querySelectorAll('[data-nika-image] input').forEach(el=>el.dispatchEvent(new Event('nika:fill')));renderPreview();const brand=document.querySelector('.nika-brand');
    if(brand){brand.querySelector('span').textContent=data.adminLabelInUse||'Nika';brand.querySelector('img').src=data.adminIconInUse||'/nika/nika-logo.png'}
    document.title=`${data.adminLabelInUse||'Nika'} settings`;
    const heading=document.querySelector('.nika-hero h1');
    if(heading)heading.textContent=`Set up ${data.adminLabelInUse||'Nika'} for this website.`;
    document.querySelector('#provider').textContent=data.provider||'Not connected';document.querySelector('#model').textContent=data.model||'Not connected';document.querySelector('#key').textContent=data.keyConfigured?'Configured':'Not configured';showLicence(data.licence||{});login.hidden=true;settings.hidden=false};
  // A control the package does not include stays visible, readable and labelled.
  // Hidden, it reads as "Nika cannot do this" and the owner goes looking.
  let capabilities=new Set(),packageFor={};
  const mark=(button,capability)=>{const included=capabilities.has(capability);button.classList.toggle('is-locked',!included);button.dataset.nikaPackage=packageFor[capability]||'';return included};
  const showLicence=licence=>{
    capabilities=new Set(licence.capabilities||[]);packageFor=licence.packageFor||{};
    const name=licence.packageName||'Personal';
    document.querySelector('#licence-package').textContent=licence.configured?`${name} licence`:'No licence key';
    document.querySelector('#licence-status').textContent=licence.configured
      ?(licence.message||({valid:`Active. Updates and support${licence.updatesUntil?` until ${new Date(licence.updatesUntil).toLocaleDateString()}`:''}.`,'over-limit':'This key is on more sites than its package covers. Nika keeps working here.',unreachable:'The licence service could not be reached. Nika is running normally and will check again later.',invalid:'This key was not recognised. Nika keeps working; check the key from your purchase email.'}[licence.status]||'Checking your licence.'))
      :'Set NIKA_LICENCE_KEY in .env to bring updates, support, and your package features. Nika runs either way.';
    const sites=document.querySelector('#licence-sites');
    const countable=licence.status==='valid'&&licence.sitesAllowed&&licence.siteKind!=='development';
    sites.hidden=!countable;
    if(countable)sites.textContent=`${licence.sitesUsed} of ${licence.sitesAllowed} sites`;
    const brandingChip=document.querySelector('#branding-package'),brandingBox=fields().branding;
    const unbranded=capabilities.has('unbranded');
    brandingChip.hidden=unbranded;brandingChip.textContent=packageFor.unbranded||'';
    if(brandingBox)brandingBox.disabled=!unbranded;
    document.querySelector('#branding-note').textContent=unbranded
      ?'One small line under the message box crediting Nika. Turn it off to run the guide unbranded.'
      :`One small line under the message box crediting Nika. Removing it is included in ${packageFor.unbranded||'Business'}.`;
    // The list is only ever sent when the package includes it, so an empty one
    // and an unavailable one are different things and read differently.
    const list=document.querySelector('#unanswered-list'),chip=document.querySelector('#unanswered-package'),note=document.querySelector('#unanswered-note');
    const rows=Array.isArray(licence.unanswered)?licence.unanswered:null;
    chip.hidden=Boolean(rows);chip.textContent=packageFor.question_report||'';
    list.innerHTML='';
    if(!rows){
      note.textContent=`See what visitors asked for and did not get, so you can write the page they were looking for. Included in ${packageFor.question_report||'Business'}.`;
    }else if(!rows.length){
      note.textContent='Nothing yet. A question appears here when Nika is asked for a place it cannot reach, or when a visitor reports a reply.';
    }else{
      note.textContent='Visitors who asked for something and did not get it. Most asked first. Nothing here identifies anyone.';
      for(const row of rows){
        const li=document.createElement('li');
        const q=document.createElement('span');q.className='nika-unanswered__q';q.textContent=row.question;
        const meta=document.createElement('span');meta.className='nika-unanswered__meta';
        meta.textContent=[`asked ${row.count} time${row.count===1?'':'s'}`,row.path,row.reported?'reported by a visitor':''].filter(Boolean).join(' · ');
        li.append(q,meta);list.append(li);
      }
    }
    // The header follows the resolved value the server sent, not the field, so a
    // lapsed package shows the real name even while the typed one is still saved.
    const white=capabilities.has('white_label');
    document.querySelector('#whitelabel-package').hidden=white;
    document.querySelector('#whitelabel-package').textContent=packageFor.white_label||'';
    document.querySelector('#whitelabel-fields').hidden=!white;
    document.querySelector('#whitelabel-note').textContent=white
      ?'What this page and its header call the guide. Visitors already see whatever you set under Assistant identity, on every package.'
      :`Rename this dashboard so a client does not see our name. Included in ${packageFor.white_label||'Agency'}.`;

    // Presets are Agency. The endpoint refuses without it too; this only decides
    // what the page offers.
    const presets=capabilities.has('client_presets');
    document.querySelector('#presets-package').hidden=presets;
    document.querySelector('#presets-package').textContent=packageFor.client_presets||'';
    document.querySelector('#presets-controls').hidden=!presets;
    document.querySelector('#presets-note').textContent=presets
      ?'Save this configuration under a name and apply it to the next client site. No key is ever part of a preset.'
      :`Save a configuration under a name and apply it to the next client site in one click. Included in ${packageFor.client_presets||'Agency'}.`;
    if(presets)loadPresets();
    mark(document.querySelector('#export-config'),'config_transfer');
    mark(document.querySelector('#import-config'),'config_transfer');
  };
  const load=async()=>{try{fill(await request('/nika/admin/config'));sessionStorage.setItem('nika.admin.token',token)}catch(error){login.hidden=false;settings.hidden=true;loginStatus.textContent=error.message}};
  loginForm.addEventListener('submit',event=>{event.preventDefault();token=tokenInput.value.trim();load()});
  // The preview shows a visitor what the header logo and bubble icon will be.
  document.querySelectorAll('[data-nika-image]').forEach(field=>{const input=field.querySelector('input'),preview=field.querySelector('.nika-image__preview'),image=preview.querySelector('img');const sync=()=>{const value=input.value.trim();image.src=value;preview.hidden=!value};input.addEventListener('input',sync);input.addEventListener('nika:fill',sync)});
  // The guide floats on this page exactly as it does on the site, from the same files a visitor gets, and every edit lands on it as it is typed.
  let previewGuide;
  const previewSettings=()=>{const map=fields();const val=name=>map[name]?map[name].value.trim():'';return {name:val('name')||'Nika',siteName:document.title,subtitle:'website guide',avatar:val('avatar')||'/nika/nika-logo.png',launcherIcon:val('launcherIcon'),accent:val('accent')||'#6366f1',position:val('position'),panelColour:val('panelColour'),panelOpacity:val('panelOpacity'),gradientFrom:val('gradientFrom'),gradientTo:val('gradientTo'),scrollbarColour:val('scrollbarColour'),shadowColour:val('shadowColour'),textColour:val('textColour'),iconColour:val('iconColour'),customCss:val('customCss'),logoSize:val('logoSize'),markSize:val('markSize'),disclaimer:val('disclaimer'),branding:capabilities.has('unbranded')?Boolean((map.branding||{}).checked):true,placeholder:val('placeholder'),chips:[0,1,2].map(index=>({label:(map[`suggestion-${index}-label`]||{}).value||'',description:(map[`suggestion-${index}-description`]||{}).value||''})).filter(item=>item.label)}};
  const renderPreview=()=>{
    if(previewGuide)return previewGuide.update(previewSettings());
    window.__guideEmbed={apiBase:'',assetBase:'/nika',routes:{chat:'/nika/chat-stream',feedback:'/nika/guide-feedback'},headers:{Authorization:`Bearer ${token}`}};
    import('/nika/guide-shell.js')
      .then(module=>module.mountGuideShell({...previewSettings(),assetBase:'/nika',apiBase:'',stylesheet:'/nika/assistant.css',attachments:false,isolate:true,loadSettings:async()=>null}))
      .then(handle=>{previewGuide=handle;const widget=document.createElement('script');widget.src='/nika/assistant-v2.js';document.head.append(widget)});
  };
  settings.addEventListener('input',renderPreview);settings.addEventListener('change',renderPreview);
  settings.addEventListener('submit',async event=>{event.preventDefault();const map=fields();const payload={};for(const [name,el] of Object.entries(map)){if(name.startsWith('suggestion-'))continue;payload[name]=el.type==='checkbox'?el.checked:el.value}payload.suggestions=[0,1,2].map(index=>({label:map[`suggestion-${index}-label`].value,description:map[`suggestion-${index}-description`].value}));payload.excludedPaths=split(payload.excludedPaths);payload.exemptIps=split(payload.exemptIps);document.querySelector('#save-note').textContent='Saving your changes.';try{fill(await request('/nika/admin/config',{method:'PUT',body:JSON.stringify(payload)}));notify('Changes saved.')}catch(error){notify(error.message,true)}finally{document.querySelector('#save-note').textContent='Save to apply your changes.'}});
  document.querySelector('#check-ip').addEventListener('click',async()=>{const status=document.querySelector('#ip-status'),add=document.querySelector('#add-ip');status.textContent='Checking this connection.';try{const data=await request('/nika/admin/ip');currentIp=data.ip||'';const listed=split(fields().exemptIps.value).includes(currentIp);status.textContent=listed?`${currentIp} is already exempt.`:`${currentIp} is using this browser connection.`;add.hidden=listed||!currentIp}catch(error){status.textContent=error.message;add.hidden=true}});
  document.querySelector('#add-ip').addEventListener('click',()=>{const field=fields().exemptIps,values=split(field.value);if(currentIp&&!values.includes(currentIp)){field.value=[...values,currentIp].join('\n');field.dispatchEvent(new Event('input',{bubbles:true}))}document.querySelector('#add-ip').hidden=true;document.querySelector('#ip-status').textContent=`${currentIp} will be exempt after you save.`});
  const generate=async(kind,button,status)=>{button.disabled=true;button.setAttribute('aria-busy','true');status.textContent=kind==='suggestions'?'Reading indexed content and creating three suggestions.':'Reading indexed content and drafting instructions.';try{const data=await request('/nika/admin/generate',{method:'POST',body:JSON.stringify({kind})});if(kind==='suggestions'){suggestionMarkup(data.suggestions);status.textContent='New suggestions are ready. Review them, then save changes.'}else{fields().instructions.value=data.instructions||'';fields().instructions.dispatchEvent(new Event('input',{bubbles:true}));status.textContent='Draft ready. Review it, then save changes.'}}catch(error){status.textContent=error.message;notify(error.message,true)}finally{button.disabled=false;button.removeAttribute('aria-busy')}};
  document.querySelector('#generate-suggestions').addEventListener('click',event=>generate('suggestions',event.currentTarget,document.querySelector('#suggestions-status')));
  document.querySelector('#draft-instructions').addEventListener('click',event=>generate('instructions',event.currentTarget,document.querySelector('#instructions-status')));
  const presetList=document.querySelector('#preset-list');
  const drawPresets=rows=>{
    presetList.innerHTML='';
    for(const preset of rows){
      const li=document.createElement('li');
      const name=document.createElement('span');name.className='nika-presets__name';name.textContent=preset.name;
      const meta=document.createElement('span');meta.className='nika-presets__meta';
      meta.textContent=[preset.version&&`saved from ${preset.version}`,preset.at&&new Date(preset.at).toLocaleDateString()].filter(Boolean).join(' · ');
      const apply=document.createElement('button');apply.type='button';apply.className='secondary';apply.textContent='Apply';
      const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Delete';
      // Applying replaces this server's settings, so it asks in the button
      // itself: a second click on a changed label, which no stray click dismisses.
      let armed=false;
      apply.addEventListener('click',async()=>{
        if(!armed){armed=true;apply.textContent='Apply, replacing these settings?';setTimeout(()=>{armed=false;apply.textContent='Apply'},4000);return}
        try{
          const result=await request('/nika/admin/presets',{method:'POST',body:JSON.stringify({action:'apply',id:preset.id})});
          fill(result.config);
          notify(['Preset applied.'].concat(Array.isArray(result.notes)?result.notes:[]).join(' '));
        }catch(error){notify(error.message,true)}
      });
      remove.addEventListener('click',async()=>{
        try{const result=await request('/nika/admin/presets',{method:'POST',body:JSON.stringify({action:'delete',id:preset.id})});drawPresets(result.presets||[]);notify(`Deleted ${preset.name}.`)}
        catch(error){notify(error.message,true)}
      });
      const actions=document.createElement('span');actions.className='nika-presets__actions';actions.append(apply,remove);
      li.append(name,meta,actions);presetList.append(li);
    }
  };
  const loadPresets=async()=>{try{drawPresets((await request('/nika/admin/presets')).presets||[])}catch{}};
  document.querySelector('#preset-save').addEventListener('click',async()=>{
    const field=document.querySelector('#preset-name');
    const name=field.value.trim();
    if(!name){notify('Give the preset a name first.',true);field.focus();return}
    try{const result=await request('/nika/admin/presets',{method:'POST',body:JSON.stringify({action:'save',name})});field.value='';drawPresets(result.presets||[]);notify(`Saved ${name}.`)}
    catch(error){notify(error.message,true)}
  });
  const transferStatus=()=>document.querySelector('#transfer-status');
  const refuse=capability=>{transferStatus().textContent=`Moving settings between sites is included in ${packageFor[capability]||'Business'}.`};
  document.querySelector('#export-config').addEventListener('click',async()=>{
    if(!capabilities.has('config_transfer'))return refuse('config_transfer');
    transferStatus().textContent='Preparing the file.';
    try{
      const doc=await request('/nika/admin/config-export');
      const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download=`nika-settings-${String(doc.site||'site').replace(/[^a-z0-9.-]+/gi,'-')}.json`;
      document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
      transferStatus().textContent='Downloaded. No credential is in the file.';
    }catch(error){transferStatus().textContent=error.message;notify(error.message,true)}
  });
  document.querySelector('#import-config').addEventListener('click',()=>{
    if(!capabilities.has('config_transfer'))return refuse('config_transfer');
    document.querySelector('#import-file').click();
  });
  document.querySelector('#import-file').addEventListener('change',async event=>{
    const file=event.target.files&&event.target.files[0];
    // Cleared first so choosing the same file twice fires again.
    event.target.value='';
    if(!file)return;
    let parsed;
    try{parsed=JSON.parse(await file.text())}catch{transferStatus().textContent='That file could not be read as JSON.';return}
    try{
      const result=await request('/nika/admin/config-import',{method:'POST',body:JSON.stringify(parsed)});
      // The server already saved it, so refill from what it returned rather than
      // leaving the form showing what was on screen before.
      fill(result.config);
      const notes=Array.isArray(result.notes)?result.notes:[];
      transferStatus().textContent=['Settings applied.'].concat(notes).join(' ');
      notify('Settings applied.');
    }catch(error){transferStatus().textContent=error.message;notify(error.message,true)}
  });
  if(token)load();
})();
