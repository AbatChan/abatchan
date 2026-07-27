// Progressive Markdown renderer and real streaming transport for the site guide.
// Loaded after script.js through supabase-config.js and intentionally scoped to
// the assistant so the rest of the static site keeps its zero-build setup.

(function assistantV2(){
  const CDN={
    marked:'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    purify:'https://cdn.jsdelivr.net/npm/dompurify@3.4.7/dist/purify.min.js'
  };

  const loadScript=src=>new Promise((resolve,reject)=>{
    if([...document.scripts].some(s=>s.src===src))return resolve();
    const s=document.createElement('script');
    s.src=src;s.defer=true;s.crossOrigin='anonymous';
    s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });

  const styles=document.createElement('style');
  styles.textContent=`
  .assist-msg.bot{white-space:normal}
  .assist-msg.bot>*:first-child{margin-top:0}.assist-msg.bot>*:last-child{margin-bottom:0}
  .assist-msg.bot p{margin:0 0 .82em;line-height:1.58}
  .assist-msg.bot ul,.assist-msg.bot ol{margin:.35em 0 .9em;padding-left:1.25em;display:grid;gap:.38em}
  .assist-msg.bot li{line-height:1.5}.assist-msg.bot li::marker{color:var(--signal)}
  .assist-msg.bot strong{font-weight:720;color:var(--paper)}
  html[data-theme="light"] .assist-msg.bot strong{color:#151519}
  .assist-msg.bot a{color:var(--signal-ink);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
  .assist-msg.bot a:hover{color:var(--paper)}html[data-theme="light"] .assist-msg.bot a:hover{color:#151519}
  .assist-msg.bot code{font:500 .88em/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;padding:.14em .38em;border-radius:6px;background:rgba(99,102,241,.12);color:var(--signal-ink)}
  .assist-msg.bot pre{max-width:100%;overflow:auto;margin:.7em 0;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:rgba(0,0,0,.22)}
  .assist-msg.bot pre code{padding:0;background:none;color:inherit}
  .assist-msg.bot blockquote{margin:.7em 0;padding:.2em 0 .2em .9em;border-left:3px solid var(--signal);color:var(--muted)}
  .assist-msg.bot h1,.assist-msg.bot h2,.assist-msg.bot h3{margin:.85em 0 .4em;font-size:1em;line-height:1.35;letter-spacing:-.015em}
  .assist-msg.is-streaming::after{content:"";display:inline-block;width:7px;height:1.05em;margin-left:4px;vertical-align:-.16em;border-radius:2px;background:var(--signal);animation:assist-caret .75s steps(1) infinite}
  @keyframes assist-caret{50%{opacity:0}}
  @media(prefers-reduced-motion:reduce){.assist-msg.is-streaming::after{animation:none}}
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
    if(!log||!oldForm)return;

    const form=oldForm.cloneNode(true);oldForm.replaceWith(form);
    const chips=oldChips?.cloneNode(true);if(oldChips&&chips)oldChips.replaceWith(chips);
    const input=form.querySelector('input');const send=form.querySelector('.assist-send');
    const history=[];let pending=false;

    const add=(text,who)=>{
      const el=document.createElement('div');el.className='assist-msg '+who;
      if(who==='bot')render(el,text);else el.textContent=text;
      log.appendChild(el);log.scrollTop=log.scrollHeight;return el;
    };

    const fail=(message,question)=>{
      const el=document.createElement('div');el.className='assist-msg bot assist-error';el.setAttribute('role','alert');
      const title=document.createElement('b');title.textContent='The guide lost its connection.';
      const body=document.createElement('span');body.textContent=message||'Try again, or contact Abat directly.';
      const actions=document.createElement('div');actions.className='assist-error-actions';
      const retry=document.createElement('button');retry.type='button';retry.textContent='Try again';retry.onclick=()=>reply(question);
      const contact=document.createElement('a');contact.href='/contact';contact.textContent='Contact Abat';
      actions.append(retry,contact);el.append(title,body,actions);log.appendChild(el);log.scrollTop=log.scrollHeight;
    };

    const reply=async text=>{
      if(pending||!text)return;
      pending=true;input.disabled=true;send.disabled=true;log.setAttribute('aria-busy','true');
      const bubble=add('','bot');bubble.classList.add('is-streaming');
      let answer='';let frame=0;
      const paint=()=>{frame=0;render(bubble,answer);log.scrollTop=log.scrollHeight};
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
          if(!frame)frame=requestAnimationFrame(paint);
        }
        answer+=decoder.decode();if(frame)cancelAnimationFrame(frame);paint();
        bubble.classList.remove('is-streaming');
        history.push({role:'user',content:text},{role:'assistant',content:answer});
        if(history.length>8)history.splice(0,history.length-8);
      }catch(err){
        if(frame)cancelAnimationFrame(frame);bubble.remove();fail(err.message,text);
      }finally{
        pending=false;input.disabled=false;send.disabled=false;log.setAttribute('aria-busy','false');input.focus();
      }
    };

    const ask=text=>{
      const clean=String(text||'').trim();if(!clean||pending)return;
      add(clean,'me');if(chips)chips.hidden=true;input.value='';reply(clean);
    };
    form.addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
    chips?.addEventListener('click',e=>{const button=e.target.closest('button');if(button)ask(button.textContent)});

    // Existing greeting messages were inserted as plain text before this module.
    // Render any bot message that already contains Markdown-like syntax.
    log.querySelectorAll('.assist-msg.bot').forEach(el=>{const text=el.textContent;if(/[\[*_`#]|\]\(/.test(text))render(el,text)});
  });
})();
