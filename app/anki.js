/* ---------- Anki: one card per question, straight into Anki through AnkiConnect, or saved for export ---------- */
var ANKI = { status:'unknown', queue: lsGet('sr_anki_q', []), sent: lsGet('sr_anki_sent', 0), qid: lsGet('sr_anki_qid', true), type: lsGet('sr_anki_type', 'cloze'), last: '', cfg: false, mode:'q', io:null, synced:{} };
var ANKI_DECK = 'My Senior Resident', ankiSeq = 0, ankiWait = {};
ANKI.queue = ANKI.queue.map(function(n){ return n.fields ? n : { type:'basic', fields:{ Front:n.front || '', Back:n.back || '', Source:'' }, tags:n.tags || ['SeniorResident'] }; });
function isChief(){ return !billingLive() || plan.name === 'chief'; }
function ankiSave(){ lsSet('sr_anki_q', ANKI.queue); lsSet('sr_anki_sent', ANKI.sent); }

/* shelf deck look: cream card, bold title, a table of facts with one blank per row, red for the highest yield. Restyle any time in Anki under Tools, Manage Note Types. */
var SR_CSS = '/*sr-v2*/.card{font-family:-apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif;font-size:23px;line-height:1.55;text-align:left;background:#faf7f0!important;color:#1f2a24!important;padding:6px 8px}'
  + '.card.nightMode,.nightMode .card{background:#faf7f0!important;color:#1f2a24!important}.wrap{max-width:100%;margin:0 auto}'
  + '.topic{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#a89264!important;margin-bottom:6px}.topic:empty{display:none}'
  + '.cloze,.nightMode .cloze{background:#ffe9a8!important;color:#0b5c42!important;font-weight:700;padding:0 7px;border-radius:7px;box-shadow:0 1px 3px rgba(184,134,11,.35)}'
  + '.red,.nightMode .red{color:#c0392b!important;font-weight:700}.red .cloze,.nightMode .red .cloze{color:#c0392b!important;font-weight:800}'
  + 'hr.ans{border:none;border-top:3px solid #b8860b;margin:8px 0 6px}'
  + '.extra{background:#f7edd6;border:1px solid #e5cf9a;border-radius:10px;padding:6px 8px;font-size:.84em;color:#1f2a24!important}'
  + '.vd{font-weight:800;color:#0f6b4f!important;margin:4px 0 6px}.mist{background:#fff3d6;border-left:4px solid #f59e0b;border-radius:8px;padding:3px 8px;margin:8px 0 2px;font-size:.9em}'
  + 'table.t{border-collapse:collapse;width:100%;margin:6px 0;font-size:.95em;table-layout:fixed}table.t th{background:#0f6b4f!important;color:#fff!important;padding:4px 8px;text-align:left}'
  + 'table.t td{border:1px solid #e5cf9a;padding:4px 8px;vertical-align:top;color:#1f2a24!important;overflow-wrap:break-word}table.t tr:nth-child(even) td{background:#fffdf5}'
  + 'table.t.lab tr:first-child>th:first-child{width:24%}table.t.lab td:first-child{font-weight:600}td::first-letter{text-transform:uppercase}'
  + '.src{margin-top:11px;padding:6px 7px 1px;background:#fffdf5;border:2px solid #b8860b;border-radius:14px;font-size:13px;color:#6f6140!important}'
  + '.src::before{content:"From this question";display:block;font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#7a5c12;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e5cf9a}'
  + '.src .qm{margin:0 0 9px;padding:5px 8px;background:#eef4fb;border:1px solid #bcd3ea;border-left:5px solid #2c5d8f;border-radius:10px}'
  + '.src .qh{font-size:11px;font-weight:500;color:#a9bbcf!important;margin-bottom:2px}.src .qpa{font-size:13px;color:#6f6140!important;margin-bottom:6px}.src .qpa b{color:#1f2a24!important}'
  + '.src .qwhy,.src .qok{font-size:14px;color:#1f2a24!important;margin-bottom:6px}.qt{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;margin:4px 0 1px}.qwhy .qt{color:#8b1a1a!important}.qok .qt,.mist .qt{color:#0f6b4f!important}.mist .qt{color:#9a5b00!important}'
  + '.iohd{font-weight:700;margin-bottom:6px}.ioc{text-align:center}.io{position:relative;display:inline-block;max-width:100%}.io img{display:block;max-width:100%;height:auto;border-radius:8px}'
  + '.iob{position:absolute;box-sizing:border-box;background:#ffe9a8;border:2px solid #b8860b;border-radius:5px}.iob.on{background:#c0392b;border-color:#8b1a1a}.iob.rv{background:transparent;border:3px solid #c0392b}';
