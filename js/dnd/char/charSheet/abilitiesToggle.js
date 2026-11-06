function initFeatureDescriptions() {
  document
    .querySelectorAll(
      '#actions .compact-action .feature-description'
    )
    .forEach((description) => {
      const action = description.closest('.compact-action');
      const toggle = action?.querySelector(
        '.feature-description__toggle'
      );

      if (!toggle) return;

      // Afișăm butonul numai dacă textul depășește 3 rânduri.
      toggle.hidden =
        description.scrollHeight <= description.clientHeight + 1;

      toggle.addEventListener('click', () => {
        const isExpanded =
          toggle.getAttribute('aria-expanded') === 'true';

        // Dacă era extins, îl restrângem.
        // Dacă era restrâns, îl extindem.
        description.classList.toggle(
          'is-collapsed',
          isExpanded
        );

        toggle.setAttribute(
          'aria-expanded',
          String(!isExpanded)
        );

        toggle.textContent = isExpanded
          ? 'Vezi mai mult'
          : 'Arată mai puțin';
      });
    });
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initFeatureDescriptions
  );
} else {
  initFeatureDescriptions();
}