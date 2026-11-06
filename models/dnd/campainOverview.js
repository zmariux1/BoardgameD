const mongoose = require("mongoose");

const CampaignSchema = new mongoose.Schema({

    name: String,
    shortDescription: String,

    userID: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },

    creationDate: Date,
    last_activity: Date,
    status: {
        type: String,
        enum: ["ongoing", "completed", "iddle", "pendingRemoval"]
    },

    passwordHash: String, // password for the campaign

    worldGeneralKnowledge: {
        type_of_challenge: String,
        multi_continental: String
    },



    min_nr_users: Number,
    max_nr_users: Number,
    starting_lvl: Number,

    participants: [
        {
            userID: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'User' 
            },
            charID: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'Character' 
            },
            reference: String // referinta care datele item-urilor care sunt disponibile in sesiune
        }
    ],

    conditions_banning_list: [
        {
            reference: String, // aici vor fi referintele la clase, rase, feats si backgrounds care nu sunt permise in sesiune
            index: String   // asta sunt identificate.
        }
    ],
    quests: [
    {   
        name: String,
        description: String,
        image_name: String, // doar denumirea fara terminatia png

        owener_userID: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        // Acest câmp păstrează un singur personaj și nu reține cine a făcut acceptarea sau când/în ce sesiune; nu poate servi singur ca istoric al deciziilor.
        accepted_by_charID: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Character' 
        },
        known_by_CharsID: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Character'
            }
        ],
        quest_type: {
            extindere: String, // Global sau Local
            personal_party: String, // party sau personal
        },
        reward: [
            {
                reference: String, // experience, money sau items
                index: String,
                how_many: Number,
                visibility: String
            }
        ],
        status: {
            type: String,
            enum: ["not_accepted", "accepted", "completed", "failed"]
        }
    }
],
    // Sesiunile încorporate descriu date/stări curente, nu evenimente precum cumpărare, acceptare quest sau deplasare. Pentru dashboard, păstrează separat un jurnal cu campaignId, sessionId, userId/characterId, tipul acțiunii, ținta și timestamp-ul.
    // Listele de sesiuni și istoricul lor pot crește nelimitat; un document MongoDB este limitat la 16 MB, deci mută istoricul într-o colecție separată.
    continents: [
        {
            index: String,
            name: String,

            towns: [
                {
                    index: String,
                    name: String,

                    NPC: [
                        {
                            index: String,
                            name: String,
                            race: String,
                            class: String,
                            profession: String,
                            level: Number,
                            quest_reference: [
                                {
                                    questID: { // astra trebuie sa prinda ID-ul questului cand este creat un quest si sa-l puna aici, pentru a putea fi folosit in sesiune
                                        type: mongoose.Schema.Types.ObjectId
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ],
    sessions: [
        {
            name: String,

            chapter: Number,

            status: {
                type: String,
                enum: ["delete", "old", "current", "inDevelopment", "waiting_to_start"]
            },
            
            last_activity: Date,
            sessionSettings: {
                forceVisibility: Boolean, // daca este true, toti jucatorii vor vedea harta si "combat overview", 
                environment: {
                    time_of_day: {
                        type: String,
                        enum: ["morning", "noon", "evening", "night"]
                    },
                    Atmospheric_conditions: {
                        type: String,
                        enum: ["clear", "cloudy", "fog", "rainy", "stormy", "snowy"]
                    },
                    temperature: {
                        type: String,
                        enum: ["freezing", "cold", "normal", "warm", "hot", "extreme"]
                    },
                    wind: {
                        type: String,
                        enum: ["light", "average", "strong", "challenging", "chellenging", "tornado"]
                    },
                    terrain: {
                        type: String,
                        enum: ["normal land", "snow", "swamp", "water", "lava"]
                    }
                    
                },

                map: {
                    image_name: String, // doar denumirea fara terminatia png
                    opacity: Number,
                    rows: Number,
                    columns: Number
                }
            },

            start_date: { type: Date },
            end_date: { type: Date },

            encounter_builder: [
                {
                    reference: String,

                    index: String,
                    
                    currentHP_left: Number,

                    custom_build: {
                        name: String,
                        HP: Number,
                        AC: Number
                    },
                    status: {
                        type: String,
                        enum: ["pending", "inBattle", "dead", "remove"]
                    }

                }
            ],

            activeEncounter: [{
                reference: {
                    type: String,
                    enum: ['participants', 'encounter_builder', 'custom_builds'],
                },
                index: { 
                    type: mongoose.Schema.Types.ObjectId, 
                    ref: ('campaigns.sessions.encounter_builder', 'campaigns.sessions.participants.charID') 
                },
                initiative_order: Number
            }],

            pending_items: [
                {
                    reference: {
                        type: String,
                        enum: ['5e-SRD-Equipment', 'customItemsModel'],
                    },
                    index: String,
                    how_many: Number,
                    visibility: String,
                    monster__ID: {  
                        type: mongoose.Schema.Types.ObjectId, 
                        ref: 'encounter_builder' 
                    }
                }
            ],
            map: {
                coordinates_players: [
                    {
                        charID: {  
                            type: mongoose.Schema.Types.ObjectId, 
                            ref: 'Character' 
                        },
                        x: Number,
                        y: Number,
                        is_visible: Boolean
                    }
                ],

                coordinates_enemies: [
                    {
                        index: String,
                        x: Number,
                        y: Number,
                        is_visible: Boolean
                    }
                ]


            }
        }
    ]
});

const Campaign = mongoose.model("Campaign", CampaignSchema);

module.exports = Campaign;