// «Экзамен модуля» — чекпоинт из вопросов всего модуля перед открытием следующего.
import { el, icon, confetti } from '../ui.js';
import { store } from '../store.js';
import { moduleById, buildExam } from '../../data/curriculum.js';
import { navigate } from '../router.js';
import { askQuestion } from '../quiz.js';
import { checkAchievements } from '../achievements-engine.js';

const PASS = 0.75;   // порог сдачи
const COUNT = 8;     // вопросов в экзамене
const XP_PASS = 50;

export function renderExam(app, moduleId) {
  const mod = moduleById(moduleId);
  if (!mod || !mod.exam) { navigate(''); return; }
  app.replaceChildren();

  // Стартовый экран экзамена
  const passed = store.examPassed(moduleId);
  app.append(
    el('div', { class: 'card exam-intro' },
      el('div', { class: 'exam-badge' }, icon('graduation-cap')),
      el('div', { class: 'eyebrow' }, `Экзамен · ${mod.title}`),
      el('h2', {}, passed ? 'Повторить экзамен' : 'Проверь себя'),
      el('p', {}, `${COUNT} вопросов из всего модуля. Нужно ответить верно минимум на ${Math.ceil(COUNT * PASS)} из ${COUNT}.`),
      passed
        ? el('p', { class: 'exam-passed-note' }, icon('circle-check'), 'Модуль уже сдан — можно перепройти для тренировки.')
        : el('p', { style: 'font-size:13.5px;color:var(--muted)' }, 'Сдашь — откроется следующий модуль и ты получишь награду.'),
      el('button', { class: 'btn btn-block', onclick: start }, icon('play'), 'Начать экзамен'),
    ),
  );

  function start() {
    const questions = buildExam(moduleId, COUNT);
    if (!questions.length) { navigate(''); return; }
    runExam(app, mod, questions);
  }
}

function runExam(app, mod, questions) {
  const total = questions.length;
  let done = 0;
  let correct = 0;

  app.replaceChildren();
  const barFill = el('i', { style: 'width:0%' });
  const counter = el('span', { class: 'chip' }, icon('graduation-cap'), `0 / ${total}`);
  const top = el('div', { class: 'lesson-top' },
    el('button', { class: 'icon-btn', 'aria-label': 'Выйти', onclick: () => navigate('') }, icon('x')),
    el('div', { class: 'bar' }, barFill),
    counter,
  );
  const stage = el('div', {});
  app.append(top, stage);

  askNext();

  async function askNext() {
    barFill.style.width = Math.round((done / total) * 100) + '%';
    counter.replaceChildren(icon('graduation-cap'), el('span', {}, `${done} / ${total}`));
    if (done >= total) { finish(); return; }
    const ok = await askQuestion(stage, questions[done], { eyebrow: `Экзамен · вопрос ${done + 1} из ${total}` });
    if (ok) correct += 1;
    done += 1;
    askNext();
  }

  function finish() {
    const ratio = correct / total;
    const passed = ratio >= PASS;
    const firstPass = passed && !store.examPassed(mod.id);
    store.recordExam(mod.id, ratio, passed);
    if (firstPass) store.addXp(XP_PASS);
    checkAchievements();
    if (passed) confetti(firstPass ? 120 : 70);

    barFill.style.width = '100%';
    stage.replaceChildren(
      el('div', { class: 'card finish' },
        el('div', { class: `finish-icon ${passed ? '' : 'fail'}` }, icon(passed ? 'graduation-cap' : 'rotate-ccw')),
        el('h2', {}, passed ? 'Экзамен сдан!' : 'Почти получилось'),
        el('p', { class: 'sub' }, `Верно ${correct} из ${total}${passed ? '' : ` — нужно минимум ${Math.ceil(total * PASS)}`}.`),
        passed
          ? el('div', { class: 'reward-row' },
              firstPass ? el('span', { class: 'reward xp' }, icon('zap'), `+${XP_PASS} XP`) : null,
              el('span', { class: 'reward perfect' }, icon('circle-check'), 'модуль сдан'))
          : el('p', { style: 'font-size:14px;color:var(--muted);margin-bottom:20px' },
              'Ничего страшного — вернись к урокам, где было сложно, потренируйся в «Тренировке» и попробуй снова. Вопросы будут другими.'),
        el('div', { class: 'lesson-actions' },
          el('button', { class: 'btn btn-ghost', onclick: () => renderExam(app, mod.id) }, icon('rotate-ccw'), passed ? 'Ещё раз' : 'Попробовать снова'),
          el('button', { class: 'btn', onclick: () => navigate('') }, 'На карту', icon('arrow-right')),
        ),
      ),
    );
  }
}
