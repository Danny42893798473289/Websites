import * as THREE from "three";
import { createPhysicsWorld, buildLevelBodies, applyLaunchImpulse, updateMovingBodies, isPinKnocked, resetBody, settleLevelBodies, freezeGameplayBodies } from "./physics.js";
import {
  createRenderer,
  buildLevelVisuals,
  clearLevelVisuals,
  syncVisuals,
  applyCameraConfig,
  updateCamera,
  setAimLine,
  setGhostTrail
} from "./renderer.js";
import { campaignLevels, getDailyChallengeLevel } from "./levels.js";
import { createUI } from "./ui.js";
import { loadSave, saveGameState, updateLevelStars, unlockLevel, setSetting, markAchievement } from "./storage.js";

const canvas = document.getElementById("game-canvas");
const save = loadSave();
const physicsWorld = createPhysicsWorld();
const ui = createUI(handleAction);
ui.setSettingsValues(save.settings);

let renderCtx;
let renderer;
let camera;

try {
  renderCtx = createRenderer(canvas, save.settings);
  renderer = renderCtx.renderer;
  camera = renderCtx.camera;
  boot();
  requestAnimationFrame(loop);
} catch (error) {
  console.error("Renderer init failed:", error);
  ui.showToast(`WebGL init failed: ${error.message}`);
  document.getElementById("boot-error")?.classList.remove("hidden");
  const msg = document.getElementById("boot-error-message");
  if (msg) msg.textContent = error.message;
}

const game = {
  mode: "menu",
  campaignIndex: 0,
  activeLevel: null,
  levelBodies: null,
  visuals: null,
  attempts: 0,
  launched: false,
  launchPower: 0,
  dragStart: null,
  dragCurrent: null,
  isAiming: false,
  isRightDragging: false,
  rightDragPrev: null,
  shotsInLevel: 0,
  lastShotPath: [],
  currentShotPath: [],
  replayActive: false,
  replayT: 0,
  daily: false,
  editor: false,
  cameraAdjust: false,
  aimDirection: { x: 1, z: 0 }
};

const cameraRig = {
  theta: 0.9,
  phi: 0.86,
  distance: 22,
  target: new THREE.Vector3(0, 2, 0)
};

const clock = new THREE.Clock();
let elapsed = 0;
let accumulator = 0;
const fixedStep = 1 / 60;
const MIN_LAUNCH_POWER = 2.6;
const MAX_LAUNCH_POWER = 26;
const LAUNCH_DRAG_SCALE = 0.09;
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

function boot() {
  ui.showScreen("mainMenu");
  ui.showHUD(false);
  wireInput();
  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
}

function handleAction(action) {
  if (!renderCtx && action !== "settings" && action !== "back-main") {
    ui.showToast("Game is still loading. Run npm start and open http://localhost:8888");
    return;
  }
  if (action === "play") {
    game.daily = false;
    loadCampaignLevel(Math.max(1, save.unlockedLevel));
    return;
  }
  if (action === "daily") {
    game.daily = true;
    loadDailyChallenge();
    return;
  }
  if (action === "level-select") {
    ui.renderLevelGrid(campaignLevels, save, (id) => {
      game.daily = false;
      loadCampaignLevel(id);
    });
    ui.showScreen("levelSelect");
    return;
  }
  if (action === "settings") {
    ui.setSettingsValues(save.settings);
    ui.showScreen("settings");
    return;
  }
  if (action === "save-settings") {
    const settings = ui.readSettingsValues();
    setSetting(save, "followStrength", settings.followStrength);
    setSetting(save, "shadowQuality", settings.shadowQuality);
    saveGameState(save);
    location.reload();
    return;
  }
  if (action === "back-main") {
    showMainMenu();
    return;
  }
  if (action === "restart") {
    restartLevel();
    ui.showScreen("none");
    return;
  }
  if (action === "pause") {
    if (game.mode === "playing" || game.mode === "cameraAdjust") {
      game.mode = "paused";
      game.cameraAdjust = false;
      ui.showScreen("pause");
    }
    return;
  }
  if (action === "resume") {
    if (game.mode === "paused") {
      game.mode = "playing";
      ui.showScreen("none");
    }
    return;
  }
  if (action === "next-level") {
    if (game.daily) {
      loadDailyChallenge();
      return;
    }
    const next = Math.min(campaignLevels.length, game.activeLevel.id + 1);
    loadCampaignLevel(next);
    return;
  }
  if (action === "show-replay") {
    game.replayActive = true;
    game.replayT = 0;
    ui.showScreen("none");
    return;
  }
  if (action === "toggle-camera") {
    toggleCameraAdjustMode();
    return;
  }
}

