/**
 * lib/shuffle.js
 *
 * Reorders the answer choices in a quiz so the correct answer does not sit
 * in the same position every time. Imports from spreadsheets tend to put the
 * key first in every row, which is fine for Canvas (it shuffles for students)
 * but not for a printed paper.
 *
 * The placement is balanced, not merely random: each correct answer goes to
 * whichever position has been used least so far, ties broken at random, so
 * nine three-option questions come out three per position rather than
 * clustered by chance. Distractors are shuffled into the remaining slots.
 *
 * Left alone: true/false items, questions with fewer than two movable
 * choices, and choices such as "All of the above" or "None of these", which
 * stay at the end where they make sense.
 *
 *   QuizShuffle.shuffleAnswers(questions, rng) -> { changed, counts }
 *     mutates each question's answers array in place
 *     counts maps position index -> number of correct answers placed there
 */
(function(root, factory){
  const api = factory();
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(typeof window !== 'undefined') window.QuizShuffle = api;
})(this, function(){
'use strict';

const MOVABLE_TYPES = new Set(['multiple_choice_question', 'multiple_answers_question']);
const RE_PINNED = /^(all|none|both|neither|any|each)\s+of\s+(the\s+)?(above|these|those)\b|^(all|none)\s+of\s+the\s+options\b|^both\s+[a-h]\s+(and|&)\s+[a-h]\b|^[a-h]\s+(and|&)\s+[a-h]\s+only\b/i;

function isPinned(a){ return RE_PINNED.test(String(a.text || '').trim()); }

function fisherYates(arr, rng){
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleAnswers(questions, rng){
  rng = typeof rng === 'function' ? rng : Math.random;
  const counts = {};
  let changed = 0;

  (questions || []).forEach(q => {
    if(!MOVABLE_TYPES.has(q.type) || !Array.isArray(q.answers)) return;
    const pinned = q.answers.filter(isPinned);
    const free = q.answers.filter(a => !isPinned(a));
    if(free.length < 2) return;

    const correct = free.filter(a => a.correct);
    const wrong = fisherYates(free.filter(a => !a.correct), rng);
    const slots = free.length;
    const chosen = [];
    correct.forEach(() => {
      const avail = [];
      for(let p = 0; p < slots; p++) if(!chosen.includes(p)) avail.push(p);
      const min = Math.min.apply(null, avail.map(p => counts[p] || 0));
      const best = avail.filter(p => (counts[p] || 0) === min);
      const p = best[Math.floor(rng() * best.length)];
      chosen.push(p);
      counts[p] = (counts[p] || 0) + 1;
    });

    const out = new Array(slots).fill(null);
    correct.forEach((a, i) => { out[chosen[i]] = a; });
    let wi = 0;
    for(let i = 0; i < slots; i++) if(!out[i]) out[i] = wrong[wi++];
    q.answers = out.concat(pinned);
    changed++;
  });

  return { changed, counts };
}

return { shuffleAnswers, isPinned };
});
