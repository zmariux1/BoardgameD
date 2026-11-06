const mongoose = require("mongoose");
const DnD_Character = require("../../../models/dnd/charBuilderModel");
const {
  buildStandardHitPoints
} = require("./hp_standardMiddleware");
const { loadHPBonusesFromJson } = require("../jsonLoaders/JsonPathMiddleware");

const normalizeValue = (value) => String(value ?? "").trim().toLowerCase();

const resolveModelPath = (value, pathSegments) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => resolveModelPath(entry, pathSegments));
  }
  if (pathSegments.length === 0) {
    return [value];
  }
  if (!value || typeof value !== "object") {
    return [];
  }

  return resolveModelPath(value[pathSegments[0]], pathSegments.slice(1));
};

const getConditionValues = (character, modelPath) => {
  const values = resolveModelPath(character, modelPath.split("."));
  if (modelPath === "classes.abilities.index") {
    const featChoices = resolveModelPath(character, ["classes", "abilities"])
      .filter((ability) => normalizeValue(ability && ability.conditionId) === "feat")
      .map((ability) => ability.optionIndex);
    values.push(...featChoices);
  }
  return values;
};

const conditionMatches = (character, condition) => {
  if (!condition || typeof condition.modelPath !== "string" || !condition.modelPath.trim()) {
    throw new TypeError("Fiecare condiție HP trebuie să aibă un modelPath valid.");
  }

  const values = getConditionValues(character, condition.modelPath);
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
    default:
      throw new TypeError(`Operator de condiție HP nesuportat: "${condition.operator}".`);
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

const calculateEffectAmount = (effect, characterLevel) => {
  if (!effect || effect.target !== "maxHp" || effect.operation !== "add") {
    throw new TypeError("Bonusul HP trebuie să adauge o valoare la maxHp.");
  }

  const calculation = effect.calculation;
  if (!calculation || calculation.levelSource !== "characterLevel") {
    throw new TypeError("Bonusul HP trebuie să folosească levelSource characterLevel.");
  }

  let amount;
  if (calculation.type === "levelMultiplier") {
    const multiplier = Number(calculation.multiplier);
    if (!Number.isFinite(multiplier)) {
      throw new TypeError("Multiplier-ul bonusului HP trebuie să fie numeric.");
    }
    amount = characterLevel * multiplier;
  } else if (calculation.type === "levelFraction") {
    const numerator = Number(calculation.numerator);
    const denominator = Number(calculation.denominator);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
      throw new TypeError("Fracția bonusului HP trebuie să aibă numerator și denominator valizi.");
    }

    const rounding = calculation.rounding || "floor";
    const roundingFunctions = {
      ceil: Math.ceil,
      floor: Math.floor,
      round: Math.round
    };
    const round = roundingFunctions[rounding];
    if (!round) {
      throw new TypeError(`Rotunjire pentru bonus HP nesuportată: "${rounding}".`);
    }
    amount = round(characterLevel * numerator / denominator);
    if (calculation.minimum !== undefined) {
      const minimum = Number(calculation.minimum);
      if (!Number.isFinite(minimum)) {
        throw new TypeError("Valoarea minimă a bonusului HP trebuie să fie numerică.");
      }
      amount = Math.max(minimum, amount);
    }
  } else {
    throw new TypeError(`Calcul de bonus HP nesuportat: "${calculation.type}".`);
  }

  if (!Number.isFinite(amount)) {
    throw new TypeError("Calculul bonusului HP nu a produs o valoare numerică validă.");
  }
  return amount;
};

const calculateHitPointsWithBonuses = (
  character,
  standardHitPoints,
  bonusCatalog = loadHPBonusesFromJson()
) => {
  if (!standardHitPoints || !Number.isFinite(Number(standardHitPoints.Char_total_HP))) {
    throw new TypeError("Calculul HP standard este necesar înaintea bonusurilor.");
  }

  const characterLevel = Number(standardHitPoints.totalLevel) || getCharacterLevel(character);
  const bonuses = bonusCatalog
    .filter((bonus) => {
      if (!Array.isArray(bonus && bonus.conditions)) {
        throw new TypeError(`Bonusul "${bonus && bonus.label}" trebuie să aibă o listă de conditions.`);
      }
      return bonus.conditions.every((condition) => conditionMatches(character, condition));
    })
    .map((bonus) => ({
      label: bonus.label || "Bonus HP",
      amount: calculateEffectAmount(bonus.effect, characterLevel)
    }));
  const bonusTotal = bonuses.reduce((total, bonus) => total + bonus.amount, 0);

  return {
    ...standardHitPoints,
    Char_total_HP_with_bonuses: Number(standardHitPoints.Char_total_HP) + bonusTotal,
    bonusTotal,
    bonuses
  };
};

const buildHitPointsWithBonuses = async (character, standardHitPoints) => {
  const standard = standardHitPoints || await buildStandardHitPoints(character);
  return calculateHitPointsWithBonuses(character, standard);
};

const hp_with_bonusesMiddleware = async (req, res, next) => {
  try {
    const characterId = req.params.characterId || req.params.charId || req.params.charID;
    let character = req.character;

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
      character = await DnD_Character.findOne(query);
      if (!character) {
        return res.status(404).send("Characterul nu a fost găsit.");
      }
    }

    const hpCalculation = await buildHitPointsWithBonuses(character, req.HP_breakdown);
    req.character = character;
    req.Char_total_HP = hpCalculation.Char_total_HP;
    req.Char_total_HP_with_bonuses = hpCalculation.Char_total_HP_with_bonuses;
    req.HP_with_bonuses_breakdown = hpCalculation;
    res.locals.Char_total_HP = hpCalculation.Char_total_HP;
    res.locals.Char_total_HP_with_bonuses = hpCalculation.Char_total_HP_with_bonuses;
    res.locals.HP_with_bonuses_breakdown = hpCalculation;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  hp_with_bonusesMiddleware,
  buildHitPointsWithBonuses,
  calculateHitPointsWithBonuses,
  conditionMatches,
  calculateEffectAmount
};