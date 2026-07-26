const q=(s,c=document)=>c.querySelector(s),qa=(s,c=document)=>[...c.querySelectorAll(s)];

document.title=document.title.replaceAll('—','|');
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),textNodes=[];
while(walker.nextNode())textNodes.push(walker.currentNode);
textNodes.forEach(node=>{if(node.nodeValue.includes('—'))node.nodeValue=node.nodeValue.replaceAll('—',', ')});

const themeKey='abatchanTheme';
// No stored value means the OS decides, and keeps deciding — the toggle only
// pins a theme once the visitor has actually chosen one.
const themeQuery=matchMedia('(prefers-color-scheme: light)');
const systemTheme=()=>themeQuery.matches?'light':'dark';
let currentTheme=localStorage.getItem(themeKey)||systemTheme();
// Official horizontal lockups, used as-is. The symbol is #6366f1 indigo in both
// files; only the wordmark differs, so the mark never changes colour with theme.
//
// Both are rendered once and swapped by CSS on [data-theme]. Rebuilding the <img>
// on every theme change meant a fresh network fetch each flip, and an <img> with
// no width/height attributes reserves no box until it decodes, so the lockup
// popped in at the wrong size. The intrinsic 1416x286 is declared up front so the
// layout box exists before the file arrives.
const LOCKUP='/assets/abatchan-logo-horizontal-indigo-symbol-';
const brandMarkup=()=>['white','black'].map(ink=>
  `<img class="brand-lockup" data-ink="${ink}" width="1416" height="286" decoding="async" fetchpriority="high" src="${LOCKUP}${ink}-text.svg" alt="${ink==='white'?'abatchan':''}"${ink==='black'?' aria-hidden="true"':''}>`
).join('');
const renderBrand=()=>qa('.site-header .brand,.footer-mark').forEach(el=>{
  if(!el.querySelector('.brand-lockup'))el.innerHTML=brandMarkup();
});

document.documentElement.dataset.theme=currentTheme;
renderBrand();

qa('.desktop-nav').forEach(nav=>{
  if(!nav.querySelector('[data-page="/pricing"]')){
    const link=document.createElement('a');
    link.dataset.page='/pricing';link.href='/pricing';link.textContent='pricing';
    nav.insertBefore(link,nav.querySelector('[data-page="/contact"]')||null);
  }
});
// The tab bar used unicode glyphs (⌂ ◫ ◎ ↗), which come from four different
// blocks and so arrive at different weights, sizes and baselines. These are one
// set on a 24 grid at a single stroke weight, so they read as siblings.
const TAB_ICONS={
  '/':'<path d="M3.5 10.4 12 3.2l8.5 7.2V20a1.4 1.4 0 0 1-1.4 1.4H4.9A1.4 1.4 0 0 1 3.5 20Z"/><path d="M9.4 21.4v-6.6h5.2v6.6"/>',
  '/work':'<rect x="2.8" y="7.2" width="18.4" height="13.6" rx="2.4"/><path d="M8.6 7.2V5.4a2.2 2.2 0 0 1 2.2-2.2h2.4a2.2 2.2 0 0 1 2.2 2.2v1.8"/><path d="M2.8 12.4h18.4"/>',
  '/about':'<circle cx="12" cy="8" r="3.9"/><path d="M4.9 20.8a7.4 7.4 0 0 1 14.2 0"/>',
  '/pricing':'<path d="M20.5 13.6 13.6 20.5a2.2 2.2 0 0 1-3.1 0L3.6 13.6a2.2 2.2 0 0 1-.6-1.5V5.2A2.2 2.2 0 0 1 5.2 3h6.9a2.2 2.2 0 0 1 1.5.6l6.9 6.9a2.2 2.2 0 0 1 0 3.1Z"/><path d="M7.6 7.6h.01"/>',
  '/contact':'<path d="M21.4 2.6 10.9 13.1"/><path d="M21.4 2.6 14.7 21.4l-3.8-8.3-8.3-3.8Z"/>'
};
const tabIcon=page=>TAB_ICONS[page]?`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${TAB_ICONS[page]}</svg>`:'';
qa('.mobile-tabs').forEach(nav=>{
  if(!nav.querySelector('[data-page="/pricing"]')){
    const link=document.createElement('a');
    link.dataset.page='/pricing';link.href='/pricing';link.innerHTML='<b></b>pricing';
    nav.insertBefore(link,nav.querySelector('[data-page="/contact"]')||null);
  }
  qa('a[data-page]',nav).forEach(a=>{
    const icon=tabIcon(a.dataset.page);
    if(!icon)return;
    const label=a.textContent.replace(/[^a-z]/gi,'');
    a.innerHTML=`${icon}<span>${label}</span>`;
  });
});

