function bindImagePreview(inputId, imgId){
  const input = document.getElementById(inputId);
  const img = document.getElementById(imgId);
  if(!input || !img) return;
  input.addEventListener('change', function(){
    const file = this.files && this.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      img.src = e.target.result;
      img.alt = 'uploaded image';
    };
    reader.readAsDataURL(file);
  });
}

bindImagePreview('photoInput','photoImg');
bindImagePreview('signInput','signImg');

// Populate PRN context for student/teacher viewing
function getQueryParam(name){
  const url = new URL(location.href); return url.searchParams.get(name);
}

function serializeForm(){
  const form = document.getElementById('mentoringForm');
  const data = {};
  Array.from(form.querySelectorAll('input, textarea')).forEach(el=>{
    if(el.type === 'radio'){ if(el.checked) data[el.name] = el.value; }
    else if(el.type === 'file'){ /* handled separately */ }
    else data[el.name||el.id] = el.value;
  });
  const photoImg = document.getElementById('photoImg');
  const signImg = document.getElementById('signImg');
  data.__photo = photoImg && photoImg.src ? photoImg.src : '';
  data.__sign = signImg && signImg.src ? signImg.src : '';
  return data;
}

function hydrateForm(data){
  if(!data) return;
  const form = document.getElementById('mentoringForm');
  Array.from(form.querySelectorAll('input, textarea')).forEach(el=>{
    const key = el.name||el.id; if(!(key in data)) return;
    if(el.type === 'radio'){ el.checked = (el.value === data[key]); }
    else if(el.type === 'file'){ /* skip */ }
    else el.value = data[key] || '';
  });
  if(data.__photo) document.getElementById('photoImg').src = data.__photo;
  if(data.__sign) document.getElementById('signImg').src = data.__sign;
}

async function initContext(){
  const session = window.MF?.getSession() || {};
  const viewPrn = getQueryParam('view');
  const prn = session.role === 'student' ? session.prn : (viewPrn || '');
  const prnHidden = document.getElementById('prnHidden');
  if(prnHidden) prnHidden.value = prn;

  // If teacher viewing a saved form, hydrate and disable editing
  if(prn){
    const saved = await window.MF?.loadFormFor(prn);
    if(saved){ hydrateForm(saved); }
    if(session.role === 'teacher'){ Array.from(document.querySelectorAll('input, textarea')).forEach(el=>{ if(el.type!=='button'&&el.type!=='submit'&&el.type!=='radio') el.readOnly=true; if(el.type==='radio') el.disabled=true; }); }
  } else {
    // no PRN context - if not logged in, go to login
    if(!session.role) location.href='login.html';
  }
}

initContext();

document.getElementById('mentoringForm')?.addEventListener('submit', function(e){
  e.preventDefault();
  const session = window.MF?.getSession() || {};
  const prn = document.getElementById('prnHidden').value || session.prn;
  if(!prn){ alert('No PRN context. Please login as student.'); return; }
  const data = serializeForm();
  window.MF?.saveFormFor(prn, data);
  alert('Form saved.');
});


