// Progressive Markdown renderer and real streaming transport for the site guide.
// Loaded after script.js through supabase-config.js and intentionally scoped to
// the assistant so the rest of the static site keeps its zero-build setup.

(function assistantV2(){
  const CDN={
    marked:'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    purify:'https://cdn.jsdelivr.net/npm/dompurify@3.4.7/dist/purify.min.js'
  };
  const STORE='abatchanGuideHistoryV1';
  const MAX_STORED=24;

  const loadScript=src=>new Promise((resolve,reject)=>{
    if([...document.scripts].some(s=>s.src===src))return resolve();
    const s=document.createElement('script');
    s.src=src;s.defer=true;s.crossOrigin='anonymous';
    s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });

  const styles=document.createElement('style');
  styles.textContent=`
  .news{max-width:330px!important}
  .assist-panel{overflow:hidden}
  .assist-log{overflow-x:hidden;scrollbar-width:thin;scrollbar-color:rgba(99,102,241,.56) transparent}
  .assist-log::-webkit-scrollbar{width:7px}.assist-log::-webkit-scrollbar-track{background:transparent}
  .assist-log::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:999px;background:rgba(99,102,241,.56);background-clip:padding-box}
  .assist-log::-webkit-scrollbar-thumb:hover{background:rgba(99,102,241,.78);background-clip:padding-box}
  .assist-msg{max-width:calc(100% - 12px);min-width:0;overflow-wrap:anywhere;word-break:break-word}
  .assist-msg.me{white-space:pre-wrap}
  .assist-msg.bot{white-space:normal}
  .assist-msg.bot>*{max-width:100%;overflow-wrap:anywhere;word-break:break-word}
  .assist-msg.bot>*:first-child{margin-top:0}.assist-msg.bot>*:last-child{margin-bottom:0}
  .assist-msg.bot p{margin:0 0 .82em;line-height:1.58}
  .assist-msg.bot ul,.assist-msg.bot ol{margin:.35em 0 .9em;padding-left:1.25em;display:grid;gap:.38em}
  .assist-msg.bot li{line-height:1.5}.assist-msg.bot li::marker{color:var(--signal)}
  .assist-msg.bot strong{font-weight:720;color:var(--paper)}
  html[data-theme="light"] .assist-msg.bot strong{color:#151519}
  .assist-msg.bot a{color:var(--signal-ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
  .assist-msg.bot a:hover{color:var(--paper)}html[data-theme="light"] .assist-msg.bot a:hover{color:#151519}
  .assist-msg.bot code{font:500 .88em/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;padding:.14em .38em;border-radius:6px;background:rgba(99,102,241,.12);color:var(--signal-ink);overflow-wrap:anywhere;word-break:break-word}
  .assist-msg.bot pre{max-width:100%;overflow:auto;margin:.7em 0;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:rgba(0,0,0,.22);scrollbar-width:thin;scrollbar-color:rgba(99,102,241,.56) transparent}
  .assist-msg.bot pre code{padding:0;background:none;color:inherit;white-space:pre;overflow-wrap:normal;word-break:normal}
  .assist-msg.bot blockquote{margin:.7em 0;padding:.2em 0 .2em .9em;border-left:3px solid var(--signal);color:var(--muted)}
  .assist-msg.bot h1,.assist-msg.bot h2,.assist-msg.bot h3{margin:.85em 0 .4em;font-size:1em;line-height:1.35;letter-spacing:-.015em}
  .assist-msg.is-streaming::after{content:"";display:inline-block;width:2px;height:.88em;margin-left:3px;vertical-align:-.08em;border-radius:1px;background:var(--signal);animation:assist-caret .75s steps(1) infinite}
  .assist-clear{margin-left:auto;margin-right:28px;display:grid;place-items:center;width:36px;height:36px;flex:0 0 36px;border:1px solid var(--line);border-radius:11px;background:transparent;color:var(--muted);cursor:pointer;transition:color .2s,border-color .2s,background .2s,width .2s}
  .assist-clear:hover,.assist-clear:focus-visible{color:var(--paper);border-color:rgba(99,102,241,.52);background:rgba(99,102,241,.1)}
  html[data-theme="light"] .assist-clear:hover,html[data-theme="light"] .assist-clear:focus-visible{color:#151519}
  .assist-clear svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .assist-clear.is-confirming{width:auto;padding:0 11px;color:#ffb9b2;border-color:rgba(224,86,74,.48);font-size:11px;font-weight:700}
  .assist-error-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
  .assist-error-actions .btn{min-height:42px;padding:10px 15px;text-decoration:none}
  .assist-unread-dot{position:absolute;right:2px;top:2px;width:11px;height:11px;border:2px solid var(--ink);border-radius:50%;background:#34d399;box-shadow:0 0 0 4px rgba(52,211,153,.14);pointer-events:none}
  html[data-theme="light"] .assist-unread-dot{border-color:#f5f5f3}
  .assist-reply-peek{position:fixed;right:24px;bottom:104px;z-index:460;width:min(270px,calc(100vw - 34px));padding:13px 42px 13px 15px;border:1px solid rgba(99,102,241,.42);border-radius:16px;background:rgba(18,18,22,.94);color:var(--paper);box-shadow:0 18px 48px rgba(0,0,0,.36);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);opacity:0;transform:translateY(10px) scale(.98);pointer-events:none;transition:opacity .24s,transform .28s var(--ease)}
  html[data-theme="light"] .assist-reply-peek{background:rgba(248,248,246,.96);color:#151519;box-shadow:0 18px 48px rgba(20,20,28,.16)}
  .assist-reply-peek.is-on{opacity:1;transform:none;pointer-events:auto}
  .assist-reply-peek b{display:block;font-size:13px;margin-bottom:3px}.assist-reply-peek span{display:block;color:var(--muted);font-size:12px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .assist-reply-peek button{position:absolute;right:8px;top:8px;width:30px;height:30px;border:0;border-radius:10px;background:transparent;color:var(--muted);font:18px/1 inherit;cursor:pointer}
  @keyframes assist-caret{50%{opacity:0}}
  @media(max-width:640px){.assist-reply-peek{right:14px;bottom:96px}.assist-clear{margin-right:22px}}
  @media(prefers-reduced-motion:reduce){.assist-msg.is-streaming::after{animation:none}.assist-reply-peek{transition:none}}
  `;
  document.head.appendChild(styles);

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

  const readStored=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(STORE)||'[]');
      return Array.isArray(value)?value.filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string').slice(-MAX_STORED):[];
    }catch{return []}
  };
  const writeStored=items=>{
    try{localStorage.setItem(STORE,JSON.stringify(items.slice(-MAX_STORED)))}catch{}
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

    const form=oldForm.cloneNode(true);oldForm.replaceWith(form);
    const chips=oldChips?.cloneNode(true);if(oldChips&&chips)oldChips.replaceWith(chips);
    const input=form.querySelector('input');const send=form.querySelector('.assist-send');
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
      const greetingObserver=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
        if(node.nodeType===1&&node.classList?.contains('assist-msg')&&!node.dataset.chatEntry&&/^Hey, I'm the abatchan guide\./.test(node.textContent||''))node.remove();
      })));
      greetingObserver.observe(log,{childList:true});
    }

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

    const fail=(message,question)=>{
      const el=document.createElement('div');el.className='assist-msg bot assist-error';el.setAttribute('role','alert');
      const title=document.createElement('b');title.textContent='The guide lost its connection.';
      const body=document.createElement('span');body.textContent=message||'Try again, or contact Abat directly.';
      const actions=document.createElement('div');actions.className='assist-error-actions';
      const retry=document.createElement('button');retry.type='button';retry.className='btn sm';retry.textContent='Try again';retry.onclick=()=>reply(question);
      const contact=document.createElement('a');contact.href='/contact';contact.className='btn primary sm';contact.textContent='Contact Abat ↗';
      actions.append(retry,contact);el.append(title,body,actions);log.appendChild(el);log.scrollTop=log.scrollHeight;
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
        const res=await fetch('/api/chat-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:history.slice(-6),page:location.pathname})});
        const type=res.headers.get('content-type')||'';
        if(!res.ok){
          let message='Try again, or contact Abat directly.';
          if(type.includes('application/json')){try{message=(await res.json())?.error?.message||message}catch{}}
          else{try{message=(await res.text())||message}catch{}}
          throw new Error(message);
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
        loader.remove();bubble?.remove();fail(err.message,text);
      }finally{
        pending=false;input.disabled=false;send.disabled=false;log.setAttribute('aria-busy','false');
        if(panel.classList.contains('is-open'))input.focus();
      }
    };

    const ask=text=>{
      const clean=String(text||'').trim();if(!clean||pending)return;
      ensureAudio()?.resume().catch(()=>{});
      add(clean,'me',true);transcript.push({role:'user',content:clean});writeStored(transcript);
      if(chips)chips.hidden=true;input.value='';reply(clean);
    };
    form.addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
    chips?.addEventListener('click',e=>{const button=e.target.closest('button');if(button)ask(button.textContent)});

    // Existing greeting messages were inserted as plain text before this module.
    // Render any bot message that already contains Markdown-like syntax.
    log.querySelectorAll('.assist-msg.bot').forEach(el=>{const text=el.textContent;if(/[\[*_`#]|\]\(/.test(text))render(el,text)});
  });
})();