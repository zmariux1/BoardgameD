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
  loadClassesFromJson,
  loadFeaturesFromJson,
  loadFeatsFromJson,
  loadStatsImprovementsFromJson
} = require("../../../middleware/dnd/jsonLoaders/JsonPathMiddleware");

/*
|--------------------------------------------------------------------------
| CLASELE SELECTATE DE UTILIZATOR
|--------------------------------------------------------------------------
|
| Temporar sunt definite manual.
|
| Pe viitor, aceste indexuri vor fi preluate din baza de date
| pe baza userId-ului.
|
| Exemplu:
|
| ["barbarian", "bard"]
|
*/

// selectedClassIndexes se vor construi dinamic din character.classes
// temporaryClassLevels se vor construi dinamic din character.classes

const classManagementLoad = async (req, res) => {
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

    // Construim selectedClassIndexes din character.classes array
    const selectedClassIndexes = character.classes && Array.isArray(character.classes)
      ? character.classes.map(cls => cls.index).filter(index => index)
      : [];

    // Construim temporaryClassLevels din character.classes array
    const temporaryClassLevels = {};
    if (character.classes && Array.isArray(character.classes)) {
      character.classes.forEach(cls => {
        if (cls.index && cls.level) {
          temporaryClassLevels[cls.index] = Number(cls.level);
        }
      });
    }

    console.log("[CLASS MANAGEMENT] entering classManagementLoad");
    console.log("[CLASS MANAGEMENT] userId:", userId);


    /*
    |--------------------------------------------------------------------------
    | 1. ÎNCĂRCĂM TOATE CLASELE DIN JSON
    |--------------------------------------------------------------------------
    */

    const allClasses = loadClassesFromJson();

    console.log(
      "[CLASS MANAGEMENT] loaded all classes length:",
      Array.isArray(allClasses) ? allClasses.length : "not-array"
    );


    /*
    |--------------------------------------------------------------------------
    | 2. FILTRĂM CLASELE SELECTATE
    |--------------------------------------------------------------------------
    |
    | Păstrăm doar clasele al căror "index" există în
    | selectedClassIndexes.
    |
    */

    const classes = allClasses.filter((classItem) =>
      selectedClassIndexes.includes(classItem.index)
    );


    console.log(
      "[CLASS MANAGEMENT] selected class indexes:",
      selectedClassIndexes
    );

    console.log(
      "[CLASS MANAGEMENT] filtered classes length:",
      classes.length
    );

    console.log(
      "[CLASS MANAGEMENT] filtered classes:",
      classes.map((classItem) => classItem.index)
    );


    /*
    |--------------------------------------------------------------------------
    | 3. ÎNCĂRCĂM FEATURES
    |--------------------------------------------------------------------------
    */

    const features = loadFeaturesFromJson();
    const feats = loadFeatsFromJson();
    const statsImprovements = loadStatsImprovementsFromJson();

    console.log(
      "[CLASS MANAGEMENT] loaded features length:",
      Array.isArray(features) ? features.length : "not-array"
    );

    console.log(
      "[CLASS MANAGEMENT] first feature sample:",
      Array.isArray(features) && features[0]
        ? features[0].name
        : "none"
    );


    /*
    |--------------------------------------------------------------------------
    | 4. TRIMITEM DATELE CĂTRE EJS
    |--------------------------------------------------------------------------
    */



    // Get user data again for session user_id (not sure why you're doing this again)
    const userDataSession = await User.findById(req.session.user_id);

    return res.render(
      "userAccess/dnd/char/charBuilder/class_management",
      {
        userId,
        characterId,
        character,
        userDataSession,
        classes,
        features,
        feats,
        statsImprovements,
        selectedClassIndexes,
        temporaryClassLevels,
        pageTitle: "Alege-ți Clasa"
      },
      (err, html) => {

        if (err) {
          console.error(
            "[CLASS MANAGEMENT] render error:",
            err
          );

          return res
            .status(500)
            .send(
              "Eroare la renderizarea paginii de alegere a clasei."
            );
        }


        console.log(
          "[CLASS MANAGEMENT] render success; html length:",
          html.length
        );


        return res.send(html);
      }
    );

  } catch (error) {

    console.error(
      "[CLASS MANAGEMENT] classManagementLoad error:",
      error
    );

    return res
      .status(500)
      .send(
        "Eroare la încărcarea claselor D&D."
      );
  }
};


