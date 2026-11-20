/* Senior Resident interface */
var stage = document.getElementById('stage'), tabsEl = document.getElementById('tabs'), topEl = document.getElementById('top'), modalEl = document.getElementById('modal');
var statusMsg = '', LABEL = { good:'Correct', warn:'Partly', bad:'Not quite', note:'Noted' };
var IC = {
  plus:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  chart:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  user:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  read:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>',
  check:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  pager:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="9" width="14" height="11" rx="2.5"/><path d="M6.5 13h7M6.5 16.5h4"/><path d="M16 5.5a5 5 0 0 1 4.5 4.5M16 2a8.5 8.5 0 0 1 8 8" transform="translate(-1.5 .5)"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
  logo:'<svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b8cf0"/><stop offset="1" stop-color="#0f3a80"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#lg)"/><path d="M25 11h14a3 3 0 0 1 3 3v8h8a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-8v8a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3v-8h-8a3 3 0 0 1-3-3V25a3 3 0 0 1 3-3h8v-8a3 3 0 0 1 3-3z" fill="#fff"/><path d="M24 31l8-7 8 7M24 40l8-7 8 7" fill="none" stroke="#1a5fb4" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
function fbHtml(cls, text, lab){ return '<div class="fb '+cls+'"><b>'+esc(lab||LABEL[cls])+'</b>'+text+'</div>'; }
function waitHTML(t, stop){ return '<div class="wait"><span class="dots"><i></i><i></i><i></i></span><span>'+esc(t)+'</span>'+(stop?'<span class="spacer"></span><button type="button" class="btn ghost sm" data-act="stop">Stop</button>':'')+'</div>'; }
function money(n){ return '$' + n; }

/* ---------- top bar ---------- */
function pillHTML(){
  if (!billingLive()) return '<button type="button" class="pill beta" data-go="plan">Early access</button>';
  if (plan.name==='pro') return '<button type="button" class="pill pro" data-go="plan">'+IC.bolt+'Pro</button>';
  var left = Math.max(0, plan.limit - plan.used);
  return '<button type="button" class="pill'+(left?'':' out')+'" data-go="plan">'+left+' of '+plan.limit+' left today</button>';
}
function renderTop(){
  var u = SR.user, ini = u ? esc((u.email||'?').charAt(0).toUpperCase()) : '';
  topEl.innerHTML = '<a class="brand" href="'+(EMBED?'#':'../')+'"'+(EMBED?' data-go="coach"':'')+'>'+IC.logo+'<span>Senior Resident</span></a><span class="spacer"></span>'
    + pillHTML()
    + '<nav class="nav" aria-label="Sections">'
    + '<button type="button" class="ib'+(view==='coach'?' on':'')+'" data-go="new" title="New question" aria-label="New question">'+IC.plus+'</button>'
    + (EMBED?'':'<button type="button" class="ib'+(view==='exam'?' on':'')+'" data-go="exam" title="Exam mode" aria-label="Exam mode"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg></button>')
    + '<button type="button" class="ib'+(view==='review'?' on':'')+'" data-go="review" title="Review" aria-label="Review">'+IC.chart+'</button>'
    + '<button type="button" class="ib'+(view==='account'?' on':'')+(u?' av':'')+'" data-go="account" title="Account" aria-label="Account">'+(u?ini:IC.user)+'</button>'
    + '</nav>';
}
window.onPlan = function(){ renderTop(); if (view==='account') renderStage(); };
function tabLabel(c){ var id = c.qid && !/^h/.test(c.qid) ? esc(c.qid) : ''; if (c.num) return 'Q' + esc(c.num) + (id ? '<em> - QID' + id + '</em>' : ''); if (id) return '<em>QID' + id + '</em>'; return esc(c.title || (c.queued ? 'Queued' : 'Reading')); }
function renderTabs(){
  if (view!=='coach' || !cases.length){ tabsEl.innerHTML = ''; tabsEl.hidden = true; return; }
  tabsEl.hidden = false;
  tabsEl.innerHTML = cases.map(function(c,k){
    var state = c.st.solved ? 'done' : (c.generating || c.queued ? 'busy' : '');
    return '<button type="button" class="tab '+state+'" role="tab" aria-selected="'+(k===cur)+'" data-case="'+k+'"><i></i><span>'+tabLabel(c)+'</span></button>';
  }).join('');
  var a = tabsEl.querySelector('[aria-selected="true"]'); if (a && a.scrollIntoView) a.scrollIntoView({ block:'nearest', inline:'nearest' });
}

/* ---------- new question ---------- */
function levelHTML(){
  return '<div class="seg" role="radiogroup" aria-label="Difficulty">'+LEVELS.map(function(l){
    var lock = l[0]==='hardest' && !isPro();
    return '<button type="button" role="radio" aria-checked="'+(l[0]===LEVEL)+'" data-act="lvl" data-l="'+l[0]+'">'+l[1]+(lock?' '+IC.bolt:'')+'</button>'; }).join('')+'</div>'
    + '<p class="muted sm">'+esc(LEVELS.filter(function(l){return l[0]===LEVEL})[0][2])+'</p>';
}
function uploadHTML(){
  var h = '';
  if (EMBED){
    h += '<section class="panel hero"><h2>Open a question in your question bank</h2><p class="muted">Senior Resident reads the stem, the answer choices and any images, then walks you to the answer one decision at a time.</p>'
      + '<div class="row"><button type="button" class="btn" data-act="grab">'+IC.read+'Read the question on screen</button></div>'
      + (statusMsg?'<p class="muted sm" id="status">'+esc(statusMsg)+'</p>':'') + '</section>';
  }
  h += '<section class="panel"><h2>'+(EMBED?'Or add one yourself':'Add a question')+'</h2>' + levelHTML();
  h += '<label class="drop" id="drop"><strong>Drop screenshots here, or choose files</strong><span class="muted sm">Paste works too. Any question bank, PDF page or textbook.</span>'
    + '<input type="file" id="file" accept="image/png,image/jpeg,image/webp" multiple></label>';
  if (up.files.length){
    h += '<div class="thumbs">'+up.files.map(function(f,k){
      return '<div class="thumb"><img src="'+f.url+'" alt="Screenshot '+(k+1)+'" data-zoomurl="'+f.url+'"><button type="button" data-act="rm" data-k="'+k+'" aria-label="Remove screenshot '+(k+1)+'">×</button><span>'+(k+1)+'</span></div>';
    }).join('')+'</div>';
  }
  if (up.files.length>1){
    var M=[['each','Each screenshot is its own question'],['one','All of them are one question'],['custom','Other: group them myself']];
    h += '<div class="modes" role="radiogroup" aria-label="How the screenshots group">'+M.map(function(m){ return '<label class="check"><input type="radio" name="mode" data-mode="'+m[0]+'"'+(up.mode===m[0]?' checked':'')+'><span>'+m[1]+'</span></label>'; }).join('')+'</div>';
    if (up.mode==='custom') h += '<input type="text" id="groups" class="inp" placeholder="Screenshot numbers, for example 1+2, 3, 4+5" value="'+esc(up.groups)+'">';
  }
  h += '<textarea id="qtext" placeholder="Or paste one or more questions with their answer choices">'+esc(up.text)+'</textarea>'
    + '<div class="row"><button type="button" class="btn" data-act="start"'+((up.files.length||up.text.trim())?'':' disabled')+'>Start coaching</button>'
    + '<span class="muted sm">Leave out patient names and other identifying details.</span></div></section>';
  return h;
}

/* ---------- a question ---------- */
function progressTotal(c){ if (c.steps.some(function(x){ return x.type==='final'; })) return c.steps.length; return Math.max(c.steps.length + 1, Math.min(5, (c.meta&&+c.meta.stepCount)||5)); }
function barHTML(c){
  var n = progressTotal(c), h='';
  for (var k=0;k<n;k++){
    var f = c.st.first[k], cls = (k<c.st.i||c.st.solved) ? ('done'+(f && f!=='good' ? ' slip' : '')) : (k===c.st.i?'now':'');
    h += '<i class="'+cls+'"></i>';
  }
  return h;
}
function renderBar(c){ var b=document.getElementById('bar'); if (b) b.innerHTML = barHTML(c); }
function stemHTML(c){
  if (EMBED || (!c.files.length && !c.text)) return '';
  var h = '<details class="stem"><summary>Your question</summary>';
  if (c.files.length) h += '<div class="thumbs">'+c.files.map(function(f,k){ return '<div class="thumb"><img src="'+f.url+'" alt="Screenshot '+(k+1)+'" data-zoomurl="'+f.url+'"></div>'; }).join('')+'</div>';
  if (c.text) h += '<div class="txt">'+esc(c.text)+'</div>';
  return h + '</details>';
}
function otherBlock(c, i){
  var st=c.st, open=st.otherOpen[i];
  var h = '<button type="button" class="othl'+(open?' on':'')+'" data-act="other">'+(open?'Hide my own reasoning':'Other: explain it in your own words')+'</button>';
  if (open){
    h += '<textarea id="otherTxt" placeholder="Write your reasoning here">'+esc((st.other[i]&&st.other[i].text)||'')+'</textarea>'
      +  '<div class="row"><button type="button" class="btn ghost sm" data-act="saveother"'+(st.otherBusy[i]?' disabled':'')+'>'+(st.otherBusy[i]?'Checking':'Check my reasoning')+'</button></div>';
  }
  return h;
}
function pageHTML(c, i){
  var st = c.st, th = (st.pages && st.pages[i]) || [], open = st.pageOpen && st.pageOpen[i];
  if (!open) return '<button type="button" class="pagebtn" data-act="pageopen">'+IC.pager+'<span><b>Still stuck?</b> Page the attending</span></button>';
  var h = '<div class="pagebox"><div class="pagehd">'+IC.pager+'<b>Attending</b><span>on call</span><span class="spacer"></span><button type="button" class="lnk" data-act="pageopen">Hide</button></div>';
  th.forEach(function(m){ h += '<div class="pg '+(m.role==='user'?'me':'att')+'">'+(m.role==='user'?'':'<i>Attending</i>')+'<span>'+esc(m.content)+'</span></div>'; });
  h += '<div class="pg att" id="pageLive"'+(c.pageBusy?'':' hidden')+'><i>Attending</i><span>'+esc(c.pageLive||'')+'</span></div>';
  if (c.pageBusy && !c.pageLive) h += waitHTML('Paging');
  h += '<div class="askrow"><textarea id="pageTxt" rows="1" placeholder="What is confusing you on this step?"></textarea><button type="button" class="btn sm" data-act="pagesend"'+(c.pageBusy?' disabled':'')+'>Page</button></div></div>';
  return h;
}
function recapHTML(c){
  var n = 0, ok = 0, slips = [];
  c.steps.forEach(function(s, i){ var f = c.st.first[i]; if (f===undefined) return; n++; if (f==='good') ok++; else { var k = SKILLS[s.skill] || 'a step'; if (slips.indexOf(k) < 0) slips.push(k); } });
  if (!n) return '';
  return '<p class="recapline"><b>'+ok+' of '+n+'</b> decisions right on the first try.'+(slips.length?' You slipped on '+esc(slips.join(', ').toLowerCase())+'.':'')+'</p>';
}
function revealHTML(c){
  var r = c.reveal, h = '<div class="reveal"><div class="answer"><b>The answer</b>'+esc(r.headline)+'</div>';
  if (r.pearl) h += '<div class="pearl"><b>Pearl</b>'+esc(r.pearl)+(r.trap?'<span class="trap"><b>Trap</b>'+esc(r.trap)+'</span>':'')+'</div>';
  h += recapHTML(c);
  return h + '</div>';
}
var CHIPS = ['Why is my first pick wrong?','Give me a way to remember this','Quiz me with a similar question'];
function chatHTML(c){
  var h = '<div class="chat"><div class="pagehd">'+IC.pager+'<b>Attending</b><span>on call</span></div>';
  c.chat.forEach(function(m){ h += '<div class="bub '+(m.role==='user'?'me':'ai')+'">'+esc(m.content)+'</div>'; });
  h += '<div class="bub ai" id="chatLive"'+(c.chatBusy?'':' hidden')+'>'+esc(c.chatLive||'')+'</div>';
  h += '<div class="askrow"><textarea id="chatTxt" rows="1" placeholder="Still have a question? Page the attending"></textarea><button type="button" class="btn" data-act="ask"'+(c.chatBusy?' disabled':'')+'>Page</button></div>'
    + '<p class="muted sm">For the full explanation, read the one in your question bank.</p></div>';
  return h;
}
function paywallHTML(){
  var signed = !!SR.user;
  return '<div class="paywall">'+IC.logo+'<h2>That is today\'s '+plan.limit+' free questions</h2><p class="muted">They reset at midnight. Pro gives you '+(CFG.PRO_DAILY||40)+' a day and adds Hardest mode, extra help steps and pearl export.</p>'
    + '<div class="row c"><button type="button" class="btn" data-act="upgrade">See Pro</button>'+(signed?'':'<button type="button" class="btn ghost" data-go="account">Sign in</button>')+'</div></div>';
}
function optKey(o, k){ var m = String(o.t||'').match(/^\s*([A-J])[.)]\s+/); return m ? m[1] : String.fromCharCode(65 + k); }
function optText(o){ return String(o.t||'').replace(/^\s*[A-J][.)]\s+/, ''); }
function cardHTML(c){
  var st=c.st, i=st.i, s=c.steps[i], h='';
  if (!s){
    if (c.error && c.error.code==='rate_limited') return paywallHTML();
    if (c.error) return fbHtml('bad', esc(errCopy(c.error)), 'Could not continue') + '<div class="row"><button type="button" class="btn" data-act="retry">Try again</button><button type="button" class="btn ghost" data-h="report" data-where="case">Report this</button></div>';
    if (c.stopped) return fbHtml('note','Stopped. Start again when you are ready.','Stopped') + '<div class="row"><button type="button" class="btn" data-act="retry">Try again</button><button type="button" class="btn ghost" data-h="report" data-where="case">Report this</button></div>';
    if (c.queued) return waitHTML('Waiting for the questions before it');
    if (!c.generating) return fbHtml('note','This step is not ready yet.','One moment') + '<div class="row"><button type="button" class="btn" data-act="retry">Rebuild this question</button></div>';
    return (i===0 ? '<div class="skel"><i style="width:38%"></i><i style="width:92%"></i><i style="width:74%"></i><b></b><b></b><b></b></div>' : '')
      + waitHTML(i===0?'Reading the question':'Preparing the next step', true)
      + (i>0?'<div class="row"><button type="button" class="btn ghost" data-act="back">Back</button></div>':'');
  }
  var elimLike = (s.type==='final'||s.kind2==='elim');
  h += '<div class="step"><span>Step '+(i+1)+' of '+progressTotal(c)+'</span><em>'+esc(SKILLS[s.skill]||'')+'</em></div><h2>'+esc(s.q)+'</h2>';
  var sub = s.sub || '';
  if (s.type==='final' && c.meta && c.meta.optionsFromImage===false) sub = (sub?sub+' ':'') + 'The answer choices were not visible, so these are written for you.';
  if (sub) h += '<p class="sub">'+esc(sub)+'</p>';
  h += '<div class="opts">';
  s.opts.forEach(function(o,k){
    var rk = String(o.t||'').trim().toLowerCase();
    var ruled = elimLike && o.v==='good' && ((st.sel[i]===k) || (st.ruled && st.ruled[rk]));
    var picked = st.sel[i]===k, crossed = !picked && !ruled && st.cross && st.cross[i] && st.cross[i][k];
    h += '<button type="button" class="opt'+(picked?' sel r-'+(o.v==='good'?'good':(o.v==='warn'?'warn':'bad')):'')+(ruled&&!picked?' r-good':'')+(crossed?' crossed':'')+(ruled?' ruled':'')+'" data-act="pick" data-k="'+k+'"><kbd>'+optKey(o,k)+'</kbd><span class="t">'+esc(optText(o))+'</span><span class="x" data-act="cross" data-k="'+k+'" role="button" aria-label="Cross out" title="Cross out">abc</span></button>';
  });
  h += '</div>';
  var p = st.sel[i];
  if (p!==undefined){ var o = s.opts[p]; h += fbHtml(o.v==='good'?'good':(o.v==='warn'?'warn':'bad'), esc(o.fb), o.lab); }
  if (st.otherFb[i]) h += fbHtml('note', esc(st.otherFb[i]), 'On your reasoning');
  if (!(st.solved && s.type==='final')) h += pageHTML(c, i);
  if (st.solved && s.type==='final'){
    if (c.reveal){ h += revealHTML(c); c.revealShown = true; h += chatHTML(c); }
    else if (c.generating || c.queued) h += waitHTML(c.queued?'Waiting for the questions before it':'Preparing the explanation');
    else h += fbHtml('bad','The explanation did not come through.','Cut off') + '<div class="row"><button type="button" class="btn" data-act="retry">Try again</button><button type="button" class="btn ghost" data-h="report" data-where="case">Report this</button></div>';
  }
  h += '<div class="row foot"><button type="button" class="btn ghost" data-act="back"'+(i===0?' disabled':'')+'>Back</button><span class="spacer"></span>';
  if (s.type==='final'){
    if (!st.solved) h += c.helpBusy ? '<span class="muted sm">Writing more steps</span>' : '<button type="button" class="btn" data-act="morehelp">Need more help'+(isPro()?'':' '+IC.bolt)+'</button>';
    else h += '<button type="button" class="btn ghost" data-act="restart">Redo</button>'+(EMBED?'':'<button type="button" class="btn" data-go="new">Next question</button>');
  } else {
    var can = st.sel[i]!==undefined || (st.other[i]&&st.other[i].saved);
    h += '<button type="button" class="btn" data-act="next"'+(can?'':' disabled')+'>Continue</button>';
  }
  return h + '</div>';
}
function caseHTML(c){
  var src = [c.src, c.title].filter(Boolean).join(' · ');
  var nar = (c.struck && c.struck.length) ? '<span class="lv nar">'+c.struck.length+' crossed out</span>' : '';
  return '<div class="qhead">'+(src?'<span class="src">'+esc(src)+'</span>':'')+nar+'<span class="lv">'+esc((LEVELS.filter(function(l){return l[0]===(c.level||LEVEL)})[0]||LEVELS[0])[1])+'</span><span class="spacer"></span>'+(EMBED&&c.qid?'<button type="button" class="lnk" data-act="reread" title="Reads which choices you have crossed out in your question bank and rebuilds the steps around the ones left">Re-read my cross-outs</button>':'')+'<button type="button" class="lnk" data-act="closecase">Close</button></div>'
    + stemHTML(c) + '<div class="bar" id="bar" aria-hidden="true">'+barHTML(c)+'</div><main class="card" id="card">'+cardHTML(c)+'</main>';
}

