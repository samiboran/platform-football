/**
 * M7.1 phone shell: fullscreen + landscape lock. Browsers only allow both
 * from a user gesture, so the first touch anywhere asks for them (Android
 * Chrome honours the orientation lock once fullscreen; iOS ignores it and
 * the CSS "turn your phone" overlay in index.html covers that case).
 */
export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;
}

export function isFullscreen(): boolean {
  return document.fullscreenElement != null;
}

type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

export async function enterFullscreenLandscape(): Promise<void> {
  try {
    if (!isFullscreen() && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
    await (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape');
  } catch {
    // Not allowed here (desktop, iOS, already installed app) — fine.
  }
}

export async function toggleFullscreen(): Promise<void> {
  if (isFullscreen()) {
    try {
      await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  } else {
    await enterFullscreenLandscape();
  }
}

/** On touch devices: go fullscreen + landscape on the first tap. */
export function installAutoFullscreen(): void {
  if (!isTouchDevice()) return;
  const once = () => {
    window.removeEventListener('pointerup', once, true);
    void enterFullscreenLandscape();
  };
  window.addEventListener('pointerup', once, true);
}
