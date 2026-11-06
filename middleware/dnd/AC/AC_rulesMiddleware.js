const mongoose = require("mongoose");
const path = require("path");
const DnD_Character = require("../../../models/dnd/charBuilderModel");
const {
  loadEquipmentCategoriesFromJson,
  loadEquipmentFromJson,
  loadFeatsFromJson,
  loadFeaturesFromJson,
  loadRacesFromJson,
  loadSpellsFromJson,
  loadSubracesFromJson,
  loadTraitsFromJson
} = require("../jsonLoaders/JsonPathMiddleware");
const { buildCharacterAbilityStats } = require("../stats/characterAbilityStats");

const AC_RULES = require(path.join(
  __dirname,
  "../../../data/data_accuracy/AC_with_no_armor.json"
));

const normalizeIndex = (value) => String(value || "").trim().toLowerCase();

const getCatalogs = () => ({
  equipmentCategories: loadEquipmentCategoriesFromJson(),
  equipment: loadEquipmentFromJson(),
  feats: loadFeatsFromJson(),
  features: loadFeaturesFromJson(),
  races: loadRacesFromJson(),
  spells: loadSpellsFromJson(),
  subraces: loadSubracesFromJson(),
  traits: loadTraitsFromJson()
});

const getRulesByGroup = (rules, group) => {
  const groupEntry = rules.find((entry) => entry && Array.isArray(entry[group]));
  return groupEntry ? groupEntry[group] : [];
};

const getSelectedFeatureIndexes = (character, features) => {
  const selectedClasses = Array.isArray(character && character.classes)
    ? character.classes
    : [];
  const indexes = new Set();

  selectedClasses.forEach((classEntry) => {
    const classIndex = normalizeIndex(classEntry && classEntry.index);
    const classLevel = Number(classEntry && classEntry.level);
    if (!classIndex || !Number.isFinite(classLevel)) {
      return;
    }

    features.forEach((feature) => {
      const featureClassIndex = normalizeIndex(feature && feature.class && feature.class.index);
      const featureLevel = Number(feature && feature.level);
      if (
        featureClassIndex === classIndex &&
        Number.isFinite(featureLevel) &&
        featureLevel <= classLevel
      ) {
        indexes.add(normalizeIndex(feature.index));
      }
    });

    (Array.isArray(classEntry && classEntry.abilities) ? classEntry.abilities : [])
      .forEach((ability) => {
        if (ability && ability.index) {
          indexes.add(normalizeIndex(ability.index));
        }
      });
  });

  return indexes;
};

const getSelectedFeatIndexes = (character, feats) => {
  const validFeatIndexes = new Set(feats.map((feat) => normalizeIndex(feat && feat.index)));
  const selected = new Set();

  (Array.isArray(character && character.classes) ? character.classes : [])
    .forEach((classEntry) => {
      (Array.isArray(classEntry && classEntry.abilities) ? classEntry.abilities : [])
        .forEach((ability) => {
          if (normalizeIndex(ability && ability.conditionId) !== "feat") {
            return;
          }

          const featIndex = normalizeIndex(ability.optionIndex);
          if (validFeatIndexes.has(featIndex)) {
            selected.add(featIndex);
          }
        });
    });

  return selected;
};

const getSelectedRaceTraitIndexes = (character, catalogs) => {
  const raceIndex = normalizeIndex(character && character.race && character.race.index);
  const subraceIndex = normalizeIndex(character && character.race && character.race.subRace);
  const race = catalogs.races.find((entry) => normalizeIndex(entry && entry.index) === raceIndex);
  const subrace = catalogs.subraces.find(
    (entry) => normalizeIndex(entry && entry.index) === subraceIndex
  );
  const traitIndexes = new Set();

  (Array.isArray(race && race.traits) ? race.traits : [])
    .concat(Array.isArray(subrace && subrace.racial_traits) ? subrace.racial_traits : [])
    .forEach((trait) => traitIndexes.add(normalizeIndex(trait && trait.index)));

  return traitIndexes;
};

const getEquippedItems = (character, catalogs) => {
  const equipmentByIndex = new Map(
    catalogs.equipment.map((equipment) => [normalizeIndex(equipment && equipment.index), equipment])
  );

  return (Array.isArray(character && character.inventory) ? character.inventory : [])
    .filter((item) => item && item.equiped)
    .map((item) => ({
      index: normalizeIndex(item.index),
      equipment: item.reference === "5e-SRD-Equipment"
        ? equipmentByIndex.get(normalizeIndex(item.index))
        : null
    }));
};

