// Прогресс ученика: localStorage + события об изменениях.
const KEY = 'aiep-v1';

const DEFAULT = {
  xp: 0,
  completed: {},   // lessonId -> { date, perfect }
  practice: {},    // lessonId -> true
  streak: { count: 0, last: null, best: 0 },
  days: [],        // даты активности 'YYYY-MM-DD'
  achievements: {},// id -> дата получения
  codeSolved: 0,   // решено код-заданий во встроенном редакторе
  bugsFixed: 0,    // решено дебаг-заданий «найди и исправь ошибку»
  reviewsDone: 0,  // отвечено вопросов в «Тренировке»
  review: {},      // 'lessonId:qi' -> { box: 1..5, due: 'YYYY-MM-DD' }
  freezes: 1,      // заморозки стрика (щиты)
  lastFreezeGrant: null,
  exams: {},       // moduleId -> { passed, best }
  projects: {},    // moduleId -> true
  theme: 'auto',
};

// Интервалы повторения по коробке Лейтнера (дни до следующего показа).
const BOX_DAYS = { 1: 1, 2: 3, 3: 7, 4: 21, 5: 60 };
const FREEZE_CAP = 3;

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    return { ...structuredClone(DEFAULT), ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT);
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  dispatchEvent(new CustomEvent('progress-changed'));
}

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function today() {
  return isoDate(new Date());
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function daysBetween(a, b) {
  return Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / -86400000);
}

const REVIEWABLE = ['mcq', 'tf', 'fill', 'order'];

