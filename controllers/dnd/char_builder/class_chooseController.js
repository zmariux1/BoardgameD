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
  loadFeaturesFromJson
} = require("../../../middleware/dnd/jsonLoaders/JsonPathMiddleware");

const classChooseLoad = async (req, res) => {
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

    console.log("[CLASS CHOOSE] entering classChooseLoad");
    console.log("[CLASS CHOOSE] userId:", userId);

    const allClasses = loadClassesFromJson();
    const selectedClassIndexes = new Set(
      (Array.isArray(character.classes) ? character.classes : [])
        .map((classEntry) => String(classEntry && classEntry.index || "").trim().toLowerCase())
        .filter(Boolean)
    );
    const classes = allClasses.filter((classItem) =>
      !selectedClassIndexes.has(String(classItem && classItem.index || "").trim().toLowerCase())
    );
    console.log("[CLASS CHOOSE] loaded classes length:", classes.length);
    console.log("[CLASS CHOOSE] first available class sample:", classes[0] ? classes[0].name : "none");


    const features = loadFeaturesFromJson();
    console.log("[CLASS CHOOSE] loaded features length:", Array.isArray(features) ? features.length : "not-array");
    console.log("[CLASS CHOOSE] first feature sample:", Array.isArray(features) && features[0] ? features[0].name : "none");



    // Get user data again for session user_id (not sure why you're doing this again)
    const userDataSession = await User.findById(req.session.user_id);

    return res.render("userAccess/dnd/char/charBuilder/class_choise", {
      userId,
      characterId,
      character,
      userDataSession,
      classes,
      features,
      pageTitle: "Alege-ți Clasa"
    }, (err, html) => {
      if (err) {
        console.error("[CLASS CHOOSE] render error:", err);
        return res.status(500).send("Eroare la renderizarea paginii de alegere a clasei.");
      }

      console.log("[CLASS CHOOSE] render success; html length:", html.length);
      return res.send(html);
    });
  } catch (error) {
    console.error("[CLASS CHOOSE] classChooseLoad error:", error);
    return res.status(500).send("Eroare la încărcarea claselor D&D.");
  }
};

const classChooseUp = async (req, res) => {
  try {
    const userId = req.params.userId;
    const characterId = req.params.characterId;
    const selectedClass = req.body && req.body.classIndex ? req.body.classIndex : null;
    const level = req.body && req.body.level ? Number(req.body.level) : null;

    if (!req.session.user_id) {
      return res.redirect("/login");
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send("Unauthorized");
    }

    if (!characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send("characterId invalid.");
    }

    if (!selectedClass || typeof selectedClass !== "string") {
      return res.status(400).send("Lipsește clasa selectată.");
    }

    if (!Number.isInteger(level) || level < 1 || level > 20) {
      return res.status(400).send("Nivelul clasei este invalid.");
    }

    const character = await DnD_CarBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).send("Characterul nu a fost găsit.");
    }

    // Adaugă o nouă clasă la array-ul de clase
    character.classes.push({
      index: selectedClass,
      level: String(level),
      abilities: []
    });
    await character.save();

    return res.redirect(`/${userId}/dnd/builder/${characterId}/class/management`);
  } catch (error) {
    console.error("classChooseUp error:", error);
    return res.status(500).json({ success: false, message: "Eroare la salvarea alegerii." });
  }
};

module.exports = {
  classChooseLoad,
  classChooseUp,
};
