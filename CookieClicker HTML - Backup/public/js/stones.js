const BUILDING_KEYS = ["grandmas","farms","factories","oils","mines","coops","wormholes","galaxies","empties"];

const WORKER_T1_COST = 2000000;
const WORKER_T2_COST = 5000000;
const PET_T1_COST = 1500000;
const PET_T2_COST = 4000000;
const FORGE_SECONDS = 40 * 60;

function isStonesUnlocked(){
  return (Number(tornadoPrestige) || 0) >= 2;
}

function getStoneRateMult(tier){
  const t = Math.max(0, Number(tier) || 0);
  return 1 + (0.25 * t);
}

function normalizeStoneMap(map){
  const out = {};
  if(!map || typeof map !== "object") return out;
  Object.keys(map).forEach(k => {
    const tier = Number(k);
    const count = Number(map[k]) || 0;
    if(tier > 0 && count > 0) out[tier] = (out[tier] || 0) + count;
  });
  return out;
}

function getStoneCount(type, tier){
  ensureStoneData();
  return Number(stoneInventory[type][tier]) || 0;
}

function addStoneCount(type, tier, amount){
  ensureStoneData();
  const t = Number(tier) || 0;
  if(t <= 0) return;
  const n = Number(amount) || 0;
  if(n <= 0) return;
  stoneInventory[type][t] = (Number(stoneInventory[type][t]) || 0) + n;
}

function removeStoneCount(type, tier, amount){
  ensureStoneData();
  const t = Number(tier) || 0;
  if(t <= 0) return;
  const n = Number(amount) || 0;
  if(n <= 0) return;
  const next = Math.max(0, (Number(stoneInventory[type][t]) || 0) - n);
  if(next > 0) stoneInventory[type][t] = next;
  else delete stoneInventory[type][t];
}

function getInventoryTiers(type){
  ensureStoneData();
  return Object.keys(stoneInventory[type])
    .map(Number)
    .filter(t => t > 0 && getStoneCount(type, t) > 0)
    .sort((a, b) => a - b);
}

function getWorkerStoneCost(tier){
  const t = Math.max(1, Math.floor(Number(tier) || 1));
  if(t === 1) return WORKER_T1_COST;
  if(t === 2) return WORKER_T2_COST;
  return Math.floor(WORKER_T2_COST * Math.pow(1.75, t - 2));
}

function getPetStoneCost(tier){
  const t = Math.max(1, Math.floor(Number(tier) || 1));
  if(t === 1) return PET_T1_COST;
  if(t === 2) return PET_T2_COST;
  return Math.floor(PET_T2_COST * Math.pow(1.75, t - 2));
}

function ensureStoneData(){
  if(!stoneInventory || typeof stoneInventory !== "object") stoneInventory = { worker: {}, pet: {} };
  stoneInventory.worker = normalizeStoneMap(stoneInventory.worker);
  stoneInventory.pet = normalizeStoneMap(stoneInventory.pet);
  ensureAnvilState();

  if(!appliedBuildingStones || typeof appliedBuildingStones !== "object") appliedBuildingStones = {};
  BUILDING_KEYS.forEach(k => { appliedBuildingStones[k] = Number(appliedBuildingStones[k]) || 0; });

  if(!Array.isArray(appliedPetStones)) appliedPetStones = [];
  syncPetStoneSlots();

  const slots = typeof FORGE_SLOT_COUNT === "number" ? FORGE_SLOT_COUNT : 2;
  if(!Array.isArray(forgeJobs)) forgeJobs = [null, null];
  while(forgeJobs.length < slots) forgeJobs.push(null);
  forgeJobs.length = slots;

  for(let i = 0; i < slots; i++){
    const job = forgeJobs[i];
    if(job && typeof job === "object"){
      job.type = job.type === "pet" ? "pet" : "worker";
      job.mode = job.mode === "adjacent" ? "adjacent" : "same";
      job.a = Number(job.a) || 0;
      job.b = Number(job.b) || 0;
      job.result = Number(job.result) || 0;
      job.time = Math.max(0, Number(job.time) || 0);
      if(!job.result) forgeJobs[i] = null;
    } else forgeJobs[i] = null;
  }
}

