(() => {
  'use strict';

  const normalizePath = pathname => {
    const clean = pathname.replace(/\/index\.html$/i, '/');
    return clean.length > 1 ? clean.replace(/\/$/, '') : clean;
  };

  document.addEventListener('DOMContentLoaded', () => {
    const currentUrl = new URL(window.location.href);
    const currentPath = normalizePath(currentUrl.pathname);

    document.querySelectorAll('.site-nav a, .site-menu__panel a').forEach(link => {
      const target = new URL(link.href, currentUrl);
      const samePath = normalizePath(target.pathname) === currentPath;
      const sameHash = !target.hash || target.hash === currentUrl.hash;
      if (samePath && sameHash) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');

      if (target.origin !== currentUrl.origin && link.target === '_blank') {
        link.rel = [...new Set(`${link.rel} noopener noreferrer`.trim().split(/\s+/))].join(' ');
      }
    });

    document.querySelectorAll('.site-menu').forEach((menu, index) => {
      const summary = menu.querySelector('summary');
      const panel = menu.querySelector('.site-menu__panel');
      if (!summary || !panel) return;

      if (!panel.id) panel.id = `site-menu-panel-${index + 1}`;
      summary.setAttribute('aria-controls', panel.id);
      summary.setAttribute('aria-expanded', String(menu.open));
      if (!summary.hasAttribute('aria-label')) summary.setAttribute('aria-label', 'Abrir menu de navegação');

      const closeMenu = ({ returnFocus = false } = {}) => {
        if (!menu.open) return;
        menu.open = false;
        summary.setAttribute('aria-expanded', 'false');
        if (returnFocus) summary.focus();
      };

      menu.addEventListener('toggle', () => {
        summary.setAttribute('aria-expanded', String(menu.open));
        summary.setAttribute('aria-label', menu.open ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
      });

      menu.addEventListener('click', event => {
        if (event.target.closest('a')) closeMenu();
      });

      document.addEventListener('pointerdown', event => {
        if (menu.open && !menu.contains(event.target)) closeMenu();
      });

      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.open) closeMenu({ returnFocus: true });
      });
    });
  });
})();
