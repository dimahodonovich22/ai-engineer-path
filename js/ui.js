// Мини-хелперы для DOM без фреймворка.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

export function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  if (cls) svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

export function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Загружаем SVG-спрайт в документ, чтобы работали <use href="#i-...">.
export async function loadSprite() {
  const res = await fetch('assets/icons.svg');
  const div = document.createElement('div');
  div.innerHTML = await res.text();
  div.firstElementChild.id = 'icon-sprite';
  document.body.prepend(div.firstElementChild);
}

export function toast(iconName, text, ms = 3800) {
  const root = document.getElementById('toast-root');
  const t = el('div', { class: 'toast' }, icon(iconName), el('span', {}, text));
  root.append(t);
  setTimeout(() => t.remove(), ms);
}

export function confetti(count = 80) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#6C4CF1', '#1FC77C', '#FFAF1F', '#FF5C7A', '#2FA8F5'];
  for (let i = 0; i < count; i++) {
    const c = el('div', { class: 'confetti' });
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.append(c);
    setTimeout(() => c.remove(), 4000);
  }
}

// Перемешивание (Fisher–Yates), не мутирует исходник.
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
