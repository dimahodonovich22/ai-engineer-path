// Дерево курса: порядок модулей = порядок на карте.
// Модули с lessons === null показываются как «скоро» (roadmap).
import module0 from './modules/module-0.js';
import module1 from './modules/module-1.js';
import module2 from './modules/module-2.js';
import module3 from './modules/module-3.js';

export const MODULES = [
  {
    id: 'm0', icon: 'rocket', color: 'violet',
    title: 'Старт',
    subtitle: 'Кто такой AI Engineer и как учиться',
    lessons: module0.lessons,
  },
  {
    id: 'm1', icon: 'code', color: 'mint',
    title: 'Python: первые шаги',
    subtitle: 'Переменные, строки, условия',
    lessons: module1.lessons,
  },
  {
    id: 'm2', icon: 'repeat', color: 'sky',
    title: 'Python: логика',
    subtitle: 'Циклы, списки, словари, функции',
    lessons: module2.lessons,
  },
  {
    id: 'm3', icon: 'brain-circuit', color: 'amber',
    title: 'Как работает ИИ',
    subtitle: 'LLM, токены, промпты, температура',
    lessons: module3.lessons,
  },
  // ---- Roadmap: контент появится по мере твоего прогресса ----
  {
    id: 'f1', icon: 'network', color: 'violet',
    title: 'Python для API',
    subtitle: 'HTTP, JSON, requests, окружения',
    lessons: null,
  },
  {
    id: 'f2', icon: 'message-square', color: 'mint',
    title: 'LLM API на практике',
    subtitle: 'Claude API, tool use, streaming',
    lessons: null,
  },
  {
    id: 'f3', icon: 'database', color: 'sky',
    title: 'RAG-системы',
    subtitle: 'Эмбеддинги, векторный поиск, chunking',
    lessons: null,
  },
  {
    id: 'f4', icon: 'bot', color: 'amber',
    title: 'AI-агенты',
    subtitle: 'Tool use, оркестрация, MCP',
    lessons: null,
  },
  {
    id: 'f5', icon: 'target', color: 'coral',
    title: 'Evaluation',
    subtitle: 'Как измерять качество AI-систем',
    lessons: null,
  },
  {
    id: 'f6', icon: 'rocket', color: 'violet',
    title: 'Прод и деплой',
    subtitle: 'FastAPI, Docker, мониторинг',
    lessons: null,
  },
];

export function findLesson(lessonId) {
  for (const mod of MODULES) {
    if (!mod.lessons) continue;
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    if (idx !== -1) return { module: mod, lesson: mod.lessons[idx], index: idx };
  }
  return null;
}

export function allLessons() {
  return MODULES.flatMap((m) => (m.lessons || []).map((l) => ({ module: m, lesson: l })));
}