function showMainMenu() {
  game.mode = "menu";
  ui.showHUD(false);
  ui.showScreen("mainMenu");
}

function loadCampaignLevel(levelId) {
  const level = campaignLevels.find((l) => l.id === levelId) || campaignLevels[0];
  game.campaignIndex = campaignLevels.indexOf(level);
  loadLevel(level, false);
}

function loadDailyChallenge() {
  const level = getDailyChallengeLevel(new Date());
  loadLevel(level, true);
}

function loadLevel(level, dailyMode) {
  try {
    clearCurrentLevel();
    game.activeLevel = level;
    game.attempts = 0;
    game.shotsInLevel = 0;
    game.launched = false;
    game.launchPower = 0;
    game.lastShotPath = [];
    game.currentShotPath = [];
    game.replayActive = false;
    game.daily = dailyMode;

    game.levelBodies = buildLevelBodies(physicsWorld, level);
    markIllusions(game.levelBodies.staticBodies, level);
    settleLevelBodies(physicsWorld, game.levelBodies);
    game.visuals = buildLevelVisuals(renderCtx.worldRoot, game.levelBodies, renderCtx.materials);

    applyCameraConfig(camera, cameraRig, level.camera);
    game.mode = "playing";
    ui.showScreen("none");
    ui.showHUD(true);
    ui.setHud(`Level ${level.id}: ${level.name}`, game.attempts, dailyMode ? "Daily" : "Campaign");
  } catch (error) {
    console.error("Failed to load level:", error);
    ui.showToast(`Could not load level: ${error.message}`);
    showMainMenu();
  }
}

function markIllusions(staticBodies, level) {
  const illusions = [...(level.platforms || []), ...(level.obstacles || [])].filter((x) => x.illusion);
  if (!illusions.length) return;
  let idx = 0;
  for (const body of staticBodies) {
    if (idx < illusions.length) {
      body.userData = { ...(body.userData || {}), illusion: true };
      idx += 1;
    }
  }
}

function clearCurrentLevel() {
  for (const body of physicsWorld.bodies.slice()) {
    physicsWorld.removeBody(body);
  }
  game.levelBodies = null;
  clearLevelVisuals(renderCtx.worldRoot);
}

function restartLevel() {
  if (!game.activeLevel || !game.levelBodies) return;
  resetBody(game.levelBodies.ballBody, game.activeLevel.ball);
  resetBody(game.levelBodies.pinBody, game.activeLevel.pin);
  freezeGameplayBodies(
    game.levelBodies.ballBody,
    game.levelBodies.pinBody,
    game.activeLevel.ball,
    game.activeLevel.pin
  );
  for (const body of game.levelBodies.movingBodies) {
    body.position.copy(body.userData.basePosition);
  }
  game.launched = false;
  game.launchPower = 0;
  game.currentShotPath = [];
  game.replayActive = false;
  game.cameraAdjust = false;
  ui.setAimMeter(0);
  game.mode = "playing";
}

