/* Game data: rarities, eggs, shops, fusion recipes, progression config. */
export const API_TIMEOUT_MS = 8000;

  // Ordered by rarity from most common to most rare.
export const RARITIES = [
    { name: "Common", oneIn: 2, color: "#9ca3af", gemValue: 0 },
    { name: "Uncommon", oneIn: 10, color: "#22c55e", gemValue: 0 },
    { name: "Rare", oneIn: 100, color: "#3b82f6", gemValue: 2 },
    { name: "Epic", oneIn: 1000, color: "#a855f7", gemValue: 5 },
    { name: "Legendary", oneIn: 10000, color: "#f59e0b", gemValue: 12 },
    { name: "Fabled", oneIn: 50000, color: "#eab308", gemValue: 20 },
    { name: "Mythic", oneIn: 100000, color: "#ef4444", gemValue: 32 },
    { name: "Divine", oneIn: 1000000, color: "#f43f5e", gemValue: 85 },
    { name: "Celestial", oneIn: 10000000, color: "#06b6d4", gemValue: 250 },
    { name: "Void", oneIn: 100000000, color: "#111827", gemValue: 1000 },
    { name: "Astral", oneIn: 1000000000, color: "#6366f1", gemValue: 3500 },
    { name: "Ethereal", oneIn: 10000000000, color: "#d946ef", gemValue: 12000 },
    { name: "Omnipotent", oneIn: 100000000000, color: "#fcd34d", gemValue: 45000 },
    { name: "Infinity", oneIn: 1000000000000, color: "#ffffff", gemValue: 150000 },
    { name: "Absolute", oneIn: 10000000000000, color: "#000000", gemValue: 500000 }
  ];

