// Hash-роутер: '#/x/y' -> обработчик из карты маршрутов.
const routes = [];

export function route(pattern, handler) {
  // pattern: 'lesson/:id' -> регэксп с именованными группами
  const names = [];
  const rx = new RegExp('^' + pattern.replace(/:([\w-]+)/g, (_, n) => {
    names.push(n);
    return '([\\w-]+)';
  }) + '$');
  routes.push({ rx, names, handler });
}

export function navigate(path) {
  location.hash = '#/' + path;
}

export function currentPath() {
  return location.hash.replace(/^#\/?/, '');
}

export function resolve() {
  const path = currentPath();
  for (const { rx, names, handler } of routes) {
    const m = path.match(rx);
    if (m) {
      const params = Object.fromEntries(names.map((n, i) => [n, m[i + 1]]));
      return handler(params);
    }
  }
  // Неизвестный маршрут — на карту.
  if (path !== '') navigate('');
  return routes[0]?.handler({});
}

export function startRouter() {
  addEventListener('hashchange', () => {
    resolve();
    document.getElementById('app').focus({ preventScroll: true });
    scrollTo(0, 0);
  });
  resolve();
}
