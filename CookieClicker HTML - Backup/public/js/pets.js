function startHatch(multi, timeSeconds){
  if(hasInstantHatch()){
    pets.push(multi);
    return;
  }
  hatching = { multi, time: timeSeconds };
}

function buyPetTiny(){
  const cost = getPetEggCost(50);
  if(cookies>=cost && !isAnyHatching()){
    cookies -= cost;
    startHatch(0.05, 40*60);
    save();
    update();
  }
}

function buyPetSmall(){
  const cost = getPetEggCost(100);
  if(cookies>=cost && !isAnyHatching()){
    cookies -= cost;
    startHatch(0.2, 160*60);
    save();
    update();
  }
}

function buyPetBig(){
  const cost = getPetEggCost(500);
  if(cookies>=cost && !isAnyHatching()){
    cookies -= cost;
    startHatch(1, 1440*60);
    save();
    update();
  }
}

function buyPetLarge(){
  const cost = getPetEggCost(1000);
  if(cookies>=cost && !isAnyHatching()){
    cookies -= cost;
    startHatch(4, 4*24*60*60);
    save();
    update();
  }
}

function buyPetEnormas(){
  const cost = getPetEggCost(2000);
  if(cookies>=cost && !isAnyHatching()){
    cookies -= cost;
    startHatch(10, 7*24*60*60);
    save();
    update();
  }
}

function cancelHatch(){
  if(hatching){
    hatching = null;
    save();
    update();
  }
}

function petLabel(p){
  if(p===0.05) return 'Tiny Egg (+0.05)';
  if(p===0.2) return 'Small Egg (+0.2)';
  if(p===1) return 'Big Egg (+1)';
  if(p===4) return 'Large Egg (+4)';
  if(p===10) return 'Enormas Egg (+10)';
  return '+'+p;
}
