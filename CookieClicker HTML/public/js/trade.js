let tradeOffers = [];
let selectedTradeFriend = '';

function getTradeDailyLimit(){
  return 10000 + 2500 * (Number(xp) || 0);
}

function getTradeVolumeUsed(){
  const today = new Date().toISOString().slice(0, 10);
  if(tradeVolumeDate !== today){ tradeVolumeToday = 0; tradeVolumeDate = today; }
  return Number(tradeVolumeToday) || 0;
}

async function refreshTradeOffers(){
  if(!currentUser) return;
  try{
    const r = await fetch('/trade/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser })
    });
    const d = await r.json();
    tradeOffers = Array.isArray(d.offers) ? d.offers : [];
    renderTradeUI();
  } catch(e) { /* ignore */ }
}

async function sendTradeOffer(){
  if(!currentUser || !selectedTradeFriend) return;
  const giveCookies = Number(document.getElementById('tradeGiveCookies')?.value) || 0;
  const wantCookies = Number(document.getElementById('tradeWantCookies')?.value) || 0;
  const vol = giveCookies + wantCookies;
  if(getTradeVolumeUsed() + vol > getTradeDailyLimit()){
    alert('Daily trade limit exceeded.');
    return;
  }
  const r = await fetch('/trade/offer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: currentUser,
      to: selectedTradeFriend,
      give: { cookies: giveCookies },
      want: { cookies: wantCookies }
    })
  });
  const d = await r.json();
  if(!d.success){ alert(d.error || 'Trade failed'); return; }
  await refreshTradeOffers();
}

async function acceptTradeOffer(offerId){
  const r = await fetch('/trade/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, offerId })
  });
  const d = await r.json();
  if(!d.success){ alert(d.error || 'Accept failed'); return; }
  await load();
  await refreshTradeOffers();
}

async function loadTradeFriends(){
  if(!currentUser) return;
  const r = await fetch('/friends/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser })
  });
  const d = await r.json();
  const sel = document.getElementById('tradeFriendSelect');
  if(!sel) return;
  sel.innerHTML = '<option value="">— friend —</option>' +
    (d.friends || []).map(f => '<option value="' + f + '">' + f + '</option>').join('');
}

function renderTradeUI(){
  const list = document.getElementById('tradeOffersList');
  if(!list) return;
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('tradeDailyUsed', getTradeVolumeUsed().toLocaleString());
  set('tradeDailyLimit', getTradeDailyLimit().toLocaleString());
  set('tradeSlots', tradeSlots);
  if(tradeOffers.length === 0){
    list.innerHTML = '<p class="small">No pending offers.</p>';
    return;
  }
  list.innerHTML = '';
  tradeOffers.forEach(o => {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.cssText = 'padding:8px;margin:6px 0';
    const incoming = o.to === currentUser;
    div.innerHTML = '<div class="small">' + o.from + ' → ' + o.to + '</div>' +
      '<div>Give: ' + (o.give?.cookies||0).toLocaleString() + '</div>' +
      '<div>Want: ' + (o.want?.cookies||0).toLocaleString() + '</div>';
    if(incoming){
      const btn = document.createElement('button');
      btn.className = 'primary';
      btn.textContent = 'Accept';
      btn.onclick = () => acceptTradeOffer(o.id);
      div.appendChild(btn);
    }
    list.appendChild(div);
  });
}

function updateTradeUI(){
  loadTradeFriends();
  refreshTradeOffers();
  const sel = document.getElementById('tradeFriendSelect');
  if(sel) sel.onchange = () => { selectedTradeFriend = sel.value; };
}

window.sendTradeOffer = sendTradeOffer;
window.acceptTradeOffer = acceptTradeOffer;
