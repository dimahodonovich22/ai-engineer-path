// Плеер урока: карточки -> квиз -> практика -> экран награды.
import { el, icon, confetti, toast } from '../ui.js';
import { store } from '../store.js';
import { findLesson } from '../../data/curriculum.js';
import { navigate } from '../router.js';
import { runQuiz, askQuestion } from '../quiz.js';
import { checkAchievements } from '../achievements-engine.js';
import { preloadPython } from '../pycode.js';
import { mountCodeExercise } from '../code-exercise.js';
import { pickRecall } from '../practice-picker.js';

export function renderLesson(app, lessonId) {
  const found = findLesson(lessonId);
  if (!found) { navigate(''); return; }
  const { module: mod, lesson } = found;

  const drills = lesson.drills || [];

  // Повторение внутри урока: разминка в начале + 1 «старый» вопрос в квизе.
  // Дебаг-уроки не трогаем (там свой формат).
  const isDebug = lesson.kind === 'debug';
  const warmups = isDebug ? [] : pickRecall(lesson.id, 2, { prefer: 'recent' });
  const warmupKeys = new Set(warmups.map((w) => w.key));
  const interleaved = isDebug ? [] : pickRecall(lesson.id, 1, { prefer: 'due', exclude: warmupKeys });
  const reviewByQ = new Map(); // q -> reviewKey (подмешанные вопросы для оценки в Leitner)
  interleaved.forEach((r) => reviewByQ.set(r.q, r.key));
  const quizList = [...lesson.quiz, ...interleaved.map((r) => r.q)];

  // Если в уроке есть код — начинаем качать Python, пока читаются карточки.
  if (drills.length || lesson.quiz.some((q) => q.type === 'code')) preloadPython();

  app.replaceChildren();

  // Поток урока: объяснение -> сразу практика по нему -> следующее объяснение…
  // Упражнение с afterCard: N встаёт сразу после карточки N, остальные — после всех карточек.
  const flow = [];
  lesson.cards.forEach((card, i) => {
    flow.push({ kind: 'card', card, cardIndex: i });
    drills.forEach((drill, d) => {
      if (drill.afterCard === i) flow.push({ kind: 'drill', drill, drillIndex: d });
    });
  });
  drills.forEach((drill, d) => {
    if (!Number.isInteger(drill.afterCard) || drill.afterCard >= lesson.cards.length) {
      flow.push({ kind: 'drill', drill, drillIndex: d });
    }
  });
  const drillNumber = new Map(); // порядковый номер упражнения в потоке
  flow.filter((it) => it.kind === 'drill').forEach((it, n) => drillNumber.set(it.drill, n + 1));
  const drillCode = {};          // набранный код по индексу упражнения — не теряется при «Назад»
  const solvedDrills = new Set(); // упражнения, за которые XP уже начислен

  const totalSteps = warmups.length + flow.length + quizList.length;

  const barFill = el('i', { style: 'width:0%' });
  const top = el('div', { class: 'lesson-top' },
    el('button', { class: 'icon-btn', 'aria-label': 'Выйти из урока', onclick: exit }, icon('x')),
    el('div', { class: 'bar' }, barFill),
    el('span', { class: 'chip' }, icon('zap'), `+${lesson.xp}`),
  );
  const stage = el('div', {});
  app.append(top, stage);

  let step = 0;
  startWarmup();

  function progress(add = 0) {
    barFill.style.width = Math.min(100, Math.round(((step + add) / totalSteps) * 100)) + '%';
  }

  function exit() {
    document.querySelectorAll('.feedback').forEach((f) => f.remove());
    navigate('');
  }

  // ---- Фаза 0: разминка (вспомнить недавнее перед новым) ----
  function startWarmup() {
    if (!warmups.length) { showItem(0); return; }
    runWarmup(0);
  }

  async function runWarmup(i) {
    if (i >= warmups.length) { showItem(0); return; }
    step = i;
    progress();
    const { key, q, lessonTitle } = warmups[i];
    const ok = await askQuestion(stage, q, {
      eyebrow: i === 0 ? 'Разминка · вспомни прошлое' : `Разминка · ${lessonTitle}`,
    });
    store.gradeReview(key, ok);
    if (ok) store.addXp(2);
    checkAchievements();
    runWarmup(i + 1);
  }

  // ---- Фазы 1–2: поток «объяснение -> практика» ----
  function showItem(i) {
    if (i >= flow.length) { startQuiz(); return; }
    step = warmups.length + i;
    progress();
    const item = flow[i];
    item.kind === 'card' ? showCard(i, item) : showDrill(i, item);
  }

  function showCard(i, { card, cardIndex }) {
    const isLast = i + 1 >= flow.length;
    const nextIsDrill = !isLast && flow[i + 1].kind === 'drill';
    // «Назад» ведёт к предыдущей карточке (упражнения повторно не проходим).
    let prevCard = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (flow[j].kind === 'card') { prevCard = j; break; }
    }
    stage.replaceChildren(
      el('div', { class: 'card lesson-card' },
        el('div', { class: 'eyebrow' }, `${mod.title} · карточка ${cardIndex + 1} из ${lesson.cards.length}`),
        el('h2', {}, card.title),
        el('div', { html: card.html }),
        card.code ? el('pre', { class: 'codeblock' }, card.code) : null,
        el('div', { class: 'lesson-actions' },
          prevCard >= 0 ? el('button', { class: 'btn btn-ghost', onclick: () => showItem(prevCard) }, icon('chevron-left'), 'Назад') : null,
          el('button', { class: 'btn', onclick: () => showItem(i + 1) },
            isLast ? 'К квизу!' : nextIsDrill ? 'Попробуй сам!' : 'Дальше', icon('arrow-right')),
        ),
      ),
    );
  }

  function showDrill(i, { drill, drillIndex }) {
    stage.replaceChildren();
    step = warmups.length + i;
    progress();
    const advance = () => showItem(i + 1);
    const alreadySolved = solvedDrills.has(drillIndex);
    mountCodeExercise(stage, drill, {
      eyebrow: `Практика · упражнение ${drillNumber.get(drill)} из ${drills.length}`,
      xpLabel: alreadySolved ? null : '+5 XP',
      savedCode: drillCode[drillIndex],
      onSave: (code) => { drillCode[drillIndex] = code; },
      onSolved: () => {
        if (!solvedDrills.has(drillIndex)) {
          solvedDrills.add(drillIndex);
          store.addXp(5);
          store.bumpCodeSolved();
          checkAchievements();
        }
        advance();
      },
      onSkip: advance,
      onBack: i > 0 ? () => showItem(i - 1) : null,
    });
  }

  // ---- Фаза 3: квиз (со «старым» вопросом-подмешкой) ----
  function startQuiz() {
    runQuiz(stage, quizList, {
      onProgress(solved) {
        step = warmups.length + flow.length + solved;
        progress();
      },
      isReview: (q) => reviewByQ.has(q),
      onFirstAnswer: (q, correct) => {
        const key = reviewByQ.get(q);
        if (key) store.gradeReview(key, correct);
      },
      onFinish({ mistakes }) {
        lesson.practice ? showPractice(mistakes) : finish(mistakes);
      },
    });
  }

  // ---- Фаза 4: задание в реальном мире (если есть) ----
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

  // ---- Фаза 5: награда ----
  function finish(mistakes) {
    const perfect = mistakes === 0;
    const before = store.streak();
    const { xpGained, firstTime, freezeUsed } = store.completeLesson(lesson, perfect);
    const after = store.streak();
    checkAchievements();
    confetti(perfect ? 110 : 60);
    if (freezeUsed) toast('shield', 'Заморозка спасла твой стрик!');

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
