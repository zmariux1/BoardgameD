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



// the room
const theRoomLoad = async (req, res) => {
  try {
    const userData = await User.findById({ _id: req.session.user_id });

    // Fetch userRooms based on the dynamic roomId parameter
    const userRooms = await Room.find({ _id: req.params.roomId }).populate('user');
    const roomID = req.params.roomId;
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // Extract joined_guest IDs from userRooms
    const joinedGuestIds = userRooms.map(room => room.joined_guest).flat();
    

    // Fetch user details for joined_guest IDs
    const joinedGuestUsers = await User.find({ _id: { $in: joinedGuestIds } });
    
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // report honer & feedback
    // Fetch Honor details for joinedGuestUsers
    const honorDetails = await Honor.find({ userLink: { $in: joinedGuestIds } });
    // Fetch Feedback details for joinedGuestUsers
    const feedbackDetails = await Feedback.find({ userLink: { $in: joinedGuestIds } });
    // Fetch Stain details for joinedGuestUsers
    const stainDetails = await Stain.find({ userLink: { $in: joinedGuestIds } });

    // Map Honor details, Feedback details, and Stain details to respective joinedGuestUsers
    const joinedGuestsWithMultipleDetails = joinedGuestUsers.map(user => {
      const honorDetail = honorDetails.find(honor => honor.userLink.toString() === user._id.toString());
      const feedbackDetail = feedbackDetails.find(feedback => feedback.userLink.toString() === user._id.toString());
      const stainDetail = stainDetails.find(stain => stain.userLink.toString() === user._id.toString());

      return {
        ...user.toObject(),
        honor: honorDetail,
        feedback: feedbackDetail,
        stain: stainDetail // Add stain details to joinedGuestUsers
      };
    });


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // Fetch all documents from the UserPlus collection
    const userPlus_owned_BG = await UserPlus.find();
    // console.log(userPlus_owned_BG) 

    const InternalBgDataExp = await InternalBgData.find().sort({ name: 1 });
    InternalBgDataExp.sort((a, b) => a.name.localeCompare(b.name));
    // console.log(InternalBgDataExp) 


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // Find the UserPlus documents with the given userLink IDs
    const userPlusData = await UserPlus.find({
      userLink: { $in: joinedGuestIds }
    });

    // Extract the data from owned_boardgames_ID.objectid
    const objectIdsOwned = userPlusData.reduce((accumulator, userPlus) => {
      const ownedBoardgames = userPlus.owned_boardgames_ID.map(boardgame => boardgame.objectid);
      return accumulator.concat(ownedBoardgames);
    }, []);
    // Extract the data from WantToPlay_boardgames_ID.objectid
    const objectIdsWantToPlay = userPlusData.reduce((accumulator, userPlus) => {
      const wantToPlayBoardgames = userPlus.wantToPlay_boardgames_ID.map(boardgame => boardgame.objectid);
      return accumulator.concat(wantToPlayBoardgames);
    }, []);

    // Filter common items between objectIdsWantToPlay and objectIdsOwned
    const hasCommonGames = objectIdsWantToPlay.filter(id => objectIdsOwned.includes(id) && id !== '');

    // console.log("games are: " + hasCommonGames)

    // Remove duplicates and empty strings
    const uniqueobjectIdsWantToPlay = [...new Set(hasCommonGames.filter(id => id !== ''))];

    // Fetch data from InternalBgData for each objectid
    const internalMatchWantToPlayBg = await Promise.all(uniqueobjectIdsWantToPlay.map(async (objectId) => {
      return InternalBgData.findOne({ objectid: objectId });
    }));
    // console.log("games are: " + internalMatchWantToPlayBg)

    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })


    // console.log("this is the chatData: " + chatData)
    let onlineUsers = [];
    
    for (const room of userRooms) {
      for (const user of room.onlineUser) {
        const userData = await User.findById(user);
        onlineUsers.push(userData);
      }
    }


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

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userData })
    const notifications = identify_userPlus_notif.notification;

    res.render("userAccess/theRoom-index", { 
      user: userData, 
      userRooms, 
      roomID: roomID,
      joinedGuestUsers: joinedGuestsWithMultipleDetails, 
      userSession: userDataSession, 
      userPlus_owned_BG: userPlus_owned_BG, 
      userPlus: userPlusData,
      InternalBgData: InternalBgDataExp,
      internalMatchWantToPlayBg: internalMatchWantToPlayBg,
      onlineUsers: onlineUsers,
      notifications,
      allPages_RoomNotif,
      importHonorDetail,
      importFeedbackDetail,
      importStainDetail,
    }); 
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const theRoomUp = async (req, res) => {
  try {
    // Get the selected item value from the form submission
    const folder = req.body.folder; // reputation type folder
    const whichReputationModel = req.body.whichReputationModel; // What report model is involved
    const userSessionForm = req.body.userSession; // Who is the player that gave the report
    const whoIsReported = req.body.whoIsReported; // Who is the player that has been reported
    const selectedCategory = req.body.mainCategory; // the main category 
    const selectedItem = req.body.itemHeadTitle; // the sub category, with the actual report 
    const permanentReputationNumber = req.body.permanentReputationNumber; // rep identification code to link with the user
    const new_Tabs = "new_" + whichReputationModel;
    const type = req.body.type;
    const category = req.body.category;
    const subCategory = req.body.subCategory;

    const displayRep = req.body.displayRep;
    // console.log("type: " + type)
    // console.log("category: " + category)
    // console.log("subCategory: " + subCategory)
    // console.log("displayRep: " + displayRep)

    const val = "1";
    // console.log("updated val: " + val)

    // console.log("who is reporting: " + userSessionForm)
    const whichRoom = req.body.whichRoom; // in which room has the player been reported 
    // console.log("what room: " + whichRoom)

    const currentDate = new Date();// Get the current date
    const year = currentDate.getFullYear(); 
    const month = currentDate.getMonth() + 1; 
    const day = currentDate.getDate();
    // Create a formatted date string (e.g., "2023-12-31")
    const formattedDate = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
    // console.log("What time: " + formattedDate)



    // Identify and select the appropriate model based on whichReputationModel
    let selectedModel;
    switch (whichReputationModel) {
      case 'honor':
        selectedModel = Honor;
        break;
      case 'stain':
        selectedModel = Stain;
        break;
      case 'feedback':
        selectedModel = Feedback;
        break;
      default:
        // Handle an unknown model type or invalid input
        console.log('Tip de model invalit: ', whichReputationModel);
        return res.status(400).send('Tip de model invalit');
    }

    // console.log('Modelul selectat: ', selectedModel);

    // Add the NOTIFICATION about the reputation they received. Trebuie sa verific daca faptul ca am scros check-ul de stain, daca mai functioneaza check-ul cand face display la rep 
    if (whichReputationModel) {
      
      await UserPlus.updateOne(
        { userLink: whoIsReported },
        {
          $push: {
            notification: {
              type: whichReputationModel,
              reason: selectedCategory,
              submittedBy: userSessionForm,
              from_place: whichRoom,
              formattedDate: formattedDate || "", // Add formattedDate from request body
              notificationStatus: [ new_Tabs, "new_bell", "new_navbar", "new_indexBox", ], // trebuie modificat!!!!!
            },
          },
        }
      );
    }

    // let updateObject = {
    //   [`${selectedCategory}.${selectedItem}.val`]: 1
    // };



    // Find userLink based on userSession
    const userPlusData = await UserPlus.findOne({ userLink: whoIsReported });

    if (userPlusData) { // UserLink data exists
      // Create the empty allReputation xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      if (!userPlusData.allReputation || userPlusData.allReputation.length === 0) {
        // If allReputation array does not exist or is empty, insert an empty array
        userPlusData.allReputation = [];
        await userPlusData.save(); // Save the changes
      }

      // Save a reputation xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      // Retrieve the data you want to add
      const newData = {
        get_permanentReputationNumber: permanentReputationNumber,
        displayRep: displayRep
      };
      const ReportingUser = {
        reportedBy_userID: userSessionForm,
        whichRoom: whichRoom,
        formattedDate: formattedDate,
      };

      // Access the allReputation array
      const userRepData = userPlusData.allReputation;

      // Verify if the user already received this reputation to avoid duplicates
      const duplicateRepIdCode = userRepData.find(item =>
        item.get_permanentReputationNumber === permanentReputationNumber
      );
      if (duplicateRepIdCode) {
        // console.log("2 duplicateRepIdCode.get_permanentReputationNumber: " + duplicateRepIdCode.get_permanentReputationNumber)
        // console.log("2 duplicateRepIdCode.reportedBy.: " + duplicateRepIdCode.reportedBy)
        let existaReportul = false;
        duplicateRepIdCode.reportedBy.forEach((rep, index) => {
          console.log("rep xxxxx : " + rep);
          if (rep.reportedBy_userID === userSessionForm && rep.whichRoom === whichRoom) {
            existaReportul = true;
            console.log("Found it true")
          }
        });
        
        if (existaReportul) {
          console.log("The user has reported this player already in this room")
        } else {
          duplicateRepIdCode.reportedBy.push(ReportingUser);
          await userPlusData.save();
          console.log("The player has been rep")
        } 
        // console.log("Duplicate item found in the array:", duplicateRepIdCode);
        // console.log("Duplicate item's index:", userRepData.indexOf(duplicateRepIdCode));
      } else {
        // Add the new data to the array
        userRepData.push(newData);

        // Save the changes
        await userPlusData.save();
        


        // Create the empty allReputation xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        if (!userPlusData.allReputation.reportedBy || userPlusData.allReputation.reportedBy.length === 0) {
          // If allReputation array does not exist or is empty, insert an empty array
          userPlusData.allReputation.reportedBy = [];
          await userPlusData.save(); // Save the changes
        }
        
        const firstNewrep = userRepData.find(item =>
          item.get_permanentReputationNumber === permanentReputationNumber
        );

        let existaReportul = false;
        firstNewrep.reportedBy.forEach((rep, index) => {
          console.log("rep xxxxx : " + rep);
          if (rep.reportedBy_userID === userSessionForm && rep.whichRoom === whichRoom) {
            existaReportul = true;
            console.log("Found it true")
          }
        });
        
        if (existaReportul) {
          console.log("The user has reported this player already in this room")
        } else {
          firstNewrep.reportedBy.push(ReportingUser);
          await userPlusData.save();
          console.log("The player has been rep")
        } 
      }


    } 





    res.redirect("/index");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


