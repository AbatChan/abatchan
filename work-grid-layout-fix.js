// Responsive Work page grid plus consistent alignment for homepage card rows.
(function workGridLayoutFix(){
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const isWork=path==='/work';
  const isHome=path==='/';
  if(!isWork&&!isHome)return;

  if(isWork)document.body.dataset.workGrid='three';
  if(isHome)document.body.dataset.homeGrid='aligned';

  const normalizeWorkCards=()=>{
    if(!isWork)return;
    document.querySelectorAll('.work-grid>.work-card').forEach(card=>{
      card.style.removeProperty('grid-column');
      card.style.removeProperty('min-height');
      card.style.removeProperty('height');
    });
  };

  normalizeWorkCards();
  // /work now renders one grid per category, so watch the container holding
  // them all rather than whichever grid happened to be first.
  const host=document.querySelector('.work-groups')||document.querySelector('.work-grid');
  if(host&&isWork)new MutationObserver(normalizeWorkCards).observe(host,{childList:true,subtree:true});
})();