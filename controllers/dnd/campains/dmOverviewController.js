const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Campaign = require("../../../models/dnd/campainOverview");
const Character = require("../../../models/dnd/charBuilderModel");
const {buildHitPointsWithBonuses} = require("../../../middleware/dnd/HP/hp_with_bonusesMiddleware");
const { buildInitiative } = require("../../../middleware/dnd/init/initMiddleware");
const {buildCombatInitiative} = require("../../../middleware/dnd/init/combatInitMiddleware");
const {calculateCharacterArmorClass} = require("../../../middleware/dnd/AC/AC_rulesMiddleware");
const {calculateCharacterArmorClassWithItems} = require("../../../middleware/dnd/AC/AC_total_with_itemsMiddleware");
const {buildCharacterAbilityStats} = require("../../../middleware/dnd/stats/characterAbilityStats");
const {buildCharacterPassiveStats} = require("../../../middleware/dnd/stats/characterPassiveStatsMiddleware");

const CustomItem = require("../../../models/dnd/customItemsModel");
const { rollRandom20 } = require("../../../middleware/dnd/Dice/simple_random20Middleware");

const {
  loadEquipmentFromJson,
  loadMonstersDataFromJson,
  loadConditionsFromJson} = require("../../../middleware/dnd/jsonLoaders/JsonPathMiddleware");

const loadMonstersFromJson = () =>
  loadMonstersDataFromJson().map((monster) => ({
    index: monster.index,
    name: monster.name,
    type: monster.type,
    image: monster.image || "",
    HP: monster.hit_points,
    AC: Array.isArray(monster.armor_class)
      ? monster.armor_class[0]?.value
      : monster.armor_class
  })).filter((monster) =>
    typeof monster.index === "string" &&
    typeof monster.name === "string" &&
    Number.isFinite(monster.HP) &&
    Number.isFinite(monster.AC)
  );

const questImageDirectory = path.join(
  __dirname,
  "../../../public/img/user/quests"
);
const mapImageDirectory = path.join(
  __dirname,
  "../../../public/img/user/maps"
);

const questImageStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdirSync(questImageDirectory, { recursive: true });
    callback(null, questImageDirectory);
  },
  filename: (req, file, callback) => {
    callback(null, `${new mongoose.Types.ObjectId()}.png`);
  }
});
const questImageUpload = multer({
  storage: questImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (
      file.mimetype !== "image/png" ||
      path.extname(file.originalname).toLowerCase() !== ".png"
    ) {
      return callback(new Error("Imaginea quest-ului trebuie să fie PNG."));
    }
    return callback(null, true);
  }
}).single("image");

const mapImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      fs.mkdirSync(mapImageDirectory, { recursive: true });
      callback(null, mapImageDirectory);
    },
    filename: (req, file, callback) => {
      callback(null, `${new mongoose.Types.ObjectId()}.png`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (
      file.mimetype !== "image/png" ||
      path.extname(file.originalname).toLowerCase() !== ".png"
    ) {
      return callback(new Error("Harta sesiunii trebuie să fie PNG."));
    }
    return callback(null, true);
  }
}).single("image");

const uploadMapImage = (req, res, next) => {
  mapImageUpload(req, res, (error) => {
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return next();
  });
};

const cleanupOldSessionMapImagesBeforeUploadUp = async (req, res, next) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;

  if (!userId) {
    return res.status(401).json({ success: false, error: "Autentificarea este necesară." });
  }
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return res.status(400).json({ success: false, error: "Campaign sau session ID invalid." });
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return res.status(403).json({
        success: false,
        error: "Doar owner-ul campaniei poate schimba harta."
      });
    }

    const sessions = Array.from(campaign.sessions || []);
    const sessionIndex = sessions.findIndex(
      (session) => String(session._id) === String(sessionId)
    );
    if (sessionIndex === -1) {
      return res.status(404).json({ success: false, error: "Sesiunea nu a fost găsită." });
    }
    if (sessionIndex < Math.max(0, sessions.length - 3)) {
      return res.status(409).json({
        success: false,
        error: "Hărțile pot fi încărcate doar în ultimele 3 sesiuni."
      });
    }

    const staleImageNames = clearMapImagesOutsideLatestSessions(campaign);
    if (staleImageNames.length > 0) {
      await campaign.save();
      await removeUnreferencedMapImages(staleImageNames);
    }
    return next();
  } catch (error) {
    console.error("[DM OVERVIEW] pre-upload map cleanup error:", error);
    return res.status(500).json({
      success: false,
      error: "Eroare la curățarea hărților sesiunilor vechi."
    });
  }
};

const uploadQuestImage = (req, res, next) => {
  questImageUpload(req, res, (error) => {
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return next();
  });
};

const isPngFile = (filePath) => {
  const signature = Buffer.alloc(8);
  const descriptor = fs.openSync(filePath, "r");
  try {
    return fs.readSync(descriptor, signature, 0, signature.length, 0) === 8 &&
      signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  } finally {
    fs.closeSync(descriptor);
  }
};

const removeQuestImage = (imageName) => {
  if (!/^[a-f\d]{24}$/i.test(imageName || "")) {
    return;
  }
  const imagePath = path.join(questImageDirectory, `${imageName}.png`);
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
};

const removeMapImage = (imageName) => {
  if (!/^[a-f\d]{24}$/i.test(imageName || "")) {
    return;
  }
  const imagePath = path.join(mapImageDirectory, `${imageName}.png`);
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }
};

const clearMapImagesOutsideLatestSessions = (campaign, retainedSessionCount = 3) => {
  const sessions = Array.from(campaign.sessions || []);
  const retainedSessionsStart = Math.max(0, sessions.length - retainedSessionCount);
  const staleSessionIds = new Set(
    sessions
      .slice(0, retainedSessionsStart)
      .map((session) => String(session._id))
  );
  const staleImageNames = new Set(
    sessions
      .filter((session) => staleSessionIds.has(String(session._id)))
      .map((session) => session.sessionSettings?.map?.image_name)
      .filter(Boolean)
  );

  staleSessionIds.forEach((sessionId) => {
    campaign.sessions.id(sessionId)?.set("sessionSettings.map.image_name", undefined);
  });

  return [...staleImageNames];
};

const removeUnreferencedMapImages = async (imageNames) => {
  for (const imageName of new Set(imageNames.filter(Boolean))) {
    const imageStillReferenced = await Campaign.exists({
      "sessions.sessionSettings.map.image_name": imageName
    });
    if (!imageStillReferenced) {
      removeMapImage(imageName);
    }
  }
};

const isCampaignOwner = (campaign, userId) =>
  campaign.userID && campaign.userID.toString() === userId.toString();

const questPersonalParty = (quest) =>
  String(quest?.quest_type?.personal_party || "").trim().toLowerCase();

const findAccessibleCampaign = (campaignId, userId) =>
  Campaign.findOne({
    _id: campaignId,
    $or: [
      { userID: userId },
      { "participants.userID": userId }
    ]
  });

