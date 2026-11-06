const express = require("express");
const userRoute = express();
const session = require("express-session");

const dotenv = require("dotenv").config();
// const config = require("../config/config");
userRoute.use(session( {secret: process.env.SESSION_SECRET} ));
// userRoute.use(session({secret:config.sessionSecret}));

const auth = require("../controllers/user/auth");

userRoute.set("view engine", "ejs");
userRoute.set("views", "./views");

const bodyParser = require("body-parser");
userRoute.use(bodyParser.json());
userRoute.use(bodyParser.urlencoded({extended:true}));

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, "../public/userImages"));
  },
  filename:function(req, file, cb){
    const name = Date.now()+"-"+file.originalname;
    cb(null, name)
  }
})

const upload = multer({storage:storage})


const userController = require("../controllers/user/userController"); // user

const homeController = require("../controllers/mainTabs/homeController"); // mainTabs
const createRoomController = require("../controllers/mainTabs/createRoomController"); // mainTabs
const theRoomController = require("../controllers/mainTabs/theRoomController"); // mainTabs
const preRoomController = require("../controllers/mainTabs/preRoomController"); // mainTabs
const feedbackController = require("../controllers/mainTabs/feedbackController"); // mainTabs

const userProfileController = require("../controllers/profile/userProfileController"); // profile
const editUserController = require("../controllers/profile/editUserController"); // profile
const peopleController = require("../controllers/profile/peopleController"); // profile
const profileReputationController = require("../controllers/profile/profileReputationController"); // profile
const profileBgController = require("../controllers/profile/profileBgController"); // profile
const addProfileBgController = require("../controllers/profile/addProfileBgController"); // profile
const inWorkController = require("../controllers/profile/inWorkController"); // profile

const administratorController = require("../controllers/admin/administratorController"); // admin
const legalController = require("../controllers/admin/legalController"); // admin
const insertRepController = require("../controllers/admin/insertRepController"); // admin
const insertFakeUsers = require("../controllers/admin/insertFakeUsers"); // admin

const myCharsController = require("../controllers/dnd/myCharsController"); // dnd => Lista de charactere
const dndHomeController = require("../controllers/dnd/dndHomeController.ejs");
const class_chooseController = require("../controllers/dnd/char_builder/class_chooseController"); // dnd => Class choose
const class_managementController = require("../controllers/dnd/char_builder/class_managementController"); // dnd => Class management
const species_chooseController = require("../controllers/dnd/char_builder/species_chooseController"); // dnd => Species choose
const backgroundController = require("../controllers/dnd/char_builder/backgroundController"); // dnd => backgrounds choose
const statsController = require("../controllers/dnd/char_builder/statsController"); // dnd => stats
const reviewCharacterController = require("../controllers/dnd/char_builder/review-characterController");
const char_sheetController = require("../controllers/dnd/char_sheet/char_sheetController"); // dnd => stats
const { AC_rulesMiddleware } = require("../middleware/dnd/AC/AC_rulesMiddleware");
const {
  AC_total_with_itemsMiddleware
} = require("../middleware/dnd/AC/AC_total_with_itemsMiddleware");
const { hp_standardMiddleware } = require("../middleware/dnd/HP/hp_standardMiddleware");
const {
  hp_with_bonusesMiddleware
} = require("../middleware/dnd/HP/hp_with_bonusesMiddleware");
const {
  abilitiesSlotsMiddleware
} = require("../middleware/dnd/slots/abilitiesSlotsMiddleware");
const playerShopController = require("../controllers/dnd/playerShopController"); // dnd => playerShop

const myCampaignsController = require("../controllers/dnd/campains/myCampaignsController");
const globalCampaignsController = require("../controllers/dnd/campains/globalCampaignsController");
const campaignBuilderController = require("../controllers/dnd/campains/campaignBuilderController");
const dmOverviewController = require("../controllers/dnd/campains/dmOverviewController");



