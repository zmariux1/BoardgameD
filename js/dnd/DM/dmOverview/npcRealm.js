// =====================================================================
// NPC REALM — tab-uri regiuni/orașe, colapsare, search, filtru badge
// Totul este limitat la .npcRealm (views/userAccess/dnd/dm/partials/npcRealm.ejs).
// =====================================================================
(function () {
    const root = document.querySelector('.npcRealm');
    if (!root) {
        return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const normalizeText = (value) =>
        String(value || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .trim();


    // -----------------------------------------------------------------
    // 1. Tab-uri regiuni: actualizează hero-ul și derulează la panou
    // -----------------------------------------------------------------
    const hero = {
        name: root.querySelector('[data-npc-hero-name]'),
        desc: root.querySelector('[data-npc-hero-desc]'),
        icon: root.querySelector('[data-npc-hero-icon]'),
        map: root.querySelector('[data-npc-hero-map]'),
        cities: root.querySelector('[data-npc-hero-cities]'),
        npcs: root.querySelector('[data-npc-hero-npcs]'),
        quests: root.querySelector('[data-npc-hero-quests]')
    };
    const regionTabs = Array.from(root.querySelectorAll('[data-npc-region-tab]'));

    const setText = (element, value) => {
        if (element) {
            element.textContent = value;
        }
    };

    const activateRegion = (tab, { scroll = true } = {}) => {
        regionTabs.forEach((regionTab) => {
            const isActive = regionTab === tab;
            regionTab.classList.toggle('npcRealm__tab--active', isActive);
            regionTab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        const { name, description, icon, map, cities, npcs, quests } = tab.dataset;
        setText(hero.name, name);
        setText(hero.desc, description);
        setText(hero.cities, cities);
        setText(hero.npcs, npcs);
        setText(hero.quests, quests);

        if (hero.icon && icon) {
            hero.icon.className = icon;
        }

        if (hero.map && map) {
            // fallback-ul din onerror a fost consumat la prima eroare; îl repunem
            hero.map.onerror = function () {
                this.onerror = null;
                this.src = `https://placehold.co/600x400/0f131a/e3c48a?text=${encodeURIComponent(name || '')}`;
            };
            hero.map.src = map;
            hero.map.alt = `Harta regiunii ${name || ''}`;
        }

        if (scroll) {
            const panel = document.getElementById(tab.getAttribute('aria-controls'));
            if (panel && !panel.hidden) {
                panel.scrollIntoView({
                    behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
                    block: 'start'
                });
            }
        }
    };

    regionTabs.forEach((tab) => {
        tab.addEventListener('click', () => activateRegion(tab));
    });


    // -----------------------------------------------------------------
    // 1b. Dropdown continent: afișează doar regiunile (tab + panou) ale
    //     continentului ales și activează prima regiune a acestuia
    // -----------------------------------------------------------------
    const continentSelect = root.querySelector('[data-npc-continent-select]');
    const continentEmptyMessages = Array.from(root.querySelectorAll('[data-npc-continent-empty]'));
    const getSelectedContinent = () => (continentSelect ? continentSelect.value : null);
    const isInSelectedContinent = (element) => {
        const selected = getSelectedContinent();
        return selected === null || element.dataset.npcContinent === selected;
    };

    const resetHeroForEmptyContinent = () => {
        const option = continentSelect && continentSelect.selectedOptions[0];
        setText(hero.name, '');
        setText(hero.desc, 'No regions or towns on this continent yet.');
        setText(hero.cities, '0');
        setText(hero.npcs, '0');
        setText(hero.quests, '0');
        if (hero.map) {
            hero.map.onerror = null;
            hero.map.src = `https://placehold.co/600x400/0f131a/e3c48a?text=${encodeURIComponent(option ? option.textContent : '')}`;
        }
    };

    const activateContinent = () => {
        const selected = getSelectedContinent();

        continentEmptyMessages.forEach((message) => {
            message.hidden = message.dataset.npcContinentEmpty !== selected;
        });

        // reaplică vizibilitatea tab-urilor/panourilor (ține cont și de search/filtru)
        applyFilters();

        const continentTabs = regionTabs.filter((tab) => tab.dataset.npcContinent === selected);
        const firstTab = continentTabs.find((tab) => !tab.hidden) || continentTabs[0];
        if (firstTab) {
            activateRegion(firstTab, { scroll: false });
        } else {
            regionTabs.forEach((tab) => {
                tab.classList.remove('npcRealm__tab--active');
                tab.setAttribute('aria-pressed', 'false');
            });
            resetHeroForEmptyContinent();
        }
    };


    // -----------------------------------------------------------------
    // 2. Tab-uri orașe (ARIA tabs, roving tabindex, săgeți/Home/End)
    // -----------------------------------------------------------------
    const getCityTabs = (tablist) => Array.from(tablist.querySelectorAll('[data-npc-city-tab]'));

    const activateCity = (tab, { focus = false } = {}) => {
        const tablist = tab.closest('[role="tablist"]');
        if (!tablist) {
            return;
        }

        getCityTabs(tablist).forEach((cityTab) => {
            const isActive = cityTab === tab;
            const panel = document.getElementById(cityTab.getAttribute('aria-controls'));

            cityTab.classList.toggle('npcRealm__tab--active', isActive);
            cityTab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            cityTab.tabIndex = isActive ? 0 : -1;

            if (panel) {
                panel.hidden = !isActive;
            }
        });

        if (focus) {
            tab.focus();
        }
    };

    root.querySelectorAll('.npcRealm__cityTabs[role="tablist"]').forEach((tablist) => {
        tablist.addEventListener('click', (event) => {
            const tab = event.target.closest('[data-npc-city-tab]');
            if (tab && !tab.hidden) {
                activateCity(tab);
            }
        });

        tablist.addEventListener('keydown', (event) => {
            const tabs = getCityTabs(tablist).filter((tab) => !tab.hidden);
            const currentIndex = tabs.indexOf(document.activeElement);
            if (currentIndex < 0 || !tabs.length) {
                return;
            }

            let nextIndex = null;
            if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
            if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = tabs.length - 1;

            if (nextIndex !== null) {
                event.preventDefault();
                activateCity(tabs[nextIndex], { focus: true });
            }
        });
    });


    // -----------------------------------------------------------------
    // 3. Colapsare panou regiune
    // -----------------------------------------------------------------
    root.querySelectorAll('[data-npc-collapse]').forEach((button) => {
        button.addEventListener('click', () => {
            const body = document.getElementById(button.getAttribute('aria-controls'));
            const isExpanded = button.getAttribute('aria-expanded') === 'true';

            button.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
            if (body) {
                body.hidden = isExpanded;
            }
        });
    });


    // -----------------------------------------------------------------
    // 4 + 5. Search + filtru badge (combinate)
    // -----------------------------------------------------------------
    const searchInput = root.querySelector('[data-npc-search]');
    const filterToggle = root.querySelector('[data-npc-filter-toggle]');
    const filterMenu = root.querySelector('[data-npc-filter-menu]');
    const badgeInputs = Array.from(root.querySelectorAll('[data-npc-filter-badge]'));
    const emptyMessage = root.querySelector('[data-npc-empty]');
    const regionPanels = Array.from(root.querySelectorAll('[data-npc-region]'));

    function applyFilters() {
        const query = normalizeText(searchInput ? searchInput.value : '');
        const allowedBadges = new Set(
            badgeInputs.filter((input) => input.checked).map((input) => input.value)
        );
        const isFiltering = Boolean(query) || allowedBadges.size !== badgeInputs.length;
        let totalMatches = 0;

        regionPanels.forEach((regionPanel) => {
            const tablist = regionPanel.querySelector('[role="tablist"]');
            const cityTabs = tablist ? getCityTabs(tablist) : [];
            let regionMatches = 0;
            let firstMatchingTab = null;

            cityTabs.forEach((cityTab) => {
                const panel = document.getElementById(cityTab.getAttribute('aria-controls'));
                const cards = panel ? Array.from(panel.querySelectorAll('[data-npc-card]')) : [];
                let cityMatches = 0;

                cards.forEach((card) => {
                    const haystack = normalizeText(`${card.dataset.name} ${card.dataset.profession}`);
                    const matches = (!query || haystack.includes(query)) &&
                        allowedBadges.has(card.dataset.badge);

                    card.hidden = !matches;
                    if (matches) {
                        cityMatches++;
                    }
                });

                // în modul filtrare ascundem orașele fără rezultate
                cityTab.hidden = isFiltering && cityMatches === 0;
                regionMatches += cityMatches;

                if (cityMatches > 0 && !firstMatchingTab) {
                    firstMatchingTab = cityTab;
                }
            });

            const inContinent = isInSelectedContinent(regionPanel);
            regionPanel.hidden = !inContinent || (isFiltering && regionMatches === 0);
            if (inContinent) {
                totalMatches += regionMatches;
            }

            // un oraș cu potriviri devine activ dacă cel curent nu mai are rezultate
            const activeTab = cityTabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
            if (isFiltering && firstMatchingTab && (!activeTab || activeTab.hidden)) {
                activateCity(firstMatchingTab);
            }

            // la ieșirea din filtrare, totul redevine vizibil, iar orașul activ rămâne
            if (!isFiltering && activeTab) {
                activateCity(activeTab);
            }
        });

        regionTabs.forEach((regionTab) => {
            const panel = document.getElementById(regionTab.getAttribute('aria-controls'));
            regionTab.hidden = Boolean(panel && panel.hidden);
        });

        if (emptyMessage) {
            // continentele fără regiuni au propriul mesaj; aici doar rezultatele filtrării
            const continentHasRegions = regionPanels.some(isInSelectedContinent);
            emptyMessage.hidden = totalMatches > 0 || !continentHasRegions || !isFiltering;
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    badgeInputs.forEach((input) => input.addEventListener('change', applyFilters));

    if (continentSelect) {
        continentSelect.addEventListener('change', activateContinent);
    }


    // popover filtru: Esc și click în afară îl închid
    const setFilterMenu = (open) => {
        if (!filterToggle || !filterMenu) {
            return;
        }
        filterMenu.hidden = !open;
        filterToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    if (filterToggle && filterMenu) {
        filterToggle.addEventListener('click', () => setFilterMenu(filterMenu.hidden));

        document.addEventListener('click', (event) => {
            if (!filterMenu.hidden && !event.target.closest('.npcRealm__filter')) {
                setFilterMenu(false);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !filterMenu.hidden) {
                setFilterMenu(false);
                filterToggle.focus();
            }
        });
    }
})();
