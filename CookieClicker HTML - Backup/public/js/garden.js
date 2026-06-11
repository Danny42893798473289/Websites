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
        maybeStartWheatMutation(idx);
        const updatedPlot = gardenPlots[idx];
        if(updatedPlot.state === 'ready') {
          plot = updatedPlot;
          const currentWater = getCurrentWater(plot, idx);
          emoji = plot.type === 'duskgrain' ? 'âœ¨'
            : plot.type === 'potato' ? 'ðŸ¥”'
            : plot.type === 'pumpkin' ? 'ðŸŽƒ'
            : plot.type === 'carrot' ? 'ðŸ¥•'
            : plot.type === 'melon' ? 'ðŸˆ'
            : plot.type === 'cocoa' ? 'ðŸŒ°'
            : plot.type === 'apple' ? 'ðŸŽ'
            : plot.type === 'netherwart' ? 'ðŸ„'
            : plot.type === 'banana' ? 'ðŸŒ' : 'ðŸŒ¾';
          const effectLabel = getEffectLabel(idx);
          cell.title = `Ready to harvest â€” Water: ${currentWater}%` + (effectLabel ? ` | ${effectLabel}` : '');
        } else {
          const remaining = getWheatMutationRemaining(idx);
          if(remaining !== null) {
            cell.title = `Wheat flower forming â€” ${remaining}m until Duskgrain`;
          } else {
            cell.title = 'Empty plot';
          }
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
          emoji = plot.type === 'potato' ? 'ðŸ¥”'
            : plot.type === 'pumpkin' ? 'ðŸŽƒ'
            : plot.type === 'carrot' ? 'ðŸ¥•'
            : plot.type === 'melon' ? 'ðŸˆ'
            : plot.type === 'cocoa' ? 'ðŸŒ°'
            : plot.type === 'apple' ? 'ðŸŽ'
            : plot.type === 'netherwart' ? 'ðŸ„'
            : plot.type === 'banana' ? 'ðŸŒ' : 'ðŸŒ¾';
          const effectLabel = getEffectLabel(idx);
          cell.title = `Growing ${Math.ceil(remaining/60)}m â€” Water: ${currentWater}%` + (effectLabel ? ` | ${effectLabel}` : '');
          // allow watering when growing
          cell.onclick = ()=>{ if(selectedCanIndex!==null) waterPlot(idx); };
        }
      } else if(plot.state === 'ready'){
        const currentWater = getCurrentWater(plot, idx);
        if(currentWater <= 0){
          gardenPlots[idx] = { state: 'empty' };
          save();
          continue;
        }
        emoji = plot.type === 'duskgrain' ? 'âœ¨'
          : plot.type === 'potato' ? 'ðŸ¥”'
          : plot.type === 'pumpkin' ? 'ðŸŽƒ'
          : plot.type === 'carrot' ? 'ðŸ¥•'
          : plot.type === 'melon' ? 'ðŸˆ'
          : plot.type === 'cocoa' ? 'ðŸŒ°'
          : plot.type === 'apple' ? 'ðŸŽ'
          : plot.type === 'netherwart' ? 'ðŸ„'
          : plot.type === 'banana' ? 'ðŸŒ' : 'ðŸŒ¾';
        const effectLabel = getEffectLabel(idx);
        cell.title = `Ready to harvest â€” Water: ${currentWater}%` + (effectLabel ? ` | ${effectLabel}` : '');
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

function isWheatFlowerCenter(idx){
  const plot = gardenPlots[idx];
  if(!plot || plot.state !== 'empty') return false;
  return getAdjacentIndices(idx).every(i => {
    const adjacent = gardenPlots[i];
    return adjacent && adjacent.state !== 'empty' && adjacent.state !== 'locked' && adjacent.type === 'wheat';
  });
}

function getWheatMutationRemaining(idx){
  const plot = gardenPlots[idx];
  if(!plot || plot.state !== 'empty' || !plot.mutationStartedAt) return null;
  return Math.max(0, Math.ceil((40*60*1000 - (Date.now() - plot.mutationStartedAt)) / 60000));
}

function maybeStartWheatMutation(idx){
  const plot = gardenPlots[idx];
  if(!plot || plot.state !== 'empty') return;
  if(isWheatFlowerCenter(idx)){
    if(!plot.mutationStartedAt){
      plot.mutationStartedAt = Date.now();
      save();
      return;
    }
    if(Date.now() - plot.mutationStartedAt >= 40*60*1000){
      gardenPlots[idx] = {
        state: 'ready',
        type: 'duskgrain',
        plantedAt: Date.now(),
        growTime: 0,
        water: 100,
        waterUpdatedAt: Date.now()
      };
      save();
    }
  } else if(plot.mutationStartedAt){
    delete plot.mutationStartedAt;
  }
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
    duskgrain:'epic'
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
  return Math.max(0, base - decays * 20 * modifier);
}

function waterPlot(idx){
  const plot = gardenPlots[idx];
  if(!plot || plot.state !== 'growing') return;
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
  const added = 25; // basic can
  const newWater = Math.min(100, current + added);
  plot.water = newWater;
  plot.waterUpdatedAt = now;
  can.lastUsedAt = now;
  save();
  update();
  renderGarden();
}

function harvestGarden(idx){
  const plot = gardenPlots[idx];
  if(!plot) return;
  if(plot.state !== 'ready') return;
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
