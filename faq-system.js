// Shared pricing FAQ content, styling, CMS rendering, and accordion motion.
(function faqSystem(){
  'use strict';
  const VERSION=8;
  if((window.__ABATCHAN_FAQ_SYSTEM_VERSION__||0)>=VERSION)return;
  window.__ABATCHAN_FAQ_SYSTEM_VERSION__=VERSION;

  const groupSelector='.faq-list,[data-faq],.faq-group';
  const groupScope=`:is(${groupSelector})`;
  const detailSelector=`${groupScope}>details`;
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const state=new WeakMap();
  let uid=0;
  const page=(String(location.pathname||'/').replace(/\/index(?:\.html)?$/,'/').replace(/\.html$/,'').replace(/\/+$/,'')||'/');

  document.querySelectorAll('style[data-faq-styles]').forEach(node=>node.remove());
  const style=document.createElement('style');
  style.dataset.faqStyles=String(VERSION);
  style.textContent=`
    ${groupScope}{display:grid!important;gap:12px!important;border:0!important}
    ${detailSelector}{position:relative!important;padding:0!important;border:1px solid var(--line)!important;border-radius:22px!important;background:linear-gradient(145deg,rgba(245,245,243,.055),rgba(245,245,243,.018))!important;overflow:hidden!important;transition:border-color .25s var(--ease),background .25s var(--ease),transform .25s var(--ease),box-shadow .25s var(--ease)!important}
    ${detailSelector}:hover{border-color:rgba(99,102,241,.45)!important;transform:translateY(-1px)}
    ${detailSelector}[data-state="open"]{border-color:rgba(99,102,241,.68)!important;background:linear-gradient(145deg,rgba(99,102,241,.11),rgba(245,245,243,.025))!important;box-shadow:0 20px 55px rgba(0,0,0,.18)!important}
    ${detailSelector}>summary{display:grid!important;grid-template-columns:42px minmax(0,1fr) 42px!important;align-items:center!important;gap:14px!important;min-height:82px!important;padding:18px 20px!important;cursor:pointer!important;list-style:none!important;outline:0!important}
    ${detailSelector}>summary::-webkit-details-marker{display:none!important}
    ${detailSelector}>summary::marker,${detailSelector}>summary::before,${detailSelector}>summary::after{content:none!important;display:none!important}
    .faq-index{width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--line);border-radius:13px;color:var(--muted);background:rgba(245,245,243,.025);font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.05em}
    .faq-question{min-width:0;color:var(--paper);font-size:clamp(17px,1.55vw,21px);font-weight:560;line-height:1.3;letter-spacing:-.025em}
    .faq-toggle{position:relative;width:42px;height:42px;justify-self:end;border:1px solid var(--line);border-radius:50%;background:rgba(245,245,243,.025);transition:.28s var(--ease)}
    .faq-toggle::before,.faq-toggle::after{content:"";position:absolute;left:50%;top:50%;width:15px;height:1.5px;border-radius:99px;background:currentColor;transform:translate(-50%,-50%);transition:.28s var(--ease)}
    .faq-toggle::after{transform:translate(-50%,-50%) rotate(90deg)}
    ${detailSelector}[data-state="open"] .faq-index{color:#fff;border-color:var(--signal);background:var(--signal)}
    ${detailSelector}[data-state="open"] .faq-toggle{color:#fff;border-color:var(--signal);background:var(--signal);transform:rotate(180deg)}
    ${detailSelector}[data-state="open"] .faq-toggle::after{opacity:0;transform:translate(-50%,-50%)}
    .faq-answer{overflow:hidden}.faq-answer-inner{max-width:800px;padding:0 76px 25px;color:var(--muted);font-size:15px;line-height:1.75}.faq-answer-inner p{margin:0}
    @media(max-width:700px){${groupScope}{gap:10px!important}${detailSelector}{border-radius:18px!important}${detailSelector}>summary{grid-template-columns:34px minmax(0,1fr) 36px!important;gap:11px!important;min-height:72px!important;padding:15px 14px!important}.faq-index{width:34px;height:34px;border-radius:10px;font-size:10px}.faq-toggle{width:36px;height:36px}.faq-question{font-size:16px}.faq-answer-inner{padding:0 15px 20px 59px;font-size:14px}}
  `;
  document.head.append(style);

  const ensureAnswer=details=>{
    const summary=details.querySelector(':scope>summary');
    let answer=details.querySelector(':scope>.faq-answer');
    if(!answer){answer=document.createElement('div');answer.className='faq-answer';[...details.children].filter(node=>node!==summary).forEach(node=>answer.append(node));details.append(answer)}
    let inner=answer.querySelector(':scope>.faq-answer-inner');
    if(!inner){inner=document.createElement('div');inner.className='faq-answer-inner';while(answer.firstChild)inner.append(answer.firstChild);answer.append(inner)}
    return answer;
  };
  const decorate=details=>{
    const summary=details.querySelector(':scope>summary');if(!summary)return;
    let question=summary.querySelector(':scope>.faq-question');
    if(!question){question=document.createElement('span');question.className='faq-question';while(summary.firstChild)question.append(summary.firstChild)}
    summary.querySelectorAll(':scope>.faq-index,:scope>.faq-toggle').forEach(node=>node.remove());
    const index=document.createElement('span');index.className='faq-index';index.setAttribute('aria-hidden','true');
    const toggle=document.createElement('span');toggle.className='faq-toggle';toggle.setAttribute('aria-hidden','true');
    summary.replaceChildren(index,question,toggle);
    const answer=ensureAnswer(details);const id=details.dataset.faqId||`faq-${++uid}`;answer.id=answer.id||`${id}-answer`;summary.setAttribute('aria-controls',answer.id);
    const open=details.open;state.set(details,{open,animation:null});details.dataset.state=open?'open':'closed';summary.setAttribute('aria-expanded',String(open));
    if(!summary.dataset.faqBound){summary.dataset.faqBound='1';summary.addEventListener('click',event=>{event.preventDefault();setOpen(details,!state.get(details)?.open)})}
  };
  const setOpen=(details,open)=>{
    const summary=details.querySelector(':scope>summary'),answer=details.querySelector(':scope>.faq-answer');if(!summary||!answer)return;
    if(open){const group=details.closest(groupSelector);group?.querySelectorAll(':scope>details').forEach(other=>{if(other!==details&&state.get(other)?.open)setOpen(other,false)})}
    const current=state.get(details)||{open:details.open,animation:null};current.animation?.cancel();current.open=open;state.set(details,current);details.dataset.state=open?'open':'closed';summary.setAttribute('aria-expanded',String(open));
    const start=details.getBoundingClientRect().height;if(open&&!details.open)details.open=true;const end=summary.getBoundingClientRect().height+(open?answer.scrollHeight:0);
    if(reduceMotion.matches){details.open=open;details.style.height='';return}
    details.style.height=`${start}px`;details.style.overflow='hidden';const animation=details.animate([{height:`${start}px`},{height:`${end}px`}],{duration:open?340:260,easing:'cubic-bezier(.2,.75,.2,1)'});current.animation=animation;
    animation.onfinish=()=>{if(state.get(details)?.animation!==animation)return;details.open=open;details.style.height='';details.style.overflow='';current.animation=null};animation.oncancel=()=>{};
  };
  const number=group=>[...group.querySelectorAll(':scope>details')].forEach((details,index)=>{decorate(details);const badge=details.querySelector(':scope>summary>.faq-index');if(badge)badge.textContent=String(index+1).padStart(2,'0')});
  const scan=root=>{root.querySelectorAll?.(groupSelector).forEach(number);if(root.matches?.(groupSelector))number(root)};
  const render=(container,items)=>{container.classList.add('visible');container.replaceChildren(...items.filter(item=>item.published!==false&&(item.page==='/pricing'||!item.page)&&page==='/pricing').map(item=>{const details=document.createElement('details');details.dataset.faqId=item.id||'';const summary=document.createElement('summary');summary.textContent=item.question||'';const p=document.createElement('p');p.textContent=item.answer||'';details.append(summary,p);return details}));number(container)};
  const load=async()=>{const container=document.querySelector('.faq-list,[data-faq-page]');if(!container)return;try{const rows=await sb.select('settings','key=eq.faq.items&is_public=eq.true&select=value');render(container,Array.isArray(rows?.[0]?.value)?rows[0].value:window.ABATCHAN_FAQ_DEFAULTS)}catch{if(page==='/pricing')render(container,window.ABATCHAN_FAQ_DEFAULTS)}};
  const initial=document.querySelector('.faq-list,[data-faq-page]');
  if(initial&&page==='/pricing')render(initial,window.ABATCHAN_FAQ_DEFAULTS);
  else scan(document);
  load();
})();
