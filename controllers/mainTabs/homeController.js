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



// exemplu de display data
const loadHome = async(req, res) =>{
  try {
    
    res.render("home"); 
  } catch(error) {
    console.log(error.message)
  }
}


const loadHome2 = async(req, res) =>{
  try {
    const page = parseInt(req.query.page) || 1; // Get page number from query parameter or default to 1
    const pageSize = 12; // Number of items per page
    const skip = (page - 1) * pageSize; // Calculate the number of items to skip

    // Calculate currentPage and totalPages
    const currentPage = page;
    const totalItems = await Room.countDocuments({});
    const totalPages = Math.ceil(totalItems / pageSize);

    const userData = await User.findById({ _id: req.session.user_id }).select('-password');

    const userPlusData = await UserPlus.find()


    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userData })
    const notifications = identify_userPlus_notif.notification;


    // Fetch userPlus data with pagination
    const userPlus = await UserPlus.find({})
      .skip(skip)
      .limit(pageSize);

    // Fetch userRooms data with pagination
    const userRooms = await Room.find({})
      .populate('user')
      .sort({ selectedDate: -1 }) // Sort by selectedDate in descending order
      .sort({ selectedTime: -1 }) // Sort by selectedTime in descending order
      .skip(skip)
      .limit(pageSize);

    const currentDate = new Date().toISOString().split('T')[0]; // use the currentDate to check if the room date has past over the current date
    console.log("curent date: " + currentDate) // nu a fost inca integrata verificarea datei 
    
    // Extract joined_guest IDs from userRooms
    const joinedGuestIds = {};

    for (const room of userRooms) {
      joinedGuestIds[room._id] = room.joined_guest;
    }
    // console.log(joinedGuestIds)

    // Fetch user details for joined_guest IDs
    const joinedGuestUsers = {};

    for (const roomId in joinedGuestIds) {
      const ids = joinedGuestIds[roomId];
      const users = await User.find({ _id: { $in: ids } }).limit(pageSize);
      joinedGuestUsers[roomId] = users;
    }

    // console.log(joinedGuestUsers)
    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })

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

    res.render("index", {
      user:userData, 
      userPlusData,
      userRooms, 
      joinedGuestUsers, 
      userSession: userDataSession, 
      currentDate: currentDate,
      userPlus,
      currentPage,
      totalPages,
      notifications,
      allPages_RoomNotif,
      importHonorDetail,
      importFeedbackDetail,
      importStainDetail,
    });
  } catch(error) {
    console.log(error.message)
  }
}


const indexAppendJoinedGuest = async (req, res) => {
  try {
    const theRoomID = req.body.userRoomId;
    const guestToAdd = req.body.joined_guest;
    const selectedTime = req.body.selectedTime;
    const selectedDate = req.body.selectedDate;
    const theBoardgames_id = req.body.theBoardgames_id;
    const location = req.body.location;
    const numberOfInvites = parseInt(req.body.numberOfInvites, 10);
    const joined_guest_length = parseInt(req.body.joined_guest_length, 10); 
    // const joined_guest_no = joined_guest[1];

    // console.log('theBoardgames_id xxxxxxxxxxxxxx:', theBoardgames_id);
    console.log('theRoomID:', theRoomID);
    // console.log('guestToAdd:', guestToAdd);
    // console.log('numberOfInvites:', numberOfInvites);
    // console.log('joined_guest_length:', joined_guest_length);
    // const userRooms = await Room.find({}).populate('user');
    // userRooms.length > userRooms.joined_guest.length

    // Check if the guest is already in the joined_guest array for the room
    const room = await Room.findOne({ _id: theRoomID, joined_guest: { $in: [guestToAdd] } });

    // console.log('Room:', room); // Add this line for debugging
    // !room - if the guest is not already in  
    // (joined_guest array for the room) & (joined_guest_length < numberOfInvites) 
    // trigger the:
    // - db update + res.redirect(`/room/${updatedRoom._id}`);

    if (!room) {
      // Guest is not in the joined_guest array, proceed with updating the room
      const updatedRoom = await Room.findByIdAndUpdate(
        { _id: theRoomID },
        { $addToSet: { joined_guest: guestToAdd } },
        { new: true }
      );

      // add the new participant into the votes and seenBy for the current voted TIME
      const updatedRoom_selectedTime = await Room.findOneAndUpdate(
        {
          _id: theRoomID,
          "votes.newValue": selectedTime
        },
        {
          $addToSet: {
            "votes.$.seenBy_ID": guestToAdd,
            "votes.$.votedBy_ID": guestToAdd
          }
        },
        { new: true }
      );
      
      // add the new participant into the votes and seenBy for the current voted DATE
      const updatedRoom_selectedDate = await Room.findOneAndUpdate(
        {
          _id: theRoomID,
          "votes.newValue": selectedDate
        },
        {
          $addToSet: {
            "votes.$.seenBy_ID": guestToAdd,
            "votes.$.votedBy_ID": guestToAdd
          }
        },
        { new: true }
      );
      

      // add the new participant into the votes and seenBy for the current voted LOCATION
      const updatedRoom_location = await Room.findOneAndUpdate(
        {
          _id: theRoomID,
          "votes.newValue": location
        },
        {
          $addToSet: {
            "votes.$.seenBy_ID": guestToAdd,
            "votes.$.votedBy_ID": guestToAdd
          }
        },
        { new: true }
      );


      // console.log("theRoomID:", theRoomID, typeof theRoomID);
      // console.log("theBoardgames_id:", theBoardgames_id, Array.isArray(theBoardgames_id) ? "Array" : typeof theBoardgames_id);
      // console.log("guestToAdd:", guestToAdd, typeof guestToAdd);

      
      const theBoardgames_id_array = theBoardgames_id.split(',');
      // console.log("theBoardgames_id_array:", theBoardgames_id_array, typeof theBoardgames_id_array);

      
      const updatedRoom_boardGame = await Room.findOneAndUpdate(
        {
          _id: theRoomID,
          "votes.newValue": { $in: theBoardgames_id_array }
        },
        {
          $addToSet: {
            "votes.$[elem].seenBy_ID": guestToAdd,
            "votes.$[elem].votedBy_ID": guestToAdd
          }
        },
        {
          arrayFilters: [{ "elem.newValue": { $in: theBoardgames_id_array } }],
          new: true
        }
      );


      // Redirect to the dynamically generated room URL
      if (updatedRoom) {
        res.redirect(`/room/${updatedRoom._id}`);
      } else {
        throw new Error("Failed to update room");
      }
    } else {
      // Guest is already in the joined_guest array, redirect to '/room'
      res.redirect(`/room/${theRoomID}`);
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};







module.exports = {
  loadHome,
  loadHome2,
  indexAppendJoinedGuest,
}




