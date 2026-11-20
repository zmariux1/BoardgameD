const mongoose = require('mongoose');

const ReputationSchema = new mongoose.Schema({
  type: { type: String, default: '' },
  category: { type: String, default: '' },
  report_title: { type: String, default: '' },
  displayName: { type: String, default: '' },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  editableOrder: { type: String, default: '' },
  permanentReputationNumber: { type: String, default: '' }, // asta nu trebuie sters niciodata. 
  // permanentReputationNumber e codul pe care il primesc playerii ca punct de referinta la reputatia primita
});

const Reputation = mongoose.model('Reputation', ReputationSchema);

module.exports = Reputation;