qa('.header-actions').forEach(actions=>{
  if(actions.querySelector('.theme-toggle'))return;
  const button=document.createElement('button');
  button.type='button';button.className='theme-toggle';
  actions.prepend(button);
});

// Brand marks from simple-icons (CC0), inlined so the footer makes no third-party
// requests. Single path each, uniform 24x24 viewBox.
const ICONS={
  github:'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  x:'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
  instagram:'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  tiktok:'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  facebook:'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  whatsapp:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
  behance:'M16.969 16.927a2.561 2.561 0 0 0 1.901.677 2.501 2.501 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.091 5.091 0 0 1-1.9 2.896 5.292 5.292 0 0 1-3.091.88 5.839 5.839 0 0 1-2.284-.433 4.871 4.871 0 0 1-1.723-1.211 5.657 5.657 0 0 1-1.08-1.874 7.057 7.057 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.313 5.313 0 0 1 5.088-3.604 4.87 4.87 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187ZM6.947 4.084a8.065 8.065 0 0 1 1.928.198 4.29 4.29 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.506 3.506 0 0 1-.506 1.961 3.726 3.726 0 0 1-1.503 1.287 3.588 3.588 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.593 4.593 0 0 1-.423 2.032 3.945 3.945 0 0 1-1.163 1.413 5.114 5.114 0 0 1-1.683.807 7.135 7.135 0 0 1-1.928.259H0V4.084h6.947Zm-.235 12.9c.308.004.616-.029.916-.099a2.18 2.18 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.618 2.618 0 0 0-1.696-.505h-3.54v4.279h3.471Zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.336 2.336 0 0 0-1.163.259 2.474 2.474 0 0 0-.738.62 2.359 2.359 0 0 0-.396.792c-.074.239-.12.485-.137.734h4.769a3.239 3.239 0 0 0-.679-1.785l-.002-.001Zm-13.813-.648a2.254 2.254 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.916 1.916 0 0 0-.178-.891 1.298 1.298 0 0 0-.495-.533 1.851 1.851 0 0 0-.711-.274 3.966 3.966 0 0 0-.835-.073H3.241v3.631h3.293v-.014ZM21.62 5.122h-5.976v1.527h5.976V5.122Z',
  dribbble:'M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z',
  upwork:'M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703-.001 1.489-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.22-1.834-2.148-4.036-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.548-1.405-.002-2.543-1.143-2.545-2.548V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z'
};
const SOCIALS=[
  ['github','GitHub','https://github.com/AbatChan'],
  ['x','X','https://x.com/abat_chan'],
  ['instagram','Instagram','https://www.instagram.com/realabatchan/'],
  ['tiktok','TikTok','https://www.tiktok.com/@realabatchan'],
  ['facebook','Facebook','https://www.facebook.com/abat.chan.2025'],
  ['whatsapp','WhatsApp','https://wa.me/abatchan'],
  ['behance','Behance','https://www.behance.net/abatchan'],
  ['dribbble','Dribbble','https://dribbble.com/abatchan'],
  ['upwork','Upwork','https://www.upwork.com/freelancers/abatchan']
];
const socialRail=()=>SOCIALS.map(([slug,label,href])=>
  `<a class="social-chip" href="${href}" target="_blank" rel="noreferrer noopener" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICONS[slug]}"/></svg></a>`
).join('');

