import Phaser from 'phaser';
import { Capacitor, SystemBars } from '@capacitor/core';
import { APP_BACKGROUND_EVENT, APP_FOREGROUND_EVENT, BACK_TARGETS } from '../config/lifecycle';
import { soundFX } from './SoundFX';

/**
 * M9.1 app lifecycle.
 * - Background (tab hidden / Android app paused): mute sound and tell the
 *   active scene (MatchScene pauses the match). Foreground: unmute only —
 *   the match stays on its pause menu until the player taps DEVAM.
 * - Android hardware back button: routed to the top active scene. A scene
 *   may implement `onBackButton()`; otherwise BACK_TARGETS decides.
 */

/** Scenes that handle the back button themselves. */
export interface BackHandler {
  onBackButton(): void;
}

function hasBackHandler(scene: Phaser.Scene): scene is Phaser.Scene & BackHandler {
  return typeof (scene as Partial<BackHandler>).onBackButton === 'function';
}

let backgrounded = false;

/** Immersive play: hide status + navigation bars (native only; they come
 * back on a swipe and Android re-shows them after the app resumes). */
function hideSystemBars(): void {
  if (!Capacitor.isNativePlatform()) return;
  void SystemBars.hide().catch(() => undefined);
}

function setBackground(game: Phaser.Game, hidden: boolean): void {
  if (hidden === backgrounded) return;
  backgrounded = hidden;
  if (!hidden) hideSystemBars();
  soundFX.setSuspended(hidden);
  game.sound.mute = hidden;
  game.events.emit(hidden ? APP_BACKGROUND_EVENT : APP_FOREGROUND_EVENT);
}

/** Routes one back press to the topmost running scene. */
export function handleBackButton(game: Phaser.Game): void {
  const scenes = game.scene.getScenes(true);
  const top = scenes[scenes.length - 1];
  if (!top) return;
  if (hasBackHandler(top)) {
    top.onBackButton();
    return;
  }
  const target = BACK_TARGETS[top.scene.key];
  if (target) top.scene.start(target);
}

/** Closes the app (native only; no-op in the browser). */
export function exitApp(): void {
  if (!Capacitor.isNativePlatform()) return;
  hideSystemBars();
  void import('@capacitor/app').then(({ App }) => App.exitApp());
}

export function installAppLifecycle(game: Phaser.Game): void {
  document.addEventListener('visibilitychange', () => setBackground(game, document.visibilityState === 'hidden'));
  if (!Capacitor.isNativePlatform()) return;
  hideSystemBars();
  void import('@capacitor/app').then(({ App }) => {
    void App.addListener('appStateChange', ({ isActive }) => setBackground(game, !isActive));
    // Registering a listener replaces Capacitor's default (WebView history
    // back / close app), so every back press goes through the game.
    void App.addListener('backButton', () => handleBackButton(game));
  });
}
