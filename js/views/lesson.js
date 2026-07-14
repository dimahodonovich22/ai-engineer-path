// Плеер урока: карточки -> квиз -> практика -> экран награды.
import { el, icon, confetti } from '../ui.js';
import { store } from '../store.js';
import { findLesson } from '../../data/curriculum.js';
import { navigate } from '../router.js';
import { runQuiz } from '../quiz.js';
import { checkAchievements } from '../achievements-engine.js';
import { preloadPython } from '../pycode.js';

export function renderLesson(app, lessonId) {
  const found = findLesson(lessonId);
  if (!found) { navigate(''); return; }
  const { module: mod, lesson } = found;

  // Если в уроке есть код-задание — начинаем качать Python, пока читаются карточки.
  if (lesson.quiz.some((q) => q.type === 'code')) preloadPython();

  app.replaceChildren();
  const totalSteps = lesson.cards.length + lesson.quiz.length;

  const barFill = el('i', { style: 'width:0%' });
  const top = el('div', { class: 'lesson-top' },
    el('button', { class: 'icon-btn', 'aria-label': 'Выйти из урока', onclick: exit }, icon('x')),
    el('div', { class: 'bar' }, barFill),
    el('span', { class: 'chip' }, icon('zap'), `+${lesson.xp}`),
  );
  const stage = el('div', {});
  app.append(top, stage);

  let step = 0;
  showCard(0);

  function progress(add = 0) {
    barFill.style.width = Math.min(100, Math.round(((step + add) / totalSteps) * 100)) + '%';
  }

  function exit() {
    document.querySelectorAll('.feedback').forEach((f) => f.remove());
    navigate('');
  }

  // ---- Фаза 1: карточки ----
  function showCard(i) {
    step = i;
    progress();
    const card = lesson.cards[i];
    stage.replaceChildren(
      el('div', { class: 'card lesson-card' },
        el('div', { class: 'eyebrow' }, `${mod.title} · карточка ${i + 1} из ${lesson.cards.length}`),
        el('h2', {}, card.title),
        el('div', { html: card.html }),
        card.code ? el('pre', { class: 'codeblock' }, card.code) : null,
        el('div', { class: 'lesson-actions' },
          i > 0 ? el('button', { class: 'btn btn-ghost', onclick: () => showCard(i - 1) }, icon('chevron-left'), 'Назад') : null,
          el('button', { class: 'btn', onclick: () => (i + 1 < lesson.cards.length ? showCard(i + 1) : startQuiz()) },
            i + 1 < lesson.cards.length ? 'Дальше' : 'К квизу!', icon('arrow-right')),
        ),
      ),
    );
  }

  // ---- Фаза 2: квиз ----
  function startQuiz() {
    runQuiz(stage, lesson.quiz, {
      onProgress(solved) {
        step = lesson.cards.length + solved;
        progress();
      },
      onFinish({ mistakes }) {
        lesson.practice ? showPractice(mistakes) : finish(mistakes);
      },
    });
  }

  // ---- Фаза 3: практика (если есть) ----
  function showPractice(mistakes) {
    progress(0.9);
    stage.replaceChildren(
      el('div', { class: 'card lesson-card' },
        el('div', { class: 'practice-badge' }, icon('wrench'), 'Практика'),
        el('h2', {}, 'Задание в реальном мире'),
        el('div', { html: lesson.practice.html }),
        lesson.practice.url
          ? el('p', {}, el('a', { href: lesson.practice.url, target: '_blank', rel: 'noopener' },
              (lesson.practice.urlLabel || 'Открыть') + ' ↗'))
          : null,
        el('div', { class: 'lesson-actions' },
          el('button', { class: 'btn btn-ghost', onclick: () => finish(mistakes) }, 'Сделаю позже'),
          el('button', {
            class: 'btn btn-mint',
            onclick: () => { store.markPractice(lesson.id); finish(mistakes); },
          }, icon('check'), 'Сделал!'),
        ),
      ),
    );
  }

  // ---- Фаза 4: награда ----
  function finish(mistakes) {
    const perfect = mistakes === 0;
    const before = store.streak();
    const { xpGained, firstTime } = store.completeLesson(lesson, perfect);
    const after = store.streak();
    checkAchievements();
    confetti(perfect ? 110 : 60);

    barFill.style.width = '100%';
    stage.replaceChildren(
      el('div', { class: 'card finish' },
        el('div', { class: 'finish-icon' }, icon(perfect ? 'trophy' : 'circle-check')),
        el('h2', {}, perfect ? 'Идеально!' : 'Урок пройден!'),
        el('p', { class: 'sub' }, perfect
          ? 'Ни одной ошибки с первой попытки. Вот это уровень!'
          : firstTime ? 'Ошибки — часть обучения. Главное — ты дошёл до конца.' : 'Повторение — мать учения. XP за повтор тоже идёт в копилку.'),
        el('div', { class: 'reward-row' },
          el('span', { class: 'reward xp' }, icon('zap'), `+${xpGained} XP`),
          perfect && firstTime ? el('span', { class: 'reward perfect' }, icon('star'), 'бонус за точность') : null,
          after > before || (after === 1 && before === 0)
            ? el('span', { class: 'reward streak' }, icon('flame'), `стрик: ${after}`)
            : null,
        ),
        el('button', { class: 'btn btn-block', onclick: () => navigate('') }, 'На карту', icon('arrow-right')),
      ),
    );
  }
}
