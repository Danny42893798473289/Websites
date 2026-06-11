let invEl, eqEl, hatchEl, cancelHatchBtn, invHud, marketGrid, eqHud, toolHud, hatchHud, equippedPanel;
const lastAnimatedValues = {};
let uiEffectsInitialized = false;
let lastPrestigeReady = false;
let lastTornadoReady = false;

const MOBILE_UI_KEY = "cookieclickerMobileUi";
const MQ_MOBILE = typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)") : null;
let navDrawerHome = null;
let hudPanelHome = null;

function initDomRefs(){
  invEl = document.getElementById("inv");
  eqEl = document.getElementById("eq");
  hatchEl = document.getElementById("hatch");
  cancelHatchBtn = document.getElementById("cancelHatchBtn");
  invHud = document.getElementById("invHud");
  marketGrid = document.getElementById("marketGrid");
  eqHud = document.getElementById("eqHud");
  toolHud = document.getElementById("toolHud");
  hatchHud = document.getElementById("hatchHud");
  equippedPanel = document.getElementById("equippedPanel");
  initUiEffects();
  initMobileUi();
}

function getMobileUiPref(){
  try { return localStorage.getItem(MOBILE_UI_KEY); } catch { return null; }
}

function setMobileUiPref(value){
  try {
    if(value) localStorage.setItem(MOBILE_UI_KEY, value);
    else localStorage.removeItem(MOBILE_UI_KEY);
  } catch {}
}

function shouldUseMobileUi(){
  const pref = getMobileUiPref();
  if(pref === "on") return true;
  if(pref === "off") return false;
  return MQ_MOBILE ? MQ_MOBILE.matches : false;
}

function closeMobileDrawers(){
  document.body.classList.remove("nav-open", "hud-open");
  const navDrawer = document.getElementById("navDrawer");
  if(navDrawer) navDrawer.setAttribute("aria-hidden", "true");
  ["mobileMenuBtn", "mobileHudBtn"].forEach((id) => {
    const el = document.getElementById(id);
    if(el) el.setAttribute("aria-expanded", "false");
  });
}

function openMobileNav(){
  if(!document.body.classList.contains("mobile-ui")) return;
  mountMobileDrawers();
  document.body.classList.add("nav-open");
  document.body.classList.remove("hud-open");
  const navDrawer = document.getElementById("navDrawer");
  if(navDrawer){
    navDrawer.setAttribute("aria-hidden", "false");
    navDrawer.style.display = "block";
  }
  const btn = document.getElementById("mobileMenuBtn");
  if(btn) btn.setAttribute("aria-expanded", "true");
}

function openMobileHud(){
  if(!document.body.classList.contains("mobile-ui")) return;
  mountMobileDrawers();
  document.body.classList.add("hud-open");
  document.body.classList.remove("nav-open");
  const hud = document.getElementById("hudPanel");
  if(hud) hud.style.display = "block";
  const btn = document.getElementById("mobileHudBtn");
  if(btn) btn.setAttribute("aria-expanded", "true");
}

function rememberDrawerHomes(){
  const nav = document.getElementById("navDrawer");
  const hud = document.getElementById("hudPanel");
  if(nav && !navDrawerHome) navDrawerHome = { parent: nav.parentElement, next: nav.nextElementSibling };
  if(hud && !hudPanelHome) hudPanelHome = { parent: hud.parentElement, next: hud.nextElementSibling };
}

function restoreDrawerElement(el, home){
  if(!el || !home?.parent) return;
  if(home.next && home.next.parentElement === home.parent) home.parent.insertBefore(el, home.next);
  else home.parent.appendChild(el);
}

function mountMobileDrawers(){
  rememberDrawerHomes();
  const nav = document.getElementById("navDrawer");
  const hud = document.getElementById("hudPanel");
  const overlay = document.getElementById("mobileOverlay");
  if(!nav || !hud) return;
  if(overlay && overlay.parentElement !== document.body) document.body.appendChild(overlay);
  if(nav.parentElement !== document.body) document.body.appendChild(nav);
  if(hud.parentElement !== document.body) document.body.appendChild(hud);
}

