const hpAdjustmentModal = document.getElementById('hpAdjustmentModal');

if (hpAdjustmentModal) {
  const hpAdjustmentForm = hpAdjustmentModal.querySelector('form');
  const hpAmountInput = hpAdjustmentModal.querySelector('#hpAdjustmentAmount');
  const currentHpValue = document.querySelector('.character-current-hp');
  const modalCurrentHpValue = hpAdjustmentModal.querySelector('.hp-modal__current-value');
  const modalCurrentHpSetting = hpAdjustmentModal.querySelector('.hp-modal__current-setting');
  const modalMaximumHpValue = hpAdjustmentModal.querySelector('.hp-modal__maximum-value');
  const hpProgressBar = hpAdjustmentModal.querySelector('.hp-bar');
  const hpProgressFill = hpAdjustmentModal.querySelector('.hp-bar__fill');
  const deathSavePanel = hpAdjustmentModal.querySelector('.hp-panel--death');
  const failedDeathSaveIcons = hpAdjustmentModal.querySelector('.hp-save-row:not(.hp-save-row--success) .hp-save-icons');
  const successfulDeathSaveIcons = hpAdjustmentModal.querySelector('.hp-save-row--success .hp-save-icons');
  let activeHpTrigger = null;

  const renderDeathSaveIcons = (container, count, iconClass, icon, label) => {
    if (!container) {
      return;
    }

    const activeCount = Number.isFinite(Number(count))
      ? Math.min(3, Math.max(0, Math.floor(Number(count))))
      : 0;
    container.replaceChildren();

    for (let index = 0; index < 3; index += 1) {
      const saveIcon = document.createElement('span');
      saveIcon.className = `${iconClass} ${index < activeCount ? 'is-active' : 'is-inactive'}`;
      saveIcon.setAttribute('aria-hidden', 'true');
      saveIcon.textContent = icon;
      container.append(saveIcon);
    }

    container.setAttribute('aria-label', `${activeCount} of 3 ${label}`);
  };

  const syncHpModal = () => {
    const currentHP = Number(currentHpValue?.textContent);
    const maximumHP = Number(document.querySelector('.character-maximum-hp')?.textContent);

    if (Number.isFinite(currentHP)) {
      if (modalCurrentHpValue) {
        modalCurrentHpValue.textContent = currentHP;
      }
      if (modalCurrentHpSetting) {
        modalCurrentHpSetting.value = currentHP;
      }
      if (hpProgressBar) {
        hpProgressBar.setAttribute('aria-valuenow', String(currentHP));
      }
      if (deathSavePanel) {
        deathSavePanel.hidden = currentHP > 0;
      }
    }

    if (Number.isFinite(maximumHP)) {
      if (modalMaximumHpValue) {
        modalMaximumHpValue.textContent = maximumHP;
      }
      if (hpProgressBar) {
        hpProgressBar.setAttribute('aria-valuemax', String(maximumHP));
      }
      if (hpProgressFill) {
        const percentage = maximumHP > 0 && Number.isFinite(currentHP)
          ? Math.min(100, Math.max(0, (currentHP / maximumHP) * 100))
          : 0;
        hpProgressFill.style.width = `${percentage}%`;
      }
    }
  };

  const closeHpAdjustmentModal = () => {
    hpAdjustmentModal.classList.remove('is-visible');
    hpAdjustmentModal.setAttribute('aria-hidden', 'true');
    activeHpTrigger = null;
  };

  document.addEventListener('click', (event) => {
    const closeButton = event.target.closest('[data-hp-close]');
    if (closeButton) {
      closeHpAdjustmentModal();
      return;
    }

    const hpTrigger = event.target.closest('.hp-adjustment-trigger');

    if (hpTrigger) {
      activeHpTrigger = hpTrigger;
      hpAmountInput.value = '';
      syncHpModal();
      hpAdjustmentModal.classList.add('is-visible');
      hpAdjustmentModal.setAttribute('aria-hidden', 'false');
      hpAmountInput.focus();
      return;
    }

    if (event.target === hpAdjustmentModal) {
      closeHpAdjustmentModal();
    }
  });

  hpAdjustmentForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!activeHpTrigger || !hpAdjustmentForm.reportValidity()) {
      return;
    }

    const submitButton = event.submitter;
    const action = submitButton && submitButton.value;
    const amount = Number(hpAmountInput.value);
    const buttons = Array.from(hpAdjustmentForm.querySelectorAll('button[type="submit"]'));

    buttons.forEach((button) => {
      button.disabled = true;
    });
    closeHpAdjustmentModal();

    try {
      const response = await fetch(hpAdjustmentModal.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, action })
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Punctele de viață nu au putut fi actualizate.');
      }

      if (currentHpValue) {
        currentHpValue.textContent = result.currentHP_left;
      }
      renderDeathSaveIcons(failedDeathSaveIcons, result.failedDeathSaves, 'hp-skull', '☠', 'failures');
      renderDeathSaveIcons(successfulDeathSaveIcons, result.successDeathSaves, 'hp-success', '✦', 'successes');
      syncHpModal();
    } catch (error) {
      console.error('[CHARACTER SHEET] HP update failed:', error);
      window.alert(error.message);
    } finally {
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && hpAdjustmentModal.classList.contains('is-visible')) {
      closeHpAdjustmentModal();
    }
  });
}
