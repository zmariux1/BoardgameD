const {
  loadLevelsFromJson,
  loadSpellsFromJson
} = require("../jsonLoaders/JsonPathMiddleware");

const normalizeIndex = (value) => String(value || "").trim().toLowerCase();

const getSpellFormulaInfo = (spell, slotLevel) => {
  const damageAtSlotLevel = spell?.damage?.damage_at_slot_level;
  const healingAtSlotLevel = spell?.heal_at_slot_level;
  const requestedLevel = Number(slotLevel);
  const hasRequestedLevel = Number.isInteger(requestedLevel);
  const damageAmount = hasRequestedLevel
    ? damageAtSlotLevel?.[requestedLevel]
    : damageAtSlotLevel?.[Object.keys(damageAtSlotLevel || {}).sort((a, b) => Number(a) - Number(b))[0]];
  const healingAmount = hasRequestedLevel
    ? healingAtSlotLevel?.[requestedLevel]
    : healingAtSlotLevel?.[Object.keys(healingAtSlotLevel || {}).sort((a, b) => Number(a) - Number(b))[0]];

  if (damageAmount !== undefined) {
    return { amount: String(damageAmount).trim(), type: "damage" };
  }
  if (healingAmount !== undefined) {
    return { amount: String(healingAmount).trim(), type: "healing" };
  }

  const damageByCharacterLevel = spell?.damage?.damage_at_character_level;
  const healingByCharacterLevel = spell?.heal_at_character_level;
  const characterLevelAmount = damageByCharacterLevel
    ? Object.values(damageByCharacterLevel)[0]
    : healingByCharacterLevel
      ? Object.values(healingByCharacterLevel)[0]
      : "";

  if (characterLevelAmount !== "") {
    return {
      amount: String(characterLevelAmount).trim(),
      type: damageByCharacterLevel ? "damage" : "healing"
    };
  }

  return {
    amount: typeof spell?.damage?.damage_at_slot_level === "string"
      ? spell.damage.damage_at_slot_level.trim()
      : "",
    type: "damage"
  };
};

const getCharacterSelectedSubclassIndexes = (character, characterClass) => {
  const indexes = [
    character?.subclass?.index,
    ...(Array.isArray(character?.subclass?.abilities)
      ? character.subclass.abilities.map((ability) => ability?.optionIndex)
      : []),
    ...(Array.isArray(characterClass?.abilities)
      ? characterClass.abilities.map((ability) => ability?.optionIndex)
      : [])
  ];

  return new Set(indexes.map(normalizeIndex).filter(Boolean));
};

const getSpellcastingClassForSpell = (spell, character, classesCatalog) => {
  const selectedClasses = Array.isArray(character?.classes) ? character.classes : [];
  const spellClassIndexes = new Set(
    (Array.isArray(spell?.classes) ? spell.classes : [])
      .map((spellClass) => normalizeIndex(spellClass?.index))
      .filter(Boolean)
  );
  const spellSubclassIndexes = new Set(
    (Array.isArray(spell?.subclasses) ? spell.subclasses : [])
      .map((spellSubclass) => normalizeIndex(spellSubclass?.index))
      .filter(Boolean)
  );

  const directClass = selectedClasses.find((selectedClass) =>
    spellClassIndexes.has(normalizeIndex(selectedClass?.index))
  );
  if (directClass) {
    return (Array.isArray(classesCatalog) ? classesCatalog : []).find((classData) =>
      normalizeIndex(classData?.index) === normalizeIndex(directClass.index)
    ) || null;
  }

  for (const selectedClass of selectedClasses) {
    const classIndex = normalizeIndex(selectedClass?.index);
    const classData = (Array.isArray(classesCatalog) ? classesCatalog : []).find(
      (entry) => normalizeIndex(entry?.index) === classIndex
    );
    if (!classData) {
      continue;
    }

    const selectedSubclassIndexes = getCharacterSelectedSubclassIndexes(character, selectedClass);
    const matchingSubclass = (Array.isArray(classData.subclasses) ? classData.subclasses : [])
      .some((subclass) => {
        const subclassIndex = normalizeIndex(subclass?.index);
        return selectedSubclassIndexes.has(subclassIndex) && spellSubclassIndexes.has(subclassIndex);
      });

    if (matchingSubclass) {
      return classData;
    }
  }

  return null;
};

