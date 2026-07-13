// Проверка достижений после каждого значимого события.
import { store } from './store.js';
import { toast } from './ui.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { MODULES } from '../data/curriculum.js';

export function checkAchievements() {
  const ctx = buildContext();
  for (const a of ACHIEVEMENTS) {
    if (store.achievements[a.id]) continue;
    if (a.check(ctx) && store.unlockAchievement(a.id)) {
      toast('trophy', `Достижение: ${a.title}!`);
    }
  }
}

function buildContext() {
  const modulesDone = MODULES
    .filter((m) => m.lessons && m.lessons.every((l) => store.isDone(l.id)))
    .map((m) => m.id);
  return {
    lessonsDone: store.completedCount(),
    modulesDone,
    streak: store.streak(),
    perfect: store.perfectCount(),
    practiceDone: countPractice(),
    xp: store.xp,
  };
}

function countPractice() {
  let n = 0;
  for (const mod of MODULES) {
    for (const l of mod.lessons || []) {
      if (store.isPracticeDone(l.id)) n += 1;
    }
  }
  return n;
}
