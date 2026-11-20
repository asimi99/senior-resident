/* Senior Resident exam mode: turn a PDF of practice questions into a sit-down exam with review and coaching.
   The PDF is read in the browser. Its text stays on this device unless the person asks for coaching or an answer key. */
var exams = lsGet('sr_exams_v1', []);
var EX = { id:null, screen:'home', mode:'tutor', run:null, rev:-1, busy:'', msg:'', sc:true, pick2:'' };
try { if (localStorage.getItem('sr_second') === '0') EX.sc = false; } catch(e){}
function saveExams(){
  while (!lsSet('sr_exams_v1', exams) && exams.length > 1) exams.pop();
}
function exGet(){ return exams.filter(function(e){ return e.id===EX.id; })[0] || null; }

/* ---------- reading the PDF ---------- */
var pdfP = null;
function pdfjs(){
  if (!pdfP) pdfP = new Promise(function(res, rej){
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = function(){ window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror = function(){ pdfP = null; rej(new Error('pdf')); };
    document.head.appendChild(s);
  });
  return pdfP;
}
async function pdfLines(buf, onPage){
  var lib = await pdfjs(), doc = await lib.getDocument({ data:buf }).promise, out = [];
  var n = Math.min(doc.numPages, 200);
  for (var p = 1; p <= n; p++){
    var page = await doc.getPage(p), tc = await page.getTextContent(), rows = {};
    tc.items.forEach(function(it){
      if (!it.str) return;
      var y = Math.round(it.transform[5] / 3) * 3; (rows[y] = rows[y] || []).push({ x:it.transform[4], s:it.str });
    });
    Object.keys(rows).map(Number).sort(function(a, b){ return b - a; }).forEach(function(y){
      var t = rows[y].sort(function(a, b){ return a.x - b.x; }).map(function(i){ return i.s; }).join(' ').replace(/\s+/g, ' ').trim();
      if (t) out.push({ p:p, t:t });
    });
    if (onPage) onPage(p, n);
  }
  return { lines:out, pages:doc.numPages };
}
function parseKey(lines, nQ){
  var key = {}, start = -1;
  for (var i = 0; i < lines.length; i++) if (/^(answer key|answers?|key|correct answers?)\b[: ]*$/i.test(lines[i].t) || /answer key/i.test(lines[i].t)) start = i;
  if (start >= 0){
    var txt = lines.slice(start).map(function(l){ return l.t; }).join('  '), re = /(?:^|[\s,;])(\d{1,3})\s*[.):\-]?\s*\(?([A-J])\)?(?=[\s,;.]|$)/g, m;
    while ((m = re.exec(txt))) if (+m[1] >= 1 && +m[1] <= 400 && !key[+m[1]]) key[+m[1]] = m[2];
  }
  return Object.keys(key).length >= Math.max(2, nQ * 0.5) ? { key:key, start:start } : { key:{}, start:-1 };
}
function parseQuestions(lines){
  var k = parseKey(lines, 0), end = lines.length;
  var qs = [], cur = null, expect = null, opt = null;
  function tryKey(){ var kk = parseKey(lines, qs.length); return kk; }
  for (var i = 0; i < end; i++){
    var l = lines[i], t = l.t;
    var qm = t.match(/^(?:Question\s*|Item\s*|Q\s*)?(\d{1,3})\s*[.):]\s+(\S.*)$/i) || t.match(/^(?:Question|Item)\s+(\d{1,3})\s*(?:of\s+\d+)?\s*[:.]?\s*(.*)$/i);
    if (qm && (expect === null ? +qm[1] <= 3 : +qm[1] === expect) && !(cur && cur.opts.length < 2 && /^[A-J]$/.test(qm[2]))){
      /* a numbered line that continues the sequence starts a new question */
      if (cur && cur.opts.length < 2 && expect !== null && cur.stem.length < 40){ /* false start: fold into the stem */ }
      else {
        cur = { n:+qm[1], stem:qm[2] || '', opts:[], ans:'', page:l.p }; qs.push(cur); expect = +qm[1] + 1; opt = null; continue;
      }
    }
    if (!cur) continue;
    var am = t.match(/^(?:Correct\s+)?Answer\s*[:\-]\s*\(?([A-J])\)?\b/i);
    if (am){ cur.ans = am[1]; opt = null; continue; }
    var om = t.match(/^\(?([A-J])\s*[.)]\s+(\S.*)$/) || t.match(/^\(([A-J])\)\s*(\S.*)$/);
    if (om && (cur.opts.length ? om[1].charCodeAt(0) === cur.opts[cur.opts.length - 1].k.charCodeAt(0) + 1 : om[1] === 'A')){
      opt = { k:om[1], t:om[2] }; cur.opts.push(opt); continue;
    }
    if (/^(answer key|answers)\b/i.test(t) && cur.opts.length >= 2) break;
    if (opt){ if (t.length < 160 && !/^(page \d+|\d+)$/i.test(t)) opt.t += ' ' + t; }
    else cur.stem += (cur.stem ? ' ' : '') + t;
  }
  qs = qs.filter(function(q){ return q.stem.length >= 25 && q.opts.length >= 3; });
  var kk = parseKey(lines, qs.length);
  qs.forEach(function(q){ if (!q.ans && kk.key[q.n]) q.ans = kk.key[q.n]; if (q.ans && !q.opts.some(function(o){ return o.k === q.ans; })) q.ans = ''; });
  return qs;
}
async function aiParse(lines){
  var text = lines.map(function(l){ return l.t; }).join('\n'), chunks = [], qs = [];
  for (var i = 0; i < text.length && chunks.length < 12; i += 7000) chunks.push(text.slice(Math.max(0, i - 600), i + 7000));
  for (var c = 0; c < chunks.length; c++){
    EX.msg = 'Reading the questions, part ' + (c + 1) + ' of ' + chunks.length; renderStage();
    try {
      var r = await sample('Below is text taken from a PDF of multiple-choice exam questions. Extract every complete question you can see. Output JSON Lines only, one object per question, no other text: {"n":question number,"stem":"the full question text exactly as written","opts":["A. option text","B. option text"],"ans":"the correct letter if the text states it, otherwise empty"}. Do not invent or rewrite anything. Skip a question that is cut off at the start or end of the text.\n\n' + chunks[c], { modelTier:'quick' });
      r.text.split('\n').forEach(function(l){
        l = l.trim(); if (l.charAt(0) !== '{') return;
        try { var o = JSON.parse(l); } catch(e){ return; }
        if (!o.stem || !o.opts || o.opts.length < 3 || qs.some(function(q){ return q.n === +o.n; })) return;
        qs.push({ n:+o.n || qs.length + 1, stem:String(o.stem), page:0, ans:/^[A-J]$/.test(o.ans || '') ? o.ans : '',
          opts:o.opts.map(function(t, j){ var m = String(t).match(/^\(?([A-J])[.)]\s*(.*)$/); return { k:m ? m[1] : String.fromCharCode(65 + j), t:m ? m[2] : String(t) }; }) });
      });
    } catch(e){}
  }
  return qs.sort(function(a, b){ return a.n - b.n; });
}
async function examFromPdf(file){
  if (!file || EX.busy) return;
  EX.busy = 'read'; EX.msg = 'Opening the PDF'; renderStage();
  try {
    var buf = await file.arrayBuffer(), keep = buf.slice(0);
    var d = await pdfLines(buf, function(p, n){ if (p % 5 === 0 || p === n){ EX.msg = 'Reading page ' + p + ' of ' + n; var el = document.getElementById('exMsg'); if (el) el.textContent = EX.msg; } });
    var qs = parseQuestions(d.lines);
    if (qs.length < 3 && d.lines.length > 10) qs = await aiParse(d.lines);
    if (qs.length < 1){ EX.busy = ''; EX.msg = d.lines.length < 10 ? 'This PDF has no readable text. It looks like a scan. Use screenshots in the coach instead.' : 'No multiple-choice questions were found in this PDF.'; renderStage(); return; }
    var locked = 0, cap = (window.CFG && CFG.TRIAL_EXAM_QS) || 10;
    if (plan.trial && qs.length > cap){ locked = qs.length - cap; qs = qs.slice(0, cap); }   // a trial shows how it works without converting the whole PDF
    var e = { id:'x' + Date.now().toString(36), locked:locked, title:file.name.replace(/\.pdf$/i, '').slice(0, 70), ts:Date.now(), pages:d.pages, qs:qs, key:qs.some(function(q){ return q.ans; }) ? 'pdf' : '', attempts:[] };
    exams.unshift(e); exams = exams.slice(0, 20); saveExams();
    idbPut(e.id, keep);
    EX.id = e.id; EX.screen = 'start'; EX.busy = ''; EX.msg = '';
  } catch(err){ EX.busy = ''; EX.msg = 'That file could not be read as a PDF.'; }
  renderStage();
}
async function aiKey(e){
  if (EX.busy) return;
  EX.busy = 'key'; renderStage();
  var todo = e.qs.filter(function(q){ return !q.ans || !q.why; });
  for (var i = 0; i < todo.length; i += 10){
    var part = todo.slice(i, i + 10);
    try {
      var r = await sample('For each multiple-choice question below, give the single best answer letter and a short explanation: 2 or 3 plain sentences on why it is right and why the closest wrong choice is not. If a question says "Keyed answer", use that letter and explain it. Use Canadian spelling. No em dashes or semicolons. Output only one JSON object mapping the question number to {"a":"B","why":"..."}. No other text.\n\n'
        + part.map(function(q){ return q.n + '. ' + q.stem + '\n' + q.opts.map(function(o){ return o.k + '. ' + o.t; }).join('\n') + (q.ans ? '\nKeyed answer: ' + q.ans : ''); }).join('\n\n'), { modelTier:'default' });
      var m = r.text.match(/\{[\s\S]*\}/), o = m ? JSON.parse(m[0]) : {};
      part.forEach(function(q){
        var v = o[q.n] || {}, a = String((typeof v === 'string' ? v : v.a) || '').toUpperCase();
        if (!q.ans && q.opts.some(function(x){ return x.k === a; })){ q.ans = a; q.ai = true; }
        if (v.why && (!q.ai || q.ans === a)) q.why = String(v.why).slice(0, 700);
      });
    } catch(err){}
  }
  if (!e.key && e.qs.some(function(q){ return q.ai; })) e.key = 'ai';
  saveExams(); EX.busy = ''; renderStage();
}

