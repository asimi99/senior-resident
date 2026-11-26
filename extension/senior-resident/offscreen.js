var ORIGIN = 'https://asimi99.github.io';
var coach = document.getElementById('coach'), ready = false, queue = [];
// Offscreen pages cannot use chrome.storage. The side panel passes the install id into the coach page, which keeps it in its own storage, so the coach here picks it up.
coach.src = ORIGIN + '/senior-resident/app/?embed=1&bg=1&t=' + Date.now();
function blob(u){ var p = u.split(','), mime = (p[0].match(/:(.*?);/) || [])[1] || 'image/png', b = atob(p[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Blob([a], { type: mime }); }
function send(q){ coach.contentWindow.postMessage({ type: 'sr-question', qid: q.qid, num: q.num || '', struck: q.struck || [], src: q.src, text: q.text, images: (q.images || []).map(blob) }, ORIGIN); }
window.addEventListener('message', function(e){
  if (e.source !== coach.contentWindow || e.origin !== ORIGIN) return;
  var d = e.data || {};
  if (d.type === 'sr-ready'){ ready = true; queue.splice(0).forEach(send); }
  if (d.type === 'sr-done') chrome.runtime.sendMessage({ t: 'bg-done', qid: d.qid, ok: d.ok });
});
chrome.runtime.onMessage.addListener(function(m){
  if (m.t !== 'bg-coach') return;
  if (ready) send(m.q); else queue.push(m.q);
});
