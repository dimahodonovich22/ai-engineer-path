// Выбор вопросов из уже пройденного материала для «Разминки» и подмешивания в квиз.
import { store } from './store.js';
import { allLessons } from '../data/curriculum.js';

const REVIEWABLE = ['mcq', 'tf', 'fill', 'order'];

// Кандидаты: вопросы из пройденных уроков, идущих ПО ПРОГРАММЕ раньше текущего.
function candidateKeys(currentLessonId) {
  const flat = allLessons();
  const curIndex = flat.findIndex((x) => x.lesson.id === currentLessonId);
  const out = [];
  flat.forEach(({ lesson }, idx) => {
    if (lesson.id === currentLessonId) return;
    if (curIndex !== -1 && idx > curIndex) return; // только более раннее
    if (!store.isDone(lesson.id)) return;
    (lesson.quiz || []).forEach((q, qi) => {
      if (!REVIEWABLE.includes(q.type)) return;
      out.push({ key: `${lesson.id}:${qi}`, q, lessonTitle: lesson.title, order: idx });
    });
  });
  return out;
}

// Выбрать n вопросов для повторения.
// prefer: 'recent' — самые свежие уроки (закрепить только что выученное);
//         'due'    — просроченные по графику (вернуть подзабытое старое).
// exclude — Set ключей, которые уже заняты в этом уроке.
export function pickRecall(currentLessonId, n, { prefer = 'recent', exclude = new Set() } = {}) {
  const cands = candidateKeys(currentLessonId).filter((c) => !exclude.has(c.key));
  if (!cands.length) return [];

  const dueSet = new Set(store.reviewDueKeys());
  const due = cands.filter((c) => dueSet.has(c.key));
  const rest = cands.filter((c) => !dueSet.has(c.key));

  let ordered;
  if (prefer === 'due') {
    due.sort((a, b) => a.order - b.order);   // старое просроченное — важнее
    rest.sort((a, b) => a.order - b.order);
    ordered = [...due, ...rest];
  } else {
    rest.sort((a, b) => b.order - a.order);   // ближе к текущему — свежее
    due.sort((a, b) => b.order - a.order);
    ordered = [...rest, ...due];
  }

  // Разнообразие: сначала по одному вопросу с разных уроков.
  const picked = [];
  const usedLessons = new Set();
  for (const c of ordered) {
    if (usedLessons.has(c.lessonTitle)) continue;
    picked.push(c);
    usedLessons.add(c.lessonTitle);
    if (picked.length >= n) return picked;
  }
  for (const c of ordered) {
    if (picked.includes(c)) continue;
    picked.push(c);
    if (picked.length >= n) break;
  }
  return picked;
}
