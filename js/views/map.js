// Главный экран: рекомендация «что дальше» + тропа уроков.
import { el, icon, plural } from '../ui.js';
import { store } from '../store.js';
import { MODULES } from '../../data/curriculum.js';
import { navigate } from '../router.js';

export function renderMap(app) {
  app.replaceChildren();

  const next = nextLesson();
  app.append(renderHero(next));

  let prevDone = true; // первый урок курса всегда открыт
  for (const mod of MODULES) {
    if (!mod.lessons) {
      continue; // roadmap-модули рисуем отдельным блоком ниже
    }
    const doneCount = mod.lessons.filter((l) => store.isDone(l.id)).length;
    app.append(
      el('div', { class: 'module-head' },
        el('div', { class: `m-icon ${colorClass(mod.color)}` }, icon(mod.icon)),
        el('div', {},
          el('h3', {}, mod.title),
          el('small', {}, mod.subtitle),
        ),
        el('span', { class: 'chip m-count' }, `${doneCount} / ${mod.lessons.length}`),
      ),
    );

    const path = el('div', { class: 'path' });
    mod.lessons.forEach((lesson, i) => {
      const done = store.isDone(lesson.id);
      const unlocked = prevDone;
      const isCurrent = unlocked && !done;

      if (i > 0 || mod.id !== MODULES[0].id) {
        path.append(el('div', { class: `path-seg ${done || isCurrent ? 'lit' : ''}` }));
      }

      const node = el('button', {
        class: `node ${done ? 'done' : isCurrent ? 'current' : 'locked'}`,
        'aria-label': `Урок: ${lesson.title}${done ? ' (пройден)' : unlocked ? '' : ' (закрыт)'}`,
        onclick: () => {
          if (unlocked || done) navigate(`lesson/${lesson.id}`);
        },
      }, icon(done ? 'check' : unlocked ? 'star' : 'lock'));

      const wrap = el('div', { class: 'node-wrap' }, node);
      if (isCurrent) wrap.append(el('span', { class: 'start-bubble' }, 'НАЧАТЬ'));

      path.append(
        el('div', { class: `node-row ${i % 2 ? 'even' : 'odd'}` },
          wrap,
          el('span', { class: 'node-label' }, lesson.title,
            el('span', { class: 'chip', style: 'margin-left:8px' }, `${lesson.minutes} мин`)),
        ),
      );
      prevDone = done;
    });
    app.append(path);
  }

  // Roadmap: будущие модули
  const future = MODULES.filter((m) => !m.lessons);
  if (future.length) {
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
          el('div', {},
            el('b', {}, mod.title),
            el('small', {}, mod.subtitle),
          ),
          el('span', { class: 'lock' }, icon('lock')),
        ),
      );
    }
  }
}

function renderHero(next) {
  if (!next) {
    return el('div', { class: 'card next-hero hero-done' },
      el('div', { class: 'eyebrow' }, 'Все уроки пройдены'),
      el('h2', {}, 'Ты прошёл всё, что есть!'),
      el('p', {}, 'Серьёзный результат. Напиши своему наставнику Claude — пора открывать следующие модули и делать первый проект.'),
    );
  }
  const { module: mod, lesson, reason } = next;
  return el('div', { class: 'card next-hero' },
    el('div', { class: 'eyebrow' }, 'Что дальше'),
    el('h2', {}, lesson.title),
    el('p', {}, reason),
    el('button', { class: 'btn', onclick: () => navigate(`lesson/${lesson.id}`) },
      icon('play'), `Начать · ${lesson.minutes} мин`),
  );
}

// Первый непройденный урок + человеческое объяснение, почему он.
function nextLesson() {
  let count = 0;
  for (const mod of MODULES) {
    if (!mod.lessons) continue;
    for (const lesson of mod.lessons) {
      if (!store.isDone(lesson.id)) {
        const left = mod.lessons.filter((l) => !store.isDone(l.id)).length;
        const reason = count === 0
          ? 'Твой самый первый урок. 7 минут — и ты поймёшь, куда идёшь и зачем.'
          : left === 1
            ? `Последний урок модуля «${mod.title}» — закрой его и получи достижение!`
            : `Продолжаем модуль «${mod.title}»: осталось ${left} ${plural(left, 'урок', 'урока', 'уроков')}.`;
        return { module: mod, lesson, reason };
      }
      count += 1;
    }
  }
  return null;
}

function colorClass(color) {
  return `mc-${color}`;
}
