/* ---------- Anki: one card per question, straight into Anki through AnkiConnect, or saved for export ---------- */
var ANKI = { status:'unknown', queue: lsGet('sr_anki_q', []), sent: lsGet('sr_anki_sent', 0), qid: lsGet('sr_anki_qid', true), type: lsGet('sr_anki_type', 'cloze'), last: '', cfg: false };
var ANKI_DECK = 'Senior Resident', ankiSeq = 0, ankiWait = {};
ANKI.queue = ANKI.queue.map(function(n){ return n.fields ? n : { type:'basic', fields:{ Front:n.front || '', Back:n.back || '', Source:'' }, tags:n.tags || ['SeniorResident'] }; });
function isChief(){ return !billingLive() || plan.name === 'chief'; }
function ankiSave(){ lsSet('sr_anki_q', ANKI.queue); lsSet('sr_anki_sent', ANKI.sent); }

/* our own note types, so every card looks the same and anyone can restyle them in Anki (Tools, Manage Note Types, Cards, Styling) */
var SR_CSS = '.card{font-family:-apple-system,"Segoe UI",Inter,Arial,sans-serif;font-size:20px;line-height:1.5;color:#1b2533;background:linear-gradient(160deg,#f4f8fd 0%,#e9f0f9 100%);text-align:left;padding:0}'
  + '.sr{max-width:640px;margin:28px auto;padding:22px 26px;background:#fff;border-radius:16px;box-shadow:0 6px 24px rgba(20,40,80,.10);border-top:5px solid #2f6fdb}'
  + '.sr b{color:#173f86}.cloze{font-weight:700;color:#2f6fdb}.sr-x{margin-top:14px;padding-top:12px;border-top:1px solid #e3e9f2;font-size:16px;color:#4a5668}'
  + '.sr-src{margin-top:16px;font-size:12px;letter-spacing:.04em;color:#8a97a8;text-align:right}'
  + '.nightMode .card,.night_mode .card{background:linear-gradient(160deg,#151c27 0%,#1b2433 100%);color:#e6ebf2}.nightMode .sr,.night_mode .sr{background:#202a3a;box-shadow:none}.nightMode .sr b,.night_mode .sr b{color:#9cc0ff}.nightMode .cloze,.night_mode .cloze{color:#7fb0ff}.nightMode .sr-x,.night_mode .sr-x{color:#b6c1d1;border-color:#2e3a4e}';
var SR_MODELS = {
  cloze: { modelName:'Senior Resident Cloze', inOrderFields:['Text','Extra','Source'], isCloze:true, css:SR_CSS,
    cardTemplates:[{ Name:'Cloze', Front:'<div class="sr">{{cloze:Text}}</div>', Back:'<div class="sr">{{cloze:Text}}{{#Extra}}<div class="sr-x">{{Extra}}</div>{{/Extra}}{{#Source}}<div class="sr-src">{{Source}}</div>{{/Source}}</div>' }] },
  basic: { modelName:'Senior Resident Basic', inOrderFields:['Front','Back','Source'], css:SR_CSS,
    cardTemplates:[{ Name:'Card 1', Front:'<div class="sr">{{Front}}</div>', Back:'<div class="sr">{{Front}}<div class="sr-x">{{Back}}</div>{{#Source}}<div class="sr-src">{{Source}}</div>{{/Source}}</div>' }] }
};
var TYPES = [['cloze','Cloze deletion','Fill in the blank. Best for facts and cutoffs.'], ['basic','Basic','Question on the front, answer on the back.']];

/* AnkiConnect only answers on this computer (127.0.0.1:8765). Only the Chrome extension can reach it, so the web app asks the side panel to call it. */
function ankiCall(action, params){
  return new Promise(function(res){
    if (!EMBED || window.parent === window) return res({ error:'offline' });
    var id = ++ankiSeq; ankiWait[id] = res;
    window.parent.postMessage({ type:'sr-anki', id:id, action:action, params:params || {} }, '*');
    setTimeout(function(){ if (ankiWait[id]){ delete ankiWait[id]; res({ error: action === 'requestPermission' ? 'timeout' : 'offline' }); } }, action === 'requestPermission' ? 60000 : 4000);
  });
}
window.addEventListener('message', function(e){
  if (!EMBED || !fromExt(e.origin)) return;
  var d = e.data || {};
  if (d.type === 'sr-anki-res' && ankiWait[d.id]){ var r = ankiWait[d.id]; delete ankiWait[d.id]; r({ result:d.result, error:d.error || null }); }
});
async function ankiCheck(){
  if (!EMBED){ ANKI.status = 'off'; return; }
  ANKI.status = 'checking';
  var r = await ankiCall('version');
  ANKI.status = !r.error ? 'on' : (r.error === 'offline' ? 'off' : 'needs');
}
async function ankiAllow(){
  ANKI.status = 'asking'; renderStage();
  var r = await ankiCall('requestPermission');
  ANKI.status = (!r.error && r.result && r.result.permission === 'granted') ? 'on' : (r.error === 'offline' ? 'off' : 'needs');
  renderStage();
}
async function ankiModel(type){
  var m = SR_MODELS[type], names = await ankiCall('modelNames');
  if (names.error) return names.error;
  if ((names.result || []).indexOf(m.modelName) >= 0) return null;
  var r = await ankiCall('createModel', m);
  return r.error || null;
}

