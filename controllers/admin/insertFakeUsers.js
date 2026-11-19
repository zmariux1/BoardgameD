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

// const config = require("../config/config");

const randomString = require("randomstring");


const securePassword = async(password) =>{
  try {
    const passwordHash = await bcrypt.hash(password, 8);
    return passwordHash;
  } catch (error) {
    res.send(error.message);
  }
};

const fakeUserUp = async (req, res) => {
  try {
    const fakeUsersGroup = ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8", "z9", "z10", "z11", "z12", ]
    for (const data of fakeUsersGroup) {
      const yourNameInput = data;
      const buildUpEmail = yourNameInput + "@test.com";
      const filenameimg = yourNameInput + ".png";
      const phone = "1234567890";


      const currentDate = new Date();

      const spassword = await securePassword("1111");
      const registerUser = new User({
        email: buildUpEmail,
        yourName: yourNameInput,
        phone: phone,
        images: filenameimg,
        password: spassword,
        is_admin: 0,
        is_verified: 1,
        firstName: "",
        lastName: "",
      });
      const userData = await registerUser.save();

      // create UserPlus Empty Data
      // Create an instance of the UserPlus model with empty data

      const createUserPlusData = new UserPlus({
        userLink: userData._id,
        friends: [], // Initialize friends as an empty array


        owned_boardgames_ID: [
          {
            objectid: "", // Empty initial value
            formattedDate: "", // Empty initial value
          }
        ],
        // owned_boardgames_nume: [],
        wantToPlay_boardgames_ID: [
          {
            objectid: "", // Empty initial value
            formattedDate: "", // Empty initial value
          }
        ],
        // played_boardgames_nume: [],
        sell_boardgames_ID: [
          {
            objectid: "", // Empty initial value
            formattedDate: "", // Empty initial value
          }
        ],
        // sold_boardgames_nume: [],
        buy_boardgames_ID: [
          {
            objectid: "", // Empty initial value
            formattedDate: "", // Empty initial value
          }
        ],

        bg_id: [],
        // buy_boardgames_nume: [],

        date_user_agreed_term_policy_cookies: currentDate,
      });

      // Save the newly created UserPlus data - xxxxxxxxxxxxxxxx
      const userPlusData = await createUserPlusData.save();
    }



    res.sendStatus(204); // asta e fisierul register.ejs
  } catch (error) {
    res.send(error.message);
  }
};



module.exports = {
  fakeUserUp,
}