qa('footer').forEach(footer=>{
  footer.innerHTML=`<div class="shell compact-footer">
    <a class="footer-mark" href="/" aria-label="abatchan home">${brandMarkup()}</a>
    <div class="social-rail" aria-label="social profiles">${socialRail()}</div>
    <div class="footer-meta"><a href="mailto:abatchan4@gmail.com">abatchan mail</a><span>&copy; 2026</span></div>
  </div>`;
});

// The glass rim. Chrome drops url(#svg-filter) from backdrop-filter, so real
// feDisplacementMap refraction is off the table; instead each strip samples the
// live content behind the bar at its own blur radius and hue offset, which
// colour-splits and smears whatever scrolls underneath at the edges.
const GLASS_EDGES=['t1','t2','b2','b1','l1','r1'];
qa('.site-header,.mobile-tabs').forEach(glass=>{
  if(!glass.querySelector('.glass-edge')){
    const edge=document.createElement('span');
    edge.className='glass-edge';edge.setAttribute('aria-hidden','true');
    edge.innerHTML=GLASS_EDGES.map(c=>`<i class="${c}"></i>`).join('');
    glass.prepend(edge);
  }
  glass.addEventListener('pointermove',e=>{
    const r=glass.getBoundingClientRect();
    glass.style.setProperty('--glass-x',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');
    glass.style.setProperty('--glass-y',((e.clientY-r.top)/r.height*100).toFixed(1)+'%');
  });
  glass.addEventListener('pointerleave',()=>{
    glass.style.removeProperty('--glass-x');glass.style.removeProperty('--glass-y');
  });
});

// The button shows the theme it switches *to*, so the glyph agrees with its label.
const THEME_ICONS={
  light:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M19.07 4.93 17.3 6.7M6.7 17.3l-1.77 1.77"/></svg>',
  dark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 14.2A8.7 8.7 0 0 1 9.8 3.6a8.7 8.7 0 1 0 10.6 10.6Z"/></svg>'
};
const updateThemeUI=()=>{
  document.documentElement.dataset.theme=currentTheme;
  renderBrand();
  qa('.theme-toggle').forEach(button=>{
    const next=currentTheme==='dark'?'light':'dark';
    button.setAttribute('aria-label',`Switch to ${next} mode`);
    button.setAttribute('title',`Switch to ${next} mode`);
    button.innerHTML=THEME_ICONS[next];
  });
};
qa('.theme-toggle').forEach(button=>button.addEventListener('click',()=>{
  currentTheme=currentTheme==='dark'?'light':'dark';
  localStorage.setItem(themeKey,currentTheme);
  updateThemeUI();
}));
themeQuery.addEventListener('change',()=>{
  if(localStorage.getItem(themeKey))return;   // an explicit choice outranks the OS
  currentTheme=systemTheme();
  updateThemeUI();
});
updateThemeUI();

// A single glass lens tracks the active nav item and follows hover/focus, the way
// the selected pill behaves in an iOS tab bar.
qa('.desktop-nav').forEach(nav=>{
  if(nav.querySelector('.nav-lens'))return;
  const lens=document.createElement('span');
  lens.className='nav-lens';lens.setAttribute('aria-hidden','true');
  nav.prepend(lens);
  const place=el=>{
    if(!el){lens.style.opacity='0';return}
    lens.style.width=el.offsetWidth+'px';
    lens.style.transform='translateX('+el.offsetLeft+'px)';
    lens.style.opacity='1';
  };
  const settle=()=>place(nav.querySelector('a.active'));
  nav.addEventListener('pointerover',e=>{const a=e.target.closest('a');if(a&&nav.contains(a))place(a)});
  nav.addEventListener('pointerleave',settle);
  nav.addEventListener('focusin',e=>{const a=e.target.closest('a');if(a)place(a)});
  nav.addEventListener('focusout',settle);
  addEventListener('resize',settle);
  requestAnimationFrame(settle);
});

// <details> cannot transition its own height. Wrap the answer so a 0fr -> 1fr
// grid track can animate it, and hold `open` until the close finishes.
qa('.faq-list details').forEach(d=>{
  const summary=q('summary',d);
  if(!summary||d.querySelector('.faq-body'))return;
  const body=document.createElement('div');body.className='faq-body';
  const inner=document.createElement('div');inner.className='faq-inner';
  while(summary.nextSibling)inner.appendChild(summary.nextSibling);
  body.appendChild(inner);d.appendChild(body);
  if(d.open)d.classList.add('is-open');
  summary.addEventListener('click',e=>{
    e.preventDefault();
    if(d.classList.contains('is-open')){
      d.classList.remove('is-open');
      const shut=ev=>{
        if(ev.target!==body||ev.propertyName!=='grid-template-rows')return;
        body.removeEventListener('transitionend',shut);d.open=false;
      };
      body.addEventListener('transitionend',shut);
      // if the transition is suppressed (reduced motion) it never fires
      if(matchMedia('(prefers-reduced-motion: reduce)').matches)d.open=false;
    }else{
      d.open=true;
      body.offsetHeight;                 // commit the 0fr start state first
      d.classList.add('is-open');
    }
  });
});

const transition=q('.page-transition'),navigationKey='abatNavigationPending';
// A solid indigo sheet sliding up reads as a loading block. Five columns that
// stagger, with the symbol landing in the middle, reads as a transition.
if(transition&&!transition.querySelector('i')){
  transition.innerHTML='<i></i><i></i><i></i><i></i><i></i>'+
    '<img class="pt-mark" src="/assets/abatchan-symbol-white-tight.svg" alt="" width="504" height="309" aria-hidden="true">';
}
if(sessionStorage.getItem(navigationKey)==='1'&&transition){
  transition.classList.add('is-arriving');
  const revealPage=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{transition.classList.add('is-loaded');sessionStorage.removeItem(navigationKey);setTimeout(()=>transition.classList.remove('is-arriving','is-loaded'),600)}));
  if(document.readyState==='complete')revealPage();else window.addEventListener('load',revealPage,{once:true});
}