var IC_ANKI = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="3.5" width="11" height="15" rx="2" transform="rotate(8 12 11)"/><rect x="4" y="5.5" width="11" height="15" rx="2" fill="var(--bg)"/><path d="M7.5 11h4M7.5 14h4"/></svg>';
var IC_GEAR = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

function ankiStatusHTML(){
  var s = ANKI.status;
  if (s === 'on') return '<p class="ak-st on"><i></i>Connected to Anki. Cards go straight into the ' + esc(ANKI_DECK) + ' deck.</p>';
  if (s === 'checking' || s === 'unknown') return '<p class="ak-st"><i></i>Looking for Anki</p>';
  if (s === 'asking') return '<p class="ak-st"><i></i>Click Yes in the Anki window that just opened.</p>';
  if (s === 'needs') return '<p class="ak-st warn"><i></i>Anki is open but has not allowed Senior Resident yet. <button type="button" class="lnk" data-anki="allow">Allow it</button></p>';
  return '<p class="ak-st off"><i></i>' + (EMBED ? 'Anki is not open on this computer, so cards are saved for export.' : 'Cards are saved here for export. To send them straight to Anki, use the Chrome extension.') + '</p>'
    + (EMBED ? '<details class="ak-how"><summary>Send cards straight to Anki</summary><ol><li>In desktop Anki, go to Tools, Add-ons, Get Add-ons.</li><li>Paste the code <b>2055492159</b> (AnkiConnect) and restart Anki.</li><li>Keep Anki open while you study, then press <button type="button" class="lnk" data-anki="recheck">Check again</button> and click Yes when Anki asks.</li></ol></details>' : '');
}
function ankiCfgHTML(c){
  var h = '<div class="ak-cfg"><b class="ak-lab">Card type</b>';
  TYPES.forEach(function(t){ h += '<label class="ak-opt"><input type="radio" name="aktype" data-anki="type" value="' + t[0] + '"' + (ANKI.type === t[0] ? ' checked' : '') + '><span><b>' + t[1] + '</b><small>' + t[2] + '</small></span></label>'; });
  var can = isChief();
  h += '<label class="ak-chk' + (can ? '' : ' dis') + '"><input type="checkbox" data-anki="qid"' + (ANKI.qid && can ? ' checked' : '') + (can ? '' : ' disabled') + '> Add the question ID to each card' + (can ? '' : ' <span class="muted sm">Chief plan</span>') + '</label>';
  return h + '<p class="muted sm">Cards use the Senior Resident note types. Restyle them any time in Anki under Tools, Manage Note Types.</p></div>';
}
function ankiHTML(c){
  var n = ANKI.queue.length, h = '<div class="anki"><div class="ak-row">';
  h += '<button type="button" class="ak-ic' + (c.ankiOpen ? ' on' : '') + '" data-anki="' + (c.ankiOpen ? 'close' : 'open') + '" data-tip="' + (c.ankiDone ? 'Card added. Add another' : 'Make an Anki card') + '" aria-label="Make an Anki card">' + IC_ANKI + (c.ankiDone ? '<em>✓</em>' : '') + '</button>';
  h += '<button type="button" class="ibs' + (ANKI.cfg ? ' on' : '') + '" data-anki="cfg" data-tip="Card settings" aria-label="Card settings">' + IC_GEAR + '</button>';
  if (n) h += '<span class="spacer"></span><span class="muted sm">' + n + ' waiting</span><button type="button" class="lnk" data-anki="export">Export for Anki</button>';
  h += '</div>';
  if (ANKI.cfg) h += ankiCfgHTML(c);
  if (c.ankiOpen){
    h += '<div class="ak-box"><label class="ak-lab" for="ankiTxt">What should this card cover?</label>'
      + '<textarea id="ankiTxt" rows="2" placeholder="Leave blank for the pearl, or say what you want: the trap you fell for, a cutoff, how to tell two diagnoses apart">' + esc(c.ankiTxt || '') + '</textarea>';
    if (c.ankiMsg) h += '<p class="ak-msg">' + esc(c.ankiMsg) + '</p>';
    h += '<div class="ak-row"><button type="button" class="btn" data-anki="make"' + (c.ankiBusy ? ' disabled' : '') + '>' + (c.ankiBusy ? 'Writing the card' : 'Make ' + (ANKI.type === 'cloze' ? 'cloze' : 'basic') + ' card') + '</button><button type="button" class="lnk" data-anki="close">Cancel</button></div>';
    h += ankiStatusHTML() + '</div>';
  }
  if (ANKI.last) h += '<p class="muted sm">Exported. In Anki, use File, Import and pick the file. <button type="button" class="lnk" data-anki="again">Download again</button></p>';
  return h + '</div>';
}

