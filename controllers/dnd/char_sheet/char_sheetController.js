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
const CustomItem = require("../../../models/dnd/customItemsModel");
const Campaign = require("../../../models/dnd/campainOverview");
const { buildCharacterAbilityStats } = require("../../../middleware/dnd/stats/characterAbilityStats");
const {
  buildCharacterPassiveStats
} = require("../../../middleware/dnd/stats/characterPassiveStatsMiddleware");
const {
  adjustCharacterSpellSlots,
  getCharacterSpellSlots,
  getCharacterSpells,
  getSpellFormulaInfo,
  getSpellSlotLevels,
  resolveSpellDamageFormula
} = require("../../../middleware/dnd/spells/characterSpellsMiddleware");
const {
  buildHitPointsWithBonuses
} = require("../../../middleware/dnd/HP/hp_with_bonusesMiddleware");
const { calculateInitiative } = require("../../../middleware/dnd/init/initMiddleware");

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX





const {
  loadBackgroundsFromJson,
  loadLanguagesFromJson,
  loadEquipmentFromJson,
  loadSkillsFromJson,
  loadClassesFromJson,
  loadFeatsFromJson,
  loadLevelsFromJson,
  loadRacesFromJson
} = require("../../../middleware/dnd/jsonLoaders/JsonPathMiddleware");

const VALID_SPELL_AVAILABILITIES = new Set(['always', 'prepared', 'limited']);
const VALID_EQUIPMENT_SLOTS = new Set([
  'Main Hand', 'Secondary Hand', 'Both Hands', 'Armor', 'Shield', 'head', 'body', 'legs',
  'feet', 'hands', 'back', 'waist', 'neck', 'wrist', 'finger', 'bag'
]);
const HAND_EQUIPMENT_SLOTS = new Set(['Main Hand', 'Secondary Hand', 'Both Hands']);

const getEquipmentEquipOptions = (equipment) => {
  const category = String(equipment.equipment_category?.index || '').toLowerCase();
  const name = String(equipment.name || '').toLowerCase();
  const properties = Array.isArray(equipment.properties)
    ? equipment.properties.map(property => String(property.index || '').toLowerCase())
    : [];

  if (
    category === 'shields' ||
    String(equipment.armor_category || '').trim().toLowerCase() === 'shield'
  ) return ['Secondary Hand'];
  if (category === 'weapon') {
    if (properties.includes('two-handed')) return ['Both Hands'];
    return properties.includes('versatile')
      ? ['Main Hand', 'Secondary Hand', 'Both Hands']
      : ['Main Hand', 'Secondary Hand'];
  }
  if (category === 'armor' || category === 'armour') return ['Armor'];
  if (/\bring\b/.test(name)) return ['finger'];
  if (/\b(amulet|medallion|necklace)\b/.test(name)) return ['neck'];
  if (/\b(boots|shoes|sandals)\b/.test(name)) return ['feet'];
  if (/\b(helmet|helm|hat|headband)\b/.test(name)) return ['head'];
  if (/\b(gloves|gauntlets)\b/.test(name)) return ['hands'];
  if (/\b(cloak|cape)\b/.test(name)) return ['back'];
  if (/\b(belt|girdle)\b/.test(name)) return ['waist'];
  if (/\b(trousers|pants|leggings)\b/.test(name)) return ['legs'];
  if (/\b(robe|shirt|vest)\b/.test(name)) return ['body'];

  return ['bag'];
};

const getConflictingEquipmentSlots = (whereEquiped) => {
  if (whereEquiped === 'Both Hands') {
    return new Set(['Main Hand', 'Secondary Hand', 'Both Hands', 'Shield']);
  }
  if (whereEquiped === 'Secondary Hand') {
    return new Set(['Secondary Hand', 'Both Hands', 'Shield']);
  }
  if (whereEquiped === 'Main Hand') {
    return new Set([whereEquiped, 'Both Hands']);
  }
  if (whereEquiped === 'Armor') {
    return new Set(['Armor']);
  }
  return new Set();
};