/* ---------- the original pages, kept on this device ---------- */
function idb(){ return new Promise(function(res, rej){ try { var r = indexedDB.open('sr_pdfs', 1); r.onupgradeneeded = function(){ r.result.createObjectStore('f'); }; r.onsuccess = function(){ res(r.result); }; r.onerror = rej; } catch(e){ rej(e); } }); }
function idbPut(k, v){ idb().then(function(db){ db.transaction('f', 'readwrite').objectStore('f').put(v, k); }, function(){}); }
function idbGet(k){ return idb().then(function(db){ return new Promise(function(res){ var r = db.transaction('f').objectStore('f').get(k); r.onsuccess = function(){ res(r.result || null); }; r.onerror = function(){ res(null); }; }); }, function(){ return null; }); }
function idbDel(k){ idb().then(function(db){ db.transaction('f', 'readwrite').objectStore('f').delete(k); }, function(){}); }
async function showPage(e, p){
  var buf = await idbGet(e.id); if (!buf || !p) return;
  var lib = await pdfjs(), doc = await lib.getDocument({ data:buf.slice(0) }).promise, page = await doc.getPage(p), vp = page.getViewport({ scale:1.6 });
  var c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext:c.getContext('2d'), viewport:vp }).promise;
  document.getElementById('zoomImg').src = c.toDataURL('image/jpeg', 0.85); document.getElementById('zoom').hidden = false;
}

