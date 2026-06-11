function resetSoftPrestigeProgress(){
  cookies = getStartCookies();
  grandmas = 0; farms = 0; factories = 0; oils = 0; mines = 0;
  coops = 0; wormholes = 0; galaxies = 0; empties = 0;
  pets = []; equipped = []; hatching = null;
  expansionPets = [];
  expansionHatching = null;
  applyMasteryStartingBuildings();
  if(typeof restoreBankAfterPrestige === "function") restoreBankAfterPrestige();
}

function resetTornadoFull(){
  if(typeof resetTornadoProgress === "function") resetTornadoProgress();
  if(typeof resetForgeAndAnvil === "function") resetForgeAndAnvil();
  bankCard = null;
  creditCard = null;
  stoneInventory = { worker: {}, pet: {} };
  appliedBuildingStones = { grandmas:0, farms:0, factories:0, oils:0, mines:0, coops:0, wormholes:0, galaxies:0, empties:0 };
  appliedPetStones = [];
}

function resetForIceAge(){
  iceAgeAwaitingLimbo = true;
  gamePaused = true;
  resetTornadoFull();
  cookies = getStartCookies();
  whyEggs = 0;
  xp = 0;
  boosters = 0;
  tornadoPrestige = 0;
  if(typeof resetMastery === "function") resetMastery();
  permaMastery = false;
  pets = []; equipped = []; permanentEquipped = []; permanentSlotMeta = [];
  hatching = null;
  expansionPets = []; expansionHatching = null;
  grandmas = 0; farms = 0; factories = 0; oils = 0; mines = 0;
  coops = 0; wormholes = 0; galaxies = 0; empties = 0;
  seeds = []; produce = []; waterCans = []; vines = 0; chokeberries = 0;
  marketPlots = [];
  resetGardenKeepUnlocks();
  bankCard = null; creditCard = null; bankBound = true;
  raritiesRollUnlocked = false;
  pendingRarityMult = 1;
  shopExpansionPurchases = {};
  if(typeof resetForgeAndAnvil === "function") resetForgeAndAnvil();
}

function toggleHandWater(){
  handWaterMode = !handWaterMode;
  const btn = document.getElementById('handWaterToggle');
  if(btn) btn.textContent = handWaterMode ? 'Hand water: ON' : 'Hand water: OFF';
}
