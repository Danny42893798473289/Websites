import {
  ASCENSION_CONFIG,
  MAX_DICE_PURCHASES,
  MAX_SECOND_DIE_PURCHASES,
  SECOND_DIE_RPS_ITEMS,
  EGG_TYPES,
  EGG_VARIANTS,
  FUSION_EGG_TYPES,
  GEM_SHOP_ITEMS,
  PRESTIGE_SHOP_ITEMS,
  PRESTIGE_TARGET_ROLLS,
  RARITIES,
  SHOP_ITEMS,
  syncRarityTotals
} from "./config.js";

export function createDefaultState(username, userRecord) {
  const eggDefaults = {};
  const eggCollection = {};
  const shinyCollection = {};
  RARITIES.forEach((r) => {
    eggDefaults[r.name] = 0;
  });
  EGG_TYPES.forEach((egg) => {
    eggCollection[egg.id] = 0;
    shinyCollection[egg.id] = 0;
  });
  FUSION_EGG_TYPES.forEach((egg) => {
    eggCollection[egg.id] = 0;
  });

  const upgrades = {};
  SHOP_ITEMS.forEach((item) => {
    upgrades[item.id] = 0;
  });

  const gemUpgrades = {};
  GEM_SHOP_ITEMS.forEach((item) => {
    gemUpgrades[item.id] = 0;
  });

  const prestigeUpgrades = {};
  PRESTIGE_SHOP_ITEMS.forEach((item) => {
    prestigeUpgrades[item.id] = 0;
  });

  return {
    version: 1,
    username,
    coins: Number(userRecord.coins || 0),
    gems: Number(userRecord.gems || 0),
    eggs: eggDefaults,
    eggCollection,
    shinyCollection,
    lastEggId: null,
    discoveredEggs: {},
    discoveredShinyEggs: {},
    showcase: [],
    titles: ["newRoller"],
    activeTitle: "newRoller",
    upgrades,
    gemUpgrades,
    totalRolls: Number(userRecord.rolls || 0),
    rollsSincePrestige: 0,
    totalCoinsEarned: Number(userRecord.coins || 0),
    totalGemsEarned: Number(userRecord.gems || 0),
    rarestEgg: null,
    eventLog: [],
    completedSets: {},
    activeSetBonuses: {},
    hatchedCompanions: {},
    activeCompanionId: null,
    fusionCraftCount: 0,
    ascensionLevel: 0,
    ascensionPoints: 0,
    ascensionUpgrades: {},
    dicePurchases: 0,
    secondDieOwned: false,
    secondDiePurchases: 0,
    secondDieUpgrades: {},
    superLuckyRollAvailableAt: 0,
    currentEventId: null,
    currentEventGeneratedAt: 0,
    currentEventData: null,
    currentEventFetchedAt: 0,
    manualStreak: 0,
    lastManualRollAt: 0,
    luckyRollAvailableAt: 0,
    lastSessionAt: Date.now(),
    playtimeMs: 0,
    prestigeLevel: 0,
    prestigePoints: 0,
    prestigeUpgrades,
    incubator: [],
    relicsUnlocked: [],
    relicsEquipped: [],
    achievementsUnlocked: {},
    settings: {
      darkMode: false,
      soundEnabled: true,
      language: "en",
      activeTheme: "classic",
      unlockedThemes: ["classic"]
    },
    daily: {
      lastClaimAt: 0
    },
    stats: {
      rollsSinceLastEgg: 0,
      rollsSinceLastRarePlus: 0,
      jackpotsHit: 0
    },
    duelBuffExpiresAt: 0,
    lastSavedAt: 0,
    prestigeMilestonesClaimed: [],
    prestigeMilestoneLuck: 0,
    weeklyChallenges: { weekId: 0, tasks: {} },
    guildId: null,
    guildRole: null,
    seasonRolls: 0
  };
}

