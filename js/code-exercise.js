// Универсальное код-упражнение: редактор + консоль + запуск + проверка stdout.
// Используется в фазе «Практика» урока и в код-вопросах квиза.
import { el, icon } from './ui.js';
import { createEditor } from './editor.js';
import { preloadPython, runPython, outputMatches } from './pycode.js';

const PRAISE = ['Отлично!', 'Работает!', 'Именно так!', 'Чистый код!', 'Так держать!'];

// Убирает комментарии и строковые литералы — чтобы искать пропуск ___ только в реальном коде.
function stripCommentsAndStrings(code) {
  return code.replace(
    /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#[^\n]*)/g,
    ' ',
  );
}

// task: { q, starter, expect, solution, hints|hint, explain, tests? }
// opts: { eyebrow, xpLabel, savedCode, onSave(code), onSolved({ firstTry }), onSkip, onBack }
export function mountCodeExercise(container, task, opts = {}) {
  const { eyebrow = 'Твой код', xpLabel = null, onSolved, onSkip, onBack } = opts;
  const hints = Array.isArray(task.hints) ? task.hints : task.hint ? [task.hint] : [];
  preloadPython();
  let fails = 0;
  let hintLevel = 0;

  const editor = createEditor(opts.savedCode ?? task.starter ?? '');
  const consoleBox = el('div', { class: 'code-console muted' },
    el('span', { class: 'con-label' }, 'консоль'),
    'Напиши код и нажми «Запустить», чтобы увидеть результат.');
  const runBtn = el('button', { class: 'btn btn-ghost', onclick: () => run(false) }, icon('play'), 'Запустить');
  const checkBtn = el('button', { class: 'btn btn-mint', onclick: () => run(true) }, icon('check'), 'Проверить');
  const hintBox = el('div', { class: 'code-hints' });
  const hintBtn = hints.length
    ? el('button', { class: 'hint-btn', onclick: () => revealHint() },
        icon('lightbulb'), el('span', {}, `Подсказка · ${hints.length} ${hints.length === 1 ? 'уровень' : 'уровня'}`))
    : null;

  // Сохраняем набранное при уходе назад, чтобы код не потерялся.
  const backBtn = onBack
    ? el('button', {
        class: 'ex-back',
        onclick: () => { opts.onSave?.(editor.getValue()); onBack(); },
      }, icon('chevron-left'), 'Назад к объяснению')
    : null;

  container.append(
    el('div', { class: 'card lesson-card' },
      backBtn,
      el('div', { class: 'eyebrow' }, eyebrow),
      el('div', { class: 'quiz-q' }, task.q),
      editor.root,
      consoleBox,
      hintBtn,
      hintBox,
      el('div', { class: 'code-actions' }, runBtn, checkBtn),
    ),
  );

  function setConsole(text, mode = '') {
    consoleBox.className = `code-console ${mode}`;
    consoleBox.replaceChildren(el('span', { class: 'con-label' }, 'консоль'), text);
  }

  // Подсказки раскрываются по уровням: направление -> каркас -> почти решение.
  function revealHint() {
    if (hintLevel >= hints.length) return;
    hintLevel += 1;
    hintBox.append(
      el('div', { class: 'code-hint' },
        icon('lightbulb', 'hint-icon'),
        el('div', {},
          el('b', { style: 'display:block;font-size:12px;margin-bottom:2px' }, `Подсказка ${hintLevel} из ${hints.length}`),
          el('span', { style: 'white-space:pre-wrap' }, hints[hintLevel - 1]),
        ),
      ),
    );
    if (hintBtn) {
      if (hintLevel >= hints.length) {
        hintBtn.remove();
      } else {
        hintBtn.querySelector('span').textContent = `Ещё подсказка · уровень ${hintLevel + 1}`;
      }
    }
  }

  async function run(checking) {
    const code = editor.getValue();
    // Проверяем пропуск только в «настоящем» коде: комментарии и строки
    // (например, инструкция «замени ___ на плюс») не должны считаться пропуском.
    if (stripCommentsAndStrings(code).includes('___')) {
      setConsole('В коде остался пропуск ___ — замени его своим кодом и запусти снова.', 'err');
      return;
    }
    opts.onSave?.(code);
    runBtn.disabled = checkBtn.disabled = true;
    setConsole('Выполняю… (первый запуск скачивает Python, до ~15 секунд)', 'muted');

    const res = await runPython(code, task.tests || null);
    runBtn.disabled = checkBtn.disabled = false;

    if (res.error) {
      setConsole((res.stdout ? res.stdout + '\n' : '') + res.error, 'err');
      if (checking) fail('Код упал с ошибкой — прочитай сообщение в консоли, оно подсказывает, где проблема.');
      return;
    }
    setConsole(res.stdout || '(программа ничего не вывела)');

    if (!checking) return;
    if (outputMatches(res.stdout, task.expect)) {
      success();
    } else {
      fail(`Программа вывела не то, что нужно.\nОжидалось:\n${task.expect}`);
    }
  }

  function success() {
    const sheet = el('div', { class: 'feedback good' },
      el('div', { class: 'feedback-inner' },
        el('div', { class: 'feedback-head' },
          icon('circle-check'),
          PRAISE[Math.floor(Math.random() * PRAISE.length)],
          xpLabel ? el('span', { class: 'chip', style: 'margin-left:auto' }, icon('zap'), xpLabel) : null,
        ),
        task.explain ? el('p', {}, task.explain) : null,
        el('button', {
          class: 'btn btn-block btn-mint',
          onclick: () => { sheet.remove(); onSolved?.({ firstTry: fails === 0 }); },
        }, 'Продолжить'),
      ),
    );
    document.body.append(sheet);
    sheet.querySelector('.btn').focus();
  }

  function fail(message) {
    fails += 1;
    if (hintLevel === 0 && hints.length) revealHint(); // первая неудача — сразу мягкая подсказка
    const showSolution = fails >= 3 || (fails >= 2 && hintLevel >= hints.length);
    const sheet = el('div', { class: 'feedback bad' },
      el('div', { class: 'feedback-inner' },
        el('div', { class: 'feedback-head' }, icon('circle-x'), 'Пока не так'),
        el('p', { style: 'white-space:pre-wrap' }, message),
        el('div', { class: 'code-actions', style: 'margin-top:0' },
          showSolution
            ? el('button', {
                class: 'btn btn-ghost',
                onclick: () => {
                  editor.setValue(task.solution);
                  sheet.remove();
                  setConsole('Решение подставлено в редактор — запусти его и разбери, как оно работает.', 'muted');
                },
              }, icon('lightbulb'), 'Показать решение')
            : null,
          showSolution && onSkip
            ? el('button', { class: 'btn btn-ghost', onclick: () => { sheet.remove(); onSkip(); } }, 'Пропустить')
            : null,
          el('button', { class: 'btn btn-coral', onclick: () => { sheet.remove(); editor.focus(); } }, 'Попробовать ещё'),
        ),
      ),
    );
    document.body.append(sheet);
  }
}
