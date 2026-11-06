const mongoose = require("mongoose");
const moment = require("moment");
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





const fs = require("fs");
const path = require("path");

const speciesJsonPath = path.join(__dirname, "../../../data/2014/en/5e-SRD-Races.json");
// const featuresJsonPath = path.join(__dirname, "../../../data/2014/en/5e-SRD-Features.json");

const loadSpeciesFromJson = () => {
  try {
    const raw = fs.readFileSync(speciesJsonPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Eroare la citirea Species.json pentru D&D:", error);
    return [];
  }
};

// const loadFeaturesFromJson = () => {
//   try {
//     const raw = fs.readFileSync(featuresJsonPath, "utf8");
//     const parsed = JSON.parse(raw);
//     return Array.isArray(parsed) ? parsed : [];
//   } catch (error) {
//     console.error("Eroare la citirea Features.json pentru D&D:", error);
//     return [];
//   }
// };

const speciesChooseLoad = async (req, res) => {
  try {

    // ==========================================
    // USER ID
    // ==========================================

    const userId = req.params.userId;

    console.log(
      "[SPECIES CHOOSE] entering speciesChooseLoad"
    );

    console.log(
      "[SPECIES CHOOSE] userId:",
      userId
    );

    console.log(
      "[SPECIES CHOOSE] json path:",
      speciesJsonPath
    );


    // ==========================================
    // CHARACTER ID
    // ==========================================

    const characterId = req.params.characterId;

    console.log(
      "[SPECIES CHOOSE] characterId:",
      characterId
    );


    // ==========================================
    // VERIFY SESSION
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
      return res.status(403).send(
        "Unauthorized"
      );
    }


    // ==========================================
    // VERIFY CHARACTER ID
    // ==========================================

    if (!characterId) {
      return res.status(400).send(
        "Lipsește characterId."
      );
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


    console.log(
      "[SPECIES CHOOSE] character loaded:",
      character._id
    );


    // ==========================================
    // LOAD SPECIES
    // ==========================================

    const species = loadSpeciesFromJson();

    console.log(
      "[SPECIES CHOOSE] loaded species length:",
      Array.isArray(species)
        ? species.length
        : "not-array"
    );

    console.log(
      "[SPECIES CHOOSE] first species sample:",
      Array.isArray(species) && species[0]
        ? species[0].name
        : "none"
    );


    // ==========================================
    // USER DATA
    // ==========================================

    const userDataSession = await User.findById(
      req.session.user_id
    );


    // ==========================================
    // RENDER
    // ==========================================

    return res.render(
      "userAccess/dnd/char/charBuilder/species_choise",
      {
        userId,
        characterId,
        character,
        userDataSession,
        species,
        pageTitle: "Alege-ți Specia"
      },
      (err, html) => {

        if (err) {

          console.error(
            "[SPECIES CHOOSE] render error:",
            err
          );

          return res.status(500).send(
            "Eroare la renderizarea paginii de alegere a speciei."
          );
        }


        console.log(
          "[SPECIES CHOOSE] render success; html length:",
          html.length
        );

        return res.send(html);
      }
    );

  } catch (error) {

    console.error(
      "[SPECIES CHOOSE] speciesChooseLoad error:",
      error
    );

    return res.status(500).send(
      "Eroare la încărcarea speciilor D&D."
    );
  }
};

const speciesChooseUp = async (req, res) => {

    try {

        // ==========================================
        // URL DATA
        // ==========================================

        const userId = req.params.userId;
        const characterId = req.params.characterId;


        // ==========================================
        // FORM DATA
        // ==========================================

        const submittedUserId = req.body.userID;
        const raceIndex = req.body.raceIndex;


        console.log(
            "[SPECIES CHOOSE UP] userId:",
            userId
        );

        console.log(
            "[SPECIES CHOOSE UP] characterId:",
            characterId
        );

        console.log(
            "[SPECIES CHOOSE UP] submittedUserId:",
            submittedUserId
        );

        console.log(
            "[SPECIES CHOOSE UP] raceIndex:",
            raceIndex
        );


        // ==========================================
        // VERIFY SESSION
        // ==========================================

        if (!req.session.user_id) {
            return res.redirect("/login");
        }


        // ==========================================
        // VERIFY URL USER
        // ==========================================

        if (
            req.session.user_id.toString() !==
            userId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized user."
            });
        }


        // ==========================================
        // VERIFY FORM USER
        // ==========================================

        if (
            submittedUserId &&
            submittedUserId.toString() !==
            userId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "User ID mismatch."
            });
        }


        // ==========================================
        // VERIFY CHARACTER ID
        // ==========================================

        if (!characterId) {
            return res.status(400).json({
                success: false,
                message: "Lipsește characterId."
            });
        }


        if (
            !mongoose.Types.ObjectId.isValid(characterId)
        ) {
            return res.status(400).json({
                success: false,
                message: "characterId invalid."
            });
        }


        // ==========================================
        // VERIFY RACE
        // ==========================================

        if (
            !raceIndex ||
            typeof raceIndex !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Lipsește rasa selectată."
            });
        }


        // ==========================================
        // FIND CHARACTER
        // ==========================================

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


        // ==========================================
        // UPDATE RACE
        // ==========================================

        character.race.index = raceIndex;

        await character.save();


        // ==========================================
        // SUCCESS
        // ==========================================

        console.log(
            "[SPECIES CHOOSE UP] Race saved successfully:",
            character.race.index
        );


        return res.status(200).json({

            success: true,

            userId,

            characterId,

            raceIndex: character.race.index,

            message: "Rasa a fost salvată cu succes."

        });


    } catch (error) {

        console.error(
            "[SPECIES CHOOSE UP] error:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "Eroare la salvarea alegerii rasei."

        });
    }
};



module.exports = {
  speciesChooseLoad,
  speciesChooseUp,
};