/* ---------- review ---------- */
var pearlQ = '';
function reviewHTML(){
  var rate = stats.done ? Math.round(100*stats.first/stats.done) : 0;
  var h = '<section class="tiles"><div><b>'+streak()+'</b><span>day streak</span></div><div><b>'+stats.done+'</b><span>questions coached</span></div><div><b>'+(stats.done?rate+'%':'—')+'</b><span>clean first pass</span></div></section>';
  var keys = Object.keys(SKILLS).filter(function(k){ return stats.skills[k] && stats.skills[k].n; });
  h += '<section class="panel"><h2>Reasoning profile</h2>';
  if (!keys.length) h += '<p class="muted">Finish a question and this shows which kind of decision costs you the most marks.</p>';
  else {
    keys.sort(function(a,b){ return stats.skills[a].ok/stats.skills[a].n - stats.skills[b].ok/stats.skills[b].n; });
    h += '<p class="muted sm">First-try accuracy by type of decision, weakest first.</p><div class="prof">'+keys.map(function(k){ var b = stats.skills[k], p = Math.round(100*b.ok/b.n);
      return '<div><span>'+esc(SKILLS[k])+'</span><i><u class="'+(p<50?'lo':(p<75?'mid':'hi'))+'" style="width:'+Math.max(4,p)+'%"></u></i><em>'+p+'%</em><small>'+b.n+'</small></div>'; }).join('')+'</div>';
  }
  h += '</section><section class="panel"><div class="row"><h2>Pearls</h2><span class="spacer"></span>'
    + (pearls.length?'<button type="button" class="btn ghost sm" data-act="copypearls">Copy all</button><button type="button" class="btn ghost sm" data-act="exportpearls">Anki export'+(isPro()?'':' '+IC.bolt)+'</button>':'')+'</div>';
  if (!pearls.length) h += '<p class="muted">Every finished question leaves one rule here, with the trap that goes with it.</p>';
  else {
    h += '<input type="search" class="inp" id="pearlQ" placeholder="Search pearls" value="'+esc(pearlQ)+'"><div class="pearls" id="pearlList">'+pearlListHTML()+'</div>';
  }
  h += '</section>';
  if (hist.length){
    h += '<section class="panel"><h2>Recent questions</h2><div class="hist">'+hist.slice(0,12).map(function(x){
      return '<div><span class="mk '+(x.clean?'ok':'slip')+'">'+(x.clean?IC.check:IC.x)+'</span><b>'+esc(x.title)+'</b><span>'+esc(new Date(x.ts).toLocaleDateString(undefined,{month:'short',day:'numeric'}))+'</span></div>'; }).join('')+'</div></section>';
  }
  return h;
}
function pearlListHTML(){
  var q = pearlQ.trim().toLowerCase();
  var list = pearls.filter(function(p){ return !q || (p.pearl+' '+p.trap+' '+p.title+' '+p.topic).toLowerCase().indexOf(q)>=0; }).slice(0, 60);
  if (!list.length) return '<p class="muted">Nothing matches.</p>';
  return list.map(function(p){ return '<article><div class="ph">'+(p.topic?'<span>'+esc(p.topic)+'</span>':'')+'<em>'+esc(p.title)+'</em></div><p>'+esc(p.pearl)+'</p>'+(p.trap?'<p class="trap"><b>Trap</b>'+esc(p.trap)+'</p>':'')+'</article>'; }).join('');
}
function pearlsText(){ return pearls.map(function(p){ return (p.topic?'['+p.topic+'] ':'')+p.pearl+(p.trap?'\n  Trap: '+p.trap:''); }).join('\n\n'); }
function pearlsCSV(){
  function q(s){ return '"'+String(s||'').replace(/"/g,'""')+'"'; }
  return pearls.map(function(p){ return [q(p.title+(p.topic?' ('+p.topic+')':'')+': what is the rule, and what is the trap?'), q(p.pearl+(p.trap?'<br><br><b>Trap:</b> '+p.trap:'')), q('SeniorResident '+(p.topic||'').replace(/\s+/g,'_'))].join(','); }).join('\n');
}

/* ---------- account and plan ---------- */
var authMode = 'in', waitlisted = lsGet('sr_waitlist', false);
function planCardHTML(){
  var h = '<section class="panel plan"><h2>Plan</h2>';
  if (!billingLive()){
    h += '<p><b>Early access.</b> Everything is unlocked while Senior Resident is in early access.</p>'
      + '<p class="muted sm">Pro will be '+money(CFG.PRICE_MONTH)+' '+CFG.CURRENCY+' a month. Early users get first access to launch pricing.</p>'
      + (waitlisted?'<p class="okline">'+IC.check+' You are on the Pro list.</p>':'<div class="row"><button type="button" class="btn" data-act="waitlist">Tell me when Pro opens</button></div>');
  } else if (plan.name==='pro'){
    h += '<p><b>Pro.</b> '+(CFG.PRO_DAILY||40)+' questions a day and every feature.'+(plan.until?' Renews '+esc(new Date(plan.until).toLocaleDateString())+'.':'')+'</p>'
      + (CFG.STRIPE_PORTAL?'<div class="row"><a class="btn ghost" target="_blank" rel="noopener" href="'+esc(CFG.STRIPE_PORTAL)+'">Manage billing</a></div>':'');
  } else {
    h += '<p><b>Free.</b> '+plan.limit+' questions a day. '+Math.max(0,plan.limit-plan.used)+' left today.</p><div class="row"><button type="button" class="btn" data-act="upgrade">Upgrade to Pro</button></div>';
  }
  return h + '</section>';
}
function accountHTML(){
  var u = SR.user, h = '';
  if (!SR.ready) h += '<section class="panel"><h2>Accounts are not switched on</h2><p class="muted">Everything still works without one.</p></section>';
  else if (u){
    h += '<section class="panel"><h2>Account</h2><p>'+esc(u.email||'')+'</p><div class="row"><button type="button" class="btn ghost" data-act="signout">Sign out</button></div></section>';
  } else {
    h += '<section class="panel auth"><h2>'+(authMode==='in'?'Sign in':'Create your account')+'</h2><p class="muted">'+(authMode==='in'?'Your plan and history follow you to any device.':'Takes a few seconds.')+'</p>'
      + '<div id="gis"></div><div class="or"><span>or</span></div>'
      + '<form id="authform"><input class="inp" id="aue" type="email" placeholder="Email" autocomplete="email" required><input class="inp" id="aup" type="password" placeholder="Password (6+ characters)" minlength="6" autocomplete="'+(authMode==='in'?'current-password':'new-password')+'" required><p class="er" id="auerr"></p><button class="btn wide" type="submit">'+(authMode==='in'?'Sign in':'Create account')+'</button></form>'
      + '<button type="button" class="lnk" data-act="authsw">'+(authMode==='in'?'New here? Create an account':'Already have an account? Sign in')+'</button></section>';
  }
  h += planCardHTML();
  var R = [['US','American'],['CA','Canadian'],['UK','British']];
  h += '<section class="panel"><h2>Preferences</h2><div class="pref"><span>Default difficulty</span>'+'<div class="seg">'+LEVELS.map(function(l){ return '<button type="button" role="radio" aria-checked="'+(l[0]===LEVEL)+'" data-act="lvl" data-l="'+l[0]+'">'+l[1]+'</button>'; }).join('')+'</div></div>'
    + '<div class="pref"><span>Spelling and guidelines</span><div class="seg">'+R.map(function(r){ return '<button type="button" role="radio" aria-checked="'+(r[0]===REGION)+'" data-act="region" data-r="'+r[0]+'">'+r[1]+'</button>'; }).join('')+'</div></div>'
    + '<p class="muted sm">Keys: press an option letter to pick it, Enter continues, Backspace goes back. Right-click an option to cross it out.</p></section>'
    + '<p class="legal"><a href="../privacy.html" target="_blank" rel="noopener">Privacy</a><a href="../terms.html" target="_blank" rel="noopener">Terms</a><span>Study aid only. Not medical advice. Not affiliated with any question bank.</span></p>';
  return h;
}
var gsiP = null;
function gsi(){ if (!gsiP) gsiP = new Promise(function(res, rej){ if (window.google && google.accounts && google.accounts.id) return res(); var sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = function(){ res(); }; sc.onerror = rej; document.head.appendChild(sc); setTimeout(rej, 6000); }); return gsiP; }
async function sha256hex(t){ var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.prototype.map.call(new Uint8Array(b), function(x){ return ('0'+x.toString(16)).slice(-2); }).join(''); }
async function mountGoogle(){
  var box = document.getElementById('gis'); if (!box || !CFG.GOOGLE_CLIENT_ID) return;
  function fallback(){ box.innerHTML = '<button type="button" class="btn ghost wide" data-act="goauth">Continue with Google</button>'; }
  try {
    await gsi();
    var raw = Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(16)), function(x){ return ('0'+x.toString(16)).slice(-2); }).join('');
    var hashed = await sha256hex(raw);
    google.accounts.id.initialize({ client_id:CFG.GOOGLE_CLIENT_ID, nonce:hashed, use_fedcm_for_button:true, callback: async function(resp){
      var r = await SR.sb.auth.signInWithIdToken({ provider:'google', token:resp.credential, nonce:raw });
      var er = document.getElementById('auerr'); if (r.error && er) er.textContent = 'Google sign in did not go through. Try again or use email.';
    }});
    box.innerHTML = '';
    google.accounts.id.renderButton(box, { theme:'outline', size:'large', text:'continue_with', shape:'rectangular', width: Math.min(360, box.clientWidth || 300), logo_alignment:'center' });
  } catch(e){ fallback(); }
}
function pricingHTML(){
  var perks = [(CFG.PRO_DAILY||40)+' questions a day, a full block','Hardest mode at exam pace','Narrowing from your cross-outs','Page the attending','Pearl export to Anki'];
  var live = billingLive() && CFG.STRIPE_LINK;
  return '<div class="sheet" role="dialog" aria-label="Senior Resident Pro"><button type="button" class="close" data-act="closemodal" aria-label="Close">×</button>'
    + '<div class="ph2">'+IC.logo+'<h2>Senior Resident PGY2 tier</h2></div><ul class="perks">'+perks.map(function(p){ return '<li>'+IC.check+esc(p)+'</li>'; }).join('')+'</ul>'
    + '<div class="prices one"><div class="price"><b>'+money(CFG.PRICE_MONTH)+'</b><span>a month</span><em>Cancel anytime</em></div></div>'
    + '<p class="muted sm c">The PGY3 tier, '+money(CFG.PRICE_FELLOW||25)+' a month, adds unlimited questions and exam mode from your PDFs.</p>'
    + '<button type="button" class="btn wide" data-act="buy" data-p="month">'+(live?'Get PGY2':'Tell me when paid plans open')+'</button>'
    + '<p class="muted sm c" id="buymsg">'+(live?'Prices in '+esc(CFG.CURRENCY)+'. Secure checkout by Stripe.':'Paid plans are not open yet. You will be first to hear. Prices cover the AI and server costs of running it.')+'</p></div>';
}
function openModal(html){ modalEl.innerHTML = html; modalEl.hidden = false; }
function closeModal(){ modalEl.hidden = true; modalEl.innerHTML = ''; }
async function joinWaitlist(period){
  waitlisted = true; lsSet('sr_waitlist', true);
  if (SR.user && SR.sb){ try { await SR.sb.from('sr_waitlist').insert({ email:SR.user.email, period:period||'' }); } catch(e){} }
}
async function buy(period){
  var link = CFG.STRIPE_LINK, msg = document.getElementById('buymsg');
  if (!billingLive() || !link){ await joinWaitlist(period); if (msg) msg.innerHTML = '<span class="okline">'+IC.check+' You are on the list. You will hear the day Pro opens.</span>'; return; }
  if (!SR.user){ closeModal(); view = 'account'; renderAll(); return; }
  window.open(link + (link.indexOf('?')<0?'?':'&') + 'client_reference_id=' + encodeURIComponent(SR.user.id) + '&prefilled_email=' + encodeURIComponent(SR.user.email||''), '_blank', 'noopener');
  if (msg) msg.textContent = 'Checkout opened in a new tab. Come back here when you are done.';
}