function getActivePetValues(){
  const active = [];
  equipped.forEach(v => active.push(Number(v) || 0));
  if(Array.isArray(permanentEquipped)) permanentEquipped.forEach(v => active.push(Number(v) || 0));
  return active;
}

function syncPetStoneSlots(){
  const max = getActivePetValues().length;
  while(appliedPetStones.length > max){
    const tier = Number(appliedPetStones.pop()) || 0;
    if(tier > 0) addStoneCount("pet", tier, 1);
  }
  while(appliedPetStones.length < max) appliedPetStones.push(0);
  for(let i = 0; i < appliedPetStones.length; i++){
    appliedPetStones[i] = Number(appliedPetStones[i]) || 0;
  }
}

function getBuildingStoneTier(key){
  ensureStoneData();
  return Number(appliedBuildingStones[key]) || 0;
}

function getBuildingStoneMult(key){
  return getStoneRateMult(getBuildingStoneTier(key));
}

function getPetContributionWithStones(){
  ensureStoneData();
  const petsActive = getActivePetValues();
  let sum = 0;
  for(let i = 0; i < petsActive.length; i++){
    const tier = Number(appliedPetStones[i]) || 0;
    sum += petsActive[i] * getStoneRateMult(tier);
  }
  return sum;
}

function buyStone(type, tier){
  if(!isStonesUnlocked()){
    alert("Upgrade stones unlock at Tornado Prestige level 2.");
    return;
  }
  ensureStoneData();
  const t = Math.max(1, Math.floor(Number(tier) || 0));
  const maxShop = typeof SHOP_STONE_MAX_TIER === "number" ? SHOP_STONE_MAX_TIER : 2;
  if(t > maxShop){
    alert(`Only T1 and T${maxShop} can be bought here. Higher tiers must be forged on the anvil.`);
    return;
  }
  const cost = type === "pet" ? getPetStoneCost(t) : getWorkerStoneCost(t);
  if(cookies < cost){
    alert(`Need ${cost.toLocaleString()} cookies.`);
    return;
  }
  cookies -= cost;
  addStoneCount(type, t, 1);
  save();
  update();
}

function applyBuildingStoneTo(key, tier){
  if(!isStonesUnlocked()) return;
  ensureStoneData();
  const t = Math.max(1, Math.floor(Number(tier) || 0));
  if(getStoneCount("worker", t) <= 0){
    alert(`No worker T${t} stones in inventory.`);
    return;
  }
  const oldTier = Number(appliedBuildingStones[key]) || 0;
  if(oldTier > 0) addStoneCount("worker", oldTier, 1);
  removeStoneCount("worker", t, 1);
  appliedBuildingStones[key] = t;
  save();
  update();
}

function removeBuildingStone(key){
  if(!isStonesUnlocked()) return;
  ensureStoneData();
  const oldTier = Number(appliedBuildingStones[key]) || 0;
  if(oldTier <= 0) return;
  addStoneCount("worker", oldTier, 1);
  appliedBuildingStones[key] = 0;
  save();
  update();
}

function applyPetStoneTo(idx, tier){
  if(!isStonesUnlocked()) return;
  ensureStoneData();
  syncPetStoneSlots();
  const t = Math.max(1, Math.floor(Number(tier) || 0));
  if(getStoneCount("pet", t) <= 0){
    alert(`No pet T${t} stones in inventory.`);
    return;
  }
  const oldTier = Number(appliedPetStones[idx]) || 0;
  if(oldTier > 0) addStoneCount("pet", oldTier, 1);
  removeStoneCount("pet", t, 1);
  appliedPetStones[idx] = t;
  save();
  update();
}

