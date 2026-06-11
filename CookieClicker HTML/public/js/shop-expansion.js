const PORTAL_SHOP_ITEMS = [
  { id: 'boosters2', label: '2 Boosters', cost: 1, apply: () => { boosters += 2; } },
  { id: 'rarities', label: 'Unlock pet rarities roll', cost: 1, once: true, apply: () => { raritiesRollUnlocked = true; } },
  { id: 'upgradedPerma', label: '+1 Upgraded Perma pet slot', cost: 1, apply: () => {
    extraPermanentSlots = (Number(extraPermanentSlots) || 0) + 1;
    permanentSlotMeta.push({ upgraded: true, stackable: false });
  }},
  { id: 'silverBankPortal', label: 'Silver bank card (portal, once)', cost: 1, once: true, apply: () => {
    if(!bankCard) bankCard = { tier: 'silver', balance: 0 };
  }},
  { id: 'stackableSlot', label: 'Upgrade a pet slot to stackable', cost: 1, apply: () => {
    if(permanentSlotMeta.length) permanentSlotMeta[0].stackable = true;
    else permanentSlotMeta.push({ upgraded: false, stackable: true });
  }},
  { id: 'permaMastery', label: 'Perma Mastery (survives soft prestige)', cost: 3, once: true, apply: () => { permaMastery = true; } },
  { id: 'permaAll', label: 'Perma all portal purchases + multi-buy', cost: 10, once: true, apply: () => {
    permaMastery = true;
    raritiesRollUnlocked = true;
    shopExpansionPurchases.permaAll = 1;
  }}
];

function isPortalShopUnlocked(){
  return (Number(tornadoPrestige) || 0) >= 2;
}

function getPortalPurchaseCount(id){
  return Number(shopExpansionPurchases[id]) || 0;
}

function buyPortalItem(id){
  if(!isPortalShopUnlocked()){ alert('Portal Shop unlocks at Tornado L2.'); return; }
  const item = PORTAL_SHOP_ITEMS.find(i => i.id === id);
  if(!item) return;
  if(item.once && getPortalPurchaseCount(id) >= 1){ alert('Already purchased.'); return; }
  if(yellowPrestige < item.cost){ alert(`Need ${item.cost} YP.`); return; }
  if(!confirm(`Buy "${item.label}" for ${item.cost} YP?`)) return;
  yellowPrestige -= item.cost;
  item.apply();
  shopExpansionPurchases[id] = getPortalPurchaseCount(id) + 1;
  save();
  update();
}

function renderPortalShop(){
  const el = document.getElementById('portalShopList');
  if(!el) return;
  const locked = document.getElementById('portalShopLocked');
  const content = document.getElementById('portalShopContent');
  if(locked) locked.style.display = isPortalShopUnlocked() ? 'none' : 'block';
  if(content) content.style.display = isPortalShopUnlocked() ? 'block' : 'none';
  el.innerHTML = PORTAL_SHOP_ITEMS.map(item => {
    const bought = item.once && getPortalPurchaseCount(item.id) >= 1;
    return `<button class="primary" style="margin:6px 0;display:block;width:100%" ${bought ? 'disabled' : ''} onclick="buyPortalItem('${item.id}')">${item.label} — ${item.cost} YP${bought ? ' (owned)' : ''}</button>`;
  }).join('');
}

function updatePortalShopUI(){
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('portalYp', yellowPrestige);
  renderPortalShop();
}

window.buyPortalItem = buyPortalItem;
