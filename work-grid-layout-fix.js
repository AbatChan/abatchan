// Responsive Work page grid and cleaner project metadata spacing.
(function workGridLayoutFix(){
  const style=document.createElement('style');
  style.textContent=`
    .card-meta{gap:16px;align-items:flex-start}
    .card-meta span{min-width:0}
    .card-meta span:last-child{text-align:right}

    body[data-work-grid="three"] .work-grid{
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:18px;
    }
    body[data-work-grid="three"] .work-grid>.work-card,
    body[data-work-grid="three"] .work-grid>.work-card:nth-child(3){
      grid-column:auto;
      min-width:0;
      min-height:0;
      height:100%;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-visual{
      aspect-ratio:16/10;
      min-height:0;
      max-height:none;
      flex:none;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-info{
      flex:1;
      display:flex;
      flex-direction:column;
    }
    body[data-work-grid="three"] .work-grid>.work-card .card-info p{
      flex:1;
    }
    @media(max-width:1100px){
      body[data-work-grid="three"] .work-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    }
    @media(max-width:700px){
      body[data-work-grid="three"] .work-grid{grid-template-columns:1fr}
      .card-meta{gap:10px;flex-wrap:wrap}
      .card-meta span:last-child{text-align:left}
    }
  `;
  document.head.appendChild(style);

  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path==='/work')document.body.dataset.workGrid='three';
})();