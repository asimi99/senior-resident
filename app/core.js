var REGION = 'US'; try{ REGION = localStorage.getItem('sr_region') || (/-(CA)$/i.test(navigator.language||'') ? 'CA' : (/-(GB|AU|NZ|IE|IN)$/i.test(navigator.language||'') ? 'UK' : 'US')); }catch(e){}
var SPELL = { CA:'Use Canadian spelling.', US:'Use American spelling.', UK:'Use British spelling.' };
var RULES = [
'You are a clinical reasoning coach for a medical student. The attached image(s) and any typed text hold ONE exam-style question (board or textbook). Read all of it, including every lab value and every answer choice. Ignore any selections, crossouts and highlights the student already made on it.',
'Build a coaching session that walks the student to the answer one decision at a time. NEVER ask the student which choice is the answer, and NEVER state the answer, the diagnosis or the correct choice before the reveal. The student reaches the answer by ruling everything else out.',
'OUTPUT FORMAT: JSON Lines only. One JSON object per line, no line breaks inside an object, no markdown, no code fences, no text outside the JSON. Write these lines in this exact order.',
'LINE 1: {"kind":"meta","title":"short tab label such as 9 years, recurrent vomiting","stemSummary":"plain summary of the stem with every key finding and lab, under 150 words","options":["A. ...","B. ..."],"optionsFromImage":true,"stepCount":5}',
'LINES 2 to 4, up to 3 reasoning steps: {"kind":"step","type":"single","skill":"triage","q":"question","sub":"one short hint","opts":[{"t":"option","v":"good","fb":"feedback"},{"t":"option","v":"warn","fb":"feedback"},{"t":"option","v":"bad","fb":"feedback"}]} where skill is exactly one of: triage (how sick, how urgent), localize (where the problem is), mechanism (what is going on underneath), discriminate (the finding that separates the look-alikes), distractor (how much weight a planted detail deserves), management (what to do next).',
'NEXT, one elimination step: {"kind":"step","type":"elim","opts":[{"t":"A. answer choice text","v":"good","fb":"Yes, eliminate it. reason"},{"t":"B. answer choice text","v":"warn","fb":"Keep it in play. reason"}]} with ONE entry for EVERY answer choice. v is good for the choices a careful reader can rule out from the stem alone, and warn for the ones that stay in play.',
'NEXT, the final step, a second elimination that leaves only the answer: {"kind":"step","type":"final","q":"Two choices are left. Which one does the stem rule out?","opts":[{"t":"B. strongest look-alike choice text","v":"good","fb":"Yes, rule it out. the exact stem clue that excludes it"},{"t":"C. correct answer choice text","v":"warn","fb":"Keep it in play. the stem clue it fits, without naming it as the answer"}]} with EXACTLY 2 entries: the strongest remaining look-alike (good) and the correct answer (warn). Never ask which choice is correct.',
'LAST LINE: {"kind":"reveal","headline":"the correct choice and the diagnosis in one sentence. This is never shown to the student. It is only a private key.","pearl":"ONE short sentence, 18 words or fewer: the rule the student can carry to the next question on this topic. It teaches the pattern. It must NOT say which choice is correct, must not use the words answer or correct, and must not quote the wording of the correct choice.","topic":"body system, for example Cardiovascular"} and nothing else. Do not write a trap, an explanation, a list of reasons, management steps or a comparison table. The question bank already has the explanation.',
'STEP RULES:',
'1. 5 steps at most in total, counting the elimination and final steps (so at most 3 reasoning steps). Pick the 3 most useful of: how sick or how urgent, where the problem is or the mechanism, the finding that discriminates, how much weight a planted distractor deserves. Then eliminate, then the final rule-out.',
'1b. Every step must test a different decision built on a different stem clue. Never ask the same thing twice in other words: if two candidate steps hinge on the same finding or lead to the same conclusion, keep one and drop the other.',
'2. Every step is a decision the student makes from the stem, never recall trivia. Do not name the diagnosis, the disease or the answer in any step question or any feedback. It appears only in the reveal.',
'3. Single steps have exactly 3 options, one good and two plausible wrong ones (bad or warn). Vary where the good option sits. Do not let the longest option be the right one.',
'3b. WORDING. Every step question asks ONE thing in one short plain sentence of 18 words or fewer. Never join two questions with "and". Never use "this", "that" or "it" without the noun it stands for. Each option is one idea in 12 words or fewer, with no "so" or "because" clause: the reasoning belongs in the feedback, not in the option. "sub" is one short hint of 12 words or fewer. Reread every line before you output it: correct grammar, no typos, no missing words, nothing a tired student could read two ways.',
'4. Feedback is 1 or 2 self-contained sentences that point back to a specific line of the stem. For a wrong option say what the stem shows instead. For a right option, teach: say exactly which clue makes it right and what that clue rules out or sets up next. Never give generic praise such as "on track", "good job" or "correct" on its own, and never leave fb empty.',
'5. If the answer choices are not visible, write your own 5 choices, say so by setting optionsFromImage to false, and keep going.',
'6. Answer the way the exam expects. {{REGION}}Put [Likely] after any number you are not sure of.',
'6b. "t" is always the full wording of the option a student reads. Never put a verdict word such as good, bad or warn in "t", that belongs only in "v".',
'7. {{SPELL}} Never use em dashes or semicolons anywhere. Plain, direct sentences.',
'8. If you cannot read a question in the input, output only: {"kind":"error","message":"what is missing"}'
].join('\n');

