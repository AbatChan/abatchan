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
  const MAX_STORED=24;
  const WHATSAPP='https://wa.me/2347041857921';

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
    /^Hi\.\s+Ask me anything about the work, pricing, or how a project runs\./i.test(item.content)
  );
  const readStored=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(STORE)||'[]');
      return Array.isArray(value)?value.filter(x=>
        x&&['user','assistant'].includes(x.role)&&typeof x.content==='string'&&!isLegacyGreeting(x)
      ).slice(-MAX_STORED):[];
    }catch{return []}
  };
  const writeStored=items=>{
    try{localStorage.setItem(STORE,JSON.stringify(items.slice(-MAX_STORED)))}catch{}
  };
  const currentPageContext=()=>{
    const description=document.querySelector('meta[name="description"]')?.content||'';
    const main=document.querySelector('main');
    const text=(main?.innerText||'').replace(/\s+/g,' ').trim().slice(0,3500);
    return {title:document.title.slice(0,160),description:description.slice(0,320),text};
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
    const LIMIT=Number(input.getAttribute('maxlength'))||1000;

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
    const history=transcript.slice(-8);
    let pending=false,audioCtx=null,peekTimer=0,confirmTimer=0;

    const add=(text,who,persisted=false)=>{
      const el=document.createElement('div');el.className='assist-msg '+who;
      if(persisted)el.dataset.chatEntry='true';
      if(who==='bot')render(el,text);else el.textContent=text;
      log.appendChild(el);log.scrollTop=log.scrollHeight;return el;
    };

    if(transcript.length){
      transcript.forEach(item=>add(item.content,item.role==='assistant'?'bot':'me',true));
      chips&&(chips.hidden=true);
    }
    const pinIntro=()=>{
      const intro=log.querySelector('[data-guide-intro="true"]');
      if(intro&&log.firstElementChild!==intro)log.prepend(intro);
    };
    const greetingObserver=new MutationObserver(pinIntro);
    greetingObserver.observe(log,{childList:true});
    pinIntro();

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
      add('Chat cleared. What are you trying to build?','bot');
    });

    const thinking=()=>{
      const el=document.createElement('div');
      el.className='assist-typing';el.setAttribute('role','status');
      el.setAttribute('aria-label','abatchan is thinking');
      el.innerHTML='<i></i><i></i><i></i>';
      log.appendChild(el);log.scrollTop=log.scrollHeight;
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

    launch.addEventListener('click',()=>{if(panel.classList.contains('is-open'))clearUnread()});

    // The static answers script.js hands over. When the guide cannot answer,
    // the common questions still get a real reply instead of a red box.
    const canned=question=>{
      const list=window.ASSISTANT_CANNED;
      if(!Array.isArray(list))return '';
      return list.find(([pattern])=>pattern.test(question))?.[1]||'';
    };

    // The server says whether waiting helps. A spent day does not come back in
    // a minute, so offering "try again" on one only loops the visitor.
    const fail=(error,question)=>{
      const message=typeof error==='string'?error:error?.message;
      const heading=(typeof error==='object'&&error?.title)||'The guide lost its connection.';
      const retryable=typeof error==='object'&&error?.retryable!==undefined?!!error.retryable:true;
      const offline=retryable?'':canned(question);

      if(offline){
        const answer=add(offline,'bot',true);
        answer.classList.add('assist-offline');
        const note=document.createElement('div');note.className='assist-offline-note';
        note.textContent='Answered from the site’s own notes, because the live guide cannot reply right now.';
        answer.append(note);
      }

      const el=document.createElement('div');el.className='assist-msg bot assist-error';el.setAttribute('role','alert');
      const title=document.createElement('b');title.textContent=heading;
      const body=document.createElement('span');body.textContent=message||'Try again, or contact Abat directly.';
      const actions=document.createElement('div');actions.className='assist-error-actions';
      if(retryable){
        const retry=document.createElement('button');retry.type='button';retry.className='btn sm';retry.textContent='Try again';retry.onclick=()=>reply(question);
        actions.append(retry);
      }
      // Two routes, because a visitor the guide just turned away should not
      // also have to pick the one channel that suits Abat.
      const contact=document.createElement('a');contact.href='/contact';contact.className='btn primary sm';contact.textContent='Email Abat ↗';
      const whatsapp=document.createElement('a');whatsapp.href=WHATSAPP;whatsapp.className='btn sm assist-wa';
      whatsapp.target='_blank';whatsapp.rel='noopener noreferrer';whatsapp.textContent='WhatsApp ↗';
      actions.append(contact,whatsapp);el.append(title,body,actions);log.appendChild(el);log.scrollTop=log.scrollHeight;
    };

    const reply=async text=>{
      if(pending||!text)return;
      pending=true;input.disabled=true;send.disabled=true;log.setAttribute('aria-busy','true');
      const loader=thinking();
      let bubble=null,answer='',frame=0;
      const ensureBubble=()=>{
        if(bubble)return bubble;
        loader.remove();
        bubble=add('','bot',true);bubble.classList.add('is-streaming');
        return bubble;
      };
      const paint=()=>{frame=0;if(!answer)return;render(ensureBubble(),answer);log.scrollTop=log.scrollHeight};
      try{
        const res=await fetch('/api/chat-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:history.slice(-4),page:location.pathname,pageContext:currentPageContext()})});
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
          log.scrollTop=log.scrollHeight;
        }
        const type=res.headers.get('content-type')||'';
        if(!res.ok){
          let detail=null,message='Try again, or contact Abat directly.';
          if(type.includes('application/json')){try{detail=(await res.json())?.error||null;message=detail?.message||message}catch{}}
          else{try{message=(await res.text())||message}catch{}}
          const error=new Error(message);
          error.detail={title:detail?.title,message,retryable:detail?.retryable};
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
        if(answer)paint();
        else throw new Error('The guide returned an empty response.');
        bubble?.classList.remove('is-streaming');
        history.push({role:'user',content:text},{role:'assistant',content:answer});
        if(history.length>8)history.splice(0,history.length-8);
        transcript.push({role:'assistant',content:answer});writeStored(transcript);
        notifyClosed(answer);
      }catch(err){
        if(frame)cancelAnimationFrame(frame);
        loader.remove();bubble?.remove();fail(err.detail||err.message,text);
      }finally{
        pending=false;input.disabled=false;send.disabled=false;log.setAttribute('aria-busy','false');
        if(panel.classList.contains('is-open'))input.focus();
      }
    };

    const ask=text=>{
      const clean=String(text||'').trim();if(!clean||pending)return;
      ensureAudio()?.resume().catch(()=>{});
      add(clean,'me',true);transcript.push({role:'user',content:clean});writeStored(transcript);
      if(chips)chips.hidden=true;input.value='';grow();meter(false);reply(clean);
    };
    form.addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
    chips?.addEventListener('click',e=>{const button=e.target.closest('button');if(button)ask(button.textContent)});

    // Existing greeting messages were inserted as plain text before this module.
    // Render any bot message that already contains Markdown-like syntax.
    log.querySelectorAll('.assist-msg.bot').forEach(el=>{const text=el.textContent;if(/[\[*_`#]|\]\(/.test(text))render(el,text)});
  });
})();
