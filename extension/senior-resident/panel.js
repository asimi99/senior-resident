(function(){
  var ORIGIN = 'https://asimi99.github.io', APP = ORIGIN + '/senior-resident/app/?embed=1';
  var coach = document.getElementById('coach'), msg = document.getElementById('msg'), auto = document.getElementById('auto');
  var ready = false, queue = [], port;
  var ANKI_OK = ['version', 'requestPermission', 'createDeck', 'addNote', 'modelNames', 'createModel', 'updateModelStyling', 'updateModelTemplates', 'storeMediaFile'];
  coach.src = APP + '&t=' + Date.now();
  function connect(){
    port = chrome.runtime.connect({ name: 'sr-panel' });
    port.onMessage.addListener(onPort);
    port.onDisconnect.addListener(function(){ setTimeout(connect, 200); });
  }
  chrome.runtime.onMessage.addListener(function(m){ if (m && m.t === 'panel-close') window.close(); });
  chrome.storage.local.get({ auto: false }, function(r){ auto.checked = r.auto === true; });
  auto.addEventListener('change', function(){ chrome.storage.local.set({ auto: auto.checked }); });
  var pop = document.getElementById('pop');
  chrome.storage.local.get({ pop: false }, function(r){ pop.checked = r.pop === true; });
  pop.addEventListener('change', function(){ chrome.storage.local.set({ pop: pop.checked }); });
  function say(t){ msg.textContent = t || ''; msg.title = t || ''; toCoach({ type: 'sr-status', text: t || '' }); }
  function toCoach(d){ if (ready) coach.contentWindow.postMessage(d, ORIGIN); else queue.push(d); }
  function blob(u){ var p = u.split(','), mime = (p[0].match(/:(.*?);/) || [])[1] || 'image/png', b = atob(p[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Blob([a], { type: mime }); }
  function doGrab(manual, reread){
    say('Reading the question');
    chrome.runtime.sendMessage({ t: 'grab', manual: !!manual }, function(q){
      if (chrome.runtime.lastError || !q){ say('Could not reach the page. Refresh it once.'); return; }
      if (q.err){ say(manual ? q.err : ''); return; }
      msg.textContent = (q.src || 'Question') + (q.num ? ' · Q' + q.num : '') + (q.qid && !/^h/.test(q.qid) ? ' · ID ' + q.qid : '') + (q.shot ? ' · from a screenshot' : '');
      toCoach({ type: 'sr-question', qid: q.qid, num: q.num || '', struck: q.struck || [], reread: !!reread, src: q.src, text: q.text, images: (q.images || []).map(blob) });
    });
  }
  setTimeout(function(){ doGrab(false); }, 300);
  function onPort(m){
    if (m.t === 'close') window.close();
    if (m.t === 'grab') doGrab(true);
    if (m.t === 'struck') toCoach({ type: 'sr-struck', struck: m.struck || [] });
    if (m.t === 'newq'){ clearTimeout(window.__srT); window.__srT = setTimeout(function(){ doGrab(false); }, 450); }
  }
  connect();
  window.addEventListener('message', function(e){
    if (e.source !== coach.contentWindow || e.origin !== ORIGIN) return;
    var d = e.data || {};
    if (d.type === 'sr-ready'){ ready = true; queue.splice(0).forEach(function(x){ coach.contentWindow.postMessage(x, ORIGIN); }); }
    if (d.type === 'sr-grab') doGrab(true, !!d.reread);
    if (d.type === 'sr-anki' && ANKI_OK.indexOf(d.action) >= 0 && (d.action !== 'storeMediaFile' || /^sr_io_\d+\.jpg$/.test((d.params || {}).filename || ''))){
      fetch('http://127.0.0.1:8765', { method: 'POST', body: JSON.stringify({ action: d.action, version: 6, params: d.params || {} }) })
        .then(function(r){ return r.ok ? r.json() : { error: 'http ' + r.status }; })
        .then(function(j){ toCoach({ type: 'sr-anki-res', id: d.id, result: j.result, error: j.error || null }); })
        .catch(function(){ toCoach({ type: 'sr-anki-res', id: d.id, error: 'offline' }); });
    }
    if (d.type === 'sr-google' && d.clientId && /^[\w.-]+$/.test(d.clientId) && /^[0-9a-f]{64}$/.test(d.nonce || '')){
      var redirect = chrome.identity.getRedirectURL();
      var url = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + encodeURIComponent(d.clientId) + '&response_type=id_token&redirect_uri=' + encodeURIComponent(redirect)
        + '&scope=' + encodeURIComponent('openid email profile') + '&nonce=' + d.nonce + '&prompt=select_account';
      chrome.identity.launchWebAuthFlow({ url: url, interactive: true }, function(back){
        var err = chrome.runtime.lastError, m = back && back.match(/[#&]id_token=([^&]+)/);
        if (m) toCoach({ type: 'sr-google-token', token: decodeURIComponent(m[1]) });
        else toCoach({ type: 'sr-google-token', token: '', cancelled: !!(err && /cancel|closed|did not approve/i.test(err.message || '')), redirect: redirect });
      });
    }
  });
})();
