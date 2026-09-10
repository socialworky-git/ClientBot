/**
 * qti-core.js
 *
 * Parses quiz text into structured questions and writes Canvas QTI 1.2.
 * No DOM, no network, no dependencies. Runs in a browser via <script>, in
 * Node for tests, and in an Electron main or renderer process.
 *
 * Shared with the web version at socialworky.com. If you fix a bug here,
 * paste the fix into the other copy.
 *
 * PUBLIC API
 *
 *   QtiCore.parseQuiz(text, opts)
 *     opts: { normalize: true }   fold smart quotes and repair mojibake
 *     returns: { questions: [...], keyFound: n, keyApplied: n }
 *
 *   QtiCore.buildPackage(questions, config)
 *     config: { title, type, shuffle, attempts, ident }
 *       ident is optional. Pass a stored one to reuse it across exports,
 *       which is what makes Canvas overwrite-on-import possible. Omit it
 *       and a fresh one is generated, so every import makes a new quiz.
 *     returns: { ident, files: { '<path>': '<xml string>' } }
 *              Zip those paths verbatim. Do not rename or reorder them.
 *
 *   QtiCore.problems(question)  -> array of human-readable issues, empty if fine
 *   QtiCore.newIdent()          -> a fresh stable identifier
 *
 * QUESTION SHAPE
 *   {
 *     text: 'stem',
 *     type: 'multiple_choice_question' | 'true_false_question' |
 *           'multiple_answers_question' | 'short_answer_question' |
 *           'essay_question',
 *     answers: [ { text: 'choice', correct: false } ],
 *     shortAnswers: ['accepted text'],
 *     rationale: 'shown to students after they submit',
 *     points: 1,
 *     num: 3 | null   // the number it carried in the source document
 *   }
 */
(function(root, factory){
  const api = factory();
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(typeof window !== 'undefined') window.QtiCore = api;
})(this, function(){
'use strict';


/* ------------------------------------------------------------------ *
 * Text hygiene. This is the part that fixes the junk characters.
 * ------------------------------------------------------------------ */

// Repairs UTF-8 bytes that were decoded as Windows-1252 (the "â€™" family).
function repairMojibake(s){
  if(!/[ÂÃ][\u0080-\u00BF\u2000-\u203A]/.test(s)) return s;
  try{
    const bytes = Uint8Array.from([...s].map(c => c.charCodeAt(0) & 0xff));
    const back = new TextDecoder('utf-8', {fatal:true}).decode(bytes);
    return back;
  }catch(e){ return s; }
}

// Folds typographic characters down to plain ASCII equivalents.
function normalizePunctuation(s){
  return s
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/[\u2022\u25CF\u25AA\u00B7]/g, '-')
    .replace(/\u00A9/g,'(c)').replace(/\u00AE/g,'(R)').replace(/\u2122/g,'(TM)')
    .replace(/\r\n?/g, '\n');
}

let NORMALIZE = true;
function clean(s){
  s = repairMojibake(String(s == null ? '' : s));
  if(NORMALIZE) s = normalizePunctuation(s);
  return s.replace(/\r\n?/g,'\n').replace(/[ \t]+$/gm,'');
}

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
// Question text goes into Canvas as HTML, so it is escaped twice on purpose.
function html(s){ return '<p>' + esc(s).replace(/\n+/g,'</p><p>') + '</p>'; }
function xmlHtml(s){ return esc(html(s)); }

/* ------------------------------------------------------------------ *
 * The forgiving parser. No AI, no network.
 * ------------------------------------------------------------------ */

const RE_QNUM   = /^\s*(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[.):\]]\s+(.*)$/i;
const RE_ANS    = /^\s*(\*?)\s*\(?([a-hA-H])\s*[.):\]]\s+(.*)$/;
const RE_KEY    = /^\s*(?:ANS|ANSWER|KEY|CORRECT)\s*[:.\-]?\s*(.+)$/i;
const RE_RAT    = /^\s*(?:RATIONALE|FEEDBACK|EXPLANATION|COMMENT|WHY)\s*[:.\-]?\s*(.*)$/i;
const RE_PTS    = /^\s*(?:POINTS?|PTS)\s*[:.\-]?\s*([\d.]+)\s*$/i;
const RE_TYPEHINT = /\[(multiple answers?|select all|short answer|fill[- ]in|essay|true\/?false|numerical)\]/i;