const classManagementLevelUp = async (req, res) => {

  try {

    const userId = req.params.userId;
    const characterId = req.params.characterId;
    const classIndex = req.body && req.body.classIndex ? req.body.classIndex : null;
    const newLevel = req.body && req.body.levelControlDropdown ? Number(req.body.levelControlDropdown) : null;

    console.log("[CLASS MANAGEMENT LEVEL] entering classManagementLevelUp");
    console.log("[CLASS MANAGEMENT LEVEL] userId:", userId);
    console.log("[CLASS MANAGEMENT LEVEL] characterId:", characterId);
    console.log("[CLASS MANAGEMENT LEVEL] classIndex:", classIndex);
    console.log("[CLASS MANAGEMENT LEVEL] newLevel:", newLevel);

    if (!req.session.user_id) {
      return res.redirect("/login");
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send("Unauthorized");
    }

    if (!characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send("characterId invalid.");
    }

    if (!classIndex || typeof classIndex !== "string") {
      return res.status(400).send("classIndex invalid.");
    }

    if (!Number.isInteger(newLevel) || newLevel < 1 || newLevel > 20) {
      return res.status(400).send("newLevel invalid.");
    }

    const character = await DnD_CarBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).send("Characterul nu a fost găsit.");
    }

    // Găsim clasa cu indexul dat și actualizez nivelul
    const classToUpdate = character.classes.find(cls => cls.index === classIndex);

    if (!classToUpdate) {
      return res.status(404).send("Clasa nu a fost găsită pentru acest character.");
    }

    classToUpdate.level = String(newLevel);
    await character.save();

    console.log("[CLASS MANAGEMENT LEVEL] clasa actualizată:", classIndex, "la nivelul:", newLevel);

    // Redirect back to management page
    return res.redirect(`/${userId}/dnd/builder/${characterId}/class/management`);

  } catch (error) {

    console.error(
      "[CLASS MANAGEMENT LEVEL] classManagementLevelUp error:",
      error
    );

    return res.status(500).send("Eroare la actualizarea nivelului clasei.");
  }
};

const classManagementDelete = async (req, res) => {
  try {
    const userId = req.params.userId;
    const characterId = req.params.characterId;
    const classEntryId = req.body && req.body.classEntryId;

    if (!req.session.user_id) {
      return res.redirect("/login");
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send("Unauthorized");
    }

    if (!characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send("characterId invalid.");
    }

    if (!classEntryId || !mongoose.Types.ObjectId.isValid(classEntryId)) {
      return res.status(400).send("classEntryId invalid.");
    }

    const character = await DnD_CarBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).send("Characterul nu a fost găsit.");
    }

    const classToDelete = character.classes.id(classEntryId);
    if (!classToDelete) {
      return res.status(404).send("Clasa nu a fost găsită pentru acest character.");
    }

    character.classes.pull(classToDelete._id);
    await character.save();

    return res.redirect(`/${userId}/dnd/builder/${characterId}/class/management`);
  } catch (error) {
    console.error("[CLASS MANAGEMENT DELETE] error:", error);
    return res.status(500).send("Eroare la ștergerea clasei.");
  }
};