/* ---------- render ---------- */
function progress(c){
  renderTabs();
  if (cases[cur]!==c || view!=='coach') return;
  if (!c.steps[c.st.i] || (c.reveal && c.st.solved && !c.revealShown)) renderStage(); else renderBar(c);
}
function renderStage(){
  renderTabs();
  if (view==='review'){ stage.innerHTML = reviewHTML(); return; }
  if (view==='exam'){ stage.innerHTML = examHTML(); return; }
  if (view==='account'){ stage.innerHTML = accountHTML(); mountGoogle(); return; }
  if (cur===-1 || !cases[cur]){ cur = -1; stage.innerHTML = uploadHTML(); return; }
  var c = cases[cur]; c.revealShown = false;
  /* a question that has nothing yet and is not being built gets built, quietly, instead of showing an error */
  if (!c.steps.length && !c.generating && !c.queued && !c.error && !c.stopped && (c.auto||0) < 2 && (c.text || c.files.length)){ c.auto = (c.auto||0) + 1; gen(c); return; }
  var keep = document.getElementById('chatTxt'), val = keep ? keep.value : '';
  stage.innerHTML = caseHTML(c);
  if (val){ var t = document.getElementById('chatTxt'); if (t) t.value = val; }
}
function renderAll(){ renderTop(); renderStage(); }
function go(v){
  if (v==='new'){ view = 'coach'; cur = -1; }
  else if (v==='plan'){ if (billingLive() && plan.name!=='pro'){ openModal(pricingHTML()); return; } view = 'account'; }
  else view = v;
  renderAll(); window.scrollTo({ top:0 });
}

