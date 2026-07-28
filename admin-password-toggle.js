// Accessible reveal/hide controls for dashboard password fields.
(function adminPasswordToggle(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;

  const eye='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.7"/></svg>';
  const eyeOff='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 6.2A10.5 10.5 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.6 3.3M6.1 6.1C3.7 7.8 2.5 12 2.5 12s3.5 6 9.5 6c1 0 2-.2 2.9-.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  document.querySelectorAll('input[type="password"]').forEach(input=>{
    if(input.dataset.eyeReady)return;
    input.dataset.eyeReady='1';
    const wrap=document.createElement('div');
    wrap.className='adm-password-wrap';
    input.parentNode.insertBefore(wrap,input);
    wrap.appendChild(input);
    const button=document.createElement('button');
    button.type='button';
    button.className='adm-password-eye';
    button.setAttribute('aria-label','Show password');
    button.setAttribute('aria-pressed','false');
    button.innerHTML=eye;
    button.addEventListener('click',()=>{
      const showing=input.type==='text';
      input.type=showing?'password':'text';
      button.setAttribute('aria-label',showing?'Show password':'Hide password');
      button.setAttribute('aria-pressed',String(!showing));
      button.innerHTML=showing?eye:eyeOff;
      input.focus({preventScroll:true});
    });
    wrap.appendChild(button);
  });
})();