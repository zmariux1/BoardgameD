const mongoose = require("mongoose");
const DnD_CarBuilder = require("../../../models/dnd/charBuilderModel");
const {
  loadFeaturesFromJson,
  loadLevelsFromJson
} = require("../jsonLoaders/JsonPathMiddleware");

const ACTION_GROUPS = [
  { actionType: "action", title: "Actions" },
  { actionType: "free_action", title: "Free Actions" },
  { actionType: "bonus_action", title: "Bonus Actions" },
  { actionType: "reaction", title: "Reactions" },
  { actionType: "passive", title: "Passives" },
  { actionType: "choice", title: "Choices" }
];

const normalizeIndex = (value) =>
  String(value || "").trim().toLowerCase().replace(/[_-]+/g, "-");

const getSelectedSubclassIndexes = (characterClass, classIndex, features) => {
  const abilities = Array.isArray(characterClass.abilities) ? characterClass.abilities : [];

  return new Set(
    abilities
      .filter((ability) => String(ability.conditionId || "") !== "feat")
      .filter((ability) => {
        const choiceFeature = features.find((feature) =>
          normalizeIndex(feature?.index) === normalizeIndex(ability.index) &&
          normalizeIndex(feature?.class?.index) === classIndex &&
          feature.choice?.type === "subclass"
        );
        const availableIndexes = Array.isArray(choiceFeature?.choice?.from?.options)
          ? choiceFeature.choice.from.options
            .map((option) => normalizeIndex(option?.item?.index))
            .filter(Boolean)
          : [];

        return availableIndexes.includes(normalizeIndex(ability.optionIndex));
      })
      .map((ability) => normalizeIndex(ability.optionIndex))
  );
};

const getCharacterActionGroups = (character, featuresCatalog, levelsCatalog) => {
  const groupsByActionType = new Map(ACTION_GROUPS.map(({ actionType }) => [actionType, []]));
  const selectedClasses = Array.isArray(character.classes) ? character.classes : [];

  selectedClasses.forEach((characterClass) => {
    const classIndex = normalizeIndex(characterClass?.index);
    const classLevel = Number(characterClass?.level || 0);

    if (!classIndex || !Number.isFinite(classLevel) || classLevel <= 0) {
      return;
    }

    const classAbilities = Array.isArray(characterClass.abilities) ? characterClass.abilities : [];
    const selectedSubclassIndexes = getSelectedSubclassIndexes(
      characterClass,
      classIndex,
      featuresCatalog
    );
    const eligibleFeatureIndexes = new Set(
      levelsCatalog
        .filter((levelData) =>
          normalizeIndex(levelData?.class?.index) === classIndex &&
          Number(levelData.level) <= classLevel
        )
        .flatMap((levelData) =>
          Array.isArray(levelData.features)
            ? levelData.features.map((feature) => normalizeIndex(feature?.index))
            : []
        )
        .filter(Boolean)
    );

    featuresCatalog.forEach((feature) => {
      const featureIndex = normalizeIndex(feature?.index);
      const actionType = String(feature?.action_type || "");
      const subclassIndex = normalizeIndex(feature?.subclass?.index);
      const isSubclassFeature = Boolean(subclassIndex);
      const isSelectedSubclassFeature = isSubclassFeature &&
        selectedSubclassIndexes.has(subclassIndex);
      const featureLevel = Number(feature?.level);

      if (
        !featureIndex ||
        normalizeIndex(feature?.class?.index) !== classIndex ||
        (isSubclassFeature && !isSelectedSubclassFeature) ||
        (
          !eligibleFeatureIndexes.has(featureIndex) &&
          !(isSelectedSubclassFeature && Number.isFinite(featureLevel) && featureLevel <= classLevel)
        ) ||
        !groupsByActionType.has(actionType)
      ) {
        return;
      }

      if (feature.subclass?.subchoice) {
        const subchoiceIsSelected = classAbilities.some((ability) =>
          String(ability.conditionId || "") !== "feat" &&
          normalizeIndex(ability.index) === normalizeIndex(feature.subclass.subchoice) &&
          normalizeIndex(ability.optionIndex) === featureIndex
        );

        if (!subchoiceIsSelected) {
          return;
        }
      }

      const descriptions = Array.isArray(feature.desc) ? feature.desc : [feature.desc];
      groupsByActionType.get(actionType).push({
        ...feature,
        description: descriptions.filter(Boolean).join(" "),
        specificValues: null,
        resourceCount: null,
        resourceUnlimited: false
      });
    });

    const classFeatures = Array.from(groupsByActionType.values()).flat().filter(
      (feature) => normalizeIndex(feature.class?.index) === classIndex
    );
    const featureIndexes = new Set(classFeatures.map((feature) => normalizeIndex(feature.index)));
    const specificValuesByFeature = new Map();
    const applicableLevelData = levelsCatalog
      .filter((levelData) =>
        normalizeIndex(levelData?.class?.index) === classIndex &&
        Number(levelData.level) <= classLevel &&
        (
          !levelData.subclass?.index ||
          selectedSubclassIndexes.has(normalizeIndex(levelData.subclass.index))
        )
      )
      .sort((first, second) => Number(first.level) - Number(second.level));

    applicableLevelData.forEach((levelData) => {
      ["class_specific", "subclass_specific"].forEach((specificField) => {
        const specificData = levelData[specificField];
        if (!specificData || typeof specificData !== "object" || Array.isArray(specificData)) {
          return;
        }

        Object.entries(specificData).forEach(([specificIndex, value]) => {
          const normalizedSpecificIndex = normalizeIndex(specificIndex);
          if (!featureIndexes.has(normalizedSpecificIndex)) {
            return;
          }

          const featureSpecificValues = specificValuesByFeature.get(normalizedSpecificIndex) || {};
          if (value && typeof value === "object" && !Array.isArray(value)) {
            Object.assign(featureSpecificValues, value);
          } else {
            featureSpecificValues.value = value;
          }
          specificValuesByFeature.set(normalizedSpecificIndex, featureSpecificValues);
        });
      });
    });

    classFeatures.forEach((feature) => {
      const specificValues = specificValuesByFeature.get(normalizeIndex(feature.index));
      if (!specificValues) {
        return;
      }

      feature.specificValues = specificValues;
      const count = Number(specificValues.count);
      if (Number.isInteger(count) && count >= 0) {
        if (count === 9999) {
          feature.resourceUnlimited = true;
        } else {
          feature.resourceCount = count;
        }
      }
    });
  });

  return ACTION_GROUPS.map(({ actionType, title }) => ({
    actionType,
    title,
    features: groupsByActionType.get(actionType).sort(
      (firstFeature, secondFeature) => Number(firstFeature.level || 0) - Number(secondFeature.level || 0)
    )
  }));
};

const abilitiesSlotsMiddleware = async (req, res, next) => {
  const { characterId, userId } = req.params;

  if (
    !characterId ||
    !mongoose.Types.ObjectId.isValid(characterId) ||
    !req.session?.user_id ||
    String(req.session.user_id) !== String(userId)
  ) {
    return next();
  }

  try {
    const character = await DnD_CarBuilder.findOne({
      _id: characterId,
      userLink: userId
    });

    if (!character) {
      return next();
    }

    const featuresCatalog = loadFeaturesFromJson();
    const levelsCatalog = loadLevelsFromJson();

    req.characterForSheet = character;
    req.characterActionGroups = getCharacterActionGroups(
      character,
      featuresCatalog,
      levelsCatalog
    );

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  abilitiesSlotsMiddleware,
  getCharacterActionGroups
};