// A line that is nothing but an answer-key heading. Everything after it is a key.
const RE_KEYHEAD = /^\s*(?:[\w\s]{0,40}?[:\-]\s*)?(?:answer\s*key|answers?\s*(?:and|&|with)\s*rationales?|answer\s*sheet|key|solutions?)\s*:?\s*$/i;

// Page furniture that should never become a question.
const RE_JUNK = /^\s*(?:instructor(?:'s)?\s*copy|do not distribute|for instructor use|confidential|page\s*\d+(?:\s*of\s*\d+)?|name\s*:?\s*_*|date\s*:?\s*_*|\d{1,3})\s*\.?\s*$/i;

// Pulls "B", "B.", "(B)", "B, D" off the front of a line without swallowing
// ordinary prose. The letter has to be followed by punctuation or end of line,
// so "A client mentions..." is not read as answer A.
function leadingLetters(s){
  const m = String(s).trim().match(/^\*?\(?([A-Ha-h])\)?(?=$|[.,:;)\]\-\u2013\u2014/&]|\s+[-\u2013\u2014:])([^]*)$/);
  if(!m) return null;
  const letters = [m[1].toUpperCase()];
  let rest = m[2] || '';
  // Additional letters for select-all keys.
  let more;
  while((more = rest.match(/^\s*[,;/&]\s*\(?([A-Ha-h])\)?(?=$|[.,:;)\]\-\u2013\u2014/&\s])/))){
    letters.push(more[1].toUpperCase());
    rest = rest.slice(more[0].length);
  }
  rest = rest.replace(/^\s*[.):\]]?\s*[-\u2013\u2014:]?\s*/, '').trim();
  return {letters, rest};
}

// Reads the lines after an answer-key heading into {n, letters, rationale}.
function parseKeyLines(lines){
  const entries = [];
  let pendingNum = null;
  for(const raw of lines){
    const line = raw.trim();
    if(!line){ continue; }
    if(RE_JUNK.test(line) && !/^\d{1,3}\.?$/.test(line)) continue;

    // Word tables flatten to a bare number on one line and the letter on the next.
    if(/^\d{1,3}[.):\]]?$/.test(line)){ pendingNum = parseInt(line, 10); continue; }
    if(pendingNum !== null){
      const L = leadingLetters(line);
      if(L){ entries.push({n: pendingNum, letters: L.letters, rationale: L.rest}); pendingNum = null; continue; }
      pendingNum = null;
    }

    const m = line.match(/^(\d{1,3})\s*[.):\]]\s*(.+)$/);
    if(m){
      const L = leadingLetters(m[2]);
      if(L){ entries.push({n: parseInt(m[1], 10), letters: L.letters, rationale: L.rest}); continue; }
    }
    // Anything else continues the rationale of the entry above it.
    if(entries.length){
      const last = entries[entries.length - 1];
      last.rationale = (last.rationale ? last.rationale + ' ' : '') + line;
    }
  }
  return entries;
}

// Answer key pages often restate the correct choice before the explanation
// ("B - Insight" then "Insight is the client's understanding..."). Both halves
// land in the rationale, so drop the echo. Only strips when the next word is
// capitalized, which keeps a rationale that genuinely opens with the answer
// ("Engaging is the first process") intact.
function stripEchoedAnswer(rationale, answers){
  if(!rationale) return rationale;
  const words = s => (String(s).toLowerCase().match(/[a-z0-9]+/g) || []);
  const rWords = words(rationale);
  if(!rWords.length) return rationale;

  const ordered = answers.filter(a => a.correct).concat(answers.filter(a => !a.correct));
  for(const a of ordered){
    const aWords = words(a.text);
    if(!aWords.length || aWords.length > rWords.length) continue;
    if(!aWords.every((w, i) => w === rWords[i])) continue;

    if(aWords.length === rWords.length) return '';
    const re = new RegExp('^\\W*(?:[A-Za-z0-9]+\\W*){' + aWords.length + '}');
    const m = rationale.match(re);
    if(!m) continue;
    const tail = rationale.slice(m[0].length).trim();
    if(!/^[A-Z]/.test(tail)) continue;
    return tail;
  }
  return rationale;
}

