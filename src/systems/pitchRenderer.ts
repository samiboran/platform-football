import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  FAR_Y,
  BASE_Y,
  CENTER_X,
  DEPTH_MIN,
  DEPTH_MAX,
  DEPTH_SCALE,
  LEFT_GOAL_LINE_X,
  RIGHT_GOAL_LINE_X,
  LEFT_GOAL_BACK_X,
  RIGHT_GOAL_BACK_X,
  CENTER_LINE_X,
  GOAL_MOUTH_Z_MIN,
  GOAL_MOUTH_Z_MAX,
  GOAL_HEIGHT,
  depthScaleAt,
  widthScaleAt,
  projectToScreen,
} from '../config/arena';
import * as ART from '../config/pitchArt';
import type { StadiumDef } from '../config/stadiums';

/**
 * Pixel-art pitch (M6.0). Everything static — stands, advertising boards,
 * ground, markings, goals — is rasterized per pixel into a low-res canvas
 * (1 art pixel = PITCH_PIXEL_SIZE screen pixels, the characters' grid) and
 * shown scaled with nearest filtering. Deterministic: the same stadium
 * always draws the same pixels.
 */

type Point = { x: number; y: number };

const P = ART.PITCH_PIXEL_SIZE;
const W = Math.ceil(GAME_WIDTH / P);
const H = Math.ceil(GAME_HEIGHT / P);

// --- tiny color helpers (0xRRGGBB ints) ---------------------------------------
function shade(c: number, percent: number): number {
  const f = 1 - percent / 100;
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
}

function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Deterministic per-pixel hash in [0,1). */
function hash01(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

class PixelBuffer {
  readonly data = new Uint32Array(W * H); // 0xRRGGBB per art pixel

  get(x: number, y: number): number {
    return this.data[y * W + x];
  }

  set(x: number, y: number, c: number): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    this.data[y * W + x] = c;
  }

  blend(x: number, y: number, c: number, alpha: number): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    this.data[y * W + x] = mix(this.data[y * W + x], c, alpha);
  }

  /** Bresenham line in art pixels. */
  line(a: Point, b: Point, plot: (x: number, y: number) => void): void {
    let x0 = Math.round(a.x);
    let y0 = Math.round(a.y);
    const x1 = Math.round(b.x);
    const y1 = Math.round(b.y);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      plot(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}

/** World (x, z, y) → art-pixel coords. */
function art(x: number, z: number, y = 0): Point {
  const { screenX, screenY } = projectToScreen(x, z, y);
  return { x: (screenX - P / 2) / P, y: (screenY - P / 2) / P };
}

function insideConvex(poly: Point[], x: number, y: number): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (cross !== 0) {
      const s = Math.sign(cross);
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
  }
  return true;
}

function forEachInPoly(poly: Point[], fn: (x: number, y: number, u: number, v: number) => void): void {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(...ys)));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (insideConvex(poly, x, y)) fn(x, y, x - minX, y - minY);
    }
  }
}

// --- layers -------------------------------------------------------------------

function drawStands(buf: PixelBuffer, stadium: StadiumDef): void {
  const tierA = shade(stadium.tintColor, ART.STANDS_DARKEN_A);
  const tierB = shade(stadium.tintColor, ART.STANDS_DARKEN_B);
  const hoardingTop = FAR_Y - ART.HOARDING_HEIGHT;
  for (let py = 0; py < H; py += 1) {
    const sy = py * P;
    if (sy >= FAR_Y) break;
    for (let px = 0; px < W; px += 1) {
      const sx = px * P;
      if (sy < hoardingTop) {
        const tier = Math.floor(sy / ART.STANDS_TIER_HEIGHT);
        const edge = sy % ART.STANDS_TIER_HEIGHT < P;
        const base = tier % 2 === 0 ? tierA : tierB;
        buf.set(px, py, edge ? shade(base, -25) : base);
      } else {
        const panel = Math.floor(sx / ART.HOARDING_PANEL_WIDTH);
        const color = ART.HOARDING_COLORS[panel % ART.HOARDING_COLORS.length];
        const local = sx % ART.HOARDING_PANEL_WIDTH;
        const row = sy - hoardingTop;
        let c = color;
        if (row < P) c = shade(color, -30);
        else if (row >= ART.HOARDING_HEIGHT - P) c = shade(color, 45);
        else if (local < P) c = 0x1b1f2a; // panel seam
        else if (local > ART.HOARDING_PANEL_WIDTH * 0.25 && local < ART.HOARDING_PANEL_WIDTH * 0.75 && row === P * 2)
          c = mix(color, 0xffffff, 0.7); // abstract "logo" bar — no real brands
        buf.set(px, py, c);
      }
    }
  }
}

