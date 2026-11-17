const mongoose = require('mongoose');


const StainSchema = new mongoose.Schema({
  Security: {
    '1 phisical aggesion -wounded': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    '2 Verbal abuze': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    '3 stolen money': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    '4 property damage': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    '5 police-hat': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
  },
  "Playing style": {
    'Agresive playing style': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    'doing something else - chat': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    'No mistakes allowed': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    'tention generator': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
  },
  Personality: {
    '1 unconfurtable discussions': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    '5 condescending': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    '6 angry': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    '7 complaining': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    '8 drunk': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
  },
  "Good Manners": {
    'repetitive late': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    '404-error': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    'money for sharing food 2': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
  },
  Environment: {
    'infectious': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    'smell': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
  },
  Display: {
    'signature': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
    'warning picture': { type: mongoose.Schema.Types.Mixed, default: { val: 0, type: "Bad", editableOrder: "", permanentReputationNumber: "", report_title: "", displayName:"", name: '', description: ''} },
  },
});

const Stain = mongoose.model('Stain', StainSchema);

module.exports = Stain;