// Add Comment
const commentUp = async (req, res) => {
  try {
    const roomID = req.body.roomID;
    const userID = req.body.userID;
    const yourName = req.body.yourName;
    const msg = req.body.msg;

    const notificationType = "chat";
    const new_votingCategory = "new_msg";

    const currentDate = new Date();// Get the current date
    const year = currentDate.getFullYear(); 
    const month = currentDate.getMonth() + 1; 
    const day = currentDate.getDate();
    // Create a formatted date string (e.g., "2023-12-31")
    const formattedDate = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;

    
    const room = await Room.findOneAndUpdate(
      { _id: roomID }, // Assuming you have roomId in your data
      {
        $push: {
          "chat": {
            userID: userID,
            name: yourName,
            message: msg,
            date: moment().format("MMM DD"),
            time: moment().format("HH:mm")
          }
        }
      },
      { new: true }
    ); 



    // add notification xxxxxxxxxxxxxxx
    // First, check if the notification already exists
    const existingNotification = await Room.findOne({
      _id: roomID,
      "notification.type": notificationType,
      "notification.reason": new_votingCategory,
      "notification.from_place": roomID
    });

    if (existingNotification) {
      // If the notification exists, update its notificationStatus with seenBy
      const getParticipants = await Room.findOne({ _id: roomID });

      // Assuming allParticipants is an array of userSessionIDs
      let allParticipants = getParticipants.joined_guest;
      
      let seenBy = [];
      for (let i = 0; i < allParticipants.length; i++) {
          let participantID = allParticipants[i];
          seenBy.push({
              participantID: participantID,
              theActualNotifItem: new_votingCategory,
              bell: "new_bell",
              navBar: "new_navbar",
              indexInviteBox: "new_indexBox",
          });
      }

      // Now seenBy contains the desired array of objects
      // Assuming seenBy is already populated
        await Room.updateOne(
          {
            _id: roomID,
            "notification": {
              $elemMatch: {
                "type": notificationType,
                "reason": new_votingCategory,
                "from_place": roomID
              }
            }
          },
          {
            $set: {
              "notification.$[elem].notificationStatus": seenBy
            }
          },
          {
            arrayFilters: [
              {
                "elem.type": notificationType,
                "elem.reason": new_votingCategory,
                "elem.from_place": roomID
              }
            ]
          }
        );
    
    } else {
      // If the notification does not exist, push a new notification with the new data
      const getParticipants = await Room.findOne({ _id: roomID });

      // Assuming allParticipants is an array of userSessionIDs
      let allParticipants = getParticipants.joined_guest;
      
      let seenBy = [];
      for (let i = 0; i < allParticipants.length; i++) {
          let participantID = allParticipants[i];
          seenBy.push({
              participantID: participantID,
              theActualNotifItem: new_votingCategory,
              bell: "new_bell",
              navBar: "new_navbar",
              indexInviteBox: "new_indexBox",
          });
      }

      // Now seenBy contains the desired array of objects

      // Use $push to update the notificationStatus array in MongoDB
      await Room.updateOne(
        { _id: roomID },
        {
          $push: {
            notification: {
              type: notificationType,
              reason: new_votingCategory,
              from_place: roomID,
              formattedDate: formattedDate || "",
              notificationStatus: seenBy, // Assign the array of objects
            },
          },
        }
      );

    }

    // res.sendStatus(204)
    res.redirect(`/room/${roomID}`)
  } catch(error) {
    console.log(error.message)
  }
}

