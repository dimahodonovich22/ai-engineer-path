// Универсальное код-упражнение: редактор + консоль + запуск + проверка stdout.
// Используется в фазе «Практика» урока и в код-вопросах квиза.
import { el, icon } from './ui.js';
import { createEditor } from './editor.js';
import { preloadPython, runPython, outputMatches } from './pycode.js';

const PRAISE = ['Отлично!', 'Работает!', 'Именно так!', 'Чистый код!', 'Так держать!'];

// task: { q, starter, expect, solution, hint, explain, tests? }
// opts: { eyebrow, xpLabel, savedCode, onSave(code), onSolved({ firstTry }), onSkip }
export function mountCodeExercise(container, task, opts = {}) {
  const { eyebrow = 'Твой код', xpLabel = null, onSolved, onSkip } = opts;
  preloadPython();
  let fails = 0;

  const editor = createEditor(opts.savedCode ?? task.starter ?? '');
  const consoleBox = el('div', { class: 'code-console muted' },
    el('span', { class: 'con-label' }, 'консоль'),
    'Напиши код и нажми «Запустить», чтобы увидеть результат.');
  const runBtn = el('button', { class: 'btn btn-ghost', onclick: () => run(false) }, icon('play'), 'Запустить');
  const checkBtn = el('button', { class: 'btn btn-mint', onclick: () => run(true) }, icon('check'), 'Проверить');
  const hintBox = el('div', { class: 'code-hint hidden' });

  container.append(
    el('div', { class: 'card lesson-card' },
      el('div', { class: 'eyebrow' }, eyebrow),
      el('div', { class: 'quiz-q' }, task.q),
      editor.root,
      consoleBox,
      hintBox,
      el('div', { class: 'code-actions' }, runBtn, checkBtn),
    ),
  );

  function setConsole(text, mode = '') {
    consoleBox.className = `code-console ${mode}`;
    consoleBox.replaceChildren(el('span', { class: 'con-label' }, 'консоль'), text);
  }

  async function run(checking) {
    const code = editor.getValue();
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
    if (task.hint) {
      hintBox.classList.remove('hidden');
      hintBox.replaceChildren(icon('lightbulb', 'hint-icon'), el('span', {}, task.hint));
    }
    const sheet = el('div', { class: 'feedback bad' },
      el('div', { class: 'feedback-inner' },
        el('div', { class: 'feedback-head' }, icon('circle-x'), 'Пока не так'),
        el('p', { style: 'white-space:pre-wrap' }, message),
        el('div', { class: 'code-actions', style: 'margin-top:0' },
          fails >= 3
            ? el('button', {
                class: 'btn btn-ghost',
                onclick: () => {
                  editor.setValue(task.solution);
                  sheet.remove();
                  setConsole('Решение подставлено в редактор — запусти его и разбери, как оно работает.', 'muted');
                },
              }, icon('lightbulb'), 'Показать решение')
            : null,
          fails >= 3 && onSkip
            ? el('button', { class: 'btn btn-ghost', onclick: () => { sheet.remove(); onSkip(); } }, 'Пропустить')
            : null,
          el('button', { class: 'btn btn-coral', onclick: () => { sheet.remove(); editor.focus(); } }, 'Попробовать ещё'),
        ),
      ),
    );
    document.body.append(sheet);
  }
}
