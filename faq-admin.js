// Admin CRUD for the shared faq.items setting.
(function faqAdmin(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const q=(s,c=document)=>c.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let items=[];

  const style=document.createElement('style');
  style.textContent=`
    .faq-admin-list{display:grid;gap:12px}.faq-admin-card{border:1px solid var(--line);border-radius:18px;padding:18px;background:rgba(245,245,243,.025)}
    .faq-admin-top{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.faq-admin-top h3{margin:0;font-size:17px}.faq-admin-actions{display:flex;gap:7px;flex-wrap:wrap}
    .faq-admin-card textarea{min-height:110px}.faq-admin-card .adm-two{margin-top:14px}.faq-admin-card.is-draft{opacity:.62}
  `;
  document.head.appendChild(style);

  const tab=document.createElement('button');
  tab.dataset.view='faqs';
  tab.innerHTML='<svg viewBox="0 0 24 24"><path d="M5 5h14v11H9l-4 3V5Z"/><path d="M9 9h6M9 12h4"/></svg>FAQs';
  q('#tabs')?.append(tab);

  const section=document.createElement('section');
  section.id='view-faqs';section.className='adm-hide';
  section.innerHTML='<div class="adm-head"><h2>FAQs</h2><div class="adm-actions"><button class="btn" id="addFaq" type="button">add FAQ</button><button class="btn primary sm" id="saveFaqs" type="button">save <span class="arrow">↗</span></button></div></div><p class="adm-sub">Add, edit, order, publish, or remove FAQs. Every FAQ uses the same public style and smooth transition automatically.</p><div class="faq-admin-list" id="faqAdminList"></div>';
  q('.adm-main')?.append(section);

  const list=q('#faqAdminList');
  const id=()=>`faq-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

  const render=()=>{
    list.replaceChildren(...items.map((item,index)=>{
      const card=document.createElement('article');
      card.className=`faq-admin-card${item.published===false?' is-draft':''}`;
      card.innerHTML=`<div class="faq-admin-top"><h3>${esc(item.question||'Untitled FAQ')}</h3><div class="faq-admin-actions"><button class="btn sm" data-up type="button" ${index===0?'disabled':''}>↑</button><button class="btn sm" data-down type="button" ${index===items.length-1?'disabled':''}>↓</button><button class="btn sm danger" data-remove type="button">delete</button></div></div><div class="adm-two"><div><label>question</label><input data-question value="${esc(item.question)}"></div><div><label>page</label><select data-page><option value="/pricing" ${item.page==='/pricing'?'selected':''}>pricing</option><option value="/" ${item.page==='/'?'selected':''}>home</option><option value="/contact" ${item.page==='/contact'?'selected':''}>contact</option><option value="/work" ${item.page==='/work'?'selected':''}>work</option></select></div></div><div><label>answer</label><textarea data-answer>${esc(item.answer)}</textarea></div><label class="adm-switch"><input data-published type="checkbox" ${item.published!==false?'checked':''}><span class="adm-switch-track" aria-hidden="true"></span><span>published</span></label>`;
      card.querySelector('[data-question]').addEventListener('input',e=>{item.question=e.target.value;card.querySelector('h3').textContent=e.target.value||'Untitled FAQ'});
      card.querySelector('[data-answer]').addEventListener('input',e=>item.answer=e.target.value);
      card.querySelector('[data-page]').addEventListener('change',e=>item.page=e.target.value);
      card.querySelector('[data-published]').addEventListener('change',e=>{item.published=e.target.checked;render()});
      card.querySelector('[data-up]').addEventListener('click',()=>{[items[index-1],items[index]]=[items[index],items[index-1]];render()});
      card.querySelector('[data-down]').addEventListener('click',()=>{[items[index+1],items[index]]=[items[index],items[index+1]];render()});
      card.querySelector('[data-remove]').addEventListener('click',()=>{if(confirm('Delete this FAQ?')){items.splice(index,1);render()}});
      return card;
    }));
  };

  const load=async()=>{
    try{
      const rows=await sb.select('settings','key=eq.faq.items&select=value');
      items=Array.isArray(rows?.[0]?.value)?rows[0].value.map(x=>({...x})):(window.ABATCHAN_FAQ_DEFAULTS||[]).map(x=>({...x}));
      render();
    }catch(err){list.textContent=`FAQs could not be loaded. ${err.message}`}
  };

  q('#addFaq').addEventListener('click',()=>{items.push({id:id(),page:'/pricing',question:'',answer:'',published:true});render();list.lastElementChild?.scrollIntoView({behavior:'smooth',block:'center'})});
  q('#saveFaqs').addEventListener('click',async e=>{
    const button=e.currentTarget;button.disabled=true;button.textContent='saving…';
    try{
      items=items.map((item,position)=>({...item,id:item.id||id(),position}));
      await sb.upsert('settings',[{key:'faq.items',value:items,is_public:true}]);
      button.textContent='saved ✓';setTimeout(()=>{button.textContent='save ↗';button.disabled=false},1200);
    }catch(err){button.textContent='save failed';button.disabled=false;alert(err.message)}
  });

  tab.addEventListener('click',()=>{if(!items.length)load()});
  const wait=setInterval(()=>{if(!q('#app')?.classList.contains('adm-hide')){clearInterval(wait);load()}},400);
})();