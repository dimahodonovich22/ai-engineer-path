// «Проект модуля» — настоящее задание вне тренажёра с чек-листом.
import { el, icon, confetti } from '../ui.js';
import { store } from '../store.js';
import { PROJECTS } from '../../data/projects.js';
import { navigate } from '../router.js';
import { checkAchievements } from '../achievements-engine.js';

export function renderProject(app, moduleId) {
  const project = PROJECTS[moduleId];
  if (!project) { navigate(''); return; }
  app.replaceChildren();

  const alreadyDone = store.projectDone(moduleId);
  const checks = project.steps.map(() => alreadyDone);

  const doneBtn = el('button', {
    class: 'btn btn-mint btn-block',
    disabled: !alreadyDone,
    onclick: complete,
  }, icon('check'), alreadyDone ? 'Проект засчитан' : 'Я сделал проект!');

  function refreshBtn() {
    const all = checks.every(Boolean);
    doneBtn.disabled = !all;
  }

  const stepList = el('div', { class: 'project-steps' },
    ...project.steps.map((text, i) =>
      el('label', { class: 'project-step' },
        el('input', {
          type: 'checkbox',
          checked: alreadyDone,
          onchange: (e) => { checks[i] = e.target.checked; refreshBtn(); },
        }),
        el('span', { class: 'step-box' }, icon('check')),
        el('span', {}, text),
      )),
  );

  app.append(
    el('div', {},
      el('div', { class: 'project-hero' },
        el('div', { class: 'project-icon' }, icon(project.icon)),
        el('div', { class: 'eyebrow' }, 'Проект модуля'),
        el('h2', {}, project.title),
        el('p', { class: 'project-tagline' }, project.tagline),
      ),
      el('div', { class: 'card', style: 'margin-bottom:16px' },
        el('div', { html: project.intro }),
        project.url
          ? el('a', { class: 'btn btn-ghost btn-sm', href: project.url, target: '_blank', rel: 'noopener', style: 'margin-top:8px' },
              icon('arrow-right'), project.urlLabel || 'Открыть')
          : null,
      ),
      el('div', { class: 'card', style: 'margin-bottom:16px' },
        el('h3', { style: 'font-size:15px;margin-bottom:12px' }, 'Шаги'),
        stepList,
      ),
      el('div', { class: 'card', style: 'margin-bottom:16px' },
        el('div', { class: 'practice-badge' }, icon('trophy'), 'Результат'),
        el('div', { html: project.deliverable }),
      ),
      el('div', { class: 'reward-row', style: 'margin-bottom:14px' },
        el('span', { class: 'reward xp' }, icon('zap'), `+${project.xp} XP за проект`)),
      doneBtn,
    ),
  );

  function complete() {
    if (store.projectDone(moduleId)) { navigate(''); return; }
    store.markProject(moduleId);
    store.addXp(project.xp);
    checkAchievements();
    confetti(120);
    app.replaceChildren(
      el('div', { class: 'card finish' },
        el('div', { class: 'finish-icon' }, icon('trophy')),
        el('h2', {}, 'Проект готов!'),
        el('p', { class: 'sub' }, 'Ты собрал настоящий кусок кода/навыка целиком. Именно из таких вещей растёт портфолио.'),
        el('div', { class: 'reward-row' }, el('span', { class: 'reward xp' }, icon('zap'), `+${project.xp} XP`)),
        el('p', { style: 'font-size:13.5px;color:var(--muted);margin-bottom:20px' },
          'Покажи результат наставнику Claude — разберём и улучшим.'),
        el('button', { class: 'btn btn-block', onclick: () => navigate('') }, 'На карту', icon('arrow-right')),
      ),
    );
  }
}