export const EGG_VARIANTS = {
    Common: [
      { id: "common_barn", name: "Barn Egg", description: "A warm egg from the starter coop." },
      { id: "common_pebble", name: "Pebble Egg", description: "Gray and smooth like a river stone." },
      { id: "common_clover", name: "Clover Egg", description: "Green speckles rumored to bring luck." },
      { id: "common_dusk", name: "Dusk Egg", description: "Soft purple shell found at twilight." },
      { id: "common_hay", name: "Hay Egg", description: "Straw-colored and faintly sweet-smelling." },
      { id: "common_mist", name: "Mist Egg", description: "Pale white shell beaded with dew." }
    ],
    Uncommon: [
      { id: "uncommon_moss", name: "Moss Egg", description: "Damp forest moss clings to its shell." },
      { id: "uncommon_fern", name: "Fern Egg", description: "Leafy patterns spiral around the base." },
      { id: "uncommon_bamboo", name: "Bamboo Egg", description: "Pale green with segmented ridges." },
      { id: "uncommon_creek", name: "Creek Egg", description: "Cool to the touch, faintly rippled." },
      { id: "uncommon_thistle", name: "Thistle Egg", description: "Purple spines ring the crown." },
      { id: "uncommon_vine", name: "Vine Egg", description: "Twining green lines crawl across the shell." }
    ],
    Rare: [
      { id: "rare_sapphire", name: "Sapphire Egg", description: "Deep blue gem-like shell." },
      { id: "rare_cobalt", name: "Cobalt Egg", description: "Dark blue with a metallic sheen." },
      { id: "rare_azure", name: "Azure Egg", description: "Bright sky-blue and highly polished." },
      { id: "rare_indigo", name: "Indigo Egg", description: "Midnight blue with silver flecks." },
      { id: "rare_lapis", name: "Lapis Egg", description: "Gold veins streak through deep blue stone." },
      { id: "rare_teal", name: "Teal Egg", description: "Ocean-green shimmer under light." }
    ],
    Epic: [
      { id: "epic_arcane", name: "Arcane Egg", description: "Crackling with unstable magic." },
      { id: "epic_rune", name: "Rune Egg", description: "Ancient symbols glow on the shell." },
      { id: "epic_hex", name: "Hex Egg", description: "A cursed violet aura surrounds it." },
      { id: "epic_spell", name: "Spell Egg", description: "Hums with forgotten incantations." },
      { id: "epic_crystal", name: "Crystal Egg", description: "Faceted shell refracts rainbow light." },
      { id: "epic_mystic", name: "Mystic Egg", description: "Arcane mist coils around its base." }
    ],
    Legendary: [
      { id: "legendary_golden", name: "Golden Egg", description: "Pure gold luster, collector favorite." },
      { id: "legendary_solar", name: "Solar Egg", description: "Warm like sunlight at noon." },
      { id: "legendary_midas", name: "Midas Egg", description: "Everything it touches turns valuable." },
      { id: "legendary_aurora", name: "Aurora Egg", description: "Shifts colors like northern lights." },
      { id: "legendary_crown", name: "Crown Egg", description: "Tiny golden spikes form a regal ring." },
      { id: "legendary_dawn", name: "Dawn Egg", description: "Rose-gold shell that brightens at sunrise." }
    ],
    Fabled: [
      { id: "fabled_suncrest", name: "Suncrest Egg", description: "Crowned with a golden halo." },
      { id: "fabled_halcyon", name: "Halcyon Egg", description: "Calm seas are said to follow it." },
      { id: "fabled_radiant", name: "Radiant Egg", description: "Blazes softly in the dark." },
      { id: "fabled_gilded", name: "Gilded Egg", description: "Ornate filigree wraps the shell." },
      { id: "fabled_solstice", name: "Solstice Egg", description: "Marks the longest day in gold filigree." },
      { id: "fabled_zenith", name: "Zenith Egg", description: "Glows brightest at high noon." }
    ],
    Mythic: [
      { id: "mythic_crimson", name: "Crimson Egg", description: "Blood-red and fiercely hot." },
      { id: "mythic_ember", name: "Ember Egg", description: "Smolders with inner fire." },
      { id: "mythic_inferno", name: "Inferno Egg", description: "Flames dance across the surface." },
      { id: "mythic_bloodstone", name: "Bloodstone Egg", description: "Dark red with black veins." },
      { id: "mythic_magma", name: "Magma Egg", description: "Molten cracks pulse with orange light." },
      { id: "mythic_scorch", name: "Scorch Egg", description: "Charred shell that never cools." }
    ],
    Divine: [
      { id: "divine_seraph", name: "Seraph Egg", description: "Feather-light and holy bright." },
      { id: "divine_halo", name: "Halo Egg", description: "Ringed by a faint golden light." },
      { id: "divine_grace", name: "Grace Egg", description: "Blessed by impossible odds." },
      { id: "divine_sanctum", name: "Sanctum Egg", description: "Sacred relic of the rollers." },
      { id: "divine_choir", name: "Choir Egg", description: "Soft chimes echo when it rolls." },
      { id: "divine_relic", name: "Relic Egg", description: "Ancient blessing sealed in ivory shell." }
    ],
    Celestial: [
      { id: "celestial_nebula", name: "Nebula Egg", description: "Swirls with cosmic dust." },
      { id: "celestial_comet", name: "Comet Egg", description: "Streaks of light trail behind it." },
      { id: "celestial_orbit", name: "Orbit Egg", description: "Tiny moons circle the shell." },
      { id: "celestial_pulsar", name: "Pulsar Egg", description: "Pulses with rhythmic starlight." },
      { id: "celestial_lunar", name: "Lunar Egg", description: "Silver craters pock the pale surface." },
      { id: "celestial_stellar", name: "Stellar Egg", description: "Pinprick stars scatter across indigo." }
    ],
    Void: [
      { id: "void_abyss", name: "Abyss Egg", description: "Light vanishes near its surface." },
      { id: "void_null", name: "Null Egg", description: "Completely absorbs nearby sound." },
      { id: "void_oblivion", name: "Oblivion Egg", description: "Forgotten by probability itself." },
      { id: "void_eclipse", name: "Eclipse Egg", description: "Dark as a moonless night." },
      { id: "void_hollow", name: "Hollow Egg", description: "Feels empty even when held." },
      { id: "void_rift", name: "Rift Egg", description: "Hairline cracks leak shadowy mist." }
    ],
    Astral: [
      { id: "astral_cosmos", name: "Cosmos Egg", description: "Contains a miniature galaxy." },
      { id: "astral_quasar", name: "Quasar Egg", description: "Blazes with distant energy." },
      { id: "astral_galaxy", name: "Galaxy Egg", description: "Spiral arms spin on the shell." },
      { id: "astral_supernova", name: "Supernova Egg", description: "Born from a dying star." },
      { id: "astral_neutron", name: "Neutron Egg", description: "Dense shell that bends light around it." },
      { id: "astral_parallax", name: "Parallax Egg", description: "Shifts position when viewed from angles." }
    ],
    Ethereal: [
      { id: "ethereal_phantom", name: "Phantom Egg", description: "Semi-transparent and ghostly." },
      { id: "ethereal_wisp", name: "Wisp Egg", description: "Drifts slightly when untouched." },
      { id: "ethereal_mirage", name: "Mirage Egg", description: "Shimmers between forms." },
      { id: "ethereal_specter", name: "Specter Egg", description: "Flickers in and out of view." },
      { id: "ethereal_veil", name: "Veil Egg", description: "Soft focus, like seen through fog." },
      { id: "ethereal_echo", name: "Echo Egg", description: "Leaves a faint afterimage when moved." }
    ],
    Omnipotent: [
      { id: "omnipotent_titan", name: "Titan Egg", description: "Heavy with creation energy." },
      { id: "omnipotent_sovereign", name: "Sovereign Egg", description: "Rules over lesser eggs." },
      { id: "omnipotent_dominus", name: "Dominus Egg", description: "Commands raw divine power." },
      { id: "omnipotent_apex", name: "Apex Egg", description: "Peak of all egg evolution." },
      { id: "omnipotent_colossus", name: "Colossus Egg", description: "Impossibly dense with latent force." },
      { id: "omnipotent_throne", name: "Throne Egg", description: "Lesser eggs seem to bow nearby." }
    ],
    Infinity: [
      { id: "infinity_eternal", name: "Eternal Egg", description: "Never stops existing." },
      { id: "infinity_boundless", name: "Boundless Egg", description: "No limit to its potential." },
      { id: "infinity_limitless", name: "Limitless Egg", description: "Value beyond measurement." },
      { id: "infinity_evermore", name: "Evermore Egg", description: "Lasts through all rebirths." },
      { id: "infinity_loop", name: "Loop Egg", description: "Its pattern repeats without end." },
      { id: "infinity_horizon", name: "Horizon Egg", description: "The shell seems to stretch forever." }
    ],
    Absolute: [
      { id: "absolute_zenith", name: "Zenith Egg", description: "The highest point of rarity." },
      { id: "absolute_omega", name: "Omega Egg", description: "The final egg in any collection." },
      { id: "absolute_primordial", name: "Primordial Egg", description: "Predates all other eggs." },
      { id: "absolute_core", name: "Absolute Core", description: "One in ten trillion. Pure myth." },
      { id: "absolute_nadir", name: "Nadir Egg", description: "Impossibly rare, impossibly deep." },
      { id: "absolute_singularity", name: "Singularity Egg", description: "All odds collapse into this shell." }
    ]
  };

export const EGG_TYPES = [];
export const EGG_BY_ID = {};
  RARITIES.forEach((rarity) => {
    (EGG_VARIANTS[rarity.name] || []).forEach((variant) => {
      const eggType = {
        ...variant,
        rarity: rarity.name,
        color: rarity.color,
        oneIn: rarity.oneIn,
        gemValue: rarity.gemValue
      };
      EGG_TYPES.push(eggType);
      EGG_BY_ID[eggType.id] = eggType;
    });
  });

  // Auto rollers and upgrades. Cost scales exponentially.