/* ---------- sitting it ---------- */
function exScore(e, a){ var keyed = e.qs.filter(function(q){ return q.ans; }), ok = keyed.filter(function(q){ return a.answers[q.n] === q.ans; }).length; return { keyed:keyed.length, ok:ok, pct:keyed.length ? Math.round(100 * ok / keyed.length) : null }; }
function exMissed(e, a){ return e.qs.filter(function(q){ return q.ans && a.answers[q.n] !== q.ans; }); }
function exNextRetry(e, a, from){ var m = exMissed(e, a).filter(function(q){ return !a.second[q.n]; }); if (!m.length) return -1; var later = m.filter(function(q){ return e.qs.indexOf(q) > from; })[0] || m[0]; return e.qs.indexOf(later); }
function exClock(s){ s = Math.max(0, Math.round(s)); var m = Math.floor(s / 60), h = Math.floor(m / 60); return (h ? h + ':' + ('0' + (m % 60)).slice(-2) : m) + ':' + ('0' + (s % 60)).slice(-2); }
function exStart(){
  var e = exGet(); if (!e) return;
  EX.run = { i:0, answers:{}, flags:{}, cross:{}, shown:{}, first:{}, second:{}, sc:EX.sc, start:Date.now(), limit:EX.mode === 'timed' ? e.qs.length * 90 : 0, mode:EX.mode };
  EX.screen = 'run'; renderStage(); window.scrollTo({ top:0 });
}
function exFinish(){
  var e = exGet(), r = EX.run; if (!e || !r) return;
  var ans = {}, k; for (k in r.answers) ans[k] = r.answers[k]; for (k in r.first) ans[k] = r.first[k];
  var a = { ts:Date.now(), secs:Math.round((Date.now() - r.start) / 1000), answers:ans, flags:r.flags, mode:r.mode, sc:!!r.sc, second:r.second || {} };
  a.score = exScore(e, a); e.attempts.unshift(a); e.attempts = e.attempts.slice(0, 5); saveExams();
  EX.run = null; EX.screen = 'results'; EX.rev = -1; renderStage(); window.scrollTo({ top:0 });
}
setInterval(function(){
  if (view !== 'exam' || EX.screen !== 'run' || !EX.run) return;
  var r = EX.run, el = document.getElementById('exTimer'), used = (Date.now() - r.start) / 1000;
  if (r.limit && used >= r.limit){ exFinish(); return; }
  if (el) el.textContent = r.limit ? exClock(r.limit - used) : exClock(used);
}, 1000);
function coachFromExam(e, q){
  var c = newCase({ src:e.title, num:String(q.n), text:q.stem + '\n\nAnswer choices:\n' + q.opts.map(function(o){ return o.k + '. ' + o.t; }).join('\n') });
  cases.push(c); view = 'coach'; cur = cases.length - 1; renderAll(); window.scrollTo({ top:0 }); gen(c);
}

