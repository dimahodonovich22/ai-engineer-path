// Движок квиза: 5 типов вопросов, мгновенная проверка, повтор ошибок в конце.
import { el, icon, esc, shuffle } from './ui.js';
import { mountCodeExercise } from './code-exercise.js';
import { store } from './store.js';
import { checkAchievements } from './achievements-engine.js';

const PRAISE = ['Отлично!', 'Верно!', 'Именно так!', 'Красиво!', 'Так держать!'];
const OOPS = ['Не совсем', 'Почти!', 'Пока мимо'];

export function runQuiz(container, questions, { onProgress, onFinish }) {
  const queue = questions.map((q) => ({ q, wasWrong: false }));
  const total = questions.length;
  let solved = 0;
  const firstTryWrong = new Set();

  next();

  function next() {
    onProgress(solved, total);
    if (!queue.length) {
      onFinish({ mistakes: firstTryWrong.size });
      return;
    }
    renderQuestion(queue[0]);
  }

  function renderQuestion(item) {
    const { q } = item;
    container.replaceChildren();

    if (q.type === 'code') {
      renderCodeTask(item);
      return;
    }

    const card = el('div', { class: 'card lesson-card' });

    if (item.wasWrong) {
      card.append(el('div', { class: 'eyebrow' }, 'Повторим ещё раз'));
    }

    let getResult; // () => { ok, correctText }
    if (q.type === 'mcq') getResult = renderShuffledOptions(card, q, q.options, q.correct);
    else if (q.type === 'tf') getResult = renderOptions(card, q, ['Правда', 'Ложь'], q.correct ? 0 : 1);
    else if (q.type === 'fill') getResult = renderFill(card, q);
    else if (q.type === 'order') getResult = renderOrder(card, q);

    const checkBtn = el('button', { class: 'btn btn-block', disabled: true, onclick: check }, 'Проверить');
    card.append(el('div', { class: 'lesson-actions' }, checkBtn));
    container.append(card);

    card.addEventListener('answer-ready', () => { checkBtn.disabled = false; });

    function check() {
      const { ok, correctText } = getResult();
      card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      checkBtn.closest('.lesson-actions').classList.add('hidden');
      if (!ok && !item.wasWrong) firstTryWrong.add(q);
      showFeedback(ok, correctText, q.explain, () => {
        queue.shift();
        if (ok) solved += 1;
        else queue.push({ q, wasWrong: true });
        next();
      });
    }
  }

  function showFeedback(ok, correctText, explain, onContinue) {
    const head = ok
      ? PRAISE[Math.floor(Math.random() * PRAISE.length)]
      : OOPS[Math.floor(Math.random() * OOPS.length)];
    const sheet = el('div', { class: `feedback ${ok ? 'good' : 'bad'}` },
      el('div', { class: 'feedback-inner' },
        el('div', { class: 'feedback-head' }, icon(ok ? 'circle-check' : 'circle-x'), head),
        !ok && correctText ? el('p', {}, el('strong', {}, 'Правильный ответ: '), correctText) : null,
        explain ? el('p', {}, explain) : null,
        el('button', {
          class: `btn btn-block ${ok ? 'btn-mint' : 'btn-coral'}`,
          onclick: () => { sheet.remove(); onContinue(); },
        }, ok ? 'Продолжить' : 'Понятно'),
      ),
    );
    document.body.append(sheet);
    sheet.querySelector('.btn').focus();
  }

  // ---- Код-задание: настоящий Python в браузере ----
  function renderCodeTask(item) {
    const { q } = item;
    mountCodeExercise(container, q, {
      eyebrow: q.bug ? 'Найди и исправь ошибку' : 'Твой код',
      bug: q.bug,
      savedCode: item.savedCode,
      onSave: (code) => { item.savedCode = code; },
      onSolved: ({ firstTry }) => {
        if (!firstTry) firstTryWrong.add(q);
        item.savedCode = undefined;
        store.bumpCodeSolved();
        if (q.bug) store.bumpBugFixed();
        checkAchievements();
        queue.shift();
        solved += 1;
        next();
      },
    });
  }
}

// ---- Выбор одного варианта (mcq / tf / fill) ----
function renderOptions(card, q, options, correctIdx, codeLine) {
  card.append(el('div', { class: 'quiz-q' }, q.q));
  if (codeLine) {
    card.append(el('pre', { class: 'codeblock' }, codeLine), el('div', { style: 'height:14px' }));
  }
  let selected = -1;
  const buttons = options.map((opt, i) =>
    el('button', { class: 'quiz-opt', onclick: () => select(i) },
      el('span', { class: 'key' }, String(i + 1)),
      el('span', { html: esc(opt) }),
    ));
  card.append(el('div', { class: 'quiz-options' }, buttons));

  function select(i) {
    selected = i;
    buttons.forEach((b, j) => b.classList.toggle('selected', j === i));
    card.dispatchEvent(new CustomEvent('answer-ready'));
  }

  return () => {
    buttons[correctIdx].classList.add('good');
    if (selected !== correctIdx) buttons[selected]?.classList.add('bad');
    return { ok: selected === correctIdx, correctText: options[correctIdx] };
  };
}