function unmountMobileDrawers(){
  const nav = document.getElementById("navDrawer");
  const hud = document.getElementById("hudPanel");
  if(nav) restoreDrawerElement(nav, navDrawerHome);
  if(hud) restoreDrawerElement(hud, hudPanelHome);
}

function applyMobileUi(){
  const on = shouldUseMobileUi();
  document.body.classList.toggle("mobile-ui", on);
  if(on) mountMobileDrawers();
  else {
    closeMobileDrawers();
    unmountMobileDrawers();
  }
  const toggle = document.getElementById("mobileUiToggle");
  if(toggle){
    toggle.setAttribute("aria-pressed", on ? "true" : "false");
    toggle.textContent = on ? "Mobile on" : "Mobile";
  }
}

function updateMobileTabLabel(menuId){
  const label = document.getElementById("mobileTabLabel");
  const tab = document.querySelector(`.nav-tab[data-menu="${menuId}"]`);
  const text = tab?.querySelector(".nav-tab__text");
  if(label && text) label.textContent = text.textContent.trim();
}

function initMobileUi(){
  const toggle = document.getElementById("mobileUiToggle");
  const menuBtn = document.getElementById("mobileMenuBtn");
  const hudBtn = document.getElementById("mobileHudBtn");
  const navClose = document.getElementById("navDrawerClose");
  const hudClose = document.getElementById("hudDrawerClose");
  const overlay = document.getElementById("mobileOverlay");

  if(toggle && !toggle.dataset.bound){
    toggle.dataset.bound = "1";
    toggle.addEventListener("click", () => {
      const next = !document.body.classList.contains("mobile-ui");
      setMobileUiPref(next ? "on" : "off");
      applyMobileUi();
    });
  }
  if(menuBtn && !menuBtn.dataset.bound){
    menuBtn.dataset.bound = "1";
    menuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openMobileNav();
    });
  }
  if(hudBtn && !hudBtn.dataset.bound){
    hudBtn.dataset.bound = "1";
    hudBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openMobileHud();
    });
  }
  if(navClose && !navClose.dataset.bound){
    navClose.dataset.bound = "1";
    navClose.addEventListener("click", (e) => {
      e.preventDefault();
      closeMobileDrawers();
    });
  }
  if(hudClose && !hudClose.dataset.bound){
    hudClose.dataset.bound = "1";
    hudClose.addEventListener("click", (e) => {
      e.preventDefault();
      closeMobileDrawers();
    });
  }
  if(overlay && !overlay.dataset.bound){
    overlay.dataset.bound = "1";
    overlay.addEventListener("click", closeMobileDrawers);
  }
  if(MQ_MOBILE && !window.__mobileMqBound){
    window.__mobileMqBound = true;
    MQ_MOBILE.addEventListener("change", () => {
      if(getMobileUiPref() !== "on" && getMobileUiPref() !== "off") applyMobileUi();
    });
  }
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape") closeMobileDrawers();
  });
  rememberDrawerHomes();
  applyMobileUi();
}

function initUiEffects(){
  if(uiEffectsInitialized) return;
  uiEffectsInitialized = true;
  initBackgroundParticles();
  initButtonRipples();
}

function initBackgroundParticles(){
  const layer = document.getElementById("bgParticles");
  if(!layer) return;
  layer.innerHTML = "";
  const count = 24;
  for(let i = 0; i < count; i++){
    const p = document.createElement("span");
    p.className = "bg-particle";
    p.style.setProperty("--x", `${Math.random() * 100}%`);
    p.style.setProperty("--y", `${Math.random() * 100}%`);
    p.style.setProperty("--size", `${3 + Math.random() * 8}px`);
    p.style.setProperty("--dur", `${8 + Math.random() * 12}s`);
    p.style.setProperty("--delay", `${Math.random() * 8}s`);
    layer.appendChild(p);
  }
}

function initButtonRipples(){
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button.primary, button.ghost, button.trash, .nav-tab");
    if(!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    const size = Math.max(rect.width, rect.height) * 1.35;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 560);
  });
}

