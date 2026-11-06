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





const {
  loadRacesFromJson: loadSpeciesFromJson,
  loadSubracesFromJson
} =
  require("../../../middleware/dnd/jsonLoaders/JsonPathMiddleware");

const speciesChooseLoad = async (req, res) => {
  try {

    // ==========================================
    // USER ID
    // ==========================================

    const userId = req.params.userId;


    // ==========================================
    // CHARACTER ID
    // ==========================================

    const characterId = req.params.characterId;


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
      console.warn("[SPECIES CHOOSE] 403 - user mismatch");
      return res.status(403).send(
        "Unauthorized"
      );
    }


    // ==========================================
    // VERIFY CHARACTER ID
    // ==========================================

    if (!characterId) {
      console.warn("[SPECIES CHOOSE] 400 - missing characterId");
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
      console.warn("[SPECIES CHOOSE] 404 - character not found");
      return res.status(404).send(
        "Characterul nu a fost găsit."
      );
    }


    // ==========================================
    // LOAD SPECIES
    // ==========================================

    const species = loadSpeciesFromJson();
    const subraces = loadSubracesFromJson();


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
        subraces,
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

        const raceIndex = req.body.raceIndex;
        const subRaceIndex = req.body.subRace || "";


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
          console.warn("[SPECIES CHOOSE UP] 403 - user mismatch");
            return res.status(403).json({
                success: false,
                message: "Unauthorized user."
            });
        }


        // ==========================================
        // VERIFY CHARACTER ID
        // ==========================================

        if (!characterId) {
          console.warn("[SPECIES CHOOSE UP] 400 - missing characterId");
          return res.status(400).send("Lipsește characterId.");
        }


        if (
            !mongoose.Types.ObjectId.isValid(characterId)
        ) {
          console.warn("[SPECIES CHOOSE UP] 400 - invalid characterId");
          return res.status(400).send("characterId invalid.");
        }


        // ==========================================
        // VERIFY RACE
        // ==========================================

        if (
            !raceIndex ||
            typeof raceIndex !== "string"
        ) {
          console.warn("[SPECIES CHOOSE UP] 400 - missing raceIndex");
          return res.status(400).send("Lipsește rasa selectată.");
        }

        if (typeof subRaceIndex !== "string") {
          console.warn("[SPECIES CHOOSE UP] 400 - invalid subRace");
          return res.status(400).send("Subrasa selectată este invalidă.");
        }

        if (
            subRaceIndex &&
            !loadSubracesFromJson().some(
              (subrace) =>
                subrace.index === subRaceIndex &&
                subrace.race &&
                subrace.race.index === raceIndex
            )
        ) {
          console.warn("[SPECIES CHOOSE UP] 400 - subrace does not belong to race");
          return res.status(400).send("Subrasa selectată nu aparține rasei.");
        }


        // ==========================================
        // FIND CHARACTER
        // ==========================================

        const character = await DnD_CarBuilder.findOne({
            _id: characterId,
            userLink: userId
        });


        if (!character) {
          console.warn("[SPECIES CHOOSE UP] 404 - character not found");
          return res.status(404).send("Characterul nu a fost găsit.");
        }


        // ==========================================
        // UPDATE RACE
        // ==========================================

        character.race.index = raceIndex;
        character.race.subRace = subRaceIndex;

        await character.save();


        // ==========================================
        // SUCCESS
        // ==========================================

        return res.redirect(`/${userId}/dnd/builder/${characterId}/class/choose`);


    } catch (error) {

        console.error(
            "[SPECIES CHOOSE UP] error:",
            error
        );

        return res.status(500).send("Eroare la salvarea alegerii rasei.");
    }
};



module.exports = {
  speciesChooseLoad,
  speciesChooseUp,
};
