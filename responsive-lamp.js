// Compact theme hint copy by viewport without changing the lamp interaction.
(function responsiveLampHint(){
  const labelFor=()=>{
    const next=document.documentElement.dataset.theme==='light'?'dark':'light';
    if(innerWidth<=640)return 'pull / tap';
    if(innerWidth<=900)return 'pull or tap';
    return `pull or tap for ${next}`;
  };
  const apply=()=>{
    const label=document.querySelector('.lamp-label');
    const bead=document.querySelector('.lamp-bead');
    if(!label||!bead)return false;
    label.textContent=labelFor();
    bead.setAttribute('aria-label',`Pull or tap to switch to ${document.documentElement.dataset.theme==='light'?'dark':'light'} mode`);
    return true;
  };
  const watch=()=>{
    if(!apply()){
      const observer=new MutationObserver(()=>{if(apply())observer.disconnect()});
      observer.observe(document.documentElement,{childList:true,subtree:true});
    }
    new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    addEventListener('resize',apply,{passive:true});
  };
  document.readyState==='loading'?addEventListener('DOMContentLoaded',watch,{once:true}):watch();
})();
