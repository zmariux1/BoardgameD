const mongoose = require("mongoose");
const DnD_CharBuilder = require("../../../models/dnd/charBuilderModel");

const REQUIRED_ABILITY_TYPES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

const hasText = (value) => String(value || "").trim() !== "";

const hasAbilityScoreValue = (score) => {
  if (!score) {
    return false;
  }

  const value = Number(score.value);
  const overwrite = Number(score.overwrite);

  return (Number.isFinite(value) && value > 0) || (Number.isFinite(overwrite) && overwrite > 0);
};

// Returneaza ruta din builder pentru primul pas lipsa sau null daca personajul e complet.
// Ordinea: species -> class -> background -> stats.
const getCharacterBuilderRedirect = (userId, character) => {
  const characterId = character && character._id ? String(character._id) : "";
  const builderBase = `/${userId}/dnd/builder/${characterId}`;

  if (!hasText(character?.race?.index)) {
    return `${builderBase}/species/choose`;
  }

  const classes = Array.isArray(character?.classes) ? character.classes : [];
  if (!classes.some((characterClass) => hasText(characterClass?.index))) {
    return `${builderBase}/class/choose`;
  }

  if (!hasText(character?.background?.index)) {
    return `${builderBase}/background`;
  }

  const abilityScores = Array.isArray(character?.abilityScores) ? character.abilityScores : [];
  const hasAllAbilityScores = REQUIRED_ABILITY_TYPES.every((type) =>
    abilityScores.some(
      (score) => String(score?.type || "").toUpperCase() === type && hasAbilityScoreValue(score)
    )
  );

  if (!hasAllAbilityScores) {
    return `${builderBase}/stats`;
  }

  return null;
};

// Blocheaza accesul la charSheet pana cand personajul are toate alegerile obligatorii.
const charCompletionMiddleware = async (req, res, next) => {
  try {
    const { userId, characterId } = req.params;

    if (!req.session.user_id || !characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return next();
    }

    const character = await DnD_CharBuilder.findOne(
      { _id: characterId, userLink: userId },
      { race: 1, classes: 1, background: 1, abilityScores: 1 }
    ).lean();

    if (!character) {
      return next();
    }

    const redirectPath = getCharacterBuilderRedirect(userId, character);

    return redirectPath ? res.redirect(redirectPath) : next();
  } catch (error) {
    console.error("[CHAR COMPLETION] middleware error:", error);
    return next(error);
  }
};

module.exports = {
  getCharacterBuilderRedirect,
  charCompletionMiddleware
};