/* ---------- screens ---------- */
var XI = {
  doc:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  flag:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4h11l-1.5 4L16 12H5"/></svg>'
};
function exHomeHTML(){
  var h = '';
  if (!SR.user) return '<section class="panel hero"><h2>Turn a PDF of practice questions into an exam</h2><p class="muted">Drop in a PDF, sit it timed or in tutor mode, then review every miss with your senior. Sign in to use exam mode.</p><div class="row"><button type="button" class="btn" data-go="account">Sign in</button></div></section>';
  h += '<section class="panel hero"><h2>Turn a PDF of practice questions into an exam</h2><p class="muted">Sit it timed or in tutor mode. Then review every miss with your senior. The PDF is read in your browser and stays on this device.</p>';
  if (EX.busy === 'read') h += waitHTML(EX.msg || 'Reading the PDF').replace('<span>', '<span id="exMsg">');
  else h += '<label class="drop" id="exDrop"><strong>Drop a PDF here, or choose a file</strong><span class="muted sm">Text PDFs with lettered answer choices work best. An answer key at the end is picked up on its own.</span><input type="file" id="exFile" accept="application/pdf"></label>'
    + (EX.msg ? '<p class="er">' + esc(EX.msg) + ' <button type="button" class="lnk" data-h="report" data-code="exam_pdf" data-where="exam" data-msg="' + esc(EX.msg) + '">Report this</button></p>' : '');
  h += '</section>';
  if (exams.length){
    h += '<section class="panel"><h2>Your exams</h2><div class="exlist">' + exams.map(function(e){
      var a = e.attempts[0], sc = a && a.score && a.score.pct !== null ? a.score.pct + '%' : (a ? 'Done' : 'New');
      return '<div class="exrow"><button type="button" class="exopen" data-ex="open" data-id="' + e.id + '">' + XI.doc + '<span><b>' + esc(e.title) + '</b><em>' + e.qs.length + ' questions' + (e.key ? '' : ' · no answer key') + '</em></span></button><span class="exsc' + (a ? '' : ' new') + '">' + sc + '</span><button type="button" class="lnk" data-ex="del" data-id="' + e.id + '">Remove</button></div>';
    }).join('') + '</div></section>';
  }
  return h;
}
function exStartHTML(e){
  var a = e.attempts[0], keyed = e.qs.filter(function(q){ return q.ans; }).length;
  var h = '<div class="qhead"><button type="button" class="lnk" data-ex="home">All exams</button></div><section class="panel"><h2>' + esc(e.title) + '</h2>'
    + (e.locked ? '<div class="fb warn"><b>Free trial</b>This exam has the first ' + e.qs.length + ' of ' + (e.qs.length + e.locked) + ' questions. The other ' + e.locked + ' unlock when your PGY3 tier starts. Add the PDF again then.</div>' : '')
    + '<p class="muted">' + e.qs.length + ' questions' + (e.pages ? ' from ' + e.pages + ' pages' : '') + '. ' + (keyed === e.qs.length ? 'Answer key found.' : keyed ? 'Answer key found for ' + keyed + ' of them.' : 'No answer key in this PDF.') + (e.key === 'ai' ? ' Some answers were keyed by Senior Resident, not the publisher.' : '') + '</p>';
  var noWhy = e.qs.some(function(q){ return !q.why; });
  if (keyed < e.qs.length || noWhy) h += '<div class="row"><button type="button" class="btn ghost sm" data-ex="key"' + (EX.busy ? ' disabled' : '') + '>' + (EX.busy === 'key' ? 'Writing' : (keyed < e.qs.length ? 'Key the rest and write explanations' : 'Write explanations with Senior Resident')) + '</button><span class="muted sm">' + (keyed < e.qs.length ? 'Its best answers and explanations, clearly marked. Not an official key.' : 'A short explanation for every question, shown after you answer.') + '</span></div>';
  h += '<div class="seg" role="radiogroup" aria-label="Mode"><button type="button" role="radio" aria-checked="' + (EX.mode === 'tutor') + '" data-ex="mode" data-m="tutor">Tutor</button><button type="button" role="radio" aria-checked="' + (EX.mode === 'timed') + '" data-ex="mode" data-m="timed">Timed</button></div>'
    + '<p class="muted sm">' + (EX.mode === 'tutor' ? 'See whether you were right after each question, with coaching one tap away.' : '90 seconds a question, ' + exClock(e.qs.length * 90) + ' in total. Scored only when you submit at the end. The review is where the learning happens.') + '</p>'
    + '<button type="button" class="sctog' + (EX.sc ? ' on' : '') + '" role="switch" aria-checked="' + EX.sc + '" data-ex="sc"><i></i><span><b>Second chance</b><em>Miss a question and the answer stays hidden. You get one more try first, in tutor mode straight away and in timed mode during review. Your score still counts your first answer only.</em></span></button>'
    + '<div class="row"><button type="button" class="btn" data-ex="start">Start</button>' + (a ? '<button type="button" class="btn ghost" data-ex="results">Last result</button>' : '') + '</div></section>';
  return h;
}
function exQHTML(e, q, picked, reveal, cross, dead){
  var h = '<h2 class="exstem">' + esc(q.stem) + '</h2><div class="opts">';
  q.opts.forEach(function(o){
    var cls = '';
    if (reveal && q.ans){ if (o.k === q.ans) cls = ' r-good sel'; else if (o.k === picked) cls = ' r-bad sel'; }
    else if (o.k === picked) cls = ' on';
    if (cross && cross[o.k] && o.k !== picked) cls += ' crossed';
    if (dead && o.k === dead && !reveal) cls += ' crossed r-bad';
    else if (dead && o.k === dead && reveal && o.k !== q.ans) cls += ' r-bad';
    h += '<button type="button" class="opt' + cls + '" data-ex="pick" data-k="' + o.k + '"' + (reveal || (dead && o.k === dead) ? ' disabled' : '') + '><kbd>' + o.k + '</kbd><span class="t">' + esc(o.t) + '</span></button>';
  });
  return h + '</div>';
}
function exRunHTML(e){
  var r = EX.run, q = e.qs[r.i], picked = r.answers[q.n], reveal = r.mode === 'tutor' && r.shown[q.n];
  var h = '<div class="exbar"><b>' + esc(e.title) + '</b><span class="spacer"></span><span class="extime" id="exTimer">' + (r.limit ? exClock(r.limit - (Date.now() - r.start) / 1000) : exClock((Date.now() - r.start) / 1000)) + '</span><button type="button" class="btn ghost sm" data-ex="end">End exam</button></div>';
  var f1 = r.first[q.n];
  h += '<div class="exlay">' + '<nav class="exnav" aria-label="Questions">' + e.qs.map(function(x, k){ return '<button type="button" class="' + (k === r.i ? 'cur ' : '') + (r.answers[x.n] || r.first[x.n] ? 'ans ' : '') + (r.flags[x.n] ? 'flg' : '') + '" data-ex="goto" data-i="' + k + '">' + (k + 1) + '</button>'; }).join('') + '</nav>';
  h += '<main class="card"><div class="step"><span>Question ' + (r.i + 1) + ' of ' + e.qs.length + '</span><button type="button" class="flagb' + (r.flags[q.n] ? ' on' : '') + '" data-ex="flag">' + XI.flag + (r.flags[q.n] ? 'Flagged' : 'Flag') + '</button></div>' + exQHTML(e, q, picked, reveal, r.cross[q.n], f1);
  if (f1 && !reveal) h += fbHtml('warn', esc(f1) + ' is not it. The answer stays hidden. Go back to the stem, find the clue that rules ' + esc(f1) + ' out, and pick again.', 'Second chance');
  if (reveal){
    h += q.ans ? fbHtml(picked === q.ans ? 'good' : 'bad', 'The answer is ' + esc(q.ans) + '.' + (f1 ? (picked === q.ans ? ' You got there on your second chance. Your score counts the first answer.' : ' Two tries. This one is worth working through with your senior.') : '') + (q.ai ? ' Keyed by Senior Resident, not the publisher.' : ''), picked === q.ans ? (f1 ? 'Got it on the second try' : 'Correct') : 'Not quite') : fbHtml('note', 'This PDF has no answer for this question. Work it through with your senior.', 'No key');
    if (q.why) h += fbHtml('note', esc(q.why), 'Explanation by Senior Resident');
    h += '<div class="row"><button type="button" class="btn ghost sm" data-ex="coach">Coach me through it</button>' + (q.page ? '<button type="button" class="btn ghost sm" data-ex="page">Original page</button>' : '') + '</div>';
  }
  h += '<div class="row foot"><button type="button" class="btn ghost" data-ex="prev"' + (r.i === 0 ? ' disabled' : '') + '>Back</button><span class="spacer"></span>';
  if (r.mode === 'tutor' && picked && !reveal) h += '<button type="button" class="btn" data-ex="check">' + (f1 ? 'Check second chance' : 'Check') + '</button>';
  else h += r.i < e.qs.length - 1 ? '<button type="button" class="btn" data-ex="next">Next</button>' : '<button type="button" class="btn" data-ex="end">Finish</button>';
  h += '</div></main></div>';
  return h;
}
function exResultsHTML(e){
  var a = e.attempts[0]; if (!a) return exStartHTML(e);
  a.second = a.second || {};
  var s = a.score, missed = exMissed(e, a), blank = e.qs.filter(function(q){ return !a.answers[q.n]; }).length;
  var tried = missed.filter(function(q){ return a.second[q.n]; }), won = tried.filter(function(q){ return a.second[q.n].ok; }).length, left = a.sc ? missed.length - tried.length : 0;
  var h = '<div class="qhead"><button type="button" class="lnk" data-ex="home">All exams</button><span class="spacer"></span><button type="button" class="lnk" data-ex="restart">Sit it again</button></div>';
  h += '<section class="panel exres"><div class="ring" style="--p:' + (s.pct === null ? 0 : s.pct) + '"><b>' + (s.pct === null ? '—' : s.pct + '%') + '</b></div><div><h2>' + esc(e.title) + '</h2><p class="muted">' + (s.pct === null ? 'No answer key, so there is no score. Review each question with your senior.' : s.ok + ' of ' + s.keyed + ' correct on the first pass') + ' · ' + exClock(a.secs) + (blank ? ' · ' + blank + ' left blank' : '') + '</p>'
    + (a.sc && tried.length ? '<p class="scline"><b>' + (s.ok + won) + ' of ' + s.keyed + '</b> after second chance. ' + won + ' of ' + tried.length + ' misses recovered.</p>' : '')
    + (e.key === 'ai' ? '<p class="muted sm">Some answers were keyed by Senior Resident, not the publisher.</p>' : '') + '</div></section>';
  if (missed.length) h += '<section class="panel revkey"><div><h2>The score is the start. The review is the point.</h2><p class="muted">' + (left ? left + ' missed ' + (left === 1 ? 'question is' : 'questions are') + ' waiting. The answers stay hidden until you have taken your second chance on each one.' : (a.sc ? 'Every miss has had its second chance. Now work the ones you missed twice with your senior.' : 'Go through every miss and ask what clue you read past.')) + '</p></div>' + (left ? '<button type="button" class="btn" data-ex="scnext">Start second chance review</button>' : '') + '</section>';
  if (EX.rev >= 0 && e.qs[EX.rev]){
    var q = e.qs[EX.rev], picked = a.answers[q.n], isMiss = q.ans && picked !== q.ans, sec = a.second[q.n], hold = a.sc && isMiss && !sec;
    h += '<main class="card"><div class="step"><span>Question ' + (EX.rev + 1) + ' of ' + e.qs.length + '</span><em>' + (picked ? 'You picked ' + esc(picked) : 'Left blank') + (sec ? ', then ' + esc(sec.pick) : '') + '</em></div>';
    if (hold){
      h += exQHTML(e, q, EX.pick2, false, null, picked || '-')
        + fbHtml('warn', (picked ? esc(picked) + ' was not it.' : 'You left this one blank.') + ' The answer stays hidden. Read the stem again and commit to one.', 'Second chance')
        + '<div class="row"><button type="button" class="btn" data-ex="sccheck"' + (EX.pick2 ? '' : ' disabled') + '>Check second chance</button><span class="spacer"></span><button type="button" class="lnk" data-ex="scskip">Show me the answer</button><button type="button" class="btn ghost" data-ex="revclose">Close</button></div></main>';
    } else {
      var nx = a.sc ? exNextRetry(e, a, EX.rev) : -1;
      h += exQHTML(e, q, sec ? sec.pick : picked, true, null, sec ? picked : null)
        + (sec ? fbHtml(sec.ok ? 'good' : 'bad', sec.skip ? 'You asked to see the answer. It is ' + esc(q.ans) + '.' : sec.ok ? 'You found ' + esc(q.ans) + ' on your second chance. Now say out loud which clue you read past the first time.' : 'The answer is ' + esc(q.ans) + '. Two misses on one question means this one needs your senior.', sec.skip ? 'Answer shown' : sec.ok ? 'Got it on the second try' : 'Missed twice') : '')
        + (q.ans ? '' : fbHtml('note', 'This PDF has no answer for this question.', 'No key'))
        + (q.why ? fbHtml('note', esc(q.why), 'Explanation by Senior Resident') : '')
        + '<div class="row"><button type="button" class="btn' + (nx >= 0 && !(sec && !sec.ok) ? ' ghost' : '') + '" data-ex="coach">Coach me through it</button>' + (q.page ? '<button type="button" class="btn ghost" data-ex="page">Original page</button>' : '') + '<span class="spacer"></span>' + (nx >= 0 ? '<button type="button" class="btn' + (sec && !sec.ok ? ' ghost' : '') + '" data-ex="scnext">Next miss</button>' : '') + '<button type="button" class="btn ghost" data-ex="revclose">Close</button></div></main>';
    }
  }
  h += '<section class="panel"><div class="row"><h2>Review</h2><span class="spacer"></span><span class="muted sm">' + missed.length + ' to go over</span></div><div class="exgrid">' + e.qs.map(function(q, k){
    var p = a.answers[q.n], st = !q.ans ? 'nk' : (p === q.ans ? 'ok' : (a.second[q.n] && a.second[q.n].ok ? 'sc' : (p ? 'no' : 'bl')));
    return '<button type="button" class="' + st + (k === EX.rev ? ' cur' : '') + (a.flags[q.n] ? ' flg' : '') + '" data-ex="rev" data-i="' + k + '">' + (k + 1) + '</button>'; }).join('') + '</div><p class="legend"><i class="ok"></i>Correct<i class="sc"></i>Second chance<i class="no"></i>Missed<i class="bl"></i>Blank<i class="nk"></i>No key</p></section>';
  return h;
}
function examHTML(){
  var e = exGet();
  if (!e || EX.screen === 'home') return exHomeHTML();
  if (EX.screen === 'run' && EX.run) return exRunHTML(e);
  if (EX.screen === 'results') return exResultsHTML(e);
  return exStartHTML(e);
}