var LEVELS = [
 ['guided','Guided','Hints on every step, clear right and wrong options.'],
 ['harder','Harder','No hints, every wrong option is a real look-alike, fewer basic steps.'],
 ['hardest','Hardest','Exam pace. Three or four steps that start at the hard decision, four close options each, and feedback that never gives the answer away.']
];
var LEVEL = 'guided'; try{ var lv=localStorage.getItem('sr_level'); if(lv && LEVELS.some(function(x){return x[0]===lv})) LEVEL=lv; }catch(e){}
var LEVEL_RULES = {
 guided: '',
 harder: 'DIFFICULTY: HARDER. These rules override STEP RULES 1 and 3. Use 5 steps in total counting elimination and final (3 reasoning steps): skip the how sick step unless urgency is the point of the question. Leave "sub" as an empty string on every step. In single steps all 3 options must be plausible to a strong student, with both wrong options being the classic look-alike or trap for this exact stem (v warn, not bad). Wrong-option feedback says which stem clue it misses but does not name the right option. Ask about the discriminating detail, not the obvious one.',
 hardest: 'DIFFICULTY: HARDEST. These rules override STEP RULES 1 and 3. Use 4 steps in total counting elimination and final, so only 2 single steps, and they start at the hardest decision in the stem (the discriminating finding and the distractor), never at triage or localisation. Leave "sub" as an empty string. Single steps have exactly 4 options, one good and three close look-alikes, all v warn, written so a student who only half knows the topic picks a wrong one. Wrong-option feedback says only what the stem contradicts, never which option is right. In the elimination step mark only the choices a top student can truly rule out as good.'
};
function buildPrompt(c){
  var p = RULES.replace('{{REGION}}', REGION==='CA' ? 'If Canadian practice differs from the exam answer, add one bullet to "do" saying so. ' : '').replace('{{SPELL}}', SPELL[REGION]);
  if (LEVEL_RULES[c.level||LEVEL]) p += '\n' + LEVEL_RULES[c.level||LEVEL];
  p += '\n\nINPUT: ' + (c.files.length ? c.files.length + ' image(s) are attached.' : 'No images.');
  if (c.text) p += '\nTyped question text from the student:\n' + c.text;
  if (c.struck && c.struck.length) p += '\n\nNARROWING MODE. The student has ALREADY crossed out these answer choices on their own: ' + c.struck.join(' | ') + '\nTreat those as ruled out and never ask about them. The student is stuck between the choices that are still open. Build the 3 reasoning steps ONLY around separating the open choices: each step tests one specific thing that one open choice predicts and another does not (the classic finding, the timing, a lab value, the mechanism or the first-line management), then points back to what the stem actually says. Do NOT output the elimination step (type "elim") at all. The final step lists only the open choices. If the correct answer is one the student crossed out, do not reveal that in the steps, include that choice among the options of the final step as the one to keep in play, and say in the reveal headline that they had crossed it out.';
  return p;
}

