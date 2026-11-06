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




const addOwnedBGLoad = async(req, res) =>{
  try {
    const userData = await User.findById({ _id:req.session.user_id })
    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })
    
    const extractedGames = await InternalBgData.find({});

    const playerOwnedGames = await UserPlus.findOne({ userLink: req.session.user_id });

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
    const notifications = identify_userPlus_notif.notification;


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

    if(playerOwnedGames){
      res.render("userAccess/profile/bg_list/BgList-Add_Own", { 
        results: extractedGames, 
        user:userData, 
        userSession: userDataSession, 
        playerOwnedGames: playerOwnedGames,
        notifications,
        allPages_RoomNotif,
      });
    } else {
      res.render("userAccess/profile/bg_list/BgList-Add_Own", { 
        results: extractedGames, 
        user:userData, 
        userSession: userDataSession,
        notifications,
        allPages_RoomNotif,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.render('error', { error: 'An error occurred' });
  }
};

const addOwnedBGUp = async(req, res) =>{
  try {
    simple_searchBg = req.body.simple_searchBg;
    searchBg = req.body.searchBg;
    // console.log("searchBg:" + searchBg)
    submit_createRoom = req.body.submit_createRoom;
    // console.log("submit_createRoom" + submit_createRoom)

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

    // This will upload the search so that it will render a new selection of games from the search 
    if (simple_searchBg) {
      try {
        const userData = await User.findById({ _id:req.session.user_id })

        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })


        const extractedGames = await InternalBgData.find({ name: { $regex: simple_searchBg, $options: 'i' } });
    
        const playerOwnedGames = await UserPlus.findOne({ userLink: req.session.user_id });

        // Header Notifications
        const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
        const notifications = identify_userPlus_notif.notification;


        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

        if(playerOwnedGames){
          res.render("userAccess/profile/bg_list/BgList-Add_Own", { 
            results: extractedGames, 
            user:userData, 
            userSession: userDataSession, 
            playerOwnedGames: playerOwnedGames,
            notifications,
            allPages_RoomNotif,
          });
        } else {
          res.render("userAccess/profile/bg_list/BgList-Add_Own", { 
            results: extractedGames, 
            user:userData, 
            userSession: userDataSession,
            notifications,
            allPages_RoomNotif,
          });
        }

      } catch (error) {
        console.error('Error:', error);
        res.render('error', { error: 'An error occurred' });
      }
    } else {
      console.log("searchBg - No search has been done / Nu s-a facut niciun Search");
    }


    // This will upload the search so that it will render a new selection of games from the search 
    if (searchBg) {
      try {
        const userData = await User.findById({ _id:req.session.user_id })

        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })

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
                  const name = secondResult?.boardgames?.boardgame?.[0]?.name?.find((n) => n?.$.primary === 'true')?._ || 'N/A';
                  const objectid = secondResult?.boardgames?.boardgame?.[0]?.objectid || 'N/A';
    
                  
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
    
              const playerOwnedGames = await UserPlus.findOne({ userLink: req.session.user_id });
    
              // Header Notifications
              const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
              const notifications = identify_userPlus_notif.notification;


              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

              if(playerOwnedGames){
                res.render("userAccess/profile/bg_list/BgList-Add_Own", { 
                  results: extractedGames, 
                  user:userData, 
                  userSession: userDataSession, 
                  playerOwnedGames: playerOwnedGames,
                  notifications,
                  allPages_RoomNotif,
                });
              } else {
                res.render("userAccess/profile/bg_list/BgList-Add_Own", { 
                  results: extractedGames, 
                  user:userData, 
                  userSession: userDataSession,
                  notifications,
                  allPages_RoomNotif,
                });
              }
              
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
      console.log("searchBg - No search has been done / Nu s-a facut niciun Search");
    }




    if (submit_createRoom) {
      try {
        const userData = await User.findById({ _id: req.session.user_id });
        const userRooms = await Room.find({ user: req.session.user_id });

        // Use this to verify if it's the session user when accessing in EJS a link with an ID
        const userDataSession = await User.findById({ _id: req.session.user_id });

        // Extract data from the request
        const objectid = req.body.bg_id;
        const name = req.body.bg_name;
        const thumbnail = req.body.bg_thumbnail;
        const yearPublished = req.body.bg_yearPublished;

        const currentDate = new Date();// Get the current date
        const year = currentDate.getFullYear(); 
        const month = currentDate.getMonth() + 1; 
        const day = currentDate.getDate();
        // Create a formatted date string (e.g., "2023-12-31")
        const formattedDate = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;

        // Check if objectid is provided
        if (!objectid) {
          console.log('Objectid is required.');
          // Handle the case where objectid is missing, maybe send an error response
          return res.status(400).send('Objectid is required.');
        }



        // Save what bg the player is owning in the UserPlus (by adding the game's ID) xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const existingBg = await UserPlus.findOne({ 
          userLink: userData,
          "owned_boardgames_ID": { $elemMatch: { objectid: objectid } }, // Check if objectid already exists in PlayerBgData collection
        });
        if (existingBg) {
          // Object with the given objectid already exists
          console.log("Object with the given objectid already exists, in the UserPlus - owned_boardgames_ID");
        } else {
          // Object with the given objectid doesn't exist, append a new object
          await UserPlus.updateOne(
            { userLink: userData },
            {
              $push: {
                owned_boardgames_ID: {
                  objectid: objectid,
                  formattedDate: formattedDate || "", // Add formattedDate from request body
                },
              },
            }
          );``

          console.log("New objectid added successfully.");
          // res.status(200).send("New objectid added successfully.");
        }


        // Save a BG in the InternalBgData if no other player has done it before (all the game's data) xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const existingInternalBg2 = await InternalBgData.findOne({ objectid }); // Check if objectid already exists in InternalBgData collection
        if (existingInternalBg2) {
          console.log(`Object with objectid ${objectid} already exists in the InternalBgData.`);
        } else {
          // Generate random order number
          const randomOrder = Math.floor(100000 + Math.random() * 900000);

          // Append day and hour to the random order number
          const orderNumber = randomOrder.toString() + day;
          
          // Create a new instance of the addinternalBgData model
          const addinternalBgData = new InternalBgData({
            order: orderNumber,
            name: name,
            objectid: objectid,
            thumbnail: thumbnail,
            yearPublished: yearPublished,
          });

          // Save the data to the MongoDB database
          await addinternalBgData.save();
        }
        res.sendStatus(204) // opreste bufferingul paginii - opreste loadingul paginii
        
      } catch (error) {
        res.status(500).send(error.message); // Send an error response if an error occurs
      }
    } else {
      console.log("submit_createRoom failed - No Room has been created / Nu s-a create niciun Room");
    }


  } catch (error) {
    console.log(error.message);
    res.status(500).send(error.message);
  }
}