const renderDmOverview = async (req, res, requestedSessionId) => {
  const { campaignId } = req.params;
  const userId = req.session && req.session.user_id;

  if (!userId) {
    return res.redirect("/login");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(403).send("Unauthorized");
  }

  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    return res.status(400).send("Campaign ID invalid.");
  }

  if (
    requestedSessionId &&
    !mongoose.Types.ObjectId.isValid(requestedSessionId)
  ) {
    return res.status(400).send("Session ID invalid.");
  }

  try {
    const campaign = await findAccessibleCampaign(campaignId, userId).lean();

    if (!campaign) {
      return res.status(404).send("Campania nu a fost găsită.");
    }

    const sessions = campaign.sessions || [];
    const monsters = loadMonstersFromJson();
    const isOwner = isCampaignOwner(campaign, userId);
    const selectedSession = requestedSessionId
      ? sessions.find((session) => String(session._id) === String(requestedSessionId))
      : [...sessions].reverse().find((session) => session.status === "current") ||
        (!isOwner
          ? [...sessions].reverse().find((session) => session.status === "old")
          : sessions[sessions.length - 1]) ||
        null;
    const selectedSessionIndex = selectedSession
      ? sessions.findIndex((session) => String(session._id) === String(selectedSession._id))
      : -1;
    const canUploadSessionMapImage =
      isOwner &&
      selectedSessionIndex >= Math.max(0, sessions.length - 3);

    if (requestedSessionId && !selectedSession) {
      return res.status(404).send("Sesiunea nu a fost găsită.");
    }

    if (
      selectedSession &&
      !isOwner &&
      !["old", "current"].includes(selectedSession.status)
    ) {
      return res.redirect(`/dnd/dmOverview/${campaign._id}`);
    }

    const visibleSessions = isOwner
      ? sessions
      : sessions.filter((session) => ["old", "current"].includes(session.status));
    const sessionOptions = [...visibleSessions].reverse().map((session, index) => ({
      _id: session._id,
      name: session.name,
      status: session.status,
      chapter: session.chapter || visibleSessions.length - index
    }));
    const questContinents = (campaign.continents || []).map((continent) => ({
      index: continent.index,
      name: continent.name || continent.index,
      towns: (continent.towns || []).map((town) => ({
        index: town.index,
        name: town.name || town.index,
        NPC: (town.NPC || []).map((npc) => ({
          index: npc.index,
          name: npc.name || npc.index
        }))
      }))
    }));
    const selectedChapter = selectedSession
      ? sessionOptions.find(
          (session) => session._id.toString() === selectedSession._id.toString()
        )?.chapter
      : null;
    const equipmentCatalog = loadEquipmentFromJson();
    const equipmentItems = equipmentCatalog
      .filter((item) => typeof item.index === "string" && typeof item.name === "string")
      .map((item) => ({
        index: item.index,
        name: item.name,
        category: item.equipment_category?.name || item.gear_category?.name || "Equipment"
      }));
    const equipmentByIndex = new Map(
      equipmentCatalog.map((item) => [String(item.index || "").trim(), item])
    );
    const customItems = await CustomItem.find({})
      .select("index category_name magic_item.is_magic magic_item.name magic_item.file_name")
      .sort({ "magic_item.name": 1, index: 1 })
      .lean();
    const customItemsByIndex = new Map(
      customItems.map((item) => [String(item.index || "").trim(), item])
    );
    const customItemOptions = customItems
      .filter((item) =>
        typeof item.index === "string" &&
        typeof item.magic_item?.name === "string"
      )
      .map((item) => ({
        index: item.index,
        name: item.magic_item.name,
        category: item.category_name || "Custom item",
        baseName: equipmentByIndex.get(item.index)?.name || ""
      }));
    const pendingItems = (selectedSession?.pending_items || []).map((item) => {
      const index = String(item.index || "").trim();
      const isCustomItem = item.reference === "customItemsModel";
      const equipment = item.reference === "5e-SRD-Equipment"
        ? equipmentByIndex.get(index)
        : null;
      const customItem = isCustomItem ? customItemsByIndex.get(index) : null;
      const itemCategory = isCustomItem
        ? customItem?.category_name || "Custom item"
        : equipment?.equipment_category?.name ||
          equipment?.gear_category?.name ||
          equipment?.weapon_category ||
          "Equipment";
      const equipmentCategoryIndex = String(
        equipment?.equipment_category?.index || ""
      ).toLowerCase();
      const visibility = String(item.visibility || "").trim().toLowerCase();
      const isVisible = ["visible", "isvisible", "is-visible", "true"].includes(visibility);

      return {
        id: String(item._id),
        reference: item.reference,
        index,
        quantity: Number.isSafeInteger(Number(item.how_many)) && Number(item.how_many) > 0
          ? Number(item.how_many)
          : 1,
        name: isCustomItem
          ? customItem?.magic_item?.name || index
          : equipment?.name || index,
        category: itemCategory,
        visibility: item.visibility || "",
        isVisible,
        isIdle: !isVisible,
        monsterId: item.monster__ID ? String(item.monster__ID) : "",
        iconClass: isCustomItem
          ? "fa-wand-sparkles"
          : equipmentCategoryIndex === "weapon"
            ? "fa-khanda"
            : equipmentCategoryIndex === "armor"
              ? "fa-shirt"
              : equipmentCategoryIndex === "tools"
                ? "fa-screwdriver-wrench"
                : "fa-box-open"
      };
    });
    const monstersByIndex = new Map(
      monsters.map((monster) => [String(monster.index || "").trim(), monster])
    );
    const pendingItemEnemies = (selectedSession?.encounter_builder || [])
      .filter((enemy) => enemy.status !== "remove")
      .map((enemy) => {
        const monsterIndex = String(enemy.index || "").trim();
        const monster = enemy.reference === "Monsters"
          ? monstersByIndex.get(monsterIndex)
          : null;
        return {
          id: String(enemy._id),
          name: enemy.reference === "custom"
            ? enemy.custom_build?.name || "Custom Enemy"
            : monster?.name || monsterIndex
        };
      });
    const coordinatesByEnemyIndex = new Map();
    (selectedSession?.map?.coordinates_enemies || []).forEach((coordinate) => {
      const index = String(coordinate.index || "").trim();
      if (!coordinatesByEnemyIndex.has(index)) {
        coordinatesByEnemyIndex.set(index, []);
      }
      coordinatesByEnemyIndex.get(index).push(coordinate);
    });
    const encounterEnemies = (selectedSession?.encounter_builder || []).map((enemy) => {
      const index = String(enemy.index || "").trim();
      const coordinates = coordinatesByEnemyIndex.get(index) || [];
      const coordinate = coordinates.shift() || null;
      const monster = enemy.reference === "Monsters"
        ? monstersByIndex.get(index)
        : null;
      const maxHP = enemy.reference === "custom"
        ? Number(enemy.custom_build?.HP)
        : Number(monster?.HP);
      const armorClass = enemy.reference === "custom"
        ? Number(enemy.custom_build?.AC)
        : Number(monster?.AC);

      return {
        id: String(enemy._id),
        index: monster?.index || "",
        status: enemy.status,
        name: enemy.reference === "custom"
          ? enemy.custom_build?.name || "Custom Enemy"
          : monster?.name || index,
        HP: Number.isFinite(maxHP) ? maxHP : null,
        AC: Number.isFinite(armorClass) ? armorClass : null,
        x: coordinate?.x ?? "",
        y: coordinate?.y ?? "",
        items: pendingItems
          .filter((item) => item.monsterId === String(enemy._id))
          .map((item) => ({ name: item.name, reference: item.reference }))
      };
    }).filter((enemy) => enemy.status === "pending");

    const participants = campaign.participants || [];
    const viewerCharacterIds = new Set(
      participants
        .filter((participant) => String(participant.userID) === String(userId))
        .map((participant) => String(participant.charID))
        .filter(Boolean)
    );
    const visibleQuests = (campaign.quests || [])
      .filter((quest) =>
        isOwner ||
        String(quest.owener_userID?._id || quest.owener_userID || "") === String(userId) ||
        viewerCharacterIds.has(String(quest.accepted_by_charID?._id || quest.accepted_by_charID || "")) ||
        (quest.known_by_CharsID || []).some((characterId) =>
          viewerCharacterIds.has(String(characterId?._id || characterId || ""))
        )
      )
      .sort((left, right) => {
        const leftIsPersonal = questPersonalParty(left) === "personal";
        const rightIsPersonal = questPersonalParty(right) === "personal";
        if (leftIsPersonal !== rightIsPersonal) {
          return leftIsPersonal ? -1 : 1;
        }
        return String(right._id).localeCompare(String(left._id));
      });
    const charIDs = participants
      .map((participant) => participant.charID)
      .filter(Boolean);
    const questCharacterIds = (campaign.quests || []).flatMap((quest) => [
      quest.accepted_by_charID,
      ...(quest.known_by_CharsID || [])
    ]).filter(Boolean);
    const characters = await Character.find({
      _id: { $in: [...charIDs, ...questCharacterIds] }
    })
      .select("_id charName charAvatar race classes abilityScores inventory background.index hp.currentHP_left hp.fullHP hp.failedDeathSaves hp.successDeathSaves condition.index condition.category_name")
      .lean();
    const charactersById = new Map(
      characters.map((character) => [String(character._id), character])
    );
    const participantCharacterIds = new Set(
      participants.map((participant) => String(participant.charID))
    );
    await Promise.all(Array.from(participantCharacterIds).map(async (characterId) => {
      const character = charactersById.get(characterId);
      if (!character) {
        return;
      }

      const [hpCalculation, initiative, abilityStats] = await Promise.all([
        buildHitPointsWithBonuses(character),
        buildInitiative(character),
        buildCharacterAbilityStats(character)
      ]);
      const armorClassWithoutItems = calculateCharacterArmorClass(
        character,
        abilityStats
      );
      const armorClassWithItems = calculateCharacterArmorClassWithItems(
        character,
        armorClassWithoutItems.Char_total_AC,
        abilityStats.calculatedModifiers.DEX
      );
      character.calculatedMaxHP = hpCalculation.Char_total_HP_with_bonuses;
      character.calculatedInitiative = initiative;
      character.calculatedAC = armorClassWithItems.Char_total_AC_with_items;
      character.calculatedAbilityStats = abilityStats;
      character.calculatedPassiveStats = buildCharacterPassiveStats(
        character,
        abilityStats
      );
    }));
    const charParticipantsDetails = participants.map((participant) => ({
      userID: participant.userID,
      charID: participant.charID,
      character: charactersById.get(String(participant.charID)) || null
    }));
    const mapTokens = [];
    const mapCoordinatesByEnemyIndex = new Map();
    (selectedSession?.map?.coordinates_enemies || []).forEach((coordinate) => {
      const index = String(coordinate.index || "").trim();
      if (!mapCoordinatesByEnemyIndex.has(index)) {
        mapCoordinatesByEnemyIndex.set(index, []);
      }
      mapCoordinatesByEnemyIndex.get(index).push(coordinate);
    });
    (selectedSession?.encounter_builder || []).forEach((enemy) => {
      const index = String(enemy.index || "").trim();
      const coordinate = mapCoordinatesByEnemyIndex.get(index)?.shift();
      if (enemy.status === "remove") {
        return;
      }

      if (
        !coordinate ||
        (coordinate.is_visible === false && !isOwner)
      ) {
        return;
      }

      const monster = enemy.reference === "Monsters"
        ? monstersByIndex.get(index)
        : null;
      const maximumHP = enemy.reference === "custom"
        ? Number(enemy.custom_build?.HP)
        : Number(monster?.HP);
      const currentHP = enemy.status === "dead"
        ? 0
        : Number(enemy.currentHP_left ?? maximumHP);
      mapTokens.push({
        id: String(enemy._id),
        type: "enemy",
        name: enemy.reference === "custom"
          ? enemy.custom_build?.name || "Enemy"
          : monster?.name || index || "Enemy",
        image: monster?.image || "",
        illustration: monster ? `#dndc-i-${monster.index}` : "",
        row: Number(coordinate.y),
        col: Number(coordinate.x),
        currentHP: Number.isFinite(currentHP) ? currentHP : null,
        maximumHP: Number.isFinite(maximumHP) ? maximumHP : null
      });
    });
    const activeEncounterEntries = Array.isArray(selectedSession?.activeEncounter)
      ? selectedSession.activeEncounter
      : selectedSession?.activeEncounter
        ? [selectedSession.activeEncounter]
        : [];
    const combatInitiativesByCharacterId = Object.fromEntries(
      activeEncounterEntries
        .filter((entry) =>
          entry?.reference === "participants" &&
          Number.isFinite(entry.initiative_order)
        )
        .map((entry) => [String(entry.index), entry.initiative_order])
    );
    participantCharacterIds.forEach((characterId) => {
      const character = charactersById.get(characterId);
      if (character) {
        character.calculatedCombatInitiative =
          combatInitiativesByCharacterId[characterId] ?? null;
      }
    });
    const activeEncounterParticipantIds = new Set(
      activeEncounterEntries
        .filter((entry) => entry?.reference === "participants")
        .map((entry) => String(entry.index))
    );
    const participantsByCharacterId = new Map(
      participants.map((participant) => [String(participant.charID), participant])
    );
    const combatMonstersByIndex = new Map(
      monsters.map((monster) => [String(monster.index), monster])
    );
    const eligibleEncounterEnemies = (selectedSession?.encounter_builder || [])
      .filter((enemy) => ["inBattle", "dead"].includes(enemy.status));
    const matchedEncounterEnemyIds = new Set();
    const activeEncounterCombatants = activeEncounterEntries
      .slice()
      .sort((left, right) => {
        const leftOrder = Number(left?.initiative_order);
        const rightOrder = Number(right?.initiative_order);
        const safeLeftOrder = Number.isFinite(leftOrder) ? leftOrder : Number.NEGATIVE_INFINITY;
        const safeRightOrder = Number.isFinite(rightOrder) ? rightOrder : Number.NEGATIVE_INFINITY;
        return safeRightOrder - safeLeftOrder;
      })
      .map((activeEntry) => {
        const reference = String(activeEntry?.reference || "").trim();
        const index = String(activeEntry?.index || "").trim();
        const initiativeOrder = Number(activeEntry?.initiative_order);

        if (reference === "participants") {
          const participant = participantsByCharacterId.get(index);
          if (!participant) {
            return null;
          }
          const character = charactersById.get(index) || null;
          return {
            type: "character",
            id: index,
            userID: participant.userID,
            charID: participant.charID,
            initiativeOrder: Number.isFinite(initiativeOrder) ? initiativeOrder : null,
            character
          };
        }

        if (reference !== "encounter_builder") {
          return null;
        }

        const isUnmatchedEnemy = (candidate) =>
          !matchedEncounterEnemyIds.has(String(candidate._id || ""));
        const enemyById = eligibleEncounterEnemies.find((candidate) =>
          isUnmatchedEnemy(candidate) && String(candidate._id || "") === index
        );
        const enemy = enemyById || eligibleEncounterEnemies.find((candidate) => {
          if (!isUnmatchedEnemy(candidate)) {
            return false;
          }
          return String(candidate.index || "").trim() === index;
        });
        if (!enemy) {
          return null;
        }
        matchedEncounterEnemyIds.add(String(enemy._id || ""));

        const monsterIndex = String(enemy.index || "").trim();
        const monster = enemy.reference === "Monsters"
          ? combatMonstersByIndex.get(monsterIndex)
          : null;
        const isCustomEnemy = enemy.reference === "custom";
        const maximumHP = isCustomEnemy
          ? Number(enemy.custom_build?.HP)
          : Number(monster?.HP);
        const currentHP = enemy.status === "dead"
          ? 0
          : Number(enemy.currentHP_left ?? maximumHP);

        return {
          type: "enemy",
          id: String(enemy._id || index),
          initiativeOrder: Number.isFinite(initiativeOrder) ? initiativeOrder : null,
          name: isCustomEnemy
            ? enemy.custom_build?.name || "Custom Enemy"
            : monster?.name || monsterIndex,
          reference: enemy.reference,
          currentHP: Number.isFinite(currentHP) ? currentHP : null,
          maximumHP: Number.isFinite(maximumHP) ? maximumHP : null,
          armorClass: isCustomEnemy
            ? Number(enemy.custom_build?.AC)
            : Number(monster?.AC),
          status: enemy.status
        };
      })
      .filter(Boolean);
    const senderParticipants = participants.filter(
      (participant) => String(participant.userID) === String(userId)
    );
    const senderParticipant =
      senderParticipants.find((participant) =>
        activeEncounterParticipantIds.has(String(participant.charID))
      ) || senderParticipants[0] || null;
    const senderCharacter = senderParticipant
      ? charactersById.get(String(senderParticipant.charID))
      : null;
    const transferItems = [];

    (senderCharacter?.inventory || []).forEach((item) => {
      const index = String(item.index || "").trim();
      const isCustomItem = item.reference === "customItemsModel";
      const equipment = item.reference === "5e-SRD-Equipment"
        ? equipmentByIndex.get(index)
        : null;
      const customItem = isCustomItem ? customItemsByIndex.get(index) : null;

      if (
        !item._id ||
        !index ||
        !["5e-SRD-Equipment", "customItemsModel"].includes(item.reference)
      ) {
        return;
      }

      transferItems.push({
        id: String(item._id),
        source: "inventory",
        sourceCharacterId: String(senderCharacter._id),
        reference: item.reference,
        index,
        quantity: Number.isSafeInteger(Number(item.quantity)) && Number(item.quantity) > 0
          ? Number(item.quantity)
          : 1,
        name: isCustomItem
          ? customItem?.magic_item?.name || index
          : equipment?.name || index,
        category: isCustomItem
          ? customItem?.category_name || "Custom item"
          : equipment?.equipment_category?.name ||
            equipment?.gear_category?.name ||
            equipment?.weapon_category ||
            "Equipment"
      });
    });

    if (isOwner) {
      pendingItems.forEach((item) => {
        transferItems.push({
          id: item.id,
          source: "pending",
          sourceCharacterId: "",
          reference: item.reference,
          index: item.index,
          quantity: item.quantity,
          name: item.name,
          category: item.category
        });
      });
    }
    const transferTargets = activeEncounterCombatants.filter(
      (combatant) => combatant.type === "character"
    );
    const canTransferItems =
      Boolean(selectedSession) &&
      transferItems.length > 0 &&
      transferTargets.length > 0;
    const playerMapTokens = [];
    const playerCoordinatesByCharacterId = new Map(
      (selectedSession?.map?.coordinates_players || []).map((coordinate) => [
        String(coordinate.charID?._id || coordinate.charID || ""),
        coordinate
      ])
    );
    activeEncounterCombatants
      .filter((combatant) => combatant.type === "character")
      .forEach((combatant) => {
        const characterId = String(combatant.charID?._id || combatant.charID || "");
        const coordinate = playerCoordinatesByCharacterId.get(characterId);
        const character = combatant.character;
        if (
          !coordinate ||
          (coordinate.is_visible === false && !isOwner) ||
          !character
        ) {
          return;
        }

        const maximumHP = Number(
          character.calculatedMaxHP ?? character.hp?.fullHP
        );
        const currentHP = Number(
          character.hp?.currentHP_left ?? maximumHP
        );
        playerMapTokens.push({
          id: characterId,
          type: "player",
          ownerUserId: String(combatant.userID || ""),
          name: character.charName || "Personaj",
          image: character.charAvatar || "",
          row: Number(coordinate.y),
          col: Number(coordinate.x),
          currentHP: Number.isFinite(currentHP) ? currentHP : null,
          maximumHP: Number.isFinite(maximumHP) ? maximumHP : null
        });
      });
    mapTokens.unshift(...playerMapTokens);
    const conditionsCatalog = loadConditionsFromJson();
    const conditionsByIndex = new Map(
      conditionsCatalog.map((condition) => [condition.index, condition])
    );
    activeEncounterCombatants.forEach((combatant) => {
      const character = combatant.type === "character" ? combatant.character : null;
      if (!character) {
        return;
      }

      const abilityStats = character.calculatedAbilityStats;
      const attunedItems = (Array.isArray(character.inventory) ? character.inventory : [])
        .filter((item) =>
          item?.reference === "customItemsModel" &&
          item.equiped === true &&
          item.attuned === true
        )
        .map((item) => customItemsByIndex.get(String(item.index || "").trim()))
        .filter((item) => item?.magic_item?.is_magic === true)
        .slice(0, 3)
        .map((item) => ({
          name: item.magic_item.name || "Magic item",
          image: item.magic_item.file_name || "/img/dnd/shop/shop-hero.png"
        }));
      const activeConditions = (Array.isArray(character.condition) ? character.condition : [])
        .map((condition) => {
          const index = String(condition.index || condition.category_name || "")
            .trim()
            .toLowerCase();
          const conditionDefinition = conditionsByIndex.get(index);
          return {
            name: conditionDefinition?.name ||
              condition.index ||
              condition.category_name ||
              "Condition"
          };
        });

      character.focusDetails = {
        name: character.charName || "Character without a name",
        avatar: character.charAvatar || "/img/dnd/shop/hero.png",
        race: character.race?.index || "",
        classes: (Array.isArray(character.classes) ? character.classes : [])
          .map((classEntry) => ({
            name: classEntry.index || "",
            level: classEntry.level || ""
          }))
          .filter((classEntry) => classEntry.name),
        currentHP: Number(character.hp?.currentHP_left ?? character.calculatedMaxHP),
        maximumHP: Number(character.calculatedMaxHP),
        conditions: activeConditions,
        items: attunedItems,
        passiveStats: character.calculatedPassiveStats,
        stats: ["STR", "DEX", "CON", "INT", "WIS", "CHA"].map((ability) => ({
          ability,
          value: Number(abilityStats?.AllStats?.[ability] ?? abilityStats?.[ability] ?? 0),
          modifier: Number(abilityStats?.calculatedModifiers?.[ability] ?? 0)
        }))
      };
    });
    const initialFocusCharacter = activeEncounterCombatants.find(
      (combatant) => combatant.type === "character" && combatant.character?.focusDetails
    )?.character || null;
    const personalQuestsByCharacterId = Object.fromEntries(
      characters.map((character) => {
        const characterId = String(character._id);
        const personalQuests = (campaign.quests || [])
          .filter((quest) =>
            questPersonalParty(quest) === "personal" &&
            String(quest.status || "").trim().toLowerCase() === "accepted" &&
            String(quest.accepted_by_charID?._id || quest.accepted_by_charID || "") === characterId
          )
          .sort((left, right) =>
            String(right._id).localeCompare(String(left._id))
          )
          .map((quest) => ({
            id: String(quest._id),
            name: quest.name || "Quest fără nume",
            description: quest.description || "",
            image_name: quest.image_name || ""
          }));
        return [characterId, personalQuests];
      })
    );
    const questCharactersById = Object.fromEntries(
      characters.map((character) => [
        String(character._id),
        character.charName || ""
      ])
    );
    const questModalDataById = Object.fromEntries(
      (campaign.quests || []).map((quest) => {
        let questLocation = null;
        for (const continent of campaign.continents || []) {
          for (const town of continent.towns || []) {
            const npc = (town.NPC || []).find((entry) =>
              (entry.quest_reference || []).some(
                (reference) =>
                  String(reference.questID) === String(quest._id)
              )
            );
            if (npc) {
              questLocation = { continent, town, npc };
              break;
            }
          }
          if (questLocation) break;
        }
        return [
          String(quest._id),
          {
            id: String(quest._id),
            name: quest.name || "",
            status: quest.status || "not_accepted",
            ownerUserId: String(quest.owener_userID?._id || quest.owener_userID || ""),
            fields: {
              location: questLocation?.town.name || "",
              givenBy: questLocation?.npc.name || "",
              continentIndex: questLocation?.continent.index || "",
              townIndex: questLocation?.town.index || "",
              npcIndex: questLocation?.npc.index || "",
              acceptedBy: quest.accepted_by_charID
                ? String(quest.accepted_by_charID)
                : "",
              knownBy: (quest.known_by_CharsID || []).map(String),
              extindere: quest.quest_type?.extindere || "",
              personal_party: quest.quest_type?.personal_party || "",
              description: quest.description || "",
              rewards: (quest.reward || []).map((reward) => ({
                reference: reward.reference || "",
                index: reward.index || "",
                how_many: reward.how_many
              })),
              image_name: quest.image_name || ""
            }
          }
        ];
      })
    );

    return res.render("userAccess/dnd/dm/dmOverview", {
      campaign,
      selectedSession,
      canUploadSessionMapImage,
      sessionOptions,
      selectedChapter,
      isOwner,
      currentUserId: String(userId),
      canCreateQuest: isOwner || participants.some(
        (participant) => String(participant.userID) === String(userId)
      ),
      visibleQuests,
      charParticipantsDetails,
      combatInitiativesByCharacterId,
      activeEncounterParticipantIds,
      activeEncounterCombatants,
      initialFocusCharacter,
      personalQuestsByCharacterId,
      mapTokens,
      questCharactersById,
      questModalDataById,
      questContinents,
      monsters,
      equipmentItems,
      conditions: conditionsCatalog,
      customItems: customItemOptions,
      pendingItems,
      transferItems,
      canTransferItems,
      pendingItemEnemies,
      encounterEnemies,
      canManagePendingItems: isOwner && selectedSession?.status === "inDevelopment"
    });
  } catch (error) {
    console.error("[DM OVERVIEW] load error:", error);
    return res.status(500).send("Eroare la încărcarea overview-ului campaniei.");
  }
};