function removePetStone(idx){
  if(!isStonesUnlocked()) return;
  ensureStoneData();
  syncPetStoneSlots();
  const oldTier = Number(appliedPetStones[idx]) || 0;
  if(oldTier <= 0) return;
  addStoneCount("pet", oldTier, 1);
  appliedPetStones[idx] = 0;
  save();
  update();
}

function resolveForgeRecipe(mode, a, b){
  const x = Math.max(1, Math.floor(Number(a) || 0));
  const y = Math.max(1, Math.floor(Number(b) || 0));
  if(mode === "same"){
    return { mode: "same", a: x, b: x, result: x + 1, need: [[x, 2]] };
  }
  const lo = Math.min(x, y);
  const hi = Math.max(x, y);
  if(hi !== lo + 1) return null;
  return { mode: "adjacent", a: lo, b: hi, result: hi + 1, need: [[lo, 1], [hi, 1]] };
}

function ensureAnvilState(){
  const slots = typeof FORGE_SLOT_COUNT === "number" ? FORGE_SLOT_COUNT : 2;
  if(!Array.isArray(anvilState)) anvilState = [];
  while(anvilState.length < slots) anvilState.push({ type: "worker", slots: [null, null] });
  anvilState.length = slots;
  for(let i = 0; i < slots; i++){
    if(!anvilState[i] || typeof anvilState[i] !== "object") anvilState[i] = { type: "worker", slots: [null, null] };
    anvilState[i].type = anvilState[i].type === "pet" ? "pet" : "worker";
    if(!Array.isArray(anvilState[i].slots) || anvilState[i].slots.length < 2) anvilState[i].slots = [null, null];
    anvilState[i].slots.length = 2;
    for(let s = 0; s < 2; s++){
      const stone = anvilState[i].slots[s];
      if(stone && typeof stone === "object"){
        const tier = Number(stone.tier) || 0;
        anvilState[i].slots[s] = tier > 0 ? { tier } : null;
      } else anvilState[i].slots[s] = null;
    }
  }
}

function returnAnvilStonesAt(idx){
  ensureAnvilState();
  ensureStoneData();
  const i = Number(idx) || 0;
  if(i < 0 || i >= anvilState.length) return;
  const type = anvilState[i].type === "pet" ? "pet" : "worker";
  anvilState[i].slots.forEach(stone => {
    if(stone && stone.tier) addStoneCount(type, stone.tier, 1);
  });
  anvilState[i].slots = [null, null];
}

function returnAnvilStonesToInventory(){
  ensureAnvilState();
  for(let i = 0; i < anvilState.length; i++) returnAnvilStonesAt(i);
}

function resetForgeAndAnvil(){
  returnAnvilStonesToInventory();
  forgeJobs = [null, null];
  while(forgeJobs.length < (typeof FORGE_SLOT_COUNT === "number" ? FORGE_SLOT_COUNT : 2)) forgeJobs.push(null);
}

function setAnvilType(idx, type){
  ensureAnvilState();
  const i = Number(idx) || 0;
  if(forgeJobs[i]) return;
  const next = type === "pet" ? "pet" : "worker";
  if(anvilState[i].type === next) return;
  returnAnvilStonesAt(i);
  anvilState[i].type = next;
  save();
  update();
}

function placeStoneOnAnvil(forgeIdx, slotIdx, tier){
  if(!isStonesUnlocked()) return;
  ensureStoneData();
  ensureAnvilState();
  const i = Number(forgeIdx) || 0;
  const s = Number(slotIdx) || 0;
  if(i < 0 || i >= anvilState.length || s < 0 || s > 1) return;
  if(forgeJobs[i]){
    alert("Clear the active forge job before placing stones.");
    return;
  }
  if(anvilState[i].slots[s]){
    alert("That anvil slot is full. Click it to remove the stone.");
    return;
  }
  const t = Math.max(1, Math.floor(Number(tier) || 0));
  const type = anvilState[i].type === "pet" ? "pet" : "worker";
  if(getStoneCount(type, t) <= 0){
    alert(`No ${type} T${t} in inventory.`);
    return;
  }
  removeStoneCount(type, t, 1);
  anvilState[i].slots[s] = { tier: t };
  save();
  update();
}

