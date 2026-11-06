const mongoose = require("mongoose");
const Character = require("../../../models/dnd/charBuilderModel");
const { buildCharacterAbilityStats } = require("../stats/characterAbilityStats");
const {
  loadInitiativeBonusesFromJson,
  loadLevelsFromJson
} = require("../jsonLoaders/JsonPathMiddleware");

const normalizeValue = (value) => String(value ?? "").trim().toLowerCase();

const resolvePath = (value, segments) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => resolvePath(entry, segments));
  }
  if (segments.length === 0) {
    return [value];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return resolvePath(value[segments[0]], segments.slice(1));
};

const getConditionValues = (character, condition, classEntry) => {
  const root = condition.modelPath.startsWith("classes.")
    ? classEntry
    : character;
  const path = condition.modelPath.startsWith("classes.")
    ? condition.modelPath.slice("classes.".length)
    : condition.modelPath;
  const values = resolvePath(root, path.split("."));

  if (condition.modelPath === "classes.abilities.index" && classEntry) {
    (Array.isArray(classEntry.abilities) ? classEntry.abilities : [])
      .filter((ability) => normalizeValue(ability && ability.conditionId) === "feat")
      .forEach((ability) => values.push(ability.optionIndex));
  }
  return values;
};

const conditionMatches = (character, condition, classEntry) => {
  if (!condition || typeof condition.modelPath !== "string" || !condition.modelPath.trim()) {
    throw new TypeError("Fiecare condiție de inițiativă trebuie să aibă un modelPath valid.");
  }

  const values = getConditionValues(character, condition, classEntry);
  const expected = condition.value;
  switch (condition.operator) {
    case "equals":
      return values.some((value) => normalizeValue(value) === normalizeValue(expected));
    case "notEquals":
      return values.every((value) => normalizeValue(value) !== normalizeValue(expected));
    case "includes":
      return values.some((value) =>
        Array.isArray(value)
          ? value.some((entry) => normalizeValue(entry) === normalizeValue(expected))
          : typeof value === "string" && value.toLowerCase().includes(String(expected).toLowerCase())
      );
    case "in":
      if (!Array.isArray(expected)) {
        throw new TypeError(`Condiția "${condition.modelPath}" folosește operatorul in fără o listă.`);
      }
      return values.some((value) =>
        expected.some((entry) => normalizeValue(value) === normalizeValue(entry))
      );
    case "greaterThanOrEqual":
    case "greaterThan":
    case "lessThanOrEqual":
    case "lessThan": {
      const target = Number(expected);
      if (!Number.isFinite(target)) {
        throw new TypeError(`Condiția numerică "${condition.modelPath}" nu are o valoare validă.`);
      }
      return values.some((value) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return false;
        }
        if (condition.operator === "greaterThanOrEqual") return numericValue >= target;
        if (condition.operator === "greaterThan") return numericValue > target;
        if (condition.operator === "lessThanOrEqual") return numericValue <= target;
        return numericValue < target;
      });
    }
    default:
      throw new TypeError(`Operator de condiție pentru inițiativă nesuportat: "${condition.operator}".`);
  }
};

const getCharacterLevel = (character) =>
  (Array.isArray(character && character.classes) ? character.classes : [])
    .reduce((total, classEntry) => {
      const level = Number(classEntry && classEntry.level);
      if (!Number.isInteger(level) || level < 1) {
        throw new TypeError(
          `Clasa "${classEntry && classEntry.index}" trebuie să aibă un nivel întreg pozitiv.`
        );
      }
      return total + level;
    }, 0);

const getProficiencyBonus = (characterLevel, levels) => {
  const levelData = levels.find((entry) => Number(entry && entry.level) === characterLevel);
  const proficiencyBonus = Number(levelData && levelData.prof_bonus);
  if (!Number.isFinite(proficiencyBonus)) {
    throw new TypeError(`Nu există proficiency bonus pentru nivelul total ${characterLevel}.`);
  }
  return proficiencyBonus;
};

const calculateEffect = (effect, context) => {
  if (!effect || effect.target !== "initiative") {
    throw new TypeError("Efectul de inițiativă trebuie să aibă target initiative.");
  }
  const calculation = effect.calculation;
  if (!calculation || typeof calculation.type !== "string") {
    throw new TypeError("Efectul de inițiativă trebuie să specifice un calculation.type.");
  }

  let amount;
  switch (calculation.type) {
    case "flat":
      amount = Number(calculation.amount);
      break;
    case "proficiencyBonus": {
      const multiplier = Number(calculation.multiplier ?? 1);
      amount = context.proficiencyBonus * multiplier;
      break;
    }
    case "proficiencyBonusFraction": {
      const numerator = Number(calculation.numerator);
      const denominator = Number(calculation.denominator);
      const rounders = { ceil: Math.ceil, floor: Math.floor, round: Math.round };
      const round = rounders[calculation.rounding || "floor"];
      if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0 || !round) {
        throw new TypeError("Fracția proficiency bonus trebuie să aibă valori și rotunjire valide.");
      }
      amount = round(context.proficiencyBonus * numerator / denominator);
      break;
    }
    case "abilityModifier": {
      const ability = String(calculation.ability || "").trim().toUpperCase();
      amount = context.abilityStats.calculatedModifiers[ability];
      if (!Number.isFinite(amount)) {
        throw new TypeError(`Ability modifier-ul "${ability}" nu este disponibil.`);
      }
      break;
    }
    case "advantage":
      if (effect.operation !== "grant") {
        throw new TypeError("Advantage trebuie să folosească operation grant.");
      }
      return { amount: 0, advantage: true };
    default:
      throw new TypeError(`Tip de calcul pentru inițiativă nesuportat: "${calculation.type}".`);
  }

  if (!Number.isFinite(amount) || effect.operation !== "add") {
    throw new TypeError(`Efect de inițiativă invalid pentru operation "${effect.operation}".`);
  }
  return { amount, advantage: false };
};