const getCategoryIndexesForEquipment = (equipment, categories) => {
  const directCategory = normalizeIndex(
    equipment && equipment.equipment_category && equipment.equipment_category.index
  );
  const categoryIndexes = new Set(directCategory ? [directCategory] : []);

  categories.forEach((category) => {
    if (
      Array.isArray(category && category.equipment) &&
      category.equipment.some(
        (item) => normalizeIndex(item && item.index) === normalizeIndex(equipment && equipment.index)
      )
    ) {
      categoryIndexes.add(normalizeIndex(category.index));
    }
  });

  return categoryIndexes;
};

const equipmentMatchesCondition = (equippedItems, condition, catalogs) => {
  const targetIndex = normalizeIndex(condition.index);
  return equippedItems.some(({ index, equipment }) => {
    if (index === targetIndex) {
      return true;
    }
    if (!equipment) {
      return false;
    }

    return getCategoryIndexesForEquipment(equipment, catalogs.equipmentCategories)
      .has(targetIndex);
  });
};

const makeConditionMatcher = (character, catalogs) => {
  const featureIndexes = getSelectedFeatureIndexes(character, catalogs.features);
  const featIndexes = getSelectedFeatIndexes(character, catalogs.feats);
  const traitIndexes = getSelectedRaceTraitIndexes(character, catalogs);
  const raceIndex = normalizeIndex(character && character.race && character.race.index);
  const subraceIndex = normalizeIndex(character && character.race && character.race.subRace);
  const spellIndexes = new Set(
    (Array.isArray(character && character.spells) ? character.spells : [])
      .map((spell) => normalizeIndex(spell && spell.index))
  );
  const equippedItems = getEquippedItems(character, catalogs);
  const featureByIndex = new Map(
    catalogs.features.map((feature) => [normalizeIndex(feature && feature.index), feature])
  );

  const hasFeature = (index) => {
    const normalizedIndex = normalizeIndex(index);
    if (featureIndexes.has(normalizedIndex)) {
      return true;
    }

    const feature = featureByIndex.get(normalizedIndex);
    if (feature) {
      return false;
    }

    const classPrefix = normalizedIndex.split("-")[0];
    const aliasedFeatureIndex = normalizedIndex.slice(classPrefix.length + 1);
    const aliasedFeature = featureByIndex.get(aliasedFeatureIndex);
    return Boolean(
      aliasedFeature &&
      normalizeIndex(aliasedFeature.class && aliasedFeature.class.index) === classPrefix &&
      featureIndexes.has(aliasedFeatureIndex)
    );
  };

  return (condition) => {
    if (!condition || typeof condition !== "object" || !condition.index) {
      return true;
    }

    const reference = normalizeIndex(condition.reference_file).replace(/\.json$/, "");
    const index = normalizeIndex(condition.index);
    let exists;

    if (reference.endsWith("equipment-categories")) {
      exists = equipmentMatchesCondition(equippedItems, condition, catalogs);
      return condition.mustHave === true ? exists : !exists;
    }

    if (reference.endsWith("features")) {
      exists = hasFeature(index);
    } else if (reference.endsWith("feats")) {
      exists = featIndexes.has(index);
    } else if (reference.endsWith("races")) {
      exists = raceIndex === index;
    } else if (reference.endsWith("subraces")) {
      exists = subraceIndex === index;
    } else if (reference.endsWith("traits")) {
      exists = traitIndexes.has(index);
    } else if (reference.endsWith("spells")) {
      exists = spellIndexes.has(index);
    } else {
      return false;
    }

    return condition.mustHave === false ? !exists : exists;
  };
};

const conditionsAreSatisfied = (conditions, matchesCondition) =>
  Array.isArray(conditions) && conditions.every(matchesCondition);

const resolveRuleValue = (rule, abilityStats) => {
  if (rule.value !== null && rule.value !== undefined) {
    const value = Number(rule.value);
    if (!Number.isFinite(value)) {
      throw new TypeError(`Valoarea regulii AC "${rule.label || rule.index}" nu este numerică.`);
    }
    return value;
  }

  const abilityIndex = String(rule.index || "").trim().toUpperCase();
  const modifier = abilityStats && abilityStats.calculatedModifiers &&
    abilityStats.calculatedModifiers[abilityIndex];
  if (!Number.isFinite(Number(modifier))) {
    throw new TypeError(`Lipsește modifier-ul ${abilityIndex} pentru calculul AC.`);
  }
  return Number(modifier);
};