function applyKey(qs, entries){
  // Match on the question's own number when it has one, so a stray title line
  // or an unnumbered item cannot shift the whole key by one.
  const byNum = new Map();
  qs.forEach(q => { if(q.num != null && !byNum.has(q.num)) byNum.set(q.num, q); });

  let applied = 0;
  for(const e of entries){
    const q = byNum.get(e.n) || qs[e.n - 1];
    if(!q) continue;
    if(q.answers.length){
      const before = q.answers.map(a => a.correct);
      q.answers.forEach(a => a.correct = false);
      let hit = false;
      e.letters.forEach(L => {
        const idx = L.toLowerCase().charCodeAt(0) - 97;
        if(q.answers[idx]){ q.answers[idx].correct = true; hit = true; }
      });
      if(hit){
        applied++;
        if(e.letters.length > 1 && q.type !== 'multiple_answers_question') q.type = 'multiple_answers_question';
      } else {
        q.answers.forEach((a, i) => a.correct = before[i]);
      }
    }
    if(e.rationale && !q.rationale){
      const r = stripEchoedAnswer(e.rationale, q.answers);
      if(r) q.rationale = r;
    }
  }
  return applied;
}

// Fallback for keys with no heading: a run of trailing items that are bare
// letters with no answer choices is a key, not a set of essay questions.
function harvestTrailingKey(qs){
  let i = qs.length - 1;
  const entries = [];
  while(i >= 0){
    const q = qs[i];
    if(q.answers.length || !q.num) break;
    const L = leadingLetters(q.text);
    if(!L || L.rest.length > 400) break;
    entries.unshift({n: q.num, letters: L.letters, rationale: L.rest});
    i--;
  }
  const kept = qs.slice(0, i + 1);
  if(entries.length < 2 || !kept.length) return {qs, entries: []};
  return {qs: kept, entries};
}

function typeFromHint(h){
  h = (h||'').toLowerCase();
  if(/multiple answers?|select all/.test(h)) return 'multiple_answers_question';
  if(/short answer|fill/.test(h))            return 'short_answer_question';
  if(/essay/.test(h))                        return 'essay_question';
  if(/true/.test(h))                         return 'true_false_question';
  return null;
}

function looksLikeTrueFalse(answers){
  if(answers.length !== 2) return false;
  const t = answers.map(a => a.text.trim().toLowerCase()).sort();
  return t[0] === 'false' && t[1] === 'true';
}

