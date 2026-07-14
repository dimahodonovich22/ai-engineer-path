// Главный экран: «что дальше» + Тренировка + тропа уроков, экзаменов и проектов.
import { el, icon, plural } from '../ui.js';
import { store } from '../store.js';
import { MODULES } from '../../data/curriculum.js';
import { PROJECTS } from '../../data/projects.js';
import { navigate } from '../router.js';

const contentModules = () => MODULES.filter((m) => m.lessons);

export function renderMap(app) {
  app.replaceChildren();

  app.append(renderHero(nextStep()));
  app.append(renderReviewCard());

  let prevMod = null;
  for (const mod of contentModules()) {
    const reachable = !prevMod || moduleCleared(prevMod) || moduleStarted(mod);
    const doneCount = mod.lessons.filter((l) => store.isDone(l.id)).length;

    if (!reachable && prevMod?.exam && !store.examPassed(prevMod.id)) {
      app.append(
        el('div', { class: 'gate-note' }, icon('lock'),
          el('span', {}, `Сдай экзамен модуля «${prevMod.title}», чтобы открыть`)),
      );
    }

    app.append(
      el('div', { class: 'module-head' },
        el('div', { class: `m-icon ${colorClass(mod.color)}` }, icon(mod.icon)),
        el('div', {}, el('h3', {}, mod.title), el('small', {}, mod.subtitle)),
        el('span', { class: 'chip m-count' }, `${doneCount} / ${mod.lessons.length}`),
      ),
    );

    const path = el('div', { class: 'path' });
    let prevDone = reachable;
    const isFirstModule = mod === contentModules()[0];

    mod.lessons.forEach((lesson, i) => {
      const done = store.isDone(lesson.id);
      const unlocked = prevDone;
      const isCurrent = unlocked && !done;
      const isDebug = lesson.kind === 'debug';

      if (i > 0 || !isFirstModule) {
        path.append(el('div', { class: `path-seg ${done || isCurrent ? 'lit' : ''}` }));
      }

      const node = el('button', {
        class: `node ${isDebug ? 'debug' : ''} ${done ? 'done' : isCurrent ? 'current' : 'locked'}`,
        'aria-label': `${isDebug ? 'Мастерская багов' : 'Урок'}: ${lesson.title}${done ? ' (пройден)' : unlocked ? '' : ' (закрыт)'}`,
        onclick: () => { if (unlocked || done) navigate(`lesson/${lesson.id}`); },
      }, icon(done ? 'check' : !unlocked ? 'lock' : isDebug ? 'wrench' : 'star'));

      const wrap = el('div', { class: 'node-wrap' }, node);
      if (isCurrent) wrap.append(el('span', { class: 'start-bubble' }, 'НАЧАТЬ'));

      path.append(
        el('div', { class: `node-row ${i % 2 ? 'even' : 'odd'}` }, wrap,
          el('span', { class: 'node-label' }, lesson.title,
            el('span', { class: 'chip', style: 'margin-left:8px' }, `${lesson.minutes} мин`)),
        ),
      );
      prevDone = done;
    });

    // Узел экзамена
    if (mod.exam) {
      const lessonsDone = allLessonsDone(mod);
      const passed = store.examPassed(mod.id);
      path.append(el('div', { class: `path-seg ${lessonsDone ? 'lit' : ''}` }));
      path.append(specialNode({
        cls: 'exam', unlocked: lessonsDone, done: passed, current: lessonsDone && !passed,
        iconName: 'graduation-cap', label: 'Экзамен модуля',
        sub: passed ? 'сдан' : lessonsDone ? 'проверь себя' : 'пройди все уроки',
        route: `exam/${mod.id}`, side: mod.lessons.length % 2 ? 'even' : 'odd',
      }));
    }

    // Узел проекта
    if (mod.project && PROJECTS[mod.id]) {
      const unlocked = mod.exam ? store.examPassed(mod.id) : allLessonsDone(mod);
      const done = store.projectDone(mod.id);
      path.append(el('div', { class: `path-seg ${unlocked ? 'lit' : ''}` }));
      path.append(specialNode({
        cls: 'project', unlocked, done, current: unlocked && !done,
        iconName: PROJECTS[mod.id].icon, label: 'Проект модуля',
        sub: done ? 'готов' : unlocked ? 'собери сам' : 'сдай экзамен',
        route: `project/${mod.id}`, side: (mod.lessons.length + 1) % 2 ? 'even' : 'odd',
      }));
    }

    app.append(path);
    prevMod = mod;
  }

  renderRoadmap(app);
}

