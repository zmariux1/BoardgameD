document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;

  const slotButton = event.target.closest('.inventory-bag-equip-option');
  if (slotButton) {
    const form = slotButton.closest('.inventory-equipment-equip-form');
    const slotInput = form?.querySelector('input[name="whereEquiped"]');
    if (!form || !slotInput) return;

    slotInput.value = slotButton.dataset.slot || '';
    form.querySelectorAll('.inventory-bag-equip-option').forEach((button) => {
      if (button !== slotButton) button.remove();
    });

    form.requestSubmit();
    return;
  }

  const form = event.target.closest('.inventory-equipment-equip-form');
  if (!form) return;

  const options = form.querySelector('.inventory-bag-equip-options');
  const toggleButton = form.querySelector('.inventory-bag-equip-toggle');
  if (!options || !toggleButton) return;

  options.hidden = !options.hidden;
  toggleButton.setAttribute('aria-expanded', String(!options.hidden));
  toggleButton.textContent = options.hidden ? '›' : '⌄';
});