const dmOverviewLoad = (req, res) => 
  renderDmOverview(req, res, req.params.sessionId);

const updateActiveEncounterParticipantsUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;

  if (!userId) {
    return res.redirect("/login");
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return res.status(400).send("Campaign or session ID invalid.");
  }

  const submittedCharacterIds = req.body?.characterIds;
  const characterIds = submittedCharacterIds === undefined
    ? []
    : Array.isArray(submittedCharacterIds)
      ? submittedCharacterIds
      : [submittedCharacterIds];

  if (
    characterIds.some((characterId) =>
      typeof characterId !== "string" ||
      !mongoose.Types.ObjectId.isValid(characterId)
    )
  ) {
    return res.status(400).send("Character ID invalid.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });

    if (!campaign) {
      return res.status(403).send("Doar owner-ul poate modifica encounter-ul.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return res.status(404).send("Sesiunea nu a fost găsită.");
    }

    const campaignCharacterIds = new Set(
      (campaign.participants || []).map((participant) => String(participant.charID))
    );
    const uniqueCharacterIds = [...new Set(characterIds)];
    if (uniqueCharacterIds.some((characterId) => !campaignCharacterIds.has(characterId))) {
      return res.status(400).send("Unul sau mai multe personaje nu participă la campanie.");
    }

    const existingEntries = Array.isArray(session.activeEncounter)
      ? session.activeEncounter
      : session.activeEncounter
        ? [session.activeEncounter]
        : [];
    const existingParticipantEntries = new Map(
      existingEntries
        .filter((entry) => entry.reference === "participants")
        .map((entry) => [String(entry.index), entry])
    );
    const preservedEntries = existingEntries
      .filter((entry) => entry.reference !== "participants")
      .map((entry) => typeof entry.toObject === "function" ? entry.toObject() : entry);

    session.activeEncounter = [
      ...preservedEntries,
      ...uniqueCharacterIds.map((characterId) => ({
        reference: "participants",
        index: new mongoose.Types.ObjectId(characterId),
        initiative_order: existingParticipantEntries.get(characterId)?.initiative_order
      }))
    ];
    await campaign.save();

    return res.redirect(`/dnd/dmOverview/${campaign._id}/session/${session._id}`);
  } catch (error) {
    console.error("[DM OVERVIEW] active encounter participants update error:", error);
    return res.status(500).send("Eroare la actualizarea participanților encounter-ului.");
  }
};

const updateEncounterParticipantConditionsUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const respondWithError = (status, error) =>
    res.status(status).json({ success: false, error });

  if (!userId) {
    return respondWithError(401, "Autentificarea este necesară.");
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return respondWithError(400, "Campaign sau session ID invalid.");
  }

  const characterId = String(req.body?.characterId || "");
  if (!mongoose.Types.ObjectId.isValid(characterId)) {
    return respondWithError(400, "Character ID invalid.");
  }

  const submittedConditions = req.body?.conditions ?? [];
  const conditionIndexes = Array.isArray(submittedConditions)
    ? submittedConditions
    : [submittedConditions];
  if (conditionIndexes.some((index) => typeof index !== "string")) {
    return respondWithError(400, "Lista condițiilor nu este validă.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return respondWithError(403, "Doar owner-ul campaniei poate modifica condițiile.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return respondWithError(404, "Sesiunea nu a fost găsită.");
    }

    const activeEncounterEntries = Array.isArray(session.activeEncounter)
      ? session.activeEncounter
      : session.activeEncounter
        ? [session.activeEncounter]
        : [];
    const isActiveParticipant = activeEncounterEntries.some((entry) =>
      entry.reference === "participants" &&
      String(entry.index) === characterId
    );
    if (!isActiveParticipant) {
      return respondWithError(404, "Personajul nu se află în encounter-ul activ.");
    }

    const allowedConditions = new Map(
      loadConditionsFromJson().map((condition) => [
        String(condition.index).toLowerCase(),
        condition
      ])
    );
    const normalizedIndexes = [...new Set(
      conditionIndexes.map((index) => index.trim().toLowerCase()).filter(Boolean)
    )];
    if (normalizedIndexes.some((index) => !allowedConditions.has(index))) {
      return respondWithError(400, "Una sau mai multe condiții nu sunt valide.");
    }

    const character = await Character.findById(characterId);
    if (!character) {
      return respondWithError(404, "Character-ul nu a fost găsit.");
    }

    character.condition = normalizedIndexes.map((index) => ({
      reference: "5e-SRD-Conditions",
      category_name: "condition",
      index
    }));
    await character.save();

    return res.json({
      success: true,
      characterId,
      conditions: normalizedIndexes
    });
  } catch (error) {
    console.error("[DM OVERVIEW] update encounter participant conditions error:", error);
    return respondWithError(500, "Eroare la salvarea condițiilor personajului.");
  }
};

const deleteEncounterParticipantConditionUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const respondWithError = (status, error) =>
    res.status(status).json({ success: false, error });

  if (!userId) {
    return respondWithError(401, "Autentificarea este necesară.");
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return respondWithError(400, "Campaign sau session ID invalid.");
  }

  const characterId = String(req.body?.characterId || "");
  const conditionIndex = req.body?.conditionIndex;
  if (!mongoose.Types.ObjectId.isValid(characterId)) {
    return respondWithError(400, "Character ID invalid.");
  }
  if (typeof conditionIndex !== "string" || !conditionIndex.trim()) {
    return respondWithError(400, "Indexul condiției nu este valid.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return respondWithError(403, "Doar owner-ul campaniei poate modifica condițiile.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return respondWithError(404, "Sesiunea nu a fost găsită.");
    }

    const activeEncounterEntries = Array.isArray(session.activeEncounter)
      ? session.activeEncounter
      : session.activeEncounter
        ? [session.activeEncounter]
        : [];
    const isActiveParticipant = activeEncounterEntries.some((entry) =>
      entry.reference === "participants" &&
      String(entry.index) === characterId
    );
    if (!isActiveParticipant) {
      return respondWithError(404, "Personajul nu se află în encounter-ul activ.");
    }

    const character = await Character.findById(characterId);
    if (!character) {
      return respondWithError(404, "Character-ul nu a fost găsit.");
    }

    const existingConditions = Array.isArray(character.condition)
      ? character.condition
      : [];
    const conditionPosition = existingConditions.findIndex(
      (condition) => String(condition.index || "") === conditionIndex
    );
    if (conditionPosition === -1) {
      return respondWithError(404, "Condiția nu a fost găsită.");
    }

    character.condition.splice(conditionPosition, 1);
    await character.save();

    return res.json({ success: true, characterId, conditionIndex });
  } catch (error) {
    console.error("[DM OVERVIEW] delete encounter participant condition error:", error);
    return respondWithError(500, "Eroare la ștergerea condiției personajului.");
  }
};

const startCombatUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;

  if (!userId) {
    return res.redirect("/login");
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return res.status(400).send("Campaign or session ID invalid.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });

    if (!campaign) {
      return res.status(403).send("Doar owner-ul campaniei poate porni combat-ul.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return res.status(404).send("Sesiunea nu a fost găsită.");
    }

    const encounterEnemies = session.encounter_builder || [];
    let participantEntries = (session.activeEncounter || [])
      .filter((entry) => entry.reference === "participants")
      .map((entry) => typeof entry.toObject === "function" ? entry.toObject() : entry);
    const participantCharacterIds = [
      ...new Set(participantEntries.map((entry) => String(entry.index)))
    ];
    const participantCharacters = await Character.find({
      _id: { $in: participantCharacterIds }
    }).lean();
    const participantCharactersById = new Map(
      participantCharacters.map((character) => [String(character._id), character])
    );

    for (const characterId of participantCharacterIds) {
      if (!participantCharactersById.has(characterId)) {
        return res.status(404).send(`Characterul ${characterId} nu a fost găsit.`);
      }
    }

    if (!session.map) {
      session.map = {};
    }
    if (!Array.isArray(session.map.coordinates_players)) {
      session.map.coordinates_players = [];
    }
    if (!Array.isArray(session.map.coordinates_enemies)) {
      session.map.coordinates_enemies = [];
    }
    const playerCoordinates = session.map.coordinates_players;
    const characterIdsWithCoordinates = new Set(
      playerCoordinates.map((coordinate) =>
        String(coordinate.charID?._id || coordinate.charID || "")
      )
    );
    const characterIdsMissingCoordinates = participantCharacterIds.filter(
      (characterId) => !characterIdsWithCoordinates.has(characterId)
    );
    const usedX = new Set();
    const usedY = new Set();
    [
      ...playerCoordinates,
      ...session.map.coordinates_enemies
    ].forEach((coordinate) => {
      const x = Number(coordinate?.x);
      const y = Number(coordinate?.y);
      if (Number.isInteger(x) && x >= 3 && x <= 10) {
        usedX.add(x);
      }
      if (Number.isInteger(y) && y >= 3 && y <= 10) {
        usedY.add(y);
      }
    });
    const availableX = Array.from(
      { length: 8 },
      (_, index) => index + 3
    ).filter((coordinate) => !usedX.has(coordinate));
    const availableY = Array.from(
      { length: 8 },
      (_, index) => index + 3
    ).filter((coordinate) => !usedY.has(coordinate));
    if (
      availableX.length < characterIdsMissingCoordinates.length ||
      availableY.length < characterIdsMissingCoordinates.length
    ) {
      return res.status(409).send(
        "Nu există suficiente coordonate libere pentru toți participanții la combat."
      );
    }
    characterIdsMissingCoordinates.forEach((characterId) => {
      const xIndex = Math.floor(Math.random() * availableX.length);
      const yIndex = Math.floor(Math.random() * availableY.length);
      const x = availableX.splice(xIndex, 1)[0];
      const y = availableY.splice(yIndex, 1)[0];
      playerCoordinates.push({
        charID: new mongoose.Types.ObjectId(characterId),
        x,
        y,
        is_visible: true
      });
    });

    const combatInitiatives = await Promise.all(
      participantCharacterIds.map(async (characterId) => [
        characterId,
        await buildCombatInitiative(participantCharactersById.get(characterId))
      ])
    );
    const combatInitiativesByCharacterId = new Map(combatInitiatives);
    participantEntries = participantEntries.map((entry) => ({
      ...entry,
      initiative_order: combatInitiativesByCharacterId.get(String(entry.index)).total
    }));





    // Încarcă lista monștrilor din JSON.
    const monstersData = await loadMonstersDataFromJson();

    if (!Array.isArray(monstersData)) {
      throw new Error(
        "loadMonstersDataFromJson() trebuie să returneze o listă de monștri."
      );
    }

    // Creează o mapare rapidă după index-ul monstrului din JSON.
    const monstersByIndex = new Map(
      monstersData.map((monster) => [
        String(monster.index),
        monster
      ])
    );

    // Creează o mapare a monștrilor din encounter_builder după _id.
    const encounterEnemiesById = new Map(
      encounterEnemies.map((enemy) => [
        String(enemy._id),
        enemy
      ])
    );

    // Creează intrările pentru monștrii din activeEncounter.
    const enemyEntries = encounterEnemies.map((enemy) => ({
      reference: "encounter_builder",
      index: enemy._id
    }));

    // Reunește jucătorii și monștrii într-o singură listă.
    const activeEncounter = [
      ...participantEntries,
      ...enemyEntries
    ];

    // Calculează initiative_order pentru fiecare monstru.
    for (const activeEntry of activeEncounter) {
      if (activeEntry.reference !== "encounter_builder") {
        continue;
      }

      // 1. Identifică intrarea din encounter_builder folosind
      //    activeEncounter.index, care conține _id-ul intrării.
      const encounterEnemy = encounterEnemiesById.get(
        String(activeEntry.index)
      );

      if (!encounterEnemy) {
        throw new Error(
          `Monstrul cu ID-ul ${activeEntry.index} nu a fost găsit în encounter_builder.`
        );
      }

      // 2. Folosește encounter_builder.index pentru a identifica
      //    monstrul corespunzător din JSON.
      const jsonMonster = encounterEnemy.index
        ? monstersByIndex.get(String(encounterEnemy.index))
        : undefined;

      // Dacă nu există monstrul în JSON și nici o configurație custom,
      // datele nu permit calcularea inițiativei.
      if (!jsonMonster && !encounterEnemy.custom_build) {
        throw new Error(
          `Monstrul cu index-ul "${encounterEnemy.index}" nu a fost găsit în JSON.`
        );
      }

      // 3. Preia Dexterity din JSON.
      // Pentru monștrii custom, folosește dexterity dacă este definită.
      const dexterity =
        jsonMonster?.dexterity ??
        encounterEnemy.custom_build?.dexterity;

      // Monștrii custom fără Dexterity nu pot primi un modificator calculat.
      if (
        dexterity === undefined ||
        dexterity === null ||
        !Number.isFinite(Number(dexterity))
      ) {
        activeEntry.initiative_order = null;
        continue;
      }

      // 4. Calculează modificatorul Dexterity:
      //    floor((Dexterity - 10) / 2)
      const monster_init_order_value = Math.floor(
        (Number(dexterity) - 10) / 2
      );

      // 5. Salvează valoarea calculată în activeEncounter.
      const monster_random20_value = rollRandom20();

      activeEntry.initiative_order =
        monster_random20_value + monster_init_order_value;
    }

    // Marchează monștrii ca fiind în combat.
    encounterEnemies.forEach((enemy) => {
      enemy.status = "inBattle";
    });

    // Actualizează lista din sesiune.
    session.activeEncounter = activeEncounter;

    encounterEnemies.forEach((enemy) => {
      enemy.status = "inBattle";
    });
    session.activeEncounter = activeEncounter;

    await campaign.save();
    return res.redirect(`/dnd/dmOverview/${campaign._id}/session/${session._id}`);
  } catch (error) {
    console.error("[DM OVERVIEW] start combat error:", error);
    return res.status(500).send("Eroare la pornirea combat-ului.");
  }
};

const updateMapTokenPositionUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const { tokenType, tokenId } = req.body || {};
  const row = Number(req.body?.row);
  const col = Number(req.body?.col);

  if (!userId) {
    return res.status(401).json({ success: false, error: "Autentificare necesară." });
  }
  if (
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId) ||
    !mongoose.Types.ObjectId.isValid(tokenId)
  ) {
    return res.status(400).json({ success: false, error: "ID invalid." });
  }
  if (
    !["player", "enemy"].includes(tokenType) ||
    !Number.isInteger(row) ||
    row < 1 ||
    row > 20 ||
    !Number.isInteger(col) ||
    col < 1 ||
    col > 30
  ) {
    return res.status(400).json({ success: false, error: "Poziție sau tip de token invalid." });
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      $or: [
        { userID: userId },
        { "participants.userID": userId }
      ]
    });
    if (!campaign) {
      return res.status(404).json({ success: false, error: "Campania nu a fost găsită." });
    }

    const isOwner = isCampaignOwner(campaign, userId);
    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Sesiunea nu a fost găsită." });
    }
    if (!session.map) {
      session.map = {};
    }
    if (!Array.isArray(session.map.coordinates_players)) {
      session.map.coordinates_players = [];
    }
    if (!Array.isArray(session.map.coordinates_enemies)) {
      session.map.coordinates_enemies = [];
    }

    let targetCoordinate;
    let coordinatesToUpdate;
    if (tokenType === "player") {
      const participant = (campaign.participants || []).find(
        (entry) => String(entry.charID) === String(tokenId)
      );
      if (
        !participant ||
        (!isOwner && String(participant.userID) !== String(userId))
      ) {
        return res.status(403).json({ success: false, error: "Nu ai permisiunea să muți acest personaj." });
      }
      const isInEncounter = (session.activeEncounter || []).some(
        (entry) =>
          entry.reference === "participants" &&
          String(entry.index) === String(tokenId)
      );
      if (!isInEncounter) {
        return res.status(404).json({ success: false, error: "Personajul nu este în encounter-ul sesiunii." });
      }
      coordinatesToUpdate = session.map.coordinates_players;
      targetCoordinate = coordinatesToUpdate.find(
        (coordinate) => String(coordinate.charID) === String(tokenId)
      );
    } else {
      if (!isOwner) {
        return res.status(403).json({ success: false, error: "Doar owner-ul poate muta inamicii." });
      }
      const enemies = session.encounter_builder || [];
      const enemyIndex = enemies.findIndex(
        (enemy) => String(enemy._id) === String(tokenId)
      );
      if (enemyIndex === -1) {
        return res.status(404).json({ success: false, error: "Inamicul nu a fost găsit în sesiune." });
      }
      const enemyCoordinateIndex = enemies
        .slice(0, enemyIndex)
        .filter((enemy) => String(enemy.index || "").trim() === String(enemies[enemyIndex].index || "").trim())
        .length;
      coordinatesToUpdate = session.map.coordinates_enemies;
      const matchingCoordinates = coordinatesToUpdate.filter(
        (coordinate) =>
          String(coordinate.index || "").trim() ===
          String(enemies[enemyIndex].index || "").trim()
      );
      targetCoordinate = matchingCoordinates[enemyCoordinateIndex];
    }

    if (!targetCoordinate) {
      return res.status(404).json({ success: false, error: "Coordonatele tokenului nu au fost găsite." });
    }

    const occupiedCoordinates = [
      ...session.map.coordinates_players,
      ...session.map.coordinates_enemies
    ].filter((coordinate) => coordinate !== targetCoordinate);
    if (
      occupiedCoordinates.some(
        (coordinate) =>
          Number(coordinate.x) === col &&
          Number(coordinate.y) === row
      )
    ) {
      return res.status(409).json({ success: false, error: "Celula este deja ocupată de un alt token." });
    }

    targetCoordinate.x = col;
    targetCoordinate.y = row;
    await campaign.save();
    return res.json({ success: true, row, col });
  } catch (error) {
    console.error("[DM OVERVIEW] map token position update error:", error);
    return res.status(500).json({ success: false, error: "Eroare la salvarea poziției tokenului." });
  }
};

const updateCharacterHPUp = async (req, res) => {
  const { campaignId, characterId } = req.params;
  const userId = req.session && req.session.user_id;
  const amount = Number(req.body && req.body.amount);
  const action = req.body && req.body.action;

  if (!userId) {
    return res.status(401).json({ success: false, error: "Autentificare necesară." });
  }

  if (
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(characterId)
  ) {
    return res.status(400).json({ success: false, error: "ID invalid." });
  }

  if (!Number.isFinite(amount) || amount <= 0 || !["heal", "damage"].includes(action)) {
    return res.status(400).json({ success: false, error: "Valoare sau acțiune invalidă." });
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId,
      "participants.charID": characterId
    }).select("_id").lean();

    if (!campaign) {
      return res.status(404).json({ success: false, error: "Personajul nu a fost găsit în campanie." });
    }

    const existingCharacter = await Character.findById(characterId).lean();

    if (!existingCharacter) {
      return res.status(404).json({ success: false, error: "Personajul nu a fost găsit." });
    }

    const hpCalculation = await buildHitPointsWithBonuses(existingCharacter);
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
    const character = await Character.findOneAndUpdate(
      { _id: characterId },
      [{ $set: hpSet }],
      { new: true }
    ).select("hp.currentHP_left hp.failedDeathSaves hp.successDeathSaves").lean();

    if (!character) {
      return res.status(404).json({ success: false, error: "Punctele de viață ale personajului nu sunt disponibile." });
    }

    return res.json({
      success: true,
      currentHP_left: character.hp.currentHP_left,
      failedDeathSaves: character.hp.failedDeathSaves ?? 0,
      successDeathSaves: character.hp.successDeathSaves ?? 0
    });
  } catch (error) {
    console.error("[DM OVERVIEW] character HP update error:", error);
    return res.status(500).json({ success: false, error: "Eroare la actualizarea punctelor de viață." });
  }
};

const updateEncounterEnemyHPUp = async (req, res) => {
  const { campaignId, sessionId, enemyId } = req.params;
  const userId = req.session && req.session.user_id;
  const amount = Number(req.body?.amount);
  const action = req.body?.action;

  if (!userId) {
    return res.status(401).json({ success: false, error: "Autentificare necesară." });
  }
  if (
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId) ||
    !mongoose.Types.ObjectId.isValid(enemyId)
  ) {
    return res.status(400).json({ success: false, error: "ID invalid." });
  }
  if (!Number.isFinite(amount) || amount <= 0 || !["heal", "damage"].includes(action)) {
    return res.status(400).json({ success: false, error: "Valoare sau acțiune invalidă." });
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return res.status(403).json({ success: false, error: "Doar owner-ul campaniei poate modifica viața monștrilor." });
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Sesiunea nu a fost găsită." });
    }

    const enemy = session.encounter_builder?.id(enemyId);
    const isActiveEncounterEnemy = (session.activeEncounter || []).some(
      (entry) =>
        entry.reference === "encounter_builder" &&
        String(entry.index) === String(enemyId)
    );
    if (!enemy || !isActiveEncounterEnemy || !["inBattle", "dead"].includes(enemy.status)) {
      return res.status(404).json({ success: false, error: "Monstrul nu este în encounter-ul activ." });
    }

    const maximumHP = enemy.reference === "custom"
      ? Number(enemy.custom_build?.HP)
      : Number(
          loadMonstersFromJson().find(
            (monster) => String(monster.index) === String(enemy.index)
          )?.HP
        );
    if (!Number.isFinite(maximumHP) || maximumHP <= 0) {
      return res.status(422).json({ success: false, error: "Viața maximă a monstrului nu este disponibilă." });
    }

    const currentHP = Number(enemy.currentHP_left ?? maximumHP);
    const updatedHP = action === "damage"
      ? Math.max(0, currentHP - amount)
      : Math.min(maximumHP, currentHP + amount);
    enemy.currentHP_left = updatedHP;
    await campaign.save();

    return res.json({
      success: true,
      currentHP_left: updatedHP,
      maximumHP
    });
  } catch (error) {
    console.error("[DM OVERVIEW] encounter enemy HP update error:", error);
    return res.status(500).json({ success: false, error: "Eroare la actualizarea punctelor de viață ale monstrului." });
  }
};