function specialNode({ cls, unlocked, done, current, iconName, label, sub, route, side }) {
  const node = el('button', {
    class: `node ${cls} ${done ? 'done' : current ? 'current' : 'locked'}`,
    'aria-label': `${label}: ${sub}`,
    onclick: () => { if (unlocked) navigate(route); },
  }, icon(done ? 'check' : unlocked ? iconName : 'lock'));
  const wrap = el('div', { class: 'node-wrap' }, node);
  if (current) wrap.append(el('span', { class: 'start-bubble' }, cls === 'exam' ? 'ЭКЗАМЕН' : 'ПРОЕКТ'));
  return el('div', { class: `node-row ${side}` }, wrap,
    el('span', { class: 'node-label' }, label,
      el('span', { class: 'chip', style: 'margin-left:8px' }, sub)));
}

function renderReviewCard() {
  const total = store.reviewTotalCount();
  if (!total) return el('div', { class: 'hidden' });
  const due = store.reviewDueCount();
  return el('button', {
    class: `review-card ${due ? 'due' : ''}`,
    onclick: () => navigate('review'),
  },
    el('div', { class: 'review-ic' }, icon('repeat')),
    el('div', { class: 'review-body' },
      el('b', {}, 'Тренировка'),
      el('small', {}, due
        ? `${due} ${plural(due, 'вопрос ждёт', 'вопроса ждут', 'вопросов ждут')} повторения`
        : 'на сегодня всё повторено — загляни завтра'),
    ),
    due ? el('span', { class: 'review-count' }, String(due)) : icon('chevron-right'),
  );
}

function renderRoadmap(app) {
  const future = MODULES.filter((m) => !m.lessons);
  if (!future.length) return;
  app.append(
    el('div', { class: 'roadmap-note' },
      el('div', { class: 'eyebrow' }, 'Дальше на маршруте'),
      el('p', { style: 'font-size:13.5px;color:var(--muted);margin-top:4px' },
        'Эти модули откроются, когда ты дойдёшь до них — контент появится по мере твоего прогресса.'),
    ),
  );
  for (const mod of future) {
    app.append(
      el('div', { class: 'card module-future' },
        el('div', { class: 'm-icon' }, icon(mod.icon)),
        el('div', {}, el('b', {}, mod.title), el('small', {}, mod.subtitle)),
        el('span', { class: 'lock' }, icon('lock')),
      ),
    );
  }
}

function renderHero(step) {
  if (!step) {
    return el('div', { class: 'card next-hero hero-done' },
      el('div', { class: 'eyebrow' }, 'Всё пройдено'),
      el('h2', {}, 'Ты прошёл всё, что есть!'),
      el('p', {}, 'Серьёзный результат. Напиши наставнику Claude — пора открывать следующие модули.'),
    );
  }
  return el('div', { class: 'card next-hero' },
    el('div', { class: 'eyebrow' }, 'Что дальше'),
    el('h2', {}, step.title),
    el('p', {}, step.reason),
    el('button', { class: 'btn', onclick: () => navigate(step.route) }, icon('play'), step.cta),
  );
}

// Следующий шаг: урок -> экзамен -> проект по каждому модулю подряд.
function nextStep() {
  let firstEver = true;
  for (const mod of contentModules()) {
    for (const lesson of mod.lessons) {
      if (!store.isDone(lesson.id)) {
        const left = mod.lessons.filter((l) => !store.isDone(l.id)).length;
        const reason = firstEver
          ? 'Твой самый первый урок. 7 минут — и ты поймёшь, куда идёшь и зачем.'
          : lesson.kind === 'debug'
            ? 'Мастерская багов: научись находить и чинить ошибки — навык №1 инженера.'
            : left === 1
              ? `Последний урок модуля «${mod.title}» — закрой его и переходи к экзамену!`
              : `Продолжаем модуль «${mod.title}»: осталось ${left} ${plural(left, 'урок', 'урока', 'уроков')}.`;
        return { title: lesson.title, reason, route: `lesson/${lesson.id}`, cta: `Начать · ${lesson.minutes} мин` };
      }
      firstEver = false;
    }
    if (mod.exam && !store.examPassed(mod.id)) {
      return {
        title: `Экзамен: ${mod.title}`,
        reason: 'Все уроки модуля пройдены. Сдай короткий экзамен — и откроется следующий модуль.',
        route: `exam/${mod.id}`, cta: 'К экзамену',
      };
    }
    if (mod.project && PROJECTS[mod.id] && !store.projectDone(mod.id)) {
      return {
        title: PROJECTS[mod.id].title,
        reason: 'Собери настоящий проект своими руками — первый экспонат твоего портфолио.',
        route: `project/${mod.id}`, cta: 'К проекту',
      };
    }
  }
  return null;
}

function allLessonsDone(mod) {
  return mod.lessons.every((l) => store.isDone(l.id));
}
function moduleStarted(mod) {
  return mod.lessons.some((l) => store.isDone(l.id));
}
function moduleCleared(mod) {
  return allLessonsDone(mod) && (mod.exam ? store.examPassed(mod.id) : true);
}
function colorClass(color) {
  return `mc-${color}`;
}
