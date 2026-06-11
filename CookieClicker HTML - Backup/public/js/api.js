async function login(){
let r=await fetch("/login",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({username:user.value,password:pass.value})});
let d=await r.json();
if(d.success){
  currentUser=user.value;
  showGame();
  await load();
  if(typeof initChatSession === 'function') initChatSession();
}
}

async function register(){
await fetch("/register",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({username:user.value,password:pass.value})});
alert("registered");
}

async function load(){
let r=await fetch("/load",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({username:currentUser})});
let d=await r.json();

if(d){
  // âœ… FIXED (only change)
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
    forgeJobs = d.forgeJobs;
  } else if(d.forgeJob && typeof d.forgeJob === "object"){
    forgeJobs = [d.forgeJob, null];
  } else {
    forgeJobs = [null, null];
  }
  if(Array.isArray(d.anvilState)){
    anvilState = d.anvilState;
  }
  nextCookieTickAt = Number(d.nextCookieTickAt) || 0;
  if(typeof syncCookieTickSchedule === "function") syncCookieTickSchedule();
  if(typeof ensureThemeData === "function") ensureThemeData();
  if(typeof ensureStoneData === "function") ensureStoneData();
  if(typeof applyTheme === "function") applyTheme(currentTheme);
}

loaded=true;
update();
}

function save(){
fetch("/save",{method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({username:currentUser,data:{
  cookies,grandmas,farms,factories,oils,mines,coops,wormholes,galaxies,empties,
  pets,equipped,permanentEquipped,hatching,expansionPets,expansionHatching,marketPlots,seeds,gardenPlots,waterCans,produce,vines,
  xp,boosters,whyEggs,tornadoPrestige,masteryPath,masteryUnlocked,currentTheme,unlockedThemes,
  stoneInventory,appliedBuildingStones,appliedPetStones,forgeJobs,anvilState,nextCookieTickAt
}})});
}
