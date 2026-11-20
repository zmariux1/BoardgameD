const mongoose = require('mongoose');

// const materialReferenceSchema = new mongoose.Schema({
// 	reference: {
// 		type: String,
// 		default: ''
// 	},
// 	index: {
// 		type: String,
// 		default: ''
// 	}
// }, { _id: false });

const customSpellSchema = new mongoose.Schema({
	name: {
		type: String,
		default: ''
	},
	area_effect_type: {
		type: String,
		default: ''
	},
	area_effect_range: {
		type: Number,
		default: 0
	},
	damage_type: {
		type: String,
		default: ''
	},
	damage: {
		type: String,
		default: ''
	},
	dmg_increase_per_level: {
		type: String,
		default: ''
	},
	duration: {
		type: String,
		default: ''
	},
	casting_time: {
		type: String,
		default: ''
	},
	concentration: {
		type: Boolean,
		default: false
	},
	range: {
		type: String,
		default: ''
	},
	// components: {
	// 	verbal: {
	// 		type: Boolean,
	// 		default: false
	// 	},
	// 	somatic: {
	// 		type: Boolean,
	// 		default: false
	// 	},
	// 	material: {
	// 		is_material: {
	// 			type: Boolean,
	// 			default: false
	// 		},
	// 		list_of_materials: {
	// 			type: [materialReferenceSchema],
	// 			default: []
	// 		}
	// 	}
	// },
	desc: {
		type: String,
		default: ''
	}
}, { _id: false });

const magicItemSpellSchema = new mongoose.Schema({
	reference: {
		type: String,
		default: ''
	},
	index: {
		type: String,
		default: ''
	},
	custom_spell: {
		type: customSpellSchema,
		default: undefined
	}
}, { _id: false });

const magicItemSchema = new mongoose.Schema({
	is_magic: {
		type: Boolean,
		default: true
	},
	name: {
		type: String,
		required: true,
		trim: true
	},
	file_name: {
		type: String,
		default: ""
	},
	damage_modifier: {
		type: Number,
		default: 0
	},
	attunement: {
		type: String,
		default: ''
	},
	attachment: {
		type: String,
		default: ''
	},
	recharge: {
		type: Boolean,
		default: false
	},
	uses_left: {
		type: Number,
		min: 0,
		default: 0
	},
	recharge_condition: {
		type: String,
		default: ''
	},
	desc: {
		type: String,
		default: ''
	},
	notes: {
		type: String,
		default: ''
	},
	otherStats_modifiers: {
		type: mongoose.Schema.Types.Mixed,
		default: () => ({})
	},
	spells: {
		type: [magicItemSpellSchema],
		default: []
	}
}, { _id: false });

const customItemSchema = new mongoose.Schema({
	category_name: {
		type: String,
		required: true,
		trim: true
	},
	index: {
		type: String,
		required: true,
		trim: true,
		index: true
	},
	magic_item: {
		type: magicItemSchema,
		required: true
	}
}, {
	timestamps: true
});

const CustomItem = mongoose.model('CustomItem', customItemSchema);

module.exports = CustomItem;
