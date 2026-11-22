/* ---------- Anki: one card per question, straight into Anki through AnkiConnect, or saved for export ---------- */
var ANKI = { status:'unknown', queue: lsGet('sr_anki_q', []), sent: lsGet('sr_anki_sent', 0), qid: lsGet('sr_anki_qid', true), last: '' };
var ANKI_DECK = 'Senior Resident', ankiSeq = 0, ankiWait = {};
function isPGY3(){ return !billingLive() || plan.tier === 'pgy3'; }
function ankiSave(){ lsSet('sr_anki_q', ANKI.queue); lsSet('sr_anki_sent', ANKI.sent); }

/* AnkiConnect only answers on this computer (127.0.0.1:8765). Only the Chrome extension can reach it, so the web app asks the side panel to call it. */
function ankiCall(action, params){
  return new Promise(function(res){
    if (!EMBED || window.parent === window) return res({ error:'offline' });
    var id = ++ankiSeq; ankiWait[id] = res;
    window.parent.postMessage({ type:'sr-anki', id:id, action:action, params:params || {} }, '*');
    setTimeout(function(){ if (ankiWait[id]){ delete ankiWait[id]; res({ error: action === 'requestPermission' ? 'timeout' : 'offline' }); } }, action === 'requestPermission' ? 60000 : 3000);
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
  if (!r.error) ANKI.status = 'on';
  else if (r.error === 'offline') ANKI.status = 'off';
  else ANKI.status = 'needs';
}
async function ankiAllow(){
  ANKI.status = 'asking'; renderStage();
  var r = await ankiCall('requestPermission');
  ANKI.status = (!r.error && r.result && r.result.permission === 'granted') ? 'on' : (r.error === 'offline' ? 'off' : 'needs');
  renderStage();
}

function ankiStatusHTML(){
  var s = ANKI.status;
  if (s === 'on') return '<p class="ak-st on"><i></i>Connected to Anki. Cards go straight into the ' + esc(ANKI_DECK) + ' deck.</p>';
  if (s === 'checking' || s === 'unknown') return '<p class="ak-st"><i></i>Looking for Anki</p>';
  if (s === 'asking') return '<p class="ak-st"><i></i>Click Yes in the Anki window that just opened.</p>';
  if (s === 'needs') return '<p class="ak-st warn"><i></i>Anki is open but has not allowed Senior Resident yet. <button type="button" class="lnk" data-anki="allow">Allow it</button></p>';
  return '<p class="ak-st off"><i></i>' + (EMBED ? 'Anki is not open on this computer, so cards are saved for export.' : 'Cards are saved here for export. To send them straight to Anki, use the Chrome extension.') + '</p>'
    + (EMBED ? '<details class="ak-how"><summary>Send cards straight to Anki</summary><ol><li>In desktop Anki, go to Tools, Add-ons, Get Add-ons.</li><li>Paste the code <b>2055492159</b> (AnkiConnect) and restart Anki.</li><li>Keep Anki open while you study, then press <button type="button" class="lnk" data-anki="recheck">Check again</button> and click Yes when Anki asks.</li></ol></details>' : '');
}
function ankiHTML(c){
  var n = ANKI.queue.length, h = '<div class="anki">';
  if (!c.ankiOpen){
    h += '<div class="ak-row"><button type="button" class="btn ghost ak-btn" data-anki="open">' + (c.ankiDone ? 'Card added. Add another' : 'Anki') + '</button>';
    if (n) h += '<span class="muted sm">' + n + ' card' + (n === 1 ? '' : 's') + ' waiting for export</span><button type="button" class="lnk" data-anki="export">Export</button>';
    return h + '</div></div>';
  }
  h += '<div class="ak-box"><label class="ak-lab" for="ankiTxt">What should this card cover?</label>'
    + '<textarea id="ankiTxt" rows="2" placeholder="Leave blank for the pearl, or say what you want: the trap you fell for, a cutoff, how to tell two diagnoses apart">' + esc(c.ankiTxt || '') + '</textarea>';
  if (c.qid && !/^h/.test(c.qid)){
    var can = isPGY3();
    h += '<label class="ak-chk' + (can ? '' : ' dis') + '"><input type="checkbox" data-anki="qid"' + (ANKI.qid && can ? ' checked' : '') + (can ? '' : ' disabled') + '> Add the question ID (' + esc(c.qid) + ')' + (can ? '' : ' <span class="muted sm">PGY3 tier</span>') + '</label>';
  }
  if (c.ankiMsg) h += '<p class="ak-msg">' + esc(c.ankiMsg) + '</p>';
  h += '<div class="ak-row"><button type="button" class="btn" data-anki="make"' + (c.ankiBusy ? ' disabled' : '') + '>' + (c.ankiBusy ? 'Writing the card' : 'Make card') + '</button><button type="button" class="lnk" data-anki="close">Cancel</button></div>';
  h += ankiStatusHTML();
  if (n) h += '<div class="ak-row"><span class="muted sm">' + n + ' card' + (n === 1 ? '' : 's') + ' this session waiting for export</span><span class="spacer"></span><button type="button" class="btn ghost" data-anki="export">Export for Anki</button></div>';
  if (ANKI.last) h += '<p class="muted sm">Exported. In Anki, use File, Import and pick the file. <button type="button" class="lnk" data-anki="again">Download again</button></p>';
  return h + '</div></div>';
}

async function ankiMake(c){
  var t = document.getElementById('ankiTxt'); c.ankiTxt = t ? t.value : (c.ankiTxt || '');
  c.ankiBusy = true; c.ankiMsg = ''; renderStage();
  var r = c.reveal || {}, ask = (c.ankiTxt || '').trim();
  var prompt = 'Write ONE Anki flashcard for a medical student who just finished this exam question.\n'
    + ctxText(c) + '\nCorrect answer and diagnosis: ' + (r.headline || '') + '\nPearl: ' + (r.pearl || '') + (r.trap ? '\nTrap: ' + r.trap : '')
    + '\n\nThe student wants the card to cover: ' + (ask || 'the pearl') + '\n\nRules: write everything in your own words, never copy the question or its explanation. The front is ONE short line, a question about the rule, trap or cutoff, never a full patient vignette. The back starts with the answer in one short line, then at most 2 short lines on why or what to watch for. Plain text, no markdown, no em dashes or semicolons. ' + SPELL[REGION]
    + '\nOutput only JSON: {"front":"...","back":"...","topic":"one or two words"}';
  var card;
  try {
    var out = await sample(prompt, { modelTier:'quick' }), m = out.text.match(/\{[\s\S]*\}/);
    card = JSON.parse(m ? m[0] : out.text);
    if (!card.front || !card.back) throw 0;
  } catch(e){ c.ankiBusy = false; c.ankiMsg = 'Could not write the card. Try again.'; renderStage(); return; }
  var useQid = c.qid && !/^h/.test(c.qid) && ANKI.qid && isPGY3();
  var lines = String(card.back).split(/\n+/).filter(Boolean);
  var back = '<b>' + esc(lines.shift()) + '</b>' + (lines.length ? '<br>' + lines.map(esc).join('<br>') : '') + (useQid ? '<br><br><span style="opacity:.6;font-size:.85em">' + esc((c.src || 'QID') + ' ' + c.qid) + '</span>' : '');
  var tags = ['SeniorResident'];
  if (card.topic) tags.push('SR::' + String(card.topic).replace(/[^\w-]+/g, '_'));
  if (useQid) tags.push('QID::' + String(c.qid).replace(/\W+/g, ''));
  var note = { front: esc(card.front), back: back, tags: tags };
  if (ANKI.status !== 'on') await ankiCheck();
  if (ANKI.status === 'on'){
    await ankiCall('createDeck', { deck: ANKI_DECK });
    var a = await ankiCall('addNote', { note: { deckName: ANKI_DECK, modelName: 'Basic', fields: { Front: note.front, Back: note.back }, tags: tags, options: { allowDuplicate: false } } });
    if (!a.error){ ANKI.sent++; ankiSave(); c.ankiBusy = false; c.ankiOpen = false; c.ankiDone = true; c.ankiTxt = ''; c.ankiMsg = ''; renderStage(); return; }
    if (/duplicate/i.test(a.error)){ c.ankiBusy = false; c.ankiMsg = 'That card is already in Anki.'; renderStage(); return; }
    if (a.error !== 'offline'){ c.ankiBusy = false; c.ankiMsg = 'Anki said: ' + a.error + '. The card is saved for export instead.'; }
  }
  ANKI.queue.push(note); ankiSave();
  c.ankiBusy = false; c.ankiOpen = false; c.ankiDone = true; c.ankiTxt = '';
  renderStage();
}
function ankiFile(cards){
  function cell(s){ return String(s || '').replace(/[\t\r\n]+/g, ' '); }
  return '#separator:tab\n#html:true\n#notetype:Basic\n#deck:' + ANKI_DECK + '\n#tags column:3\n'
    + cards.map(function(n){ return [cell(n.front), cell(n.back), cell((n.tags || []).join(' '))].join('\t'); }).join('\n') + '\n';
}
function ankiDownload(txt){
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type:'text/plain' }));
  a.download = 'senior-resident-anki-' + new Date().toISOString().slice(0, 10) + '.txt'; document.body.appendChild(a); a.click(); a.remove();
}
stage.addEventListener('click', function(e){
  var el = e.target.closest('[data-anki]'); if (!el) return;
  var c = cases[cur], k = el.dataset.anki;
  if (k === 'qid'){ ANKI.qid = el.checked; lsSet('sr_anki_qid', ANKI.qid); return; }
  if (k === 'export'){ if (!ANKI.queue.length) return; ANKI.last = ankiFile(ANKI.queue); ankiDownload(ANKI.last); ANKI.queue = []; ankiSave(); if (c) c.ankiOpen = true; renderStage(); return; }
  if (k === 'again'){ if (ANKI.last) ankiDownload(ANKI.last); return; }
  if (k === 'allow'){ ankiAllow(); return; }
  if (k === 'recheck'){ ankiCheck().then(renderStage); renderStage(); return; }
  if (!c) return;
  if (k === 'open'){ if (!proGate()) return; c.ankiOpen = true; c.ankiMsg = ''; renderStage(); var t = document.getElementById('ankiTxt'); if (t) t.focus({ preventScroll:true }); if (ANKI.status === 'unknown' || ANKI.status === 'off') ankiCheck().then(function(){ if (c.ankiOpen) renderStage(); }); return; }
  if (k === 'close'){ var tx = document.getElementById('ankiTxt'); c.ankiTxt = tx ? tx.value : ''; c.ankiOpen = false; renderStage(); return; }
  if (k === 'make'){ if (!c.ankiBusy) ankiMake(c); return; }
});
stage.addEventListener('input', function(e){ if (e.target && e.target.id === 'ankiTxt' && cases[cur]) cases[cur].ankiTxt = e.target.value; });
/* a hover label should not hang around while the page scrolls under a still cursor */
window.addEventListener('scroll', function(){ document.documentElement.classList.add('notip'); }, { passive:true });
window.addEventListener('mousemove', function(){ document.documentElement.classList.remove('notip'); }, { passive:true });