export function sanitizeState(s) {
  if (!s.eggs || typeof s.eggs !== "object") s.eggs = {};
  if (!s.upgrades || typeof s.upgrades !== "object") s.upgrades = {};
  if (!s.gemUpgrades || typeof s.gemUpgrades !== "object") s.gemUpgrades = {};
  if (!s.achievementsUnlocked || typeof s.achievementsUnlocked !== "object") s.achievementsUnlocked = {};
  if (!s.settings || typeof s.settings !== "object") s.settings = {};
  if (!s.daily || typeof s.daily !== "object") s.daily = { lastClaimAt: 0 };
  if (!s.shinyCollection || typeof s.shinyCollection !== "object") s.shinyCollection = {};
  if (!s.discoveredShinyEggs || typeof s.discoveredShinyEggs !== "object") s.discoveredShinyEggs = {};
  if (!Array.isArray(s.showcase)) s.showcase = [];
  if (!Array.isArray(s.titles)) s.titles = ["newRoller"];
  if (!s.stats || typeof s.stats !== "object") s.stats = {};

  if (!s.eggCollection || typeof s.eggCollection !== "object") {
    s.eggCollection = {};
    EGG_TYPES.forEach((egg) => {
      s.eggCollection[egg.id] = 0;
    });
    FUSION_EGG_TYPES.forEach((egg) => {
      s.eggCollection[egg.id] = 0;
    });
    RARITIES.forEach((r) => {
      const oldCount = Number(s.eggs[r.name] || 0);
      if (oldCount > 0 && EGG_VARIANTS[r.name]?.[0]) {
        s.eggCollection[EGG_VARIANTS[r.name][0].id] = oldCount;
      }
    });
  } else {
    EGG_TYPES.forEach((egg) => {
      s.eggCollection[egg.id] = Number(s.eggCollection[egg.id] || 0);
    });
    FUSION_EGG_TYPES.forEach((egg) => {
      s.eggCollection[egg.id] = Number(s.eggCollection[egg.id] || 0);
    });
  }

  EGG_TYPES.forEach((egg) => {
    s.shinyCollection[egg.id] = Number(s.shinyCollection[egg.id] || 0);
  });

  syncRarityTotals(s);
  SHOP_ITEMS.forEach((item) => {
    s.upgrades[item.id] = Number(s.upgrades[item.id] || 0);
  });
  GEM_SHOP_ITEMS.forEach((item) => {
    s.gemUpgrades[item.id] = Number(s.gemUpgrades[item.id] || 0);
  });

  s.coins = Number.isFinite(Number(s.coins)) ? Number(s.coins) : 0;
  s.gems = Number.isFinite(Number(s.gems)) ? Number(s.gems) : 0;
  s.totalRolls = Number(s.totalRolls || 0);
  s.rollsSincePrestige = Number(
    s.rollsSincePrestige !== undefined && s.rollsSincePrestige !== null
      ? s.rollsSincePrestige
      : s.prestigeLevel > 0
        ? s.totalRolls % PRESTIGE_TARGET_ROLLS
        : s.totalRolls
  );
  s.totalCoinsEarned = Number(s.totalCoinsEarned || 0);
  s.totalGemsEarned = Number(s.totalGemsEarned || 0);
  if (!Array.isArray(s.eventLog)) s.eventLog = [];
  if (!s.completedSets || typeof s.completedSets !== "object") s.completedSets = {};
  if (!s.activeSetBonuses || typeof s.activeSetBonuses !== "object") s.activeSetBonuses = {};
  if (!s.hatchedCompanions || typeof s.hatchedCompanions !== "object") s.hatchedCompanions = {};
  s.fusionCraftCount = Number(s.fusionCraftCount || 0);
  if (!s.ascensionUpgrades || typeof s.ascensionUpgrades !== "object") s.ascensionUpgrades = {};
  s.activeCompanionId = s.activeCompanionId || null;
  s.ascensionLevel = Number(s.ascensionLevel || 0);
  s.ascensionPoints = Number(s.ascensionPoints || 0);
  s.dicePurchases = Math.min(MAX_DICE_PURCHASES, Math.max(0, Number(s.dicePurchases || 0)));
  s.currentEventGeneratedAt = Number(s.currentEventGeneratedAt || 0);
  s.currentEventFetchedAt = Number(s.currentEventFetchedAt || 0);
  s.currentEventId = s.currentEventId || null;
  s.currentEventData = s.currentEventData && typeof s.currentEventData === "object" ? s.currentEventData : null;
  ASCENSION_CONFIG.upgrades.forEach((u) => {
    s.ascensionUpgrades[u.id] = Number(s.ascensionUpgrades[u.id] || 0);
  });
  s.manualStreak = Number(s.manualStreak || 0);
  s.lastManualRollAt = Number(s.lastManualRollAt || 0);
  s.luckyRollAvailableAt = Number(s.luckyRollAvailableAt || 0);
  s.secondDieOwned = !!s.secondDieOwned;
  s.secondDiePurchases = Math.min(MAX_SECOND_DIE_PURCHASES, Math.max(0, Number(s.secondDiePurchases ?? 0)));
  if (!s.secondDieUpgrades || typeof s.secondDieUpgrades !== "object") s.secondDieUpgrades = {};
  SECOND_DIE_RPS_ITEMS.forEach((item) => {
    s.secondDieUpgrades[item.id] = Number(s.secondDieUpgrades[item.id] || 0);
  });
  s.superLuckyRollAvailableAt = Number(s.superLuckyRollAvailableAt || 0);
  s.lastSessionAt = Number(s.lastSessionAt || Date.now());
  s.playtimeMs = Number(s.playtimeMs || 0);
  s.prestigeLevel = Number(s.prestigeLevel || 0);
  s.prestigePoints = Number(s.prestigePoints || 0);
  if (!s.prestigeUpgrades || typeof s.prestigeUpgrades !== "object") s.prestigeUpgrades = {};
  PRESTIGE_SHOP_ITEMS.forEach((item) => {
    s.prestigeUpgrades[item.id] = Number(s.prestigeUpgrades[item.id] || 0);
  });
  if (!Array.isArray(s.incubator)) s.incubator = [];
  if (!Array.isArray(s.relicsUnlocked)) s.relicsUnlocked = [];
  if (!Array.isArray(s.relicsEquipped)) s.relicsEquipped = [];
  s.daily.lastClaimAt = Number(s.daily.lastClaimAt || 0);
  s.stats.rollsSinceLastEgg = Number(s.stats.rollsSinceLastEgg || 0);
  s.stats.rollsSinceLastRarePlus = Number(s.stats.rollsSinceLastRarePlus || 0);
  s.stats.jackpotsHit = Number(s.stats.jackpotsHit || 0);
  s.duelBuffExpiresAt = Number(s.duelBuffExpiresAt || 0);
  s.activeTitle = s.activeTitle || s.titles[0] || "newRoller";
  s.settings.darkMode = !!s.settings.darkMode;
  s.settings.soundEnabled = s.settings.soundEnabled !== false;
  s.settings.language = s.settings.language === "zh" ? "zh" : "en";
  if (!Array.isArray(s.settings.unlockedThemes)) s.settings.unlockedThemes = ["classic"];
  if (!s.settings.unlockedThemes.includes("classic")) s.settings.unlockedThemes.unshift("classic");
  s.settings.activeTheme = s.settings.activeTheme || "classic";
  if (!s.settings.unlockedThemes.includes(s.settings.activeTheme)) {
    s.settings.activeTheme = "classic";
  }
  s.lastSavedAt = Number(s.lastSavedAt || 0);
  if (!Array.isArray(s.prestigeMilestonesClaimed)) s.prestigeMilestonesClaimed = [];
  s.prestigeMilestoneLuck = Number(s.prestigeMilestoneLuck || 0);
  if (!s.weeklyChallenges || typeof s.weeklyChallenges !== "object") {
    s.weeklyChallenges = { weekId: 0, tasks: {} };
  }
  if (!s.weeklyChallenges.tasks || typeof s.weeklyChallenges.tasks !== "object") {
    s.weeklyChallenges.tasks = {};
  }
  s.weeklyChallenges.weekId = Number(s.weeklyChallenges.weekId || 0);
  s.guildId = s.guildId || null;
  s.guildRole = s.guildRole || null;
  s.seasonRolls = Number(s.seasonRolls || 0);
  if (!s.settings.filters || typeof s.settings.filters !== "object") {
    s.settings.filters = { collectionSearch: "", codexSearch: "", collectionRarity: "all", collectionOwned: "all", codexRarity: "all", codexOwned: "all", codexShinyOnly: false, shopSearch: "", gemShopSearch: "" };
  }
  if (!s.discoveredEggs || typeof s.discoveredEggs !== "object") s.discoveredEggs = {};
  EGG_TYPES.forEach((egg) => {
    if (Number(s.eggCollection[egg.id] || 0) > 0) {
      s.discoveredEggs[egg.id] = true;
    }
    if (Number(s.shinyCollection[egg.id] || 0) > 0) {
      s.discoveredShinyEggs[egg.id] = true;
    }
  });
  FUSION_EGG_TYPES.forEach((egg) => {
    if (Number(s.eggCollection[egg.id] || 0) > 0) {
      s.discoveredEggs[egg.id] = true;
    }
  });
  s.showcase = s.showcase
    .filter((item) => item && typeof item === "object" && typeof item.eggId === "string")
    .slice(0, 3)
    .map((item) => ({ eggId: item.eggId, shiny: !!item.shiny }));
}