function clearAnvilSlot(forgeIdx, slotIdx){
  ensureStoneData();
  ensureAnvilState();
  const i = Number(forgeIdx) || 0;
  const s = Number(slotIdx) || 0;
  if(i < 0 || i >= anvilState.length || s < 0 || s > 1) return;
  const stone = anvilState[i].slots[s];
  if(!stone) return;
  const type = anvilState[i].type === "pet" ? "pet" : "worker";
  addStoneCount(type, stone.tier, 1);
  anvilState[i].slots[s] = null;
  save();
  update();
}

function strikeAnvil(forgeIdx){
  if(!isStonesUnlocked()){
    alert("Forge unlocks at Tornado Prestige level 2.");
    return;
  }
  ensureStoneData();
  ensureAnvilState();
  const idx = Number(forgeIdx) || 0;
  if(idx < 0 || idx >= forgeJobs.length) return;
  if(forgeJobs[idx]){
    alert(`Anvil ${idx + 1} is already forging.`);
    return;
  }
  const type = anvilState[idx].type === "pet" ? "pet" : "worker";
  const tiers = anvilState[idx].slots.map(st => (st && st.tier) ? Number(st.tier) : 0);
  if(tiers.some(t => !t)){
    alert("Place two stones on the anvil before striking.");
    return;
  }
  const [a, b] = tiers;
  let recipe = null;
  if(a === b) recipe = resolveForgeRecipe("same", a, b);
  else recipe = resolveForgeRecipe("adjacent", a, b);
  if(!recipe){
    alert("Invalid recipe. Use two of the same tier (2×T1→T2) or adjacent tiers (T1+T2→T3).");
    return;
  }
  anvilState[idx].slots = [null, null];
  forgeJobs[idx] = {
    type,
    mode: recipe.mode,
    a: recipe.a,
    b: recipe.b,
    result: recipe.result,
    time: FORGE_SECONDS
  };
  save();
  update();
}

function completeForgeSlot(idx){
  const job = forgeJobs[idx];
  if(!job) return;
  addStoneCount(job.type, job.result, 1);
  forgeJobs[idx] = null;
}

function tickForge(){
  ensureStoneData();
  let changed = false;
  for(let i = 0; i < forgeJobs.length; i++){
    const job = forgeJobs[i];
    if(!job) continue;
    job.time -= 1;
    if(job.time <= 0){
      completeForgeSlot(i);
      changed = true;
    }
  }
  if(changed) save();
}

function fastForwardForge(seconds){
  ensureStoneData();
  const sec = Number(seconds) || 0;
  let changed = false;
  for(let i = 0; i < forgeJobs.length; i++){
    const job = forgeJobs[i];
    if(!job) continue;
    job.time = Math.max(0, job.time - sec);
    if(job.time <= 0){
      completeForgeSlot(i);
      changed = true;
    }
  }
}

