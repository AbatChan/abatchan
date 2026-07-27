// Responsive Work page grid and consistent project card alignment.
(function workGridLayoutFix(){
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/work')return;

  document.body.dataset.workGrid='three';

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
      min-height:0!important;
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
    body[data-work-grid="three"] .work-grid>.work-card .card-meta{
      gap:14px;
      align-items:flex-start;
      min-height:34px;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-meta span{
      min-width:0;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-meta span:last-child{
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
    @media(max-width:1100px){
      body[data-work-grid="three"] .work-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    }
    @media(max-width:700px){
      body[data-work-grid="three"] .work-grid{grid-template-columns:1fr}
      body[data-work-grid="three"] .work-grid>.work-card .card-info{
        grid-template-rows:auto auto auto 48px;
      }
      body[data-work-grid="three"] .work-grid>.work-card .card-meta{
        gap:10px;
        flex-wrap:wrap;
        min-height:0;
      }
      body[data-work-grid="three"] .work-grid>.work-card .card-meta span:last-child{text-align:left}
    }
  `;
  document.head.appendChild(style);

  const normalizeCards=()=>{
    document.querySelectorAll('.work-grid>.work-card').forEach(card=>{
      card.style.removeProperty('grid-column');
      card.style.removeProperty('min-height');
      card.style.removeProperty('height');
    });
  };

  normalizeCards();
  const grid=document.querySelector('.work-grid');
  if(grid)new MutationObserver(normalizeCards).observe(grid,{childList:true,subtree:false});
})();