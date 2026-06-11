function renderGarden(){
  const grid = document.getElementById('gardenGrid');
  if(!grid) return;
  grid.innerHTML = '';
  for(let row=0;row<10;row++){
    for(let col=0;col<10;col++){
      const cell = document.createElement('div');
      const idx = row*10 + col;
      let plot = gardenPlots[idx] || { state: 'locked' };
      const unlocked = !(plot.state === 'locked');
      cell.className = 'garden-cell '+(unlocked ? 'unlocked' : 'locked');
      let label = '';
      let emoji = '';
      cell.title = '';
      if(!unlocked) {
        label = 'Locked';
      } else if(plot.state === 'empty') {
        if(isWheatFlowerCenter(idx)){
          cell.title = 'Wheat flower (100% each 40m tick) — 4 wheat petals, spawns duskgrain here';
        } else if(isChokeberryFlowerCenter(idx)){
          cell.title = 'Chokeberry flower (75% each 40m tick) — duskgrain + cocoa + 2 empty petals';
        } else {
          cell.title = 'Empty plot';
        }
      } else if(plot.state === 'growing'){
        const elapsed = Math.floor((Date.now() - plot.plantedAt)/1000);
        const growthModifier = getGrowthModifier(idx);
        const effectiveGrowTime = Math.max(Math.floor(plot.growTime * growthModifier), 0);
        const remaining = Math.max(effectiveGrowTime - elapsed, 0);
        const currentWater = getCurrentWater(plot, idx);
        if(currentWater <= 0){
          gardenPlots[idx] = { state: 'empty' };
          save();
          continue;
        }
        if(remaining <= 0){ plot.state = 'ready'; save(); }
        else {
          emoji = getCropEmoji(plot.type);
          const effectLabel = getEffectLabel(idx);
          cell.title = `Growing ${Math.ceil(remaining/60)}m — Water: ${currentWater}%` + (effectLabel ? ` | ${effectLabel}` : '');
          cell.onclick = ()=>{
            if(handWaterMode) handWaterPlot(idx);
            else if(selectedCanIndex!==null) waterPlot(idx);
          };
        }
      } else if(plot.state === 'ready'){
        const currentWater = getCurrentWater(plot, idx);
        if(currentWater <= 0){
          gardenPlots[idx] = { state: 'empty' };
          save();
          continue;
        }
        emoji = getCropEmoji(plot.type);
        const effectLabel = getEffectLabel(idx);
        cell.title = `Ready to harvest — Water: ${currentWater}%` + (effectLabel ? ` | ${effectLabel}` : '');
      }
      cell.textContent = emoji || label;
      if(unlocked){
        if(plot.state === 'empty') cell.onclick = ()=>plantFromGarden(idx);
        if(plot.state === 'ready') cell.onclick = ()=>harvestGarden(idx);
      } else {
        if(vines > 0) {
          cell.onclick = ()=>useVineToUnlockSlot(idx);
          cell.title = 'Spend 1 ethereal vine to unlock this plot';
        } else {
          cell.title = 'Locked plot â€” collect ethereal vines to unlock';
        }
      }
      grid.appendChild(cell);
    }
  }
}

function getAdjacentIndices(idx){
  const row = Math.floor(idx / 10);
  const col = idx % 10;
  const adjacent = [];
  if(col > 0) adjacent.push(idx - 1);
  if(col < 9) adjacent.push(idx + 1);
  if(row > 0) adjacent.push(idx - 10);
  if(row < 9) adjacent.push(idx + 10);
  return adjacent;
}

function getCardinalIndices(idx){
  const row = Math.floor(idx / 10);
  const col = idx % 10;
  const out = [];
  if(row > 0) out.push(idx - 10);
  if(row < 9) out.push(idx + 10);
  if(col > 0) out.push(idx - 1);
  if(col < 9) out.push(idx + 1);
  return out;
}

