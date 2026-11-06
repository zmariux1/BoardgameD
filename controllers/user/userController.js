const moment = require("moment");
const User = require("../../models/userModel");
const UserPlus = require("../../models/userPlusDataModel");
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

const securePassword = async(password) =>{
  try {
    const passwordHash = await bcrypt.hash(password, 8);
    return passwordHash;
  } catch (error) {
    res.send(error.message);
  }
};

// // for send mail
const sendVerifyMail = async(yourName, email, token) =>{
  try{
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port:587,
      secure:false,
      requireTLS:true,
      auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification",
      html:`<p>hii `+yourName+`, click here to verify your email - <a href="http://localhost:5000/verify?id=`+user_id+`">Verify</a> </p>`
    }
    transporter.sendMail(mailOptions, function(error, info){
      if(error){
        console.log(error);
      } else {
        console.log("Email has been sent: - ", info.response);
      }
    })

  } catch (error) {
    console.log(error.message)
  }
}

// // for reset password
const sendResetPasswordMail = async(yourName, email, user_id) =>{
  try{
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port:587,
      secure:false,
      requireTLS:true,
      auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Password",
      html:`<p>hii `+yourName+`, click here to verify to - <a href="http://localhost:5000/forgot-password?token=`+token+`">Reset Password</a> </p>`
    }
    transporter.sendMail(mailOptions, function(error, info){
      if(error){
        console.log(error);
      } else {
        console.log("Email has been sent: - ", info.response);
      }
    })

  } catch (error) {
    console.log(error.message)
  }
}

const loadRegister = async (req, res) => {
  try {
    res.render("users/registration", { error: '' });
  } catch (error) {
    res.send(error.message);
  }
};


const insertUser = async (req, res) => {
  try {
    // Check if yourName already exists
    const existingEmail = await User.findOne({ email: req.body.email });
    const existingUser = await User.findOne({ yourName: req.body.yourName });
    if (existingUser) {
      // Render the form with an error message if the username already exists
      return res.render('users/registration', { error: 'This username already exists. <br> Try a different name' });
    }
    if (existingEmail) {
      // Render the form with an error message if the username already exists
      return res.render('users/registration', { error: 'This email already exists. <br> Try a different email' });
    }

    const phone_input = req.body.phone;
    const phone = String(phone_input);

    for (let i = 0; i < phone.length; i++) {
        if (isNaN(parseInt(phone[i]))) {
            // If the character is not a valid number, stop the controller with an error
            return res.status(400).json({ error: 'Invalid phone number format' });
        }
    }

    const currentDate = new Date();

    const spassword = await securePassword(req.body.password);
    const registerUser = new User({
      email: req.body.email,
      yourName: req.body.yourName,
      phone: phone,
      images:req.file.filename,
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
    // console.log(userPlusData)

    // generate a standard reputation field - xxxxxxxxxxxxxxxxx



    // res.send("S-a salvat ok userul " + result);
    if (userData) {

      sendVerifyMail(req.body.email, req.body.yourName, userData._id)
      res.render("users/login", {message:"Your registration has been succesfully completed. Please verify your email"})
    } else {
      res.render("users/registration", {message:"Your registration has been failed"})
    }
    
    res.render("users/registration"); // asta e fisierul register.ejs
  } catch (error) {
    res.send(error.message);
  }
};

// Verify & update the email confirmation into the database
const VerifyMail = async(req, res) =>{
  try {
    const updateInfo = await User.updateOne({_id:req.query.id},{$set:{ is_verified:1 } });
    // console.log(updateInfo);
    res.render("users/email-verified")

  } catch (error) {
    res.send(error.message);
  }
}

// login user methods started
const loginLoad = async(req, res) => {
  try{
    res.render("users/login")
  } catch(error) {
    console.log(error.message)
  }
}

// verify login
const verifyLogin = async(req, res) => {
  try{
    const email = req.body.email;
    const password = req.body.password;
    // check email
    const userData = await User.findOne({ email: email }) 
    
    if(userData) { // prepare check password based on the email check
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) { // prepare check password based matching password check 
        if (userData.is_verified === 0) { // check if user verified the email
          email = "";
          password = "";
          userData = "";
          passwordMatch = "";
          res.render("users/login", {message: "Please verify your email"});
        } else {
          req.session.user_id = userData._id;  
          const currentDate = new Date();
          
          res.redirect("/home") 
        }
      } else {
        res.render("users/login", {message: "Email or password is incorrect"})
      }

    } else {
      res.render("users/login", {message: "Email or password is incorrect"})
    }

  } catch(error) {
    console.log(error.message)
  }
}


const userLogout = async(req, res) =>{
  try {
    req.session.destroy();
    res.redirect("/");
  } catch(error) {
    console.log(error.message)
  }
}

const forgotLoad = async(req, res) =>{
  try {
    res.render("users/forgot");
  } catch(error) {
    console.log(error.message)
  }
}

const forgotVerify = async(req, res) =>{
  try {
    const email = req.body.email;
    const userData = await User.findOne({email:email});

    if (userData) {
      if(userData.is_verified === 0) {
        res.render("forgot", {message: "Please verify your email"})
      }else {
        const randomString = randomString.generate();
        // console.log(randomString)
        const updateData = await User.updateOne({email:email}, {$set:{token:randomString}});
        sendResetPasswordMail(userData.yourName, userData.email, randomString);
        res.render("users/forgot", {message: "Please check your email, to reset your password"});
      }
    } else {
      res.render("users/forgot", {message: "Email is incorrect"});
    }


  } catch(error) {
    console.log(error.message)
  }
}

const forgotPasswordLoad = async(req, res) =>{
  try {
    const token = req.query.token;
    const tokenData = await User.findOne({token:token});
    if (tokenData){
      res.render("users/forgot-password", {user_id: tokenData._id});
    }else {
      res.render("users/404", {message: "Token is invalid"});
    }
  } catch(error) {
    console.log(error.message)
  }
}

const resetPassword = async(req, res) =>{
  try {
    const password = req.body.password;
    const user_id = req.body.user_id.trim();

    const secure_password = await securePassword(password);
    const updatedData = await User.findByIdAndUpdate({ _id:user_id}, {$set: {password: secure_password, token: ""}})

    res.redirect("/")
  } catch(error) {
    console.log(error.message)
  }
}






module.exports = {
  loadRegister, // astea se duc in index. modifica si acolo
  insertUser,
  VerifyMail,
  loginLoad,
  verifyLogin,
  userLogout,
  forgotLoad,
  forgotVerify,
  sendResetPasswordMail,
  forgotPasswordLoad,
  resetPassword,
}

// fin


