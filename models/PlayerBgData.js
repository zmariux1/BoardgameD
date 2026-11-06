const mongoose = require('mongoose');

const playerBgDataSchema = new mongoose.Schema({
  // Legătură cu colecția 'users'
  userLink: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  objectid: { type: Number, required: true },
  formattedDate: {  },
});

const PlayerBgData = mongoose.model('PlayerBg', playerBgDataSchema);

module.exports = PlayerBgData;


// this is meant to store BGs to save some time, to no longer search the bg g server