export const SHOP_ITEMS = [
    { id: "auto1", type: "auto", name: "Auto Roller I", baseCost: 30, growth: 1.35, effect: 1 },
    { id: "auto2", type: "auto", name: "Auto Roller II", baseCost: 250, growth: 1.38, effect: 2 },
    { id: "auto3", type: "auto", name: "Auto Roller III", baseCost: 2000, growth: 1.42, effect: 5 },
    { id: "auto4", type: "auto", name: "Auto Roller IV", baseCost: 15000, growth: 1.48, effect: 12 },
    { id: "auto5", type: "auto", name: "Auto Roller V", baseCost: 120000, growth: 1.56, effect: 30 },
    { id: "luck", type: "upgrade", name: "Luck Upgrade", baseCost: 80, growth: 1.45, effect: 0.07 },
    { id: "coinMult", type: "upgrade", name: "Coin Multiplier", baseCost: 120, growth: 1.5, effect: 0.2 },
    { id: "fastRoll", type: "upgrade", name: "Faster Roll Speed", baseCost: 160, growth: 1.48, effect: 0.15 },
    { id: "eggValue", type: "upgrade", name: "Egg Value Boost", baseCost: 220, growth: 1.53, effect: 0.2 }
  ];

  // Permanent upgrades bought with gems.
export const THEME_SHOP = [
    { id: "classic", name: "Classic", cost: 0, desc: "Clean default look", swatch: "linear-gradient(135deg, #5b7cfa, #22c55e)" },
    { id: "meadow", name: "Meadow", cost: 100, desc: "Fresh greens and soft sunlight", swatch: "linear-gradient(135deg, #22c55e, #84cc16)" },
    { id: "sunset", name: "Sunset", cost: 800, desc: "Warm oranges and pink skies", swatch: "linear-gradient(135deg, #f97316, #ec4899)" },
    { id: "ocean", name: "Ocean", cost: 4000, desc: "Deep blues and sea foam", swatch: "linear-gradient(135deg, #0ea5e9, #06b6d4)" },
    { id: "neon", name: "Neon", cost: 15000, desc: "Cyberpunk glow and electric accents", swatch: "linear-gradient(135deg, #a855f7, #22d3ee)" },
    { id: "sakura", name: "Sakura", cost: 60000, desc: "Cherry blossom pinks", swatch: "linear-gradient(135deg, #f472b6, #fda4af)" },
    { id: "ember", name: "Ember", cost: 200000, desc: "Molten gold and fire tones", swatch: "linear-gradient(135deg, #ef4444, #f59e0b)" },
    { id: "void", name: "Void", cost: 750000, desc: "Dark purple abyss aesthetic", swatch: "linear-gradient(135deg, #312e81, #111827)" },
    { id: "celestial", name: "Celestial", cost: 1000000, desc: "Starlight gold — the ultimate flex", swatch: "linear-gradient(135deg, #6366f1, #fbbf24)" }
  ];

export const THEME_BY_ID = Object.fromEntries(THEME_SHOP.map((theme) => [theme.id, theme]));

export const GEM_SHOP_ITEMS = [
    { id: "gemLuck", name: "Gem Luck Boost", baseCost: 25, growth: 1.55, effect: 0.1 },
    { id: "gemCoins", name: "Gem Coin Surge", baseCost: 40, growth: 1.5, effect: 0.15 },
    { id: "gemAuto", name: "Gem Auto Boost", baseCost: 60, growth: 1.58, effect: 0.5 },
    { id: "gemValue", name: "Gem Sell Boost", baseCost: 35, growth: 1.52, effect: 0.25 },
    { id: "gemPrestige", name: "Gem Prestige Power", baseCost: 100, growth: 1.65, effect: 0.05 }
  ];

export const SHINY_BASE_ONE_IN = 50;
export const SHINY_GEM_MULTIPLIER = 2;
export const JACKPOT_ONE_IN = 1000;
export const JACKPOT_COIN_MULTIPLIER = 100;
export const SHOWCASE_SLOT_COUNT = 3;

export const ACHIEVEMENTS = [
    { id: "roll_100", title: "Roll Initiate", check: (s) => s.totalRolls >= 100, rewardGems: 5 },
    { id: "roll_1k", title: "Dice Grinder", check: (s) => s.totalRolls >= 1000, rewardGems: 20 },
    { id: "roll_10k", title: "Idle Veteran", check: (s) => s.totalRolls >= 10000, rewardGems: 70 },
    { id: "coins_1m", title: "Coin Tycoon", check: (s) => s.totalCoinsEarned >= 1000000, rewardGems: 40 },
    { id: "gems_500", title: "Gem Hoarder", check: (s) => s.totalGemsEarned >= 500, rewardGems: 50 },
    { id: "rare_egg", title: "Rare Collector", check: (s) => getRarityEggCount(s, "Rare") > 0, rewardGems: 10 },
    { id: "epic_egg", title: "Epic Discoverer", check: (s) => getRarityEggCount(s, "Epic") > 0, rewardGems: 30 },
    { id: "legendary_egg", title: "Legendary Hunter", check: (s) => getRarityEggCount(s, "Legendary") > 0, rewardGems: 120 },
    { id: "void_egg", title: "Abyss Toucher", check: (s) => getRarityEggCount(s, "Void") > 0, rewardGems: 500 },
    { id: "astral_egg", title: "Cosmic Witness", check: (s) => getRarityEggCount(s, "Astral") > 0, rewardGems: 2000 },
    { id: "infinity_egg", title: "Boundless Finder", check: (s) => getRarityEggCount(s, "Infinity") > 0, rewardGems: 10000 },
    { id: "absolute_egg", title: "The Absolute One", check: (s) => getRarityEggCount(s, "Absolute") > 0, rewardGems: 50000 },
    { id: "first_shiny", title: "Shiny Spark", check: (s) => getTotalShinyCount(s) > 0, rewardGems: 25 },
    { id: "shiny_10", title: "Glitter Hoard", check: (s) => getTotalShinyCount(s) >= 10, rewardGems: 120 },
    { id: "shiny_divine", title: "Radiant Miracle", check: (s) => getHighestShinyRarityIndex(s) >= getRarityIndex("Divine"), rewardGems: 600 },
    { id: "jackpot_1", title: "Jackpot Roller", check: (s) => Number(s.stats?.jackpotsHit || 0) > 0, rewardGems: 35 }
  ];

