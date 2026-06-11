function getBase(){
  let raw =
    getEffectiveGrandmas() * (typeof getBuildingStoneMult === "function" ? getBuildingStoneMult("grandmas") : 1) +
    farms * 12 * (typeof getBuildingStoneMult === "function" ? getBuildingStoneMult("farms") : 1) +
    factories * 31 * (typeof getBuildingStoneMult === "function" ? getBuildingStoneMult("factories") : 1) +
    oils * 125 * (typeof getBuildingStoneMult === "function" ? getBuildingStoneMult("oils") : 1) +
    mines * 200 * (typeof getBuildingStoneMult === "function" ? getBuildingStoneMult("mines") : 1) +
    coops * 310 * (typeof getBuildingStoneMult === "function" ? getBuildingStoneMult("coops") : 1) +
    wormholes * 780 * (typeof getBuildingStoneMult === "function" ? getBuildingStoneMult("wormholes") : 1) +
    galaxies * 20000 * (typeof getBuildingStoneMult === "function" ? getBuildingStoneMult("galaxies") : 1) +
    empties * 250000 * (typeof getBuildingStoneMult === "function" ? getBuildingStoneMult("empties") : 1);
  return Math.floor(raw * getBuildingMult());
}

function getWhyEggMulti(){ return whyEggs * getWhyEggMultiPerEgg(); }

function getMulti(){
  if(typeof isLimboNoPets === 'function' && isLimboNoPets()){
    let m = 1 + getWhyEggMulti();
    if(typeof getTornadoMultiMult === 'function') m *= getTornadoMultiMult();
    return m;
  }
  const petM = typeof getPetMasteryMult === 'function' ? getPetMasteryMult() : 1;
  let m = 1;
  if(typeof getPetContributionWithStones === "function") m += getPetContributionWithStones() * petM;
  else{
    equipped.forEach(p => m += (Number(p) || 0) * petM);
    if(Array.isArray(permanentEquipped)) permanentEquipped.forEach((p, i) => {
      const v = typeof getPermanentPetMult === 'function' ? getPermanentPetMult(p, i) : (Number(p) || 0);
      m += v * petM;
    });
  }
  m += getExpansionMultiSum();
  m += getWhyEggMulti();
  if(typeof getTornadoMultiMult === 'function') m *= getTornadoMultiMult();
  return m;
}

function getProductionCapPer40m(){
  return 5000000 + 250000 * (Number(xp) || 0);
}

function getPer40mPotential(){
  return Math.floor(getBase() * getMulti() * getPassiveMult());
}

function getPer40mEarned(){
  return Math.min(getPer40mPotential(), getProductionCapPer40m());
}

function buy(val,cost){
  val = Number(val) || 0;
  if(cookies >= cost){
    cookies -= cost;
    return val + 1;
  }
  return val;
}

function buyGrandma(){grandmas=buy(grandmas,1);update();save();}
function buyFarm(){farms=buy(farms,10);update();save();}
function buyFactory(){factories=buy(factories,25);update();save();}
function buyOil(){oils=buy(oils,100);update();save();}
function buyMine(){mines=buy(mines,150);update();save();}
function buyCoop(){coops=buy(coops,200);update();save();}
function buyWormhole(){wormholes=buy(wormholes,500);update();save();}
function buyGalaxy(){galaxies=buy(galaxies,10000);update();save();}
function buyEmpty(){empties=buy(empties,100000);update();save();}
