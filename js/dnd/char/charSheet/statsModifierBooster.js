(function (global) {
  function readSheetAbilityStats() {
    const dataElement = document.getElementById('sheet-ability-stats-data');
    if (!dataElement) {
      return {};
    }

    try {
      return JSON.parse(dataElement.textContent);
    } catch (error) {
      return {};
    }
  }

  function StatsModifierBooster(abilityName, abilityStats = readSheetAbilityStats()) {
    if (typeof abilityName !== 'string' || !abilityStats) {
      return null;
    }

    const stat = abilityStats[abilityName.trim().toUpperCase()];
    const rawScore = typeof stat === 'number' ? stat : stat?.value;
    if (rawScore === undefined || rawScore === null || rawScore === '') {
      return null;
    }

    const score = Number(rawScore);
    return Number.isFinite(score) ? Math.floor((score - 10) / 2) : null;
  }

  function readProficiencyLevel() {
    const skillsList = document.querySelector('.skills-list');
    return Number(skillsList?.dataset.proficiencyLevel) || 0;
  }

  function updateSkillModifiers() {
    const proficiencyLevel = readProficiencyLevel();

    document.querySelectorAll('.skill-row[data-ability-score]').forEach((row) => {
      const modifier = StatsModifierBooster(row.dataset.abilityScore);
      const valueElement = row.querySelector('.skill-row__value');

      if (modifier === null || !valueElement) {
        return;
      }

      const totalModifier = modifier + (row.classList.contains('skill-row--proficient') ? proficiencyLevel : 0);
      const displayedModifier = totalModifier >= 0 ? `+${totalModifier}` : String(totalModifier);
      valueElement.textContent = displayedModifier;
      valueElement.value = `1d20+0;${displayedModifier}`;
    });
  }

  function updateSavingThrowModifiers() {
    const proficiencyLevel = readProficiencyLevel();

    document.querySelectorAll('.saving-throw-row').forEach((row) => {
      const statElement = row.querySelector('.saving-throw-row__stat');
      const valueElement = row.querySelector('.saving-throw-row__value');
      const modifier = StatsModifierBooster(statElement?.textContent.trim());

      if (modifier === null || !valueElement) {
        return;
      }

      const totalModifier = modifier + (row.dataset.savingThrowProficient === 'true' ? proficiencyLevel : 0);
      valueElement.textContent = totalModifier >= 0 ? `+${totalModifier}` : String(totalModifier);
    });
  }

  function updateAllModifiers() {
    updateSkillModifiers();
    updateSavingThrowModifiers();
  }

  global.StatsModifierBooster = StatsModifierBooster;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAllModifiers);
  } else {
    updateAllModifiers();
  }
})(window);