export const TITLE_CONFIG = [
    { id: "newRoller", label: "New Roller", check: () => true },
    { id: "diceGrinder", label: "Dice Grinder", check: (s) => Number(s.totalRolls || 0) >= 1000 },
    { id: "codexHunter", label: "Codex Hunter", check: (s) => getCodexFoundCount(s) >= 25 },
    { id: "codexMaster", label: "Codex Master", check: (s) => getCodexFoundCount(s) >= EGG_TYPES.length + FUSION_EGG_TYPES.length },
    { id: "shinyCollector", label: "Shiny Collector", check: (s) => getTotalShinyCount(s) >= 5 },
    { id: "voidWalker", label: "Void Walker", check: (s) => getRarityEggCount(s, "Void") > 0 },
    { id: "absoluteOne", label: "Absolute One", check: (s) => getRarityEggCount(s, "Absolute") > 0 }
  ];

export function getRarityEggCount(saveState, rarityName) {
    if (!saveState) return 0;
    if (saveState.eggCollection) {
      return (EGG_VARIANTS[rarityName] || []).reduce((sum, variant) => {
        return sum + Number(saveState.eggCollection[variant.id] || 0);
      }, 0);
    }
    return Number(saveState.eggs?.[rarityName] || 0);
  }

export function getCodexFoundCount(saveState) {
    if (!saveState) return 0;
    return [...EGG_TYPES, ...FUSION_EGG_TYPES].reduce((sum, egg) => {
      const discovered = !!saveState.discoveredEggs?.[egg.id] || Number(saveState.eggCollection?.[egg.id] || 0) > 0;
      return sum + (discovered ? 1 : 0);
    }, 0);
  }

export function getTotalShinyCount(saveState) {
    if (!saveState?.shinyCollection) return 0;
    return EGG_TYPES.reduce((sum, egg) => sum + Number(saveState.shinyCollection[egg.id] || 0), 0);
  }

export function getShinyCodexFoundCount(saveState) {
    if (!saveState) return 0;
    return EGG_TYPES.reduce((sum, egg) => {
      const discovered = !!saveState.discoveredShinyEggs?.[egg.id] || Number(saveState.shinyCollection?.[egg.id] || 0) > 0;
      return sum + (discovered ? 1 : 0);
    }, 0);
  }

export function getHighestShinyRarityIndex(saveState) {
    if (!saveState) return -1;
    return EGG_TYPES.reduce((best, egg) => {
      const discovered = !!saveState.discoveredShinyEggs?.[egg.id] || Number(saveState.shinyCollection?.[egg.id] || 0) > 0;
      return discovered ? Math.max(best, getRarityIndex(egg.rarity)) : best;
    }, -1);
  }

export function getEarnedTitles(saveState) {
    return TITLE_CONFIG.filter((title) => title.check(saveState)).map((title) => title.id);
  }

export function getTitleLabel(titleId) {
    return TITLE_CONFIG.find((title) => title.id === titleId)?.label || "New Roller";
  }

export function syncRarityTotals(saveState) {
    if (!saveState.eggs || typeof saveState.eggs !== "object") saveState.eggs = {};
    RARITIES.forEach((r) => {
      saveState.eggs[r.name] = getRarityEggCount(saveState, r.name);
    });
  }

export function pickRandomEggForRarity(rarityName) {
    const variants = EGG_VARIANTS[rarityName] || [];
    if (variants.length === 0) return null;
    const picked = variants[Math.floor(Math.random() * variants.length)];
    const rarity = RARITIES.find((r) => r.name === rarityName);
    return {
      ...picked,
      rarity: rarityName,
      color: rarity.color,
      oneIn: rarity.oneIn,
      gemValue: rarity.gemValue
    };
  }

export const PRESTIGE_TARGET_ROLLS = 5000;
export const DAILY_REWARD_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const SAVE_INTERVAL_MS = 5000;
export const LUCKY_ROLL_COST_GEMS = 50;
export const LUCKY_ROLL_COOLDOWN_MS = 15 * 1000;
export const SECOND_DIE_GEM_COST = 250;
export const SUPER_LUCKY_ROLL_COST_GEMS = LUCKY_ROLL_COST_GEMS;
export const SUPER_LUCKY_ROLL_COOLDOWN_MS = LUCKY_ROLL_COOLDOWN_MS;
export const SUPER_LUCKY_LUCK_MULT = 4;
export const SECOND_DIE_BASE_RPS = 1;
export const SECOND_DIE_TIER_UPGRADE_COSTS = [175, 350];
export const STREAK_TIMEOUT_MS = 6000;
export const STREAK_BONUS_STEP = 0.02;
export const STREAK_BONUS_MAX = 1.0;
export const OFFLINE_ROLL_EFFICIENCY = 0.75;
export const OFFLINE_MAX_MS = 8 * 60 * 60 * 1000;
export const OFFLINE_MAX_ROLLS = 25000;
export const OFFLINE_MAX_ROLLS_LOGIN_MOBILE = 250;
export const OFFLINE_MAX_ROLLS_LOGIN_DES = 2000;
export const OFFLINE_PENDING_CHUNK_MOBILE = 30;
export const OFFLINE_PENDING_CHUNK_DES = 80;
export const OFFLINE_ROLL_CHUNK = 80;
export const MAX_ROLLS_PER_TICK = 150;
export const MAX_ROLLS_PER_TICK_MOBILE = 40;
export const UI_REFRESH_MS = 250;
export const UI_REFRESH_MS_MOBILE = 600;
export const EVENT_LOG_LIMIT = 20;

export const TAB_ORDER = ["roll", "collection", "shops", "progression", "social", "stats", "settings"];

