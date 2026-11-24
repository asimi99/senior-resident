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
  logo:'<svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b2f36"/><stop offset="1" stop-color="#0b0d10"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#lg)"/><path d="M25 11h14a3 3 0 0 1 3 3v8h8a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-8v8a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3v-8h-8a3 3 0 0 1-3-3V25a3 3 0 0 1 3-3h8v-8a3 3 0 0 1 3-3z" fill="#fff"/><path d="M24 31l8-7 8 7M24 40l8-7 8 7" fill="none" stroke="#14171c" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
function fbHtml(cls, text, lab){ return '<div class="fb '+cls+'"><b>'+esc(lab||LABEL[cls])+'</b>'+text+'</div>'; }
function waitHTML(t, stop){ return '<div class="wait"><span class="dots"><i></i><i></i><i></i></span><span>'+esc(t)+'</span>'+(stop?'<span class="spacer"></span><button type="button" class="btn ghost sm" data-act="stop">Stop</button>':'')+'</div>'; }
function money(n){ return '$' + n; }

/* ---------- top bar ---------- */
function pillHTML(){
  if (!billingLive()) return EMBED ? '' : '<button type="button" class="pill beta" data-go="plan">Early access</button>';
  if (plan.name==='pro' || plan.name==='chief') return '<button type="button" class="pill pro" data-go="plan">'+IC.bolt+(plan.name==='chief'?'Chief':'Resident')+'</button>';
  var left = Math.max(0, plan.limit - plan.used);
  return '<button type="button" class="pill'+(left?'':' out')+'" data-go="plan">'+left+' of '+plan.limit+' left today</button>';
}
function userInitials(u){
  if (!u) return '';
  var n = String(((u.user_metadata||{}).full_name || (u.user_metadata||{}).name || '')).trim();
  if (n){ var p = n.split(/\s+/); return esc((p[0].charAt(0) + (p.length > 1 ? p[p.length-1].charAt(0) : '')).toUpperCase()); }
  return esc((u.email||'?').charAt(0).toUpperCase());
}
var EXAM_IC = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';
var PLAN_IC = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 15l2 2 4-4"/></svg>';
var HELP_IC = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 16.5v.1"/></svg>';
var acctOpen = false;
function acctMenuHTML(){
  var u = SR.user, pl = plan.name==='chief' ? 'Chief' : plan.name==='pro' ? (plan.trial ? 'Resident (free trial)' : 'Resident') : 'Free';
  if (!u) return '<div class="acmenu" role="menu"><p class="acnm">Not signed in</p><button type="button" data-acct="signin">Sign in</button><button type="button" data-acct="signup">Create account</button><hr><button type="button" data-acct="pricing">Plans and pricing</button></div>';
  var nm = (u.user_metadata||{}).full_name || '';
  return '<div class="acmenu" role="menu"><div class="achd"><span class="acav">'+userInitials(u)+'</span><div>'+(nm?'<b>'+esc(nm)+'</b>':'')+'<span>'+esc(u.email||'')+'</span></div></div>'
    + '<div class="acplan"><span>Plan</span><b>'+esc(pl)+'</b></div>'
    + (plan.name==='pro'||plan.name==='chief' ? '<button type="button" data-acct="manage">Manage subscription</button>' : '<button type="button" data-acct="pricing">Upgrade</button>')
    + '<hr><button type="button" data-acct="account">Account and preferences</button><button type="button" data-acct="schedule">My study plan</button><button type="button" data-acct="review">Statistics</button>'
    + '<button type="button" data-acct="help">Help and feedback</button><hr><button type="button" data-acct="signout">Sign out</button></div>';
}
var THEMES = [['navy','Navy','#1c4872','#e3e6f0'],['rose','Rose','#7a1f45','#c2366f'],['forest','Forest','#1d4a37','#2f8a5f'],['mono','Black and white','#111111','#ffffff'],['plum','Plum','#3b2a5e','#6d4bb0'],['teal','Teal','#0e4a55','#138a9c']];
function curTheme(){ return document.documentElement.dataset.sr || 'navy'; }
function themesHTML(){ var c = curTheme(); return '<div class="themes" role="radiogroup" aria-label="Colour">' + THEMES.map(function(t){ return '<button type="button" role="radio" aria-checked="'+(t[0]===c)+'" data-theme-pick="'+t[0]+'" title="'+t[1]+'"><i style="background:linear-gradient(135deg,'+t[2]+' 50%,'+t[3]+' 50%)"></i><span>'+t[1]+'</span></button>'; }).join('') + '</div>'; }
document.addEventListener('click', function(e){
  var b = e.target.closest('[data-theme-pick]'); if (!b) return;
  var t = b.dataset.themePick; document.documentElement.dataset.sr = t;
  try { localStorage.setItem('sr_theme', t); } catch(_){}
  document.querySelectorAll('[data-theme-pick]').forEach(function(x){ x.setAttribute('aria-checked', String(x.dataset.themePick===t)); });
});
function renderTop(){
  var u = SR.user, ini = userInitials(u);
  document.body.classList.toggle('site', !EMBED);
  var onCoach = view==='coach';
  if (EMBED){
    topEl.innerHTML = '<a class="brand" href="#" data-go="coach">'+IC.logo+'<span>Senior Resident</span></a><span class="spacer"></span>' + pillHTML()
      + '<nav class="nav" aria-label="Sections"><button type="button" class="ib'+(view==='review'?' on':'')+'" data-go="review" title="Your progress" aria-label="Your progress">'+IC.chart+'</button>'
      + '<button type="button" class="ib" data-h="open" title="Help and feedback" aria-label="Help and feedback">'+HELP_IC+'</button>'
      + '<button type="button" class="ib'+(view==='account'?' on':'')+(u?' av':'')+'" data-go="account" title="Account" aria-label="Account">'+(u?ini:IC.user)+'</button></nav>';
    return;
  }
  var site = [['home','Home'],['how','How it works'],['pricing','Pricing']];
  var tools = [['new','Coach',IC.plus,onCoach],['exam','Exam mode',EXAM_IC,view==='exam'],['schedule','Study plan',PLAN_IC,view==='schedule'],['review','Statistics',IC.chart,view==='review']];
  topEl.innerHTML = '<a class="brand" href="#" data-go="home">'+IC.logo+'<span>Senior Resident</span></a>'
    + '<nav class="sitetabs" aria-label="Site">' + site.map(function(t){ return '<a href="#'+(t[0]==='schedule'?'plan':t[0]==='home'?'':t[0])+'" data-go="'+t[0]+'" class="'+(view===t[0]?'on':'')+'">'+t[1]+'</a>'; }).join('') + '</nav>'
    + '<span class="spacer"></span>'
    + '<nav class="tooltabs" aria-label="Tools">' + tools.map(function(t){ return '<button type="button" data-go="'+t[0]+'" class="tt'+(t[3]?' on':'')+'">'+t[2]+'<span>'+t[1]+'</span></button>'; }).join('') + '</nav>'
    + pillHTML()
    + '<div class="acwrap"><button type="button" class="ib'+(acctOpen?' on':'')+(u?' av':'')+'" data-acct="toggle" title="Account" aria-label="Account" aria-haspopup="menu" aria-expanded="'+acctOpen+'">'+(u?ini:IC.user)+'</button>'+(acctOpen?acctMenuHTML():'')+'</div>';
}
document.addEventListener('click', function(e){
  var b = e.target.closest('[data-acct]');
  if (!b){ if (acctOpen && !e.target.closest('.acmenu')){ acctOpen = false; renderTop(); } return; }
  var a = b.dataset.acct;
  if (a === 'toggle'){ acctOpen = !acctOpen; renderTop(); return; }
  acctOpen = false;
  if (a === 'signin'){ authMode = 'in'; go('account'); }
  else if (a === 'signup'){ authMode = 'up'; go('account'); }
  else if (a === 'pricing'){ go('pricing'); }
  else if (a === 'manage'){ renderTop(); openPortal(b); }
  else if (a === 'help'){ renderTop(); var h = document.querySelector('[data-h="open"]'); if (h) h.click(); else if (typeof openHelp === 'function') openHelp(); }
  else if (a === 'signout'){ SR.signOut(); renderTop(); }
  else go(a);
});
document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && acctOpen){ acctOpen = false; renderTop(); } });
window.onPlan = function(){ renderTop(); if (view==='account') renderStage(); };
function tabLabel(c){ var id = c.qid && !/^h/.test(c.qid) ? esc(c.qid) : ''; if (c.num) return 'Q' + esc(c.num) + (id ? '<em> - QID' + id + '</em>' : ''); if (id) return '<em>QID' + id + '</em>'; return esc(c.title || (c.queued ? 'Queued' : 'Reading')); }
function renderTabs(){
  if (view!=='coach' || !cases.length){ tabsEl.innerHTML = ''; tabsEl.hidden = true; return; }
  tabsEl.hidden = false;
  tabsEl.innerHTML = cases.map(function(c,k){
    var state = c.st.solved ? 'done' : (c.generating || c.queued ? 'busy' : '');
    return '<button type="button" class="tab '+state+'" role="tab" aria-selected="'+(k===cur)+'" data-case="'+k+'"><i></i><span>'+tabLabel(c)+'</span></button>';
  }).join('');
  var a = tabsEl.querySelector('[aria-selected="true"]');
  /* scroll only the tab strip sideways, never the page */
  if (a){ var l = a.offsetLeft - tabsEl.offsetLeft, r = l + a.offsetWidth; if (l < tabsEl.scrollLeft) tabsEl.scrollLeft = l; else if (r > tabsEl.scrollLeft + tabsEl.clientWidth) tabsEl.scrollLeft = r - tabsEl.clientWidth; }
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
var attOpen = false;
function attGear(){ return '<button type="button" class="ibs'+(attOpen?' on':'')+'" data-act="attcfg" data-tip="Customize your attending" aria-label="Customize your attending" aria-expanded="'+attOpen+'"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.700 1.700 0 0 0 .3 1.800l.1.100a2 2 0 1 1-2.800 2.800l-.1-.1a1.700 1.700 0 0 0-1.800-.3 1.700 1.700 0 0 0-1 1.500V21a2 2 0 1 1-4 0v-.1a1.700 1.700 0 0 0-1.100-1.500 1.700 1.700 0 0 0-1.800.3l-.1.100a2 2 0 1 1-2.800-2.800l.1-.1a1.700 1.700 0 0 0 .3-1.800 1.700 1.700 0 0 0-1.500-1H3a2 2 0 1 1 0-4h.1a1.700 1.700 0 0 0 1.500-1.100 1.700 1.700 0 0 0-.3-1.800l-.1-.1a2 2 0 1 1 2.800-2.800l.1.100a1.700 1.700 0 0 0 1.800.3H9a1.700 1.700 0 0 0 1-1.500V3a2 2 0 1 1 4 0v.1a1.700 1.700 0 0 0 1 1.500 1.700 1.700 0 0 0 1.800-.3l.1-.1a2 2 0 1 1 2.800 2.800l-.1.100a1.700 1.700 0 0 0-.3 1.800V9a1.700 1.700 0 0 0 1.500 1H21a2 2 0 1 1 0 4h-.1a1.700 1.700 0 0 0-1.500 1z"/></svg></button>'.replace(/(\d)\.(\d)00/g, '$1.$2'); }
function attPickHTML(){
  if (!attOpen) return '';
  var cur = ATTS.filter(function(a){ return a[0]===ATT; })[0] || ATTS[1];
  return '<div class="attpick"><div class="seg" role="radiogroup" aria-label="Who is on call">' + ATTS.map(function(a){ return '<button type="button" role="radio" aria-checked="'+(a[0]===ATT)+'" data-act="att" data-a="'+a[0]+'">'+esc(a[1])+'</button>'; }).join('') + '</div><span>'+esc(cur[2])+'</span></div>';
}
function pageHTML(c, i){
  var st = c.st, th = (st.pages && st.pages[i]) || [], open = st.pageOpen && st.pageOpen[i];
  if (!open) return '<button type="button" class="pagebtn" data-act="pageopen">'+IC.pager+'<span><b>Still stuck?</b> Page the attending</span></button>';
  var h = '<div class="pagebox"><div class="pagehd">'+IC.pager+'<b>Attending</b><span>on call</span>' + attGear() + '<span class="spacer"></span><button type="button" class="lnk" data-act="pageopen">Hide</button></div>' + attPickHTML();
  th.forEach(function(m){ h += '<div class="pg '+(m.role==='user'?'me':'att')+'">'+(m.role==='user'?'':'<i>Attending</i>')+'<span>'+esc(m.content)+'</span></div>'; });
  h += '<div class="pg att" id="pageLive"'+(c.pageBusy?'':' hidden')+'><i>Attending</i><span>'+esc(c.pageLive||'')+'</span></div>';
  if (c.pageBusy && !c.pageLive) h += waitHTML('Paging');
  h += '<div class="askrow"><textarea id="pageTxt" rows="1" placeholder="What is confusing you on this step?"></textarea><button type="button" class="btn sm" data-act="pagesend"'+(c.pageBusy?' disabled':'')+'>Page</button></div></div>';
  return h;
}
function narbarHTML(c){
  if (c.note) return '<div class="narbar quiet"><span>'+esc(c.note)+'</span></div>';
  if (!c.pending || c.generating) return '';
  var n = c.pending.length, was = (c.struck||[]).length;
  var msg = n ? 'You have '+n+' choice'+(n===1?'':'s')+' crossed out.' : 'You uncrossed your choices.';
  return '<div class="narbar"><span>'+msg+'</span><button type="button" class="btn sm" data-act="narrow">'+(n ? 'Narrow the steps' : 'Rebuild the steps')+'</button><button type="button" class="ibs" data-act="narrowx" aria-label="Dismiss"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
}
function narrowTo(c, struck){
  c.struck = struck; c.pending = null; c.note = ''; c.steps = []; c.meta = null; c.reveal = null; c.st = fresh(); c.error = null; c.saved = false; renderAll(); gen(c);
}
function flashNote(c, t){ c.note = t; renderStage(); setTimeout(function(){ if (c.note === t){ c.note = ''; renderStage(); } }, 2400); }
function recapHTML(c){
  var n = 0, ok = 0, slips = [];
  c.steps.forEach(function(s, i){ var f = c.st.first[i]; if (f===undefined) return; n++; if (f==='good') ok++; else { var k = SKILLS[s.skill] || 'a step'; if (slips.indexOf(k) < 0) slips.push(k); } });
  if (!n) return '';
  return '<p class="recapline"><b>'+ok+' of '+n+'</b> decisions right on the first try.'+(slips.length?' You slipped on '+esc(slips.join(', ').toLowerCase())+'.':'')+'</p>';
}
function revealHTML(c){
  var r = c.reveal, h = '<div class="reveal"><p class="stood">One choice is left standing. You ruled out the rest yourself.</p>';
  if (r.pearl) h += '<div class="pearl"><b>Pearl</b>'+esc(r.pearl)+'</div>';
  h += recapHTML(c);
  return h + '</div>';
}
var CHIPS = ['Why is my first pick wrong?','Give me a way to remember this','Quiz me with a similar question'];
function chatHTML(c){
  var h = '<div class="chat"><div class="pagehd">'+IC.pager+'<b>Attending</b><span>on call</span>' + attGear() + '</div>' + attPickHTML();
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
  if (s.type==='final') syncFinal(c);
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
  if (c.helpBusy) h += '<div class="skel" style="margin-top:12px"><i style="width:38%"></i><i style="width:92%"></i><i style="width:74%"></i><b></b><b></b></div>' + waitHTML('Writing new steps', true);
  if (!(st.solved && s.type==='final')) h += pageHTML(c, i);
  if (st.solved && s.type==='final'){
    if (c.reveal){ h += revealHTML(c); c.revealShown = true; h += chatHTML(c); }
    else if (c.generating || c.queued) h += waitHTML(c.queued?'Waiting for the questions before it':'Preparing the explanation');
    else h += fbHtml('bad','The explanation did not come through.','Cut off') + '<div class="row"><button type="button" class="btn" data-act="retry">Try again</button><button type="button" class="btn ghost" data-h="report" data-where="case">Report this</button></div>';
  }
  h += '<div class="row foot"><button type="button" class="btn ghost" data-act="back"'+(i===0?' disabled':'')+'>Back</button><span class="spacer"></span>';
  if (s.type==='final'){
    if (!st.solved) h += c.helpBusy ? '' : '<button type="button" class="btn" data-act="morehelp">Need more help'+(isPro()?'':' '+IC.bolt)+'</button>';
    else h += '<button type="button" class="btn ghost" data-act="restart">Redo</button>'+(EMBED?'':'<button type="button" class="btn" data-go="new">Next question</button>');
  } else {
    var can = st.sel[i]!==undefined || (st.other[i]&&st.other[i].saved) || (s.kind2==='elim' && st.cross && st.cross[i] && Object.keys(st.cross[i]).some(function(x){ return st.cross[i][x]; }));
    h += '<button type="button" class="btn" data-act="next"'+(can?'':' disabled')+'>Continue</button>';
  }
  return h + '</div>';
}
function caseHTML(c){
  var head = EMBED ? '' : '<div class="qhead"><span class="spacer"></span><button type="button" class="ibs" data-act="closecase" title="Close this question" aria-label="Close this question"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
  return head
    + narbarHTML(c)
    + stemHTML(c) + '<div class="bar" id="bar" aria-hidden="true">'+barHTML(c)+'</div><main class="card" id="card">'+cardHTML(c)+'</main>' + (c.steps.length && typeof ankiHTML === 'function' ? ankiHTML(c) : '');
}

/* ---------- review ---------- */
var pearlQ = '';
function reviewHTML(){
  var rate = stats.done ? Math.round(100*stats.first/stats.done) : 0;
  var h = '<section class="tiles"><div><b>'+streak()+'</b><span>day streak</span></div><div><b>'+stats.done+'</b><span>questions coached</span></div><div><b>'+(stats.done?rate+'%':'—')+'</b><span>clean first pass</span></div></section>';
  var keys = Object.keys(SKILLS).filter(function(k){ return stats.skills[k] && stats.skills[k].n; });
  h += '<section class="panel"><h2>Reasoning profile</h2>';
  if (!isPro()) h += '<p class="muted">See which kind of decision costs you the most marks, weakest first. Part of the Resident and Chief plans.</p><button type="button" class="btn" data-act="upgrade">See plans</button>';
  else if (!keys.length) h += '<p class="muted">Finish a question and this shows which kind of decision costs you the most marks.</p>';
  else {
    keys.sort(function(a,b){ return stats.skills[a].ok/stats.skills[a].n - stats.skills[b].ok/stats.skills[b].n; });
    h += '<p class="muted sm">First-try accuracy by type of decision, weakest first.</p><div class="prof">'+keys.map(function(k){ var b = stats.skills[k], p = Math.round(100*b.ok/b.n);
      return '<div><span>'+esc(SKILLS[k])+'</span><i><u class="'+(p<50?'lo':(p<75?'mid':'hi'))+'" style="width:'+Math.max(4,p)+'%"></u></i><em>'+p+'%</em><small>'+b.n+'</small></div>'; }).join('')+'</div>';
  }
  h += '</section><section class="panel"><div class="row"><h2>Pearls</h2><span class="spacer"></span>'
    + (pearls.length?'<button type="button" class="btn ghost sm" data-act="copypearls">Copy all</button><button type="button" class="btn ghost sm" data-act="exportpearls">Anki export'+(isPro()?'':' '+IC.bolt)+'</button>':'')+'</div>';
  if (!pearls.length) h += '<p class="muted">Every finished question leaves one rule here.</p>';
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
  return pearls.map(function(p){ return [q(p.title+(p.topic?' ('+p.topic+')':'')+': what is the rule?'), q(p.pearl+(p.trap?'<br><br><b>Trap:</b> '+p.trap:'')), q('SeniorResident '+(p.topic||'').replace(/\s+/g,'_'))].join(','); }).join('\n');
}

/* ---------- account and plan ---------- */
var authMode = 'in', waitlisted = lsGet('sr_waitlist', false);
function planCardHTML(){
  var h = '<section class="panel plan"><h2>Plan</h2>';
  if (!billingLive() && plan.name==='free'){
    h += '<p><b>Early access.</b> Everything is unlocked while Senior Resident is in early access.</p>'
      + '<p class="muted sm">Resident is '+money(CFG.PRICE_MONTH)+' '+CFG.CURRENCY+' a month with a 7-day free trial.</p>'
      + '<div class="row"><button type="button" class="btn" data-act="upgrade">See plans</button></div>';
  } else if (plan.name==='pro' || plan.name==='chief'){
    var nm = plan.name==='chief' ? 'Chief' : plan.trial ? 'Resident, free trial' : 'Resident';
    h += (BILLING_TEST?'<p class="muted sm">Stripe test mode</p>':'')+'<p><b>'+nm+'.</b> '+(plan.until?(plan.trial?'Trial ends ':'Renews ')+esc(new Date(plan.until).toLocaleDateString())+'.':'')+'</p>'
      + '<p class="muted sm">Cancel, switch plans, change your card or download receipts.</p>'
      + '<div class="row"><button type="button" class="btn ghost" data-act="portal">Manage subscription</button></div><p class="er" id="portalerr"></p>';
  } else {
    h += '<p><b>Free.</b> '+plan.limit+' questions a day. '+Math.max(0,plan.limit-plan.used)+' left today.</p><div class="row"><button type="button" class="btn" data-act="upgrade">See plans</button></div>';
  }
  return h + '</section>';
}
function accountHTML(){
  var u = SR.user, h = '';
  if (!SR.ready) h += '<section class="panel"><h2>Accounts are not switched on</h2><p class="muted">Everything still works without one.</p></section>';
  else if (u){
    h += '<section class="panel"><h2>Account</h2>'+((u.user_metadata||{}).full_name?'<p><b>'+esc(u.user_metadata.full_name)+'</b></p>':'')+'<p>'+esc(u.email||'')+'</p><div class="row"><button type="button" class="btn ghost" data-act="signout">Sign out</button></div></section>';
  } else {
    h += '<section class="panel auth"><h2>'+(authMode==='in'?'Sign in':'Create your account')+'</h2><p class="muted">'+(authMode==='in'?'Your plan and history follow you to any device.':'Takes a few seconds.')+'</p>'
      + '<div id="gis"></div><div class="or"><span>or</span></div>'
      + '<form id="authform">'+(authMode==='in'?'':'<input class="inp" id="aun" type="text" placeholder="Full name" autocomplete="name" required minlength="3" maxlength="80">')+'<input class="inp" id="aue" type="email" placeholder="Email" autocomplete="email" required><input class="inp" id="aup" type="password" placeholder="Password (6+ characters)" minlength="6" autocomplete="'+(authMode==='in'?'current-password':'new-password')+'" required><p class="er" id="auerr"></p><button class="btn wide" type="submit">'+(authMode==='in'?'Sign in':'Create account')+'</button></form>'
      + '<button type="button" class="lnk" data-act="authsw">'+(authMode==='in'?'New here? Create an account':'Already have an account? Sign in')+'</button></section>';
  }
  h += planCardHTML();
  var R = [['US','American'],['CA','Canadian'],['UK','British']];
  h += '<section class="panel"><h2>Preferences</h2><div class="pref"><span>Default difficulty</span>'+'<div class="seg">'+LEVELS.map(function(l){ return '<button type="button" role="radio" aria-checked="'+(l[0]===LEVEL)+'" data-act="lvl" data-l="'+l[0]+'">'+l[1]+'</button>'; }).join('')+'</div></div>'
    + (EMBED ? '<div class="pref"><span>Colour</span>'+themesHTML()+'</div>' : '')
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
  if (EMBED && window.parent !== window){   // inside the extension, Google's own button cannot run, so the extension opens the Google window itself
    box.innerHTML = '<button type="button" class="btn ghost wide" data-act="goext"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.900a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.900 3.2-4.800 3.2-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.300 1.1-3.700 1.1-2.9 0-5.3-1.900-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.800 14.2a6.6 6.6 0 0 1 0-4.4V7H2.1a11 11 0 0 0 0 10z"/><path fill="#EA4335" d="M12 5.3c1.6 0 3.1.6 4.2 1.700l3.2-3.2A11 11 0 0 0 2.1 7l3.700 2.8C6.700 7.200 9.100 5.3 12 5.3z"/></svg>Continue with Google</button>';
    return;
  }
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
  var perks = [(CFG.PRO_DAILY||40)+' questions a day, a full block','Hardest mode at exam pace','Narrowing from your cross-outs','Page the attending','Reasoning profile: where you lose points','One tap Anki cards'];
  var live = !!CFG.STRIPE_LINK;
  return '<div class="sheet" role="dialog" aria-label="Senior Resident Pro"><button type="button" class="close" data-act="closemodal" aria-label="Close">×</button>'
    + '<div class="ph2">'+IC.logo+'<h2>Senior Resident: Resident plan</h2></div><ul class="perks">'+perks.map(function(p){ return '<li>'+IC.check+esc(p)+'</li>'; }).join('')+'</ul>'
    + '<div class="prices one"><div class="price"><b>'+money(CFG.PRICE_MONTH)+'</b><span>a month</span><em>Cancel anytime</em></div></div>'
    + '<p class="muted sm c">The Chief plan, '+money(CFG.PRICE_FELLOW||25)+' a month, adds unlimited questions, the question ID on Anki cards and exam mode from your PDFs.</p>'
    + '<button type="button" class="btn wide" data-act="buy" data-p="month">'+'Start the 7-day free trial'+'</button>'
    + (CFG.STRIPE_LINK_CHIEF ? '<button type="button" class="btn ghost wide" data-act="buy" data-p="chief" style="margin-top:8px">Get Chief</button>' : '')
    + '<p class="muted sm c" id="buymsg">'+esc(TRIAL_NOTE)+' Prices in '+esc(CFG.CURRENCY)+'.'+'</p></div>';
}
function openModal(html){ modalEl.innerHTML = html; modalEl.hidden = false; }
function closeModal(){ modalEl.hidden = true; modalEl.innerHTML = ''; }
async function joinWaitlist(period){
  waitlisted = true; lsSet('sr_waitlist', true);
  if (SR.user && SR.sb){ try { await SR.sb.from('sr_waitlist').insert({ email:SR.user.email, period:period||'' }); } catch(e){} }
}
async function openPortal(btn){
  var er = document.getElementById('portalerr'), tok = await SR.token();
  if (!tok){ view = 'account'; renderAll(); return; }
  var w = window.open('', '_blank'); if (btn){ btn.disabled = true; btn.textContent = 'Opening'; }
  try {
    var r = await fetch(CFG.SUPABASE_URL + '/functions/v1/sr-portal', { method:'POST', headers:{ 'apikey':CFG.SUPABASE_ANON_KEY, 'Authorization':'Bearer '+tok } });
    var j = await r.json();
    if (!j.url) throw j.error || 'x';
    if (w) w.location = j.url; else location.href = j.url;
  } catch(e){
    if (w) w.close();
    if (er) er.textContent = e === 'nosub' ? 'No subscription found on this account. If you paid with another email, sign in with that one.' : 'Could not open billing right now. Try again in a minute.';
  }
  if (btn){ btn.disabled = false; btn.textContent = 'Manage subscription'; }
}
async function buy(period){
  var link = period === 'chief' ? (CFG.STRIPE_LINK_CHIEF || CFG.STRIPE_LINK) : CFG.STRIPE_LINK, msg = document.getElementById('buymsg');
  if (!link){ if (msg) msg.textContent = 'Checkout is not available right now. Try again soon.'; return; }
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
  var hm = typeof showHome === 'function' && showHome(); document.body.classList.toggle('home', !!hm);
  if (hm){ stage.innerHTML = homeHTML(); return; }
  if (view==='schedule' && !EMBED){ stage.innerHTML = scheduleHTML(); return; }
  if (view==='review'){ stage.innerHTML = reviewHTML(); return; }
  if (view==='exam'){ stage.innerHTML = examHTML(); return; }
  if (view==='account'){ stage.innerHTML = accountHTML(); mountGoogle(); return; }
  if (cur===-1 || !cases[cur]){ cur = -1; stage.innerHTML = uploadHTML(); return; }
  var c = cases[cur]; c.revealShown = false;
  /* a question that has nothing yet and is not being built gets built, quietly, instead of showing an error */
  if (!c.steps.length && !c.generating && !c.queued && !c.error && !c.stopped && (c.auto||0) < 2 && (c.text || c.files.length)){ c.auto = (c.auto||0) + 1; gen(c); return; }
  var keep = document.getElementById('chatTxt'), val = keep ? keep.value : '';
  /* hold the page where it is: re-rendering swaps the images, and for a moment the page is too short to keep its scroll */
  var y = window.scrollY, hgt = stage.offsetHeight; stage.style.minHeight = hgt + 'px';
  stage.innerHTML = caseHTML(c);
  if (val){ var t = document.getElementById('chatTxt'); if (t) t.value = val; }
  if (y) window.scrollTo(0, y);
  var imgs = Array.prototype.slice.call(stage.querySelectorAll('img')).filter(function(im){ return !im.complete; });
  var release = function(){ stage.style.minHeight = ''; };
  if (!imgs.length) requestAnimationFrame(function(){ requestAnimationFrame(release); });
  else Promise.all(imgs.map(function(im){ return new Promise(function(r){ im.addEventListener('load', r, { once:true }); im.addEventListener('error', r, { once:true }); }); })).then(release);
}
function renderAll(){ renderTop(); renderStage(); }
function go(v){
  if (v==='new'){ view = 'coach'; cur = -1; }
  else if (v==='plan'){ if (billingLive() && plan.name!=='pro'){ openModal(pricingHTML()); return; } view = 'account'; }
  else view = v;
  if (!EMBED){ var hv = { home:'', how:'#how', pricing:'#pricing', schedule:'#plan', coach:'#coach', exam:'#exam', review:'#stats' }[view]; if (hv !== undefined) history.replaceState(null, '', location.pathname + location.search + hv); }
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
  var nmEl = document.getElementById('aun'), nm = nmEl ? nmEl.value.trim().replace(/\s+/g, ' ') : '';
  if (authMode!=='in' && nm.split(' ').length < 2){ er.textContent = 'Please enter your first and last name.'; if (nmEl) nmEl.focus(); return; }
  btn.disabled = true; er.textContent = '';
  var r = await (authMode==='in' ? SR.signIn(em, pw) : SR.signUp(em, pw, nm));
  btn.disabled = false;
  if (r.error) er.textContent = /invalid login/i.test(r.error.message) ? 'That email and password do not match.' : (/registered/i.test(r.error.message) ? 'That email already has an account. Sign in instead.' : r.error.message);
});
function crossToggle(c, i, k){
  var st = c.st; if (st.sel[i]===k) return;
  var sk = c.steps[i]; if (sk && sk.kind2==='elim' && st.sel[i]===undefined && !(st.cross && st.cross[i] && st.cross[i][k])){ pick(c, k); return; }   // on the elimination step, crossing out IS the answer
  if (markRuled(c, i, k, true)){ renderStage(); return; }
  st.cross = st.cross || {}; st.cross[i] = st.cross[i] || {}; st.cross[i][k] = !st.cross[i][k]; renderStage();
}
stage.addEventListener('contextmenu', function(e){
  var o = e.target.closest('.opt[data-act="pick"]'); var c = cases[cur]; if (!o || !c) return;
  e.preventDefault(); crossToggle(c, c.st.i, +o.dataset.k);
});
function pick(c, k){
  var st = c.st, i = st.i, s = c.steps[i]; if (!s || !s.opts[k]) return;
  var rk0 = String(s.opts[k].t||'').trim().toLowerCase();
  if (st.sel[i] !== k && st.cross && st.cross[i] && st.cross[i][k]){ st.cross[i][k] = false; renderStage(); persist(); return; }   // clicking a crossed-out option uncrosses it
  if (st.sel[i] !== k && st.ruled && st.ruled[rk0] && !(st.solved && s.type==='final')){ delete st.ruled[rk0]; renderStage(); persist(); return; }
  if (st.sel[i] === k){                                   // clicking the chosen option again takes it back
    if (st.solved && s.type==='final') return;
    st.sel[i] = undefined; if (st.ruled) delete st.ruled[String(s.opts[k].t||'').trim().toLowerCase()];
    renderStage(); persist(); return;
  }
  st.sel[i] = k;
  if (st.first[i]===undefined) st.first[i] = s.opts[k].v;
  if (st.cross && st.cross[i]) st.cross[i][k] = false;
  markRuled(c, i, k, false);
  if (s.type==='final'){
    c.tries = (c.tries||0) + 1;
    st.solved = finalSolved(c, s);
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
  if (act==='portal'){ openPortal(el); return; }
  if (act==='buy'){ buy(el.dataset.p); return; }
  if (act==='authsw'){ authMode = authMode==='in' ? 'up' : 'in'; renderStage(); return; }
  if (act==='goext'){
    var gr = Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(16)), function(x){ return ('0'+x.toString(16)).slice(-2); }).join('');
    window.__gRaw = gr; el.disabled = true; var ge = document.getElementById('auerr'); if (ge) ge.textContent = '';
    window.parent.postMessage({ type:'sr-google', clientId:CFG.GOOGLE_CLIENT_ID, nonce:await sha256hex(gr) }, '*'); return;
  }
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
  if (act==='reread'){ statusMsg = ''; if (window.parent!==window) window.parent.postMessage({ type:'sr-grab', reread:true }, '*'); el.classList.add('spin'); return; }
  if (act==='narrow'){ var nc = cases[cur]; if (nc && nc.pending) narrowTo(nc, nc.pending); return; }
  if (act==='narrowx'){ var xc = cases[cur]; if (xc){ xc.skipped = (xc.pending||[]).join('|'); xc.pending = null; renderStage(); } return; }
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
  else if (act==='attcfg'){ attOpen = !attOpen; var kp = (document.getElementById('pageTxt')||document.getElementById('chatTxt')||{}).value || ''; renderStage(); var tg = document.getElementById('pageTxt')||document.getElementById('chatTxt'); if (tg) tg.value = kp; }
  else if (act==='att'){ attOpen = false; ATT = el.dataset.a; try{ localStorage.setItem('sr_att', ATT); }catch(x){} var keep = (document.getElementById('pageTxt')||document.getElementById('chatTxt')||{}).value || ''; renderStage(); var tf = document.getElementById('pageTxt')||document.getElementById('chatTxt'); if (tf){ tf.value = keep; tf.focus(); } }
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
  if (d.type==='sr-google-token'){
    var gb = stage.querySelector('[data-act="goext"]'), ger = document.getElementById('auerr'); if (gb) gb.disabled = false;
    if (!d.token){ if (ger) ger.textContent = d.cancelled ? '' : 'Google sign in did not go through. Sign in with email for now.' + (d.redirect ? ' Setup: authorize ' + d.redirect + ' as a redirect URI for the Google sign-in client.' : ''); return; }
    var gr2 = await SR.sb.auth.signInWithIdToken({ provider:'google', token:String(d.token), nonce:window.__gRaw || '' });
    if (gr2.error && ger) ger.textContent = 'Google sign in did not go through. Sign in with email for now.';
    return;
  }
  if (d.type==='sr-struck'){
    var sc0 = cases[cur]; if (!sc0 || view!=='coach' || !sc0.qid) return;
    var ns = (Array.isArray(d.struck) ? d.struck : []).slice(0, 8).map(function(x){ return String(x).slice(0, 200); }), sig = ns.join('|');
    sc0.live = ns;   // the final step always works on what is actually still open
    sc0.pending = (sig === (sc0.struck||[]).join('|') || sig === sc0.skipped) ? null : ns;
    if (!sc0.generating) renderStage(); return;
  }
  if (d.type==='sr-status'){ statusMsg = String(d.text||''); if (view==='coach' && cur===-1) renderStage(); return; }
  if (d.type!=='sr-question') return;
  statusMsg = '';
  var struck = (Array.isArray(d.struck) ? d.struck : []).slice(0, 8).map(function(x){ return String(x).slice(0, 200); });
  if (d.qid){
    var ex = cases.findIndex(function(c){ return c.qid===d.qid; });
    if (ex>=0){
      var oc = cases[ex]; if (d.num) oc.num = String(d.num);
      view = 'coach'; cur = ex;
      if (d.reread && !oc.generating && struck.join('|') !== (oc.struck||[]).join('|')){ narrowTo(oc, struck); return; }
      renderAll(); if (d.reread){ statusMsg = ''; flashNote(oc, struck.length ? 'Same cross-outs as before. Nothing to change.' : 'Nothing is crossed out yet.'); }
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
var wasUser = null;
SR.onAuth(function(){ if (SR.user && !wasUser && view==='account') view = 'coach'; wasUser = SR.user; loadPlan(); renderAll(); });
renderAll();
if (EMBED && window.parent !== window) window.parent.postMessage({ type:'sr-ready' }, '*');
if (/[?&]paid=1/.test(location.search)){
  history.replaceState(null, '', location.pathname + location.search.replace(/[?&]paid=1/, '').replace(/^&/, '?'));
  view = 'account';
  (function poll(n){ setTimeout(async function(){ await loadPlan(); renderAll(); if (plan.name==='free' && n < 15) poll(n + 1); }, 2000); })(0);
}
if (location.hash==='#pro'){ history.replaceState(null, '', location.pathname + location.search); openModal(pricingHTML()); }