// // Register - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
userRoute.get("/feedbackus", auth.isLogin,feedbackController.feedbackusLoad);
userRoute.post("/feedbackus", auth.isLogin,feedbackController.feedbackusUp);
userRoute.get("/register", auth.isLogout, userController.loadRegister);
userRoute.post("/register", upload.single("image"), userController.insertUser);
userRoute.get("/verify", userController.VerifyMail);
// // Login - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
userRoute.get("/", auth.isLogout, userController.loginLoad);
userRoute.get("/login", auth.isLogout, userController.loginLoad);
userRoute.post("/login", userController.verifyLogin);
// // LoggedIn access autorisations - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
userRoute.get("/home", auth.isLogin,homeController.loadHome); 
userRoute.get("/index", auth.isLogin,homeController.loadHome2); 
userRoute.post("/index_append_joined_guest", homeController.indexAppendJoinedGuest);
userRoute.get("/editProfile", auth.isLogin,editUserController.userEditProfileLoad);
userRoute.post("/editProfile", upload.single("image"),editUserController.userUpdateProfile);  
userRoute.get("/room/:roomId", auth.isLogin, theRoomController.theRoomLoad); 
userRoute.post("/room/report", auth.isLogin, theRoomController.theRoomUp);
userRoute.post("/comment", auth.isLogin, theRoomController.commentUp);
userRoute.post("/removeRoomPlayerUp", auth.isLogin, theRoomController.removeRoomPlayerUp);
userRoute.post("/banRoomPlayerUp", auth.isLogin, theRoomController.banRoomPlayerUp);
userRoute.post("/inviteVotes", auth.isLogin, theRoomController.inviteVotesUP);
userRoute.post("/seenNotification", auth.isLogin, theRoomController.seenNotificationUp);
userRoute.get("/userProfile/:userId", auth.isLogin, userProfileController.userProfileLoad);
userRoute.get("/userProfile-Reputation/:userId", auth.isLogin,profileReputationController.userProfile_ReputationLoad); 
userRoute.post("/reputation", auth.isLogin,profileReputationController.userProfile_ReputationUp); 
userRoute.get("/userProfile-Bg/:userId", auth.isLogin,profileBgController.userProfile_BgLoad); 
userRoute.post("/userProfile-Bg/:userId", auth.isLogin,profileBgController.userProfile_BgUp); 
userRoute.get("/userProfile-History", auth.isLogin,inWorkController.userProfile_HistoryLoad); 
userRoute.get("/friends", auth.isLogin,peopleController.friendsLoad); 
userRoute.post("/friends", auth.isLogin,peopleController.friendsUp);
userRoute.get("/people", auth.isLogin,peopleController.peopleLoad); 
userRoute.post("/people", auth.isLogin,peopleController.peopleUp);
userRoute.get("/addOwnedBG", auth.isLogin,addProfileBgController.addOwnedBGLoad);
userRoute.post("/addOwnedBG", auth.isLogin,addProfileBgController.addOwnedBGUp);
userRoute.get("/addPlayBG", auth.isLogin,addProfileBgController.addPlayBGLoad);
userRoute.post("/addPlayBG", auth.isLogin,addProfileBgController.addPlayBGUp);
userRoute.get("/addBuyBG", auth.isLogin,addProfileBgController.addBuyBGLoad);
userRoute.post("/addBuyBG", auth.isLogin,addProfileBgController.addBuyBGUp);
userRoute.get("/addSellBG", auth.isLogin,addProfileBgController.addSellBGLoad);
userRoute.post("/addSellBG", auth.isLogin,addProfileBgController.addSellBGUp);
userRoute.get("/preRoom-index/:userId", auth.isLogin,preRoomController.preRoomIndexLoad); 
userRoute.get("/createRoom-index", auth.isLogin,createRoomController.createRoomIndexLoad); 
userRoute.post("/createRoom-index", createRoomController.createRoomUp); 
userRoute.get("/gallery", auth.isLogin,inWorkController.userImagesLoad); 


// userRoute.get("/tempIndex", auth.isLogin,userController.tempIndex); 
// userRoute.get("/chat", auth.isLogin,userController.chatLoad); 
// userRoute.post("/chat", auth.isLogin,userController.chatUp); 

// // Logout - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
userRoute.get("/logout", auth.isLogin, userController.userLogout);
// // Forgot Password - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
userRoute.get("/forgot", auth.isLogout, userController.forgotLoad);
userRoute.post("/forgot", userController.forgotVerify);
userRoute.get("/forgot-password", auth.isLogout, userController.forgotPasswordLoad);
userRoute.post("/forgot-password", userController.resetPassword);

// // only for updating purposes - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// userRoute.get("/up-rep", auth.isLogin,userController.updateReputationLoad);


