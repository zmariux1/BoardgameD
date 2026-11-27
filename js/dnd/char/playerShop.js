(() => {
  const header = document.querySelector('.app-header');
  const leftButton = document.getElementById('header-left');
  const screens = [...document.querySelectorAll('[data-screen-content]')];
  const navItems = [...document.querySelectorAll('.bottom-nav__item')];
  const goButtons = [...document.querySelectorAll('[data-go]')];
  const createScreen = document.querySelector('[data-screen-content="create-item"]');
  const createForm = document.getElementById('create-item-form');
  const uploadInput = document.getElementById('item-image-input');
  const uploadBox = document.getElementById('upload-box');

  let activeScreen = 'welcome';

  const navForScreen = {
    welcome: 'shop',
    shop: 'shop',
    'item-list': 'shop',
    'create-item': 'create',
    'price-manipulation': 'shop',
    'buy-items': 'shop',
    'create-shop': 'shop'
  };

  const backTargets = {
    'item-list': 'welcome',
    'create-item': 'welcome',
    'price-manipulation': 'welcome',
    'shop': 'welcome',
    'buy-items': 'shop',
    'create-shop': 'welcome'
  };

  function showScreen(name) {
    if (!screens.some((screen) => screen.dataset.screenContent === name)) return;
    activeScreen = name;
    screens.forEach((screen) => {
      screen.classList.toggle('is-hidden', screen.dataset.screenContent !== name);
    });
    header.dataset.screen = name;
    document.querySelector('.app-main').scrollTop = 0;

    const activeNav = navForScreen[name];
    navItems.forEach((item) => item.classList.toggle('is-active', item.dataset.nav === activeNav));
  }

  leftButton.addEventListener('click', () => {
    const target = backTargets[activeScreen];
    if (target) showScreen(target);
  });

  goButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = button.dataset.go;
      if (!target) {
        event.preventDefault();
        return;
      }
      showScreen(target);
    });
  });

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const target = item.dataset.go;
      if (target) showScreen(target);
    });
  });

  document.querySelectorAll('.filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const owner = tab.closest('.screen');
      const listId = tab.dataset.list;
      const list = listId ? document.getElementById(listId) : owner?.querySelector('.item-list');
      const tabs = owner ? owner.querySelectorAll('.filter-tab') : document.querySelectorAll('.filter-tab');
      tabs.forEach((item) => item.classList.remove('is-active'));
      tab.classList.add('is-active');
      const filter = tab.dataset.filter;
      list?.querySelectorAll('.item-row').forEach((row) => {
        row.hidden = filter !== 'all' && row.dataset.type !== filter;
      });
    });
  });

  const buyList = document.getElementById('buy-list');
  const buySearch = document.getElementById('buy-search');
  const buyCategory = document.getElementById('buy-category');
  const buyEmptyState = document.getElementById('buy-empty-state');

  if (buyList && buySearch && buyCategory && buyEmptyState) {
    const buyRows = [...buyList.querySelectorAll('.buy-item-row')];
    const filterBuyItems = () => {
      const searchTerm = buySearch.value.trim().toLowerCase();
      const selectedCategory = buyCategory.value;
      let visibleCount = 0;

      buyRows.forEach((row) => {
        const itemText = row.querySelector('.item-meta')?.textContent.toLowerCase() || '';
        const matchesSearch = itemText.includes(searchTerm);
        const matchesCategory = selectedCategory === 'all' || row.dataset.type === selectedCategory;
        row.hidden = !(matchesSearch && matchesCategory);
        if (!row.hidden) visibleCount += 1;
      });

      buyEmptyState.hidden = visibleCount > 0;
    };

    buySearch.addEventListener('input', filterBuyItems);
    buyCategory.addEventListener('change', filterBuyItems);
    filterBuyItems();
  }

  document.addEventListener('click', (event) => {
    const remove = event.target.closest('.remove-row');
    if (remove) remove.closest('.tag-row')?.remove();

    const add = event.target.closest('[data-add]');
    if (!add) return;
    const type = add.dataset.add;
    if (type === 'spell') {
      const row = document.createElement('div');
      row.className = 'tag-row';
      row.innerHTML = '<span class="tag-dot">◉</span><span>Magic Missile</span><button type="button" class="remove-row" aria-label="Remove Magic Missile">×</button>';
      document.getElementById('spell-list').appendChild(row);
    }
    if (type === 'bonus') {
      const row = document.createElement('div');
      row.className = 'tag-row';
      row.innerHTML = '<span class="tag-dot">◉</span><span>+1 Attack</span><button type="button" class="remove-row" aria-label="Remove +1 Attack">×</button>';
      document.getElementById('bonus-list').appendChild(row);
    }
    if (type === 'curse') {
      const row = document.createElement('div');
      row.className = 'tag-row';
      row.innerHTML = '<span class="tag-dot">◉</span><span>Whispering Curse</span><button type="button" class="remove-row" aria-label="Remove Whispering Curse">×</button>';
      document.getElementById('curse-list').appendChild(row);
    }
  });

  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files?.[0];
    if (!file) return;
    uploadBox.innerHTML = `<span class="upload-box__icon">✓</span><span>${file.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}<br>selected</span>`;
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    uploadBox.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadBox.classList.add('is-dragging');
    });
  });
  ['dragleave', 'drop'].forEach((eventName) => {
    uploadBox.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadBox.classList.remove('is-dragging');
    });
  });
  uploadBox.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    uploadInput.files = dt.files;
    uploadInput.dispatchEvent(new Event('change'));
  });

  createForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = createForm.querySelector('.primary-button');
    const original = button.textContent;
    button.textContent = 'Item Ready';
    setTimeout(() => { button.textContent = original; }, 900);
  });

  function bindModifier(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const value = document.getElementById(valueId);
    if (!slider || !value) return;

    const render = () => {
      const number = Number(slider.value);
      value.textContent = `${number >= 0 ? '+ ' : '- '}${Math.abs(number)}%`;
      const min = Number(slider.min);
      const max = Number(slider.max);
      const ratio = ((number - min) / (max - min)) * 100;
      slider.style.background = `linear-gradient(90deg, #24231f 0%, #24231f ${ratio}%, #c9b997 ${ratio}%, #c9b997 100%)`;
    };

    slider.addEventListener('input', render);
    render();
  }

  bindModifier('sell-price-slider', 'sell-price-value');
  bindModifier('buy-price-slider', 'buy-price-value');

  // ==================== CREATE SHOP (DM) ====================
  const shopForm = document.getElementById('create-shop-form');

  if (shopForm) {
    // Checkbox with data-reveal="<id>" shows/hides that block.
    // Fields inside a hidden block are disabled so they are not submitted.
    const revealToggles = [...shopForm.querySelectorAll('[data-reveal]')];
    const syncReveal = (toggle) => {
      const target = document.getElementById(toggle.dataset.reveal);
      if (!target) return;
      target.hidden = !toggle.checked;
      target.querySelectorAll('input, select, textarea').forEach((field) => { field.disabled = !toggle.checked; });
    };
    revealToggles.forEach((toggle) => {
      toggle.addEventListener('change', () => syncReveal(toggle));
      syncReveal(toggle);
    });

    // Trade mode: only one of only buy / only sell / absolute variants.
    // Shop (DM) perspective. Absolute modes remove the opposite option entirely.
    const buyToggle = document.getElementById('trade-buy');
    const sellToggle = document.getElementById('trade-sell');
    const tradeHelp = document.getElementById('trade-mode-help');
    const tradeModes = [...shopForm.querySelectorAll('[data-exclusive="trade-mode"]')];
    const tradeHelpText = {
      none: 'Shop buys and sells at normal prices.',
      'only-buy': 'Shop prefers buying. Selling allowed only via hassle (×2 cost).',
      'only-sell': 'Shop prefers selling. Buying allowed only via hassle (×2 cost).',
      'absolute-only-buy': 'Shop only buys. Selling is disabled.',
      'absolute-only-sell': 'Shop only sells. Buying is disabled.'
    };
    const applyTradeMode = () => {
      const mode = tradeModes.find((input) => input.checked)?.value || 'none';
      const lockSell = mode === 'absolute-only-buy';
      const lockBuy = mode === 'absolute-only-sell';
      if (lockBuy) buyToggle.checked = false;
      if (lockSell) sellToggle.checked = false;
      if (buyToggle.disabled && !lockBuy) buyToggle.checked = true;
      if (sellToggle.disabled && !lockSell) sellToggle.checked = true;
      buyToggle.disabled = lockBuy;
      sellToggle.disabled = lockSell;
      tradeHelp.textContent = tradeHelpText[mode];
    };
    tradeModes.forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) tradeModes.forEach((other) => { if (other !== input) other.checked = false; });
        applyTradeMode();
      });
    });
    applyTradeMode();

    // Town list follows the selected continent.
    const continentSelect = document.getElementById('shop-continent');
    const townSelect = document.getElementById('shop-town');
    const filterTowns = () => {
      const continent = continentSelect.value;
      let firstMatch = null;
      [...townSelect.options].forEach((option) => {
        const matches = option.dataset.continent === continent;
        option.hidden = !matches;
        option.disabled = !matches;
        if (matches && !firstMatch) firstMatch = option;
      });
      if (townSelect.selectedOptions[0]?.disabled && firstMatch) firstMatch.selected = true;
    };
    continentSelect.addEventListener('change', filterTowns);
    filterTowns();

    // "+ New NPC" reveals name, race, personality, appearance.
    const npcSelect = document.getElementById('shop-npc');
    const newNpcField = document.getElementById('new-npc-field');
    const newNpcName = document.getElementById('new-npc-name');
    const toggleNewNpc = (focus) => {
      const isNew = npcSelect.value === 'new';
      newNpcField.hidden = !isNew;
      newNpcName.required = isNew;
      if (isNew && focus) newNpcName.focus();
    };
    npcSelect.addEventListener('change', () => toggleNewNpc(true));
    toggleNewNpc(false);

    // Likes / dislikes: a character can be picked only once across both lists.
    const charSelects = () => [...shopForm.querySelectorAll('[data-char-pick]')];
    const syncCharPicks = () => {
      const selects = charSelects();
      const taken = selects.map((select) => select.value).filter(Boolean);
      selects.forEach((select) => {
        [...select.options].forEach((option) => {
          if (!option.value) return;
          const usedElsewhere = option.value !== select.value && taken.includes(option.value);
          option.disabled = usedElsewhere;
          option.hidden = usedElsewhere;
        });
      });
    };
    const hasFreeCharacter = () => {
      const first = charSelects()[0];
      if (!first) return false;
      const taken = charSelects().map((select) => select.value).filter(Boolean);
      return [...first.options].some((option) => option.value && !taken.includes(option.value));
    };
    shopForm.addEventListener('change', (event) => {
      if (event.target.matches('[data-char-pick]')) syncCharPicks();
    });

    // Repeatable rows (char affiliation, trades with):
    // "+" clones the row, the clicked button becomes "×" (remove).
    const setRowIndex = (row, index) => {
      row.querySelectorAll('[name]').forEach((field) => {
        field.name = field.name.replace(/[d+]/, `[${index}]`);
      });
    };
    shopForm.addEventListener('click', (event) => {
      const button = event.target.closest('[data-repeat-action]');
      if (!button) return;
      const row = button.closest('.repeat-row');
      const list = row.parentElement;

      if (button.dataset.repeatAction === 'remove') {
        row.remove();
        [...list.children].forEach(setRowIndex);
        syncCharPicks();
        return;
      }

      const isCharPick = !!row.querySelector('[data-char-pick]');
      if (isCharPick && !hasFreeCharacter()) return; // every character already used

      const clone = row.cloneNode(true);
      setRowIndex(clone, list.children.length); // rename before insert so radios stay separate
      clone.querySelectorAll('select').forEach((select) => {
        [...select.options].forEach((option) => { option.selected = option.defaultSelected; });
      });
      clone.querySelectorAll('input[type="radio"]').forEach((radio) => { radio.checked = radio.defaultChecked; });
      list.appendChild(clone);

      button.dataset.repeatAction = 'remove';
      button.textContent = '×';
      button.setAttribute('aria-label', 'Remove row');
      clone.querySelector('select')?.focus();
      if (isCharPick) syncCharPicks();
    });

    // New NPC portrait: file is only picked here, uploaded with the form submit.
    const npcImage = document.getElementById('new-npc-image');
    const npcImageLabel = document.getElementById('new-npc-image-label');
    const npcImageCheck = document.getElementById('new-npc-image-check');
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
    npcImage.addEventListener('change', () => {
      const file = npcImage.files?.[0];
      const isValid = !!file && ALLOWED_IMAGE_TYPES.includes(file.type) && /.(jpe?g|png)$/i.test(file.name);
      if (file && !isValid) npcImage.value = '';
      npcImageCheck.hidden = !isValid;
      npcImageLabel.title = isValid ? file.name : '';
      npcImageLabel.textContent = isValid ? 'Change image' : file ? 'JPG / PNG only' : '+ Add image';
    });

    // Purchase power presets fill the gold input; typing highlights a matching preset.
    const purchasePower = document.getElementById('npc-purchase-power');
    const goldPresets = [...shopForm.querySelectorAll('[data-gold]')];
    const syncGoldPresets = () => {
      goldPresets.forEach((preset) => preset.classList.toggle('is-active', preset.dataset.gold === purchasePower.value));
    };
    goldPresets.forEach((preset) => {
      preset.addEventListener('click', () => {
        purchasePower.value = preset.dataset.gold;
        syncGoldPresets();
      });
    });
    purchasePower.addEventListener('input', syncGoldPresets);
    syncGoldPresets();

    bindModifier('god-slider', 'god-value');

    // Estimated total price modifier (DM-set factors only).
    const OWNER_VIBE_MODIFIER = { angry: 15, greedy: 10, neutral: 0, 'good-mood': -5, generous: -10 };
    const ECONOMY_VIBE_MODIFIER = 5; // current cumulated vibe: Slight increase
    const totalValue = document.getElementById('price-total-value');
    const totalBreakdown = document.getElementById('price-total-breakdown');
    const godSlider = document.getElementById('god-slider');
    const ownerVibe = document.getElementById('owner-vibe');
    const tolerance = document.getElementById('negotiation-tolerance');
    const factorOn = (value) => !!shopForm.querySelector(`[name="priceFactors"][value="${value}"]`)?.checked;
    const formatPercent = (number) => `${number >= 0 ? '+ ' : '- '}${Math.abs(number)}%`;

    const renderTotal = () => {
      const rows = [];
      if (factorOn('god-intervention')) rows.push(['God intervention', Number(godSlider.value)]);
      if (factorOn('owner-vibe')) rows.push([`Owner vibe · ${ownerVibe.selectedOptions[0].text}`, OWNER_VIBE_MODIFIER[ownerVibe.value] || 0]);
      if (factorOn('economy-vibe')) rows.push(['Global economy vibe', ECONOMY_VIBE_MODIFIER]);
      if (factorOn('negotiation-tolerance')) rows.push(['Negotiation tolerance', `+${tolerance.value} pt / attempt`]);
      if (factorOn('hassle-only-trade')) rows.push(['Hassle vs only buy / sell', '×2 opposite']);

      const total = rows.reduce((sum, [, value]) => sum + (typeof value === 'number' ? value : 0), 0);
      totalValue.textContent = formatPercent(total);

      totalBreakdown.replaceChildren();
      if (!rows.length) rows.push(['No DM-set price factors selected', '']);
      rows.forEach(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'economy-row';
        const tone = typeof value !== 'number' || value === 0 ? '#8f8670' : value > 0 ? '#b0552d' : '#5d8a45';
        row.style.setProperty('--tone', tone);
        const dot = document.createElement('span');
        dot.className = 'economy-dot';
        const name = document.createElement('span');
        name.textContent = label;
        const amount = document.createElement('em');
        amount.textContent = typeof value === 'number' ? formatPercent(value) : value;
        row.append(dot, name, amount);
        totalBreakdown.appendChild(row);
      });
    };
    shopForm.addEventListener('input', renderTotal);
    shopForm.addEventListener('change', renderTotal);
    renderTotal();

    // Negotiation dice: each tier's minimum is the previous tier's value.
    const DICE_FLOOR = 12;
    const dice = ['min', 'mid', 'max'].map((key) => ({
      input: document.getElementById(`dice-${key}`),
      hint: document.getElementById(`dice-${key}-hint`),
      floorInput: document.getElementById(`dice-${key}-floor`)
    }));

    const syncDice = (clamp) => {
      let floor = DICE_FLOOR;
      dice.forEach(({ input, hint, floorInput }) => {
        let value = Number(input.value);
        if (clamp && (!Number.isFinite(value) || value < floor)) {
          value = floor;
          input.value = floor;
        }
        input.min = floor;
        floorInput.value = floor;
        hint.textContent = `Min ${floor}`;
        input.closest('.dice-field').classList.toggle('is-invalid', !(value >= floor));
        floor = Math.max(floor, Number.isFinite(value) ? value : floor);
      });
    };

    dice.forEach(({ input }) => {
      input.addEventListener('input', () => syncDice(false));
      input.addEventListener('change', () => syncDice(true));
    });
    syncDice(false);

    shopForm.addEventListener('submit', (event) => {
      event.preventDefault();
      syncDice(true);
      const button = shopForm.querySelector('.primary-button');
      const original = button.textContent;
      button.textContent = 'Shop Ready';
      setTimeout(() => { button.textContent = original; }, 900);
    });
  }

  showScreen('welcome');
})();
