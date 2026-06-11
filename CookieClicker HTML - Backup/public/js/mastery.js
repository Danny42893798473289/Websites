const MASTERY_PATHS = {
  fortune: { name: 'Fortune', icon: 'ðŸª' },
  prestige: { name: 'Ascension', icon: 'âœ¨' },
  pets: { name: 'Beast', icon: 'ðŸ¥š' }
};

const MASTERY_NODES = [
  { id: 'fortune_root', path: 'fortune', row: 0, col: 0, cost: 5, requires: [], label: 'Start with 200 cookies', desc: 'After prestige, begin with 200 cookies instead of 40.' },
  { id: 'fortune_farms4', path: 'fortune', row: 1, col: 0, cost: 10, requires: ['fortune_root'], label: 'Start with 4 Farms', desc: 'After prestige, begin with 4 farms.' },
  { id: 'fortune_farms15', path: 'fortune', row: 2, col: 0, cost: 20, requires: ['fortune_farms4'], label: 'Start with 15 Farms', desc: 'After prestige, begin with 15 farms (replaces 4).' },
  { id: 'fortune_mines5', path: 'fortune', row: 3, col: 0, cost: 40, requires: ['fortune_farms15'], label: 'Start with 5 Mines', desc: 'After prestige, begin with 5 mines.' },
  { id: 'fortune_mines10', path: 'fortune', row: 4, col: 0, cost: 40, requires: ['fortune_mines5'], label: 'Start with 10 Mines', desc: 'After prestige, begin with 10 mines (replaces 5).' },

  { id: 'prestige_root', path: 'prestige', row: 0, col: 0, cost: 20, requires: [], label: '2× why egg gain', desc: 'Earn twice as many why eggs when you prestige.' },
  { id: 'prestige_why4', path: 'prestige', row: 1, col: 0, cost: 40, requires: ['prestige_root'], label: '4× why egg gain', desc: 'Earn 4× as many why eggs when you prestige (replaces 2×).' },
  { id: 'prestige_why10', path: 'prestige', row: 2, col: 0, cost: 100, requires: ['prestige_why4'], label: '10× why egg gain', desc: 'Earn 10× as many why eggs when you prestige (replaces 4×).' },
  { id: 'prestige_gay_grandma', path: 'prestige', row: 3, col: 0, cost: 50, requires: ['fortune_farms15', 'pets_hatch10'], label: 'Gay Grandma', desc: 'Requires 15 Farms + 10× hatch speed. Every 2 grandmas count as 3 per 40 min tick (+1 bonus grandma per pair).' },
  { id: 'prestige_twins', path: 'prestige', row: 4, col: 0, cost: 75, requires: ['prestige_gay_grandma'], label: 'Twins', desc: 'Each grandma counts as 4 for each 40 min tick (replaces Gay Grandma).' },
  { id: 'prestige_ugay', path: 'prestige', row: 5, col: 0, cost: 100, requires: ['prestige_twins'], label: 'Ugay', desc: 'Every 2 grandmas count as 6 for each 40 min tick (×3, replaces Twins).' },
  { id: 'prestige_usgay', path: 'prestige', row: 6, col: 0, cost: 150, requires: ['prestige_ugay'], label: 'Usgay', desc: 'Every 2 grandmas count as 10 for each 40 min tick (×5, replaces Ugay).' },

  { id: 'pets_root', path: 'pets', row: 0, col: 0, cost: 10, requires: [], label: '2× hatch speed', desc: 'Pets hatch twice as fast.' },
  { id: 'pets_hatch4', path: 'pets', row: 1, col: 0, cost: 20, requires: ['pets_root'], label: '4× hatch speed', desc: 'Pets hatch 4× as fast (replaces 2×).' },
  { id: 'pets_hatch10', path: 'pets', row: 2, col: 0, cost: 40, requires: ['pets_hatch4'], label: '10× hatch speed', desc: 'Pets hatch 10× as fast (replaces 4×).' },
  { id: 'pets_hatch15', path: 'pets', row: 3, col: 0, cost: 80, requires: ['pets_hatch10'], label: '15× hatch speed', desc: 'Pets hatch 15× as fast (replaces 10×).' },
  { id: 'pets_hatch_instant', path: 'pets', row: 4, col: 0, cost: 160, requires: ['pets_hatch15'], label: 'Instant hatch', desc: 'Eggs hatch instantly when bought (replaces 15×).' }
];

function resetMastery(){
  masteryPath = null;
  masteryUnlocked = [];
}

function hasMastery(id){ return masteryUnlocked.includes(id); }

function getMasteryNode(id){ return MASTERY_NODES.find(n => n.id === id); }

function getStartCookies(){
  if(hasMastery('fortune_root')) return 200;
  return START_COOKIES;
}

