const TORNADO_LEVEL_REQS = [1e9, 2e9, 4e9, 10e9];
const TORNADO_MAX_LEVEL = 4;

function getPer40m(){
  return Math.floor(getBase() * getMulti() * getPassiveMult());
}

function getTornadoMultiMult(){
  return (Number(tornadoPrestige) || 0) >= 1 ? 1.25 : 1;
}

function getPermanentEquipSlots(){
  const lvl = Number(tornadoPrestige) || 0;
  if(lvl >= 2) return 2;
  if(lvl >= 1) return 1;
  return 0;
}

function getTornadoNormalEquipSlots(){
  return (Number(tornadoPrestige) || 0) >= 2 ? 1 : 2;
}

function migrateEquipForTornadoLevel(){
  const maxNormal = getTornadoNormalEquipSlots();
  while(equipped.length > maxNormal){
    const p = equipped.pop();
    if(permanentEquipped.length < getPermanentEquipSlots()) permanentEquipped.push(p);
    else pets.push(p);
  }
  trimPermanentEquipped();
}

function isBankUnlocked(){
  return (Number(tornadoPrestige) || 0) >= 2;
}

function isUpgradeShopUnlocked(){
  return (Number(tornadoPrestige) || 0) >= 2;
}

function getNextTornadoRequirement(){
  const lvl = Number(tornadoPrestige) || 0;
  if(lvl >= TORNADO_MAX_LEVEL) return null;
  return TORNADO_LEVEL_REQS[lvl];
}

function getTornadoRewardText(nextLevel){
  if(nextLevel === 1) return '×1.25 multiplier and +1 permanent pet slot';
  if(nextLevel === 2) return '1 normal equip slot becomes permanent (+2 permanent total), Bank, Upgrade Shop, Stone Shop & Forge';
  return 'No new rewards (progress only)';
}

function trimPermanentEquipped(){
  const max = getPermanentEquipSlots();
  while(permanentEquipped.length > max){
    pets.push(permanentEquipped.pop());
  }
}

function resetTornadoProgress(){
  cookies = getStartCookies();
  whyEggs = 0;
  xp = 0;
  boosters = 0;
  if(typeof resetMastery === "function") resetMastery();
  else { masteryPath = null; masteryUnlocked = []; }
  if(typeof resetForgeAndAnvil === "function") resetForgeAndAnvil();
  grandmas = 0; farms = 0; factories = 0; oils = 0; mines = 0;
  coops = 0; wormholes = 0; galaxies = 0; empties = 0;
  pets = []; equipped = []; hatching = null;
  trimPermanentEquipped();
  expansionPets = []; expansionHatching = null;
  seeds = []; produce = [];
  waterCans = [];
  vines = 0;
  selectedCanIndex = null;
  resetGardenKeepUnlocks();
}

function canTornadoPrestige(){
  const req = getNextTornadoRequirement();
  if(req === null) return false;
  return getPer40m() >= req;
}

function doTornadoPrestige(){
  const per40 = getPer40m();
  const req = getNextTornadoRequirement();
  if(req === null){
    alert(`Tornado Prestige is maxed at level ${TORNADO_MAX_LEVEL}.`);
    return;
  }
  if(!canTornadoPrestige()){
    alert(`You need at least ${req.toLocaleString()} cookies per 40 minutes (you have ${per40.toLocaleString()}).`);
    return;
  }

  const nextLevel = tornadoPrestige + 1;
  const reward = getTornadoRewardText(nextLevel);
  if(!confirm(
    `Tornado Prestige to level ${nextLevel}?\n\nResets: cookies, why eggs, XP, boosters, mastery, buildings, regular pets & equip, garden crops, seeds, produce, water cans, and inventory vines.\nKeeps: unlocked garden plots, market, permanent pet slots & pets in them.\n\nRewards: ${reward}`
  )) return;

  tornadoPrestige = nextLevel;
  resetTornadoProgress();
  migrateEquipForTornadoLevel();
  save();
  update();
  if(typeof renderMastery === "function") renderMastery();
}

function updateTornadoUnlockNav(){
  if(typeof updateNavLocks === 'function') updateNavLocks();
}

function updateTornadoPrestigeUI(){
  const per40 = getPer40m();
  const req = getNextTornadoRequirement();
  const ready = canTornadoPrestige();
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('tornadoCount', tornadoPrestige);
  set('tornadoMultiMult', getTornadoMultiMult().toFixed(4));
  set('tornadoPermanentSlots', getPermanentEquipSlots());
  set('tornadoPermanentUsed', permanentEquipped.length);
  set('tornadoEquipSlots', getMaxEquipSlots());
  set('tornadoPer40m', per40.toLocaleString());
  set('tornadoPer40mReq', req !== null ? req.toLocaleString() : 'Max level');
  set('tornadoNextReward', req !== null ? getTornadoRewardText(tornadoPrestige + 1) : '—');

  const btn = document.getElementById('tornadoPrestigeBtn');
  if(btn){
    btn.disabled = !ready;
    if(req === null){
      btn.disabled = true;
      btn.title = `Max level (${TORNADO_MAX_LEVEL})`;
    } else {
      btn.title = ready ? '' : `Requires ${req.toLocaleString()} cookies per 40 minutes`;
    }
  }
  const status = document.getElementById('tornadoPrestigeStatus');
  if(status){
    if(req === null) status.textContent = `Max Tornado level (${TORNADO_MAX_LEVEL}).`;
    else if(ready) status.textContent = `Ready for Tornado level ${tornadoPrestige + 1}.`;
    else status.textContent = `Need ${Math.max(0, req - per40).toLocaleString()} more per 40m (requires ${req.toLocaleString()}).`;
  }
  updateTornadoUnlockNav();
}
