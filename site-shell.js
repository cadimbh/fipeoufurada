document.addEventListener('DOMContentLoaded', () => {
  const menu = document.querySelector('.site-menu');
  if (menu) {
    menu.addEventListener('click', event => {
      if (event.target.closest('a')) menu.removeAttribute('open');
    });
  }

  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a, .site-menu__panel a').forEach(link => {
    const target = new URL(link.href, location.href).pathname.split('/').pop() || 'index.html';
    if (target === current) link.setAttribute('aria-current', 'page');
  });
});
