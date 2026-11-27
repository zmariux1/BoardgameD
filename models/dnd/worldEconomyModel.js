const mongoose = require('mongoose');

// One WorldEconomy document per campaign.
// Holds the economy of: the world (global vibe), towns, shops, heroes and monsters (loot before fights).
// Transaction history (buy / sell / negotiation events) must NOT live here: it grows without limit and a
// MongoDB document is capped at 16 MB. Keep it in a separate log collection (campaignID, charID, shopId, action, timestamp).


// =========================
// SHARED SUB-SCHEMAS
// =========================

// Generic pointer used across the project: where the data lives + its index.
const referenceSchema = new mongoose.Schema({
    reference: {
        type: String,
        default: '' // ex: 'races', 'backgrounds', 'army', 'underworld', '5e-SRD-Equipment'
    },
    index: {
        type: String,
        default: ''
    }
}, { _id: false });

const walletSchema = new mongoose.Schema({
    cp: { type: Number, default: 0, min: 0 },
    sp: { type: Number, default: 0, min: 0 },
    ep: { type: Number, default: 0, min: 0 },
    gp: { type: Number, default: 0, min: 0 },
    pp: { type: Number, default: 0, min: 0 }
}, { _id: false });

const itemStackSchema = new mongoose.Schema({
    reference: {
        type: String,
        enum: ['5e-SRD-Equipment', 'customItemsModel'],
        required: true
    },
    index: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        default: 1,
        min: 0
    }
}, { _id: false });

const imageSchema = new mongoose.Schema({
    image_name: { type: String, default: '' }, // name only, without extension
    image_ext: { type: String, enum: ['png', 'jpg', 'jpeg'] }
}, { _id: false });

const TOWN_SIZES = ['small-village', 'medium-village', 'large-village', 'small-town', 'medium-town', 'large-town', 'capital'];
const CRIME_RATES = ['rarely', 'normal', 'slight-tension', 'often', 'severe'];
const WAR_DISTANCES = ['none', 'far', 'close'];
const ECONOMY_TIERS = ['disaster', 'challenging', 'slight-increase', 'normal', 'slight-decrease', 'grateful', 'best'];


// =========================
// GLOBAL ECONOMY VIBE
// =========================
// Read-only for the DM in the shop form: cumulated from world state.

const globalVibeSchema = new mongoose.Schema({
    tier: {
        type: String,
        enum: ECONOMY_TIERS,
        default: 'normal'
    },
    modifier: {
        type: Number, // % applied to prices, + = more expensive
        default: 0
    },
    sources: [{
        reference: String, // 'calamity', 'war', 'bandits', 'poverty', 'char-title', etc
        index: String,
        tier: { type: String, enum: ECONOMY_TIERS },
        note: { type: String, default: '' },
        active: { type: Boolean, default: true }
    }]
}, { _id: false });


// =========================
// TOWNS
// =========================
// continentIndex / townIndex point to Campaign.continents[].towns[].index

const townEconomySchema = new mongoose.Schema({
    continentIndex: { type: String, required: true },
    townIndex: { type: String, required: true },

    townSize: { type: String, enum: TOWN_SIZES, default: 'medium-town' },
    crimeRate: { type: String, enum: CRIME_RATES, default: 'normal' },
    war: { type: String, enum: WAR_DISTANCES, default: 'none' },

    modifier: {
        type: Number, // local price modifier in %
        default: 0
    },

    reputation: [{
        charID: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
        value: { type: Number, default: 0 }
    }]
});


// =========================
// SHOPS
// =========================

