const { Timestamp } = require('mongodb');
const mongoose = require('mongoose');
const currentDate = new Date();

const userPlusDataSchema = new mongoose.Schema({
  // Legătură cu colecția 'users'
  userLink: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },

  // Arrays de _id-uri și nume pentru diferite categorii de boardgames
  // friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 

  allReputation: [
    {
      get_permanentReputationNumber: { type: String, default: '' }, // odata ce primesti codul, va fi afisat mereu pe profil, daca are suficiente voturi
      displayRep: { type: String, default: 'yes' }, // asta e pentru cand decide userul ca vrea ca sa apara reputatia in avatar
      reportedBy: [ // aici pot sa fac un counting lenght of items, ca sa verifice daca poate sa faca display
        { 
          reportedBy_userID: { type: String, default: '' },
          whichRoom: { type: String, default: '' },
          formattedDate: { type: String, default: '' }, 
        }
      ]
    }
  ],

  owned_boardgames_ID: [
    {
      objectid: { type: String, default: "" },
      formattedDate: { type: String, default: "" },
    }
  ],

  wantToPlay_boardgames_ID: [
    {
      objectid: { type: String, default: "" },
      formattedDate: { type: String, default: "" },
    }
  ],

  sell_boardgames_ID: [
    {
      objectid: { type: String, default: "" },
      formattedDate: { type: String, default: "" },
    }
  ],

  buy_boardgames_ID: [
    {
      objectid: { type: String, default: "" },
      formattedDate: { type: String, default: "" },
    }
  ],

  bg_id: [{ type: String }],

  bg_name: [{ type: String }],

  notification: [
    {
      type: { type: String, default: "" },
      reason: { type: String, default: "" },
      submittedBy: { type: String, default: "" }, // the options WILL be: admin, user_id
      from_place: { type: String, default: "" }, // opctions COULD be: room_id, admin_System_response, admin_System_
      from_feature: { type: String, default: "" }, // the options WILL be: chat, date, location, proposed_boardgame
      formattedDate: { type: String, default: "" },
      fullTiming_seen_30Sec_time: { type: Date, default: Date.now },
      notificationStatus: {
        type: [String], // This specifies an array of strings
        default: ["new"],    // Default value if not provided
      },
    }
  ],

  date_user_agreed_term_policy_cookies: { type: String, default: currentDate },

});

module.exports = mongoose.model('UserPlus', userPlusDataSchema);
