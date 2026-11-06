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




const friendsLoad = async (req, res) => {
  try {
    const userData = await User.findById(req.session.user_id);
    const allUsers = await User.find({}, { email: 1, images: 1, yourName: 1 });
    const currentSessionAllData = await UserPlus.findOne({ userLink: req.session.user_id }).populate('friends');
    // console.log("this is the currentSessionAllData: " + currentSessionAllData)
    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
    const notifications = identify_userPlus_notif.notification;



    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });


    res.render("userAccess/profile/friends", { 
      user: userData, 
      allUsers: allUsers,
      matchingUsers: [],
      sessionAll: currentSessionAllData, 
      notifications,
      userSession: userDataSession,
      allPages_RoomNotif
    });
  } catch (error) {
    console.log(error.message);
  }
};
const friendsUp = async (req, res) => {
  try {
    const search_people = req.body.search_people;

    if (search_people) {
      try {
        const userData = await User.findById(req.session.user_id);
        const allUsers = await User.find({}, { email: 1, images: 1, yourName: 1 });
        const currentSessionAllData = await UserPlus.findOne({ userLink: req.session.user_id }).populate('friends');
        

        // Extract _id values from friends array
        const friendIds = currentSessionAllData.friends.map(friend => friend._id);

        // Search for users in the User model using the extracted _id values and yourName
        const matchingUsers = await User.find({
          $and: [
            { yourName: { $regex: new RegExp(search_people) } },
            { _id: { $in: friendIds } }
          ]
        }, { email: 1, images: 1, yourName: 1 });

        // console.log("asta este matchingUsers" + matchingUsers)


        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })

        // Header Notifications
        const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
        const notifications = identify_userPlus_notif.notification;



    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });


        res.render("userAccess/profile/friends", { 
          user: userData, 
          allUsers: allUsers,
          matchingUsers: matchingUsers,
          sessionAll: currentSessionAllData, 
          userSession: userDataSession,
          notifications,
          allPages_RoomNotif,
        });
      } catch (error) {
        console.error('Error:', error);
        res.render('error', { error: 'An error occurred' });
      }
    } else {
      console.log("No search has been done / Nu s-a facut niciun Search");
    }



    // Find the current user's data from the session
    const userData = await User.findById(req.session.user_id);

    // Get the friend's ID from the submitted form
    const unfriendId = req.body.unfriend; // Get the unfriend ID from the form

    // Update the UserPlusData document for the current user by removing a friend
    const userPlusData = await UserPlus.findOneAndUpdate(
      { userLink: userData._id }, // Filter by the current user's ID
      { $pull: { friends: unfriendId } }, // Remove the friend's ID from the 'friends' array
      { new: true } // To return the updated document
    );

    // Render the view or perform any necessary action
    res.redirect("/friends");
  } catch (error) {
    console.log(error.message);
    // Handle errors accordingly
  }
};

const peopleLoad = async(req, res) =>{
  try {
    const userData = await User.findById({ _id:req.session.user_id })
    const allUsers = await User.find({}, { email: 1, images: 1, yourName: 1 }); // Fetching all users and projecting only the 'email' field

    // Fetch the data from UserPlusData based on the userLink (session ID)
    const currentSessionAllData = await UserPlus.findOne({ userLink: req.session.user_id });

    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
    const notifications = identify_userPlus_notif.notification;



    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });


    res.render("userAccess/profile/people", {
      user:userData, 
      allUsers:allUsers, 
      matchingUsers: [],
      sessionAll: currentSessionAllData, 
      userSession:userDataSession,
      notifications,
      allPages_RoomNotif,
    }); 
  } catch(error) {
    console.log(error.message)
  }
}
const peopleUp = async (req, res) => {
  try {
    const search_people = req.body.search_people;

    if (search_people) {
      try {
        const userData = await User.findById({ _id:req.session.user_id })
        const allUsers = await User.find({}, { email: 1, images: 1, yourName: 1 }); // Fetching all users and projecting only the 'email' field
        const matchingUsers = await User.find({
          yourName: { $regex: new RegExp(search_people) }
        }, { email: 1, images: 1, yourName: 1 });
        
        
        // Fetch the data from UserPlusData based on the userLink (session ID)
        const currentSessionAllData = await UserPlus.findOne({ userLink: req.session.user_id });
    
        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })
    
        // Header Notifications
        const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
        const notifications = identify_userPlus_notif.notification;


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

        res.render("userAccess/profile/people", {
          user:userData, 
          allUsers:allUsers, 
          matchingUsers: matchingUsers,
          sessionAll: currentSessionAllData, 
          userSession:userDataSession,
          notifications,
          allPages_RoomNotif,
        });
      } catch (error) {
        console.error('Error:', error);
        res.render('error', { error: 'An error occurred' });
      }
    } else {
      console.log("No search has been done / Nu s-a facut niciun Search");
    }


    // Find the current user's data from the session
    const userData = await User.findById(req.session.user_id);
    // Get the friend's ID from the submitted form
    const friendId = req.body.friend; // Assuming this contains the friend's ID from the form
    const unfriendId = req.body.unfriend; // Get the unfriend ID from the form

    if (friendId) {
      // Update the UserPlusData document for the current user by adding a friend
      const userPlusData = await UserPlus.findOneAndUpdate(
        { userLink: userData._id }, // Filter by the current user's ID
        { $addToSet: { friends: friendId } }, // Add the friend's ID to the 'friends' array if it's not already present
        { new: true } // To return the updated document
      );
    } else if (unfriendId) {
      // Update the UserPlusData document for the current user by removing a friend
      const userPlusData = await UserPlus.findOneAndUpdate(
        { userLink: userData._id }, // Filter by the current user's ID
        { $pull: { friends: unfriendId } }, // Remove the friend's ID from the 'friends' array
        { new: true } // To return the updated document
      );
    }

    // Render the view or perform any necessary action
    res.redirect("/people");

  } catch (error) {
    console.log(error.message);
    // Handle errors accordingly
  }
};







module.exports = {
  friendsLoad,
  friendsUp,
  peopleLoad,
  peopleUp,
}