export const SET_BONUS_CONFIG = {
    Common: { bonusId: "setCommon", label: "+5% manual streak value", type: "streak", value: 0.05 },
    Uncommon: { bonusId: "setUncommon", label: "+3% luck", type: "luck", value: 0.03 },
    Rare: { bonusId: "setRare", label: "+5% egg sell value", type: "eggValue", value: 0.05 },
    Epic: { bonusId: "setEpic", label: "+8% coin gain", type: "coins", value: 0.08 },
    Legendary: { bonusId: "setLegendary", label: "+0.5 rolls/sec", type: "rps", value: 0.5 },
    Fabled: { bonusId: "setFabled", label: "+4% daily reward", type: "daily", value: 0.04 },
    Mythic: { bonusId: "setMythic", label: "+10% lucky roll quality", type: "lucky", value: 0.1 },
    Divine: { bonusId: "setDivine", label: "+0.75 rolls/sec", type: "rps", value: 0.75 },
    Celestial: { bonusId: "setCelestial", label: "+7% luck", type: "luck", value: 0.07 },
    Void: { bonusId: "setVoid", label: "+10% coin gain", type: "coins", value: 0.1 },
    Astral: { bonusId: "setAstral", label: "+12% egg sell value", type: "eggValue", value: 0.12 },
    Ethereal: { bonusId: "setEthereal", label: "+15% offline efficiency", type: "offline", value: 0.15 },
    Omnipotent: { bonusId: "setOmnipotent", label: "+12% daily reward", type: "daily", value: 0.12 },
    Infinity: { bonusId: "setInfinity", label: "+20% lucky roll quality", type: "lucky", value: 0.2 },
    Absolute: { bonusId: "setAbsolute", label: "+25% global luck", type: "luck", value: 0.25 }
  };

export const COMPANION_VARIANTS = [
    { id: "rare_sapphire", rarity: "Rare", name: "Sapphire Sprite", buffType: "luck", buffValue: 0.08, hatchCost: 45 },
    { id: "epic_arcane", rarity: "Epic", name: "Arcane Wisp", buffType: "coins", buffValue: 0.12, hatchCost: 80 },
    { id: "legendary_golden", rarity: "Legendary", name: "Golden Drake", buffType: "rps", buffValue: 0.8, hatchCost: 130 },
    { id: "mythic_crimson", rarity: "Mythic", name: "Crimson Emberling", buffType: "eggValue", buffValue: 0.15, hatchCost: 180 },
    { id: "void_abyss", rarity: "Void", name: "Abyss Raven", buffType: "offline", buffValue: 0.2, hatchCost: 260 }
  ];

  // Fusion-only eggs (not rolled naturally) crafted from mixed ingredients.
export const FUSION_EGG_TYPES = [
    { id: "fusion_prism", name: "Prism Egg", rarity: "Fusion", color: "#22d3ee", gemValue: 220, description: "A refracted shell made from layered rarities." },
    { id: "fusion_chimera", name: "Chimera Egg", rarity: "Fusion", color: "#f97316", gemValue: 340, description: "A patchwork egg made from mixed bloodlines." },
    { id: "fusion_nova", name: "Nova Egg", rarity: "Fusion", color: "#facc15", gemValue: 500, description: "Shines like a tiny exploding star." },
    { id: "fusion_seraphic", name: "Seraphic Egg", rarity: "Fusion", color: "#fda4af", gemValue: 800, description: "A blessed hybrid pulsing with divine light." },
    { id: "fusion_eclipse", name: "Eclipse Egg", rarity: "Fusion", color: "#6366f1", gemValue: 1250, description: "Half light, half shadow, fully unstable." },
    { id: "fusion_abyssal", name: "Abyssal Alloy Egg", rarity: "Fusion", color: "#1f2937", gemValue: 1900, description: "Forged from deep void fragments." },
    { id: "fusion_astral", name: "Astral Matrix Egg", rarity: "Fusion", color: "#818cf8", gemValue: 2800, description: "Its shell maps constellations in motion." },
    { id: "fusion_omega", name: "Omega Bloom Egg", rarity: "Fusion", color: "#e879f9", gemValue: 4200, description: "A late-game composite with endless potential." },
    { id: "fusion_infinite", name: "Infinite Spiral Egg", rarity: "Fusion", color: "#ffffff", gemValue: 6800, description: "A spiraling paradox bound by chance." },
    { id: "fusion_absolute", name: "Absolute Nexus Egg", rarity: "Fusion", color: "#0f172a", gemValue: 12000, description: "The apex fusion made of impossible parts." },
    { id: "fusion_supernova", name: "Supernova Core Egg", rarity: "Fusion", color: "#fb7185", gemValue: 18000, description: "Two fusions collapse into a stellar heart." },
    { id: "fusion_singularity", name: "Singularity Egg", rarity: "Fusion", color: "#a78bfa", gemValue: 26000, description: "Compressed fusion matter in a tiny shell." },
    { id: "fusion_paragon", name: "Paragon Forge Egg", rarity: "Fusion", color: "#34d399", gemValue: 36000, description: "A perfected fusion born from balance." },
    { id: "fusion_transcendent", name: "Transcendent Aegis Egg", rarity: "Fusion", color: "#f59e0b", gemValue: 52000, description: "A super fusion wrapped in luminous armor." },
    { id: "fusion_omnistar", name: "Omnistar Egg", rarity: "Fusion", color: "#60a5fa", gemValue: 76000, description: "A cosmic super fusion that bends odds." },
    { id: "fusion_cascade", name: "Cascade Egg", rarity: "Fusion", color: "#2dd4bf", gemValue: 950, description: "Layered shells from many rarity streams." },
    { id: "fusion_radiant", name: "Radiant Crown Egg", rarity: "Fusion", color: "#fde047", gemValue: 2400, description: "Sunlit tiers fused into one blazing shell." },
    { id: "fusion_phantom", name: "Phantom Lattice Egg", rarity: "Fusion", color: "#c084fc", gemValue: 6200, description: "Ghost-light woven through astral matter." }
  ];

export function getVariantId(rarityName, index) {
    return EGG_VARIANTS[rarityName]?.[index]?.id || null;
  }

