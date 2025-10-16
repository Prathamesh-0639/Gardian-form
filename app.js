// Simple localStorage-based auth and data storage
const STORAGE_KEYS = {
  teachers: 'mf_teachers',
  students: 'mf_students', // map by PRN
  form: (prn) => `mf_form_${prn}`,
  session: 'mf_session'
};

function readStore(key, fallback){
  try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : (fallback ?? null); }catch{ return fallback ?? null; }
}
function writeStore(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

// Seed demo teacher if not present
(function seed(){
  const teachers = readStore(STORAGE_KEYS.teachers, {});
  if(!teachers['teacher']){
    teachers['teacher'] = { username: 'teacher', password: '123456', displayName: 'Demo Teacher' };
    writeStore(STORAGE_KEYS.teachers, teachers);
  }
  if(!readStore(STORAGE_KEYS.students)) writeStore(STORAGE_KEYS.students, {});
})();

function setSession(session){ writeStore(STORAGE_KEYS.session, session); }
function getSession(){ return readStore(STORAGE_KEYS.session, {}); }
function clearSession(){ localStorage.removeItem(STORAGE_KEYS.session); }

// Auth helpers
function loginTeacher(username, password){
  const teachers = readStore(STORAGE_KEYS.teachers, {});
  const t = teachers[username];
  if(t && t.password === password){ setSession({ role:'teacher', username }); return true; }
  return false;
}
function loginStudent(prn, password){
  const students = readStore(STORAGE_KEYS.students, {});
  const s = students[prn];
  if(s && s.password === password){ setSession({ role:'student', prn }); return true; }
  return false;
}
function requireRole(role){
  const s = getSession();
  if(s.role !== role){ window.location.href = 'login.html'; }
}

// Student management (teacher)
async function addOrUpdateStudent(prn, name, password){
  const students = readStore(STORAGE_KEYS.students, {});
  students[prn] = { prn, name, password };
  writeStore(STORAGE_KEYS.students, students);
  if(window.fbDb){ await window.fbDb.collection('students').doc(prn).set({ prn, name, password }, { merge:true }); }
}
function listStudents(){ return Object.values(readStore(STORAGE_KEYS.students, {})).sort((a,b)=>a.prn.localeCompare(b.prn)); }
function getStudent(prn){ const students = readStore(STORAGE_KEYS.students, {}); return students[prn] || null; }

// Form data
async function saveFormFor(prn, data){
  writeStore(STORAGE_KEYS.form(prn), data);
  if(window.fbDb){
    // Upload images to Storage if present
    const uploads = [];
    async function uploadDataUrl(path, dataUrl){
      const ref = window.fbStorage.ref().child(path);
      const res = await ref.putString(dataUrl, 'data_url');
      return await res.ref.getDownloadURL();
    }
    const ts = Date.now();
    if(data.__photo && data.__photo.startsWith('data:')){
      uploads.push(uploadDataUrl(`forms/${prn}/photo_${ts}.png`, data.__photo).then(url=>{ data.__photoUrl = url; }));
    }
    if(data.__sign && data.__sign.startsWith('data:')){
      uploads.push(uploadDataUrl(`forms/${prn}/sign_${ts}.png`, data.__sign).then(url=>{ data.__signUrl = url; }));
    }
    try{ await Promise.all(uploads); }catch(e){ console.warn('Image upload failed', e); }
    await window.fbDb.collection('forms').doc(prn).set(data, { merge:true });
  }
}
async function loadFormFor(prn){
  let local = readStore(STORAGE_KEYS.form(prn), null);
  if(window.fbDb){
    try{
      const snap = await window.fbDb.collection('forms').doc(prn).get();
      if(snap.exists){ local = snap.data(); writeStore(STORAGE_KEYS.form(prn), local); }
    }catch(e){ console.warn('Failed to fetch from Firestore', e); }
  }
  return local;
}

// Export to window for simplicity
window.MF = {
  STORAGE_KEYS,
  readStore, writeStore,
  loginTeacher, loginStudent, requireRole, setSession, getSession, clearSession,
  addOrUpdateStudent, listStudents, getStudent,
  saveFormFor, loadFormFor
};