function drawGround(buf: PixelBuffer, stadium: StadiumDef): void {
  const fieldW = RIGHT_GOAL_LINE_X - LEFT_GOAL_LINE_X;
  const stripeW = fieldW / ART.PITCH_STRIPE_COUNT;
  const apronLight = shade(stadium.groundLight, ART.APRON_DARKEN);
  const apronDark = shade(stadium.groundDark, ART.APRON_DARKEN);
  const startRow = Math.floor(FAR_Y / P);
  for (let py = startRow; py < H; py += 1) {
    const sy = py * P + P / 2;
    const z = (BASE_Y - sy) / DEPTH_SCALE;
    const ws = widthScaleAt(z);
    for (let px = 0; px < W; px += 1) {
      const sx = px * P + P / 2;
      const x = CENTER_X + (sx - CENTER_X) / ws;
      const onPitch = z >= DEPTH_MIN && z <= DEPTH_MAX && x >= LEFT_GOAL_LINE_X && x <= RIGHT_GOAL_LINE_X;
      let c: number;
      if (onPitch) {
        const stripe = Math.floor((x - LEFT_GOAL_LINE_X) / stripeW);
        c = stripe % 2 === 0 ? stadium.groundLight : stadium.groundDark;
      } else {
        c = (Math.floor(px / 4) + Math.floor(py / 4)) % 2 === 0 ? apronLight : apronDark;
      }
      const h = hash01(px, py, 1);
      if (h < ART.GROUND_SPECK_CHANCE) {
        c = shade(c, h < ART.GROUND_SPECK_CHANCE / 2 ? ART.GROUND_SPECK_SHIFT : -ART.GROUND_SPECK_SHIFT);
      }
      buf.set(px, py, c);
    }
  }
}

/** Fixed (not random) mud spots so the pitch never redraws differently. */
const MUD_PATCH_SPOTS: { fracX: number; fracZ: number; radius: number }[] = [
  { fracX: 0.28, fracZ: 0.22, radius: 34 },
  { fracX: 0.62, fracZ: 0.35, radius: 26 },
  { fracX: 0.45, fracZ: 0.68, radius: 30 },
  { fracX: 0.78, fracZ: 0.58, radius: 22 },
  { fracX: 0.18, fracZ: 0.8, radius: 24 },
];

function drawMud(buf: PixelBuffer): void {
  for (const spot of MUD_PATCH_SPOTS) {
    const x = LEFT_GOAL_LINE_X + (RIGHT_GOAL_LINE_X - LEFT_GOAL_LINE_X) * spot.fracX;
    const z = DEPTH_MIN + (DEPTH_MAX - DEPTH_MIN) * spot.fracZ;
    const c = art(x, z);
    const s = depthScaleAt(z);
    const rx = (spot.radius * s) / P;
    const ry = (spot.radius * s * 0.5) / P;
    for (let py = Math.floor(c.y - ry); py <= Math.ceil(c.y + ry); py += 1) {
      for (let px = Math.floor(c.x - rx); px <= Math.ceil(c.x + rx); px += 1) {
        const d = ((px - c.x) / rx) ** 2 + ((py - c.y) / ry) ** 2;
        if (d > 1) continue;
        // Dithered rim: outer ring only fills a checkerboard.
        if (d > 0.7 && (px + py) % 2 === 0) continue;
        buf.blend(px, py, ART.MUD_COLOR, ART.MUD_ALPHA);
      }
    }
  }
}

function drawMarkings(buf: PixelBuffer): void {
  const plot = (x: number, y: number) => buf.blend(x, y, ART.LINE_COLOR, ART.LINE_ALPHA);
  const nl = art(LEFT_GOAL_LINE_X, DEPTH_MIN);
  const nr = art(RIGHT_GOAL_LINE_X, DEPTH_MIN);
  const fr = art(RIGHT_GOAL_LINE_X, DEPTH_MAX);
  const fl = art(LEFT_GOAL_LINE_X, DEPTH_MAX);

  // Shadow edge under the near touchline — reads as a raised pitch.
  buf.line({ x: nl.x, y: nl.y + 1 }, { x: nr.x, y: nr.y + 1 }, (x, y) => buf.set(x, y, shade(buf.get(x, y), ART.NEAR_EDGE_DARKEN)));

  buf.line(nl, nr, plot);
  buf.line(nr, fr, plot);
  buf.line(fr, fl, plot);
  buf.line(fl, nl, plot);
  buf.line(art(CENTER_LINE_X, DEPTH_MIN), art(CENTER_LINE_X, DEPTH_MAX), plot);

  // Center circle — perspective ellipse (see CENTER_CIRCLE_SCREEN_ASPECT).
  const zc = (DEPTH_MIN + DEPTH_MAX) / 2;
  const rz = (ART.CENTER_CIRCLE_RADIUS * ART.CENTER_CIRCLE_SCREEN_ASPECT) / DEPTH_SCALE;
  let prev: Point | null = null;
  for (let i = 0; i <= ART.CENTER_CIRCLE_SEGMENTS; i += 1) {
    const a = (i / ART.CENTER_CIRCLE_SEGMENTS) * Math.PI * 2;
    const p = art(CENTER_LINE_X + Math.cos(a) * ART.CENTER_CIRCLE_RADIUS, zc + Math.sin(a) * rz);
    if (prev) buf.line(prev, p, plot);
    prev = p;
  }
  const spot = art(CENTER_LINE_X, zc);
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) buf.set(Math.round(spot.x) + dx - 1, Math.round(spot.y) + dy, ART.LINE_COLOR);

  // Goal areas.
  const z0 = GOAL_MOUTH_Z_MIN - ART.GOAL_AREA_Z_MARGIN;
  const z1 = GOAL_MOUTH_Z_MAX + ART.GOAL_AREA_Z_MARGIN;
  for (const [lineX, dir] of [[LEFT_GOAL_LINE_X, 1], [RIGHT_GOAL_LINE_X, -1]] as const) {
    const ix = lineX + dir * ART.GOAL_AREA_DEPTH;
    buf.line(art(lineX, z0), art(ix, z0), plot);
    buf.line(art(ix, z0), art(ix, z1), plot);
    buf.line(art(ix, z1), art(lineX, z1), plot);
  }
}