function formatForgeTime(seconds){
  const s = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if(h > 0) return `${h}h ${m}m ${sec}s`;
  if(m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatTierList(type){
  const tiers = getInventoryTiers(type);
  if(!tiers.length) return "none";
  return tiers.map(t => `T${t}:${getStoneCount(type, t)}`).join(" ");
}

function buildTierApplyButtons(type, onApplyName){
  const tiers = getInventoryTiers(type);
  if(!tiers.length) return `<span class="small">No stones in inventory</span>`;
  return tiers.map(t =>
    `<button type="button" class="ghost" onclick="${onApplyName}(${t})">Apply T${t}</button>`
  ).join("");
}

function renderStoneShop(){
  ensureStoneData();
  const panel = document.getElementById("stone-shop");
  if(!panel) return;

  const locked = document.getElementById("stoneShopLocked");
  const content = document.getElementById("stoneShopContent");
  if(locked) locked.style.display = isStonesUnlocked() ? "none" : "block";
  if(content) content.style.display = isStonesUnlocked() ? "block" : "none";
  updateStonesUnlockNav();
  if(!isStonesUnlocked()) return;

  const inv = document.getElementById("stoneInventorySummary");
  if(inv) inv.textContent = `Worker: ${formatTierList("worker")} | Pet: ${formatTierList("pet")}`;

  const buildWrap = document.getElementById("stoneShopBuildingList");
  if(buildWrap){
    buildWrap.innerHTML = "";
    [1, 2].forEach(tier => {
      const cost = getWorkerStoneCost(tier);
      const pct = Math.round(getStoneRateMult(tier) * 100);
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<div>Worker T${tier} (${pct}%)</div><button type="button" class="primary" onclick="buyStone('worker',${tier})">Buy ${cost.toLocaleString()}</button>`;
      buildWrap.appendChild(div);
    });
  }

  const petWrap = document.getElementById("stoneShopPetList");
  if(petWrap){
    petWrap.innerHTML = "";
    [1, 2].forEach(tier => {
      const cost = getPetStoneCost(tier);
      const pct = Math.round(getStoneRateMult(tier) * 100);
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `<div>Pet T${tier} (${pct}%)</div><button type="button" class="primary" onclick="buyStone('pet',${tier})">Buy ${cost.toLocaleString()}</button>`;
      petWrap.appendChild(div);
    });
  }

  const applyBuild = document.getElementById("stoneApplyBuildings");
  if(applyBuild){
    applyBuild.innerHTML = "";
    BUILDING_KEYS.forEach(key => {
      const tier = Number(appliedBuildingStones[key]) || 0;
      const row = document.createElement("div");
      row.className = "stone-apply-row";
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      row.innerHTML = `
        <div>
          <strong>${label}</strong>
          <div class="small">Applied: ${tier ? `T${tier} (${Math.round(getStoneRateMult(tier) * 100)}%)` : "None"}</div>
          <div class="controls stone-tier-btns">${buildTierApplyButtons("worker", `applyBuildingStoneTo('${key}',`)}</div>
        </div>
        <div class="controls">
          <button type="button" class="ghost" ${tier ? "" : "disabled"} onclick="removeBuildingStone('${key}')">Remove</button>
        </div>
      `;
      applyBuild.appendChild(row);
    });
  }

  const applyPets = document.getElementById("stoneApplyPets");
  if(applyPets){
    syncPetStoneSlots();
    const active = getActivePetValues();
    applyPets.innerHTML = "";
    if(!active.length){
      applyPets.innerHTML = `<div class="small">No active pets equipped/permanent.</div>`;
    } else {
      for(let i = 0; i < active.length; i++){
        const tier = Number(appliedPetStones[i]) || 0;
        const row = document.createElement("div");
        row.className = "stone-apply-row";
        row.innerHTML = `
          <div>
            <strong>Pet Slot ${i + 1}</strong>
            <div class="small">Base +${active[i]} | Stone: ${tier ? `T${tier}` : "None"}</div>
            <div class="controls stone-tier-btns">${buildTierApplyButtons("pet", `applyPetStoneTo(${i},`)}</div>
          </div>
          <div class="controls">
            <button type="button" class="ghost" ${tier ? "" : "disabled"} onclick="removePetStone(${i})">Remove</button>
          </div>
        `;
        applyPets.appendChild(row);
      }
    }
  }
}

function buildForgeInventoryHtml(forgeIdx){
  ensureAnvilState();
  const type = anvilState[forgeIdx].type === "pet" ? "pet" : "worker";
  const tiers = getInventoryTiers(type);
  const busy = !!forgeJobs[forgeIdx];
  if(busy) return `<span class="small">Anvil is hot — wait for the forge to finish.</span>`;
  if(!tiers.length) return `<span class="small">No ${type} stones in inventory. Buy T1/T2 from the Stone Shop.</span>`;
  const slots = anvilState[forgeIdx].slots;
  return tiers.map(t => {
    const count = getStoneCount(type, t);
    const leftDisabled = busy || slots[0] ? "disabled" : "";
    const rightDisabled = busy || slots[1] ? "disabled" : "";
    return `<span class="forge-stone-group">
      <span class="small">T${t} ×${count}</span>
      <button type="button" class="ghost forge-stone-chip" ${leftDisabled} onclick="placeStoneOnAnvil(${forgeIdx},0,${t})">Left</button>
      <button type="button" class="ghost forge-stone-chip" ${rightDisabled} onclick="placeStoneOnAnvil(${forgeIdx},1,${t})">Right</button>
    </span>`;
  }).join("");
}

function renderAnvilSlot(forgeIdx, slotIdx){
  const stone = anvilState[forgeIdx].slots[slotIdx];
  const busy = !!forgeJobs[forgeIdx];
  if(!stone){
    return `<div class="anvil-slot anvil-slot--empty" title="Place a stone from inventory below">+</div>`;
  }
  return `<button type="button" class="anvil-slot anvil-slot--filled" ${busy ? "disabled" : ""} onclick="clearAnvilSlot(${forgeIdx},${slotIdx})" title="Click to return to inventory">T${stone.tier}</button>`;
}

function updateStonesUnlockNav(){
  if(typeof updateNavLocks === "function") updateNavLocks();
}

function renderForgeTab(){
  ensureStoneData();
  const locked = document.getElementById("forgeLocked");
  const content = document.getElementById("forgeContent");
  if(locked) locked.style.display = isStonesUnlocked() ? "none" : "block";
  if(content) content.style.display = isStonesUnlocked() ? "block" : "none";
  if(!isStonesUnlocked()) return;

  for(let i = 0; i < forgeJobs.length; i++){
    const typeEl = document.getElementById(`anvilType_${i}`);
    if(typeEl){
      typeEl.value = anvilState[i].type === "pet" ? "pet" : "worker";
      if(!typeEl.dataset.bound){
        typeEl.dataset.bound = "1";
        typeEl.onchange = () => setAnvilType(i, typeEl.value);
      }
    }

    const slot0 = document.getElementById(`anvilSlot0_${i}`);
    const slot1 = document.getElementById(`anvilSlot1_${i}`);
    if(slot0) slot0.innerHTML = renderAnvilSlot(i, 0);
    if(slot1) slot1.innerHTML = renderAnvilSlot(i, 1);

    const inv = document.getElementById(`forgeInventory_${i}`);
    if(inv) inv.innerHTML = buildForgeInventoryHtml(i);

    const job = forgeJobs[i];
    const status = document.getElementById(`forgeStatus_${i}`);
    if(status){
      if(!job) status.textContent = "Place two stones on the anvil, then strike. Recipes: 2× same tier → +1, or adjacent tiers → +1.";
      else {
        const recipe = job.mode === "same"
          ? `2×T${job.a} → T${job.result}`
          : `T${job.a}+T${job.b} → T${job.result}`;
        status.textContent = `Forging ${job.type === "pet" ? "pet" : "worker"} ${recipe} — ${formatForgeTime(job.time)} left`;
      }
    }
    const btn = document.getElementById(`anvilStrike_${i}`);
    if(btn) btn.disabled = !!job;
  }
  updateStonesUnlockNav();
}

window.applyBuildingStoneTo = applyBuildingStoneTo;
window.removeBuildingStone = removeBuildingStone;
window.applyPetStoneTo = applyPetStoneTo;
window.removePetStone = removePetStone;
window.buyStone = buyStone;
window.placeStoneOnAnvil = placeStoneOnAnvil;
window.clearAnvilSlot = clearAnvilSlot;
window.strikeAnvil = strikeAnvil;
window.setAnvilType = setAnvilType;