function finishLevel() {
  if (game.mode !== "playing") return;
  game.mode = "end";
  game.launched = false;
  const stars = game.attempts <= 1 ? 3 : game.attempts < 3 ? 2 : 1;
  if (!game.daily) {
    updateLevelStars(save, game.activeLevel.id, stars);
    unlockLevel(save, game.activeLevel.id + 1);
  }
  save.stats.totalWins += 1;
  const firstWin = markAchievement(save, "first_win");
  const perfectionist = stars === 3 && markAchievement(save, "perfect_shot");
  if (firstWin) ui.showToast("Achievement unlocked: First Strike");
  if (perfectionist) ui.showToast("Achievement unlocked: Perfect Shot");
  saveGameState(save);
  ui.setEndState(stars, game.attempts);
  ui.showScreen("end");
}

function loop() {
  if (!renderer || !camera) return;
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  if (game.mode === "playing" && game.levelBodies) {
    accumulator += dt;
    while (accumulator >= fixedStep) {
      updateMovingBodies(game.levelBodies.movingBodies, elapsed);
      physicsWorld.step(fixedStep);
      accumulator -= fixedStep;
    }
    updateGameplay(dt);
  }
  if (game.mode === "cameraAdjust" && game.levelBodies) {
    const baseMode = game.daily ? "Daily" : "Campaign";
    ui.setHud(`Level ${game.activeLevel.id}: ${game.activeLevel.name}`, game.attempts, `${baseMode} · Camera`);
  }

  if (game.visuals) {
    syncVisuals(game.visuals.bodyMeshMap);
    if (game.replayActive) runReplay(dt);
  }

  updateCamera(camera, cameraRig, 0.12);
  renderer.render(renderCtx.scene, camera);
}

function updateGameplay(dt) {
  const { ballBody, pinBody } = game.levelBodies;
  if (game.launched) {
    const lastPoint = game.currentShotPath[game.currentShotPath.length - 1];
    const ballPos = ballBody.position;
    const distSq =
      (lastPoint.x - ballPos.x) ** 2 + (lastPoint.y - ballPos.y) ** 2 + (lastPoint.z - ballPos.z) ** 2;
    if (game.currentShotPath.length === 0 || distSq > 0.4) {
      game.currentShotPath.push(ballPos.clone());
    }
    if (ballBody.position.y < -20) {
      restartLevel();
    }
    if (isPinKnocked(pinBody)) {
      game.lastShotPath = [...game.currentShotPath];
      setGhostTrail(game.visuals.ghostLine, game.lastShotPath);
      finishLevel();
    }
  }

  const moving = ballBody.velocity.lengthSquared() > 0.02;
  if (!moving && game.launched && game.mode === "playing") {
    game.launched = false;
  }

  const follow = save.settings.followStrength || 0.1;
  if (game.launched) {
    cameraRig.target.lerp(new THREE.Vector3(ballBody.position.x, ballBody.position.y + 0.8, ballBody.position.z), follow);
  } else {
    cameraRig.target.lerp(new THREE.Vector3(game.activeLevel.camera.target[0], game.activeLevel.camera.target[1], game.activeLevel.camera.target[2]), 0.05);
  }

  ui.setHud(`Level ${game.activeLevel.id}: ${game.activeLevel.name}`, game.attempts, game.daily ? "Daily" : "Campaign");
  if (game.isAiming) {
    updateAimPreview();
  } else {
    setAimLine(renderCtx.aimLine, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, false);
  }
  ui.setAimMeter(game.launchPower / MAX_LAUNCH_POWER);
}

function runReplay(dt) {
  if (!game.lastShotPath.length || !game.levelBodies) return;
  game.replayT += dt * 20;
  const i = Math.floor(game.replayT);
  const path = game.lastShotPath;
  if (i >= path.length - 1) {
    game.replayActive = false;
    return;
  }
  const t = game.replayT - i;
  const a = path[i];
  const b = path[i + 1];
  const pos = new THREE.Vector3().lerpVectors(a, b, t);
  cameraRig.target.lerp(new THREE.Vector3(pos.x, pos.y + 0.8, pos.z), 0.2);
}

