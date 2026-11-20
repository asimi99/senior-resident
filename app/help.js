/* Help: an AI helper, feedback, and error reports. Tickets go to the sr_feedback table. */
var HELP = { tab:'ask', chat:[], busy:false, esc:false, sent:'', kind:'idea', err:null, note:'', failed:false };
var HVER = (function(){ try { return (document.currentScript.src.match(/v=(\d+)/) || [0, '?'])[1]; } catch(e){ return '?'; } })();
var HELP_KB = window.SR_HELP_KB || '';
function helpMeta(){
  var c = (typeof cases !== 'undefined' && cur >= 0) ? cases[cur] : null;
  return { v:HVER, where:EMBED ? 'panel' : 'web', view:(typeof view !== 'undefined' ? view : ''), ua:navigator.userAgent.slice(0, 160), src:c ? (c.src || '') : '', qid:c ? (c.qid || '') : '', level:c ? (c.level || '') : '', plan:(typeof plan !== 'undefined' ? plan.name : '') };
}
function hq(){ return lsGet('sr_fbq', []) || []; }
async function pushTicket(row){
  if (!SR.sb) throw new Error('offline');
  var r = await SR.sb.from('sr_feedback').insert(row); if (r.error) throw r.error;
}
async function sendTicket(kind, body, email, extra){
  var meta = helpMeta(); if (extra) for (var k in extra) meta[k] = extra[k];
  var row = { kind:kind, body:String(body || '').slice(0, 6000), email:String((SR.user && SR.user.email) || email || '').slice(0, 200), meta:meta };
  try { await pushTicket(row); return true; }
  catch(e){ var q = hq(); q.push(row); lsSet('sr_fbq', q.slice(-20)); return false; }
}
async function flushTickets(){ var q = hq(); if (!q.length) return; var left = []; for (var i = 0; i < q.length; i++){ try { await pushTicket(q[i]); } catch(e){ left.push(q[i]); } } lsSet('sr_fbq', left); }
setTimeout(flushTickets, 4000);

