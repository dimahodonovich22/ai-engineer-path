// Запуск Python в браузере через Pyodide (WebAssembly-сборка CPython).
// Загружается лениво при первом код-задании и кэшируется браузером.
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs';

let pyodidePromise = null;

export function preloadPython() {
  if (!pyodidePromise) {
    pyodidePromise = import(PYODIDE_URL).then(({ loadPyodide }) =>
      loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' }),
    );
    // Ошибку загрузки не глотаем, но и не даём ей стать unhandled rejection:
    // runPython отдаст её тому, кто реально запускает код.
    pyodidePromise.catch(() => {});
  }
  return pyodidePromise;
}

// Выполняет код ученика. Возвращает { ok, stdout, error }.
// error — короткое человекочитаемое описание (последняя строка трейсбека).
export async function runPython(code, testsCode = null) {
  let pyodide;
  try {
    pyodide = await preloadPython();
  } catch {
    pyodidePromise = null; // дать шанс повторной загрузке
    return { ok: false, stdout: '', error: 'Не удалось загрузить Python. Проверь интернет и попробуй ещё раз.' };
  }

  const lines = [];
  pyodide.setStdout({ batched: (s) => lines.push(s) });
  pyodide.setStderr({ batched: () => {} });

  const globals = pyodide.globals.get('dict')();
  try {
    // input() в тренажёре не работает — подменяем понятной ошибкой.
    await pyodide.runPythonAsync(
      'def input(prompt=""):\n    raise RuntimeError("input() в тренажёре не поддерживается — используй переменные")',
      { globals },
    );
    await pyodide.runPythonAsync(code, { globals });
    if (testsCode) await pyodide.runPythonAsync(testsCode, { globals });
    return { ok: true, stdout: lines.join('\n'), error: null };
  } catch (e) {
    return { ok: false, stdout: lines.join('\n'), error: shortError(e) };
  } finally {
    globals.destroy();
  }
}

function shortError(e) {
  const text = String(e.message || e);
  // Берём последнюю содержательную строку трейсбека: "NameError: name 'x' is not defined"
  const rows = text.trim().split('\n').filter((r) => r.trim());
  let last = rows[rows.length - 1] || 'Ошибка выполнения';
  // Номер строки пользователя, если есть
  const lineMatch = text.match(/File "<exec>", line (\d+)/);
  if (lineMatch) last += ` (строка ${lineMatch[1]})`;
  return last;
}

// Сравнение вывода с ожидаемым: построчно, без хвостовых пробелов и пустых строк в конце.
export function outputMatches(got, expected) {
  const norm = (s) => s.replace(/\r/g, '').split('\n').map((l) => l.trimEnd()).join('\n').replace(/\n+$/, '').trim();
  return norm(got) === norm(expected);
}
