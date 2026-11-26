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
    'buy-items': 'shop'
  };

  const backTargets = {
    'item-list': 'welcome',
    'create-item': 'welcome',
    'price-manipulation': 'welcome',
    'shop': 'welcome',
    'buy-items': 'shop'
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

  showScreen('welcome');
})();