function parseCSV(text){
  const rows = [];
  let row = [], cell = '', q = false;
  const delim = (text.split('\n')[0].split('\t').length > text.split('\n')[0].split(',').length) ? '\t' : ',';
  for(let i = 0; i < text.length; i++){
    const c = text[i];
    if(q){
      if(c === '"' && text[i+1] === '"'){ cell += '"'; i++; }
      else if(c === '"'){ q = false; }
      else cell += c;
    } else {
      if(c === '"') q = true;
      else if(c === delim){ row.push(cell); cell = ''; }
      else if(c === '\n'){ row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
  }
  if(cell.length || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}

function parseCSVQuiz(text){
  const rows = parseCSV(text);
  if(rows.length < 2) return null;
  const head = rows[0].map(h => h.trim().toLowerCase());
  const qi = head.findIndex(h => /^(question|prompt|stem|item)/.test(h));
  if(qi < 0) return null;
  const ri = head.findIndex(h => /rationale|feedback|explanation|comment/.test(h));
  const ci = head.findIndex(h => /^(correct|answer|key)$/.test(h));
  const pi = head.findIndex(h => /^(points?|pts)$/.test(h));
  const ti = head.findIndex(h => /^(type)$/.test(h));
  const ai = head.map((h,i) => /^(answer|choice|option|distractor)\s*\d*$/.test(h) && i !== ci ? i : -1)
                 .filter(i => i >= 0);
  if(!ai.length) return null;

  const out = [];
  for(const r of rows.slice(1)){
    const stem = (r[qi]||'').trim();
    if(!stem) continue;
    const answers = ai.map(i => (r[i]||'').trim()).filter(Boolean).map(t => ({text:t, correct:false}));
    const keyRaw = ci >= 0 ? (r[ci]||'').trim() : '';
    markKey(answers, keyRaw);
    // A leading asterisk in the cell itself also marks the key.
    answers.forEach(a => { if(a.text.startsWith('*')){ a.text = a.text.slice(1).trim(); a.correct = true; } });
    let type = ti >= 0 ? typeFromHint(r[ti]) : null;
    if(!type) type = looksLikeTrueFalse(answers) ? 'true_false_question'
              : answers.filter(a=>a.correct).length > 1 ? 'multiple_answers_question'
              : answers.length ? 'multiple_choice_question' : 'short_answer_question';
    out.push({
      text: stem, answers, type,
      rationale: ri >= 0 ? (r[ri]||'').trim() : '',
      points: pi >= 0 && r[pi] ? parseFloat(r[pi]) || 1 : 1,
      shortAnswers: type === 'short_answer_question' ? [keyRaw].filter(Boolean) : []
    });
  }
  return out.length ? out : null;
}

function markKey(answers, keyRaw){
  if(!keyRaw) return;
  const key = keyRaw.trim();
  const letter = key.match(/^\(?([a-hA-H])\)?[.):\]]?$/);
  if(letter){
    const idx = letter[1].toLowerCase().charCodeAt(0) - 97;
    if(answers[idx]) answers[idx].correct = true;
    return;
  }
  // Comma separated letters, for select-all items.
  if(/^[a-hA-H](\s*[,;/&]\s*[a-hA-H])+$/.test(key)){
    key.split(/[,;/&]/).forEach(L => {
      const idx = L.trim().toLowerCase().charCodeAt(0) - 97;
      if(answers[idx]) answers[idx].correct = true;
    });
    return;
  }
  const hit = answers.find(a => a.text.trim().toLowerCase() === key.toLowerCase());
  if(hit) hit.correct = true;
}

// Separates the quiz body from a trailing answer key page.
function splitRaw(text){
  const lines = text.split('\n');
  for(let i = 1; i < lines.length; i++){
    if(RE_KEYHEAD.test(lines[i]))
      return {body: lines.slice(0, i).join('\n'), keyText: lines.slice(i + 1).join('\n')};
  }
  return {body: text, keyText: ''};
}

function parseText(raw){
  const text = clean(raw);
  if(/^[^\n]*[,\t][^\n]*\n/.test(text) && /question|prompt|stem/i.test(text.split('\n')[0])){
    const csv = parseCSVQuiz(text);
    if(csv) return csv;
  }

  const split = splitRaw(text);
  const lines = split.body.split('\n');
  const keyLines = split.keyText ? split.keyText.split('\n') : [];

  const qs = [];
  let cur = null, pendingKey = '', lastTarget = null;

  const push = () => {
    if(!cur) return;
    if(pendingKey) markKey(cur.answers, pendingKey);
    if(!cur.type){
      if(looksLikeTrueFalse(cur.answers)) cur.type = 'true_false_question';
      else if(cur.answers.filter(a => a.correct).length > 1) cur.type = 'multiple_answers_question';
      else if(cur.answers.length) cur.type = 'multiple_choice_question';
      else if(pendingKey) cur.type = 'short_answer_question';
      else cur.type = 'essay_question';
    }
    if(cur.type === 'short_answer_question' && !cur.shortAnswers.length && pendingKey)
      cur.shortAnswers = pendingKey.split(/\s*[|;]\s*/).filter(Boolean);
    qs.push(cur);
    cur = null; pendingKey = ''; lastTarget = null;
  };

  for(const line of lines){
    if(!line.trim()){ lastTarget = null; continue; }

    const mq = line.match(RE_QNUM);
    // Guard against an answer line that happens to be numbered.
    if(mq && !RE_ANS.test(line)){
      push();
      let body = mq[2];
      let type = null;
      const hint = body.match(RE_TYPEHINT);
      if(hint){ type = typeFromHint(hint[1]); body = body.replace(RE_TYPEHINT,'').trim(); }
      cur = {text: body, answers: [], rationale: '', points: 1, type, shortAnswers: [], num: parseInt(mq[1], 10)};
      lastTarget = 'q';
      continue;
    }
    if(RE_JUNK.test(line)){ lastTarget = null; continue; }
    if(!cur){
      // Text before the first numbered question starts an unnumbered item.
      cur = {text: line.trim(), answers: [], rationale: '', points: 1, type: null, shortAnswers: [], num: null};
      lastTarget = 'q';
      continue;
    }

    const mr = line.match(RE_RAT);
    if(mr){ cur.rationale = mr[1].trim(); lastTarget = 'r'; continue; }

    const mk = line.match(RE_KEY);
    if(mk){ pendingKey = mk[1].trim(); lastTarget = null; continue; }

    const mp = line.match(RE_PTS);
    if(mp){ cur.points = parseFloat(mp[1]) || 1; lastTarget = null; continue; }

    const ma = line.match(RE_ANS);
    if(ma){
      let t = ma[3].trim();
      let correct = ma[1] === '*';
      if(/\*\s*$/.test(t)){ t = t.replace(/\*\s*$/,'').trim(); correct = true; }
      cur.answers.push({text: t, correct});
      lastTarget = 'a';
      continue;
    }

    // A bare asterisk-led line is an unlettered answer.
    const mstar = line.match(/^\s*([*-])\s+(.*)$/);
    if(mstar && cur.answers.length !== 0){
      cur.answers.push({text: mstar[2].trim(), correct: mstar[1] === '*'});
      lastTarget = 'a';
      continue;
    }

    // Anything else continues whatever we were last building.
    if(lastTarget === 'a' && cur.answers.length) cur.answers[cur.answers.length-1].text += ' ' + line.trim();
    else if(lastTarget === 'r') cur.rationale += ' ' + line.trim();
    else if(lastTarget === 'q') cur.text += '\n' + line.trim();
    else {
      // A blank line broke the flow, so this prose starts a new item rather
      // than getting glued onto the question above it.
      push();
      cur = {text: line.trim(), answers: [], rationale: '', points: 1, type: null, shortAnswers: [], num: null};
      lastTarget = 'q';
    }
  }
  push();

  let out = qs.filter(q => q.text.trim() && !(q.answers.length === 0 && RE_JUNK.test(q.text)));

  // A short unnumbered line sitting above the first numbered question is the
  // document's title, not question one.
  while(out.length > 1 && out[0].num == null && !out[0].answers.length &&
        out[0].text.length < 120 && out.some(q => q.num != null)){
    out.shift();
  }

  let entries = parseKeyLines(keyLines);
  if(!entries.length){
    const h = harvestTrailingKey(out);
    out = h.qs; entries = h.entries;
  }
  parseText.keyApplied = applyKey(out, entries);
  parseText.keyFound = entries.length;

  // Re-derive types now that the key has landed.
  out.forEach(q => {
    if(q.answers.length && looksLikeTrueFalse(q.answers)) q.type = 'true_false_question';
    else if(q.answers.filter(a => a.correct).length > 1) q.type = 'multiple_answers_question';
    else if(q.answers.length && q.type === 'essay_question') q.type = 'multiple_choice_question';
  });
  return out;
}

/* ------------------------------------------------------------------ *
 * QTI 1.2 output, aimed at Canvas Classic Quizzes.
 * ------------------------------------------------------------------ */

function uid(p){
  const h = 'abcdef0123456789';
  let s = '';
  for(let i = 0; i < 32; i++) s += h[Math.floor(Math.random()*16)];
  return (p || 'g') + s;
}

function feedbackBlock(ident, text){
  return `      <itemfeedback ident="${ident}">
        <flow_mat>
          <material>
            <mattext texttype="text/html">${xmlHtml(text)}</mattext>
          </material>
        </flow_mat>
      </itemfeedback>\n`;
}

function buildItem(q, n){
  const ident = uid('i');
  const ref = uid('r');
  const isChoice = ['multiple_choice_question','true_false_question','multiple_answers_question'].includes(q.type);
  const ids = q.answers.map((_, i) => String(1000 + n*20 + i));
  const correctIds = q.answers.map((a, i) => a.correct ? ids[i] : null).filter(Boolean);
  const wrongIds   = q.answers.map((a, i) => a.correct ? null : ids[i]).filter(Boolean);
  const title = 'Question ' + (n + 1);

  let x = `    <item ident="${ident}" title="${esc(title)}">
      <itemmetadata>
        <qtimetadata>
          <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>${q.type}</fieldentry></qtimetadatafield>
          <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>${(q.points||1).toFixed(1)}</fieldentry></qtimetadatafield>
          <qtimetadatafield><fieldlabel>assessment_question_identifierref</fieldlabel><fieldentry>${ref}</fieldentry></qtimetadatafield>`;
  if(isChoice) x += `
          <qtimetadatafield><fieldlabel>original_answer_ids</fieldlabel><fieldentry>${ids.join(',')}</fieldentry></qtimetadatafield>`;
  x += `
        </qtimetadata>
      </itemmetadata>
      <presentation>
        <material>
          <mattext texttype="text/html">${xmlHtml(q.text)}</mattext>
        </material>\n`;

  if(isChoice){
    const card = q.type === 'multiple_answers_question' ? 'Multiple' : 'Single';
    x += `        <response_lid ident="response1" rcardinality="${card}">
          <render_choice>\n`;
    q.answers.forEach((a, i) => {
      x += `            <response_label ident="${ids[i]}">
              <material>
                <mattext texttype="text/html">${xmlHtml(a.text)}</mattext>
              </material>
            </response_label>\n`;
    });
    x += `          </render_choice>
        </response_lid>\n`;
  } else {
    x += `        <response_str ident="response1" rcardinality="Single">
          <render_fib><response_label ident="answer1" rshuffle="No"/></render_fib>
        </response_str>\n`;
  }
  x += `      </presentation>
      <resprocessing>
        <outcomes>
          <decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/>
        </outcomes>\n`;

  if(q.rationale && q.rationale.trim()){
    x += `        <respcondition continue="Yes">
          <conditionvar><other/></conditionvar>
          <displayfeedback feedbacktype="Response" linkrefid="general_fb"/>
        </respcondition>\n`;
  }

  if(q.type === 'multiple_answers_question'){
    x += `        <respcondition continue="No">
          <conditionvar>
            <and>\n`;
    correctIds.forEach(id => { x += `              <varequal respident="response1">${id}</varequal>\n`; });
    wrongIds.forEach(id => { x += `              <not><varequal respident="response1">${id}</varequal></not>\n`; });
    x += `            </and>
          </conditionvar>
          <setvar action="Set" varname="SCORE">100</setvar>
        </respcondition>\n`;
  } else if(isChoice){
    x += `        <respcondition continue="No">
          <conditionvar>\n`;
    (correctIds.length ? correctIds : [ids[0]]).forEach(id => {
      x += `            <varequal respident="response1">${id}</varequal>\n`;
    });
    x += `          </conditionvar>
          <setvar action="Set" varname="SCORE">100</setvar>
        </respcondition>\n`;
  } else if(q.type === 'short_answer_question'){
    x += `        <respcondition continue="No">
          <conditionvar>\n`;
    (q.shortAnswers.length ? q.shortAnswers : ['']).forEach(a => {
      x += `            <varequal respident="response1" case="No">${esc(a)}</varequal>\n`;
    });
    x += `          </conditionvar>
          <setvar action="Set" varname="SCORE">100</setvar>
        </respcondition>\n`;
  } else {
    x += `        <respcondition continue="No">
          <conditionvar><other/></conditionvar>
        </respcondition>\n`;
  }

  x += `      </resprocessing>\n`;
  if(q.rationale && q.rationale.trim()) x += feedbackBlock('general_fb', q.rationale);
  x += `    </item>\n`;
  return x;
}

function buildAssessment(qs, cfg, ident){
  let x = `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd">
  <assessment ident="${ident}" title="${esc(cfg.title)}">
    <qtimetadata>
      <qtimetadatafield><fieldlabel>cc_maxattempts</fieldlabel><fieldentry>${cfg.attempts}</fieldentry></qtimetadatafield>
    </qtimetadata>
    <section ident="root_section">
`;
  qs.forEach((q, i) => { x += buildItem(q, i); });
  x += `    </section>
  </assessment>
</questestinterop>
`;
  return x;
}

function buildMeta(qs, cfg, ident){
  const pts = qs.reduce((s, q) => s + (q.points || 1), 0);
  return `<?xml version="1.0" encoding="UTF-8"?>
<quiz identifier="${ident}" xmlns="http://canvas.instructure.com/xsd/cccv1p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://canvas.instructure.com/xsd/cccv1p0 https://canvas.instructure.com/xsd/cccv1p0.xsd">
  <title>${esc(cfg.title)}</title>
  <description></description>
  <shuffle_answers>${cfg.shuffle}</shuffle_answers>
  <scoring_policy>keep_highest</scoring_policy>
  <hide_results></hide_results>
  <quiz_type>${cfg.type}</quiz_type>
  <points_possible>${pts.toFixed(1)}</points_possible>
  <require_lockdown_browser>false</require_lockdown_browser>
  <require_lockdown_browser_for_results>false</require_lockdown_browser_for_results>
  <require_lockdown_browser_monitor>false</require_lockdown_browser_monitor>
  <lockdown_browser_monitor_data/>
  <show_correct_answers>true</show_correct_answers>
  <anonymous_submissions>false</anonymous_submissions>
  <could_be_locked>false</could_be_locked>
  <allowed_attempts>${cfg.attempts}</allowed_attempts>
  <one_question_at_a_time>false</one_question_at_a_time>
  <cant_go_back>false</cant_go_back>
  <available>false</available>
  <one_time_results>false</one_time_results>
  <show_correct_answers_last_attempt>false</show_correct_answers_last_attempt>
  <only_visible_to_overrides>false</only_visible_to_overrides>
  <module_locked>false</module_locked>
</quiz>
`;
}

function buildManifest(ident){
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${uid('m')}" xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1" xmlns:lom="http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource" xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/profile/cc/ccv1p1/ccv1p1_imscp_v1p2_v1p0.xsd http://ltsc.ieee.org/xsd/imsccv1p1/LOM/resource http://www.imsglobal.org/profile/cc/ccv1p1/LOM/ccv1p1_lomresource_v1p0.xsd">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.3</schemaversion>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="${ident}" type="imsqti_xmlv1p2">
      <file href="${ident}/${ident}.xml"/>
      <dependency identifierref="${ident}_dependency"/>
    </resource>
    <resource identifier="${ident}_dependency" type="associatedcontent/imscc_xmlv1p1/learning-application-resource" href="${ident}/assessment_meta.xml">
      <file href="${ident}/assessment_meta.xml"/>
    </resource>
  </resources>
</manifest>
`;
}
/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

const CHOICE_TYPES = [
  'multiple_choice_question','true_false_question','multiple_answers_question'
];

function problems(q){
  const p = [];
  const needsKey = CHOICE_TYPES.includes(q.type);
  if(needsKey && !q.answers.length) p.push('No answer choices found.');
  if(needsKey && q.answers.length && !q.answers.some(a => a.correct))
    p.push('No correct answer marked.');
  if(q.type === 'multiple_choice_question' && q.answers.filter(a => a.correct).length > 1)
    p.push('More than one answer is marked. Switch the type to multiple answers.');
  if(q.type === 'short_answer_question' && !q.shortAnswers.length)
    p.push('No accepted answer text.');
  return p;
}


const TYPE_SET = new Set([
  'multiple_choice_question','true_false_question','multiple_answers_question',
  'short_answer_question','essay_question'
]);

// Splits a source document into the quiz body and a trailing answer key page.
// The AI reader parses only the body; the key is applied by applyKeyText,
// which reuses the tested deterministic matching and echo stripping.
function splitSource(raw, opts){
  NORMALIZE = !opts || opts.normalize !== false;
  return splitRaw(clean(raw));
}

// Cleans and sanity-checks questions that came from somewhere other than the
// built-in parser, and re-derives the type from the answers rather than
// trusting whatever the source claimed.
function normalizeQuestions(arr, opts){
  NORMALIZE = !opts || opts.normalize !== false;
  return (arr || []).map(function(q){
    const answers = (q.answers || [])
      .map(function(a){ return {text: clean(a.text || ''), correct: !!a.correct}; })
      .filter(function(a){ return a.text.trim(); });
    let type = TYPE_SET.has(q.type) ? q.type : null;
    if(answers.length){
      if(looksLikeTrueFalse(answers)) type = 'true_false_question';
      else if(answers.filter(function(a){ return a.correct; }).length > 1) type = 'multiple_answers_question';
      else if(!type || type === 'essay_question' || type === 'short_answer_question') type = 'multiple_choice_question';
    } else if(!type || type === 'multiple_choice_question' || type === 'true_false_question' || type === 'multiple_answers_question'){
      type = (q.shortAnswers && q.shortAnswers.length) ? 'short_answer_question' : 'essay_question';
    }
    const n = parseInt(q.sourceNumber != null ? q.sourceNumber : q.num, 10);
    return {
      text: clean(q.text || ''),
      type: type,
      answers: answers,
      shortAnswers: (q.shortAnswers || []).map(clean).filter(Boolean),
      rationale: clean(q.rationale || ''),
      points: parseFloat(q.points) > 0 ? parseFloat(q.points) : 1,
      num: (n > 0 ? n : null)
    };
  }).filter(function(q){ return q.text.trim(); });
}

// Applies a separate answer key page to an already-parsed question list.
// Mutates questions in place. Matches on each question's source number when
// it has one, falling back to list position.
function applyKeyText(questions, keyText, opts){
  NORMALIZE = !opts || opts.normalize !== false;
  if(!keyText || !keyText.trim()) return {found: 0, applied: 0};
  const entries = parseKeyLines(clean(keyText).split('\n'));
  const applied = applyKey(questions, entries);
  return {found: entries.length, applied: applied};
}

function parseQuiz(text, opts){
  NORMALIZE = !opts || opts.normalize !== false;
  const questions = parseText(text);
  return {
    questions: questions,
    keyFound: parseText.keyFound || 0,
    keyApplied: parseText.keyApplied || 0
  };
}

function buildPackage(questions, config){
  const cfg = Object.assign(
    {title: 'Imported Quiz', type: 'assignment', shuffle: 'false', attempts: 1},
    config || {}
  );
  const ident = cfg.ident || uid('g');
  const files = {};
  files['imsmanifest.xml'] = buildManifest(ident);
  files[ident + '/' + ident + '.xml'] = buildAssessment(questions, cfg, ident);
  files[ident + '/assessment_meta.xml'] = buildMeta(questions, cfg, ident);
  return {ident: ident, files: files};
}

return {
  parseQuiz: parseQuiz,
  splitSource: splitSource,
  normalizeQuestions: normalizeQuestions,
  applyKeyText: applyKeyText,
  buildPackage: buildPackage,
  problems: problems,
  newIdent: function(){ return uid('g'); },
  CHOICE_TYPES: CHOICE_TYPES
};
});
