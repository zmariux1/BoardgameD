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




// Pre-room / user rooms history 
const preRoomIndexLoad = async (req, res) => {
  try {
    // Get user data based on session user_id
    const userData = await User.findById(req.session.user_id);

    // Get user rooms based on session user_id, sorted by selectedDate
    const userRooms = await Room.find({ user: req.session.user_id })
      .sort({ selectedDate: -1 }); // Sort by selectedDate in decending order

    // Get user data again for session user_id (not sure why you're doing this again)
    const userDataSession = await User.findById(req.session.user_id);

    // Search for matches in joined_guest array, to check where is the user a guest/participant
    const matchingRooms = await Room.find({
      joined_guest: { $in: [userDataSession._id.toString()] },
    });

    // Header Notifications xxxxxxxxxxxxxxxxxxxxxxxx
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
    const notifications = identify_userPlus_notif ? identify_userPlus_notif.notification : [];

    // Room notifications xxxxxxxxxxxxxxxxxxxxxxxx
    const identify_room_notif = await Room.findOne({ userLink: userDataSession })
    const roomNotifications = identify_room_notif ? identify_room_notif.notification : [];


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });


    res.render("userAccess/preRoom-index", {
      user: userData,
      userRooms: userRooms,
      userSession: userDataSession,
      matchingRooms: matchingRooms, // Pass matching rooms to EJS
      notifications,
      roomNotifications,
      allPages_RoomNotif,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};





module.exports = {
  preRoomIndexLoad,
}




