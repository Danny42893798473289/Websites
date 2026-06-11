const TORNADO_LEVEL_REQS = [1e9, 2e9, 4e9, 10e9];
const TORNADO_MAX_LEVEL = 4;

function getPer40m(){
  if(typeof getPer40mPotential === 'function') return getPer40mPotential();
  return Math.floor(getBase() * getMulti() * getPassiveMult());
}

function getTornadoMultiMult(){
  const lvl = Number(tornadoPrestige) || 0;
  if(lvl >= 4) return 2;
  if(lvl >= 3) return 1.5;
  if(lvl >= 1) return 1.25;
  return 1;
}

function getInventorySlotBonus(){
  const lvl = Number(tornadoPrestige) || 0;
  if(lvl >= 4) return 13;
  if(lvl >= 3) return 3;
  return 0;
}

function getMaxInventoryItems(){
  return 50 + getInventorySlotBonus();
}

function getPermanentPetMult(petVal, slotIndex){
  let v = Number(petVal) || 0;
  const meta = permanentSlotMeta && permanentSlotMeta[slotIndex];
  if(meta && meta.upgraded) v *= 1.5;
  if(meta && meta.stackable) v *= 2;
  return v;
}

function getPermanentEquipSlots(){
  const lvl = Number(tornadoPrestige) || 0;
  let n = 0;
  if(lvl >= 2) n = 2;
  else if(lvl >= 1) n = 1;
  return n + (Number(extraPermanentSlots) || 0);
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
  if(nextLevel === 2) return '1 normal equip slot becomes permanent (+2 permanent total), Bank, Portal Shop, Stone Shop & Forge';
  if(nextLevel === 3) return '×1.5 multiplier, +3 inventory slots, why egg cap 500+20×XP';
  if(nextLevel === 4) return '×2 multiplier, +10 inventory slots, 1 upgraded permanent pet slot';
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
  if(typeof clearBankOnTornado === 'function') clearBankOnTornado();
}

function canTornadoPrestige(){
  if(typeof isLimboNoTPrestige === 'function' && isLimboNoTPrestige()) return false;
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
  if(nextLevel === 4){
    while(permanentSlotMeta.length < permanentEquipped.length) permanentSlotMeta.push({ upgraded: false, stackable: false });
    if(permanentSlotMeta.length > 0) permanentSlotMeta[0] = { upgraded: true, stackable: permanentSlotMeta[0].stackable || false };
    else permanentSlotMeta.push({ upgraded: true, stackable: false });
  }
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