const createSessionUp = async (req, res) => {
  const { campaignId } = req.params;
  const userId = req.session && req.session.user_id;

  if (!userId) {
    return res.redirect("/login");
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId)
  ) {
    return res.status(400).send("Campaign ID invalid.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });

    if (!campaign) {
      return res.status(403).send("Doar owner-ul poate crea sesiuni.");
    }

    campaign.sessions.push({
      chapter: campaign.sessions.length + 1,
      status: "inDevelopment"
    });
    await campaign.save();

    const newSession = campaign.sessions[campaign.sessions.length - 1];
    return res.redirect(
      `/dnd/dmOverview/${campaign._id}/session/${newSession._id}`
    );
  } catch (error) {
    console.error("[DM OVERVIEW] create session error:", error);
    return res.status(500).send("Eroare la crearea sesiunii.");
  }
};

const updateSessionStatusUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const action = req.body?.action;

  if (!userId) {
    return res.redirect("/login");
  }
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return res.status(400).send("Campaign or session ID invalid.");
  }
  if (!["start", "end", "draft"].includes(action)) {
    return res.status(400).send("Session action invalid.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return res.status(403).send("Doar owner-ul campaniei poate schimba statusul sesiunii.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return res.status(404).send("Sesiunea nu a fost găsită.");
    }

    const allowedSourceStatuses = action === "start"
      ? ["inDevelopment"]
      : action === "end"
        ? ["current"]
        : ["current", "old"];
    if (!allowedSourceStatuses.includes(session.status)) {
      return res.status(409).send("Acțiunea nu este disponibilă pentru statusul curent al sesiunii.");
    }

    if (!session.sessionSettings) {
      session.sessionSettings = {};
    }
    let mapImageName = "";
    if (action === "start") {
      session.status = "current";
      session.sessionSettings.forceVisibility = true;
    } else if (action === "draft") {
      session.status = "inDevelopment";
      session.sessionSettings.forceVisibility = false;
    } else {
      session.status = "old";
      session.sessionSettings.forceVisibility = false;
      mapImageName = session.sessionSettings?.map?.image_name || "";
      session.sessionSettings.environment = undefined;
      session.sessionSettings.map = undefined;
      session.map = undefined;

      const removedEnemyIds = new Set(
        (session.encounter_builder || [])
          .filter((enemy) => ["pending", "remove"].includes(enemy.status))
          .map((enemy) => String(enemy._id))
      );
      session.encounter_builder = (session.encounter_builder || []).filter(
        (enemy) => !["pending", "remove"].includes(enemy.status)
      );
      session.activeEncounter = (session.activeEncounter || []).filter(
        (entry) =>
          entry.reference !== "encounter_builder" ||
          !removedEnemyIds.has(String(entry.index))
      );
    }

    await campaign.save();
    if (mapImageName) {
      await removeUnreferencedMapImages([mapImageName]);
    }
    return res.redirect(`/dnd/dmOverview/${campaign._id}/session/${session._id}`);
  } catch (error) {
    console.error("[DM OVERVIEW] update session status error:", error);
    return res.status(500).send("Eroare la actualizarea statusului sesiunii.");
  }
};

const updateSessionUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const wantsJson = req.get("accept")?.includes("application/json");
  const respondWithError = (status, message) =>
    wantsJson
      ? res.status(status).json({ success: false, error: message })
      : res.status(status).send(message);

  if (!userId) {
    return wantsJson
      ? res.status(401).json({ success: false, error: "Autentificarea este necesară." })
      : res.redirect("/login");
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return respondWithError(400, "Campaign or session ID invalid.");
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const startDateValue =
    typeof req.body?.start_date === "string" ? req.body.start_date.trim() : "";
  const endDateValue =
    typeof req.body?.end_date === "string" ? req.body.end_date.trim() : "";

  if (name.length > 100) {
    return respondWithError(400, "Numele sesiunii nu poate depăși 100 de caractere.");
  }

  let startDate = null;
  if (startDateValue) {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDateValue);
    const dateTimeMatch =
      /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(startDateValue);

    if (!dateOnlyMatch && !dateTimeMatch) {
      return respondWithError(400, "Data și ora de start nu sunt valide.");
    }

    const dateParts = dateOnlyMatch || dateTimeMatch;
    const calendarDate = new Date(
      Date.UTC(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]))
    );
    const suppliedDate = `${dateParts[1]}-${dateParts[2]}-${dateParts[3]}`;

    if (calendarDate.toISOString().slice(0, 10) !== suppliedDate) {
      return respondWithError(400, "Data și ora de start nu sunt valide.");
    }

    startDate = dateOnlyMatch
      ? new Date(`${startDateValue}T00:00:00.000Z`)
      : new Date(startDateValue);

    if (Number.isNaN(startDate.getTime())) {
      return respondWithError(400, "Data și ora de start nu sunt valide.");
    }
  }

  let endDate = null;
  if (endDateValue) {
    const dateTimeMatch =
      /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(endDateValue);

    if (!dateTimeMatch) {
      return respondWithError(400, "Data și ora de sfârșit nu sunt valide.");
    }

    const calendarDate = new Date(
      Date.UTC(Number(dateTimeMatch[1]), Number(dateTimeMatch[2]) - 1, Number(dateTimeMatch[3]))
    );
    const suppliedDate = `${dateTimeMatch[1]}-${dateTimeMatch[2]}-${dateTimeMatch[3]}`;

    if (calendarDate.toISOString().slice(0, 10) !== suppliedDate) {
      return respondWithError(400, "Data și ora de sfârșit nu sunt valide.");
    }

    endDate = new Date(endDateValue);
    if (Number.isNaN(endDate.getTime())) {
      return respondWithError(400, "Data și ora de sfârșit nu sunt valide.");
    }
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });

    if (!campaign) {
      return respondWithError(403, "Doar owner-ul poate modifica sesiunea.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return respondWithError(404, "Sesiunea nu a fost găsită.");
    }

    if (session.status !== "inDevelopment") {
      return respondWithError(409, "Pot fi modificate doar sesiunile în pregătire.");
    }

    if (typeof req.body?.name === "string") {
      session.name = name || undefined;
    }
    if (typeof req.body?.start_date === "string") {
      session.start_date = startDate || undefined;
    }
    if (typeof req.body?.end_date === "string") {
      session.end_date = endDate || undefined;
    }
    await campaign.save();

    if (wantsJson) {
      return res.json({
        success: true,
        session: {
          name: session.name || "",
          start_date: session.start_date ? session.start_date.toISOString() : "",
          end_date: session.end_date ? session.end_date.toISOString() : ""
        }
      });
    }

    return res.redirect(
      `/dnd/dmOverview/${campaign._id}/session/${session._id}`
    );
  } catch (error) {
    console.error("[DM OVERVIEW] update session error:", error);
    return respondWithError(500, "Eroare la salvarea sesiunii.");
  }
};

const updateSessionEnvironmentUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const respondWithError = (status, message) =>
    res.status(status).json({ success: false, error: message });

  if (!userId) {
    return respondWithError(401, "Autentificarea este necesară.");
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return respondWithError(400, "Campaign sau session ID invalid.");
  }

  const environment = req.body?.environment;
  const allowedValues = {
    time_of_day: ["morning", "noon", "evening", "night"],
    Atmospheric_conditions: ["clear", "cloudy", "fog", "rainy", "stormy", "snowy"],
    temperature: ["freezing", "cold", "normal", "warm", "hot", "extreme"],
    wind: ["light", "average", "strong", "challenging", "tornado"],
    terrain: ["normal land", "snow", "swamp", "water", "lava"]
  };

  if (
    !environment ||
    typeof environment !== "object" ||
    Array.isArray(environment) ||
    Object.entries(allowedValues).some(([key, values]) =>
      !values.includes(environment[key])
    )
  ) {
    return respondWithError(400, "Setările de mediu nu sunt valide.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });

    if (!campaign) {
      return respondWithError(403, "Doar owner-ul poate modifica mediul sesiunii.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return respondWithError(404, "Sesiunea nu a fost găsită.");
    }

    session.set("sessionSettings.environment", {
      time_of_day: environment.time_of_day,
      Atmospheric_conditions: environment.Atmospheric_conditions,
      temperature: environment.temperature,
      wind: environment.wind,
      terrain: environment.terrain
    });
    await campaign.save();

    return res.json({
      success: true,
      environment: session.sessionSettings.environment
    });
  } catch (error) {
    console.error("[DM OVERVIEW] update session environment error:", error);
    return respondWithError(500, "Eroare la salvarea mediului sesiunii.");
  }
};

const saveSessionMapImageUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const removeUploadedFile = () => {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  };

  if (!userId) {
    removeUploadedFile();
    return res.status(401).json({
      success: false,
      error: "Autentificarea este necesară."
    });
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    removeUploadedFile();
    return res.status(400).json({
      success: false,
      error: "Campaign sau session ID invalid."
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "Selectează un fișier PNG pentru hartă."
    });
  }

  let imageWasSaved = false;
  try {
    if (!isPngFile(req.file.path)) {
      removeUploadedFile();
      return res.status(400).json({
        success: false,
        error: "Fișierul încărcat nu este un PNG valid."
      });
    }

    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      removeUploadedFile();
      return res.status(403).json({
        success: false,
        error: "Doar owner-ul campaniei poate schimba harta."
      });
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      removeUploadedFile();
      return res.status(404).json({
        success: false,
        error: "Sesiunea nu a fost găsită."
      });
    }

    const sessions = Array.from(campaign.sessions || []);
    const sessionIndex = sessions.findIndex(
      (candidate) => String(candidate._id) === String(sessionId)
    );
    const retainedSessionsStart = Math.max(0, sessions.length - 3);
    if (sessionIndex < retainedSessionsStart) {
      removeUploadedFile();
      return res.status(409).json({
        success: false,
        error: "Hărțile pot fi încărcate doar în ultimele 3 sesiuni."
      });
    }

    const previousImageName = session.sessionSettings?.map?.image_name || "";
    const imageName = path.basename(req.file.filename, ".png");
    session.set("sessionSettings.map.image_name", imageName);
    await campaign.save();
    imageWasSaved = true;
    await removeUnreferencedMapImages([previousImageName]);

    return res.json({
      success: true,
      image_name: imageName,
      imageUrl: `/img/user/maps/${imageName}.png`
    });
  } catch (error) {
    if (!imageWasSaved) {
      try {
        removeUploadedFile();
      } catch (cleanupError) {
        console.error("[DM OVERVIEW] failed to remove rejected map image:", cleanupError);
      }
    }
    console.error("[DM OVERVIEW] save session map image error:", error);
    return res.status(500).json({
      success: false,
      error: imageWasSaved
        ? "Harta nouă a fost salvată, dar imaginile vechi nu au putut fi curățate complet."
        : "Eroare la salvarea imaginii PNG pentru hartă."
    });
  }
};