export const FUSION_RECIPES = [
    { id: "fuse_prism_1", resultId: "fusion_prism", name: "Prismatic Weave", ingredients: [{ eggId: getVariantId("Common", 0), count: 3 }, { eggId: getVariantId("Uncommon", 1), count: 2 }, { eggId: getVariantId("Rare", 2), count: 1 }] },
    { id: "fuse_prism_2", resultId: "fusion_prism", name: "Rainbow Compression", ingredients: [{ eggId: getVariantId("Common", 2), count: 3 }, { eggId: getVariantId("Rare", 0), count: 1 }, { eggId: getVariantId("Epic", 1), count: 1 }] },
    { id: "fuse_chimera_1", resultId: "fusion_chimera", name: "Chimera Stitch", ingredients: [{ eggId: getVariantId("Rare", 1), count: 2 }, { eggId: getVariantId("Epic", 0), count: 1 }, { eggId: getVariantId("Legendary", 2), count: 1 }] },
    { id: "fuse_chimera_2", resultId: "fusion_chimera", name: "Tri-Lineage Merge", ingredients: [{ eggId: getVariantId("Uncommon", 3), count: 4 }, { eggId: getVariantId("Rare", 3), count: 2 }, { eggId: getVariantId("Epic", 2), count: 1 }] },
    { id: "fuse_nova_1", resultId: "fusion_nova", name: "Nova Ignition", ingredients: [{ eggId: getVariantId("Epic", 3), count: 2 }, { eggId: getVariantId("Legendary", 0), count: 1 }, { eggId: getVariantId("Fabled", 1), count: 1 }] },
    { id: "fuse_nova_2", resultId: "fusion_nova", name: "Starforge Core", ingredients: [{ eggId: getVariantId("Legendary", 2), count: 1 }, { eggId: getVariantId("Mythic", 0), count: 1 }, { eggId: getVariantId("Divine", 3), count: 1 }] },
    { id: "fuse_seraphic_1", resultId: "fusion_seraphic", name: "Seraph Blessing", ingredients: [{ eggId: getVariantId("Divine", 0), count: 1 }, { eggId: getVariantId("Celestial", 1), count: 1 }, { eggId: getVariantId("Mythic", 2), count: 2 }] },
    { id: "fuse_seraphic_2", resultId: "fusion_seraphic", name: "Halo Distillation", ingredients: [{ eggId: getVariantId("Fabled", 0), count: 2 }, { eggId: getVariantId("Divine", 2), count: 1 }, { eggId: getVariantId("Celestial", 0), count: 1 }] },
    { id: "fuse_eclipse_1", resultId: "fusion_eclipse", name: "Eclipse Convergence", ingredients: [{ eggId: getVariantId("Void", 0), count: 1 }, { eggId: getVariantId("Celestial", 2), count: 1 }, { eggId: getVariantId("Divine", 1), count: 1 }] },
    { id: "fuse_eclipse_2", resultId: "fusion_eclipse", name: "Shadow Orbit", ingredients: [{ eggId: getVariantId("Void", 1), count: 1 }, { eggId: getVariantId("Astral", 0), count: 1 }, { eggId: getVariantId("Legendary", 1), count: 2 }] },
    { id: "fuse_abyssal_1", resultId: "fusion_abyssal", name: "Abyss Tempering", ingredients: [{ eggId: getVariantId("Void", 2), count: 1 }, { eggId: getVariantId("Astral", 2), count: 1 }, { eggId: getVariantId("Mythic", 1), count: 2 }] },
    { id: "fuse_abyssal_2", resultId: "fusion_abyssal", name: "Night Alloy", ingredients: [{ eggId: getVariantId("Void", 3), count: 1 }, { eggId: getVariantId("Ethereal", 0), count: 1 }, { eggId: getVariantId("Divine", 3), count: 1 }] },
    { id: "fuse_astral_1", resultId: "fusion_astral", name: "Astral Lattice", ingredients: [{ eggId: getVariantId("Astral", 1), count: 1 }, { eggId: getVariantId("Ethereal", 2), count: 1 }, { eggId: getVariantId("Celestial", 3), count: 2 }] },
    { id: "fuse_astral_2", resultId: "fusion_astral", name: "Constellation Mesh", ingredients: [{ eggId: getVariantId("Astral", 3), count: 1 }, { eggId: getVariantId("Omnipotent", 0), count: 1 }, { eggId: getVariantId("Void", 1), count: 1 }] },
    { id: "fuse_omega_1", resultId: "fusion_omega", name: "Omega Bloom", ingredients: [{ eggId: getVariantId("Ethereal", 1), count: 1 }, { eggId: getVariantId("Omnipotent", 2), count: 1 }, { eggId: getVariantId("Astral", 0), count: 1 }] },
    { id: "fuse_omega_2", resultId: "fusion_omega", name: "Final Bloom", ingredients: [{ eggId: getVariantId("Omnipotent", 3), count: 1 }, { eggId: getVariantId("Infinity", 0), count: 1 }, { eggId: getVariantId("Ethereal", 3), count: 1 }] },
    { id: "fuse_infinite_1", resultId: "fusion_infinite", name: "Infinite Spiral", ingredients: [{ eggId: getVariantId("Infinity", 1), count: 1 }, { eggId: getVariantId("Omnipotent", 1), count: 1 }, { eggId: getVariantId("Astral", 2), count: 1 }] },
    { id: "fuse_infinite_2", resultId: "fusion_infinite", name: "Boundless Coil", ingredients: [{ eggId: getVariantId("Infinity", 2), count: 1 }, { eggId: getVariantId("Ethereal", 0), count: 1 }, { eggId: getVariantId("Void", 0), count: 1 }] },
    { id: "fuse_absolute_1", resultId: "fusion_absolute", name: "Nexus Birth", ingredients: [{ eggId: getVariantId("Absolute", 0), count: 1 }, { eggId: getVariantId("Infinity", 3), count: 1 }, { eggId: "fusion_infinite", count: 1 }] },
    { id: "fuse_absolute_2", resultId: "fusion_absolute", name: "Origin Collapse", ingredients: [{ eggId: getVariantId("Absolute", 1), count: 1 }, { eggId: "fusion_omega", count: 1 }, { eggId: "fusion_astral", count: 1 }] },
    { id: "fuse_absolute_3", resultId: "fusion_absolute", name: "Prime Singularity", ingredients: [{ eggId: getVariantId("Absolute", 2), count: 1 }, { eggId: getVariantId("Absolute", 3), count: 1 }, { eggId: "fusion_abyssal", count: 1 }] },
    { id: "fuse_supernova_1", resultId: "fusion_supernova", name: "Binary Ignition", ingredients: [{ eggId: "fusion_nova", count: 1 }, { eggId: "fusion_prism", count: 1 }] },
    { id: "fuse_supernova_2", resultId: "fusion_supernova", name: "Stellar Lace", ingredients: [{ eggId: "fusion_chimera", count: 1 }, { eggId: "fusion_seraphic", count: 1 }] },
    { id: "fuse_singularity_1", resultId: "fusion_singularity", name: "Void Point", ingredients: [{ eggId: "fusion_eclipse", count: 1 }, { eggId: "fusion_abyssal", count: 1 }] },
    { id: "fuse_singularity_2", resultId: "fusion_singularity", name: "Dark Compression", ingredients: [{ eggId: "fusion_astral", count: 1 }, { eggId: "fusion_omega", count: 1 }] },
    { id: "fuse_paragon_1", resultId: "fusion_paragon", name: "Paragon Temper", ingredients: [{ eggId: "fusion_supernova", count: 1 }, { eggId: "fusion_singularity", count: 1 }] },
    { id: "fuse_paragon_2", resultId: "fusion_paragon", name: "Perfected Weave", ingredients: [{ eggId: "fusion_absolute", count: 1 }, { eggId: "fusion_chimera", count: 1 }] },
    { id: "fuse_transcendent_1", resultId: "fusion_transcendent", name: "Aegis Rise", ingredients: [{ eggId: "fusion_paragon", count: 1 }, { eggId: "fusion_infinite", count: 1 }] },
    { id: "fuse_transcendent_2", resultId: "fusion_transcendent", name: "Halo Apex", ingredients: [{ eggId: "fusion_supernova", count: 1 }, { eggId: "fusion_absolute", count: 1 }] },
    { id: "fuse_omnistar_1", resultId: "fusion_omnistar", name: "Omnistar Birth", ingredients: [{ eggId: "fusion_transcendent", count: 1 }, { eggId: "fusion_singularity", count: 1 }] },
    { id: "fuse_omnistar_2", resultId: "fusion_omnistar", name: "Celestial Crown", ingredients: [{ eggId: "fusion_transcendent", count: 1 }, { eggId: "fusion_paragon", count: 1 }] },
    { id: "fuse_cascade_1", resultId: "fusion_cascade", name: "Stream Merge", ingredients: [{ eggId: getVariantId("Common", 4), count: 4 }, { eggId: getVariantId("Uncommon", 5), count: 3 }, { eggId: getVariantId("Rare", 4), count: 2 }] },
    { id: "fuse_cascade_2", resultId: "fusion_cascade", name: "Tierfall Weave", ingredients: [{ eggId: getVariantId("Epic", 5), count: 1 }, { eggId: getVariantId("Rare", 5), count: 2 }, { eggId: getVariantId("Common", 5), count: 5 }] },
    { id: "fuse_radiant_1", resultId: "fusion_radiant", name: "Crown Fusion", ingredients: [{ eggId: getVariantId("Legendary", 4), count: 1 }, { eggId: getVariantId("Fabled", 5), count: 1 }, { eggId: getVariantId("Mythic", 4), count: 1 }] },
    { id: "fuse_radiant_2", resultId: "fusion_radiant", name: "Solar Convergence", ingredients: [{ eggId: getVariantId("Legendary", 5), count: 1 }, { eggId: getVariantId("Divine", 4), count: 1 }, { eggId: "fusion_nova", count: 1 }] },
    { id: "fuse_phantom_1", resultId: "fusion_phantom", name: "Ghost Lattice", ingredients: [{ eggId: getVariantId("Ethereal", 4), count: 1 }, { eggId: getVariantId("Ethereal", 5), count: 1 }, { eggId: getVariantId("Void", 5), count: 1 }] },
    { id: "fuse_phantom_2", resultId: "fusion_phantom", name: "Spectral Matrix", ingredients: [{ eggId: getVariantId("Astral", 5), count: 1 }, { eggId: "fusion_eclipse", count: 1 }, { eggId: getVariantId("Celestial", 4), count: 1 }] }
  ].filter((recipe) => recipe.ingredients.every((ing) => !!ing.eggId));

