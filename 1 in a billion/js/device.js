import { runtime } from "./runtime.js";

export function detectMobileDevice() {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrowScreen = window.matchMedia("(max-width: 768px)").matches;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ""
  );
  return mobileUa || (coarsePointer && narrowScreen);
}

export function isDesktopClient() {
  return /\bElectron\b/i.test(navigator.userAgent || "");
}

export function initDeviceProfile() {
  runtime.isMobile = detectMobileDevice();
}
