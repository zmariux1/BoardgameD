const mongoose = require('mongoose');


const characterSchema = new mongoose.Schema({

    // =========================
    // CHARACTER
    // =========================

    userLink: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    charName: {
        type: String,
        default: ''
    },

    charAvatar: {
        type: String,
        default: ''
    },

    isPlayable: {
        type: Boolean,
        default: false
    },


    // =========================
    // RACE
    // =========================

    race: {
        index: {
            type: String,
            default: ''
        },
        subRace: {
            type: String,
            default: ''
        },
        choices: [
            {
                context_index: { // unde ma indreapta (feat, features, skills, procifiency)
                    type: String,
                    default: ""
                }, 
                decision: {
                    type: String,
                    default: ""
                },
                decisionIndex: {
                    type: String,
                    default: ""
                },
                value: {
                    type: Number,
                    default: 0
                }
            }
        ]
    },


    // =========================
    // CLASSES (Multiple)
    // =========================

    classes: [{
        index: {
            type: String,
            default: ''
        },

        level: {
            type: String,
            default: ''
        },

        abilities: [{
            index: {
                type: String,
                default: ''
            },

            decision: {
                type: String,
                default: ''
            },

            optionIndex: {
                type: String,
                default: ''
            },

            value: {
                type: Number,
                default: 0
            },

            conditionId: {
                type: String,
                default: ''
            },

            slot: {
                type: Number,
                default: 0
            }
        }]
    }],

    // =========================
    // SUBCLASS
    // =========================

    subclass: {
        index: {
            type: String,
            default: ''
        },

        level: {
            type: String,
            default: ''
        },

        abilities: [{
            index: {
                type: String,
                default: ''
            },

            decision: {
                type: String,
                default: ''
            }
        }]
    },


    // =========================
    // ABILITY SCORES
    // =========================

    abilityScores: [{
        type: {
            type: String,
            enum: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
            required: true
        },

        value: {
            type: Number,
            default: 8
        },

        modifier: {
            type: String,
            default: "0"
        },

        overwrite: {
            type: Number,
            default: 0
        }
    }],


    // =========================
    // Saved Spells
    // =========================

    spells: [{
        index: String,
        availability: {
            type: String,
            enum: ['always', 'prepared', 'limited'],
        }
    }],
    SpellSlots: [{
        level: {
            type: Number,
            enum: [1, 2, 3, 4, 5, 6, 7, 8, 9],
            default: 0
        },
        consumed: {
            type: Number,
            default: 0
        }
    }],


    // =========================
    // inventory
    // =========================

    inventory: [{
        index: String,
        reference: {
            type: String,
            enum: ['5e-SRD-Equipment', 'customItemsModel'],
        },
        equiped: Boolean,
        attuned: Boolean,
        whereEquiped: {
            type: String,
            enum: ['Main Hand', 'Secondary Hand', 'Both Hands', 'Armor', 'Shield', 'head', 'body', 'legs', 'feet', 'hands', 'back', 'waist', 'neck', 'wrist', 'finger', 'bag'],
        },
        quantity: Number
    }],


    // =========================
    // BACKGROUND
    // =========================

    background: {
        index: {
            type: String,
            default: ''
        },

        choices: [{
            type: {
                type: String,
                default: ''
            },

            index: {
                type: String,
                default: ''
            }
        }]
    },
    feats: {
        index: {
            type: String,
            default: ''
        },

        choices: [{
            type: {
                type: String,
                default: ''
            },

            index: {
                type: String,
                default: ''
            }
        }]
    },
    condition: [
        {
            reference: { 
                type: String, 
                enum: ['5e-SRD-Conditions', '5e-SRD-Buffs']
            }, // (Unde se gaseste conditia)
            category_name: String, // (condition)
            index: String, // (indexul conditiei)
            impact_category: String, // (ce anume afecteaza, HP, AC, Movement, etc)
        }
    ],
    hp: {
        currentHP_left: Number,
        fullHP: Number,
        tempHP: Number,
        failedDeathSaves: Number,
        successDeathSaves: Number
    },

    ac: [
        {
            reference: String, // (Unde se gaseste conditia)
            index: String, // (condition, vulnerabilities, resistances, immunities)
        }
    ],
    reset_char: {
        longRest: {},
        shortRest: {}
    },
    inspiration: String,

    worldGeneralKnowledge: {
        type_of_challenge: String,
        multi_continental: String
    },
    usedSlots: [
        {
            reference: String, // (spell, feature, etc)
            index: String, // (denumirea indexului spell-ului sau skill-ului)
            consumed: String
        }
    ],

}, {
    timestamps: true
});


const Character = mongoose.model('Character', characterSchema);


module.exports = Character;








// ______________    New CHAR  _____________________
// User ID
// Char ID (trebuie generat acum)
// Char Name (asteapta string)
// Char Avatar (asteapta string)
// Is_playable (true/faulse)

// ______________    RASA   _____________________
// Char ID
// Aleg Rasa (asteapta string)

// ______________   CLASA    _____________________
// Char ID

// Aleg Clasa (asteapta string)
// Specific nivelul clasei  (asteapta string)
// Abilitatile intra aici cu index + decizia din acea abilitate (ambele sunt stringuri)


// ______________   SUBCLASA   _____________________
// Char ID

// ID/Index subclasa  (asteapta string)

// Specific nivelul CLASEI (asteapta string)
// Abilitatile intra aici cu index + decizia din acea abilitate(ambele sunt stringuri)



// ______________   ABILITY_SCORE   _____________________
// Car ID
// ABILITY_SCORE_TYPE (DEX, STR, CONS, INT, WIS, CHAR) (asteapta string)
// ABILITY_SCORE_Value (asteapta numar)
// ABILITY_SCORE_MODIFIER (asteapta numar)
// ABILITY_SCORE_OVERWRITE(asteapta numar)

// ______________   BACKGROUND   _____________________

// Car ID
// Type of choice (language sau skills, items, etc) – specificarea categoriei din care face parte
// Index-ul alegerii (asteapta string)
