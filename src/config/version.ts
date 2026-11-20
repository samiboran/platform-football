/**
 * M9.3 version numbering — one source of truth: `version` in package.json
 * (semver MAJOR.MINOR.PATCH). Everything else is derived from it:
 *  - Android versionName = the semver string (android/app/build.gradle reads
 *    package.json itself, so it never drifts).
 *  - Android versionCode = MAJOR * VERSION_CODE_MAJOR + MINOR * VERSION_CODE_MINOR + PATCH
 *    (1.2.3 → 10203). Google Play needs it to grow on every upload, so bump
 *    package.json before every store build. PATCH and MINOR must stay < 100.
 *  - In-game label (Settings screen corner): "v" + version.
 * Release notes per version: docs/store/release-notes/<version>.md
 * (checked by `npm run release:check`).
 */
export const VERSION_CODE_MAJOR = 10000;
export const VERSION_CODE_MINOR = 100;
/** Google Play "What's new" text limit per language. */
export const RELEASE_NOTES_MAX_CHARS = 500;

/** Injected by vite.config.ts (`define`) from package.json. */
export const APP_VERSION: string = __APP_VERSION__;

export function versionCodeOf(semver: string): number {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(semver);
  if (!m) throw new Error(`version must be MAJOR.MINOR.PATCH, got "${semver}"`);
  const [maj, min, pat] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (min >= VERSION_CODE_MAJOR / VERSION_CODE_MINOR || pat >= VERSION_CODE_MINOR) {
    throw new Error(`minor/patch too large for versionCode scheme: ${semver}`);
  }
  return maj * VERSION_CODE_MAJOR + min * VERSION_CODE_MINOR + pat;
}

// --- Settings screen label --------------------------------------------------
export const VERSION_LABEL_X = 952;
export const VERSION_LABEL_Y = 532;
export const VERSION_LABEL_SCALE = 2;
