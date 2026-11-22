/* ---------- home: what a signed-out visitor sees. Signed in, the app opens straight to the tools. ---------- */
var TRIAL_NOTE = 'No charge today. Your card is charged ' + '$' + (window.SR_CONFIG || {}).PRICE_MONTH + ' ' + ((window.SR_CONFIG || {}).CURRENCY || 'CAD')
  + ' on day 8 unless you cancel before then, and each month after that until you cancel. Cancel anytime from Manage subscription in your account. One trial per person and per card.';
var SR_CHECKED = false;
SR.onAuth(function(){ SR_CHECKED = true; var id = location.hash.slice(1); if (['how','plans','faq','install'].indexOf(id) >= 0) setTimeout(function(){ homeGo(id); }, 80); });
if (!SR.ready) SR_CHECKED = true;

function showHome(){
  return !EMBED && !SR.user && view === 'coach' && cur === -1 && !cases.length && !lsGet('sr_try', false);
}
function homeHTML(){
  if (!SR_CHECKED) return '';
  var C = CFG, ck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12.5l4 4L18 8"/></svg>';
  function li(a){ return '<ul>' + a.map(function(x){ return '<li>' + ck + '<span>' + x + '</span></li>'; }).join('') + '</ul>'; }
  var h = '<div class="hm">';
  h += '<section class="hm-hero"><div><p class="hm-eye">Reasoning coach for board-style questions</p>'
    + '<h1>Stop guessing answers. <em>Learn to read the stem.</em></h1>'
    + '<p class="hm-lede">Senior Resident sits beside your question bank and walks you to the answer one decision at a time, the way a good senior does on the wards.</p>'
    + '<div class="hm-cta"><button type="button" class="btn" data-hm="try">Try a question free</button><button type="button" class="btn ghost" data-hm="signin">Sign in</button></div>'
    + '<p class="hm-fine">Free to start. A Chrome side panel and this web app. Works with any question bank, PDF, screenshot or pasted question.</p></div>'
    + '<div class="hm-mock" aria-hidden="true"><div class="q"><span class="bar2">Question 14 of 20</span>'
    + '<p>A 19-year-old man has 18 hours of abdominal pain that <mark>began near the umbilicus and moved to the right lower quadrant</mark>. Temperature is 38.6&deg;C. There is <mark>guarding and rebound</mark> at McBurney point.</p>'
    + '<p>Which of the following is the most likely diagnosis?</p><ol><li>Mesenteric adenitis</li><li>Acute appendicitis</li><li class="out">Gastroenteritis</li><li class="out">Kidney stone</li></ol></div>'
    + '<div class="p"><div class="ph">' + IC.logo + 'Senior Resident<span>Step 1 of 4</span></div><div class="pb"><div class="prog"><i class="n"></i><i></i><i></i><i></i></div>'
    + '<div class="cd"><div class="st">Step 1 <b>Key finding</b></div><h4>The pain began at the umbilicus, then moved to the right lower quadrant. What does the move mean?</h4>'
    + '<div class="o"><kbd>A</kbd>It is spreading across the abdomen</div><div class="o g"><kbd>B</kbd>The lining over one spot is now irritated</div><div class="o"><kbd>C</kbd>It is referred from the ureter</div>'
    + '<div class="fbk"><b>Correct</b>Vague midline pain is visceral. Sharp pain in one spot means the lining there is inflamed.</div></div></div></div></div></section>';

  h += '<section class="hm-sec" id="how"><h2>You answer the question. It makes sure you know why.</h2><p class="hm-sub">Sometimes a miss is a knowledge gap. Sometimes it is a clue you read past. Senior Resident trains both.</p>'
    + '<div class="hm-steps"><div><h3>It reads your question</h3><p>Open a question in your bank and it picks up the stem, the choices and the images. Or drop in a screenshot.</p></div>'
    + '<div><h3>You make each decision</h3><p>How sick, where the problem is, which finding separates the look-alikes. Then you rule the choices out one by one.</p></div>'
    + '<div><h3>You keep the rule</h3><p>Every question ends with one pearl and the trap that goes with it, ready to send to Anki.</p></div></div></section>';

  h += '<section class="hm-band"><h2>It never hands you the answer.</h2><p class="hm-sub">An explanation tells you what was right. A senior asks what you saw. Only one of those changes how you read the next stem.</p>'
    + '<div class="hm-cmp"><div><h3>Reading the explanation</h3>' + li(['You see the answer first, then nod along', 'The same trap gets you again next week', 'No idea which kind of decision costs you marks']) + '</div>'
    + '<div class="y"><h3>Working it with a senior</h3>' + li(['You commit to each step before any feedback', 'Feedback points at the exact line of the stem', 'A reasoning profile shows where you slip']) + '</div></div></section>';

  h += '<section class="hm-sec" id="plans"><h2>Pricing</h2><p class="hm-sub">Start free. Move up when it is part of your routine. Prices in ' + esc(C.CURRENCY) + '.</p>'
    + '<div class="hm-plans">'
    + '<div class="hm-plan"><h3>Free</h3><p class="pk">Try the coach</p><div class="pr">$0</div>' + li([C.FREE_DAILY + ' questions a day', 'Guided and Harder levels', 'Works with any question bank']) + '<button type="button" class="btn ghost wide" data-hm="try">Try a question</button></div>'
    + '<div class="hm-plan pro"><span class="tag">Most popular</span><h3>Resident</h3><p class="pk">Your coach for every block</p><div class="pr">$' + C.PRICE_MONTH + ' <small>a month</small></div>'
    + li([C.PRO_DAILY + ' questions a day, a full block', 'Hardest level and narrowing from your cross-outs', 'Page the attending', 'Reasoning profile: where you lose points', 'One tap Anki cards'])
    + '<button type="button" class="btn wide" data-act="buy" data-p="month">Start the 7-day free trial</button></div>'
    + '<div class="hm-plan"><h3>Chief</h3><p class="pk">Everything, plus exams from your PDFs</p><div class="pr">$' + (C.PRICE_FELLOW || 25) + ' <small>a month</small></div>'
    + li(['Unlimited questions a day*', 'Exam mode: any PDF becomes a timed exam', 'Second chance review', 'Answer keys for PDFs without them', 'Question ID on your Anki cards'])
    + '<button type="button" class="btn ghost wide" data-act="buy" data-p="chief">Get Chief</button></div></div>'
    + '<p class="hm-legal"><b>Free trial:</b> ' + esc(TRIAL_NOTE) + '</p>'
    + '<p class="hm-legal"><b>Subscriptions</b> renew automatically each month at the price shown until you cancel. Cancelling stops the next charge, and you keep your plan until the end of the period you paid for. Prices may change with notice. Have a launch or friend code? Enter it at checkout.</p>'
    + '<p class="hm-legal">*Unlimited is for one person studying. A fair use limit stops shared or automated accounts.</p><p class="hm-msg" id="buymsg"></p></section>';

  h += '<section class="hm-sec" id="install"><h2>Add it to Chrome</h2><p class="hm-sub">About a minute. Works in Chrome, Edge, Brave and Arc on a computer.</p><div class="hm-two">'
    + '<div class="hm-box"><a class="btn" href="../extension/senior-resident.zip" download>Download the extension</a><ol><li>Unzip it. You get a folder called <code>senior-resident</code>.</li><li>Go to <code>chrome://extensions</code> and turn on <b>Developer mode</b>.</li><li>Click <b>Load unpacked</b> and pick the folder.</li><li>Open a question and click the blue <b>Senior Resident</b> tab on the right edge, or press <code>Alt+S</code>.</li></ol></div>'
    + '<div class="hm-box"><h3>No extension? No problem</h3><p class="muted">On a phone, tablet or locked-down computer, use it right here. Paste a question or drop in a screenshot.</p><button type="button" class="btn ghost" data-hm="try">Try a question here</button></div></div></section>';

  var faq = [['Does it just tell me the answer?', 'No. You make each decision and rule choices out until one is left. Then check it against your question bank.'],
    ['Which question banks does it work with?', 'Any of them. Senior Resident is independent and is not affiliated with or endorsed by any question bank or exam body.'],
    ['What happens to my questions?', 'The question you are on is sent to the AI model to build that session, then kept in your own browser. It is not sold, shared or used to build a question database.'],
    ['Can it be wrong?', 'Yes. It is an AI study aid and it can make mistakes. When it disagrees with your question bank, trust the bank. It is not medical advice.'],
    ['Can I cancel?', 'Yes, anytime, from Manage subscription in your account. You keep your plan until the end of the period you paid for.']];
  h += '<section class="hm-sec" id="faq"><h2>Questions</h2>' + faq.map(function(f){ return '<details class="hm-faq"><summary>' + f[0] + '</summary><p>' + f[1] + '</p></details>'; }).join('') + '</section>';
  h += '<footer class="hm-foot"><a href="../privacy.html" target="_blank" rel="noopener">Privacy</a><a href="../terms.html" target="_blank" rel="noopener">Terms</a><span>A study aid for students. Not medical advice. Independent, and not affiliated with or endorsed by any question bank, publisher or exam body.</span></footer>';
  return h + '</div>';
}
function homeGo(where){
  if (where === 'try'){ lsSet('sr_try', true); view = 'coach'; cur = -1; renderAll(); window.scrollTo(0, 0); return; }
  if (where === 'signin'){ view = 'account'; renderAll(); window.scrollTo(0, 0); return; }
  if (!showHome()){ lsSet('sr_try', false); view = 'coach'; cur = -1; if (SR.user){ renderAll(); return; } renderAll(); }
  var el = document.getElementById(where); if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
}
document.addEventListener('click', function(e){
  var el = e.target.closest('[data-hm]'); if (!el) return;
  e.preventDefault(); homeGo(el.dataset.hm);
});
