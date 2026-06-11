/** Pixel rect of the video frame inside object-fit: contain (excludes letterbox bars). */
export interface ContentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

/** Client coords adjusted for mobile browser viewport quirks. */
export function pointerClientCoords(e: PointerEvent): { x: number; y: number } {
  if (e.pointerType === 'touch') {
    return {
      x: e.pageX - window.scrollX,
      y: e.pageY - window.scrollY,
    };
  }
  return { x: e.clientX, y: e.clientY };
}

function normalizeInRect(
  rect: ContentRect,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0.5, y: 0.5 };
  }
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  };
}

/** Map touch/mouse to 0–1 on the touch overlay (1:1 with finger on mobile). */
export function clientToNormalizedOnOverlay(
  overlay: HTMLElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  return normalizeInRect(overlay.getBoundingClientRect(), clientX, clientY);
}

export function getVideoContentRect(video: HTMLVideoElement): ContentRect {
  const box = video.getBoundingClientRect();
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  if (box.width <= 0 || box.height <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  if (!vw || !vh) {
    return { left: box.left, top: box.top, width: box.width, height: box.height };
  }

  const boxAR = box.width / box.height;
  const videoAR = vw / vh;

  if (!Number.isFinite(boxAR) || !Number.isFinite(videoAR)) {
    return { left: box.left, top: box.top, width: box.width, height: box.height };
  }

  if (videoAR > boxAR) {
    const width = box.width;
    const height = width / videoAR;
    return {
      left: box.left,
      top: box.top + (box.height - height) / 2,
      width,
      height,
    };
  }

  const height = box.height;
  const width = height * videoAR;
  return {
    left: box.left + (box.width - width) / 2,
    top: box.top,
    width,
    height,
  };
}

/** Map screen coordinates to 0–1 within the visible video frame (desktop letterbox). */
export function clientToNormalized(
  video: HTMLVideoElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  return normalizeInRect(getVideoContentRect(video), clientX, clientY);
}

/** Map pointer to 0–1; touch uses video content area when stream size is known. */
export function pointerToNormalized(
  overlay: HTMLElement,
  video: HTMLVideoElement,
  clientX: number,
  clientY: number,
  touchMode: boolean
): { x: number; y: number } {
  if (touchMode) {
    const videoBox = video.getBoundingClientRect();
    if (videoBox.width > 0 && video.videoWidth > 0 && video.videoHeight > 0) {
      return clientToNormalized(video, clientX, clientY);
    }
    return clientToNormalizedOnOverlay(overlay, clientX, clientY);
  }
  const videoRect = video.getBoundingClientRect();
  if (videoRect.width > 0 && videoRect.height > 0) {
    return clientToNormalized(video, clientX, clientY);
  }
  return clientToNormalizedOnOverlay(overlay, clientX, clientY);
}