const addPlayBGLoad = async(req, res) =>{
  try {
    const userData = await User.findById({ _id:req.session.user_id })
    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })
    
    const extractedGames = await InternalBgData.find({});

    const want2Play_bg = await UserPlus.findOne({ userLink: req.session.user_id });

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
    const notifications = identify_userPlus_notif.notification;


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

    if(want2Play_bg){
      res.render("userAccess/profile/bg_list/BgList-want2play", { 
        results: extractedGames, 
        user:userData, 
        userSession: userDataSession, 
        want2Play_bg: want2Play_bg,
        notifications,
        allPages_RoomNotif,
      });
    } else {
      res.render("userAccess/profile/bg_list/BgList-want2play", { 
        results: extractedGames, 
        user:userData, 
        userSession: userDataSession,
        notifications,
        allPages_RoomNotif,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.render('error', { error: 'An error occurred' });
  }
};

const addPlayBGUp = async(req, res) =>{
  try {
    simple_searchBg = req.body.simple_searchBg;
    searchBg = req.body.searchBg;
    // console.log("searchBg:" + searchBg)
    submit_createRoom = req.body.submit_createRoom;
    // console.log("submit_createRoom" + submit_createRoom)

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

    // This will upload the search so that it will render a new selection of games from the search 
    if (simple_searchBg) {
      try {
        const userData = await User.findById({ _id:req.session.user_id })

        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })


        const extractedGames = await InternalBgData.find({ name: { $regex: simple_searchBg, $options: 'i' } });
    
        const want2Play_bg = await UserPlus.findOne({ userLink: req.session.user_id });

        // Header Notifications
        const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
        const notifications = identify_userPlus_notif.notification;


        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

        if(want2Play_bg){
          res.render("userAccess/profile/bg_list/BgList-want2play", { 
            results: extractedGames, 
            user:userData, 
            userSession: userDataSession, 
            want2Play_bg: want2Play_bg,
            notifications,
            allPages_RoomNotif,
          });
        } else {
          res.render("userAccess/profile/bg_list/BgList-want2play", { 
            results: extractedGames, 
            user:userData, 
            userSession: userDataSession,
            notifications,
            allPages_RoomNotif
          });
        }

      } catch (error) {
        console.error('Error:', error);
        res.render('error', { error: 'An error occurred' });
      }
    } else {
      console.log("searchBg - No search has been done / Nu s-a facut niciun Search");
    }



    // This will upload the search so that it will render a new selection of games from the search 
    if (searchBg) {
      try {
        const userData = await User.findById({ _id:req.session.user_id })

        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })

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
                  const name = secondResult?.boardgames?.boardgame?.[0]?.name?.find((n) => n?.$.primary === 'true')?._ || 'N/A';
                  const objectid = secondResult?.boardgames?.boardgame?.[0]?.objectid || 'N/A';
    
                  
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
    
              const want2Play_bg = await UserPlus.findOne({ userLink: req.session.user_id });

              
              // Header Notifications
              const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
              const notifications = identify_userPlus_notif.notification;


              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

    
              if(want2Play_bg){
                res.render("userAccess/profile/bg_list/BgList-want2play", { 
                  results: extractedGames, 
                  user:userData, 
                  userSession: userDataSession, 
                  want2Play_bg: want2Play_bg,
                  notifications,
                  allPages_RoomNotif,
                });
              } else {
                res.render("userAccess/profile/bg_list/BgList-want2play", { 
                  results: extractedGames, 
                  user:userData, 
                  userSession: userDataSession,
                  notifications,
                  allPages_RoomNotif,
                });
              }
              
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
      console.log("searchBg - No search has been done / Nu s-a facut niciun Search");
    }




    if (submit_createRoom) {
      try {
        const userData = await User.findById({ _id: req.session.user_id });
        const userRooms = await Room.find({ user: req.session.user_id });

        // Use this to verify if it's the session user when accessing in EJS a link with an ID
        const userDataSession = await User.findById({ _id: req.session.user_id });

        // Extract data from the request
        const objectid = req.body.bg_id;
        const name = req.body.bg_name;
        const thumbnail = req.body.bg_thumbnail;
        const yearPublished = req.body.bg_yearPublished;

        const currentDate = new Date();// Get the current date
        const year = currentDate.getFullYear(); 
        const month = currentDate.getMonth() + 1; 
        const day = currentDate.getDate();
        // Create a formatted date string (e.g., "2023-12-31")
        const formattedDate = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;

        // Check if objectid is provided
        if (!objectid) {
          console.log('Objectid is required.');
          // Handle the case where objectid is missing, maybe send an error response
          return res.status(400).send('Objectid is required.');
        }



        // Save what bg the player is owning in the UserPlus (by adding the game's ID) xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const existingBg = await UserPlus.findOne({ 
          userLink: userData,
          "wantToPlay_boardgames_ID": { $elemMatch: { objectid: objectid } }, // Check if objectid already exists in PlayerBgData collection
        });
        if (existingBg) {
          // Object with the given objectid already exists
          console.log("Object with the given objectid already exists, in the UserPlus - owned_boardgames_ID");
        } else {
          // Object with the given objectid doesn't exist, append a new object
          await UserPlus.updateOne(
            { userLink: userData },
            {
              $push: {
                wantToPlay_boardgames_ID: {
                  objectid: objectid,
                  formattedDate: formattedDate || "", // Add formattedDate from request body
                },
              },
            }
          );

          console.log("New objectid added successfully.");
          // res.status(200).send("New objectid added successfully.");
        }


        // Save a BG in the InternalBgData if no other player has done it before (all the game's data) xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const existingInternalBg2 = await InternalBgData.findOne({ objectid }); // Check if objectid already exists in InternalBgData collection
        if (existingInternalBg2) {
          console.log(`Object with objectid ${objectid} already exists in the InternalBgData.`);
        } else {
          // Generate random order number
          const randomOrder = Math.floor(100000 + Math.random() * 900000);

          // Append day and hour to the random order number
          const orderNumber = randomOrder.toString() + day;

          // Create a new instance of the addinternalBgData model
          const addinternalBgData = new InternalBgData({
            order: orderNumber,
            name: name,
            objectid: objectid,
            thumbnail: thumbnail,
            yearPublished: yearPublished,
          });

          // Save the data to the MongoDB database
          await addinternalBgData.save();
        }
        res.sendStatus(204)
        
      } catch (error) {
        res.status(500).send(error.message); // Send an error response if an error occurs
      }
    } else {
      console.log("submit_createRoom failed - No Room has been created / Nu s-a create niciun Room");
    }


  } catch (error) {
    console.log(error.message);
    res.status(500).send(error.message);
  }
}




