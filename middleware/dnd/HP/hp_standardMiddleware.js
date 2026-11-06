const mongoose = require("mongoose");
const DnD_Character = require("../../../models/dnd/charBuilderModel");
const { buildCharacterAbilityStats } = require("../stats/characterAbilityStats");
const { loadClassesFromJson } = require("../jsonLoaders/JsonPathMiddleware");

const FIXED_HIT_POINTS_BY_DIE = {
  6: 4,
  8: 5,
  10: 6,
  12: 7
};

const normalizeIndex = (value) => String(value || "").trim().toLowerCase();

const parseClassLevel = (classEntry) => {
  const rawLevel = classEntry && classEntry.level;
  const level = typeof rawLevel === "string" ? Number(rawLevel.trim()) : Number(rawLevel);
  if (!Number.isInteger(level) || level < 1) {
    throw new TypeError(
      `Clasa "${classEntry && classEntry.index}" trebuie să aibă un nivel întreg pozitiv.`
    );
  }

  return level;
};

const calculateStandardHitPoints = (
  character,
  constitutionModifier,
  classCatalog = loadClassesFromJson()
) => {
  const classes = Array.isArray(character && character.classes) ? character.classes : [];
  if (!classes.length) {
    throw new TypeError("Personajul trebuie să aibă cel puțin o clasă pentru calculul HP.");
  }

  const conModifier = Number(constitutionModifier);
  if (!Number.isInteger(conModifier)) {
    throw new TypeError("Modificatorul CON trebuie să fie un număr întreg.");
  }

  const catalogByIndex = new Map(
    classCatalog.map((classData) => [normalizeIndex(classData && classData.index), classData])
  );
  const levelBreakdown = [];
  let totalHitPoints = 0;
  let totalLevel = 0;

  classes.forEach((characterClass, classPosition) => {
    const classIndex = normalizeIndex(characterClass && characterClass.index);
    const classData = catalogByIndex.get(classIndex);
    if (!classData) {
      throw new TypeError(`Clasa "${classIndex || "(necunoscută)"}" nu există în catalogul SRD.`);
    }

    const hitDie = Number(classData.hit_die);
    const fixedHitPoints = FIXED_HIT_POINTS_BY_DIE[hitDie];
    if (!fixedHitPoints) {
      throw new TypeError(`Clasa "${classIndex}" are un zar de viață invalid.`);
    }

    const classLevel = parseClassLevel(characterClass);
    for (let classLevelNumber = 1; classLevelNumber <= classLevel; classLevelNumber += 1) {
      const isCharacterFirstLevel = classPosition === 0 && classLevelNumber === 1;
      const hitPointsBeforeConstitution = isCharacterFirstLevel ? hitDie : fixedHitPoints;
      const hitPointsGained = isCharacterFirstLevel
        ? hitPointsBeforeConstitution + conModifier
        : Math.max(1, hitPointsBeforeConstitution + conModifier);

      totalHitPoints += hitPointsGained;
      totalLevel += 1;
      levelBreakdown.push({
        classLevel: classLevelNumber,
        classIndex,
        isCharacterFirstLevel,
        hitDie,
        hitPointsBeforeConstitution,
        constitutionModifier: conModifier,
        constitutionAdjustmentApplied: hitPointsGained - hitPointsBeforeConstitution,
        hitPointsGained
      });
    }
  });

  return {
    Char_total_HP: totalHitPoints,
    totalLevel,
    constitutionModifier: conModifier,
    levelBreakdown
  };
};

const buildStandardHitPoints = async (character, abilityStats) => {
  const hasConstitutionScore = Array.isArray(character && character.abilityScores) &&
    character.abilityScores.some((score) =>
      String(score && score.type || "").trim().toUpperCase() === "CON"
    );
  if (!hasConstitutionScore) {
    throw new TypeError("Personajul nu are un scor CON definit.");
  }

  const characterAbilityStats = abilityStats || await buildCharacterAbilityStats(character);
  return calculateStandardHitPoints(
    character,
    characterAbilityStats.calculatedModifiers.CON
  );
};

const hp_standardMiddleware = async (req, res, next) => {
  try {
    const characterId = req.params.characterId || req.params.charId || req.params.charID;
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

    const character = req.character &&
      String(req.character._id) === String(characterId) &&
      (!req.params.userId || String(req.character.userLink) === String(req.params.userId))
      ? req.character
      : await DnD_Character.findOne(query);
    if (!character) {
      return res.status(404).send("Characterul nu a fost găsit.");
    }

    const hpCalculation = await buildStandardHitPoints(character, req.AC_abilityStats);

    req.character = character;
    req.Char_total_HP = hpCalculation.Char_total_HP;
    req.HP_breakdown = hpCalculation;
    res.locals.Char_total_HP = hpCalculation.Char_total_HP;
    res.locals.HP_breakdown = hpCalculation;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  hp_standardMiddleware,
  buildStandardHitPoints,
  calculateStandardHitPoints
};