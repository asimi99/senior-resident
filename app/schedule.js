/* ---------- study plan builder (website only) ---------- */
/* Topic orders are estimates of how often each area shows up, from the published exam content outlines. */
var SP_EXAMS = {
  'NBME shelf': {
    'Pediatrics': ['Infectious diseases','Gastrointestinal and nutrition','Cardiovascular','Pulmonary and critical care','Growth, development and vaccines','Nervous system','Hematology and oncology','Newborn','Renal and urinary','Endocrine and metabolism','Rheumatology and orthopedics','Genetics','Dermatology','ENT, allergy and immunology','Poisoning and environmental exposure','Psychiatry and behaviour','Ethics and social sciences','Reproductive','Ophthalmology'],
    'Obstetrics and Gynecology': ['Pregnancy complications','Labour and delivery','Normal pregnancy and prenatal care','Gynecology and pelvic pain','Reproductive endocrinology and infertility','Gynecologic oncology','Breast','Contraception','Sexually transmitted infections','Postpartum','Ethics and social sciences'],
    'Internal Medicine': ['Cardiovascular','Pulmonary and critical care','Gastrointestinal','Renal and urinary','Hematology and oncology','Infectious diseases','Endocrine','Rheumatology','Nervous system','Dermatology','Ethics and biostatistics'],
    'Surgery': ['Gastrointestinal and hepatobiliary','Trauma and critical care','Vascular','Breast and endocrine','Cardiothoracic','Urology','Orthopedics','Perioperative care','Neurosurgery','ENT','Ethics and social sciences'],
    'Psychiatry': ['Mood disorders','Psychotic disorders','Anxiety and trauma disorders','Substance use','Neurocognitive disorders','Psychopharmacology','Child and adolescent','Personality disorders','Eating and sleep disorders','Ethics and social sciences'],
    'Family Medicine': ['Preventive care and screening','Cardiovascular','Endocrine and diabetes','Musculoskeletal','Respiratory','Mental health','Women’s health','Well child care','Geriatrics','Biostatistics and ethics'],
    'Neurology': ['Stroke and vascular','Seizures','Headache','Neuromuscular','Movement disorders','Demyelinating disease','Neuro-oncology','Neurocognitive disorders','Spinal cord','Pediatric neurology'],
    'Emergency Medicine': ['Cardiovascular emergencies','Trauma','Respiratory emergencies','Toxicology','Neurologic emergencies','Abdominal emergencies','Infectious emergencies','Pediatric emergencies','Environmental emergencies','Obstetric emergencies']
  },
  'USMLE Step 1': { 'All subjects': ['Cardiovascular','Renal','Respiratory','Gastrointestinal','Pharmacology','Microbiology','Hematology and oncology','Nervous system','Endocrine','Reproductive','Musculoskeletal and skin','Biochemistry and genetics','Immunology','Psychiatry','Biostatistics and ethics'] },
  'USMLE Step 2 CK': { 'All subjects': ['Cardiovascular','Pulmonary','Gastrointestinal','Obstetrics and gynecology','Pediatrics','Psychiatry','Renal','Hematology and oncology','Infectious diseases','Nervous system','Endocrine','Surgery','Musculoskeletal','Biostatistics and ethics'] },
  'COMLEX Level 1': { 'All subjects': [] }, 'COMLEX Level 2': { 'All subjects': [] }, 'MCCQE Part I': { 'All subjects': [] }
};
var SP = lsGet('sr_plan_v1', null), spDraft = lsGet('sr_plan_draft', null);
function spSave(){ lsSet('sr_plan_v1', SP); }
function spIso(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function spDate(s){ var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function spNice(s){ return spDate(s).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }); }
function r5(n){ return Math.max(5, Math.round(n / 5) * 5); }

