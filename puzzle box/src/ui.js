const appRoot = document.getElementById("app");

export function createUI(onAction) {
  const el = {
    mainMenu: document.getElementById("main-menu"),
    levelSelect: document.getElementById("level-select"),
    settings: document.getElementById("settings-screen"),
    hud: document.getElementById("hud"),
    pause: document.getElementById("pause-screen"),
    end: document.getElementById("end-screen"),
    tips: document.getElementById("tips"),
    levelGrid: document.getElementById("level-grid"),
    hudLevel: document.getElementById("hud-level"),
    hudAttempts: document.getElementById("hud-attempts"),
    hudMode: document.getElementById("hud-mode"),
    aimMeter: document.getElementById("aim-meter"),
    endAttempts: document.getElementById("end-attempts"),
    starRow: document.getElementById("star-row"),
    followSlider: document.getElementById("follow-slider"),
    shadowQuality: document.getElementById("shadow-quality"),
    toast: document.getElementById("achievement-toast")
  };

  appRoot.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn || btn.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    onAction(btn.dataset.action);
  });

  function showScreen(name) {
    hideAllScreens();
    if (name === "none") {
      appRoot.classList.remove("menu-open");
      el.tips?.classList.remove("hidden");
      return;
    }
    el[name]?.classList.add("visible");
    appRoot.classList.add("menu-open");
    el.tips?.classList.add("hidden");
  }

  function hideAllScreens() {
    [el.mainMenu, el.levelSelect, el.settings, el.pause, el.end].forEach((screen) => screen.classList.remove("visible"));
  }

  function showHUD(visible) {
    el.hud.classList.toggle("hidden", !visible);
  }

  function setHud(levelName, attempts, mode = "Campaign") {
    el.hudLevel.textContent = levelName;
    el.hudAttempts.textContent = `Attempts: ${attempts}`;
    el.hudMode.textContent = mode;
  }

  function setAimMeter(power01) {
    el.aimMeter.style.width = `${Math.round(Math.max(0, Math.min(1, power01)) * 100)}%`;
  }

  function setEndState(stars, attempts) {
    el.starRow.textContent = `${stars >= 1 ? "★" : "☆"}${stars >= 2 ? "★" : "☆"}${stars >= 3 ? "★" : "☆"}`;
    el.endAttempts.textContent = `Completed in ${attempts} attempt${attempts === 1 ? "" : "s"}`;
  }

  function renderLevelGrid(levels, save, onPickLevel) {
    el.levelGrid.innerHTML = "";
    for (const level of levels) {
      const unlocked = save.unlockedLevel >= level.id;
      const btn = document.createElement("button");
      btn.className = `level-btn ${unlocked ? "" : "locked"}`;
      const stars = save.starsByLevel[String(level.id)] || 0;
      btn.innerHTML = `${level.id}<span class="star-small">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>`;
      btn.disabled = !unlocked;
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        onPickLevel(level.id);
      });
      el.levelGrid.appendChild(btn);
    }
  }

  function setSettingsValues(settings) {
    el.followSlider.value = String(settings.followStrength ?? 0.1);
    el.shadowQuality.value = settings.shadowQuality || "medium";
  }

  function readSettingsValues() {
    return {
      followStrength: Number(el.followSlider.value),
      shadowQuality: el.shadowQuality.value
    };
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.remove("hidden");
    setTimeout(() => el.toast.classList.add("hidden"), 2300);
  }

  return {
    showScreen,
    showHUD,
    setHud,
    setAimMeter,
    setEndState,
    renderLevelGrid,
    setSettingsValues,
    readSettingsValues,
    showToast
  };
}
