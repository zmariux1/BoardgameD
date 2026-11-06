const path = require("path");

const catalogDirectory = path.join(__dirname, "../../../data/2014/en");
const dataAccuracyDirectory = path.join(__dirname, "../../../data/data_accuracy");

const loadArrayFromJson = (filePath) => {
  const data = require(filePath);
  if (!Array.isArray(data)) {
    throw new TypeError(`Catalogul ${path.basename(filePath)} nu conține o listă.`);
  }

  return data;
};

const loadBackgroundsFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Backgrounds.json"));
const loadProficienciesFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Proficiencies.json"));
const loadLanguagesFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Languages.json"));
const loadEquipmentFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Equipment.json"));
const loadEquipmentCategoriesFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Equipment-Categories.json"));
const loadSkillsFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Skills.json"));
const loadSpellsFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Spells.json"));
const loadClassesFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Classes.json"));
const loadFeaturesFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Features.json"));
const loadTraitsFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Traits.json"));
const loadFeatsFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Feats.json"));
const loadLevelsFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Levels.json"));
const loadRacesFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Races.json"));
const loadSubracesFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Subraces.json"));
const loadMonstersDataFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Monsters.json"));
const loadConditionsFromJson = () =>
  loadArrayFromJson(path.join(catalogDirectory, "5e-SRD-Conditions.json"));
const loadStatsImprovementsFromJson = () =>
  loadArrayFromJson(path.join(dataAccuracyDirectory, "stats_improvement.json"));
const loadHPBonusesFromJson = () =>
  loadArrayFromJson(path.join(dataAccuracyDirectory, "HP_Bonuses.json"));
const loadInitiativeBonusesFromJson = () =>
  loadArrayFromJson(path.join(dataAccuracyDirectory, "init_Bonuses.json"));

module.exports = {
  loadBackgroundsFromJson,
  loadProficienciesFromJson,
  loadLanguagesFromJson,
  loadEquipmentFromJson,
  loadEquipmentCategoriesFromJson,
  loadSkillsFromJson,
  loadSpellsFromJson,
  loadClassesFromJson,
  loadFeaturesFromJson,
  loadTraitsFromJson,
  loadFeatsFromJson,
  loadLevelsFromJson,
  loadRacesFromJson,
  loadSubracesFromJson,
  loadMonstersDataFromJson,
  loadConditionsFromJson,
  loadStatsImprovementsFromJson,
  loadHPBonusesFromJson,
  loadInitiativeBonusesFromJson
};