// ========================== 
// Stats 
// ========================== 
const charSheetLoad = async (req, res) => {
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

        const character = req.characterForSheet || await DnD_CarBuilder.findOne({
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

        const sheetAbilityStats = await buildCharacterAbilityStats(character);
        const initiative = await calculateInitiative(character, {
          abilityStats: sheetAbilityStats
        });

        const totalCharLevel = (Array.isArray(character.classes) ? character.classes : [])
          .reduce((total, characterClass) => {
            const classLevel = Number(characterClass.level);
            return total + (Number.isFinite(classLevel) && classLevel > 0 ? classLevel : 0);
          }, 0);
        const characterLevelData = loadLevelsFromJson().find(
          levelData => Number(levelData.level) === totalCharLevel
        );
        const proficiencyLevel = characterLevelData ? characterLevelData.prof_bonus : 0;
        const classCatalog = loadClassesFromJson();
        const selectedClasses = (Array.isArray(character.classes) ? character.classes : [])
          .map((characterClass) => {
            const classIndex = characterClass?.index;
            const foundClass = classCatalog.find(classData => classData.index === classIndex);
            return foundClass || { index: classIndex || '', name: classIndex || 'Class not selected' };
          })
          .filter((characterClass) => characterClass && (characterClass.name || characterClass.index));
        const featCatalog = loadFeatsFromJson();
        const selectedFeats = (Array.isArray(character.classes) ? character.classes : [])
          .flatMap((characterClass) => (Array.isArray(characterClass.abilities) ? characterClass.abilities : [])
            .filter((ability) => String(ability.conditionId || '') === 'feat' &&
              featCatalog.some((featEntry) => featEntry.index === String(ability.optionIndex || '')))
            .map((ability) => {
              const featIndex = String(ability.optionIndex || '');
              return featCatalog.find((featEntry) => featEntry.index === featIndex);
            }));
        const primaryClassIndex = Array.isArray(character.classes) ? character.classes[0]?.index : '';
        const primaryClass = classCatalog.find(classData => classData.index === primaryClassIndex);
        const savingThrowProficiencies = Array.isArray(primaryClass?.saving_throws)
          ? primaryClass.saving_throws.map(savingThrow => String(savingThrow.name || '').toUpperCase())
          : [];



        // ==========================
        // Background, Languages, Equipment 
        // ========================== 
        const backgroundCatalog = loadBackgroundsFromJson();
        const selectedBackgroundIndex = String(character.background?.index || '').trim().toLowerCase();
        const selectedBackground = selectedBackgroundIndex
          ? backgroundCatalog.find(
            background => String(background.index || '').trim().toLowerCase() === selectedBackgroundIndex
          ) || null
          : null;
        const passiveStats = buildCharacterPassiveStats(character, sheetAbilityStats, {
          backgrounds: backgroundCatalog
        });
        const inventory = Array.isArray(character.inventory) ? character.inventory : [];
        const equipmentInventory = inventory.filter(
          item => item.reference === '5e-SRD-Equipment' && String(item.index || '').trim()
        );
        const customItemInventory = inventory.filter(
          item => item.reference === 'customItemsModel' && String(item.index || '').trim()
        );
        const equipmentCatalog = loadEquipmentFromJson();
        const equipmentByIndex = new Map(
          equipmentCatalog.map(item => [String(item.index || '').trim(), item])
        );
        const equipment = equipmentInventory
          .map(inventoryItem => {
            const equipmentItem = equipmentByIndex.get(String(inventoryItem.index).trim());
            return equipmentItem ? {
              ...equipmentItem,
              inventory: inventoryItem,
              equipOptions: getEquipmentEquipOptions(equipmentItem)
            } : null;
          })
          .filter(Boolean);
        const customItemIndexes = Array.from(new Set(
          customItemInventory.map(item => String(item.index).trim())
        ));
        const customItemCatalog = await CustomItem.find({
          index: { $in: customItemIndexes }
        }).lean();
        const customItemsByIndex = new Map(
          customItemCatalog.map(item => [String(item.index || '').trim(), item])
        );
        const customItems = customItemInventory
          .map(inventoryItem => {
            const customItem = customItemsByIndex.get(String(inventoryItem.index).trim());
            return customItem ? {
              ...customItem,
              inventory: inventoryItem,
              baseEquipment: equipmentByIndex.get(String(customItem.index || '').trim()) || null
            } : null;
          })
          .filter(Boolean);
        const languages = loadLanguagesFromJson();
        const backgroundChoices = Array.isArray(character.background?.choices)
            ? character.background.choices.map(choice => ({
                type: choice.type,
                index: choice.index
            }))
            : [];
        const backgroundLanguages = backgroundChoices
          .filter(choice => String(choice.type || '').toLowerCase().includes('language'))
            .map(choice => ({
                ...choice,
                language: languages.find(language => language.index === choice.index) || null
            }));


        // ==========================
        // Skills
        // ==========================
        const skills = loadSkillsFromJson();


        // ==========================
        // Race
        // ==========================
        const racesCatalog = loadRacesFromJson();
        const race = racesCatalog.find(
          race => race.index === character.race?.index
        ) || null;


        // ==========================
        // Spells
        // ==========================
        const selectedSpells = getCharacterSpells(character);
        const spellSlotsByLevel = getCharacterSpellSlots(character);
        const spellDisplayEntries = selectedSpells.flatMap((spell) =>
          getSpellSlotLevels(spell, spellSlotsByLevel).map((slotLevel) => {
            const formulaInfo = getSpellFormulaInfo(spell, slotLevel);
            const damageAmount = resolveSpellDamageFormula(
              spell,
              character,
              classCatalog,
              sheetAbilityStats,
              slotLevel
            );
            const damageLabel = [
              damageAmount || '—',
              formulaInfo.type === 'healing'
                ? 'Healing'
                : spell.damage?.damage_type?.name
            ].filter(Boolean).join(' ') || '—';

            return {
              ...spell,
              displayLevel: slotLevel,
              damageAmount: damageAmount || '',
              damageLabel
            };
          })
        );
        const actionGroups = Array.isArray(req.characterActionGroups)
          ? req.characterActionGroups
          : [];
        const spellAvailabilityByIndex = (Array.isArray(character.spells) ? character.spells : [])
          .reduce((availabilityByIndex, savedSpell) => {
            const index = String(savedSpell?.index || '').trim();
            const availability = String(savedSpell?.availability || '').trim();

            if (index && VALID_SPELL_AVAILABILITIES.has(availability)) {
              availabilityByIndex[index] = availability;
            }

            return availabilityByIndex;
          }, {});



        // ==========================
        // Căutăm toate campaniile în care apare caracterul
        // ==========================

        const campaigns = await Campaign.find({
            "participants.charID": characterId
        }).select("_id name shortDescription");



        // ==========================================
        // RENDER
        // ==========================================

        return res.render(
            "userAccess/dnd/char/charSheet",
            {
                userId,
                characterId,
                character,
                userDataSession,
                sheetAbilityStats,
                initiative,
                totalCharLevel,
                proficiencyLevel,
                savingThrowProficiencies,
                passiveStats,
                backgrounds: selectedBackground ? [selectedBackground] : [],
                selectedBackground,
                equipment,
                customItems,
                backgroundChoices,
                backgroundLanguages,
                skills,
                spells: spellDisplayEntries,
                spellSlotsByLevel,
                feats: selectedFeats,
                actionGroups,
                spellAvailabilityByIndex,
                race,
                classData: primaryClass,
                classes: selectedClasses,
                Char_total_AC: req.Char_total_AC,
                Char_total_AC_with_items: req.Char_total_AC_with_items,
                Char_total_HP_with_bonuses: req.Char_total_HP_with_bonuses,
                campaigns
            }
        );

    } catch (error) {

        console.error(
            "[CHARACTER SHEET] error:",
            error
        );

        return res.status(500).send(
            "Eroare la încărcarea fișei caracterului D&D."
        );
    }
};

const charSheetHitPointsUp = async (req, res) => {
  const { userId, characterId } = req.params;
  const amount = Number(req.body && req.body.amount);
  const action = req.body && req.body.action;

  if (!req.session.user_id || String(req.session.user_id) !== String(userId)) {
    return res.status(403).json({ success: false, error: "Unauthorized" });
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(characterId)
  ) {
    return res.status(400).json({ success: false, error: "ID invalid." });
  }

  if (!Number.isFinite(amount) || amount <= 0 || !["heal", "damage"].includes(action)) {
    return res.status(400).json({ success: false, error: "Valoare sau acțiune invalidă." });
  }

  try {
    const character = await DnD_CarBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).json({ success: false, error: "Characterul nu a fost găsit." });
    }

    const hpCalculation = await buildHitPointsWithBonuses(character);
    const initialHP = hpCalculation.Char_total_HP_with_bonuses;
    const hpUpdate = action === "damage"
      ? {
          $max: [
            0,
            {
              $subtract: [
                { $ifNull: ["$hp.currentHP_left", initialHP] },
                amount
              ]
            }
          ]
        }
      : {
          $min: [
            initialHP,
            {
              $add: [
                { $ifNull: ["$hp.currentHP_left", initialHP] },
                amount
              ]
            }
          ]
        };
    const hpSet = { "hp.currentHP_left": hpUpdate };
    if (action === "heal" && amount > 1) {
      hpSet["hp.failedDeathSaves"] = 0;
      hpSet["hp.successDeathSaves"] = 0;
    }
    const updatedCharacter = await DnD_CarBuilder.findOneAndUpdate(
      {
        _id: characterId,
        userLink: userId
      },
      [{ $set: hpSet }],
      { new: true }
    ).select("hp.currentHP_left hp.failedDeathSaves hp.successDeathSaves").lean();

    if (!updatedCharacter) {
      return res.status(404).json({ success: false, error: "Characterul nu a fost găsit." });
    }

    return res.json({
      success: true,
      currentHP_left: updatedCharacter.hp.currentHP_left,
      failedDeathSaves: updatedCharacter.hp.failedDeathSaves ?? 0,
      successDeathSaves: updatedCharacter.hp.successDeathSaves ?? 0
    });
  } catch (error) {
    console.error("[CHARACTER SHEET] HP update error:", error);
    return res.status(500).json({
      success: false,
      error: "Eroare la actualizarea punctelor de viață."
    });
  }
};