/* ---------- state ---------- */
var CFG = window.SR_CONFIG || {};
var EMBED = /[?&]embed=1/.test(location.search), BG = /[?&]bg=1/.test(location.search);
var cases = [], cur = -1, view = 'coach';
var up = { files:[], text:'', mode:'each', groups:'' };
var MAXIMG = 20;
function esc(s){ var d=document.createElement('div'); d.textContent=(s==null?'':String(s)); return d.innerHTML.replace(/"/g,'&quot;'); }
function fresh(){ return { i:0, sel:{}, first:{}, cross:{}, ruled:{}, other:{}, otherOpen:{}, solved:false, otherFb:{}, otherBusy:{}, pages:{}, pageOpen:{} }; }
function lsGet(k, d){ try { var v = JSON.parse(localStorage.getItem(k)); return v==null ? d : v; } catch(e){ return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ return false; } }
function today(){ var d = new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }

/* ---------- accounts ---------- */
var SR = { sb:null, user:null, ready:false, listeners:[] };
(function(){
  if (!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase)) return;
  SR.ready = true;
  SR.sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth:{ persistSession:true, detectSessionInUrl:true } });
  function fire(){ SR.listeners.forEach(function(f){ try { f(SR.user); } catch(e){} }); }
  SR.sb.auth.getSession().then(function(r){ SR.user = r.data.session ? r.data.session.user : null; fire(); });
  SR.sb.auth.onAuthStateChange(function(_e, s){ var was = SR.user && SR.user.id; SR.user = s ? s.user : null; if ((SR.user && SR.user.id) !== was) fire(); });
})();
SR.onAuth = function(f){ SR.listeners.push(f); };
SR.token = async function(){ if (!SR.sb) return null; var r = await SR.sb.auth.getSession(); return r.data.session ? r.data.session.access_token : null; };
SR.signIn = function(email, pw){ return SR.sb.auth.signInWithPassword({ email:email, password:pw }); };
SR.signUp = async function(email, pw){
  var r = await SR.sb.auth.signUp({ email:email, password:pw });
  if (r.error || (r.data && r.data.session)) return r;
  return SR.sb.auth.signInWithPassword({ email:email, password:pw });
};
SR.signOut = function(){ return SR.sb.auth.signOut(); };

/* ---------- plan and allowance ---------- */
var plan = { name:'free', used:0, limit:CFG.FREE_DAILY||5, until:null };
(function(){ var u = lsGet('sr_used', null); if (u && u.day===today()) plan.used = u.n||0; })();
function billingLive(){ return !!CFG.BILLING_LIVE; }
function isPro(){ return !billingLive() || plan.name==='pro'; }
function canStart(){ return isPro() || plan.used < plan.limit; }
function bumpLocal(){ plan.used++; lsSet('sr_used', { day:today(), n:plan.used }); }
async function loadPlan(){
  plan.name = 'free'; plan.until = null; plan.trial = false;
  if (SR.user && SR.sb && billingLive()){
    try {
      var r = await SR.sb.from('sr_profiles').select('plan,current_period_end').eq('user_id', SR.user.id).maybeSingle();
      if (r.data && (r.data.plan==='pro' || r.data.plan==='trial') && (!r.data.current_period_end || new Date(r.data.current_period_end) > new Date())){ plan.name = 'pro'; plan.trial = r.data.plan==='trial'; plan.until = r.data.current_period_end; }
    } catch(e){}
  }
  if (window.onPlan) window.onPlan();
}

