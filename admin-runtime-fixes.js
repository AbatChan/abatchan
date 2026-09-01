// Dashboard runtime actions that need current saved server data.
(function adminRuntimeFixes(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];

  const toast=(message,bad=false)=>{
    const el=q('#toast');if(!el)return;
    el.textContent=message;el.classList.toggle('bad',bad);el.classList.add('on');
    clearTimeout(window.__adminRuntimeToast);
    window.__adminRuntimeToast=setTimeout(()=>el.classList.remove('on'),3600);
  };

  function readAnnouncements(){
    return qa('#announcementList .adm-news-item').map((card,index)=>({
      id:q(`#news-${index}-id`,card)?.value.trim()||'',
      tag:q(`#news-${index}-tag`,card)?.value.trim()||"what's new",
      title:q(`#news-${index}-title`,card)?.value.trim()||'',
      body:q(`#news-${index}-body`,card)?.value.trim()||'',
      href:q(`#news-${index}-href`,card)?.value.trim()||'',
      cta:q(`#news-${index}-cta`,card)?.value.trim()||'',
      soon:!!q('.adm-news-top input[type="checkbox"]',card)?.checked
    }));
  }

  function enhanceShowNow(){
    qa('#announcementList .adm-news-item').forEach(card=>{
      if(card.dataset.showNowReady)return;
      card.dataset.showNowReady='1';
      const top=q('.adm-news-top',card);if(!top)return;
      const button=document.createElement('button');
      button.type='button';button.className='btn sm adm-show-now';button.textContent='show now';
      button.title='Save and open this announcement on the live site';
      const remove=q('.adm-icon.danger',top);
      top.insertBefore(button,remove||null);
      button.addEventListener('click',async()=>{
        const index=Number(card.dataset.index);
        const items=readAnnouncements();
        const item=items[index];
        if(!item?.id||!item.title||!item.body){toast('Add a title and body first.',true);return}
        if(item.href&&!/^(https:\/\/|\/)/.test(item.href)){toast('The button link must start with https:// or /.',true);return}
        button.disabled=true;button.textContent='opening…';
        try{
          await sb.upsert('settings',[{key:'news.items',value:items,is_public:true}]);
          localStorage.removeItem('abatNews:'+item.id);
          const url=new URL('/',location.origin);
          url.searchParams.set('showAnnouncement',item.id);
          window.open(url.toString(),'_blank','noopener');
          toast('Announcement saved and opened.');
        }catch(err){toast(`Could not show it. ${err.message}`,true)}
        finally{button.disabled=false;button.textContent='show now'}
      });
    });
  }

  function enhanceAssistantTest(){
    const button=q('#testAssistant');
    if(!button||button.dataset.streamTest)return;
    button.dataset.streamTest='1';
    button.addEventListener('click',async event=>{
      event.preventDefault();event.stopImmediatePropagation();
      const input=q('#a-test'),output=q('#a-test-output');
      const message=input?.value.trim();if(!message){input?.focus();return}
      button.disabled=true;button.textContent='sending…';output.textContent='Waiting for the saved live assistant…';
      try{
        const res=await fetch('/api/chat-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,page:'/'})});
        if(!res.ok){let issue={};try{issue=await res.json()}catch{};throw new Error(issue?.error?.message||'The assistant could not reply.')}
        const text=(await res.text()).trim();output.textContent=text||'No reply returned.';
      }catch(err){output.textContent=err.message}
      finally{button.disabled=false;button.textContent='send'}
    },true);
  }

  const start=()=>{
    enhanceShowNow();enhanceAssistantTest();
    const list=q('#announcementList');
    if(list)new MutationObserver(enhanceShowNow).observe(list,{childList:true});
  };
  document.readyState==='loading'?addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
