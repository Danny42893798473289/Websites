const BANK_CARD_TIERS = [
  { id: 'bronze', max: 500, cost: 25000 },
  { id: 'silver', max: 1000, cost: 50000 },
  { id: 'gold', max: 1500, cost: 75000 },
  { id: 'platinum', max: 3000, cost: 150000 },
  { id: 'diamond', max: 5000, cost: 200000 },
  { id: 'uranium', max: 10000, cost: 500000 }
];

const CREDIT_CARD_TIERS = [
  { id: 'bronze', max: 500, weeks: 1, cost: 5000 },
  { id: 'silver', max: 1000, weeks: 2, cost: 10000 }
];

function ensureBankData(){
  if(bankCard && typeof bankCard === 'object'){
    bankCard.balance = Number(bankCard.balance) || 0;
    bankCard.tier = bankCard.tier || 'bronze';
  }
  if(creditCard && typeof creditCard === 'object'){
    creditCard.debt = Number(creditCard.debt) || 0;
    creditCard.tier = creditCard.tier || 'bronze';
    creditCard.dueAt = Number(creditCard.dueAt) || 0;
  }
}

function getBankCardMax(){
  if(!bankCard) return 0;
  const t = BANK_CARD_TIERS.find(x => x.id === bankCard.tier);
  return t ? t.max : 0;
}

function buyBankCard(tierId){
  if(!isBankUnlocked()){ alert('Bank unlocks at Tornado Prestige level 2.'); return; }
  const tier = BANK_CARD_TIERS.find(t => t.id === tierId);
  if(!tier){ return; }
  if(bankCard && !bankBound){ alert('Unbind current card first (100 cookies).'); return; }
  if(cookies < tier.cost){ alert(`Need ${tier.cost} cookies.`); return; }
  cookies -= tier.cost;
  bankCard = { tier: tier.id, balance: bankCard ? bankCard.balance : 0 };
  bankBound = true;
  save(); update();
}

function bankDeposit(){
  if(!bankCard) return;
  const max = getBankCardMax();
  const room = max - bankCard.balance;
  if(room <= 0){ alert('Bank card full.'); return; }
  const amt = Math.min(room, Math.floor(cookies));
  if(amt <= 0) return;
  cookies -= amt;
  bankCard.balance += amt;
  save(); update();
}

function bankWithdraw(){
  if(!bankCard || bankCard.balance <= 0) return;
  cookies += bankCard.balance;
  bankCard.balance = 0;
  save(); update();
}

function unbindBankCard(){
  if(!bankCard) return;
  if(cookies < 100){ alert('Unbinding costs 100 cookies.'); return; }
  if(!confirm('Unbind bank card? Stored balance will be lost.')) return;
  cookies -= 100;
  bankCard = null;
  bankBound = true;
  save(); update();
}

function buyCreditCard(tierId){
  if(!isBankUnlocked()) return;
  const tier = CREDIT_CARD_TIERS.find(t => t.id === tierId);
  if(!tier) return;
  if(creditCard){ alert('You already have a credit card.'); return; }
  if(cookies < tier.cost) return;
  cookies -= tier.cost;
  creditCard = {
    tier: tier.id,
    debt: 0,
    dueAt: Date.now() + tier.weeks * 7 * 24 * 60 * 60 * 1000
  };
  save(); update();
}

function creditBorrow(amount){
  if(!creditCard) return;
  const tier = CREDIT_CARD_TIERS.find(t => t.id === creditCard.tier);
  if(!tier) return;
  const amt = Math.floor(Number(amount) || 0);
  if(amt <= 0) return;
  if(creditCard.debt + amt > tier.max){ alert(`Credit limit ${tier.max}.`); return; }
  creditCard.debt += amt;
  cookies += amt;
  save(); update();
}

function creditPayback(){
  if(!creditCard || creditCard.debt <= 0) return;
  const pay = Math.min(creditCard.debt, Math.floor(cookies));
  if(pay <= 0) return;
  cookies -= pay;
  creditCard.debt -= pay;
  save(); update();
}

function isCreditOverdue(){
  if(!creditCard || creditCard.debt <= 0) return false;
  return Date.now() > creditCard.dueAt;
}

function restoreBankAfterPrestige(){
  if(!bankCard || bankCard.balance <= 0) return;
  const restore = bankCard.balance;
  cookies += restore;
}

function clearBankOnTornado(){
  bankCard = null;
  creditCard = null;
}

function updateBankUI(){
  ensureBankData();
  const locked = document.getElementById('bankLocked');
  const content = document.getElementById('bankContent');
  if(locked) locked.style.display = isBankUnlocked() ? 'none' : 'block';
  if(content) content.style.display = isBankUnlocked() ? 'block' : 'none';
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('bankBalance', bankCard ? bankCard.balance.toLocaleString() : '0');
  set('bankMax', bankCard ? getBankCardMax().toLocaleString() : '—');
  set('creditDebt', creditCard ? creditCard.debt.toLocaleString() : '0');
  if(creditCard && creditCard.dueAt){
    const days = Math.ceil((creditCard.dueAt - Date.now()) / (86400000));
    set('creditDue', days > 0 ? `${days}d` : 'OVERDUE');
  } else set('creditDue', '—');
  const list = document.getElementById('bankCardList');
  if(list){
    list.innerHTML = BANK_CARD_TIERS.map(t =>
      `<button class="primary" style="margin:4px" onclick="buyBankCard('${t.id}')">${t.id} (max ${t.max}, ${t.cost}c)</button>`
    ).join('');
  }
  const clist = document.getElementById('creditCardList');
  if(clist){
    clist.innerHTML = CREDIT_CARD_TIERS.map(t =>
      `<button class="ghost" style="margin:4px" onclick="buyCreditCard('${t.id}')">${t.id} (${t.max}, ${t.weeks}wk, ${t.cost}c)</button>`
    ).join('');
  }
}

window.buyBankCard = buyBankCard;
window.bankDeposit = bankDeposit;
window.bankWithdraw = bankWithdraw;
window.unbindBankCard = unbindBankCard;
window.buyCreditCard = buyCreditCard;
window.creditBorrow = creditBorrow;
window.creditPayback = creditPayback;