/* ---------- coach service ---------- */
var FNS = ['resident','coach'], fnIx = (Date.now() - lsGet('sr_fn', 0) < 6*3600*1000) ? 1 : 0;
function fnUrl(){ return CFG.SUPABASE_URL + '/functions/v1/' + FNS[fnIx]; }
function toB64(blob){
  return new Promise(function(res, rej){
    var img = new Image(), u = URL.createObjectURL(blob);
    img.onload = function(){
      var k = Math.min(1, 1600 / Math.max(img.width, img.height));
      var c = document.createElement('canvas'); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      res({ media_type:'image/jpeg', data:c.toDataURL('image/jpeg', 0.85).split(',')[1] });
    };
    img.onerror = function(){ rej({ code:'image_rejected' }); };
    img.src = u;
  });
}
async function readStream(res, onDelta){
  var rd = res.body.getReader(), dec = new TextDecoder(), buf = '', text = '', mode = null, stop = null, err = null, ended = false;
  function ev(l){
    if (l.indexOf('data:')!==0) return;
    try { var j = JSON.parse(l.slice(5).trim()); } catch(e){ return; }
    if (j.type==='content_block_delta' && j.delta && j.delta.type==='text_delta'){ text += j.delta.text; onDelta && onDelta(text, j.delta.text); }
    else if (j.type==='message_delta' && j.delta && j.delta.stop_reason) stop = j.delta.stop_reason;
    else if (j.type==='message_stop') ended = true;
    else if (j.type==='error') err = (j.error && j.error.type) || 'error';
  }
  for(;;){
    var r = await rd.read(); if (r.done) break;
    var d = dec.decode(r.value, { stream:true });
    if (mode===null){ var h = (buf+d).replace(/^\s+/,''); if (h.length>=6 || h.length && !/^(e|ev|eve|even|event|d|da|dat|data)$/.test(h)) mode = /^(event:|data:)/.test(h) ? 'sse' : 'text'; }
    if (mode==='text'){ if (buf){ d = buf + d; buf=''; } text += d; onDelta && onDelta(text, d); continue; }
    buf += d; if (mode===null) continue;
    var ls = buf.split('\n'); buf = ls.pop(); ls.forEach(ev);
  }
  if (mode!=='text' && buf){ if (mode===null && !/^(event:|data:)/.test(buf.trim())){ text = buf; onDelta && onDelta(text, buf); } else ev(buf); }
  return { text:text, stop:stop, error:err, ended:(mode!=='sse' || ended) };
}
async function sample(input, o){
  o = o || {};
  var body = { input:input, tier:o.modelTier || 'default', kind:o.kind || 'aux', app:'sr' };
  if (o.images && o.images.length){
    try { body.images = await Promise.all(o.images.map(toB64)); } catch(e){ throw { code:'image_rejected', message:'image' }; }
  }
  var tok = await SR.token(), res, payload = JSON.stringify(body);
  for (var hop = 0; hop < 2; hop++){
    try {
      res = await fetch(fnUrl(), { method:'POST', signal:o.signal,
        headers:{ 'Content-Type':'application/json', 'apikey':CFG.SUPABASE_ANON_KEY, 'Authorization':'Bearer '+(tok || CFG.SUPABASE_ANON_KEY) }, body:payload });
    } catch(e){
      if (e && e.name==='AbortError') throw { code:'cancelled', message:'cancelled' };
      if (fnIx===0){ fnIx = 1; lsSet('sr_fn', Date.now()); continue; }
      throw { code:'upstream_error', message:String(e) };
    }
    if (res.status===404 && fnIx===0){ fnIx = 1; lsSet('sr_fn', Date.now()); continue; }
    break;
  }
  var hu = res.headers.get('x-sr-used'), hl = res.headers.get('x-sr-limit'), hp = res.headers.get('x-sr-plan');
  if (hp){ plan.name = hp==='pro' ? 'pro' : 'free'; }
  if (hu!=null && hl!=null && body.kind==='coach'){ plan.used = +hu; plan.limit = +hl; lsSet('sr_used', { day:today(), n:plan.used }); if (window.onPlan) window.onPlan(); }
  if (!res.ok){
    var m = ''; try { m = await res.text(); } catch(e){}
    throw { code: res.status===429 ? 'rate_limited' : (res.status===402 ? 'pro_only' : (res.status===401||res.status===403 ? 'session_expired' : 'upstream_error')), message:m };
  }
  var out;
  try { out = await readStream(res, o.onText ? function(t,d){ o.onText({ text:t, delta:d }); } : null); }
  catch(e){
    if (e && e.name==='AbortError') throw { code:'cancelled', message:'cancelled' };
    throw { code:'upstream_error', message:String(e) };
  }
  if (out.error) throw { code:'upstream_error', message:out.error, text:out.text };
  if (!out.ended) throw { code:'cut_off', message:'stream ended early' };
  if (!out.text.trim()) throw { code:'empty_completion', message:'empty' };
  return { text:out.text, truncated:out.stop==='max_tokens' };
}

