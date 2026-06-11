function applyLoadedData(d){
  cookies = Number(d.cookies) || 40;
  grandmas = Number(d.grandmas) || 0;
  farms = Number(d.farms) || 0;
  factories = Number(d.factories) || 0;
  oils = Number(d.oils) || 0;
  mines = Number(d.mines) || 0;
  coops = Number(d.coops) || 0;
  wormholes = Number(d.wormholes) || 0;
  galaxies = Number(d.galaxies) || 0;
  empties = Number(d.empties) || 0;
  pets = Array.isArray(d.pets) ? d.pets : [];
  equipped = Array.isArray(d.equipped) ? d.equipped : [];
  permanentEquipped = Array.isArray(d.permanentEquipped) ? d.permanentEquipped : [];
  permanentSlotMeta = Array.isArray(d.permanentSlotMeta) ? d.permanentSlotMeta : [];
  if(typeof migrateEquipForTornadoLevel === 'function') migrateEquipForTornadoLevel();
  hatching = (d.hatching && typeof d.hatching === "object") ? d.hatching : null;
  expansionPets = Array.isArray(d.expansionPets) ? d.expansionPets : [];
  expansionHatching = (d.expansionHatching && typeof d.expansionHatching === "object") ? d.expansionHatching : null;
  marketPlots = Array.isArray(d.marketPlots) ? d.marketPlots : [];
  ensureMarketPlots();
  seeds = Array.isArray(d.seeds) ? d.seeds : [];
  gardenPlots = Array.isArray(d.gardenPlots) ? d.gardenPlots : [];
  ensureGardenPlots();
  waterCans = Array.isArray(d.waterCans) ? d.waterCans : [];
  produce = Array.isArray(d.produce) ? d.produce : [];
  vines = Number(d.vines) || 0;
  chokeberries = Number(d.chokeberries) || 0;
  xp = Number(d.xp) || 0;
  boosters = Number(d.boosters) || 0;
  whyEggs = Number(d.whyEggs) || 0;
  tornadoPrestige = Number(d.tornadoPrestige) || 0;
  masteryPath = d.masteryPath || null;
  masteryUnlocked = Array.isArray(d.masteryUnlocked) ? d.masteryUnlocked : [];
  currentTheme = d.currentTheme || "dark-orange";
  unlockedThemes = Array.isArray(d.unlockedThemes) ? d.unlockedThemes : ["dark-orange"];
  stoneInventory = (d.stoneInventory && typeof d.stoneInventory === "object") ? d.stoneInventory : { worker: {}, pet: {} };
  appliedBuildingStones = (d.appliedBuildingStones && typeof d.appliedBuildingStones === "object") ? d.appliedBuildingStones : { grandmas:0, farms:0, factories:0, oils:0, mines:0, coops:0, wormholes:0, galaxies:0, empties:0 };
  appliedPetStones = Array.isArray(d.appliedPetStones) ? d.appliedPetStones : [];
  if(Array.isArray(d.forgeJobs)){
    forgeJobs = d.forgeJobs.map(j => (j && j.type === 'flask') ? null : j);
  } else if(d.forgeJob && typeof d.forgeJob === "object"){
    forgeJobs = [d.forgeJob, null];
  } else {
    forgeJobs = [null, null];
  }
  if(Array.isArray(d.anvilState)) anvilState = d.anvilState;
  nextCookieTickAt = Number(d.nextCookieTickAt) || 0;
  bankCard = d.bankCard ?? null;
  creditCard = d.creditCard ?? null;
  bankBound = d.bankBound !== false;
  limbo = Number(d.limbo) || 0;
  yellowPrestige = Number(d.yellowPrestige) || 0;
  iceAgeCount = Number(d.iceAgeCount) || 0;
  limboRestriction = d.limboRestriction ?? null;
  shopExpansionPurchases = (d.shopExpansionPurchases && typeof d.shopExpansionPurchases === 'object') ? d.shopExpansionPurchases : {};
  raritiesRollUnlocked = !!d.raritiesRollUnlocked;
  pendingRarityMult = Number(d.pendingRarityMult) || 1;
  permaMastery = !!d.permaMastery;
  iceAgeAwaitingLimbo = !!d.iceAgeAwaitingLimbo;
  if(limboRestriction && iceAgeAwaitingLimbo){
    iceAgeAwaitingLimbo = false;
  }
  if(iceAgeAwaitingLimbo) gamePaused = true;
  else if(limboRestriction) gamePaused = false;
  tradeSlots = Number(d.tradeSlots) || 1;
  tradeVolumeToday = Number(d.tradeVolumeToday) || 0;
  tradeVolumeDate = d.tradeVolumeDate || "";
  extraPermanentSlots = Number(d.extraPermanentSlots) || 0;
  if(typeof syncCookieTickSchedule === "function") syncCookieTickSchedule();
  if(typeof ensureThemeData === "function") ensureThemeData();
  if(typeof ensureStoneData === "function") ensureStoneData();
  if(typeof applyTheme === "function") applyTheme(currentTheme);
  if(typeof setSessionHeader === "function") setSessionHeader();
}

