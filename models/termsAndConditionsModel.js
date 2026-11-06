const mongoose = require('mongoose');

const termsAndConditionsSchema = new mongoose.Schema({
  // The ID will declare the last version 
  category: { type: String},
  items: [{
    condition_title: { type: String,},
    condition_content: [{
      type: String
    }]
  }],

  agreed_users: [{
    userID: { type: String,},
    Date: { type: String,},
  }],
});

module.exports = mongoose.model('TermsAndConditions', termsAndConditionsSchema);
