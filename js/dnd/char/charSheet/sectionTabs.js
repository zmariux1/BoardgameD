(() => {
  const characterMain = document.querySelector('#character-main');
  const sectionTablist = document.querySelector('.section-tabs');
  const sectionTabs = Array.from(sectionTablist?.querySelectorAll('.section-tab') || []);
  const sectionTargets = {
    '#stats': ['stats', 'side_stats'],
    '#skills': ['skills'],
    '#inventory': ['inventory'],
    '#spells': ['spells'],
    '#actions': ['actions'],
    '#feats': ['feats'],
    '#background': ['background'],
    '#more': ['other-details']
  };

  const resetSectionFilter = () => {
    if (!characterMain) return;

    characterMain.classList.remove('is-section-filtered');
    characterMain.querySelectorAll('.main-grid > .section-slot').forEach((slot) => {
      slot.classList.remove('is-section-visible');
      slot.removeAttribute('aria-hidden');
    });

    sectionTabs.forEach((tab) => {
      const isOverview = tab.getAttribute('href') === '#overview';
      tab.classList.toggle('is-active', isOverview);
      if (isOverview) {
        tab.setAttribute('aria-current', 'page');
      } else {
        tab.removeAttribute('aria-current');
      }
    });
  };

  const mobileSectionQuery = window.matchMedia('(max-width: 550px)');
  mobileSectionQuery.addEventListener('change', (event) => {
    if (!event.matches) resetSectionFilter();
  });

  if (characterMain && sectionTablist) {
    sectionTablist.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;

      const selectedTab = event.target.closest('.section-tab');
      const href = selectedTab?.getAttribute('href');
      const targetIds = href === '#overview'
        ? Array.from(characterMain.querySelectorAll('.main-grid > .section-slot'), (slot) => slot.id)
        : sectionTargets[href];
      if (!selectedTab || !targetIds) return;

      event.preventDefault();
      characterMain.classList.add('is-section-filtered');

      const visibleTargets = new Set(targetIds);
      characterMain.querySelectorAll('.main-grid > .section-slot').forEach((slot) => {
        const isVisible = visibleTargets.has(slot.id);
        slot.classList.toggle('is-section-visible', isVisible);
        slot.setAttribute('aria-hidden', String(!isVisible));
      });

      sectionTabs.forEach((tab) => {
        const isActive = tab === selectedTab;
        tab.classList.toggle('is-active', isActive);
        if (isActive) {
          tab.setAttribute('aria-current', 'page');
        } else {
          tab.removeAttribute('aria-current');
        }
      });
    });
  }

  document.querySelectorAll('.section-tabs').forEach((tablist) => {
    let dragState;
    let suppressClick = false;

    tablist.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      if (tablist.scrollWidth <= tablist.clientWidth) return;

      suppressClick = false;
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        scrollStart: tablist.scrollLeft,
        didDrag: false
      };
    });

    document.addEventListener('pointermove', (event) => {
      if (event.pointerId !== dragState?.pointerId) return;

      const deltaX = event.clientX - dragState.startX;
      if (!dragState.didDrag && Math.abs(deltaX) < 4) return;

      dragState.didDrag = true;
      tablist.classList.add('is-dragging');
      tablist.scrollLeft = dragState.scrollStart - deltaX;
      event.preventDefault();
    });

    const stopDragging = (event) => {
      if (event.pointerId !== dragState?.pointerId) return;

      const didDrag = dragState.didDrag;
      dragState = undefined;
      tablist.classList.remove('is-dragging');
      suppressClick = didDrag;
    };

    document.addEventListener('pointerup', stopDragging);
    document.addEventListener('pointercancel', stopDragging);

    tablist.addEventListener('click', (event) => {
      if (!suppressClick) return;

      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);
  });

  const tabGroups = [
    {
      tablistSelector: '.feats-tabs',
      panelContainerSelector: '.feats-panels',
      panelSelector: '.feat-panel'
    },
    {
      tablistSelector: '.inventory-tabs',
      panelContainerSelector: '.inventory-panels',
      panelSelector: '.inventory-panel'
    }
  ];

  tabGroups.forEach(({ tablistSelector, panelContainerSelector, panelSelector }) => {
    document.querySelectorAll(tablistSelector).forEach((tablist) => {
      const cardBody = tablist.parentElement;
      const panelContainer = cardBody?.querySelector(panelContainerSelector);
      const tabs = Array.from(tablist.querySelectorAll('input[type="radio"][aria-controls]'));
      const panels = Array.from(panelContainer?.querySelectorAll(panelSelector) || []);

      if (!panelContainer || tabs.length === 0 || panels.length === 0) {
        return;
      }

      const activateTab = (selectedTab) => {
        tabs.forEach((tab) => {
          const isActive = tab === selectedTab;
          const tabLabel = Array.from(tablist.querySelectorAll('[role="tab"]'))
            .find((label) => label.htmlFor === tab.id);

          tab.checked = isActive;
          tabLabel?.setAttribute('aria-selected', String(isActive));
          if (tabLabel) {
            tabLabel.tabIndex = isActive ? 0 : -1;
          }
        });

        const panelId = selectedTab.getAttribute('aria-controls');
        panels.forEach((panel) => {
          const isActive = panel.id === panelId;
          panel.classList.toggle('is-active', isActive);
          panel.setAttribute('aria-hidden', String(!isActive));
          panel.hidden = !isActive;
        });
      };

      tablist.addEventListener('change', (event) => {
        if (tabs.includes(event.target)) {
          activateTab(event.target);
        }
      });

      activateTab(tabs.find((tab) => tab.checked) || tabs[0]);
    });
  });
})();