const NAV_TORNADO_L2_MENUS = ["stone-shop", "forge", "bank", "upgrade-shop"];
const NAV_TORNADO_L2_LABEL = "Tornado L2";

function isNavTabUnlocked(menuId){
  if(NAV_TORNADO_L2_MENUS.includes(menuId)){
    return (Number(tornadoPrestige) || 0) >= 2;
  }
  return true;
}

function updateNavLocks(){
  document.querySelectorAll(".nav-tab[data-menu]").forEach((btn) => {
    const menuId = btn.dataset.menu;
    if(!btn.classList.contains("nav-tab--gated")){
      btn.classList.remove("nav-tab--locked");
      btn.disabled = false;
      return;
    }
    const locked = !isNavTabUnlocked(menuId);
    btn.classList.toggle("nav-tab--locked", locked);
    btn.disabled = locked;
    const lockEl = btn.querySelector(".nav-tab__lock");
    if(lockEl) lockEl.textContent = NAV_TORNADO_L2_LABEL;
  });
}

function setActiveNavButton(menuId){
  const tabs = document.querySelectorAll(".nav-tab[data-menu]");
  tabs.forEach((b) => {
    b.classList.toggle("nav-tab--active", b.dataset.menu === menuId);
  });
}

function triggerMilestoneFlash(label){
  const flash = document.getElementById("milestoneFlash");
  const txt = document.getElementById("milestoneFlashText");
  if(!flash) return;
  if(txt) txt.textContent = `${label} Ready!`;
  flash.classList.remove("milestone-flash--active");
  void flash.offsetWidth;
  flash.classList.add("milestone-flash--active");
}

function checkMilestoneTransitions(){
  const prestigeReady = typeof canPrestige === "function" ? canPrestige() : false;
  const tornadoReady = typeof canTornadoPrestige === "function" ? canTornadoPrestige() : false;

  const prestigeBtn = document.getElementById("prestigeBtn");
  if(prestigeBtn) prestigeBtn.classList.toggle("milestone-ready", prestigeReady);
  const tornadoBtn = document.getElementById("tornadoPrestigeBtn");
  if(tornadoBtn) tornadoBtn.classList.toggle("milestone-ready", tornadoReady);

  if(!lastPrestigeReady && prestigeReady) triggerMilestoneFlash("Prestige");
  if(!lastTornadoReady && tornadoReady) triggerMilestoneFlash("Tornado Prestige");
  lastPrestigeReady = prestigeReady;
  lastTornadoReady = tornadoReady;
}

function setTextAnimated(id, value){
  const el = document.getElementById(id);
  if(!el) return;
  const next = String(value);
  if(lastAnimatedValues[id] !== undefined && lastAnimatedValues[id] !== next){
    el.classList.remove("value-pop");
    void el.offsetWidth;
    el.classList.add("value-pop");
  }
  lastAnimatedValues[id] = next;
  el.textContent = next;
}

