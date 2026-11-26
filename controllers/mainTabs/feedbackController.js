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




const feedbackusLoad = async(req, res) =>{
  try {
    const userData = await User.findById({ _id:req.session.user_id })

    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })
    
    // current date 
    const currentDate = new Date();

    // Format the current date to YYYY-MM-DD
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    const sent = [];

    

    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userData })
    const notifications = identify_userPlus_notif.notification;


    res.render("feedback", {
      user:userData, 
      userSession: userDataSession,
      date: formattedDate,
      sent,
      notifications,
      allPages_RoomNotif,
    }); 
  } catch(error) {
    console.log(error.message)
  }
}

const feedbackusUp = async(req, res) =>{
  try {
    const userData = await User.findById({ _id:req.session.user_id })

    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })


    const userId = req.body.userSessionID;
    const typeOfFeedback = req.body.checkbox;
    const date = req.body.date;
    const description = req.body.description;

    console.log("User ID:", userId);
    console.log("Type of Feedback:", typeOfFeedback);
    console.log("Date:", date);
    console.log("Description:", description);

    const addFeedback = new FeedbackUs({
      userId: userId,
      typeOfFeedback: typeOfFeedback,
      date: date,
      description: description,
    });

    // Save the data to the MongoDB database
    const addFeedback_saved = await addFeedback.save();



    
    // current date 
    const currentDate = new Date();

    // Format the current date to YYYY-MM-DD
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const sent = ["success"];


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userData })
    const notifications = identify_userPlus_notif.notification;

    res.render("feedback", {
      user:userData, 
      userSession: userDataSession,
      date: formattedDate,
      sent,
      notifications,
      allPages_RoomNotif,
    });  
  } catch(error) {
    console.log(error.message)
  }
}





module.exports = {
  feedbackusLoad,
  feedbackusUp,
}




