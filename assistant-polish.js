// Small visual layer for the preview assistant. Kept separate from the transport
// so layout refinements cannot interfere with streaming or stored conversations.
(function assistantPolish(){

  const setup=()=>{
    const panel=document.querySelector('.assist-panel');
    const launch=document.querySelector('.assist-launch');
    if(!panel||!launch)return false;

    let backdrop=document.querySelector('.assist-backdrop');
    if(!backdrop){
      backdrop=document.createElement('button');
      backdrop.type='button';
      backdrop.className='assist-backdrop';
      backdrop.setAttribute('aria-label','Close chat');
      document.body.appendChild(backdrop);
    }

    const sync=()=>{
      const open=panel.classList.contains('is-open');
      document.body.classList.toggle('assist-sheet-open',open&&matchMedia('(max-width:640px)').matches);
      backdrop.classList.toggle('is-on',open&&matchMedia('(max-width:900px)').matches);
    };

    new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['class']});
    addEventListener('resize',sync,{passive:true});
    backdrop.addEventListener('click',()=>{
      if(panel.classList.contains('is-open'))launch.click();
    });
    sync();
    return true;
  };

  if(!setup()){
    const observer=new MutationObserver(()=>{if(setup())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();