const intro=q('.intro');
if(intro){
  const video=q('video',intro),skip=q('.skip',intro);
  const close=()=>{intro.classList.add('hidden');sessionStorage.setItem('abatIntro','1');setTimeout(()=>intro.remove(),800)};
  if(sessionStorage.getItem('abatIntro'))close();
  else{video?.play().catch(()=>{});video?.addEventListener('ended',close);skip?.addEventListener('click',close);setTimeout(close,6500)}
}

const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.12});
qa('.reveal').forEach(e=>observer.observe(e));
document.addEventListener('mousemove',e=>{const light=q('.cursor-light');if(light){light.style.left=e.clientX+'px';light.style.top=e.clientY+'px'}});
const stage=q('.system-stage'),core=q('.system-core');
if(stage&&core){stage.addEventListener('mousemove',e=>{const r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;core.style.transform=`rotateY(${x*12}deg) rotateX(${-y*10}deg)`});stage.addEventListener('mouseleave',()=>core.style.transform='')}

const internal=h=>!!h&&h.startsWith('/')&&!h.startsWith('//');
qa('a[href]').forEach(a=>a.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0||a.target==='_blank')return;const href=a.getAttribute('href');if(!internal(href)||href===location.pathname)return;e.preventDefault();sessionStorage.setItem(navigationKey,'1');transition?.classList.add('is-leaving');setTimeout(()=>location.assign(href),480)}));
const path=location.pathname.replace(/\.html$/,'').replace(/\/index$/,'/').replace(/(.)\/$/,'$1')||'/';
qa('[data-page]').forEach(a=>a.classList.toggle('active',a.dataset.page===path));
qa('.filter-btn').forEach(btn=>btn.addEventListener('click',()=>{qa('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.filter;qa('.work-card').forEach(card=>card.style.display=(f==='all'||card.dataset.type===f)?'flex':'none')}));
const form=q('#project-form');
if(form)form.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(form);const subject=encodeURIComponent(`Project enquiry: ${d.get('name')}`);const body=encodeURIComponent(`Name: ${d.get('name')}\nEmail: ${d.get('email')}\nProject type: ${d.get('type')}\n\n${d.get('message')}`);location.href=`mailto:abatchan4@gmail.com?subject=${subject}&body=${body}`});