const mongoose = require('mongoose');

const HonorSchema = new mongoose.Schema({
  Environment: {
    'welcome': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    'clean-house': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "warm": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "cozy-place": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "heart": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "music2": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "manyBg": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "friendlyEnv": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "yin-yang": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "positivity": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "dog": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "0", report_title: "", displayName:"", name: "", description: ''} },
    "cat": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
  },
  "Food & Drinks": {
    'candies': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    'ice-cream': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    'pizza-box': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    'popcorn': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    'lemonade': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    'coffee-cups': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    'coconut': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
  },
  "Gaming Style": {
    "Offence Style": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "Shield": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "Chance gameplay": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "strategy gameplay": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "Strong Resource Management": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "Card Games": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "good Teacher": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "handshake": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
  },
  Personality: {
    "chat": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "optimism": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "couple": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "passion": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "passion2": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "mind": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "innovation": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "think-out-of-the-box": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "fun": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "motivation": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "music": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
  },
  "Good manners": {
    "discussion": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "discussion (1)": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "clock": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "energy-bar": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "mediator": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "mortarboard": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
    "payment": { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Good", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: "", description: ''} },
  }
});

const Honor = mongoose.model('Honor', HonorSchema);

module.exports = Honor;

