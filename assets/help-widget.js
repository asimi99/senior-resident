/* Help bubble for the site pages: ask the AI helper without leaving the page. Escalations go to the sr_feedback table. */
(function(){
  var C = window.SR_CONFIG || {}; if (!C.SUPABASE_URL || document.getElementById('srh')) return;
  var S = { open:false, chat:[], busy:false, esc:false, sent:'' }, FNS = ['resident', 'coach'], fi = 0;
  function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
  var css = '#srh{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;font-family:inherit}'
    + '#srh .fab{display:inline-flex;align-items:center;gap:8px;border:0;background:var(--brand,#1a5fb4);color:#fff;border-radius:999px;padding:12px 18px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 10px 30px rgba(26,95,180,.35)}'
    + '#srh .pan{width:min(380px,calc(100vw - 32px));height:min(540px,calc(100vh - 110px));background:var(--surface,#fff);color:var(--fg,#0f1f33);border:1px solid var(--line,#dbe3ef);border-radius:18px;box-shadow:0 22px 60px rgba(15,31,51,.3);display:flex;flex-direction:column;overflow:hidden;margin-bottom:12px}'
    + '#srh .hd{display:flex;align-items:center;gap:10px;padding:13px 16px;background:var(--brand,#1a5fb4);color:#fff;font-weight:700}#srh .hd small{display:block;font-weight:500;opacity:.85;font-size:12.5px}#srh .hd button{margin-left:auto;background:none;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:0 4px}'
    + '#srh .log{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px;min-height:0}'
    + '#srh .m{max-width:88%;border-radius:14px;padding:9px 12px;font-size:14.5px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}#srh .m.me{align-self:flex-end;background:var(--brand,#1a5fb4);color:#fff;border-bottom-right-radius:4px}#srh .m.ai{align-self:flex-start;background:var(--bg,#f6f8fc);border:1px solid var(--line,#dbe3ef);border-bottom-left-radius:4px}'
    + '#srh .chips{display:flex;flex-wrap:wrap;gap:6px}#srh .chips button{border:1px solid var(--line,#dbe3ef);background:var(--surface,#fff);color:var(--brand,#1a5fb4);border-radius:999px;padding:6px 11px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}'
    + '#srh .esc{margin:0 14px 10px;border:1.5px solid var(--brand,#1a5fb4);border-radius:12px;padding:11px;display:flex;flex-direction:column;gap:8px;font-size:14px;background:var(--soft,#e7f0fc)}#srh .esc input{font:inherit;padding:9px 11px;border:1.5px solid var(--line,#dbe3ef);border-radius:9px;min-width:0}'
    + '#srh .esc button,#srh form button{border:0;background:var(--brand,#1a5fb4);color:#fff;border-radius:10px;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer}#srh button:disabled{opacity:.5}'
    + '#srh form{display:flex;gap:8px;padding:10px 14px 14px;border-top:1px solid var(--line,#dbe3ef)}#srh textarea{flex:1;min-width:0;resize:none;font:inherit;font-size:14.5px;padding:9px 11px;border:1.5px solid var(--line,#dbe3ef);border-radius:10px;background:var(--bg,#f6f8fc);color:inherit}'
    + '#srh .lnk{background:none;border:0;color:var(--muted,#56687e);font:inherit;font-size:12.5px;text-decoration:underline;cursor:pointer;padding:0 14px 8px;text-align:left}'
    + '@media(max-width:480px){#srh .pan{width:calc(100vw - 32px)}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var root = document.createElement('div'); root.id = 'srh'; document.body.appendChild(root);
  var STARTERS = ['How do I install it?', 'Which question banks work?', 'What does each tier include?'];
  function render(){
    var h = '';
    if (S.open){
      h += '<div class="pan" role="dialog" aria-label="Help"><div class="hd"><span>Ask Senior Resident<small>Answers about the tool. A person steps in if needed.</small></span><button type="button" data-a="close" aria-label="Close">×</button></div><div class="log" id="srhlog">';
      if (!S.chat.length) h += '<div class="m ai">Hi. Ask how something works or what went wrong.</div><div class="chips">' + STARTERS.map(function(q){ return '<button type="button" data-a="q">' + esc(q) + '</button>'; }).join('') + '</div>';
      h += S.chat.map(function(m){ return '<div class="m ' + (m.role === 'user' ? 'me' : 'ai') + '">' + esc(m.content) + '</div>'; }).join('') + (S.busy ? '<div class="m ai" id="srhlive">…</div>' : '') + '</div>';
      if (S.sent) h += '<div class="esc"><b>' + esc(S.sent) + '</b></div>';
      else if (S.esc) h += '<div class="esc"><b>This one needs a person.</b><span>Send the conversation to the team. A person replies by email within 24 hours.</span><input id="srhem" type="email" placeholder="Email for the reply" autocomplete="email"><button type="button" data-a="send">Send to the team</button></div>';
      else if (S.chat.length && !S.busy) h += '<button type="button" class="lnk" data-a="person">Not solved? Send it to a person</button>';
      h += '<form id="srhf"><textarea id="srhq" rows="1" placeholder="Type your question" maxlength="1200"></textarea><button type="submit"' + (S.busy ? ' disabled' : '') + '>Send</button></form></div>';
    }
    h += '<button type="button" class="fab" data-a="toggle" style="float:right"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.2-4.4A8 8 0 1 1 21 12z"/></svg>' + (S.open ? 'Close' : 'Ask a question') + '</button>';
    root.innerHTML = h; var lg = document.getElementById('srhlog'); if (lg) lg.scrollTop = lg.scrollHeight;
  }
  async function call(turns, onText){
    var body = JSON.stringify({ input:turns, tier:'default', kind:'aux', app:'sr' }), res;
    for (var hop = 0; hop < 2; hop++){
      try { res = await fetch(C.SUPABASE_URL + '/functions/v1/' + FNS[fi], { method:'POST', headers:{ 'Content-Type':'application/json', apikey:C.SUPABASE_ANON_KEY, Authorization:'Bearer ' + C.SUPABASE_ANON_KEY }, body:body }); }
      catch(e){ if (fi === 0){ fi = 1; continue; } throw e; }
      if (res.status === 404 && fi === 0){ fi = 1; continue; } break;
    }
    if (!res.ok) throw new Error('http ' + res.status);
    var rd = res.body.getReader(), dec = new TextDecoder(), raw = '', text = '';
    for (;;){ var r = await rd.read(); if (r.done) break; raw += dec.decode(r.value, { stream:true });
      if (/^\s*(event:|data:)/.test(raw)){ text = ''; raw.split('\n').forEach(function(l){ if (l.indexOf('data:') !== 0) return; try { var j = JSON.parse(l.slice(5)); if (j.type === 'content_block_delta' && j.delta && j.delta.text) text += j.delta.text; } catch(e){} }); }
      else text = raw;
      onText(text); }
    return text;
  }
  async function ask(q){
    S.chat.push({ role:'user', content:q }); S.busy = true; S.sent = ''; render();
    var turns = [{ role:'user', content:window.SR_HELP_RULES('the Senior Resident website, not signed in') }].concat(S.chat.slice(-10));
    try {
      var t = await call(turns, function(x){ var el = document.getElementById('srhlive'); if (el){ el.textContent = x.replace(/\[\[ESC[A-Z\]]*$/, '') || '…'; el.parentNode.scrollTop = el.parentNode.scrollHeight; } });
      t = String(t || '').trim(); if (/\[\[ESCALATE\]\]/.test(t)){ S.esc = true; t = t.replace(/\s*\[\[ESCALATE\]\]\s*/g, '').trim(); }
      S.chat.push({ role:'assistant', content:t || 'I am passing this to the team.' }); if (!t) S.esc = true;
    } catch(e){ S.chat.push({ role:'assistant', content:'I could not answer just now. You can send this straight to the team instead.' }); S.esc = true; }
    S.busy = false; render(); var f = document.getElementById('srhq'); if (f && !('ontouchstart' in window)) f.focus();
  }
  async function ticket(email){
    var row = { kind:'escalation', body:S.chat.map(function(m){ return (m.role === 'user' ? 'USER: ' : 'HELPER: ') + m.content; }).join('\n\n').slice(0, 6000), email:email.slice(0, 200), meta:{ where:'site', page:location.pathname, ua:navigator.userAgent.slice(0, 160) } };
    try { var r = await fetch(C.SUPABASE_URL + '/rest/v1/sr_feedback', { method:'POST', headers:{ 'Content-Type':'application/json', apikey:C.SUPABASE_ANON_KEY, Authorization:'Bearer ' + C.SUPABASE_ANON_KEY, Prefer:'return=minimal' }, body:JSON.stringify(row) }); if (!r.ok) throw 0; return true; }
    catch(e){ try { var q = JSON.parse(localStorage.getItem('sr_fbq') || '[]'); q.push(row); localStorage.setItem('sr_fbq', JSON.stringify(q.slice(-20))); } catch(x){} return false; }
  }
  root.addEventListener('click', async function(ev){
    var el = ev.target.closest('[data-a]'); if (!el) return; var a = el.dataset.a;
    if (a === 'toggle' || a === 'close'){ S.open = a === 'toggle' ? !S.open : false; render(); var f = document.getElementById('srhq'); if (f && S.open && !('ontouchstart' in window)) f.focus(); }
    else if (a === 'q'){ if (!S.busy) ask(el.textContent); }
    else if (a === 'person'){ S.esc = true; render(); }
    else if (a === 'send'){ var e = document.getElementById('srhem'), em = e.value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)){ e.focus(); e.placeholder = 'An email is needed for the reply'; return; }
      el.disabled = true; el.textContent = 'Sending'; var ok = await ticket(em); S.esc = false; S.sent = ok ? 'Sent. A person will reply by email within 24 hours.' : 'It could not be sent right now. Please try again in a minute.'; if (!ok) S.esc = true; render(); }
  });
  root.addEventListener('submit', function(ev){ ev.preventDefault(); var t = document.getElementById('srhq'), q = t.value.trim(); if (q && !S.busy) ask(q); });
  root.addEventListener('keydown', function(ev){ if (ev.target.id === 'srhq' && ev.key === 'Enter' && !ev.shiftKey){ ev.preventDefault(); ev.target.form.requestSubmit(); } });
  render();
})();