function getSavePayload(){
  return {
    cookies, grandmas, farms, factories, oils, mines, coops, wormholes, galaxies, empties,
    pets, equipped, permanentEquipped, permanentSlotMeta, hatching, expansionPets, expansionHatching,
    marketPlots, seeds, gardenPlots, waterCans, produce, vines, chokeberries,
    xp, boosters, whyEggs, tornadoPrestige, masteryPath, masteryUnlocked,
    currentTheme, unlockedThemes, stoneInventory, appliedBuildingStones, appliedPetStones,
    forgeJobs, anvilState, nextCookieTickAt,
    bankCard, creditCard, bankBound, limbo, yellowPrestige, iceAgeCount, limboRestriction,
    shopExpansionPurchases, raritiesRollUnlocked, pendingRarityMult, permaMastery, iceAgeAwaitingLimbo,
    tradeSlots, tradeVolumeToday, tradeVolumeDate, extraPermanentSlots
  };
}

async function login(){
  let r = await fetch("/login",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username:user.value,password:pass.value})});
  let d = await r.json();
  if(d.success){
    currentUser = user.value;
    showGame();
    await load();
    if(typeof initChatSession === 'function') initChatSession();
  } else if(typeof showToast === "function"){
    showToast("Login failed. Check username/password.", "error");
  } else {
    alert("Login failed.");
  }
}

async function register(){
  let r = await fetch("/register",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username:user.value,password:pass.value})});
  let d = await r.json();
  if(d.success){
    if(typeof showToast === "function") showToast("Registered! You can log in now.", "success");
    else alert("Registered! You can log in now.");
  } else {
    if(typeof showToast === "function") showToast("Registration failed (username may already exist).", "error");
    else alert("Registration failed (username may already exist).");
  }
}

async function load(){
  let r = await fetch("/load",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username:currentUser})});
  let d = await r.json();
  if(d) applyLoadedData(d);
  loaded = true;
  update();
  if(typeof checkForcedIceAge === 'function') checkForcedIceAge();
  if(typeof setSaveIndicator === "function") setSaveIndicator("saved");
}

let saveQueued = false;
let saveInFlight = false;

async function flushSaveQueue(){
  if(saveInFlight || !saveQueued || !currentUser) return;
  saveInFlight = true;
  saveQueued = false;
  if(typeof setSaveIndicator === "function") setSaveIndicator("saving");
  try {
    const res = await fetch("/save",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({username:currentUser, data: getSavePayload()})
    });
    if(!res.ok) throw new Error("save failed");
    if(typeof setSaveIndicator === "function") setSaveIndicator("saved");
  } catch (err) {
    if(typeof setSaveIndicator === "function") setSaveIndicator("error");
    console.error("Save failed:", err);
  } finally {
    saveInFlight = false;
    if(saveQueued) flushSaveQueue();
  }
}

function save(){
  if(!currentUser) return;
  saveQueued = true;
  flushSaveQueue();
}