function applyMasteryStartingBuildings(){
  if(hasMastery('fortune_mines10')) mines = 10;
  else if(hasMastery('fortune_mines5')) mines = 5;
  else mines = 0;

  if(hasMastery('fortune_farms15')) farms = 15;
  else if(hasMastery('fortune_farms4')) farms = 4;
  else farms = 0;
}

function getWhyEggMultiPerEgg(){
  return 0.05;
}

function getWhyEggCap(){
  return 200 + 10 * xp;
}

function getWhyEggPrestigeMult(){
  if(hasMastery('prestige_why10')) return 10;
  if(hasMastery('prestige_why4')) return 4;
  if(hasMastery('prestige_root')) return 2;
  return 1;
}

function getWhyEggsFromCookies(amount){
  let earned = Math.round((Number(amount) || 0) / WHY_EGG_PER_COOKIES);
  earned *= getWhyEggPrestigeMult();
  return earned;
}

function getEffectiveGrandmas(){
  const g = Number(grandmas) || 0;
  if(hasMastery('prestige_usgay')) return g * 5;
  if(hasMastery('prestige_ugay')) return g * 3;
  if(hasMastery('prestige_twins')) return g * 4;
  if(hasMastery('prestige_gay_grandma')) return g + Math.floor(g / 2);
  return g;
}

function hasInstantHatch(){
  return hasMastery('pets_hatch_instant');
}

function getHatchSpeedMult(){
  if(hasMastery('pets_hatch15')) return 15;
  if(hasMastery('pets_hatch10')) return 10;
  if(hasMastery('pets_hatch4')) return 4;
  if(hasMastery('pets_root')) return 2;
  return 1;
}

function getMaxEquipSlots(){
  if(typeof getTornadoNormalEquipSlots === 'function') return getTornadoNormalEquipSlots();
  return 2;
}

function getBuildingMult(){ return 1; }

function getPassiveMult(){ return 1; }

function getPetEggCost(cost){
  return cost;
}

function getBoosterHatchMult(){
  return getHatchSpeedMult();
}

function canUnlockMastery(id){
  const node = getMasteryNode(id);
  if(!node || hasMastery(id)) return false;
  if(whyEggs < node.cost) return false;
  if(node.requires.length && !node.requires.every(r => hasMastery(r))) return false;
  return true;
}

function unlockMastery(id){
  const node = getMasteryNode(id);
  if(!node || !canUnlockMastery(id)) return;
  if(!confirm(`Unlock "${node.label}" for ${node.cost} why egg(s)?`)) return;
  whyEggs -= node.cost;
  masteryUnlocked.push(id);
  if(!masteryPath) masteryPath = node.path;
  save();
  update();
}

function renderMastery(){
  const tree = document.getElementById('masteryTree');
  const info = document.getElementById('masteryInfo');
  if(!tree) return;

  if(info){
    info.textContent = masteryPath
      ? 'Unlock the next node in each line when you meet its requirements. Gay Grandma needs Start with 15 Farms and 10× hatch speed.'
      : 'Pick any path\'s top node to start. You can still unlock nodes on other paths later if you meet their requirements.';
  }

  tree.innerHTML = '';
  const paths = ['fortune', 'prestige', 'pets'];
  const maxRow = Math.max(...MASTERY_NODES.map(n => n.row));

  paths.forEach(pathKey => {
    const col = document.createElement('div');
    col.className = 'mastery-path';
    const pathMeta = MASTERY_PATHS[pathKey];
    const header = document.createElement('div');
    header.className = 'mastery-path-header';
    header.textContent = `${pathMeta.icon} ${pathMeta.name}`;
    col.appendChild(header);

    for(let row = 0; row <= maxRow; row++){
      const rowNodes = MASTERY_NODES.filter(n => n.path === pathKey && n.row === row);
      if(!rowNodes.length) continue;
      const rowEl = document.createElement('div');
      rowEl.className = 'mastery-row';
      rowNodes.sort((a,b) => a.col - b.col).forEach(node => {
        const btn = document.createElement('button');
        const unlocked = hasMastery(node.id);
        const available = canUnlockMastery(node.id);
        btn.className = 'mastery-node';
        if(unlocked) btn.classList.add('unlocked');
        else if(available) btn.classList.add('available');
        else btn.classList.add('locked');
        btn.innerHTML = `<span class="mastery-label">${node.label}</span><span class="mastery-cost">${unlocked ? 'âœ“' : node.cost + ' ðŸ¥š'}</span>`;
        btn.title = node.desc;
        if(available) btn.onclick = () => unlockMastery(node.id);
        else if(!unlocked) btn.disabled = true;
        rowEl.appendChild(btn);
      });
      col.appendChild(rowEl);
    }
    tree.appendChild(col);
  });
}
