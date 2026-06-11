const DAY_SEC = 86400;
const EXPANSION_EGGS = [
  { id: 'exp_day', cost: 5, multi: 0.5, time: 1 * DAY_SEC, duration: '1 Day' },
  { id: 'exp_20d', cost: 10, multi: 1, time: 20 * DAY_SEC, duration: '20 Days' },
  { id: 'exp_2mo', cost: 100, multi: 5, time: 60 * DAY_SEC, duration: '2 Months' },
  { id: 'exp_1y', cost: 500, multi: 20, time: 365 * DAY_SEC, duration: '1 Year' },
  { id: 'exp_2y', cost: 1000, multi: 30, time: 2 * 365 * DAY_SEC, duration: '2 Years' },
  { id: 'exp_forever', cost: 5000, multi: 50, time: 100 * 365 * DAY_SEC, duration: 'Forever' }
];

function getExpansionEgg(id){
  return EXPANSION_EGGS.find(e => e.id === id);
}

function getExpansionMultiSum(){
  if(!Array.isArray(expansionPets)) return 0;
  return expansionPets.reduce((sum, p) => sum + (Number(p.multi) || 0), 0);
}

function isAnyHatching(){
  return !!(hatching || expansionHatching);
}

function formatExpansionTimeLeft(seconds, durationLabel){
  if(durationLabel === 'Forever') return 'Forever';
  if(seconds <= 0) return '0m';
  const d = Math.floor(seconds / DAY_SEC);
  const h = Math.floor((seconds % DAY_SEC) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if(d > 365) return 'Forever';
  if(d >= 1) return `${d}d ${h}h`;
  if(h >= 1) return `${h}h ${m}m`;
  return `${m}m`;
}

function completeExpansionHatch(){
  if(!expansionHatching) return;
  expansionPets.push({
    id: expansionHatching.id,
    multi: expansionHatching.multi,
    hatchedAt: Date.now()
  });
  expansionHatching = null;
}

function startExpansionHatch(egg){
  if(hasInstantHatch()){
    expansionPets.push({ id: egg.id, multi: egg.multi, hatchedAt: Date.now() });
    return;
  }
  expansionHatching = {
    id: egg.id,
    multi: egg.multi,
    time: egg.time,
    duration: egg.duration
  };
}

function buyExpansionEgg(eggId){
  const egg = getExpansionEgg(eggId);
  if(!egg) return;
  if(isAnyHatching()){
    alert('Already hatching an egg (regular or expansion).');
    return;
  }
  if(whyEggs < egg.cost){
    alert(`Need ${egg.cost.toLocaleString()} why egg(s), you have ${whyEggs}.`);
    return;
  }
  whyEggs -= egg.cost;
  startExpansionHatch(egg);
  save();
  update();
}

function cancelExpansionHatch(){
  if(expansionHatching){
    expansionHatching = null;
    save();
    update();
  }
}

function tickExpansionHatch(){
  if(!expansionHatching) return;
  if(hasInstantHatch()){
    completeExpansionHatch();
    return;
  }
  expansionHatching.time -= getHatchSpeedMult();
  if(expansionHatching.time <= 0) completeExpansionHatch();
}

function fastForwardExpansionHatch(seconds){
  if(!expansionHatching) return;
  expansionHatching.time = Math.max(0, expansionHatching.time - seconds);
  if(expansionHatching.time <= 0) completeExpansionHatch();
}

function renderExpansionTab(){
  const body = document.getElementById('expansionTableBody');
  if(body){
    body.innerHTML = '';
    EXPANSION_EGGS.forEach(egg => {
      const tr = document.createElement('tr');
      const busy = isAnyHatching();
      const afford = whyEggs >= egg.cost;
      tr.innerHTML = `
        <td>${egg.cost.toLocaleString()} why egg(s)</td>
        <td>${egg.duration}</td>
        <td>+${egg.multi}</td>
        <td><button class="primary" ${busy || !afford ? 'disabled' : ''} onclick="buyExpansionEgg('${egg.id}')">Buy</button></td>
      `;
      body.appendChild(tr);
    });
  }

  const hatchEl = document.getElementById('expansionHatch');
  const cancelBtn = document.getElementById('cancelExpansionHatchBtn');
  if(hatchEl){
    if(expansionHatching){
      const egg = getExpansionEgg(expansionHatching.id);
      const label = egg ? egg.duration : '';
      const left = formatExpansionTimeLeft(expansionHatching.time, expansionHatching.duration || label);
      hatchEl.textContent = `Expansion hatch: ${label} (+${expansionHatching.multi} S) — ${left} remaining`;
      if(cancelBtn) cancelBtn.style.display = 'inline-flex';
    } else {
      hatchEl.textContent = 'Expansion hatch: None';
      if(cancelBtn) cancelBtn.style.display = 'none';
    }
  }

  const ownedEl = document.getElementById('expansionOwned');
  if(ownedEl){
    if(!expansionPets.length){
      ownedEl.textContent = 'Owned: None (S bonus +0)';
    } else {
      const list = expansionPets.map(p => {
        const egg = getExpansionEgg(p.id);
        return `${egg ? egg.duration : 'Pet'} +${p.multi}`;
      }).join(', ');
      ownedEl.textContent = `Owned: ${list} — S bonus +${getExpansionMultiSum()}`;
    }
  }
}
