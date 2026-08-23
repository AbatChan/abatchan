// Progressive Markdown renderer and real streaming transport for the site guide.
// Loaded after script.js through supabase-config.js and intentionally scoped to
// the assistant so the rest of the static site keeps its zero-build setup.

(function assistantV2(){
  // Served from our own domain rather than a CDN. The previous marked URL was
  // unpinned, so whatever version jsdelivr resolved to that day was executing
  // here — on a library that renders model output. These are the exact bytes
  // that URL served, pinned. Same-origin also means they cache with the site
  // and cost no extra connection on first paint.
  const CDN={
    marked:'/assets/vendor/marked-15.0.12.min.js',
    purify:'/assets/vendor/purify-3.4.7.min.js'
  };
  const STORE='abatchanGuideHistoryV1';
  const NAV_STORE='abatchanGuideNavigationV1';
  const JOURNEY_STORE='abatchanGuideJourneyV1';
  const PAGE_STORE='abatchanGuideCurrentPageV1';
  const TRANSITION_STORE='abatNavigationPending';
  const ACTION_MODE_STORE='abatchanGuideActionModeV1';
  const ANSWER_DEPTH_STORE='abatchanGuideAnswerDepthV1';
  const MAX_STORED=24;
  const MAX_ATTACHMENTS=10;
  const WHATSAPP='https://wa.me/2347041857921';
  const uid=()=>crypto.randomUUID?.()||`m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

  // Stable destinations for conversational navigation. Existing authored IDs
  // remain the source of truth; headings only receive an ID when the page did
  // not already provide one. The model can therefore point at a real section
  // without receiving arbitrary DOM control.
  const SECTION_TITLES={
    '/':{
      'selected-work':'Interface to infrastructure.',
      'services':'One connected delivery layer.',
      'delivery-process':'Clean execution, end to end.',
      'client-reviews':'Reviewed by the people who hired me.',
      'start-project':'If it plugs in, I build it.'
    },
    '/about':{'name-explanation':'Name explanation','principles':'Connected by default.','capabilities':'Design, code, connect.','start-project':'Modern systems. Clean execution.'},
    '/pricing':{'website':'Website','platform':'Platform','system':'System','quote-process':'Quote the work, not the hype.','client-reviews':'What clients say after delivery.','pricing-faq':'Useful details before we start.','start-project':'Tell me what needs to work.'},
    '/reviews':{'start-project':'Tell me what needs to work.'},
    '/brand':{'name':'One word, always lowercase.','voice':'What the brand says.','symbol':'Mirrored, open geometry.','downloads':'The short version.','start-project':'Need something not listed here?'}
  };
  const PRECISE_TARGETS={
    '/about':{'name-explanation':{selector:'.about-copy>p:nth-of-type(2)',label:'name explanation'}},
    '/pricing':{'monthly-support':{selector:'.scope-strip .scope-item:nth-child(3)',label:'Monthly support'}}
  };
  const targetText=node=>{
    const heading=node.matches('h1,h2,h3')?node:node.querySelector('h1,h2,h3');
    const labelled=node.matches('label')?node:node.querySelector('label');
    const summary=node.matches('summary')?node:node.querySelector('summary');
    return (node.dataset.assistTarget||heading?.textContent||labelled?.textContent||summary?.textContent||node.getAttribute('aria-label')||(node.matches('p')?node.textContent:'')||'').replace(/\s+/g,' ').trim().slice(0,120);
  };
  const targetSlug=text=>text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,58)||'content';
  const installAutomaticTargets=()=>{
    const main=document.querySelector('main');
    if(!main)return;
    const used=new Set([...main.querySelectorAll('[id]')].map(node=>node.id));
    const candidates=[...main.querySelectorAll('h1,h2,h3,article,details,form,.field,p,[class$="-card"],[class$="-item"],[class$="-step"],[class$="-row"]')];
    candidates.forEach(node=>{
      if(node.closest('[hidden],[aria-hidden="true"]'))return;
      const label=targetText(node);
      if(!label||label.length<3)return;
      if(!node.dataset.assistTarget)node.dataset.assistTarget=label;
      if(node.id){used.add(node.id);return}
      const base=`assist-${targetSlug(label)}`;
      let id=base,index=2;
      while(used.has(id))id=`${base}-${index++}`;
      node.id=id;used.add(id);
    });
  };
  const PUBLIC_PATHS=new Set(['/','/work','/about','/pricing','/process','/brand','/contact','/reviews','/bookingkoala','/privacy','/terms']);
  const pagePath=()=>location.pathname.replace(/\/index(?:\.html)?$/,'/').replace(/\.html$/,'').replace(/\/+$/,'')||'/';
  const publicPath=url=>(url.pathname.replace(/\.html$/,'').replace(/\/+$/,'')||'/');
  const isSafeDestination=url=>url.origin===location.origin&&PUBLIC_PATHS.has(publicPath(url));
  let navigationState={source:'initial',from:null,to:pagePath()};
  const syncNavigationState=()=>{
    const current=pagePath();
    try{
      const previous=sessionStorage.getItem(PAGE_STORE);
      let handoff=null;
      try{handoff=JSON.parse(sessionStorage.getItem(NAV_STORE)||'null')}catch{}
      let guidedTarget='';
      try{if(handoff?.href)guidedTarget=publicPath(new URL(handoff.href,location.href))}catch{}
      if(previous&&previous!==current){
        const guided=guidedTarget===current;
        navigationState={source:guided?'guide':'visitor',from:previous,to:current};
        if(!guided)sessionStorage.removeItem(NAV_STORE);
      }else if(!previous){
        navigationState={source:'initial',from:null,to:current};
      }
      sessionStorage.setItem(PAGE_STORE,current);
    }catch{navigationState={source:'unknown',from:null,to:current}}
  };
  syncNavigationState();
  addEventListener('pageshow',syncNavigationState);
  const installSectionAnchors=()=>{
    Object.entries(PRECISE_TARGETS[pagePath()]||{}).forEach(([id,target])=>{
      const node=document.querySelector(target.selector);
      if(!node)return;
      node.id=id;
      node.dataset.assistTarget=target.label;
    });
    const wanted=SECTION_TITLES[pagePath()]||{};
    const headings=[...document.querySelectorAll('main h1,main h2,main h3')];
    Object.entries(wanted).forEach(([id,title])=>{
      if(document.getElementById(id))return;
      const heading=headings.find(node=>node.textContent.trim()===title);
      const target=heading?.closest('section,article')||heading;
      if(target&&!target.id)target.id=id;
    });
    installAutomaticTargets();
  };
  installSectionAnchors();

  const loadScript=src=>new Promise((resolve,reject)=>{
    // script.src reads back absolute, so a relative src never matches it.
    const href=new URL(src,location.href).href;
    if([...document.scripts].some(s=>s.src===href))return resolve();
    const s=document.createElement('script');
    s.src=src;s.defer=true;
    s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });

  let libs;
  const readyLibs=()=>libs||(libs=Promise.all([loadScript(CDN.marked),loadScript(CDN.purify)]).catch(()=>null));

  const escapeText=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const render=(el,text)=>{
    if(window.marked&&window.DOMPurify){
      marked.setOptions({gfm:true,breaks:true});
      const dirty=marked.parse(text||'');
      el.innerHTML=DOMPurify.sanitize(dirty,{USE_PROFILES:{html:true}});
      el.querySelectorAll('a[href]').forEach(a=>{
        const href=a.getAttribute('href')||'';
        if(/^https?:\/\//i.test(href)){a.target='_blank';a.rel='noopener noreferrer'}
      });
    }else{
      el.innerHTML=escapeText(text).replace(/\n/g,'<br>');
    }
  };

  const isLegacyGreeting=item=>item?.role==='assistant'&&(
    /^Hey,\s+I(?:'|’)?m the abatchan guide\b/i.test(item.content)||
    /^Hey,\s+I(?:'|’)?m Nika\b/i.test(item.content)||
    /^Hi\.\s+Ask me anything about the work, pricing, or how a project runs\./i.test(item.content)
  );
  const readStored=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(STORE)||'[]');
      if(!Array.isArray(value))return [];
      let waitingForReply=null;
      return value.filter(x=>
        x&&['user','assistant'].includes(x.role)&&typeof x.content==='string'&&!isLegacyGreeting(x)
      ).slice(-MAX_STORED).map(item=>{
        const next={...item,id:typeof item.id==='string'&&item.id?item.id:uid()};
        if(Number.isFinite(Number(item.createdAt)))next.createdAt=Number(item.createdAt);
        else delete next.createdAt;
        if(next.role==='user')waitingForReply=next.id;
        else if(!next.replyTo&&waitingForReply)next.replyTo=waitingForReply;
        if(next.role==='assistant')waitingForReply=null;
        return next;
      });
    }catch{return []}
  };
  const writeStored=items=>{
    const serializable=items.slice(-MAX_STORED).map(item=>({...item,
      attachments:Array.isArray(item.attachments)?item.attachments.slice(0,MAX_ATTACHMENTS).map(({kind,name,type,size,text,previewData})=>({
        kind,name,type,size,...(kind==='text'?{text}: {}),
        ...(kind==='image'&&typeof previewData==='string'&&previewData.startsWith('data:image/')&&previewData.length<90000?{previewData}:{})
      })):undefined
    }));
    try{localStorage.setItem(STORE,JSON.stringify(serializable))}catch{
      // Browser storage is intentionally small. Keep thumbnails on the newest
      // messages, then shed older previews before giving up on chat history.
      const recentStart=Math.max(0,serializable.length-6);
      const compact=serializable.map((item,index)=>index>=recentStart?item:{...item,
        attachments:Array.isArray(item.attachments)?item.attachments.map(({previewData,...attachment})=>attachment):item.attachments
      });
      try{localStorage.setItem(STORE,JSON.stringify(compact))}catch{
        const textOnly=compact.map(item=>({...item,
          attachments:Array.isArray(item.attachments)?item.attachments.map(({previewData,...attachment})=>attachment):item.attachments
        }));
        try{localStorage.setItem(STORE,JSON.stringify(textOnly))}catch{}
      }
    }
  };
  const currentPageContext=()=>{
    installAutomaticTargets();
    const description=document.querySelector('meta[name="description"]')?.content||'';
    const main=document.querySelector('main');
    const text=(main?.innerText||'').replace(/\s+/g,' ').trim().slice(0,3500);
    const sections=[...document.querySelectorAll('main [id]')]
      .filter(node=>node.matches('section,article,h1,h2,h3,[data-assist-target]')||node.querySelector('h1,h2,h3'))
      .sort((a,b)=>Number(a.matches('p'))-Number(b.matches('p')))
      .slice(0,60)
      .map(node=>({id:node.id,label:node.dataset.assistTarget||node.querySelector('h1,h2,h3')?.textContent.trim()||node.textContent.trim().slice(0,80)}));
    const active=[...document.querySelectorAll('main section[id],main article[id],main h2[id]')]
      .map(node=>{
        const rect=node.getBoundingClientRect();
        const visible=Math.max(0,Math.min(rect.bottom,innerHeight)-Math.max(rect.top,0));
        return {node,visible,distance:Math.abs(rect.top-innerHeight*.32)};
      })
      .filter(item=>item.visible>0)
      .sort((a,b)=>b.visible-a.visible||a.distance-b.distance)[0]?.node;
    const activeContext=active?.matches('h2')?(active.closest('section,article')||active.parentElement):active;
    let journey=[];
    try{journey=JSON.parse(sessionStorage.getItem(JOURNEY_STORE)||'[]')}catch{}
    const projectForm=pagePath()==='/contact'?document.querySelector('#project-form'):null;
    const formState=projectForm?Object.fromEntries(['name','email','type','message'].map(name=>{
      const field=projectForm.elements.namedItem(name);
      return [name,String(field?.value||'').trim().slice(0,name==='message'?1800:180)];
    })):null;
    return {
      title:document.title.slice(0,160),
      description:description.slice(0,320),
      text,
      path:pagePath(),
      navigation:navigationState,
      activeSection:active?{
        id:active.id,
        label:(active.matches('h1,h2,h3')?active:active.querySelector('h1,h2,h3'))?.textContent.trim()||active.dataset.assistTarget||'',
        text:String(activeContext?.innerText||'').replace(/\s+/g,' ').trim().slice(0,1800)
      }:null,
      hash:location.hash.slice(0,101),
      sections,
      journey:Array.isArray(journey)?journey.slice(-4):[],
      formState
    };
  };

  const waitForPanel=()=>new Promise(resolve=>{
    const now=document.querySelector('.assist-panel');if(now)return resolve(now);
    const observer=new MutationObserver(()=>{const panel=document.querySelector('.assist-panel');if(panel){observer.disconnect();resolve(panel)}});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  });

  Promise.all([readyLibs(),waitForPanel()]).then(([,panel])=>{
    if(!panel||panel.dataset.streamV2)return;
    panel.dataset.streamV2='true';
    const log=panel.querySelector('.assist-log');
    let followLatest=true,autoScrollUntil=0;
    const nearLatest=()=>log.scrollHeight-log.scrollTop-log.clientHeight<72;
    const bottomPosition=()=>Math.max(0,log.scrollHeight-log.clientHeight);
    const scrollLatest=({force=false,instant=false}={})=>{
      if(!force&&!followLatest)return;
      followLatest=true;
      autoScrollUntil=performance.now()+420;
      requestAnimationFrame(()=>log.scrollTo({
        top:bottomPosition(),
        behavior:instant||matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'
      }));
    };
    // Opening changes the panel's available height while the intro may also be
    // pinned above restored messages. Re-measure after those layout passes so
    // reopening always lands on the actual last message, not the old maximum.
    const settleLatest=()=>{
      if(!panel.classList.contains('is-open'))return;
      followLatest=true;
      autoScrollUntil=performance.now()+700;
      const place=()=>{
        if(panel.classList.contains('is-open'))log.scrollTop=bottomPosition();
      };
      requestAnimationFrame(()=>{place();requestAnimationFrame(place)});
      [80,220,420].forEach(delay=>setTimeout(place,delay));
    };
    log.addEventListener('scroll',()=>{
      if(performance.now()<autoScrollUntil)return;
      followLatest=nearLatest();
    },{passive:true});
    const oldForm=panel.querySelector('.assist-form');
    const oldChips=panel.querySelector('.assist-chips');
    const launch=document.querySelector('.assist-launch');
    const head=panel.querySelector('.assist-head');
    if(!log||!oldForm||!launch||!head)return;

    // The responsive sheet and backdrop are part of the assistant shell. They
    // used to arrive in assistant-polish.js after this module, which created a
    // short window where the panel had desktop behaviour on a phone.
    let backdrop=document.querySelector('.assist-backdrop');
    if(!backdrop){
      backdrop=document.createElement('button');
      backdrop.type='button';
      backdrop.className='assist-backdrop';
      backdrop.setAttribute('aria-label','Close chat');
      document.body.appendChild(backdrop);
    }
    const syncSheet=()=>{
      const open=panel.classList.contains('is-open');
      document.body.classList.toggle('assist-sheet-open',open&&matchMedia('(max-width:640px)').matches);
      backdrop.classList.toggle('is-on',open&&matchMedia('(max-width:900px)').matches);
    };
    new MutationObserver(syncSheet).observe(panel,{attributes:true,attributeFilter:['class']});
    addEventListener('resize',syncSheet,{passive:true});
    backdrop.addEventListener('click',()=>{if(panel.classList.contains('is-open'))launch.click()});
    syncSheet();

    const form=oldForm.cloneNode(true);oldForm.replaceWith(form);
    const chips=oldChips?.cloneNode(true);if(oldChips&&chips)oldChips.replaceWith(chips);
    const input=form.querySelector('textarea,input');const send=form.querySelector('.assist-send');
    send.removeAttribute('data-tip');
    const addFile=form.querySelector('.assist-add');
    const fileInput=form.querySelector('.assist-file-input');
    const attachmentList=form.querySelector('.assist-attachment-list');
    const attachmentError=form.querySelector('.assist-attachment-error');
    const approval=form.querySelector('.assist-approval');
    const approvalMenu=form.querySelector('.assist-approval-menu');
    const depth=form.querySelector('.assist-depth');
    const depthMenu=form.querySelector('.assist-depth-menu');
    const mic=form.querySelector('.assist-mic');
    const LIMIT=Number(input.getAttribute('maxlength'))||1000;
    const storedChoice=(key,allowed,fallback)=>{try{const value=localStorage.getItem(key);return allowed.includes(value)?value:fallback}catch{return fallback}};
    let actionMode=storedChoice(ACTION_MODE_STORE,['ask','allow'],'ask');
    let answerDepth=storedChoice(ANSWER_DEPTH_STORE,['concise','detailed'],'concise');
    let pendingAttachments=[];
    const previewUrls=new Set();
    const formatSize=bytes=>{
      const value=Number(bytes)||0;
      if(value<1024)return `${value} B`;
      if(value<1024*1024)return `${Math.max(1,Math.round(value/1024))} KB`;
      return `${(value/1024/1024).toFixed(value>=10*1024*1024?0:1)} MB`;
    };
    const fileLabel=item=>{
      const extension=String(item.name||'').split('.').pop()?.toUpperCase();
      const type=item.kind==='image'?(extension||'IMAGE'):(extension||'FILE');
      return `${type} · ${formatSize(item.size)}`;
    };
    const showAttachmentError=message=>{
      attachmentError.textContent=message||'';
      attachmentError.hidden=!message;
    };
    addEventListener('pagehide',()=>{previewUrls.forEach(url=>URL.revokeObjectURL(url));previewUrls.clear()});

    const closeComposerMenus=except=>{
      [[approval,approvalMenu],[depth,depthMenu]].forEach(([button,menu])=>{
        if(menu===except)return;
        menu.hidden=true;button.setAttribute('aria-expanded','false');
      });
    };
    const toggleComposerMenu=(button,menu)=>{
      const open=menu.hidden;closeComposerMenus(open?menu:null);menu.hidden=!open;button.setAttribute('aria-expanded',String(open));
      if(open)menu.querySelector('[aria-checked="true"]')?.focus();
    };
    const syncChoices=()=>{
      approval.querySelector('span').textContent=actionMode==='allow'?'Allow actions':'Ask first';
      approvalMenu.querySelectorAll('[data-action-mode]').forEach(button=>button.setAttribute('aria-checked',String(button.dataset.actionMode===actionMode)));
      depth.querySelector('span').textContent=answerDepth==='detailed'?'Detailed':'Concise';
      depthMenu.querySelectorAll('[data-answer-depth]').forEach(button=>button.setAttribute('aria-checked',String(button.dataset.answerDepth===answerDepth)));
    };
    approval.addEventListener('click',()=>toggleComposerMenu(approval,approvalMenu));
    depth.addEventListener('click',()=>toggleComposerMenu(depth,depthMenu));
    approvalMenu.addEventListener('click',event=>{
      const button=event.target.closest('[data-action-mode]');if(!button)return;
      actionMode=button.dataset.actionMode;try{localStorage.setItem(ACTION_MODE_STORE,actionMode)}catch{}
      syncChoices();closeComposerMenus();announceStatus(actionMode==='allow'?'Site actions can run when you clearly ask.':'Site actions will ask first.',{tone:'success'});input.focus();
    });
    depthMenu.addEventListener('click',event=>{
      const button=event.target.closest('[data-answer-depth]');if(!button)return;
      answerDepth=button.dataset.answerDepth;try{localStorage.setItem(ANSWER_DEPTH_STORE,answerDepth)}catch{}
      syncChoices();closeComposerMenus();announceStatus(answerDepth==='detailed'?'Detailed answers selected.':'Concise answers selected.',{tone:'success'});input.focus();
    });
    document.addEventListener('pointerdown',event=>{if(!event.target.closest('.assist-composer-menu-wrap'))closeComposerMenus()});
    form.addEventListener('keydown',event=>{if(event.key==='Escape')closeComposerMenus()});
    syncChoices();

    const renderPendingAttachments=()=>{
      attachmentList.replaceChildren(...pendingAttachments.map((item,index)=>{
        const chip=document.createElement('div');chip.className=`assist-attachment is-${item.kind}`;
        chip.setAttribute('aria-label',`Attached ${item.name}`);
        let visual;
        if(item.kind==='image'&&item.previewUrl){
          visual=document.createElement('img');visual.className='assist-attachment-preview';visual.src=item.previewUrl;visual.alt='';
        }else{
          visual=document.createElement('span');visual.className='assist-attachment-icon';
          const icon=document.createElement('img');icon.src='/assets/icons/file-description.svg';icon.alt='';icon.setAttribute('aria-hidden','true');visual.append(icon);
        }
        const details=document.createElement('span');details.className='assist-attachment-details';
        const name=document.createElement('strong');name.textContent=item.name;
        const meta=document.createElement('small');meta.textContent=fileLabel(item);details.append(name,meta);
        const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label',`Remove ${item.name}`);remove.dataset.tip='Remove attachment';
        const removeIcon=document.createElement('img');removeIcon.src='/assets/icons/x.svg';removeIcon.alt='';removeIcon.setAttribute('aria-hidden','true');remove.append(removeIcon);
        remove.addEventListener('click',()=>{
          const [removed]=pendingAttachments.splice(index,1);
          if(removed?.previewUrl){URL.revokeObjectURL(removed.previewUrl);previewUrls.delete(removed.previewUrl)}
          showAttachmentError('');renderPendingAttachments();input.focus();
        });
        chip.append(visual,details,remove);return chip;
      }));
      attachmentList.hidden=!pendingAttachments.length;
      if(pendingAttachments.length)requestAnimationFrame(()=>attachmentList.scrollTo({left:attachmentList.scrollWidth,behavior:'smooth'}));
    };
    const makeImageThumb=(file,source)=>new Promise(resolve=>{
      const image=new Image();
      image.onload=()=>{
        try{
          const longest=Math.max(image.naturalWidth,image.naturalHeight)||1;
          const scale=Math.min(1,320/longest);
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
          canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
          canvas.getContext('2d',{alpha:false}).drawImage(image,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/jpeg',.66));
        }catch{resolve('')}
      };
      image.onerror=()=>resolve('');image.src=source;
    });
    addFile.addEventListener('click',()=>fileInput.click());
    fileInput.addEventListener('change',async()=>{
      const incoming=[...fileInput.files];fileInput.value='';
      showAttachmentError('');
      let imageNotice=false;
      for(const file of incoming){
        if(pendingAttachments.length>=MAX_ATTACHMENTS){showAttachmentError('You can attach up to 10 files. Remove one before adding another.');break}
        const name=String(file.name||'attachment').slice(0,100);
        if(file.type.startsWith('image/')){
          if(file.size>4*1024*1024){showAttachmentError(`${name} is over the 4 MB image limit.`);continue}
          const previewUrl=URL.createObjectURL(file);previewUrls.add(previewUrl);
          const previewData=await makeImageThumb(file,previewUrl);
          pendingAttachments.push({kind:'image',name,type:file.type,size:file.size,previewUrl,previewData});imageNotice=true;continue;
        }
        const extension=name.split('.').pop()?.toLowerCase();
        if(['txt','md','csv','json'].includes(extension)){
          if(file.size>256*1024){showAttachmentError(`${name} is over the 256 KB text-file limit.`);continue}
          const text=(await file.text()).replace(/\0/g,'').trim().slice(0,6000);
          if(!text){showAttachmentError(`${name} is empty.`);continue}
          pendingAttachments.push({kind:'text',name,type:file.type||`text/${extension}`,size:file.size,text});continue;
        }
        if(['pdf','doc','docx','rtf'].includes(extension)&&file.size<=4*1024*1024){
          pendingAttachments.push({kind:'file',name,type:file.type||'application/octet-stream',size:file.size});continue;
        }
        showAttachmentError('Use images or TXT, Markdown, CSV, JSON, PDF, DOC, DOCX or RTF files.');
      }
      renderPendingAttachments();
      if(pendingAttachments.length<MAX_ATTACHMENTS&&!attachmentError.textContent)showAttachmentError('');
      if(imageNotice)announceStatus('Image preview added. The guide can use its name and details, but cannot inspect the pixels yet.',{tone:'warning',duration:3200});
      input.focus();
    });

    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    let recognition=null,listening=false,dictationStart='';
    if(!SpeechRecognition){mic.disabled=true;mic.dataset.tip='Dictation is not supported in this browser.'}
    else{
      recognition=new SpeechRecognition();recognition.lang=navigator.language||'en-US';recognition.interimResults=true;recognition.continuous=false;
      recognition.onstart=()=>{listening=true;dictationStart=input.value;mic.classList.add('is-listening');mic.setAttribute('aria-label','Stop dictation');mic.dataset.tip='Stop dictation';announceStatus('Listening…',{busy:true,duration:0})};
      recognition.onresult=event=>{
        let words='';for(let index=event.resultIndex;index<event.results.length;index++)words+=event.results[index][0].transcript;
        input.value=[dictationStart.trim(),words.trim()].filter(Boolean).join(dictationStart.trim()?' ':'');grow();meter(false);
      };
      recognition.onerror=event=>{if(event.error!=='aborted')announceStatus(event.error==='not-allowed'?'Microphone permission was not granted.':'Dictation could not start.',{tone:'error'})};
      recognition.onend=()=>{listening=false;mic.classList.remove('is-listening');mic.setAttribute('aria-label','Start dictation');mic.dataset.tip='Dictate a message';announceStatus(input.value.trim()?'Dictation added.':'Dictation stopped.',{tone:input.value.trim()?'success':'neutral'});input.focus()};
      mic.addEventListener('click',()=>{try{listening?recognition.stop():recognition.start()}catch{announceStatus('Dictation is already starting.',{tone:'warning'})}});
    }

    const pagePrompts={
      '/':['Show me relevant work','How does a project start?','What can you build?'],
      '/work':['Which project fits my idea?','Show me the AI work','How do I start a project?'],
      '/pricing':['Compare the options','What will my project cost?','How do payments work?'],
      '/process':['Which stage comes first?','How long does delivery take?','Take me to the contact form'],
      '/contact':['What should I include?','Which service fits my idea?','Show me pricing first'],
      '/bookingkoala':['What can you fix?','Show me the proof','Take me to the enquiry form']
    };
    const contextualPrompts=pagePrompts[pagePath()];
    if(chips&&contextualPrompts){
      chips.replaceChildren(...contextualPrompts.map(text=>{const button=document.createElement('button');button.type='button';button.textContent=text;return button}));
    }

    // The field grows with the question up to a ceiling, then scrolls, so a
    // long paste never pushes the send button off the panel.
    const GROW_MAX=132;
    const grow=()=>{
      if(input.tagName!=='TEXTAREA')return;
      input.style.height='auto';
      input.style.height=Math.min(input.scrollHeight,GROW_MAX)+'px';
      input.style.overflowY=input.scrollHeight>GROW_MAX?'auto':'hidden';
    };

    // maxlength silently truncates a big paste, which reads as the field
    // eating your text. Say what happened instead.
    const counter=document.createElement('div');
    counter.className='assist-count';counter.setAttribute('aria-live','polite');
    form.after(counter);
    const meter=truncated=>{
      const left=LIMIT-input.value.length;
      counter.textContent=truncated
        ? `That was longer than ${LIMIT} characters, so it was trimmed to fit. Send the rest through the contact page.`
        : left<=120?`${left} character${left===1?'':'s'} left`:'';
      counter.classList.toggle('is-warn',truncated||left<=0);
    };
    input.addEventListener('paste',e=>{
      const pasted=(e.clipboardData||window.clipboardData)?.getData('text')||'';
      const room=LIMIT-input.value.length+String(input.value).slice(input.selectionStart,input.selectionEnd).length;
      setTimeout(()=>{grow();meter(pasted.length>room)},0);
    });
    input.addEventListener('input',()=>{grow();meter(false)});

    // Selected site copy can be handed to Nika without inventing a separate
    // screenshot workflow. This compact toolbar keeps immediate explanation
    // separate from adding context to a visitor-authored question.
    const selectionAction=document.createElement('div');
    selectionAction.className='assist-selection-action';selectionAction.hidden=true;
    selectionAction.setAttribute('role','toolbar');selectionAction.setAttribute('aria-label','Actions for selected text');
    const selectionButton=(label,action,brand=false)=>{
      const button=document.createElement('button');button.type='button';button.dataset.selectionAction=action;
      if(brand){
        const mark=document.createElement('img');mark.src='/assets/abatchan-symbol-indigo-tight.svg';mark.alt='';mark.setAttribute('aria-hidden','true');
        button.append(mark);
      }
      const text=document.createElement('span');text.textContent=label;button.append(text);selectionAction.append(button);
      return button;
    };
    selectionButton('Add to chat','add');
    selectionButton('Explain','explain');
    selectionButton('Ask Nika','ask',true);
    document.body.append(selectionAction);
    let selectedSiteText='',selectionTimer=0;
    const hideSelectionAction=()=>{selectionAction.hidden=true;selectedSiteText=''};
    const placeSelectionAction=()=>{
      clearTimeout(selectionTimer);
      selectionTimer=setTimeout(()=>{
        const selection=getSelection();
        const text=String(selection?.toString()||'').replace(/\s+/g,' ').trim().slice(0,600);
        if(!text||selection.isCollapsed||!selection.rangeCount){hideSelectionAction();return}
        const range=selection.getRangeAt(0);const common=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
        if(!common?.closest('main')||common.closest('.assist-panel,input,textarea,button,a,[contenteditable="true"]')){hideSelectionAction();return}
        const rect=range.getBoundingClientRect();
        if(!rect.width&&!rect.height){hideSelectionAction();return}
        selectedSiteText=text;selectionAction.hidden=false;
        const width=selectionAction.offsetWidth||236,height=selectionAction.offsetHeight||36;
        const left=Math.min(innerWidth-width-10,Math.max(10,rect.left+rect.width/2-width/2));
        const above=rect.top-height-10;
        const top=above>=10?above:Math.min(innerHeight-height-10,rect.bottom+10);
        selectionAction.style.left=`${left}px`;selectionAction.style.top=`${top}px`;
      },120);
    };
    document.addEventListener('selectionchange',placeSelectionAction);
    selectionAction.addEventListener('pointerdown',event=>event.preventDefault());
    selectionAction.addEventListener('click',event=>{
      const action=event.target.closest('button')?.dataset.selectionAction;
      if(!selectedSiteText||!action)return;
      const quote=`“${selectedSiteText}”`;
      const question=action==='explain'
        ? `Explain this in the context of this page:\n${quote}`
        : action==='ask'
          ? `I want to ask about this part of the page:\n${quote}\n\n`
          : quote;
      input.value=input.value.trim()?`${input.value.trim()}\n\n${question}`:question;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      if(!panel.classList.contains('is-open'))launch.click();
      hideSelectionAction();getSelection()?.removeAllRanges();
      setTimeout(()=>{
        if(action==='explain')form.requestSubmit?form.requestSubmit():form.dispatchEvent(new Event('submit',{cancelable:true}));
        else{input.focus();input.setSelectionRange(input.value.length,input.value.length);settleLatest()}
      },80);
    });
    addEventListener('scroll',hideSelectionAction,{passive:true});
    addEventListener('resize',hideSelectionAction,{passive:true});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')hideSelectionAction()});
    // Enter sends, Shift+Enter starts a new line.
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){
        e.preventDefault();
        form.requestSubmit?form.requestSubmit():form.dispatchEvent(new Event('submit',{cancelable:true}));
      }
    });
    let transcript=readStored();
    const answeredUsers=new Set(transcript.filter(item=>item.role==='assistant'&&item.replyTo).map(item=>item.replyTo));
    transcript=transcript.map(item=>item.role==='user'
      ? {...item,state:answeredUsers.has(item.id)?'answered':(item.state==='failed'?'failed':'pending')}
      : item);
    // Journey UI is stored separately from the conversational text so it can
    // be rebuilt after reload without sending display metadata to the model.
    // A visitor turn that never received an answer, because the request failed
    // or was abandoned mid-flight, must not be replayed to the model on the
    // next load. Rehydrating it puts two visitor turns in a row with no reply
    // between them and silently re-asks the question that already failed.
    const history=transcript
      .filter(item=>item.role!=='user'||item.state==='answered')
      .slice(-8)
      .map(item=>item?.journey?.completed
        ? {...item,content:item.content,journeyRoute:true,journey:undefined}
        : item
      );
    let pending=false,activeController=null,audioCtx=null,peekTimer=0,confirmTimer=0,formGuidanceTimer=0,guidanceTimer=0;
    const GUIDANCE_DURATION=4200;

    const requestHistory=()=>{
      const recent=history.slice(-8);
      if(navigationState.source!=='visitor')return recent.slice(-4);
      // A visitor can leave a page after Nika takes them there. Do not resend
      // that completed journey's old route claim beside the new live context,
      // or the model may treat “you are on Pricing” as newer than the browser.
      // Drop only that claim. The visitor's own message stays, because it can
      // carry details they supplied once and still expect to be known, and the
      // server verifies any proposed form value against exactly these messages,
      // so removing it silently made those details unrecoverable.
      return recent.filter(item=>!item.journeyRoute).slice(-4);
    };

    const rememberJourney=entry=>{
      try{
        const stored=JSON.parse(sessionStorage.getItem(JOURNEY_STORE)||'[]');
        const journey=Array.isArray(stored)?stored:[];
        journey.push(entry);
        sessionStorage.setItem(JOURNEY_STORE,JSON.stringify(journey.slice(-8)));
      }catch{}
    };

    const targetTokens=value=>new Set(String(value||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{2,}/g)||[]);
    const targetScore=(query,candidate)=>{
      const wanted=targetTokens(query),available=targetTokens(candidate);
      if(!wanted.size||!available.size)return 0;
      let matches=0;wanted.forEach(token=>{if(available.has(token))matches++});
      const normalizedQuery=[...wanted].join(' '),normalizedCandidate=[...available].join(' ');
      return matches/wanted.size+(normalizedCandidate.includes(normalizedQuery)?1:0);
    };
    const closestTarget=label=>[...document.querySelectorAll('main [data-assist-target]')]
      .map(node=>({node,score:targetScore(label,node.dataset.assistTarget)}))
      .sort((a,b)=>b.score-a.score)[0];
    const targetFor=(url,label,preferExact=false)=>{
      installAutomaticTargets();
      if(!url.hash){
        if(preferExact&&label){
          const ranked=closestTarget(label);
          if(ranked?.score>=.6)return ranked.node;
        }
        return document.querySelector('main h1,main');
      }
      try{
        const raw=document.getElementById(decodeURIComponent(url.hash.slice(1)));
        // A model-supplied anchor must agree with the requested content. If it
        // points at a different section, prefer the best matching safe target
        // on this page rather than faithfully highlighting the wrong thing.
        if(preferExact&&label&&(!raw||targetScore(label,targetText(raw))<.6)){
          const ranked=closestTarget(label);
          if(ranked?.score>=.6)return ranked.node;
        }
        // Authored assistant targets are deliberately more precise than their
        // containing section. Everything else keeps the safer section-level
        // highlight used by the rest of the site.
        if(raw?.matches('[data-assist-target]'))return raw;
        return raw?.closest('section,article')||raw;
      }catch{return null}
    };

    const clearGuidance=()=>{
      clearTimeout(guidanceTimer);
      document.querySelectorAll('.assist-guided-target').forEach(node=>node.classList.remove('assist-guided-target'));
      document.querySelectorAll('.assist-guide-marker').forEach(marker=>marker.remove());
    };

    const revealTarget=(url,label,preferExact=false)=>{
      const target=targetFor(url,label,preferExact);
      if(!target)return {found:false,highlighted:false,label:String(label||'')};
      const pageTop=!url.hash&&!preferExact;
      // The border and title pill are one guide state. Clearing an older
      // target must remove both immediately; previously a second reveal could
      // remove the old border while its independently timed pill lingered.
      clearGuidance();
      target.classList.add('assist-guided-target');
      if(pageTop)scrollTo({top:0,left:0,behavior:'auto'});
      else target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
      const marker=document.createElement('span');
      marker.className='assist-guide-marker';
      marker.textContent=label||'Here';
      marker.setAttribute('aria-hidden','true');
      target.appendChild(marker);
      guidanceTimer=setTimeout(clearGuidance,GUIDANCE_DURATION);
      return {found:true,highlighted:true,label:String(label||targetText(target)).slice(0,120),id:String(target.id||'').slice(0,100)};
    };

    const clearFormGuidance=form=>{
      clearTimeout(formGuidanceTimer);
      form?.querySelectorAll('.field.is-assist-prepared').forEach(field=>field.classList.remove('is-assist-prepared'));
      form?.querySelectorAll('[data-assist-prepared]').forEach(field=>delete field.dataset.assistPrepared);
      form?.querySelector('.assist-form-review')?.remove();
    };

    const prepareProjectForm=journey=>{
      const values=journey?.form_prefill;
      const form=document.querySelector('#project-form');
      if(pagePath()!=='/contact'||!form||!values||typeof values!=='object')return {updated:false,appliedFields:[]};
      clearFormGuidance(form);
      const limits={name:120,email:180,type:180,message:1800};
      const prepared=[];
      const updated=[];
      const appliedFields=[];
      const replaceFields=new Set(Array.isArray(journey.replace_fields)?journey.replace_fields:[]);
      Object.entries(limits).forEach(([name,max])=>{
        const field=form.elements.namedItem(name);
        const value=String(values[name]||'').trim().slice(0,max);
        const hasValue=Boolean(field?.value.trim());
        if(!field||!value||(hasValue&&!replaceFields.has(name)))return;
        field.value=value;
        field.dataset.assistPrepared='true';
        field.closest('.field')?.classList.add('is-assist-prepared');
        field.dispatchEvent(new Event('input',{bubbles:true}));
        field.dispatchEvent(new Event('change',{bubbles:true}));
        appliedFields.push(name);
        (hasValue?updated:prepared).push(field.labels?.[0]?.textContent?.trim()||name);
      });
      if(!prepared.length&&!updated.length)return {updated:false,appliedFields:[]};
      let note=form.querySelector('.assist-form-review');
      if(!note){
        note=document.createElement('div');
        note.className='assist-form-review';
        note.setAttribute('role','status');
        form.prepend(note);
      }
      note.textContent=updated.length
        ? `Nika updated ${updated.join(', ')} from your latest instruction. Review everything before opening the email.`
        : `Nika prepared ${prepared.length} ${prepared.length===1?'field':'fields'} from your conversation. Review everything before opening the email.`;
      const clearPreparedField=event=>{
        event.currentTarget.closest('.field')?.classList.remove('is-assist-prepared');
        delete event.currentTarget.dataset.assistPrepared;
        if(!form.querySelector('.field.is-assist-prepared'))form.querySelector('.assist-form-review')?.remove();
      };
      form.querySelectorAll('[data-assist-prepared]').forEach(field=>field.addEventListener('input',clearPreparedField,{once:true}));
      formGuidanceTimer=setTimeout(()=>clearFormGuidance(form),GUIDANCE_DURATION);
      const firstEmpty=[...form.querySelectorAll('[required]')].find(field=>!field.value.trim());
      (firstEmpty||form.querySelector('[data-assist-prepared]'))?.focus({preventScroll:true});
      return {updated:true,appliedFields:[...new Set(appliedFields)],prepared,changed:updated};
    };

    const navigateTo=(href,label,handoff=null)=>{
      let url;
      try{url=new URL(href,location.href)}catch{return}
      if(!isSafeDestination(url))return;
      const destination=publicPath(url);
      const current=pagePath();
      rememberJourney({from:current,to:destination+url.hash,label:label||'the section',at:Date.now()});
      if(destination===current){
        revealTarget(url,label,Boolean(handoff?.section_requested));
        prepareProjectForm(handoff);
        return false;
      }
      try{
        if(handoff)sessionStorage.setItem(NAV_STORE,JSON.stringify({...handoff,href:destination+url.hash,label,at:Date.now()}));
        sessionStorage.setItem(TRANSITION_STORE,'1');
      }catch{}
      const transition=document.querySelector('.page-transition');
      if(!transition){location.assign(destination+url.hash);return true}
      transition.classList.add('is-leaving');
      setTimeout(()=>location.assign(destination+url.hash),500);
      return true;
    };

    const actionIcon=href=>{
      const path=String(href).split('#')[0];
      if(path==='/contact')return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 4.5h13v9h-8l-3.5 3v-3H3.5z"/></svg>';
      if(path==='/pricing')return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10.5 3.5H16v5.5l-7 7-5-5 6.5-7.5z"/><circle cx="13.4" cy="6.2" r=".8"/></svg>';
      if(path==='/work')return '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="6" width="14" height="10" rx="2"/><path d="M7 6V4h6v2M3 10h14"/></svg>';
      if(path==='/process')return '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="5" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="M7 5h3a3 3 0 0 1 3 3v4M10 12l3 3 3-3"/></svg>';
      if(path==='/brand')return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.8l1.3 4.1 4.1 1.3-4.1 1.3-1.3 4.1-1.3-4.1-4.1-1.3 4.1-1.3zM15.5 12.5l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6z"/></svg>';
      if(path==='/reviews')return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12v9H9l-4 3v-3H4zM7 8h6M7 10.5h4"/></svg>';
      if(path==='/')return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 9.2L10 3.5l6.5 5.7V16h-5v-4h-3v4h-5z"/></svg>';
      return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4"/></svg>';
    };

    // Guided actions keep a normal destination link in their conclusion. The
    // automation remains the first path, while the real href is a durable
    // fallback that can reopen or re-highlight the same place after reload.
    const appendJourneyFallback=(arrival,journey)=>{
      if(!arrival||!journey?.href||arrival.querySelector('.assist-journey-fallback'))return;
      let url;
      try{url=new URL(journey.href,location.href)}catch{return}
      if(!isSafeDestination(url))return;
      const href=publicPath(url)+url.hash;
      const alreadyLinked=[...arrival.querySelectorAll('a[href]')].some(link=>{
        try{const linked=new URL(link.getAttribute('href'),location.href);return publicPath(linked)+linked.hash===href}catch{return false}
      });
      if(alreadyLinked)return;
      const label=String(journey.label||'destination').trim();
      const link=document.createElement('a');
      link.className='assist-action-link assist-journey-fallback';
      link.href=href;
      link.innerHTML=`${actionIcon(href)}<span>${escapeText(`Open ${label}`)}</span>`;
      link.addEventListener('click',event=>{
        if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        event.preventDefault();
        navigateTo(href,label,{section_requested:journey.section_requested===true,form_prefill:journey.form_prefill,replace_fields:journey.replace_fields});
      });
      const host=arrival.querySelector('p:last-child')||arrival;
      host.append(document.createTextNode(' '),link);
    };

    const enhanceActions=el=>{
      if(!el)return [];
      const internal=[];
      const links=[...el.querySelectorAll('a[href]:not(.assist-action-link)')];
      links.forEach(link=>{
        let url;
        try{url=new URL(link.getAttribute('href'),location.href)}catch{return}
        if(url.origin!==location.origin)return;
        const label=link.textContent.trim()||'Go there';
        if(!isSafeDestination(url)){link.remove();return}
        const href=publicPath(url)+url.hash;
        link.href=href;
        link.classList.add('assist-action-link');
        link.innerHTML=`${actionIcon(href)}<span>${escapeText(label)}</span>`;
        link.addEventListener('click',event=>{
          if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
          event.preventDefault();navigateTo(href,label);
        });
        internal.push({href,label});
      });
      const unique=internal.filter((item,index,list)=>index===list.findIndex(other=>other.href===item.href)).slice(0,3);
      if(unique.length)scrollLatest();
      return unique;
    };

    function requestJourneyApproval(bubble,journey,entry){
      if(!bubble||!journey?.href||bubble.querySelector('.assist-action-approval'))return;
      let url;try{url=new URL(journey.href,location.href)}catch{return}
      if(!isSafeDestination(url))return;
      const row=document.createElement('div');row.className='assist-action-approval';row.setAttribute('role','group');row.setAttribute('aria-label','Approve site navigation');
      const prompt=document.createElement('span');prompt.textContent=journey.form_prefill?'Prepare the project enquiry?':`Open ${journey.label||'this section'}?`;
      const approve=document.createElement('button');approve.type='button';approve.className='assist-text-action';approve.textContent='Continue';approve.dataset.tip='Approve this site action';
      const cancel=document.createElement('button');cancel.type='button';cancel.className='assist-text-action subtle';cancel.textContent='Not now';cancel.dataset.tip='Stay on this page';
      approve.addEventListener('click',()=>{
        row.remove();if(entry){entry.journey={...journey,pending:false};writeStored(transcript)}
        guideJourney(journey,bubble);
      });
      cancel.addEventListener('click',()=>{
        row.remove();if(entry){delete entry.journey;writeStored(transcript)}
        announceStatus('Staying on this page.',{tone:'neutral'});
      });
      row.append(prompt,approve,cancel);bubble.append(row);scrollLatest({force:true});
    }

    const restoreJourney=(bubble,journey)=>{
      if(!bubble||!journey)return;
      if(journey.pending){requestJourneyApproval(bubble,journey,transcript.find(item=>item.journey===journey));return}
      if(!journey.completed||!journey.status||!journey.arrival)return;
      const steps=document.createElement('div');
      steps.className='assist-journey-steps';
      const step=document.createElement('div');
      step.className='assist-journey-step is-done';
      step.innerHTML='<i aria-hidden="true"></i><span></span>';
      step.querySelector('span').textContent=journey.status;
      steps.appendChild(step);
      const arrival=document.createElement('div');
      arrival.className='assist-journey-arrival';
      render(arrival,journey.arrival);
      bubble.append(steps,arrival);
      enhanceActions(arrival);
      appendJourneyFallback(arrival,journey);
      bubble.dataset.journeyComplete='true';
    };

    // Navigation intent comes from the model's tool decision, not a growing
    // list of English trigger phrases. The protocol is removed before display
    // and the destination still has to pass isSafeDestination before use.
    const readNavigation=(text,token)=>{
      const safeToken=String(token||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const match=safeToken?String(text).match(new RegExp(`<!--abatchan-nav:${safeToken}:([^>]+)-->`)):null;
      if(!match)return {text:String(text),action:null};
      let action=null;
      try{
        const parsed=JSON.parse(decodeURIComponent(match[1]));
        if(parsed&&typeof parsed.href==='string'&&typeof parsed.label==='string'&&typeof parsed.departure==='string'&&typeof parsed.status==='string'&&typeof parsed.arrival==='string')action=parsed;
      }catch{}
      const visible=String(text).replace(match[0],'').trim();
      // Some models occasionally mirror tool arguments into ordinary content.
      // The validated action is authoritative: before approval the visitor
      // should see only its departure, never an early status or arrival.
      return {text:action?action.departure:visible,action};
    };

    const messageContent=element=>element?.querySelector(':scope > .assist-message-content')||element;
    const ICONS={
      copy:'<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="6" width="10" height="10" rx="2"/><path d="M13 6V4H6a2 2 0 0 0-2 2v7h2"/></svg>',
      retry:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.2 6.1A6 6 0 1 0 16 11"/><path d="M15.2 2.8v3.6h-3.6"/></svg>',
      like:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.2 8.2 9.8 3c.4-.8 1.6-.5 1.6.4v3.4h3.1c1.1 0 1.9 1 1.6 2l-1.2 5.3c-.2.7-.8 1.2-1.6 1.2H7.2z"/><path d="M3.8 8.2h3.4v7.1H3.8z"/></svg>',
      dislike:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.2 11.8 2.6 5.2c.4.8 1.6.5 1.6-.4v-3.4h3.1c1.1 0 1.9-1 1.6-2l-1.2-5.3c-.2-.7-.8-1.2-1.6-1.2H7.2z"/><path d="M3.8 4.7h3.4v7.1H3.8z"/></svg>',
      clock:'<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.5"/></svg>'
    };
    const timeLabel=value=>{
      const date=new Date(Number(value));
      if(!Number.isFinite(date.getTime()))return 'Earlier';
      const now=new Date();
      const start=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
      const day=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
      const days=Math.round((start-day)/86400000);
      const time=date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
      if(days===0)return time;
      if(days===1)return `Yesterday, ${time}`;
      const options={month:'long',day:'numeric'};
      if(date.getFullYear()!==now.getFullYear())options.year='numeric';
      return `${date.toLocaleDateString(undefined,options)}, ${time}`;
    };
    const absoluteTime=value=>{
      const date=new Date(Number(value));
      return Number.isFinite(date.getTime())
        ? date.toLocaleString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'})
        : 'Earlier in this conversation';
    };
    const copyText=async text=>{
      try{
        if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
        else{
          const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';
          document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();
        }
        announceStatus('Message copied.',{tone:'success'});
      }catch{announceStatus('The message could not be copied.',{tone:'error'})}
    };
    const saveFeedback=async(entry,reaction,button)=>{
      if(!entry?.id||button.disabled)return;
      const previous=entry.feedback||'';
      entry.feedback=reaction;writeStored(transcript);
      button.closest('.assist-message-actions')?.querySelectorAll('[data-reaction]').forEach(control=>{
        control.setAttribute('aria-pressed',String(control.dataset.reaction===reaction));
      });
      button.disabled=true;
      try{
        const user=transcript.find(item=>item.id===entry.replyTo);
        const response=await fetch('/api/guide-feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          id:entry.id,reaction,response:entry.content,question:user?.content||'',page:pagePath(),createdAt:entry.createdAt||null
        })});
        if(!response.ok)throw new Error('feedback failed');
        announceStatus(reaction==='helpful'?'Marked as helpful.':'Feedback sent to Abat.',{tone:'success'});
      }catch{
        entry.feedback=previous;writeStored(transcript);
        button.closest('.assist-message-actions')?.querySelectorAll('[data-reaction]').forEach(control=>{
          control.setAttribute('aria-pressed',String(control.dataset.reaction===previous));
        });
        announceStatus('Feedback could not be sent.',{tone:'error'});
      }finally{button.disabled=false}
    };
    const addMessageTools=(element,entry)=>{
      if(!entry||!['user','assistant'].includes(entry.role))return;
      element.dataset.messageId=entry.id;
      const meta=document.createElement('div');meta.className='assist-message-meta';
      const actions=document.createElement('div');actions.className='assist-message-actions';
      const action=(name,tip,icon)=>{
        const button=document.createElement('button');button.type='button';button.className='assist-message-tool';
        button.dataset.tip=tip;button.setAttribute('aria-label',tip);button.innerHTML=icon;return button;
      };
      const copy=action('copy','Copy message',ICONS.copy);copy.addEventListener('click',()=>copyText(element.querySelector('.assist-message-content')?.textContent||entry.content));actions.append(copy);
      if(entry.role==='user'&&entry.state!=='answered'){
        const retry=action('retry','Retry message',ICONS.retry);
        retry.classList.add('assist-retry-message');
        retry.addEventListener('click',()=>{retry.disabled=true;entry.state='pending';writeStored(transcript);reply(entry.content,entry.id,entry.attachments||[])});
        actions.append(retry);
      }
      if(entry.role==='assistant'&&!entry.isIntro){
        ['helpful','not-helpful'].forEach(reaction=>{
          const helpful=reaction==='helpful';
          const button=action(reaction,helpful?'Helpful response':'Report a problem',helpful?ICONS.like:ICONS.dislike);
          button.dataset.reaction=reaction;button.setAttribute('aria-pressed',String(entry.feedback===reaction));
          button.addEventListener('click',()=>saveFeedback(entry,reaction,button));actions.append(button);
        });
      }
      const time=document.createElement('time');time.className='assist-message-time';
      if(entry.createdAt)time.dateTime=new Date(entry.createdAt).toISOString();
      time.dataset.tip=absoluteTime(entry.createdAt);time.innerHTML=ICONS.clock+`<span>${escapeText(timeLabel(entry.createdAt))}</span>`;
      meta.append(actions,time);element.appendChild(meta);
      if(!element.dataset.toolsBound){
        element.dataset.toolsBound='true';
        element.addEventListener('click',event=>{
          if(matchMedia('(hover:hover)').matches||event.target.closest('a,button'))return;
          log.querySelectorAll('.assist-msg.show-actions').forEach(node=>{if(node!==element)node.classList.remove('show-actions')});
          element.classList.toggle('show-actions');
        });
      }
    };
    const refreshLatestAssistant=()=>{
      log.querySelectorAll('.assist-msg.bot.is-latest').forEach(node=>node.classList.remove('is-latest'));
      const latest=[...log.querySelectorAll('.assist-msg.bot[data-chat-entry="true"]')].at(-1)
        ||log.querySelector('[data-guide-intro="true"]');
      latest?.classList.add('is-latest');
    };
    const refreshUserTools=entry=>{
      const element=log.querySelector(`.assist-msg.me[data-message-id="${CSS.escape(entry.id)}"]`);
      if(!element)return;
      element.querySelector('.assist-message-meta')?.remove();addMessageTools(element,entry);
    };
    const renderStoredAttachments=(content,attachments)=>{
      if(!Array.isArray(attachments)||!attachments.length)return;
      const list=document.createElement('div');list.className='assist-msg-attachments';
      attachments.slice(0,MAX_ATTACHMENTS).forEach(item=>{
        const card=document.createElement('div');card.className=`assist-msg-attachment is-${item.kind}`;
        let visual;
        if(item.kind==='image'&&(item.previewUrl||item.previewData)){
          visual=document.createElement('img');visual.className='assist-msg-attachment-preview';visual.src=item.previewUrl||item.previewData;visual.alt=`Attached image: ${item.name}`;
        }else{
          visual=document.createElement('span');visual.className='assist-msg-attachment-icon';
          const icon=document.createElement('img');icon.src=item.kind==='image'?'/assets/icons/photo.svg':'/assets/icons/file-description.svg';icon.alt='';icon.setAttribute('aria-hidden','true');visual.append(icon);
        }
        const details=document.createElement('span');details.className='assist-msg-attachment-details';
        const name=document.createElement('strong');name.textContent=String(item.name||'attachment').slice(0,100);
        const meta=document.createElement('small');meta.textContent=fileLabel(item);details.append(name,meta);
        card.append(visual,details);list.append(card);
      });
      content.append(list);
    };

    const add=(text,who,persisted=false,metadata=null)=>{
      const el=document.createElement('div');el.className='assist-msg '+who;
      if(persisted)el.dataset.chatEntry='true';
      const content=document.createElement('div');content.className='assist-message-content';
      if(who==='bot'){
        el.appendChild(content);
        render(content,text);enhanceActions(content);
        if(metadata?.journey)restoreJourney(el,metadata.journey);
      }else{
        if(Array.isArray(metadata?.attachments)&&metadata.attachments.length)el.classList.add('has-attachments');
        renderStoredAttachments(el,metadata?.attachments);
        const body=document.createElement('div');body.className='assist-user-text';body.textContent=text;content.append(body);
        el.appendChild(content);
      }
      if(metadata)addMessageTools(el,metadata);
      log.appendChild(el);refreshLatestAssistant();scrollLatest({force:who==='me'});return el;
    };

    if(transcript.length){
      transcript.forEach(item=>add(item.content,item.role==='assistant'?'bot':'me',true,item));
      refreshLatestAssistant();
      chips&&(chips.hidden=true);
    }
    const pinIntro=()=>{
      const intro=log.querySelector('[data-guide-intro="true"]');
      if(!intro)return;
      if(log.firstElementChild!==intro)log.prepend(intro);
      if(!intro.querySelector('.assist-message-content')){
        const content=document.createElement('div');
        content.className='assist-message-content';
        content.textContent=intro.textContent.trim();
        intro.replaceChildren(content);
      }
      // The greeting is a real guide message too. Give it the same compact
      // utility row as the conversation, without asking visitors to rate a
      // fixed introduction.
      if(!intro.querySelector('.assist-message-meta')){
        const greetingAt=Number(sessionStorage.getItem('abatchanGuideGreetingAtV1'))||Date.now();
        try{sessionStorage.setItem('abatchanGuideGreetingAtV1',String(greetingAt))}catch{}
        addMessageTools(intro,{id:'guide-intro',role:'assistant',content:intro.querySelector('.assist-message-content').textContent.trim(),createdAt:greetingAt,isIntro:true});
      }
      refreshLatestAssistant();
    };
    const greetingObserver=new MutationObserver(pinIntro);
    greetingObserver.observe(log,{childList:true});
    pinIntro();

    // Operational feedback is not part of the conversation. Keep it in one
    // compact live region instead of drawing “chat cleared” or “opening…” as
    // though the guide sent another reply.
    const systemStatus=document.createElement('div');
    systemStatus.className='assist-system-status';
    systemStatus.setAttribute('role','status');
    systemStatus.setAttribute('aria-live','polite');
    systemStatus.hidden=true;
    head.after(systemStatus);
    let systemStatusTimer=0;
    const announceStatus=(message,{busy=false,duration=1800,tone='neutral'}={})=>{
      clearTimeout(systemStatusTimer);
      systemStatus.textContent=message;
      systemStatus.classList.toggle('is-busy',busy);
      systemStatus.classList.remove('is-success','is-error','is-warning','is-neutral');
      systemStatus.classList.add(`is-${['success','error','warning'].includes(tone)?tone:'neutral'}`);
      systemStatus.hidden=false;
      requestAnimationFrame(()=>systemStatus.classList.add('is-on'));
      if(duration)systemStatusTimer=setTimeout(()=>{
        systemStatus.classList.remove('is-on');
        setTimeout(()=>{systemStatus.hidden=true},180);
      },duration);
    };

    const journeyStep=(bubble,message,{done=false}={})=>{
      if(!bubble||!message)return;
      let steps=bubble.querySelector('.assist-journey-steps');
      if(!steps){
        steps=document.createElement('div');
        steps.className='assist-journey-steps';
        steps.setAttribute('role','status');
        steps.setAttribute('aria-live','polite');
        bubble.appendChild(steps);
      }
      steps.querySelector('.is-active')?.classList.replace('is-active','is-done');
      let step=[...steps.children].find(item=>item.querySelector('span')?.textContent===message);
      if(!step){
        step=document.createElement('div');
        step.className='assist-journey-step';
        step.innerHTML='<i aria-hidden="true"></i><span></span>';
        step.querySelector('span').textContent=message;
        steps.appendChild(step);
      }
      step.classList.remove('is-active','is-done');
      step.classList.add(done?'is-done':'is-active');
      scrollLatest({force:true});
    };

    // Tool-call copy and very short ordinary replies can reach the browser as
    // one completed payload rather than token-by-token text. Give buffered
    // messages a progressive reveal without rebuilding answers the visitor
    // already watched stream from the model.
    const typeBufferedMessage=(element,source)=>{
      const finalText=String(source||'').trim();
      const plainText=finalText
        .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
        .replace(/[*_`~#>]/g,'')
        .replace(/\s+/g,' ')
        .trim();
      // A hidden tab suspends requestAnimationFrame. Since this reveal only
      // finishes inside a rAF tick, a visitor who sends a message and switches
      // tab or app would come back to a blank reply and a composer disabled
      // until reload. Nobody is watching an animation they cannot see, so
      // commit the text immediately instead.
      if(!plainText||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){
        render(element,finalText);enhanceActions(element);return Promise.resolve();
      }
      element.classList.add('is-streaming');
      const duration=Math.min(1800,Math.max(700,plainText.length*18));
      return new Promise(resolve=>{
        const started=performance.now();
        let settled=false;
        const finish=()=>{
          if(settled)return;settled=true;
          document.removeEventListener('visibilitychange',onHidden);
          element.classList.remove('is-streaming');
          render(element,finalText);enhanceActions(element);
          scrollLatest({force:true});resolve();
        };
        // Leaving mid-reveal stops the frames, so commit what is left at once.
        const onHidden=()=>{if(document.hidden)finish()};
        document.addEventListener('visibilitychange',onHidden);
        const tick=now=>{
          if(settled)return;
          const progress=Math.min(1,(now-started)/duration);
          const length=Math.max(1,Math.round(plainText.length*progress));
          element.textContent=plainText.slice(0,length);
          followLatest=true;log.scrollTop=bottomPosition();
          if(progress<1){requestAnimationFrame(tick);return}
          finish();
        };
        requestAnimationFrame(tick);
      });
    };

    const actionResultFor=(journey,revealResult,formResult,note='')=>{
      let destination=null;
      try{destination=new URL(journey.href,location.href)}catch{}
      const routeMatches=Boolean(destination&&publicPath(destination)===pagePath());
      const targetFound=journey.section_requested===true?revealResult?.found===true:routeMatches;
      const formExpected=Boolean(journey.form_prefill&&Object.values(journey.form_prefill).some(Boolean));
      const formUpdated=!formExpected||formResult?.updated===true;
      return {
        receipt:journey.receipt,
        outcome:routeMatches&&targetFound&&formUpdated?'completed':routeMatches?'partial':'failed',
        current_route:`${pagePath()}${location.hash}`,
        target_found:targetFound,
        highlighted:revealResult?.highlighted===true,
        form_updated:formResult?.updated===true,
        applied_fields:formResult?.appliedFields||[],
        note
      };
    };

    const streamActionConclusion=async(journey,result,arrival,onFirstToken)=>{
      if(!journey?.receipt)throw new Error('This action has no verification receipt.');
      const response=await fetch('/api/chat-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        actionResult:result,page:pagePath(),pageContext:currentPageContext(),answerDepth
      })});
      if(!response.ok||!response.body)throw new Error('The action result could not be confirmed.');
      const reader=response.body.getReader(),decoder=new TextDecoder();
      let text='',frame=0,firstTokenAt=0;
      const paint=()=>{frame=0;render(arrival,text);enhanceActions(arrival);scrollLatest({force:true})};
      while(true){
        const {done,value}=await reader.read();if(done)break;
        text+=decoder.decode(value,{stream:true});
        if(!firstTokenAt&&text){firstTokenAt=performance.now();onFirstToken?.()}
        if(!frame)frame=requestAnimationFrame(paint);
      }
      text+=decoder.decode();if(frame)cancelAnimationFrame(frame);
      if(!text.trim())throw new Error('The action result was empty.');
      // A conclusion is capped short, so the model almost always delivers it as
      // one sub-second burst: measured live, the first chunk lands, then the
      // rest arrives inside ~110ms. Painting each chunk as it appears finishes
      // faster than the eye registers, which reads as a flash after a wait
      // rather than a reply being written. Counting chunks does not detect
      // this, because the burst is many chunks. Time it instead, and when the
      // whole answer arrived that quickly, replay it at a readable pace.
      const burstMs=firstTokenAt?performance.now()-firstTokenAt:0;
      if(burstMs<400){
        arrival.replaceChildren();
        await typeBufferedMessage(arrival,text.trim());
      }else paint();
      return text.trim();
    };

    const completeJourney=async(bubble,journey,result)=>{
      if(!bubble||!journey?.arrival||bubble.dataset.journeyComplete)return;
      bubble.dataset.journeyComplete='true';
      // The progress row stays active across the verified continuation request
      // so the visitor sees work in progress until the conclusion starts, not a
      // finished-looking row waiting on the model's first token.
      const settleStep=()=>bubble.querySelector('.assist-journey-step.is-active')?.classList.replace('is-active','is-done');
      const arrival=document.createElement('div');
      arrival.className='assist-journey-arrival';
      bubble.appendChild(arrival);
      scrollLatest({force:true});
      let conclusion='';
      try{conclusion=await streamActionConclusion(journey,result,arrival,settleStep)}
      catch{
        settleStep();
        await typeBufferedMessage(arrival,journey.arrival);
        conclusion=journey.arrival;
      }
      journey.arrival=conclusion;
      for(let i=transcript.length-1;i>=0;i--){if(transcript[i].role==='assistant'){
        transcript[i]={...transcript[i],journey:{...journey,pending:false,completed:true}};break
      }}
      for(let i=history.length-1;i>=0;i--){if(history[i].role==='assistant'){history[i]={...history[i],content:`${journey.departure}\n${conclusion}`,journeyRoute:true};break}}
      writeStored(transcript);
      appendJourneyFallback(arrival,journey);
      scrollLatest({force:true});
      notifyClosed(conclusion);
    };

    // Run once the page has actually stopped moving rather than after a fixed
    // wait. scrollend covers the browsers that fire it; the frame watcher covers
    // the rest, and the common case where the target was already in view and so
    // nothing scrolls and no event ever arrives.
    // requestAnimationFrame is suspended while the tab is hidden, so anything a
    // journey depends on has to fall back to a timer rather than wait on a
    // paint that will never arrive. Without this a handoff completed in a
    // background tab would never finish.
    const afterPaint=run=>{
      if(document.hidden){setTimeout(run,0);return}
      requestAnimationFrame(()=>requestAnimationFrame(run));
    };

    const whenScrollSettled=run=>{
      if(document.hidden)return void run();
      let done=false,frames=0,still=0,last=scrollY;
      const finish=()=>{if(done)return;done=true;removeEventListener('scrollend',finish);run()};
      addEventListener('scrollend',finish,{once:true});
      const watch=()=>{
        if(done)return;
        frames++;
        if(scrollY===last)still++;
        else{still=0;last=scrollY}
        // A few frames of grace so a smooth scroll that has not begun painting
        // yet is not mistaken for a page that never moved.
        if(frames>4&&still>=3)return finish();
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    };

    const guideJourney=(journey,bubble)=>{
      let url;
      try{url=new URL(journey.href,location.href)}catch{return}
      if(!isSafeDestination(url))return;
      journeyStep(bubble,journey.status);
      // One paint so the progress row is visible, then start immediately. The
      // departure has already finished streaming, so anything longer than a
      // frame is delay the visitor feels for nothing.
      afterPaint(()=>{
        if(publicPath(url)!==pagePath()){
          navigateTo(journey.href,journey.label,journey);
          return;
        }
        let finished=false,ceiling=0;
        let revealResult={found:false,highlighted:false},formResult={updated:false,appliedFields:[]};
        const arrive=()=>{
          if(finished)return;finished=true;
          clearTimeout(ceiling);
          completeJourney(bubble,journey,actionResultFor(journey,revealResult,formResult));
        };
        revealResult=revealTarget(url,journey.label,journey.section_requested===true);
        formResult=prepareProjectForm(journey);
        whenScrollSettled(arrive);
        // Hard ceiling only, for a scroll that never settles.
        ceiling=setTimeout(arrive,900);
      });
    };

    // Complete a guide-initiated cross-page handoff only once. On desktop the
    // conversation can reopen beside the page. On a phone the full-height
    // sheet would cover the exact content Nika just revealed, so keep it
    // minimized, show the page target, and surface the completed reply through
    // the existing unread preview. The visitor can reopen Nika when ready.
    try{
      const handoff=JSON.parse(sessionStorage.getItem(NAV_STORE)||'null');
      if(handoff&&Date.now()-Number(handoff.at||0)<30000&&typeof handoff.status==='string'&&typeof handoff.arrival==='string'){
        sessionStorage.removeItem(NAV_STORE);
        afterPaint(()=>{
          const keepPageVisible=matchMedia('(max-width:640px)').matches;
          if(!keepPageVisible&&!panel.classList.contains('is-open'))launch.click();
          const url=new URL(handoff.href,location.href);
          const bubble=[...log.querySelectorAll('.assist-msg.bot[data-chat-entry="true"]')].at(-1);
          journeyStep(bubble,handoff.status);
          const revealResult=revealTarget(url,handoff.label,handoff.section_requested===true);
          const formResult=prepareProjectForm(handoff);
          const transition=document.querySelector('.page-transition');
          let settled=false,ceiling=0;
          const finish=()=>{
            if(settled)return;settled=true;
            clearTimeout(ceiling);
            completeJourney(bubble,handoff,actionResultFor(handoff,revealResult,formResult));
          };
          // Wait on the arrival animation only while one is actually running.
          const arriving=transition?.classList.contains('is-arriving');
          if(arriving)transition.addEventListener('transitionend',finish,{once:true});
          else whenScrollSettled(finish);
          ceiling=setTimeout(finish,arriving?720:600);
        });
      }
    }catch{sessionStorage.removeItem(NAV_STORE)}

    const clear=document.createElement('button');
    clear.type='button';clear.className='assist-clear';clear.setAttribute('aria-label','Delete chat history');
    const trash='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4.8C8 3.8 8.8 3 9.8 3h4.4c1 0 1.8.8 1.8 1.8V6M19 6l-.8 13.1c-.1 1.1-1 1.9-2.1 1.9H7.9c-1.1 0-2-.8-2.1-1.9L5 6M10 10.5v6M14 10.5v6"/></svg>';
    clear.innerHTML=trash;head.appendChild(clear);
    const resetClear=()=>{clear.classList.remove('is-confirming');clear.innerHTML=trash;clear.setAttribute('aria-label','Delete chat history');clearTimeout(confirmTimer)};
    clear.addEventListener('click',()=>{
      if(!clear.classList.contains('is-confirming')){
        clear.classList.add('is-confirming');clear.textContent='delete chat?';clear.setAttribute('aria-label','Confirm delete chat history');
        confirmTimer=setTimeout(resetClear,4000);return;
      }
      transcript=[];history.length=0;localStorage.removeItem(STORE);
      log.querySelectorAll('[data-chat-entry="true"]').forEach(el=>el.remove());
      chips&&(chips.hidden=false);clearUnread();resetClear();
      announceStatus('Chat history cleared.',{tone:'success'});
    });

    const thinking=()=>{
      const el=document.createElement('div');
      el.className='assist-typing';el.setAttribute('role','status');
      el.setAttribute('aria-label','abatchan is thinking');
      el.innerHTML='<i></i><i></i><i></i>';
      log.appendChild(el);scrollLatest({force:true});
      return el;
    };

    const ensureAudio=()=>{
      if(audioCtx)return audioCtx;
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)return null;
      try{audioCtx=new AudioContext()}catch{return null}
      return audioCtx;
    };
    const chime=()=>{
      const ctx=ensureAudio();if(!ctx)return;
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
      const now=ctx.currentTime;
      [660,880].forEach((freq,i)=>{
        const osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type='sine';osc.frequency.value=freq;
        gain.gain.setValueAtTime(0,now+i*.07);
        gain.gain.linearRampToValueAtTime(.045,now+i*.07+.015);
        gain.gain.exponentialRampToValueAtTime(.001,now+i*.07+.2);
        osc.connect(gain).connect(ctx.destination);osc.start(now+i*.07);osc.stop(now+i*.07+.22);
      });
    };

    const clearUnread=()=>{
      launch.querySelector('.assist-unread-dot')?.remove();
      document.querySelector('.assist-reply-peek')?.remove();
      clearTimeout(peekTimer);
    };
    const notifyClosed=answer=>{
      if(panel.classList.contains('is-open'))return;
      if(!launch.querySelector('.assist-unread-dot')){
        const dot=document.createElement('i');dot.className='assist-unread-dot';dot.setAttribute('aria-hidden','true');launch.appendChild(dot);
      }
      document.querySelector('.assist-reply-peek')?.remove();
      const peek=document.createElement('button');peek.type='button';peek.className='assist-reply-peek';
      const clean=String(answer).replace(/[#*_`>\[\]()]/g,' ').replace(/\s+/g,' ').trim();
      peek.innerHTML='<b>New reply from the guide</b><span>'+escapeText(clean.slice(0,92))+'</span><button type="button" aria-label="Dismiss">×</button>';
      const close=peek.lastElementChild;
      close.addEventListener('click',e=>{e.stopPropagation();peek.remove()});
      peek.addEventListener('click',()=>{clearUnread();launch.click()});
      document.body.appendChild(peek);requestAnimationFrame(()=>peek.classList.add('is-on'));
      peekTimer=setTimeout(()=>peek.remove(),7000);chime();
    };

    launch.addEventListener('click',()=>{
      if(!panel.classList.contains('is-open'))return;
      clearUnread();settleLatest();
    });
    panel.addEventListener('transitionend',event=>{
      if(event.target===panel&&panel.classList.contains('is-open'))settleLatest();
    });

    const fail=(error,question,userId)=>{
      const message=typeof error==='string'?error:error?.message;
      const heading=(typeof error==='object'&&error?.title)||'The guide lost its connection.';
      const retryable=typeof error==='object'&&error?.retryable!==undefined?!!error.retryable:true;

      const el=document.createElement('div');el.className='assist-msg bot assist-error';el.setAttribute('role','alert');
      const title=document.createElement('b');title.textContent=heading;
      const body=document.createElement('span');body.textContent=message||'Try again, or contact Abat directly.';
      const actions=document.createElement('div');actions.className='assist-error-actions';
      if(retryable){
        const retry=document.createElement('button');retry.type='button';retry.className='btn sm';retry.textContent='Try again';
        retry.onclick=()=>{
          const entry=transcript.find(item=>item.role==='user'&&item.id===userId);
          reply(question,userId,entry?.attachments||[]);
        };
        actions.append(retry);
      }
      // Two routes, because a visitor the guide just turned away should not
      // also have to pick the one channel that suits Abat.
      const contact=document.createElement('a');contact.href='/contact';contact.className='btn primary sm';contact.textContent='Email Abat ↗';
      const whatsapp=document.createElement('a');whatsapp.href=WHATSAPP;whatsapp.className='btn sm assist-wa';
      whatsapp.target='_blank';whatsapp.rel='noopener noreferrer';whatsapp.textContent='WhatsApp ↗';
      actions.append(contact,whatsapp);el.append(title,body,actions);log.appendChild(el);scrollLatest({force:true});
    };

    const reply=async(text,userId,attachments=[])=>{
      if(pending||!text)return;
      pending=true;activeController=new AbortController();input.disabled=true;send.disabled=false;send.classList.add('is-generating');
      send.setAttribute('aria-label','Stop response');send.removeAttribute('data-tip');send.querySelector('img').src='/assets/icons/square.svg';log.setAttribute('aria-busy','true');
      const loader=thinking();
      let bubble=null,answer='',frame=0,paintedFrames=0;
      const ensureBubble=()=>{
        if(bubble)return bubble;
        loader.remove();
        bubble=add('','bot',true);messageContent(bubble).classList.add('is-streaming');
        return bubble;
      };
      const paint=()=>{frame=0;if(!answer)return;render(messageContent(ensureBubble()),answer);paintedFrames+=1;scrollLatest()};
      try{
        const res=await fetch('/api/chat-stream',{method:'POST',signal:activeController.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({
          message:text,history:requestHistory(),page:pagePath(),pageContext:currentPageContext(),answerDepth,actionMode,
          attachments:attachments.slice(0,MAX_ATTACHMENTS).map(item=>({kind:item.kind,name:item.name,type:item.type,size:item.size,text:item.kind==='text'?item.text:''}))
        })});
        // The server reports what is left of today's budget. Say so once,
        // while there is still room to ask, rather than after the wall.
        const left=Number(res.headers.get('X-Guide-Remaining'));
        const mine=Number(res.headers.get('X-Guide-Personal'));
        // Whichever wall is nearer is the one worth naming.
        const warning=Number.isFinite(mine)&&mine>0&&mine<=5
          ? 'You have a few questions left with the guide today. For anything after that, the contact page reaches Abat directly.'
          : Number.isFinite(left)&&left>0&&left<=25
            ? 'The guide is near its limit for today. For anything it cannot answer, the contact page reaches Abat directly.'
            : '';
        if(warning&&!panel.dataset.budgetWarned){
          panel.dataset.budgetWarned='1';
          const note=document.createElement('div');
          note.className='assist-budget';
          note.setAttribute('role','status');
          note.textContent=warning;
          log.append(note);
          scrollLatest();
        }
        const type=res.headers.get('content-type')||'';
        if(!res.ok){
          let detail=null,message='Try again, or contact Abat directly.';
          if(type.includes('application/json')){try{detail=(await res.json())?.error||null;message=detail?.message||message}catch{}}
          else message=res.status===429?'The guide is busy right now. Please try again shortly.':'The guide could not connect just now. Please try again, or contact Abat directly.';
          const error=new Error(message);
          error.detail={title:detail?.title,message,retryable:detail?.retryable??(res.status===429||res.status>=500)};
          throw error;
        }
        if(!res.body)throw new Error('The browser did not receive a response stream.');
        const reader=res.body.getReader(),decoder=new TextDecoder();
        while(true){
          const {done,value}=await reader.read();if(done)break;
          answer+=decoder.decode(value,{stream:true});
          if(answer&&!frame)frame=requestAnimationFrame(paint);
        }
        answer+=decoder.decode();if(frame)cancelAnimationFrame(frame);
        const navigation=readNavigation(answer,res.headers.get('X-Abatchan-Action-Token'));
        answer=navigation.text;
        if(!answer)throw new Error('The guide returned an empty response.');
        if(navigation.action){
          // A navigation departure is emitted only after the model's complete
          // tool call has been validated, so it cannot genuinely stream over
          // the network. Clear any single-frame paint and reveal it here before
          // the progress card/action begins; the arrival follows the same path.
          const content=messageContent(ensureBubble());
          content.replaceChildren();
          await typeBufferedMessage(content,answer);
        }else if(paintedFrames<2){
          // Short answers can remain entirely inside the server's rolling
          // safety tail and therefore arrive as one final network chunk. If
          // the visitor never saw progressive paints, reveal that buffered
          // answer locally instead of flashing the complete reply at once.
          const content=messageContent(ensureBubble());
          content.replaceChildren();
          await typeBufferedMessage(content,answer);
        }else paint();
        messageContent(bubble)?.classList.remove('is-streaming');
        if(bubble)enhanceActions(messageContent(bubble));
        const userEntry=transcript.find(item=>item.role==='user'&&item.id===userId);
        if(userEntry){userEntry.state='answered';refreshUserTools(userEntry)}
        const assistantEntry={id:uid(),role:'assistant',content:answer,createdAt:Date.now(),replyTo:userId||null};
        const needsApproval=navigation.action&&(actionMode==='ask'||navigation.action.requires_approval===true);
        if(needsApproval)assistantEntry.journey={...navigation.action,pending:true};
        if(bubble)addMessageTools(bubble,assistantEntry);
        history.push({role:'user',content:text},{role:'assistant',content:answer});
        if(history.length>8)history.splice(0,history.length-8);
        transcript.push(assistantEntry);writeStored(transcript);refreshLatestAssistant();
        notifyClosed(answer);
        if(navigation.action){
          const destination=navigation.action;
          let destinationUrl=null;
          try{destinationUrl=new URL(destination.href,location.href)}catch{}
          if(destinationUrl&&isSafeDestination(destinationUrl)){
            if(needsApproval)requestJourneyApproval(bubble,destination,assistantEntry);
            else guideJourney(destination,bubble);
          }
        }
      }catch(err){
        if(frame)cancelAnimationFrame(frame);
        loader.remove();bubble?.remove();
        const userEntry=transcript.find(item=>item.role==='user'&&item.id===userId);
        if(userEntry){userEntry.state='failed';writeStored(transcript);refreshUserTools(userEntry)}
        if(err?.name==='AbortError')announceStatus('Response stopped. You can retry the message.',{tone:'warning'});
        else fail(err.detail||err.message,text,userId);
      }finally{
        pending=false;activeController=null;input.disabled=false;send.disabled=false;send.classList.remove('is-generating');
        send.setAttribute('aria-label','Send');send.removeAttribute('data-tip');send.querySelector('img').src='/assets/icons/arrow-up.svg';log.setAttribute('aria-busy','false');
        if(panel.classList.contains('is-open'))input.focus();
      }
    };

    const ask=text=>{
      const files=pendingAttachments.map(item=>({...item}));
      const clean=String(text||'').trim()||(files.length?'Please review the attached project details.':'');if(!clean||pending)return;
      ensureAudio()?.resume().catch(()=>{});
      const runtimeAttachments=files.slice(0,MAX_ATTACHMENTS).map(({kind,name,type,size,text,previewUrl,previewData})=>({kind,name,type,size,previewUrl,previewData,...(kind==='text'?{text}:{})}));
      const entry={id:uid(),role:'user',content:clean,createdAt:Date.now(),state:'pending',attachments:runtimeAttachments};
      transcript.push(entry);add(clean,'me',true,entry);writeStored(transcript);
      pendingAttachments=[];renderPendingAttachments();
      if(chips)chips.hidden=true;input.value='';grow();meter(false);reply(clean,entry.id,files);
    };
    form.addEventListener('submit',e=>{e.preventDefault();if(pending){activeController?.abort();return}ask(input.value)});
    chips?.addEventListener('click',e=>{const button=e.target.closest('button');if(button)ask(button.textContent)});

    // Existing greeting messages were inserted as plain text before this module.
    // Render any bot message that already contains Markdown-like syntax.
    log.querySelectorAll('.assist-msg.bot:not([data-chat-entry="true"])').forEach(el=>{
      const text=el.textContent;if(/[\[*_`#]|\]\(/.test(text))render(el,text)
    });
  });
})();