const bonusMatchesCharacter = (character, bonus) => {
  if (!Array.isArray(bonus && bonus.conditions)) {
    throw new TypeError(`Bonusul "${bonus && bonus.label}" trebuie să aibă o listă de conditions.`);
  }
  const classConditions = bonus.conditions.filter((condition) =>
    typeof condition.modelPath === "string" && condition.modelPath.startsWith("classes.")
  );
  const otherConditions = bonus.conditions.filter((condition) => !classConditions.includes(condition));

  if (!otherConditions.every((condition) => conditionMatches(character, condition))) {
    return false;
  }
  if (classConditions.length === 0) {
    return true;
  }
  return (Array.isArray(character.classes) ? character.classes : []).some((classEntry) =>
    classConditions.every((condition) => conditionMatches(character, condition, classEntry))
  );
};

const calculateInitiative = async (
  character,
  { abilityStats, bonusCatalog, levels } = {}
) => {
  if (!character || typeof character !== "object") {
    throw new TypeError("Datele personajului sunt necesare pentru calculul inițiativei.");
  }
  const resolvedAbilityStats = abilityStats || await buildCharacterAbilityStats(character);
  const dexterityModifier = Number(resolvedAbilityStats.calculatedModifiers?.DEX);
  if (!Number.isFinite(dexterityModifier)) {
    throw new TypeError("Dexterity modifier-ul personajului nu este disponibil.");
  }

  const characterLevel = getCharacterLevel(character);
  const proficiencyBonus = characterLevel > 0
    ? getProficiencyBonus(characterLevel, levels || loadLevelsFromJson())
    : 0;
  const context = {
    abilityStats: resolvedAbilityStats,
    proficiencyBonus
  };
  const bonuses = (bonusCatalog || loadInitiativeBonusesFromJson())
    .filter((bonus) => bonusMatchesCharacter(character, bonus))
    .map((bonus) => {
      const calculatedEffect = calculateEffect(bonus.effect, context);
      return {
        label: bonus.label || "Bonus inițiativă",
        amount: calculatedEffect.amount,
        advantage: calculatedEffect.advantage
      };
    });
  const bonusTotal = bonuses.reduce((total, bonus) => total + bonus.amount, 0);

  return {
    total: dexterityModifier + bonusTotal,
    dexterityModifier,
    bonusTotal,
    proficiencyBonus,
    advantage: bonuses.some((bonus) => bonus.advantage),
    bonuses
  };
};

const buildInitiative = async (characterOrId, options = {}) => {
  if (characterOrId && typeof characterOrId === "object") {
    return calculateInitiative(characterOrId, options);
  }

  const characterId = String(characterOrId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(characterId)) {
    throw new TypeError("characterId invalid.");
  }
  const query = { _id: characterId };
  if (options.userId) {
    query.userLink = options.userId;
  }
  const character = await Character.findOne(query);
  if (!character) {
    const error = new Error("Characterul nu a fost găsit.");
    error.status = 404;
    throw error;
  }
  return calculateInitiative(character, options);
};

const initMiddleware = async (req, res, next) => {
  try {
    const characterId = req.params.characterId || req.params.charId || req.params.charID;
    let character = req.character &&
      (!characterId || String(req.character._id) === String(characterId)) &&
      (!req.params.userId || String(req.character.userLink) === String(req.params.userId))
      ? req.character
      : null;
    if (!character) {
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
      character = await Character.findOne(query);
      if (!character) {
        return res.status(404).send("Characterul nu a fost găsit.");
      }
    }

    const initiative = await calculateInitiative(character, {
      abilityStats: req.AC_abilityStats || req.characterAbilityStats
    });
    req.character = character;
    req.Char_total_Initiative = initiative.total;
    req.Initiative_breakdown = initiative;
    res.locals.Char_total_Initiative = initiative.total;
    res.locals.Initiative_breakdown = initiative;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  initMiddleware,
  buildInitiative,
  calculateInitiative,
  conditionMatches,
  calculateEffect
};