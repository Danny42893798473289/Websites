import { runtime } from "./runtime.js";
import { setActiveTab } from "./tabs.js";
import { renderHeavyForTab } from "./render.js";
import { save } from "./save.js";
import { t } from "./i18n.js";

const STEPS = [
  {
    tab: "roll",
    targetId: "roll-btn",
    titleKey: "tutorial.step1Title",
    bodyKey: "tutorial.step1Body"
  },
  {
    tab: "roll",
    targetId: "last-egg",
    titleKey: "tutorial.step2Title",
    bodyKey: "tutorial.step2Body"
  },
  {
    tab: "shops",
    targetId: "shop-list",
    titleKey: "tutorial.step3Title",
    bodyKey: "tutorial.step3Body"
  },
  {
    tab: "collection",
    targetId: "codex-progress",
    titleKey: "tutorial.step4Title",
    bodyKey: "tutorial.step4Body"
  },
  {
    tab: "roll",
    targetId: "prestige-progress",
    titleKey: "tutorial.step5Title",
    bodyKey: "tutorial.step5Body"
  }
];

function getStepIndex() {
  return Math.max(0, Math.min(STEPS.length - 1, Number(runtime.state?.settings?.tutorialStep || 0)));
}

function resolveTarget(step) {
  if (step.targetId === "roll-btn") return runtime.el.rollBtn;
  if (step.targetId === "last-egg") return runtime.el.lastEgg;
  if (step.targetId === "shop-list") return runtime.el.shopList;
  if (step.targetId === "codex-progress") return runtime.el.codexProgress;
  if (step.targetId === "prestige-progress") return runtime.el.prestigeProgress?.closest(".progress-wrap") || runtime.el.prestigeProgress;
  return document.getElementById(step.targetId);
}

function positionSpotlight(target) {
  const spotlight = runtime.el.tutorialSpotlight;
  if (!spotlight || !target) {
    if (spotlight) spotlight.classList.add("hidden");
    return;
  }
  const rect = target.getBoundingClientRect();
  const pad = 8;
  spotlight.classList.remove("hidden");
  spotlight.style.top = `${Math.max(8, rect.top - pad)}px`;
  spotlight.style.left = `${Math.max(8, rect.left - pad)}px`;
  spotlight.style.width = `${rect.width + pad * 2}px`;
  spotlight.style.height = `${rect.height + pad * 2}px`;
}

function renderTutorialCard(stepIndex) {
  const step = STEPS[stepIndex];
  if (!runtime.el.tutorialTitle || !runtime.el.tutorialBody) return;
  runtime.el.tutorialTitle.textContent = t(step.titleKey);
  runtime.el.tutorialBody.textContent = t(step.bodyKey);
  if (runtime.el.tutorialStepText) {
    runtime.el.tutorialStepText.textContent = t("tutorial.stepOf", {
      current: stepIndex + 1,
      total: STEPS.length
    });
  }
  if (runtime.el.tutorialNextBtn) {
    runtime.el.tutorialNextBtn.textContent =
      stepIndex >= STEPS.length - 1 ? t("tutorial.done") : t("tutorial.next");
  }
}

function showOverlay() {
  runtime.el.tutorialOverlay?.classList.remove("hidden");
  document.body.classList.add("tutorial-open");
}

function hideOverlay() {
  runtime.el.tutorialOverlay?.classList.add("hidden");
  runtime.el.tutorialSpotlight?.classList.add("hidden");
  document.body.classList.remove("tutorial-open");
}

export function renderTutorialStep() {
  if (!runtime.state) return;
  const stepIndex = getStepIndex();
  const step = STEPS[stepIndex];
  if (runtime.activeTab !== step.tab) {
    setActiveTab(step.tab);
    renderHeavyForTab(step.tab);
  }
  requestAnimationFrame(() => {
    const target = resolveTarget(step);
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    renderTutorialCard(stepIndex);
    positionSpotlight(target);
    showOverlay();
  });
}

export function startTutorial(fromStep = 0) {
  if (!runtime.state) return;
  runtime.state.settings.tutorialStep = Math.max(0, Math.min(STEPS.length - 1, fromStep));
  renderTutorialStep();
}

export function maybeStartTutorial() {
  if (!runtime.state || runtime.state.settings.tutorialCompleted) return;
  if (Number(runtime.state.totalRolls || 0) > 0) {
    runtime.state.settings.tutorialCompleted = true;
    save();
    return;
  }
  startTutorial(runtime.state.settings.tutorialStep || 0);
}

export function replayTutorial() {
  if (!runtime.state) return;
  runtime.state.settings.tutorialCompleted = false;
  runtime.state.settings.tutorialStep = 0;
  save();
  startTutorial(0);
}

export function advanceTutorial() {
  if (!runtime.state) return;
  const stepIndex = getStepIndex();
  if (stepIndex >= STEPS.length - 1) {
    completeTutorial();
    return;
  }
  runtime.state.settings.tutorialStep = stepIndex + 1;
  save();
  renderTutorialStep();
}

export function skipTutorial() {
  completeTutorial();
}

function completeTutorial() {
  if (!runtime.state) return;
  runtime.state.settings.tutorialCompleted = true;
  runtime.state.settings.tutorialStep = 0;
  hideOverlay();
  save();
}

export function bindTutorialEvents() {
  runtime.el.tutorialNextBtn?.addEventListener("click", advanceTutorial);
  runtime.el.tutorialSkipBtn?.addEventListener("click", skipTutorial);
  window.addEventListener("resize", () => {
    if (runtime.el.tutorialOverlay && !runtime.el.tutorialOverlay.classList.contains("hidden")) {
      const step = STEPS[getStepIndex()];
      positionSpotlight(resolveTarget(step));
    }
  });
}