var IO_JS = '<span id="iod" hidden>{{Occlusion}}</span><script>(function(){try{var d=document.getElementById("iod").textContent,io=document.getElementById("io"),back=!!document.getElementById("ioback");'
  + 'var cls=((document.querySelector(".card")||{}).className||"")+" "+document.body.className+" "+document.documentElement.className,m=cls.match(/\\bcard(\\d+)\\b/),cur=m?+m[1]:1;'
  + 'var re=/\\{\\{c(\\d+)::([\\d.]+),([\\d.]+),([\\d.]+),([\\d.]+)\\}\\}/g,x;while((x=re.exec(d))){var n=+x[1],b=document.createElement("div");b.className="iob"+(n===cur?(back?" rv":" on"):"");'
  + 'b.style.left=x[2]*100+"%";b.style.top=x[3]*100+"%";b.style.width=x[4]*100+"%";b.style.height=x[5]*100+"%";io.appendChild(b);}}catch(e){}})();</script>';
var IO_FACE = '<div class="wrap">{{#Header}}<div class="iohd">{{Header}}</div>{{/Header}}<div class="ioc"><div class="io" id="io">{{Image}}</div></div><div hidden>{{cloze:Occlusion}}</div>';
var SR_MODELS = {
  cloze: { modelName:'My Senior Resident Cloze', inOrderFields:['Text','Extra','Source'], isCloze:true, css:SR_CSS,
    cardTemplates:[{ Name:'Cloze', Front:'<div class="wrap">{{cloze:Text}}</div>', Back:'<div class="wrap">{{cloze:Text}}<hr class="ans">{{#Extra}}<div class="extra">{{Extra}}</div>{{/Extra}}{{#Source}}<div class="src">{{Source}}</div>{{/Source}}</div>' }] },
  basic: { modelName:'My Senior Resident Basic', inOrderFields:['Front','Back','Source'], css:SR_CSS,
    cardTemplates:[{ Name:'Card 1', Front:'<div class="wrap">{{Front}}</div>', Back:'<div class="wrap">{{Front}}<hr class="ans">{{Back}}{{#Source}}<div class="src">{{Source}}</div>{{/Source}}</div>' }] },
  io: { modelName:'My Senior Resident Occlusion', inOrderFields:['Occlusion','Image','Header','Back Extra','Source'], isCloze:true, css:SR_CSS,
    cardTemplates:[{ Name:'Cloze', Front: IO_FACE + '</div>' + IO_JS, Back: IO_FACE + '<i id="ioback"></i>{{#Back Extra}}<hr class="ans"><div class="extra">{{Back Extra}}</div>{{/Back Extra}}{{#Source}}<div class="src">{{Source}}</div>{{/Source}}</div>' + IO_JS }] }
};
var TYPES = [['cloze','Fact table','A bold topic, then a table with one blank per row. Red marks the highest yield.'], ['basic','Question and answer','One line on the front. The answer and what to watch for on the back.']];

