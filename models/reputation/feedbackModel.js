const mongoose = require('mongoose');



const FeedbackSchema = new mongoose.Schema({
  Vibe: {
    '1 obligation': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '1 bore': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '2 frequently-triggered': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '3 sad (2)': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '4 hyperactivity': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '5 grandiosity': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '6 boastful': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '7 controlling (2)': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '8 pushy-kindness': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '9 too serious': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '3 speech-bubble': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: '' } },
  },
  Environment: {
    '1 light-spotlight': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '2 light-dark (2)': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '3 loud-speaker': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '4 innapropiate-music': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '6 bad-animals': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '7 distracting-animals': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '2 smoke': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: '' } },
    'too cold ': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
  },
  Discrimination: {
    '1 discrimination': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '2 genders': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '3 sexual-discrimination': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '4 racist': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '5 Body-shaming': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '6 bullying': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: '' } },
  },
  Hygiene: {
    '1 aroma': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '3 dirt': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '4 hand-washing': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    '7 haircut': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Feedback", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
  }
});

const Feedback = mongoose.model('Feedback', FeedbackSchema);

module.exports = Feedback;