const charSheetSpellsUp = async (req, res) => {
  try {
    const { userId, characterId } = req.params;

    if (!req.session.user_id) {
      return res.redirect('/login');
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send('Unauthorized');
    }

    if (!mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send('characterId invalid.');
    }

    const availability = String(req.body?.availability || '').trim();
    if (!VALID_SPELL_AVAILABILITIES.has(availability) || availability !== 'prepared') {
      return res.status(400).send('Spell availability invalid.');
    }

    const character = await DnD_CarBuilder.findOne({ _id: characterId, userLink: userId });
    if (!character) {
      return res.status(404).send('Characterul nu a fost găsit.');
    }

    const eligibleSpellIndexes = new Set(getCharacterSpells(character).map((spell) => spell.index));
    const submittedSpellIndexes = Array.from(new Set(
      [].concat(req.body?.spellIndexes || [])
        .map((index) => String(index).trim())
        .filter((index) => index && eligibleSpellIndexes.has(index))
    ));
    const submittedIndexes = new Set(submittedSpellIndexes);
    const preservedSpells = (Array.isArray(character.spells) ? character.spells : [])
      .filter((savedSpell) => {
        const savedIndex = String(savedSpell?.index || '').trim();
        const savedAvailability = String(savedSpell?.availability || '').trim();
        return VALID_SPELL_AVAILABILITIES.has(savedAvailability)
          && savedAvailability !== 'prepared'
          && !submittedIndexes.has(savedIndex);
      });

    character.spells = [
      ...preservedSpells,
      ...submittedSpellIndexes.map((index) => ({ index, availability }))
    ];
    await character.save();

    return res.redirect(`/${userId}/dnd/char/${characterId}`);
  } catch (error) {
    console.error('[CHARACTER SHEET] spell save error:', error);
    return res.status(500).send('Eroare la salvarea spell-urilor.');
  }
};

