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


// DND begins here ________________________________________________
const DnD_CharBuilder = require("../../models/dnd/charBuilderModel");

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX





const { loadEquipmentFromJson } =
  require("../../middleware/dnd/jsonLoaders/JsonPathMiddleware");

const getShopItemDetails = (equipment) => {
  const categoryIndex = String(equipment.equipment_category?.index || '').trim();
  const categoryName = String(equipment.equipment_category?.name || '').trim();
  const itemType = String(
    equipment.gear_category?.name ||
    equipment.armor_category ||
    equipment.weapon_category ||
    categoryName ||
    'Item type'
  ).trim();
  const imageByCategory = {
    weapon: '/img/dnd/shop/sword.png',
    armor: '/img/dnd/shop/leather-armor.png',
    shields: '/img/dnd/shop/leather-armor.png',
    'adventuring-gear': '/img/dnd/shop/boots.png',
    tools: '/img/dnd/shop/ring.png',
    'mounts-and-vehicles': '/img/dnd/shop/dragon.png'
  };
  const cost = equipment.cost;

  return {
    ...equipment,
    shopCategory: ['weapon', 'armor', 'shields'].includes(categoryIndex) ? categoryIndex : 'gear',
    itemType,
    imagePath: imageByCategory[categoryIndex] || '/img/dnd/shop/boots.png',
    displayPrice: cost?.quantity != null && cost?.unit
      ? `${cost.quantity} ${cost.unit}`
      : 'Price TBD'
  };
};


const playerShopLoad = async (req, res) => {
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

        const character = await DnD_CharBuilder.findOne({
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

        const shopBuy = loadEquipmentFromJson().map(getShopItemDetails);

        // ==========================================
        // RENDER
        // ==========================================

        return res.render(
            "userAccess/dnd/char/playerShop",
            {
                userId,
                characterId,
                character,
                userDataSession,
                shopBuy
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












const playerShopBuyUp = async (req, res) => {
  try {
    const userId = req.params.userId;
    const characterId = req.params.characterId;
    const equipmentIndex = String(req.body?.equipmentIndex || '').trim();
    const quantity = Number(req.body?.quantity);

    if (!req.session.user_id) {
      return res.redirect('/login');
    }

    if (req.session.user_id.toString() !== userId.toString()) {
      return res.status(403).send('Unauthorized');
    }

    if (!characterId || !mongoose.Types.ObjectId.isValid(characterId)) {
      return res.status(400).send('characterId invalid.');
    }

    if (!equipmentIndex) {
      return res.status(400).send('Lipsește indexul echipamentului.');
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      return res.status(400).send('Cantitatea echipamentului este invalidă.');
    }

    const character = await DnD_CharBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return res.status(404).send('Characterul nu a fost găsit.');
    }

    const equipmentExists = loadEquipmentFromJson().some(
      equipment => String(equipment.index || '').trim() === equipmentIndex
    );
    if (!equipmentExists) {
      return res.status(400).send('Echipamentul selectat nu este valid.');
    }

    if (!Array.isArray(character.inventory)) {
      character.inventory = [];
    }
    const inventory = character.inventory;
    const existingInventoryItem = inventory.find(
      item => item.reference === '5e-SRD-Equipment' &&
        String(item.index || '').trim() === equipmentIndex
    );

    if (existingInventoryItem) {
      const currentQuantity = Number(existingInventoryItem.quantity);
      const updatedQuantity = (Number.isSafeInteger(currentQuantity) && currentQuantity > 0
        ? currentQuantity
        : 0) + quantity;
      if (!Number.isSafeInteger(updatedQuantity)) {
        return res.status(400).send('Cantitatea totală a echipamentului este prea mare.');
      }
      existingInventoryItem.quantity = updatedQuantity;
    } else {
      character.inventory.push({
        index: equipmentIndex,
        reference: '5e-SRD-Equipment',
        equiped: false,
        attuned: false,
        whereEquiped: 'bag',
        quantity
      });
    }

    await character.save();

    return res.redirect(`/${userId}/dnd/char/${characterId}/playerShop`);
  } catch (error) {
    console.error('playerShopBuyUp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Eroare la salvarea numelui personajului.'
    });
  }
};






module.exports = {
  playerShopLoad,
  playerShopBuyUp
};