function update(){
cookies = Number(cookies) || 0;

setTextAnimated("cookies", Math.floor(cookies));
setTextAnimated("multi", getMulti().toFixed(2));
setTextAnimated("per", Math.floor(getBase()*getMulti()*getPassiveMult()));

g.textContent=grandmas;f.textContent=farms;fa.textContent=factories;
o.textContent=oils;m.textContent=mines;c.textContent=coops;
w.textContent=wormholes;ga.textContent=galaxies;e.textContent=empties;

if(hatchEl){
  if(hatching){
    hatchEl.textContent = hasInstantHatch() ? "Hatching: instant" : "Hatching: "+Math.floor(hatching.time/60)+" mins";
    if(cancelHatchBtn) cancelHatchBtn.style.display = hasInstantHatch() ? 'none' : 'inline-flex';
  } else {
    hatchEl.textContent = "None";
    if(cancelHatchBtn) cancelHatchBtn.style.display = 'none';
  }
}

if(invEl && eqEl){
if(typeof ensureStoneData === "function") ensureStoneData();
// render inventory (detailed) in pets view as cards
invEl.innerHTML = "";
const invList = document.createElement('div');
invList.className = 'pet-list';
pets.forEach((p,i)=>{
  const card = document.createElement('div');
  card.className = 'pet-card';
  const label = document.createElement('div');
  label.className = 'pet-label';
  label.textContent = petLabel(p);
  const actions = document.createElement('div');
  actions.className = 'pet-actions';
  const equipBtn = document.createElement('button');
  equipBtn.className = 'ghost';
  equipBtn.textContent = 'Equip';
  equipBtn.onclick = ()=>{ if(equipped.length<getMaxEquipSlots()){ equipped.push(p); pets.splice(i,1); save(); update(); } };
  if(typeof getPermanentEquipSlots === 'function' && permanentEquipped.length < getPermanentEquipSlots()){
    const permBtn = document.createElement('button');
    permBtn.className = 'ghost';
    permBtn.textContent = 'Permanent';
    permBtn.onclick = ()=>{ permanentEquipped.push(p); pets.splice(i,1); save(); update(); };
    actions.appendChild(permBtn);
  }
  const delBtn = document.createElement('button');
  delBtn.className = 'trash';
  delBtn.title = 'Delete pet';
  delBtn.textContent = 'ðŸ—‘ï¸';
  delBtn.onclick = ()=>{ pets.splice(i,1); save(); update(); };
  actions.appendChild(equipBtn);
  actions.appendChild(delBtn);
  card.appendChild(label);
  card.appendChild(actions);
   renderGarden(); // Also render the garden each update so timers and states refresh
  invList.appendChild(card);
});
invEl.appendChild(invList);

// render equipped as cards with unequip + delete
eqEl.innerHTML = "";
const eqList = document.createElement('div');
eqList.className = 'pet-list';
equipped.forEach((p,i)=>{
  const card = document.createElement('div');
  card.className = 'pet-card';
  const label = document.createElement('div');
  label.className = 'pet-label';
  label.textContent = petLabel(p);
  const actions = document.createElement('div');
  actions.className = 'pet-actions';
  const unequipBtn = document.createElement('button');
  unequipBtn.className = 'ghost';
  unequipBtn.textContent = 'Unequip';
  unequipBtn.onclick = ()=>{ pets.push(p); equipped.splice(i,1); save(); update(); };
  if(typeof getPermanentEquipSlots === 'function' && permanentEquipped.length < getPermanentEquipSlots()){
    const permBtn = document.createElement('button');
    permBtn.className = 'ghost';
    permBtn.textContent = 'Permanent';
    permBtn.onclick = ()=>{ permanentEquipped.push(p); equipped.splice(i,1); save(); update(); };
    actions.appendChild(permBtn);
  }
  const delBtn = document.createElement('button');
  delBtn.className = 'trash';
  delBtn.title = 'Delete equipped pet';
  delBtn.textContent = 'ðŸ—‘ï¸';
  delBtn.onclick = ()=>{ equipped.splice(i,1); save(); update(); };
  actions.appendChild(unequipBtn);
  actions.appendChild(delBtn);
  card.appendChild(label);
  card.appendChild(actions);
  eqList.appendChild(card);
});
eqEl.appendChild(eqList);

const permanentEqEl = document.getElementById('permanentEq');
if(permanentEqEl){
  permanentEqEl.innerHTML = '';
  const slots = typeof getPermanentEquipSlots === 'function' ? getPermanentEquipSlots() : 0;
  if(slots === 0){
    const none = document.createElement('div');
    none.className = 'small';
    none.textContent = 'Earn permanent slots from Tornado Prestige.';
    permanentEqEl.appendChild(none);
  } else if(permanentEquipped.length === 0){
    const none = document.createElement('div');
    none.className = 'small';
    none.textContent = `No pets in permanent slots (${slots} available).`;
    permanentEqEl.appendChild(none);
  } else {
    const permList = document.createElement('div');
    permList.className = 'pet-list';
    permanentEquipped.forEach((p,i)=>{
      const card = document.createElement('div');
      card.className = 'pet-card';
      const label = document.createElement('div');
      label.className = 'pet-label';
      label.textContent = petLabel(p) + ' (permanent)';
      const actions = document.createElement('div');
      actions.className = 'pet-actions';
      const unequipBtn = document.createElement('button');
      unequipBtn.className = 'ghost';
      unequipBtn.textContent = 'To Inventory';
      unequipBtn.onclick = ()=>{ pets.push(p); permanentEquipped.splice(i,1); save(); update(); };
      actions.appendChild(unequipBtn);
      card.appendChild(label);
      card.appendChild(actions);
      permList.appendChild(card);
    });
    permanentEqEl.appendChild(permList);
  }
}

// render HUD summaries
const totalProduceCount = produce.reduce((sum,item)=>sum + (item.count || 1),0);
if(invHud){
  let stoneHud = "";
  if(typeof formatTierList === "function"){
    stoneHud = ` | Stones W:${formatTierList("worker")} P:${formatTierList("pet")}`;
  }
  invHud.textContent = `${pets.length} pets, ${seeds.length} seeds, ${vines} vines, ${totalProduceCount} produce${stoneHud}`;
}
if(eqHud){
  const perm = permanentEquipped.length;
  eqHud.textContent = perm ? `${equipped.length} + ${perm} perm` : String(equipped.length);
}
if(toolHud) {
  if(selectedCanIndex !== null && waterCans[selectedCanIndex]) {
    const selectedCan = waterCans[selectedCanIndex];
    const canLabel = selectedCan.type === 'basic' ? 'Basic Can' : selectedCan.type;
    toolHud.textContent = `${canLabel} selected`;
  } else {
    toolHud.textContent = 'None';
  }
}
if(hatchHud){
  const parts = [];
  if(hatching) parts.push('pet: ' + (hasInstantHatch() ? 'instant' : Math.floor(hatching.time/60)+'m'));
  if(expansionHatching) parts.push('exp: ' + formatExpansionTimeLeft(expansionHatching.time, expansionHatching.duration));
  hatchHud.textContent = parts.length ? parts.join(' | ') : 'None';
}
renderMarket();
// render seeds in the pets inventory view below pet cards
const seedsSection = document.createElement('div');
seedsSection.className = 'seeds-list';
if(seeds.length === 0){
  const none = document.createElement('div'); none.className='small'; none.textContent = 'No seeds in inventory'; seedsSection.appendChild(none);
} else {
  seeds.forEach((s,i)=>{
    const el = document.createElement('div'); el.className='seed-item';
    const text = document.createElement('span');
    const seedEmoji = s.type === 'potato' ? 'ðŸ¥”'
      : s.type === 'pumpkin' ? 'ðŸŽƒ'
      : s.type === 'carrot' ? 'ðŸ¥•'
      : s.type === 'melon' ? 'ðŸˆ'
      : s.type === 'cocoa' ? 'ðŸŒ°'
      : s.type === 'apple' ? 'ðŸŽ'
      : s.type === 'netherwart' ? 'ðŸ„'
      : s.type === 'banana' ? 'ðŸŒ' : 'ðŸŒ¾';
    text.textContent = `${seedEmoji} ${s.type} seed`;
    const plantBtn = document.createElement('button'); plantBtn.className='primary'; plantBtn.textContent='Plant'; plantBtn.onclick = ()=>{ showMenu('garden'); alert('Click a garden plot to plant the seed.'); };
    const del = document.createElement('button'); del.className='trash'; del.textContent='ðŸ—‘ï¸'; del.onclick = ()=>{ seeds.splice(i,1); save(); update(); };
    el.appendChild(text); el.appendChild(plantBtn); el.appendChild(del);
    seedsSection.appendChild(el);
  });
}
invEl.appendChild(seedsSection);
// render water cans in inventory
const cansSection = document.createElement('div');
cansSection.className = 'cans-list';
if(waterCans.length === 0){
  const none2 = document.createElement('div'); none2.className='small'; none2.textContent = 'No water cans'; cansSection.appendChild(none2);
} else {
  waterCans.forEach((c,i)=>{
    const el = document.createElement('div'); el.className='can-item';
    const txt = document.createElement('span'); txt.textContent = (c.type==='basic' ? 'Basic Can' : c.type)+' ';
    const sel = document.createElement('button'); sel.className='primary'; sel.textContent = (selectedCanIndex===i ? 'Selected' : 'Select'); sel.onclick = ()=>{ selectedCanIndex = i; update(); };
    const del = document.createElement('button'); del.className='trash'; del.textContent='ðŸ—‘ï¸'; del.onclick = ()=>{ waterCans.splice(i,1); if(selectedCanIndex===i) selectedCanIndex=null; save(); update(); };
    const cooldownLabel = document.createElement('span'); cooldownLabel.style.marginLeft='8px';
    if(c.lastUsedAt){ const rem = Math.max(0, Math.ceil((10*60*1000 - (Date.now()-c.lastUsedAt))/60000)); if(rem>0) cooldownLabel.textContent = `CD ${rem}m`; }
    el.appendChild(txt); el.appendChild(sel); el.appendChild(del); el.appendChild(cooldownLabel);
    cansSection.appendChild(el);
  });
}
invEl.appendChild(cansSection);
// render ethereal vine inventory
const vinesSection = document.createElement('div');
vinesSection.className = 'vines-list';
if(vines === 0){
  const noneV = document.createElement('div'); noneV.className='small'; noneV.textContent='No ethereal vines'; vinesSection.appendChild(noneV);
} else {
  const vineItem = document.createElement('div'); vineItem.className='produce-item';
  vineItem.textContent = `ðŸŒ¿ Ethereal Vines x${vines}`;
  vinesSection.appendChild(vineItem);
}
invEl.appendChild(vinesSection);
// render stone inventory
const stonesSection = document.createElement('div');
stonesSection.className = 'produce-list';
const stoneLine = document.createElement('div');
stoneLine.className = 'small';
if(typeof ensureStoneData === "function" && typeof formatTierList === "function"){
  ensureStoneData();
  stoneLine.textContent = `Stones — Worker: ${formatTierList("worker")} | Pet: ${formatTierList("pet")}`;
} else {
  stoneLine.textContent = 'Stones: unavailable';
}
stonesSection.appendChild(stoneLine);
invEl.appendChild(stonesSection);
// render produce inventory
const produceSection = document.createElement('div');
produceSection.className = 'produce-list';
if(produce.length === 0){
  const none3 = document.createElement('div'); none3.className='small'; none3.textContent='No harvested produce'; produceSection.appendChild(none3);
} else {
  produce.forEach((item,i)=>{
    const el = document.createElement('div'); el.className='produce-item';
    const count = item.count || 1;
    const emoji = item.type === 'potato' ? 'ðŸ¥”'
      : item.type === 'pumpkin' ? 'ðŸŽƒ'
      : item.type === 'carrot' ? 'ðŸ¥•'
      : item.type === 'melon' ? 'ðŸˆ'
      : item.type === 'cocoa' ? 'ðŸŒ°'
      : item.type === 'apple' ? 'ðŸŽ'
      : item.type === 'netherwart' ? 'ðŸ„'
      : item.type === 'banana' ? 'ðŸŒ'
      : item.type === 'duskgrain' ? 'âœ¨' : 'ðŸŒ¾';
    const text = document.createElement('span'); text.textContent = `${emoji} ${item.type} x${count} (${item.value.toLocaleString()} each)`;
    const sell = document.createElement('button'); sell.className='primary'; sell.textContent='Sell'; sell.onclick = ()=>{ cookies += item.value * count; produce.splice(i,1); save(); update(); };
    el.appendChild(text); el.appendChild(sell);
    produceSection.appendChild(el);
  });
}
invEl.appendChild(produceSection);
}
if(equippedPanel){
  const regular = equipped.map(p => `<span style="display:inline-block;padding:4px 8px;margin-right:6px;background:rgba(255,255,255,0.03);border-radius:8px">${petLabel(p)}</span>`).join('');
  const perm = permanentEquipped.map(p => `<span style="display:inline-block;padding:4px 8px;margin-right:6px;background:rgba(134,239,172,0.12);border-radius:8px">${petLabel(p)} ★</span>`).join('');
  if(!regular && !perm) equippedPanel.textContent = 'Equipped: None';
  else {
    let html = 'Equipped: ';
    if(regular) html += regular;
    if(perm) html += (regular ? ' | Permanent: ' : 'Permanent: ') + perm;
    equippedPanel.innerHTML = html;
  }
}
updatePrestigeUI();
if(typeof updateTornadoPrestigeUI === 'function') updateTornadoPrestigeUI();
renderMastery();
renderExpansionTab();
if(typeof renderThemesTab === 'function') renderThemesTab();
if(typeof renderStoneShop === 'function') renderStoneShop();
if(typeof renderForgeTab === 'function') renderForgeTab();
updateNavLocks();
checkMilestoneTransitions();
}

