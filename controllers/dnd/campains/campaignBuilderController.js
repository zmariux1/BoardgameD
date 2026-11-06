const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Campaign = require("../../../models/dnd/campainOverview");

const fs = require("fs");
const path = require("path");

const backgroundsJsonPath = path.join(__dirname, "../../../data/2014/en/5e-SRD-Backgrounds.json");
const classesJsonPath = path.join(__dirname, "../../../data/2014/en/5e-SRD-classes.json");
const featsJsonPath = path.join(__dirname, "../../../data/2014/en/5e-SRD-Feats.json");
const racesJsonPath = path.join(__dirname, "../../../data/2014/en/5e-SRD-Races.json");







const loadCatalog = (jsonPath) => {
  const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new TypeError(`Catalogul D&D nu conține o listă: ${jsonPath}`);
  }

  return parsed.map(({ name, index }) => ({ name, index }));
};

const campaignCatalogs = {
  classes: classesJsonPath,
  races: racesJsonPath,
  backgrounds: backgroundsJsonPath,
  feats: featsJsonPath
};

const defaultAllowedIndexes = {
  classes: ["fighter", "rogue"],
  races: ["human", "elf"],
  backgrounds: ["acolyte"],
  feats: ["alert"]
};

const getAllowedIndexes = (
  catalogs,
  conditionsBanningList = [],
  hasSavedConfiguration = conditionsBanningList.length > 0
) => {
  return Object.fromEntries(
    Object.entries(catalogs).map(([reference, items]) => {
      const bannedIndexes = conditionsBanningList
        .filter((condition) => condition.reference === reference)
        .map((condition) => condition.index);

      return [
        reference,
        items
          .filter((item) => (
            hasSavedConfiguration
              ? !bannedIndexes.includes(item.index)
              : defaultAllowedIndexes[reference].includes(item.index)
          ))
          .map((item) => item.index)
      ];
    })
  );
};

const authorizeCampaignRequest = (req, res) => {
  const { userId, campaignId } = req.params;

  if (!req.session.user_id) {
    res.redirect("/login");
    return false;
  }

  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(campaignId)) {
    res.status(400).send("User ID sau campaign ID invalid.");
    return false;
  }

  if (req.session.user_id.toString() !== userId.toString()) {
    res.status(403).send("Unauthorized");
    return false;
  }

  return true;
};

const campaignBuilderLoad = async (req, res) => {
  if (!authorizeCampaignRequest(req, res)) {
    return;
  }

  const { userId, campaignId } = req.params;

  try {
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });

    if (!campaign) {
      return res.status(404).send("Campania nu a fost găsită.");
    }

    const campaignData = campaign.toObject();
    const catalogs = Object.fromEntries(
      Object.entries(campaignCatalogs).map(([reference, jsonPath]) => [
        reference,
        loadCatalog(jsonPath)
      ])
    );
    const allowedIndexes = getAllowedIndexes(
      catalogs,
      campaign.conditions_banning_list,
      Boolean(campaignData.name) ||
        (campaign.conditions_banning_list || []).length > 0
    );

    return res.render(
      "userAccess/dnd/dm/campainBuilder/campainBuilder",
      {
        userId,
        campaignId,
        campaign,
        classes: catalogs.classes,
        races: catalogs.races,
        backgrounds: catalogs.backgrounds,
        feats: catalogs.feats,
        allowedIndexes,
        name: campaignData.name,
        shortDescription: campaignData.shortDescription,
        passwordHash: campaignData.passwordHash,
        min_nr_users: campaignData.min_nr_users,
        max_nr_users: campaignData.max_nr_users,
        starting_lvl: campaignData.starting_lvl,
        creationDate: campaignData.creationDate
      }
    );
  } catch (error) {
    console.error("[CAMPAIGN BUILDER] load error:", error);
    return res.status(500).send("Eroare la încărcarea builder-ului campaniei.");
  }
};


const campaignBuilderUp = async (req, res) => {
  if (!authorizeCampaignRequest(req, res)) {
    return;
  }

  const { userId, campaignId } = req.params;
  const body = req.body || {};

  if (typeof body.name !== "string" || !body.name.trim()) {
    return res.status(400).send("Numele campaniei este obligatoriu.");
  }
  if (typeof body.shortDescription !== "string" || !body.shortDescription.trim()) {
    return res.status(400).send("Descrierea campaniei este obligatorie.");
  }

  const maxNrUsers = Number(body.max_nr_users);
  const minNrUsers = Number(body.min_nr_users);
  const startingLevel = Number(body.starting_lvl);
  if (!Number.isInteger(maxNrUsers) || maxNrUsers < 2 || maxNrUsers > 8) {
    return res.status(400).send("Numărul maxim de utilizatori trebuie să fie între 2 și 8.");
  }
  if (!Number.isInteger(minNrUsers) || minNrUsers < 1 || minNrUsers > maxNrUsers) {
    return res.status(400).send(
      "Numărul minim de utilizatori trebuie să fie cel puțin 1 și să nu depășească maximul."
    );
  }
  if (!Number.isInteger(startingLevel) || startingLevel < 1 || startingLevel > 20) {
    return res.status(400).send("Nivelul de start trebuie să fie între 1 și 20.");
  }

  try {
    const catalogs = Object.fromEntries(
      Object.entries(campaignCatalogs).map(([reference, jsonPath]) => [
        reference,
        loadCatalog(jsonPath)
      ])
    );
    const allowedIndexes = {};
    const selectionLimits = {
      classes: 4,
      races: 6,
      backgrounds: 4,
      feats: 4
    };

    for (const [reference, items] of Object.entries(catalogs)) {
      const submitted = body[reference] === undefined
        ? []
        : Array.isArray(body[reference])
          ? body[reference]
          : [body[reference]];

      if (
        submitted.some((index) => typeof index !== "string") ||
        new Set(submitted).size !== submitted.length ||
        submitted.some((index) => !items.some((item) => item.index === index))
      ) {
        return res.status(400).send(`Selecția pentru ${reference} nu este validă.`);
      }
      if (submitted.length > selectionLimits[reference]) {
        return res.status(400).send(
          `Poți selecta cel mult ${selectionLimits[reference]} opțiuni pentru ${reference}.`
        );
      }

      allowedIndexes[reference] = submitted;
    }

    const campaign = await Campaign.findOne({
      _id: campaignId,
      userID: userId
    });

    if (!campaign) {
      return res.status(404).send("Campania nu a fost găsită.");
    }
    const conditionsBanningList = Object.entries(catalogs).flatMap(
      ([reference, items]) => items
        .filter((item) => !allowedIndexes[reference].includes(item.index))
        .map((item) => ({ reference, index: item.index }))
    );

    campaign.name = body.name.trim();
    campaign.shortDescription = body.shortDescription.trim();
    campaign.min_nr_users = minNrUsers;
    campaign.max_nr_users = maxNrUsers;
    campaign.starting_lvl = startingLevel;
    campaign.conditions_banning_list = conditionsBanningList;
    if (!campaign.creationDate) {
      campaign.creationDate = new Date();
    }

    if (typeof body.accessCode === "string" && body.accessCode.trim()) {
      campaign.passwordHash = await bcrypt.hash(body.accessCode, 8);
    }

    await campaign.save();

    return res.redirect(`/${userId}/dnd/campaignBuilder/${campaignId}`);
  } catch (error) {
    console.error("[CAMPAIGN BUILDER] update error:", error);
    return res.status(500).send("Eroare la salvarea campaniei.");
  }
};



module.exports = {
  campaignBuilderLoad,
  campaignBuilderUp
};