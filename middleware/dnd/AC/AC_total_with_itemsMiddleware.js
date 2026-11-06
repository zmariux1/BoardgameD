const { loadEquipmentFromJson } = require("../jsonLoaders/JsonPathMiddleware");

const EQUIPPED_LOCATIONS = new Set([
  "main hand",
  "secondary hand",
  "both hands",
  "armor",
  "shield",
  "head",
  "body",
  "legs",
  "feet",
  "hands",
  "back",
  "waist",
  "neck",
  "wrist",
  "finger"
]);

const getEquippedEquipment = (character, equipmentCatalog) => {
  const inventory = Array.isArray(character && character.inventory)
    ? character.inventory
    : [];
  const equipmentByIndex = new Map(
    equipmentCatalog.map((item) => [String(item && item.index || "").trim().toLowerCase(), item])
  );

  return inventory
    .filter((item) => {
      const location = String(item && item.whereEquiped || "").trim().toLowerCase();
      return item &&
        item.equiped === true &&
        item.reference === "5e-SRD-Equipment" &&
        EQUIPPED_LOCATIONS.has(location);
    })
    .map((inventoryItem) => {
      const itemIndex = String(inventoryItem.index || "").trim().toLowerCase();
      const equipment = equipmentByIndex.get(itemIndex);
      if (!equipment) {
        throw new Error(`Echipamentul "${inventoryItem.index}" nu există în catalogul SRD.`);
      }

      return equipment;
    });
};

const getArmorClassBase = (equipment) => {
  const base = Number(equipment && equipment.armor_class && equipment.armor_class.base);
  if (!Number.isFinite(base)) {
    throw new TypeError(`Echipamentul "${equipment && equipment.index}" nu are un AC base valid.`);
  }
  return base;
};

const calculateCharacterArmorClassWithItems = (
  character,
  armorClassWithoutItems,
  dexterityModifier,
  { equipmentCatalog = loadEquipmentFromJson() } = {}
) => {
  if (!Number.isFinite(Number(armorClassWithoutItems))) {
    throw new TypeError("Lipsește valoarea AC calculată de AC_rulesMiddleware.");
  }

  const equippedEquipment = getEquippedEquipment(character, equipmentCatalog);
  const isShield = (item) =>
    String(item.armor_category || "").trim().toLowerCase() === "shield" ||
    String(item.equipment_category && item.equipment_category.index || "").trim().toLowerCase() === "shields";
  const armor = equippedEquipment.find((item) => item.armor_class && !isShield(item));
  const shield = equippedEquipment.find((item) => item.armor_class && isShield(item));

  let armorBase;
  let dexterityBonus = 0;
  if (armor) {
    armorBase = getArmorClassBase(armor);
    if (armor.armor_class.dex_bonus === true) {
      const dexterity = Number(dexterityModifier);
      if (!Number.isFinite(dexterity)) {
        throw new TypeError("Lipsește modifier-ul DEX pentru calculul AC cu armură.");
      }
      const maxBonus = Number(armor.armor_class.max_bonus);
      dexterityBonus = Number.isFinite(maxBonus)
        ? Math.min(dexterity, maxBonus)
        : dexterity;
    }
  } else {
    armorBase = Number(armorClassWithoutItems);
  }

  const shieldBonus = shield ? getArmorClassBase(shield) : 0;
  return {
    Char_total_AC_with_items: armorBase + dexterityBonus + shieldBonus,
    armor_base: armor ? getArmorClassBase(armor) : null,
    dexterity_bonus: dexterityBonus,
    shield_bonus: shieldBonus,
    equipped_armor: armor ? armor.index : null,
    equipped_shield: shield ? shield.index : null
  };
};

const AC_total_with_itemsMiddleware = (req, res, next) => {
  try {
    if (!req.character || !req.AC_breakdown) {
      throw new Error(
        "AC_total_with_itemsMiddleware necesită AC_rulesMiddleware executat anterior."
      );
    }

    const dexterityModifier = req.AC_abilityStats &&
      req.AC_abilityStats.calculatedModifiers &&
      req.AC_abilityStats.calculatedModifiers.DEX;
    const armorClass = calculateCharacterArmorClassWithItems(
      req.character,
      req.Char_total_AC,
      dexterityModifier
    );

    req.Char_total_AC_with_items = armorClass.Char_total_AC_with_items;
    req.AC_items_breakdown = armorClass;
    res.locals.Char_total_AC_with_items = armorClass.Char_total_AC_with_items;
    res.locals.AC_items_breakdown = armorClass;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  AC_total_with_itemsMiddleware,
  calculateCharacterArmorClassWithItems
};