// administrator - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// userRoute.get("/data", auth.isLogin,userController.populateDataLoad); // asta trebuie facut pe auth-id de admin
// userRoute.post("/data", auth.isLogin,userController.updatePopulateData);
userRoute.get("/admin/zmr/insertTermsAndConditions", auth.isLogin,administratorController.insertTermsAndConditions_Load); // asta trebuie facut pe auth-id de admin
userRoute.post("/admin/zmr/termsAndConditions_generator", auth.isLogin,administratorController.insertTerms_Up); // asta trebuie facut pe auth-id de admin
userRoute.post("/admin/zmr/termsAndConditions_edit", auth.isLogin,administratorController.updateTerms_Up); // asta trebuie facut pe auth-id de admin
userRoute.post("/admin/zmr/termsAndConditions_remove", auth.isLogin,administratorController.removeTerms_Up); // asta trebuie facut pe auth-id de admin
userRoute.get("/admin/zmr/insertData", auth.isLogin,administratorController.insertThingsLoad); // asta trebuie facut pe auth-id de admin
userRoute.post("/admin/zmr/insert_100Games", auth.isLogin,administratorController.insertGamesUp);
userRoute.post("/admin/zmr/refreshReputation", auth.isLogin,insertRepController.reputationDetailsUp);
userRoute.post("/admin/zmr/insert_fakePlayers", auth.isLogin,insertFakeUsers.fakeUserUp);

// Legal - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
userRoute.get("/terms", auth.isLogout, legalController.terms);
userRoute.get("/legal/community_guidelines", legalController.community_guidelinesLoad);
userRoute.get("/legal/contact", legalController.contactLoad);
userRoute.get("/legal/cookie_policy", legalController.cookie_policyLoad);
userRoute.get("/legal/privacy_policy", legalController.privacy_policyLoad);
userRoute.get("/legal/safety_and_policy_center", legalController.safety_and_policy_centerLoad);
userRoute.get("/legal/safety_tips", legalController.safety_tipsLoad);
userRoute.get("/legal/terms", legalController.termsLoad);
userRoute.get("/legal/summary_of_terms", legalController.summary_of_termsLoad);



// DND - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
userRoute.get("/:userId/dnd", auth.isLogin, dndHomeController.dndHomeLoad);
userRoute.get("/:userId/dnd/myChars", auth.isLogin, myCharsController.myCharsLoad); 
userRoute.post("/:userId/dnd/myChars", auth.isLogin, myCharsController.createCharacterUP);
userRoute.post("/:userId/dnd/builder/:characterId/character-name", auth.isLogin, myCharsController.charNameUP);

// BUILDER ROUTES - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
userRoute.get("/:userId/dnd/builder/:characterId/class/choose", auth.isLogin, class_chooseController.classChooseLoad); 
userRoute.post("/:userId/dnd/builder/:characterId/class/choose", auth.isLogin, class_chooseController.classChooseUp);
userRoute.get("/:userId/dnd/builder/:characterId/class/management", auth.isLogin, class_managementController.classManagementLoad); 
userRoute.post("/:userId/dnd/builder/:characterId/class/management/level", auth.isLogin, class_managementController.classManagementLevelUp);
userRoute.post("/:userId/dnd/builder/:characterId/class/management/delete", auth.isLogin, class_managementController.classManagementDelete);
userRoute.post("/:userId/dnd/builder/:characterId/class/management/class_skills", auth.isLogin, class_managementController.classManagementSkillsUp);
userRoute.get("/:userId/dnd/builder/:characterId/species/choose", auth.isLogin, species_chooseController.speciesChooseLoad); 
userRoute.post("/:userId/dnd/builder/:characterId/species/choose", auth.isLogin, species_chooseController.speciesChooseUp);
userRoute.get("/:userId/dnd/builder/:characterId/background", auth.isLogin, backgroundController.backgroundsChooseLoad); 
userRoute.post("/:userId/dnd/builder/:characterId/background", auth.isLogin, backgroundController.backgroundSpecificsUp);
userRoute.post("/:userId/dnd/builder/:characterId/background", auth.isLogin, backgroundController.backgroundsChooseUp);
userRoute.get("/:userId/dnd/builder/:characterId/stats", auth.isLogin, AC_rulesMiddleware, statsController.statsChooseLoad); 
userRoute.post("/:userId/dnd/builder/:characterId/stats", auth.isLogin, statsController.statsChooseUp);
userRoute.post("/:userId/dnd/builder/:characterId/stats_individual", auth.isLogin, statsController.stats_individualChooseUp);
userRoute.get(
  "/:userId/dnd/builder/:characterId/review",
  auth.isLogin,
  reviewCharacterController.previewLoad
);

// Character Sheet ROUTES - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
userRoute.get(
  "/:userId/dnd/char/:characterId",
  auth.isLogin,
  AC_rulesMiddleware,
  AC_total_with_itemsMiddleware,
  hp_standardMiddleware,
  hp_with_bonusesMiddleware,
  abilitiesSlotsMiddleware,
  char_sheetController.charSheetLoad
);
userRoute.post(
  "/:userId/dnd/char/:characterId/hp",
  auth.isLogin,
  char_sheetController.charSheetHitPointsUp
);
userRoute.post("/:userId/dnd/char/:characterId/spells", auth.isLogin, char_sheetController.charSheetSpellsUp);
userRoute.post("/:userId/dnd/char/:characterId/spell-slots", auth.isLogin, char_sheetController.charSheetSpellSlotsUp);
userRoute.post("/:userId/dnd/char/:characterId/inventory/equip", auth.isLogin, char_sheetController.charSheetEquipmentEquipUp);

