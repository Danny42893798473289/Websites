const THEME_CATEGORIES = [
  { id: "low", name: "Low Tier", hint: "Starter themes (0-1 why egg)." },
  { id: "mid", name: "Mid Tier", hint: "Stronger premium palettes (3 why eggs)." },
  { id: "high", name: "High Tier", hint: "Rare prestige palettes (8 why eggs)." }
];

const THEMES = [
  {
    id: "dark-orange",
    name: "Dark Orange",
    tier: "low",
    cost: 0,
    unlockedByDefault: true,
    description: "Default warm dark theme.",
    vars: {
      "--bg1": "#0f1724",
      "--bg2": "#0b1220",
      "--card": "#0f1728cc",
      "--accent": "#ffb86b",
      "--muted": "#9aa4b2",
      "--glass": "rgba(255,255,255,0.04)"
    }
  },
  {
    id: "light-blue",
    name: "Light Blue",
    tier: "low",
    cost: 1,
    unlockedByDefault: false,
    description: "Cool blue glow with lighter contrast accents.",
    vars: {
      "--bg1": "#0b1322",
      "--bg2": "#07101c",
      "--card": "#102036d4",
      "--accent": "#6fb7ff",
      "--muted": "#a9bed7",
      "--glass": "rgba(111,183,255,0.10)"
    }
  },
  {
    id: "mint-frost",
    name: "Mint Frost",
    tier: "low",
    cost: 1,
    unlockedByDefault: false,
    description: "Fresh mint accents with icy shadows.",
    vars: {
      "--bg1": "#0a1a1b",
      "--bg2": "#071314",
      "--card": "#0f2524d4",
      "--accent": "#78ffd6",
      "--muted": "#9fc7c3",
      "--glass": "rgba(120,255,214,0.10)"
    }
  },
  {
    id: "sunset-rose",
    name: "Sunset Rose",
    tier: "low",
    cost: 1,
    unlockedByDefault: false,
    description: "Warm magenta-orange sunset glow.",
    vars: {
      "--bg1": "#221022",
      "--bg2": "#170b1a",
      "--card": "#2c1532d4",
      "--accent": "#ff8f9d",
      "--muted": "#c0a0bc",
      "--glass": "rgba(255,143,157,0.10)"
    }
  },
  {
    id: "royal-violet",
    name: "Royal Violet",
    tier: "mid",
    cost: 3,
    unlockedByDefault: false,
    description: "Deep purple style with neon highlights.",
    vars: {
      "--bg1": "#15122a",
      "--bg2": "#0f0d21",
      "--card": "#1c1a37d4",
      "--accent": "#b38cff",
      "--muted": "#a8a4d1",
      "--glass": "rgba(179,140,255,0.10)"
    }
  },
  {
    id: "emerald-night",
    name: "Emerald Night",
    tier: "mid",
    cost: 3,
    unlockedByDefault: false,
    description: "Dark green ambience and clean contrast.",
    vars: {
      "--bg1": "#0d1e18",
      "--bg2": "#081611",
      "--card": "#122b22d4",
      "--accent": "#6dff9a",
      "--muted": "#9fb9ad",
      "--glass": "rgba(109,255,154,0.10)"
    }
  },
  {
    id: "crimson-steel",
    name: "Crimson Steel",
    tier: "mid",
    cost: 3,
    unlockedByDefault: false,
    description: "Sharp red accent over steel darks.",
    vars: {
      "--bg1": "#1f1215",
      "--bg2": "#150c0f",
      "--card": "#2a151bd4",
      "--accent": "#ff6f7f",
      "--muted": "#b79fa5",
      "--glass": "rgba(255,111,127,0.10)"
    }
  },
  {
    id: "arctic-cyan",
    name: "Arctic Cyan",
    tier: "mid",
    cost: 3,
    unlockedByDefault: false,
    description: "Cool cyan UI for a crisp futuristic feel.",
    vars: {
      "--bg1": "#0d1a24",
      "--bg2": "#09131a",
      "--card": "#122533d4",
      "--accent": "#66ecff",
      "--muted": "#9ab6c8",
      "--glass": "rgba(102,236,255,0.10)"
    }
  },
  {
    id: "golden-amber",
    name: "Golden Amber",
    tier: "mid",
    cost: 3,
    unlockedByDefault: false,
    description: "Bright amber highlights on dark slate.",
    vars: {
      "--bg1": "#1d1a12",
      "--bg2": "#14110b",
      "--card": "#2a2317d4",
      "--accent": "#ffc35a",
      "--muted": "#c3b093",
      "--glass": "rgba(255,195,90,0.10)"
    }
  },
  {
    id: "void-neon",
    name: "Void Neon",
    tier: "high",
    cost: 8,
    unlockedByDefault: false,
    description: "Black-violet void with electric magenta energy.",
    vars: {
      "--bg1": "#07070d",
      "--bg2": "#04040a",
      "--card": "#120f20e0",
      "--accent": "#ff5eea",
      "--muted": "#b6a9ca",
      "--glass": "rgba(255,94,234,0.12)"
    }
  },
  {
    id: "celestial-gold",
    name: "Celestial Gold",
    tier: "high",
    cost: 8,
    unlockedByDefault: false,
    description: "Royal dark tones with bright celestial gold.",
    vars: {
      "--bg1": "#13110a",
      "--bg2": "#0c0a06",
      "--card": "#211d12e0",
      "--accent": "#ffd97a",
      "--muted": "#c6bc9f",
      "--glass": "rgba(255,217,122,0.12)"
    }
  },
  {
    id: "quantum-ice",
    name: "Quantum Ice",
    tier: "high",
    cost: 8,
    unlockedByDefault: false,
    description: "Frosted blue-black with bright quantum cyan.",
    vars: {
      "--bg1": "#071019",
      "--bg2": "#050b13",
      "--card": "#0f2030e0",
      "--accent": "#7ff0ff",
      "--muted": "#a9c4d6",
      "--glass": "rgba(127,240,255,0.14)"
    }
  },
  {
    id: "inferno-core",
    name: "Inferno Core",
    tier: "high",
    cost: 8,
    unlockedByDefault: false,
    description: "Dark volcanic palette with molten orange-red core.",
    vars: {
      "--bg1": "#170d0a",
      "--bg2": "#0e0706",
      "--card": "#2b1510e0",
      "--accent": "#ff8a4f",
      "--muted": "#c1a191",
      "--glass": "rgba(255,138,79,0.14)"
    }
  }
];