const resolveSpellDamageFormula = (spell, character, classesCatalog, abilityStats, slotLevel) => {
  const formula = getSpellFormulaInfo(spell, slotLevel).amount;
  if (!formula) {
    return null;
  }
  if (!/\bMOD\b/i.test(formula)) {
    return formula;
  }

  const classData = getSpellcastingClassForSpell(spell, character, classesCatalog);
  const abilityIndex = normalizeIndex(classData?.spellcasting?.spellcasting_ability?.index).toUpperCase();
  const calculatedModifiers = abilityStats?.calculatedModifiers;
  const abilityScore = abilityStats?.AllStats?.[abilityIndex] ?? abilityStats?.[abilityIndex];
  const modifier = calculatedModifiers?.[abilityIndex] !== undefined
    ? Number(calculatedModifiers[abilityIndex])
    : Number.isFinite(Number(abilityScore))
      ? Math.floor((Number(abilityScore) - 10) / 2)
      : NaN;

  if (!Number.isInteger(modifier)) {
    return null;
  }

  return formula
    .replace(/([+-]?)\s*MOD\b/gi, (match, sign, offset) => {
      const signedModifier = modifier * (sign === "-" ? -1 : 1);
      if (offset === 0) {
        return String(signedModifier);
      }
      return signedModifier < 0
        ? ` - ${Math.abs(signedModifier)}`
        : ` + ${signedModifier}`;
    })
    .replace(/\s*([+-])\s*/g, " $1 ")
    .trim();
};

const getSpellSlotLevels = (spell, spellSlotsByLevel) => {
  const damageAtSlotLevel = spell?.damage?.damage_at_slot_level;
  const healingAtSlotLevel = spell?.heal_at_slot_level;
  const hasSlotScaling = (
    damageAtSlotLevel && typeof damageAtSlotLevel === "object"
  ) || (
    healingAtSlotLevel && typeof healingAtSlotLevel === "object"
  );

  if (!hasSlotScaling) {
    const baseLevel = Number(spell?.level);
    return Number.isInteger(baseLevel) && baseLevel >= 0 && baseLevel <= 9
      ? [baseLevel]
      : [];
  }

  const baseLevel = Number(spell?.level);
  const slotLevels = new Set([
    ...Object.keys(damageAtSlotLevel || {}),
    ...Object.keys(healingAtSlotLevel || {})
  ]);

  return Array.from(slotLevels)
    .map(Number)
    .filter((slotLevel) =>
      Number.isInteger(slotLevel) &&
      slotLevel >= Math.max(1, baseLevel || 0) &&
      slotLevel <= 9 &&
      Number(spellSlotsByLevel?.[slotLevel]?.available) > 0 &&
      (
        damageAtSlotLevel?.[slotLevel] !== undefined ||
        healingAtSlotLevel?.[slotLevel] !== undefined
      )
    )
    .sort((first, second) => first - second);
};

const getCharacterSpellcastingRows = (character, levelsCatalog) => {
  const selectedCharacterClasses = Array.isArray(character?.classes)
    ? character.classes
    : [];

  return selectedCharacterClasses.flatMap((characterClass) => {
    const classIndex = String(characterClass?.index || "").trim().toLowerCase();
    const classLevel = Number(characterClass?.level);

    if (!classIndex || !Number.isInteger(classLevel) || classLevel <= 0) {
      return [];
    }

    const classLevelData = levelsCatalog.find((levelData) =>
      String(levelData?.class?.index || "").trim().toLowerCase() === classIndex &&
      Number(levelData.level) === classLevel
    );
    const spellcasting = classLevelData?.spellcasting;

    return spellcasting && typeof spellcasting === "object"
      ? [{ classIndex, spellcasting }]
      : [];
  });
};