/* ---------- building a session ---------- */
var SKILLS = { triage:'Triage', localize:'Localizing', mechanism:'Mechanism', discriminate:'Key finding', distractor:'Distractors', management:'Management', eliminate:'Elimination', final:'Final rule-out' };
function proc(c, line){
  line = line.trim(); if (line.charAt(0)!=='{') return;
  var o; try { o = JSON.parse(line); } catch(e){ return; }
  if (o.kind==='meta'){ c.meta=o; if (o.title) c.title=String(o.title).slice(0,60); }
  else if (o.kind==='step' && o.opts && o.opts.length){
    o.opts = o.opts.filter(function(x){ var t = x && typeof x.t==='string' ? x.t.trim() : ''; return t.length > 3 && !/^(good|bad|warn|option|correct|incorrect|right|wrong)$/i.test(t); });
    o.opts.forEach(function(x){ if (x.v!=='good' && x.v!=='warn' && x.v!=='bad') x.v = 'bad'; if (!x.fb) x.fb = ''; });
    if (o.opts.length < 2 || (o.type==='final' && !o.opts.some(function(x){ return x.v==='good'; }))) { progress(c); return; }
    var nSingle = c.steps.filter(function(x){ return x.kind2==='single'; }).length, nElim = c.steps.filter(function(x){ return x.kind2==='elim'; }).length;
    if (o.type==='final'){ if (c.steps.some(function(x){ return x.type==='final'; })) { progress(c); return; } o.opts = o.opts.slice(0, 3); o.opts.forEach(function(x){ x.lab = x.v==='good' ? 'Ruled out' : 'Keep in play'; x.v = x.v==='good' ? 'good' : 'warn'; }); o.kind2 = 'final'; o.skill = 'final'; }
    else if (o.type==='elim'){ if (nElim>=1) { progress(c); return; } o.kind2 = 'elim'; o.skill = 'eliminate'; }
    else { if (nSingle>=3) { progress(c); return; } o.kind2 = 'single'; if (!SKILLS[o.skill]) o.skill = 'discriminate'; }
    if (o.type==='elim'){
      o.q = 'Which answer choice can you eliminate first?';
      o.sub = 'Pick the one you are most sure the stem rules out.';
      o.type = 'single';
      o.opts.forEach(function(x){ x.lab = x.v==='good' ? 'Good elimination' : 'Keep in play'; x.v = x.v==='good' ? 'good' : 'warn'; });
    }
    c.steps.push(o);
  }
  else if (o.kind==='reveal'){ c.reveal=o; }
  else if (o.kind==='error'){ c.error={ code:'unreadable', message:String(o.message||'') }; }
  progress(c);
}
function newCase(o){
  return Object.assign({ id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), title:'', qid:'', num:'', struck:[], src:'', files:[], text:'', level:LEVEL, meta:null, steps:[], reveal:null, st:fresh(), chat:[], chatBusy:false, error:null, generating:false, queued:false, ts:Date.now() }, o);
}
async function gen(c){
  if (!canStart()){ c.error = { code:'rate_limited' }; c.generating = false; if (cases[cur]===c) renderStage(); done(c); return; }
  c.generating = true; c.error = null; c.stopped = false;
  c.ctl = new AbortController();
  if (cases[cur]===c) renderStage();
  var counted = false;
  for (var attempt = 0; attempt < 4; attempt++){
    var n = 0; c.error = null;
    if (attempt){ c.steps = []; c.meta = null; c.reveal = null; c.st = fresh(); if (cases[cur]===c) renderStage(); }
    try {
      var o = { signal:c.ctl.signal, modelTier:'default', kind: counted ? 'retry' : 'coach',
        onText:function(u){ var ls=u.text.split('\n'); for(; n<ls.length-1; n++) proc(c, ls[n]); } };
      if (c.files.length) o.images = c.files.map(function(f){ return f.blob; });
      counted = true;
      var r = await sample(buildPrompt(c), o);
      var ls = r.text.split('\n'); for(; n<ls.length; n++) proc(c, ls[n]);
      if (!c.steps.length && !c.error) c.error = { code:'empty' };
    } catch(e){
      if (e && e.code==='cancelled'){ c.stopped = true; break; }
      c.error = e || { code:'upstream_error' };
    }
    if (!c.error && !c.steps.some(function(x){ return x.type==='final'; })) c.error = { code:'cut_off' };
    var retry = c.error && /^(upstream_error|empty|empty_completion|cut_off)$/.test(c.error.code);
    if (!retry) break;
    await new Promise(function(r){ setTimeout(r, 600 * (attempt + 1)); });
  }
  if (!c.error && !c.stopped && fnIx===1) bumpLocal();
  c.generating = false;
  if (cases[cur]===c) renderStage();
  if (window.onPlan) window.onPlan();
  done(c);
}
async function done(c){
  try { await persistNow(); } catch(e){}
  if (EMBED && window.parent !== window) window.parent.postMessage({ type:'sr-done', qid:c.qid||'', ok:!c.error && !c.stopped && c.steps.length>0 }, '*');
}
function errCopy(e){
  var m = {
    rate_limited:'You have used today\'s free questions. They reset at midnight.',
    pro_only:'That is part of Pro.',
    session_expired:'Your sign-in expired. Sign in again and retry.',
    upstream_error:'Senior Resident could not be reached. Try again in a moment.',
    cut_off:'The connection dropped before the steps finished.',
    image_rejected:'One of the images could not be read. Try a different screenshot.',
    unreadable:(e&&e.message)||'The question could not be read from what you added.',
    empty:'No steps came back. Try again, or add a clearer screenshot.',
    refused:'This input was declined. Try a different question.'
  };
  return m[e && e.code] || 'Something went wrong while building the steps.';
}
function groupFiles(u){
  var f = u.files; if (!f.length) return [];
  if (u.mode==='one' || f.length===1) return [f.slice(0,4)];
  if (u.mode==='custom' && u.groups.trim()){
    var used = {}, out = [];
    u.groups.split(/[,;\n]+/).forEach(function(part){ var g = (part.match(/\d+/g)||[]).map(Number).filter(function(n){ return n>=1 && n<=f.length && !used[n]; }); g.forEach(function(n){ used[n]=1; }); if (g.length) out.push(g.slice(0,4).map(function(n){ return f[n-1]; })); });
    f.forEach(function(x,k){ if (!used[k+1]) out.push([x]); });
    return out;
  }
  return f.map(function(x){ return [x]; });
}
async function splitText(t){
  if (t.length < 400) return [t];
  try {
    var r = await sample('Split the text below into separate exam questions. Each question is its stem plus its own answer choices. Output only a JSON array of strings, one string per question, keeping the original wording. If it is a single question, output an array with one string.\n\n' + t, { modelTier:'quick' });
    var m = r.text.match(/\[[\s\S]*\]/); var a = m ? JSON.parse(m[0]) : null;
    if (Array.isArray(a) && a.length) return a.filter(function(x){ return typeof x==='string' && x.trim(); }).slice(0,20);
  } catch(e){}
  return [t];
}

