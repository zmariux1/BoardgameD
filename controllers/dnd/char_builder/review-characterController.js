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
const {
  loadBackgroundsFromJson,
  loadClassesFromJson,
  loadProficienciesFromJson,
  loadRacesFromJson,
  loadSubracesFromJson
} = require("../../../middleware/dnd/jsonLoaders/JsonPathMiddleware");
const {
  buildCharacterAbilityStats
} = require("../../../middleware/dnd/stats/characterAbilityStats");

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX




const previewLoad = async (req, res) => {
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





    // Get user data again for session user_id (not sure why you're doing this again)
    const userDataSession = await User.findById(req.session.user_id);
    const classes = loadClassesFromJson();
    const proficiencies = loadProficienciesFromJson();
    const backgrounds = loadBackgroundsFromJson();
    const races = loadRacesFromJson();
    const subraces = loadSubracesFromJson();

    const findByIndex = (catalog, index) => {
      const normalizedIndex = String(index || "").trim().toLowerCase();
      return catalog.find((entry) =>
        String(entry.index || "").trim().toLowerCase() === normalizedIndex
      ) || null;
    };

    const selectedClassEntry = Array.isArray(character.classes)
      ? character.classes.find((entry) => entry && entry.index)
      : null;
    const selectedClass = findByIndex(classes, selectedClassEntry && selectedClassEntry.index);
    const selectedClassProficiencies = selectedClass
      ? proficiencies
        .filter((proficiency) =>
          ["Armor", "Weapons"].includes(proficiency.type) &&
          Array.isArray(proficiency.classes) &&
          proficiency.classes.some((classEntry) =>
            String(classEntry && classEntry.index || "").trim().toLowerCase() ===
            String(selectedClass.index).trim().toLowerCase()
          )
        )
        .map((proficiency) => proficiency.name)
      : [];
    const selectedRace = findByIndex(races, character.race && character.race.index);
    const selectedSubrace = findByIndex(subraces, character.race && character.race.subRace);
    const selectedBackground = findByIndex(
      backgrounds,
      character.background && character.background.index
    );
    const requiredAbilityTypes = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
    const savedAbilityTypes = new Set(
      (Array.isArray(character.abilityScores) ? character.abilityScores : [])
        .map((ability) => String(ability && ability.type || "").trim().toUpperCase())
    );
    const hasSelectedAllStats = requiredAbilityTypes.every((type) =>
      savedAbilityTypes.has(type)
    );
    const canViewCharSheet = Boolean(
      selectedClass &&
      selectedRace &&
      selectedBackground &&
      hasSelectedAllStats
    );
    const classDescriptionValue = selectedClass && (selectedClass.description || selectedClass.desc);
    const selectedClassDescription = Array.isArray(classDescriptionValue)
      ? classDescriptionValue.join(" ")
      : (typeof classDescriptionValue === "string" ? classDescriptionValue : "");
    const abilityStats = await buildCharacterAbilityStats(character);

    return res.render(
      "userAccess/dnd/char/charBuilder/review-character",
      {
        userId,
        characterId,
        character,
        userDataSession,
        selectedClass,
        hasSelectedClass: Boolean(selectedClass),
        selectedClassProficiencies,
        selectedRace,
        hasSelectedRace: Boolean(selectedRace),
        selectedSubrace,
        selectedBackground,
        hasSelectedBackground: Boolean(selectedBackground),
        hasSelectedAllStats,
        canViewCharSheet,
        selectedClassDescription,
        abilityStats,

        pageTitle: "Review Character"
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
      "[CLASS MANAGEMENT] previewLoad error:",
      error
    );

    return res
      .status(500)
      .send(
        "Eroare la încărcarea claselor D&D."
      );
  }
};

module.exports = {
  previewLoad
};