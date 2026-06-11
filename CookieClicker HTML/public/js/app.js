(async function init(){
  try {
    await loadTabs();
    initDomRefs();
    if(typeof initChatUi === 'function') initChatUi();
    startGameLoops();
    renderGarden();
  } catch (err) {
    console.error(err);
    alert("Failed to load game UI. Refresh the page.");
  }
})();
