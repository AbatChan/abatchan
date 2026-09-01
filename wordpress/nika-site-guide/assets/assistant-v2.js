// Progressive Markdown renderer and real streaming transport for the site guide.
// Loaded after script.js through supabase-config.js and intentionally scoped to
// the assistant so the rest of the static site keeps its zero-build setup.

(function assistantV2(){
  // Served from our own domain rather than a CDN. The previous marked URL was
  // unpinned, so whatever version jsdelivr resolved to that day was executing
  // here — on a library that renders model output. These are the exact bytes
  // that URL served, pinned. Same-origin also means they cache with the site
  // and cost no extra connection on first paint.
  // On the primary site everything is same-origin and these stay relative. In an
  // embed the guide is served from another domain, so embed.js publishes where
  // it came from and which site is asking, and both travel with every call.
  const EMBED=(typeof window!=='undefined'&&window.__guideEmbed)||{};
  const API_BASE=String(EMBED.apiBase||'').replace(/\/$/,'');
  const SITE_KEY=String(EMBED.siteKey||'');
  const ROUTES={chat:'/api/chat-stream',feedback:'/api/guide-feedback',...(EMBED.routes||{})};
  const apiUrl=path=>`${API_BASE}${path}`;
  const ASSET_BASE=String(EMBED.assetBase??API_BASE).replace(/\/$/,'');
  const assetUrl=path=>`${ASSET_BASE}${path}`;
  // The guide's own UI can live in a shadow root, so its elements are found
  // through this scope while the page it is reading stays on `document`.
  const uiScope=()=>(typeof window!=='undefined'&&window.__guideRoot)||document;
  // The backdrop and the peek are styled by the guide's own stylesheet, so they
  // must land inside the same root as the panel or they arrive unstyled.
  const uiHome=()=>{
    const root=(typeof window!=='undefined'&&window.__guideRoot)||document;
    // The primary Abatchan site deliberately uses the document as its UI
    // scope. A Document may only contain its existing html element, so adding
    // the backdrop or reply peek directly to it throws and aborts Nika before
    // the real composer is wired up. Isolated installs keep their ShadowRoot;
    // the primary site mounts these interface elements in the body.
    return root===document?document.body:root;
  };
  // Cross-origin calls carry no cookies, so the site key is the only thing
  // identifying which tenant is asking.
  const HOST_HEADERS=EMBED.headers&&typeof EMBED.headers==='object'
    ?Object.fromEntries(Object.entries(EMBED.headers).filter(([name,value])=>/^[\w-]+$/.test(name)&&typeof value==='string'))
    :{};
  const apiHeaders=(extra={})=>({...extra,...HOST_HEADERS,...(SITE_KEY?{'X-Site-Key':SITE_KEY}:{})});
  const CDN={
    marked:assetUrl('/assets/vendor/marked-15.0.12.min.js'),
    purify:assetUrl('/assets/vendor/purify-3.4.7.min.js')
  };
  const STORE='abatchanGuideHistoryV1';
  const NAV_STORE='abatchanGuideNavigationV1';
  const JOURNEY_STORE='abatchanGuideJourneyV1';
  // The contact form empties as soon as the visitor leaves the page, so what
  // Nika applied is remembered here instead. It outlives navigation and the
  // history budget, and is cleared with the conversation it belongs to.
  const PREPARED_STORE='abatchanGuidePreparedFormV1';
  const readPrepared=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(PREPARED_STORE)||'null');
      if(!value||typeof value!=='object')return null;
      const kept=['name','email','type','message'].reduce((all,key)=>{
        const text=String(value[key]||'').trim().slice(0,key==='message'?1800:180);
        if(text)all[key]=text;
        return all;
      },{});
      return Object.keys(kept).length?kept:null;
    }catch{return null}
  };
  const writePrepared=values=>{
    try{
      const merged={...(readPrepared()||{}),...values};
      const kept=Object.fromEntries(Object.entries(merged).filter(([,text])=>String(text||'').trim()));
      if(Object.keys(kept).length)localStorage.setItem(PREPARED_STORE,JSON.stringify(kept));
      else localStorage.removeItem(PREPARED_STORE);
    }catch{}
  };
  const PAGE_STORE='abatchanGuideCurrentPageV1';
  const TRANSITION_STORE='abatNavigationPending';
  const ACTION_MODE_STORE='abatchanGuideActionModeV1';
  const ANSWER_DEPTH_STORE='abatchanGuideAnswerDepthV1';
  // How many turns are kept locally. This, not the model's window, is what
  // decides how far back Nika can remember: the budget is far larger than any
  // conversation this many turns can produce.
  const MAX_STORED=80;
  const MAX_ATTACHMENTS=10;
  const WHATSAPP='https://wa.me/2347041857921';
  const uid=()=>crypto.randomUUID?.()||`m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

  // Every installation builds this registry from its own live DOM. Authored
  // IDs and labels win, but ordinary accessible HTML is indexed too, so the
  // shared runtime never needs a customer-specific page or selector map.
  const automaticTargetNodes=new Map();
  // Scroll-triggered reveal animations are everywhere, and they hold a real,
  // laid-out element at opacity 0 until the visitor reaches it. Such an element
  // is a perfectly good destination — scrolling to it is exactly what makes it
  // appear — so transparency alone does not disqualify a candidate. It still
  // must be attached, displayed, and occupy the page: elements deliberately
  // hidden are already excluded by `hidden` and `aria-hidden`, both here and
  // where the registry is built.
  const targetReachable=(node,requireOpaque=false)=>{
    try{
      const owner=node?.ownerDocument;
      if(owner!==document||!node.isConnected||node.hidden||node.getAttribute?.('aria-hidden')==='true')return false;
      const style=getComputedStyle(node),rect=node.getBoundingClientRect();
      if(requireOpaque&&!(Number(style.opacity||1)>.01))return false;
      return style.display!=='none'&&style.visibility!=='hidden'&&node.getClientRects().length>0&&rect.width>1&&rect.height>1;
    }catch{return false}
  };
  const authoredTargetText=node=>node.getAttribute?.('data-nika-target')||node.getAttribute?.('data-nika-label')||node.dataset?.assistTarget||'';
  const targetText=node=>{
    if(node.matches('footer,[role="contentinfo"]'))return node.getAttribute('aria-label')||'Footer';
    const heading=node.matches('h1,h2,h3,h4,h5,h6')?node:node.querySelector('h1,h2,h3,h4,h5,h6');
    // Pages that predate sectioning elements title a block with bold text.
    // Only a short one counts, so body copy in bold cannot become a title.
    const boldTitle=[...node.querySelectorAll?.('b,strong')||[]].map(node=>String(node.textContent||'').replace(/\s+/g,' ').trim()).find(text=>text.length>=3&&text.length<=60);
    const labelled=node.matches('label')?node:(node.labels?.[0]||node.querySelector('label'));
    const labelledBy=(node.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent||'').join(' ');
    const summary=node.matches('summary')?node:node.querySelector('summary');
    const directText=node.matches('button,a[href],[role="button"],[role="link"],[role="tab"],option')?node.textContent:'';
    const fieldText=node.matches('input,select,textarea')?(node.getAttribute('aria-label')||node.getAttribute('placeholder')||labelled?.textContent||node.getAttribute('name')):'';
    return (authoredTargetText(node)||fieldText||node.getAttribute('aria-label')||labelledBy||labelled?.textContent||heading?.textContent||boldTitle||summary?.textContent||directText||node.getAttribute('title')||node.getAttribute('alt')||node.getAttribute('placeholder')||node.getAttribute('name')||(node.matches('p')?node.textContent:'')||'').replace(/\s+/g,' ').trim().slice(0,120);
  };
  const targetSlug=text=>text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,58)||'content';
  const targetKind=node=>node.matches('input,select,textarea')?'field':node.matches('button,[role="button"]')?'button':node.matches('a[href],[role="link"]')?'link':node.matches('form,fieldset')?'form':node.matches('h1,h2,h3,h4,h5,h6,[role="heading"]')?'heading':node.matches('details,summary')?'details':node.matches('img,[alt]')?'media':node.matches('footer,[role="contentinfo"],section,article,[role="region"],[role="tabpanel"]')?'section':'content';
  const targetPriority=node=>(node.hasAttribute('data-nika-target')||node.hasAttribute('data-nika-label')||node.hasAttribute('data-assist-target')&&!node.hasAttribute('data-assist-auto'))?8:['field','button','link','form'].includes(targetKind(node))?7:targetKind(node)==='heading'?6:['details','section'].includes(targetKind(node))?5:targetKind(node)==='media'?4:2;
  const TARGET_STYLE='.assist-guided-target{position:relative!important;scroll-margin-block:120px!important;outline:2px solid var(--assist-guide-border,#312e81)!important;outline-offset:var(--assist-guide-offset,4px)!important;border-radius:var(--assist-guide-radius,16px)!important}.assist-guided-target[data-assist-target]{background:linear-gradient(90deg,var(--assist-guide-fill,rgba(99,102,241,.13)),transparent)!important}.assist-guide-marker{position:absolute!important;z-index:2147483000!important;top:10px!important;right:10px!important;max-width:min(240px,70%)!important;display:inline-flex!important;align-items:center!important;gap:7px!important;padding:6px 10px!important;border:1px solid color-mix(in srgb,var(--assist-guide-marker-text,#fff) 38%,transparent)!important;border-radius:999px!important;color:var(--assist-guide-marker-text,#fff)!important;background:var(--assist-guide-marker-bg,#6366f1)!important;box-shadow:none!important;font:650 11px/1.2 system-ui,sans-serif!important;letter-spacing:.015em!important;pointer-events:none!important}.assist-guide-marker::before{content:""!important;width:6px!important;height:6px!important;flex:0 0 6px!important;border:1px solid currentColor!important;border-radius:50%!important;background:transparent!important;opacity:.82!important}';
  const effectiveTargetBackground=(node,includeSelf=true)=>{
    for(let current=includeSelf?node:node?.parentElement;current&&current.nodeType===1;current=current.parentElement){
      const style=getComputedStyle(current);
      const match=style.backgroundColor.match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
      if(match&&Number(match[4]??1)>.18)return match.slice(1,4).map(Number);
    }
    return [255,255,255];
  };
  const guidanceInlineRestore=new WeakMap();
  const configuredGuideAccent=()=>{
    const scope=uiScope();
    const source=scope instanceof ShadowRoot?scope.host:(scope.querySelector?.('.assist-panel')||document.documentElement);
    const value=source?getComputedStyle(source).getPropertyValue('--signal').trim():'';
    return /^(?:#[\da-f]{3,8}|rgba?\([^)]*\))$/i.test(value)?value:'#6366f1';
  };
  const colourLuminance=value=>{
    const hex=String(value||'').trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    const rgb=hex
      ? (hex[1].length===3?hex[1].split('').map(part=>parseInt(part+part,16)):[0,2,4].map(index=>parseInt(hex[1].slice(index,index+2),16)))
      : (String(value||'').match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)/i)?.slice(1,4).map(Number)||[99,102,241]);
    const linear=channel=>{const normalized=channel/255;return normalized<=.04045?normalized/12.92:((normalized+.055)/1.055)**2.4};
    return .2126*linear(rgb[0])+.7152*linear(rgb[1])+.0722*linear(rgb[2]);
  };
  // WCAG relative contrast, so the accent is kept whenever it is genuinely
  // legible against the surface behind the ring and swapped only when it is not.
  const contrastRatio=(a,b)=>{const hi=Math.max(a,b),lo=Math.min(a,b);return (hi+.05)/(lo+.05)};
  // An outline is painted outside the border box, so an ancestor that clips its
  // overflow cuts off whichever edges sit flush against it — the case that left
  // a card ringed on its left and right only. Drawing the ring inside the box
  // instead is immune to that, and costs nothing anywhere else.
  const clippedByAncestor=node=>{
    for(let current=node?.parentElement,depth=0;current&&depth<6&&current!==document.body;current=current.parentElement,depth++){
      const style=getComputedStyle(current);
      if(style.overflowX!=='visible'||style.overflowY!=='visible')return true;
    }
    return false;
  };
  const guidanceInlineProperties=['outline','outline-offset'];
  const applyAdaptiveGuidance=node=>{
    // The outline is painted outside the element, so contrast it against the
    // surrounding surface rather than a button's own fill. A white ring around
    // a red button disappeared as soon as it crossed onto a white pricing card.
    const [r,g,b]=effectiveTargetBackground(node,false).map(value=>value/255);
    const linear=value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
    const luminance=.2126*linear(r)+.7152*linear(g)+.0722*linear(b);
    const dark=luminance<.42;
    const accent=configuredGuideAccent();
    // The brand colour leads. It only steps aside when it would be hard to see
    // against this particular surface, which a dark accent on a dark card or a
    // pale one on paper genuinely is.
    const border=contrastRatio(colourLuminance(accent),luminance)>=2.4?accent:(dark?'#ffffff':'#312e81');
    const naturalRadius=getComputedStyle(node).borderRadius;
    const radius=parseFloat(naturalRadius)>0?naturalRadius:(node.matches('button,a[href],input,select,textarea')?'10px':'16px');
    if(!guidanceInlineRestore.has(node))guidanceInlineRestore.set(node,guidanceInlineProperties.map(name=>[name,node.style.getPropertyValue(name),node.style.getPropertyPriority(name)]));
    node.style.setProperty('--assist-guide-border',border);
    node.style.setProperty('--assist-guide-radius',radius);
    node.style.setProperty('--assist-guide-fill',dark?'rgba(255,255,255,.10)':'rgba(99,102,241,.13)');
    node.style.setProperty('--assist-guide-marker-bg',accent);
    node.style.setProperty('--assist-guide-marker-text',colourLuminance(accent)>.48?'#111827':'#ffffff');
    // Some WordPress themes declare button outlines as !important. An inline
    // important guide wins that conflict without changing the site's own
    // control style after the highlight is cleared.
    const offset=clippedByAncestor(node)?'-2px':'4px';
    node.style.setProperty('--assist-guide-offset',offset);
    node.style.setProperty('outline',`2px solid ${border}`,'important');
    node.style.setProperty('outline-offset',offset,'important');
  };
  // The rest of the page steps back so the answer reads as the answer. The
  // scrim never takes pointer events, so the page stays fully usable, and the
  // target is lifted above it in place rather than being re-parented.
  // Dimming alone is invisible on a dark site, where a black veil over a
  // near-black page changes almost nothing. A small blur reads on any
  // background, so the page recedes whatever palette it uses.
  // The rest of the page steps back so the answer reads as the answer.
  //
  // The scrim covers the whole viewport and cuts a hole over the target with
  // an even-odd clip path, rather than raising the target above a full-screen
  // overlay. Lifting only works while no ancestor traps the element in a
  // stacking context, and a wrapper with a transform, filter or opacity — the
  // ordinary way a site animates a section in — traps it. Clipping asks
  // nothing of the page's own stacking at all: the target is simply not
  // covered, so it can never be dimmed, blurred, or fight a z-index.
  const SCRIM_PAD=10;
  const SCRIM_STYLE='position:fixed;inset:0;z-index:2147482000;pointer-events:none;background:rgba(9,9,17,.34);-webkit-backdrop-filter:blur(3px) brightness(.66);backdrop-filter:blur(3px) brightness(.66);opacity:0;transition:opacity .24s ease';
  // The guide's own panel and launcher must stay crisp and readable: they are
  // what the visitor is reading the answer in.
  const SCRIM_ABOVE='2147482600';
  // A dimmed page with no way out is a trap, and the auto-release is invisible
  // until it happens. The dismiss is a fixed chip pinned to the cutout rather
  // than a child of the target: appending to the visitor's own button or link
  // would nest interactive elements, and a control target never gets a label
  // pill to put it in. It is the one part of the overlay that takes clicks.
  const DISMISS_STYLE='position:fixed;z-index:2147482550;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:1px solid color-mix(in srgb,var(--assist-guide-marker-text,#fff) 38%,transparent);border-radius:999px;color:var(--assist-guide-marker-text,#fff);background:var(--assist-guide-marker-bg,#6366f1);line-height:0;cursor:pointer;pointer-events:auto;opacity:0;transition:opacity .2s ease';
  let guidanceScrim=null,guidanceScrimFrame=0,guidanceDismiss=null;
  // Additive, because guide surfaces can appear after the scrim is already up:
  // the reply bubble is created when an answer lands, which on a phone happens
  // after the sheet has minimized and while the highlight is still showing.
  const guidanceScrimRaised=new Map();
  const placeGuidanceDismiss=rect=>{
    if(!guidanceDismiss)return;
    // Centred on the cutout's top-right corner, like a badge, so it never sits
    // on the label pill that occupies the inside of that same corner. Clamped
    // so a target running past an edge cannot push it off screen.
    const size=guidanceDismiss.offsetWidth||28;
    const left=Math.min(Math.max(6,rect.right+SCRIM_PAD-size/2),innerWidth-size-6);
    const top=Math.min(Math.max(6,rect.top-SCRIM_PAD-size/2),innerHeight-size-6);
    guidanceDismiss.style.left=`${Math.round(left)}px`;
    guidanceDismiss.style.top=`${Math.round(top)}px`;
  };
  const scrimCutout=node=>{
    const rect=node?.getBoundingClientRect?.();
    if(rect&&rect.width>=1&&rect.height>=1)placeGuidanceDismiss(rect);
    if(!guidanceScrim)return;
    if(!rect||rect.width<1||rect.height<1){guidanceScrim.style.removeProperty('clip-path');guidanceScrim.style.removeProperty('-webkit-clip-path');return}
    const left=Math.max(0,rect.left-SCRIM_PAD),top=Math.max(0,rect.top-SCRIM_PAD);
    const right=Math.min(innerWidth,rect.right+SCRIM_PAD),bottom=Math.min(innerHeight,rect.bottom+SCRIM_PAD);
    const path=`polygon(evenodd, 0px 0px, ${innerWidth}px 0px, ${innerWidth}px ${innerHeight}px, 0px ${innerHeight}px, 0px 0px, ${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px ${top}px)`;
    guidanceScrim.style.setProperty('clip-path',path);
    guidanceScrim.style.setProperty('-webkit-clip-path',path);
  };
  const raiseGuideSurfaces=()=>{
    if(!guidanceScrim)return;
    const scope=uiScope();
    for(const node of scope.querySelectorAll?.('.assist-panel,.assist-launch,.assist-backdrop,.assist-reply-peek')||[]){
      if(guidanceScrimRaised.has(node))continue;
      guidanceScrimRaised.set(node,[node.style.getPropertyValue('z-index'),node.style.getPropertyPriority('z-index')]);
      node.style.setProperty('z-index',SCRIM_ABOVE,'important');
    }
  };
  const restoreGuideSurfaces=()=>{
    guidanceScrimRaised.forEach(([value,priority],node)=>value?node.style.setProperty('z-index',value,priority):node.style.removeProperty('z-index'));
    guidanceScrimRaised.clear();
  };
  const showGuidanceScrim=(node,dismiss)=>{
    // The dismiss exists even where the scrim cannot: the highlight itself is
    // still something the visitor may want gone before it releases on its own.
    if(!guidanceDismiss||!guidanceDismiss.isConnected){
      guidanceDismiss=document.createElement('button');
      guidanceDismiss.type='button';
      guidanceDismiss.className='assist-guide-dismiss';
      guidanceDismiss.setAttribute('aria-label','Dismiss highlight');
      guidanceDismiss.innerHTML='<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true" focusable="false" style="display:block"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      guidanceDismiss.style.cssText=DISMISS_STYLE;
      guidanceDismiss.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();dismiss?.()});
      document.body.appendChild(guidanceDismiss);
      requestAnimationFrame(()=>{if(guidanceDismiss)guidanceDismiss.style.opacity='1'});
    }
    // The chip and the hole are pinned to the same rect, so one loop tracks
    // both through the smooth scroll and any layout the page settles into.
    const track=()=>{scrimCutout(node);guidanceScrimFrame=requestAnimationFrame(track)};
    cancelAnimationFrame(guidanceScrimFrame);
    scrimCutout(node);
    guidanceScrimFrame=requestAnimationFrame(track);
    // A browser without even-odd clip paths would paint the scrim straight
    // over the target, which is worse than no scrim at all.
    if(!CSS?.supports?.('clip-path','polygon(evenodd, 0px 0px, 1px 0px, 1px 1px)'))return;
    if(!guidanceScrim||!guidanceScrim.isConnected){
      guidanceScrim=document.createElement('div');
      guidanceScrim.className='assist-guide-scrim';
      guidanceScrim.setAttribute('aria-hidden','true');
      // Inline as well as in the stylesheet: an embed on a site that never
      // loaded the sheet, or a theme resetting div styles, must still dim.
      guidanceScrim.style.cssText=SCRIM_STYLE;
      document.body.appendChild(guidanceScrim);
    }
    scrimCutout(node);
    raiseGuideSurfaces();
    // One frame before the class lands, so the fade actually plays.
    requestAnimationFrame(()=>{guidanceScrim?.classList.add('is-on');if(guidanceScrim)guidanceScrim.style.opacity='1'});
  };
  const hideGuidanceScrim=()=>{
    cancelAnimationFrame(guidanceScrimFrame);
    guidanceScrimFrame=0;
    restoreGuideSurfaces();
    guidanceScrim?.remove();
    guidanceScrim=null;
    guidanceDismiss?.remove();
    guidanceDismiss=null;
  };
  const clearAdaptiveGuidance=node=>{
    ['--assist-guide-border','--assist-guide-radius','--assist-guide-offset','--assist-guide-fill','--assist-guide-marker-bg','--assist-guide-marker-text'].forEach(name=>node.style?.removeProperty(name));
    const restore=guidanceInlineRestore.get(node);
    if(!restore)return;
    restore.forEach(([name,value,priority])=>value?node.style.setProperty(name,value,priority):node.style.removeProperty(name));
    guidanceInlineRestore.delete(node);
  };
  // Older sites carry their structure in table cells and opaque wrappers, so
  // no tag or class name identifies a card. What survives that is repetition:
  // a plan, row or listing is one of several siblings built the same way. This
  // finds those blocks by shape alone, which works equally on a 1998 table and
  // a modern grid.
  // Older sites carry their structure in table cells and opaque wrappers, so
  // no tag or class name identifies a card. What survives that is repetition:
  // a plan, row or listing is one of several siblings built the same way. This
  // finds those blocks by shape alone, which works equally on a 1998 table
  // layout and a modern grid, and names no site.
  const blockSignature=node=>`${node.tagName}.${[...node.classList].sort().join('.')}`;
  const repeatedBlocks=root=>{
    const blocks=[];
    for(const parent of root.querySelectorAll?.('*')||[]){
      if(parent.children.length<2||parent.children.length>24)continue;
      const children=[...parent.children].filter(child=>{
        if(child.matches('script,style,link,meta,br,hr,input,select,textarea,option,a[href],button'))return false;
        const text=String(child.textContent||'').replace(/\s+/g,' ').trim();
        return text.length>=12&&text.length<=900;
      });
      if(children.length<2)continue;
      // Siblings built the same way are a set; a heading followed by a
      // paragraph is not. Grouping by signature keeps mixed content out.
      const groups=new Map();
      for(const child of children){
        const key=blockSignature(child);
        groups.set(key,[...(groups.get(key)||[]),child]);
      }
      for(const group of groups.values()){
        if(group.length>=2)blocks.push(...group);
      }
    }
    return blocks;
  };
  const collectTargetCandidates=root=>{
    const selector='[data-nika-target],[data-nika-label],[data-assist-target],h1,h2,h3,h4,h5,h6,footer,[role="contentinfo"],article,section,[role="region"],[role="tabpanel"],details,summary,form,fieldset,label,button,a[href],input:not([type="hidden"]),select,textarea,[role="button"],[role="link"],[role="tab"],[aria-label],[aria-labelledby],[title],img[alt],p,td,th,li,dd,blockquote,figure,b,strong,[class$="-card"],[class$="-item"],[class$="-step"],[class$="-row"]';
    const found=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector),...repeatedBlocks(root)];
    for(const node of root.querySelectorAll('*')){
      if(node.shadowRoot){
        if(!node.shadowRoot.querySelector('style[data-assist-target-style]')){const style=document.createElement('style');style.dataset.assistTargetStyle='true';style.textContent=TARGET_STYLE;node.shadowRoot.prepend(style)}
        found.push(...collectTargetCandidates(node.shadowRoot));
      }
    }
    return found;
  };
  const installAutomaticTargets=()=>{
    const main=document.querySelector('main,[role="main"]')||document.body;
    if(!main)return;
    const used=new Set([...document.querySelectorAll('[id]')].map(node=>node.id));
    automaticTargetNodes.forEach((node,id)=>{if(targetReachable(node))used.add(id);else automaticTargetNodes.delete(id)});
    const roots=[main,...document.querySelectorAll('footer,[role="contentinfo"]')].filter((node,index,list)=>list.indexOf(node)===index&&(node===main||!node.closest('main,[role="main"]')));
    const candidates=[...new Set(roots.flatMap(collectTargetCandidates))].sort((a,b)=>targetPriority(b)-targetPriority(a));
    candidates.forEach(node=>{
      if(node.closest('[hidden],[aria-hidden="true"]'))return;
      const label=targetText(node);
      if(!label||label.length<3)return;
      if(!node.dataset.assistTarget){node.dataset.assistTarget=label;node.dataset.assistAuto='true'}
      if(!node.id){
        const base=`assist-${targetSlug(label)}`;
        let id=base,index=2;
        while(used.has(id))id=`${base}-${index++}`;
        node.id=id;
        // Minted here, not authored by the site. A generated id is only ever a
        // suggestion drawn from the same index the model reads, so it must not
        // carry the authority of an anchor the site's own author wrote.
        node.dataset.assistGeneratedId='true';
      }
      used.add(node.id);automaticTargetNodes.set(node.id,node);
    });
  };
  // Where the guide is allowed to send a visitor. An embed is told this by the
  // service, because the buyer's routes are not knowable here; the primary site
  // falls back to its own, which is what shipped before tenants existed.
  const PUBLIC_PATHS=new Set(Array.isArray(EMBED.paths)&&EMBED.paths.length
    ? EMBED.paths
    : ['/','/work','/about','/pricing','/process','/brand','/nika','/contact','/reviews','/bookingkoala','/privacy','/terms']);
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
  const installSectionAnchors=()=>installAutomaticTargets();
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
    const sections=[...automaticTargetNodes.values()]
      .filter(node=>targetReachable(node)&&node.id&&targetText(node))
      .sort((a,b)=>targetPriority(b)-targetPriority(a))
      .slice(0,80)
      .map(node=>({id:node.id,label:targetText(node),kind:targetKind(node)}));
    const activeCandidates=[...document.querySelectorAll('dialog[open],[role="dialog"]:not([hidden]),[aria-modal="true"]:not([hidden]),main [role="tabpanel"]:not([hidden]),main details[open],main section[id],main article[id],main h1[id],main h2[id],main h3[id],main [data-assist-target][id]')]
      .filter(node=>!node.closest('.assist-panel')&&!(node.dataset.assistAuto==='true'&&node.matches('p,.field')));
    const focusNode=document.elementFromPoint(Math.max(1,Math.min(innerWidth-1,innerWidth*.34)),Math.max(1,Math.min(innerHeight-1,innerHeight*.5)))
      ?.closest('main section[id],main article[id],main h1[id],main h2[id],main h3[id],main [data-assist-target]');
    const active=activeCandidates
      .map(node=>{
        const rect=node.getBoundingClientRect();
        const visible=Math.max(0,Math.min(rect.bottom,innerHeight)-Math.max(rect.top,0));
        const focusBand=Math.max(0,Math.min(rect.bottom,innerHeight*.66)-Math.max(rect.top,innerHeight*.34));
        const style=getComputedStyle(node);
        const priority=node.matches('dialog,[role="dialog"],[aria-modal="true"]')?4:node.matches('[role="tabpanel"]')?3:node.matches('details[open]')?2:1;
        return {node,visible:node.hidden||node.getAttribute('aria-hidden')==='true'||style.display==='none'||style.visibility==='hidden'?0:visible,focusBand,focusHit:node===focusNode||node.contains(focusNode),priority,distance:Math.abs((rect.top+rect.bottom)/2-innerHeight*.5)};
      })
      .filter(item=>item.visible>0)
      .sort((a,b)=>b.priority-a.priority||Number(b.focusHit)-Number(a.focusHit)||b.focusBand-a.focusBand||a.distance-b.distance)[0]?.node;
    const activeContext=active?.matches('h1,h2,h3')?(active.closest('section,article')||active.parentElement):active;
    let journey=[];
    try{journey=JSON.parse(sessionStorage.getItem(JOURNEY_STORE)||'[]')}catch{}
    const projectForm=pagePath()==='/contact'?document.querySelector('#project-form'):null;
    const visibleNode=node=>{
      const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
      return !node.hidden&&node.getAttribute('aria-hidden')!=='true'&&style.display!=='none'&&style.visibility!=='hidden'&&rect.bottom>0&&rect.right>0&&rect.top<innerHeight&&rect.left<innerWidth;
    };
    const limitations=[];
    if([...document.querySelectorAll('main iframe')].some(visibleNode))limitations.push('Visible embedded-frame content is not included in the text snapshot.');
    if([...document.querySelectorAll('main canvas')].some(visibleNode))limitations.push('Visible canvas pixels cannot be inspected as page text.');
    if([...document.querySelectorAll('main img')].some(visibleNode))limitations.push('Image pixels are not inspected; only surrounding text and accessible labels are available.');
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
        label:(active.matches('h1,h2,h3')?active:active.querySelector('h1,h2,h3,[role="heading"]'))?.textContent.trim()||active.getAttribute('aria-label')||active.dataset.assistTarget||'',
        kind:active.matches('dialog,[role="dialog"],[aria-modal="true"]')?'dialog':active.matches('[role="tabpanel"]')?'tab':active.matches('details[open]')?'details':'section',
        text:String(activeContext?.innerText||'').replace(/\s+/g,' ').trim().slice(0,1800)
      }:null,
      hash:location.hash.slice(0,101),
      sections,
      limitations,
      journey:Array.isArray(journey)?journey.slice(-4):[],
      formState,
      preparedForm:readPrepared()
    };
  };

  const waitForPanel=()=>new Promise(resolve=>{
    const now=uiScope().querySelector('.assist-panel');if(now)return resolve(now);
    const observer=new MutationObserver(()=>{const panel=uiScope().querySelector('.assist-panel');if(panel){observer.disconnect();resolve(panel)}});
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
    const launch=uiScope().querySelector('.assist-launch');
    const head=panel.querySelector('.assist-head');
    if(!log||!oldForm||!launch||!head)return;

    // The responsive sheet and backdrop are part of the assistant shell. They
    // used to arrive in assistant-polish.js after this module, which created a
    // short window where the panel had desktop behaviour on a phone.
    let backdrop=uiScope().querySelector('.assist-backdrop');
    if(!backdrop){
      backdrop=document.createElement('button');
      backdrop.type='button';
      backdrop.className='assist-backdrop';
      backdrop.setAttribute('aria-label','Close chat');
      uiHome().appendChild(backdrop);
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
    const dictationBar=form.querySelector('.assist-dictation-bar');
    const dictationCanvas=form.querySelector('.assist-dictation-wave');
    const dictationTime=form.querySelector('.assist-dictation-time');
    const dictationCancel=form.querySelector('.assist-dictation-cancel');
    const dictationStop=form.querySelector('.assist-dictation-stop');
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
    // Events crossing the isolated guide are retargeted to its host. Inspect
    // the composed path so a click on a menu option is not mistaken for a
    // click outside and closed before its choice handler runs.
    document.addEventListener('pointerdown',event=>{if(!event.composedPath().some(node=>node?.classList?.contains('assist-composer-menu-wrap')))closeComposerMenus()});
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
          const icon=document.createElement('img');icon.src=assetUrl('/assets/icons/file-description.svg');icon.alt='';icon.setAttribute('aria-hidden','true');visual.append(icon);
        }
        const details=document.createElement('span');details.className='assist-attachment-details';
        const name=document.createElement('strong');name.textContent=item.name;
        const meta=document.createElement('small');meta.textContent=fileLabel(item);details.append(name,meta);
        const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label',`Remove ${item.name}`);remove.dataset.tip='Remove attachment';
        const removeIcon=document.createElement('img');removeIcon.src=assetUrl('/assets/icons/x.svg');removeIcon.alt='';removeIcon.setAttribute('aria-hidden','true');remove.append(removeIcon);
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
    // WordPress intentionally omits attachments until its server can process
    // them. Keep the optional controls optional here too, otherwise the
    // missing button aborts the entire guide before Send is wired up.
    if(addFile&&fileInput){
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
    }

    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    let recognition=null,listening=false,dictationWanted=false,dictationCancelled=false,dictationError='';
    let dictationPrefix='',dictationSuffix='',dictationCommitted='',dictationSessionFinal='',dictationInterim='',dictationSegments=[];
    let dictationStartedAt=0,dictationTimer=0,audioStream=null,audioContext=null,audioAnalyser=null,waveFrame=0,waveHistory=[];
    const joinSpeech=(left,speech,right)=>{
      const value=String(speech||'').trim();
      const before=value&&left&&/\S$/.test(left)&&/^\S/.test(value)?' ':'';
      const after=value&&right&&/\S$/.test(value)&&/^\S/.test(right)?' ':'';
      const room=Math.max(0,LIMIT-left.length-right.length-before.length-after.length);
      return `${left}${before}${value.slice(0,room)}${after}${right}`.slice(0,LIMIT);
    };
    const joinDictationParts=parts=>parts.map(value=>String(value||'').trim()).filter(Boolean).join(' ');
    // Keep provisional recognition out of the editable value. Browsers revise
    // interim phrases aggressively; painting them made words appear and then
    // vanish. Final chunks still arrive continuously, while the waveform shows
    // that the current phrase is being heard.
    const currentDictation=()=>joinDictationParts([dictationCommitted,dictationSessionFinal]);
    const updateDictationSegments=event=>{
      const start=Number.isInteger(event.resultIndex)?event.resultIndex:0;
      for(let index=start;index<event.results.length;index++){
        const result=event.results[index];
        dictationSegments[index]={text:result?.[0]?.transcript||'',final:Boolean(result?.isFinal)};
      }
      // Some engines briefly return a shorter result list while reconnecting.
      // Keep finalized segments, but discard obsolete interim tails.
      if(event.results.length<dictationSegments.length){
        dictationSegments=dictationSegments.filter((segment,index)=>index<event.results.length||segment?.final);
      }
      dictationSessionFinal=joinDictationParts(dictationSegments.filter(segment=>segment?.final).map(segment=>segment.text));
      dictationInterim=joinDictationParts(dictationSegments.filter(segment=>segment&&!segment.final).map(segment=>segment.text));
    };
    const renderDictation=()=>{input.value=joinSpeech(dictationPrefix,currentDictation(),dictationSuffix);grow();meter(false);const caret=Math.min(input.value.length,dictationPrefix.length+currentDictation().length+1);try{input.setSelectionRange(caret,caret)}catch{}};
    const drawWave=()=>{
      if(!dictationCanvas||!dictationWanted)return;
      const dpr=Math.min(2,devicePixelRatio||1),width=Math.max(1,Math.round(dictationCanvas.clientWidth*dpr)),height=Math.max(1,Math.round(dictationCanvas.clientHeight*dpr));
      if(dictationCanvas.width!==width||dictationCanvas.height!==height){dictationCanvas.width=width;dictationCanvas.height=height}
      let level=.035;
      if(audioAnalyser){const data=new Uint8Array(audioAnalyser.fftSize);audioAnalyser.getByteTimeDomainData(data);let sum=0;for(const sample of data){const value=(sample-128)/128;sum+=value*value}level=Math.min(1,Math.sqrt(sum/data.length)*4.8)}
      waveHistory.push(level);if(waveHistory.length>58)waveHistory.shift();
      const context=dictationCanvas.getContext('2d');context.clearRect(0,0,width,height);context.fillStyle=getComputedStyle(form).getPropertyValue('--paper').trim()||'#d8d8d8';context.globalAlpha=.62;
      const gap=width/58,center=height/2,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      for(let index=0;index<58;index++){const sample=waveHistory[index]??.025;const barHeight=reduced?Math.max(2*dpr,Math.min(height*.24,sample*height)):Math.max(2*dpr,Math.min(height*.88,sample*height));const barWidth=sample>.09?Math.max(2*dpr,gap*.42):Math.max(1.5*dpr,gap*.22);context.beginPath();context.roundRect(index*gap+(gap-barWidth)/2,center-barHeight/2,barWidth,barHeight,barWidth/2);context.fill()}
      waveFrame=requestAnimationFrame(drawWave);
    };
    const stopWave=()=>{cancelAnimationFrame(waveFrame);waveFrame=0;audioStream?.getTracks().forEach(track=>track.stop());audioStream=null;audioAnalyser=null;if(audioContext){audioContext.close().catch(()=>{});audioContext=null}};
    const startWave=async()=>{waveHistory=[];drawWave();try{audioStream=await navigator.mediaDevices?.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});if(!dictationWanted)return stopWave();audioContext=new (window.AudioContext||window.webkitAudioContext)();audioAnalyser=audioContext.createAnalyser();audioAnalyser.fftSize=1024;audioAnalyser.smoothingTimeConstant=.55;audioContext.createMediaStreamSource(audioStream).connect(audioAnalyser)}catch{audioAnalyser=null}};
    const finishDictation=()=>{
      listening=false;dictationWanted=false;clearInterval(dictationTimer);dictationTimer=0;stopWave();form.classList.remove('is-dictating');dictationBar.hidden=true;mic.classList.remove('is-listening');mic.setAttribute('aria-label','Start dictation');mic.dataset.tip='Dictate a message';
      if(dictationCancelled)input.value=joinSpeech(dictationPrefix,'',dictationSuffix);else{dictationCommitted=joinDictationParts([dictationCommitted,dictationSessionFinal,dictationInterim]);dictationSessionFinal='';dictationInterim='';dictationSegments=[];renderDictation()}
      grow();meter(false);announceStatus(dictationError|| (dictationCancelled?'Dictation cancelled.':input.value.trim()?'Dictation added.':'Dictation stopped.'),{tone:dictationError?'error':dictationCancelled?'neutral':input.value.trim()?'success':'neutral'});input.focus();
    };
    const stopDictation=cancel=>{if(!dictationWanted&&!listening)return;dictationCancelled=Boolean(cancel);dictationWanted=false;try{cancel?recognition.abort():recognition.stop()}catch{finishDictation()}};
    const beginDictation=()=>{
      const start=Number.isInteger(input.selectionStart)?input.selectionStart:input.value.length,end=Number.isInteger(input.selectionEnd)?input.selectionEnd:start;
      dictationPrefix=input.value.slice(0,start);dictationSuffix=input.value.slice(end);dictationCommitted='';dictationSessionFinal='';dictationInterim='';dictationSegments=[];dictationCancelled=false;dictationError='';dictationWanted=true;dictationStartedAt=Date.now();
      form.classList.add('is-dictating');dictationBar.hidden=false;mic.classList.add('is-listening');mic.setAttribute('aria-label','Stop dictation');mic.dataset.tip='Stop dictation';dictationTime.textContent='0:00';
      dictationTimer=setInterval(()=>{const seconds=Math.floor((Date.now()-dictationStartedAt)/1000);dictationTime.textContent=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`},250);startWave();announceStatus('Listening…',{busy:true,duration:0});
      try{recognition.start()}catch{dictationWanted=false;finishDictation();announceStatus('Dictation is already starting.',{tone:'warning'})}
    };
    if(!SpeechRecognition){mic.disabled=true;mic.dataset.tip='Dictation is not supported in this browser.'}
    else{
      recognition=new SpeechRecognition();recognition.lang=navigator.language||'en-US';recognition.interimResults=true;recognition.continuous=true;
      recognition.onstart=()=>{listening=true};
      recognition.onresult=event=>{updateDictationSegments(event);renderDictation()};
      recognition.onerror=event=>{if(event.error==='aborted')return;if(['not-allowed','service-not-allowed'].includes(event.error)){dictationWanted=false;dictationError='Microphone permission was not granted.'}else if(event.error!=='no-speech')announceStatus('Dictation paused; reconnecting…',{tone:'warning'})};
      recognition.onend=()=>{listening=false;dictationCommitted=joinDictationParts([dictationCommitted,dictationSessionFinal,dictationInterim]);dictationSessionFinal='';dictationInterim='';dictationSegments=[];renderDictation();if(dictationWanted)setTimeout(()=>{if(dictationWanted)try{recognition.start()}catch{dictationWanted=false;finishDictation()}},180);else finishDictation()};
      mic.addEventListener('click',()=>dictationWanted?stopDictation(false):beginDictation());
      dictationStop.addEventListener('click',()=>stopDictation(false));
      dictationCancel.addEventListener('click',()=>stopDictation(true));
      launch.addEventListener('click',()=>{if(!panel.classList.contains('is-open')&&dictationWanted)stopDictation(false)});
      addEventListener('pagehide',()=>{if(dictationWanted)stopDictation(false);else stopWave()},{once:true});
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
      .slice(-MAX_STORED)
      .map(item=>item?.journey?.completed
        ? {...item,content:item.content,journeyRoute:true,journey:undefined}
        : item
      );
    let pending=false,activeController=null,audioCtx=null,peekTimer=0,confirmTimer=0,formGuidanceTimer=0,guidanceTimer=0;
    const GUIDANCE_DURATION=4200;

    const requestHistory=()=>{
      // Trim by size, not by a fixed count, and leave the authoritative bound
      // to the server, which derives it from the configured model's context
      // window. This mirrors the server's transport ceiling so a request is not
      // built only for the far end to discard most of it.
      const budget=items=>{
        const kept=[];
        let chars=0;
        for(let i=items.length-1;i>=0;i--){
          const content=String(items[i].content||'').slice(0,4000);
          if(chars+content.length>200*1024)break;
          chars+=content.length;
          kept.unshift({...items[i],content});
        }
        return kept;
      };
      const recent=history.slice(-MAX_STORED);
      // Every completed journey is historical by the next question, including
      // after a fresh tab or reload where navigationState is "initial". Do not
      // resend its old route claim beside the new live context, or the model may
      // treat “you are on Pricing” as newer than the browser.
      // Three things have to hold at once here, and each of the obvious fixes
      // breaks one of them. Dropping the visitor's message loses details they
      // supplied once and still expect to be known, and the server verifies
      // proposed form values against exactly those messages. Dropping only the
      // reply leaves their question unanswered, so the model proposes the same
      // action again on every later turn. Keeping any of the reply's own
      // wording, the departure included, reads as a location claim: after
      // "I'll take you to the work page" the model answers "where am I" with
      // Work even once the visitor has walked to another page.
      // So keep the turn, keep their message, and replace the reply with a
      // stand-in that carries no destination and defers to the live route.
      return budget(recent.map(item=>item.journeyRoute
        ? {...item,content:'That request was completed earlier.',journeyRoute:false}
        : item
      ));
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
    // A request names what to find and usually what kind of thing it is: "the
    // Business package", "the signup button", "the pricing section". That kind
    // word almost never appears inside the element itself, so scoring it as
    // content only dilutes the real match — "Business package" would score half
    // against a card whose visible words are "Business". It is read as
    // structure instead: the remaining words choose the target, the kind word
    // decides which shape of target should win.
    /* nika:kind-vocabulary:start */
    const TARGET_KIND_WORDS={
      card:['package','packages','plan','plans','tier','tiers','card','cards','bundle','bundles','product','products','option','options','item','items','tile','tiles','panel','panels'],
      section:['section','sections','area','areas','block','blocks','part'],
      button:['button','buttons','cta'],
      link:['link','links'],
      field:['field','fields','input','inputs','textbox'],
      form:['form','forms'],
      heading:['heading','headings','title','titles'],
      media:['image','images','photo','photos','picture','pictures','logo','icon']
    };
    const TARGET_KINDS=new Map(Object.entries(TARGET_KIND_WORDS).flatMap(([kind,words])=>words.map(word=>[word,kind])));
    const TARGET_STOPWORDS=new Set(['the','a','an','and','or','of','for','to','in','on','at','my','our','your','its','it','this','that','these','those','please','show','me','us','with','take']);
    const targetKindHint=label=>{for(const token of targetTokens(label)){const kind=TARGET_KINDS.get(token);if(kind)return kind}return ''};
    // Keep the original label when nothing but structure was named. "Highlight
    // the packages" still deserves its ordinary literal match, because some
    // sites really do title a section "Packages".
    const withoutKindWords=label=>{
      const kept=[...targetTokens(label)].filter(token=>!TARGET_KINDS.has(token)&&!TARGET_STOPWORDS.has(token));
      return kept.length?kept.join(' '):String(label||'');
    };
    /* nika:kind-vocabulary:end */
    // Container shape is judged structurally, never by a customer's class
    // vocabulary: a repeated item element, or anything holding a heading with
    // its own controls or list.
    const structuralContainer=node=>{
      if(!node?.matches)return false;
      if(node.matches('article,li,[role="listitem"],[class$="-card"],[class$="-item"],[class$="-step"],[class$="-row"],[class*=" card "],[class*=" item "]'))return true;
      if(node.matches('input,select,textarea,button,a[href],label,summary,img,p,span,h1,h2,h3,h4,h5,h6,[role="heading"],[role="button"],[role="link"]'))return false;
      const headings=node.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]').length;
      const controls=node.querySelectorAll('button,a[href],input,select,textarea').length;
      return headings>=1&&headings<=3&&(controls>0||node.querySelectorAll('li').length>=2);
    };
    const targetKindAgrees=(node,hint)=>{
      const kind=targetKind(node);
      if(hint==='card')return structuralContainer(node);
      if(hint==='section')return kind==='section'||structuralContainer(node);
      return kind===hint;
    };
    // A heading is never counted as a conflict for container requests: the
    // visual-container rule promotes it to the card it introduces anyway.
    const TARGET_KIND_CONFLICTS={card:['button','link','field','media'],section:['button','link','field','media'],button:['field','section','media'],link:['field','section','media'],field:['section','heading','media'],form:['heading','media'],heading:['field','form','media'],media:['field','form','heading']};
    const targetKindConflicts=(node,hint)=>(TARGET_KIND_CONFLICTS[hint]||[]).includes(targetKind(node));
    // Cards routinely lead with a short eyebrow, kicker or badge above their
    // heading, and that label is what names them ("Business" over "A growing
    // portfolio"). It identifies a container far more reliably than the prose
    // inside it, where the same word may only be mentioned in passing.
    const containerIdentity=node=>{
      if(!node?.children)return '';
      if(node.matches('input,select,textarea,button,a[href],label,summary,img,h1,h2,h3,h4,h5,h6,[role="heading"],[role="button"],[role="link"]'))return '';
      // A cell or positioning div wrapping one real block is the commonest
      // legacy shape, so look through it rather than giving up at the wrapper.
      let host=node,depth=0;
      while(host.children.length===1&&depth++<2)host=host.children[0];
      if(host.children.length<2)return '';
      for(const child of host.children){
        const text=String(child.textContent||'').replace(/\s+/g,' ').trim();
        if(!text)continue;
        return !child.matches('h1,h2,h3,h4,h5,h6,[role="heading"]')&&text.length<=40?text:'';
      }
      return '';
    };
    const targetAliases=node=>{
      const labelledBy=(node.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent||'').join(' ');
      const heading=node.matches('h1,h2,h3,h4,h5,h6,[role="heading"]')?node:node.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]');
      const label=node.matches('label')?node:(node.labels?.[0]||node.querySelector('label'));
      const aliases=[
        node.getAttribute('data-nika-target'),node.getAttribute('data-nika-label'),node.dataset.assistTarget,
        node.getAttribute('aria-label'),labelledBy,label?.textContent,heading?.textContent,containerIdentity(node),
        node.matches('summary')?node.textContent:node.querySelector('summary')?.textContent,
        node.getAttribute('title'),node.getAttribute('alt'),node.getAttribute('placeholder'),node.getAttribute('name'),
        node.id?.replace(/^assist-/,'').replace(/-/g,' ')
      ];
      return [...new Set(aliases.map(value=>String(value||'').replace(/\s+/g,' ').trim().slice(0,180)).filter(value=>value.length>=2))];
    };
    // Whether a node is a composed block is a question about its contents, not
    // its tag: a legacy table cell holds a plan just as an <article> does. Leaf
    // controls and bare text keep no context, so a button can never win on the
    // words that merely surround it.
    const targetContext=node=>{
      if(!node?.children||!node.children.length)return '';
      if(node.matches('input,select,textarea,button,a[href],label,summary,img,p,span,h1,h2,h3,h4,h5,h6,[role="heading"],[role="button"],[role="link"]'))return '';
      return String(node.innerText||'').replace(/\s+/g,' ').trim().slice(0,420);
    };
    const targetMatch=(label,node,request='')=>{
      // The model's label is a summary and often drops the structural noun the
      // visitor actually used ("Business" for "the Business package"). The
      // original wording is kept as a secondary source for that kind alone; it
      // never contributes content tokens, so it cannot pull the match onto an
      // unrelated element.
      const hint=targetKindHint(label)||targetKindHint(request),query=targetKindHint(label)?withoutKindWords(label):label;
      const direct=targetAliases(node).reduce((best,alias)=>Math.max(best,targetScore(query,alias)),0);
      const contextual=targetContext(node)?targetScore(query,targetContext(node))*.84:0;
      const base=Math.max(direct,contextual);
      // Structure only ranks targets that already matched on content, so a
      // named kind can never invent a highlight out of an unrelated element.
      if(!hint||!base)return base;
      return targetKindAgrees(node,hint)?base+.5:targetKindConflicts(node,hint)?base*.55:base;
    };
    const closestTarget=(label,request='')=>[...automaticTargetNodes.values()].filter(node=>targetReachable(node))
      .map(node=>({node,score:targetMatch(label,node,request),priority:targetPriority(node),area:node.getBoundingClientRect().width*node.getBoundingClientRect().height}))
      .sort((a,b)=>b.score-a.score||b.priority-a.priority||a.area-b.area)[0];
    const relativePriceTarget=label=>{
      if(!/\b(?:cheapest|lowest)\b/.test(String(label||'').toLowerCase())||!/\b(?:price|plan|option)\b/.test(String(label||'').toLowerCase()))return null;
      const headings=[...document.querySelectorAll('main h1,main h2,main h3,main h4,main h5,main h6')].filter(node=>targetReachable(node));
      let afterAddOns=false;
      const prices=[];
      headings.forEach((heading,index)=>{
        const text=heading.textContent.replace(/\s+/g,' ').trim();
        if(/^add[ -]?ons?$/i.test(text)){afterAddOns=true;return}
        const amountMatch=text.match(/(?:[$£€₦]|USD\s*)\s*([\d,.]+)/i);
        if(!amountMatch)return;
        let labelNode=null;
        for(let previous=index-1;previous>=0&&index-previous<=4;previous--){
          const candidate=headings[previous].textContent.replace(/\s+/g,' ').trim();
          if(!candidate||/(?:[$£€₦]|USD\s*)\s*[\d,.]+/i.test(candidate)||/^add[ -]?ons?$/i.test(candidate))continue;
          labelNode=headings[previous];break;
        }
        if(!labelNode)return;
        let amount=Number(amountMatch[1].replace(/,/g,''));
        let context='';
        for(let scope=heading.parentElement,depth=0;scope&&depth<6;scope=scope.parentElement,depth++){
          const scopedText=(scope.innerText||'').replace(/\s+/g,' ').trim().slice(0,700);
          if(scopedText.length>text.length)context=scopedText;
          if(/\b(?:month|year|one[ -]?time)\b/i.test(scopedText)&&scopedText.length>text.length)break;
        }
        if(/per\s+location/i.test(context))amount*=2;
        prices.push({node:heading,labelNode,amount,afterAddOns});
      });
      const primary=prices.filter(item=>!item.afterAddOns&&Number.isFinite(item.amount));
      const cheapest=(primary.length?primary:prices).sort((a,b)=>a.amount-b.amount)[0];
      return cheapest?(/\bprice\b/i.test(String(label||''))?cheapest.node:cheapest.labelNode):null;
    };
    const semanticVisualTarget=(target,label)=>{
      if(!target?.matches?.('h1,h2,h3,h4,h5,h6,[role="heading"]'))return target;
      const request=String(label||'').toLowerCase();
      const ownText=targetText(target);
      // Price and title requests are intentionally precise. Named plans and
      // named sections, however, should outline the visual unit the heading
      // introduces instead of squeezing a badge into the heading itself.
      if(/\b(?:price|heading|title)\b/.test(request)||/(?:[$£€₦]|USD\s*)\s*[\d,.]+/i.test(ownText))return target;
      for(let node=target.parentElement,depth=0;node&&depth<7&& !node.matches('main,body,html');node=node.parentElement,depth++){
        if(!targetReachable(node))continue;
        const rect=node.getBoundingClientRect();
        if(rect.width>innerWidth*.96||rect.height>innerHeight*1.6)continue;
        const content=(node.innerText||'').replace(/\s+/g,' ').trim();
        const headings=node.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]').length;
        const controls=node.querySelectorAll('button,a[href],input,select,textarea').length;
        const listItems=node.querySelectorAll('li').length;
        const structuralCard=node.matches('article,[role="listitem"],[class$="-card"],[class$="-item"],[class$="-step"],[class$="-row"],[class*=" card "],[class*=" item "]');
        const isPlan=headings<=3&&controls>0&&/(?:[$£€₦]|USD\s*)\s*[\d,.]+/i.test(content);
        const isSection=headings<=4&&listItems>=2;
        if(isPlan||isSection||(structuralCard&&headings<=4&&content.length>ownText.length))return node;
      }
      return target;
    };
    const targetFor=(url,label,preferExact=false,allowFallback=true,request='')=>{
      installAutomaticTargets();
      if(!url.hash){
        if(preferExact&&label){
          const relative=relativePriceTarget(label);
          if(relative)return relative;
          const ranked=closestTarget(label,request);
          if(ranked?.score>=.6)return ranked.node;
          return null;
        }
        return document.querySelector('main h1,main');
      }
      try{
        const id=decodeURIComponent(url.hash.slice(1));
        const raw=document.getElementById(id)||automaticTargetNodes.get(id);
        // An anchor the site itself authored is a stronger destination contract
        // than a conversational label. Labels can be aliases ("product plans")
        // while the visible heading is branded copy, so never throw away a real
        // authored anchor merely because their words differ.
        if(raw&&!raw.dataset.assistGeneratedId)return raw;
        // A generated anchor has no such authority: the model chose it from the
        // compact index, and it routinely lands on a control that merely
        // repeats the name ("buy Business") instead of the thing named. Keep it
        // unless this page holds a clearly better answer to the same words.
        if(raw&&preferExact&&label){
          const ranked=closestTarget(label,request);
          if(ranked?.node&&ranked.node!==raw&&ranked.score>targetMatch(label,raw,request)+.15)return ranked.node;
        }
        if(raw)return raw;
        if(!allowFallback)return null;
        if(preferExact&&label){
          const ranked=closestTarget(label,request);
          if(ranked?.score>=.6)return ranked.node;
        }
        return null;
      }catch{return null}
    };

    const guidedVisualTargets=new Set();
    // The ring colour is computed from the surface behind the target, so a
    // theme flip while the highlight is up leaves it painted for the old
    // background. Sites signal the change in three ways and none of them is
    // reliably the same one, so all three are watched and the ring is simply
    // recomputed in place — no re-reveal, no scroll, no flicker.
    let guidanceThemeWatch=null,guidanceReleaseWatch=null;
    const repaintGuidance=()=>{guidedVisualTargets.forEach(node=>{if(node.isConnected)applyAdaptiveGuidance(node)})};
    const watchGuidanceTheme=()=>{
      if(guidanceThemeWatch)return;
      const scheme=matchMedia('(prefers-color-scheme: dark)');
      const observer=new MutationObserver(repaintGuidance);
      [document.documentElement,document.body].filter(Boolean).forEach(root=>observer.observe(root,{attributes:true,attributeFilter:['class','style','data-theme','data-color-scheme','data-mode','color-scheme']}));
      scheme.addEventListener?.('change',repaintGuidance);
      guidanceThemeWatch={observer,scheme};
    };
    const unwatchGuidanceTheme=()=>{
      if(!guidanceThemeWatch)return;
      guidanceThemeWatch.observer.disconnect();
      guidanceThemeWatch.scheme.removeEventListener?.('change',repaintGuidance);
      guidanceThemeWatch=null;
    };
    // The highlight releases itself, but a visitor who is finished should not
    // have to wait for it. Escape is the standard exit, and any deliberate
    // press on the page reads as "got it" — the press is never swallowed, so
    // the page behaves exactly as it would have.
    const watchGuidanceRelease=()=>{
      if(guidanceReleaseWatch)return;
      const onKey=event=>{if(event.key==='Escape')clearGuidance()};
      const onPress=()=>clearGuidance();
      addEventListener('keydown',onKey);
      // Armed a frame late so the very click that asked for the highlight
      // cannot immediately dismiss it.
      const arm=requestAnimationFrame(()=>{addEventListener('pointerdown',onPress,{passive:true})});
      guidanceReleaseWatch={onKey,onPress,arm};
    };
    const unwatchGuidanceRelease=()=>{
      if(!guidanceReleaseWatch)return;
      cancelAnimationFrame(guidanceReleaseWatch.arm);
      removeEventListener('keydown',guidanceReleaseWatch.onKey);
      removeEventListener('pointerdown',guidanceReleaseWatch.onPress);
      guidanceReleaseWatch=null;
    };
    const clearGuidance=()=>{
      clearTimeout(guidanceTimer);
      unwatchGuidanceTheme();
      unwatchGuidanceRelease();
      hideGuidanceScrim();
      document.querySelectorAll('.assist-guided-target').forEach(node=>{node.classList.remove('assist-guided-target');clearAdaptiveGuidance(node)});
      document.querySelectorAll('.assist-guide-marker').forEach(marker=>marker.remove());
      guidedVisualTargets.forEach(node=>{node.classList?.remove('assist-guided-target');clearAdaptiveGuidance(node);node.querySelectorAll?.('.assist-guide-marker').forEach(marker=>marker.remove())});
      guidedVisualTargets.clear();
      automaticTargetNodes.forEach(node=>{
        node.classList?.remove('assist-guided-target');clearAdaptiveGuidance(node);
        node.querySelectorAll?.('.assist-guide-marker').forEach(marker=>marker.remove());
      });
    };

    const visualTargetFor=(target,label)=>target?.matches('input,select,textarea,img,option')
      ? (target.closest('label,.field,[role="group"],fieldset')||target.parentElement||target)
      : semanticVisualTarget(target,label);
    const revealResolvedTarget=(target,url,label,preferExact=false)=>{
      if(!target)return {found:false,highlighted:false,label:String(label||'')};
      const visualTarget=visualTargetFor(target,label);
      if(!targetReachable(visualTarget))return {found:false,highlighted:false,label:String(label||'')};
      const pageTop=!url.hash&&!preferExact;
      // The border and title pill are one guide state. Clearing an older
      // target must remove both immediately; previously a second reveal could
      // remove the old border while its independently timed pill lingered.
      clearGuidance();
      applyAdaptiveGuidance(visualTarget);
      visualTarget.classList.add('assist-guided-target');guidedVisualTargets.add(visualTarget);
      showGuidanceScrim(visualTarget,clearGuidance);
      watchGuidanceTheme();
      watchGuidanceRelease();
      if(pageTop)scrollTo({top:0,left:0,behavior:'auto'});
      else visualTarget.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
      // Interactive controls already have a visible or accessible name. A
      // second pill on a compact button duplicates that label and can cover
      // adjacent copy, so controls use the ring alone.
      if(!visualTarget.matches('button,a[href],input,select,textarea,h1,h2,h3,h4,h5,h6,[role="button"],[role="link"],[role="tab"],[role="heading"]')){
        const marker=document.createElement('span');
        marker.className='assist-guide-marker';
        marker.textContent=label||'Here';
        marker.setAttribute('aria-hidden','true');
        visualTarget.appendChild(marker);
      }
      guidanceTimer=setTimeout(clearGuidance,GUIDANCE_DURATION);
      return {found:true,highlighted:true,label:String(label||targetText(target)).slice(0,120),id:String(target.id||'').slice(0,100)};
    };
    // `settled` says the page is already the one the visitor is looking at, so
    // nothing is still on its way. Waiting for a late anchor then costs a
    // second of dead time before a target this page can already resolve — the
    // commonest case, since an authored anchor is the exception, not the rule.
    const waitForTarget=(url,label,preferExact=false,request='',settled=false)=>{
      const ready=allowFallback=>{
        const target=targetFor(url,label,preferExact,allowFallback,request);
        return targetReachable(visualTargetFor(target,label))?target:null;
      };
      const immediate=ready(settled||!url.hash);
      if(immediate)return Promise.resolve(immediate);
      return new Promise(resolve=>{
        let done=false,allowFallback=settled||!url.hash;
        const finish=target=>{if(done)return;done=true;observer.disconnect();clearTimeout(fallbackTimer);clearTimeout(ceiling);resolve(target||null)};
        const attempt=()=>{const target=ready(allowFallback);if(target)finish(target)};
        const observer=new MutationObserver(attempt);
        observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['id','hidden','aria-hidden','aria-label','aria-labelledby','data-nika-target','data-nika-label','data-assist-target']});
        // On arrival, give a destination with a named anchor time to render that
        // exact ID before considering a semantic fallback. This covers hydrated
        // SPAs, builders and asynchronously inserted WordPress blocks. On a
        // page that is already settled there is nothing to wait for.
        const fallbackTimer=setTimeout(()=>{allowFallback=true;attempt()},settled||!url.hash?0:1100);
        const ceiling=setTimeout(()=>finish(ready(true)),settled?450:1900);
      });
    };
    const revealTargetWhenReady=async(url,label,preferExact=false,request='',settled=false)=>revealResolvedTarget(await waitForTarget(url,label,preferExact,request,settled),url,label,preferExact);

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
      // Remember what was actually applied, so it can be restored later even
      // after the page emptied the form and the turn left the history budget.
      writePrepared(Object.fromEntries(appliedFields.map(name=>[name,String(values[name]||'').trim()])));
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
        // On phones the sheet fills the viewport, so a highlight behind it is
        // invisible. The journey path already minimizes for this; a saved
        // action link reaches the same reveal and needs the same courtesy —
        // and only once the browser confirms something was actually painted.
        void revealTargetWhenReady(url,label,Boolean(handoff?.section_requested),handoff?.request||'',true)
          .then(result=>{if(result?.found&&matchMedia('(max-width:640px)').matches&&panel.classList.contains('is-open'))launch.click()});
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

    const completeLinkHandoff=(destination,href,label)=>{
      let url;try{url=new URL(href,location.href)}catch{return null}
      const target=destination&&typeof destination==='object'?destination:{};
      const wantsTarget=target.section_requested===true||Boolean(url.hash);
      return {
        ...target,href:publicPath(url)+url.hash,label,
        section_requested:wantsTarget,
        status:String(target.status||target.departure||(wantsTarget?`Finding ${label}.`:`Opening ${label}.`)).slice(0,240),
        arrival:String(target.arrival||(wantsTarget?`${label} is highlighted.`:`${label} is open.`)).slice(0,240)
      };
    };

    // Guided actions keep a normal destination link in their conclusion. The
    // automation remains the first path, while the real href is a durable
    // fallback that can reopen or re-highlight the same place after reload.
    const appendJourneyFallback=(arrival,journey)=>{
      if(!arrival||!journey?.href||arrival.querySelector('.assist-journey-fallback'))return;
      const destinations=(Array.isArray(journey.steps)&&journey.steps.length?journey.steps:[journey]).slice(0,3);
      const host=arrival.querySelector('p:last-child')||arrival;
      const seen=new Set();
      destinations.forEach(destination=>{
        let url;try{url=new URL(destination.href,location.href)}catch{return}
        if(!isSafeDestination(url))return;
        const href=publicPath(url)+url.hash;
        const label=String(destination.label||'destination').trim();
        const key=`${href}\n${label.toLowerCase()}`;
        if(seen.has(key))return;seen.add(key);
        const alreadyLinked=[...arrival.querySelectorAll('a[href]')].find(link=>{
          try{const linked=new URL(link.getAttribute('href'),location.href);return publicPath(linked)+linked.hash===href&&link.textContent.includes(label)}catch{return false}
        });
        if(alreadyLinked){alreadyLinked.__nikaHandoff=completeLinkHandoff(destination,href,label);return}
        const link=document.createElement('a');
        link.className='assist-action-link assist-journey-fallback';
        link.href=href;
        link.innerHTML=`${actionIcon(href)}<span>${escapeText(`Open ${label}`)}</span>`;
        link.addEventListener('click',event=>{
          if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
          event.preventDefault();
          navigateTo(href,label,completeLinkHandoff(destination,href,label));
        });
        host.append(document.createTextNode(' '),link);
      });
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
          event.preventDefault();navigateTo(href,label,link.__nikaHandoff||(url.hash?completeLinkHandoff({},href,label):null));
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
    // Streaming is requested as prose, but providers can occasionally ignore
    // that instruction. Accept the documented reply envelope as a last-line
    // display safeguard rather than ever exposing raw JSON to a visitor.
    const readAnswerEnvelope=text=>{
      const visible=String(text||'').trim();
      if(!visible)return '';
      try{
        const parsed=JSON.parse(visible);
        if(parsed&&typeof parsed.message==='string'&&parsed.message.trim())return parsed.message.trim();
      }catch{}
      return visible;
    };
    // A streamed tool turn can begin with ordinary prose before its validated
    // navigation marker arrives. Hold likely navigation requests until that
    // marker is known so a provisional sentence never flashes then disappears.
    const isLikelyNavigationRequest=text=>/\b(?:take|go|navigate|open|show|bring|lead|direct|scroll|highlight)\b/i.test(String(text||''));

    const messageContent=element=>element?.querySelector(':scope > .assist-message-content')||element;
    const ICONS={
      copy:'<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="6" width="10" height="10" rx="2"/><path d="M13 6V4H6a2 2 0 0 0-2 2v7h2"/></svg>',
      retry:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.2 6.1A6 6 0 1 0 16 11"/><path d="M15.2 2.8v3.6h-3.6"/></svg>',
      like:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.2 8.2 9.8 3c.4-.8 1.6-.5 1.6.4v3.4h3.1c1.1 0 1.9 1 1.6 2l-1.2 5.3c-.2.7-.8 1.2-1.6 1.2H7.2z"/><path d="M3.8 8.2h3.4v7.1H3.8z"/></svg>',
      dislike:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.2 11.8 2.6 5.2c.4.8 1.6.5 1.6-.4v-3.4h3.1c1.1 0 1.9-1 1.6-2l-1.2-5.3c-.2-.7-.8-1.2-1.6-1.2H7.2z"/><path d="M3.8 4.7h3.4v7.1H3.8z"/></svg>',
      clock:'<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.5"/></svg>'
    };
    const timeLabel=(value,nowValue=Date.now())=>{
      const date=new Date(Number(value));
      if(!Number.isFinite(date.getTime()))return 'Earlier';
      const now=new Date(Number(nowValue));
      const time=date.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
      const sameDay=date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth()&&date.getDate()===now.getDate();
      if(sameDay)return time;
      const day=new Date(date.getFullYear(),date.getMonth(),date.getDate());
      const startOfWeek=new Date(now.getFullYear(),now.getMonth(),now.getDate()-((now.getDay()+6)%7));
      if(day>=startOfWeek&&day<now)return `${date.toLocaleDateString(undefined,{weekday:'long'})} ${time}`;
      const options={month:'short',day:'numeric'};
      if(date.getFullYear()!==now.getFullYear())options.year='numeric';
      return `${date.toLocaleDateString(undefined,options)}, ${time}`;
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
        const response=await fetch(apiUrl(ROUTES.feedback),{method:'POST',headers:apiHeaders({'Content-Type':'application/json'}),body:JSON.stringify({
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
      time.innerHTML=ICONS.clock+`<span>${escapeText(timeLabel(entry.createdAt))}</span>`;
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
      const latest=[...log.querySelectorAll('.assist-msg.bot[data-chat-entry="true"]')].at(-1);
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
          const icon=document.createElement('img');icon.src=item.kind==='image'?assetUrl('/assets/icons/photo.svg'):assetUrl('/assets/icons/file-description.svg');icon.alt='';icon.setAttribute('aria-hidden','true');visual.append(icon);
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
      panel.classList.remove('is-empty');
    }
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
      const response=await fetch(apiUrl(ROUTES.chat),{method:'POST',headers:apiHeaders({'Content-Type':'application/json'}),body:JSON.stringify({
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
        const verifiedFallback=result?.outcome==='completed'
          ? journey.arrival
          : journey.section_requested===true
            ? `I couldn't find or highlight ${journey.label||'that page element'} in the accessible page content.`
            : `I couldn't confirm opening ${journey.label||'that page'}.`;
        await typeBufferedMessage(arrival,verifiedFallback);
        conclusion=verifiedFallback;
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
      const sequence=Array.isArray(journey.steps)
        ? journey.steps.slice(0,3).filter(step=>{
            try{
              const stepUrl=new URL(step?.href,location.href);
              return Boolean(step?.label&&step?.status&&isSafeDestination(stepUrl)&&publicPath(stepUrl)===pagePath());
            }catch{return false}
          })
        : [];
      journeyStep(bubble,sequence.length>1?sequence[0].status:journey.status);
      // One paint so the progress row is visible, then start immediately. The
      // departure has already finished streaming, so anything longer than a
      // frame is delay the visitor feels for nothing.
      afterPaint(async()=>{
        if(publicPath(url)!==pagePath()){
          navigateTo(journey.href,journey.label,journey);
          return;
        }
        if(sequence.length>1){
          let index=0,allFound=true,lastReveal={found:false,highlighted:false};
          const runNext=async()=>{
            const step=sequence[index];
            let stepUrl;try{stepUrl=new URL(step.href,location.href)}catch{return}
            if(index>0)journeyStep(bubble,step.status);
            lastReveal=await revealTargetWhenReady(stepUrl,step.label,step.section_requested===true,journey.request||'',true);
            allFound=allFound&&lastReveal.found===true;
            if(index===0&&matchMedia('(max-width:640px)').matches&&panel.classList.contains('is-open'))launch.click();
            let settled=false,ceiling=0;
            const advance=()=>{
              if(settled)return;settled=true;clearTimeout(ceiling);
              if(index<sequence.length-1){index++;setTimeout(runNext,900);return}
              const result=actionResultFor(journey,{...lastReveal,found:allFound,highlighted:allFound},{updated:false,appliedFields:[]},`Highlighted ${sequence.length} targets in order.`);
              completeJourney(bubble,journey,result);
            };
            whenScrollSettled(advance);
            ceiling=setTimeout(advance,900);
          };
          runNext();
          return;
        }
        let finished=false,ceiling=0;
        let revealResult={found:false,highlighted:false},formResult={updated:false,appliedFields:[]};
        const arrive=()=>{
          if(finished)return;finished=true;
          clearTimeout(ceiling);
          completeJourney(bubble,journey,actionResultFor(journey,revealResult,formResult));
        };
        revealResult=await revealTargetWhenReady(url,journey.label,journey.section_requested===true,journey.request||'',true);
        formResult=prepareProjectForm(journey);
        // On phones the sheet fills the viewport. Minimize it after a verified
        // same-page action as well, otherwise the visitor cannot see the exact
        // section or card Nika just scrolled to and highlighted.
        if(matchMedia('(max-width:640px)').matches&&panel.classList.contains('is-open'))launch.click();
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
        afterPaint(async()=>{
          const keepPageVisible=matchMedia('(max-width:640px)').matches;
          if(!keepPageVisible&&!panel.classList.contains('is-open'))launch.click();
          const url=new URL(handoff.href,location.href);
          const bubble=[...log.querySelectorAll('.assist-msg.bot[data-chat-entry="true"]')].at(-1);
          journeyStep(bubble,handoff.status);
          const revealResult=await revealTargetWhenReady(url,handoff.label,handoff.section_requested===true,handoff.request||'');
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
    clear.innerHTML=trash;
    const budgetIndicator=document.createElement('div');
    budgetIndicator.className='assist-budget-indicator';budgetIndicator.hidden=true;
    const budgetButton=document.createElement('button');
    budgetButton.type='button';budgetButton.className='assist-budget-trigger';
    budgetButton.setAttribute('aria-label','Usage warning');budgetButton.setAttribute('aria-expanded','false');
    const budgetTipId=`assist-budget-${Math.random().toString(36).slice(2,9)}`;
    budgetButton.setAttribute('aria-describedby',budgetTipId);
    budgetButton.innerHTML=`<img src="${assetUrl('/assets/icons/alert-circle.svg')}" alt="" aria-hidden="true">`;
    const budgetTooltip=document.createElement('span');
    budgetTooltip.className='assist-budget-tooltip';budgetTooltip.id=budgetTipId;budgetTooltip.setAttribute('role','tooltip');
    const budgetStatus=document.createElement('span');
    budgetStatus.className='assist-sr-only';budgetStatus.setAttribute('role','status');budgetStatus.setAttribute('aria-live','polite');
    budgetIndicator.append(budgetButton,budgetTooltip,budgetStatus);head.append(budgetIndicator,clear);
    // The control follows what the visitor can actually see. Preview history
    // may remain in storage while its empty state is restored in the panel.
    const syncClearVisibility=()=>{clear.hidden=panel.classList.contains('is-empty')};
    syncClearVisibility();
    const closeBudgetTip=()=>{budgetIndicator.classList.remove('is-open');budgetButton.setAttribute('aria-expanded','false')};
    budgetButton.addEventListener('click',event=>{
      event.stopPropagation();
      const open=!budgetIndicator.classList.contains('is-open');
      budgetIndicator.classList.toggle('is-open',open);budgetButton.setAttribute('aria-expanded',String(open));
    });
    budgetButton.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeBudgetTip()}});
    document.addEventListener('pointerdown',event=>{if(!budgetIndicator.contains(event.target))closeBudgetTip()});
    const resetClear=()=>{clear.classList.remove('is-confirming');clear.innerHTML=trash;clear.setAttribute('aria-label','Delete chat history');clearTimeout(confirmTimer)};
    clear.addEventListener('click',()=>{
      if(!clear.classList.contains('is-confirming')){
        clear.classList.add('is-confirming');clear.textContent='delete chat?';clear.setAttribute('aria-label','Confirm delete chat history');
        confirmTimer=setTimeout(resetClear,4000);return;
      }
      transcript=[];history.length=0;localStorage.removeItem(STORE);try{localStorage.removeItem(PREPARED_STORE)}catch{}
      log.querySelectorAll('[data-chat-entry="true"],.assist-error,.assist-typing').forEach(el=>el.remove());
      chips&&(chips.hidden=false);panel.classList.add('is-empty');
      delete panel.dataset.budgetWarned;budgetIndicator.hidden=true;closeBudgetTip();
      clearUnread();resetClear();syncClearVisibility();
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
      uiScope().querySelector('.assist-reply-peek')?.remove();
      clearTimeout(peekTimer);
    };
    const notifyClosed=answer=>{
      if(panel.classList.contains('is-open'))return;
      if(!launch.querySelector('.assist-unread-dot')){
        const dot=document.createElement('i');dot.className='assist-unread-dot';dot.setAttribute('aria-hidden','true');launch.appendChild(dot);
      }
      uiScope().querySelector('.assist-reply-peek')?.remove();
      const peek=document.createElement('button');peek.type='button';peek.className='assist-reply-peek';
      const clean=String(answer).replace(/[#*_`>\[\]()]/g,' ').replace(/\s+/g,' ').trim();
      peek.innerHTML='<b>New reply from the guide</b><span>'+escapeText(clean.slice(0,92))+'</span><button type="button" aria-label="Dismiss">×</button>';
      const close=peek.lastElementChild;
      close.addEventListener('click',e=>{e.stopPropagation();peek.remove()});
      peek.addEventListener('click',()=>{clearUnread();launch.click()});
      uiHome().appendChild(peek);raiseGuideSurfaces();requestAnimationFrame(()=>peek.classList.add('is-on'));
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
      send.setAttribute('aria-label','Stop response');send.removeAttribute('data-tip');send.querySelector('img').src=assetUrl('/assets/icons/square.svg');log.setAttribute('aria-busy','true');
      const loader=thinking();
      let bubble=null,answer='',frame=0,paintedFrames=0;
      const likelyNavigationRequest=isLikelyNavigationRequest(text);
      const ensureBubble=()=>{
        if(bubble)return bubble;
        loader.remove();
        bubble=add('','bot',true);messageContent(bubble).classList.add('is-streaming');
        return bubble;
      };
      let revealed=0;
      const REVEAL_MIN=2,REVEAL_MAX=17;
      const paint=(complete)=>{
        frame=0;
        if(!answer)return;
        if(likelyNavigationRequest&&!complete)return;
        if(complete)revealed=answer.length;
        else{
          const behind=answer.length-revealed;
          revealed=Math.min(answer.length,revealed+Math.min(REVEAL_MAX,Math.max(REVEAL_MIN,Math.ceil(behind/24))));
        }
        render(messageContent(ensureBubble()),answer.slice(0,revealed));
        paintedFrames+=1;
        scrollLatest();
        if(!complete&&revealed<answer.length&&!frame)frame=requestAnimationFrame(()=>paint(false));
      };
      try{
        const res=await fetch(apiUrl(ROUTES.chat),{method:'POST',signal:activeController.signal,headers:apiHeaders({'Content-Type':'application/json'}),body:JSON.stringify({
          message:text,history:requestHistory(),page:pagePath(),pageContext:currentPageContext(),answerDepth,actionMode,...(EMBED.preview?{preview:EMBED.preview}:{}),
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
          budgetTooltip.textContent=warning;
          budgetButton.setAttribute('aria-label',`Usage warning. ${warning}`);
          budgetStatus.textContent=warning;
          budgetIndicator.hidden=false;
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
          if(answer&&!frame)frame=requestAnimationFrame(()=>paint(false));
        }
        answer+=decoder.decode();if(frame)cancelAnimationFrame(frame);frame=0;
        const navigation=readNavigation(answer,res.headers.get('X-Abatchan-Action-Token'));
        // Carried only so the resolver can read the kind of thing the visitor
        // named. It is never sent anywhere and never becomes visible copy.
        if(navigation.action)navigation.action.request=String(text||'').replace(/\s+/g,' ').trim().slice(0,240);
        const rawAnswer=navigation.text;
        answer=readAnswerEnvelope(rawAnswer);
        if(!answer)throw new Error('The guide returned an empty response.');
        if(navigation.action){
          // A navigation departure is emitted only after the model's complete
          // tool call has been validated, so it cannot genuinely stream over
          // the network. Clear any single-frame paint and reveal it here before
          // the progress card/action begins; the arrival follows the same path.
          const content=messageContent(ensureBubble());
          content.replaceChildren();
          await typeBufferedMessage(content,answer);
        }else if(paintedFrames===0||answer!==rawAnswer){
          // An answer can arrive as a single final chunk, from a short reply or
          // from a host that buffered the response. Nothing has been shown yet,
          // so reveal it locally rather than flashing the whole reply at once.
          const content=messageContent(ensureBubble());
          content.replaceChildren();
          await typeBufferedMessage(content,answer);
        }else paint(true);
        messageContent(bubble)?.classList.remove('is-streaming');
        if(bubble)enhanceActions(messageContent(bubble));
        const userEntry=transcript.find(item=>item.role==='user'&&item.id===userId);
        if(userEntry){userEntry.state='answered';refreshUserTools(userEntry)}
        const assistantEntry={id:uid(),role:'assistant',content:answer,createdAt:Date.now(),replyTo:userId||null};
        const needsApproval=navigation.action&&(actionMode==='ask'||navigation.action.requires_approval===true);
        if(needsApproval)assistantEntry.journey={...navigation.action,pending:true};
        if(bubble)addMessageTools(bubble,assistantEntry);
        history.push({role:'user',content:text},{role:'assistant',content:answer});
        if(history.length>MAX_STORED)history.splice(0,history.length-MAX_STORED);
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
        send.setAttribute('aria-label','Send');send.removeAttribute('data-tip');send.querySelector('img').src=assetUrl('/assets/icons/arrow-up.svg');log.setAttribute('aria-busy','false');
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
      if(chips)chips.hidden=true;panel.classList.remove('is-empty');syncClearVisibility();input.value='';grow();meter(false);reply(clean,entry.id,files);
    };
    form.addEventListener('submit',e=>{e.preventDefault();if(pending){activeController?.abort();return}ask(input.value)});
    chips?.addEventListener('click',e=>{const button=e.target.closest('button');if(button)ask(button.dataset.question||button.querySelector('strong')?.textContent||'')});

  });
})();