// ---- «Допиши код» ----
function renderFill(card, q) {
  return renderShuffledOptions(card, q, q.options, q.correct, q.code);
}

// Перемешивает варианты, чтобы правильный не стоял всегда на одном месте.
function renderShuffledOptions(card, q, options, correctIdx, codeLine) {
  const order = shuffle(options.map((_, i) => i));
  const shuffledOpts = order.map((i) => options[i]);
  return renderOptions(card, q, shuffledOpts, order.indexOf(correctIdx), codeLine);
}

// Задать ОДИН вопрос (mcq/tf/fill/order) и получить результат.
// Без повтора при ошибке — один заход. Используется в «Тренировке» и «Экзамене».
export function askQuestion(container, q, { eyebrow } = {}) {
  return new Promise((resolve) => {
    container.replaceChildren();
    const card = el('div', { class: 'card lesson-card' });
    if (eyebrow) card.append(el('div', { class: 'eyebrow' }, eyebrow));

    let getResult;
    if (q.type === 'mcq') getResult = renderShuffledOptions(card, q, q.options, q.correct);
    else if (q.type === 'tf') getResult = renderOptions(card, q, ['Правда', 'Ложь'], q.correct ? 0 : 1);
    else if (q.type === 'fill') getResult = renderFill(card, q);
    else if (q.type === 'order') getResult = renderOrder(card, q);

    const checkBtn = el('button', { class: 'btn btn-block', disabled: true, onclick: check }, 'Проверить');
    card.append(el('div', { class: 'lesson-actions' }, checkBtn));
    container.append(card);
    card.addEventListener('answer-ready', () => { checkBtn.disabled = false; });

    function check() {
      const { ok, correctText } = getResult();
      card.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      checkBtn.closest('.lesson-actions').classList.add('hidden');
      feedbackSheet(ok, correctText, q.explain, () => resolve(ok));
    }
  });
}

// Нижняя панель с результатом ответа (для askQuestion).
function feedbackSheet(ok, correctText, explain, onContinue) {
  const head = ok
    ? PRAISE[Math.floor(Math.random() * PRAISE.length)]
    : OOPS[Math.floor(Math.random() * OOPS.length)];
  const sheet = el('div', { class: `feedback ${ok ? 'good' : 'bad'}` },
    el('div', { class: 'feedback-inner' },
      el('div', { class: 'feedback-head' }, icon(ok ? 'circle-check' : 'circle-x'), head),
      !ok && correctText ? el('p', {}, el('strong', {}, 'Правильный ответ: '), correctText) : null,
      explain ? el('p', {}, explain) : null,
      el('button', {
        class: `btn btn-block ${ok ? 'btn-mint' : 'btn-coral'}`,
        onclick: () => { sheet.remove(); onContinue(); },
      }, 'Дальше'),
    ),
  );
  document.body.append(sheet);
  sheet.querySelector('.btn').focus();
}

// ---- «Расставь по порядку» ----
function renderOrder(card, q) {
  card.append(el('div', { class: 'quiz-q' }, q.q));
  const answer = [];
  const answerBox = el('div', { class: 'order-answer', 'aria-label': 'Твой порядок' });
  const pool = el('div', { class: 'order-pool' });
  const shuffled = ensureShuffled(q.items);

  shuffled.forEach((text) => {
    const poolChip = el('button', { class: 'order-chip', onclick: pick }, text);
    pool.append(poolChip);

    function pick() {
      poolChip.classList.add('ghosted');
      const placed = el('button', { class: 'order-chip', onclick: unpick }, text);
      answerBox.append(placed);
      answer.push(text);
      ready();

      function unpick() {
        placed.remove();
        answer.splice(answer.indexOf(text), 1);
        poolChip.classList.remove('ghosted');
        ready();
      }
    }
  });

  card.append(answerBox, pool);

  function ready() {
    if (answer.length === q.items.length) card.dispatchEvent(new CustomEvent('answer-ready'));
  }

  return () => {
    const ok = answer.every((t, i) => t === q.items[i]);
    answerBox.querySelectorAll('.order-chip').forEach((chip, i) => {
      chip.classList.add(answer[i] === q.items[i] ? 'good' : 'bad');
    });
    return { ok, correctText: q.items.join(' → ') };
  };
}

// Перемешиваем так, чтобы порядок гарантированно отличался от правильного.
function ensureShuffled(items) {
  if (items.length < 2) return [...items];
  for (let tries = 0; tries < 10; tries++) {
    const s = shuffle(items);
    if (s.some((t, i) => t !== items[i])) return s;
  }
  return [...items].reverse();
}
