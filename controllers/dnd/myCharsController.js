const moment = require("moment");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const UserPlus = require("../../models/userPlusDataModel");
const bcrypt = require("bcrypt");
const axios = require('axios');
const { parseString } = require('xml2js'); 
const dotenv = require("dotenv").config();

const nodemailer = require("nodemailer");

// const config = require("../../config/config");

const randomString = require("randomstring");
const { loadBackgroundsFromJson } = require("../../middleware/dnd/jsonLoaders/JsonPathMiddleware");


// DND begins here ________________________________________________
const DnD_CharBuilder = require("../../models/dnd/charBuilderModel");

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX





// const fs = require("fs");
// const path = require("path");

// const classesJsonPath = path.join(__dirname, "../../data/2014/en/5e-SRD-classes.json");

// const loadClassesFromJson = () => {
//   try {
//     const raw = fs.readFileSync(classesJsonPath, "utf8");
//     const parsed = JSON.parse(raw);
//     return Array.isArray(parsed) ? parsed : [];
//   } catch (error) {
//     console.error("Eroare la citirea Classes.json pentru D&D:", error);
//     return [];
//   }
// };


const myCharsLoad = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("[MY CHARS] entering myCharsLoad");
    console.log("[MY CHARS] userId:", userId);

    if (!req.session.user_id) {
      return res.redirect("/login");
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send("Unauthorized");
    }

    // Încarc toate caracterele pentru user
    const characters = await DnD_CharBuilder.find({ userLink: userId });
    const backgroundCatalog = loadBackgroundsFromJson();

    console.log("[MY CHARS] loaded characters count:", characters.length);

    // Procesez caracterele pentru a calcula nivelul total
    const processedCharacters = characters.map(char => {
      // Calculez nivelul total din toate clasele
      const totalLevel = char.classes && Array.isArray(char.classes)
        ? char.classes.reduce((sum, cls) => sum + Number(cls.level || 0), 0)
        : 0;

      // Iau prima clasă
      const primaryClass = char.classes && Array.isArray(char.classes) && char.classes.length > 0
        ? char.classes[0]
        : { index: "", level: "0" };
      const selectedBackgroundIndex = String(char.background?.index || "").trim().toLowerCase();
      const selectedBackground = backgroundCatalog.find(
        background => String(background.index || "").trim().toLowerCase() === selectedBackgroundIndex
      ) || null;

      return {
        _id: char._id,
        charName: char.charName || "Unnamed Character",
        charAvatar: char.charAvatar || "/images/characters/default-avatar.jpg",
        selectedBackground,
        race: char.race,
        classes: char.classes || [],
        totalLevel: totalLevel,
        primaryClass: primaryClass,
        isPlayable: char.isPlayable
      };
    });

    // Get user data again for session user_id
    const userDataSession = await User.findById(req.session.user_id);

    return res.render("userAccess/dnd/char/myChars", {
      userId,
      userDataSession,
      characters: processedCharacters,
      pageTitle: "My Characters"
    }, (err, html) => {
      if (err) {
        console.error("[MY CHARS] render error:", err);
        return res.status(500).send("Eroare la renderizarea paginii.");
      }

      console.log("[MY CHARS] render success; html length:", html.length);
      return res.send(html);
    });
  } catch (error) {
    console.error("[MY CHARS] myCharsLoad error:", error);
    return res.status(500).send("Eroare la încărcarea caracterelor.");
  }
};








// ==========================================
// ANIME CHARACTER NAMES
// ==========================================

const ANIME_CHARACTER_NAMES = [
    "Goku",
    "Gohan",
    "Piccolo",
    "Trunks",
    "Naruto",
    "Sasuke",
    "Sakura",
    "Kakashi",
    "Luffy",
    "Zoro",
    "Nami",
    "Sanji",
    "Ace",
    "Pikachu",
    "Ash",
    "Misty",
    "Gojo",
    "Megumi",
    "Nobara",
    "Eren",
    "Levi",
    "Armin",
    "Ichigo",
    "Rukia",
    "Aizen",
    "Saitama",
    "Genos",
    "Deku",
    "All Might",
    "Edward",
    "Roy",
    "Spike",
    "Faye",
    "Rei",
    "Joseph",
    "Natsu",
    "Lucy",
    "Asuna",
    "Anya",
    "Loid",
    "Yor",
    "Frieren",
    "Rem",
    "Emilia",
    "Subaru",
    "Conan",
    "Vash",
    "Alucard",
    "Guts",
    "Astro"
];


// ==========================================
// CREATE CHARACTER
// ==========================================

const createCharacterUP = async (req, res) => {

  try {

    // ==========================================
    // USER ID
    // ==========================================

    const userId = req.params.userId;


    // ==========================================
    // VERIFY SESSION
    // ==========================================

    if (!req.session.user_id) {
      return res.redirect("/login");
    }


    // ==========================================
    // VERIFY THAT THE REQUEST BELONGS
    // TO THE CURRENT USER
    // ==========================================

    if (
      req.session.user_id.toString() !==
      userId.toString()
    ) {
      return res.status(403).send("Unauthorized");
    }


    // ==========================================
    // GENERATE RANDOM CHARACTER NAME
    // ==========================================

    const randomIndex = Math.floor(
      Math.random() * ANIME_CHARACTER_NAMES.length
    );

    const randomCharacterName =
      ANIME_CHARACTER_NAMES[randomIndex];


    // ==========================================
    // CREATE EMPTY CHARACTER
    // ==========================================

    const newCharacter = await DnD_CharBuilder.create({

      userLink: userId,

      charName: randomCharacterName,

      charAvatar: "",

      isPlayable: false,

      race: {
          index: ""
      },

      classes: [],

      subclass: {
          index: "",
          level: "",
          abilities: []
      },

      abilityScores: [],

      background: {
        index: "",
        choices: []
      }

    });


    // ==========================================
    // REDIRECT TO CHARACTER BUILDER
    // ==========================================

    return res.redirect(
        `/${userId}/dnd/builder/${newCharacter._id}/species/choose`
    );


  } catch (error) {

    console.error(
      "Error creating character:",
      error
    );

    return res.status(500).render("error", {
      error: "Nu s-a putut crea personajul."
    });

  }

};




const charNameUP = async (req, res) => {
  try {
    const userId = req.params.userId;
    const characterId = req.params.characterId;
    const charName = req.body && req.body.charName !== undefined
      ? String(req.body.charName).trim()
      : '';

    if (!req.session.user_id) {
      return res.redirect('/login');
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send('Unauthorized');
    }

    if (!characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send('characterId invalid.');
    }

    if (!charName) {
      return res.status(400).send('Numele personajului nu poate fi gol.');
    }

    const character = await DnD_CharBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).send('Characterul nu a fost găsit.');
    }

    character.charName = charName;
    await character.save();

    return res.redirect(`/${userId}/dnd/builder/${characterId}/background`);
  } catch (error) {
    console.error('charNameUP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Eroare la salvarea numelui personajului.'
    });
  }
};






module.exports = {
  myCharsLoad,
  createCharacterUP,
  charNameUP
};
