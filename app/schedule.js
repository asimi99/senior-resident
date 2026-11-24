/* ---------- study plan builder (website only) ----------
   Three steps: 1 the basics, 2 recommendations to accept or change, 3 the day-by-day plan.
   Percentages are the published content outline ranges (NBME subject exams, USMLE). [name, range, midpoint] */
var SP_SRC = { 'NBME shelf':'NBME subject exam content outlines', 'USMLE Step 1':'USMLE Step 1 content outline', 'USMLE Step 2 CK':'USMLE Step 2 CK content outline' };
var SP_EXAMS = {
  'NBME shelf': {
    'Internal Medicine': [['Cardiovascular','10–15%',12.5],['Multisystem processes','10–15%',12.5],['Blood and lymphoreticular','5–10%',7.5],['Respiratory','5–10%',7.5],['Gastrointestinal','5–10%',7.5],['Renal and urinary','5–10%',7.5],['Endocrine','5–10%',7.5],['Immune','1–5%',3],['Nervous system and special senses','1–5%',3],['Skin','1–5%',3],['Musculoskeletal','1–5%',3],['Behavioural health','1–5%',3],['Female reproductive and breast','1–5%',3],['Male reproductive','1–5%',3],['General principles and well patient','1–5%',3],['Biostatistics and epidemiology','1–5%',3],['Ethics and social sciences','1–5%',3]],
    'Surgery': [['Gastrointestinal','20–25%',22.5],['Cardiovascular','10–15%',12.5],['Respiratory','8–12%',10],['Blood and lymphoreticular','5–10%',7.5],['Nervous system and special senses','5–10%',7.5],['Multisystem processes (trauma, shock)','5–10%',7.5],['Musculoskeletal','3–7%',5],['Renal and urinary','3–7%',5],['Female reproductive and breast','3–7%',5],['Endocrine','3–7%',5],['Immune','1–5%',3],['Skin','1–5%',3],['Male reproductive','1–5%',3]],
    'Pediatrics': [['Multisystem processes','10–15%',12.5],['Gastrointestinal','8–12%',10],['Nervous system and special senses','5–10%',7.5],['Cardiovascular','5–10%',7.5],['Respiratory','5–10%',7.5],['Renal and urinary','5–10%',7.5],['Newborn and congenital','5–10%',7.5],['Endocrine','5–10%',7.5],['General principles, growth and well child','3–7%',5],['Immune','3–7%',5],['Blood and lymphoreticular','3–7%',5],['Musculoskeletal','3–7%',5],['Female reproductive','3–7%',5],['Behavioural health','1–5%',3],['Skin','1–5%',3],['Male reproductive','1–5%',3],['Ethics and social sciences','1–5%',3]],
    'Obstetrics and Gynecology': [['Obstetrics: pregnancy, childbirth and postpartum','40–45%',42.5],['Gynecology: female reproductive and breast','40–45%',42.5],['Other systems and multisystem','5–10%',7.5],['General principles and well patient','1–5%',3],['Endocrine','1–5%',3],['Ethics and social sciences','1–5%',3]],
    'Psychiatry': [['Behavioural health (mood, psychosis, anxiety, substance use and the rest)','65–70%',67.5],['Nervous system and special senses','10–15%',12.5],['General principles and well patient','5–10%',7.5],['Other systems and multisystem','5–10%',7.5],['Ethics and social sciences','1–5%',3]],
    'Family Medicine': [['General principles and well patient','5–10%',7.5],['Behavioural health','5–10%',7.5],['Musculoskeletal','5–10%',7.5],['Cardiovascular','5–10%',7.5],['Respiratory','5–10%',7.5],['Gastrointestinal','5–10%',7.5],['Endocrine','5–10%',7.5],['Ethics and social sciences','5–10%',7.5],['Skin','3–7%',5],['Immune','1–5%',3],['Blood and lymphoreticular','1–5%',3],['Nervous system and special senses','1–5%',3],['Renal and urinary','1–5%',3],['Pregnancy and postpartum','1–5%',3],['Female reproductive and breast','1–5%',3],['Male reproductive','1–5%',3],['Multisystem processes','1–5%',3],['Biostatistics and epidemiology','1–5%',3]]
  },
  'USMLE Step 1': { 'All systems': [['Reproductive and endocrine','12–16%',14],['Respiratory and renal','11–15%',13],['Behavioural health and nervous system','10–14%',12],['Blood, lymphoreticular and immune','9–13%',11],['Musculoskeletal and skin','8–12%',10],['Multisystem processes','8–12%',10],['Cardiovascular','7–11%',9],['Gastrointestinal','6–10%',8],['Communication and interpersonal skills','6–9%',7.5],['Biostatistics and epidemiology','4–6%',5],['Human development','1–3%',2]] },
  'USMLE Step 2 CK': { 'All systems': [['Ethics, professionalism and patient safety','10–15%',12.5],['Renal, urinary and reproductive','7–13%',10],['Cardiovascular','6–12%',9],['Musculoskeletal and skin','6–12%',9],['Behavioural health','5–10%',7.5],['Blood, lymphoreticular and immune','5–10%',7.5],['Gastrointestinal','5–10%',7.5],['Nervous system and special senses','5–10%',7.5],['Respiratory','5–10%',7.5],['Multisystem processes','4–8%',6],['Endocrine','3–7%',5],['Pregnancy and postpartum','3–7%',5],['Biostatistics and epidemiology','3–5%',4],['Human development','2–4%',3]] },
  'MCCQE Part I': { 'All subjects': [['Medicine','',0],['Surgery','',0],['Pediatrics','',0],['Obstetrics and gynecology','',0],['Psychiatry','',0],['Population health and ethics','',0]] }
};

