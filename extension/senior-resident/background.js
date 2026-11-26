var panelPort = null, wantGrab = false, bgBusy = '', bgReady = '';

/* Per-site switch, published at SITES_URL: auto, manual (only on a click) or off. Lets a site be turned off for everyone without an update. */
var SITES_URL = 'https://asimi99.github.io/senior-resident/sites.json';
async function sites(){
  var r = await chrome.storage.local.get({ sites: null, sitesAt: 0 });
  if (Date.now() - r.sitesAt > 3 * 3600 * 1000){
    try {
      var j = await (await fetch(SITES_URL + '?t=' + Date.now(), { cache: 'no-store' })).json();
      if (j && typeof j === 'object'){ r.sites = j; await chrome.storage.local.set({ sites: j, sitesAt: Date.now() }); }
    } catch(e){ await chrome.storage.local.set({ sitesAt: Date.now() - 2.5 * 3600 * 1000 }); }
  }
  return r.sites || { default: 'auto', hosts: {} };
}
async function siteMode(url){
  var host = ''; try { host = new URL(url).hostname; } catch(e){ return 'auto'; }
  var s = await sites(), hosts = s.hosts || {}, best = '', mode = s.default || 'auto';
  Object.keys(hosts).forEach(function(h){ if ((host === h || host.endsWith('.' + h)) && h.length > best.length){ best = h; mode = hosts[h]; } });
  return /^(auto|manual|off)$/.test(mode) ? mode : 'auto';
}

function notifyTabs(msg){
  chrome.tabs.query({}, function(tabs){ (tabs || []).forEach(function(t){ chrome.tabs.sendMessage(t.id, msg).catch(function(){}); }); });
}
function openPanel(windowId){ try { return chrome.sidePanel.open({ windowId: windowId }); } catch(e){ return Promise.reject(e); } }
function closePanel(windowId){
  if (panelPort){ try { panelPort.postMessage({ t: 'close' }); } catch(e){} }
  chrome.runtime.sendMessage({ t: 'panel-close' }).catch(function(){});
  if (chrome.sidePanel.close && windowId != null) chrome.sidePanel.close({ windowId: windowId }).catch(function(){});
}
async function ensureOffscreen(){
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['IFRAME_SCRIPTING'], justification: 'Prepares the coaching for the question on screen so it is ready when the panel opens.' });
}
async function closeOffscreen(){ try { if (await chrome.offscreen.hasDocument()) await chrome.offscreen.closeDocument(); } catch(e){} }
async function autoOn(){ try { var r = await chrome.storage.local.get({ auto: false }); return r.auto === true; } catch(e){ return false; } }
async function inject(tabId){
  try {
    await chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ['content.css'] });
    await chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['content.js'] });
    return true;
  } catch(e){ return false; }
}
async function ask(tabId){
  try { return await chrome.tabs.sendMessage(tabId, { t: 'grab' }); }
  catch(e){ if (await inject(tabId)){ try { return await chrome.tabs.sendMessage(tabId, { t: 'grab' }); } catch(e2){} } }
  return null;
}

async function bgCoach(tabId, qid){
  if (panelPort || !qid || qid === bgBusy || qid === bgReady || !(await autoOn())) return;
  try { if ((await siteMode((await chrome.tabs.get(tabId)).url || '')) !== 'auto') return; } catch(e){}
  bgBusy = qid; bgReady = '';
  notifyTabs({ t: 'bg', state: 'reading', qid: qid });
  var q = await ask(tabId);
  if (!q || !q.text){ bgBusy = ''; notifyTabs({ t: 'bg', state: 'idle' }); return; }
  try { await ensureOffscreen(); } catch(e){ bgBusy = ''; notifyTabs({ t: 'bg', state: 'idle' }); return; }
  setTimeout(function(){ chrome.runtime.sendMessage({ t: 'bg-coach', q: q }).catch(function(){}); }, 50);
  setTimeout(function(){ if (bgBusy === qid){ bgBusy = ''; notifyTabs({ t: 'bg', state: 'idle' }); } }, 120000);
}

