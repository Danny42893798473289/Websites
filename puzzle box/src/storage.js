const STORAGE_KEY = "illusionBowlingSaveV1";

const defaultData = {
  unlockedLevel: 1,
  starsByLevel: {},
  settings: {
    followStrength: 0.1,
    shadowQuality: "medium"
  },
  achievements: {},
  stats: {
    totalShots: 0,
    totalWins: 0
  }
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultData);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultData),
      ...parsed,
      settings: {
        ...defaultData.settings,
        ...(parsed.settings || {})
      },
      stats: {
        ...defaultData.stats,
        ...(parsed.stats || {})
      }
    };
  } catch {
    return structuredClone(defaultData);
  }
}

export function saveGameState(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getStarsForLevel(save, levelId) {
  return save.starsByLevel[String(levelId)] || 0;
}

export function updateLevelStars(save, levelId, stars) {
  const key = String(levelId);
  const current = save.starsByLevel[key] || 0;
  save.starsByLevel[key] = Math.max(current, stars);
}

export function unlockLevel(save, nextLevelId) {
  save.unlockedLevel = Math.max(save.unlockedLevel || 1, nextLevelId);
}

export function setSetting(save, key, value) {
  save.settings[key] = value;
}

export function markAchievement(save, key) {
  if (save.achievements[key]) return false;
  save.achievements[key] = Date.now();
  return true;
}
