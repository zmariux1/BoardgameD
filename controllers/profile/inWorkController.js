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


const userProfile_HistoryLoad = async (req, res) => {
  try {
    const userData = await User.findById({ _id:req.session.user_id })

    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })
    
    res.render('userAccess/profile/profile-index-History', { user:userData, userSession: userDataSession });
  } catch (error) {
    console.error('Error:', error);
    res.render('error', { error: 'An error occurred' });
  }
};



// Photo Gallery
const userImagesLoad = async(req, res) =>{
  try {
    const userData = await User.findById({ _id:req.session.user_id })

    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
    const notifications = identify_userPlus_notif.notification;

    res.render("userAccess/gallery", {
      user:userData, 
      userSession: userDataSession,
      notifications,
    }); 
  } catch(error) {
    console.log(error.message)
  }
}







module.exports = {
  userProfile_HistoryLoad,
  userImagesLoad,
}