const getOwningClassPosition = (rule, character, catalogs) => {
  const featureCondition = (Array.isArray(rule.conditions) ? rule.conditions : [])
    .find((condition) =>
      normalizeIndex(condition && condition.reference_file).replace(/\.json$/, "")
        .endsWith("features")
    );
  if (!featureCondition) {
    return Number.MAX_SAFE_INTEGER;
  }

  const conditionIndex = normalizeIndex(featureCondition.index);
  const feature = catalogs.features.find((entry) =>
    normalizeIndex(entry && entry.index) === conditionIndex
  );
  const classIndex = normalizeIndex(
    (feature && feature.class && feature.class.index) || conditionIndex.split("-")[0]
  );
  const classEntries = Array.isArray(character && character.classes) ? character.classes : [];
  const position = classEntries.findIndex(
    (entry) => normalizeIndex(entry && entry.index) === classIndex
  );
  return position < 0 ? Number.MAX_SAFE_INTEGER : position;
};

const calculateCharacterArmorClass = (
  character,
  abilityStats,
  { rules = AC_RULES, catalogs = getCatalogs() } = {}
) => {
  const matchesCondition = makeConditionMatcher(character, catalogs);
  const starterRules = getRulesByGroup(rules, "starter");
  const matchingStarterRules = starterRules.filter((rule) =>
    conditionsAreSatisfied(rule.conditions, matchesCondition)
  );
  const starterRule = matchingStarterRules.reduce((best, rule) =>
    !best || Number(rule.value) > Number(best.value) ? rule : best
  , null) || starterRules.find((rule) =>
    rule.reference === "standard" && rule.index === "standard"
  );

  if (!starterRule) {
    throw new Error("Nu există o regulă standard de bază pentru AC.");
  }

  const dexRules = getRulesByGroup(rules, "dex");
  const matchingDexRule = dexRules.find((rule) =>
    rule.reference !== "standard" &&
    conditionsAreSatisfied(rule.conditions, matchesCondition)
  ) || dexRules.find((rule) =>
    rule.reference === "standard" &&
    conditionsAreSatisfied(rule.conditions, matchesCondition)
  );

  const dexModifier = matchingDexRule
    ? resolveRuleValue(matchingDexRule, abilityStats)
    : 0;

  const otherRules = ["con", "wis"].flatMap((group) =>
    getRulesByGroup(rules, group)
      .filter((rule) => conditionsAreSatisfied(rule.conditions, matchesCondition))
      .map((rule) => ({ group, rule }))
  );
  otherRules.sort((left, right) =>
    getOwningClassPosition(left.rule, character, catalogs) -
      getOwningClassPosition(right.rule, character, catalogs) ||
    (left.group === right.group ? 0 : left.group === "con" ? -1 : 1)
  );
  const selectedOtherRule = otherRules[0] && otherRules[0].rule;

  const starter = resolveRuleValue(starterRule, abilityStats);
  const OtherStats_modifiers = selectedOtherRule
    ? resolveRuleValue(selectedOtherRule, abilityStats)
    : 0;

  return {
    Char_total_AC: starter + dexModifier + OtherStats_modifiers,
    starter,
    dex_modifier: dexModifier,
    OtherStats_modifiers,
    breakdown: {
      starter: starterRule.label || starterRule.index,
      dex: matchingDexRule ? matchingDexRule.label || matchingDexRule.index : null,
      otherStats: selectedOtherRule
        ? selectedOtherRule.label || selectedOtherRule.index
        : null
    }
  };
};

const AC_rulesMiddleware = async (req, res, next) => {
  try {
    const characterId = req.params.characterId || req.params.charID;
    if (!characterId) {
      return res.status(400).send("Lipsește characterId.");
    }
    if (!mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send("characterId invalid.");
    }

    const query = { _id: characterId };
    if (req.params.userId) {
      query.userLink = req.params.userId;
    }
    const character = await DnD_Character.findOne(query);
    if (!character) {
      return res.status(404).send("Characterul nu a fost găsit.");
    }

    const abilityStats = await buildCharacterAbilityStats(character);
    const armorClass = calculateCharacterArmorClass(character, abilityStats);
    req.character = character;
    req.AC_abilityStats = abilityStats;
    req.Char_total_AC = armorClass.Char_total_AC;
    req.AC_breakdown = armorClass;
    res.locals.Char_total_AC = armorClass.Char_total_AC;
    res.locals.AC_breakdown = armorClass;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  AC_rulesMiddleware,
  calculateCharacterArmorClass
};