export const store = {
  get xp() { return state.xp; },
  get theme() { return state.theme; },
  get achievements() { return state.achievements; },
  get streakBest() { return state.streak.best; },
  get daysActive() { return state.days.length; },
  get codeSolved() { return state.codeSolved; },
  get bugsFixed() { return state.bugsFixed; },
  get reviewsDone() { return state.reviewsDone; },
  get freezes() { return state.freezes; },

  isDone(lessonId) { return Boolean(state.completed[lessonId]); },
  isPracticeDone(lessonId) { return Boolean(state.practice[lessonId]); },
  completedCount() { return Object.keys(state.completed).length; },
  perfectCount() {
    return Object.values(state.completed).filter((c) => c.perfect).length;
  },

  // Актуальный стрик: гаснет через день без занятий, но заморозка держит его ещё сутки.
  streak() {
    const { count, last } = state.streak;
    if (!last) return 0;
    const gap = daysBetween(today(), last);
    if (gap <= 1) return count;
    if (gap === 2 && state.freezes > 0) return count; // спасён заморозкой (спишется при возвращении)
    return 0;
  },
  streakToday() { return state.streak.last === today(); },

  // Завершение урока. Возвращает { xpGained, streakGrew, firstTime, freezeUsed }.
  completeLesson(lesson, perfect) {
    const firstTime = !state.completed[lesson.id];
    const bonus = perfect ? 10 : 0;
    const xpGained = firstTime ? lesson.xp + bonus : 15;

    state.xp += xpGained;
    if (firstTime) {
      state.completed[lesson.id] = { date: today(), perfect };
      enrollLessonReviews(lesson);
    } else if (perfect && !state.completed[lesson.id].perfect) {
      state.completed[lesson.id].perfect = true;
    }

    const t = today();
    let streakGrew = false;
    let freezeUsed = false;
    if (state.streak.last !== t) {
      const gap = state.streak.last ? daysBetween(t, state.streak.last) : Infinity;
      if (gap === 1) {
        state.streak.count += 1;
      } else if (gap === 2 && state.freezes > 0) {
        state.freezes -= 1;          // заморозка спасла пропущенный день
        state.streak.count += 1;
        freezeUsed = true;
      } else {
        state.streak.count = 1;
      }
      state.streak.last = t;
      state.streak.best = Math.max(state.streak.best, state.streak.count);
      streakGrew = true;
    }
    if (!state.days.includes(t)) state.days.push(t);

    save();
    return { xpGained, streakGrew, firstTime, freezeUsed };
  },

  // Раз в неделю выдаём заморозку (до FREEZE_CAP). Вызывается при загрузке.
  maybeGrantFreeze() {
    const t = today();
    if (!state.lastFreezeGrant) { state.lastFreezeGrant = t; save(); return; }
    const weeks = Math.floor(daysBetween(t, state.lastFreezeGrant) / 7);
    if (weeks >= 1) {
      state.freezes = Math.min(FREEZE_CAP, state.freezes + weeks);
      state.lastFreezeGrant = t;
      save();
    }
  },

  bumpCodeSolved() { state.codeSolved += 1; save(); },
  bumpBugFixed() { state.bugsFixed += 1; save(); },

  addXp(n) { state.xp += n; save(); },

  markPractice(lessonId) {
    if (state.practice[lessonId]) return;
    state.practice[lessonId] = true;
    save();
  },

  // ---- Повторение (Leitner) ----
  // Заносит в очередь вопросы уже пройденных уроков (для старого прогресса).
  backfillReviews(lessons) {
    let added = false;
    for (const lesson of lessons) {
      if (!state.completed[lesson.id]) continue;
      (lesson.quiz || []).forEach((q, qi) => {
        if (!REVIEWABLE.includes(q.type)) return;
        const key = `${lesson.id}:${qi}`;
        if (!state.review[key]) { state.review[key] = { box: 1, due: today() }; added = true; }
      });
    }
    if (added) save();
  },

  reviewDueKeys() {
    const t = today();
    return Object.keys(state.review).filter((k) => state.review[k].due <= t);
  },
  reviewTotalCount() { return Object.keys(state.review).length; },
  reviewDueCount() { return this.reviewDueKeys().length; },

  gradeReview(key, correct) {
    const item = state.review[key] || { box: 1 };
    item.box = correct ? Math.min(5, item.box + 1) : 1;
    item.due = addDays(today(), BOX_DAYS[item.box]);
    state.review[key] = item;
    state.reviewsDone += 1;
    countActiveDay();
    save();
  },

  // ---- Экзамены модулей ----
  examPassed(moduleId) { return Boolean(state.exams[moduleId]?.passed); },
  examBest(moduleId) { return state.exams[moduleId]?.best ?? 0; },
  recordExam(moduleId, ratio, passed) {
    const prev = state.exams[moduleId] || { passed: false, best: 0 };
    state.exams[moduleId] = {
      passed: prev.passed || passed,
      best: Math.max(prev.best, ratio),
    };
    if (passed) countActiveDay();
    save();
  },

  // ---- Проекты модулей ----
  projectDone(moduleId) { return Boolean(state.projects[moduleId]); },
  markProject(moduleId) {
    if (state.projects[moduleId]) return;
    state.projects[moduleId] = true;
    countActiveDay();
    save();
  },
  projectsDoneCount() { return Object.keys(state.projects).length; },

  unlockAchievement(id) {
    if (state.achievements[id]) return false;
    state.achievements[id] = today();
    save();
    return true;
  },

  setTheme(theme) { state.theme = theme; save(); },

  exportJSON() { return JSON.stringify(state, null, 2); },

  importJSON(text) {
    const data = JSON.parse(text);
    if (typeof data.xp !== 'number' || typeof data.completed !== 'object') {
      throw new Error('Это не файл прогресса AI Engineer Path');
    }
    state = { ...structuredClone(DEFAULT), ...data };
    save();
  },

  reset() {
    state = structuredClone(DEFAULT);
    save();
  },
};

// Отмечает сегодняшний день активным (для стрика при действиях вне уроков).
function countActiveDay() {
  const t = today();
  if (!state.days.includes(t)) state.days.push(t);
  if (state.streak.last !== t) {
    const gap = state.streak.last ? daysBetween(t, state.streak.last) : Infinity;
    if (gap === 1) state.streak.count += 1;
    else if (gap === 2 && state.freezes > 0) { state.freezes -= 1; state.streak.count += 1; }
    else state.streak.count = 1;
    state.streak.last = t;
    state.streak.best = Math.max(state.streak.best, state.streak.count);
  }
}

// Записывает вопросы урока в очередь повторения (первое прохождение).
function enrollLessonReviews(lesson) {
  (lesson.quiz || []).forEach((q, qi) => {
    if (!REVIEWABLE.includes(q.type)) return;
    const key = `${lesson.id}:${qi}`;
    if (!state.review[key]) state.review[key] = { box: 1, due: addDays(today(), 1) };
  });
}

// ---- Уровни: порог растёт с каждым уровнем ----
export function levelInfo(xp) {
  let level = 1;
  let need = 100;   // XP до 2-го уровня
  let floor = 0;    // XP на старте текущего уровня
  while (xp >= floor + need) {
    floor += need;
    level += 1;
    need = 100 + (level - 1) * 50;
  }
  return { level, into: xp - floor, need, pct: Math.round(((xp - floor) / need) * 100) };
}