const saveQuest = async (req, res) => {
  const { campaignId, questId } = req.params;
  const userId = req.session && req.session.user_id;
  let savedImageName = "";

  try {
    if (!userId) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(401).json({
        success: false,
        error: "Autentificarea este necesară."
      });
    }
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(campaignId) ||
      (questId && !mongoose.Types.ObjectId.isValid(questId))
    ) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Campaign sau quest ID invalid."
      });
    }

    const campaign = await findAccessibleCampaign(campaignId, userId);
    if (!campaign) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        error: "Trebuie să fii owner sau participant în campanie pentru a salva quest-uri."
      });
    }
    const isOwner = isCampaignOwner(campaign, userId);

    const existingQuest = questId ? campaign.quests.id(questId) : null;
    if (questId && !existingQuest) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        error: "Quest-ul nu a fost găsit."
      });
    }
    if (
      existingQuest &&
      !isOwner &&
      String(existingQuest.owener_userID || "") !== String(userId)
    ) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        error: "Poți modifica doar quest-urile create de tine."
      });
    }

    const body = req.body || {};
    const name = typeof body.title === "string" ? body.title.trim() : "";
    const continentIndex =
      typeof body.continentIndex === "string"
        ? body.continentIndex.trim()
        : "";
    const newContinentName =
      typeof body.newContinentName === "string"
        ? body.newContinentName.trim()
        : "";
    const townIndex =
      typeof body.townIndex === "string" ? body.townIndex.trim() : "";
    const newTownName =
      typeof body.newTownName === "string" ? body.newTownName.trim() : "";
    const npcIndex =
      typeof body.npcIndex === "string" ? body.npcIndex.trim() : "";
    const newNpcName =
      typeof body.newNpcName === "string" ? body.newNpcName.trim() : "";
    const acceptedBy =
      typeof body.acceptedBy === "string" ? body.acceptedBy.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const extindere =
      typeof body.extindere === "string" ? body.extindere.trim() : "";
    const personalParty =
      typeof body.personal_party === "string"
        ? body.personal_party.trim()
        : "";

    if (!name || name.length > 120) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Titlul quest-ului este obligatoriu și trebuie să aibă cel mult 120 de caractere."
      });
    }
    const continents = campaign.continents || [];
    let continent = continentIndex === "__new__"
      ? null
      : continents.find((entry) => entry.index === continentIndex);
    if (continentIndex !== "__new__" && !continent) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Selectează un continent existent sau alege crearea unuia nou."
      });
    }
    if (!continent && (!newContinentName || newContinentName.length > 100)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Introdu un nume de continent valid."
      });
    }
    if (!townIndex) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Selectează un town existent sau alege crearea unuia nou."
      });
    }
    if (townIndex === "__new__" && (!newTownName || newTownName.length > 100)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Introdu un nume de town valid."
      });
    }
    let town = continent && townIndex !== "__new__"
      ? (continent.towns || []).find((entry) => entry.index === townIndex)
      : null;
    if (continent && townIndex !== "__new__" && !town) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Town-ul selectat nu aparține continentului ales."
      });
    }
    if (!continent && townIndex !== "__new__") {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Pentru un continent nou trebuie creat și un town nou."
      });
    }
    if (!npcIndex) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Selectează un NPC existent sau alege crearea unuia nou."
      });
    }
    if (npcIndex === "__new__" && (!newNpcName || newNpcName.length > 100)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Introdu un nume de NPC valid."
      });
    }
    let npc = town && npcIndex !== "__new__"
      ? (town.NPC || []).find((entry) => entry.index === npcIndex)
      : null;
    if (town && npcIndex !== "__new__" && !npc) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "NPC-ul selectat nu aparține town-ului ales."
      });
    }
    if (!town && npcIndex !== "__new__") {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Pentru un town nou trebuie creat și un NPC nou."
      });
    }
    const locationName = town ? town.name : newTownName;
    const givenBy = npc ? npc.name : newNpcName;
    if (
      (locationName && locationName.length > 100) ||
      (givenBy && givenBy.length > 100)
    ) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Town-ul și NPC-ul nu pot depăși 100 de caractere."
      });
    }
    if (!["Global", "Local"].includes(extindere)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Tipul de extindere trebuie să fie Global sau Local."
      });
    }
    if (!["party", "personal"].includes(personalParty)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Alege dacă quest-ul este pentru party sau personal."
      });
    }

    const participantIds = new Set(
      (campaign.participants || [])
        .map((participant) => participant.charID && String(participant.charID))
        .filter(Boolean)
    );
    const knownByValues = body.knownBy === undefined
      ? []
      : Array.isArray(body.knownBy)
        ? body.knownBy
        : [body.knownBy];
    const knownBy = [...new Set(knownByValues)];
    if (
      (acceptedBy && !participantIds.has(acceptedBy)) ||
      knownBy.some((characterId) => !participantIds.has(characterId))
    ) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Accepted by și Known by trebuie să conțină doar character-ele participante."
      });
    }
    const questStatus = acceptedBy ? "accepted" : "not_accepted";
    if (description.length > 10000) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Descrierea nu poate depăși 10.000 de caractere."
      });
    }

    const rewards = [];
    for (const [reference, amountField, indexField] of [
      ["experience", "experienceAmount", null],
      ["money", "moneyAmount", null],
      ["item", "itemAmount", "itemIndex"]
    ]) {
      const rawAmount = typeof body[amountField] === "string"
        ? body[amountField].trim()
        : "";
      if (!rawAmount) continue;

      const howMany = Number(rawAmount);
      const index = indexField && typeof body[indexField] === "string"
        ? body[indexField].trim()
        : "";
      if (!Number.isInteger(howMany) || howMany < 1 || howMany > 200000) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          error: `Cantitatea pentru ${reference} trebuie să fie un număr întreg între 1 și 200000.`
        });
      }
      if (reference === "item" && !index) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          error: "Introdu indexul itemului oferit ca recompensă."
        });
      }
      if (index && (index.length > 150 || /[\u0000-\u001f]/.test(index))) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          error: "Indexul recompensei nu este valid."
        });
      }
      rewards.push({
        reference,
        ...(index ? { index } : {}),
        how_many: howMany
      });
    }

    if (req.file) {
      if (!isPngFile(req.file.path)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          error: "Fișierul încărcat nu este un PNG valid."
        });
      }
      savedImageName = path.basename(req.file.filename, ".png");
    }

    const questObjectId = existingQuest
      ? existingQuest._id
      : new mongoose.Types.ObjectId();
    let previousNpc = null;
    let previousContinent = null;
    for (const entry of campaign.continents || []) {
      for (const townEntry of entry.towns || []) {
        previousNpc = (townEntry.NPC || []).find((npcEntry) =>
          (npcEntry.quest_reference || []).some(
            (reference) =>
              String(reference.questID) === String(questObjectId)
          )
        );
        if (previousNpc) {
          previousContinent = entry;
          break;
        }
      }
      if (previousNpc) break;
    }

    if (!continent) {
      continent = {
        index: new mongoose.Types.ObjectId().toString(),
        name: newContinentName,
        towns: []
      };
      campaign.continents.push(continent);
      continent = campaign.continents[campaign.continents.length - 1];
    }
    if (!Array.isArray(continent.towns)) continent.towns = [];
    if (!town) {
      town = {
        index: new mongoose.Types.ObjectId().toString(),
        name: newTownName,
        NPC: []
      };
      continent.towns.push(town);
      town = continent.towns[continent.towns.length - 1];
    }
    if (!Array.isArray(town.NPC)) town.NPC = [];

    if (!npc) {
      npc = {
        index: new mongoose.Types.ObjectId().toString(),
        name: givenBy,
        quest_reference: [{ questID: questObjectId }]
      };
      town.NPC.push(npc);
      npc = town.NPC[town.NPC.length - 1];
    } else {
      if (!Array.isArray(npc.quest_reference)) npc.quest_reference = [];
    }

    if (
      previousNpc &&
      (previousNpc !== npc || previousContinent !== continent)
    ) {
      previousNpc.quest_reference = (previousNpc.quest_reference || []).filter(
        (reference) => String(reference.questID) !== String(questObjectId)
      );
    }
    if (
      !(npc.quest_reference || []).some(
        (reference) => String(reference.questID) === String(questObjectId)
      )
    ) {
      npc.quest_reference.push({ questID: questObjectId });
    }

    const oldImageName = existingQuest?.image_name || "";
    const imageName = savedImageName || oldImageName;
    const questValues = {
      name,
      description,
      image_name: imageName,
      accepted_by_charID: acceptedBy || null,
      known_by_CharsID: knownBy,
      status: questStatus,
      quest_type: {
        extindere,
        personal_party: personalParty
      },
      reward: rewards
    };

    if (existingQuest) {
      Object.assign(existingQuest, questValues);
    } else {
      questValues._id = questObjectId;
      questValues.owener_userID = new mongoose.Types.ObjectId(userId);
      campaign.quests.push(questValues);
    }

    await campaign.save();
    const uploadedImageName = savedImageName;
    savedImageName = "";
    if (uploadedImageName && oldImageName && oldImageName !== uploadedImageName) {
      try {
        removeQuestImage(oldImageName);
      } catch (cleanupError) {
        console.error("[DM OVERVIEW] old quest image cleanup error:", cleanupError);
      }
    }

    return res.json({
      success: true,
      quest: {
        id: String(questObjectId),
        name,
        status: questStatus,
        ownerUserId: existingQuest
          ? String(existingQuest.owener_userID || "")
          : String(userId),
        fields: {
          location: locationName,
          givenBy,
          continentIndex,
          continentName: continent.name,
          townIndex: town.index,
          townName: town.name,
          npcIndex: npc.index,
          npcName: npc.name,
          acceptedBy,
          knownBy,
          extindere,
          personal_party: personalParty,
          description,
          rewards,
          image_name: imageName
        }
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("[DM OVERVIEW] update quest error:", error);
    return res.status(500).json({
      success: false,
      error: "Eroare la salvarea quest-ului."
    });
  }
};

const updateQuestUp = (req, res) => saveQuest(req, res);
const createQuestUp = (req, res) => saveQuest(req, res);

const generateRandomCoordinates = () => ({
  x: Math.floor(Math.random() * 9) + 3,
  y: Math.floor(Math.random() * 9) + 3
});

const generateUniqueEnemyCoordinates = (existingCoordinates, enemies) => {
  const usedX = new Set();
  const usedY = new Set();
  existingCoordinates.forEach((coordinate) => {
    if (!coordinate) return;
    if (Number.isInteger(coordinate.x)) usedX.add(coordinate.x);
    if (Number.isInteger(coordinate.y)) usedY.add(coordinate.y);
  });

  const availableCoordinates = Array.from(
    { length: 9 },
    (_, index) => index + 3
  );
  if (
    availableCoordinates.filter((coordinate) => !usedX.has(coordinate)).length < enemies.length ||
    availableCoordinates.filter((coordinate) => !usedY.has(coordinate)).length < enemies.length
  ) {
    return null;
  }

  return enemies.map(({ index }) => {
    let coordinates;
    do {
      coordinates = generateRandomCoordinates();
    } while (usedX.has(coordinates.x) || usedY.has(coordinates.y));

    usedX.add(coordinates.x);
    usedY.add(coordinates.y);
    return { index, ...coordinates };
  });
};

const cleanupEncounterEnemiesUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const action = req.body?.action;

  if (!userId) {
    return res.redirect("/login");
  }
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return res.status(400).send("Campaign, session sau user ID invalid.");
  }
  if (!["removeDeadEnemies", "removeAllEnemies"].includes(action)) {
    return res.status(400).send("Acțiunea de curățare a enemy-urilor nu este validă.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return res.status(403).send("Doar owner-ul campaniei poate șterge enemy-uri.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return res.status(404).send("Sesiunea nu a fost găsită.");
    }

    const encounterEnemies = Array.from(session.encounter_builder || []);
    const removableStatuses = action === "removeDeadEnemies"
      ? new Set(["dead", "remove"])
      : new Set(["inBattle", "dead", "remove"]);
    const enemiesToRemoveFromBuilder = encounterEnemies.filter((enemy) =>
      removableStatuses.has(enemy.status)
    );
    const enemiesToClean = action === "removeAllEnemies"
      ? enemiesToRemoveFromBuilder
      : encounterEnemies.filter((enemy) => {
          const currentHP = Number(enemy.currentHP_left);
          const isAtZeroHP = enemy.status === "dead" ||
            (enemy.currentHP_left !== undefined &&
              enemy.currentHP_left !== null &&
              Number.isFinite(currentHP) &&
              currentHP <= 0);
          return isAtZeroHP || enemy.status === "remove";
        });
    const enemyIdsToClean = new Set(
      enemiesToClean.map((enemy) => String(enemy._id))
    );
    const enemyIdsToRemoveFromBuilder = new Set(
      enemiesToRemoveFromBuilder.map((enemy) => String(enemy._id))
    );

    session.activeEncounter = (session.activeEncounter || []).filter((entry) =>
      !(
        ["encounter_builder", "custom_builds"].includes(entry.reference) &&
        enemyIdsToClean.has(String(entry.index))
      )
    );

    const coordinatesByIndex = new Map();
    (session.map?.coordinates_enemies || []).forEach((coordinate) => {
      const index = String(coordinate.index || "").trim();
      if (!coordinatesByIndex.has(index)) {
        coordinatesByIndex.set(index, []);
      }
      coordinatesByIndex.get(index).push(coordinate);
    });
    const occurrenceByIndex = new Map();
    const coordinatesToRemove = new Set();
    encounterEnemies.forEach((enemy) => {
      const index = String(enemy.index || "").trim();
      const occurrence = occurrenceByIndex.get(index) || 0;
      occurrenceByIndex.set(index, occurrence + 1);
      const coordinate = coordinatesByIndex.get(index)?.[occurrence];
      if (coordinate && enemyIdsToClean.has(String(enemy._id))) {
        coordinatesToRemove.add(coordinate);
      }
    });
    if (session.map && Array.isArray(session.map.coordinates_enemies)) {
      session.map.coordinates_enemies = session.map.coordinates_enemies.filter(
        (coordinate) => !coordinatesToRemove.has(coordinate)
      );
    }

    session.encounter_builder = encounterEnemies.filter(
      (enemy) => !enemyIdsToRemoveFromBuilder.has(String(enemy._id))
    );

    await campaign.save();
    return res.redirect(
      `/dnd/dmOverview/${campaign._id}/session/${session._id}`
    );
  } catch (error) {
    console.error("[DM OVERVIEW] encounter enemy cleanup error:", error);
    return res.status(500).send("Eroare la ștergerea enemy-urilor din encounter.");
  }
};

const addEncounterEnemiesUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const respond = (status, error) =>
    res.status(status).json({ success: false, error });

  if (!userId) {
    return respond(401, "Autentificarea este necesară.");
  }
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return respond(400, "Campaign sau session ID invalid.");
  }

  const submittedMonsters = req.body?.monsters;
  const custom = req.body?.custom;
  if (!Array.isArray(submittedMonsters)) {
    return respond(400, "Lista monster-ilor selectați nu este validă.");
  }
  if (
    submittedMonsters.some((monster) =>
      !monster ||
      typeof monster.index !== "string" ||
      !Number.isInteger(monster.count) ||
      monster.count < 1 ||
      monster.count > 5
    )
  ) {
    return respond(
      400,
      "Poți adăuga cel mult 5 exemplare pentru fiecare tip de monster."
    );
  }
  const monsterCounts = new Map();
  submittedMonsters.forEach(({ index, count }) => {
    monsterCounts.set(index, (monsterCounts.get(index) || 0) + count);
  });
  if ([...monsterCounts.values()].some((count) => count > 5)) {
    return respond(
      400,
      "Poți adăuga cel mult 5 exemplare pentru fiecare tip de monster."
    );
  }
  if (submittedMonsters.length === 0 && custom?.enabled !== true) {
    return respond(400, "Selectează cel puțin un monster sau activează Custom Enemy.");
  }

  const monsterCatalog = new Map(
    loadMonstersFromJson().map((monster) => [monster.index, monster])
  );
  if (submittedMonsters.some((monster) => !monsterCatalog.has(monster.index))) {
    return respond(400, "Unul dintre monsterii selectați nu există în catalog.");
  }

  let customBuild = null;
  if (custom?.enabled === true) {
    const customName =
      typeof custom.name === "string" ? custom.name.trim() : "";
    const customHP = Number(custom.HP);
    const customAC = Number(custom.AC);
    if (
      !customName ||
      customName.length > 60 ||
      !Number.isInteger(customHP) ||
      customHP < 1 ||
      !Number.isInteger(customAC) ||
      customAC < 1
    ) {
      return respond(400, "Completează corect numele, HP-ul și AC-ul custom enemy-ului.");
    }
    customBuild = { name: customName, HP: customHP, AC: customAC };
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return respond(403, "Doar owner-ul campaniei poate adăuga enemy-uri.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return respond(404, "Sesiunea nu a fost găsită.");
    }

    const enemiesToAdd = [];
    monsterCounts.forEach((count, index) => {
      for (let copy = 0; copy < count; copy += 1) {
        enemiesToAdd.push({
          reference: "Monsters",
          index,
          currentHP_left: monsterCatalog.get(index).HP,
          status: "pending"
        });
      }
    });
    if (customBuild) {
      enemiesToAdd.push({
        reference: "custom",
        index: "custom",
        currentHP_left: customBuild.HP,
        custom_build: customBuild,
        status: "pending"
      });
    }

    if (!session.map) session.map = {};
    if (!Array.isArray(session.map.coordinates_players)) {
      session.map.coordinates_players = [];
    }
    if (!Array.isArray(session.map.coordinates_enemies)) {
      session.map.coordinates_enemies = [];
    }
    const coordinates = generateUniqueEnemyCoordinates(
      [
        ...session.map.coordinates_players,
        ...session.map.coordinates_enemies
      ],
      enemiesToAdd
    );
    if (!coordinates) {
      return respond(
        409,
        "Nu mai există coordonate libere pentru enemy-uri (valorile x și y trebuie să fie unice între 3 și 11)."
      );
    }

    if (!Array.isArray(session.encounter_builder)) {
      session.encounter_builder = [];
    }
    session.encounter_builder.push(...enemiesToAdd);
    session.map.coordinates_enemies.push(...coordinates);

    await campaign.save();
    return res.json({ success: true, added: enemiesToAdd.length, enemies: enemiesToAdd });
  } catch (error) {
    console.error("[DM OVERVIEW] add encounter enemies error:", error);
    return respond(500, "Eroare la salvarea enemy-urilor în encounter builder.");
  }
};

const savePendingItemsUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const respond = (status, error) =>
    res.status(status).json({ success: false, error });

  if (!userId) {
    return respond(401, "Autentificarea este necesară.");
  }
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return respond(400, "Campaign sau session ID invalid.");
  }

  const submittedItems = req.body?.pending_items;
  if (
    !Array.isArray(submittedItems) ||
    submittedItems.some((item) =>
      !item ||
      !["5e-SRD-Equipment", "customItemsModel"].includes(item.reference) ||
      typeof item.index !== "string" ||
      !item.index.trim() ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 200000
    )
  ) {
    return respond(400, "Lista de iteme selectate sau cantitățile nu sunt valide.");
  }

  const equipmentIndexes = new Set(
    loadEquipmentFromJson().map((item) => String(item.index || "").trim())
  );
  const submittedEquipmentIndexes = submittedItems
    .filter((item) => item.reference === "5e-SRD-Equipment")
    .map((item) => item.index.trim());
  if (submittedEquipmentIndexes.some((index) => !equipmentIndexes.has(index))) {
    return respond(400, "Unul dintre itemele standard nu există în catalog.");
  }

  try {
    const customIndexes = submittedItems
      .filter((item) => item.reference === "customItemsModel")
      .map((item) => item.index.trim());
    if (customIndexes.length) {
      const existingCustomIndexes = new Set(
        (await CustomItem.find({ index: { $in: customIndexes } })
          .select("index")
          .lean())
          .map((item) => String(item.index || "").trim())
      );
      if (customIndexes.some((index) => !existingCustomIndexes.has(index))) {
        return respond(400, "Unul dintre itemele custom nu mai există.");
      }
    }

    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return respond(403, "Doar owner-ul campaniei poate pregăti iteme.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return respond(404, "Sesiunea nu a fost găsită.");
    }
    if (session.status !== "inDevelopment") {
      return respond(409, "Pot fi modificate doar sesiunile în pregătire.");
    }

    if (!session.pending_items) {
      session.pending_items = [];
    }
    const existingItems = session.pending_items;
    const existingCounts = new Map();
    existingItems.forEach((item) => {
      const key = `${item.reference}\u0000${String(item.index || "").trim()}`;
      existingCounts.set(key, (existingCounts.get(key) || 0) + 1);
    });

    const desiredItems = new Map();
    submittedItems.forEach((item) => {
      const index = item.index.trim();
      const key = `${item.reference}\u0000${index}`;
      if (desiredItems.has(key)) {
        desiredItems.get(key).count += item.quantity;
      } else {
        desiredItems.set(key, { reference: item.reference, index, count: item.quantity });
      }
    });

    const itemsToAdd = [];
    desiredItems.forEach(({ reference, index, count: desiredCount }, key) => {
      const missingCount = Math.max(
        0,
        desiredCount - (existingCounts.get(key) || 0)
      );
      for (let count = 0; count < missingCount; count += 1) {
        itemsToAdd.push({
          reference,
          index,
          visibility: "idle",
          monster__ID: null
        });
      }
    });

    if (existingItems.length + itemsToAdd.length > 200000) {
      return respond(400, "Numărul total de iteme depășește limita permisă.");
    }

    itemsToAdd.forEach((item) => session.pending_items.push(item));
    await campaign.save();
    return res.json({ success: true, pending_items: session.pending_items });
  } catch (error) {
    console.error("[DM OVERVIEW] save pending items error:", error);
    return respond(500, "Eroare la salvarea itemelor pregătite.");
  }
};

const transferItemsUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const respond = (status, error, transferred = 0) =>
    res.status(status).json({ success: false, error, transferred });

  if (!userId) {
    return respond(401, "Autentificarea este necesară.");
  }
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return respond(400, "Campaign sau session ID invalid.");
  }

  const { destinationCharacterId, items } = req.body || {};
  if (
    !mongoose.Types.ObjectId.isValid(destinationCharacterId) ||
    !Array.isArray(items) ||
    items.length === 0 ||
    items.some((item) =>
      !item ||
      !["inventory", "pending"].includes(item.source) ||
      !mongoose.Types.ObjectId.isValid(item.itemId) ||
      (
        item.source === "inventory" &&
        !mongoose.Types.ObjectId.isValid(item.sourceCharacterId)
      ) ||
      (item.source === "pending" && item.sourceCharacterId)
    )
  ) {
    return respond(400, "Destinatarul sau lista de iteme nu este validă.");
  }

  const itemKeys = items.map((item) =>
    `${item.source}:${item.sourceCharacterId || ""}:${item.itemId}`
  );
  if (new Set(itemKeys).size !== itemKeys.length) {
    return respond(400, "Lista conține iteme duplicate.");
  }

  try {
    const campaign = await findAccessibleCampaign(campaignId, userId);
    if (!campaign) {
      return respond(404, "Campania nu a fost găsită.");
    }
    const isOwner = isCampaignOwner(campaign, userId);
    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return respond(404, "Sesiunea nu a fost găsită.");
    }

    const activeEncounterEntries = Array.isArray(session.activeEncounter)
      ? session.activeEncounter
      : session.activeEncounter
        ? [session.activeEncounter]
        : [];
    const destinationIsActive = activeEncounterEntries.some(
      (entry) =>
        entry.reference === "participants" &&
        String(entry.index) === String(destinationCharacterId)
    );
    if (!destinationIsActive) {
      return respond(403, "Destinatarul nu este un character activ în encounter.");
    }

    const destinationParticipant = (campaign.participants || []).find(
      (participant) =>
        String(participant.charID) === String(destinationCharacterId)
    );
    if (!destinationParticipant) {
      return respond(404, "Characterul destinatar nu a fost găsit în campanie.");
    }

    const destinationCharacter = await Character.findById(destinationCharacterId);
    if (!destinationCharacter) {
      return respond(404, "Characterul destinatar nu a fost găsit.");
    }
    if (!Array.isArray(destinationCharacter.inventory)) {
      destinationCharacter.inventory = [];
    }

    const sourceCharacters = new Map();
    const transfers = [];
    const equipmentIndexes = new Set(
      loadEquipmentFromJson().map((item) => String(item.index || "").trim())
    );
    const customIndexes = new Set();

    for (const submittedItem of items) {
      let sourceItem;
      let sourceCharacterId = "";

      if (submittedItem.source === "pending") {
        if (!isOwner) {
          return respond(403, "Doar DM-ul poate transfera iteme din Pending Items.");
        }
        sourceItem = session.pending_items?.id(submittedItem.itemId);
        if (!sourceItem) {
          return respond(409, "Unul dintre itemele Pending Items nu mai este disponibil.");
        }
      } else {
        sourceCharacterId = String(submittedItem.sourceCharacterId);
        const sourceParticipant = (campaign.participants || []).find(
          (participant) =>
            String(participant.charID) === sourceCharacterId &&
            String(participant.userID) === String(userId)
        );
        if (!sourceParticipant) {
          return respond(403, "Nu ai acces la inventarul expeditorului.");
        }
        if (sourceCharacterId === String(destinationCharacterId)) {
          return respond(400, "Alege un character diferit de expeditor.");
        }

        let sourceCharacter = sourceCharacters.get(sourceCharacterId);
        if (!sourceCharacter) {
          sourceCharacter = await Character.findById(sourceCharacterId);
          if (!sourceCharacter) {
            return respond(404, "Characterul expeditor nu a fost găsit.");
          }
          if (!Array.isArray(sourceCharacter.inventory)) {
            sourceCharacter.inventory = [];
          }
          sourceCharacters.set(sourceCharacterId, sourceCharacter);
        }
        sourceItem = sourceCharacter.inventory.id(submittedItem.itemId);
        if (!sourceItem) {
          return respond(409, "Unul dintre itemele din inventar nu mai este disponibil.");
        }
      }

      const reference = sourceItem.reference;
      const index = String(sourceItem.index || "").trim();
      const quantity = Number(
        submittedItem.source === "pending"
          ? sourceItem.how_many ?? 1
          : sourceItem.quantity ?? 1
      );

      if (
        !["5e-SRD-Equipment", "customItemsModel"].includes(reference) ||
        !index ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 200000
      ) {
        return respond(409, "Datele unuia dintre iteme nu sunt valide.");
      }
      if (reference === "5e-SRD-Equipment" && !equipmentIndexes.has(index)) {
        return respond(409, "Unul dintre itemele standard nu mai există în catalog.");
      }
      if (reference === "customItemsModel") {
        customIndexes.add(index);
      }

      transfers.push({
        source: submittedItem.source,
        sourceItemId: String(sourceItem._id),
        sourceCharacterId,
        reference,
        index,
        quantity
      });
    }

    if (customIndexes.size) {
      const existingCustomIndexes = new Set(
        (await CustomItem.find({ index: { $in: [...customIndexes] } })
          .select("index")
          .lean())
          .map((item) => String(item.index || "").trim())
      );
      if ([...customIndexes].some((index) => !existingCustomIndexes.has(index))) {
        return respond(409, "Unul dintre itemele custom nu mai există.");
      }
    }

    let transferred = 0;
    for (const transfer of transfers) {
      destinationCharacter.inventory.push({
        index: transfer.index,
        reference: transfer.reference,
        equiped: false,
        attuned: false,
        whereEquiped: "bag",
        quantity: transfer.quantity
      });
      const destinationItem = destinationCharacter.inventory[
        destinationCharacter.inventory.length - 1
      ];
      const destinationItemId = destinationItem._id;

      try {
        await destinationCharacter.save();
      } catch (error) {
        console.error("[DM OVERVIEW] destination item insert failed:", error);
        return respond(500, "Eroare la adăugarea itemului în inventarul destinatarului.", transferred);
      }

      let sourceRemovalResult;
      try {
        if (transfer.source === "pending") {
          sourceRemovalResult = await Campaign.updateOne(
            {
              _id: campaignId,
              userID: userId,
              sessions: {
                $elemMatch: {
                  _id: new mongoose.Types.ObjectId(sessionId),
                  pending_items: {
                    $elemMatch: {
                      _id: new mongoose.Types.ObjectId(transfer.sourceItemId)
                    }
                  }
                }
              }
            },
            {
              $pull: {
                "sessions.$[session].pending_items": {
                  _id: new mongoose.Types.ObjectId(transfer.sourceItemId)
                }
              }
            },
            {
              arrayFilters: [
                { "session._id": new mongoose.Types.ObjectId(sessionId) }
              ]
            }
          );
        } else {
          sourceRemovalResult = await Character.updateOne(
            {
              _id: transfer.sourceCharacterId,
              "inventory._id": new mongoose.Types.ObjectId(transfer.sourceItemId)
            },
            {
              $pull: {
                inventory: { _id: new mongoose.Types.ObjectId(transfer.sourceItemId) }
              }
            }
          );
        }
      } catch (error) {
        console.error("[DM OVERVIEW] source item removal failed:", error);
        try {
          destinationItem.deleteOne();
          await destinationCharacter.save();
        } catch (rollbackError) {
          console.error("[DM OVERVIEW] destination item rollback failed:", rollbackError);
        }
        return respond(500, "Eroare la eliminarea itemului din locația inițială.", transferred);
      }

      if (!sourceRemovalResult || sourceRemovalResult.modifiedCount === 0) {
        try {
          destinationItem.deleteOne();
          await destinationCharacter.save();
        } catch (rollbackError) {
          console.error("[DM OVERVIEW] destination item rollback failed:", rollbackError);
          return respond(500, "Itemul nu a putut fi eliminat din sursă, iar rollback-ul a eșuat.", transferred);
        }
        return respond(409, "Unul dintre iteme nu mai este disponibil în locația inițială.", transferred);
      }
      transferred += 1;
    }

    return res.json({ success: true, transferred });
  } catch (error) {
    console.error("[DM OVERVIEW] transfer items error:", error);
    return respond(500, "Eroare la transferul itemelor.");
  }
};

const updatePendingItemVisibilityUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const { itemId, visibility } = req.body || {};

  if (!userId) {
    return res.redirect("/login");
  }
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return res.status(400).send("Campaign sau session ID invalid.");
  }
  if (
    !mongoose.Types.ObjectId.isValid(itemId) ||
    !["Idle", "isVisible"].includes(visibility)
  ) {
    return res.status(400).send("Datele pentru actualizarea vizibilității nu sunt valide.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return res.status(403).send("Doar owner-ul campaniei poate modifica itemele.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return res.status(404).send("Sesiunea nu a fost găsită.");
    }
    if (session.status !== "inDevelopment") {
      return res.status(409).send("Pot fi modificate doar sesiunile în pregătire.");
    }

    const pendingItem = session.pending_items.id(itemId);
    if (!pendingItem) {
      return res.status(404).send("Itemul pregătit nu a fost găsit.");
    }

    const visibilityValue = visibility === "isVisible" ? "idle" : "visible";
    const updateResult = await Campaign.updateOne(
      {
        _id: campaignId,
        userID: userId,
        sessions: {
          $elemMatch: {
            _id: sessionId,
            status: "inDevelopment",
            pending_items: {
              $elemMatch: { _id: new mongoose.Types.ObjectId(itemId) }
            }
          }
        }
      },
      {
        $set: {
          "sessions.$[session].pending_items.$[item].visibility": visibilityValue
        }
      },
      {
        arrayFilters: [
          {
            "session._id": new mongoose.Types.ObjectId(sessionId),
            "session.status": "inDevelopment"
          },
          { "item._id": new mongoose.Types.ObjectId(itemId) }
        ]
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(409).send("Itemul nu mai poate fi actualizat.");
    }

    return res.redirect(
      `/dnd/dmOverview/${campaign._id}/session/${session._id}`
    );
  } catch (error) {
    console.error("[DM OVERVIEW] update pending item visibility error:", error);
    return res.status(500).send("Eroare la actualizarea vizibilității itemului.");
  }
};

const deletePendingItemUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const { itemId } = req.body || {};

  if (!userId) {
    return res.redirect("/login");
  }
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId)
  ) {
    return res.status(400).send("Campaign sau session ID invalid.");
  }
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).send("Datele pentru ștergerea itemului nu sunt valide.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return res.status(403).send("Doar owner-ul campaniei poate șterge iteme.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return res.status(404).send("Sesiunea nu a fost găsită.");
    }
    if (session.status !== "inDevelopment") {
      return res.status(409).send("Pot fi modificate doar sesiunile în pregătire.");
    }

    const updateResult = await Campaign.updateOne(
      {
        _id: campaignId,
        userID: userId,
        sessions: {
          $elemMatch: {
            _id: new mongoose.Types.ObjectId(sessionId),
            status: "inDevelopment",
            pending_items: { $elemMatch: { _id: new mongoose.Types.ObjectId(itemId) } }
          }
        }
      },
      {
        $pull: {
          "sessions.$[session].pending_items": { _id: new mongoose.Types.ObjectId(itemId) }
        }
      },
      {
        arrayFilters: [
          {
            "session._id": new mongoose.Types.ObjectId(sessionId),
            "session.status": "inDevelopment"
          }
        ]
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).send("Itemul pregătit nu a fost găsit.");
    }

    return res.redirect(
      `/dnd/dmOverview/${campaign._id}/session/${session._id}`
    );
  } catch (error) {
    console.error("[DM OVERVIEW] delete pending item error:", error);
    return res.status(500).send("Eroare la ștergerea itemului pregătit.");
  }
};

const attachPendingItemToEnemyUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const { itemId, monsterId } = req.body || {};

  if (!userId) {
    return res.redirect("/login");
  }
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId) ||
    !mongoose.Types.ObjectId.isValid(itemId) ||
    (monsterId && !mongoose.Types.ObjectId.isValid(monsterId))
  ) {
    return res.status(400).send("Campaign, session, item sau enemy ID invalid.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return res.status(403).send("Doar owner-ul campaniei poate atașa iteme.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return res.status(404).send("Sesiunea nu a fost găsită.");
    }
    if (session.status !== "inDevelopment") {
      return res.status(409).send("Pot fi modificate doar sesiunile în pregătire.");
    }
    if (!session.pending_items.id(itemId)) {
      return res.status(404).send("Itemul pregătit nu a fost găsit.");
    }

    let selectedEnemyId = null;
    if (monsterId) {
      const enemy = session.encounter_builder.id(monsterId);
      if (!enemy || enemy.status === "remove") {
        return res.status(404).send("Enemy-ul selectat nu mai este disponibil.");
      }
      selectedEnemyId = new mongoose.Types.ObjectId(monsterId);
    }

    const updateResult = await Campaign.updateOne(
      {
        _id: campaignId,
        userID: userId,
        sessions: {
          $elemMatch: {
            _id: new mongoose.Types.ObjectId(sessionId),
            status: "inDevelopment",
            pending_items: { $elemMatch: { _id: new mongoose.Types.ObjectId(itemId) } }
          }
        }
      },
      {
        $set: {
          "sessions.$[session].pending_items.$[item].monster__ID": selectedEnemyId
        }
      },
      {
        arrayFilters: [
          {
            "session._id": new mongoose.Types.ObjectId(sessionId),
            "session.status": "inDevelopment"
          },
          { "item._id": new mongoose.Types.ObjectId(itemId) }
        ]
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(409).send("Itemul nu mai poate fi actualizat.");
    }
    return res.redirect(
      `/dnd/dmOverview/${campaign._id}/session/${session._id}`
    );
  } catch (error) {
    console.error("[DM OVERVIEW] attach pending item to enemy error:", error);
    return res.status(500).send("Eroare la atașarea itemului de enemy.");
  }
};

const sendPendingItemToPlayerUp = async (req, res) => {
  const { campaignId, sessionId } = req.params;
  const userId = req.session && req.session.user_id;
  const { itemId, characterId } = req.body || {};

  if (!userId) {
    return res.redirect("/login");
  }
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(campaignId) ||
    !mongoose.Types.ObjectId.isValid(sessionId) ||
    !mongoose.Types.ObjectId.isValid(itemId) ||
    !mongoose.Types.ObjectId.isValid(characterId)
  ) {
    return res.status(400).send("Campaign, session, item sau character ID invalid.");
  }

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });
    if (!campaign) {
      return res.status(403).send("Doar owner-ul campaniei poate transfera iteme.");
    }

    const session = campaign.sessions.id(sessionId);
    if (!session) {
      return res.status(404).send("Sesiunea nu a fost găsită.");
    }
    if (session.status !== "inDevelopment") {
      return res.status(409).send("Pot fi modificate doar sesiunile în pregătire.");
    }

    const participant = (campaign.participants || []).find(
      (entry) => String(entry.charID) === String(characterId)
    );
    if (!participant) {
      return res.status(403).send("Characterul selectat nu este participant în campanie.");
    }

    const pendingItem = session.pending_items.id(itemId);
    if (!pendingItem) {
      return res.status(404).send("Itemul pregătit nu a fost găsit.");
    }

    const itemReference = pendingItem.reference;
    const itemIndex = String(pendingItem.index || "").trim();
    if (itemReference === "5e-SRD-Equipment") {
      const equipmentExists = loadEquipmentFromJson().some(
        (item) => String(item.index || "").trim() === itemIndex
      );
      if (!equipmentExists) {
        return res.status(409).send("Itemul nu mai există în catalogul equipment.");
      }
    } else if (itemReference === "customItemsModel") {
      const customItemExists = await CustomItem.exists({ index: itemIndex });
      if (!customItemExists) {
        return res.status(409).send("Itemul custom nu mai există.");
      }
    } else {
      return res.status(400).send("Tipul itemului pregătit nu este valid.");
    }

    const character = await Character.findById(characterId);
    if (!character) {
      return res.status(404).send("Characterul participantului nu a fost găsit.");
    }

    if (!Array.isArray(character.inventory)) {
      character.inventory = [];
    }
    const inventoryItem = character.inventory.find((item) =>
      item.reference === itemReference &&
      String(item.index || "").trim() === itemIndex &&
      item.equiped !== true &&
      (item.whereEquiped === "bag" || !item.whereEquiped)
    );
    if (inventoryItem) {
      const currentQuantity = Number(inventoryItem.quantity ?? 1);
      const updatedQuantity = currentQuantity + 1;
      if (
        !Number.isSafeInteger(currentQuantity) ||
        currentQuantity < 1 ||
        !Number.isSafeInteger(updatedQuantity)
      ) {
        return res.status(409).send("Cantitatea itemului din inventar nu este validă.");
      }
      inventoryItem.quantity = updatedQuantity;
    } else {
      character.inventory.push({
        index: itemIndex,
        reference: itemReference,
        equiped: false,
        attuned: false,
        whereEquiped: "bag",
        quantity: 1
      });
    }

    const pendingItemData = pendingItem.toObject();
    const removeResult = await Campaign.updateOne(
      {
        _id: campaignId,
        userID: userId,
        sessions: {
          $elemMatch: {
            _id: new mongoose.Types.ObjectId(sessionId),
            status: "inDevelopment",
            pending_items: { $elemMatch: { _id: new mongoose.Types.ObjectId(itemId) } }
          }
        }
      },
      {
        $pull: {
          "sessions.$[session].pending_items": {
            _id: new mongoose.Types.ObjectId(itemId)
          }
        }
      },
      {
        arrayFilters: [
          {
            "session._id": new mongoose.Types.ObjectId(sessionId),
            "session.status": "inDevelopment"
          }
        ]
      }
    );

    if (removeResult.modifiedCount === 0) {
      return res.status(409).send("Itemul nu mai este disponibil pentru transfer.");
    }

    try {
      await character.save();
    } catch (error) {
      try {
        const restoreResult = await Campaign.updateOne(
          { _id: campaignId, userID: userId },
          { $push: { "sessions.$[session].pending_items": pendingItemData } },
          {
            arrayFilters: [
              {
                "session._id": new mongoose.Types.ObjectId(sessionId),
                "session.status": "inDevelopment"
              }
            ]
          }
        );
        if (restoreResult.modifiedCount === 0) {
          console.error(
            "[DM OVERVIEW] pending item restore did not match the campaign session."
          );
        }
      } catch (restoreError) {
        console.error(
          "[DM OVERVIEW] failed to restore pending item after transfer error:",
          restoreError
        );
      }
      throw error;
    }

    return res.redirect(
      `/dnd/dmOverview/${campaign._id}/session/${session._id}`
    );
  } catch (error) {
    console.error("[DM OVERVIEW] send pending item to player error:", error);
    return res.status(500).send("Eroare la transferul itemului către character.");
  }
};

module.exports = {
  dmOverviewLoad,
  updateActiveEncounterParticipantsUp,
  updateEncounterParticipantConditionsUp,
  deleteEncounterParticipantConditionUp,
  startCombatUp,
  updateSessionStatusUp,
  updateMapTokenPositionUp,
  updateCharacterHPUp,
  updateEncounterEnemyHPUp,
  createSessionUp,
  updateSessionUp,
  updateSessionEnvironmentUp,
  cleanupOldSessionMapImagesBeforeUploadUp,
  uploadMapImage,
  saveSessionMapImageUp,
  savePendingItemsUp,
  transferItemsUp,
  updatePendingItemVisibilityUp,
  deletePendingItemUp,
  attachPendingItemToEnemyUp,
  sendPendingItemToPlayerUp,
  updateQuestUp,
  createQuestUp,
  uploadQuestImage,
  cleanupEncounterEnemiesUp,
  addEncounterEnemiesUp
};
