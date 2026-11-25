/* ---------- the website pages: Home, How it works (with common questions), Pricing. The coach, exam and study plan are their own tabs. ---------- */
var TRIAL_NOTE = 'No charge today. Your card is charged ' + '$' + (window.SR_CONFIG || {}).PRICE_MONTH + ' ' + ((window.SR_CONFIG || {}).CURRENCY || 'CAD')
  + ' on day 8 unless you cancel before then, and each month after that until you cancel. Cancel anytime from Manage subscription in your account. One trial per person and per card.';
var SR_CHECKED = false;
SR.onAuth(function(){ SR_CHECKED = true; });
if (!SR.ready) SR_CHECKED = true;

var SITE_PAGES = ['home','how','pricing'];
function sitePage(){ return !EMBED && SITE_PAGES.indexOf(view) >= 0 ? view : ''; }
function showHome(){ return !!sitePage(); }
function homeTool(){ return !!SR.user || !!lsGet('sr_try', false); }
var CK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12.5l4 4L18 8"/></svg>';
function li(a){ return '<ul>' + a.map(function(x){ return '<li>' + CK + '<span>' + x + '</span></li>'; }).join('') + '</ul>'; }
function vidHTML(src, poster, title, sub){
  return '<section class="hm-sec hm-vid"><div class="hm-vidhd"><h2>' + title + '</h2>' + (sub ? '<p class="hm-sub">' + sub + '</p>' : '') + '</div>'
    + '<div class="hm-video"><video controls playsinline preload="none" poster="' + poster + '" src="' + src + '"></video></div></section>';
}
function homeHTML(){
  if (!SR_CHECKED) return '';
  var C = CFG, pg = sitePage(), h = '<div class="hm">';
  if (pg === 'home'){
    h += '<section class="hm-hero"><div><p class="hm-eye">Reasoning coach for board-style questions</p>'
      + '<h1>Stop guessing answers. <em>Learn to read the stem.</em></h1>'
      + '<p class="hm-lede">Senior Resident sits beside your question bank and walks you to the answer one decision at a time, the way a good senior does on the wards.</p>'
      + '<div class="hm-cta"><button type="button" class="btn" data-go="new">' + (SR.user ? 'Coach a question' : 'Try a question free') + '</button><button type="button" class="btn ghost" data-go="schedule">Build a study plan</button>' + (SR.user ? '' : '<button type="button" class="btn ghost" data-hm="signin">Sign in</button>') + '</div>'
      + '<p class="hm-fine">Free to start. A Chrome side panel and this web app. Works with any question bank, PDF, screenshot or pasted question.</p></div>'
      + '<div class="hm-mock" aria-hidden="true"><div class="q"><span class="bar2">Question 14 of 20</span>'
    + '<p>A 19-year-old man has 18 hours of abdominal pain that <mark>began near the umbilicus and moved to the right lower quadrant</mark>. Temperature is 38.6&deg;C. There is <mark>guarding and rebound</mark> at McBurney point.</p>'
    + '<p>Which of the following is the most likely diagnosis?</p><ol><li>Mesenteric adenitis</li><li>Acute appendicitis</li><li class="out">Gastroenteritis</li><li class="out">Kidney stone</li></ol></div>'
    + '<div class="p"><div class="ph">' + IC.logo + 'Senior Resident<span>Step 1 of 4</span></div><div class="pb"><div class="prog"><i class="n"></i><i></i><i></i><i></i></div>'
    + '<div class="cd"><div class="st">Step 1 <b>Key finding</b></div><h4>The pain began at the umbilicus, then moved to the right lower quadrant. What does the move mean?</h4>'
    + '<div class="o"><kbd>A</kbd>It is spreading across the abdomen</div><div class="o g"><kbd>B</kbd>The lining over one spot is now irritated</div><div class="o"><kbd>C</kbd>It is referred from the ureter</div>'
    + '<div class="fbk"><b>Correct</b>Vague midline pain is visceral. Sharp pain in one spot means the lining there is inflamed.</div></div></div></div></div>' + '</section>';
    h += vidHTML('../assets/promo.mp4?v=2', '../assets/promo-poster.jpg', 'Watch it work', 'One question, start to finish: four decisions, one page to the attending, and the answer you reached yourself.');
    h += '<section class="hm-sec"><div class="hm-steps hm-links">'
      + '<div><h3>How it works</h3><p>It reads your question, you make each decision, and you keep the rule.</p><button type="button" class="lnk" data-go="how">See how it works</button></div>'
      + '<div><h3>Anki cards in one tap</h3><p>Every rule you learn becomes a card in your own deck, image occlusion included. No copying, no formatting.</p><button type="button" class="lnk" data-go="how">See Anki cards</button></div>'
      + '<div><h3>Study plan</h3><p>Your exam, your question bank, your date. A day-by-day plan ordered by yield, with daily check-ins.</p><button type="button" class="lnk" data-go="schedule">Build yours</button></div>'
      + '<div><h3>Pricing</h3><p>Free to start. Resident is $' + C.PRICE_MONTH + ' a month with a 7-day free trial.</p><button type="button" class="lnk" data-go="pricing">Compare plans</button></div></div></section>';
  } else if (pg === 'how'){
  h += '<section class="hm-sec hm-first" id="how"><h2>You answer the question. It makes sure you know why.</h2><p class="hm-sub">Sometimes a miss is a knowledge gap. Sometimes it is a clue you read past. Senior Resident trains both.</p>'
    + '<div class="hm-steps"><div><h3>It reads your question</h3><p>Open a question in your bank and it picks up the stem, the choices and the images. Or drop in a screenshot.</p></div>'
    + '<div><h3>You make each decision</h3><p>How sick, where the problem is, which finding separates the look-alikes. Then you rule the choices out one by one.</p></div>'
    + '<div><h3>You keep the rule</h3><p>Every question ends with one pearl and the trap that goes with it, ready to send to Anki.</p></div>'
    + '<div><h3>You stay on schedule</h3><p>Tell it your exam, your question bank and your date. It builds the plan, orders topics by yield, and you check in each day.</p></div></div></section>';

  h += '<section class="hm-band"><h2>It never hands you the answer.</h2><p class="hm-sub">An explanation tells you what was right. A senior asks what you saw. Only one of those changes how you read the next stem.</p>'
    + '<div class="hm-cmp"><div><h3>Reading the explanation</h3>' + li(['You see the answer first, then nod along', 'The same trap gets you again next week', 'No idea which kind of decision costs you marks']) + '</div>'
    + '<div class="y"><h3>Working it with a senior</h3>' + li(['You commit to each step before any feedback', 'Feedback points at the exact line of the stem', 'A reasoning profile shows where you slip']) + '</div></div></section>';

  h += '<section class="hm-sec" id="anki"><h2>Anki cards from whatever you are studying.</h2><p class="hm-sub">Finish a question and the rule you just learned becomes a card in one tap. No copying, no formatting, no deck you never open.</p>'
    + '<div class="hm-anki"><div><h3>One tap to your deck</h3><p>The pearl and the trap from each question go straight into Anki on your computer, tagged by topic.</p></div>'
    + '<div><h3>Image occlusion built in</h3><p>Drop in a flow chart, an ECG or a diagram. Say what to hide, or let it box the labels for you.</p></div>'
    + '<div><h3>Your own words</h3><p>Cards are written fresh from your reasoning, not copied from your question bank, so they stay yours.</p></div></div></section>';

  var faq = [['Does it just tell me the answer?', 'No. You make each decision and rule choices out until one is left. Then check it against your question bank.'],
    ['Which question banks does it work with?', 'Any of them. Senior Resident is independent and is not affiliated with or endorsed by any question bank or exam body.'],
    ['What happens to my questions?', 'The question you are on is sent to the AI model to build that session, then kept in your own browser. It is not sold, shared or used to build a question database.'],
    ['Does it work with Anki?', 'Yes. Install Anki and the free AnkiConnect add-on, and cards go straight into your deck. Senior Resident is not affiliated with Anki, AnkiWeb or AnKing.'],
    ['Is it allowed by my question bank?', 'Senior Resident is read only. It never clicks, answers or changes anything, never copies screens, and never stores or shares questions. Each bank sets its own rules, so check yours. You are responsible for following them.'],
    ['Can it be wrong?', 'Yes. It is an AI study aid and it can make mistakes. When it disagrees with your question bank, trust the bank. It is not medical advice.'],
    ['Can I cancel?', 'Yes, anytime, from Manage subscription in your account. You keep your plan until the end of the period you paid for.']];
  h += '<section class="hm-sec" id="faq"><h2>Common questions</h2>' + faq.map(function(f){ return '<details class="hm-faq"><summary>' + f[0] + '</summary><p>' + f[1] + '</p></details>'; }).join('') + '</section>';
  h += '<section class="hm-sec" id="install"><h2>Add it to Chrome</h2><p class="hm-sub">About a minute. Works in Chrome, Edge, Brave and Arc on a computer.</p><div class="hm-two">'
    + '<div class="hm-box"><a class="btn" href="../extension/senior-resident.zip" download>Download the extension</a><ol><li>Unzip it. You get a folder called <code>senior-resident</code>.</li><li>Go to <code>chrome://extensions</code> and turn on <b>Developer mode</b>.</li><li>Click <b>Load unpacked</b> and pick the folder.</li><li>Open a question and click the blue <b>Senior Resident</b> tab on the right edge, or press <code>Alt+S</code>.</li></ol></div>'
    + '<div class="hm-box"><h3>No extension? No problem</h3><p class="muted">On a phone, tablet or locked-down computer, use it right here. Paste a question or drop in a screenshot.</p><button type="button" class="btn ghost" data-hm="try">Try a question here</button></div></div></section>';


  } else if (pg === 'pricing'){
  h += '<section class="hm-sec hm-first" id="plans"><h2>Pricing</h2><p class="hm-sub">Start free. Move up when it is part of your routine. Prices in ' + esc(C.CURRENCY) + '.</p>'
    + '<div class="hm-plans">'
    + '<div class="hm-plan"><h3>Free</h3><p class="pk">Try the coach</p><div class="pr">$0</div>' + li([C.FREE_DAILY + ' questions a day', 'Guided and Harder levels', 'Works with any question bank']) + '<button type="button" class="btn ghost wide" data-hm="try">Try a question</button></div>'
    + '<div class="hm-plan pro"><span class="tag">Most popular</span><h3>Resident</h3><p class="pk">Your coach for every block</p><div class="pr">$' + C.PRICE_MONTH + ' <small>a month</small></div>'
    + li([C.PRO_DAILY + ' questions a day, a full block', 'Hardest level and narrowing from your cross-outs', 'Page the attending', 'Reasoning profile: where you lose points', 'One tap Anki cards, image occlusion included'])
    + '<button type="button" class="btn wide" data-act="buy" data-p="month">Start the 7-day free trial</button></div>'
    + '<div class="hm-plan"><h3>Chief</h3><p class="pk">Everything, plus exams from your PDFs</p><div class="pr">$' + (C.PRICE_FELLOW || 25) + ' <small>a month</small></div>'
    + li(['Unlimited questions a day*', 'Exam mode: any PDF becomes a timed exam', 'Second chance review', 'Answer keys for PDFs without them', 'Question ID on your Anki cards'])
    + '<button type="button" class="btn ghost wide" data-act="buy" data-p="chief">Get Chief</button></div></div>'
    + '<div class="hm-tblw"><table class="hm-cmpt"><thead><tr><th></th><th>Free</th><th>Resident</th><th>Chief</th></tr></thead><tbody>'
    + '<tr><td>Coached questions a day</td>' + '<td>' + C.FREE_DAILY + '</td>' + '<td>' + C.PRO_DAILY + '</td>' + '<td>' + 'Unlimited*' + '</td>' + '</tr>'
    + '<tr><td>Chrome side panel and web app</td>' + '<td class="y"></td>' + '<td class="y"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>Guided and Harder levels</td>' + '<td class="y"></td>' + '<td class="y"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>Pearls after each question</td>' + '<td class="y"></td>' + '<td class="y"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>Hardest level at exam pace</td>' + '<td class="n"></td>' + '<td class="y"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>Narrowing from your cross-outs</td>' + '<td class="n"></td>' + '<td class="y"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>Page the attending</td>' + '<td class="n"></td>' + '<td class="y"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>Reasoning profile (where you lose points)</td>' + '<td class="n"></td>' + '<td class="y"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>One tap Anki cards</td>' + '<td class="n"></td>' + '<td class="y"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>Image occlusion Anki cards</td>' + '<td class="n"></td>' + '<td class="y"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>Exam mode from any PDF</td>' + '<td class="n"></td>' + '<td class="n"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>Second chance review</td>' + '<td class="n"></td>' + '<td class="n"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>Answer keys and explanations for PDFs without them</td>' + '<td class="n"></td>' + '<td class="n"></td>' + '<td class="y"></td>' + '</tr>'
    + '<tr><td>Question ID on Anki cards</td>' + '<td class="n"></td>' + '<td class="n"></td>' + '<td class="y"></td>' + '</tr>'
    + '</tbody></table></div>'
    + '<p class="hm-legal"><b>Free trial:</b> ' + esc(TRIAL_NOTE) + '</p>'
    + '<p class="hm-legal"><b>Subscriptions</b> renew automatically each month at the price shown until you cancel. Cancelling stops the next charge, and you keep your plan until the end of the period you paid for. Prices may change with notice.</p>'
    + '<p class="hm-legal">*Unlimited is for one person studying. A fair use limit stops shared or automated accounts.</p><p class="hm-msg" id="buymsg"></p></section>';

    h += vidHTML('../assets/pricing.mp4?v=2', '../assets/pricing-poster.jpg?v=2', 'What each plan gets you', '');
  }
  h += '<footer class="hm-foot"><a href="../privacy.html" target="_blank" rel="noopener">Privacy</a><a href="../terms.html" target="_blank" rel="noopener">Terms</a><a href="mailto:asimibrahim1999@gmail.com">Contact</a><span>A study aid for students. Not medical advice. Independent, and not affiliated with or endorsed by any question bank, publisher or exam body.</span><span class="hm-legal">UWorld, AMBOSS, NBME, USMLE, MCCQE, TrueLearn, Kaplan and other names belong to their owners and are used only to describe compatibility. Anki is a trademark of Ankitects Pty Ltd. Senior Resident is not affiliated with Anki, AnkiWeb, AnkiConnect or AnKing. Each question bank sets its own terms of use. You are responsible for following them. Senior Resident never copies, stores or shares question bank content.</span></footer>';
  return h + '</div>';
}
function homeGo(where){
  if (where === 'try'){ go('new'); return; }
  if (where === 'signin'){ go('account'); return; }
  if (where === 'top'){ go('home'); return; }
  var map = { how:'how', plans:'pricing', pricing:'pricing', faq:'how', install:'how' };
  if (map[where]) go(map[where]);
}
document.addEventListener('click', function(e){
  var el = e.target.closest('[data-hm]'); if (!el) return;
  e.preventDefault(); homeGo(el.dataset.hm);
});

/* the site opens on Home. #how, #pricing, #faq, #plan and #coach open that tab, so links can be shared */
var HASHV = { how:'how', pricing:'pricing', plans:'pricing', faq:'how', questions:'how', exam:'exam', stats:'review', plan:'schedule', coach:'coach', home:'home' };
if (!EMBED){ var h0 = location.hash.slice(1); view = HASHV[h0] || 'home'; }
window.addEventListener('hashchange', function(){ var v = HASHV[location.hash.slice(1)]; if (v && v !== view){ view = v; if (v === 'coach') cur = -1; renderAll(); window.scrollTo(0, 0); } });
