const moment = require("moment");
const User = require("../../models/userModel");
const UserPlus = require("../../models/userPlusDataModel");
const Reputation = require("../../models/ReputationModel");
const Honor = require("../../models/reputation/honerModel");
const Stain = require("../../models/reputation/stainModel");
const Feedback = require("../../models/reputation/feedbackModel");
const FeedbackUs = require("../../models/FeedbackUsModel");

const PreCreateRoom = require("../../models/transitionToRoom");
const Room = require("../../models/userRoomModel");

const InternalBgData = require("../../models/internalBgData");
const TermsAndConditions = require('../../models/termsAndConditionsModel');
const bcrypt = require("bcrypt");
const axios = require('axios');
const { parseString } = require('xml2js'); 
const dotenv = require("dotenv").config();

const nodemailer = require("nodemailer");

// const config = require("../config/config");

const randomString = require("randomstring");


// generate/UP the core of all the reputation details, from which the users to tap into to get the reputation details 
const reputationDetailsUp = async (req, res) => {
  try {


    let newHonor = {
      Environment: {
        'welcome': { val: 0, type: "Good", fileCateg: "Environment", editableOrder: "g1e0", permanentReputationNumber: "ge0", report_title: "Welcome to the Hive Community", displayName:"Welcome to the Hive", name: 'welcome.png', description: 'This person is part of the Hive Community'},
        'clean-house': { val: 0, type: "Good", fileCateg: "Environment", editableOrder: "g1e1", permanentReputationNumber: "ge1", report_title: "Clean House", displayName:"Clean House", name: 'clean-house.png', description: 'Has a clean home/place'},
        'warm': { val: 0, type: "Good", fileCateg: "Environment", editableOrder: "g1e2", permanentReputationNumber: "ge2", report_title: "Perfect temperature", displayName:"Perfect temperature", name: 'goodTemp.png', description: 'Has a warm home/place'},
        'cozy-place': { val: 0, type: "Good", fileCateg: "Environment", editableOrder: "g1e3", permanentReputationNumber: "ge3", report_title: "Cozy House", displayName:"Cozy Place", name: 'sleeping.png', description: 'Has a cozy home/place' },
        'heart': { val: 0, type: "Good", fileCateg: "Environment", editableOrder: "g1e4", permanentReputationNumber: "ge4", report_title: "Open-minded - Diversity", displayName:"Diversity", name: 'heart.png', description: 'Accepts people however they are, in all their diversity'},
        'music2': { val: 0, type: "Good", fileCateg: "Environment", editableOrder: "g1e5", permanentReputationNumber: "ge5", report_title: "Best Environment Music", displayName:"Best Music", name: 'music2.png', description: 'The music was fitting the games and the moment'},
        'manyBg': { val: 0, type: "Good", fileCateg: "Environment", editableOrder: "g1e6", permanentReputationNumber: "ge6", report_title: "Lots of Games", displayName:"Lots of Games", name: 'manyBg.png', description: 'Has a lot of games or a good variaty'},
        'friendlyEnv': { val: 0, type: "Good", fileCateg: "Environment", editableOrder: "g1e7", permanentReputationNumber: "ge7", report_title: "Friendly Environment Vibes", displayName:"Friendly Environment", name: 'friendlyEnv.png', description: 'Friendly Environment Vibes'},
        'yin-yang': { val: 0, type: "Good", fileCateg: "Environment", editableOrder: "g1e8", permanentReputationNumber: "ge8", report_title: "Peaceful Environment Vibes", displayName:"Peaceful Environment", name: 'yin-yang.png', description: 'Peaceful Environment Vibes'},
        'positivity': { val: 0, type: "Good", fileCateg: "Environment", editableOrder: "g1e9", permanentReputationNumber: "ge9", report_title: "Has nice friends", displayName:"Nice Friends", name: 'positivity.png', description: 'Has nice friends' },
        'dog': { val: 0,  type: "Good", fileCateg: "Environment", editableOrder: "g1e10", permanentReputationNumber: "ge10", report_title: "Has a Dog", displayName:"Has a Dog", name: 'dog.png', description: 'Has a dog'},
        'cat': { val: 0,  type: "Good", fileCateg: "Environment", editableOrder: "g1e11", permanentReputationNumber: "ge11", report_title: "Has a Cat", displayName:"Has a Cat", name: 'fox.png', description: 'Has a cat'},
      },
      "Food & Drinks": {
        'candies': { val: 0, type: "Good", fileCateg: "Food & Drinks", editableOrder: "g2f1", permanentReputationNumber: "gf1", report_title: "Sweet things to eat", displayName:"Likes Sweets", name: 'candies.png', description: 'This person usually enjoys to bring Sweet Things to eat'},
        'ice-cream': { val: 0, type: "Good", fileCateg: "Food & Drinks", editableOrder: "g2f2", permanentReputationNumber: "gf2", report_title: "Likes to bring ice-cream", displayName:"Likes Ice-cream", name: 'ice-cream.png', description: 'This person usually enjoys to bring ice-cream'},
        'pizza-box': { val: 0, type: "Good", fileCateg: "Food & Drinks", editableOrder: "g2f3", permanentReputationNumber: "gf3", report_title: "Likes to Order Pizza", displayName:"Likes Pizza", name: 'pizza-box.png', description: 'This person usually enjoys to order pizza'},
        'popcorn': { val: 0, type: "Good", fileCateg: "Food & Drinks", editableOrder: "g2f4", permanentReputationNumber: "gf4", report_title: "Likes to make Popcorn", displayName:"Likes Popcorn", name: 'popcorn.png', description: 'This person usually enjoys to make popcorn'},
        'lemonade': { val: 0, type: "Good", fileCateg: "Food & Drinks", editableOrder: "g2f5", permanentReputationNumber: "gf5", report_title: "Likes to make Lemonade", displayName:"Likes Lemonade", name: 'lemonade.png', description: 'This person usually enjoys to make lemonade '},
        'coffee-cups': { val: 0, type: "Good", fileCateg: "Food & Drinks", editableOrder: "g2f6", permanentReputationNumber: "gf6", report_title: "Likes to make Coffee", displayName:"Likes Coffee", name: 'coffee-cups.png', description: 'This person usually enjoys to make coffee'},
        'coconut': { val: 0, type: "Good", fileCateg: "Food & Drinks", editableOrder: "g2f7", permanentReputationNumber: "gf7", report_title: "Cocktails", displayName:"Likes Cocktails", name: 'coconut.png', description: 'This person usually enjoys to make cocktails'},
      },
      "Gaming Style": {
        'Offence Style': { val: 0, type: "Good", fileCateg: "Gaming Style", editableOrder: "g3g1", permanentReputationNumber: "gg1", report_title: "Good Offence Game Style", displayName:"Offence Game Style", name: 'Attack_Strategy.png', description: 'This person has a Good Offence Games Style'},
        'Shield': { val: 0, type: "Good", fileCateg: "Gaming Style", editableOrder: "g3g2", permanentReputationNumber: "gg2", report_title: "Good Defense Game Style", displayName:"Defense Game Style", name: 'Shield.png', description: 'This person has a Good Defense Games Style' },
        'Chance gameplay': { val: 0, type: "Good", fileCateg: "Gaming Style", editableOrder: "g3g3", permanentReputationNumber: "gg3", report_title: "Prefers games with high change game style", displayName:"Prefers Luck-based Games", name: 'dice.png', description: 'This person prefers games with high change games style' },
        'strategy gameplay': { val: 0, type: "Good", fileCateg: "Gaming Style", editableOrder: "g3g4", permanentReputationNumber: "gg4", report_title: "Prefers games with more control/strategy game style", displayName:"Prefers Strategy Games", name: 'strategy.png', description: 'This person enjoys to play Strategic Games' },
        'Strong Resource Management': { val: 0, type: "Good", fileCateg: "Gaming Style", editableOrder: "g3g5", permanentReputationNumber: "gg5", report_title: "Prefers games with more Resource Management game style", displayName:"Prefers Resource Management game", name: 'Strong_Resource_Management.png', description: 'This person enjoys to play Strong Resource Management games' },
        'Card Games': { val: 0, type: "Good", fileCateg: "Gaming Style", editableOrder: "g3g6", permanentReputationNumber: "gg6", report_title: "Prefers Card Games", displayName:"Prefers Card Games", name: 'Card_Games.png', description: 'This person enjoys to play Card Games' },
        'good Teacher': { val: 0, type: "Good", fileCateg: "Gaming Style", editableOrder: "g3g7", permanentReputationNumber: "gg7", report_title: "Explains well the games", displayName:"Explains well the games", name: 'good_Teacher.png', description: 'This person explains well the games' },
        'handshake': { val: 0, type: "Good", fileCateg: "Gaming Style", editableOrder: "g3g8", permanentReputationNumber: "gg8", report_title: "Prefers co-operative games style", displayName:"Prefers co-operative games", name: 'handshake.png', description: 'It easy to agree with This person on what games to play' },
      },
      Personality: {
        'chat': { val: 0, type: "Good", fileCateg: "Personality", editableOrder: "g4p1", permanentReputationNumber: "gp1", report_title: "Active communication skills", displayName:"Communicates well", name: 'chat.png', description: 'Is easy to communicate with' },
        'optimism': { val: 0, type: "Good", fileCateg: "Personality", editableOrder: "g4p2", permanentReputationNumber: "gp2", report_title: "Easy to become friends with", displayName:"Open to friendships", name: 'optimism.png', description: "It's easy to become friends with" },
        'couple': { val: 0, type: "Good", fileCateg: "Personality", editableOrder: "g4p3", permanentReputationNumber: "gp3", report_title: "Has a lovely partner", displayName:"Has a lovely partner", name: 'couple.png', description: 'Enjoys to play the games with his/her lovely partner' },
        'passion': { val: 0, type: "Good", fileCateg: "Personality", editableOrder: "g4p4", permanentReputationNumber: "gp4", report_title: "This person is nice and kind", displayName:"Nice Person", name: 'passion.png', description: 'This person is a nice person' },
        'passion2': { val: 0, type: "Good", fileCateg: "Personality", editableOrder: "g4p5", permanentReputationNumber: "gp5", report_title: "Plays with passion", displayName:"Plays with Passion", name: 'passion2.png', description: 'This person is putting passion into the games' },
        'mind': { val: 0, type: "Good", fileCateg: "Personality", editableOrder: "g4p6", permanentReputationNumber: "gp6", report_title: "Is a Zen Vibe person", displayName:"Zen Vibe Person", name: 'mind.png', description: 'This person is giving Zen Vibe' },
        'innovation': { val: 0, type: "Good", fileCateg: "Personality", editableOrder: "g4p7", permanentReputationNumber: "gp7", report_title: "Is a smart person", displayName:"Smart Person", name: 'innovation.png', description: 'This person is very smart' },
        'think-out-of-the-box': { val: 0, type: "Good", fileCateg: "Personality", editableOrder: "g4p8", permanentReputationNumber: "gp8", report_title: "Has an out-of-the-box logic", displayName:"Out-of-the-box Logic", name: 'think-out-of-the-box.png', description: 'This person has an out-of-the-box logic' },
        'fun': { val: 0, type: "Good", fileCateg: "Personality", editableOrder: "g4p9", permanentReputationNumber: "gp9", report_title: "Is a festive person", displayName:"A Festive Person", name: 'fun.png', description: 'This person is a festive person' },
        'motivation': { val: 0, type: "Good", fileCateg: "Personality", editableOrder: "g4p10", permanentReputationNumber: "gp10", report_title: "Has a lot of energy", displayName:"Has a lot of energy", name: 'motivation.png', description: 'This person has a lot of energy ' },
        'music': { val: 0, type: "Good", fileCateg: "Personality", editableOrder: "g4p11", permanentReputationNumber: "gp11", report_title: "Enjoys a particular music", displayName:"Enjoys a particular music", name: 'music.png', description: 'This person is enjoys a particular music'},
      },
      "Good manners": {
        'discussion': { val: 0, type: "Good", fileCateg: "Good manners", editableOrder: "g5m1", permanentReputationNumber: "gm1", report_title: "Easy to agree with on what games to play", displayName:"Easy to decide with", name: 'discussion.png', description: 'It is easy to agree with on what games to play' },
        'discussion (1)': { val: 0, type: "Good", fileCateg: "Good manners", editableOrder: "g5m2", permanentReputationNumber: "gm2", report_title: "Has organized the meeting well", displayName:"Great Planner", name: 'planner.png', description: 'Has organized the meeting well' },
        'clock': { val: 0, type: "Good", fileCateg: "Good manners", editableOrder: "g5m3", permanentReputationNumber: "gm3", report_title: "The person has arrived on time", displayName:"Arrives on time", name: 'clock.png', description: 'This person respects other people time and has arrived on time' },
        'energy-bar': { val: 0, type: "Good", fileCateg: "Good manners", editableOrder: "g5m4", permanentReputationNumber: "gm4", report_title: "Has adjusted his/her energy level to fit the other people as well", displayName:"Self Energy Control", name: 'energy-bar.png', description: 'something' },
        'mediator': { val: 0, type: "Good", fileCateg: "Good manners", editableOrder: "g5m5", permanentReputationNumber: "gm5", report_title: "Knows how to behave with other people", displayName:"Adjusted energy level", name: 'mediator.png', description: 'This person knows how to behave with other people' },
        'mortarboard': { val: 0, type: "Good", fileCateg: "Good manners", editableOrder: "g5m6", permanentReputationNumber: "gm6", report_title: "Respects other people thoughts", displayName:"Respects people thoughts", name: 'mortarboard.png', description: 'Respects other people thoughts' },
        'payment': { val: 0, type: "Good", fileCateg: "Good manners", editableOrder: "g5m7", permanentReputationNumber: "gm7", report_title: "He/she paid back after they ordered food/snacks from somebody's account", displayName:"Paid the order", name: 'payment.png', description: "He/she paid back after they ordered food/snacks from somebody's account"},
      }
    };
    try {
      const doc = await Honor.findOneAndUpdate({}, newHonor, { upsert: true, new: true });
      console.log(doc);
    } catch (err) {
      console.log("Something wrong when updating Honor data!", err);
    }



    // stain reputation
    let newStain = {
      Security: {
        '1 phisical aggesion -wounded': { val: 0, type: "Bad", fileCateg: "Security", editableOrder: "b1s1", permanentReputationNumber: "bs1", report_title: "This person has Physically Aggressed somebody from the invite", displayName:"Physical Aggression", name: '1_phisical_aggesion-wounded.png', description: 'This person has Physically Aggressed somebody from the invite' },
        '2 Verbal abuze': { val: 0, type: "Bad", fileCateg: "Security", editableOrder: "b1s2", permanentReputationNumber: "bs2", report_title: "This person has Verbally Aggressed somebody from the group who played with", displayName:"Verbal Aggression", name: '2_Verbal_abuze.png', description: 'This person has Verbally Aggressed somebody from the invite' },
        '3 stolen money': { val: 0, type: "Bad", fileCateg: "Security", editableOrder: "b1s3", permanentReputationNumber: "bs3", report_title: "This person has Stolen Money from somebody", displayName:"Stole Money", name: '3_stolen_money.png', description: 'This person has Stolen Money from somebody' },
        '4 property damage': { val: 0, type: "Bad", fileCateg: "Security", editableOrder: "b1s4", permanentReputationNumber: "bs4", report_title: "This person has caused Property Damage during the game", displayName:"Property Damage", name: '4_property_damage.png', description: 'This person has caused Property Damage during the game' },
        '5 police-hat': { val: 0, type: "Bad", fileCateg: "Security", editableOrder: "b1s5", permanentReputationNumber: "bs5", report_title: "This person has displayed inappropriate behavior related to Law Enforcement during the game", displayName:"Law Enforcement Involved", name: '5_police-hat.png', description: 'This person has displayed inappropriate behavior related to Law Enforcement during the game'},
      },
      "Playing style": {
        'Agresive playing style': { val: 0, type: "Bad", fileCateg: "Playing style", editableOrder: "b2y1", permanentReputationNumber: "by1", report_title: "This person exhibited an Aggressive Playing Style", displayName:"Aggressive Playing Style", name: 'Agresive_playing_style.png', description: 'This person exhibited an Aggressive Playing Style' },
        'doing something else - chat': { val: 0, type: "Bad", fileCateg: "Playing style", editableOrder: "b2y2", permanentReputationNumber: "by2", report_title: "This person was Distracted or Engaged in Other Activities during the game", displayName:"Engaged in Other Activities", name: 'doing_something_else-chat.png', description: 'This person was Distracted or Engaged in Other Activities during the game' },
        'No mistakes allowed': { val: 0, type: "Bad", fileCateg: "Playing style", editableOrder: "b2y3", permanentReputationNumber: "by3", report_title: "This person exhibited an Unwillingness to Accept Mistakes during the game", displayName:"No Mistakes Allowed", name: 'No_mistakes_allowed.png', description: 'This person exhibited an Unwillingness to Accept Mistakes during the game' },
        'tention generator': { val: 0, type: "Bad", fileCateg: "Playing style", editableOrder: "b2y4", permanentReputationNumber: "by4", report_title: "This person caused Tension or Discomfort for others during the game", displayName:"Caused Tension", name: 'tention_generator.png', description: 'This person caused Tension or Discomfort for others during the game'},
      },
      Personality: {
        '1 unconfurtable discussions': { val: 0, type: "Bad", fileCateg: "Personality", editableOrder: "b3p1", permanentReputationNumber: "bp1", report_title: "This person engaged in Uncomfortable Discussions during the game", displayName:"Uncomfortable Discussions", name: '1_unconfurtable_discussions.png', description: 'This person engaged in Uncomfortable Discussions during the game' },
        '5 condescending': { val: 0, type: "Bad", fileCateg: "Personality", editableOrder: "b3p2", permanentReputationNumber: "bp2", report_title: "This person acted in a Condescending Manner during the game", displayName:"Condescending", name: '5_condescending.png', description: 'This person acted in a Condescending Manner during the game' },
        '6 angry': { val: 0, type: "Bad", fileCateg: "Personality", editableOrder: "b3p3", permanentReputationNumber: "bp3", report_title: "This person exhibited repeatedly Angry Behavior during the game", displayName:"Angry Behavior", name: '6_angry.png', description: 'This person exhibited Angry Behavior during the game' },
        '7 complaining': { val: 0, type: "Bad", fileCateg: "Personality", editableOrder: "b3p4", permanentReputationNumber: "bp4", report_title: "This person has often Complained Excessively during the game", displayName:"Complains Excessively", name: '7_complaining.png', description: 'This person has often Complained Excessively during the game' },
        '8 drunk': { val: 0, type: "Bad", fileCateg: "Personality", editableOrder: "b3p5", permanentReputationNumber: "bp5", report_title: "This person was really drunk during the game", displayName:"Got Drunk", name: '8_drunk.png', description: 'This person was really drunk during the game' },
      },
      "Good Manners": {
        'repetitive late': { val: 0, type: "Bad", fileCateg: "Good Manners", editableOrder: "b4m1", permanentReputationNumber: "bm1", report_title: "This person was Excessively or Repeatedly Late during to the gatherings", displayName:"Repeatedly Late", name: 'repetitive_late.png', description: 'This person was Excessively or Repeatedly Late during to the gatherings' },
        '404-error': { val: 0, type: "Bad", fileCateg: "Good Manners", editableOrder: "b4m2", permanentReputationNumber: "bm2", report_title: "This player didn't showed up to multiple gatherings or canceled last minute", displayName:"Did Not Showed Up", name: '404-error.png', description: "This player didn't showed up to multiple gatherings or canceled last minute" },
        'money for sharing food 2': { val: 0, type: "Bad", fileCateg: "Good Manners", editableOrder: "b4m3", permanentReputationNumber: "bm3", report_title: "This player did not returned the money for the food", displayName:"Did Not Paid Back", name: 'money_for_sharing_food_2.png', description: 'This player did not returned the money for the food'},
      },
      Environment: {
        'infectious': { val: 0, type: "Bad", fileCateg: "Environment", editableOrder: "b5e1", permanentReputationNumber: "be1", report_title: "Home - Poor hygiene", displayName:"Home - Poor Hygiene", name: 'infectious.png', description: 'This person displayed behavior related to Contagion during the game' },
        'smell': { val: 0, type: "Bad", fileCateg: "Environment", editableOrder: "b5e2", permanentReputationNumber: "be2", report_title: "Person - Poor hygiene", displayName:"Person - Poor Hygiene", name: 'smell.png', description: 'This person caused Unpleasant Smells during the game' },
      },
      Display: {
        'signature': { val: 0, type: "Bad", fileCateg: "Display", editableOrder: "b6d1", permanentReputationNumber: "bd1", report_title: "Has displayed an offensive name", displayName:"Offensive Name", name: 'signature.png', description: 'This person has displayed an offensive name' },
        'warning picture': { val: 0, type: "Bad", fileCateg: "Display", editableOrder: "b6d2", permanentReputationNumber: "bd2", report_title: "Has displayed an offensive profile picture", displayName:"Offensive Picture", name: 'warning_picture.png', description: 'This person has displayed an offensive profile picture' },
      },
    };
    
    // Update the document with new data
    try {
      const doc = await Stain.findOneAndUpdate({}, newStain, { upsert: true, new: true });
      console.log(doc);
    } catch (err) {
      console.log("Something wrong when updating Stain data!", err);
    }

    // feedback reputation xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    let newFeedback = {
      Vibe: {
        '1 obligation': { val: 0, type: "Feedback", fileCateg: "Vibe", editableOrder: "f1v1", permanentReputationNumber: "fv1", report_title: "Lack of Engagement - too much phone interaction", displayName:"Lack of Engagement", name: '1_obligation.png', description: 'Lack of commitment to the game or to the others, and too often staying on the phone.' },
        '1 bore': { val: 0, type: "Feedback", fileCateg: "Vibe", editableOrder: "f1v2", permanentReputationNumber: "fv2", report_title: "Doesn't integrate with the group, and gets bored", displayName:"Gets Bored", name: '1_bore.png', description: "Doesn't integrate with the group, and gets bored" },
        '2 frequently-triggered': { val: 0, type: "Feedback", fileCateg: "Vibe", editableOrder: "f1v3", permanentReputationNumber: "fv3", report_title: "Easily Triggered", displayName:"Easily Triggered", name: '2_frequently-triggered.png', description: 'Getting triggered frequently during gameplay.' },
        '3 sad (2)': { val: 0, type: "Feedback", fileCateg: "Vibe", editableOrder: "f1v4", permanentReputationNumber: "fv4", report_title: "Too often display of Negative Emotions", displayName:"Too often Negative", name: '3_sad.png', description: 'Displaying sadness or negative emotions during too often.' },
        '4 hyperactivity': { val: 0, type: "Feedback", fileCateg: "Vibe", editableOrder: "f1v5", permanentReputationNumber: "fv5", report_title: "Excessive Activity - hyperactive behavior", displayName:"Hyperactive Behavior", name: '4_hyperactivity.png', description: 'Exhibiting overly hyperactive behavior, and draining the other of energy' },
        '5 grandiosity': { val: 0, type: "Feedback", fileCateg: "Vibe", editableOrder: "f1v6", permanentReputationNumber: "fv6", report_title: "Excessive Confidence", displayName:"Excessive Confidence", name: '5_grandiosity.png', description: 'Excessively confident behavior during the game.' },
        '6 boastful': { val: 0, type: "Feedback", fileCateg: "Vibe", editableOrder: "f1v7", permanentReputationNumber: "fv7", report_title: "Boastfulness", displayName:"Boastfulness", name: '6_boastful.png', description: 'Frequently boasting or showing off achievements.' },
        '7 controlling (2)': { val: 0, type: "Feedback", fileCateg: "Vibe", editableOrder: "f1v8", permanentReputationNumber: "fv8", report_title: "Controlling Behavior", displayName:"Controlling Behavior", name: '7_controlling.png', description: 'Exhibiting controlling behavior towards others during the game.' },
        '8 pushy-kindness': { val: 0, type: "Feedback", fileCateg: "Vibe", editableOrder: "f1v9", permanentReputationNumber: "fv9", report_title: "Overbearing Kindness", displayName:"Overbearing Kindness", name: '8_pushy-kindness.png', description: 'Being excessively pushy with kindness during gameplay.' },
        '9 too serious': { val: 0, type: "Feedback", fileCateg: "Vibe", editableOrder: "f1v10", permanentReputationNumber: "fv10", report_title: "Excessive Seriousness", displayName:"Excessive Seriousness", name: '9_too_serious.png', description: 'Taking the game overly seriously.' },
        '3 speech-bubble': { val: 0, type: "Feedback", fileCateg: "Vibe", editableOrder: "f1v11", permanentReputationNumber: "fv11", report_title: "Excessive Chatter", displayName:"xcessive Chatter", name: '3_speech-bubble.png', description: 'Excessively talking or chatting during gameplay.'},
      },
      Environment: {
        '1 light-spotlight': { val: 0, type: "Feedback", fileCateg: "Environment", editableOrder: "f2e1", permanentReputationNumber: "fe1", report_title: "Too much light in the room", displayName:"Too much light", name: '1_light-spotlight.png', description: '  ' },
        '2 light-dark (2)': { val: 0, type: "Feedback", fileCateg: "Environment", editableOrder: "f2e2", permanentReputationNumber: "fe2", report_title: "Too dark in the room", displayName:"Too dark", name: '2_light-dark_(2).png', description: ' ' },
        '3 loud-speaker': { val: 0, type: "Feedback", fileCateg: "Environment", editableOrder: "f2e3", permanentReputationNumber: "fe3", report_title: "Loudness", displayName:"Loudness", name: '3_loud-speaker.png', description: 'Excessive loudness during gameplay.' },
        '4 innapropiate-music': { val: 0, type: "Feedback", fileCateg: "Environment", editableOrder: "f2e4", permanentReputationNumber: "fe4", report_title: "Choosing the music - vibe off", displayName:"Music Vibe Off", name: '4_innapropiate-music.png', description: ' ' },
        '6 bad-animals': { val: 0, type: "Feedback", fileCateg: "Environment", editableOrder: "f2e5", permanentReputationNumber: "fe5", report_title: "Aggression or tension with the pets", displayName:"Tension with the Pets", name: '6_bad-animals.png', description: 'Either the owner was aggressive with the pets or the pets were aggressive with the participants.' },
        '7 distracting-animals': { val: 0, type: "Feedback", fileCateg: "Environment", editableOrder: "f2e6", permanentReputationNumber: "fe6", report_title: "Distracting Animals", displayName:"Distracting Animals", name: '7_distracting-animals.png', description: 'Animals causing distraction during gameplay.' },
        '2 smoke': { val: 0, type: "Feedback", fileCateg: "Environment", editableOrder: "f2e7", permanentReputationNumber: "fe7", report_title: "The player is smoking", displayName:"Smoker", name: '2_smoke.png', description: 'The player is smoking'},
        'too cold ': { val: 0, type: "Feedback", fileCateg: "Environment", editableOrder: "f2e8", permanentReputationNumber: "fe8", report_title: "This person maintained an Uncomfortably Cold Environment during the game", displayName:"Uncomfortably Cold Room", name: 'too_cold.png', description: 'This person maintained an Uncomfortably Cold Environment during the game'},
      },
      Discrimination: {
        '1 discrimination': { val: 0, type: "Feedback", fileCateg: "Discrimination", editableOrder: "f3d1", permanentReputationNumber: "fd1", report_title: "Discriminatory Behavior", displayName:"Discriminatory Behavior", name: '1_discrimination.png', description: 'Engaging in discriminatory behavior.' },
        '2 genders': { val: 0, type: "Feedback", fileCateg: "Discrimination", editableOrder: "f3d2", permanentReputationNumber: "fd2", report_title: "Gender Bias", displayName:"Gender Bias", name: '2_genders.png', description: 'Exhibiting bias based on genders.' },
        '3 sexual-discrimination': { val: 0, type: "Feedback", fileCateg: "Discrimination", editableOrder: "f3d3", permanentReputationNumber: "fd3", report_title: "Sexual Discrimination", displayName:"Sexual Discrimination", name: '3_sexual-discrimination.png', description: 'Engaging in discrimination related to sexual orientation.' },
        '4 racist': { val: 0, type: "Feedback", fileCateg: "Discrimination", editableOrder: "f3d4", permanentReputationNumber: "fd4", report_title: "Racist Behavior", displayName:"Racist Behavior", name: '4_racist.png', description: 'Displaying racism during gameplay.' },
        '5 Body-shaming': { val: 0, type: "Feedback", fileCateg: "Discrimination", editableOrder: "f3d5", permanentReputationNumber: "fd5", report_title: "Body Shaming", displayName:"Body Shaming", name: '5_Body-shaming.png', description: 'Engaging in body shaming.' },
        '6 bullying': { val: 0, type: "Feedback", fileCateg: "Discrimination", editableOrder: "f3d6", permanentReputationNumber: "fd6", report_title: "Bullying Behavior", displayName:"Bullying Behavior", name: '6_bullying.png', description: 'Engaging in bullying behavior' },
      },
      Hygiene: {
        '1 aroma': { val: 0, type: "Feedback", fileCateg: "Hygiene", editableOrder: "f4h1", permanentReputationNumber: "fh1", report_title: "Unpleasant Smell", displayName:"Unpleasant Smell", name: '1_aroma.png', description: 'Presence of unpleasant smell affecting the game environment.' },
        '3 dirt': { val: 0, type: "Feedback", fileCateg: "Hygiene", editableOrder: "f4h2", permanentReputationNumber: "fh2", report_title: "Presence of Dirt", displayName:"Presence of Dirt", name: '3_dirt.png', description: 'Presence of dirt impacting gameplay.' },
        '4 hand-washing': { val: 0, type: "Feedback", fileCateg: "Hygiene", editableOrder: "f4h3", permanentReputationNumber: "fh3", report_title: "Lack of Hand-washing", displayName:"Lack of Hand-washing", name: '4_hand-washing.png', description: 'Lack of hand-washing impacting the game environment.' },
        '7 haircut': { val: 0, type: "Feedback", fileCateg: "Hygiene", editableOrder: "f4h4", permanentReputationNumber: "fh4", report_title: "Hair everywhere from the pet", displayName:"Hair Everywhere", name: '7_haircut.png', description: 'The place had animal hair everywhere'},
      }
    };
    
    // Update the document with new data
    try {
      const doc = await Feedback.findOneAndUpdate({}, newFeedback, { upsert: true, new: true });
      console.log(doc);
    } catch (err) {
      console.log("Something wrong when updating Feedback data!", err);
    }










    res.sendStatus(204); // asta e fisierul register.ejs
  } catch (error) {
    res.send(error.message);
  }
};



module.exports = {
  reputationDetailsUp,
}




