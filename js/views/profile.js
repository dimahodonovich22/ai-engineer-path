// Профиль: уровень, статистика, тема, экспорт/импорт прогресса.
import { el, icon, toast, plural } from '../ui.js';
import { store, levelInfo } from '../store.js';
import { allLessons } from '../../data/curriculum.js';

export function renderProfile(app) {
  app.replaceChildren();
  const lvl = levelInfo(store.xp);
  const totalLessons = allLessons().length;

  app.append(
    el('div', { class: 'card level-card' },
      el('div', { class: 'level-badge' }, String(lvl.level)),
      el('div', { class: 'level-info' },
        el('b', {}, `Уровень ${lvl.level}`),
        el('div', { class: 'bar' }, el('i', { style: `width:${lvl.pct}%` })),
        el('small', {}, `${lvl.into} / ${lvl.need} XP до уровня ${lvl.level + 1}`),
      ),
    ),
  );

  const doneCount = store.completedCount();
  app.append(
    el('div', { class: 'profile-section', style: 'margin-top:18px' },
      el('div', { class: 'stat-grid' },
        statCard(store.xp, 'всего XP'),
        statCard(`${doneCount} / ${totalLessons}`, plural(doneCount, 'урок пройден', 'урока пройдено', 'уроков пройдено')),
        statCard(store.streak(), 'стрик сейчас'),
        statCard(store.streakBest, 'рекорд стрика'),
        statCard(store.daysActive, plural(store.daysActive, 'день с уроками', 'дня с уроками', 'дней с уроками')),
        statCard(store.perfectCount(), 'идеальных квизов'),
      ),
    ),
  );

  // Настройки
  const themeSeg = el('div', { class: 'seg' },
    ...[['auto', 'Авто'], ['light', 'День'], ['dark', 'Ночь']].map(([val, label]) =>
      el('button', {
        class: store.theme === val ? 'active' : '',
        onclick: () => { store.setTheme(val); applyTheme(); renderProfile(app); },
      }, label)),
  );

  app.append(
    el('div', { class: 'card profile-section' },
      el('h3', {}, 'Настройки'),
      el('div', { class: 'settings-row' },
        el('div', {}, el('div', { class: 'lbl' }, 'Тема'), el('div', { class: 'sub' }, 'Авто следует за системой')),
        themeSeg,
      ),
      el('div', { class: 'settings-row' },
        el('div', {},
          el('div', { class: 'lbl' }, 'Сохранить прогресс'),
          el('div', { class: 'sub' }, 'Файл-копия: прогресс живёт в этом браузере'),
        ),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: exportProgress }, icon('download'), 'Экспорт'),
      ),
      el('div', { class: 'settings-row' },
        el('div', {},
          el('div', { class: 'lbl' }, 'Восстановить прогресс'),
          el('div', { class: 'sub' }, 'Загрузи файл экспорта'),
        ),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: importProgress }, icon('upload'), 'Импорт'),
      ),
      el('div', { class: 'settings-row' },
        el('div', {},
          el('div', { class: 'lbl' }, 'Начать заново'),
          el('div', { class: 'sub' }, 'Сотрёт весь прогресс — без возврата'),
        ),
        el('button', {
          class: 'btn btn-coral btn-sm',
          onclick: () => {
            if (confirm('Точно стереть весь прогресс? Это действие необратимо.')) {
              store.reset();
              renderProfile(app);
            }
          },
        }, icon('rotate-ccw'), 'Сброс'),
      ),
    ),
  );

  app.append(
    el('p', { style: 'text-align:center;font-size:12.5px;color:var(--muted);margin-top:8px' },
      'AI Engineer Path — твой тренажёр на пути в AI-инженерию. Вопросы по темам — к наставнику Claude.'),
  );
}

function statCard(num, lbl) {
  return el('div', { class: 'card stat-card' },
    el('div', { class: 'num' }, String(num)),
    el('div', { class: 'lbl' }, lbl),
  );
}

function exportProgress() {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ai-engineer-path-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('download', 'Файл прогресса сохранён');
}

function importProgress() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async () => {
    try {
      store.importJSON(await input.files[0].text());
      toast('circle-check', 'Прогресс восстановлен!');
      location.hash = '#/';
    } catch (e) {
      toast('circle-x', 'Не получилось: ' + e.message);
    }
  };
  input.click();
}

export function applyTheme() {
  const pref = store.theme;
  const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
