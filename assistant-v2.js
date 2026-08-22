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
    '/about':{'principles':'Connected by default.','capabilities':'Design, code, connect.','start-project':'Modern systems. Clean execution.'},
    '/pricing':{'website':'Website','platform':'Platform','system':'System','quote-process':'Quote the work, not the hype.','client-reviews':'What clients say after delivery.','pricing-faq':'Useful details before we start.','start-project':'Tell me what needs to work.'},
    '/reviews':{'start-project':'Tell me what needs to work.'},
    '/brand':{'name':'One word, always lowercase.','voice':'What the brand says.','symbol':'Mirrored, open geometry.','downloads':'The short version.','start-project':'Need something not listed here?'}
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
    const wanted=SECTION_TITLES[pagePath()]||{};
    const headings=[...document.querySelectorAll('main h1,main h2,main h3')];
    Object.entries(wanted).forEach(([id,title])=>{
      if(document.getElementById(id))return;
      const heading=headings.find(node=>node.textContent.trim()===title);
      const target=heading?.closest('section,article')||heading;
      if(target&&!target.id)target.id=id;
    });
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
    const description=document.querySelector('meta[name="description"]')?.content||'';
    const main=document.querySelector('main');
    const text=(main?.innerText||'').replace(/\s+/g,' ').trim().slice(0,3500);
    const sections=[...document.querySelectorAll('main [id]')]
      .filter(node=>node.matches('section,article,h1,h2,h3')||node.querySelector('h1,h2,h3'))
      .slice(0,24)
      .map(node=>({id:node.id,label:node.querySelector('h1,h2,h3')?.textContent.trim()||node.textContent.trim().slice(0,80)}));
    const active=[...document.querySelectorAll('main section[id],main article[id],main h2[id]')]
      .map(node=>({node,distance:Math.abs(node.getBoundingClientRect().top-innerHeight*.32)}))
      .sort((a,b)=>a.distance-b.distance)[0]?.node;
    let journey=[];
    try{journey=JSON.parse(sessionStorage.getItem(JOURNEY_STORE)||'[]')}catch{}
    return {
      title:document.title.slice(0,160),
      description:description.slice(0,320),
      text,
      path:pagePath(),
      navigation:navigationState,
      activeSection:active?{id:active.id,label:active.querySelector('h1,h2,h3')?.textContent.trim()||''}:null,
      sections,
      journey:Array.isArray(journey)?journey.slice(-4):[]
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
      syncChoices();closeComposerMenus();announceStatus(actionMode==='allow'?'Site actions can run when you clearly ask.':'Site actions will ask first.');input.focus();
    });
    depthMenu.addEventListener('click',event=>{
      const button=event.target.closest('[data-answer-depth]');if(!button)return;
      answerDepth=button.dataset.answerDepth;try{localStorage.setItem(ANSWER_DEPTH_STORE,answerDepth)}catch{}
      syncChoices();closeComposerMenus();announceStatus(answerDepth==='detailed'?'Detailed answers selected.':'Concise answers selected.');input.focus();
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
      if(imageNotice)announceStatus('Image preview added. The guide can use its name and details, but cannot inspect the pixels yet.',{duration:3200});
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
      recognition.onerror=event=>{if(event.error!=='aborted')announceStatus(event.error==='not-allowed'?'Microphone permission was not granted.':'Dictation could not start.')};
      recognition.onend=()=>{listening=false;mic.classList.remove('is-listening');mic.setAttribute('aria-label','Start dictation');mic.dataset.tip='Dictate a message';announceStatus(input.value.trim()?'Dictation added.':'Dictation stopped.');input.focus()};
      mic.addEventListener('click',()=>{try{listening?recognition.stop():recognition.start()}catch{announceStatus('Dictation is already starting.')}});
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
    const history=transcript.slice(-8).map(item=>item?.journey?.completed
      ? {...item,content:[item.content,item.journey.arrival].filter(Boolean).join('\n\n'),journey:undefined}
      : item
    );
    let pending=false,activeController=null,audioCtx=null,peekTimer=0,confirmTimer=0;

    const rememberJourney=entry=>{
      try{
        const stored=JSON.parse(sessionStorage.getItem(JOURNEY_STORE)||'[]');
        const journey=Array.isArray(stored)?stored:[];
        journey.push(entry);
        sessionStorage.setItem(JOURNEY_STORE,JSON.stringify(journey.slice(-8)));
      }catch{}
    };

    const targetFor=url=>{
      if(!url.hash)return document.querySelector('main h1,main');
      try{
        const raw=document.getElementById(decodeURIComponent(url.hash.slice(1)));
        return raw?.closest('section,article')||raw;
      }catch{return null}
    };

    const revealTarget=(url,label)=>{
      const target=targetFor(url);
      if(!target)return false;
      document.querySelectorAll('.assist-guided-target').forEach(node=>node.classList.remove('assist-guided-target'));
      target.classList.add('assist-guided-target');
      target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
      const marker=document.createElement('span');
      marker.className='assist-guide-marker';
      marker.textContent=label||'Here';
      marker.setAttribute('aria-hidden','true');
      target.appendChild(marker);
      setTimeout(()=>{target.classList.remove('assist-guided-target');marker.remove()},4200);
      return true;
    };

    const navigateTo=(href,label,handoff=null)=>{
      let url;
      try{url=new URL(href,location.href)}catch{return}
      if(!isSafeDestination(url))return;
      const destination=publicPath(url);
      const current=pagePath();
      rememberJourney({from:current,to:destination+url.hash,label:label||'the section',at:Date.now()});
      if(destination===current){
        revealTarget(url,label);
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
      const prompt=document.createElement('span');prompt.textContent=`Open ${journey.label||'this section'}?`;
      const approve=document.createElement('button');approve.type='button';approve.className='assist-text-action';approve.textContent='Continue';approve.dataset.tip='Approve this site action';
      const cancel=document.createElement('button');cancel.type='button';cancel.className='assist-text-action subtle';cancel.textContent='Not now';cancel.dataset.tip='Stay on this page';
      approve.addEventListener('click',()=>{
        row.remove();if(entry){entry.journey={...journey,pending:false};writeStored(transcript)}
        guideJourney(journey,bubble);
      });
      cancel.addEventListener('click',()=>{
        row.remove();if(entry){delete entry.journey;writeStored(transcript)}
        announceStatus('Staying on this page.');
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
      return {text:String(text).replace(match[0],'').trim(),action};
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
        announceStatus('Message copied.');
      }catch{announceStatus('The message could not be copied.')}
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
        announceStatus(reaction==='helpful'?'Marked as helpful.':'Feedback sent to Abat.');
      }catch{
        entry.feedback=previous;writeStored(transcript);
        button.closest('.assist-message-actions')?.querySelectorAll('[data-reaction]').forEach(control=>{
          control.setAttribute('aria-pressed',String(control.dataset.reaction===previous));
        });
        announceStatus('Feedback could not be sent.');
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
      const copy=action('copy','Copy message',ICONS.copy);copy.addEventListener('click',()=>copyText(entry.content));actions.append(copy);
      if(entry.role==='user'&&entry.state!=='answered'){
        const retry=action('retry','Retry message',ICONS.retry);
        retry.classList.add('assist-retry-message');
        retry.addEventListener('click',()=>{retry.disabled=true;entry.state='pending';writeStored(transcript);reply(entry.content,entry.id,entry.attachments||[])});
        actions.append(retry);
      }
      if(entry.role==='assistant'){
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
      [...log.querySelectorAll('.assist-msg.bot[data-chat-entry="true"]')].at(-1)?.classList.add('is-latest');
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
      if(intro&&log.firstElementChild!==intro)log.prepend(intro);
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
    const announceStatus=(message,{busy=false,duration=1800}={})=>{
      clearTimeout(systemStatusTimer);
      systemStatus.textContent=message;
      systemStatus.classList.toggle('is-busy',busy);
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

    const typeArrival=(element,source)=>{
      const finalText=String(source||'').trim();
      const plainText=finalText
        .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
        .replace(/[*_`~#>]/g,'')
        .replace(/\s+/g,' ')
        .trim();
      if(!plainText||matchMedia('(prefers-reduced-motion: reduce)').matches){
        render(element,finalText);enhanceActions(element);return Promise.resolve();
      }
      element.classList.add('is-streaming');
      const duration=Math.min(1800,Math.max(700,plainText.length*18));
      return new Promise(resolve=>{
        const started=performance.now();
        const tick=now=>{
          const progress=Math.min(1,(now-started)/duration);
          const length=Math.max(1,Math.round(plainText.length*progress));
          element.textContent=plainText.slice(0,length);
          followLatest=true;log.scrollTop=bottomPosition();
          if(progress<1){requestAnimationFrame(tick);return}
          element.classList.remove('is-streaming');
          render(element,finalText);enhanceActions(element);
          scrollLatest({force:true});resolve();
        };
        requestAnimationFrame(tick);
      });
    };

    const completeJourney=(bubble,journey)=>{
      if(!bubble||!journey?.arrival||bubble.dataset.journeyComplete)return;
      bubble.dataset.journeyComplete='true';
      bubble.querySelector('.assist-journey-step.is-active')?.classList.replace('is-active','is-done');
      const completed=[journey.departure,journey.arrival].filter(Boolean).join('\n\n');
      const arrival=document.createElement('div');
      arrival.className='assist-journey-arrival';
      bubble.appendChild(arrival);
      for(let i=transcript.length-1;i>=0;i--){if(transcript[i].role==='assistant'){
        transcript[i]={...transcript[i],journey:{status:journey.status,arrival:journey.arrival,completed:true}};break
      }}
      for(let i=history.length-1;i>=0;i--){if(history[i].role==='assistant'){history[i]={...history[i],content:completed};break}}
      writeStored(transcript);
      scrollLatest({force:true});
      typeArrival(arrival,journey.arrival).then(()=>notifyClosed(journey.arrival));
    };

    const guideJourney=(journey,bubble)=>{
      let url;
      try{url=new URL(journey.href,location.href)}catch{return}
      if(!isSafeDestination(url))return;
      journeyStep(bubble,journey.status);
      // Give the loading state one clean paint before starting the action. The
      // departure has already finished streaming at this point.
      setTimeout(()=>{
        if(publicPath(url)!==pagePath()){
          navigateTo(journey.href,journey.label,journey);
          return;
        }
        let finished=false;
        const arrive=()=>{
          if(finished)return;finished=true;
          setTimeout(()=>completeJourney(bubble,journey),280);
        };
        addEventListener('scrollend',arrive,{once:true});
        revealTarget(url,journey.label);
        setTimeout(arrive,900);
      },320);
    };

    // Complete a guide-initiated cross-page handoff only once. The assistant
    // reopens after the new page is ready, keeps the conversation above, and
    // points at the promised destination instead of starting over.
    try{
      const handoff=JSON.parse(sessionStorage.getItem(NAV_STORE)||'null');
      if(handoff&&Date.now()-Number(handoff.at||0)<30000&&typeof handoff.status==='string'&&typeof handoff.arrival==='string'){
        sessionStorage.removeItem(NAV_STORE);
        setTimeout(()=>{
          if(!panel.classList.contains('is-open'))launch.click();
          const url=new URL(handoff.href,location.href);
          const bubble=[...log.querySelectorAll('.assist-msg.bot[data-chat-entry="true"]')].at(-1);
          journeyStep(bubble,handoff.status);
          revealTarget(url,handoff.label);
          const transition=document.querySelector('.page-transition');
          const finish=()=>completeJourney(bubble,handoff);
          if(transition?.classList.contains('is-arriving'))transition.addEventListener('transitionend',finish,{once:true});
          setTimeout(finish,720);
        },120);
      }
    }catch{sessionStorage.removeItem(NAV_STORE)}

    const clear=document.createElement('button');
    clear.type='button';clear.className='assist-clear';clear.setAttribute('aria-label','Delete chat history');
    const trash='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>';
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
      announceStatus('Chat history cleared.');
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
      let bubble=null,answer='',frame=0;
      const ensureBubble=()=>{
        if(bubble)return bubble;
        loader.remove();
        bubble=add('','bot',true);messageContent(bubble).classList.add('is-streaming');
        return bubble;
      };
      const paint=()=>{frame=0;if(!answer)return;render(messageContent(ensureBubble()),answer);scrollLatest()};
      try{
        const res=await fetch('/api/chat-stream',{method:'POST',signal:activeController.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({
          message:text,history:history.slice(-4),page:location.pathname,pageContext:currentPageContext(),answerDepth,actionMode,
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
        if(answer)paint();
        else throw new Error('The guide returned an empty response.');
        messageContent(bubble)?.classList.remove('is-streaming');
        if(bubble)enhanceActions(messageContent(bubble));
        const userEntry=transcript.find(item=>item.role==='user'&&item.id===userId);
        if(userEntry){userEntry.state='answered';refreshUserTools(userEntry)}
        const assistantEntry={id:uid(),role:'assistant',content:answer,createdAt:Date.now(),replyTo:userId||null};
        if(navigation.action&&actionMode==='ask')assistantEntry.journey={...navigation.action,pending:true};
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
            if(actionMode==='allow')guideJourney(destination,bubble);
            else requestJourneyApproval(bubble,destination,assistantEntry);
          }
        }
      }catch(err){
        if(frame)cancelAnimationFrame(frame);
        loader.remove();bubble?.remove();
        const userEntry=transcript.find(item=>item.role==='user'&&item.id===userId);
        if(userEntry){userEntry.state='failed';writeStored(transcript);refreshUserTools(userEntry)}
        if(err?.name==='AbortError')announceStatus('Response stopped. You can retry the message.');
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
