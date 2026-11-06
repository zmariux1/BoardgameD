const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  userID: { type: mongoose.Schema.Types.ObjectId },
  name: { type: String },
  message: { type: String },
  date: { type: String },
  time: { type: String},
}, { _id: false }); 

const votingSchema = new mongoose.Schema({
  userSessionID: { type: mongoose.Schema.Types.ObjectId },
  votingCategory: { type: String },
  newValue: { type: String },
  seenBy_ID: { type: Array }, 
  votedBy_ID: { type: Array }, 
  voting_date: { type: String },
}); 

// asta {} arata cine primeste notificare si unde vede notificarea
// 1 item per set - trebuie prevenit duplicatul per participantID
// Userul care creaza votul, nu trebuie sa primeeasca!
const seenBySchema = new mongoose.Schema({ 
  participantID: { type: mongoose.Schema.Types.ObjectId, required: true },
  theActualNotifItem: { type: String, default: '' },
  bell: { type: String, default: 'new' },
  navBar: { type: String, default: 'failed' },
  indexInviteBox: { type: String, default: 'failed' },
}); 


const userRoomSchema = new mongoose.Schema({ //fara new,  new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  theBoardgames_id: { type: Array, required: true },
  theBoardgames_name: { type: Array, required: true },
  selectedDate: { type: String, required: true },
  selectedTime: { type: String, required: true },
  location: { type: String, default: 'My Place' },
  numberOfInvites: { type: String, required: true },
  joined_guest: { type: Array, required: false },
  banned_players: { type: Array, required: false },
  creationDate: { type: Date, default: Date.now },
  chat: { type: [ChatSchema], required: false },
  onlineUser: { type: Array, required: false },
  votes: { type: [votingSchema], required: false },
  notification: [
    {
      type: { type: String, default: "" },
      reason: { type: String, default: "" },
      submittedBy: { type: mongoose.Schema.Types.ObjectId }, // the options WILL be: admin, user_id
      from_place: { type: String, default: "" }, // options COULD be: room_id, admin_System_response, admin_System_
      from_feature: { type: String, default: "" }, // the options WILL be: chat, date, location, proposed_boardgame
      formattedDate: { type: String, default: "" },
      fullTiming_seen_30Sec_time: { type: Date, default: Date.now },
      notificationStatus: { type: [seenBySchema], required: false },
    }
  ],
}); 

// aici cred ca pot sa mai adaug: locatia, special invite


module.exports = mongoose.model('UserRoom', userRoomSchema);

