// Мини-редактор кода: textarea поверх подсвеченного слоя + номера строк.
import { el, esc } from './ui.js';

const KEYWORDS = /\b(def|return|if|elif|else|for|while|break|continue|in|not|and|or|is|None|True|False|import|from|as|pass|try|except|raise|with|lambda|class|global|del)\b/g;
const BUILTINS = /\b(print|input|len|int|str|float|range|list|dict|type|round|sum|min|max|sorted|abs|append)\b/g;

// Подсветка: строки и комментарии сначала (как «защищённые» зоны), потом ключевые слова.
export function highlightPython(src) {
  let out = '';
  const parts = src.split(/("""[\s\S]*?"""|'''[\s\S]*?'''|f?"(?:[^"\\\n]|\\.)*"?|f?'(?:[^'\\\n]|\\.)*'?|#[^\n]*)/g);
  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i] ?? '';
    if (i % 2) { // защищённая зона: строка или комментарий
      const cls = chunk.startsWith('#') ? 'tok-com' : 'tok-str';
      out += `<span class="${cls}">${esc(chunk)}</span>`;
    } else {
      out += esc(chunk)
        .replace(KEYWORDS, '<span class="tok-kw">$1</span>')
        .replace(BUILTINS, '<span class="tok-fn">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
    }
  }
  return out;
}

// createEditor(initialCode) -> { root, getValue, setValue, focus }
export function createEditor(initialCode = '') {
  const gutter = el('div', { class: 'ed-gutter', 'aria-hidden': 'true' });
  const layer = el('pre', { class: 'ed-highlight', 'aria-hidden': 'true' });
  const ta = el('textarea', {
    class: 'ed-input',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
    autocorrect: 'off',
    'aria-label': 'Редактор кода Python',
  });
  ta.value = initialCode;

  function sync() {
    // Хвостовой перенос, чтобы последняя пустая строка имела высоту
    layer.innerHTML = highlightPython(ta.value) + '\n';
    const linesCount = ta.value.split('\n').length;
    gutter.replaceChildren(...Array.from({ length: linesCount }, (_, i) => el('span', {}, String(i + 1))));
  }

  ta.addEventListener('input', sync);
  ta.addEventListener('scroll', () => {
    layer.scrollTop = ta.scrollTop;
    layer.scrollLeft = ta.scrollLeft;
    gutter.scrollTop = ta.scrollTop;
  });

  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      insert(ta, '    ');
      sync();
    } else if (e.key === 'Enter') {
      // автоотступ: копируем отступ текущей строки; после ':' добавляем ещё уровень
      e.preventDefault();
      const before = ta.value.slice(0, ta.selectionStart);
      const line = before.slice(before.lastIndexOf('\n') + 1);
      const indent = (line.match(/^ */)?.[0] || '') + (line.trimEnd().endsWith(':') ? '    ' : '');
      insert(ta, '\n' + indent);
      sync();
    }
  });

  const root = el('div', { class: 'code-editor' },
    el('div', { class: 'ed-titlebar' },
      el('span', { class: 'ed-dots' }, el('i'), el('i'), el('i')),
      el('span', { class: 'ed-filename' }, 'main.py'),
    ),
    el('div', { class: 'ed-body' }, gutter, el('div', { class: 'ed-scroll' }, layer, ta)),
  );

  sync();
  return {
    root,
    getValue: () => ta.value,
    setValue: (v) => { ta.value = v; sync(); },
    focus: () => ta.focus(),
  };
}

function insert(ta, text) {
  const { selectionStart: s, selectionEnd: e } = ta;
  ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
  ta.selectionStart = ta.selectionEnd = s + text.length;
}
