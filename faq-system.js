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
