// Экран наград.
import { el, icon } from '../ui.js';
import { store } from '../store.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';

export function renderAchievements(app) {
  app.replaceChildren();
  const got = Object.keys(store.achievements).length;

  app.append(
    el('div', { style: 'margin-bottom:18px' },
      el('div', { class: 'eyebrow' }, 'Награды'),
      el('h2', { class: 'display', style: 'font-size:22px;margin:4px 0' },
        `${got} из ${ACHIEVEMENTS.length}`),
      el('p', { style: 'color:var(--muted);font-size:14px' },
        got === 0
          ? 'Пока пусто — но первый урок уже принесёт первую награду.'
          : 'Каждая награда — зафиксированный шаг к профессии.'),
    ),
  );

  const grid = el('div', { class: 'awards-grid' });
  for (const a of ACHIEVEMENTS) {
    const date = store.achievements[a.id];
    grid.append(
      el('div', { class: `award ${date ? 'unlocked' : 'locked'}` },
        el('div', { class: `award-icon ${a.color}` }, icon(a.icon)),
        el('b', {}, a.title),
        el('small', {}, date ? `Получено ${formatDate(date)}` : a.desc),
      ),
    );
  }
  app.append(grid);
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${Number(d)}.${m}.${y}`;
}
