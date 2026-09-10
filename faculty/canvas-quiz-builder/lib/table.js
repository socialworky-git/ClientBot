/**
 * lib/table.js
 *
 * Reads a quiz that was pasted out of a spreadsheet: one row per question,
 * cells separated by tabs (or commas), with or without a header row. The
 * standard text parser cannot place columns it has never seen, and asking a
 * model to do it costs money and loses text. This guesses each column's role,
 * lets the user correct the guess, and builds questions deterministically.
 *
 * No DOM, no dependencies. Runs in the renderer via <script> and in Node for
 * tests. Output goes through QtiCore.normalizeQuestions before use.
 *
 *   QuizTable.sniff(text)                 -> { delim, rows, width, hasHeader } | null
 *   QuizTable.inferRoles(table)           -> { roles: ['question','answer',...], correctRule }
 *   QuizTable.buildQuestions(table, roles, opts) -> [ question ]   (raw, pre-normalize)
 *   QuizTable.ROLES, QuizTable.CORRECT_RULES
 */
(function(root, factory){
  const api = factory();
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(typeof window !== 'undefined') window.QuizTable = api;
})(this, function(){
'use strict';

const ROLES = ['question', 'answer', 'correct', 'rationale', 'points', 'type', 'ignore'];
const CORRECT_RULES = ['first', 'column', 'asterisk', 'none'];

const RE_HEADER = /^(question|prompt|stem|item|answers?|choices?|options?|distractors?|correct|key|points?|pts|type|rationale|feedback|explanation|comment|title)\b/i;
const RE_QNUM = /^\s*(?:Q(?:uestion)?\s*)?\d{1,3}\s*[.):\]]\s+\S/;

const trim = s => String(s == null ? '' : s).trim();

