const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({ //fara new,  new mongoose.Schema({
  userId: { type: String, required: true },
  typeOfFeedback: { type: String },
  date: { type: String, required: true },
  description: { type: String, required: true },

}); 



module.exports = mongoose.model('FeedbackUs', feedbackSchema);