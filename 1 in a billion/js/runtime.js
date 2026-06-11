/* Shared mutable runtime state used across modules. */
export const runtime = {
  el: {},
  currentUser: null,
  state: null,
  loopTimer: null,
  uiTimer: null,
  autoSaveTimer: null,
  lastLoopTime: 0,
  rollBuffer: 0,
  audioCtx: null,
  backendAvailable: false,
  previousCoins: 0,
  previousGems: 0,
  fusionSearchQuery: "",
  fusionTierFilter: "all",
  fusionSelectedRecipeId: null,
  activeTab: "roll",
  isMobile: false,
  offlineProgressRunning: false,
  loginBootPhase: false,
  pendingOfflineRolls: 0,
  showShinyCodex: false
};