function getWheatFlowerLayout(centerIdx){
  const center = gardenPlots[centerIdx];
  if(!center || center.state !== 'empty') return null;
  const cardinals = getCardinalIndices(centerIdx);
  if(cardinals.length !== 4) return null;
  const wheatIndices = [];
  for(const i of cardinals){
    const p = gardenPlots[i];
    if(!p || p.state === 'locked') return null;
    if((p.state === 'ready' || p.state === 'growing') && p.type === 'wheat'){
      wheatIndices.push(i);
    } else {
      return null;
    }
  }
  if(wheatIndices.length !== 4) return null;
  return { centerIdx, wheatIndices };
}

function isWheatFlowerCenter(centerIdx){
  return getWheatFlowerLayout(centerIdx) !== null;
}

function getChokeberryFlowerLayout(centerIdx){
  const center = gardenPlots[centerIdx];
  if(!center || center.state !== 'empty') return null;
  const cardinals = getCardinalIndices(centerIdx);
  if(cardinals.length !== 4) return null;

  let duskgrain = 0;
  let cocoa = 0;
  let empty = 0;
  const duskgrainIdx = [];
  const cocoaIdx = [];

  for(const i of cardinals){
    const p = gardenPlots[i];
    if(!p || p.state === 'locked') return null;
    if(p.state === 'empty'){
      empty++;
    } else if(p.state === 'ready' && p.type === 'duskgrain'){
      duskgrain++;
      duskgrainIdx.push(i);
    } else if((p.state === 'ready' || p.state === 'growing') && p.type === 'cocoa'){
      cocoa++;
      cocoaIdx.push(i);
    } else {
      return null;
    }
  }

  if(duskgrain !== 1 || cocoa !== 1 || empty !== 2) return null;
  return { centerIdx, duskgrainIdx: duskgrainIdx[0], cocoaIdx: cocoaIdx[0] };
}

function isChokeberryFlowerCenter(centerIdx){
  return getChokeberryFlowerLayout(centerIdx) !== null;
}

const CHOKEBERRY_MUTATION_CHANCE = 0.75;

function spawnMutationCrop(centerIdx, type){
  gardenPlots[centerIdx] = {
    state: 'ready',
    type,
    plantedAt: Date.now(),
    growTime: 0,
    water: 100,
    waterUpdatedAt: Date.now()
  };
}

function tickGardenMutations(){
  ensureGardenPlots();
  let changed = false;
  for(let idx = 0; idx < 100; idx++){
    const wheatLayout = getWheatFlowerLayout(idx);
    if(wheatLayout){
      spawnMutationCrop(wheatLayout.centerIdx, 'duskgrain');
      wheatLayout.wheatIndices.forEach(i => { gardenPlots[i] = { state: 'empty' }; });
      changed = true;
      continue;
    }
    const layout = getChokeberryFlowerLayout(idx);
    if(!layout) continue;
    if(Math.random() >= CHOKEBERRY_MUTATION_CHANCE) continue;
    spawnMutationCrop(layout.centerIdx, 'chokeberry');
    gardenPlots[layout.duskgrainIdx] = { state: 'empty' };
    gardenPlots[layout.cocoaIdx] = { state: 'empty' };
    changed = true;
  }
  if(changed){
    save();
    if(typeof update === 'function') update();
    if(typeof renderGarden === 'function') renderGarden();
  }
}

function getCropEmoji(type){
  const map = {
    wheat: '🌾', potato: '🥔', pumpkin: '🎃', carrot: '🥕', melon: '🍈',
    cocoa: '🌰', apple: '🍎', netherwart: '🍄', banana: '🍌',
    duskgrain: '✨', chokeberry: '🫐'
  };
  return map[type] || '🌾';
}

function getAdjacentTypes(idx){
  const types = {};
  getAdjacentIndices(idx).forEach(i=>{
    const plot = gardenPlots[i];
    if(plot && plot.state !== 'empty' && plot.state !== 'locked' && plot.type){
      types[plot.type] = true;
    }
  });
  return types;
}

function getGrowthModifier(idx){
  const adj = getAdjacentTypes(idx);
  if(adj.banana) return 0;
  if(adj.apple) return 0.5;
  return 1;
}

