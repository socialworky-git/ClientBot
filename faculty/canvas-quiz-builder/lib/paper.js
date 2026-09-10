/**
 * lib/paper.js
 *
 * The paper versions of a quiz, as HTML meant for printing to PDF. The layout
 * follows the Word quiz papers: Letter, one-inch margins, Calibri 12pt, a bold
 * 16pt title, and each question kept together on a page.
 *
 *   QuizPaper.buildQuizHtml(quiz)  -> the student paper: title, Name line,
 *                                     numbered questions, lettered choices,
 *                                     no key, no rationale
 *   QuizPaper.buildKeyHtml(quiz)   -> the instructor copy: "<Title>: Answer Key",
 *                                     the answer-position summary, then for each
 *                                     question the key and the rationale
 *   QuizPaper.answerPositions(questions) -> "a on 2, 7 | b on 1, 4 | c on 3"
 *
 * The caller prints the HTML (Electron's printToPDF, or window.print() in a
 * browser) with Letter and one-inch margins; the stylesheet carries only the
 * type and spacing. No DOM, no dependencies.
 */
(function(root, factory){
  const api = factory();
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(typeof window !== 'undefined') window.QuizPaper = api;
})(this, function(){
'use strict';

const CHOICE = new Set(['multiple_choice_question', 'true_false_question', 'multiple_answers_question']);
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function stem(t){ return esc(t).replace(/\n+/g, '<br>'); }

const CSS = `
html,body{margin:0;padding:0}
body{font-family:Calibri,Carlito,"Helvetica Neue",Arial,sans-serif;font-size:12pt;line-height:1.15;color:#000}
h1{font-size:16pt;font-weight:bold;margin:0 0 6pt;break-after:avoid}
.name,.meta{font-size:11pt;margin:0 0 4pt}
.meta{color:#444}
.q{break-inside:avoid;margin-top:14pt}
.stem{margin:0 0 3pt}
.a{margin:0 0 2pt 24pt}
.blank{border-bottom:1px solid #000;height:20pt;margin:0 0 0 24pt}
.k{break-inside:avoid;margin-top:9pt}
.k .ans{font-weight:bold;margin:0 0 1.5pt}
.k .why{margin:0 0 4pt}
.k .src{font-size:11pt;color:#444;margin:0 0 4pt}
@page{size:Letter;margin:1in}
`;

function page(title, body){
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title>\n' +
    '<style>' + CSS + '</style></head><body>\n' + body + '</body></html>';
}

// "a on 2, 7, 9 | b on 1, 4, 6, 10 | c on 3, 5, 8", the line the Word papers
// carry so a stack can be graded from the summary alone.
function answerPositions(questions){
  const byLetter = {};
  (questions || []).forEach((q, i) => {
    if(!CHOICE.has(q.type)) return;
    q.answers.forEach((a, j) => {
      if(!a.correct) return;
      const L = LETTERS[j] || String(j + 1);
      (byLetter[L] = byLetter[L] || []).push(i + 1);
    });
  });
  return Object.keys(byLetter).sort().map(L => L + ' on ' + byLetter[L].join(', ')).join(' | ');
}

function buildQuizHtml(quiz){
  let body = '<h1>' + esc(quiz.title || 'Quiz') + '</h1>\n';
  body += '<p class="name">Name: _______________________________________</p>\n';
  (quiz.questions || []).forEach((q, i) => {
    let text = q.text || '';
    if(q.type === 'multiple_answers_question' && !/select all/i.test(text)) text += ' (Select all that apply.)';
    body += '<div class="q"><p class="stem">' + (i + 1) + '. ' + stem(text) + '</p>\n';
    if(CHOICE.has(q.type)){
      q.answers.forEach((a, j) => {
        body += '<p class="a">' + LETTERS[j % 26] + '. ' + stem(a.text) + '</p>\n';
      });
    } else {
      const n = q.type === 'essay_question' ? 6 : 1;
      for(let k = 0; k < n; k++) body += '<div class="blank"></div>\n';
    }
    body += '</div>\n';
  });
  return page(quiz.title || 'Quiz', body);
}

function keyTitle(title){
  const t = String(title || 'Quiz').trim();
  // "Week 2 Quiz: The Basics" becomes "Week 2 Quiz: Answer Key", the way the
  // Word papers name the instructor page.
  return (t.includes(':') ? t.slice(0, t.indexOf(':')) : t) + ': Answer Key';
}

function buildKeyHtml(quiz){
  const qs = quiz.questions || [];
  let body = '<h1>' + esc(keyTitle(quiz.title)) + '</h1>\n';
  body += '<p class="meta">Instructor copy. Do not distribute with the quiz.</p>\n';
  const positions = answerPositions(qs);
  if(positions) body += '<p class="meta">Answer positions: ' + esc(positions) + '</p>\n';
  qs.forEach((q, i) => {
    let line;
    if(CHOICE.has(q.type)){
      const hits = q.answers.map((a, j) => a.correct ? j : -1).filter(j => j >= 0);
      if(!hits.length) line = (i + 1) + '. No correct answer marked.';
      else line = (i + 1) + '. ' + hits.map(j => LETTERS[j]).join(', ') + '. ' + hits.map(j => esc(q.answers[j].text)).join('; ');
    } else if(q.type === 'short_answer_question'){
      line = (i + 1) + '. ' + (q.shortAnswers && q.shortAnswers.length ? esc(q.shortAnswers.join(' | ')) : 'No accepted answer text.');
    } else {
      line = (i + 1) + '. Essay';
    }
    body += '<div class="k"><p class="ans">' + line + '</p>\n';
    if(q.rationale && q.rationale.trim()) body += '<p class="why">' + stem(q.rationale) + '</p>\n';
    if(q.source && q.source.trim()) body += '<p class="src">Where to find it: ' + esc(q.source) + '</p>\n';
    body += '</div>\n';
  });
  return page(keyTitle(quiz.title), body);
}

return { buildQuizHtml, buildKeyHtml, answerPositions, keyTitle, CSS };
});
