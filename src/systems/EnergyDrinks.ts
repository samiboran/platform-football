import Phaser from 'phaser';
import { CENTER_LINE_X, HALF_FIELD_WIDTH, DEPTH_MIN, DEPTH_MAX, projectToScreen } from '../config/arena';
import * as P from '../config/pickups';
import type { Character } from '../entities/Character';

interface Drink {
  x: number;
  z: number;
  energy: number;
  age: number;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
}

/**
 * Energy drink pickups (M6.1). Every DRINK_SPAWN_INTERVAL_SECONDS a pair
 * spawns at mirrored positions in the two halves; whichever character
 * walks over a can gets its energy. Uses an injectable RNG so tests can be
 * deterministic.
 */
export class EnergyDrinks {
  private drinks: Drink[] = [];
  private spawnTimer = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly rng: () => number = Math.random,
  ) {}

  get active(): ReadonlyArray<{ x: number; z: number; energy: number }> {
    return this.drinks;
  }

  update(delta: number, characters: Character[], onPickup?: (who: Character, energy: number) => void): void {
    const dt = delta / 1000;
    this.spawnTimer += dt;
    if (this.spawnTimer >= P.DRINK_SPAWN_INTERVAL_SECONDS) {
      this.spawnTimer -= P.DRINK_SPAWN_INTERVAL_SECONDS;
      this.spawnPair();
    }

    for (const d of [...this.drinks]) {
      d.age += dt;
      const taker = characters.find(
        (c) =>
          Math.abs(c.x - d.x) <= P.DRINK_PICKUP_RANGE_X &&
          Math.abs(c.z - d.z) <= P.DRINK_PICKUP_RANGE_Z &&
          c.y <= P.DRINK_PICKUP_MAX_HEIGHT,
      );
      if (taker) {
        taker.gainPower(d.energy);
        onPickup?.(taker, d.energy);
        this.remove(d);
      } else if (d.age >= P.DRINK_LIFETIME_SECONDS) {
        this.remove(d);
      } else {
        this.render(d);
      }
    }
  }

  /** Spawn now (also used by update). Replaces any cans still on the pitch. */
  spawnPair(): void {
    for (const d of [...this.drinks]) this.remove(d);
    const r = (min: number, max: number) => min + (max - min) * this.rng();
    const offset = HALF_FIELD_WIDTH * r(P.DRINK_SPAWN_X_FRACTION_MIN, P.DRINK_SPAWN_X_FRACTION_MAX);
    const z = DEPTH_MIN + (DEPTH_MAX - DEPTH_MIN) * r(P.DRINK_SPAWN_Z_FRACTION_MIN, P.DRINK_SPAWN_Z_FRACTION_MAX);
    const golden = this.rng() < P.DRINK_GOLDEN_CHANCE;
    for (const x of [CENTER_LINE_X - offset, CENTER_LINE_X + offset]) this.add(x, z, golden);
  }

  private add(x: number, z: number, golden: boolean): void {
    const sprite = this.scene.add
      .image(0, 0, golden ? P.DRINK_GOLD_TEXTURE_KEY : P.DRINK_TEXTURE_KEY)
      .setOrigin(0.5, 1);
    const shadow = this.scene.add.ellipse(0, 0, 18, 7, 0x000000, 0.35);
    const d: Drink = { x, z, energy: golden ? P.DRINK_GOLDEN_ENERGY : P.DRINK_ENERGY, age: 0, sprite, shadow };
    this.drinks.push(d);
    this.render(d);
  }

  private render(d: Drink): void {
    const ground = projectToScreen(d.x, d.z, 0);
    const bob = (Math.sin((d.age / P.DRINK_BOB_PERIOD_SECONDS) * Math.PI * 2) * 0.5 + 0.5) * P.DRINK_BOB_PX;
    d.sprite.setScale(P.DRINK_SPRITE_PIXEL_SCALE * ground.scale);
    d.sprite.setPosition(ground.screenX, ground.screenY - 2 - bob);
    d.shadow.setPosition(ground.screenX, ground.screenY).setScale(ground.scale);
    const depth = Math.round(ground.screenY);
    d.sprite.setDepth(depth);
    d.shadow.setDepth(depth - 1);
    const left = P.DRINK_LIFETIME_SECONDS - d.age;
    const blinkOff = left < P.DRINK_BLINK_SECONDS && Math.floor(d.age / P.DRINK_BLINK_PERIOD_SECONDS) % 2 === 1;
    d.sprite.setVisible(!blinkOff);
  }

  private remove(d: Drink): void {
    d.sprite.destroy();
    d.shadow.destroy();
    this.drinks = this.drinks.filter((o) => o !== d);
  }
}