/* ---------- storage: one plan per signed-in person, kept in the browser and on the account ---------- */
function spKey(){ return 'sr_plan_v2_' + (SR.user ? SR.user.id : 'anon'); }
var SP = null, SPW = null;   /* SP = saved plan. SPW = the plan being built: { step, o, recs } */
function spLoad(){
  SP = lsGet(spKey(), null);
  var m = SR.user && SR.user.user_metadata && SR.user.user_metadata.sr_plan;
  if (m && (!SP || (m.saved || 0) > (SP.saved || 0))){ SP = m; lsSet(spKey(), SP); }
}
function spSave(){
  if (SP) SP.saved = Date.now();
  lsSet(spKey(), SP);
  if (SR.user && SR.sb){ clearTimeout(spSave.t); spSave.t = setTimeout(function(){ SR.sb.auth.updateUser({ data:{ sr_plan:SP } }).then(function(){}, function(){}); }, 800); }
}
SR.onAuth(function(){ spLoad(); });
spLoad();

function spIso(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function spDate(s){ var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function spNice(s){ return spDate(s).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }); }
function spTopics(o){ return ((SP_EXAMS[o.ex] || {})[o.subject] || []); }

/* ---------- step 1: the basics ---------- */
function spChips(name, list, on){
  return '<div class="spchips">' + list.map(function(t){ return '<label class="spday"><input type="checkbox" data-' + name + '="' + esc(t) + '"' + (on.indexOf(t) >= 0 ? ' checked' : '') + '><span>' + esc(t) + '</span></label>'; }).join('') + '</div>';
}
function spStep1HTML(){
  var o = SPW.o, exams = Object.keys(SP_EXAMS), isOtherEx = o.ex && exams.indexOf(o.ex) < 0;
  var subj = SP_EXAMS[o.ex] ? Object.keys(SP_EXAMS[o.ex]) : [], isOtherSub = o.subject && subj.indexOf(o.subject) < 0;
  var dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], tl = spTopics(o).map(function(t){ return t[0]; });
  var h = spStepsHTML(1) + '<section class="panel sp"><h2>Build your study plan</h2><form id="spform" class="spf">';
  h += '<div class="sp2"><label>Which exam are you writing?<select id="spEx"><option value="">Choose one</option>' + exams.map(function(e){ return '<option' + (o.ex === e ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('') + '<option value="other"' + (isOtherEx ? ' selected' : '') + '>Other</option></select></label>';
  h += subj.length > 1 ? '<label>Which subject?<select id="spSub"><option value="">Choose one</option>' + subj.map(function(s){ return '<option' + (o.subject === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '<option value="other"' + (isOtherSub ? ' selected' : '') + '>Other</option></select></label>' : '<span></span>';
  h += '</div>';
  h += '<label id="spExOtherL"' + (isOtherEx ? '' : ' hidden') + '>Name of the exam<input id="spExOther" class="inp" value="' + esc(isOtherEx ? o.ex : '') + '" placeholder="For example, the Royal College exam"></label>';
  h += '<label id="spSubOtherL"' + (isOtherSub ? '' : ' hidden') + '>Subject in your own words<input id="spSubOther" class="inp" value="' + esc(isOtherSub ? o.subject : '') + '"></label>';
  h += '<div class="sp2"><label>Question bank<input id="spBank" class="inp" value="' + esc(o.bank || '') + '"></label><span></span></div>';
  h += '<div class="sp2"><label>Study start date<input id="spStart" class="inp" type="date" value="' + esc(o.start || spIso(new Date())) + '"></label><label>Exam date<input id="spExam" class="inp" type="date" value="' + esc(o.exam || '') + '"></label></div>';
  h += '<div class="sp2"><label>Number of practice exams you have (NBME forms or similar)<input id="spF" class="inp" type="number" min="0" max="30" value="' + (o.forms == null ? '' : o.forms) + '"></label><label>Review-only days before the exam<input id="spR" class="inp" type="number" min="0" max="14" value="' + (o.review == null ? '' : o.review) + '"></label></div>';
  h += '<div class="splab">Days you can study</div><div class="spweek">' + dn.map(function(d, i){ return '<label class="spday"><input type="checkbox" data-wd="' + i + '"' + (o.week[i] ? ' checked' : '') + '><span>' + d + '</span></label>'; }).join('') + '</div>';
  h += '<div class="spopt"><div class="spopth"><b>Optional</b><span>Skip any of these. They only shape the recommendation.</span></div>';
  if (tl.length){
    h += '<div class="splab">Your strengths</div>' + spChips('st', tl, o.strong || []);
    h += '<div class="splab">Areas you want more time on</div>' + spChips('wk', tl, o.weak || []);
  }
  h += '<label>Anything else about your strengths or weak spots<input id="spSW" class="inp" value="' + esc(o.swNote || '') + '" placeholder="In your own words"></label>';
  h += '<div class="splab">How do you want to do questions?</div><div class="spweek">' + [['system','By system'],['random','Random, mixed blocks'],['other','Other']].map(function(m){ return '<label class="spday"><input type="radio" name="spMode" value="' + m[0] + '"' + (o.mode === m[0] ? ' checked' : '') + '><span>' + m[1] + '</span></label>'; }).join('') + '</div>';
  h += '<label id="spModeOtherL"' + (o.mode === 'other' ? '' : ' hidden') + '>Describe it<input id="spModeOther" class="inp" value="' + esc(o.modeNote || '') + '"></label></div>';
  h += '<p class="er" id="sperr"></p><div class="row"><button class="btn" type="submit">See my recommendations</button>' + (SP ? '<button type="button" class="btn ghost" data-sp="cancel">Cancel</button>' : '') + '</div></form></section>';
  return h;
}
function spRead1(){
  function v(id){ var e = document.getElementById(id); return e ? e.value : ''; }
  var exSel = v('spEx'), ex = exSel === 'other' ? v('spExOther').trim() : exSel;
  var subs = SP_EXAMS[ex] ? Object.keys(SP_EXAMS[ex]) : [], subSel = v('spSub');
  var sub = subs.length === 1 ? subs[0] : (subSel === 'other' ? v('spSubOther').trim() : subSel);
  var week = [0,1,2,3,4,5,6].map(function(i){ var c = document.querySelector('[data-wd="' + i + '"]'); return !!(c && c.checked); });
  function chips(n){ return Array.prototype.slice.call(document.querySelectorAll('[data-' + n + ']:checked')).map(function(c){ return c.getAttribute('data-' + n); }); }
  var mode = (document.querySelector('input[name="spMode"]:checked') || {}).value || '';
  var f = v('spF'), r = v('spR');
  return Object.assign({}, SPW.o, { ex:ex, exSel:exSel, subject:sub, subSel:subSel, bank:v('spBank').trim(), start:v('spStart') || spIso(new Date()), exam:v('spExam'), forms:f === '' ? null : Math.max(0, +f), review:r === '' ? null : Math.max(0, +r), week:week, strong:chips('st'), weak:chips('wk'), swNote:v('spSW').trim(), mode:mode, modeNote:v('spModeOther').trim() });
}

/* ---------- step 2: recommendations ---------- */
function spRecommend(o){
  var t = spTopics(o).map(function(x, i){ return { t:x[0], pct:x[1], mid:x[2], i:i, n:'', ok:true }; });
  if (!t.length) t = [{ t:o.subject || 'All topics', pct:'', mid:0, i:0, n:'', ok:true }];
  t.forEach(function(x){ x.score = x.mid + ((o.weak || []).indexOf(x.t) >= 0 ? 6 : 0) - ((o.strong || []).indexOf(x.t) >= 0 ? 6 : 0); });
  t.sort(function(a, b){ return b.score - a.score || a.i - b.i; });
  var prev = SPW.recs || (SP && SP.recs) || [];
  t.forEach(function(x){ var p = prev.find(function(y){ return y.t === x.t; }); if (p){ x.n = p.n; } });
  return t;
}
function spWhy(o, recs){
  var have = recs.filter(function(r){ return r.pct; }), out = [];
  if (!have.length) return o.ex === 'MCCQE Part I' ? ['The MCC does not publish percentages by system, so this keeps the order you see. Reorder it with the arrows.'] : ['There are no published percentages for this exam, so reorder the list with the arrows to match how you want to work.'];
  var a = have[0], z = have[have.length - 1];
  out.push('Start with <b>' + esc(a.t) + '</b>. It is ' + esc(a.pct) + ' of the exam' + (SP_SRC[o.ex] ? ' per the ' + SP_SRC[o.ex] : '') + '.');
  if (have.length > 1) out.push('End with <b>' + esc(z.t) + '</b> (' + esc(z.pct) + '). It is lower yield, so it costs least if time runs short.');
  if ((o.weak || []).length) out.push('Your weaker areas moved up: ' + o.weak.map(esc).join(', ') + '.');
  if ((o.strong || []).length) out.push('Your strengths moved toward the end: ' + o.strong.map(esc).join(', ') + '.');
  if (o.mode === 'random') out.push('You chose random blocks. The plan gives a daily question count across all systems, and these numbers set the total.');
  if (o.forms) out.push('Your ' + o.forms + ' practice exam' + (o.forms === 1 ? '' : 's') + ' go after the question bank, one a day, never two on the same day.');
  return out;
}
function spStep2HTML(){
  var o = SPW.o, recs = SPW.recs, why = spWhy(o, recs), tot = recs.filter(function(r){ return r.ok; }).reduce(function(a, r){ return a + (+r.n || 0); }, 0);
  var h = spStepsHTML(2) + '<section class="panel sp"><h2>Here is what I would do</h2><p class="muted">' + esc(o.subject && o.subject !== 'All systems' && o.subject !== 'All subjects' ? o.subject + ', ' + o.ex : o.ex) + '</p>';
  h += '<ul class="spwhy">' + why.map(function(w){ return '<li>' + w + '</li>'; }).join('') + '</ul>';
  h += '<div class="sprecs"><div class="sprh"><span>Order</span><span>Topic</span><span>Share of exam</span><span>Questions in your bank</span><span>Accept recommendation</span></div>';
  recs.forEach(function(r, i){
    h += '<div class="sprr' + (r.ok ? '' : ' off') + '"><span class="spmv"><button type="button" data-spmv="' + i + '" data-d="-1" aria-label="Move up"' + (i ? '' : ' disabled') + '>▲</button><button type="button" data-spmv="' + i + '" data-d="1" aria-label="Move down"' + (i < recs.length - 1 ? '' : ' disabled') + '>▼</button></span>'
      + '<span class="spt">' + esc(r.t) + '</span><span class="sppct">' + (r.pct ? esc(r.pct) : '') + '</span>'
      + '<span><input class="inp spn" type="number" min="0" step="1" data-spn="' + i + '" value="' + esc(r.n) + '" placeholder="Number"' + (r.ok ? '' : ' disabled') + '></span>'
      + '<span class="spok"><button type="button" class="' + (r.ok ? 'on y' : '') + '" data-spok="' + i + '" data-v="1" aria-label="Accept recommendation">✓</button><button type="button" class="' + (r.ok ? '' : 'on n') + '" data-spok="' + i + '" data-v="0" aria-label="Leave out">✕</button></span></div>';
  });
  h += '</div><p class="sptot">Total: <b id="spTot">' + tot + '</b> questions</p>';
  h += '<label class="spfree">Want it different? Say it in your own words<textarea id="spNote" rows="3" placeholder="For example: start with cardio, put renal last, skip ethics">' + esc(SPW.note || '') + '</textarea></label>';
  h += '<p class="er" id="sperr"></p><div class="row"><button type="button" class="btn ghost" data-sp="back1">Back</button><span class="spacer"></span><button type="button" class="btn" data-sp="build">Build my plan</button></div></section>';
  return h;
}
/* plain-words changes: "start with X", "X last", "skip X" */
function spApplyNote(recs, note){
  var s = String(note || '').toLowerCase(); if (!s) return recs;
  var norm = function(t){ return t.toLowerCase().replace(/[^a-z ]/g, ' '); };
  var key = function(t){ return norm(t).split(/\s+/).filter(function(w){ return w.length > 3 && ['system','processes','special','senses','and','other','general'].indexOf(w) < 0; }); };
  var alias = { cardio:'cardiovascular', heart:'cardiovascular', gi:'gastrointestinal', renal:'renal', kidney:'renal', neuro:'nervous', psych:'behavioural', endo:'endocrine', heme:'blood', onc:'blood', pulm:'respiratory', lung:'respiratory', msk:'musculoskeletal', ortho:'musculoskeletal', derm:'skin', ethics:'ethics', biostats:'biostatistics', ob:'obstetrics', gyn:'gynecology', repro:'reproductive', newborn:'newborn', multisystem:'multisystem' };
  s.split(/[,.;\n]| then /).forEach(function(part){
    part = part.trim(); if (!part) return;
    var words = part.split(/\s+/).map(function(w){ return alias[w.replace(/[^a-z]/g, '')] || w.replace(/[^a-z]/g, ''); });
    var hit = recs.find(function(r){ return key(r.t).some(function(k){ return words.indexOf(k) >= 0; }); });
    if (!hit) return;
    var i = recs.indexOf(hit);
    if (/\b(skip|remove|drop|no|without|leave out)\b/.test(part)) hit.ok = false;
    else if (/\b(last|end|finish)\b/.test(part)){ recs.splice(i, 1); recs.push(hit); }
    else if (/\b(first|start|begin)\b/.test(part)){ recs.splice(i, 1); recs.unshift(hit); }
  });
  return recs;
}

/* ---------- step 3: build the days ---------- */
function spBuild(o, recs){
  var start = spDate(o.start), exam = spDate(o.exam), days = [];
  for (var d = new Date(start); d < exam; d.setDate(d.getDate() + 1)) days.push({ date:spIso(d), study:o.week[d.getDay()] });
  var study = days.filter(function(x){ return x.study; });
  var forms0 = o.forms || 0, review0 = o.review || 0;
  var review = Math.min(review0, Math.max(0, study.length - 1)), forms = Math.min(forms0, Math.max(0, study.length - review - 1));
  var keep = recs.filter(function(r){ return r.ok && +r.n > 0; }), total = keep.reduce(function(a, r){ return a + (+r.n); }, 0);
  var qDays = study.length - review - forms, warn = '';
  if (qDays < 1){ qDays = 0; warn = 'There are not enough study days for this. Move the exam date, add study days, or use fewer practice exams.'; }
  /* even split in fives, never a pile-up on the last day */
  var units = Math.ceil(total / 5), baseU = qDays ? Math.floor(units / qDays) : 0, extraU = qDays ? units - baseU * qDays : 0;
  var per = qDays ? (baseU + (extraU ? 1 : 0)) * 5 : 0;
  if (per > 120) warn = 'That is about ' + per + ' questions a day. Consider more study days or fewer questions.';
  var queue = keep.map(function(r){ return { t:r.t, n:+r.n }; }), remaining = total, fi = 0;
  study.forEach(function(x, i){
    if (i < qDays){
      var n = Math.min(remaining, (baseU + (i < extraU ? 1 : 0)) * 5); remaining -= n; x.kind = 'q'; x.n = n;
      if (o.mode === 'random' || !queue.length) x.what = n + ' mixed questions, random and timed';
      else {
        var parts = [], need = n;
        while (need > 0 && queue.length){ var q = queue[0], take = Math.min(q.n, need); parts.push(take + ' ' + q.t); q.n -= take; need -= take; if (!q.n) queue.shift(); }
        x.what = parts.join(', ');
      }
      if (!n){ x.kind = 'rest'; x.what = 'Catch up or rest'; }
    } else if (i < qDays + forms){ fi++; x.kind = 'form'; x.what = 'Practice exam ' + fi + ', then review every question'; }
    else { x.kind = 'review'; x.what = 'Review only: misses, flagged topics, light questions'; }
  });
  days.forEach(function(x){ if (!x.study){ x.kind = 'off'; x.what = 'Day off'; } });
  return { o:o, recs:recs, note:SPW ? SPW.note : '', days:days, warn:warn, per:per, total:total, built:spIso(new Date()), log:{} };
}

/* ---------- the saved plan ---------- */
function spDone(){ var n = 0; if (!SP) return 0; SP.days.forEach(function(x){ var s = SP.log[x.date]; if (x.kind === 'q' && s) n += s === 'done' ? x.n : s === 'half' ? Math.round(x.n / 2) : 0; }); return n; }
function spStats(){
  var today = spIso(new Date()), q = SP.days.filter(function(x){ return x.kind === 'q'; });
  var total = q.reduce(function(a, x){ return a + x.n; }, 0), due = q.filter(function(x){ return x.date < today; }).reduce(function(a, x){ return a + x.n; }, 0), done = spDone();
  var left = Math.max(0, total - done), daysLeft = q.filter(function(x){ return x.date >= today; }).length;
  var forms = SP.days.filter(function(x){ return x.kind === 'form'; }), formsDone = forms.filter(function(x){ return SP.log[x.date] === 'done'; }).length;
  var checks = SP.days.filter(function(x){ return x.date < today && x.kind !== 'off'; }), hit = checks.filter(function(x){ return SP.log[x.date] === 'done' || SP.log[x.date] === 'half'; }).length;
  var streak = 0; for (var i = SP.days.length - 1; i >= 0; i--){ var x = SP.days[i]; if (x.date >= today || x.kind === 'off') continue; if (SP.log[x.date] === 'done') streak++; else break; }
  var diff = done - due, status = diff >= 0 ? (diff >= 20 ? 'Ahead' : 'On track') : 'Behind';
  return { today:today, total:total, due:due, done:done, left:left, need:daysLeft ? Math.ceil(left / daysLeft / 5) * 5 : 0, daysLeft:daysLeft, forms:forms.length, formsDone:formsDone, rate:checks.length ? Math.round(hit / checks.length * 100) : null, streak:streak, diff:diff, status:status };
}
function spPlanHTML(){
  var o = SP.o, S = spStats(), toExam = Math.max(0, Math.round((spDate(o.exam) - spDate(S.today)) / 86400000));
  var t = SP.days.find(function(x){ return x.date === S.today; });
  var h = '<section class="panel sp"><div class="sphd"><div><h2>' + esc(o.subject && !/^All /.test(o.subject) ? o.subject + ', ' : '') + esc(o.ex) + '</h2><p class="muted sm">' + toExam + ' day' + (toExam === 1 ? '' : 's') + ' to go. Exam on ' + esc(spNice(o.exam)) + (o.bank ? '. ' + esc(o.bank) : '') + '.</p></div>'
    + '<div class="row"><button type="button" class="btn ghost sm" data-sp="edit">Edit my plan</button><button type="button" class="btn ghost sm" data-sp="delask">Delete</button></div></div>';
  if (SPW && SPW.delAsk) h += '<div class="spdel"><span>Delete this plan and its check-ins? This cannot be undone.</span><button type="button" class="btn sm danger" data-sp="del">Delete plan</button><button type="button" class="btn ghost sm" data-sp="delno">Keep it</button></div>';
  if (SP.warn) h += '<p class="spwarn">' + esc(SP.warn) + '</p>';
  h += '<div class="spstatus s-' + S.status.replace(' ', '').toLowerCase() + '"><b>' + S.status + '</b><span>' + (S.diff < 0 ? Math.abs(S.diff) + ' questions behind where the plan expected by today.' : S.diff > 0 ? S.diff + ' questions ahead of the plan.' : 'Exactly where the plan expected.') + (S.left ? ' To finish on time: about ' + S.need + ' a day for the ' + S.daysLeft + ' question day' + (S.daysLeft === 1 ? '' : 's') + ' left.' : '') + '</span></div>';
  h += '<div class="spstats"><div><b>' + S.done + '</b><span>of ' + S.total + ' questions done</span></div><div><b>' + S.formsDone + ' of ' + S.forms + '</b><span>practice exams done</span></div><div><b>' + (S.rate == null ? '–' : S.rate + '%') + '</b><span>days checked in</span></div><div><b>' + S.streak + '</b><span>day streak</span></div></div>';
  h += '<div class="spbar"><i style="width:' + (S.total ? Math.min(100, Math.round(S.done / S.total * 100)) : 0) + '%"></i></div>';
  if (t) h += '<div class="sptoday"><span class="splab">Today</span><b>' + esc(t.what) + '</b>' + (t.kind === 'off' ? '' : spCheckHTML(t)) + '</div>';
  if (S.diff < 0) h += '<div class="spshift"><span>Missed some days? Shift the rest of the plan down from today, keeping the same questions.</span><button type="button" class="btn sm" data-sp="shift">Shift the plan</button></div>';
  if (SP.note) h += '<p class="muted sm">Your note: ' + esc(SP.note) + '</p>';
  h += '</section><section class="panel sp"><h2>Day by day</h2><div class="sptbl"><table><thead><tr><th>Day</th><th>Plan</th><th>Check in</th></tr></thead><tbody>';
  SP.days.forEach(function(x){
    h += '<tr class="k-' + x.kind + (x.date === S.today ? ' now' : '') + (x.date < S.today ? ' past' : '') + '"><td>' + esc(spNice(x.date)) + '</td><td>' + esc(x.what) + '</td><td>' + (x.kind === 'off' ? '' : spCheckHTML(x)) + '</td></tr>';
  });
  return h + '</tbody></table></div></section>';
}
function spCheckHTML(x){
  var s = SP.log[x.date] || '';
  return '<span class="spchk">' + [['done','✓','Done'],['half','½','Half done'],['miss','✕','Missed']].map(function(k){ return '<button type="button" class="' + k[0] + (s === k[0] ? ' on' : '') + '" data-spd="' + x.date + '" data-sps="' + k[0] + '" title="' + k[2] + '" aria-label="' + k[2] + '">' + k[1] + '</button>'; }).join('') + '</span>';
}

/* ---------- shared bits ---------- */
function spStepsHTML(n){
  return '<ol class="spsteps">' + ['The basics','Recommendations','Your plan'].map(function(s, i){ return '<li class="' + (i + 1 < n ? 'done' : i + 1 === n ? 'on' : '') + '"><b>' + (i + 1) + '</b>' + s + '</li>'; }).join('') + '</ol>';
}
function spCookHTML(lines){
  return '<section class="panel sp spcook"><div class="spcookic"><i></i><i></i><i></i></div><ul>' + lines.map(function(l, i){ return '<li style="animation-delay:' + (i * 0.55) + 's">' + esc(l) + '</li>'; }).join('') + '</ul></section>';
}
function spCook(lines, then){
  SPW.cooking = lines; renderStage(); window.scrollTo(0, 0);
  setTimeout(function(){ SPW.cooking = null; then(); renderStage(); window.scrollTo(0, 0); }, 600 + lines.length * 550);
}
function spPreviewHTML(){
  var demo = [['Mon','30 Gastrointestinal','✓'],['Tue','30 Gastrointestinal','½'],['Wed','15 Gastrointestinal, 15 Cardiovascular',''],['Thu','30 Cardiovascular',''],['Fri','Practice exam 1, then review every question',''],['Sat','Review only: misses and flagged topics','']];
  return '<section class="panel sp sppre"><h2>Build a study plan that keeps you honest</h2><p class="muted">Pick your exam and dates. It recommends an order from the published exam percentages, you accept or change it, and you get a day-by-day plan with check-ins and an on-track meter.</p>'
    + '<div class="sppreview" aria-hidden="true"><div class="spstatus s-ontrack"><b>On track</b><span>To finish on time: about 30 a day.</span></div><div class="sptbl"><table><tbody>' + demo.map(function(d){ return '<tr><td>' + d[0] + '</td><td>' + d[1] + '</td><td>' + (d[2] ? '<span class="spchk"><button class="' + (d[2] === '✓' ? 'done' : 'half') + ' on">' + d[2] + '</button></span>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div></div>'
    + '<div class="row"><button type="button" class="btn" data-go="account">Sign in to build yours</button></div></section>';
}
function scheduleHTML(){
  if (!SR.user) return spPreviewHTML();
  if (SPW && SPW.cooking) return spCookHTML(SPW.cooking);
  if (SPW && SPW.step === 1) return spStep1HTML();
  if (SPW && SPW.step === 2) return spStep2HTML();
  if (SP) return spPlanHTML();
  SPW = { step:1, o:{ week:[true,true,true,true,true,true,true], start:spIso(new Date()) } };
  return spStep1HTML();
}

document.addEventListener('click', function(e){
  var c = e.target.closest('[data-spd]');
  if (c && SP){ var d = c.dataset.spd, s = c.dataset.sps; SP.log[d] = SP.log[d] === s ? '' : s; spSave(); renderStage(); return; }
  var mv = e.target.closest('[data-spmv]');
  if (mv && SPW){ spSync2(); var i = +mv.dataset.spmv, j = i + (+mv.dataset.d), r = SPW.recs; if (j < 0 || j >= r.length) return; var t = r[i]; r[i] = r[j]; r[j] = t; renderStage(); return; }
  var ok = e.target.closest('[data-spok]');
  if (ok && SPW){ spSync2(); SPW.recs[+ok.dataset.spok].ok = ok.dataset.v === '1'; renderStage(); return; }
  var b = e.target.closest('[data-sp]'); if (!b) return;
  var k = b.dataset.sp;
  if (k === 'edit'){ SPW = { step:1, o:Object.assign({}, SP.o), recs:SP.recs, note:SP.note }; renderStage(); window.scrollTo(0, 0); }
  else if (k === 'cancel'){ SPW = null; renderStage(); }
  else if (k === 'back1'){ spSync2(); SPW.step = 1; renderStage(); window.scrollTo(0, 0); }
  else if (k === 'delask'){ SPW = { delAsk:true }; renderStage(); }
  else if (k === 'delno'){ SPW = null; renderStage(); }
  else if (k === 'del'){ SP = null; SPW = null; lsSet(spKey(), null); if (SR.user && SR.sb) SR.sb.auth.updateUser({ data:{ sr_plan:null } }).then(function(){}, function(){}); renderStage(); }
  else if (k === 'build'){
    spSync2();
    var er = document.getElementById('sperr');
    SPW.recs = spApplyNote(SPW.recs, SPW.note);
    if (!SPW.recs.some(function(r){ return r.ok && +r.n > 0; })){ er.textContent = 'Add how many questions your bank has for at least one topic you are keeping.'; return; }
    spCook(['Counting your study days', 'Spreading ' + SPW.recs.filter(function(r){ return r.ok; }).reduce(function(a, r){ return a + (+r.n || 0); }, 0) + ' questions in even blocks of five', 'Putting practice exams after the question bank', 'Saving the last days for review'], function(){
      var log = SP ? SP.log : {}; SP = spBuild(SPW.o, SPW.recs); SP.log = log; SPW = null; spSave();
    });
  }
  else if (k === 'shift'){
    var o = Object.assign({}, SP.o), today = spIso(new Date()), keepLog = {};
    var past = SP.days.filter(function(x){ return x.date < today; });
    Object.keys(SP.log).forEach(function(d){ if (d < today) keepLog[d] = SP.log[d]; });
    /* the questions not yet done come off the end of the topic list order */
    var doneN = spDone(), recs = SP.recs.map(function(r){ return Object.assign({}, r); });
    recs.forEach(function(r){ if (!r.ok || !(+r.n)) return; var take = Math.min(+r.n, doneN); r.n = +r.n - take; doneN -= take; });
    o.start = today; SPW = { note:SP.note };
    var nu = spBuild(o, recs); nu.days = past.concat(nu.days); nu.log = keepLog; nu.o.start = SP.o.start; nu.recs = SP.recs; nu.total = SP.total;
    SP = nu; SPW = null; spSave(); renderStage();
  }
});
function spSync2(){
  if (!SPW || SPW.step !== 2) return;
  document.querySelectorAll('[data-spn]').forEach(function(inp){ SPW.recs[+inp.dataset.spn].n = inp.value; });
  var n = document.getElementById('spNote'); if (n) SPW.note = n.value.trim();
}
document.addEventListener('input', function(e){
  if (e.target && e.target.dataset && e.target.dataset.spn != null && SPW && SPW.recs){
    SPW.recs[+e.target.dataset.spn].n = e.target.value;
    var t = document.getElementById('spTot'); if (t) t.textContent = SPW.recs.filter(function(r){ return r.ok; }).reduce(function(a, r){ return a + (+r.n || 0); }, 0);
  }
});
document.addEventListener('change', function(e){
  var id = e.target && e.target.id;
  if (!SPW || SPW.step !== 1) return;
  if (id === 'spEx' || id === 'spSub'){
    var d = spRead1();
    if (id === 'spEx'){ d.subject = ''; d.subSel = ''; d.strong = []; d.weak = []; var subs = SP_EXAMS[d.ex] ? Object.keys(SP_EXAMS[d.ex]) : []; if (subs.length === 1) d.subject = subs[0]; }
    else { d.strong = []; d.weak = []; }
    SPW.o = d; SPW.recs = null; renderStage();
    if (d.exSel === 'other'){ var x = document.getElementById('spEx'); if (x) x.value = 'other'; document.getElementById('spExOtherL').hidden = false; }
    if (d.subSel === 'other'){ var y = document.getElementById('spSub'); if (y) y.value = 'other'; document.getElementById('spSubOtherL').hidden = false; }
  }
  if (e.target.name === 'spMode'){ var l = document.getElementById('spModeOtherL'); if (l) l.hidden = e.target.value !== 'other'; }
});
document.addEventListener('submit', function(e){
  if (!e.target || e.target.id !== 'spform') return;
  e.preventDefault();
  var o = spRead1(), er = document.getElementById('sperr');
  if (!o.ex){ er.textContent = 'Pick the exam you are writing.'; return; }
  if (SP_EXAMS[o.ex] && !o.subject){ er.textContent = 'Pick the subject.'; return; }
  if (!o.exam){ er.textContent = 'Add your exam date.'; return; }
  if (o.exam <= o.start){ er.textContent = 'The exam date has to be after the start date.'; return; }
  if (!o.week.some(Boolean)){ er.textContent = 'Pick at least one day you can study.'; return; }
  SPW.o = o;
  spCook(['Reading the ' + (SP_SRC[o.ex] || 'exam') + (SP_SRC[o.ex] ? '' : ' outline'), (o.weak || []).length || (o.strong || []).length ? 'Weighing your strengths and weak spots' : 'Ranking topics by share of the exam', 'Lining up high yield first, low yield last'], function(){ SPW.recs = spRecommend(o); SPW.step = 2; });
});
