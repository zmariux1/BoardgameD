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

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX





const {
  loadBackgroundsFromJson,
  loadLanguagesFromJson,
  loadEquipmentFromJson
} = require("../../../middleware/dnd/jsonLoaders/JsonPathMiddleware");

const backgroundsChooseLoad = async (req, res) => {
  try {
    const userId = req.params.userId;
    const characterId = req.params.characterId;

    if (!req.session.user_id) {
      return res.redirect("/login");
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send("Unauthorized");
    }

    if (!characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send("characterId invalid.");
    }

    const character = await DnD_CarBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).send("Characterul nu a fost găsit.");
    }

    console.log("[BACKGROUND CHOOSE] entering backgroundsChooseLoad");
    console.log("[BACKGROUND CHOOSE] userId:", userId);
    console.log("[BACKGROUND CHOOSE] characterId:", characterId);

    const backgrounds = loadBackgroundsFromJson();
    console.log("[BACKGROUND CHOOSE] loaded backgrounds length:", Array.isArray(backgrounds) ? backgrounds.length : "not-array");
    console.log("[BACKGROUND CHOOSE] first background sample:", Array.isArray(backgrounds) && backgrounds[0] ? backgrounds[0].name : "none");


    const languages = loadLanguagesFromJson();
    console.log("[languages CHOOSE] loaded languages length:", Array.isArray(languages) ? languages.length : "not-array");
    console.log("[languages CHOOSE] first Languages sample:", Array.isArray(languages) && languages[0] ? languages[0].name : "none");

    const equipment = loadEquipmentFromJson();
    console.log("[equipment CHOOSE] loaded equipment length:", Array.isArray(equipment) ? equipment.length : "not-array");
    console.log("[equipment CHOOSE] first equipment sample:", Array.isArray(equipment) && equipment[0] ? equipment[0].name : "none");


    // Get user data again for session user_id (not sure why you're doing this again)
    const userDataSession = await User.findById(req.session.user_id);

    return res.render("userAccess/dnd/char/charBuilder/background", {
      userId,
      characterId,
      character,
      userDataSession,
      backgrounds,
      languages,
      equipment,
      pageTitle: "Alege-ți background-ul"
    }, (err, html) => {
      if (err) {
        console.error("[BACKGROUND CHOOSE] render error:", err);
        return res.status(500).send("Eroare la renderizarea paginii de alegere a background-ului.");
      }

      console.log("[BACKGROUND CHOOSE] render success; html length:", html.length);
      return res.send(html);
    });
  } catch (error) {
    console.error("[BACKGROUND CHOOSE] backgroundsChooseLoad error:", error);
    return res.status(500).send("Eroare la încărcarea background-ului D&D.");
  }
};

const normalizeChoiceValues = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap(normalizeChoiceValues);
  }

  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }

  return [String(value)];
};

const parseBackgroundChoices = (body = {}) => {
  const choices = [];

  const pushChoice = (type, rawValue) => {
    if (!type || rawValue === undefined || rawValue === null) {
      return;
    }

    const value = String(rawValue).trim();
    if (!value) {
      return;
    }

    choices.push({
      type: String(type),
      index: value
    });
  };

  const genericChoiceTypes = Array.isArray(body.choiceType) ? body.choiceType : (body.choiceType ? [body.choiceType] : []);
  const genericChoiceIndexes = Array.isArray(body.choiceIndex) ? body.choiceIndex : (body.choiceIndex ? [body.choiceIndex] : []);

  genericChoiceTypes.forEach((type, index) => {
    const genericValues = normalizeChoiceValues(genericChoiceIndexes[index]);
    genericValues.forEach((choiceValue) => pushChoice(type, choiceValue));
  });

  Object.entries(body).forEach(([key, value]) => {
    if (['userId', 'characterId', 'backgroundIndex', 'background', 'index', 'choiceType', 'choiceIndex', '_csrf'].includes(key)) {
      return;
    }

    const values = normalizeChoiceValues(value);

    if (!values.length) {
      return;
    }

    if (key.startsWith('language_')) {
      values.forEach((entry) => pushChoice('language', entry));
      return;
    }

    if (key.startsWith('equipment_option_')) {
      values.forEach((entry) => pushChoice('equipment', entry));
      return;
    }

    if (key === 'personality_traits' || key === 'personality_ideals' || key === 'bonds' || key === 'flaws') {
      values.forEach((entry) => pushChoice(key, entry));
      return;
    }

    if (key === 'languages' || key === 'equipment' || key === 'skills' || key === 'traits' || key === 'ideals') {
      values.forEach((entry) => pushChoice(key, entry));
    }
  });

  return choices;
};