export const DICE_AP_COST = 2;
export const MAX_DICE_PURCHASES = 2;

export const DICE_TIERS = [
  { sides: 6, label: "d6", name: "Starter Die" },
  { sides: 8, label: "d8", name: "Crystal Die" },
  { sides: 10, label: "d10", name: "Astral Die" }
];

export function getDicePurchases(saveState) {
  return Math.min(MAX_DICE_PURCHASES, Math.max(0, Number(saveState?.dicePurchases || 0)));
}

export function getDiceSides(saveState) {
  return DICE_TIERS[getDicePurchases(saveState)].sides;
}

export function getDiceInfo(saveState) {
  return DICE_TIERS[getDicePurchases(saveState)];
}

export function getNextDiceUpgrade(saveState) {
  const purchases = getDicePurchases(saveState);
  if (purchases >= MAX_DICE_PURCHASES) return null;
  return DICE_TIERS[purchases + 1];
}

export const MAX_SECOND_DIE_PURCHASES = 2;

export const SECOND_DIE_TIERS = [
  { sides: 8, label: "d8", name: "Crystal Die", luckMult: 1.5 },
  { sides: 10, label: "d10", name: "Astral Die", luckMult: 1.65 },
  { sides: 12, label: "d12", name: "Cosmic Die", luckMult: 1.8 }
];

export const SECOND_DIE_RPS_ITEMS = [
  { id: "die2Auto1", name: "Die 2 Auto I", baseCost: 40, growth: 1.55, effect: 0.5 },
  { id: "die2Auto2", name: "Die 2 Auto II", baseCost: 75, growth: 1.58, effect: 1 },
  { id: "die2Auto3", name: "Die 2 Auto III", baseCost: 120, growth: 1.6, effect: 2 },
  { id: "die2Auto4", name: "Die 2 Auto IV", baseCost: 200, growth: 1.62, effect: 4 },
  { id: "die2Auto5", name: "Die 2 Auto V", baseCost: 350, growth: 1.65, effect: 8 }
];

export const SECOND_DIE_RPS_BY_ID = Object.fromEntries(SECOND_DIE_RPS_ITEMS.map((item) => [item.id, item]));