/* build the day-by-day plan. Qbank first, practice exams after it (one a day, never two), the last days review only. */
function spBuild(o){
  var start = spDate(o.start), exam = spDate(o.exam), days = [];
  for (var d = new Date(start); d < exam; d.setDate(d.getDate() + 1)) days.push({ date:spIso(d), study:o.week[d.getDay()] });
  var study = days.filter(function(x){ return x.study; });
  var review = Math.min(o.review, Math.max(0, study.length - 1)), forms = Math.min(o.forms, Math.max(0, study.length - review - 1));
  var qDays = study.length - review - forms, warn = '';
  if (qDays < 1){ qDays = 0; warn = 'There are not enough study days for this. Move the exam date, add study days, or use fewer practice exams.'; }
  var per = qDays ? Math.ceil(o.questions / 5 / qDays) * 5 : 0;
  if (per > 120) warn = 'That is about ' + per + ' questions a day. Consider more study days or fewer questions.';
  /* topics in yield order, each given a share of the questions */
  var topics = (o.topics || []).filter(Boolean), queue = [];
  if (topics.length){
    var w = topics.map(function(_, i){ return topics.length - i * 0.6 > 1 ? topics.length - i * 0.6 : 1; }), tot = w.reduce(function(a, b){ return a + b; }, 0), left = o.questions;
    topics.forEach(function(t, i){ var n = i === topics.length - 1 ? left : Math.min(left, r5(o.questions * w[i] / tot)); if (n > 0){ queue.push({ t:t, n:n }); left -= n; } });
  }
  /* even split in fives: some days get 5 more than others, never a pile-up on the last day */
  var units = Math.round(o.questions / 5), baseU = qDays ? Math.floor(units / qDays) : 0, extraU = qDays ? units - baseU * qDays : 0;
  var remaining = o.questions, fi = 0;
  study.forEach(function(x, i){
    if (i < qDays){
      var n = Math.min(remaining, (baseU + (i < extraU ? 1 : 0)) * 5); remaining -= n; x.kind = 'q'; x.n = n;
      var parts = [], need = n;
      while (need > 0 && queue.length){ var q = queue[0], take = Math.min(q.n, need); parts.push(take + ' ' + q.t); q.n -= take; need -= take; if (!q.n) queue.shift(); }
      x.what = parts.length ? parts.join(', ') : n + ' questions';
      if (!n){ x.kind = 'rest'; x.what = 'Catch up or rest'; }
    } else if (i < qDays + forms){ fi++; x.kind = 'form'; x.what = 'Practice exam ' + fi + ', then review every question'; }
    else { x.kind = 'review'; x.what = 'Review only: misses, flagged topics, light questions'; }
  });
  days.forEach(function(x){ if (!x.study){ x.kind = 'off'; x.what = 'Day off'; } });
  return { o:o, days:days, warn:warn, per:per, built:spIso(new Date()), log:{} };
}