// Splits on the delimiter, honouring double-quoted cells that may contain
// the delimiter, doubled quotes, and line breaks.
function parseDelimited(text, delim){
  const rows = [];
  let row = [], cell = '', q = false;
  for(let i = 0; i < text.length; i++){
    const c = text[i];
    if(q){
      if(c === '"' && text[i + 1] === '"'){ cell += '"'; i++; }
      else if(c === '"'){ q = false; }
      else cell += c;
    } else {
      if(c === '"' && cell === '') q = true;
      else if(c === delim){ row.push(cell); cell = ''; }
      else if(c === '\n'){ row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
  }
  if(cell.length || row.length){ row.push(cell); rows.push(row); }
  return rows;
}

function looksLikeHeader(row){
  return row.filter(c => RE_HEADER.test(trim(c))).length >= 2;
}

// Decides whether the text is a table at all. Tabs are decisive, since prose
// never contains them. Commas need a consistent column count across rows and
// no numbered-question lines, or an ordinary quiz would be mistaken for CSV.
function sniff(text){
  // Spreadsheet exports often begin with a byte-order mark, which would
  // otherwise hide the opening quote of the first cell.
  text = String(text == null ? '' : text).replace(/^\ufeff/, '').replace(/\r\n?/g, '\n');
  if(!text.trim()) return null;
  const firstLine = text.split('\n').find(l => l.trim()) || '';
  let delim = null;
  if(firstLine.includes('\t')) delim = '\t';
  else if(firstLine.includes(',')) delim = ',';
  if(!delim) return null;

  let rows = parseDelimited(text, delim).filter(r => r.some(c => trim(c)));
  if(!rows.length) return null;
  const filled = rows.map(r => r.filter(c => trim(c)).length);

  if(delim === '\t'){
    const wide = filled.filter(n => n >= 2).length;
    if(wide < Math.max(1, Math.ceil(rows.length * 0.8))) return null;
  } else {
    if(rows.length < 2) return null;
    if(rows.some(r => RE_QNUM.test(r[0] || ''))) return null;
    const counts = rows.map(r => r.length);
    const mode = counts.sort((a, b) => counts.filter(v => v === a).length - counts.filter(v => v === b).length).pop();
    const consistent = rows.filter(r => r.length === mode).length;
    if(mode < 3 || consistent < Math.ceil(rows.length * 0.8)) return null;
    if(filled.filter(n => n >= 3).length < Math.ceil(rows.length * 0.8)) return null;
  }

  const width = Math.max.apply(null, rows.map(r => r.length));
  rows = rows.map(r => { const c = r.slice(); while(c.length < width) c.push(''); return c; });
  return { delim, rows, width, hasHeader: looksLikeHeader(rows[0]) };
}

function columnStats(rows, i){
  const vals = rows.map(r => trim(r[i])).filter(Boolean);
  const n = vals.length;
  return {
    n,
    allNumeric: n > 0 && vals.every(v => /^\d+(\.\d+)?$/.test(v)),
    allLetter: n > 0 && vals.every(v => /^\(?[a-hA-H]\)?[.)]?$/.test(v) || /^[a-hA-H](\s*[,;/&]\s*[a-hA-H])+$/.test(v)),
    allTypeHint: n > 0 && vals.every(v => /multiple|select all|short answer|fill|essay|true|false|MC|TF|MA|SA|ES/i.test(v) && v.length < 40),
    avgLen: n ? vals.reduce((s, v) => s + v.length, 0) / n : 0
  };
}

function roleFromHeader(h){
  h = trim(h).toLowerCase();
  if(/^(question|prompt|stem|item)/.test(h)) return 'question';
  if(/^(rationale|feedback|explanation|comment)/.test(h)) return 'rationale';
  if(/^(correct|key)$/.test(h) || /^correct/.test(h)) return 'correct';
  if(/^(points?|pts)/.test(h)) return 'points';
  if(/^type/.test(h)) return 'type';
  if(/^(answers?|choices?|options?|distractors?)/.test(h)) return 'answer';
  return 'ignore';
}

function inferRoles(table){
  const { rows, width, hasHeader } = table;
  const roles = new Array(width).fill('ignore');
  if(hasHeader){
    rows[0].forEach((h, i) => { roles[i] = roleFromHeader(h); });
    if(!roles.includes('question')) roles[0] = 'question';
  } else {
    const data = rows;
    const stats = [];
    for(let i = 0; i < width; i++) stats.push(columnStats(data, i));
    roles[0] = 'question';
    let pointsDone = false, correctDone = false;
    for(let i = 1; i < width; i++){
      const s = stats[i];
      if(!s.n) continue;
      if(s.allNumeric && !pointsDone){ roles[i] = 'points'; pointsDone = true; continue; }
      if(s.allNumeric && pointsDone && !correctDone){ roles[i] = 'correct'; correctDone = true; continue; }
      if(s.allLetter && !correctDone){ roles[i] = 'correct'; correctDone = true; continue; }
      if(s.allTypeHint){ roles[i] = 'type'; continue; }
      roles[i] = 'answer';
    }
    // The rationale is usually the last text column, and it reads as prose:
    // much longer than the answers, or set apart by an empty column.
    const answerCols = roles.map((r, i) => r === 'answer' ? i : -1).filter(i => i >= 0);
    if(answerCols.length >= 2){
      const last = answerCols[answerCols.length - 1];
      const prev = answerCols[answerCols.length - 2];
      const others = answerCols.slice(0, -1);
      const otherAvg = others.reduce((s, i) => s + stats[i].avgLen, 0) / others.length;
      const gap = last - prev > 1 && roles.slice(prev + 1, last).every(r => r === 'ignore');
      if(gap || stats[last].avgLen >= 2 * Math.max(otherAvg, 1)) roles[last] = 'rationale';
    }
  }
  let correctRule = 'first';
  if(roles.includes('correct')) correctRule = 'column';
  else {
    const ai = roles.map((r, i) => r === 'answer' ? i : -1).filter(i => i >= 0);
    const body = hasHeader ? rows.slice(1) : rows;
    if(body.some(r => ai.some(i => /^\*|\*\s*$/.test(trim(r[i]))))) correctRule = 'asterisk';
  }
  return { roles, correctRule };
}

function typeFromHint(h){
  h = trim(h).toLowerCase();
  if(!h) return null;
  if(/multiple answers?|select all|^ma$/.test(h)) return 'multiple_answers_question';
  if(/short answer|fill|^sa$/.test(h))            return 'short_answer_question';
  if(/essay|^es$/.test(h))                        return 'essay_question';
  if(/true|^tf$/.test(h))                         return 'true_false_question';
  if(/multiple choice|^mc$/.test(h))              return 'multiple_choice_question';
  return null;
}

function markCorrect(answers, keyRaw){
  const key = trim(keyRaw);
  if(!key) return;
  const letter = key.match(/^\(?([a-hA-H])\)?[.):\]]?$/);
  if(letter){
    const idx = letter[1].toLowerCase().charCodeAt(0) - 97;
    if(answers[idx]) answers[idx].correct = true;
    return;
  }
  if(/^\d{1,2}$/.test(key)){
    const idx = parseInt(key, 10) - 1;
    if(answers[idx]) answers[idx].correct = true;
    return;
  }
  if(/^[a-hA-H](\s*[,;/&]\s*[a-hA-H])+$/.test(key)){
    key.split(/[,;/&]/).forEach(L => {
      const idx = trim(L).toLowerCase().charCodeAt(0) - 97;
      if(answers[idx]) answers[idx].correct = true;
    });
    return;
  }
  const hit = answers.find(a => a.text.toLowerCase() === key.toLowerCase());
  if(hit) hit.correct = true;
}

