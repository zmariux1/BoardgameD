const {
  loadBackgroundsFromJson,
  loadLevelsFromJson
} = require("../jsonLoaders/JsonPathMiddleware");

const PASSIVE_SKILLS = [
  { name: "Perception", ability: "WIS" },
  { name: "Insight", ability: "WIS" },
  { name: "Investigation", ability: "INT" }
];

const getProficiencyBonus = (character, levels) => {
  const totalLevel = (Array.isArray(character?.classes) ? character.classes : [])
    .reduce((total, classEntry) => {
      const level = Number(classEntry?.level);
      return total + (Number.isFinite(level) && level > 0 ? level : 0);
    }, 0);
  const levelData = levels.find((entry) => Number(entry.level) === totalLevel);
  const proficiencyBonus = Number(levelData?.prof_bonus);
  return Number.isFinite(proficiencyBonus) ? proficiencyBonus : 0;
};

const getProficientSkillNames = (character, backgrounds) => {
  const backgroundIndex = String(character?.background?.index || "").trim().toLowerCase();
  const background = backgrounds.find(
    (entry) => String(entry?.index || "").trim().toLowerCase() === backgroundIndex
  );
  const names = new Set(
    (Array.isArray(background?.starting_proficiencies) ? background.starting_proficiencies : [])
      .map((proficiency) => String(proficiency?.name || "").trim().toLowerCase())
      .filter(Boolean)
  );

  (Array.isArray(character?.classes) ? character.classes : [])
    .flatMap((classEntry) => Array.isArray(classEntry?.abilities) ? classEntry.abilities : [])
    .filter((ability) => String(ability?.index || "").includes("proficiency-choice"))
    .map((ability) => String(ability?.decision || "").trim().toLowerCase())
    .filter(Boolean)
    .forEach((name) => names.add(name));

  return names;
};

const buildCharacterPassiveStats = (
  character,
  abilityStats,
  options = {}
) => {
  const backgrounds = options.backgrounds || loadBackgroundsFromJson();
  const levels = options.levels || loadLevelsFromJson();
  const proficientSkillNames = getProficientSkillNames(character, backgrounds);
  const proficiencyBonus = getProficiencyBonus(character, levels);
  const totalStats = abilityStats?.AllStats || abilityStats || {};

  return PASSIVE_SKILLS.map(({ name, ability }) => {
    const score = Number(totalStats[ability]);
    const modifier = Number.isFinite(score) ? Math.floor((score - 10) / 2) : 0;
    const proficient = proficientSkillNames.has(name.toLowerCase());

    return {
      name,
      ability,
      modifier,
      proficient,
      value: 10 + modifier + (proficient ? proficiencyBonus : 0)
    };
  });
};

module.exports = {
  buildCharacterPassiveStats
};