/* ---------- input ---------- */
stage.addEventListener('change', function(ev){ if (ev.target.id === 'exFile'){ if (!proGate()) return; examFromPdf(ev.target.files[0]); } });
stage.addEventListener('drop', function(ev){ if (ev.target.closest('#exDrop')){ ev.preventDefault(); var f = ev.dataTransfer.files[0]; if (f && proGate()) examFromPdf(f); } });
['dragover','dragenter'].forEach(function(n){ stage.addEventListener(n, function(ev){ var d = ev.target.closest('#exDrop'); if (d){ ev.preventDefault(); d.classList.add('over'); } }); });
stage.addEventListener('contextmenu', function(ev){
  var o = ev.target.closest('[data-ex="pick"]'); if (!o || view !== 'exam' || !EX.run) return;
  ev.preventDefault(); var e = exGet(), q = e.qs[EX.run.i], c = EX.run.cross[q.n] = EX.run.cross[q.n] || {}; c[o.dataset.k] = !c[o.dataset.k]; renderStage();
});
stage.addEventListener('click', function(ev){
  var el = ev.target.closest('[data-ex]'); if (!el || view !== 'exam') return;
  var act = el.dataset.ex, e = exGet(), r = EX.run;
  if (act === 'open'){ EX.id = el.dataset.id; EX.screen = exGet() && exGet().attempts.length ? 'results' : 'start'; EX.rev = -1; EX.msg = ''; }
  else if (act === 'del'){ exams = exams.filter(function(x){ return x.id !== el.dataset.id; }); saveExams(); idbDel(el.dataset.id); }
  else if (act === 'home'){ EX.screen = 'home'; EX.msg = ''; }
  else if (act === 'mode'){ EX.mode = el.dataset.m; }
  else if (act === 'sc'){ EX.sc = !EX.sc; try { localStorage.setItem('sr_second', EX.sc ? '1' : '0'); } catch(x){} }
  else if (!r && e && e.attempts[0] && (act === 'pick' || act === 'sccheck' || act === 'scskip' || act === 'scnext')){
    var a0 = e.attempts[0], qv = e.qs[EX.rev]; a0.second = a0.second || {};
    if (act === 'scnext'){ var ni = exNextRetry(e, a0, EX.rev); EX.pick2 = ''; if (ni >= 0){ EX.rev = ni; renderStage(); var c2 = stage.querySelector('main.card'); if (c2) c2.scrollIntoView({ block:'start', behavior:'smooth' }); return; } }
    else if (qv && act === 'pick'){ EX.pick2 = EX.pick2 === el.dataset.k ? '' : el.dataset.k; }
    else if (qv && act === 'sccheck' && EX.pick2){ a0.second[qv.n] = { pick:EX.pick2, ok:EX.pick2 === qv.ans }; EX.pick2 = ''; saveExams(); }
    else if (qv && act === 'scskip'){ a0.second[qv.n] = { pick:'', ok:false, skip:true }; EX.pick2 = ''; saveExams(); }
  }
  else if (act === 'key'){ if (e && proGate()) aiKey(e); return; }
  else if (act === 'start' || act === 'restart'){ exStart(); return; }
  else if (act === 'results'){ EX.screen = 'results'; }
  else if (act === 'rev'){ EX.rev = +el.dataset.i; EX.pick2 = ''; renderStage(); var cd = stage.querySelector('main.card'); if (cd) cd.scrollIntoView({ block:'start', behavior:'smooth' }); return; }
  else if (act === 'revclose'){ EX.rev = -1; }
  else if (act === 'coach'){ var q0 = r ? e.qs[r.i] : e.qs[EX.rev]; if (q0) coachFromExam(e, q0); return; }
  else if (act === 'page'){ var q1 = r ? e.qs[r.i] : e.qs[EX.rev]; if (q1) showPage(e, q1.page); return; }
  else if (r && e){
    var q = e.qs[r.i];
    if (act === 'pick'){ if (r.mode === 'tutor' && r.shown[q.n]) return; if (r.first[q.n] === el.dataset.k) return; r.answers[q.n] = r.answers[q.n] === el.dataset.k ? undefined : el.dataset.k; if (!r.answers[q.n]) delete r.answers[q.n]; }
    else if (act === 'check'){
      var pk = r.answers[q.n];
      if (r.sc && q.ans && pk && pk !== q.ans && !r.first[q.n]){ r.first[q.n] = pk; delete r.answers[q.n]; }
      else { if (r.first[q.n]) r.second[q.n] = { pick:pk, ok:pk === q.ans }; r.shown[q.n] = true; }
    }
    else if (act === 'flag'){ r.flags[q.n] = !r.flags[q.n]; if (!r.flags[q.n]) delete r.flags[q.n]; }
    else if (act === 'next'){ r.i = Math.min(e.qs.length - 1, r.i + 1); window.scrollTo({ top:0 }); }
    else if (act === 'prev'){ r.i = Math.max(0, r.i - 1); window.scrollTo({ top:0 }); }
    else if (act === 'goto'){ r.i = +el.dataset.i; window.scrollTo({ top:0 }); }
    else if (act === 'end'){ exFinish(); return; }
  }
  renderStage();
});
document.addEventListener('keydown', function(ev){
  if (view !== 'exam' || EX.screen !== 'run' || !EX.run || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  var tg = ev.target; if (tg && /^(INPUT|TEXTAREA)$/.test(tg.tagName)) return;
  var e = exGet(), r = EX.run, q = e.qs[r.i];
  if (/^[a-j]$/i.test(ev.key)){ var k = ev.key.toUpperCase(); if (q.opts.some(function(o){ return o.k === k; }) && !(r.mode === 'tutor' && r.shown[q.n]) && r.first[q.n] !== k){ r.answers[q.n] = k; renderStage(); } }
  else if (ev.key === 'Enter' || ev.key === 'ArrowRight'){ var b = stage.querySelector('[data-ex="check"],[data-ex="next"]'); if (b){ ev.preventDefault(); b.click(); } }
  else if (ev.key === 'ArrowLeft'){ var p = stage.querySelector('[data-ex="prev"]:not([disabled])'); if (p) p.click(); }
});

if (location.hash==='#exam'){ history.replaceState(null, '', location.pathname + location.search); go('exam'); }