function getCookieTickGain(){
  return Math.floor(getBase() * getMulti() * getPassiveMult());
}

function formatCookieTickCountdown(msRemaining){
  const sec = Math.max(0, Math.ceil(msRemaining / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if(h > 0) return `${h}h ${m}m`;
  if(m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function scheduleNextCookieTick(fromNow){
  nextCookieTickAt = fromNow + COOKIE_TICK_MS;
}

function runCookieTick(){
  cookies += getCookieTickGain();
  scheduleNextCookieTick(Date.now());
}

function syncCookieTickSchedule(){
  const now = Date.now();
  if(!nextCookieTickAt || nextCookieTickAt <= 0){
    scheduleNextCookieTick(now);
    return;
  }
  let ticks = 0;
  while(nextCookieTickAt <= now && ticks < 10000){
    runCookieTick();
    ticks++;
  }
}

function updateCookieTickTimer(){
  const els = [
    document.getElementById("cookieTickTimer"),
    document.getElementById("cookieTickHud")
  ];
  const ms = Math.max(0, (Number(nextCookieTickAt) || 0) - Date.now());
  const text = ms <= 1000 ? "Now…" : formatCookieTickCountdown(ms);
  els.forEach((el) => { if(el) el.textContent = text; });
}

function tickCookieSchedule(){
  if(!nextCookieTickAt || nextCookieTickAt <= 0){
    scheduleNextCookieTick(Date.now());
    updateCookieTickTimer();
    return;
  }
  if(Date.now() >= nextCookieTickAt){
    runCookieTick();
    if(loaded) save();
  }
  updateCookieTickTimer();
}

function startGameLoops(){
  syncCookieTickSchedule();

  setInterval(()=>{
    if(hatching){
      if(hasInstantHatch()){
        pets.push(hatching.multi);
        hatching=null;
      } else {
        hatching.time -= getHatchSpeedMult();
        if(hatching.time<=0){
          pets.push(hatching.multi);
          hatching=null;
        }
      }
    }
    tickExpansionHatch();
    if(typeof tickForge === "function") tickForge();
    tickCookieSchedule();
    update();
  },1000);

  setInterval(()=>{
    if(loaded) save();
  },5000);
}

function showGame(){
loginMenu.classList.remove("active");
gameMenu.classList.add("active");
setActiveNavButton("main");
updateMobileTabLabel("main");
applyMobileUi();
}

function showMenu(id){
  if(!isNavTabUnlocked(id)){
    alert(`Unlocks at ${NAV_TORNADO_L2_LABEL}.`);
    return;
  }
  document.querySelectorAll("#gameMenu .menu").forEach(m=>m.classList.remove("active"));
  const panel = document.getElementById(id);
  if(!panel) return;
  panel.classList.add("active");
  setActiveNavButton(id);
  updateMobileTabLabel(id);
  closeMobileDrawers();
  if(id === 'garden') renderGarden();
  if(id === 'mastery') renderMastery();
  if(id === 'pet-expansion') renderExpansionTab();
  if(id === 'themes' && typeof renderThemesTab === 'function') renderThemesTab();
  if(id === 'stone-shop' && typeof renderStoneShop === 'function') renderStoneShop();
  if(id === 'forge' && typeof renderForgeTab === 'function') renderForgeTab();
  if(id === 'tornado-prestige') updateTornadoPrestigeUI();
}