const charSheetSpellSlotsUp = async (req, res) => {
  try {
    const { userId, characterId } = req.params;

    if (!req.session.user_id) {
      return res.redirect('/login');
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send('Unauthorized');
    }

    if (!mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send('characterId invalid.');
    }

    const slotChange = String(req.body?.slotChange || '');
    const slotChangeMatch = /^([1-9]):(-?1)$/.exec(slotChange);
    if (!slotChangeMatch) {
      return res.status(400).send('Alegerea slotului este invalidă.');
    }
    const spellLevel = Number(slotChangeMatch[1]);
    const delta = Number(slotChangeMatch[2]);

    const character = await DnD_CarBuilder.findOne({ _id: characterId, userLink: userId });
    if (!character) {
      return res.status(404).send('Characterul nu a fost găsit.');
    }

    const slotUpdate = adjustCharacterSpellSlots(character, spellLevel, delta);
    if (!slotUpdate.valid) {
      return res.status(400).send('Alegerea slotului este invalidă.');
    }
    if (!slotUpdate.changed) {
      return res.redirect(`/${userId}/dnd/char/${characterId}#spells`);
    }

    await character.save();
    return res.redirect(`/${userId}/dnd/char/${characterId}#spells`);
  } catch (error) {
    console.error('[CHARACTER SHEET] spell slot update error:', error);
    return res.status(500).send('Eroare la actualizarea spell slots.');
  }
};

