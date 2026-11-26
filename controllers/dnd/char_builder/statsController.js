const moment = require("moment");
const mongoose = require("mongoose");
const User = require("../../../models/userModel");
const UserPlus = require("../../../models/userPlusDataModel");
const bcrypt = require("bcrypt");
const axios = require('axios');
const { parseString } = require('xml2js'); 
const dotenv = require("dotenv").config();

const nodemailer = require("nodemailer");

// const config = require("../../../config/config");

const randomString = require("randomstring");


// DND begins here ________________________________________________
const DnD_CarBuilder = require("../../../models/dnd/charBuilderModel");
const { buildCharacterAbilityStats } = require("../../../middleware/dnd/stats/characterAbilityStats");

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX





const normalizeClassAbilityChoice = (classEntry, abilityEntry) => {
  const abilityValue = Number(abilityEntry && abilityEntry.value !== undefined ? abilityEntry.value : 0);

  return {
    classIndex: classEntry && classEntry.index ? String(classEntry.index) : '',
    abilityIndex: abilityEntry && abilityEntry.index ? String(abilityEntry.index) : '',
    optionIndex: abilityEntry && abilityEntry.optionIndex !== undefined && abilityEntry.optionIndex !== null
      ? String(abilityEntry.optionIndex)
      : '',
    value: Number.isFinite(abilityValue) ? abilityValue : 0,
    decision: abilityEntry && abilityEntry.decision ? String(abilityEntry.decision) : '',
    conditionId: abilityEntry && abilityEntry.conditionId ? String(abilityEntry.conditionId) : '',
    slot: Number(abilityEntry && abilityEntry.slot !== undefined ? abilityEntry.slot : 0),
  };
};

const VALID_ABILITY_TYPES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const VALID_ABILITY_FIELDS = ['value', 'modifier', 'overwrite'];

const parseAbilityFieldKey = (rawKey) => {
  if (rawKey === undefined || rawKey === null) {
    return null;
  }

  const keyAsString = String(rawKey).trim();
  if (!keyAsString) {
    return null;
  }

  const keyParts = keyAsString.split('-');
  if (keyParts.length !== 2) {
    return null;
  }

  const [abilityPart, fieldPart] = keyParts;
  const normalizedType = String(abilityPart || '').trim().toUpperCase();
  const normalizedField = String(fieldPart || '').trim().toLowerCase();

  if (!VALID_ABILITY_TYPES.includes(normalizedType)) {
    return null;
  }

  if (!VALID_ABILITY_FIELDS.includes(normalizedField)) {
    return null;
  }

  return {
    type: normalizedType,
    field: normalizedField
  };
};


const statsChooseLoad = async (req, res) => {
    try {

        const userId = req.params.userId;

        // ==========================================
        // CHARACTER ID
        // ==========================================

        const characterId = req.params.characterId;

        if (!characterId) {
            return res.status(400).send(
                "Lipsește characterId."
            );
        }

        if (!mongoose.Types.ObjectId.isValid(characterId)) {
            return res.status(400).send("characterId invalid.");
        }


        // ==========================================
        // SESSION
        // ==========================================

        if (!req.session.user_id) {
            return res.redirect("/login");
        }


        // ==========================================
        // VERIFY USER
        // ==========================================

        if (
            req.session.user_id.toString() !==
            userId.toString()
        ) {
            return res.status(403).send("Unauthorized");
        }


        // ==========================================
        // LOAD CHARACTER
        // ==========================================

        const character = await DnD_CarBuilder.findOne({
            _id: characterId,
            userLink: userId
        });

        if (!character) {
            return res.status(404).send(
                "Characterul nu a fost găsit."
            );
        }


        // ==========================================
        // USER DATA
        // ==========================================

        const userDataSession = await User.findById(
            req.session.user_id
        );

        const abilityStats = await buildCharacterAbilityStats(character);
        const newAbilityStats = Object.fromEntries(
          Object.entries(abilityStats).map(([key, value]) => [`NEW_${key}`, value])
        );
        const abilityScoreBonuses = Object.fromEntries(
          Object.entries(abilityStats.bonuses).map(([key, value]) => [key.toLowerCase(), value])
        );
        const abilityScoreModifiers = Object.fromEntries(
          Object.entries(abilityStats.modifiers).map(([key, value]) => [key.toLowerCase(), value])
        );
        const abilityScoreOverwrite = Object.fromEntries(
          Object.entries(abilityStats.overwrite).map(([key, value]) => [key.toLowerCase(), value])
        );
        const baseAbilityScore = Object.fromEntries(
          Object.entries(abilityStats.base).map(([key, value]) => [key.toLowerCase(), value])
        );

        // ==========================================
        // RENDER
        // ==========================================

        return res.render(
            "userAccess/dnd/char/charBuilder/stats",
            {
                userId,
                characterId,
                character,
                userDataSession,
                ...abilityStats,
                ...newAbilityStats,
                abilityScoreBonuses,
                abilityScoreModifiers,
                abilityScoreOverwrite,
                baseAbilityScore,
                pageTitle: "Alege-ți stats-urile"
            }
        );

    } catch (error) {

        console.error(
            "[STATS CHOOSE] error:",
            error
        );

        return res.status(500).send(
            "Eroare la încărcarea stats-ului D&D."
        );
    }
};

