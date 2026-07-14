// Входная точка приложения.
import { el, icon, loadSprite } from './ui.js';
import { store } from './store.js';
import { allLessons } from '../data/curriculum.js';
import { route, startRouter, currentPath } from './router.js';
import { renderMap } from './views/map.js';
import { renderLesson } from './views/lesson.js';
import { renderReview } from './views/review.js';
import { renderExam } from './views/exam.js';
import { renderProject } from './views/project.js';
import { renderAchievements } from './views/achievements.js';
import { renderProfile, applyTheme } from './views/profile.js';

const app = document.getElementById('app');

function renderTopStats() {
  const box = document.getElementById('topbar-stats');
  const streak = store.streak();
  const hot = store.streakToday();
  box.replaceChildren(
    el('span', { class: `stat-pill streak ${hot ? '' : 'cold'}`, title: 'Дней подряд' },
      icon('flame'), String(streak)),
    el('span', { class: 'stat-pill xp', title: 'Очки опыта' },
      icon('zap'), String(store.xp)),
  );
}

function highlightTab() {
  const path = currentPath();
  const tab = path.startsWith('awards') ? 'awards' : path.startsWith('profile') ? 'profile' : 'map';
  document.querySelectorAll('.tabbar a').forEach((a) => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  // На экранах-«сессиях» (урок, тренировка, экзамен) навигация мешает — прячем.
  const focused = ['lesson/', 'review', 'exam/'].some((p) => path.startsWith(p));
  document.getElementById('tabbar').classList.toggle('hidden', focused);
}

route('', () => renderMap(app));
route('lesson/:id', ({ id }) => renderLesson(app, id));
route('review', () => renderReview(app));
route('exam/:id', ({ id }) => renderExam(app, id));
route('project/:id', ({ id }) => renderProject(app, id));
route('awards', () => renderAchievements(app));
route('profile', () => renderProfile(app));

applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
addEventListener('progress-changed', renderTopStats);
addEventListener('hashchange', highlightTab);

loadSprite().then(() => {
  store.maybeGrantFreeze();
  store.backfillReviews(allLessons().map((x) => x.lesson));
  startRouter();
  renderTopStats();
  highlightTab();
});