const addBuyBGLoad = async(req, res) =>{
  try {
    const userData = await User.findById({ _id:req.session.user_id })
    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })
    
    const extractedGames = await InternalBgData.find({});

    const buy_bg = await UserPlus.findOne({ userLink: req.session.user_id });

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
    const notifications = identify_userPlus_notif.notification;


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

    if(buy_bg){
      res.render("userAccess/profile/bg_list/BgList-buy", { 
        results: extractedGames, 
        user:userData, 
        userSession: userDataSession, 
        buy_bg: buy_bg,
        notifications,
        allPages_RoomNotif,
      });
    } else {
      res.render("userAccess/profile/bg_list/BgList-buy", { 
        results: extractedGames, 
        user:userData, 
        userSession: userDataSession,
        notifications,
        allPages_RoomNotif,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.render('error', { error: 'An error occurred' });
  }
};

const addBuyBGUp = async(req, res) =>{
  try {
    simple_searchBg = req.body.simple_searchBg;
    searchBg = req.body.searchBg;
    // console.log("searchBg:" + searchBg)
    submit_createRoom = req.body.submit_createRoom;
    // console.log("submit_createRoom" + submit_createRoom)

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


    // This will upload the search so that it will render a new selection of games from the search 
    if (simple_searchBg) {
      try {
        const userData = await User.findById({ _id:req.session.user_id })

        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })


        const extractedGames = await InternalBgData.find({ name: { $regex: simple_searchBg, $options: 'i' } });
    
        const buy_bg = await UserPlus.findOne({ userLink: req.session.user_id });

        
        // Header Notifications
        const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
        const notifications = identify_userPlus_notif.notification;



        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

        if(buy_bg){
          res.render("userAccess/profile/bg_list/BgList-buy", { 
            results: extractedGames, 
            user:userData, 
            userSession: userDataSession, 
            buy_bg: buy_bg,
            notifications,
            allPages_RoomNotif,
          });
        } else {
          res.render("userAccess/profile/bg_list/BgList-buy", { 
            results: extractedGames, 
            user:userData, 
            userSession: userDataSession,
            notifications,
            allPages_RoomNotif,
          });
        }

      } catch (error) {
        console.error('Error:', error);
        res.render('error', { error: 'An error occurred' });
      }
    } else {
      console.log("searchBg - No search has been done / Nu s-a facut niciun Search");
    }





    // This will upload the search so that it will render a new selection of games from the search 
    if (searchBg) {
      try {
        const userData = await User.findById({ _id:req.session.user_id })

        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })

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
                  const name = secondResult?.boardgames?.boardgame?.[0]?.name?.find((n) => n?.$.primary === 'true')?._ || 'N/A';
                  const objectid = secondResult?.boardgames?.boardgame?.[0]?.objectid || 'N/A';
    
                  
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
    
              const buy_bg = await UserPlus.findOne({ userLink: req.session.user_id });
    
              // Header Notifications
              const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
              const notifications = identify_userPlus_notif.notification;
    

              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

              if(buy_bg){
                res.render("userAccess/profile/bg_list/BgList-buy", { 
                  results: extractedGames, 
                  user:userData, 
                  userSession: userDataSession, 
                  buy_bg: buy_bg,
                  notifications,
                  allPages_RoomNotif,
                });
              } else {
                res.render("userAccess/profile/bg_list/BgList-buy", { 
                  results: extractedGames, 
                  user:userData, 
                  userSession: userDataSession,
                  notifications,
                  allPages_RoomNotif,
                });
              }
              
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
      console.log("searchBg - No search has been done / Nu s-a facut niciun Search");
    }




    if (submit_createRoom) {
      try {
        const userData = await User.findById({ _id: req.session.user_id });
        const userRooms = await Room.find({ user: req.session.user_id });

        // Use this to verify if it's the session user when accessing in EJS a link with an ID
        const userDataSession = await User.findById({ _id: req.session.user_id });

        // Extract data from the request
        const objectid = req.body.bg_id;
        const name = req.body.bg_name;
        const thumbnail = req.body.bg_thumbnail;
        const yearPublished = req.body.bg_yearPublished;

        const currentDate = new Date();// Get the current date
        const year = currentDate.getFullYear(); 
        const month = currentDate.getMonth() + 1; 
        const day = currentDate.getDate();
        // Create a formatted date string (e.g., "2023-12-31")
        const formattedDate = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;

        // Check if objectid is provided
        if (!objectid) {
          console.log('Objectid is required.');
          // Handle the case where objectid is missing, maybe send an error response
          return res.status(400).send('Objectid is required.');
        }



        // Save what bg the player is owning in the UserPlus (by adding the game's ID) xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const existingBg = await UserPlus.findOne({ 
          userLink: userData,
          "buy_boardgames_ID": { $elemMatch: { objectid: objectid } }, // Check if objectid already exists in PlayerBgData collection
        });
        if (existingBg) {
          // Object with the given objectid already exists
          console.log("Object with the given objectid already exists, in the UserPlus - buy_boardgames_ID");
        } else {
          // Object with the given objectid doesn't exist, append a new object
          await UserPlus.updateOne(
            { userLink: userData },
            {
              $push: {
                buy_boardgames_ID: {
                  objectid: objectid,
                  formattedDate: formattedDate || "", // Add formattedDate from request body
                },
              },
            }
          );

          console.log("New objectid added successfully.");
          // res.status(200).send("New objectid added successfully.");
        }


        // Save a BG in the InternalBgData if no other player has done it before (all the game's data) xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const existingInternalBg2 = await InternalBgData.findOne({ objectid }); // Check if objectid already exists in InternalBgData collection
        if (existingInternalBg2) {
          console.log(`Object with objectid ${objectid} already exists in the InternalBgData.`);
        } else {
          // Generate random order number
          const randomOrder = Math.floor(100000 + Math.random() * 900000);

          // Append day and hour to the random order number
          const orderNumber = randomOrder.toString() + day;

          // Create a new instance of the addinternalBgData model
          const addinternalBgData = new InternalBgData({
            order: orderNumber,
            name: name,
            objectid: objectid,
            thumbnail: thumbnail,
            yearPublished: yearPublished,
          });

          // Save the data to the MongoDB database
          await addinternalBgData.save();
        }
        res.sendStatus(204)
        
      } catch (error) {
        res.status(500).send(error.message); // Send an error response if an error occurs
      }
    } else {
      console.log("submit_createRoom failed - No Room has been created / Nu s-a create niciun Room");
    }


  } catch (error) {
    console.log(error.message);
    res.status(500).send(error.message);
  }
}