// Remove player from the room
const removeRoomPlayerUp = async (req, res) => {
  try {
    const roomID = req.body.roomID;
    const removePlayer = req.body.removePlayer;

    // Update the UserPlusData document for the current user by removing a friend
    const userPlusData = await Room.findOneAndUpdate(
      { _id: roomID }, // Filter by the current user's ID
      { $pull: { joined_guest: removePlayer } }, // Remove the friend's ID from the 'friends' array
      { new: true } // To return the updated document
    );

    // res.sendStatus(204)
    res.redirect(`/room/${roomID}`)
  } catch(error) {
    console.log(error.message)
  }
}

// Remove player from the room
const banRoomPlayerUp = async (req, res) => {
  try {
    const roomID = req.body.roomID;
    const banPlayer = req.body.banPlayer;

    // Update the UserPlusData document for the current user by removing a friend
    const userPlusData1 = await Room.findOneAndUpdate(
      { _id: roomID }, // Filter by the current user's ID
      { $pull: { joined_guest: banPlayer } }, // Remove the friend's ID from the 'friends' array
      { new: true } // To return the updated document
    );

    const userPlusData2 = await Room.findOneAndUpdate(
      { _id: roomID }, // Filter by the current user's ID
      { $addToSet: { banned_players: banPlayer } }, // Add the friend's ID to the 'friends' array if it's not already present
      { new: true } // To return the updated document
    );

    // res.sendStatus(204)
    res.redirect(`/room/${roomID}`)
  } catch(error) {
    console.log(error.message)
  }
}

