// Aplica o tema antes da primeira pintura, para evitar o "flash" de tema errado.
// Fica em arquivo próprio (e não inline) para a Content-Security-Policy não precisar de 'unsafe-inline'.
(function () {
  var pref = 'system';
  try {
    pref = localStorage.getItem('tc:theme') || 'system';
  } catch {
    // sem acesso ao localStorage (modo privado, bloqueio): segue o sistema
  }
  var dark =
    pref === 'dark' ||
    (pref === 'system' && !window.matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
