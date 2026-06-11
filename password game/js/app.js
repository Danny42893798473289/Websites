(function () {
  const STORAGE_KEY = "password-game-save-v1";
  const rules = createRules();

  const editor = document.getElementById("passwordEditor");
  const rulesContainer = document.getElementById("rulesContainer");
  const saveStatus = document.getElementById("saveStatus");
  const editorToolbar = document.getElementById("editorToolbar");
  const sacrificeModal = document.getElementById("sacrificeModal");
  const finalModal = document.getElementById("finalModal");
  const retypeModal = document.getElementById("retypeModal");
  const winModal = document.getElementById("winModal");
  const deathModal = document.getElementById("deathModal");

  let state = createInitialState();
  let unlockedCount = 0;
  let saveTimeout = null;
  let wormInterval = null;
  let retypeInterval = null;
  let retypeSeconds = 120;
  let savedPasswordForRetype = "";

  function createInitialState() {
    const seed = dateSeed(getTodayString() + "game");
    const video = pickFromArray(VIDEO_URLS, seed + 7);
    return {
      captcha: generateCaptcha(seed + 1),
      wordleAnswer: getWordleAnswer(),
      country: pickFromArray(COUNTRIES, seed + 2),
      chess: pickFromArray(CHESS_PUZZLES, seed + 3),
      moonEmoji: getMoonPhaseEmoji(),
      randomColor: randomColor(seed + 4),
      youtubeDuration: video.duration,
      youtubeUrl: video.url,
      sacrificedLetters: [],
      sacrificeDone: false,
      eggPlaced: false,
      paulHatched: false,
      paulFed: false,
      fireStarted: false,
      wormDeadline: null,
      triggeredUnlocks: {},
      gameOver: false,
      won: false
    };
  }

  function createContext() {
    const text = getPlainText(editor);
    return {
      text,
      length: text.length,
      editor,
      state,
      triggerDeath: (msg) => {
        if (!state.gameOver) endGame("Paul has been slain!", msg);
      }
    };
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      const fresh = createInitialState();
      state = { ...fresh, ...data.state, triggeredUnlocks: data.state.triggeredUnlocks || {} };
      if (data.editorHtml) editor.innerHTML = data.editorHtml;
      unlockedCount = data.unlockedCount || 0;
      if (getPlainText(editor).length > 0 && unlockedCount === 0) unlockedCount = 1;
      if (unlockedCount >= 18) editorToolbar.hidden = false;
      if (unlockedCount >= 23 && state.paulHatched) startWormTimer();
      updateSaveStatus("Restored from autosave");
      return true;
    } catch {
      return false;
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(persistSave, 400);
    updateSaveStatus("Saving...");
  }

  function persistSave() {
    const payload = {
      editorHtml: editor.innerHTML,
      unlockedCount,
      state,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    updateSaveStatus("Saved " + new Date().toLocaleTimeString());
    saveStatus.classList.add("saved");
  }

  function updateSaveStatus(msg) {
    saveStatus.textContent = msg;
  }

  function clearSave() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function fireOnUnlock(rule) {
    if (!rule.onUnlock || state.triggeredUnlocks[rule.id]) return;
    state.triggeredUnlocks[rule.id] = true;
    rule.onUnlock(state, editor);
    if (rule.id === 17) state.eggPlaced = true;
    if (rule.id === 25 && !state.sacrificeDone) showSacrificeModal();
  }

  function tryUnlockMore(ctx) {
    let changed = false;
    while (unlockedCount < rules.length) {
      let allCorrect = true;
      for (let i = 0; i < unlockedCount; i++) {
        if (!rules[i].check(ctx)) {
          allCorrect = false;
          break;
        }
      }
      if (!allCorrect) break;

      const nextRule = rules[unlockedCount];
      fireOnUnlock(nextRule);
      unlockedCount++;
      changed = true;
    }
    return changed;
  }

  function checkRules() {
    if (state.gameOver || state.won) return;

    const ctx = createContext();
    if (ctx.text.length > 0 && unlockedCount === 0) unlockedCount = 1;

    const changed = tryUnlockMore(ctx);

    if (unlockedCount >= 18) editorToolbar.hidden = false;
    if (unlockedCount >= 23 && state.paulHatched && !wormInterval) startWormTimer();

    if (changed) scheduleSave();
    renderRules();

    if (unlockedCount >= 35 && allRulesSatisfied()) showFinalModal();
  }

  function allRulesSatisfied() {
    const ctx = createContext();
    for (let i = 0; i < rules.length - 1; i++) {
      if (!rules[i].check(ctx)) return false;
    }
    return true;
  }

  function renderRules() {
    rulesContainer.innerHTML = "";
    if (unlockedCount === 0) return;

    const ctx = createContext();

    for (let i = 0; i < unlockedCount && i < rules.length; i++) {
      const rule = rules[i];
      const correct = rule.check(ctx);
      const card = document.createElement("article");
      card.className = "rule-card " + (correct ? "success" : "error");
      if (i === unlockedCount - 1 && !correct) card.className = "rule-card pending";

      const header = document.createElement("div");
      header.className = "rule-header";
      header.textContent = "Rule " + rule.id;
      card.appendChild(header);

      const desc = document.createElement("p");
      desc.className = "rule-desc";
      desc.textContent = getRuleDescription(rule, ctx);
      card.appendChild(desc);

      if (rule.widget) {
        const widget = renderWidget(rule.widget, ctx);
        if (widget) {
          widget.className = "rule-widget";
          card.appendChild(widget);
        }
      }

      rulesContainer.appendChild(card);
    }
  }

  function renderWidget(type, ctx) {
    const wrap = document.createElement("div");

    switch (type) {
      case "sponsors": {
        const row = document.createElement("div");
        row.className = "sponsor-row";
        SPONSORS.forEach((name) => {
          const item = document.createElement("div");
          item.className = "sponsor-item";
          const logo = document.createElement("div");
          logo.className = "sponsor-logo " + name;
          logo.textContent = name.toUpperCase();
          item.appendChild(logo);
          item.appendChild(document.createTextNode(name));
          row.appendChild(item);
        });
        wrap.appendChild(row);
        break;
      }
      case "captcha": {
        const row = document.createElement("div");
        row.className = "captcha-row";
        const canvas = document.createElement("canvas");
        canvas.className = "captcha-canvas";
        canvas.width = 180;
        canvas.height = 50;
        drawCaptcha(canvas, state.captcha);
        const refreshBtn = document.createElement("button");
        refreshBtn.type = "button";
        refreshBtn.className = "captcha-refresh";
        refreshBtn.title = "Refresh CAPTCHA";
        refreshBtn.textContent = "↻";
        refreshBtn.addEventListener("click", refreshCaptcha);
        row.appendChild(canvas);
        row.appendChild(refreshBtn);
        wrap.appendChild(row);
        break;
      }
      case "wordle": {
        const note = document.createElement("p");
        note.className = "wordle-note";
        note.textContent = "Offline daily word (no Wordle site needed):";
        const answer = document.createElement("div");
        answer.className = "wordle-answer";
        answer.textContent = state.wordleAnswer.toUpperCase();
        wrap.appendChild(note);
        wrap.appendChild(answer);
        break;
      }
      case "moon": {
        const note = document.createElement("p");
        note.className = "moon-note";
        note.textContent = "Use this emoji (calculated offline — no moon lookup needed):";
        const emoji = document.createElement("div");
        emoji.className = "moon-answer";
        emoji.textContent = state.moonEmoji;
        wrap.appendChild(note);
        wrap.appendChild(emoji);
        break;
      }
      case "country": {
        const card = document.createElement("div");
        card.className = "country-card";
        const flag = document.createElement("span");
        flag.className = "country-flag";
        flag.textContent = state.country.flag;
        const name = document.createElement("span");
        name.textContent = "Where is this?";
        card.appendChild(flag);
        card.appendChild(name);
        wrap.appendChild(card);
        break;
      }
      case "chess": {
        wrap.appendChild(renderChessBoard(state.chess.fen));
        const hint = document.createElement("p");
        hint.textContent = "Find the best check move.";
        wrap.appendChild(hint);
        break;
      }
      case "paul": {
        const p = document.createElement("div");
        p.className = "paul-status";
        p.textContent = "🥚 Paul";
        wrap.appendChild(p);
        break;
      }
      case "paulHatched": {
        const p = document.createElement("div");
        p.className = "paul-status";
        p.textContent = "🐔 Paul is hungry!";
        const timer = document.createElement("div");
        timer.className = "worm-timer";
        timer.id = "wormTimerDisplay";
        timer.textContent = "Feed with 🐛 before the timer runs out!";
        wrap.appendChild(p);
        wrap.appendChild(timer);
        break;
      }
      case "youtube": {
        const p = document.createElement("p");
        p.innerHTML = "Example URL (" + formatDuration(state.youtubeDuration) + "): <code>" + state.youtubeUrl + "</code>";
        wrap.appendChild(p);
        break;
      }
      case "color": {
        const swatch = document.createElement("div");
        swatch.className = "color-swatch";
        swatch.style.background = state.randomColor;
        const label = document.createElement("p");
        label.textContent = "Include a hex color within ±5 of " + state.randomColor;
        wrap.appendChild(swatch);
        wrap.appendChild(label);
        break;
      }
    }

    return wrap;
  }

  function refreshCaptcha() {
    state.captcha = generateCaptcha(Date.now() + Math.floor(Math.random() * 100000));
    scheduleSave();
    checkRules();
  }

  function showSacrificeModal() {
    if (state.sacrificeDone || !sacrificeModal.hidden) return;
    sacrificeModal.hidden = false;
    const grid = document.getElementById("letterGrid");
    const selectedEl = document.getElementById("selectedLetters");
    const confirmBtn = document.getElementById("confirmSacrifice");
    const selected = [];

    grid.innerHTML = "";
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letter) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = letter;
      btn.addEventListener("click", () => {
        const idx = selected.indexOf(letter);
        if (idx >= 0) {
          selected.splice(idx, 1);
          btn.classList.remove("selected");
        } else if (selected.length < 2) {
          selected.push(letter);
          btn.classList.add("selected");
        }
        selectedEl.textContent = selected.length ? selected.join(", ") : "—";
        confirmBtn.disabled = selected.length !== 2;
      });
      grid.appendChild(btn);
    });

    confirmBtn.onclick = () => {
      state.sacrificedLetters = [...selected];
      state.sacrificeDone = true;
      sacrificeModal.hidden = true;
      scheduleSave();
      checkRules();
    };
  }

  function startWormTimer() {
    if (wormInterval) return;
    if (!state.wormDeadline) state.wormDeadline = Date.now() + 60000;

    wormInterval = setInterval(() => {
      const remaining = state.wormDeadline - Date.now();
      const display = document.getElementById("wormTimerDisplay");
      if (display) {
        display.textContent = remaining > 0
          ? "Time until Paul needs food: " + Math.ceil(remaining / 1000) + "s"
          : "Paul is starving!";
      }

      if (getPlainText(editor).includes("🐛")) {
        state.paulFed = true;
        state.wormDeadline = Date.now() + 60000;
        scheduleSave();
        return;
      }

      if (remaining <= 0) {
        endGame("Paul has starved!", "You forgot to feed Paul. He needed three 🐛 every minute.");
      }
    }, 500);
  }

  function showFinalModal() {
    if (state.won || !finalModal.hidden) return;
    finalModal.hidden = false;
  }

  function startRetypeChallenge() {
    savedPasswordForRetype = getPlainText(editor);
    editor.innerHTML = "";
    editor.contentEditable = "false";
    finalModal.hidden = true;
    retypeModal.hidden = false;
    retypeSeconds = 120;
    document.getElementById("retypeInput").value = "";
    document.getElementById("retypeTimer").textContent = "2:00";

    retypeInterval = setInterval(() => {
      retypeSeconds--;
      const m = Math.floor(retypeSeconds / 60);
      const s = retypeSeconds % 60;
      document.getElementById("retypeTimer").textContent = m + ":" + String(s).padStart(2, "0");

      if (retypeSeconds <= 0) {
        clearInterval(retypeInterval);
        retypeInterval = null;
        retypeModal.hidden = true;
        endGame("Time's up!", "You failed to retype your password in 120 seconds.");
      }
    }, 1000);
  }

  function endGame(title, message) {
    state.gameOver = true;
    clearInterval(wormInterval);
    clearInterval(retypeInterval);
    wormInterval = null;
    retypeInterval = null;
    deathModal.hidden = false;
    document.getElementById("deathTitle").textContent = title;
    document.getElementById("deathMessage").textContent = message;
    editor.contentEditable = "false";
    scheduleSave();
  }

  function winGame() {
    state.won = true;
    clearInterval(wormInterval);
    clearInterval(retypeInterval);
    wormInterval = null;
    retypeInterval = null;
    retypeModal.hidden = true;
    winModal.hidden = false;
    clearSave();
  }

  function resetGame() {
    clearInterval(wormInterval);
    clearInterval(retypeInterval);
    wormInterval = null;
    retypeInterval = null;
    state = createInitialState();
    unlockedCount = 0;
    editor.innerHTML = "";
    editor.contentEditable = "true";
    editorToolbar.hidden = true;
    sacrificeModal.hidden = true;
    finalModal.hidden = true;
    retypeModal.hidden = true;
    winModal.hidden = true;
    deathModal.hidden = true;
    clearSave();
    renderRules();
    updateSaveStatus("Progress reset");
  }

  editor.addEventListener("input", () => {
    if (state.gameOver || state.won) return;
    scheduleSave();
    checkRules();
  });

  document.getElementById("fontFamily").addEventListener("change", (e) => {
    if (e.target.value) document.execCommand("fontName", false, e.target.value);
    scheduleSave();
    checkRules();
  });

  document.getElementById("fontSize").addEventListener("change", (e) => {
    if (e.target.value) {
      document.execCommand("fontSize", false, "7");
      editor.querySelectorAll("font[size='7']").forEach((el) => {
        el.removeAttribute("size");
        el.style.fontSize = e.target.value;
      });
    }
    scheduleSave();
    checkRules();
  });

  editorToolbar.addEventListener("click", (e) => {
    const cmd = e.target.closest("button")?.dataset?.cmd;
    if (!cmd) return;
    document.execCommand(cmd, false);
    scheduleSave();
    checkRules();
  });

  document.getElementById("confirmFinal").addEventListener("click", startRetypeChallenge);
  document.getElementById("cancelFinal").addEventListener("click", () => {
    finalModal.hidden = true;
  });

  document.getElementById("submitRetype").addEventListener("click", () => {
    const attempt = document.getElementById("retypeInput").value;
    if (attempt === savedPasswordForRetype) {
      winGame();
    } else {
      clearInterval(retypeInterval);
      retypeInterval = null;
      retypeModal.hidden = true;
      endGame("Wrong password!", "That didn't match your original password. Game over.");
    }
  });

  document.getElementById("restartGame").addEventListener("click", resetGame);
  document.getElementById("playAgain").addEventListener("click", resetGame);
  document.getElementById("resetProgress").addEventListener("click", () => {
    if (confirm("Reset all saved progress and start over?")) resetGame();
  });

  if (!loadSave()) updateSaveStatus("Autosave enabled");
  checkRules();
})();
