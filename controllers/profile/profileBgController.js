const moment = require("moment");
const User = require("../../models/userModel");
const UserPlus = require("../../models/userPlusDataModel");
const Reputation = require("../../models/ReputationModel");
const Honor = require("../../models/reputation/honerModel");
const Stain = require("../../models/reputation/stainModel");
const Feedback = require("../../models/reputation/feedbackModel");
const FeedbackUs = require("../../models/FeedbackUsModel");

const PreCreateRoom = require("../../models/transitionToRoom");
const Room = require("../../models/userRoomModel");

const InternalBgData = require("../../models/internalBgData");
const TermsAndConditions = require('../../models/termsAndConditionsModel');
const bcrypt = require("bcrypt");
const axios = require('axios');
const { parseString } = require('xml2js'); 
const dotenv = require("dotenv").config();

const nodemailer = require("nodemailer");

// const config = require("../../config/config");

const randomString = require("randomstring");



const userProfile_BgLoad = async (req, res) => {
  try {
    const userId = req.params.userId; // Extract userId from the URL parameter

    // Find the user profile using the userID
    const userData = await User.findById(userId);

    if (!userData) {
      return res.status(404).render('error', { error: 'User not found' });
    }

    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })

    // Boardgames - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // Boardgames - Fetching objectids from UserPlus model
    const userPlusData = await UserPlus.findOne({ userLink: userId });

    // Extracting objectids from owned_boardgames_ID
    const ownedObjectIds = userPlusData.owned_boardgames_ID.map(boardgame => boardgame.objectid);
    
    // Fetching matching data from InternalBgData model
    const owned_bg = await InternalBgData.find({ objectid: { $in: ownedObjectIds } });

    // Extracting objectids from wantToPlay_boardgames_ID
    const want2PlayObjectIds = userPlusData.wantToPlay_boardgames_ID.map(boardgame => boardgame.objectid);
    // Fetching matching data from InternalBgData model
    const want2Play_bg = await InternalBgData.find({ objectid: { $in: want2PlayObjectIds } });

    // Extracting objectids from sell_boardgames_ID
    const buyObjectIds = userPlusData.buy_boardgames_ID.map(boardgame => boardgame.objectid);
    // Fetching matching data from InternalBgData model
    const buy_bg = await InternalBgData.find({ objectid: { $in: buyObjectIds } });

    // Extracting objectids from buy_boardgames_ID
    const sellObjectIds = userPlusData.sell_boardgames_ID.map(boardgame => boardgame.objectid);
    // Fetching matching data from InternalBgData model
    const sell_bg = await InternalBgData.find({ objectid: { $in: sellObjectIds } });



    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
    const notifications = identify_userPlus_notif.notification;




    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx New Reputation xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // Fetch Honor details for joinedGuestUsers
    const importHonorDetail = await Honor.find();
    // Fetch Feedback details for joinedGuestUsers
    const importFeedbackDetail = await Feedback.find();
    // Fetch Stain details for joinedGuestUsers
    const importStainDetail = await Stain.find();


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

    res.render('userAccess/profile/profile-index-Bg', { 
      user: userData, 
      userPlusData,
      userSession: userDataSession, 
      owned_bg: owned_bg, 
      want2Play_bg: want2Play_bg, 
      buy_bg: buy_bg, 
      sell_bg: sell_bg,
      notifications,
      importHonorDetail,
      importFeedbackDetail,
      importStainDetail,
      allPages_RoomNotif,
    });

  } catch (error) {
    console.error('Error:', error);
    res.render('error', { error: 'An error occurred' });
  }
};

const userProfile_BgUp = async (req, res) => {
  try {
    const userId = req.body.userSessionID; // Extract userId from the URL parameter
    // console.log("xxxxxxxxxxxxxxxxx userId: " + userId)

    // Find the user profile using the userID
    const userData = await User.findById(userId);
    // console.log("xxxxxxxxxxxxxxxxx userData: " + userData)
    if (!userData) {
      return res.status(404).render('error', { error: 'User not found' });
    }

    // Boardgames - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // Boardgames - Fetching objectids from UserPlus model
    const userPlusData = await UserPlus.findOne({ userLink: userId });
    // console.log("xxxxxxxxxxxxxxxxx userPlusData: " + userPlusData)

    // Remove the item game from the lists xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // owned_gameID
    const owned_bg_input = req.body.owned_gameID;
    if(owned_bg_input && userPlusData && userPlusData.owned_boardgames_ID){
      // Filter out items with objectid matching owned_bg_input
      userPlusData.owned_boardgames_ID = userPlusData.owned_boardgames_ID.filter(item => item.objectid !== owned_bg_input);
      
      // Save the updated userPlusData
      await userPlusData.save();
    }

    // want2Play_bg_gameID
    const want2Play_bg_input = req.body.want2Play_bg_gameID;
    if(want2Play_bg_input && userPlusData && userPlusData.wantToPlay_boardgames_ID){
      // Filter out items with objectid matching want2Play_bg_input
      userPlusData.wantToPlay_boardgames_ID = userPlusData.wantToPlay_boardgames_ID.filter(item => item.objectid !== want2Play_bg_input);
      
      // Save the updated userPlusData
      await userPlusData.save();
    }

    // buy_bg_gameID
    const buy_bg_input = req.body.buy_bg_gameID;
    if(buy_bg_input && userPlusData && userPlusData.buy_boardgames_ID){
      // Filter out items with objectid matching buy_bg_input
      userPlusData.buy_boardgames_ID = userPlusData.buy_boardgames_ID.filter(item => item.objectid !== buy_bg_input);
      
      // Save the updated userPlusData
      await userPlusData.save();
    }

    // sell_bg_gameID
    const sell_bg_input = req.body.sell_bg_gameID;
    if(sell_bg_input && userPlusData && userPlusData.sell_boardgames_ID){
      // Filter out items with objectid matching sell_bg_input
      userPlusData.sell_boardgames_ID = userPlusData.sell_boardgames_ID.filter(item => item.objectid !== sell_bg_input);
      
      // Save the updated userPlusData
      await userPlusData.save();
    }

    res.sendStatus(204) // opreste bufferingul paginii - opreste loadingul paginii
  } catch (error) {
    console.error('Error:', error);
    res.render('error', { error: 'An error occurred' });
  }
};






module.exports = {
  userProfile_BgLoad,
  userProfile_BgUp,
}




