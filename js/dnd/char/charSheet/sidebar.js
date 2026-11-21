(() => {
  const sidebar = document.querySelector('.sidebar');
  const toggleButton = sidebar?.querySelector('.brand-mark');
  const nav = sidebar?.querySelector('.sidebar__nav');

  if (!sidebar || !toggleButton || !nav) {
    return;
  }

  const mobileQuery = window.matchMedia('(max-width: 799.98px)');

  function applyViewportState() {
    // La schimbarea dimensiunii ecranului, meniul revine
    // la starea corespunzătoare modului desktop sau mobile.
    sidebar.classList.remove('sidebar--open');

    if (mobileQuery.matches) {
      // Mobile: meniul este închis inițial.
      toggleButton.setAttribute('aria-expanded', 'false');
      nav.setAttribute('aria-hidden', 'true');
      nav.inert = true;
    } else {
      // Desktop: navigarea rămâne vizibilă și funcționează normal.
      toggleButton.removeAttribute('aria-expanded');
      nav.removeAttribute('aria-hidden');
      nav.inert = false;
    }
  }

  toggleButton.addEventListener('click', () => {
    // Butonul controlează meniul numai sub 800px.
    if (!mobileQuery.matches) {
      return;
    }

    const isOpening = !sidebar.classList.contains('sidebar--open');

    sidebar.classList.toggle('sidebar--open', isOpening);

    toggleButton.setAttribute(
      'aria-expanded',
      String(isOpening)
    );

    nav.setAttribute('aria-hidden', String(!isOpening));
    nav.inert = !isOpening;
  });

  applyViewportState();

  // Reinițializează starea când ecranul trece pragul de 800px.
  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', applyViewportState);
  } else {
    // Compatibilitate cu browsere mai vechi.
    mobileQuery.addListener(applyViewportState);
  }
})();