(function(){
  var VER = ''; try { VER = chrome.runtime.getManifest().version; } catch(e){ return; }
  if (window.top !== window || window.__srLoaded === VER) return;
  window.__srLoaded = VER;
  var stale = document.getElementById('sr-tab'); if (stale) stale.remove();

  var SITES = [[/uworld\.com$/, 'UWorld'], [/amboss\.com$/, 'AMBOSS'], [/nbme\.org$|starttest\.com$/, 'NBME'], [/kaptest\.com$/, 'Kaplan'], [/truelearn\.(com|net)$/, 'TrueLearn'], [/roshreview\.com$/, 'Rosh Review'], [/boardvitals\.com$/, 'BoardVitals'], [/canadaqbank\.com$/, 'CanadaQBank'], [/lecturio\.com$/, 'Lecturio']];
  var host = location.hostname, SRC = host.replace(/^www\./, '');
  SITES.forEach(function(s){ if (s[0].test(host)) SRC = s[1]; });
  var IS_UW = /uworld\.com$/.test(host);

  var tab = document.createElement('button'); tab.id = 'sr-tab'; tab.type = 'button';
  tab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 11l7-6 7 6"/><path d="M5 19l7-6 7 6" opacity=".6"/></svg><span class="sr-label">My Senior Resident</span><span class="sr-arrow" aria-hidden="true">&#8250;</span>';
  tab.title = 'My Senior Resident (Alt+S)';
  document.documentElement.appendChild(tab);
  var isOpen = false, bgState = 'idle';
  function setOpen(v){ isOpen = v; tab.classList.remove('closing'); tab.classList.toggle('open', v); tab.title = v ? 'Close My Senior Resident' : 'My Senior Resident (Alt+S)'; }
  function send(m, cb){ try { chrome.runtime.sendMessage(m, function(r){ void chrome.runtime.lastError; if (cb) cb(r); }); } catch(e){ if (cb) cb(null); } }
  tab.addEventListener('click', function(){
    if (isOpen){ tab.classList.add('closing'); send({ t: 'close' }); setTimeout(function(){ setOpen(false); }, 280); return; }
    send({ t: 'open' }, function(r){ if (!r || !r.ok) tab.title = 'Click the My Senior Resident icon in the toolbar to open'; });
  });

  function clean(t){ return (t || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }
  function hash(s){ var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'h' + (h >>> 0).toString(36); }
  function visible(el){ var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }

  /* UWorld: known layout */
  function uwQid(){ var m = (document.body.innerText || '').match(/Question Id:?\s*(\d{3,7})/i); return m ? m[1] : ''; }
  function itemNo(){
    var t = document.body.innerText || '';
    var m = t.match(/\b(?:Item|Question)\s*:?\s*#?\s*(\d{1,3})\s*(?:of|\/)\s*\d{1,3}\b/i); if (m) return m[1];
    var k = t.search(/Question\s*Id/i);
    if (k >= 0){ m = t.slice(Math.max(0, k - 200), k + 200).replace(/Question\s*Id:?\s*\d+/i, ' ').match(/\b(\d{1,3})\s*(?:of|\/)\s*(\d{1,3})\b/); if (m) return m[1]; }
    var els = document.querySelectorAll('tr[class*="selected" i],tr[class*="active" i],tr[class*="current" i],li[class*="selected" i],li[class*="active" i],[aria-current="true"],[aria-current="page"]');
    for (var i = 0; i < els.length; i++){ var x = clean(els[i].innerText).match(/^(\d{1,3})(?!\d)/); if (x) return x[1]; }
    return '';
  }
  function uwStem(){ return document.querySelector('.question-content') || document.querySelector('#questionText') || document.querySelector('[class*="question-content"]') || document.querySelector('[id*="questionText"]'); }
  function isStruck(row){
    if (!row) return false;
    var els = [row].concat(Array.prototype.slice.call(row.querySelectorAll('*'), 0, 40));
    for (var i = 0; i < els.length; i++){ try { if ((getComputedStyle(els[i]).textDecorationLine || '').indexOf('line-through') >= 0) return true; } catch(e){} }
    return false;
  }
  function choiceRows(){
    var out = [];
    document.querySelectorAll('input[type=radio]').forEach(function(r){
      var el = r, best = '', row = null;
      for (var k = 0; k < 7 && el.parentElement; k++){
        el = el.parentElement;
        if (el.querySelectorAll('input[type=radio]').length > 1) break;
        var t = clean(el.innerText); if (t.length > 1){ best = t; row = el; }
      }
      best = best.replace(/\s*\(\d{1,3}%\)\s*$/, '').replace(/\s*\n\s*/g, ' ');
      if (best) out.push({ t:best, struck:isStruck(row) });
    });
    out.forEach(function(o, i){ if (!/^[A-J][.)]\s/.test(o.t)) o.t = String.fromCharCode(65 + i) + '. ' + o.t; });
    return out;
  }
  function radioChoices(){ return choiceRows().map(function(o){ return o.t; }); }
  function struckChoices(){ return choiceRows().filter(function(o){ return o.struck; }).map(function(o){ return o.t; }); }

  /* Any other question bank: find the answer choices, then the block that holds them and the stem */
  function choiceEls(){
    var sets = ['input[type=radio]', '[role=radio]', '[role=option]', '[data-testid*="answer" i],[class*="answer-option" i],[class*="answerOption" i],[class*="answer-choice" i],[class*="AnswerChoice" i]'];
    for (var i = 0; i < sets.length; i++){
      var els = Array.prototype.filter.call(document.querySelectorAll(sets[i]), function(e){ return visible(e) || (e.parentElement && visible(e.parentElement)); });
      if (els.length >= 3 && els.length <= 16) return els;
    }
    return [];
  }
  function questionBlock(){
    var els = choiceEls(); if (!els.length) return null;
    var anc = els[0];
    while (anc && !els.every(function(e){ return anc.contains(e); })) anc = anc.parentElement;
    for (var k = 0; anc && anc.parentElement && anc.parentElement !== document.documentElement && k < 8; k++){
      var len = clean(anc.innerText).length, choicesLen = els.reduce(function(a, e){ return a + clean((e.closest('label,li,button,[role=radio],[role=option]') || e.parentElement || e).innerText).length; }, 0);
      if (len - choicesLen > 220) break;
      anc = anc.parentElement;
    }
    return anc;
  }
  function stemKey(){
    if (IS_UW) return uwQid();
    var b = questionBlock(); if (!b) return '';
    var t = clean(b.innerText); return t.length > 120 ? hash(t.slice(0, 400)) : '';
  }
  async function images(el){
    var list = [], imgs = el ? Array.prototype.slice.call(el.querySelectorAll('img')) : [];
    for (var i = 0; i < imgs.length && list.length < 4; i++){
      var im = imgs[i]; if ((im.naturalWidth || im.width) < 80 || (im.naturalHeight || im.height) < 60) continue;
      try { var b = await (await fetch(im.currentSrc || im.src, { credentials: 'include' })).blob(); if (/^image\//.test(b.type)) list.push(b); } catch(e){}
    }
    return list;
  }
  async function grab(){
    var sel = clean(String(window.getSelection ? window.getSelection() : ''));
    if (sel.length > 80) return { qid: hash(sel.slice(0, 400)), src: SRC, text: sel.slice(0, 12000), images: [] };
    if (IS_UW){
      var el = uwStem();
      if (el){ var ch = radioChoices(); return { qid: uwQid(), src: SRC, text: clean(el.innerText) + (ch.length ? '\n\nAnswer choices:\n' + ch.join('\n') : ''), images: await images(el) }; }
    }
    var b = questionBlock();
    if (b){ var t = clean(b.innerText); if (t.length > 120) return { qid: hash(t.slice(0, 400)), src: SRC, text: t.slice(0, 12000), images: await images(b) }; }
    return null;
  }
  function dataUrl(b){ return new Promise(function(res){ var r = new FileReader(); r.onload = function(){ res(r.result); }; r.readAsDataURL(b); }); }

  chrome.runtime.onMessage.addListener(function(m, sender, reply){
    if (m.t === 'ping'){ reply({ ok: true }); return; }
    if (m.t === 'state'){ setOpen(!!m.open); if (m.open) setBg('idle'); }
    if (m.t === 'bg') setBg(m.state);
    if (m.t === 'grab'){
      if (OFF){ reply({ text: '', src: SRC }); return; }
      grab().then(async function(q){
        if (!q){ reply({ text: '', src: SRC }); return; }
        reply({ qid: q.qid, num: itemNo(), struck: struckChoices(), src: q.src, text: q.text, images: await Promise.all(q.images.map(dataUrl)) });
      }, function(){ reply({ text: '', src: SRC }); });
      return true;
    }
  });
  function setBg(state){
    bgState = state; tab.classList.toggle('reading', state === 'reading'); tab.classList.toggle('ready', state === 'ready');
    tab.querySelector('.sr-label').textContent = state === 'reading' ? 'Reading…' : (state === 'ready' ? "Let's review" : 'My Senior Resident');
  }
  // By default the panel never opens on its own: the tab says it is ready and pulses. "Open when ready" in the panel footer turns the pop-out on.
  var POP = false;
  try { chrome.storage.local.get({ pop: false }, function(r){ POP = !!(r && r.pop === true); }); chrome.storage.onChanged.addListener(function(ch, area){ if (area === 'local' && ch.pop) POP = ch.pop.newValue === true; }); } catch(e){}
  function popIfReady(e){
    if (!POP || isOpen || bgState !== 'ready' || (e && tab.contains(e.target))) return;
    setBg('idle'); send({ t: 'open' });
  }
  document.addEventListener('click', popIfReady, true);
  document.addEventListener('keydown', popIfReady, true);

  var last = '', lastStruck = '', tmr = null, OFF = false, MANUAL = false;
  function check(){
    if (OFF) return; var id = stemKey(), sc = struckChoices(), sk = sc.join('|');
    if (!MANUAL && id && id !== last){ last = id; lastStruck = sk; send({ t: 'newq', qid: id }); return; }
    if (id && sk !== lastStruck){ lastStruck = sk; if (isOpen) send({ t: 'struck', struck: sc }); }   // tell the panel when cross-outs change, so it can offer to narrow
  }
  new MutationObserver(function(){ if (!tmr) tmr = setTimeout(function(){ tmr = null; check(); }, IS_UW ? 250 : 700); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  setInterval(check, IS_UW ? 1500 : 2500);
  setTimeout(check, 800);
  send({ t: 'hello' }, function(r){
    if (r && r.mode === 'off'){ OFF = true; tab.remove(); return; }
    if (r && r.mode === 'manual') MANUAL = true;
    if (r && r.open) setOpen(true);
  });
})();