// Shop ROUTES - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
userRoute.get("/:userId/dnd/char/:characterId/playerShop", auth.isLogin, playerShopController.playerShopLoad); 
userRoute.post("/:userId/dnd/char/:characterId/playerShopBuy", auth.isLogin, playerShopController.playerShopBuyUp);

// Campaign Routes
userRoute.get("/:userId/dnd/myCampaigns", auth.isLogin, myCampaignsController.myCampaignsLoad);
userRoute.post("/:userId/dnd/myCampaigns", auth.isLogin, myCampaignsController.myCampaignsUP);
userRoute.get("/:userId/dnd/globalCampaigns", auth.isLogin, globalCampaignsController.globalCampaignsLoad);
userRoute.post("/:userId/dnd/globalCampaigns", auth.isLogin, globalCampaignsController.globalCampaignsUP);
userRoute.post("/:userId/dnd/globalCampaigns/:campaignId/join", auth.isLogin, globalCampaignsController.globalCampaignJoinUP);
userRoute.get("/:userId/dnd/campaignBuilder/:campaignId", auth.isLogin, campaignBuilderController.campaignBuilderLoad);
userRoute.post("/:userId/dnd/campaignBuilder/:campaignId", auth.isLogin, campaignBuilderController.campaignBuilderUp);

// dmOverview
userRoute.get("/dnd/dmOverview/:campaignId", auth.isLogin, dmOverviewController.dmOverviewLoad);
userRoute.post("/dnd/dmOverview/:campaignId/sessions", auth.isLogin, dmOverviewController.createSessionUp);
userRoute.get("/dnd/dmOverview/:campaignId/session/:sessionId", auth.isLogin, dmOverviewController.dmOverviewLoad);
userRoute.post("/dnd/dmOverview/:campaignId/session/:sessionId", auth.isLogin, dmOverviewController.updateSessionUp);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/environment",
  auth.isLogin,
  dmOverviewController.updateSessionEnvironmentUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/map-image",
  auth.isLogin,
  dmOverviewController.cleanupOldSessionMapImagesBeforeUploadUp,
  dmOverviewController.uploadMapImage,
  dmOverviewController.saveSessionMapImageUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/active-encounter",
  auth.isLogin,
  dmOverviewController.updateActiveEncounterParticipantsUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/conditions",
  auth.isLogin,
  dmOverviewController.updateEncounterParticipantConditionsUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/conditions/delete",
  auth.isLogin,
  dmOverviewController.deleteEncounterParticipantConditionUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/start-combat",
  auth.isLogin,
  dmOverviewController.startCombatUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/status",
  auth.isLogin,
  dmOverviewController.updateSessionStatusUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/map-position",
  auth.isLogin,
  dmOverviewController.updateMapTokenPositionUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/characters/:characterId/hp",
  auth.isLogin,
  dmOverviewController.updateCharacterHPUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/enemies/:enemyId/hp",
  auth.isLogin,
  dmOverviewController.updateEncounterEnemyHPUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/pending-items",
  auth.isLogin,
  dmOverviewController.savePendingItemsUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/transfer-items",
  auth.isLogin,
  dmOverviewController.transferItemsUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/pending-items/visibility",
  auth.isLogin,
  dmOverviewController.updatePendingItemVisibilityUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/pending-items/delete",
  auth.isLogin,
  dmOverviewController.deletePendingItemUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/pending-items/attach-enemy",
  auth.isLogin,
  dmOverviewController.attachPendingItemToEnemyUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/pending-items/send-to-player",
  auth.isLogin,
  dmOverviewController.sendPendingItemToPlayerUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/encounter-builder/cleanup",
  auth.isLogin,
  dmOverviewController.cleanupEncounterEnemiesUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/session/:sessionId/encounter-builder",
  auth.isLogin,
  dmOverviewController.addEncounterEnemiesUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/quests",
  auth.isLogin,
  dmOverviewController.uploadQuestImage,
  dmOverviewController.createQuestUp
);
userRoute.post(
  "/dnd/dmOverview/:campaignId/quests/:questId",
  auth.isLogin,
  dmOverviewController.uploadQuestImage,
  dmOverviewController.updateQuestUp
);







module.exports = userRoute;