// Invite - voting pools 
const inviteVotesUP = async(req, res) =>{
  try {
    
    console.log("start here ")
    const roomID = req.body.roomID;
    const newValue = req.body.newValue;
    const userSessionID = req.body.userSessionID;
    const votingCategory = req.body.votingCategory;
    const newVote = req.body.newVote;
    const plusOneVote = req.body.plusOneVote;
    const updateInvite = req.body.updateInvite;
    const item_ID = req.body.item_ID;
    const new_votingCategory = "new_" + votingCategory;
    console.log("roomID xxxxxxxxxxxxxxxxxx: " + roomID)
    console.log("newValue xxxxxxxxxxxxxxxxxx: " + newValue)
    console.log("userSessionID xxxxxxxxxxxxxxxxxx: " + userSessionID)
    console.log("votingCategory xxxxxxxxxxxxxxxxxx: " + votingCategory)
    console.log("newVote xxxxxxxxxxxxxxxxxx: " + newVote)
    console.log("plusOneVote xxxxxxxxxxxxxxxxxx: " + plusOneVote)
    console.log("updateInvite xxxxxxxxxxxxxxxxxx: " + updateInvite)
    console.log("item_ID xxxxxxxxxxxxxxxxxx: " + item_ID)
    console.log("new_votingCategory xxxxxxxxxxxxxxxxxx: " + new_votingCategory)
    console.log("Ends here ")
    const currentDate = new Date();// Get the current date
    const year = currentDate.getFullYear(); 
    const month = currentDate.getMonth() + 1; 
    const day = currentDate.getDate();
    // Create a formatted date string (e.g., "2023-12-31")
    const formattedDate = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;

    // creaza un vot nou 
    if (newVote) {
      const generateAVote = await Room.findOneAndUpdate(
        { _id: roomID, "votes.newValue": { $ne: newValue } }, // Check if newValue is not present
        {
          $push: {
            "votes": {
              userSessionID: userSessionID,
              votingCategory: votingCategory,
              newValue: newValue,
              votedBy_ID: userSessionID,
              seenBy_ID: userSessionID,
              voting_date: formattedDate,
            }
          }
        },
        { new: true }
      );

      // First, check if the notification already exists
      const existingNotification = await Room.findOne({
        _id: roomID,
        "notification.type": "vote",
        "notification.reason": votingCategory,
        "notification.from_place": roomID
      });

      

      // console.log("cu votingCategory verific reason xxxxxxxxxxxxxxxxxx: " + votingCategory)
      // console.log("cu roomID verific from_place xxxxxxxxxxxxxxxxxx: " + roomID)
      // console.log("it works yyyyyyyyyyyyyyyyyyyyyyyyyyyyyy ")

      // If the notification exists, update its notificationStatus with seenBy
      if (existingNotification) {
        const getParticipants = await Room.findOne({ _id: roomID });
        // console.log("getParticipants xxxxxxxxxxxxxxxxxx: ", getParticipants);

        // Assuming allParticipants is an array of userSessionIDs
        let allParticipants = getParticipants.joined_guest;
        // console.log("allParticipants xxxxxxxxxxxxxxxxxx: ", allParticipants);

        let seenBy = [];
        for (let i = 0; i < allParticipants.length; i++) {
            let participantID = allParticipants[i];
            seenBy.push({
                participantID: participantID,
                theActualNotifItem: new_votingCategory,
                bell: "new_bell",
                navBar: "new_navbar",
                indexInviteBox: "new_indexBox",
            });
        }
        console.log("seenBy xxxxxxxxxxxxxxxxxx: ", seenBy);

        // Now seenBy contains the desired array of objects
        // Assuming seenBy is already populated
        await Room.updateOne(
          {
            _id: roomID,
            "notification": {
              $elemMatch: {
                "type": "vote",
                "reason": votingCategory,
                "from_place": roomID
              }
            }
          },
          {
            $set: {
              "notification.$[elem].notificationStatus": seenBy
            }
          },
          {
            arrayFilters: [
              {
                "elem.type": "vote",
                "elem.reason": votingCategory,
                "elem.from_place": roomID
              }
            ]
          }
        );
        
        // console.log("Notification status updated.");

      
      } else {
        // If the notification does not exist, push a new notification with the new data
        const getParticipants = await Room.findOne({ _id: roomID });

        // Assuming allParticipants is an array of userSessionIDs
        let allParticipants = getParticipants.joined_guest;
        
        let seenBy = [];
        for (let i = 0; i < allParticipants.length; i++) {
            let participantID = allParticipants[i];
            seenBy.push({
                participantID: participantID,
                theActualNotifItem: new_votingCategory,
                bell: "new_bell",
                navBar: "new_navbar",
                indexInviteBox: "new_indexBox",
            });
        }

        // Now seenBy contains the desired array of objects

        // Use $push to update the notificationStatus array in MongoDB
        await Room.updateOne(
          { _id: roomID },
          {
            $push: {
              notification: {
                type: "vote",
                reason: votingCategory,
                from_place: roomID,
                formattedDate: formattedDate || "",
                notificationStatus: seenBy, // Assign the array of objects
              },
            },
          }
        );

      }

      // If the notification doesn't exist, perform the update



    }
  

    // smart add/remove votes  
    if (plusOneVote) {
      const room = await Room.findOne({ _id: roomID, "votes._id": item_ID });
    
      if (room) {
        const voteIndex = room.votes.findIndex(vote => vote._id.toString() === item_ID);
        const votedByIndex = room.votes[voteIndex].votedBy_ID.indexOf(userSessionID);
    
        if (votedByIndex === -1) {
          // If userSessionID is not already in votedBy_ID, add it
          await Room.updateOne(
            { _id: roomID, "votes._id": item_ID },
            { $addToSet: { [`votes.${voteIndex}.votedBy_ID`]: userSessionID } }
          );
        } else {
          // If userSessionID is already in votedBy_ID, remove it
          await Room.updateOne(
            { _id: roomID, "votes._id": item_ID },
            { $pull: { [`votes.${voteIndex}.votedBy_ID`]: userSessionID } }
          );
        }
      }

      // Check if votedBy_ID is empty after add/remove operation
      const roomAfterUpdate = await Room.findOne({ _id: roomID, "votes._id": item_ID });
      const vote = roomAfterUpdate.votes.find(vote => vote._id.toString() === item_ID);

      if (vote && vote.votedBy_ID.length === 0) {
        // If votedBy_ID is empty, remove the entire document
        await Room.updateOne(
          { _id: roomID },
          { $pull: { votes: { _id: item_ID } } }
        );
      }
    }


    // Fetch the user room data based on roomID
    let userRoom = await Room.findById(roomID);

    if (!userRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Update the entire invite with the most voted TIME 
    if (updateInvite && votingCategory == "time") {
      // Filter and log votes with votingCategory equal to 'time'
      const timeVotes = userRoom.votes.filter(vote => vote.votingCategory === 'time');
      
      
      // Find the vote with the largest count of items inside votedBy_ID array
      const maxVotedByVote = timeVotes.reduce((maxVote, currentVote) => {
        if (currentVote.votedBy_ID.length > maxVote.votedBy_ID.length) {
          return currentVote;
        } else {
          return maxVote;
        }
      });

      // console.log('Vote with the largest count of items inside votedBy_ID array:', maxVotedByVote);
      // Store the value from newValue of maxVotedByVote into update_with_newValue
      const update_with_newValue = maxVotedByVote.newValue;

      // Replace selectedTime with update_with_newValue
      userRoom.selectedTime = update_with_newValue;

      // Save the updated userRoom to the database
      userRoom = await userRoom.save();

    }


    // Update the entire invite with the most voted TIME 
    if (updateInvite && votingCategory == "date") {
      // Filter and log votes with votingCategory equal to 'date'
      const dateVotes = userRoom.votes.filter(vote => vote.votingCategory === 'date');
      
      // Find the vote with the largest count of items inside votedBy_ID array
      const maxVotedByVote = dateVotes.reduce((maxVote, currentVote) => {
        if (currentVote.votedBy_ID.length > maxVote.votedBy_ID.length) {
          return currentVote;
        } else {
          return maxVote;
        }
      });

      // console.log('Vote with the largest count of items inside votedBy_ID array:', maxVotedByVote);
      // Store the value from newValue of maxVotedByVote into update_with_newValue
      const update_with_newValue = maxVotedByVote.newValue;

      // Replace selectedTime with update_with_newValue
      userRoom.selectedDate = update_with_newValue;

      // Save the updated userRoom to the database
      userRoom = await userRoom.save();

    }


    // Update the entire invite with the most voted LOCATION 
    if (updateInvite && votingCategory == "location") {
      // Filter and log votes with votingCategory equal to 'location'
      const dateVotes = userRoom.votes.filter(vote => vote.votingCategory === 'location');
      
      // Find the vote with the largest count of items inside votedBy_ID array
      const maxVotedByVote = dateVotes.reduce((maxVote, currentVote) => {
        if (currentVote.votedBy_ID.length > maxVote.votedBy_ID.length) {
          return currentVote;
        } else {
          return maxVote;
        }
      });
      // console.log('Vote with the largest count of items inside votedBy_ID array:', maxVotedByVote);
      // Store the value from newValue of maxVotedByVote into update_with_newValue
      const update_with_newValue = maxVotedByVote.newValue;
      // Replace selectedTime with update_with_newValue
      userRoom.location = update_with_newValue;
      // Save the updated userRoom to the database
      userRoom = await userRoom.save();
    }


    // Update the entire invite with the most voted BOARDGAMES 
    if (updateInvite && votingCategory == "boardGame") {
      // Filter and log votes with votingCategory equal to 'location'
      const dateVotes = userRoom.votes.filter(vote => vote.votingCategory === 'boardGame');
      // Sort dateVotes array based on the length of votedBy_ID array in descending order
      dateVotes.sort((a, b) => b.votedBy_ID.length - a.votedBy_ID.length);
      
      // Select the top 3 elements
      const top3Votes = dateVotes.slice(0, 3);
      const top3NewValues = top3Votes.map(vote => vote.newValue);
      
      // Array to collect promises
      const promises = [];

      // Iterate over each item in top3NewValues array
      top3NewValues.forEach(async newBGValue => {
          // Push the promise returned by InternalBgData.find() to the promises array
          promises.push(
              InternalBgData.find({ objectid: newBGValue }).then(theCurrentGame => {
                  // Extract the name property from each object in theCurrentGame and store in BgNames array
                  const names = theCurrentGame.map(game => game.name);
                  console.log(`Names for objectid ${newBGValue}:`, names);
                  return names;
              })
          );
      });

      try {
          // Wait for all promises to resolve
          const results = await Promise.all(promises);
          console.log("All promises resolved");

          // Flatten the array of arrays
          const BgNames = results.flat();

          // Once all promises are resolved, update the Room document
          const updateGames = await Room.findByIdAndUpdate(
              roomID, // filter by _id
              {
                  $set: {
                      theBoardgames_id: top3NewValues,
                      theBoardgames_name: BgNames
                  }
              },
              { new: true } // To return the updated document
          );

          // Log the updated document
          console.log("Updated games:", updateGames);
      } catch (error) {
          console.error("Error occurred:", error);
      }
    }


    res.redirect(`/room/${roomID}`);
  } catch(error) {
    console.log(error.message)
  }
}

// clear notifications 
const seenNotificationUp = async(req, res) =>{
  try {
    const clearNotifification = req.body.clearNotifification;
    const roomID = req.body.roomID;
    const notifType = req.body.notifType;
    const reason = req.body.reason;
    console.log("reason xxxxxxx: " + reason)

    const participantID = req.body.participantID;
    console.log("participantID xxxxxxx: " + participantID)
    const theActualNotifItem = req.body.theActualNotifItem;
    const bell = req.body.bell;
    const navBar = req.body.navBar;
    const indexInviteBox = req.body.indexInviteBox;

    const userData = await User.findById({ _id: req.session.user_id });

    // Fetch userRooms based on the dynamic roomId parameter
    const userRoomsData = await Room.findOne({ _id: roomID });
    // console.log("userRoomsData xxxxxxx: " + userRoomsData)


    if (clearNotifification ) {
      
      // Find the correct notification based on the condition reason === 'xxxxxxxx'
      const notificationToUpdate = userRoomsData.notification.find(notification => notification.reason === reason);

      if (!notificationToUpdate) {
        return res.sendStatus(204);
      }

      // Find the correct entry within notificationStatus where participantID === 'yyyyyyy'
      const participantNotificationStatus = notificationToUpdate.notificationStatus.find(
        status => status.participantID.toString() === participantID
      );

      if (!participantNotificationStatus) {
        console.log("Participant notification status not found")
        return res.sendStatus(204);
      }

      // Update the fields theActualNotifItem, bell, navBar, and indexInviteBox
      participantNotificationStatus.theActualNotifItem = theActualNotifItem;
      participantNotificationStatus.bell = bell;
      participantNotificationStatus.navBar = navBar;
      participantNotificationStatus.indexInviteBox = indexInviteBox;

      // Save the changes
      await userRoomsData.save();
    }

    res.sendStatus(204);
  } catch(error) {
    console.log(error.message)
  }
}








module.exports = {
  theRoomLoad,
  theRoomUp,
  commentUp,
  removeRoomPlayerUp,
  banRoomPlayerUp,
  inviteVotesUP,
  seenNotificationUp,
}




