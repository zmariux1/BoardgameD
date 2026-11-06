const mongoose = require('mongoose');

const userRoomSchema = new mongoose.Schema({ //fara new,  new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  theBoardgames_id: { type: Array, required: true },
  theBoardgames_name: { type: Array, required: true },
  selectedDate: { type: String, required: true },
  selectedTime: { type: String, required: true },
  numberOfInvites: { type: String, required: true },
  joined_guest: { type: Array, required: false },
  creationDate: { type: Date, default: Date.now }
}); 

// aici cred ca pot sa mai adaug: locatia, special invite


module.exports = mongoose.model('PreCreateRoom', userRoomSchema);