export function hasSecondDie(saveState) {
  return !!saveState?.secondDieOwned;
}

export function getSecondDiePurchases(saveState) {
  return Math.min(MAX_SECOND_DIE_PURCHASES, Math.max(0, Number(saveState?.secondDiePurchases ?? 0)));
}

export function getSecondDieInfo(saveState) {
  const idx = saveState && hasSecondDie(saveState) ? getSecondDiePurchases(saveState) : 0;
  return SECOND_DIE_TIERS[idx] || SECOND_DIE_TIERS[0];
}

export function getNextSecondDieUpgrade(saveState) {
  const purchases = getSecondDiePurchases(saveState);
  if (purchases >= MAX_SECOND_DIE_PURCHASES) return null;
  return SECOND_DIE_TIERS[purchases + 1];
}

export function getPrimaryDieInfo(saveState) {
  return DICE_TIERS[getDicePurchases(saveState)] || DICE_TIERS[0];
}

export const ASCENSION_CONFIG = {
    minPrestige: 5,
    baseGain: 1,
    upgrades: [
      { id: "ascLuck", name: "Ascended Luck", baseCost: 1, growth: 1.65, effect: 0.06 },
      { id: "ascCoins", name: "Ascended Coin Flow", baseCost: 1, growth: 1.55, effect: 0.1 },
      { id: "ascRps", name: "Ascended Momentum", baseCost: 2, growth: 1.7, effect: 0.9 }
    ]
  };

export const PRESTIGE_MILESTONES = [
  { id: "prestige_5", level: 5, rewardGems: 25, luckBonus: 0.02, label: "+25 gems & +2% permanent luck" },
  { id: "prestige_10", level: 10, rewardGems: 50, titleId: "diceGrinder", label: "+50 gems & Dice Grinder title" },
  { id: "prestige_25", level: 25, rewardGems: 150, luckBonus: 0.03, label: "+150 gems & +3% permanent luck" }
];

export const SEASON_EGG_IDS = ["void_abyss", "void_null", "celestial_nebula"];
export const SEASON_FEATURED_RARITIES = ["Void", "Celestial", "Astral"];

export const INCUBATOR_BASE_SLOTS = 2;
export const INCUBATOR_BASE_MS = 5 * 60 * 1000;
export const INCUBATOR_RARITY_MS = [0, 1, 2, 4, 6, 10, 16, 24, 36, 50, 70, 90, 120, 150, 180];

export const RELIC_BASE_SLOTS = 2;

export const RELIC_DEFS = [
  { id: "lucky_charm", name: "Lucky Charm", buffType: "luck", buffValue: 0.05, unlock: { type: "codexPct", value: 10 } },
  { id: "coin_purse", name: "Coin Purse", buffType: "coins", buffValue: 0.08, unlock: { type: "prestige", value: 1 } },
  { id: "hatch_stone", name: "Hatch Stone", buffType: "incubatorSpeed", buffValue: 0.2, unlock: { type: "shinies", value: 3 } },
  { id: "season_compass", name: "Season Compass", buffType: "luck", buffValue: 0.04, unlock: { type: "seasonEgg" } },
  { id: "guild_banner", name: "Guild Banner", buffType: "coins", buffValue: 0.05, unlock: { type: "guild" } },
  { id: "shiny_mirror", name: "Shiny Mirror", buffType: "shiny", buffValue: 0.12, unlock: { type: "shinies", value: 10 } },
  { id: "die2_spark", name: "Die 2 Spark", buffType: "rps2", buffValue: 0.5, unlock: { type: "secondDie" } },
  { id: "duel_token", name: "Duel Token", buffType: "duelLuck", buffValue: 0.1, unlock: { type: "prestige", value: 3 } }
];

export const RELIC_BY_ID = Object.fromEntries(RELIC_DEFS.map((r) => [r.id, r]));

export const PRESTIGE_SHOP_ITEMS = [
  { id: "ppLuck", name: "Prestige Luck", baseCost: 1, growth: 1.55, effect: 0.03, maxLevel: 10 },
  { id: "ppOffline", name: "Offline Boost", baseCost: 1, growth: 1.5, effect: 0.05, maxLevel: 8 },
  { id: "ppIncubator", name: "Incubator Slot", baseCost: 2, growth: 2.2, effect: 1, maxLevel: 3 },
  { id: "ppRelic", name: "Relic Slot", baseCost: 2, growth: 2.5, effect: 1, maxLevel: 2 },
  { id: "ppRps2", name: "Die 2 Momentum", baseCost: 3, growth: 1.65, effect: 0.5, maxLevel: 5 }
];

export const PRESTIGE_SHOP_BY_ID = Object.fromEntries(PRESTIGE_SHOP_ITEMS.map((item) => [item.id, item]));

/** Guild treasury coin bonus: +1% per 10k coins donated, max +10%. */
export function getGuildTreasuryCoinBonus(treasuryCoins) {
  return Math.min(0.1, Math.floor(Number(treasuryCoins || 0) / 10000) / 100);
}

export const WEEKLY_CHALLENGE_TEMPLATES = [
  { id: "rolls_500", target: 500, rewardGems: 15, rewardCoins: 5000 },
  { id: "fusion_3", target: 3, rewardGems: 20, rewardCoins: 0 },
  { id: "hatch_1", target: 1, rewardGems: 25, rewardCoins: 0 },
  { id: "discover_1", target: 1, rewardGems: 30, rewardCoins: 0 },
  { id: "streak_10", target: 10, rewardGems: 15, rewardCoins: 2500 }
];

export const SHOP_BY_ID = Object.fromEntries(SHOP_ITEMS.map((item) => [item.id, item]));
export const GEM_SHOP_BY_ID = Object.fromEntries(GEM_SHOP_ITEMS.map((item) => [item.id, item]));
export const FUSION_EGG_BY_ID = Object.fromEntries(FUSION_EGG_TYPES.map((egg) => [egg.id, egg]));
export const ALL_EGG_BY_ID = { ...EGG_BY_ID, ...FUSION_EGG_BY_ID };

export function getRarityIndex(name) {
  return RARITIES.findIndex((r) => r.name === name);
}