/* ---------- side reasoning, follow-up, extra help ---------- */
function ctxText(c){ var m = c.meta || {}; return 'Question summary: ' + (m.stemSummary||'') + '\nAnswer choices: ' + ((m.options||[]).join(' | ')); }
async function checkOther(c, i, txt){
  var st = c.st, s = c.steps[i];
  st.otherBusy[i] = true; st.otherFb[i] = ''; renderStage();
  var prompt = 'You are a clinical reasoning coach. A student is partway through a question and wrote their own reasoning for one step.\n'
    + ctxText(c) + '\nThe step asks: ' + s.q + '\nStudent reasoning: ' + txt
    + '\n\nReply in 2 or 3 short sentences. Say which parts of their reasoning the stem supports and what they have not used yet. Do NOT name the correct answer, the diagnosis or which choice is right, even if their reasoning is wrong. ' + SPELL[REGION] + ' No em dashes or semicolons.';
  try { var r = await sample(prompt, { modelTier:'quick' }); st.otherFb[i] = r.text.trim(); }
  catch(e){ st.otherFb[i] = 'Could not check this one right now. Pick an option to see whether you are on track.'; }
  st.otherBusy[i] = false;
  if (cases[cur]===c && c.st.i===i) renderStage();
}
async function ask(c, q){
  c.chat.push({ role:'user', content:q }); c.chatBusy = true; c.chatLive = '';
  renderStage();
  var rules = 'You are the attending on call for a medical student who just worked through a coached question and now has a follow-up. Answer the exact question concisely in plain language, under 120 words. NEVER state which answer choice is correct, never give its letter, and never say "the answer is". Teach the reasoning and point to the stem clue, and let the student draw the conclusion. If they ask directly for the answer, tell them it is the one choice they did not rule out and to check it in their question bank. ' + SPELL[REGION] + ' No em dashes or semicolons. No markdown. If they ask for a similar question, write one short vignette with 5 choices and wait for their answer.\n'
    + ctxText(c) + '\nPrivate key, never reveal it: ' + ((c.reveal&&c.reveal.headline)||'');
  var turns = [{ role:'user', content:rules }].concat(c.chat.slice(-8));
  try {
    var r = await sample(turns, { modelTier:'default', onText:function(u){
      c.chatLive = u.text; var el=document.getElementById('chatLive'); if (el && cases[cur]===c){ el.hidden=false; el.textContent=u.text; }
    }});
    c.chat.push({ role:'assistant', content:r.text.trim() });
  } catch(e){ c.chat.push({ role:'assistant', content:(e&&e.text)||'Could not answer that right now. Try again in a moment.' }); }
  c.chatBusy = false; c.chatLive = '';
  if (cases[cur]===c) renderStage();
  persist();
}
async function pageAttending(c, i, msg){
  var st = c.st, s = c.steps[i]; if (!s || c.pageBusy) return;
  st.pages = st.pages || {}; var th = st.pages[i] = st.pages[i] || [];
  var level = th.filter(function(m){ return m.role==='assistant'; }).length;
  th.push({ role:'user', content:msg }); c.pageBusy = true; c.pageLive = ''; renderStage();
  var picked = st.sel[i]!==undefined ? s.opts[st.sel[i]] : null;
  var rules = 'You are the attending physician on a teaching service. A medical student working through an exam question one step at a time is stuck on a step and has paged you. Reply like a short page back: 2 to 4 plain sentences, warm and direct, no greeting, no markdown, no lists.\n'
    + 'NEVER name the diagnosis, the correct answer choice, or which option of this step is right. The student must still make the decision.\n'
    + 'Answer the exact question the student asked, first and directly. Use the stem to do it. '
    + (level===0 ? 'Then, if it helps, point to the one stem finding worth a second look.'
      : 'The student has paged before on this step, so be more explicit: explain the concept behind this step plainly and, if needed, say why one wrong option does not fit. Still do not say which option is right.') + '\n'
    + SPELL[REGION] + ' No em dashes or semicolons.\n\n' + ctxText(c)
    + '\nCurrent step asks: ' + s.q + '\nOptions on this step: ' + s.opts.map(function(o){ return o.t; }).join(' | ')
    + (picked ? '\nThe student last picked: ' + picked.t + ' (' + (picked.v==='good' ? 'which is right' : 'which is not right') + ')' : '\nThe student has not picked yet.');
  var turns = [{ role:'user', content:rules + '\n\nStudent page: ' + th[0].content }].concat(th.slice(1).slice(-6));
  if (turns.length > 1 && turns[turns.length-1].role !== 'user') turns.push({ role:'user', content:msg });
  try {
    var r = await sample(turns, { modelTier:'default', onText:function(u){
      c.pageLive = u.text; var el = document.getElementById('pageLive'); if (el && cases[cur]===c && c.st.i===i){ el.hidden = false; el.lastChild.textContent = u.text; }
    }});
    th.push({ role:'assistant', content:r.text.trim() });
  } catch(e){ th.push({ role:'assistant', content:'The page did not go through. Try again in a moment.' }); }
  c.pageBusy = false; c.pageLive = '';
  if (cases[cur]===c) renderStage();
  persist();
}
function markRuled(c, i, k, toggle){
  var s = c.steps[i], st = c.st; if (!s || !(s.type==='final'||s.kind2==='elim')) return false;
  var o = s.opts[k]; if (!o || o.v!=='good') return false;
  var rk = String(o.t||'').trim().toLowerCase(); st.ruled = st.ruled || {};
  st.ruled[rk] = toggle ? !st.ruled[rk] : true; return true;
}
async function moreHelp(c){
  if (c.helpBusy) return;
  var st = c.st, f = c.steps.findIndex(function(x){ return x.type==='final'; }); if (f<0) return;
  var left = c.steps[f].opts.map(function(o){ return o.t; });
  var asked = c.steps.slice(0, f).map(function(x){ return x.q; }).filter(Boolean);
  c.helpBusy = true; renderStage();
  var prompt = 'You are a clinical reasoning coach. A student is stuck choosing between the last answer choices of a question.\n' + ctxText(c)
    + '\nChoices still in play: ' + left.join(' | ')
    + '\nSteps already asked (do not repeat them or ask the same thing in other words): ' + (asked.join(' | ') || 'none')
    + '\n\nWrite 2 new reasoning steps that help the student separate ONLY these remaining choices, each built on a different clue from the stem (a discriminating finding, timing, a lab value, a contraindication or what each choice would predict). NEVER name the diagnosis or say which choice is correct.'
    + '\nOutput JSON Lines only, one object per line, no other text: {"kind":"step","type":"single","q":"question","sub":"one short hint","opts":[{"t":"option","v":"good","fb":"feedback"},{"t":"option","v":"warn","fb":"feedback"},{"t":"option","v":"bad","fb":"feedback"}]}'
    + '\nExactly 3 options per step, one good. Feedback is 1 or 2 sentences pointing to a specific stem clue. ' + SPELL[REGION] + ' No em dashes or semicolons.';
  var add = [];
  try {
    var r = await sample(prompt, { modelTier:'default' });
    r.text.split('\n').forEach(function(l){
      l = l.trim(); if (l.charAt(0)!=='{') return;
      var o; try { o = JSON.parse(l); } catch(e){ return; }
      if (o.kind!=='step' || !o.q || !o.opts || o.opts.length < 2) return;
      o.opts.forEach(function(x){ if (x.v!=='good' && x.v!=='warn' && x.v!=='bad') x.v = 'bad'; if (!x.fb) x.fb = ''; });
      o.type = 'single'; o.kind2 = 'help'; o.skill = 'discriminate'; add.push(o);
    });
  } catch(e){}
  c.helpBusy = false;
  if (!add.length){ st.otherFb[f] = 'Could not write more steps right now. Try again in a moment.'; renderStage(); return; }
  add = add.slice(0, 3);
  ['sel','first','cross','other','otherOpen','otherFb','otherBusy','pages','pageOpen'].forEach(function(key){
    var m = st[key]; if (!m) return; var nm = {};
    Object.keys(m).forEach(function(k){ var n = +k; nm[n >= f ? n + add.length : n] = m[k]; });
    st[key] = nm;
  });
  delete st.sel[f + add.length]; delete st.first[f + add.length];
  Array.prototype.splice.apply(c.steps, [f, 0].concat(add));
  st.i = f; renderStage(); window.scrollTo({top:0});
  persist();
}

