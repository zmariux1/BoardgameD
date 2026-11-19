const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({ //fara new,  new mongoose.Schema({
  email: { type: String, required: true },
  yourName: { type: String, required: true },
  images: { type: String, required: true },
  phone:{ type: String, require: true },
  password: { type: String, required: true },

  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },

  termsAndConditions_VersionID:{ type: String, require: true },
  is_admin:{ type: Number, require: true },
  is_verified:{ type: Number, default: 0 },
  token: { type: String, default: "" },
}); 



module.exports = mongoose.model('User', userSchema);