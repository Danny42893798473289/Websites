function getBase(){
const raw =
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
  let m = 1;
  if(typeof getPetContributionWithStones === "function") m += getPetContributionWithStones();
  else{
    equipped.forEach(p => m += p);
    if(Array.isArray(permanentEquipped)) permanentEquipped.forEach(p => m += Number(p) || 0);
  }
  m += getExpansionMultiSum();
  m += getWhyEggMulti();
  if(typeof getTornadoMultiMult === 'function') m *= getTornadoMultiMult();
  return m;
}

// âœ… FIXED
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