function getWaterDecayModifier(idx){
  const adj = getAdjacentTypes(idx);
  return (adj.pumpkin || adj.melon) ? 0.5 : 1;
}

function getHarvestMultiplier(idx){
  const adj = getAdjacentTypes(idx);
  let mult = 1;
  if(adj.wheat) mult *= 2;
  if(adj.banana) mult *= 4;
  return mult;
}

function getMutationChance(idx){
  const adj = getAdjacentTypes(idx);
  return adj.potato ? 0.1 : 0.05;
}

function getVineDropChance(idx){
  const adj = getAdjacentTypes(idx);
  if(adj.apple) return 0;
  if(adj.netherwart) return 0.2;
  return 0.05;
}

function getEffectLabel(idx){
  const adj = getAdjacentTypes(idx);
  const labels = [];
  if(adj.wheat) labels.push('x2 drops');
  if(adj.potato) labels.push('mutation x2');
  if(adj.pumpkin) labels.push('retain water');
  if(adj.melon) labels.push('retain water');
  if(adj.apple) labels.push('half growth, no vine');
  if(adj.netherwart) labels.push('vine x2');
  if(adj.banana) labels.push('x4 drops, instant growth');
  return labels.join('; ');
}

function getCropRarity(type){
  const map = {
    wheat:'common',
    potato:'common',
    pumpkin:'common',
    carrot:'common',
    melon:'common',
    cocoa:'common',
    apple:'common',
    netherwart:'common',
    banana:'common',
    duskgrain:'epic',
    chokeberry:'rare'
  };
  return map[type] || 'common';
}

function getVineDropRate(type){
  const rarity = getCropRarity(type);
  return rarity === 'common' ? 0.25
    : rarity === 'rare' ? 0.5
    : rarity === 'epic' ? 0.75
    : rarity === 'legendary' ? 1 : 0.25;
}

function getEtherealVineDropChance(type, idx){
  let chance = getVineDropRate(type);
  const adj = getAdjacentTypes(idx);
  if(adj.apple) return 0;
  if(adj.netherwart) chance = Math.min(1, chance * 2);
  return chance;
}

function useVineToUnlockSlot(idx){
  const plot = gardenPlots[idx];
  if(!plot || plot.state !== 'locked') return;
  if(vines <= 0){ alert('No ethereal vines available'); return; }
  vines -= 1;
  gardenPlots[idx] = { state: 'empty' };
  save();
  update();
  renderGarden();
}

function plantFromGarden(idx){
  if(!gardenPlots[idx] || gardenPlots[idx].state !== 'empty'){ alert('Plot not available'); return; }
  if(!Array.isArray(seeds) || seeds.length === 0){ alert('No seeds in inventory'); return; }
  const seed = seeds.splice(0,1)[0];
  const type = seed.type || 'wheat';
  const growTimeMap = {
    wheat: 4 * 40 * 60,
    potato: 4 * 40 * 60,
    pumpkin: 440 * 60,
    carrot: 200 * 60,
    melon: 440 * 60,
    cocoa: 12 * 40 * 60,
    apple: 16 * 40 * 60,
    netherwart: 8 * 40 * 60,
    banana: 1 * 40 * 60
  };
  const growTime = growTimeMap[type] || 4 * 40 * 60;
  gardenPlots[idx] = {
    state: 'growing', type, plantedAt: Date.now(), growTime,
    water: 100, waterUpdatedAt: Date.now()
  };
  save();
  update();
  renderGarden();
}

function getCurrentWater(plot, idx){
  if(!plot) return 0;
  const base = (typeof plot.water === 'number') ? plot.water : 100;
  const last = plot.waterUpdatedAt || plot.plantedAt || Date.now();
  const modifier = getWaterDecayModifier(idx);
  const decays = Math.floor((Date.now() - last) / (40*60*1000));
  return Math.max(0, base - decays * 25 * modifier);
}

function getMutationTierChance(tier){
  const map = { common: 1, rare: 0.75, epic: 0.5, legend: 0.25, legendary: 0.25 };
  return map[tier] || 0.25;
}