const charSheetEquipmentEquipUp = async (req, res) => {
  try {
    const { userId, characterId } = req.params;

    if (!req.session.user_id) {
      return res.redirect('/login');
    }
    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send('Unauthorized');
    }
    if (!mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send('characterId invalid.');
    }

    const equipmentIndex = String(req.body?.equipmentIndex || '').trim();
    const whereEquiped = String(req.body?.whereEquiped || '').trim();
    if (!equipmentIndex || !VALID_EQUIPMENT_SLOTS.has(whereEquiped)) {
      return res.status(400).send('Alegerea echipamentului sau a slotului este invalidă.');
    }

    const character = await DnD_CarBuilder.findOne({ _id: characterId, userLink: userId });
    if (!character) {
      return res.status(404).send('Characterul nu a fost găsit.');
    }

    const inventory = Array.isArray(character.inventory) ? character.inventory : [];
    const inventoryItem = inventory.find(
      item => item.reference === '5e-SRD-Equipment' &&
        String(item.index || '').trim() === equipmentIndex &&
        item.equiped !== true
    );
    if (!inventoryItem) {
      return res.status(404).send('Echipamentul din bag nu a fost găsit.');
    }

    const equipmentItem = loadEquipmentFromJson().find(
      item => String(item.index || '').trim() === equipmentIndex
    );
    if (!equipmentItem || !getEquipmentEquipOptions(equipmentItem).includes(whereEquiped)) {
      return res.status(400).send('Slotul selectat nu este potrivit pentru acest echipament.');
    }
    if (whereEquiped === 'bag') {
      return res.redirect(`/${userId}/dnd/char/${characterId}`);
    }

    const sourceQuantity = Number(inventoryItem.quantity ?? 1);
    if (!Number.isSafeInteger(sourceQuantity) || sourceQuantity < 1) {
      return res.status(400).send('Cantitatea echipamentului din bag este invalidă.');
    }

    const sourceWillSplit = sourceQuantity > 1;
    if (sourceWillSplit) {
      inventoryItem.quantity = sourceQuantity - 1;
    }

    const conflictingSlots = getConflictingEquipmentSlots(whereEquiped);
    const conflictingItems = inventory.filter(item =>
      item !== inventoryItem &&
      item.reference === '5e-SRD-Equipment' &&
      item.equiped === true &&
      conflictingSlots.has(String(item.whereEquiped || ''))
    );

    for (const conflictingItem of conflictingItems) {
      const displacedQuantity = Number(conflictingItem.quantity ?? 1);
      if (!Number.isSafeInteger(displacedQuantity) || displacedQuantity < 1) {
        return res.status(400).send('Cantitatea echipamentului deja echipat este invalidă.');
      }

      const bagStack = inventory.find(item =>
        item !== conflictingItem &&
        !(item === inventoryItem && !sourceWillSplit) &&
        item.reference === conflictingItem.reference &&
        String(item.index || '').trim() === String(conflictingItem.index || '').trim() &&
        item.equiped !== true &&
        (item.whereEquiped === 'bag' || !item.whereEquiped)
      );

      if (bagStack) {
        const bagQuantity = Number(bagStack.quantity ?? 1);
        const updatedQuantity = bagQuantity + displacedQuantity;
        if (!Number.isSafeInteger(bagQuantity) || bagQuantity < 1 || !Number.isSafeInteger(updatedQuantity)) {
          return res.status(400).send('Cantitatea totală a echipamentului din bag este invalidă.');
        }
        bagStack.quantity = updatedQuantity;
        const displacedIndex = inventory.indexOf(conflictingItem);
        if (displacedIndex !== -1) inventory.splice(displacedIndex, 1);
      } else {
        conflictingItem.equiped = false;
        conflictingItem.whereEquiped = 'bag';
        conflictingItem.quantity = displacedQuantity;
      }
    }

    if (sourceWillSplit) {
      inventoryItem.whereEquiped = 'bag';
      inventoryItem.equiped = false;
      inventory.push({
        index: equipmentIndex,
        reference: '5e-SRD-Equipment',
        equiped: true,
        attuned: inventoryItem.attuned === true,
        whereEquiped,
        quantity: 1
      });
    } else {
      inventoryItem.whereEquiped = whereEquiped;
      inventoryItem.equiped = true;
      inventoryItem.quantity = 1;
    }

    character.inventory = inventory;
    await character.save();

    return res.redirect(`/${userId}/dnd/char/${characterId}`);
  } catch (error) {
    console.error('[CHARACTER SHEET] equipment equip error:', error);
    return res.status(500).send('Eroare la echiparea obiectului.');
  }
};





module.exports = {
  charSheetLoad,
  charSheetHitPointsUp,
  charSheetSpellsUp,
  charSheetSpellSlotsUp,
  charSheetEquipmentEquipUp,
//   charSheetUp,
};
