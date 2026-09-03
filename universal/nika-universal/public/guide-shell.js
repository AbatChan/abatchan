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
const loadAssistantStyles = (href, into) => new Promise(resolve => {
  const target = into || document.head;
  if (target.querySelector('link[data-assist-css]')) return resolve();
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = href; link.dataset.assistCss = '1';
  // Resolve either way: a missing stylesheet should leave the guide reachable
  // and plain, not remove it from the page.
  link.onload = resolve; link.onerror = resolve;
  target.append(link);
});

export async function mountGuideShell(options = {}) {
  const cfg = {
    name: 'Nika',
    siteName: 'abatchan',
    subtitle: 'site help, backed by Abat',
    avatar: '/assets/abatchan-symbol-indigo-tight.svg',
    launcherIcon: '',
    position: 'right',
    accent: '',
    panelColour: '',
    panelOpacity: null,
    gradientFrom: '',
    gradientTo: '',
    scrollbarColour: '',
    shadowColour: '',
    textColour: '',
    iconColour: '',
    customCss: '',
    attachments: true,
    logoSize: null,
    markSize: null,
    assetBase: '',
    apiBase: '',
    placeholder: 'Ask about your project…',
    disclaimer: 'Site help only, no account access, payments, or promises.',
    // One quiet line naming the software. It defaults on, because every install
    // that has not bought the right to remove it should carry it, including one
    // running with no licence key at all. Removing it is a Business feature and
    // the site's own server decides, which is what self-hosted means.
    branding: true,
    brandingLabel: 'Powered by Nika',
    brandingUrl: 'https://abatchan.com/nika',
    chips: [
      {label:'Show me relevant work',description:'See projects similar to yours'},
      {label:'How does a project start?',description:'Learn about the process'},
      {label:'What can you build?',description:'Explore possibilities'}
    ],
    endpoint: null,
    // A packaged install lands inside somebody else's theme, where a stray
    // `button {}` or `img { max-width }` would reshape the guide. Isolating is
    // opt-in so the site this was written for keeps rendering exactly as it does.
    isolate: false,
    stylesheet: '/assistant.css?v=26',
    loadSettings: async () => null,
    ...options
  };

  const resolved={};
  // Appearance settings are applied as tokens the stylesheet already reads, so
  // an owner changes the guide without any of its rules being rewritten.
  const hexToRgb=value=>{
    const hex=String(value||'').trim().replace('#','');
    const full=hex.length===3?hex.split('').map(part=>part+part).join(''):hex;
    if(!/^[0-9a-f]{6}$/i.test(full))return null;
    return [0,2,4].map(index=>parseInt(full.slice(index,index+2),16));
  };
  const applyAppearance=element=>{
    if(!element)return;
    const set=(name,value)=>value?element.style.setProperty(name,value):element.style.removeProperty(name);
    element.classList.toggle('assist-left',cfg.position==='left');
    set('--signal',cfg.accent);
    // Links in answers had their own built-in indigo, so a site that set every
    // other colour still saw an indigo action link. They follow the accent,
    // which is what a site's own link colour follows too — no separate setting.
    set('--signal-ink',cfg.accent);
    set('--assist-launch-from',cfg.gradientFrom);
    set('--assist-launch-to',cfg.gradientTo);
    const surface=hexToRgb(cfg.panelColour);
    const luminance=rgb=>rgb?(0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2])/255:0;
    const surfaceLight=surface?luminance(surface)>0.55:false;
    const suggest=colour=>{
      const chosen=hexToRgb(colour);
      if(!surface||!chosen)return '';
      return Math.abs(luminance(chosen)-luminance(surface))<0.34?(surfaceLight?'#15151a':'#f5f5f3'):'';
    };
    resolved.textColour=cfg.textColour||'';
    resolved.iconColour=cfg.iconColour||'';
    resolved.suggestedText=suggest(cfg.textColour);
    resolved.suggestedIcon=suggest(cfg.iconColour);
    set('--paper',cfg.textColour||(surfaceLight?'#15151a':''));
    set('--muted',surfaceLight?'#5f6067':'');
    set('--assist-menu-bg',surfaceLight?'rgba(255,255,255,.98)':'');
    set('--assist-menu-shadow',surfaceLight?'rgba(23,24,39,.18)':'');
    set('--assist-code-bg',surfaceLight?'rgba(21,21,25,.06)':'');
    set('--line',surfaceLight?'rgba(21,21,25,.16)':'');
    set('--edge',surfaceLight?'rgba(21,21,25,.5)':'');
    set('--ink',surfaceLight?'#f4f4f1':'');
    set('--assist-icon',cfg.iconColour||(surfaceLight?'#15151a':''));
    const glow=hexToRgb(cfg.shadowColour);
    set('--assist-launch-glow',glow?`rgba(${glow.join(',')},.42)`:'');
    // The hover state lifts the same glow rather than carrying its own colour,
    // which is how it kept the built-in indigo while the resting shadow
    // followed the configured one.
    set('--assist-launch-glow-hover',glow?`rgba(${glow.join(',')},.5)`:'');
    if(cfg.iconColour)set('--assist-send-icon',cfg.iconColour);
    const bar=hexToRgb(cfg.scrollbarColour);
    set('--assist-scrollbar',bar?`rgba(${bar.join(',')},.56)`:'');
    set('--assist-scrollbar-hover',bar?`rgba(${bar.join(',')},.78)`:'');
    set('--assist-logo-size',cfg.logoSize?`${cfg.logoSize}px`:'');
    set('--assist-mark-size',cfg.markSize?`${cfg.markSize}px`:'');
    const rgb=hexToRgb(cfg.panelColour);
    const alpha=cfg.panelOpacity===null||cfg.panelOpacity===''?null:Math.min(100,Math.max(0,Number(cfg.panelOpacity)))/100;
    if(rgb)set('--assist-panel-bg',`rgba(${rgb.join(',')},${alpha===null?0.72:alpha})`);
    else if(alpha!==null)set('--assist-panel-bg',`rgba(15,15,18,${alpha})`);
    else set('--assist-panel-bg','');
  };

  let host=null,scope=document;
  if(cfg.isolate){
    host=document.querySelector('[data-assist-host]')||document.createElement('div');
    if(!host.isConnected){host.dataset.assistHost='1';host.style.cssText='all:initial;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif';applyAppearance(host);document.body.append(host)}
    scope=host.shadowRoot||host.attachShadow({mode:'open'});
  }
  if(q('.assist-launch',scope))return;
  // assistant-v2.js takes over this DOM, so it has to be told where it lives.
  if(typeof window!=='undefined')window.__guideRoot=scope;
  const styles=loadAssistantStyles(cfg.stylesheet,cfg.isolate?scope:null);
  const ownStyle=document.createElement('style');
  ownStyle.dataset.assistCustom='1';
  const applyCustomCss=()=>{ownStyle.textContent=String(cfg.customCss||'').replace(/<\/style/gi,'<\\/style')};
  applyCustomCss();
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
  const ICON_CHAT='<svg class="chat" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-2.8-.4L4 21.5l1.4-4.2A8.3 8.3 0 0 1 3.5 11.5a8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 8.5 8.4Z"/></svg>';
  const ICON_CLOSE='<svg class="close" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const suggestionIcons=['/assets/icons/suggestion-work.svg','/assets/icons/suggestion-process.svg','/assets/icons/suggestion-capabilities.svg'];
  const normalizeSuggestions=value=>{
    if(typeof value==='string')try{value=JSON.parse(value)}catch{return []}
    if(!Array.isArray(value))return [];
    return value.slice(0,3).map(item=>typeof item==='string'?{label:item,question:item}:item).filter(item=>item&&String(item.label||'').trim());
  };
  let activeSuggestions=normalizeSuggestions(settings?.['assistant.suggestions']);
  if(!activeSuggestions.length)activeSuggestions=normalizeSuggestions(cfg.chips);
  const suggestionMarkup=items=>normalizeSuggestions(items).map((item,index)=>{
    const label=item.label;
    const question=item.question||label;
    const description=item.description||`Ask ${cfg.name} about this`;
    const icon=suggestionIcons[index%suggestionIcons.length];
    return `<button type="button" data-question="${safe(question)}"><span class="assist-chip-icon"><img src="${safe(cfg.assetBase+icon)}" alt="" aria-hidden="true"></span><span class="assist-chip-copy"><strong>${safe(label)}</strong><small>${safe(description)}</small></span><img class="assist-chip-chevron" src="${safe(cfg.assetBase+'/assets/icons/chevron-down.svg')}" alt="" aria-hidden="true"></button>`;
  }).join('');

  const launch=document.createElement('button');
  launch.type='button';launch.className='assist-launch';
  launch.setAttribute('aria-label','Open the assistant');
  launch.setAttribute('aria-expanded','false');
  launch.dataset.tip='Ask about the work';
  launch.innerHTML=(cfg.launcherIcon?`<img class="chat assist-launch-mark" src="${safe(cfg.launcherIcon)}" alt="">`:ICON_CHAT)+ICON_CLOSE;

  const panel=document.createElement('div');
  panel.className='assist-panel is-empty';panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label',`${cfg.name}, ${cfg.siteName} assistant`);panel.setAttribute('aria-modal','false');
  panel.innerHTML=
    `<div class="assist-head">`+
      `${cfg.avatar?`<img src="${cfg.avatar}" alt="" width="504" height="309">`:""}`+
      `<div><b>${cfg.name}</b><span>${cfg.subtitle}</span></div>`+
      '<i class="assist-dot" aria-hidden="true"></i>'+
    '</div>'+
    '<div class="assist-log" role="log" aria-live="polite"></div>'+
    '<div class="assist-chips" aria-label="Suggested questions">'+suggestionMarkup(activeSuggestions)+'</div>'+
    '<form class="assist-form">'+
      '<div class="assist-attachment-list" aria-live="polite" hidden></div>'+
      '<p class="assist-attachment-error" role="alert" hidden></p>'+
      `<textarea name="q" rows="1" autocomplete="off" maxlength="4000" placeholder="${cfg.placeholder}" aria-label="Your question"></textarea>`+
      (cfg.attachments===false?'':'<input class="assist-file-input" type="file" accept="image/*,.txt,.md,.csv,.json,.pdf,.doc,.docx,.rtf,text/plain,text/markdown,text/csv,application/json,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple hidden>')+
      '<div class="assist-dictation-bar" role="group" aria-label="Voice dictation" hidden>'+
        `<button class="assist-dictation-cancel" type="button" aria-label="Cancel dictation"><img src="${cfg.assetBase}/assets/icons/x.svg" alt="" aria-hidden="true"></button>`+
        '<canvas class="assist-dictation-wave" aria-hidden="true"></canvas>'+
        '<time class="assist-dictation-time" aria-label="Dictation duration">0:00</time>'+
        `<button class="assist-dictation-stop" type="button" aria-label="Stop dictation"><img src="${cfg.assetBase}/assets/icons/square.svg" alt="" aria-hidden="true"></button>`+
      '</div>'+
      '<div class="assist-composer-rail">'+
        '<div class="assist-composer-group">'+
          (cfg.attachments===false?'':`<button class="assist-composer-icon assist-add" type="button" aria-label="Attach project details" data-tip="Attach project details"><img src="${cfg.assetBase}/assets/icons/plus.svg" alt="" aria-hidden="true"></button>`)+
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
    `<p class="assist-note">${cfg.disclaimer}</p>`+
    // Below the disclaimer and smaller than it: present and readable, never
    // competing with the site it is a guest on.
    (cfg.branding===false?'':`<p class="assist-brand"><a href="${safe(cfg.brandingUrl)}" target="_blank" rel="noopener">${safe(cfg.brandingLabel)}</a></p>`);

  (cfg.isolate?scope:document.body).append(launch,panel);
  (cfg.isolate?scope:document.head).append(ownStyle);
  if(!cfg.isolate){applyAppearance(panel);applyAppearance(launch)}

  const log=q('.assist-log',panel), form=q('.assist-form',panel), input=q('textarea,input',form);
  const chips=q('.assist-chips',panel);
  const renderSuggestions=value=>{
    const next=normalizeSuggestions(value);
    if(!next.length)return;
    activeSuggestions=next;
    chips.innerHTML=suggestionMarkup(activeSuggestions);
  };
  const history=[];
  let pending=false,lastQuestion='';

  const add=(text,who)=>{
    const el=document.createElement('div');
    el.className='assist-msg '+who;el.textContent=text;
    log.appendChild(el);log.scrollTop=log.scrollHeight;
    return el;
  };
  // A slower settings response can still update the already-rendered shell.
  // If the owner disabled Nika, remove it as soon as that authoritative value
  // arrives instead of leaving the optimistic launcher on screen.
  settingsRequest.then(fresh=>{
    if(fresh?.['assistant.enabled']===false){
      launch.remove();panel.remove();q('.assist-backdrop',scope)?.remove();
      document.body.classList.remove('assist-sheet-open');return
    }
    renderSuggestions(fresh?.['assistant.suggestions']);
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
      setTimeout(()=>input.focus(),260);
    }
  };
  launch.addEventListener('click',()=>open(!panel.classList.contains('is-open')));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('is-open')){open(false);launch.focus()}});
  document.addEventListener('pointerdown',e=>{
    if(!panel.classList.contains('is-open'))return;
    const path=e.composedPath?e.composedPath():[e.target];
    if(!path.includes(panel)&&!path.includes(launch))open(false);
  });

  const ask=text=>{
    if(!text.trim()||pending)return;
    add(text.trim(),'me');
    chips.hidden=true;
    panel.classList.remove('is-empty');
    input.value='';
    reply(text.trim());
  };
  form.addEventListener('submit',e=>{e.preventDefault();ask(input.value)});
  chips.addEventListener('click',e=>{
    const b=e.target.closest('button');if(b)ask(b.dataset.question||b.querySelector('strong')?.textContent||'');
  });

  // An owner editing settings sees each change land on the guide itself rather
  // than on a drawing of it, so the shell can be restyled after it is mounted.
  const BLANK_PIXEL='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const canMask=typeof CSS!=='undefined'&&CSS.supports&&(CSS.supports('mask-image','url("a")')||CSS.supports('-webkit-mask-image','url("a")'));
  const paintGlyphs=()=>{
    if(!canMask)return;
    panel.querySelectorAll('.assist-composer-icon img,.assist-composer-choice img,.assist-send img').forEach(image=>{
      const current=image.getAttribute('src');
      // The widget swaps this src for send and stop, so the live one is recorded
      // before the element is blanked.
      if(current&&current!==BLANK_PIXEL)image.dataset.assistGlyph=current;
      const source=image.dataset.assistGlyph;
      if(!source)return;
      const url=`url("${source}")`;
      if(image.style.getPropertyValue('--icon-src')!==url)image.style.setProperty('--icon-src',url);
      if(current!==BLANK_PIXEL)image.setAttribute('src',BLANK_PIXEL);
    });
  };
  paintGlyphs();
  new MutationObserver(paintGlyphs).observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});

  return {
    open:value=>open(value!==false),
    // Reports the colours actually in use, which is not always what was asked
    // for once the contrast guard has had its say.
    resolved,
    update(changes={}){
      Object.assign(cfg,changes);
      const head=q('.assist-head',panel);
      head.querySelector('b').textContent=cfg.name;
      head.querySelector('span').textContent=cfg.subtitle;
      const logo=head.querySelector('img');
      if(cfg.avatar){
        if(logo)logo.src=cfg.avatar;
        else head.insertAdjacentHTML('afterbegin',`<img src="${safe(cfg.avatar)}" alt="" width="504" height="309">`);
      }else if(logo)logo.remove();
      launch.innerHTML=(cfg.launcherIcon?`<img class="chat assist-launch-mark" src="${safe(cfg.launcherIcon)}" alt="">`:ICON_CHAT)+ICON_CLOSE;
      panel.setAttribute('aria-label',`${cfg.name}, ${cfg.siteName} assistant`);
      const composer=panel.querySelector('textarea');
      if(composer)composer.placeholder=cfg.placeholder;
      const note=panel.querySelector('.assist-note');
      if(note)note.textContent=cfg.disclaimer;
      if(host)applyAppearance(host);else{applyAppearance(panel);applyAppearance(launch)}
      applyCustomCss();
      if(changes.chips)renderSuggestions(changes.chips);
    }
  };
}
