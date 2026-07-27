// Responsive theme hint without changing the lamp's pull or tap interaction.
(function responsiveLampHint(){
  const sun='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.6"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>';
  const moon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.4 8.4 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"/></svg>';

  const nextTheme=()=>document.documentElement.dataset.theme==='light'?'dark':'light';
  const contentFor=()=>{
    const next=nextTheme();
    if(innerWidth<=640)return {html:next==='light'?sun:moon,icon:true};
    if(innerWidth<=900)return {text:'pull or tap',icon:false};
    return {text:`pull or tap for ${next}`,icon:false};
  };

  const apply=()=>{
    const label=document.querySelector('.lamp-label');
    const bead=document.querySelector('.lamp-bead');
    if(!label||!bead)return false;
    const content=contentFor();
    label.classList.toggle('is-icon',content.icon);
    if(content.icon)label.innerHTML=content.html;
    else label.textContent=content.text;
    bead.setAttribute('aria-label',`Pull or tap to switch to ${nextTheme()} mode`);
    return true;
  };

  const style=document.createElement('style');
  style.textContent=`
    .lamp-label.is-icon{
      width:22px;height:22px;display:grid;place-items:center;padding:0;border:0;
      border-radius:7px;background:transparent;color:rgba(245,245,243,.94);
      translate:8px 0;opacity:1
    }
    .lamp-label.is-icon svg{
      width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;
      stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 1px 3px rgba(0,0,0,.55))
    }
    html[data-theme="light"] .lamp-label.is-icon{color:rgba(45,45,52,.62)}
    html[data-theme="light"] .lamp-label.is-icon svg{filter:none}
  `;
  document.head.appendChild(style);

  const watch=()=>{
    if(!apply()){
      const observer=new MutationObserver(()=>{if(apply())observer.disconnect()});
      observer.observe(document.documentElement,{childList:true,subtree:true});
    }
    new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    addEventListener('resize',apply,{passive:true});
    window.visualViewport?.addEventListener('resize',apply,{passive:true});
  };
  document.readyState==='loading'?addEventListener('DOMContentLoaded',watch,{once:true}):watch();
})();