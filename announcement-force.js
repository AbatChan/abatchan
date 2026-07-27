// Admin preview route: /?showAnnouncement=<id> renders that saved announcement even if dismissed.
(function forcedAnnouncement(){
  const id=new URLSearchParams(location.search).get('showAnnouncement');
  if(!id||!window.sb?.configured?.())return;
  const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const show=async()=>{
    try{
      const rows=await sb.select('settings','key=eq.news.items&is_public=eq.true&select=value');
      const items=Array.isArray(rows?.[0]?.value)?rows[0].value:[];
      const item=items.find(entry=>entry&&entry.id===id);if(!item)return;
      document.querySelectorAll('.news').forEach(el=>el.remove());
      const href=typeof item.href==='string'&&/^(https:\/\/|\/)/.test(item.href)?item.href:'';
      const el=document.createElement('aside');
      el.className='news'+(item.soon?' soon':'');
      el.setAttribute('role','status');el.setAttribute('aria-label',"What's new");
      el.innerHTML='<button class="news-x" type="button" aria-label="Dismiss"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'+`<span class="news-tag">${esc(item.tag||(item.soon?'coming soon':"what's new"))}</span><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p>`+(href?`<div class="news-foot"><a class="btn primary" href="${esc(href)}">${esc(item.cta||'take a look')} <span class="arrow">↗</span></a></div>`:'');
      document.body.append(el);
      const clean=new URL(location.href);clean.searchParams.delete('showAnnouncement');history.replaceState(null,'',clean.pathname+clean.search+clean.hash);
      const dismiss=()=>{localStorage.setItem('abatNews:'+item.id,'1');el.classList.remove('is-on');setTimeout(()=>el.remove(),420)};
      el.querySelector('.news-x')?.addEventListener('click',dismiss);
      el.querySelector('a')?.addEventListener('click',()=>localStorage.setItem('abatNews:'+item.id,'1'));
      requestAnimationFrame(()=>setTimeout(()=>el.classList.add('is-on'),80));
    }catch{}
  };
  document.readyState==='loading'?addEventListener('DOMContentLoaded',show,{once:true}):show();
})();