/* ---------- progress, pearls, stats ---------- */
var stats = lsGet('sr_stats_v1', { days:{}, skills:{}, done:0, first:0 });
var pearls = lsGet('sr_pearls_v1', []);
var hist = lsGet('sr_hist_v1', []);
function streak(){
  var n = 0, d = new Date();
  if (!stats.days[today()]) d.setDate(d.getDate()-1);
  for(;;){ var k = d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); if (!stats.days[k]) break; n++; d.setDate(d.getDate()-1); }
  return n;
}
function saveDone(c){
  if (c.saved) return; c.saved = true;
  var clean = true;
  c.steps.forEach(function(s, i){
    var f = c.st.first[i]; if (f===undefined) return;
    var k = s.skill || 'discriminate', b = stats.skills[k] = stats.skills[k] || { n:0, ok:0 };
    b.n++; if (f==='good') b.ok++; else clean = false;
  });
  stats.done++; if (clean) stats.first++;
  stats.days[today()] = (stats.days[today()]||0) + 1;
  lsSet('sr_stats_v1', stats);
  var r = c.reveal || {};
  var entry = { id:c.id, title:c.title||'Question', topic:r.topic||'', clean:clean, tries:c.tries||1, ts:Date.now(), src:c.src||'' };
  hist.unshift(entry); hist = hist.slice(0, 200); lsSet('sr_hist_v1', hist);
  if (r.pearl){ pearls.unshift({ id:c.id, title:entry.title, topic:entry.topic, pearl:r.pearl, trap:r.trap||'', answer:r.headline||'', ts:entry.ts }); pearls = pearls.slice(0, 400); lsSet('sr_pearls_v1', pearls); }
  if (SR.user && SR.sb){ SR.sb.from('stemcoach_history').insert({ title:entry.title, tries:entry.tries }).then(function(){}, function(){}); }
}