const statsChooseUp = async (req, res) => {
  try {
    const userId = req.params.userId;
    const characterId = req.params.characterId;

    const incomingScores = Array.isArray(req.body?.abilityScores)
      ? req.body.abilityScores
      : [];

    if (!req.session.user_id) {
      return res.redirect("/login");
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (!characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).json({
        success: false,
        message: "characterId invalid."
      });
    }

    if (!incomingScores.length) {
      return res.status(400).json({
        success: false,
        message: "Lipsesc valorile pentru abilityScores."
      });
    }

    const validTypes = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

    const hasIncomingField = (value) => {
      return value !== undefined &&
        value !== null &&
        String(value).trim() !== '';
    };

    const character = await DnD_CarBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: "Characterul nu a fost găsit."
      });
    }

    if (!Array.isArray(character.abilityScores)) {
      character.abilityScores = [];
    }

    const seenIncomingTypes = new Set();

    for (const incomingScore of incomingScores) {
      const type = String(incomingScore?.type || '').toUpperCase();

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Ability type invalid: ${type || 'necunoscut'}`
        });
      }

      if (seenIncomingTypes.has(type)) {
        return res.status(400).json({
          success: false,
          message: `Ability type duplicat în request: ${type}`
        });
      }

      seenIncomingTypes.add(type);

      const existingScore = character.abilityScores.find(
        (score) => score.type === type
      );

      // Dacă recordul NU există -> îl creăm
      if (!existingScore) {
        const newScore = {
          type,
          value: 8,
          modifier: "0",
          overwrite: 0
        };

        if (hasIncomingField(incomingScore?.value)) {
          const parsedValue = Number(incomingScore.value);

          if (!Number.isFinite(parsedValue)) {
            return res.status(400).json({
              success: false,
              message: `Valoare invalidă pentru ${type}.`
            });
          }

          newScore.value = parsedValue;
        }

        if (hasIncomingField(incomingScore?.modifier)) {
          newScore.modifier = String(incomingScore.modifier);
        }

        if (hasIncomingField(incomingScore?.overwrite)) {
          const parsedOverwrite = Number(incomingScore.overwrite);

          if (!Number.isFinite(parsedOverwrite)) {
            return res.status(400).json({
              success: false,
              message: `Overwrite invalid pentru ${type}.`
            });
          }

          newScore.overwrite = parsedOverwrite;
        }

        character.abilityScores.push(newScore);

        continue;
      }

      // Dacă recordul EXISTĂ -> modificăm DOAR câmpurile primite

      if (hasIncomingField(incomingScore?.value)) {
        const parsedValue = Number(incomingScore.value);

        if (!Number.isFinite(parsedValue)) {
          return res.status(400).json({
            success: false,
            message: `Valoare invalidă pentru ${type}.`
          });
        }

        existingScore.value = parsedValue;
      }

      if (hasIncomingField(incomingScore?.modifier)) {
        existingScore.modifier = String(incomingScore.modifier);
      }

      if (hasIncomingField(incomingScore?.overwrite)) {
        const parsedOverwrite = Number(incomingScore.overwrite);

        if (!Number.isFinite(parsedOverwrite)) {
          return res.status(400).json({
            success: false,
            message: `Overwrite invalid pentru ${type}.`
          });
        }

        existingScore.overwrite = parsedOverwrite;
      }
    }

    await character.save();

    return res.status(200).json({
      success: true,
      message: "Ability scores salvate cu succes.",
      abilityScores: character.abilityScores
    });

  } catch (error) {
    console.error("statsChooseUp error:", error);

    return res.status(500).json({
      success: false,
      message: "Eroare la salvarea ability scores."
    });
  }
};



const stats_individualChooseUp = async (req, res) => {
  try {
    const userId = req.params.userId;
    const characterId = req.params.characterId;

    if (!req.session.user_id) {
      return res.redirect('/login');
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (!characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).json({
        success: false,
        message: 'characterId invalid.'
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const fieldEntries = Object.entries(body);

    if (!fieldEntries.length) {
      return res.status(400).json({
        success: false,
        message: 'Lipsesc valorile pentru un camp ability.'
      });
    }

    const character = await DnD_CarBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).json({
        success: false,
        message: 'Characterul nu a fost găsit.'
      });
    }

    if (!Array.isArray(character.abilityScores)) {
      character.abilityScores = [];
    }

    for (const [rawKey, rawValue] of fieldEntries) {
      const parsedKey = parseAbilityFieldKey(rawKey);

      if (!parsedKey) {
        return res.status(400).json({
          success: false,
          message: `Nume de câmp invalid: ${rawKey}`
        });
      }

      const { type, field } = parsedKey;
      const value = String(rawValue ?? '').trim();

      let existingScore = character.abilityScores.find((score) => score.type === type);

      if (!existingScore) {
        existingScore = {
          type,
          value: 8,
          modifier: '0',
          overwrite: 0
        };
        character.abilityScores.push(existingScore);
      }

      if (field === 'value') {
        const numericValue = Number(value);

        if (value === '' || !Number.isFinite(numericValue)) {
          return res.status(400).json({
            success: false,
            message: `Valoare invalidă pentru ${type}-value.`
          });
        }

        existingScore.value = numericValue;
      }

      if (field === 'modifier') {
        existingScore.modifier = value === '' ? '0' : value;
      }

      if (field === 'overwrite') {
        const overwriteValue = Number(value);

        if (value === '' || !Number.isFinite(overwriteValue)) {
          return res.status(400).json({
            success: false,
            message: `Overwrite invalid pentru ${type}.`
          });
        }

        existingScore.overwrite = overwriteValue;
      }
    }

    await character.save();

    return res.status(200).json({
      success: true,
      message: 'Ability score individual actualizat cu succes.',
      abilityScores: character.abilityScores
    });
  } catch (error) {
    console.error('stats_individualChooseUp error:', error);

    return res.status(500).json({
      success: false,
      message: 'Eroare la salvarea ability scores.'
    });
  }
};

module.exports = {
  statsChooseLoad,
  statsChooseUp,
  stats_individualChooseUp,
  parseAbilityFieldKey
};
