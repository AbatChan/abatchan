// Responsive Work page grid plus consistent alignment for homepage card rows.
(function workGridLayoutFix(){
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const isWork=path==='/work';
  const isHome=path==='/';
  if(!isWork&&!isHome)return;

  if(isWork)document.body.dataset.workGrid='three';
  if(isHome)document.body.dataset.homeGrid='aligned';

  const style=document.createElement('style');
  style.textContent=`
    body[data-work-grid="three"] .work-grid{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:18px;
      align-items:stretch;
    }
    body[data-work-grid="three"] .work-grid>.work-card,
    body[data-work-grid="three"] .work-grid>.work-card:nth-child(3),
    body[data-work-grid="three"] .work-grid>.work-card.is-featured{
      grid-column:auto!important;
      min-width:0;
      min-height:0!important;
      height:100%;
      display:flex;
      flex-direction:column;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-visual{
      aspect-ratio:16/10;
      min-height:220px!important;
      max-height:none!important;
      flex:0 0 auto;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-info{
      flex:1;
      display:grid;
      grid-template-rows:auto minmax(72px,auto) minmax(112px,1fr) 48px;
      align-content:start;
      padding:24px;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-meta,
    body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card .card-meta{
      gap:14px;
      align-items:flex-start;
      min-height:34px;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-meta span,
    body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card .card-meta span{
      min-width:0;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-meta span:last-child,
    body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card .card-meta span:last-child{
      text-align:right;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-info h3{
      margin:12px 0 10px;
      align-self:start;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-info p{
      margin:0;
      align-self:start;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-info>.btn{
      align-self:end;
      justify-self:start;
      margin:0;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-info:not(:has(>.btn))::after{
      content:"";
      display:block;
      width:1px;
      height:48px;
    }

    body[data-home-grid="aligned"] .home-dynamic-grid{
      align-items:stretch;
    }
    body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card{
      height:100%;
      display:flex;
      flex-direction:column;
    }
    body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(1) .card-visual{
      min-height:420px!important;
      flex:0 0 auto;
    }
    body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(n+2) .card-visual{
      min-height:320px!important;
      flex:0 0 auto;
    }
    body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(n+2) .card-info{
      flex:1;
      display:grid;
      grid-template-rows:auto minmax(72px,auto) minmax(112px,1fr) 48px;
      align-content:start;
      padding:24px;
    }
    body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(n+2) .card-info h3{
      margin:12px 0 10px;
      align-self:start;
    }
    body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(n+2) .card-info p{
      margin:0;
      align-self:start;
    }
    body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(n+2) .card-info>.btn{
      align-self:end;
      justify-self:start;
      margin:0;
    }
    body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(n+2) .card-info:not(:has(>.btn))::after{
      content:"";
      display:block;
      width:1px;
      height:48px;
    }

    @media(max-width:1100px){
      body[data-work-grid="three"] .work-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(1) .card-visual{min-height:360px!important}
      body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(n+2) .card-visual{min-height:280px!important}
    }
    @media(max-width:900px){
      body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(n) .card-visual{min-height:260px!important}
      body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(n+2) .card-info{
        grid-template-rows:auto auto auto 48px;
      }
    }
    @media(max-width:700px){
      body[data-work-grid="three"] .work-grid{grid-template-columns:1fr}
      body[data-work-grid="three"] .work-grid>.work-card .card-visual{min-height:240px!important}
      body[data-work-grid="three"] .work-grid>.work-card .card-info{
        grid-template-rows:auto auto auto 48px;
      }
      body[data-work-grid="three"] .work-grid>.work-card .card-meta,
      body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card .card-meta{
        gap:10px;
        flex-wrap:wrap;
        min-height:0;
      }
      body[data-work-grid="three"] .work-grid>.work-card .card-meta span:last-child,
      body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card .card-meta span:last-child{text-align:left}
      body[data-home-grid="aligned"] .home-dynamic-grid>.home-managed-card:nth-child(n) .card-visual{min-height:220px!important}
    }
  `;
  document.head.appendChild(style);

  const normalizeWorkCards=()=>{
    if(!isWork)return;
    document.querySelectorAll('.work-grid>.work-card').forEach(card=>{
      card.style.removeProperty('grid-column');
      card.style.removeProperty('min-height');
      card.style.removeProperty('height');
    });
  };

  normalizeWorkCards();
  const grid=document.querySelector('.work-grid');
  if(grid&&isWork)new MutationObserver(normalizeWorkCards).observe(grid,{childList:true,subtree:false});
})();