const getCharacterSpellSlots = (
  character,
  { levelsCatalog = loadLevelsFromJson() } = {}
) => {
  const spellSlotsByLevel = Object.fromEntries(
    Array.from({ length: 10 }, (_, spellLevel) => [
      spellLevel,
      { available: spellLevel === 0 ? null : 0, consumed: 0 }
    ])
  );

  getCharacterSpellcastingRows(character, levelsCatalog).forEach(({ spellcasting }) => {
    for (let spellLevel = 1; spellLevel <= 9; spellLevel += 1) {
      const count = Number(spellcasting[`spell_slots_level_${spellLevel}`] || 0);
      if (Number.isFinite(count) && count > 0) {
        spellSlotsByLevel[spellLevel].available += count;
      }
    }
  });

  (Array.isArray(character?.SpellSlots) ? character.SpellSlots : []).forEach((slot) => {
    const spellLevel = Number(slot?.level);
    const consumed = Number(slot?.consumed);

    if (
      Number.isInteger(spellLevel) &&
      spellLevel >= 1 &&
      spellLevel <= 9 &&
      Number.isInteger(consumed) &&
      consumed > 0
    ) {
      spellSlotsByLevel[spellLevel].consumed += consumed;
    }
  });

  return spellSlotsByLevel;
};

const adjustCharacterSpellSlots = (
  character,
  spellLevel,
  delta,
  { levelsCatalog = loadLevelsFromJson() } = {}
) => {
  if (
    !Number.isInteger(spellLevel) ||
    spellLevel < 1 ||
    spellLevel > 9 ||
    ![-1, 1].includes(delta)
  ) {
    return { valid: false, changed: false };
  }

  const slots = getCharacterSpellSlots(character, { levelsCatalog })[spellLevel];
  if (slots.available <= 0) {
    return { valid: true, changed: false, consumed: 0 };
  }

  const currentConsumed = Math.min(slots.available, slots.consumed);
  const nextConsumed = Math.max(0, Math.min(slots.available, currentConsumed + delta));
  const changed = nextConsumed !== slots.consumed;
  const existingSlots = Array.isArray(character?.SpellSlots) ? character.SpellSlots : [];

  character.SpellSlots = [
    ...existingSlots.filter((slot) => Number(slot?.level) !== spellLevel),
    ...(nextConsumed > 0 ? [{ level: spellLevel, consumed: nextConsumed }] : [])
  ];

  return { valid: true, changed, consumed: nextConsumed };
};

const getCharacterSpells = (
  character,
  {
    levelsCatalog = loadLevelsFromJson(),
    spellsCatalog = loadSpellsFromJson()
  } = {}
) => {
  const eligibleClassIndexes = new Set();

  getCharacterSpellcastingRows(character, levelsCatalog).forEach(({ classIndex, spellcasting }) => {
    for (let spellLevel = 0; spellLevel <= 9; spellLevel += 1) {
      const availableCount = spellLevel === 0
        ? Number(spellcasting.cantrips_known || 0)
        : Number(spellcasting[`spell_slots_level_${spellLevel}`] || 0);

      if (Number.isFinite(availableCount) && availableCount > 0) {
        eligibleClassIndexes.add(`${classIndex}:${spellLevel}`);
      }
    }
  });

  const uniqueSpells = new Map();
  spellsCatalog.forEach((spell) => {
    if (!spell || typeof spell !== "object") {
      return;
    }

    const spellLevel = Number(spell.level);
    if (!Number.isInteger(spellLevel) || spellLevel < 0 || spellLevel > 9) {
      return;
    }

    const spellClasses = Array.isArray(spell.classes) ? spell.classes : [];
    const isEligible = spellClasses.some((spellClass) => {
      const classIndex = String(spellClass?.index || "").trim().toLowerCase();
      return eligibleClassIndexes.has(`${classIndex}:${spellLevel}`);
    });

    const spellIndex = String(spell.index || "").trim();
    if (isEligible && spellIndex) {
      uniqueSpells.set(spellIndex, spell);
    }
  });

  return Array.from(uniqueSpells.values());
};

module.exports = {
  adjustCharacterSpellSlots,
  getCharacterSpellSlots,
  getCharacterSpells,
  getSpellFormulaInfo,
  getSpellSlotLevels,
  resolveSpellDamageFormula
};