const classManagementSkillsUp = async (req, res) => {
  try {

    const userId = req.params.userId;
    const characterId = req.params.characterId;
    const {
      classIndex,
      featureIndex,
      featureName,
      choiceType,
      conditionId,
      conditionLabel,
      optionIndex,
      optionName,
      selectionMode,
      value,
      featIndex,
      featSlot
    } = req.body || {};
    const optionValue = value === '' || value === undefined ? 0 : Number(value);

    if (!req.session.user_id) {
      return res.redirect("/login");
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send("Unauthorized");
    }

    if (!characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send("characterId invalid.");
    }

    if (!classIndex || !featureIndex || !optionIndex || !optionName) {
      return res.status(400).send("Datele alegerii sunt incomplete.");
    }

    if (!Number.isFinite(optionValue)) {
      return res.status(400).send("Valoarea alegerii este invalidă.");
    }

    const character = await DnD_CarBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).send("Characterul nu a fost găsit.");
    }

    const selectedClass = character.classes.find(cls => cls.index === classIndex);

    if (!selectedClass) {
      return res.status(404).send("Clasa nu a fost găsită pentru acest character.");
    }

    if (!Array.isArray(selectedClass.abilities)) {
      selectedClass.abilities = [];
    }

    if (selectionMode === "feat-improvement") {
      const selectedFeatIndex = String(featIndex || "");
      const selectedFeat = loadFeatsFromJson().find(
        (feat) => String(feat.index || "") === selectedFeatIndex
      );
      const featChoiceSlot = Number(featSlot);
      if (!selectedFeat || !Number.isInteger(featChoiceSlot) || featChoiceSlot < 0) {
        return res.status(400).send("Feat-ul selectat nu este valid.");
      }

      const savedFeat = selectedClass.abilities.some((ability) =>
        String(ability.index || "") === String(featureIndex) &&
        String(ability.conditionId || "") === "feat" &&
        Number(ability.slot || 0) === featChoiceSlot &&
        String(ability.optionIndex || "") === selectedFeatIndex
      );
      if (!savedFeat) {
        return res.status(400).send("Feat-ul nu este selectat pentru această clasă.");
      }

      const improvement = loadStatsImprovementsFromJson().find((entry) =>
        entry.reference === "feats" &&
        Array.isArray(entry.givenBy) &&
        entry.givenBy.some((givenBy) =>
          String(givenBy.index || "") === selectedFeatIndex
        )
      );
      const condition = improvement?.choice?.options_conditions?.find((entry) =>
        String(entry.id || "") === String(conditionId || "")
      );
      const chooseCount = Number(condition?.choose);
      const choiceSlot = Number(req.body.slot);
      if (
        !condition ||
        !Number.isInteger(chooseCount) ||
        !Number.isInteger(choiceSlot) ||
        choiceSlot < 0 ||
        choiceSlot >= chooseCount
      ) {
        return res.status(400).send("Condiția aleasă pentru feat nu este validă.");
      }

      const selectedOption = improvement.choice.from?.options?.find((option) =>
        option.item &&
        String(option.item.name || "").trim() &&
        String(option.item.name).trim().slice(0, 3).toUpperCase() ===
          String(optionIndex || "").trim().toUpperCase()
      );
      if (!selectedOption) {
        return res.status(400).send("Abilitatea aleasă pentru feat nu este validă.");
      }

      const featAbilityIndex = `feat-${String(selectedFeat.name || selectedFeat.index)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`;
      const featChoiceScope = `feat:${featureIndex}:${featChoiceSlot}:`;
      const savedConditionId = `${featChoiceScope}${condition.id}`;
      if (
        condition.different &&
        selectedClass.abilities.some((ability) =>
          String(ability.index || "") === featAbilityIndex &&
          String(ability.conditionId || "") === savedConditionId &&
          Number(ability.slot || 0) !== choiceSlot &&
          String(ability.optionIndex || "").toUpperCase() ===
            String(optionIndex || "").trim().toUpperCase()
        )
      ) {
        return res.status(400).send("Alege abilități diferite pentru acest feat.");
      }

      selectedClass.abilities = selectedClass.abilities.filter((ability) =>
        String(ability.index || "") !== featAbilityIndex ||
        !String(ability.conditionId || "").startsWith(featChoiceScope) ||
        String(ability.conditionId || "") === savedConditionId
      );
      const existingFeatAbility = selectedClass.abilities.find((ability) =>
        String(ability.index || "") === featAbilityIndex &&
        String(ability.conditionId || "") === savedConditionId &&
        Number(ability.slot || 0) === choiceSlot
      );
      const featAbilityData = {
        index: featAbilityIndex,
        decision: String(selectedOption.item.name).trim(),
        optionIndex: String(selectedOption.item.name).trim().slice(0, 3).toUpperCase(),
        value: Number(condition.value) || 0,
        conditionId: savedConditionId,
        slot: choiceSlot
      };

      if (existingFeatAbility) {
        Object.assign(existingFeatAbility, featAbilityData);
      } else {
        selectedClass.abilities.push(featAbilityData);
      }

      await character.save();
      return res.redirect(`/${userId}/dnd/builder/${characterId}/class/management`);
    }

    const normalizedConditionId = String(conditionId || '');
    const slot = Number.isInteger(Number(req.body.slot))
      ? Number(req.body.slot)
      : 0;

    if (selectionMode === 'condition') {
      if (String(optionIndex) !== normalizedConditionId) {
        return res.status(400).send("Varianta aleasă este invalidă.");
      }

      selectedClass.abilities = selectedClass.abilities.filter(ability =>
        String(ability.index || '') !== String(featureIndex) &&
        !String(ability.conditionId || '').startsWith(`feat:${featureIndex}:`)
      );
    }

    if (selectionMode !== 'condition' && normalizedConditionId === 'feat' && !loadFeatsFromJson().some(feat =>
      String(feat.index || '') === String(optionIndex)
    )) {
      return res.status(400).send("Feat-ul ales nu există.");
    }

    // Aceasta este cheia unei decizii: același feature, aceeași condiție și același dropdown.
    const existingAbility = selectedClass.abilities.find(ability =>
      String(ability.index || '') === String(featureIndex) &&
      String(ability.conditionId || '') === normalizedConditionId &&
      Number(ability.slot || 0) === slot
    );

    if (
      normalizedConditionId === 'feat' &&
      existingAbility &&
      String(existingAbility.optionIndex || '') !== String(optionIndex)
    ) {
      const previousFeat = loadFeatsFromJson().find(
        (feat) => String(feat.index || '') === String(existingAbility.optionIndex || '')
      );
      if (previousFeat) {
        const previousFeatAbilityIndex = `feat-${String(previousFeat.name || previousFeat.index)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}`;
        const previousFeatScope = `feat:${featureIndex}:${slot}:`;
        selectedClass.abilities = selectedClass.abilities.filter((ability) =>
          String(ability.index || '') !== previousFeatAbilityIndex ||
          !String(ability.conditionId || '').startsWith(previousFeatScope)
        );
      }
    }

    const abilityData = {
      index: featureIndex,
      decision: optionName,
      optionIndex,
      value: optionValue,
      conditionId: normalizedConditionId,
      slot
    };

    if (existingAbility) {
      // Decizia există deja: înlocuiește alegerea veche.
      Object.assign(existingAbility, abilityData);
    } else {
      // Decizia nu există: adaugă o alegere nouă.
      selectedClass.abilities.push(abilityData);
    }

    await character.save();

    console.log("[CLASS MANAGEMENT SKILLS] saved:", {
      classIndex,
      featureIndex,
      featureName,
      choiceType,
      conditionId,
      conditionLabel,
      optionIndex,
      optionName,
      value: optionValue,
      slot
    });

    return res.redirect(`/${userId}/dnd/builder/${characterId}/class/management`);

  } catch (error) {
    console.error("[CLASS MANAGEMENT SKILLS] error:", error);
    return res.status(500).send("Eroare la salvarea alegerii feature-ului.");
  }
};


module.exports = {
  classManagementLoad,
  classManagementLevelUp,
  classManagementDelete,
  classManagementSkillsUp
};