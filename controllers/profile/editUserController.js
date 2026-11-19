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



// user authorisated locations
// user profile edit and update
const userEditProfileLoad = async(req, res) =>{
  try {
    const userData = await User.findById({ _id:req.session.user_id })

    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
    const notifications = identify_userPlus_notif.notification;


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

    res.render("userAccess/profile/personalProfile", {user:userData, userSession: userDataSession, notifications, allPages_RoomNotif}); 
  } catch(error) {
    console.log(error.message)
  }
}

const userUpdateProfile = async(req, res) =>{
  try {
    const userData = await User.findById({ _id: req.session.user_id });
    
    if(req.file){
      const userData = await User.findByIdAndUpdate({ _id:req.body.user_id }, { $set:{yourName:req.body.yourName, firstName:req.body.firstName, lastName:req.body.lastName, phone:req.body.phone, images:req.file.filename } })
    } else {
      const userData = await User.findByIdAndUpdate({ _id:req.body.user_id }, { $set:{yourName:req.body.yourName, firstName:req.body.firstName, lastName:req.body.lastName, phone:req.body.phone} })
    }
    res.redirect(`/userProfile/${userData._id}`);
  } catch(error) {
    console.log(error.message)
  }
}






module.exports = {
  userEditProfileLoad,
  userUpdateProfile,
}