const backgroundsChooseUp = async (req, res) => {
  try {
    const userId = req.params.userId;
    const characterId = req.params.characterId;
    const selectedBackgroundIndex = req.body && (req.body.backgroundIndex || req.body.background || req.body.index)
      ? (req.body.backgroundIndex || req.body.background || req.body.index)
      : null;

    if (!req.session.user_id) {
      return res.redirect('/login');
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send('Unauthorized');
    }

    if (!characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send('characterId invalid.');
    }

    if (!selectedBackgroundIndex || typeof selectedBackgroundIndex !== 'string') {
      return res.status(400).send('Lipsește background-ul selectat.');
    }

    const character = await DnD_CarBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).send('Characterul nu a fost găsit.');
    }

    const backgrounds = loadBackgroundsFromJson();
    const selectedBackground = backgrounds.find(bg => bg.index === selectedBackgroundIndex);

    if (!selectedBackground) {
      return res.status(400).send('Background invalid.');
    }

    const parsedChoices = parseBackgroundChoices(req.body);

    if (character.background && character.background.index && character.background.index !== selectedBackgroundIndex) {
      character.background.choices = [];
    }

    character.background = {
      index: selectedBackgroundIndex,
      choices: parsedChoices
    };

    await character.save();

    return res.redirect(`/${userId}/dnd/builder/${characterId}/background`);
  } catch (error) {
    console.error('backgroundsChooseUp error:', error);
    return res.status(500).json({ success: false, message: 'Eroare la salvarea alegerii.' });
  }
};

const backgroundSpecificsUp = async (req, res, next) => {
  try {
    const { userId, characterId } = req.params;
    const body = req.body || {};
    const type = typeof body.type === 'string' ? body.type.trim() : '';

    if (!type) {
      return next();
    }

    if (!req.session.user_id) {
      return res.redirect('/login');
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send('Unauthorized');
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send('userId invalid.');
    }

    if (!characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send('characterId invalid.');
    }

    const rawIndex = body.index ?? Object.entries(body).find(([key]) =>
      !['type', 'userId', 'characterId', '_csrf'].includes(key)
    )?.[1];
    const indexes = normalizeChoiceValues(rawIndex);

    if (!indexes.length) {
      return res.status(400).send('Lipsește opțiunea selectată.');
    }

    const character = await DnD_CarBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).send('Characterul nu a fost găsit.');
    }

    const choices = (character.background?.choices || []).map(choice => ({
      type: choice.type,
      index: choice.index
    }));

    const [selectedIndex] = indexes;
    const updatedChoices = choices.filter(choice => choice.type !== type);
    updatedChoices.push({ type, index: selectedIndex });

    character.set('background.choices', updatedChoices);
    await character.save();

    return res.redirect(`/${userId}/dnd/builder/${characterId}/background`);
  } catch (error) {
    console.error('backgroundSpecificsUp error:', error);
    return res.status(500).json({ success: false, message: 'Eroare la salvarea opțiunilor background-ului.' });
  }
};

module.exports = {
  backgroundsChooseLoad,
  backgroundsChooseUp,
  backgroundSpecificsUp,
};