function updateAimPreview() {
  if (!game.dragStart || !game.dragCurrent || !game.levelBodies) return;
  const dx = game.dragCurrent.x - game.dragStart.x;
  const dy = game.dragCurrent.y - game.dragStart.y;
  const len = Math.min(280, Math.hypot(dx, dy));
  game.launchPower = THREE.MathUtils.clamp(len * LAUNCH_DRAG_SCALE, MIN_LAUNCH_POWER, MAX_LAUNCH_POWER);
  const ballPos = game.levelBodies.ballBody.position;
  const dir = dragToWorldDirection(dx, dy, ballPos.y);
  game.aimDirection = applyPerspectiveAimLock(dir);
  const from = { x: ballPos.x, y: ballPos.y + 0.5, z: ballPos.z };
  const to = {
    x: from.x + game.aimDirection.x * (game.launchPower * 0.45),
    y: from.y + 0.1,
    z: from.z + game.aimDirection.z * (game.launchPower * 0.45)
  };
  setAimLine(renderCtx.aimLine, from, to, true);
}

function shootFromDrag() {
  if (!game.isAiming || game.launched || game.mode !== "playing") return;
  if (!game.levelBodies) return;
  const dx = game.dragCurrent.x - game.dragStart.x;
  const dy = game.dragCurrent.y - game.dragStart.y;
  if (Math.hypot(dx, dy) < 12) return;
  const dir = game.aimDirection || dragToWorldDirection(dx, dy, game.levelBodies.ballBody.position.y);
  applyLaunchImpulse(game.levelBodies.ballBody, game.levelBodies.pinBody, dir, game.launchPower);
  game.attempts += 1;
  game.shotsInLevel += 1;
  save.stats.totalShots += 1;
  saveGameState(save);
  game.launched = true;
  game.currentShotPath = [game.levelBodies.ballBody.position.clone()];
}

function dragToWorldDirection(dx, dy, planeY) {
  const startPoint = screenToPlanePoint(game.dragStart.x, game.dragStart.y, planeY);
  const currentPoint = screenToPlanePoint(game.dragCurrent.x, game.dragCurrent.y, planeY);
  if (startPoint && currentPoint) {
    const v = currentPoint.sub(startPoint);
    v.y = 0;
    if (v.lengthSq() > 0.0001) {
      v.normalize();
      return { x: v.x, z: v.z };
    }
  }

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const v = new THREE.Vector3();
  v.addScaledVector(right, -dx * 0.01);
  v.addScaledVector(forward, dy * 0.01);
  if (v.lengthSq() < 0.0001) v.set(1, 0, 0);
  v.normalize();
  return { x: v.x, z: v.z };
}

function screenToPlanePoint(clientX, clientY, planeY) {
  if (!camera) return null;
  pointerNdc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  const denom = raycaster.ray.direction.y;
  if (Math.abs(denom) < 1e-5) return null;
  const t = (planeY - raycaster.ray.origin.y) / denom;
  if (t <= 0) return null;
  return raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(t));
}

function applyPerspectiveAimLock(dir) {
  if (!game.activeLevel?.forcedPerspective) return dir;
  const config = game.activeLevel.forcedPerspective;
  if (config.lockAxis === "z") {
    const v = { x: dir.x, z: config.lockValue ?? 0 };
    const mag = Math.hypot(v.x, v.z) || 1;
    return { x: v.x / mag, z: v.z / mag };
  }
  if (config.lockAxis === "x") {
    const v = { x: config.lockValue ?? 0, z: dir.z };
    const mag = Math.hypot(v.x, v.z) || 1;
    return { x: v.x / mag, z: v.z / mag };
  }
  return dir;
}

