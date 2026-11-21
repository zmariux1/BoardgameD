(() => {
  const spellSection = document.querySelector('#spells');
  const spellTable = spellSection?.querySelector('.spell-table');
  const manageButton = spellSection?.querySelector('.spells-manage');
  const searchInput = spellSection?.querySelector('.spells-search input');
  const levelTabs = Array.from(spellSection?.querySelectorAll('.spell-level-tab') || []);

  if (!spellTable || !manageButton) {
    return;
  }

  let isManaging = false;
  let activeLevel = 'all';

  const updateVisibleSpells = () => {
    const searchTerm = String(searchInput?.value || '').trim().toLocaleLowerCase();

    spellTable.querySelectorAll('.spell-row').forEach((spellRow) => {
      const isAvailable = spellRow.classList.contains('isPrepared');
      const matchesMode = isManaging || isAvailable;
      const matchesLevel = activeLevel === 'all' || spellRow.dataset.spellLevel === activeLevel;
      const matchesSearch = String(spellRow.dataset.spellName || '').toLocaleLowerCase().includes(searchTerm);
      spellRow.classList.toggle('is-filtered-out', !(matchesMode && matchesLevel && matchesSearch));
    });

    spellTable.querySelectorAll('.spell-level-group').forEach((spellGroup) => {
      const hasVisibleSpell = Boolean(spellGroup.querySelector('.spell-row:not(.is-filtered-out)'));
      spellGroup.classList.toggle('is-filtered-out', !hasVisibleSpell);
    });
  };

  manageButton.setAttribute('aria-expanded', 'false');
  manageButton.addEventListener('click', () => {
    isManaging = !isManaging;
    spellTable.classList.toggle('is-managing', isManaging);
    manageButton.textContent = isManaging ? 'Back to Spells' : 'Manage Spells';
    manageButton.setAttribute('aria-expanded', String(isManaging));
    updateVisibleSpells();
  });

  searchInput?.addEventListener('input', updateVisibleSpells);

  levelTabs.forEach((levelTab) => {
    levelTab.addEventListener('click', () => {
      activeLevel = levelTab.dataset.level || 'all';
      levelTabs.forEach((tab) => {
        const isActive = tab === levelTab;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-pressed', String(isActive));
      });
      updateVisibleSpells();
    });
  });

  updateVisibleSpells();
})();