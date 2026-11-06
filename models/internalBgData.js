const mongoose = require('mongoose');

const internalBoardgamePopulationDataSchema = new mongoose.Schema({
  order: { type: Number, required: true }, 
  name: { type: String, default: 'N/A' },
  objectid: { type: Number, required: true }, // Assuming objectIdImport is a required field
  thumbnail: { type: String, default: 'N/A' }, // Assuming thumbnail is a string
  yearPublished: { type: String, default: 'N/A' }, // Assuming yearPublished is a string




//   minplayers: { type: Number, default: undefined },
//   maxplayers: { type: Number, default: undefined },

//   playingtime: { type: Number, default: undefined },
//   minplaytime: { type: Number, default: undefined },
//   maxplaytime: { type: Number, default: undefined },

//   age: { type: Number, default: undefined },

//   description: { type: String, default: "" },

//   boardgameartist: { type: String, default: "" },
//   boardgamepublisher: { type: String, default: "" },

//   boardgamecategory: { type: String, default: "" },
//   boardgamesubdomain: { type: String, default: "" },
});

module.exports = mongoose.model('InternalBg_Display', internalBoardgamePopulationDataSchema);
