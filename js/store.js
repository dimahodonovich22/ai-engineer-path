// Прогресс ученика: localStorage + события об изменениях.
const KEY = 'aiep-v1';

const DEFAULT = {
  xp: 0,
  completed: {},   // lessonId -> { date, perfect }
  practice: {},    // lessonId -> true
  streak: { count: 0, last: null, best: 0 },
  days: [],        // даты активности 'YYYY-MM-DD'
  achievements: {},// id -> дата получения
  theme: 'auto',
};

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

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export const store = {
  get xp() { return state.xp; },
  get theme() { return state.theme; },
  get achievements() { return state.achievements; },
  get streakBest() { return state.streak.best; },
  get daysActive() { return state.days.length; },

  isDone(lessonId) { return Boolean(state.completed[lessonId]); },
  isPracticeDone(lessonId) { return Boolean(state.practice[lessonId]); },
  completedCount() { return Object.keys(state.completed).length; },
  perfectCount() {
    return Object.values(state.completed).filter((c) => c.perfect).length;
  },

  // Актуальный стрик: гаснет, если последний день занятий — раньше вчера.
  streak() {
    const { count, last } = state.streak;
    if (!last) return 0;
    return daysBetween(last, today()) > 1 ? 0 : count;
  },
  streakToday() { return state.streak.last === today(); },

  // Завершение урока. Возвращает { xpGained, streakGrew, firstTime }.
  completeLesson(lesson, perfect) {
    const firstTime = !state.completed[lesson.id];
    const bonus = perfect ? 10 : 0;
    const xpGained = firstTime ? lesson.xp + bonus : 15;

    state.xp += xpGained;
    if (firstTime) {
      state.completed[lesson.id] = { date: today(), perfect };
    } else if (perfect && !state.completed[lesson.id].perfect) {
      state.completed[lesson.id].perfect = true;
    }

    const t = today();
    let streakGrew = false;
    if (state.streak.last !== t) {
      const gap = state.streak.last ? daysBetween(state.streak.last, t) : Infinity;
      state.streak.count = gap === 1 ? state.streak.count + 1 : 1;
      state.streak.last = t;
      state.streak.best = Math.max(state.streak.best, state.streak.count);
      streakGrew = true;
    }
    if (!state.days.includes(t)) state.days.push(t);

    save();
    return { xpGained, streakGrew, firstTime };
  },

  markPractice(lessonId) {
    if (state.practice[lessonId]) return;
    state.practice[lessonId] = true;
    save();
  },

  unlockAchievement(id) {
    if (state.achievements[id]) return false;
    state.achievements[id] = today();
    save();
    return true;
  },

  setTheme(theme) {
    state.theme = theme;
    save();
  },

  exportJSON() {
    return JSON.stringify(state, null, 2);
  },

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