/* AnkiConnect only answers on this computer (127.0.0.1:8765). Only the Chrome extension can reach it, so the web app asks the side panel to call it. */
function ankiCall(action, params){
  return new Promise(function(res){
    if (!EMBED || window.parent === window) return res({ error:'offline' });
    var id = ++ankiSeq; ankiWait[id] = res;
    window.parent.postMessage({ type:'sr-anki', id:id, action:action, params:params || {} }, '*');
    var wait = action === 'requestPermission' ? 60000 : action === 'storeMediaFile' ? 20000 : 6000;
    setTimeout(function(){ if (ankiWait[id]){ delete ankiWait[id]; res({ error: action === 'requestPermission' ? 'timeout' : 'offline' }); } }, wait);
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
/* make the note type if it is missing, and bring an older copy up to the current look once per visit */
async function ankiModel(type){
  var m = SR_MODELS[type], names = await ankiCall('modelNames');
  if (names.error) return names.error;
  if ((names.result || []).indexOf(m.modelName) < 0){ var r = await ankiCall('createModel', m); if (!r.error) ANKI.synced[type] = 1; return r.error || null; }
  if (!ANKI.synced[type]){
    var tpl = {}; m.cardTemplates.forEach(function(t){ tpl[t.Name] = { Front:t.Front, Back:t.Back }; });
    await ankiCall('updateModelStyling', { model:{ name:m.modelName, css:m.css } });
    await ankiCall('updateModelTemplates', { model:{ name:m.modelName, templates:tpl } });
    ANKI.synced[type] = 1;
  }
  return null;
}

var IC_ANKI = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="3.5" width="11" height="15" rx="2" transform="rotate(8 12 11)"/><rect x="4" y="5.5" width="11" height="15" rx="2" fill="var(--bg)"/><path d="M7.5 11h4M7.5 14h4"/></svg>';
var IC_GEAR = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

function ankiStatusHTML(){
  var s = ANKI.status;
  if (s === 'on') return '<p class="ak-st on"><i></i>Connected to Anki. Cards go straight into the ' + esc(ANKI_DECK) + ' deck.</p>';
  if (s === 'checking' || s === 'unknown') return '<p class="ak-st"><i></i>Looking for Anki</p>';
  if (s === 'asking') return '<p class="ak-st"><i></i>Click Yes in the Anki window that just opened.</p>';
  if (s === 'needs') return '<p class="ak-st warn"><i></i>Anki is open but has not allowed My Senior Resident yet. <button type="button" class="lnk" data-anki="allow">Allow it</button></p>';
  var io = ANKI.mode === 'img';
  return '<p class="ak-st off"><i></i>' + (EMBED ? (io ? 'Image cards go straight into Anki, so open Anki first.' : 'Anki is not open on this computer, so cards are saved for export.') : (io ? 'Image cards need the Chrome extension with Anki open.' : 'Cards are saved here for export. To send them straight to Anki, use the Chrome extension.')) + '</p>'
    + (EMBED ? '<details class="ak-how"><summary>Send cards straight to Anki</summary><ol><li>In desktop Anki, go to Tools, Add-ons, Get Add-ons.</li><li>Paste the code <b>2055492159</b> (AnkiConnect) and restart Anki.</li><li>Keep Anki open while you study, then press <button type="button" class="lnk" data-anki="recheck">Check again</button> and click Yes when Anki asks.</li></ol></details>' : '');
}
function ankiCfgHTML(c){
  var h = '<div class="ak-cfg"><b class="ak-lab">Card style</b>';
  TYPES.forEach(function(t){ h += '<label class="ak-opt"><input type="radio" name="aktype" data-anki="type" value="' + t[0] + '"' + (ANKI.type === t[0] ? ' checked' : '') + '><span><b>' + t[1] + '</b><small>' + t[2] + '</small></span></label>'; });
  var can = isChief();
  h += '<label class="ak-chk' + (can ? '' : ' dis') + '"><input type="checkbox" data-anki="qid"' + (ANKI.qid && can ? ' checked' : '') + (can ? '' : ' disabled') + '> Add the question ID to each card' + (can ? '' : ' <span class="muted sm">Chief plan</span>') + '</label>';
  return h + '<p class="muted sm">Cards use the My Senior Resident note types. Restyle them any time in Anki under Tools, Manage Note Types.</p></div>';
}
function ankiIOHTML(){
  var io = ANKI.io;
  if (!io || !io.src) return (io && io.msg ? '<p class="ak-msg ok">' + esc(io.msg) + '</p>' : '') + '<label class="ak-drop" tabindex="0"><input type="file" accept="image/*" data-anki="file" hidden><b>Upload or paste an image</b><small>A screenshot, a diagram, an ECG or an X-ray. Then drag a box over each part to hide. It goes from this computer straight to Anki.</small></label>';
  var h = '<div class="ak-io" id="akIO"><img src="' + io.src + '" alt="" draggable="false">';
  io.boxes.forEach(function(b, i){ h += '<div class="ak-b" style="left:' + b.x * 100 + '%;top:' + b.y * 100 + '%;width:' + b.w * 100 + '%;height:' + b.h * 100 + '%"><span>' + (i + 1) + '</span><button type="button" data-anki="rmbox" data-i="' + i + '" aria-label="Remove box ' + (i + 1) + '">×</button></div>'; });
  h += '</div><p class="muted sm">' + (io.boxes.length ? io.boxes.length + ' box' + (io.boxes.length > 1 ? 'es' : '') + '. Each one becomes its own card. Drag to add more.' : 'Drag across the image to hide a part.') + '</p>';
  h += '<div class="ak-row ak-hide"><input class="ak-in" id="akHide" placeholder="What should be hidden? eg, every label, the drug names" value="' + esc(io.hide || '') + '"><button type="button" class="btn ghost sm" data-anki="ioauto"' + (io.auto ? ' disabled' : '') + '>' + (io.auto ? 'Boxing' : 'Box it for me') + '</button></div>';
  h += '<input class="ak-in" id="akHead" placeholder="Title on the card (optional)" value="' + esc(io.header || '') + '">';
  h += '<input class="ak-in" id="akExtra" placeholder="Note on the back (optional)" value="' + esc(io.extra || '') + '">';
  if (io.msg) h += '<p class="ak-msg">' + esc(io.msg) + '</p>';
  var n = io.boxes.length;
  h += '<div class="ak-row"><button type="button" class="btn" data-anki="ioadd"' + (io.busy || !n ? ' disabled' : '') + '>' + (io.busy ? 'Adding to Anki' : n ? 'Add ' + n + ' card' + (n > 1 ? 's' : '') + ' to Anki' : 'Add to Anki') + '</button><button type="button" class="lnk" data-anki="ioclear">New image</button></div>';
  return h;
}
function ankiHTML(c){
  var n = ANKI.queue.length, h = '<div class="anki"><div class="ak-row">';
  h += '<button type="button" class="ak-ic' + (c.ankiOpen ? ' on' : '') + '" data-anki="' + (c.ankiOpen ? 'close' : 'open') + '" data-tip="' + (c.ankiDone ? 'Card added. Add another' : 'Make an Anki card') + '" aria-label="Make an Anki card">' + IC_ANKI + (c.ankiDone ? '<em>✓</em>' : '') + '</button>';
  h += '<button type="button" class="ibs' + (ANKI.cfg ? ' on' : '') + '" data-anki="cfg" data-tip="Card settings" aria-label="Card settings">' + IC_GEAR + '</button>';
  if (n) h += '<span class="spacer"></span><span class="muted sm">' + n + ' waiting</span><button type="button" class="lnk" data-anki="export">Export for Anki</button>';
  h += '</div>';
  if (ANKI.cfg) h += ankiCfgHTML(c);
  if (c.ankiOpen){
    h += '<div class="ak-box"><div class="ak-seg" role="tablist"><button type="button" data-anki="mode" data-m="q" class="' + (ANKI.mode === 'q' ? 'on' : '') + '">From this question</button><button type="button" data-anki="mode" data-m="img" class="' + (ANKI.mode === 'img' ? 'on' : '') + '">From an image</button></div>';
    if (ANKI.mode === 'img') h += ankiIOHTML();
    else {
      h += '<label class="ak-lab" for="ankiTxt">What should this card cover?</label>'
        + '<textarea id="ankiTxt" rows="2" placeholder="Leave blank for the pearl, or say what you want: the trap you fell for, a cutoff, how to tell two diagnoses apart">' + esc(c.ankiTxt || '') + '</textarea>';
      if (c.ankiMsg) h += '<p class="ak-msg">' + esc(c.ankiMsg) + '</p>';
      h += '<div class="ak-row"><button type="button" class="btn" data-anki="make"' + (c.ankiBusy ? ' disabled' : '') + '>' + (c.ankiBusy ? 'Writing the card' : 'Make card') + '</button><button type="button" class="lnk" data-anki="close">Cancel</button></div>';
    }
    h += ankiStatusHTML() + '</div>';
  }
  if (ANKI.last) h += '<p class="muted sm">Exported. In Anki, use File, Import and pick the file. <button type="button" class="lnk" data-anki="again">Download again</button></p>';
  return h + '</div>';
}

/* **word** marks the highest-yield words, shown in red like a shelf deck */
function mdRed(s){ return esc(s).replace(/\*\*(.+?)\*\*/g, '<span class="red">$1</span>'); }
function srcHTML(c, useQid){
  var r = c.reveal || {}, h = '<div class="qm">';
  if (useQid) h += '<div class="qh">' + esc((c.src || 'QID') + ' QID# ' + c.qid) + '</div>';
  if (r.headline) h += '<div class="qpa">The answer is <b>' + esc(r.headline) + '</b>.</div>';
  if (r.trap) h += '<div class="qwhy"><div class="qt">The trap</div>' + esc(r.trap) + '</div>';
  if (r.pearl) h += '<div class="qok"><div class="qt">Why the answer is right</div>' + esc(r.pearl) + '</div>';
  return h === '<div class="qm">' ? '' : h + '</div>';
}
async function ankiMake(c){
  var t = document.getElementById('ankiTxt'); c.ankiTxt = t ? t.value : (c.ankiTxt || '');
  c.ankiBusy = true; c.ankiMsg = ''; renderStage();
  var r = c.reveal || {}, ask = (c.ankiTxt || '').trim(), type = ANKI.type;
  var shape = type === 'cloze'
    ? 'Write ONE fact-table cloze note like a shelf exam deck. A short topic title, then 3 to 6 table rows. Each row is a short label (Cause, Presentation, Key finding, Next step, Treatment, Look-alike, Cutoff) and a detail. In every detail hide the high-yield words with a cloze. Each row gets its own cloze number in order (row 1 uses {{c1::...}}, row 2 uses {{c2::...}}). Two values that belong together share one number. For a list, number the items (1), (2) and give every item the same cloze number. Never put "or" inside a cloze. Wrap the one or two highest-yield clozes in **double asterisks** like **{{c2::...}}**. Keep each detail under 20 words. Extra is one short line: the pearl or the trap.\nOutput only JSON: {"title":"...","rows":[["label","detail"]],"extra":"...","topic":"one or two words"}'
    : 'Write ONE question-and-answer card. The front is ONE short line naming the decision, ending in a question. The verdict is one short line with the rule or cutoff. Watch is one short line: the trap, the look-alike, or the clue that flips it. Wrap the most important words in **double asterisks**.\nOutput only JSON: {"front":"...","verdict":"...","watch":"...","topic":"one or two words"}';
  var prompt = 'Write an Anki card for a medical student who just did this exam question.\n'
    + ctxText(c) + '\nCorrect answer and diagnosis: ' + (r.headline || '') + '\nPearl: ' + (r.pearl || '') + (r.trap ? '\nTrap: ' + r.trap : '')
    + '\n\nThe student wants the card to cover: ' + (ask || 'the pearl')
    + '\n\nRules: your own words only, never copy the question or its explanation. Never a full patient vignette. Plain text apart from the bold marks and cloze marks. No em dashes or semicolons. ' + SPELL[REGION] + '\n' + shape;
  var card;
  try {
    var out = await sample(prompt, { modelTier:'quick' }), m = out.text.match(/\{[\s\S]*\}/);
    card = JSON.parse(m ? m[0] : out.text);
    if (type === 'cloze' ? !(card.rows && card.rows.length && /\{\{c\d+::/.test(JSON.stringify(card.rows))) : !(card.front && card.verdict)) throw 0;
  } catch(e){ c.ankiBusy = false; c.ankiMsg = 'Could not write the card. Try again.'; renderStage(); return; }
  var useQid = c.qid && !/^h/.test(c.qid) && ANKI.qid && isChief();
  var tags = ['SeniorResident'];
  if (card.topic) tags.push('SR::' + String(card.topic).replace(/[^\w-]+/g, '_'));
  if (useQid) tags.push('QID::' + String(c.qid).replace(/\W+/g, ''));
  var fields = type === 'cloze'
    ? { Text: '<b>' + esc(card.title || card.topic || '') + '</b><table class="t lab"><tr><th>Feature</th><th>Detail</th></tr>' + card.rows.map(function(row){ return '<tr><td>' + esc(row[0] || '') + '</td><td>' + mdRed(row[1] || '') + '</td></tr>'; }).join('') + '</table>',
        Extra: mdRed(card.extra || ''), Source: srcHTML(c, useQid) }
    : { Front: '<b>' + mdRed(card.front) + '</b>', Back: '<div class="vd">' + mdRed(card.verdict) + '</div>' + (card.watch ? '<div class="mist"><div class="qt">Watch out</div>' + mdRed(card.watch) + '</div>' : ''), Source: srcHTML(c, useQid) };
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

/* image occlusion: the picture stays on this computer and goes straight into Anki. Each box is one cloze, stored as fractions of the picture size. */
function ioLoad(file){
  if (!file || !/^image\//.test(file.type)) return;
  var fr = new FileReader();
  fr.onload = function(){
    var im = new Image();
    im.onload = function(){
      var k = Math.min(1, 1600 / Math.max(im.width, im.height)), cv = document.createElement('canvas');
      cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
      var g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, cv.width, cv.height);
      ANKI.io = { src: cv.toDataURL('image/jpeg', 0.9), boxes: [], header: '', extra: '' };
      renderStage();
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}
function ioKeep(){ var io = ANKI.io; if (!io) return; var a = document.getElementById('akHead'), b = document.getElementById('akExtra'), d = document.getElementById('akHide'); if (a) io.header = a.value; if (b) io.extra = b.value; if (d) io.hide = d.value; }
/* Describe what to hide and the model places the boxes. They land as normal boxes, so any can be removed or redrawn. */
async function ioAuto(){
  var io = ANKI.io; if (!io || !io.src || io.auto) return;
  ioKeep(); var want = String(io.hide || '').trim();
  if (!want){ io.msg = 'Write what should be hidden first, for example every label.'; renderStage(); return; }
  io.auto = true; io.msg = ''; renderStage();
  try {
    var blob = await (await fetch(io.src)).blob();
    var r = await sample('You place image occlusion boxes for an Anki card. Look at the image and find every region that matches this request: "' + want.replace(/"/g, "'") + '".\n'
      + 'Return ONLY a JSON array, no other text. One object per region: {"x":left,"y":top,"w":width,"h":height}, each a fraction of the full image width or height between 0 and 1. '
      + 'Each box covers one item (one label, one word group, one structure) tightly with a small margin, in reading order top to bottom, left to right. At most 40 boxes. If nothing matches, return [].',
      { images:[blob], modelTier:'default' });
    var m = r.text.match(/\[[\s\S]*\]/), arr = m ? JSON.parse(m[0]) : [];
    var cl = function(v){ v = +v; return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0; };
    var add = (Array.isArray(arr) ? arr : []).map(function(b){ var x = cl(b.x), y = cl(b.y); return { x:x, y:y, w:Math.min(cl(b.w), 1 - x), h:Math.min(cl(b.h), 1 - y) }; })
      .filter(function(b){ return b.w > 0.008 && b.h > 0.008; }).slice(0, 40);
    io.boxes = io.boxes.concat(add);
    io.msg = add.length ? add.length + ' box' + (add.length > 1 ? 'es' : '') + ' placed. Check them, remove any that are off, drag to add missing ones.' : 'Nothing matched. Try describing it another way, or drag the boxes yourself.';
  } catch(e){ io.msg = e && e.code === 'pro_only' ? 'Box it for me is part of the paid plans.' : 'Could not place boxes right now. Drag them yourself or try again.'; }
  io.auto = false; renderStage();
}
async function ioAdd(c){
  var io = ANKI.io; if (!io || !io.boxes.length || io.busy) return;
  ioKeep(); io.busy = true; io.msg = ''; renderStage();
  function done(msg){ io.busy = false; io.msg = msg || ''; renderStage(); }
  if (ANKI.status !== 'on') await ankiCheck();
  if (ANKI.status !== 'on') return done('Open Anki on this computer, then try again.');
  var me = await ankiModel('io'); if (me) return done(me === 'offline' ? 'Lost Anki. Check it is still open.' : 'Anki said: ' + me);
  var fn = 'sr_io_' + Date.now() + '.jpg';
  var s = await ankiCall('storeMediaFile', { filename: fn, data: io.src.split(',')[1] });
  if (s.error) return done('Anki could not save the image: ' + s.error);
  function f(v){ return Math.max(0, Math.min(1, v)).toFixed(4); }
  var useQid = c && c.qid && !/^h/.test(c.qid) && ANKI.qid && isChief();
  var tags = ['SeniorResident', 'SR::ImageOcclusion']; if (useQid) tags.push('QID::' + String(c.qid).replace(/\W+/g, ''));
  await ankiCall('createDeck', { deck: ANKI_DECK });
  var a = await ankiCall('addNote', { note: { deckName: ANKI_DECK, modelName: SR_MODELS.io.modelName, tags: tags, options: { allowDuplicate: true },
    fields: { Occlusion: io.boxes.map(function(b, i){ return '{{c' + (i + 1) + '::' + f(b.x) + ',' + f(b.y) + ',' + f(b.w) + ',' + f(b.h) + '}}'; }).join(' '),
      Image: '<img src="' + fn + '">', Header: esc(io.header || ''), 'Back Extra': esc(io.extra || ''), Source: useQid ? '<div class="qm"><div class="qh">' + esc((c.src || 'QID') + ' QID# ' + c.qid) + '</div></div>' : '' } } });
  if (a.error) return done('Anki said: ' + a.error);
  ANKI.sent++; ankiSave();
  var n = io.boxes.length; ANKI.io = null; if (c) c.ankiDone = true;
  ANKI.io = { msg: n + ' card' + (n > 1 ? 's' : '') + ' added to Anki. Upload or paste another image any time.' };
  renderStage();
}
var ioDrag = null;
stage.addEventListener('pointerdown', function(e){
  var box = e.target.closest('#akIO'); if (!box || e.target.closest('button') || !ANKI.io) return;
  e.preventDefault();
  var r = box.getBoundingClientRect(), t = document.createElement('div'); t.className = 'ak-b tmp'; box.appendChild(t);
  ioDrag = { r: r, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, el: t, box: box };
  try { box.setPointerCapture(e.pointerId); } catch(x){}
});
stage.addEventListener('pointermove', function(e){
  if (!ioDrag) return;
  var d = ioDrag, x = Math.max(0, Math.min(1, (e.clientX - d.r.left) / d.r.width)), y = Math.max(0, Math.min(1, (e.clientY - d.r.top) / d.r.height));
  d.b = { x: Math.min(d.x, x), y: Math.min(d.y, y), w: Math.abs(x - d.x), h: Math.abs(y - d.y) };
  d.el.style.cssText = 'left:' + d.b.x * 100 + '%;top:' + d.b.y * 100 + '%;width:' + d.b.w * 100 + '%;height:' + d.b.h * 100 + '%';
});
function ioEnd(){ if (!ioDrag) return; var d = ioDrag; ioDrag = null; if (d.b && d.b.w > 0.012 && d.b.h > 0.012 && ANKI.io){ ioKeep(); ANKI.io.boxes.push(d.b); ANKI.io.msg = ''; renderStage(); } else d.el.remove(); }
stage.addEventListener('pointerup', ioEnd); stage.addEventListener('pointercancel', ioEnd);
stage.addEventListener('change', function(e){ if (e.target && e.target.dataset && e.target.dataset.anki === 'file') ioLoad(e.target.files && e.target.files[0]); });
document.addEventListener('paste', function(e){
  var c = cases[cur]; if (!c || !c.ankiOpen || ANKI.mode !== 'img') return;
  var it = [].slice.call((e.clipboardData || {}).items || []).find(function(i){ return /^image\//.test(i.type); });
  if (it){ e.preventDefault(); ioLoad(it.getAsFile()); }
});
stage.addEventListener('dragover', function(e){ if (e.target.closest && e.target.closest('.ak-drop')) e.preventDefault(); });
stage.addEventListener('drop', function(e){ if (e.target.closest && e.target.closest('.ak-drop')){ e.preventDefault(); ioLoad(e.dataTransfer.files[0]); } });
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
  if (k === 'mode'){ var tx2 = document.getElementById('ankiTxt'); if (tx2) c.ankiTxt = tx2.value; ioKeep(); ANKI.mode = el.dataset.m; renderStage(); return; }
  if (k === 'rmbox'){ ioKeep(); if (ANKI.io && ANKI.io.boxes) ANKI.io.boxes.splice(+el.dataset.i, 1); renderStage(); return; }
  if (k === 'ioclear'){ ANKI.io = null; renderStage(); return; }
  if (k === 'ioadd'){ ioAdd(c); return; }
  if (k === 'ioauto'){ ioAuto(); return; }
});
stage.addEventListener('input', function(e){ if (e.target && e.target.id === 'ankiTxt' && cases[cur]) cases[cur].ankiTxt = e.target.value; });
/* a hover label should not hang around while the page scrolls under a still cursor */
window.addEventListener('scroll', function(){ document.documentElement.classList.add('notip'); }, { passive:true });
window.addEventListener('mousemove', function(){ document.documentElement.classList.remove('notip'); }, { passive:true });