/* ---------- input ---------- */
function addFiles(list){
  var arr = Array.prototype.slice.call(list||[]).filter(function(f){ return /^image\//.test(f.type); });
  if (!arr.length) return;
  arr.forEach(function(f){ if (up.files.length<MAXIMG) up.files.push({ blob:f, url:URL.createObjectURL(f) }); });
  view = 'coach'; cur = -1; renderAll();
}
document.addEventListener('paste', function(e){ var items = e.clipboardData && e.clipboardData.files; if (items && items.length) addFiles(items); });
stage.addEventListener('change', function(e){
  if (e.target.id==='file') addFiles(e.target.files);
  if (e.target.dataset && e.target.dataset.mode){ up.mode = e.target.dataset.mode; renderStage(); }
});
stage.addEventListener('input', function(e){
  var c = cases[cur];
  if (e.target.id==='groups') up.groups = e.target.value;
  if (e.target.id==='qtext'){ up.text = e.target.value; var b=stage.querySelector('[data-act="start"]'); if (b) b.disabled = !(up.files.length||up.text.trim()); }
  if (e.target.id==='otherTxt' && c) c.st.other[c.st.i] = { text:e.target.value, saved:false };
  if (e.target.id==='pearlQ'){ pearlQ = e.target.value; var l = document.getElementById('pearlList'); if (l) l.innerHTML = pearlListHTML(); }
  if (e.target.id==='chatTxt' || e.target.id==='pageTxt'){ e.target.style.height = 'auto'; e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px'; }
});
['dragover','dragenter'].forEach(function(n){ stage.addEventListener(n, function(e){ var d=e.target.closest('#drop'); if(d){ e.preventDefault(); d.classList.add('over'); } }); });
['dragleave','drop'].forEach(function(n){ stage.addEventListener(n, function(e){ var d=e.target.closest('#drop'); if(d) d.classList.remove('over'); }); });
stage.addEventListener('drop', function(e){ if (e.target.closest('#drop')){ e.preventDefault(); addFiles(e.dataTransfer.files); } });
tabsEl.addEventListener('click', function(e){ var b = e.target.closest('[data-case]'); if(!b) return; cur = +b.dataset.case; renderStage(); window.scrollTo({top:0}); persist(); });
var zoomEl = document.getElementById('zoom');
zoomEl.addEventListener('click', function(){ zoomEl.hidden = true; });
modalEl.addEventListener('click', function(e){
  if (e.target===modalEl || e.target.closest('[data-act="closemodal"]')){ closeModal(); return; }
  var b = e.target.closest('[data-act="buy"]'); if (b) buy(b.dataset.p);
});
document.addEventListener('click', function(e){
  var g = e.target.closest('[data-go]'); if (!g) return;
  e.preventDefault(); go(g.dataset.go);
});
stage.addEventListener('submit', async function(e){
  if (e.target.id!=='authform') return;
  e.preventDefault();
  var em = document.getElementById('aue').value.trim(), pw = document.getElementById('aup').value, er = document.getElementById('auerr'), btn = e.target.querySelector('button');
  btn.disabled = true; er.textContent = '';
  var r = await (authMode==='in' ? SR.signIn(em, pw) : SR.signUp(em, pw));
  btn.disabled = false;
  if (r.error) er.textContent = /invalid login/i.test(r.error.message) ? 'That email and password do not match.' : (/registered/i.test(r.error.message) ? 'That email already has an account. Sign in instead.' : r.error.message);
});
function crossToggle(c, i, k){
  var st = c.st; if (st.sel[i]===k) return;
  if (markRuled(c, i, k, true)){ renderStage(); return; }
  st.cross = st.cross || {}; st.cross[i] = st.cross[i] || {}; st.cross[i][k] = !st.cross[i][k]; renderStage();
}
stage.addEventListener('contextmenu', function(e){
  var o = e.target.closest('.opt[data-act="pick"]'); var c = cases[cur]; if (!o || !c) return;
  e.preventDefault(); crossToggle(c, c.st.i, +o.dataset.k);
});
function pick(c, k){
  var st = c.st, i = st.i, s = c.steps[i]; if (!s || !s.opts[k]) return;
  st.sel[i] = k;
  if (st.first[i]===undefined) st.first[i] = s.opts[k].v;
  if (st.cross && st.cross[i]) st.cross[i][k] = false;
  markRuled(c, i, k, false);
  if (s.type==='final'){
    c.tries = (c.tries||0) + 1;
    st.solved = (s.opts[k].v==='good');
    if (st.solved) saveDone(c);
  }
  renderStage(); persist();
  var fb = stage.querySelector('.fb'); if (fb && fb.scrollIntoView) fb.scrollIntoView({ block:'nearest', behavior:'smooth' });
}
function proGate(){ if (isPro()) return true; openModal(pricingHTML()); return false; }
stage.addEventListener('click', async function(e){
  var z = e.target.closest('[data-zoomurl]');
  if (z){ document.getElementById('zoomImg').src = z.dataset.zoomurl; zoomEl.hidden = false; return; }
  var el = e.target.closest('[data-act]'); if(!el) return;
  var act = el.dataset.act;
  if (act==='lvl'){ if (el.dataset.l==='hardest' && !proGate()) return; LEVEL=el.dataset.l; try{ localStorage.setItem('sr_level', LEVEL); }catch(x){} renderStage(); return; }
  if (act==='region'){ REGION = el.dataset.r; try{ localStorage.setItem('sr_region', REGION); }catch(x){} renderStage(); return; }
  if (act==='rm'){ var f=up.files.splice(+el.dataset.k,1)[0]; if(f) URL.revokeObjectURL(f.url); renderStage(); return; }
  if (act==='grab'){ statusMsg = 'Reading the question'; renderStage(); if (window.parent!==window) window.parent.postMessage({ type:'sr-grab' }, '*'); return; }
  if (act==='upgrade'){ openModal(pricingHTML()); return; }
  if (act==='waitlist'){ await joinWaitlist(''); renderStage(); return; }
  if (act==='signout'){ await SR.signOut(); return; }
  if (act==='authsw'){ authMode = authMode==='in' ? 'up' : 'in'; renderStage(); return; }
  if (act==='goauth'){ SR.sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: location.href.split('#')[0] } }); return; }
  if (act==='copypearls'){ try { await navigator.clipboard.writeText(pearlsText()); el.textContent = 'Copied'; } catch(x){ el.textContent = 'Copy blocked'; } return; }
  if (act==='exportpearls'){
    if (!proGate()) return;
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([pearlsCSV()], { type:'text/csv' })); a.download = 'senior-resident-pearls.csv'; document.body.appendChild(a); a.click(); a.remove(); return;
  }
  if (act==='start'){
    var groups = groupFiles(up), text = up.text.trim(), lvl = LEVEL;
    up = { files:[], text:'', mode:up.mode, groups:'' };
    el.disabled = true;
    var texts = text ? await splitText(text) : [];
    var jobs = groups.map(function(g){ return { files:g, text:'' }; }).concat(texts.map(function(t){ return { files:[], text:t }; }));
    if (!jobs.length) return;
    var made = jobs.map(function(j){ var c = newCase({ files:j.files, text:j.text, level:lvl, queued:true }); cases.push(c); return c; });
    cur = cases.length - made.length;
    renderStage(); window.scrollTo({top:0});
    for (var q=0;q<made.length;q++){ made[q].queued=false; await gen(made[q]); }
    return;
  }
  var c2 = cases[cur]; if (!c2) return;
  var st = c2.st, i = st.i;
  if (act==='reread'){ statusMsg = ''; if (window.parent!==window) window.parent.postMessage({ type:'sr-grab', reread:true }, '*'); el.textContent = 'Reading'; return; }
  if (act==='closecase'){ if (c2.ctl) c2.ctl.abort(); cases.splice(cur, 1); cur = Math.min(cur, cases.length-1); renderStage(); persist(); return; }
  if (act==='cross'){ e.stopPropagation(); crossToggle(c2, i, +el.dataset.k); return; }
  if (act==='pick') pick(c2, +el.dataset.k);
  else if (act==='other'){ st.otherOpen[i] = !st.otherOpen[i]; renderStage(); var t = document.getElementById('otherTxt'); if (t) t.focus(); }
  else if (act==='saveother'){
    var txt = (document.getElementById('otherTxt').value||'').trim(); if (!txt) return;
    st.other[i] = { text:txt, saved:true }; st.otherOpen[i] = true; checkOther(c2, i, txt);
  }
  else if (act==='next'){ st.i++; renderStage(); window.scrollTo({top:0}); persist(); }
  else if (act==='back'){ if (st.i>0){ st.i--; renderStage(); } }
  else if (act==='morehelp'){ if (proGate()) moreHelp(c2); }
  else if (act==='restart'){ c2.st = fresh(); renderStage(); window.scrollTo({top:0}); }
  else if (act==='stop'){ if (c2.ctl) c2.ctl.abort(); }
  else if (act==='retry'){ c2.steps=[]; c2.reveal=null; c2.meta=null; c2.st=fresh(); c2.error=null; c2.stopped=false; renderStage(); gen(c2); }
  else if (act==='pageopen'){ st.pageOpen = st.pageOpen || {}; st.pageOpen[i] = !st.pageOpen[i]; renderStage(); var pf = document.getElementById('pageTxt'); if (pf) pf.focus(); }
  else if (act==='pagesend'){ var pt = (document.getElementById('pageTxt').value||'').trim(); if (pt) pageAttending(c2, i, pt); }
  else if (act==='chip'){ if (!c2.chatBusy && proGate()) ask(c2, el.textContent); }
  else if (act==='ask'){ var q2 = (document.getElementById('chatTxt').value||'').trim(); if (q2 && !c2.chatBusy && proGate()){ document.getElementById('chatTxt').value = ''; ask(c2, q2); } }
});
document.addEventListener('keydown', function(e){
  if (e.key==='Escape'){ zoomEl.hidden = true; if (!modalEl.hidden) closeModal(); return; }
  var tg = e.target, typing = tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable);
  if (typing){ if ((tg.id==='chatTxt' || tg.id==='pageTxt') && e.key==='Enter' && !e.shiftKey){ e.preventDefault(); var b = stage.querySelector(tg.id==='chatTxt' ? '[data-act="ask"]' : '[data-act="pagesend"]'); if (b) b.click(); } return; }
  if (e.metaKey || e.ctrlKey || e.altKey || view!=='coach' || !modalEl.hidden) return;
  var c = cases[cur]; if (!c || !c.steps[c.st.i]) return;
  var os = c.steps[c.st.i].opts;
  if (/^[1-9]$/.test(e.key)){ var k = +e.key - 1; if (os[k]){ e.preventDefault(); pick(c, k); } }
  else if (/^[a-j]$/i.test(e.key)){ var L = e.key.toUpperCase(), ix = os.findIndex(function(o, j){ return optKey(o, j)===L; }); if (ix>=0){ e.preventDefault(); pick(c, ix); } }
  else if (e.key==='Enter' || e.key==='ArrowRight'){ var n = stage.querySelector('[data-act="next"]:not([disabled])'); if (n){ e.preventDefault(); n.click(); } }
  else if (e.key==='Backspace' || e.key==='ArrowLeft'){ var bk = stage.querySelector('.foot [data-act="back"]:not([disabled])'); if (bk){ e.preventDefault(); bk.click(); } }
});