async function helpAsk(q){
  HELP.chat.push({ role:'user', content:q }); HELP.busy = true; helpRender();
  var rules = window.SR_HELP_RULES((EMBED ? 'Chrome side panel' : 'web app') + ', signed ' + (SR.user ? 'in' : 'out'));
  var turns = [{ role:'user', content:rules }].concat(HELP.chat.slice(-10));
  try {
    var r = await sample(turns, { modelTier:'default', onText:function(u){ var el = document.getElementById('hlive'); if (el){ el.hidden = false; el.textContent = u.text.replace(/\[\[ESC[A-Z\]]*$/, ''); el.scrollIntoView({ block:'end' }); } } });
    var t = String(r.text || '').trim(); if (/\[\[ESCALATE\]\]/.test(t)){ HELP.esc = true; t = t.replace(/\s*\[\[ESCALATE\]\]\s*/g, '').trim(); }
    HELP.chat.push({ role:'assistant', content:t || 'I am passing this to the team.' }); if (!t) HELP.esc = true;
  } catch(e){ HELP.chat.push({ role:'assistant', content:'I could not answer just now. You can send this straight to the team instead.' }); HELP.esc = true; }
  HELP.busy = false; helpRender();
  var lg = document.getElementById('hlog'); if (lg) lg.scrollTop = lg.scrollHeight;
}
function helpHTML(){
  var h = '<div class="sheet help" role="dialog" aria-label="Help"><button type="button" class="close" data-act="closemodal" aria-label="Close">×</button><div class="ph2"><h2>Help</h2></div>'
    + '<div class="seg" role="radiogroup" aria-label="Help"><button type="button" role="radio" aria-checked="' + (HELP.tab === 'ask') + '" data-h="tab" data-t="ask">Ask</button><button type="button" role="radio" aria-checked="' + (HELP.tab === 'fb') + '" data-h="tab" data-t="fb">Feedback</button></div>';
  var needEmail = !SR.user, em = needEmail ? '<input class="inp" id="hemail" type="email" placeholder="Email for the reply" autocomplete="email">' : '';
  if (HELP.sent){
    return h + '<p class="okline">' + IC.check + ' ' + esc(HELP.sent) + '</p><div class="row"><button type="button" class="btn ghost" data-h="reset">Done</button></div></div>';
  }
  if (HELP.tab === 'ask'){
    h += '<div class="hlog" id="hlog">' + (HELP.chat.length ? '' : '<p class="muted sm">Ask how something works or describe what went wrong. If it cannot be solved here, it goes to a person, who replies within 24 hours.</p>')
      + HELP.chat.map(function(m){ return '<div class="hm ' + (m.role === 'user' ? 'me' : 'ai') + '">' + esc(m.content) + '</div>'; }).join('')
      + '<div class="hm ai" id="hlive" hidden></div>' + (HELP.busy ? '<div class="hm ai dotsw" id="hwait"><i></i><i></i><i></i></div>' : '') + '</div>';
    if (HELP.esc) h += '<div class="hesc"><b>This one needs a person.</b><span>Send the conversation to the team. A person replies by email within 24 hours.</span>' + em + '<button type="button" class="btn wide" data-h="escalate">Send to the team</button></div>';
    h += '<form id="hform" class="hrow"><textarea id="hq" rows="2" placeholder="Type your question" maxlength="1200"></textarea><button type="submit" class="btn"' + (HELP.busy ? ' disabled' : '') + '>Send</button></form>'
      + (HELP.esc || !HELP.chat.length ? '' : '<button type="button" class="lnk" data-h="wantperson">Not solved? Send it to a person</button>');
  } else {
    var kinds = [['idea', 'Idea'], ['problem', 'Problem'], ['other', 'Other']];
    h += (HELP.err ? '<p class="muted sm">The error details are attached: ' + esc(HELP.err.code || 'error') + '. Add what you were doing if you can.</p>' : '<p class="muted sm">What should be better? Every message is read.</p>')
      + '<div class="seg" role="radiogroup" aria-label="Type">' + kinds.map(function(k){ return '<button type="button" role="radio" aria-checked="' + (HELP.kind === k[0]) + '" data-h="kind" data-k="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div>'
      + '<textarea id="hfb" rows="5" placeholder="' + (HELP.kind === 'problem' ? 'What happened, and what did you expect?' : 'Tell us in your own words') + '" maxlength="4000">' + esc(HELP.note) + '</textarea>' + em
      + '<button type="button" class="btn wide" data-h="sendfb">Send</button>';
  }
  return h + '</div>';
}
function helpRender(){ openModal(helpHTML()); }
function openHelp(tab, err){ HELP.tab = tab || 'ask'; HELP.err = err || null; if (err) HELP.kind = 'problem'; HELP.sent = ''; helpRender(); var f = document.getElementById(HELP.tab === 'ask' ? 'hq' : 'hfb'); if (f && !('ontouchstart' in window)) f.focus(); }
function reportError(err, where){ openHelp('fb', { code:(err && err.code) || 'error', message:String((err && err.message) || err || '').slice(0, 500), where:where || '' }); }
function sentCopy(ok, person){ return ok ? (person ? 'Sent. A person will reply by email within 24 hours.' : 'Thank you. It has been sent.') : 'It could not be sent right now. It is saved on this device and will send the next time you open Senior Resident.'; }

document.addEventListener('click', async function(ev){
  var el = ev.target.closest('[data-h]'); if (!el) return; var act = el.dataset.h;
  var keep = function(){ var a = document.getElementById('hfb'); if (a) HELP.note = a.value; };
  if (act === 'open'){ openHelp('ask'); }
  else if (act === 'report'){ var c = cases[cur]; reportError((c && c.error) || { code:el.dataset.code || 'error', message:el.dataset.msg || '' }, el.dataset.where || 'case'); }
  else if (act === 'tab'){ keep(); HELP.tab = el.dataset.t; helpRender(); }
  else if (act === 'kind'){ keep(); HELP.kind = el.dataset.k; helpRender(); }
  else if (act === 'wantperson'){ HELP.esc = true; helpRender(); }
  else if (act === 'reset'){ HELP.sent = ''; HELP.esc = false; HELP.chat = []; HELP.note = ''; HELP.err = null; closeModal(); }
  else if (act === 'escalate' || act === 'sendfb'){
    var e = document.getElementById('hemail'), email = e ? e.value.trim() : '';
    if (act === 'escalate' && !SR.user && !/^\S+@\S+\.\S+$/.test(email)){ if (e){ e.focus(); e.placeholder = 'An email is needed for the reply'; } return; }
    var body, ok;
    el.disabled = true; el.textContent = 'Sending';
    if (act === 'escalate'){ body = HELP.chat.map(function(m){ return (m.role === 'user' ? 'USER: ' : 'HELPER: ') + m.content; }).join('\n\n'); ok = await sendTicket('escalation', body, email); HELP.sent = sentCopy(ok, true); }
    else { keep(); if (!HELP.note.trim() && !HELP.err){ el.disabled = false; el.textContent = 'Send'; var a = document.getElementById('hfb'); if (a) a.focus(); return; }
      ok = await sendTicket(HELP.err ? 'error' : HELP.kind, HELP.note, email, HELP.err ? { err:HELP.err } : null); HELP.sent = sentCopy(ok, false); }
    helpRender();
  }
});
document.addEventListener('submit', function(ev){
  if (ev.target.id !== 'hform') return; ev.preventDefault();
  var t = document.getElementById('hq'), q = t.value.trim(); if (!q || HELP.busy) return; helpAsk(q);
});
document.addEventListener('keydown', function(ev){ if (ev.target.id === 'hq' && ev.key === 'Enter' && !ev.shiftKey){ ev.preventDefault(); ev.target.form.requestSubmit(); } });

/* unexpected errors: a small bar with a report button, once per load */
var crashed = false;
function crashBar(msg){
  if (crashed || BG) return; crashed = true;
  var b = document.createElement('div'); b.className = 'crash'; b.setAttribute('role', 'alert');
  b.innerHTML = '<span>Something went wrong.</span><button type="button" class="btn sm" data-h="report" data-code="crash" data-where="app">Report it</button><button type="button" class="lnk" id="crashx">Dismiss</button>';
  b.querySelector('[data-h]').dataset.msg = String(msg || '').slice(0, 400);
  document.body.appendChild(b); b.querySelector('#crashx').onclick = function(){ b.remove(); };
}
window.addEventListener('error', function(e){ if (e && e.filename && e.filename.indexOf(location.origin) === 0) crashBar((e.message || '') + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
window.addEventListener('unhandledrejection', function(e){ var r = e && e.reason; if (r && r.stack && !r.code) crashBar(r.message || String(r)); });

(function(){ var b = document.createElement('button'); b.type = 'button'; b.className = 'helpfab'; b.dataset.h = 'open'; b.setAttribute('aria-label', 'Help and feedback');
  b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.2-4.4A8 8 0 1 1 21 12z"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 16.5v.1"/></svg><span>Help</span>';
  if (!BG && !EMBED) document.body.appendChild(b); })();   // in the side panel Help lives in the top bar, so nothing covers Continue
if (location.hash === '#help'){ history.replaceState(null, '', location.pathname + location.search); setTimeout(function(){ openHelp('ask'); }, 300); }
