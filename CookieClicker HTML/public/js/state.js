
let currentUser="",loaded=false;

let cookies=40;
let grandmas=0,farms=0,factories=0,oils=0,mines=0;
let coops=0,wormholes=0,galaxies=0,empties=0;

let pets=[],equipped=[],permanentEquipped=[],permanentSlotMeta=[],hatching=null,expansionPets=[],expansionHatching=null,marketPlots=[],seeds=[],gardenPlots=[],waterCans=[],produce=[];
let vines = 0, chokeberries = 0;
let selectedCanIndex = null;
let handWaterMode = false;
let bankCard = null, creditCard = null, bankBound = true;
let limbo = 0, yellowPrestige = 0, iceAgeCount = 0, limboRestriction = null;
let shopExpansionPurchases = {};
let raritiesRollUnlocked = false, pendingRarityMult = 1;
let gamePaused = false, permaMastery = false, iceAgeAwaitingLimbo = false;
let tradeSlots = 1, tradeVolumeToday = 0, tradeVolumeDate = "";
let extraPermanentSlots = 0;
let xp = 0, boosters = 0, whyEggs = 0;
let tornadoPrestige = 0;
let masteryPath = null;
let masteryUnlocked = [];
let currentTheme = "dark-orange";
let unlockedThemes = ["dark-orange"];
let stoneInventory = { worker: {}, pet: {} };
let appliedBuildingStones = { grandmas:0, farms:0, factories:0, oils:0, mines:0, coops:0, wormholes:0, galaxies:0, empties:0 };
let appliedPetStones = [];
let forgeJobs = [null, null];
let anvilState = [
  { type: "worker", slots: [null, null] },
  { type: "worker", slots: [null, null] }
];
const FORGE_SLOT_COUNT = 2;
const SHOP_STONE_MAX_TIER = 2;

const COOKIE_TICK_MS = 2400000;
let nextCookieTickAt = 0;
const START_COOKIES = 40;
const WHY_EGG_PER_COOKIES = 50000;
const PRESTIGE_MIN_COOKIES = 50000;
