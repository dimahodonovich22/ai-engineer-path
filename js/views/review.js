// «Тренировка» — интервальное повторение (spaced repetition).
// Показывает вопросы из пройденных уроков, срок которых подошёл.
import { el, icon, confetti, plural } from '../ui.js';
import { store } from '../store.js';
import { resolveReviewKey } from '../../data/curriculum.js';
import { navigate } from '../router.js';
import { askQuestion } from '../quiz.js';
import { checkAchievements } from '../achievements-engine.js';

const SESSION_MAX = 10; // не перегружаем — максимум вопросов за сессию

export function renderReview(app) {
  app.replaceChildren();

  const keys = store.reviewDueKeys()
    .map((k) => resolveReviewKey(k))
    .filter(Boolean)
    .slice(0, SESSION_MAX);

  if (!keys.length) {
    app.append(caughtUp());
    return;
  }

  const total = keys.length;
  let done = 0;
  let correct = 0;

  const barFill = el('i', { style: 'width:0%' });
  const top = el('div', { class: 'lesson-top' },
    el('button', { class: 'icon-btn', 'aria-label': 'Выйти', onclick: () => navigate('') }, icon('x')),
    el('div', { class: 'bar mint' }, barFill),
    el('span', { class: 'chip' }, icon('repeat'), 'Повторение'),
  );
  const stage = el('div', {});
  app.append(top, stage);

  askNext();

  async function askNext() {
    barFill.style.width = Math.round((done / total) * 100) + '%';
    if (done >= total) { finish(); return; }
    const { key, q, lessonTitle } = keys[done];
    const ok = await askQuestion(stage, q, { eyebrow: `Повторение · ${lessonTitle}` });
    store.gradeReview(key, ok);
    if (ok) { correct += 1; store.addXp(3); }
    done += 1;
    checkAchievements();
    askNext();
  }

  function finish() {
    barFill.style.width = '100%';
    confetti(70);
    stage.replaceChildren(
      el('div', { class: 'card finish' },
        el('div', { class: 'finish-icon' }, icon('repeat')),
        el('h2', {}, 'Тренировка окончена!'),
        el('p', { class: 'sub' }, `Ты вспомнил ${correct} из ${total} — а это и есть то, что закрепляет знания надолго.`),
        el('div', { class: 'reward-row' },
          el('span', { class: 'reward xp' }, icon('zap'), `+${correct * 3} XP`),
        ),
        el('p', { style: 'font-size:13.5px;color:var(--muted);margin-bottom:20px' },
          'Вопросы, которые ты вспомнил, вернутся позже — чем увереннее отвечаешь, тем реже. Так работает интервальное повторение.'),
        el('button', { class: 'btn btn-block', onclick: () => navigate('') }, 'На карту', icon('arrow-right')),
      ),
    );
  }
}

function caughtUp() {
  const total = store.reviewTotalCount();
  return el('div', {},
    el('div', { style: 'margin-bottom:18px' },
      el('div', { class: 'eyebrow' }, 'Тренировка'),
      el('h2', { class: 'display', style: 'font-size:22px;margin:4px 0' }, 'Всё повторено!'),
    ),
    el('div', { class: 'card', style: 'text-align:center;padding:30px 18px' },
      el('div', {
        style: 'display:grid;place-items:center;width:72px;height:72px;border-radius:50%;background:var(--mint-soft);margin:0 auto 16px',
      }, icon('circle-check', 'caught-up-icon')),
      el('p', { style: 'font-weight:700;margin-bottom:8px' }, 'На сегодня повторять нечего'),
      el('p', { style: 'font-size:14px;color:var(--muted)' }, total
        ? 'Возвращайся завтра — подойдёт срок следующих вопросов. Пока лучше пройди новый урок.'
        : 'Пройди первый урок — и его вопросы начнут появляться здесь для повторения.'),
      el('button', { class: 'btn', style: 'margin-top:18px', onclick: () => navigate('') }, 'К урокам', icon('arrow-right')),
    ),
  );
}
