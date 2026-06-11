function ensureMarketPlots(){
  if(!Array.isArray(marketPlots)) marketPlots = [];
  while(marketPlots.length < 9) marketPlots.push({ state: 'empty' });
  for(let i=0;i<marketPlots.length;i++){
    if(!marketPlots[i] || !marketPlots[i].state) marketPlots[i] = { state: 'empty' };
  }
}

function resetGardenKeepUnlocks(){
  ensureGardenPlots();
  for(let i = 0; i < 100; i++){
    const plot = gardenPlots[i];
    if(!plot || plot.state === 'locked') gardenPlots[i] = { state: 'locked' };
    else gardenPlots[i] = { state: 'empty' };
  }
}

function ensureGardenPlots(){
  if(!Array.isArray(gardenPlots)) gardenPlots = [];
  while(gardenPlots.length < 100) gardenPlots.push({ state: 'locked' });
  // unlock center 4x4
  for(let r=3;r<=6;r++){
    for(let c=3;c<=6;c++){
      const idx = r*10 + c;
      if(!gardenPlots[idx] || gardenPlots[idx].state === 'locked') gardenPlots[idx] = { state: 'empty' };
    }
  }
  // ensure other cells exist
  for(let i=0;i<100;i++){
    if(!gardenPlots[i]) gardenPlots[i] = { state: 'locked' };
  }
}

function buyBasicCan(){
  if(cookies < 1000) return;
  cookies -= 1000;
  waterCans.push({ type: 'basic', lastUsedAt: 0 });
  save();
  update();
}

function buyAdvancedCan(){
  if(cookies < 5000) return;
  cookies -= 5000;
  waterCans.push({ type: 'advanced', lastUsedAt: 0 });
  save();
  update();
}

function buyWheatSeed(){
  if(cookies < 25000) return;
  cookies -= 25000;
  seeds.push({ type: 'wheat', purchasedAt: Date.now() });
  save();
  update();
}

function buyPotatoSeed(){
  if(cookies < 25000) return;
  cookies -= 25000;
  seeds.push({ type: 'potato', purchasedAt: Date.now() });
  save();
  update();
}

function buyPumpkinSeed(){
  if(cookies < 50000) return;
  cookies -= 50000;
  seeds.push({ type: 'pumpkin', purchasedAt: Date.now() });
  save();
  update();
}

function buyCarrotSeed(){
  if(cookies < 50000) return;
  cookies -= 50000;
  seeds.push({ type: 'carrot', purchasedAt: Date.now() });
  save();
  update();
}

function buyMelonSeed(){
  if(cookies < 50000) return;
  cookies -= 50000;
  seeds.push({ type: 'melon', purchasedAt: Date.now() });
  save();
  update();
}

function buyCocoaSeed(){
  if(cookies < 50000) return;
  cookies -= 50000;
  seeds.push({ type: 'cocoa', purchasedAt: Date.now() });
  save();
  update();
}

function buyAppleSeed(){
  if(cookies < 75000) return;
  cookies -= 75000;
  seeds.push({ type: 'apple', purchasedAt: Date.now() });
  save();
  update();
}

function buyNetherWartSeed(){
  if(cookies < 100000) return;
  cookies -= 100000;
  seeds.push({ type: 'netherwart', purchasedAt: Date.now() });
  save();
  update();
}

function buyBananaSeed(){
  if(cookies < 150000) return;
  cookies -= 150000;
  seeds.push({ type: 'banana', purchasedAt: Date.now() });
  save();
  update();
}

function renderMarket(){
  const grid = document.getElementById('marketGrid');
  if(!grid) return;
  grid.innerHTML = '<div class="small">Seeds available in the Market â€” buy them to add to your Inventory.</div>';
}