/* ---------- question bank side panel (Chrome extension) ---------- */
function fromExt(o){ return /^chrome-extension:\/\/[a-p]{32}$/.test(o); }
window.addEventListener('message', async function(e){
  if (!EMBED || !fromExt(e.origin)) return;
  var d = e.data || {};
  if (d.type==='sr-status'){ statusMsg = String(d.text||''); if (view==='coach' && cur===-1) renderStage(); return; }
  if (d.type!=='sr-question') return;
  statusMsg = '';
  var struck = (Array.isArray(d.struck) ? d.struck : []).slice(0, 8).map(function(x){ return String(x).slice(0, 200); });
  if (d.qid){
    var ex = cases.findIndex(function(c){ return c.qid===d.qid; });
    if (ex>=0){
      var oc = cases[ex]; if (d.num) oc.num = String(d.num);
      view = 'coach'; cur = ex;
      if (d.reread && !oc.generating && struck.join('|') !== (oc.struck||[]).join('|')){
        oc.struck = struck; oc.steps = []; oc.meta = null; oc.reveal = null; oc.st = fresh(); oc.error = null; oc.saved = false; renderAll(); gen(oc); return;
      }
      renderAll(); if (d.reread){ statusMsg = ''; var rb = stage.querySelector('[data-act="reread"]'); if (rb) rb.textContent = struck.length ? 'Same cross-outs as before' : 'Nothing crossed out yet'; }
      if (!oc.generating) done(oc); return;
    }
  }
  var files = (d.images||[]).slice(0, 4).map(function(b){ return { blob:b, url:URL.createObjectURL(b) }; });
  var c = newCase({ qid:d.qid||'', num:String(d.num||''), struck:struck, src:d.src||'', files:files, text:d.text||'' });
  cases.push(c); view = 'coach'; cur = cases.length-1; renderAll(); window.scrollTo({top:0});
  await gen(c);
});

/* ---------- start ---------- */
if (EMBED) document.documentElement.classList.add('embed');
restore();
SR.onAuth(function(){ loadPlan(); renderAll(); });
renderAll();
if (EMBED && window.parent !== window) window.parent.postMessage({ type:'sr-ready' }, '*');
if (location.hash==='#pro'){ history.replaceState(null, '', location.pathname + location.search); openModal(pricingHTML()); }
