const mongoose = require("mongoose");
const User = require("../../../models/userModel");
const Campaign = require("../../../models/dnd/campainOverview");

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

const myCampaignsLoad = async (req, res) => {
  if (!authorizeUser(req, res)) {
    return;
  }

  const { userId } = req.params;

  try {
    const [userDataSession, campaigns] = await Promise.all([
      User.findById(userId),
      Campaign.find({ userID: userId }).sort({ _id: -1 })
    ]);

    if (!userDataSession) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    return res.render("userAccess/dnd/dm/myCampains", {
      userId,
      userDataSession,
      campaigns,
      pageTitle: "My Campaigns"
    });
  } catch (error) {
    console.error("[MY CAMPAIGNS] load error:", error);
    return res.status(500).send("Eroare la încărcarea campaniilor.");
  }
};

const myCampaignsUP = async (req, res) => {
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

module.exports = {
  myCampaignsLoad,
  myCampaignsUP
};
