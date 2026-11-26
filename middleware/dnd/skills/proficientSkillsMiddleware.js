/*
|--------------------------------------------------------------------------
| SKILL-URI CU PROFICIENCY ALE CHARACTER-ULUI
|--------------------------------------------------------------------------
|
| Aceeași logică folosită în charSheet.ejs pentru .skill-row--proficient:
|   1. starting_proficiencies din background-ul selectat al character-ului
|   2. decision din character.classes[].abilities cu index "proficiency-choice-*"
|
| Rezultatul este folosit în class_management.ejs pentru a afișa în dropdown
| doar skill-urile cu proficiency, la feature-urile ale căror options_conditions
| au requirement.reference === "skill proficiency" (ex: rogue-expertise, bard-expertise).
|
*/

const SKILL_PROFICIENCY_REQUIREMENT = "skill proficiency";

// "Skill: Acrobatics" (Features/Proficiencies) și "Acrobatics" (Skills/Backgrounds/Classes)
// devin aceeași cheie: "acrobatics".
const normalizeSkillName = (value) =>
  String(value || "")
    .replace(/^\s*skill\s*:\s*/i, "")
    .trim()
    .toLowerCase();

const getSelectedBackground = (character, backgrounds) => {
  const selectedBackgroundIndex = String(character?.background?.index || "").trim().toLowerCase();

  if (!selectedBackgroundIndex || !Array.isArray(backgrounds)) {
    return null;
  }

  return backgrounds.find(
    (background) => String(background.index || "").trim().toLowerCase() === selectedBackgroundIndex
  ) || null;
};

// Returnează numele skill-urilor cu proficiency (ex: ["Insight", "Religion", "Skill: Stealth"]).
const buildProficientSkillNames = (character, backgrounds) => {
  const selectedBackground = getSelectedBackground(character, backgrounds);

  const startingProficiencyNames = (selectedBackground ? [selectedBackground] : [])
    .flatMap((background) => Array.isArray(background.starting_proficiencies)
      ? background.starting_proficiencies.map((proficiency) => proficiency.name)
      : [])
    .filter(Boolean);

  const proficiencyChoiceNames = (Array.isArray(character?.classes) ? character.classes : [])
    .flatMap((characterClass) => Array.isArray(characterClass.abilities) ? characterClass.abilities : [])
    .filter((ability) => String(ability.index || "").includes("proficiency-choice"))
    .map((ability) => ability.decision)
    .filter(Boolean);

  return [...new Set([...startingProficiencyNames, ...proficiencyChoiceNames])];
};

// Set normalizat, pentru comparații directe cu option.item.name din Features.
const buildProficientSkillKeySet = (character, backgrounds) =>
  new Set(buildProficientSkillNames(character, backgrounds).map(normalizeSkillName));

const requiresSkillProficiency = (condition) =>
  String(condition?.requirement?.reference || "").trim().toLowerCase() === SKILL_PROFICIENCY_REQUIREMENT;

/*
|--------------------------------------------------------------------------
| SKILL-URI CU EXPERTISE
|--------------------------------------------------------------------------
|
| Expertise dublează proficiency bonus-ul pe acel skill (nu se cumulează:
| același skill ales din mai multe surse rămâne 2 × PB).
|
| Surse (choice.type === "skill_expertise"), salvate în character.classes[].abilities:
|   - feature: ability.index === feature.index (ex: rogue-expertise-1, bard-expertise-1)
|   - feat:    ability.index === "feat-<slug feat>" și conditionId "feat:<feature>:<slot>:choice:<id>"
|              (ex: skill-expert)
|
*/

const SKILL_EXPERTISE_CHOICE_TYPE = "skill_expertise";

const getFeatAbilityIndex = (feat) =>
  `feat-${String(feat?.name || feat?.index || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

const isSkillExpertiseChoice = (entry) =>
  String(entry?.choice?.type || "").trim().toLowerCase() === SKILL_EXPERTISE_CHOICE_TYPE;

// Returnează numele skill-urilor cu expertise (ex: ["Skill: Stealth", "Skill: Insight"]).
const buildExpertiseSkillNames = (character, features, feats) => {
  const expertiseFeatureIndexes = new Set(
    (Array.isArray(features) ? features : [])
      .filter(isSkillExpertiseChoice)
      .map((feature) => String(feature.index || ""))
  );
  const expertiseFeatAbilityIndexes = new Set(
    (Array.isArray(feats) ? feats : [])
      .filter(isSkillExpertiseChoice)
      .map(getFeatAbilityIndex)
  );

  const expertiseNames = (Array.isArray(character?.classes) ? character.classes : [])
    .flatMap((characterClass) => Array.isArray(characterClass.abilities) ? characterClass.abilities : [])
    .filter((ability) => {
      const abilityIndex = String(ability.index || "");
      const conditionId = String(ability.conditionId || "");

      return expertiseFeatureIndexes.has(abilityIndex) ||
        (expertiseFeatAbilityIndexes.has(abilityIndex) && conditionId.includes(":choice:"));
    })
    .map((ability) => ability.decision)
    .filter(Boolean);

  return [...new Set(expertiseNames)];
};

module.exports = {
  SKILL_PROFICIENCY_REQUIREMENT,
  SKILL_EXPERTISE_CHOICE_TYPE,
  normalizeSkillName,
  buildProficientSkillNames,
  buildProficientSkillKeySet,
  buildExpertiseSkillNames,
  requiresSkillProficiency
};
