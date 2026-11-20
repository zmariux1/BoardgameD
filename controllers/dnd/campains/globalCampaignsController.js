const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../../../models/userModel");
const Campaign = require("../../../models/dnd/campainOverview");
const Character = require("../../../models/dnd/charBuilderModel");

const authorizeUser = (req, res) => {
  const { userId } = req.params;

  if (!req.session.user_id) {
    res.redirect("/login");
    return false;
  }

  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    req.session.user_id.toString() !== userId.toString()
  ) {
    res.status(403).send("Unauthorized");
    return false;
  }

  return true;
};

const globalCampaignsLoad = async (req, res) => {
  if (!authorizeUser(req, res)) {
    return;
  }

  const { userId } = req.params;

  try {
    const [userDataSession, campaigns, characters] = await Promise.all([
      User.findById(userId),
      Campaign.find({}).sort({ _id: -1 }),
      Character.find({ userLink: req.session.user_id })
        .select("_id charName")
        .sort({ charName: 1 })
        .lean()
    ]);

    if (!userDataSession) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const characterCampaigns = new Map();
    campaigns.forEach((campaign) => {
      (campaign.participants || []).forEach((participant) => {
        if (!participant.charID) {
          return;
        }

        const characterId = participant.charID.toString();
        const campaignIds = characterCampaigns.get(characterId) || new Set();
        campaignIds.add(campaign._id.toString());
        characterCampaigns.set(characterId, campaignIds);
      });
    });

    const campaignsWithCharacters = campaigns.map((campaign) => {
      const campaignId = campaign._id.toString();

      return {
        ...campaign.toObject(),
        playerCount: new Set(
          (campaign.participants || [])
            .filter((participant) => participant.userID)
            .map((participant) => participant.userID.toString())
        ).size,
        availableCharacters: characters.filter((character) => {
          const campaignIds = characterCampaigns.get(character._id.toString());

          return !campaignIds || [...campaignIds].every((id) => id === campaignId);
        })
      };
    });

    return res.render("userAccess/dnd/dm/globalCampaigns", {
      userId,
      userDataSession,
      campaigns: campaignsWithCharacters,
      pageTitle: "Global Campaigns"
    });
  } catch (error) {
    console.error("[GLOBAL CAMPAIGNS] load error:", error);
    return res.status(500).send("Eroare la încărcarea campaniilor.");
  }
};

const globalCampaignsUP = async (req, res) => {
  if (!authorizeUser(req, res)) {
    return;
  }

  const { userId } = req.params;

  try {
    const campaign = await Campaign.create({ userID: userId });

    return res.redirect(
      `/${userId}/dnd/campaignBuilder/${campaign._id}`
    );
  } catch (error) {
    console.error("[MY CAMPAIGNS] create error:", error);
    return res.status(500).send("Eroare la inițializarea campaniei.");
  }
};

const globalCampaignJoinUP = async (req, res) => {
  if (!authorizeUser(req, res)) {
    return;
  }

  const { userId, campaignId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    return res.status(400).send("Campaign ID invalid.");
  }

  const charID =
    typeof req.body.charID === "string" ? req.body.charID.trim() : "";

  if (!mongoose.Types.ObjectId.isValid(charID)) {
    return res.status(400).send("Selectează un personaj valid.");
  }

  try {
    const character = await Character.findOne({
      _id: charID,
      userLink: req.session.user_id
    }).select("_id");

    if (!character) {
      return res.status(403).send("Personajul selectat nu îți aparține.");
    }

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).send("Campania nu a fost găsită.");
    }

    const characterInAnotherCampaign = await Campaign.exists({
      _id: { $ne: campaignId },
      "participants.charID": character._id
    });

    if (characterInAnotherCampaign) {
      return res.status(409).send("Personajul participă deja la altă campanie.");
    }

    const alreadyUsingCharacter = (campaign.participants || []).some(
      (participant) => participant.charID?.toString() === character._id.toString()
    );

    if (alreadyUsingCharacter) {
      const sessions = campaign.sessions || [];
      const destinationSession =
        [...sessions].reverse().find((session) => session.status === "current") ||
        [...sessions].reverse().find((session) => session.status === "old");

      if (destinationSession) {
        return res.redirect(
          `/dnd/dmOverview/${campaign._id}/session/${destinationSession._id}`
        );
      }

      return res.redirect(`/dnd/dmOverview/${campaign._id}`);
    }

    const alreadyParticipant = (campaign.participants || []).some(
      (participant) => participant.userID?.toString() === userId.toString()
    );

    if (!alreadyParticipant) {
      const joinPassword =
        typeof req.body.joinPassword === "string"
          ? req.body.joinPassword
          : "";

      if (
        !campaign.passwordHash ||
        !joinPassword ||
        !(await bcrypt.compare(joinPassword, campaign.passwordHash))
      ) {
        return res.status(403).send("Parola campaniei este incorectă.");
      }
    }

    const joinResult = await Campaign.updateOne(
      {
        _id: campaignId,
        "participants.charID": { $ne: character._id }
      },
      {
        $push: {
          participants: {
            userID: userId,
            charID: character._id
          }
        }
      }
    );

    if (joinResult.modifiedCount === 0) {
      const latestCampaign = await Campaign.findById(campaignId)
        .select("participants");

      if (!latestCampaign) {
        return res.status(404).send("Campania nu a mai putut fi găsită.");
      }

      const characterJoinedElsewhere = await Campaign.exists({
        _id: { $ne: campaignId },
        "participants.charID": character._id
      });

      if (characterJoinedElsewhere) {
        return res.status(409).send("Personajul participă deja la altă campanie.");
      }

      const characterJoinedDuringRequest = (latestCampaign.participants || []).some(
        (participant) => participant.charID?.toString() === character._id.toString()
      );

      if (!characterJoinedDuringRequest) {
        return res.status(409).send("Personajul nu a putut fi adăugat în campanie.");
      }
    }

    const sessions = campaign.sessions || [];
    const destinationSession =
      [...sessions].reverse().find((session) => session.status === "current") ||
      [...sessions].reverse().find((session) => session.status === "old");

    if (destinationSession) {
      return res.redirect(
        `/dnd/dmOverview/${campaign._id}/session/${destinationSession._id}`
      );
    }

    return res.redirect(`/dnd/dmOverview/${campaign._id}`);
  } catch (error) {
    console.error("[GLOBAL CAMPAIGNS] join error:", error);
    return res.status(500).send("Eroare la înscrierea în campanie.");
  }
};

module.exports = {
  globalCampaignsLoad,
  globalCampaignsUP,
  globalCampaignJoinUP
};