function buildQuestions(table, roles, opts){
  opts = opts || {};
  const rule = CORRECT_RULES.includes(opts.correctRule) ? opts.correctRule : 'first';
  const skipHeader = opts.skipHeader != null ? !!opts.skipHeader : !!table.hasHeader;
  const qi = roles.indexOf('question');
  if(qi < 0) return [];
  const ai = roles.map((r, i) => r === 'answer' ? i : -1).filter(i => i >= 0);
  const ci = roles.indexOf('correct'), ri = roles.indexOf('rationale');
  const pi = roles.indexOf('points'), ti = roles.indexOf('type');

  const out = [];
  const body = skipHeader ? table.rows.slice(1) : table.rows;
  for(const r of body){
    const stem = trim(r[qi]);
    if(!stem) continue;
    const answers = ai.map(i => trim(r[i])).filter(Boolean).map(t => ({ text: t, correct: false }));
    // A star at either end of a cell marks the key in any layout.
    answers.forEach(a => {
      if(/^\*/.test(a.text)){ a.text = a.text.replace(/^\*\s*/, ''); a.correct = true; }
      else if(/\*\s*$/.test(a.text)){ a.text = a.text.replace(/\s*\*$/, ''); a.correct = true; }
    });
    const keyRaw = ci >= 0 ? trim(r[ci]) : '';
    if(rule === 'column' && keyRaw) markCorrect(answers, keyRaw);
    if(rule === 'first' && answers.length && !answers.some(a => a.correct)) answers[0].correct = true;
    const type = ti >= 0 ? typeFromHint(r[ti]) : null;
    const points = pi >= 0 ? parseFloat(trim(r[pi])) : NaN;
    out.push({
      text: stem,
      type,
      answers,
      shortAnswers: (!answers.length && keyRaw) ? keyRaw.split(/\s*[|;]\s*/).filter(Boolean) : [],
      rationale: ri >= 0 ? trim(r[ri]) : '',
      points: points > 0 ? points : 1,
      num: null
    });
  }
  return out;
}

return { sniff, inferRoles, buildQuestions, parseDelimited, ROLES, CORRECT_RULES };
});
