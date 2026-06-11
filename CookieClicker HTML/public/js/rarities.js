const RARITY_TIERS = [
  { id: 'common', mult: 1 },
  { id: 'rare', mult: 2 },
  { id: 'epic', mult: 4 },
  { id: 'legendary', mult: 8 },
  { id: 'mythical', mult: 16 }
];

function rollPetRarity(){
  if(!raritiesRollUnlocked){ alert('Unlock rarities roll in Portal Shop first.'); return null; }
  const isRareTrack = Math.random() < 0.5;
  const pool = isRareTrack
    ? RARITY_TIERS.filter(t => t.id !== 'common')
  : RARITY_TIERS.filter(t => t.id === 'common' || t.id === 'rare');
  const pick = pool[Math.floor(Math.random() * pool.length)] || RARITY_TIERS[0];
  pendingRarityMult = pick.mult;
  return pick;
}

function doRarityRoll(){
  const tier = rollPetRarity();
  if(!tier) return;
  const el = document.getElementById('rarityResult');
  if(el) el.textContent = `Rolled ${tier.id} (×${tier.mult}) — applies to next hatched pet.`;
  save();
  update();
}

function applyRarityToHatch(multi){
  const m = Number(multi) || 0;
  if(pendingRarityMult > 1){
    const boosted = m * pendingRarityMult;
    pendingRarityMult = 1;
    return boosted;
  }
  return m;
}

function updateRaritiesUI(){
  const el = document.getElementById('rarityRollSection');
  if(el) el.style.display = raritiesRollUnlocked ? 'block' : 'none';
}

window.doRarityRoll = doRarityRoll;
