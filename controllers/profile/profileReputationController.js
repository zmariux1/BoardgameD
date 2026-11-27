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



const userProfile_ReputationLoad = async (req, res) => {
  try {
    const userId = req.params.userId; // Extract userId from the URL parameter

    // Find the user profile using the userID
    const userData = await User.findById(userId);

    if (!userData) {
      return res.status(404).render('error', { error: 'User not found' });
    }

    // Use this to verify if it's the session user
    const userDataSession = await User.findById({ _id:req.session.user_id })
    




    const userPlusData = await UserPlus.findOne({ userLink: userId })
    // console.log(userPlusData)



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


    res.render('userAccess/profile/profile-index-Reputation', { 
      user:userData, 
      userSession: userDataSession, 
      userPlus: userPlusData, 
      notifications,
      importHonorDetail,
      importFeedbackDetail,
      importStainDetail,
      allPages_RoomNotif
    });



  } catch (error) {
    console.error('Error:', error);
    res.render('error', { error: 'An error occurred' });
  }
};

const userProfile_ReputationUp = async (req, res) => {
  try {
    const userID = req.body.userID;
    const type = req.body.type;
    const category = req.body.category;
    const subCategory = req.body.subCategory;

    const add_rep = req.body.add_rep;
    const remove_rep = req.body.remove_rep;

    console.log('userID:', userID);
    console.log('type:', type);
    console.log('category:', category);
    console.log('subCategory:', subCategory);
    console.log('add_rep:', add_rep);
    console.log('remove_rep:', remove_rep);

    // Identify the session user
    const userDataSession = await UserPlus.findById({ _id:req.session.user_id })

    if(add_rep) {
      try {
        // Update UserPlus model
        const userPlusData1 = await UserPlus.findOneAndUpdate(
          { userLink: userID }, // Filter by the current user's ID
          { 
            $addToSet: { 
              'reputation': {
                type: type,
                category: category,
                subCategory: subCategory
              }
            }
          }, 
          { new: true } // To return the updated document
        );
        
        res.redirect(`/userProfile-Reputation/${userID}`)
      } catch (error) {
        console.error('Error:', error);
        res.render('error', { error: 'An error occurred' });
      }
    }

    if(remove_rep) {
      try {
      
        // Update UserPlus model
        const userPlusData2 = await UserPlus.findOneAndUpdate(
          { userLink: userID }, // Filter by the current user's ID
          { 
            $pull: { 
              'reputation': {
                type: type,
                category: category,
                subCategory: subCategory
              }
            }
          }, 
          { new: true } // To return the updated document
        );
        
        res.redirect(`/userProfile-Reputation/${userID}`)
      } catch (error) {
        console.error('Error:', error);
        res.render('error', { error: 'An error occurred' });
      }
    }

    

  } catch (error) {
    console.error('Error:', error);
    res.render('error', { error: 'An error occurred' });
  }
};






module.exports = {
  userProfile_ReputationLoad,
  userProfile_ReputationUp,
}