chrome.runtime.onConnect.addListener(function(port){
  if (port.name !== 'sr-panel') return;
  panelPort = port; bgBusy = ''; bgReady = '';
  closeOffscreen();
  notifyTabs({ t: 'state', open: true });
  if (wantGrab){ wantGrab = false; port.postMessage({ t: 'grab' }); }
  port.onDisconnect.addListener(function(){ if (panelPort === port) panelPort = null; notifyTabs({ t: 'state', open: false }); });
});

chrome.runtime.onMessage.addListener(function(m, sender, reply){
  if (m.t === 'hello'){ siteMode((sender.tab && sender.tab.url) || sender.url || '').then(function(mode){ reply({ open: !!panelPort, mode: mode }); }); return true; }
  if (m.t === 'open'){
    openPanel(sender.tab.windowId).then(function(){ reply({ ok: true }); }, function(e){ reply({ ok: false, err: String(e) }); });
    return true;
  }
  if (m.t === 'close'){ closePanel(sender.tab && sender.tab.windowId); return; }
  if (m.t === 'struck'){ if (panelPort) panelPort.postMessage({ t: 'struck', struck: m.struck || [] }); return; }
  if (m.t === 'newq'){
    if (panelPort) Promise.all([autoOn(), siteMode((sender.tab && sender.tab.url) || '')]).then(function(r){ if (r[0] && r[1] === 'auto' && panelPort) panelPort.postMessage({ t: 'newq', qid: m.qid }); });
    else if (sender.tab) bgCoach(sender.tab.id, m.qid);
    return;
  }
  if (m.t === 'bg-done'){
    if (panelPort) return;
    bgBusy = ''; bgReady = m.ok ? m.qid : ''; notifyTabs({ t: 'bg', state: m.ok ? 'ready' : 'idle', qid: m.qid });
    return;
  }
  if (m.t === 'grab'){
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, async function(tabs){
      var tab = (tabs || [])[0];
      if (!tab){ reply({ err: 'Open a question first.' }); return; }
      var mode = await siteMode(tab.url || '');
      if (mode === 'off'){ reply({ err: 'My Senior Resident is switched off on this site at the request of the site owner.' }); return; }
      if (mode === 'manual' && !m.manual){ reply({ err: '' }); return; }
      var q = await ask(tab.id);
      if (q && q.text){ reply(q); return; }
      /* No screen capture fallback: several question banks (eg, UWorld) ban capturing screen contents with third-party apps. */
      reply({ err: q ? 'No question found on this page yet. You can paste the question text into the web app instead.' : 'Click the My Senior Resident icon in the toolbar while the question is on screen.' });
    });
    return true;
  }
});

function toggle(tab, grab){
  if (panelPort && !grab){ closePanel(tab.windowId); return; }
  if (grab){ if (panelPort) panelPort.postMessage({ t: 'grab' }); else wantGrab = true; }
  openPanel(tab.windowId).catch(function(){});
  chrome.tabs.sendMessage(tab.id, { t: 'ping' }).catch(function(){ inject(tab.id); });
}
chrome.action.onClicked.addListener(function(tab){ toggle(tab, false); });

/* Picks up a newer copy of the extension folder on its own (developer installs), then puts the side tab back on open question pages. */
async function selfUpdate(){
  try {
    var m = await (await fetch(chrome.runtime.getURL('manifest.json') + '?t=' + Date.now(), { cache: 'no-store' })).json();
    if (m && m.version && m.version !== chrome.runtime.getManifest().version) chrome.runtime.reload();
  } catch(e){}
}
chrome.runtime.onInstalled.addListener(function(){
  var pats = (chrome.runtime.getManifest().content_scripts || [{}])[0].matches || [];
  chrome.tabs.query({ url: pats }, function(tabs){ (tabs || []).forEach(function(t){ inject(t.id); }); });
});
chrome.runtime.onStartup.addListener(selfUpdate);
chrome.runtime.onMessage.addListener(function(m){ if (m && (m.t === 'hello' || m.t === 'newq' || m.t === 'open')) selfUpdate(); });
chrome.commands.onCommand.addListener(function(cmd, tab){ if (tab) toggle(tab, cmd === 'coach-question'); });