function rollMutationTier(){
  const tiers = ['common','rare','epic','legend'];
  for(const t of tiers){
    if(Math.random() < getMutationTierChance(t)) return t;
  }
  return 'legend';
}

function handWaterPlot(centerIdx){
  if(chokeberries < 1){ alert('Need 1 chokeberry to hand-water (grow via rare garden mutation).'); return; }
  const targets = [centerIdx, ...getAdjacentIndices(centerIdx)].slice(0, 16);
  let watered = 0;
  targets.forEach(idx => {
    const plot = gardenPlots[idx];
    if(!plot || plot.state === 'locked') return;
    if(plot.state === 'growing' || plot.state === 'ready'){
      const current = getCurrentWater(plot, idx);
      plot.water = Math.min(100, current + 25);
      plot.waterUpdatedAt = Date.now();
      watered++;
    }
  });
  if(watered > 0){
    chokeberries -= 1;
    save();
    update();
    renderGarden();
  }
}

function waterPlot(idx){
  const plot = gardenPlots[idx];
  if(!plot || (plot.state !== 'growing' && plot.state !== 'ready')) return;
  if(selectedCanIndex === null){ alert('Select a water can from Inventory first'); return; }
  const can = waterCans[selectedCanIndex];
  if(!can){ alert('Selected can not found'); selectedCanIndex = null; return; }
  const now = Date.now();
  const cooldown = 10 * 60 * 1000;
  if(can.lastUsedAt && (now - can.lastUsedAt) < cooldown){
    const rem = Math.ceil((cooldown - (now - can.lastUsedAt)) / 60000);
    alert('Can is on cooldown: '+rem+'m remaining');
    return;
  }
  const current = getCurrentWater(plot, idx);
  const isAdv = can.type === 'advanced';
  const added = isAdv ? 50 : 25;
  if(isAdv){
    const row = Math.floor(idx/10), col = idx%10;
    for(let r=Math.max(0,row-2); r<=Math.min(9,row+2); r++){
      for(let c=Math.max(0,col-2); c<=Math.min(9,col+2); c++){
        const i = r*10+c;
        const p = gardenPlots[i];
        if(p && (p.state==='growing'||p.state==='ready')){
          const w = getCurrentWater(p, i);
          p.water = Math.min(100, w + added);
          p.waterUpdatedAt = now;
        }
      }
    }
  } else {
  const newWater = Math.min(100, current + added);
  plot.water = newWater;
  plot.waterUpdatedAt = now;
  }
  can.lastUsedAt = now;
  save();
  update();
  renderGarden();
}

function harvestGarden(idx){
  const plot = gardenPlots[idx];
  if(!plot) return;
  if(plot.state !== 'ready') return;

  if(plot.type === 'chokeberry'){
    chokeberries = (Number(chokeberries) || 0) + 1;
    gardenPlots[idx] = { state: 'empty' };
    save();
    update();
    renderGarden();
    return;
  }

  const valueMap = {
    wheat: 200000,
    potato: 120000,
    pumpkin: 500000,
    carrot: 250000,
    melon: 500000,
    cocoa: 600000,
    apple: 750000,
    netherwart: 480000,
    banana: 200000,
    duskgrain: 2500000
  };
  const worth = valueMap[plot.type] || 0;
  const amount = getHarvestMultiplier(idx);
  if(Math.random() < getEtherealVineDropChance(plot.type, idx)){
    vines += 1;
  }
  const stack = produce.find(item => item.type === plot.type && item.value === worth && (item.count || 1) < 64);
  if(stack){
    stack.count = (stack.count || 1) + amount;
    stack.harvestedAt = Date.now();
  } else {
    produce.push({
      type: plot.type,
      value: worth,
      count: amount,
      harvestedAt: Date.now(),
      mutationChance: getMutationChance(idx),
      vineDropChance: getVineDropChance(idx)
    });
  }
  gardenPlots[idx] = { state: 'empty' };
  save();
  update();
  renderGarden();
}
