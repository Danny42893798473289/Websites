function resetPrestigeProgress(){
  cookies = getStartCookies();
  grandmas = 0; farms = 0; factories = 0; oils = 0; mines = 0;
  coops = 0; wormholes = 0; galaxies = 0; empties = 0;
  pets = []; equipped = []; hatching = null;
  expansionPets = []; expansionHatching = null;
  applyMasteryStartingBuildings();
}

function canPrestige(){
  return cookies >= PRESTIGE_MIN_COOKIES;
}

function prestige(){
  if(!canPrestige()){
    alert(`You need at least ${PRESTIGE_MIN_COOKIES.toLocaleString()} cookies to prestige.`);
    return;
  }

  const earned = getWhyEggsFromCookies(cookies);
  const cap = getWhyEggCap();
  const space = Math.max(0, cap - whyEggs);
  const added = Math.min(earned, space);

  if(!confirm(
    `Prestige now?\n\nResets: cookies, main shop, pets.\nKeeps: garden, seeds, produce, vines, cans.\n\n+1 XP, +1 booster\n+${added} why egg(s) (${whyEggs} â†’ ${whyEggs + added}, cap ${cap})`
  )) return;

  whyEggs += added;
  xp += 1;
  boosters += 1;
  resetPrestigeProgress();
  save();
  update();
}

function fastForwardMinutes(minutes){
  const ticks = minutes / 40;
  const gain = Math.floor(getBase() * getMulti() * getPassiveMult() * ticks);
  cookies += gain;
  if(typeof nextCookieTickAt !== "undefined"){
    const skipMs = minutes * 60 * 1000;
    nextCookieTickAt = Math.max(Date.now(), (Number(nextCookieTickAt) || Date.now()) - skipMs);
  }
  if(hatching){
    const hatchSkip = minutes * 60 * getBoosterHatchMult();
    hatching.time = Math.max(0, hatching.time - hatchSkip);
    if(hatching.time <= 0){
      pets.push(hatching.multi);
      hatching = null;
    }
  }
  fastForwardExpansionHatch(minutes * 60 * getBoosterHatchMult());
  if(typeof fastForwardForge === "function") fastForwardForge(minutes * 60);
  return gain;
}

function useBooster(count){
  const cost = count === 2 ? 2 : 1;
  const minutes = count === 2 ? 120 : 40;
  if(boosters < cost){
    const el = document.getElementById('boosterResult');
    if(el) el.textContent = `Need ${cost} booster(s), you have ${boosters}.`;
    return;
  }
  boosters -= cost;
  const gained = fastForwardMinutes(minutes);
  save();
  update();
  const el = document.getElementById('boosterResult');
  if(el) el.textContent = `Fast-forwarded ${minutes} min â€” gained ${gained.toLocaleString()} cookies.`;
}

function updatePrestigeUI(){
  const cap = getWhyEggCap();
  const preview = getWhyEggsFromCookies(cookies);
  const ready = canPrestige();
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('prestigeXp', xp);
  set('prestigeBoosters', boosters);
  set('prestigeWhyEggs', whyEggs);
  set('prestigeWhyCap', cap);
  set('prestigeWhyPreview', preview);
  set('xpHud', xp);
  set('boostersHud', boosters);
  set('whyEggsHud', `${whyEggs} / ${cap} (+${getWhyEggMulti().toFixed(2)} multi)`);

  const btn = document.getElementById('prestigeBtn');
  if(btn){
    btn.disabled = !ready;
    btn.title = ready ? '' : `Requires ${PRESTIGE_MIN_COOKIES.toLocaleString()} cookies`;
  }
  const status = document.getElementById('prestigeStatus');
  if(status){
    status.textContent = ready
      ? 'Ready to prestige.'
      : `Need ${Math.max(0, PRESTIGE_MIN_COOKIES - Math.floor(cookies)).toLocaleString()} more cookies (minimum ${PRESTIGE_MIN_COOKIES.toLocaleString()}).`;
  }
}
