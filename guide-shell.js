// The guide's shell: launcher, panel, composer, and the plain fallback that
// runs until assistant-v2.js takes over the network.
//
// It lives here rather than in the site's own script because the embed on a
// buyer's domain needs exactly this and none of the rest of that file. One
// implementation, two callers, so the markup cannot drift between the site it
// was written for and the sites it is sold to.
//
// Everything a tenant can differ on arrives through cfg; the defaults reproduce
// the primary site so nothing about it changes.

const q = (s, c = document) => c.querySelector(s);

// The panel's styles are a stylesheet most visitors never need, so it loads
// here in parallel with the settings call rather than blocking first paint.
const loadAssistantStyles = href => new Promise(resolve => {
  if (document.querySelector('link[data-assist-css]')) return resolve();
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = href; link.dataset.assistCss = '1';
  // Resolve either way: a missing stylesheet should leave the guide reachable
  // and plain, not remove it from the page.
  link.onload = resolve; link.onerror = resolve;
  document.head.append(link);
});

export async function mountGuideShell(options = {}) {
  const cfg = {
    name: 'Nika',
    siteName: 'abatchan',
    subtitle: 'site help, backed by Abat',
    avatar: '/assets/abatchan-symbol-indigo-tight.svg',
    assetBase: '',
    apiBase: '',
    placeholder: 'Ask about your project…',
    disclaimer: 'Site help only, no account access, payments, or promises.',
    greeting: "Hey, I'm Nika. What are you looking to build?",
    chips: ['What do you build?', 'How much does it cost?', 'How long does it take?', 'What can you help with?'],
    retiredGreeting: 'Hi. Ask me anything about the work, pricing, or how a project runs.',
    endpoint: null,
    stylesheet: '/assistant.css?v=24',
    loadSettings: async () => null,
    ...options
  };

  if(q('.assist-launch'))return;
  const styles=loadAssistantStyles(cfg.stylesheet);
  const settingsRequest=cfg.loadSettings();
  // Do not make the launcher wait on a remote settings request. On a cold
  // mobile connection that left the page looking as though Nika did not
  // exist. Give a cached/fast response a short chance, then render the safe
  // authored default while the same request continues in the background.
  const settings=await Promise.race([
    settingsRequest,
    new Promise(resolve=>setTimeout(()=>resolve(null),240))
  ]);
  if(settings?.['assistant.enabled']===false)return;
  await styles;
  const storedGreeting=settings?.['assistant.greeting'];
  const retiredGreetings=[
    cfg.retiredGreeting,
    "Hey, I'm the abatchan guide. I know the work, pricing, process, and how to reach Abat. What are you trying to build?",
    "Hey, I’m the Nika. What are you looking to build?"
  ];
  if(typeof storedGreeting==='string'&&!retiredGreetings.includes(storedGreeting)){
    cfg.greeting=storedGreeting;
  }
  const ICON_CHAT='<svg class="chat" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-2.8-.4L4 21.5l1.4-4.2A8.3 8.3 0 0 1 3.5 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8.5 8.4Z"/></svg>';
  const ICON_CLOSE='<svg class="close" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  const launch=document.createElement('button');
  launch.type='button';launch.className='assist-launch';
  launch.setAttribute('aria-label','Open the assistant');
  launch.setAttribute('aria-expanded','false');
  launch.dataset.tip='Ask about the work';
  launch.innerHTML=ICON_CHAT+ICON_CLOSE;

  const panel=document.createElement('div');
  panel.className='assist-panel';panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label',`${cfg.name}, ${cfg.siteName} assistant`);panel.setAttribute('aria-modal','false');
  panel.innerHTML=
    `<div class="assist-head">`+
      `${cfg.avatar?`<img src="${cfg.avatar}" alt="" width="504" height="309">`:""}`+
      `<div><b>${cfg.name}</b><span>${cfg.subtitle}</span></div>`+
      '<i class="assist-dot" aria-hidden="true"></i>'+
    '</div>'+
    '<div class="assist-log" role="log" aria-live="polite"></div>'+
    '<div class="assist-chips">'+cfg.chips.map(c=>`<button type="button">${c}</button>`).join('')+'</div>'+
    '<form class="assist-form">'+
      '<div class="assist-attachment-list" aria-live="polite" hidden></div>'+
      '<p class="assist-attachment-error" role="alert" hidden></p>'+
      `<textarea name="q" rows="1" autocomplete="off" maxlength="4000" placeholder="${cfg.placeholder}" aria-label="Your question"></textarea>`+
      '<input class="assist-file-input" type="file" accept="image/*,.txt,.md,.csv,.json,.pdf,.doc,.docx,.rtf,text/plain,text/markdown,text/csv,application/json,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple hidden>'+
      '<div class="assist-dictation-bar" role="group" aria-label="Voice dictation" hidden>'+
        `<button class="assist-dictation-cancel" type="button" aria-label="Cancel dictation"><img src="${cfg.assetBase}/assets/icons/x.svg" alt="" aria-hidden="true"></button>`+
        '<canvas class="assist-dictation-wave" aria-hidden="true"></canvas>'+
        '<time class="assist-dictation-time" aria-label="Dictation duration">0:00</time>'+
        `<button class="assist-dictation-stop" type="button" aria-label="Stop dictation"><img src="${cfg.assetBase}/assets/icons/square.svg" alt="" aria-hidden="true"></button>`+
      '</div>'+
      '<div class="assist-composer-rail">'+
        '<div class="assist-composer-group">'+
          `<button class="assist-composer-icon assist-add" type="button" aria-label="Attach project details" data-tip="Attach project details"><img src="${cfg.assetBase}/assets/icons/plus.svg" alt="" aria-hidden="true"></button>`+
          '<div class="assist-composer-menu-wrap">'+
            `<button class="assist-composer-choice assist-approval" type="button" aria-haspopup="menu" aria-expanded="false" data-tip="Choose how site actions are approved"><img src="${cfg.assetBase}/assets/icons/shield-check.svg" alt="" aria-hidden="true"><span>Ask first</span><img class="assist-choice-chevron" src="${cfg.assetBase}/assets/icons/chevron-down.svg" alt="" aria-hidden="true"></button>`+
            '<div class="assist-composer-menu assist-approval-menu" role="menu" hidden><button type="button" role="menuitemradio" data-action-mode="ask"><strong>Ask before actions</strong><span>Confirm navigation each time</span></button><button type="button" role="menuitemradio" data-action-mode="allow"><strong>Allow site actions</strong><span>Navigate when I clearly ask</span></button></div>'+
          '</div>'+
        '</div>'+
        '<div class="assist-composer-group assist-composer-end">'+
          '<div class="assist-composer-menu-wrap">'+
            `<button class="assist-composer-choice assist-depth" type="button" aria-haspopup="menu" aria-expanded="false" data-tip="Choose answer depth"><span>Concise</span><img class="assist-choice-chevron" src="${cfg.assetBase}/assets/icons/chevron-down.svg" alt="" aria-hidden="true"></button>`+
            '<div class="assist-composer-menu assist-depth-menu" role="menu" hidden><button type="button" role="menuitemradio" data-answer-depth="concise"><strong>Concise</strong><span>Fast, focused answers</span></button><button type="button" role="menuitemradio" data-answer-depth="detailed"><strong>Detailed</strong><span>More context when useful</span></button></div>'+
          '</div>'+
          `<button class="assist-composer-icon assist-mic" type="button" aria-label="Start dictation" data-tip="Dictate a message"><img src="${cfg.assetBase}/assets/icons/microphone.svg" alt="" aria-hidden="true"></button>`+
          `<button class="assist-send" type="submit" aria-label="Send"><img src="${cfg.assetBase}/assets/icons/arrow-up.svg" alt="" aria-hidden="true"></button>`+
        '</div>'+
      '</div>'+
    '</form>'+
    `<p class="assist-note">${cfg.disclaimer}</p>`;

  document.body.append(launch,panel);

  const log=q('.assist-log',panel), form=q('.assist-form',panel), input=q('textarea,input',form);
  const chips=q('.assist-chips',panel);
  const history=[];
  let greeted=false,pending=false,lastQuestion='';

  const add=(text,who)=>{
    const el=document.createElement('div');
    el.className='assist-msg '+who;el.textContent=text;
    log.appendChild(el);log.scrollTop=log.scrollHeight;
    return el;
  };
  const ensureGreeting=()=>{
    let el=q('[data-guide-intro="true"]',log);
    if(!el){
      el=document.createElement('div');
      el.className='assist-msg bot assist-intro';
      el.dataset.guideIntro='true';
    }
    el.textContent=cfg.greeting;
    if(log.firstElementChild!==el)log.prepend(el);
    return el;
  };

  // A slower settings response can still update the already-rendered shell.
  // If the owner disabled Nika, remove it as soon as that authoritative value
  // arrives instead of leaving the optimistic launcher on screen.
  settingsRequest.then(fresh=>{
    if(fresh?.['assistant.enabled']===false){
      launch.remove();panel.remove();q('.assist-backdrop')?.remove();
      document.body.classList.remove('assist-sheet-open');return
    }
    const freshGreeting=fresh?.['assistant.greeting'];
    if(typeof freshGreeting==='string'&&!retiredGreetings.includes(freshGreeting)){
      cfg.greeting=freshGreeting;
      const intro=q('[data-guide-intro="true"]',log);
      if(intro){
        const content=q('.assist-message-content',intro);
        if(content)content.textContent=freshGreeting;else intro.textContent=freshGreeting;
      }
    }
  });
  const addError=(issue,question)=>{
    const safe=issue&&typeof issue==='object'?issue:ASSISTANT_FALLBACK_ERROR;
    const el=document.createElement('div');
    el.className='assist-msg bot assist-error';
    el.setAttribute('role','alert');
    const title=document.createElement('b');
    title.textContent=safe.title||ASSISTANT_FALLBACK_ERROR.title;
    const message=document.createElement('span');
    message.textContent=safe.message||ASSISTANT_FALLBACK_ERROR.message;
    const actions=document.createElement('div');
    actions.className='assist-error-actions';
    if(safe.retryable!==false){
      const retry=document.createElement('button');
      retry.type='button';retry.textContent='Try again';
      retry.addEventListener('click',()=>reply(question||lastQuestion));
      actions.appendChild(retry);
    }
    const contact=document.createElement('a');
    contact.href=safe.contact?.href||'/contact';
    contact.textContent=safe.contact?.label||'Contact support';
    actions.appendChild(contact);
    el.append(title,message,actions);
    log.appendChild(el);log.scrollTop=log.scrollHeight;
    return el;
  };
  const thinking=()=>{
    const el=document.createElement('div');
    el.className='assist-typing';el.setAttribute('role','status');
    el.setAttribute('aria-label','abatchan is thinking');
    el.innerHTML='<i></i><i></i><i></i>';
    log.appendChild(el);log.scrollTop=log.scrollHeight;
    return el;
  };
  const reply=async text=>{
    if(pending||!text)return;
    pending=true;lastQuestion=text;
    input.disabled=true;
    q('.assist-send',form).disabled=true;
    log.setAttribute('aria-busy','true');
    const dots=thinking();
    let answer,issue;
    if(cfg.endpoint){
      try{
        const res=await fetch(cfg.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({message:text,history:history.slice(-6),page:location.pathname,pageContext:assistantPageContext()})});
        let data={};
        try{data=await res.json()}catch{}
        if(!res.ok||data.error){issue=data.error||ASSISTANT_FALLBACK_ERROR}
        else answer=data.reply;
      }catch{issue=ASSISTANT_FALLBACK_ERROR}
    }else{
      await new Promise(r=>setTimeout(r,420+Math.random()*380));
      issue=ASSISTANT_FALLBACK_ERROR;
    }
    dots.remove();
    if(answer){
      add(answer,'bot');
      history.push(
        {role:'user',content:text},
        {role:'assistant',content:answer}
      );
      if(history.length>8)history.splice(0,history.length-8);
    }else{
      addError(issue,text);
    }
    pending=false;input.disabled=false;
    q('.assist-send',form).disabled=false;
    log.setAttribute('aria-busy','false');
    input.focus();
  };

  const open=on=>{
    panel.classList.toggle('is-open',on);
    launch.classList.toggle('is-open',on);
    launch.setAttribute('aria-expanded',String(on));
    launch.setAttribute('aria-label',on?'Close the assistant':'Open the assistant');
    launch.dataset.tip=on?'Close':'Ask about the work';
    if(on){
      launch.style.setProperty('animation','none');
      if(!greeted){greeted=true;ensureGreeting()}
      setTimeout(()=>input.focus(),260);
    }
  };
  launch.addEventListener('click',()=>open(!panel.classList.contains('is-open')));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('is-open')){open(false);launch.focus()}});
  document.addEventListener('pointerdown',e=>{
    if(!panel.classList.contains('is-open'))return;
    if(!panel.contains(e.target)&&!launch.contains(e.target))open(false);
  });

  const ask=text=>{
    if(!text.trim()||pending)return;
    add(text.trim(),'me');
    chips.hidden=true;
    input.value='';
    reply(text.trim());
  };
  form.addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
  chips.addEventListener('click',e=>{
    const b=e.target.closest('button');if(b)ask(b.textContent);
  });
}
