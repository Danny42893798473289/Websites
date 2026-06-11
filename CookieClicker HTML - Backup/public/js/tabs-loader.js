const TAB_IDS = ["main", "stone-shop", "forge", "pets", "pet-expansion", "inventory", "garden", "market", "themes", "bank", "upgrade-shop", "prestige", "tornado-prestige", "mastery"];

async function loadTabs(){
  const container = document.getElementById("tabPanels");
  if(!container) throw new Error("tabPanels container not found");

  await Promise.all(TAB_IDS.map(async (id) => {
    const res = await fetch(`tabs/${id}.html`);
    if(!res.ok) throw new Error(`Failed to load tab: ${id}`);
    const html = await res.text();
    container.insertAdjacentHTML("beforeend", html);
  }));
}
