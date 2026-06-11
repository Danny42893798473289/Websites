const LIMBO_OPTIONS = [
  { id: 'none', label: 'No restriction', nextIceAgeReward: 1 },
  { id: 'halfS', label: '0.5× S (multiplier sum)', nextIceAgeReward: 2 },
  { id: 'noMastery', label: 'No Mastery', nextIceAgeReward: 2 },
  { id: 'noPets', label: 'No Pets', nextIceAgeReward: 2 },
  { id: 'noForge', label: 'No Forge', nextIceAgeReward: 2 },
  { id: 'halfS3', label: '0.5× S (strict)', nextIceAgeReward: 3 },
  { id: 'noBonusCap', label: 'No bonus why-egg cap', nextIceAgeReward: 5 },
  { id: 'noTPrestige', label: 'No Tornado Prestige', nextIceAgeReward: 10 }
];

function getLimboOption(id){
  return LIMBO_OPTIONS.find(o => o.id === id);
}

function getNextIceAgeRewardForRestriction(id){
  const opt = getLimboOption(id);
  return opt ? opt.nextIceAgeReward : 1;
}

function getScoreS(){
  return typeof getMulti === 'function' ? getMulti() : 1;
}

function getEffectiveScoreS(){
  let s = getScoreS();
  if(limboRestriction === 'halfS' || limboRestriction === 'halfS3'){
    s *= 0.5;
  }
  return Math.floor(s * 100) / 100;
}

function getIceAgeThreshold(){
  return 50 + 50 * (Number(limbo) || 0);
}

function canTriggerIceAge(){
  return getEffectiveScoreS() >= getIceAgeThreshold();
}

function shouldForceIceAge(){
  if(iceAgeAwaitingLimbo) return false;
  return canTriggerIceAge();
}

function isLimboNoMastery(){ return limboRestriction === 'noMastery'; }
function isLimboNoPets(){ return limboRestriction === 'noPets'; }
function isLimboNoForge(){ return limboRestriction === 'noForge'; }
function isLimboNoBonusCap(){ return limboRestriction === 'noBonusCap'; }
function isLimboNoTPrestige(){ return limboRestriction === 'noTPrestige'; }

let iceAgeProcessing = false;

function executeIceAge(){
  if(iceAgeProcessing) return;
  iceAgeProcessing = true;
  const ypReward = limboRestriction
    ? getNextIceAgeRewardForRestriction(limboRestriction)
    : 1;
  gamePaused = true;
  iceAgeAwaitingLimbo = true;
  yellowPrestige = (Number(yellowPrestige) || 0) + ypReward;
  iceAgeCount = (Number(iceAgeCount) || 0) + 1;
  limbo = (Number(limbo) || 0) + 1;
  if(typeof resetForIceAge === 'function') resetForIceAge();
  limboRestriction = null;
  gamePaused = true;
  save();
  if(typeof triggerMilestoneFlash === 'function'){
    triggerMilestoneFlash(`Ice Age (+${ypReward} YP)`);
  }
  update();
  if(typeof showMenu === 'function') showMenu('ice-age');
  iceAgeProcessing = false;
}

function checkForcedIceAge(){
  if(!loaded || !currentUser) return;
  if(!shouldForceIceAge()) return;
  executeIceAge();
}

function isLimboRestrictionLocked(){
  return !!limboRestriction && !iceAgeAwaitingLimbo;
}

function confirmLimboRestriction(id){
  if(isLimboRestrictionLocked()){
    alert('Your Limbo restriction is locked until the next Ice Age.');
    return;
  }
  const opt = getLimboOption(id);
  if(!opt) return;
  const msg =
    `Choose "${opt.label}"?\n\n` +
    `This restriction is locked until your next Ice Age.\n` +
    `You cannot change it later.\n\n` +
    `Next Ice Age reward: +${opt.nextIceAgeReward} YP`;
  if(!confirm(msg)) return;
  selectLimboRestriction(id);
}

function selectLimboRestriction(id){
  if(isLimboRestrictionLocked()){
    alert('Your Limbo restriction is locked until the next Ice Age.');
    return;
  }
  const opt = getLimboOption(id);
  if(!opt) return;
  limboRestriction = id;
  iceAgeAwaitingLimbo = false;
  gamePaused = false;
  save();
  update();
  if(typeof showToast === 'function'){
    showToast(`Limbo locked: ${opt.label}`, 'success');
  }
}

function renderLimboPicker(){
  const el = document.getElementById('limboPicker');
  if(!el) return;

  if(isLimboRestrictionLocked()){
    const active = getLimboOption(limboRestriction);
    el.innerHTML = active
      ? `<p class="small" style="margin:0;padding:10px;background:rgba(134,239,172,0.1);border-radius:8px">
          <strong>Locked:</strong> ${active.label}<br>
          Next Ice Age: +${active.nextIceAgeReward} YP<br>
          <span style="color:var(--muted)">Cannot change until the next Ice Age.</span>
        </p>`
      : '';
    return;
  }

  if(!iceAgeAwaitingLimbo){
    el.innerHTML = '<p class="small" style="margin:0">No restriction active. Ice Age will prompt you to choose one.</p>';
    return;
  }

  el.innerHTML = LIMBO_OPTIONS.map(o =>
    `<button type="button" class="ghost" style="margin:4px;display:block;width:100%" onclick="confirmLimboRestriction('${o.id}')">${o.label} — next Ice Age: +${o.nextIceAgeReward} YP</button>`
  ).join('');
}

function updateIceAgeUI(){
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('scoreS', getScoreS());
  set('iceAgeThreshold', getIceAgeThreshold());
  set('yellowPrestigeHud', yellowPrestige);
  set('limboCount', limbo);
  const active = limboRestriction ? getLimboOption(limboRestriction) : null;
  const restrictionLabel = active
    ? `${active.label} (next Ice Age: +${active.nextIceAgeReward} YP)`
    : (iceAgeAwaitingLimbo ? 'Required — choose below' : '—');
  set('limboRestrictionLabel', restrictionLabel);
  set('ypHud', yellowPrestige);
  const warn = document.getElementById('iceAgeWarning');
  if(warn){
    const s = getEffectiveScoreS();
    const th = getIceAgeThreshold();
    if(iceAgeAwaitingLimbo){
      warn.textContent = 'Ice Age active — choose a Limbo restriction to continue.';
      warn.style.color = '#f87171';
    } else if(s >= th - 5){
      warn.textContent = `Warning: Ice Age triggers automatically when effective S ≥ ${th} (S ${getScoreS().toFixed(2)}${limboRestriction === 'halfS' || limboRestriction === 'halfS3' ? ', halved by restriction' : ''})!`;
      warn.style.color = s >= th ? '#f87171' : '';
    } else {
      warn.textContent = '';
      warn.style.color = '';
    }
  }
  renderLimboPicker();
  const btn = document.getElementById('iceAgeBtn');
  if(btn) btn.style.display = 'none';
}

window.confirmLimboRestriction = confirmLimboRestriction;
window.selectLimboRestriction = selectLimboRestriction;
window.checkForcedIceAge = checkForcedIceAge;