function wireInput() {
  const pointers = new Map();
  let gestureStart = null;

  canvas.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    if (e.button === 2) {
      game.isRightDragging = true;
      game.rightDragPrev = { x: e.clientX, y: e.clientY };
      return;
    }
    if (game.mode === "cameraAdjust") {
      if (pointers.size === 1) {
        game.isRightDragging = true;
        game.rightDragPrev = { x: e.clientX, y: e.clientY };
      }
      if (pointers.size >= 2) {
        const [a, b] = Array.from(pointers.values());
        gestureStart = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          angle: Math.atan2(b.y - a.y, b.x - a.x)
        };
      }
      return;
    }
    if (game.mode === "playing" && pointers.size === 1 && !game.launched) {
      game.isAiming = true;
      game.dragStart = { x: e.clientX, y: e.clientY };
      game.dragCurrent = { x: e.clientX, y: e.clientY };
    }
    if (pointers.size >= 2) {
      game.isAiming = false;
      const [a, b] = Array.from(pointers.values());
      gestureStart = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        angle: Math.atan2(b.y - a.y, b.x - a.x)
      };
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });

    if (game.isRightDragging && game.rightDragPrev) {
      const dx = e.clientX - game.rightDragPrev.x;
      const dy = e.clientY - game.rightDragPrev.y;
      cameraRig.theta -= dx * 0.005;
      cameraRig.phi = THREE.MathUtils.clamp(cameraRig.phi - dy * 0.004, 0.3, 1.35);
      game.rightDragPrev = { x: e.clientX, y: e.clientY };
      return;
    }

    if (pointers.size >= 2) {
      const [a, b] = Array.from(pointers.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      if (gestureStart) {
        const dz = dist - gestureStart.distance;
        const da = angle - gestureStart.angle;
        cameraRig.distance = THREE.MathUtils.clamp(cameraRig.distance - dz * 0.02, 8, 52);
        cameraRig.theta -= da * 0.5;
      }
      gestureStart = { distance: dist, angle };
      return;
    }

    if (game.isAiming && game.dragCurrent) {
      game.dragCurrent.x = e.clientX;
      game.dragCurrent.y = e.clientY;
    }
  });

  canvas.addEventListener("pointerup", (e) => {
    pointers.delete(e.pointerId);
    if (e.button === 2) {
      game.isRightDragging = false;
      game.rightDragPrev = null;
    }
    if (game.isAiming && pointers.size === 0) {
      shootFromDrag();
    }
    if (pointers.size < 2) gestureStart = null;
    if (pointers.size === 0) {
      game.isAiming = false;
      game.dragStart = null;
      game.dragCurrent = null;
      ui.setAimMeter(0);
      setAimLine(renderCtx.aimLine, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, false);
    }
  });

  canvas.addEventListener("wheel", (e) => {
    cameraRig.distance = THREE.MathUtils.clamp(cameraRig.distance + e.deltaY * 0.01, 8, 52);
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e) {
  if (e.key.toLowerCase() === "r") restartLevel();
  if (e.key.toLowerCase() === "p") {
    if (game.mode === "playing") handleAction("pause");
    else if (game.mode === "paused") handleAction("resume");
    else if (game.mode === "cameraAdjust") handleAction("pause");
  }
  if (e.key.toLowerCase() === "v") {
    toggleCameraAdjustMode();
  }
  if (e.key === " ") {
    shootFromDrag();
  }
  if (e.key.toLowerCase() === "e") {
    game.editor = !game.editor;
    if (game.editor && game.activeLevel) {
      const exportData = JSON.stringify(game.activeLevel, null, 2);
      // Basic editor mode: open prompt so players can copy and tweak level JSON.
      window.prompt("Level JSON (copy/edit manually):", exportData);
    }
  }
}

function toggleCameraAdjustMode() {
  if (!game.activeLevel) return;
  if (game.mode === "paused") {
    game.mode = "cameraAdjust";
    game.cameraAdjust = true;
    ui.showScreen("none");
    ui.showHUD(true);
    return;
  }
  if (game.mode === "playing") {
    game.mode = "cameraAdjust";
    game.cameraAdjust = true;
    ui.showScreen("none");
    ui.showHUD(true);
    return;
  }
  if (game.mode === "cameraAdjust") {
    game.mode = "playing";
    game.cameraAdjust = false;
    ui.showScreen("none");
    return;
  }
}