/**
 * Goal: darkened footprint, lattice back net, grey depth frame, and a
 * white front frame (posts + crossbar) with a 1px shade so it never
 * blends into the pitch's own lines. The far post is shorter — perspective
 * shrink applies to goal height like to characters (depthScaleAt).
 */
function drawGoal(buf: PixelBuffer, lineX: number, backX: number): void {
  const nearZ = GOAL_MOUTH_Z_MIN;
  const farZ = GOAL_MOUTH_Z_MAX;
  const nearH = GOAL_HEIGHT * depthScaleAt(nearZ);
  const farH = GOAL_HEIGHT * depthScaleAt(farZ);

  const fNG = art(lineX, nearZ);
  const fFG = art(lineX, farZ);
  const bNG = art(backX, nearZ);
  const bFG = art(backX, farZ);
  const fNT = art(lineX, nearZ, nearH);
  const fFT = art(lineX, farZ, farH);
  const bNT = art(backX, nearZ, nearH);
  const bFT = art(backX, farZ, farH);

  forEachInPoly([fNG, fFG, bFG, bNG], (x, y) => buf.set(x, y, shade(buf.get(x, y), ART.GOAL_FOOTPRINT_DARKEN)));

  // Back + roof panels, diamond lattice.
  const net = (x: number, y: number) => {
    const n = ART.GOAL_NET_PERIOD;
    const onLine = (((x + y) % n) + n) % n === 0 || (((x - y) % n) + n) % n === 0;
    buf.blend(x, y, ART.GOAL_NET_COLOR, onLine ? ART.GOAL_NET_LINE_ALPHA : ART.GOAL_NET_FILL_ALPHA);
  };
  forEachInPoly([bNG, bFG, bFT, bNT], net);
  forEachInPoly([fNT, fFT, bFT, bNT], net);

  const back = (x: number, y: number) => buf.set(x, y, ART.GOAL_FRAME_BACK_COLOR);
  buf.line(bNG, bNT, back);
  buf.line(bFG, bFT, back);
  buf.line(bNT, bFT, back);
  buf.line(fNT, bNT, back);
  buf.line(fFT, bFT, back);
  buf.line(fNG, bNG, back);
  buf.line(fFG, bFG, back);

  // Front frame: 2-px-wide white posts, shade on the inner column.
  const outward = backX < lineX ? -1 : 1;
  const post = (x: number, y: number) => {
    buf.set(x, y, ART.GOAL_POST_COLOR);
    buf.set(x - outward, y, ART.GOAL_POST_SHADE);
  };
  buf.line(fFG, fFT, post);
  buf.line(fNG, fNT, post);
  buf.line(fNT, fFT, (x, y) => {
    buf.set(x, y, ART.GOAL_POST_COLOR);
    buf.set(x, y + 1, ART.GOAL_POST_SHADE);
  });
}

function pitchTextureKey(stadium: StadiumDef): string {
  return `pitch_${stadium.id}`;
}

function buildPitchTexture(scene: Phaser.Scene, stadium: StadiumDef): string {
  const key = pitchTextureKey(stadium);
  if (scene.textures.exists(key)) return key; // deterministic → cache per stadium

  const buf = new PixelBuffer();
  drawStands(buf, stadium);
  drawGround(buf, stadium);
  if (stadium.muddy) drawMud(buf);
  drawMarkings(buf);
  drawGoal(buf, LEFT_GOAL_LINE_X, LEFT_GOAL_BACK_X);
  drawGoal(buf, RIGHT_GOAL_LINE_X, RIGHT_GOAL_BACK_X);

  const tex = scene.textures.createCanvas(key, W, H);
  if (!tex) throw new Error(`could not create pitch texture ${key}`);
  const ctx = tex.getContext();
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < buf.data.length; i += 1) {
    const c = buf.data[i];
    img.data[i * 4] = (c >> 16) & 255;
    img.data[i * 4 + 1] = (c >> 8) & 255;
    img.data[i * 4 + 2] = c & 255;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  tex.refresh();
  return key;
}

/** Draws the whole static arena as one nearest-scaled pixel-art image. */
export function drawPitch(scene: Phaser.Scene, stadium: StadiumDef): Phaser.GameObjects.Image {
  const key = buildPitchTexture(scene, stadium);
  return scene.add.image(0, 0, key).setOrigin(0, 0).setScale(P);
}