function spFormHTML(){
  var o = (spDraft && typeof spDraft === 'object') ? spDraft : (SP && SP.o) || { exam:'', ex:'NBME shelf', subject:'Pediatrics', bank:'UWorld', questions:400, done:0, forms:4, review:3, start:spIso(new Date()), week:[true,true,true,true,true,true,true] };
  var exams = Object.keys(SP_EXAMS), subj = SP_EXAMS[o.ex] ? Object.keys(SP_EXAMS[o.ex]) : [];
  var dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var h = '<section class="panel sp"><h2>Build your study plan</h2><p class="muted">Tell it what you are writing and when. It spreads your question bank over the days you have, puts practice exams after it, keeps the last days for review, and orders topics by how often they come up.</p><form id="spform" class="spf">';
  h += '<label>Which exam are you writing?<select id="spEx">' + exams.map(function(e){ return '<option' + (o.ex === e ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('') + '<option value="other"' + (exams.indexOf(o.ex) < 0 ? ' selected' : '') + '>Other</option></select></label>';
  h += '<label id="spExOtherL"' + (exams.indexOf(o.ex) < 0 ? '' : ' hidden') + '>Name of the exam<input id="spExOther" class="inp" value="' + esc(exams.indexOf(o.ex) < 0 ? o.ex : '') + '" placeholder="For example, the Royal College exam"></label>';
  h += '<label>Which subject?<select id="spSub">' + subj.map(function(s){ return '<option' + (o.subject === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '<option value="other"' + (subj.indexOf(o.subject) < 0 ? ' selected' : '') + '>Other</option></select></label>';
  h += '<label id="spSubOtherL"' + (subj.indexOf(o.subject) < 0 ? '' : ' hidden') + '>Subject in your own words<input id="spSubOther" class="inp" value="' + esc(subj.indexOf(o.subject) < 0 ? o.subject : '') + '" placeholder="For example, Ophthalmology"></label>';
  h += '<div class="sp2"><label>Question bank<input id="spBank" class="inp" value="' + esc(o.bank || '') + '" placeholder="UWorld, AMBOSS, TrueLearn"></label>'
    + '<label>Questions left to do<input id="spQ" class="inp" type="number" min="0" step="5" value="' + (o.questions || 0) + '"></label></div>';
  h += '<div class="sp2"><label>Start date<input id="spStart" class="inp" type="date" value="' + esc(o.start) + '"></label><label>Exam date<input id="spExam" class="inp" type="date" value="' + esc(o.exam || '') + '" required></label></div>';
  h += '<div class="sp2"><label>Practice exams you have (NBME forms or similar)<input id="spF" class="inp" type="number" min="0" max="20" value="' + (o.forms || 0) + '"></label><label>Review-only days at the end<input id="spR" class="inp" type="number" min="0" max="10" value="' + (o.review == null ? 3 : o.review) + '"></label></div>';
  h += '<div class="splab">Days you can study</div><div class="spweek">' + dn.map(function(d, i){ return '<label class="spday"><input type="checkbox" data-wd="' + i + '"' + (o.week[i] ? ' checked' : '') + '><span>' + d + '</span></label>'; }).join('') + '</div>';
  h += '<label>Topics in the order you want them<textarea id="spTopics" rows="4" placeholder="One per line. Leave the suggested order or edit it.">' + esc(((o.topics && o.topics.length) ? o.topics : ((SP_EXAMS[o.ex] || {})[o.subject] || [])).join('\n')) + '</textarea></label>';
  h += '<p class="er" id="sperr"></p><div class="row"><button class="btn" type="submit">' + (SP ? 'Rebuild my plan' : 'Build my plan') + '</button>' + (SP ? '<button type="button" class="btn ghost" data-sp="cancel">Cancel</button>' : '') + '</div></form></section>';
  return h;
}
function spRead(){
  function v(id){ var e = document.getElementById(id); return e ? e.value : ''; }
  var ex = v('spEx') === 'other' ? v('spExOther').trim() : v('spEx'), sub = v('spSub') === 'other' ? v('spSubOther').trim() : v('spSub');
  var week = [0,1,2,3,4,5,6].map(function(i){ var c = document.querySelector('[data-wd="' + i + '"]'); return !!(c && c.checked); });
  return { ex:ex || 'Other', subject:sub || '', bank:v('spBank').trim(), questions:Math.max(0, Math.round((+v('spQ') || 0) / 5) * 5), start:v('spStart') || spIso(new Date()), exam:v('spExam'), forms:Math.max(0, +v('spF') || 0), review:Math.max(0, +v('spR') || 0), week:week, topics:v('spTopics').split('\n').map(function(t){ return t.trim(); }).filter(Boolean) };
}
function spDone(){ var n = 0; if (!SP) return 0; SP.days.forEach(function(x){ var s = SP.log[x.date]; if (x.kind === 'q' && s) n += s === 'done' ? x.n : s === 'half' ? Math.round(x.n / 2) : 0; }); return n; }
function spPlanHTML(){
  var today = spIso(new Date()), o = SP.o, total = SP.days.filter(function(x){ return x.kind === 'q'; }).reduce(function(a, x){ return a + x.n; }, 0);
  var due = SP.days.filter(function(x){ return x.kind === 'q' && x.date < today; }).reduce(function(a, x){ return a + x.n; }, 0), done = spDone(), behind = due - done;
  var left = Math.max(0, Math.round((spDate(o.exam) - spDate(today)) / 86400000)), streak = 0;
  for (var i = SP.days.length - 1; i >= 0; i--){ var x = SP.days[i]; if (x.date >= today || !x.study) continue; if (SP.log[x.date] === 'done') streak++; else break; }
  var t = SP.days.find(function(x){ return x.date === today; });
  var h = '<section class="panel sp"><div class="sphd"><div><h2>' + esc(o.subject ? o.subject + ', ' : '') + esc(o.ex) + '</h2><p class="muted sm">' + left + ' day' + (left === 1 ? '' : 's') + ' to go. Exam on ' + esc(spNice(o.exam)) + (o.bank ? '. ' + esc(o.bank) : '') + '.</p></div><button type="button" class="btn ghost sm" data-sp="edit">Edit plan</button></div>';
  if (SP.warn) h += '<p class="spwarn">' + esc(SP.warn) + '</p>';
  h += '<div class="spstats"><div><b>' + done + '</b><span>of ' + total + ' questions done</span></div><div><b>' + (behind > 0 ? behind : 0) + '</b><span>' + (behind > 0 ? 'questions behind' : 'behind. On track') + '</span></div><div><b>' + streak + '</b><span>day check-in streak</span></div></div>';
  h += '<div class="spbar"><i style="width:' + (total ? Math.min(100, Math.round(done / total * 100)) : 0) + '%"></i></div>';
  if (t) h += '<div class="sptoday"><span class="splab">Today</span><b>' + esc(t.what) + '</b>' + spCheckHTML(t) + '</div>';
  if (behind > 0) h += '<div class="spshift"><span>You missed some days. Shift the rest of the plan down from today, keeping the same questions?</span><button type="button" class="btn sm" data-sp="shift">Shift the plan</button></div>';
  h += '</section><section class="panel sp"><h2>Day by day</h2><div class="sptbl"><table><thead><tr><th>Day</th><th>Plan</th><th>Check in</th></tr></thead><tbody>';
  SP.days.forEach(function(x){
    h += '<tr class="k-' + x.kind + (x.date === today ? ' now' : '') + (x.date < today ? ' past' : '') + '"><td>' + esc(spNice(x.date)) + '</td><td>' + esc(x.what) + '</td><td>' + (x.kind === 'off' ? '' : spCheckHTML(x)) + '</td></tr>';
  });
  return h + '</tbody></table></div></section>';
}
function spCheckHTML(x){
  var s = SP.log[x.date] || '';
  return '<span class="spchk">' + [['done','✓','Done'],['half','½','Half done'],['miss','✕','Missed']].map(function(k){ return '<button type="button" class="' + k[0] + (s === k[0] ? ' on' : '') + '" data-spd="' + x.date + '" data-sps="' + k[0] + '" title="' + k[2] + '" aria-label="' + k[2] + '">' + k[1] + '</button>'; }).join('') + '</span>';
}
function scheduleHTML(){ return (!SP || spDraft) ? spFormHTML() : spPlanHTML(); }

document.addEventListener('click', function(e){
  var c = e.target.closest('[data-spd]');
  if (c && SP){ var d = c.dataset.spd, s = c.dataset.sps; SP.log[d] = SP.log[d] === s ? '' : s; spSave(); renderStage(); return; }
  var b = e.target.closest('[data-sp]'); if (!b) return;
  var k = b.dataset.sp;
  if (k === 'edit'){ spDraft = 'edit'; renderStage(); window.scrollTo(0, 0); }
  else if (k === 'cancel'){ spDraft = null; renderStage(); }
  else if (k === 'shift'){
    /* keep the same questions: whatever was not done moves to today onward */
    var o = Object.assign({}, SP.o), keepLog = {}, today = spIso(new Date());
    o.questions = Math.max(0, SP.days.filter(function(x){ return x.kind === 'q'; }).reduce(function(a, x){ return a + x.n; }, 0) - spDone());
    o.start = today;
    var dn = spDone(); Object.keys(SP.log).forEach(function(d){ if (d < today) keepLog[d] = SP.log[d]; });
    var past = SP.days.filter(function(x){ return x.date < today; });
    var nu = spBuild(o); nu.days = past.concat(nu.days); nu.log = keepLog; nu.o.questions = o.questions + dn; nu.o.start = SP.o.start;
    SP = nu; spSave(); renderStage();
  }
});
document.addEventListener('change', function(e){
  var id = e.target && e.target.id;
  if (id === 'spEx'){ var d = spRead(); d.ex = e.target.value === 'other' ? '' : e.target.value; var subs = SP_EXAMS[d.ex] ? Object.keys(SP_EXAMS[d.ex]) : []; d.subject = subs[0] || ''; d.topics = []; spDraft = d; renderStage(); if (e.target.value === 'other'){ var x = document.getElementById('spEx'); if (x) x.value = 'other'; document.getElementById('spExOtherL').hidden = false; } }
  if (id === 'spSub'){ var d2 = spRead(); d2.subject = e.target.value === 'other' ? '' : e.target.value; d2.topics = []; spDraft = d2; renderStage(); if (e.target.value === 'other'){ var y = document.getElementById('spSub'); if (y) y.value = 'other'; document.getElementById('spSubOtherL').hidden = false; } }
});
document.addEventListener('submit', function(e){
  if (!e.target || e.target.id !== 'spform') return;
  e.preventDefault();
  var o = spRead(), er = document.getElementById('sperr');
  if (!o.exam){ er.textContent = 'Add your exam date.'; return; }
  if (o.exam <= o.start){ er.textContent = 'The exam date has to be after the start date.'; return; }
  if (!o.week.some(Boolean)){ er.textContent = 'Pick at least one day you can study.'; return; }
  var log = SP ? SP.log : {};
  SP = spBuild(o); SP.log = log; spDraft = null; spSave(); lsSet('sr_plan_draft', null); renderStage(); window.scrollTo(0, 0);
});