export function markEggDiscovered(state, eggId) {
  if (!state || !eggId) return;
  if (!state.discoveredEggs || typeof state.discoveredEggs !== "object") {
    state.discoveredEggs = {};
  }
  state.discoveredEggs[eggId] = true;
}

export function isEggDiscovered(state, eggId) {
  if (!state || !eggId) return false;
  return !!state.discoveredEggs?.[eggId] || Number(state.eggCollection?.[eggId] || 0) > 0;
}

export function markShinyDiscovered(state, eggId) {
  if (!state || !eggId) return;
  if (!state.discoveredShinyEggs || typeof state.discoveredShinyEggs !== "object") {
    state.discoveredShinyEggs = {};
  }
  state.discoveredShinyEggs[eggId] = true;
}

export function isShinyDiscovered(state, eggId) {
  if (!state || !eggId) return false;
  return !!state.discoveredShinyEggs?.[eggId] || Number(state.shinyCollection?.[eggId] || 0) > 0;
}

export function deepMerge(base, override) {
  if (typeof base !== "object" || base === null) return override;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  Object.keys(override || {}).forEach((key) => {
    const baseVal = out[key];
    const overVal = override[key];
    if (typeof baseVal === "object" && baseVal && typeof overVal === "object" && overVal) {
      out[key] = deepMerge(baseVal, overVal);
    } else {
      out[key] = overVal;
    }
  });
  return out;
}

export function chooseMostRecentSave(localSave, remoteSave) {
  if (!localSave && !remoteSave) return null;
  if (localSave && !remoteSave) return localSave;
  if (!localSave && remoteSave) return remoteSave;
  const localTs = Number(localSave.lastSavedAt || 0);
  const remoteTs = Number(remoteSave.lastSavedAt || 0);
  return remoteTs > localTs ? remoteSave : localSave;
}
