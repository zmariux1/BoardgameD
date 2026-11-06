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




// terms
const terms = async(req, res) =>{
  try {
    
    res.render("users/termsAndConditions"); 
  } catch(error) {
    console.log(error.message)
  }
}

// Legal - xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 
const community_guidelinesLoad = async(req, res) =>{
  try {
    
    res.render("users/legal/community_guidelines"); 
  } catch(error) {
    console.log(error.message)
  }
}

const contactLoad = async(req, res) =>{
  try {
    
    res.render("users/legal/contact"); 
  } catch(error) {
    console.log(error.message)
  }
}

const cookie_policyLoad = async(req, res) =>{
  try {
    
    res.render("users/legal/cookie_policy"); 
  } catch(error) {
    console.log(error.message)
  }
}

const privacy_policyLoad = async(req, res) =>{
  try {
    
    res.render("users/legal/privacy_policy"); 
  } catch(error) {
    console.log(error.message)
  }
}

const safety_and_policy_centerLoad = async(req, res) =>{
  try {
    
    res.render("users/legal/safety_and_policy_center"); 
  } catch(error) {
    console.log(error.message)
  }
}

const safety_tipsLoad = async(req, res) =>{
  try {
    
    res.render("users/legal/safety_tips"); 
  } catch(error) {
    console.log(error.message)
  }
}

const termsLoad = async(req, res) =>{
  try {
    
    res.render("users/legal/terms"); 
  } catch(error) {
    console.log(error.message)
  }
}

const summary_of_termsLoad = async(req, res) =>{
  try {
    
    res.render("users/legal/summary_of_terms"); 
  } catch(error) {
    console.log(error.message)
  }
}








module.exports = {
  terms,
  community_guidelinesLoad,
  contactLoad,
  cookie_policyLoad,
  privacy_policyLoad,
  safety_and_policy_centerLoad,
  safety_tipsLoad,
  termsLoad,
  summary_of_termsLoad,
}




