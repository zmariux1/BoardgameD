const CustomItem = require("../../../models/dnd/customItemsModel");
const {
  loadRacesFromJson,
  loadSubracesFromJson
} = require("../jsonLoaders/JsonPathMiddleware");

const ABILITY_KEYS = ["CON", "STR", "DEX", "WIS", "INT", "CHA"];
const ABILITY_KEY_SET = new Set(ABILITY_KEYS);

const createEmptyScores = () =>
  Object.fromEntries(ABILITY_KEYS.map((key) => [key, 0]));

const toNumber = (value) => {
  if (typeof value === "string") {
    value = value.trim().replace(/^\+/, "");
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeAbilityKey = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  const aliases = {
    STRENGTH: "STR",
    DEXTERITY: "DEX",
    CONSTITUTION: "CON",
    INTELLIGENCE: "INT",
    WISDOM: "WIS",
    CHARISMA: "CHA"
  };
  const key = aliases[normalized] || normalized;
  return ABILITY_KEY_SET.has(key) ? key : null;
};

const findByIndex = (catalog, index) => {
  const normalizedIndex = String(index || "").trim().toLowerCase();
  return (Array.isArray(catalog) ? catalog : []).find((entry) =>
    String(entry && entry.index || "").trim().toLowerCase() === normalizedIndex
  ) || null;
};

const addBonus = (scores, ability, value) => {
  const key = normalizeAbilityKey(ability);
  if (key) {
    scores[key] += toNumber(value);
  }
};

const addCatalogBonuses = (scores, entry) => {
  (Array.isArray(entry && entry.ability_bonuses) ? entry.ability_bonuses : [])
    .forEach((bonus) => {
      addBonus(scores, bonus && bonus.ability_score && bonus.ability_score.index, bonus && bonus.bonus);
    });
};

const addItemModifiers = (scores, modifiers) => {
  if (!modifiers || typeof modifiers !== "object" || Array.isArray(modifiers)) {
    return;
  }

  Object.entries(modifiers).forEach(([ability, value]) => {
    const modifierValue = value && typeof value === "object"
      ? value.value ?? value.bonus ?? value.modifier
      : value;
    addBonus(scores, ability, modifierValue);
  });
};

const calculateCharacterAbilityStats = (character, options = {}) => {
  const raceCatalog = options.raceCatalog || loadRacesFromJson();
  const subraceCatalog = options.subraceCatalog || loadSubracesFromJson();
  const customItems = Array.isArray(options.customItems) ? options.customItems : [];
  const bonusBreakdown = {
    race: createEmptyScores(),
    subrace: createEmptyScores(),
    feats: createEmptyScores(),
    items: createEmptyScores()
  };

  const selectedRace = findByIndex(raceCatalog, character && character.race && character.race.index);
  const selectedSubrace = findByIndex(subraceCatalog, character && character.race && character.race.subRace);
  addCatalogBonuses(bonusBreakdown.race, selectedRace);
  addCatalogBonuses(bonusBreakdown.subrace, selectedSubrace);

  (Array.isArray(character && character.classes) ? character.classes : []).forEach((classEntry) => {
    (Array.isArray(classEntry && classEntry.abilities) ? classEntry.abilities : []).forEach((ability) => {
      const abilityIndex = String(ability && ability.index || "").toLowerCase();
      const conditionId = String(ability && ability.conditionId || "").toLowerCase();
      const isFeatImprovement = abilityIndex.startsWith("feat-") && conditionId.startsWith("feat:");
      const isAbilityScoreImprovement = abilityIndex.includes("ability-score-improvement");

      if (isFeatImprovement || (isAbilityScoreImprovement && conditionId !== "feat")) {
        addBonus(bonusBreakdown.feats, ability && ability.optionIndex, ability && ability.value);
      }
    });
  });

  const customItemsByIndex = new Map(customItems.map((item) => [
    String(item && item.index || "").trim().toLowerCase(), item
  ]));
  (Array.isArray(character && character.inventory) ? character.inventory : [])
    .filter((item) => item && item.reference === "customItemsModel" && item.equiped)
    .forEach((inventoryItem) => {
      const customItem = customItemsByIndex.get(String(inventoryItem.index || "").trim().toLowerCase());
      addItemModifiers(
        bonusBreakdown.items,
        customItem && customItem.magic_item && customItem.magic_item.otherStats_modifiers
      );
    });

  const bonuses = createEmptyScores();
  Object.keys(bonusBreakdown).forEach((source) => {
    ABILITY_KEYS.forEach((key) => {
      bonuses[key] += bonusBreakdown[source][key];
    });
  });

  const base = createEmptyScores();
  const modifiers = createEmptyScores();
  const overwrite = createEmptyScores();
  (Array.isArray(character && character.abilityScores) ? character.abilityScores : [])
    .forEach((score) => {
      const key = normalizeAbilityKey(score && score.type);
      if (!key) {
        return;
      }
      base[key] = toNumber(score.value);
      modifiers[key] = toNumber(score.modifier);
      overwrite[key] = toNumber(score.overwrite);
    });

  const total_stat_with_bonuses = createEmptyScores();
  const AllStats = createEmptyScores();
  const calculatedModifiers = createEmptyScores();
  ABILITY_KEYS.forEach((key) => {
    total_stat_with_bonuses[key] = base[key] + bonuses[key] + modifiers[key];
    AllStats[key] = overwrite[key] > 0 ? overwrite[key] : total_stat_with_bonuses[key];
    calculatedModifiers[key] = Math.floor((AllStats[key] - 10) / 2);
  });

  return {
    ...AllStats,
    AllStats,
    total_stat_with_bonuses,
    calculatedModifiers,
    bonuses,
    base,
    modifiers,
    overwrite,
    bonusBreakdown
  };
};

const buildCharacterAbilityStats = async (character) => {
  const equippedCustomIndexes = Array.from(new Set(
    (Array.isArray(character && character.inventory) ? character.inventory : [])
      .filter((item) => item && item.reference === "customItemsModel" && item.equiped)
      .map((item) => String(item.index || "").trim())
      .filter(Boolean)
  ));
  const customItems = equippedCustomIndexes.length
    ? await CustomItem.find({ index: { $in: equippedCustomIndexes } }).lean()
    : [];

  return calculateCharacterAbilityStats(character, { customItems });
};

module.exports = {
  calculateCharacterAbilityStats,
  buildCharacterAbilityStats
};