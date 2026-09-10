/**
 * lib/review.js
 *
 * Builds the self-check review page for a quiz, in the shape of the pages at
 * socialworky.com/quiz-review/<slug>/. The page is one HTML file with the
 * questions embedded as data and a small script that grades each click and
 * reveals the rationale. It expects to be served from the site root (it
 * loads /msw/header.js, the site favicon, and the footer links from there),
 * which is why the export writes quiz-review/<slug>/index.html.
 *
 * No DOM, no dependencies. Runs in the renderer via <script> and in Node.
 *
 *   QuizReview.buildPage(quiz, opts) -> { html, included, skipped }
 *     opts: { heading, tagline, readings: [string], siteName, standalone }
 *       standalone: true drops the site header, analytics, favicon, and
 *       footer links so the page works as a file anywhere, not only on
 *       socialworky.com
 *   QuizReview.slugify(text)         -> 'week-2'
 *
 * Multiple choice and true/false questions grade on one click. Multiple
 * answers questions let the reader pick several and then press Check.
 * Short answer and essay questions cannot be self-checked and are skipped;
 * the count comes back in `skipped`.
 */
(function(root, factory){
  const api = factory();
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(typeof window !== 'undefined') window.QuizReview = api;
})(this, function(){
'use strict';

const CHOICE = new Set(['multiple_choice_question', 'true_false_question', 'multiple_answers_question']);

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Readings are plain text lines; *asterisks* around a journal or book title
// become italics, the way the hand-written pages set them.
function readingHtml(line){
  return esc(line).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function slugify(s){
  return String(s || '').toLowerCase()
    .replace(/['"’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'quiz';
}

// The questions are embedded as JSON inside a <script>; a "</script>" in a
// stem would end the script early, so the slash is escaped.
function embed(data){
  return JSON.stringify(data, null, 2).replace(/<\//g, '<\\/');
}

function toReviewQuestions(questions, readings){
  const byId = new Map((readings || []).map(r => [r.id, r]));
  const out = [];
  let skipped = 0;
  (questions || []).forEach(q => {
    if(!CHOICE.has(q.type) || !q.answers || q.answers.length < 2){ skipped++; return; }
    const correct = q.answers.map((a, i) => a.correct ? i : -1).filter(i => i >= 0);
    if(!correct.length){ skipped++; return; }
    const item = {
      stem: String(q.text || '').trim(),
      options: q.answers.map(a => String(a.text || '').trim()),
      answer: q.type === 'multiple_answers_question' ? correct : correct[0],
      why: String(q.rationale || '').trim(),
      // A question linked to a reading but with no page reference typed still
      // gets the reading's short name on the page.
      source: String(q.source || '').trim() || ((byId.get(q.readingId) || {}).short || '')
    };
    out.push(item);
  });
  return { items: out, skipped };
}

function buildPage(quiz, opts){
  opts = opts || {};
  const siteName = opts.siteName || 'Socialworky';
  const standalone = !!opts.standalone;
  const heading = String(opts.heading || quiz.title || 'Quiz').trim();
  const tagline = String(opts.tagline || '').trim();
  // Readings come from the quiz itself unless the caller passes its own list.
  const readings = (opts.readings || (quiz.readings || []).map(r => r.citation))
    .map(r => String(r || '').trim()).filter(Boolean);
  const { items, skipped } = toReviewQuestions(quiz.questions, quiz.readings);
  const n = items.length;
  const title = heading + ' Quiz Review | ' + siteName;
  const description = 'A self-check review of the ' + heading + ' quiz' +
    (tagline ? ': ' + tagline.charAt(0).toLowerCase() + tagline.slice(1) : '') +
    ', with the reasoning and the reading behind each answer.';
  const ogDescription = n + ' question' + (n === 1 ? '' : 's') +
    (tagline ? ' on ' + tagline.charAt(0).toLowerCase() + tagline.slice(1) : '') +
    ', with the reasoning and the reading behind each answer.';
  const countWord = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'][n] || String(n);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />

<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />

<!-- Unlisted: shared by direct link, kept out of search. -->
<meta name="robots" content="noindex, nofollow" />

<!-- Social / Open Graph (for pasting the link into a course announcement) -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${esc(siteName)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(ogDescription)}" />
<meta property="og:image" content="https://socialworky.com/images/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(ogDescription)}" />
<meta name="twitter:image" content="https://socialworky.com/images/og-image.png" />

${standalone ? '' : `<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
`}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

${standalone ? '' : `<!-- Vercel Web Analytics -->
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
`}
<style>
  :root{
    --bg:#FFFFFF; --surface:#F8F5F5; --ink:#1A1A1A; --muted:#5B5B5B; --line:#E6DEDE;
    --accent:#841617; --accentDeep:#5C0F10; --accentSoft:#F5ECEC; --accentLine:#E8C8C8;
    --heroMuted:#6B4040;
    --good:#2E7D5B; --goodSoft:#E8F4EE; --goodLine:#BFE3D2;
    --bad:#841617;  --badSoft:#F5ECEC;  --badLine:#E8C8C8;
    --sans:'Hanken Grotesk',Arial,Helvetica,system-ui,sans-serif;
    --maxw:820px;
  }

  *{box-sizing:border-box;}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);
    line-height:1.5;-webkit-font-smoothing:antialiased;}

  .wrap{max-width:var(--maxw);margin:0 auto;padding:24px;padding-bottom:56px;}
  a{color:var(--accentDeep);}

  /* ---------- hero ---------- */

  .toolhero{display:flex;align-items:center;gap:16px;background:var(--accentSoft);
    border:1px solid var(--accentLine);border-radius:12px;box-shadow:inset 4px 0 0 var(--accent);
    padding:18px 22px 18px 24px;margin-bottom:20px;}
  .toolhero .ico{width:52px;height:52px;border-radius:12px;background:#fff;
    border:1px solid var(--accentLine);display:flex;align-items:center;justify-content:center;
    flex:0 0 auto;color:var(--accentDeep);}
  .toolhero .ico svg{width:26px;height:26px;display:block;}
  .toolhero .brand{margin:0;font-weight:700;font-size:22px;letter-spacing:-0.4px;color:var(--ink);line-height:1.1;}
  .toolhero .brand .bot{color:var(--accent);}
  .toolhero .tagline{color:var(--heroMuted);font-size:13.5px;margin-top:3px;}


  /* ---------- sticky progress ---------- */

  .qbar{position:sticky;top:0;z-index:10;background:var(--bg);
    display:flex;align-items:center;gap:12px;
    padding:14px 0 13px;margin:22px 0 18px;border-bottom:1px solid var(--line);}
  .qtrack{flex:1;height:7px;border-radius:999px;background:var(--surface);
    border:1px solid var(--line);overflow:hidden;}
  .qprog{height:100%;background:var(--accent);width:0;transition:width .25s ease;}
  .qcount{font-size:12.5px;color:var(--muted);font-weight:700;flex:0 0 auto;}

  /* ---------- questions ---------- */

  .qcard{background:#fff;border:1px solid var(--line);border-radius:12px;
    padding:22px;margin-bottom:14px;}

  .qnum{font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:700;
    color:var(--muted);margin:0 0 10px;}

  .stem{font-size:16px;font-weight:700;line-height:1.5;margin:0 0 16px;white-space:pre-line;}
  .hint{font-size:12.5px;color:var(--muted);margin:-8px 0 12px;}

  .opts{display:flex;flex-direction:column;gap:9px;}
  .opt{display:flex;gap:11px;align-items:flex-start;text-align:left;width:100%;
    background:#fff;border:1px solid var(--line);border-radius:9px;
    padding:12px 14px;font-family:var(--sans);font-size:15px;color:var(--ink);
    cursor:pointer;transition:border-color .13s,background .13s;}
  .opt:hover:not(:disabled){border-color:var(--accent);}
  .opt:focus-visible{outline:3px solid var(--accentDeep);outline-offset:2px;}
  .opt:disabled{cursor:default;}
  .opt .ltr{font-weight:700;color:var(--accent);flex:0 0 auto;width:18px;}

  .opt.picked{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);}
  .opt.correct{background:var(--goodSoft);border-color:var(--good);
    box-shadow:inset 0 0 0 1px var(--good);font-weight:700;}
  .opt.correct .ltr{color:var(--good);}
  .opt.correct::after{content:"\\2713";margin-left:auto;padding-left:12px;
    color:var(--good);font-weight:700;flex:0 0 auto;}
  .opt.wrong{background:var(--badSoft);border-color:var(--bad);
    box-shadow:inset 0 0 0 1px var(--bad);}
  .opt.wrong .ltr{color:var(--bad);}
  .opt.wrong::after{content:"\\2715";margin-left:auto;padding-left:12px;
    color:var(--bad);font-weight:700;flex:0 0 auto;}
  .opt.dim{opacity:.45;}

  .check{margin-top:12px;background:var(--accent);color:#fff;border:none;border-radius:9px;
    padding:9px 16px;font-size:14px;font-weight:700;font-family:var(--sans);cursor:pointer;}
  .check:hover:not(:disabled){background:var(--accentDeep);}
  .check:disabled{opacity:.45;cursor:default;}

  /* ---------- rationale ---------- */

  .why{display:none;margin-top:16px;background:var(--surface);
    border:1px solid var(--line);border-left:3px solid var(--accent);
    border-radius:9px;padding:16px 18px;font-size:14.5px;line-height:1.6;}
  .why.show{display:block;}
  .why.ok{border-left-color:var(--good);}
  .why.no{border-left-color:var(--bad);}

  .verdict{display:block;font-weight:700;font-size:11px;letter-spacing:1px;
    text-transform:uppercase;margin-bottom:8px;}
  .verdict.ok{color:var(--good);}
  .verdict.no{color:var(--bad);}

  .source{display:block;margin-top:14px;padding-top:12px;
    border-top:1px solid var(--line);font-size:13.5px;line-height:1.6;color:var(--muted);}
  .source b{font-size:11px;letter-spacing:1px;text-transform:uppercase;
    font-weight:700;color:var(--accentDeep);margin-right:8px;}

  /* ---------- result ---------- */

  .result{display:none;margin-top:22px;background:var(--accentSoft);
    border:1px solid var(--accentLine);border-radius:12px;padding:26px;text-align:center;}
  .result.show{display:block;}
  .score{font-size:38px;font-weight:800;line-height:1;margin:0 0 8px;letter-spacing:-1px;}
  .score-note{margin:0 0 20px;font-size:15px;color:var(--muted);}

  .btn{background:var(--accent);color:#fff;border:none;border-radius:9px;
    padding:12px 22px;font-size:15px;font-weight:700;font-family:var(--sans);
    cursor:pointer;transition:background .15s;}
  .btn:hover{background:var(--accentDeep);}
  .btn:focus-visible{outline:3px solid var(--accentDeep);outline-offset:3px;}

  /* ---------- references + footer ---------- */

  .seclabel{font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:700;
    color:var(--ink);border-bottom:1px solid var(--line);padding-bottom:6px;margin:34px 0 12px;}
  .refs{font-size:13.5px;line-height:1.65;color:var(--muted);}
  .refs p{margin:0 0 7px;}

  .foot{color:var(--muted);font-size:12.5px;margin-top:40px;
    border-top:1px solid var(--line);padding-top:16px;}
  .foot a{color:var(--muted);text-decoration:underline;text-underline-offset:2px;}
  .foot a:hover{color:var(--accentDeep);}
  .foot-legal{margin-top:9px;}

  @media (prefers-reduced-motion: reduce){
    *{transition:none !important;}
  }
</style>
</head>
<body>

${standalone ? '' : `<!-- Graduate Student Hub bar. This page is ungated, so no Sign out button. -->
<script>window.SW_MSW_PUBLIC = true;</script>
<script src="/msw/header.js"></script>
`}
<div class="wrap">

  <div class="toolhero">
    <div class="ico">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="3" width="14" height="18" rx="2"></rect>
        <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1z"></path>
        <path d="M8.5 11.5l1.5 1.5 2.5-3"></path><path d="M14.5 11.5H16"></path><path d="M8.5 16h7"></path>
      </svg>
    </div>
    <div>
      <h1 class="brand">${esc(heading)} <span class="bot">Quiz Review</span></h1>
${tagline ? '      <div class="tagline">' + esc(tagline) + '</div>\n' : ''}    </div>
  </div>

  <div class="qbar">
    <span class="qcount" id="counter">0 of ${n} answered</span>
    <span class="qtrack"><span class="qprog" id="meterFill"></span></span>
    <span class="qcount" id="scoreLive">0 correct</span>
  </div>

  <main id="quiz"></main>

  <div class="result" id="result">
    <p class="score" id="finalScore">0 / ${n}</p>
    <p class="score-note" id="finalNote"></p>
    <button class="btn" id="restart">Start over</button>
  </div>
${readings.length ? `
  <div class="seclabel">Readings</div>
  <div class="refs">
${readings.map(r => '    <p>' + readingHtml(r) + '</p>').join('\n')}
  </div>
` : ''}
  <div class="foot">${standalone ? 'A self-check review. For study only.' : 'A ' + esc(siteName) + ' course resource. For review and study only &mdash; not clinical advice.'}
${standalone ? '' : `    <div class="foot-legal"><a href="/terms.html">Terms of Use</a>&nbsp;&middot;&nbsp;<a href="/privacy.html">Privacy Policy</a>&nbsp;&middot;&nbsp;<a href="/disclaimer.html">Tools Disclaimer</a></div>
`}  </div>

</div>

<script>
(function () {
  "use strict";

  var QUESTIONS = ${embed(items).replace(/\n/g, '\n  ')};

  var LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  var quiz       = document.getElementById('quiz');
  var counter    = document.getElementById('counter');
  var meterFill  = document.getElementById('meterFill');
  var scoreLive  = document.getElementById('scoreLive');
  var result     = document.getElementById('result');
  var finalScore = document.getElementById('finalScore');
  var finalNote  = document.getElementById('finalNote');
  var restart    = document.getElementById('restart');

  var answered = 0, correct = 0;

  function answersOf(q) { return Array.isArray(q.answer) ? q.answer : [q.answer]; }

  function build() {
    quiz.innerHTML = '';
    answered = 0;
    correct = 0;
    result.classList.remove('show');
    updateStatus();

    QUESTIONS.forEach(function (q, qi) {
      var multi = Array.isArray(q.answer);
      var block = document.createElement('section');
      block.className = 'qcard';

      var num = document.createElement('p');
      num.className = 'qnum';
      num.textContent = 'Question ' + (qi + 1);

      var stem = document.createElement('p');
      stem.className = 'stem';
      stem.textContent = q.stem;

      var opts = document.createElement('div');
      opts.className = 'opts';

      var why = document.createElement('div');
      why.className = 'why';
      why.setAttribute('role', 'status');

      q.options.forEach(function (text, oi) {
        var btn = document.createElement('button');
        btn.className = 'opt';
        btn.type = 'button';

        var letter = document.createElement('span');
        letter.className = 'ltr';
        letter.textContent = LETTERS[oi];

        var label = document.createElement('span');
        label.textContent = text;

        btn.appendChild(letter);
        btn.appendChild(label);
        btn.addEventListener('click', function () {
          if (multi) { if (!btn.disabled) btn.classList.toggle('picked'); }
          else choose(q, [oi], opts, why);
        });
        opts.appendChild(btn);
      });

      block.appendChild(num);
      block.appendChild(stem);
      if (multi) {
        var hint = document.createElement('p');
        hint.className = 'hint';
        hint.textContent = 'Select all that apply, then check.';
        block.appendChild(hint);
      }
      block.appendChild(opts);
      if (multi) {
        var check = document.createElement('button');
        check.className = 'check';
        check.type = 'button';
        check.textContent = 'Check answer';
        check.addEventListener('click', function () {
          var picks = [];
          var buttons = opts.querySelectorAll('.opt');
          for (var i = 0; i < buttons.length; i++) if (buttons[i].classList.contains('picked')) picks.push(i);
          if (!picks.length) return;
          check.disabled = true;
          choose(q, picks, opts, why);
        });
        block.appendChild(check);
      }
      block.appendChild(why);
      quiz.appendChild(block);
    });
  }

  function choose(q, picks, opts, why) {
    var buttons = opts.querySelectorAll('.opt');
    if (buttons[0].disabled) return;

    var answers = answersOf(q);
    var right = picks.length === answers.length && picks.every(function (p) { return answers.indexOf(p) >= 0; });
    answered++;
    if (right) correct++;

    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
      buttons[i].classList.remove('picked');
      if (answers.indexOf(i) >= 0)    buttons[i].classList.add('correct');
      else if (picks.indexOf(i) >= 0) buttons[i].classList.add('wrong');
      else                            buttons[i].classList.add('dim');
    }

    var verdict = document.createElement('span');
    verdict.className = 'verdict ' + (right ? 'ok' : 'no');
    var letters = answers.map(function (a) { return LETTERS[a]; });
    verdict.textContent = right ? 'Correct'
      : (letters.length > 1 ? 'The answers are ' + letters.join(' and ') : 'The answer is ' + letters[0]);

    why.className = 'why ' + (right ? 'ok' : 'no');
    why.innerHTML = '';
    why.appendChild(verdict);

    if (q.why) {
      var body = document.createElement('span');
      body.textContent = q.why;
      why.appendChild(body);
    }

    if (q.source) {
      var src = document.createElement('span');
      src.className = 'source';
      var srcLabel = document.createElement('b');
      srcLabel.textContent = 'Where to find it';
      var srcBody = document.createElement('span');
      srcBody.textContent = q.source;
      src.appendChild(srcLabel);
      src.appendChild(srcBody);
      why.appendChild(src);
    }

    why.classList.add('show');

    updateStatus();
    if (answered === QUESTIONS.length) finish();
  }

  function updateStatus() {
    counter.textContent = answered + ' of ' + QUESTIONS.length + ' answered';
    scoreLive.textContent = correct + ' correct';
    meterFill.style.width = (answered / QUESTIONS.length * 100) + '%';
  }

  function finish() {
    finalScore.textContent = correct + ' / ' + QUESTIONS.length;
    var pct = correct / QUESTIONS.length;
    finalNote.textContent = pct === 1
      ? 'All ${countWord}. Bring your questions to class anyway.'
      : pct >= 0.8
        ? 'Solid. Look back at the ones you missed before class.'
        : pct >= 0.5
          ? 'Worth a second pass through the readings on the items you missed.'
          : 'Read back through the rationales and the cited sections, then take it again.';
    result.classList.add('show');
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  restart.addEventListener('click', function () {
    build();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  build();
})();
</script>

</body>
</html>
`;
  return { html, included: n, skipped };
}

return { buildPage, slugify, toReviewQuestions };
});
