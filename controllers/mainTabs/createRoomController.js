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


// get data for all the searches inside BGG. Use fetchXMLData() for anywhere it needs data from BGG
async function fetchXMLData() {
  try {
    const response = await axios.get('https://boardgamegeek.com/xmlapi/search?search=Crossbows%20and%20Catapults');
    return response.data;
  } catch (error) {
    console.error('Error fetching XML data:', error);
    return null;
  }
}

async function parseXML(data) {
  return new Promise((resolve, reject) => {
    parseString(data, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}





// Create rooms
const createRoomIndexLoad = async(req, res) =>{
  try {
    const page = parseInt(req.query.page) || 1; // Get page number from query parameter or default to 1
    const pageSize = 30; // Number of items per page
    const skip = (page - 1) * pageSize; // Calculate the number of items to skip


    const userData = await User.findById({ _id:req.session.user_id })

    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })

    // Search for the userPlusData document with the given req.session.user_id
    const userPlusData = await UserPlus.findOne({ userLink: req.session.user_id });

    // current date 
    const currentDate = new Date();
    // Format the current date to YYYY-MM-DD
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // Intreaga lista de jocuri - xxxxxxxxxxxxxxxxxxxxxx
    const extractedGames = await InternalBgData.find({})
    .sort({ order: 1 }) // 1 for ascending order
    .skip(skip)
    .limit(pageSize);

    // Jocurile salvate deja - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // Extract bg_id array from userPlusData
    const bgIds = userPlusData.bg_id;
    
    // Map each bgId to a promise that finds the corresponding InternalBgData
    const bgDataPromises = bgIds.map(async bgId => {
      return InternalBgData.findOne({ objectid: bgId });
    });

    // Wait for all promises to resolve
    const extracted_saved_games = await Promise.all(bgDataPromises);

    // Total count of items
    const totalCount = await InternalBgData.countDocuments();
    const totalPages = Math.ceil(totalCount / pageSize);


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
    const notifications = identify_userPlus_notif.notification;

    res.render("userAccess/createRoom-index", { 
      results: extractedGames, 
      stored_results: extracted_saved_games, 
      user:userData, 
      userSession: userDataSession, 
      userPlusData: userPlusData,
      formattedDate,
      currentPage: page,
      totalPages: totalPages,
      notifications,
      allPages_RoomNotif,
    });


  } catch (error) {
    console.error('Error:', error);
    res.render('error', { error: 'An error occurred' });
  }
};





// create a room - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
const createRoomUp = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Get page number from query parameter or default to 1
    const pageSize = 30; // Number of items per page
    const skip = (page - 1) * pageSize; // Calculate the number of items to skip

    const simple_searchBg = req.body.simple_searchBg;
    console.log("simple_searchBg: "+ simple_searchBg)

    const searchBg = req.body.searchBg;
    const submit_createRoom = req.body.submit_createRoom;
    // console.log(searchBg)

    const userID = req.body.userID;
    const theBoardgames_id = req.body.theBoardgames_id;
    const theBoardgames_name = req.body.theBoardgames_name;
    const yearPublished = req.body.yearPublished;
    const thumbnail = req.body.thumbnail;
    const add_game = req.body.add_game;
    const remove_game = req.body.remove_game;
    // console.log("userID "+ userID)
    // console.log("theBoardgames_id "+ theBoardgames_id)
    // console.log("theBoardgames_name "+ theBoardgames_name)
    // console.log("add_game "+ add_game)
    // console.log("remove_game "+ remove_game)




    // This will upload the search so that it will render a new selection of games from the search 
    if (simple_searchBg) {
      try {

        const userData = await User.findById({ _id:req.session.user_id })
    
        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })
    
        // Search for the userPlusData document with the given req.session.user_id
        const userPlusData = await UserPlus.findOne({ userLink: req.session.user_id });
    
        // current date 
        const currentDate = new Date();
        // Format the current date to YYYY-MM-DD
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
    
        // Intreaga lista de jocuri - xxxxxxxxxxxxxxxxxxxxxx
        const extractedGames = await InternalBgData.find({ name: { $regex: simple_searchBg, $options: 'i' } })
        .skip(skip)
        .limit(pageSize)
        .exec(); // Execute the query

    
        // Jocurile salvate deja - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // Extract bg_id array from userPlusData
        const bgIds = userPlusData.bg_id;
        
        // Map each bgId to a promise that finds the corresponding InternalBgData
        const bgDataPromises = bgIds.map(async bgId => {
          return InternalBgData.findOne({ objectid: bgId });
        });
    
        // Wait for all promises to resolve
        const extracted_saved_games = await Promise.all(bgDataPromises);
    
        // Total count of items
        const totalCount = await InternalBgData.countDocuments();
        const totalPages = Math.ceil(totalCount / pageSize);
    

        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

        // Header Notifications
        const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
        const notifications = identify_userPlus_notif.notification;
    
        res.render("userAccess/createRoom-index", { 
          results: extractedGames, 
          stored_results: extracted_saved_games, 
          user:userData, 
          userSession: userDataSession, 
          userPlusData: userPlusData,
          formattedDate,
          currentPage: page,
          totalPages: totalPages,
          notifications,
          allPages_RoomNotif,
        });



      } catch (error) {
        console.error('Error:', error);
        res.render('error', { error: 'An error occurred' });
      }
    } else {
      console.log("searchBg - No search has been done / Nu s-a facut niciun Search");
    }



    // get data for all the searches inside BGG. Use fetchXMLData() for anywhere it needs data from BGG
    async function userSearch_fetchXMLData() {
      try {
        const response = await axios.get(`https://boardgamegeek.com/xmlapi/search?search=${searchBg}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching XML data:', error);
        return null;
      }
    }


    if (add_game) {
      // Update the UserPlusData document for the current user by adding a game
      const userPlusData = await UserPlus.findOneAndUpdate(
        { userLink: userID }, // Filter by the current user's ID
        { 
          $addToSet: { 
            bg_id: theBoardgames_id, // Add the game's ID to the bg_id array if it's not already present
            bg_name: theBoardgames_name // Add the game's name to the bg_name array
          } 
        },
        { new: true } // To return the updated document
      );


      // Check if objectIdImport exists in the database
      const existingGameData = await InternalBgData.findOne({ objectid: theBoardgames_id });
      // If the object ID does not exist, insert new data
      if (!existingGameData && add_game) {
        const randomOrder = Math.floor(100000 + Math.random() * 900000);

        const newGameData = new InternalBgData({
          order: randomOrder,
          name: theBoardgames_name.toString(), // Ensure name is a string
          objectid: theBoardgames_id,
          yearPublished: yearPublished.toString(), // Save the extracted numeric year or 'N/A'
          thumbnail: thumbnail.toString(), // Ensure thumbnail is a string
          // Add other fields as needed
        });
        await newGameData.save();
      }


      res.sendStatus(204)
    } else if (remove_game) {
      // Update the UserPlusData document for the current user by removing a game
      const userPlusData = await UserPlus.findOneAndUpdate(
        { userLink: userID }, // Filter by the current user's ID
        { 
          $pull: { 
            bg_id: theBoardgames_id, // Remove the game's ID from the bg_id array
            bg_name: theBoardgames_name // Remove the game's name from the bg_name array
          } 
        },
        { new: true } // To return the updated document
      );
      res.sendStatus(204);
    }
    


    if (searchBg) {
      try {
        const page = parseInt(req.query.page) || 1; // Get page number from query parameter or default to 1
        const pageSize = 30; // Number of items per page
        const skip = (page - 1) * pageSize; // Calculate the number of items to skip

        const userData = await User.findById({ _id:req.session.user_id })

        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })
        
        // Search for the userPlusData document with the given req.session.user_id
        const userPlusData = await UserPlus.findOne({ userLink: req.session.user_id });

        // current date 
        const currentDate = new Date();

        // Format the current date to YYYY-MM-DD
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const day = currentDate.getDate().toString().padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        const xmlData = await userSearch_fetchXMLData();
        if (xmlData) {
          parseString(xmlData, async (err, result) => {
            if (err) {
              console.error('Error parsing XML:', err);
              res.render('error', { error: 'Error parsing XML' });
            } else {
              const boardgames = result.boardgames?.boardgame || [];
              const extractedGames = [];
              

              // Fetch additional data using objectid from the second API
              for (const game of boardgames) {
                const objectIdImport = game.$.objectid;
                try {
                  const response = await axios.get(`https://api.geekdo.com/xmlapi/boardgame/${objectIdImport}`);
                  const secondResult = await parseXML(response.data);
                  // console.log(secondResult)

                  const yearPublished = secondResult?.boardgames?.boardgame?.[0]?.yearpublished || 'N/A';
                  const thumbnail = secondResult?.boardgames?.boardgame?.[0]?.thumbnail || 'N/A';
                  // const name = secondResult?.boardgames?.boardgame?.[0]?.name?.[0]?._ || 'N/A';
                  const name = secondResult?.boardgames?.boardgame?.[0]?.name?.find((n) => n?.$.primary === 'true')?._ || 'N/A';

                  // const objectid = secondResult?.boardgames?.boardgame?.[0]?.objectid || 'N/A';

                  
                  // console.log(yearPublished); // Check if yearPublished is retrieved correctly
                  // console.log(thumbnail); // Check if thumbnail is retrieved correctly
                  extractedGames.push({
                    objectid: objectIdImport,
                    yearPublished,
                    thumbnail,
                    name,
                  });
                } catch (error) {
                  console.error('Error fetching data from the second API:', error);
                }
              }

              

              // Jocurile salvate deja - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              // Extract bg_id array from userPlusData
              const bgIds = userPlusData.bg_id;

              // Initialize saved_boardgames array
              const saved_boardgames = [];

              // Push each element of bgIds into saved_boardgames
              bgIds.forEach(bgId => {
                saved_boardgames.push(bgId);
              });
              console.log(saved_boardgames);
              const extracted_saved_games = [];
              console.log(extracted_saved_games);
              // Fetch additional data using objectid from the second API
              for (const game of saved_boardgames) {
                const objectIdImport = game;
                try {
                  const response = await axios.get(`https://api.geekdo.com/xmlapi/boardgame/${objectIdImport}`);
                  const secondResult = await parseXML(response.data);
                  // console.log(secondResult)

                  const yearPublished = secondResult?.boardgames?.boardgame?.[0]?.yearpublished || 'N/A';
                  const thumbnail = secondResult?.boardgames?.boardgame?.[0]?.thumbnail || 'N/A';
                  const name = secondResult?.boardgames?.boardgame?.[0]?.name?.find((n) => n?.$.primary === 'true')?._ || 'N/A';
                  const objectid = secondResult?.boardgames?.boardgame?.[0]?.objectid || 'N/A';

                  
                  // console.log(yearPublished); // Check if yearPublished is retrieved correctly
                  // console.log(thumbnail); // Check if thumbnail is retrieved correctly

                  extracted_saved_games.push({
                    objectid: objectIdImport,
                    yearPublished,
                    thumbnail,
                    name,
                  });
                } catch (error) {
                  console.error('Error fetching data from the second API:', error);
                }
              }

              // Calculate total number of items and total pages for pagination
              const totalCount = extractedGames.length;
              const totalPages = Math.ceil(totalCount / pageSize);

              // Calculate startPage and endPage for pagination links
              const startPage = Math.max(1, page - 1);
              const endPage = Math.min(page + 1, totalPages);

              // Slice the extractedGames array to get items for the current page
              const startIdx = (page - 1) * pageSize;
              const endIdx = Math.min(startIdx + pageSize, totalCount);

              const extractedGamesForPage = extractedGames.slice(startIdx, endIdx);


              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

              // Header Notifications
              const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
              const notifications = identify_userPlus_notif.notification;

              res.render("userAccess/createRoom-index", { 
                results: extractedGamesForPage, 
                stored_results: extracted_saved_games, 
                user:userData, 
                userSession: userDataSession,
                formattedDate,
                currentPage: page,
                totalPages: totalPages,
                notifications,
                allPages_RoomNotif,
              });
            }
          });
        } else {
          res.render('error', { error: 'No XML data fetched' });
        }
      } catch (error) {
        console.error('Error:', error);
        res.render('error', { error: 'An error occurred' });
      }
    } else {
      console.log("No search has been done / Nu s-a facut niciun Search");
    }

    

    if (submit_createRoom) {
      try {
        // Search for the userPlusData document with the given req.session.user_id
        const userPlusData = await UserPlus.findOne({ userLink: req.session.user_id });
        // Extract bg_id array from userPlusData
        const bgIds = userPlusData.bg_id;
        const bgNames = userPlusData.bg_name;
        const roomOwner = req.session.user_id
        // Check if bgIds is empty or null
        if (!bgIds || bgIds.length === 0) {
          return res.status(400).send("No board games selected");
        }

        // console.log("asta e bgIds " + bgIds)
        // console.log("asta e bgNames " + bgNames)
        
        const numberOfInvites = req.body.numberOfInvites
        const theBoardgames_id = bgIds
        const theBoardgames_name = bgNames
        const selectedDate = req.body.selectedDate
        const selectedTime = req.body.selectedTime
        // const location = req.body.location
        const joined_guest = [roomOwner] // insert the owner as a participant as well
        // console.log(numberOfInvites)
        
        
        const newRoom = await new Room({ // acest Room trebuie sa fie identic cu numele in care stocam requestul 
          user: req.session.user_id, // Assign the user ID to the 'user' field
          theBoardgames_id: theBoardgames_id,
          theBoardgames_name: theBoardgames_name,
          numberOfInvites: numberOfInvites, // Replace this with the actual data you want to save
          selectedDate: selectedDate,
          selectedTime: selectedTime,
          joined_guest: joined_guest,
          location: "Home",
          notification: {
            type: "Invite Creation",
            reason: "Invite Creation",
            submittedBy: req.session.user_id,
            from_place: "",
            notificationStatus: [], // modify as needed
          },
        });
    
        const savedRoom = await newRoom.save(); // Save the new room data to the database
        const savedRoomIdAsString = savedRoom._id.toString(); // Convert ObjectId to string
        await Room.updateOne(
          { _id: savedRoom._id },
          { $set: { "notification.0.from_place": savedRoomIdAsString } }
        );


        // Create and Auto-insert self vote si seen pe Time
        const newVoteTime = {
          userSessionID: joined_guest,
          votingCategory: "time",
          newValue: selectedTime,
          seenBy_ID: joined_guest,
          votedBy_ID: joined_guest,
          voting_date: new Date().toISOString(),
        };

        // Create and Auto-insert self vote si seen pe Date
        const newVoteDate = {
          userSessionID: joined_guest,
          votingCategory: "date",
          newValue: selectedDate,
          seenBy_ID: joined_guest,
          votedBy_ID: joined_guest,
          voting_date: new Date().toISOString(),
        };

        // Create and Auto-insert self vote si seen pe LOCATION
        const newVoteLocation = {
          userSessionID: joined_guest,
          votingCategory: "location",
          newValue: "Home",
          seenBy_ID: joined_guest,
          votedBy_ID: joined_guest,
          voting_date: new Date().toISOString(),
        };

        // Create and Auto-insert self vote si seen pe BOARD GAME
        // Iterate over each board game ID
        try {
          for (const boardgameId of bgIds) {

              const votingData = {
                  userSessionID: joined_guest,
                  votingCategory: "boardGame",
                  newValue: boardgameId,
                  seenBy_ID: joined_guest,
                  votedBy_ID: joined_guest,
                  voting_date: new Date().toISOString()
              };
              console.log("newRoom._id" + newRoom._id)
  
              // Find the room by its ID and update the votes array
              const updatedRoom = await Room.findByIdAndUpdate(newRoom._id, { $push: { votes: votingData } }, { new: true });
              // console.log("Room updated successfully:", updatedRoom);
          }
        } catch (error) {
            console.error("Error updating room:", error);
            // Handle error
        }
      
        const updatedRoomx = await Room.findById(newRoom._id);
        // console.log("First item from votes:", updatedRoomx.votes[0]);
        // console.log("Last item from votes:", updatedRoomx.votes[updatedRoomx.votes.length - 1]);
        
        
        const updatedRoom = await Room.findByIdAndUpdate(
          newRoom._id,
          {
            $push: {
              votes: {
                $each: [newVoteTime, newVoteDate, newVoteLocation]
              }
            }
          },
          { new: true, runValidators: true }
        );


        userPlusData.bg_id = [];
        userPlusData.bg_name = [];
        await userPlusData.save();







        res.redirect(`/room/${newRoom._id}`);
      } catch (error) {
        res.status(500).send(error.message); // Send an error response if an error occurs
      }
    } else {
      console.log("No Room has been created / Nu s-a create niciun Room");
    }



  } catch (error) {
    res.status(500).send(error.message); // Send an error response if an error occurs
  }
};








module.exports = {
  createRoomIndexLoad,
  createRoomUp,
}