/* ---------- keep sessions across reloads ---------- */
var SKEY = 'sr_cases_v1', lastSaved = '', persistT = null;
function b64(blob){ return new Promise(function(res){ var r = new FileReader(); r.onload = function(){ res(r.result); }; r.onerror = function(){ res(''); }; r.readAsDataURL(blob); }); }
function toBlob(u){ try { var p = u.split(','), m = (p[0].match(/:(.*?);/)||[])[1]||'image/png', b = atob(p[1]), a = new Uint8Array(b.length); for (var i=0;i<b.length;i++) a[i]=b.charCodeAt(i); return new Blob([a],{type:m}); } catch(e){ return null; } }
function persist(){ clearTimeout(persistT); persistT = setTimeout(persistNow, 250); }
async function persistNow(){
  var keep = cases.slice(-12), out = [];
  for (var i=0;i<keep.length;i++){
    var c = keep[i];
    if (!c.filesData) c.filesData = await Promise.all((c.files||[]).map(function(f){ return b64(f.blob); }));
    out.push({ id:c.id, title:c.title, qid:c.qid, num:c.num, struck:c.struck||[], src:c.src, text:c.text, level:c.level, meta:c.meta, steps:c.steps, reveal:c.reveal, st:c.st, chat:c.chat, error:c.error, generating:c.generating, saved:c.saved, tries:c.tries, ts:c.ts, filesData:c.filesData });
  }
  var j; try { j = JSON.stringify({ cur: cases[cur] ? cases[cur].id : '', cases: out }); } catch(e){ return; }
  if (j === lastSaved) return;
  try { localStorage.setItem(SKEY, j); lastSaved = j; }
  catch(e){ out.forEach(function(o){ o.filesData = []; }); try { j = JSON.stringify({ cur:'', cases:out }); localStorage.setItem(SKEY, j); lastSaved = j; } catch(e2){} }
}
function restore(){
  var d = lsGet(SKEY, null);
  if (!d || !d.cases || !d.cases.length) return;
  d.cases.forEach(function(o){
    var files = (o.filesData||[]).map(toBlob).filter(Boolean).map(function(b){ return { blob:b, url:URL.createObjectURL(b) }; });
    var c = Object.assign({ chatBusy:false, queued:false }, o, { files:files, st: Object.assign(fresh(), o.st||{}), steps:o.steps||[], chat:o.chat||[] });
    var resume = c.generating; c.generating = false;
    cases.push(c);
    if (resume){ c.steps = []; c.meta = null; c.reveal = null; c.st = fresh(); setTimeout(function(){ gen(c); }, 50); }
  });
  var ix = cases.findIndex(function(c){ return c.id === d.cur; });
  cur = ix >= 0 ? ix : (EMBED ? cases.length - 1 : -1);
}