const shopSchema = new mongoose.Schema({
    campaignSchema: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'CampaignSchema' 
    },

    name: { type: String, required: true, trim: true },
    isVisible: { type: Boolean, default: true },

    // ----- Trading (DM / shop perspective) -----
    trading: {
        buyingEnabled: { type: Boolean, default: true },  // shop buys from players
        sellingEnabled: { type: Boolean, default: true }, // shop sells to players

        affiliationCondition: {
            enabled: { type: Boolean, default: false },
            affiliation: { type: referenceSchema, default: () => ({}) }
        },
        tradesWith: [{
            affiliation: { 
                type: referenceSchema, 
                default: () => ({}) 
            },
            rule: { 
                type: String, 
                enum: ['refuse', 'accept-only'], 
                default: 'refuse' 
            }
        }]
    },

    purchasePower: { // gp left to buy from players
        type: Number, 
        default: 20, 
        min: 0    
    },

    services: [{
        type: String,
        enum: ['crafting', 'repairs', 'enchanting', 'identification']
    }],

    // ----- Price factors -----
    priceFactors: {
        enabled: [{
            type: String,
            enum: [
                'god-intervention', 'charisma', 'char-reputation', 'char-affiliation', 'char-title',
                'negotiation-dice', 'npc-quests', 'negotiation-tolerance', 'nearby-reputation',
                'item-shortage', 'hassle-only-trade', 'owner-vibe', 'economy-vibe', 'favoritism'
            ]
        }],
        godIntervention: { type: Number, default: 0, min: -50, max: 50 },
        charAffiliations: [{
            affiliation: { type: referenceSchema, default: () => ({}) },
            intensity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
            effect: { type: String, enum: ['increase', 'decrease'], default: 'increase' }
        }],
        negotiationDice: {
            min: { type: Number, default: 16, min: 12 },
            mid: { type: Number, default: 18 },
            max: { type: Number, default: 20 }
        },
        negotiationTolerance: { type: Number, enum: [0, 1, 2, 3, 4, 5], default: 1 },
        ownerVibe: {
            type: String,
            enum: ['angry', 'greedy', 'neutral', 'good-mood', 'generous'],
            default: 'neutral'
        },
        favoritism: [referenceSchema], // reference: 'races' | 'backgrounds'
        // global sliders from "Price Manipulation"
        buyModifier: { type: Number, default: 0, min: -50, max: 50 },
        sellModifier: { type: Number, default: 0, min: -50, max: 50 },
        estimatedTotal: { type: Number, default: 0 } // last estimate shown to the DM
    },

    // ----- Random item availability -----
    availability: {
        enabled: [{
            type: String,
            enum: ['crime-rate', 'war', 'town-size', 'shop-size', 'player-request', 'player-reputation']
        }],
        // shop-level values; when empty the town values are used
        crimeRate: { type: String, enum: CRIME_RATES },
        war: { type: String, enum: WAR_DISTANCES },
        townSize: { type: String, enum: TOWN_SIZES },
        shopSize: {
            type: String,
            enum: ['shabby', 'very-small', 'small', 'decent', 'significant', 'opulent', 'prestigious'],
            default: 'decent'
        }
    },

    // ----- Stock -----
    stock: [{
        reference: { type: String, enum: ['5e-SRD-Equipment', 'customItemsModel'], required: true },
        index: { type: String, required: true },
        quantity: { type: Number, default: 1, min: 0 },
        priceOverride: { type: Number, min: 0 }, // gp, overrides computed price
        isVisible: { type: Boolean, default: true },
        isLocked: { type: Boolean, default: false },
        source: { type: String, enum: ['dm', 'random', 'player-request'], default: 'dm' }
    }],

    // Current negotiation state per character (for negotiation tolerance).
    negotiations: [{
        charID: { type: mongoose.Schema.Types.ObjectId, ref: 'Character' },
        attempts: { type: Number, default: 0 },
        penaltyPoints: { type: Number, default: 0 }
    }]

}, {
    timestamps: true
});

// Negotiation dice tiers: min >= 12, mid >= min, max >= mid.
shopSchema.pre('validate', function (next) {
    const dice = this.priceFactors && this.priceFactors.negotiationDice;
    if (dice && (dice.mid < dice.min || dice.max < dice.mid)) {
        this.invalidate('priceFactors.negotiationDice', 'Negotiation dice must be ordered: min <= mid <= max.');
    }
    next();
});


// =========================
// HEROES
// =========================

const heroEconomySchema = new mongoose.Schema({
    charID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
        required: true
    },
    wallet: { type: walletSchema, default: () => ({}) },
    reputation: { type: Number, default: 0 }, // global reputation; per town lives in towns[].reputation
    titles: [{ type: String }],
    affiliations: [referenceSchema],
    completedNpcQuests: [{
        npcIndex: String,
        questID: { type: mongoose.Schema.Types.ObjectId }
    }]
});


// =========================
// MONSTERS (before fights)
// =========================
// Gold and loot carried by monsters, prepared before the encounter.
// encounterID points to Campaign.sessions[].encounter_builder[]._id

const monsterEconomySchema = new mongoose.Schema({
    sessionID: { type: mongoose.Schema.Types.ObjectId },
    encounterID: { type: mongoose.Schema.Types.ObjectId },
    reference: { type: String, default: '' }, // where the monster comes from
    index: { type: String, default: '' },
    wallet: { type: walletSchema, default: () => ({}) },
    loot: [itemStackSchema],
    status: {
        type: String,
        enum: ['pending', 'looted', 'lost'],
        default: 'pending'
    }
});


// =========================
// WORLD ECONOMY (root)
// =========================

const worldEconomySchema = new mongoose.Schema({

    campaignID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true,
        unique: true
    },

    globalVibe: { type: globalVibeSchema, default: () => ({}) },

    towns: [townEconomySchema],

    shops: [shopSchema],

    heroes: [heroEconomySchema],

    monsters: [monsterEconomySchema]

}, {
    timestamps: true
});


const WorldEconomy = mongoose.model('WorldEconomy', worldEconomySchema);


module.exports = WorldEconomy;