const addSellBGLoad = async(req, res) =>{
  try {
    const userData = await User.findById({ _id:req.session.user_id })
    // Use this to verify if it's the session user when accesing in EJS a link with an ID
    const userDataSession = await User.findById({ _id:req.session.user_id })
    
    const extractedGames = await InternalBgData.find({});

    const sell_bg = await UserPlus.findOne({ userLink: req.session.user_id });

    // Header Notifications
    const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
    const notifications = identify_userPlus_notif.notification;


    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

    if(sell_bg){
      res.render("userAccess/profile/bg_list/BgList-sell", { 
        results: extractedGames, 
        user:userData, 
        userSession: userDataSession, 
        sell_bg: sell_bg,
        notifications,
        allPages_RoomNotif,
      });
    } else {
      res.render("userAccess/profile/bg_list/BgList-sell", { 
        results: extractedGames, 
        user:userData, 
        userSession: userDataSession,
        notifications,
        allPages_RoomNotif,
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.render('error', { error: 'An error occurred' });
  }
};

const addSellBGUp = async(req, res) =>{
  try {
    simple_searchBg = req.body.simple_searchBg;
    searchBg = req.body.searchBg;
    // console.log("searchBg:" + searchBg)
    submit_createRoom = req.body.submit_createRoom;
    // console.log("submit_createRoom" + submit_createRoom)

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




    // This will upload the search so that it will render a new selection of games from the search 
    if (simple_searchBg) {
      try {
        const userData = await User.findById({ _id:req.session.user_id })

        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })


        const extractedGames = await InternalBgData.find({ name: { $regex: simple_searchBg, $options: 'i' } });
    
        const sell_bg = await UserPlus.findOne({ userLink: req.session.user_id });

        // Header Notifications
        const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
        const notifications = identify_userPlus_notif.notification;


        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

        if(sell_bg){
          res.render("userAccess/profile/bg_list/BgList-sell", { 
            results: extractedGames, 
            user:userData, 
            userSession: userDataSession, 
            sell_bg: sell_bg,
            notifications,
            allPages_RoomNotif,
          });
        } else {
          res.render("userAccess/profile/bg_list/BgList-sell", { 
            results: extractedGames, 
            user:userData, 
            userSession: userDataSession,
            notifications,
            allPages_RoomNotif,
          });
        }

      } catch (error) {
        console.error('Error:', error);
        res.render('error', { error: 'An error occurred' });
      }
    } else {
      console.log("searchBg - No search has been done / Nu s-a facut niciun Search");
    }



    // This will upload the search so that it will render a new selection of games from the search 
    if (searchBg) {
      try {
        const userData = await User.findById({ _id:req.session.user_id })

        // Use this to verify if it's the session user when accesing in EJS a link with an ID
        const userDataSession = await User.findById({ _id:req.session.user_id })

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
                  const name = secondResult?.boardgames?.boardgame?.[0]?.name?.find((n) => n?.$.primary === 'true')?._ || 'N/A';
                  const objectid = secondResult?.boardgames?.boardgame?.[0]?.objectid || 'N/A';
    
                  
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
    
              const sell_bg = await UserPlus.findOne({ userLink: req.session.user_id });
    
              // Header Notifications
              const identify_userPlus_notif = await UserPlus.findOne({ userLink: userDataSession })
              const notifications = identify_userPlus_notif.notification;


              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Header Notification - from Rooms xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              const allPages_RoomNotif = await Room.find({ joined_guest: { $in: [req.session.user_id] } });

              if(sell_bg){
                res.render("userAccess/profile/bg_list/BgList-sell", { 
                  results: extractedGames, 
                  user:userData, 
                  userSession: userDataSession, 
                  sell_bg: sell_bg,
                  notifications,
                  allPages_RoomNotif,
                });
              } else {
                res.render("userAccess/profile/bg_list/BgList-sell", { 
                  results: extractedGames, 
                  user:userData, 
                  userSession: userDataSession,
                  notifications,
                  allPages_RoomNotif,
                });
              }
              
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
      console.log("searchBg - No search has been done / Nu s-a facut niciun Search");
    }




    if (submit_createRoom) {
      try {
        const userData = await User.findById({ _id: req.session.user_id });
        const userRooms = await Room.find({ user: req.session.user_id });

        // Use this to verify if it's the session user when accessing in EJS a link with an ID
        const userDataSession = await User.findById({ _id: req.session.user_id });

        // Extract data from the request
        const objectid = req.body.bg_id;
        const name = req.body.bg_name;
        const thumbnail = req.body.bg_thumbnail;
        const yearPublished = req.body.bg_yearPublished;

        const currentDate = new Date();// Get the current date
        const year = currentDate.getFullYear(); 
        const month = currentDate.getMonth() + 1; 
        const day = currentDate.getDate();
        // Create a formatted date string (e.g., "2023-12-31")
        const formattedDate = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;

        // Check if objectid is provided
        if (!objectid) {
          console.log('Objectid is required.');
          // Handle the case where objectid is missing, maybe send an error response
          return res.status(400).send('Objectid is required.');
        }



        // Save what bg the player is owning in the UserPlus (by adding the game's ID) xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const existingBg = await UserPlus.findOne({ 
          userLink: userData,
          "sell_boardgames_ID": { $elemMatch: { objectid: objectid } }, // Check if objectid already exists in PlayerBgData collection
        });
        if (existingBg) {
          // Object with the given objectid already exists
          console.log("Object with the given objectid already exists, in the UserPlus - sell_boardgames_ID");
        } else {
          // Object with the given objectid doesn't exist, append a new object
          await UserPlus.updateOne(
            { userLink: userData },
            {
              $push: {
                sell_boardgames_ID: {
                  objectid: objectid,
                  formattedDate: formattedDate || "", // Add formattedDate from request body
                },
              },
            }
          );

          console.log("New objectid added successfully.");
          // res.status(200).send("New objectid added successfully.");
        }


        // Save a BG in the InternalBgData if no other player has done it before (all the game's data) xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        const existingInternalBg2 = await InternalBgData.findOne({ objectid }); // Check if objectid already exists in InternalBgData collection
        if (existingInternalBg2) {
          console.log(`Object with objectid ${objectid} already exists in the InternalBgData.`);
        } else {
          // Generate random order number
          const randomOrder = Math.floor(100000 + Math.random() * 900000);

          // Append day and hour to the random order number
          const orderNumber = randomOrder.toString() + day;

          // Create a new instance of the addinternalBgData model
          const addinternalBgData = new InternalBgData({
            order: orderNumber,
            name: name,
            objectid: objectid,
            thumbnail: thumbnail,
            yearPublished: yearPublished,
          });

          // Save the data to the MongoDB database
          await addinternalBgData.save();
        }
        res.sendStatus(204)
        
      } catch (error) {
        res.status(500).send(error.message); // Send an error response if an error occurs
      }
    } else {
      console.log("submit_createRoom failed - No Room has been created / Nu s-a create niciun Room");
    }


  } catch (error) {
    console.log(error.message);
    res.status(500).send(error.message);
  }
}







module.exports = {
  addOwnedBGLoad,
  addOwnedBGUp,
  addPlayBGLoad,
  addPlayBGUp,
  addBuyBGLoad,
  addBuyBGUp,
  addSellBGLoad,
  addSellBGUp,
}




