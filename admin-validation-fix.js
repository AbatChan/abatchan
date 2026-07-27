// Clears browser custom-validity messages as soon as the related work field changes.
(function adminValidationFix(){
  if(!/\/admin(?:\.html)?$/.test(location.pathname))return;
  const ids=['f-title','f-slug','f-link','f-alt'];
  const clear=()=>ids.forEach(id=>document.getElementById(id)?.setCustomValidity(''));

  document.addEventListener('input',event=>{
    if(ids.includes(event.target?.id))event.target.setCustomValidity('');
  },true);

  document.addEventListener('click',event=>{
    if(event.target.closest('#saveItem,#admSmartSaveButton'))clear();
  },true);

  document.addEventListener('change',event=>{
    if(ids.includes(event.target?.id))event.target.setCustomValidity('');
  },true);
})();