function getThemeById(id){
  return THEMES.find(t => t.id === id);
}

function ensureThemeData(){
  if(!Array.isArray(unlockedThemes)) unlockedThemes = [];
  THEMES.forEach(t => {
    if(t.unlockedByDefault && !unlockedThemes.includes(t.id)) unlockedThemes.push(t.id);
  });
  if(!getThemeById(currentTheme) || !unlockedThemes.includes(currentTheme)) currentTheme = "dark-orange";
}

function isThemeUnlocked(id){
  return Array.isArray(unlockedThemes) && unlockedThemes.includes(id);
}

function applyTheme(themeId){
  const theme = getThemeById(themeId) || getThemeById("dark-orange");
  if(!theme) return;
  ensureThemeData();
  if(!isThemeUnlocked(theme.id)) return;
  currentTheme = theme.id;
  const rootStyle = document.documentElement.style;
  Object.keys(theme.vars).forEach(k => rootStyle.setProperty(k, theme.vars[k]));
}

function buyTheme(themeId){
  const theme = getThemeById(themeId);
  if(!theme || isThemeUnlocked(theme.id)) return;
  if(whyEggs < theme.cost){
    alert(`Need ${theme.cost} why egg(s), you have ${whyEggs}.`);
    return;
  }
  whyEggs -= theme.cost;
  unlockedThemes.push(theme.id);
  applyTheme(theme.id);
  save();
  update();
}

function selectTheme(themeId){
  if(!isThemeUnlocked(themeId)) return;
  applyTheme(themeId);
  save();
  update();
}

function renderThemesTab(){
  ensureThemeData();
  const info = document.getElementById("themesWhyEggsInfo");
  if(info) info.textContent = `Why eggs available: ${whyEggs}`;

  const list = document.getElementById("themesList");
  if(!list) return;
  list.innerHTML = "";

  THEME_CATEGORIES.forEach(cat => {
    const section = document.createElement("section");
    section.className = "theme-category";

    const header = document.createElement("div");
    header.className = "theme-category__head";
    header.innerHTML = `<h3>${cat.name}</h3><span class="small">${cat.hint}</span>`;
    section.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "themes-grid";
    const group = THEMES.filter(t => t.tier === cat.id);

    group.forEach(theme => {
      const unlocked = isThemeUnlocked(theme.id);
      const active = currentTheme === theme.id;
      const card = document.createElement("div");
      card.className = "theme-card" + (active ? " theme-card--active" : "");

      const swatches = Object.values(theme.vars).slice(0, 4)
        .map(v => `<span class="theme-swatch" style="background:${v}"></span>`)
        .join("");

      card.innerHTML = `
        <div class="theme-card__head">
          <strong>${theme.name}</strong>
          <span class="small">${unlocked ? "Unlocked" : `${theme.cost} why egg${theme.cost === 1 ? "" : "s"}`}</span>
        </div>
        <div class="theme-swatches">${swatches}</div>
        <div class="small" style="margin:0 0 10px">${theme.description}</div>
        <div class="controls">
          ${unlocked
            ? `<button class="ghost" ${active ? "disabled" : ""} onclick="selectTheme('${theme.id}')">${active ? "Active" : "Use"}</button>`
            : `<button class="primary" onclick="buyTheme('${theme.id}')">Buy (${theme.cost} why egg${theme.cost === 1 ? "" : "s"})</button>`}
        </div>
      `;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    list.appendChild(section);
  });
}
