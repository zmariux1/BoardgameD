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



// users profile 
const userProfileLoad = async (req, res) => {
  try {
    const userId = req.params.userId; // Extract userId from the URL parameter

    // Find the user profile using the userID
    const userData = await User.findById(userId);

    if (!userData) {
      return res.status(404).render('error', { error: 'User not found' });
    }

    // Use this to verify if it's the session user
    const userDataSession = await User.findById({ _id:req.session.user_id })

    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // Find the UserRoom documents containing the userId in joined_guest
    const roomsWithUser = await Room.find({
      joined_guest: { $in: [userId] }
    });
    
    // count the users ------------------------------------------------------
    // Extract all joined_guest arrays from the matching UserRoom documents
    const allGuestArrays = roomsWithUser.map(room => room.joined_guest);

    // Flatten the array of arrays into a single array
    const allGuests = [].concat(...allGuestArrays);

    // Remove duplicates from the array
    const uniqueGuests = [...new Set(allGuests)];

    // Remove the userId from the list of unique guests
    const filteredGuests = uniqueGuests.filter(guestId => guestId !== userId); // Now, filteredGuests contains all unique guests excluding the userId

    // count the users ------------------------------------------------------
    // Extract all joined_guest arrays from the matching UserRoom documents
    const allGamesArrays = roomsWithUser.map(room => room.theBoardgames_id);

    // Flatten the array of arrays into a single array
    const allGames = [].concat(...allGamesArrays);

    // Remove duplicates from the array
    const uniqueGames = [...new Set(allGames)];

    // count the users ------------------------------------------------------
    // Extract all joined_guest arrays from the matching UserRoom documents
    const ownedGamesArrays = roomsWithUser.map(room => room.theBoardgames_id);

    // Flatten the array of arrays into a single array
    const allownedGames = [].concat(...ownedGamesArrays);

    // Remove duplicates from the array
    const uniqueownedGames = [...new Set(allownedGames)];
    
    
    // count the Owned Games ------------------------------------------------------

    // Find the UserPlus document containing the userId in userLink
    const userPlusData = await UserPlus.findOne({ userLink: userId });
    console.log("userPlusData xxxxxxxxxxxx: " + userPlusData)

    // Extract all objectid values from the owned_boardgames_ID array
    const allObjectIds = userPlusData.owned_boardgames_ID.map(boardgame => boardgame.objectid);

    // Remove duplicates from the array
    const uniqueOwned_boardgames = [...new Set(allObjectIds)];

    // Now, uniqueObjectIds contains all unique objectids
    // console.log(uniqueOwned_boardgames);

    // count the Created invites ------------------------------------------------------
    // Count the number of UserPlus documents with the given userId
    const userPlusCount = await UserPlus.countDocuments({ userLink: userId });



    // count the Joined invites ------------------------------------------------------
    const Participated = await Room.countDocuments({
      joined_guest: { $in: [userId] }
    });
    // console.log(`Number of UserRoom documents with user_id ${userId} in joined_guest: ${Participated}`);
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx



    

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

    res.render('userAccess/profile/profile-index', { 
      user:userData, 
      userPlusData,
      userSession: userDataSession,
      filteredGuests,
      uniqueGames,
      uniqueOwned_boardgames,
      userPlusCount,
      Participated,
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






module.exports = {
  userProfileLoad,
}




