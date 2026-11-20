const mongoose = require("mongoose");
const { buildInitiative } = require("./initMiddleware");
const { rollRandom20 } = require("../Dice/simple_random20Middleware");

const buildCombatInitiative = async (characterOrId, options = {}) => {
  const { random20: suppliedRandom20, ...initiativeOptions } = options;
  if (
    suppliedRandom20 !== undefined &&
    (!Number.isInteger(suppliedRandom20) || suppliedRandom20 < 1 || suppliedRandom20 > 20)
  ) {
    throw new TypeError("Aruncarea d20 trebuie să fie un număr întreg între 1 și 20.");
  }

  const initiative = await buildInitiative(characterOrId, initiativeOptions);
  const random20 = suppliedRandom20 ?? rollRandom20();

  return {
    total: initiative.total + random20,
    initiativeTotal: initiative.total,
    random20,
    initiative
  };
};

const combatInitMiddleware = async (req, res, next) => {
  try {
    const characterId =
      req.params.characterId || req.params.charId || req.params.charID;
    if (!characterId) {
      return res.status(400).send("Lipsește characterId.");
    }
    if (!mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send("characterId invalid.");
    }

    const combatInitiative = await buildCombatInitiative(
      req.character &&
        String(req.character._id) === String(characterId)
        ? req.character
        : characterId,
      {
        userId: req.params.userId,
        abilityStats: req.AC_abilityStats || req.characterAbilityStats,
        random20: req.random20
      }
    );

    req.Char_total_CombatInitiative = combatInitiative.total;
    req.Combat_Initiative_breakdown = combatInitiative;
    res.locals.Char_total_CombatInitiative = combatInitiative.total;
    res.locals.Combat_Initiative_breakdown = combatInitiative;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  combatInitMiddleware,
  buildCombatInitiative
};