function mdBold(s){ return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
async function ankiMake(c){
  var t = document.getElementById('ankiTxt'); c.ankiTxt = t ? t.value : (c.ankiTxt || '');
  c.ankiBusy = true; c.ankiMsg = ''; renderStage();
  var r = c.reveal || {}, ask = (c.ankiTxt || '').trim(), type = ANKI.type;
  var shape = type === 'cloze'
    ? 'Write ONE cloze deletion note. Hide only the high-yield words with {{c1::...}}. Use 1 to 3 cloze numbers. Two values that belong together share one number. Never put the word "or" inside a cloze. Wrap the most important words in **double asterisks** to bold them, including inside a cloze. The text is 1 to 3 short sentences. Extra is one short line on why or what to watch for.\nOutput only JSON: {"text":"...","extra":"...","topic":"one or two words"}'
    : 'Write ONE basic flashcard. The front is ONE short line, a question about the rule, trap or cutoff. The back starts with the answer in one short line, then at most 2 short lines on why. Wrap the most important words in **double asterisks** to bold them.\nOutput only JSON: {"front":"...","back":"...","topic":"one or two words"}';
  var prompt = 'Write an Anki card for a medical student who just did this exam question.\n'
    + ctxText(c) + '\nCorrect answer and diagnosis: ' + (r.headline || '') + '\nPearl: ' + (r.pearl || '') + (r.trap ? '\nTrap: ' + r.trap : '')
    + '\n\nThe student wants the card to cover: ' + (ask || 'the pearl')
    + '\n\nRules: your own words only, never copy the question or its explanation. Never a full patient vignette. Plain text apart from the bold marks and cloze marks. No em dashes or semicolons. ' + SPELL[REGION] + '\n' + shape;
  var card;
  try {
    var out = await sample(prompt, { modelTier:'quick' }), m = out.text.match(/\{[\s\S]*\}/);
    card = JSON.parse(m ? m[0] : out.text);
    if (type === 'cloze' ? !/\{\{c\d+::/.test(card.text || '') : !(card.front && card.back)) throw 0;
  } catch(e){ c.ankiBusy = false; c.ankiMsg = 'Could not write the card. Try again.'; renderStage(); return; }
  var useQid = c.qid && !/^h/.test(c.qid) && ANKI.qid && isChief();
  var source = useQid ? (c.src || 'QID') + ' QID# ' + c.qid : '';
  var tags = ['SeniorResident'];
  if (card.topic) tags.push('SR::' + String(card.topic).replace(/[^\w-]+/g, '_'));
  if (useQid) tags.push('QID::' + String(c.qid).replace(/\W+/g, ''));
  var fields = type === 'cloze'
    ? { Text: mdBold(card.text).replace(/\{\{c(\d+)::/g, '{{c$1::'), Extra: mdBold(card.extra || ''), Source: esc(source) }
    : { Front: mdBold(card.front), Back: String(card.back).split(/\n+/).filter(Boolean).map(mdBold).join('<br>'), Source: esc(source) };
  var note = { type: type, fields: fields, tags: tags };
  if (ANKI.status !== 'on') await ankiCheck();
  if (ANKI.status === 'on'){
    var me = await ankiModel(type);
    if (!me){
      await ankiCall('createDeck', { deck: ANKI_DECK });
      var a = await ankiCall('addNote', { note: { deckName: ANKI_DECK, modelName: SR_MODELS[type].modelName, fields: fields, tags: tags, options: { allowDuplicate: false } } });
      if (!a.error){ ANKI.sent++; ankiSave(); c.ankiBusy = false; c.ankiOpen = false; c.ankiDone = true; c.ankiTxt = ''; c.ankiMsg = ''; renderStage(); return; }
      if (/duplicate/i.test(a.error)){ c.ankiBusy = false; c.ankiMsg = 'That card is already in Anki.'; renderStage(); return; }
      if (a.error !== 'offline') c.ankiMsg = 'Anki said: ' + a.error + '. The card is saved for export instead.';
    } else if (me !== 'offline') c.ankiMsg = 'Anki said: ' + me + '. The card is saved for export instead.';
  }
  ANKI.queue.push(note); ankiSave();
  c.ankiBusy = false; c.ankiOpen = !!c.ankiMsg; c.ankiDone = true; c.ankiTxt = '';
  renderStage();
}
/* export: Anki's own Cloze and Basic note types, so the file imports anywhere. The question ID goes in the extra field, small. */
function ankiFile(cards){
  function cell(s){ return String(s || '').replace(/[\t\r\n]+/g, ' '); }
  function src(n){ return n.fields.Source ? '<div style="margin-top:12px;font-size:12px;color:#8a97a8;text-align:right">' + n.fields.Source + '</div>' : ''; }
  var out = '', cl = cards.filter(function(n){ return n.type === 'cloze'; }), ba = cards.filter(function(n){ return n.type !== 'cloze'; });
  if (cl.length) out += '#separator:tab\n#html:true\n#notetype:Cloze\n#deck:' + ANKI_DECK + '\n#tags column:3\n' + cl.map(function(n){ return [cell(n.fields.Text), cell(n.fields.Extra + src(n)), cell(n.tags.join(' '))].join('\t'); }).join('\n') + '\n';
  return { cloze: out, basic: ba.length ? '#separator:tab\n#html:true\n#notetype:Basic\n#deck:' + ANKI_DECK + '\n#tags column:3\n' + ba.map(function(n){ return [cell(n.fields.Front), cell(n.fields.Back + src(n)), cell(n.tags.join(' '))].join('\t'); }).join('\n') + '\n' : '' };
}
function ankiDownload(f){
  var day = new Date().toISOString().slice(0, 10);
  [['cloze', f.cloze], ['basic', f.basic]].forEach(function(p){
    if (!p[1]) return;
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([p[1]], { type:'text/plain' }));
    a.download = 'senior-resident-anki-' + p[0] + '-' + day + '.txt'; document.body.appendChild(a); a.click(); a.remove();
  });
}
stage.addEventListener('click', function(e){
  var el = e.target.closest('[data-anki]'); if (!el) return;
  var c = cases[cur], k = el.dataset.anki;
  if (k === 'qid'){ ANKI.qid = el.checked; lsSet('sr_anki_qid', ANKI.qid); return; }
  if (k === 'type'){ ANKI.type = el.value; lsSet('sr_anki_type', ANKI.type); renderStage(); return; }
  if (k === 'cfg'){ ANKI.cfg = !ANKI.cfg; renderStage(); return; }
  if (k === 'export'){ if (!ANKI.queue.length) return; ANKI.last = ankiFile(ANKI.queue); ankiDownload(ANKI.last); ANKI.queue = []; ankiSave(); renderStage(); return; }
  if (k === 'again'){ if (ANKI.last) ankiDownload(ANKI.last); return; }
  if (k === 'allow'){ ankiAllow(); return; }
  if (k === 'recheck'){ ankiCheck().then(renderStage); renderStage(); return; }
  if (!c) return;
  if (k === 'open'){ if (!proGate()) return; c.ankiOpen = true; c.ankiMsg = ''; renderStage(); var t = document.getElementById('ankiTxt'); if (t) t.focus({ preventScroll:true }); if (ANKI.status !== 'on') ankiCheck().then(function(){ if (c.ankiOpen) renderStage(); }); return; }
  if (k === 'close'){ var tx = document.getElementById('ankiTxt'); c.ankiTxt = tx ? tx.value : ''; c.ankiOpen = false; renderStage(); return; }
  if (k === 'make'){ if (!c.ankiBusy) ankiMake(c); return; }
});
stage.addEventListener('input', function(e){ if (e.target && e.target.id === 'ankiTxt' && cases[cur]) cases[cur].ankiTxt = e.target.value; });
/* a hover label should not hang around while the page scrolls under a still cursor */
window.addEventListener('scroll', function(){ document.documentElement.classList.add('notip'); }, { passive:true });
window.addEventListener('mousemove', function(){ document.documentElement.classList.remove('notip'); }, { passive:true });
