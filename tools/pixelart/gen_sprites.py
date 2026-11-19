"""
Procedural pixel-art generator for Platform Football.

Draws the playable characters (front/back/side turnaround + action poses +
run cycle), the ball with power-level auras, and the energy drink pickup.
Native size is 1 sprite pixel = 2 screen pixels: the front pose is exactly
35 px tall and CHARACTER_HEIGHT (arena.ts) is 70, so Character.ts scales it
by an integer factor of 2 and the pixels stay crisp.

Run:  python3 tools/pixelart/gen_sprites.py
Out:  assets/characters/<id>/*.png, assets/fx/*.png, docs/sprite_sheet.png
"""
from __future__ import annotations

import os
from dataclasses import dataclass

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUTLINE = (24, 20, 28, 255)
W, H = 28, 35


@dataclass
class Look:
    id: str
    skin: tuple
    skin_dark: tuple
    hair: tuple
    shirt: tuple
    shirt_dark: tuple
    trim: tuple
    shorts: tuple
    socks: tuple
    shoes: tuple
    hat: tuple | None = None
    hat_band: tuple | None = None
    tie: tuple | None = None
    big: bool = False


def rgb(h: str) -> tuple:
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def shade(c: tuple, f: float) -> tuple:
    """Darken (f<1) or lighten (f>1) a colour; lightening blends toward white."""
    if f <= 1:
        return tuple(int(v * f) for v in c[:3]) + (c[3],)
    t = f - 1
    return tuple(min(255, int(v + (255 - v) * t)) for v in c[:3]) + (c[3],)


# Light comes from the top-left: right/bottom silhouette edges get a shadow
# rim, top-left edges a soft highlight. Applied to every character pose.
RIM_SHADOW = 0.74
RIM_LIGHT = 1.22


LOOKS = [
    Look('brazil', skin=rgb('e8b48a'), skin_dark=rgb('c98d64'), hair=rgb('6b3f22'),
         shirt=rgb('f7d117'), shirt_dark=rgb('d4a90c'), trim=rgb('1f9b48'),
         shorts=rgb('2152b8'), socks=rgb('f2f2f2'), shoes=rgb('ffffff')),
    Look('congo', skin=rgb('7a4a2c'), skin_dark=rgb('5c3520'), hair=rgb('231710'),
         shirt=rgb('7b3fb5'), shirt_dark=rgb('5c2d8c'), trim=rgb('f4c430'),
         shorts=rgb('6a35a0'), socks=rgb('7b3fb5'), shoes=rgb('ffffff'),
         hat=rgb('6a2fa5'), hat_band=rgb('f4c430'), tie=rgb('f4c430'), big=True),
]


class Canvas:
    def __init__(self, w: int = W, h: int = H):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def put(self, x: int, y: int, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = c

    def rect(self, x0: int, y0: int, x1: int, y1: int, c):
        """Inclusive rectangle."""
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.put(x, y, c)

    def head(self, x0: int, y0: int, x1: int, y1: int, c):
        """Rounded box — corners clipped, reads as a chibi skull."""
        self.rect(x0, y0, x1, y1, c)
        for (x, y) in [(x0, y0), (x1, y0), (x0, y1), (x1, y1)]:
            self.px[y][x] = None
        self.rect(x0 + 1, y0, x1 - 1, y0, c)

    def light(self):
        """Top-left key light: shadow rim on the right edge, highlight on the
        top-left edge. Outline-coloured detail pixels (eyes etc.) are skipped."""
        src = [row[:] for row in self.px]

        def empty(x, y):
            return not (0 <= x < self.w and 0 <= y < self.h) or src[y][x] is None

        for y in range(self.h):
            for x in range(self.w):
                c = src[y][x]
                if c is None or c == OUTLINE:
                    continue
                if empty(x + 1, y) or empty(x, y + 1) and empty(x + 1, y + 1):
                    self.px[y][x] = shade(c, RIM_SHADOW)
                elif empty(x - 1, y) and empty(x, y - 1) or empty(x, y - 1) and empty(x - 1, y - 1):
                    self.px[y][x] = shade(c, RIM_LIGHT)
        return self

    def rect_cut(self, x0: int, y0: int, x1: int, y1: int, c, over: tuple = ()):
        """Rectangle that cuts an outline into the pixels it borders whose colour
        is in `over`, so a limb drawn over the body (or the far limb) stays
        readable instead of melting into it."""
        for y in range(y0 - 1, y1 + 2):
            for x in range(x0 - 1, x1 + 2):
                inside = x0 <= x <= x1 and y0 <= y <= y1
                if not inside and 0 <= x < self.w and 0 <= y < self.h and self.px[y][x] in over:
                    self.px[y][x] = OUTLINE
        self.rect(x0, y0, x1, y1, c)

    def image(self, outline: bool = True) -> Image.Image:
        img = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is not None:
                    img.putpixel((x, y), self.px[y][x])
        if outline:
            out = img.copy()
            for y in range(self.h):
                for x in range(self.w):
                    if img.getpixel((x, y))[3]:
                        continue
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < self.w and 0 <= ny < self.h and img.getpixel((nx, ny))[3]:
                            out.putpixel((x, y), OUTLINE)
                            break
            img = out
        return img


# ---------------------------------------------------------------- parts

def draw_hat_or_hair(c: Canvas, L: Look, hx0: int, hx1: int, top: int, facing: str):
    if L.hat:
        c.rect(hx0 + 1, top - 1, hx1 - 1, top + 2, L.hat)          # crown
        c.rect(hx0 + 1, top + 2, hx1 - 1, top + 2, L.hat_band)      # band
        c.rect(hx0 - 2, top + 3, hx1 + 2, top + 3, L.hat)           # brim
        c.put(hx1 - 2, top - 1, rgb('e05a9c'))                       # feather tip
        c.put(hx1 - 2, top - 2, rgb('e05a9c'))
        if facing == 'back':
            c.rect(hx0, top + 4, hx1, top + 7, L.hair)
    else:
        c.rect(hx0, top, hx1, top + 2, L.hair)
        c.rect(hx0 + 1, top - 1, hx1 - 1, top - 1, L.hair)
        if facing == 'front':
            c.put(hx0, top + 3, L.hair); c.put(hx1, top + 3, L.hair)
            c.rect(hx0 + 2, top + 3, hx0 + 4, top + 3, L.hair)       # fringe
        elif facing == 'back':
            c.rect(hx0, top + 3, hx1, top + 7, L.hair)
        elif facing == 'left':
            c.rect(hx0 + 5, top + 3, hx1, top + 6, L.hair)


def draw_head(c: Canvas, L: Look, cx: int, top: int, facing: str, eyes: str = 'open'):
    hx0, hx1 = cx - 6, cx + 5
    c.head(hx0, top, hx1, top + 11, L.skin)
    if facing == 'front':
        if eyes == 'x':
            for ex in (cx - 3, cx + 2):
                c.put(ex - 1, top + 6, OUTLINE); c.put(ex + 1, top + 6, OUTLINE)
                c.put(ex, top + 7, OUTLINE)
                c.put(ex - 1, top + 8, OUTLINE); c.put(ex + 1, top + 8, OUTLINE)
        else:
            c.rect(cx - 3, top + 6, cx - 3, top + 7, OUTLINE)
            c.rect(cx + 2, top + 6, cx + 2, top + 7, OUTLINE)
        c.put(cx - 5, top + 9, L.skin_dark); c.put(cx + 4, top + 9, L.skin_dark)  # cheeks
    elif facing == 'left':
        c.rect(cx - 4, top + 6, cx - 4, top + 7, OUTLINE)
        c.put(hx0 - 1, top + 7, L.skin)                                        # nose
        c.put(cx + 1, top + 7, L.skin_dark)                                    # ear
    draw_hat_or_hair(c, L, hx0, hx1, top, facing)


def draw_torso_front(c: Canvas, L: Look, cx: int, top: int, back: bool = False, arms: str = 'down'):
    half = 7 if L.big else 6
    x0, x1 = cx - half, cx + half - 1
    c.rect(x0, top, x1, top + 8, L.shirt)
    c.rect(x0, top + 7, x1, top + 8, L.shirt_dark)
    if not back:
        c.rect(cx - 2, top, cx + 1, top, L.trim)                   # collar
        if L.tie:
            c.rect(cx - 1, top + 1, cx, top + 5, L.tie)
        else:
            c.put(cx + 2, top + 2, L.trim)                          # crest
    else:
        # back number "10"
        c.rect(cx - 3, top + 2, cx - 3, top + 6, L.trim)
        c.rect(cx - 1, top + 2, cx + 1, top + 2, L.trim)
        c.rect(cx - 1, top + 6, cx + 1, top + 6, L.trim)
        c.rect(cx - 1, top + 2, cx - 1, top + 6, L.trim)
        c.rect(cx + 1, top + 2, cx + 1, top + 6, L.trim)
    ax0, ax1 = x0 - 2, x1 + 1
    if arms == 'down':
        for ax in (ax0, ax1):
            c.rect(ax, top + 1, ax + 1, top + 2, L.shirt)
            c.rect(ax, top + 3, ax + 1, top + 7, L.skin)
            c.rect(ax, top + 8, ax + 1, top + 8, L.skin_dark)
    elif arms == 'up':
        # arms thrown up and out in a V so they clear the head silhouette
        for ax, out in ((ax0, -1), (ax1, 1)):
            c.rect(ax, top, ax + 1, top + 1, L.shirt)
            c.rect(ax, top - 3, ax + 1, top - 1, L.skin)
            c.rect(ax + out, top - 6, ax + 1 + out, top - 4, L.skin)
            c.rect(ax + 2 * out, top - 9, ax + 1 + 2 * out, top - 7, L.skin)
            c.rect(ax + 2 * out, top - 9, ax + 1 + 2 * out, top - 9, L.skin_dark)  # fist
    elif arms == 'catch':
        c.rect(ax0 - 3, top - 2, ax0 + 1, top - 1, L.skin)
        c.rect(ax0, top, ax0 + 1, top + 1, L.shirt)
        c.rect(ax1, top - 2, ax1 + 4, top - 1, L.skin)
        c.rect(ax1, top, ax1 + 1, top + 1, L.shirt)
        c.rect(ax0 - 4, top - 4, ax0 - 3, top - 1, L.skin_dark)     # palms
        c.rect(ax1 + 4, top - 4, ax1 + 5, top - 1, L.skin_dark)
    return x0, x1


def draw_legs_front(c: Canvas, L: Look, cx: int, top: int, bent: bool = False):
    half = 7 if L.big else 6
    x0, x1 = cx - half, cx + half - 1
    c.rect(x0, top, x1, top + 3, L.shorts)
    c.rect(cx - 1, top + 3, cx, top + 3, None)
    lx = [(cx - 5, cx - 3), (cx + 2, cx + 4)]
    if bent:
        lx = [(cx - 6, cx - 4), (cx + 3, cx + 5)]
        for a, b in lx:
            c.rect(a, top + 4, b, top + 4, L.skin)
            c.rect(a, top + 5, b, top + 6, L.socks)
            c.rect(a - (1 if a < cx else 0), top + 7, b + (1 if a > cx else 0), top + 8, L.shoes)
        return
    for a, b in lx:
        c.rect(a, top + 4, b, top + 5, L.skin)
        c.rect(a, top + 6, b, top + 7, L.socks)
        if not L.tie:
            c.rect(a, top + 6, b, top + 6, L.trim)
        c.rect(a - (1 if a < cx else 0), top + 8, b + (1 if a > cx else 0), top + 9, L.shoes)


# ---------------------------------------------------------------- poses

CX = 14
HEAD_TOP = 2
TORSO_TOP = 14
LEGS_TOP = 23


def pose_front(L: Look, back=False, arms='down', eyes='open', bent=False, lift=0) -> Canvas:
    c = Canvas()
    draw_legs_front(c, L, CX, LEGS_TOP - lift, bent)
    draw_torso_front(c, L, CX, TORSO_TOP - lift, back, arms)
    draw_head(c, L, CX, HEAD_TOP - lift, 'back' if back else 'front', eyes)
    return c.light()


FAR_LIMB = 0.72   # far-side arm/leg are drawn darker so they read behind the body

SIDE_SWINGS = {'idle': (0, 1), 'run0': (-5, 4), 'run1': (-2, 1), 'run2': (4, -5), 'run3': (1, -2),
               'kick': (5, 0), 'jump': (-4, 3)}          # (near leg, far leg) foot offset; <0 forward (left)
SIDE_LIFT = {'run0': (0, 2), 'run1': (0, 0), 'run2': (2, 0), 'run3': (0, 0), 'jump': (3, 2)}  # back foot kicks up
SIDE_ARM = {'idle': 0, 'run0': 3, 'run1': 1, 'run2': -3, 'run3': -1, 'kick': 4, 'jump': -3}  # near arm; far = -arm


def side_leg(c: Canvas, L: Look, hip_x: int, top: int, swing: int, lift: int = 0,
             far: bool = False):
    """One leg in profile; swing <0 forward (left), >0 back. lift raises foot.
    The near leg cuts an outline into the far one so the two stay separate."""
    f = FAR_LIMB if far else 1.0
    skin, socks, shoes = shade(L.skin, f), shade(L.socks, f), shade(L.shoes, f * (0.9 if far else 1))
    far_cols = tuple(shade(col, FAR_LIMB) for col in (L.skin, L.socks)) + (shade(L.shoes, FAR_LIMB * 0.9),)
    draw = c.rect if far else (lambda *a: c.rect_cut(*a, over=far_cols))
    fx = hip_x + swing
    mx = hip_x + swing // 2
    draw(mx, top, mx + 2, top + 1, skin)                         # thigh/knee
    draw(fx, top + 2 - lift, fx + 2, top + 3 - lift, socks)       # shin + sock
    draw(fx - 1, top + 4 - lift, fx + 2, top + 5 - lift, shoes)   # boot (toe forward)


def side_arm(c: Canvas, L: Look, top: int, offset: int, far: bool):
    f = FAR_LIMB if far else 1.0
    ax = CX - 1 + offset
    draw = c.rect if far else (lambda *a: c.rect_cut(*a, over=(L.shirt, L.shirt_dark)))
    draw(ax - 1, top + 3, ax + 1, top + 6, shade(L.skin, f))
    c.rect(ax - 1, top + 7, ax + 1, top + 7, shade(L.skin_dark, f))  # fist


def pose_side(L: Look, frame: str = 'idle') -> Canvas:
    """Facing left. frame: idle | run0..run3 | kick | jump (knees tucked)."""
    c = Canvas()
    bob = 1 if frame in ('run1', 'run3') else 0
    legs_top = LEGS_TOP + 4 - bob
    near, far = SIDE_SWINGS[frame]
    lift_near, lift_far = SIDE_LIFT.get(frame, (0, 0))
    arm = SIDE_ARM[frame]
    hip = CX - 2
    half = 5 if L.big else 4
    torso_top = TORSO_TOP - bob
    # far arm swings opposite the near arm, behind the torso
    if frame != 'idle':
        side_arm(c, L, torso_top, -arm, far=True)
    side_leg(c, L, hip + 1, legs_top, far, lift=lift_far, far=True)
    # shorts + torso
    c.rect(CX - half - 1, LEGS_TOP - bob, CX + half - 1, LEGS_TOP + 3 - bob, L.shorts)
    c.rect(CX - half - 1, torso_top, CX + half - 1, torso_top + 8, L.shirt)
    c.rect(CX - half - 1, torso_top + 7, CX + half - 1, torso_top + 8, L.shirt_dark)
    c.rect(CX + half - 2, torso_top + 1, CX + half - 1, torso_top + 6, L.shirt_dark)   # back shadow
    if L.tie:
        c.rect(CX - half - 1, torso_top + 1, CX - half - 1, torso_top + 4, L.tie)
    else:
        c.rect(CX - half - 1, torso_top, CX - half, torso_top, L.trim)                 # collar
    if frame == 'kick':
        c.rect(hip - 7, legs_top - 2, hip, legs_top - 1, L.skin)        # extended kicking leg
        c.rect(hip - 9, legs_top - 3, hip - 7, legs_top - 1, L.socks)
        c.rect(hip - 12, legs_top - 3, hip - 9, legs_top - 1, L.shoes)
    else:
        side_leg(c, L, hip, legs_top, near, lift=lift_near)
    # near arm: sleeve + forearm, outlined against the shirt
    side_arm(c, L, torso_top, arm, far=False)
    c.rect(CX - 2, torso_top + 1, CX, torso_top + 2, L.shirt_dark)
    draw_head(c, L, CX, HEAD_TOP - bob, 'left')
    return c.light()


def flip(img: Image.Image) -> Image.Image:
    return img.transpose(Image.FLIP_LEFT_RIGHT)


def lean(img: Image.Image, amount: float) -> Image.Image:
    """Shear so the top leans forward (left) — dash/slide feel."""
    w, h = img.size
    pad = int(abs(amount) * h) + 2
    out = Image.new('RGBA', (w + pad, h), (0, 0, 0, 0))
    for y in range(h):
        shift = int(round((h - 1 - y) * amount))
        row = img.crop((0, y, w, y + 1))
        out.alpha_composite(row, (pad - shift, y))
    return out


def stars(img: Image.Image) -> Image.Image:
    img = img.copy()
    yel = rgb('ffe14d')
    for (x, y) in [(6, 2), (20, 1), (13, 0)]:
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            if 0 <= x + dx < img.width and 0 <= y + dy < img.height:
                img.putpixel((x + dx, y + dy), yel)
    return img


# ---------------------------------------------------------------- portrait

PW, PH = 40, 40


def portrait(L: Look) -> Image.Image:
    """Power-shot cut-in bust (M6.4): big 3/4-front head, angled brows,
    gritted teeth — Tsubasa-style "this one's going in" face. Faces right
    (the game flips it for the right-side player)."""
    c = Canvas(PW, PH)
    sk, skd = L.skin, L.skin_dark
    white = rgb('f4f4f4')
    # shoulders + shirt
    c.rect(2, 33, 37, 39, L.shirt)
    c.rect(2, 37, 37, 39, L.shirt_dark)
    c.rect(15, 33, 24, 34, L.trim)                                  # collar
    if L.tie:
        c.rect(19, 35, 20, 39, L.tie)
    else:
        c.rect(28, 36, 30, 37, L.trim)                              # crest
    c.rect(16, 29, 23, 33, skd)                                     # neck (shaded)
    # head: tapered box, chin narrower
    c.rect(9, 8, 30, 27, sk)
    c.rect(11, 28, 28, 29, sk)
    c.rect(14, 30, 25, 30, sk)
    for (x, y) in [(9, 8), (30, 8), (9, 27), (30, 27)]:
        c.put(x, y, None)
    c.rect(26, 12, 30, 27, skd)                                     # far cheek in shadow
    c.rect(24, 28, 28, 29, skd)
    c.rect(8, 17, 8, 21, sk); c.rect(31, 17, 31, 21, skd)           # ears
    # brows: thick, angled down toward the nose (determined)
    for i in range(6):
        c.put(11 + i, 13 + i // 2, OUTLINE); c.put(11 + i, 14 + i // 2, OUTLINE)
        c.put(28 - i, 13 + i // 2, OUTLINE); c.put(28 - i, 14 + i // 2, OUTLINE)
    # eyes: white, big dark iris looking forward-right, highlight
    for ex in (12, 22):
        c.rect(ex, 17, ex + 5, 20, white)
        c.rect(ex, 17, ex + 5, 17, OUTLINE)                         # upper lid
        c.rect(ex + 2, 18, ex + 4, 20, OUTLINE)                     # iris
        c.put(ex + 3, 18, white)                                    # catch-light
    # nose + gritted teeth
    c.rect(19, 21, 19, 24, skd); c.put(20, 24, skd)
    c.rect(15, 26, 24, 26, OUTLINE)
    c.rect(16, 27, 23, 27, white)
    c.rect(15, 28, 24, 28, OUTLINE)
    for x in (18, 21):
        c.put(x, 27, OUTLINE)
    # sweat drop + cheek mark for drama
    c.put(8, 23, rgb('bfe6ff')); c.put(8, 24, rgb('8cc8f0'))
    if L.hat:
        c.rect(10, 1, 29, 7, L.hat)                                 # crown
        c.rect(10, 6, 29, 7, L.hat_band)
        c.rect(5, 8, 34, 9, L.hat)                                  # brim
        c.rect(5, 9, 34, 9, shade(L.hat, 0.7))
        c.rect(26, 0, 27, 3, rgb('e05a9c'))                         # feather
        c.rect(13, 10, 26, 10, shade(sk, 0.6))                      # brim shadow
    else:
        # spiky hair, swept back by the wind of the shot
        c.rect(8, 3, 31, 11, L.hair)
        for (x0, top) in [(9, 0), (14, -1), (19, 0), (24, 1), (29, 3)]:
            c.rect(x0, max(0, top + 1), x0 + 3, 3, L.hair)
            c.put(x0 + 1, max(0, top), L.hair)
        c.rect(8, 12, 9, 18, L.hair)                                 # sideburns
        c.rect(30, 12, 31, 16, L.hair)
        for x in range(11, 29, 3):                                  # fringe spikes
            c.put(x, 12, L.hair); c.put(x + 1, 12, L.hair); c.put(x + 1, 13, L.hair)
        c.rect(12, 4, 20, 4, shade(L.hair, 1.35))                   # shine
    c.light()
    return c.image()


# ---------------------------------------------------------------- fx

def dust() -> Image.Image:
    """Small dust puff kicked up under a dashing player (tweened in-game)."""
    c = Canvas(12, 8)
    base, hi, lo = rgb('f3eee4'), rgb('ffffff'), rgb('b3a58c')
    for (x0, y0, x1, y1) in [(1, 3, 10, 6), (3, 1, 7, 7), (7, 2, 9, 3), (0, 5, 2, 6)]:
        c.rect(x0, y0, x1, y1, base)
    c.rect(3, 1, 5, 2, hi); c.rect(1, 3, 2, 4, hi)
    c.rect(4, 6, 10, 6, lo)
    return c.image(outline=False)


# Power-shot elements (Sami 17.11): a character always shoots its own
# element; the level (1-3) only grows the aura. Keep in sync with
# src/config/elements.ts.
ELEMENT_ART = {
    #            aura ring colours (inner -> outer)         tail/spark colours
    'lightning': (['ffffff', '9fdcff', '4fb4ff'],          ['ffffff', 'bfe8ff', '6fc8ff']),
    'fire':      (['ffe14d', 'ff9a1f', 'ff5a1f'],          ['ffe14d', 'ff9a1f', 'ff4a1f']),
    'wind':      (['f0fff4', 'b8f0cc', '6fd89a'],          ['ffffff', 'c8f5d8', '8fe8b0']),
    'earth':     (['f0d8a0', 'c89450', '8a5a2a'],          ['e8c890', 'b07838', '7a4a20']),
}


def ball(level: int, element: str = 'fire') -> Image.Image:
    """Ball with the element's power aura. level 0 = plain; 1-3 = bigger
    aura, a trailing tail from level 2 and sparks/bolts at level 3."""
    S = 25
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    c = S // 2
    if level:
        ring, tail = ELEMENT_ART[element]
        ring = [rgb(h) for h in ring]
        tail = [rgb(h) for h in tail]
        radius = 5.5 + level * 1.5
        for y in range(S):
            for x in range(S):
                d = ((x - c) ** 2 + (y - c) ** 2) ** 0.5
                if 4.5 < d <= radius:
                    band = min(len(ring) - 1, int((d - 4.5) / (radius - 4.5) * len(ring)))
                    a = int(255 * (1 - (d - 4.5) / (radius - 4.5 + 0.8)))
                    if element == 'wind' and (x + y) % 3 == 0:
                        continue  # airy, broken ring
                    img.putpixel((x, y), ring[band][:3] + (max(80, a),))
        if level >= 2:  # tail to the right (ball travels left in source)
            n = 3 + level * 2
            for i in range(n):
                dx = 6 + i
                if element == 'lightning':
                    dy = [0, -1, -2, -1, 0, 1, 2, 1][i % 8]       # zigzag bolt
                elif element == 'wind':
                    dy = [-2, -2, -1, 0, 1, 2, 2, 1][i % 8]       # swirl
                elif element == 'earth':
                    dy = (i * 2) % 3 - 1 + 2                       # dust low behind
                else:
                    dy = [0, -1, 1, 0, -2, 1, -1, 2][i % 8]       # flicker
                if 0 <= c + dx < S and 0 <= c + dy < S:
                    img.putpixel((c + dx, c + dy), tail[min(len(tail) - 1, i * len(tail) // n)][:3] + (255,))
                    if level == 3 and c + dy + 1 < S:
                        img.putpixel((c + dx, c + dy + 1), tail[-1][:3] + (200,))
        if level == 3:  # sparks around the ball
            for (dx, dy) in [(-8, -6), (-9, 3), (2, -10), (-3, 9), (7, -8), (6, 8)]:
                if 0 <= c + dx < S and 0 <= c + dy < S:
                    img.putpixel((c + dx, c + dy), tail[0][:3] + (255,))
            if element == 'lightning':
                for (dx, dy) in [(-6, -9), (-5, -8), (-6, -7), (-5, -6)]:
                    img.putpixel((c + dx, c + dy), rgb('ffffff')[:3] + (255,))
    white, black = rgb('fafafa'), rgb('1b1b1f')
    for y in range(S):
        for x in range(S):
            d = ((x - c) ** 2 + (y - c) ** 2) ** 0.5
            if d <= 4.2:
                img.putpixel((x, y), white)
            elif d <= 5.0:
                img.putpixel((x, y), OUTLINE)
    for (x, y) in [(c, c), (c - 1, c), (c, c - 1), (c + 1, c), (c, c + 1), (c - 3, c - 2), (c + 3, c - 2),
                   (c - 2, c + 3), (c + 2, c + 3)]:
        img.putpixel((x, y), black)
    return img


def energy_drink(gold: bool = False) -> Image.Image:
    """Blue can (+1 energy) or the rare golden can (+2), CLAUDE.md section 5."""
    body, shine, rim, bolt_c = (('e0a81e', 'fff0a0', 'fff6d0', 'ffffff') if gold
                                else ('1e6fe0', '6fb0ff', 'c0c0c8', 'ffe14d'))
    c = Canvas(9, 15)
    c.rect(2, 0, 6, 0, rgb(rim))                       # lid
    c.rect(1, 1, 7, 13, rgb(body))                     # can
    c.rect(1, 1, 7, 2, rgb(rim))
    c.rect(1, 12, 7, 13, rgb(rim))
    c.rect(2, 3, 2, 11, rgb(shine))                    # shine
    bolt = [(5, 4), (4, 5), (4, 6), (5, 6), (6, 6), (5, 7), (4, 8), (4, 9)]
    for x, y in bolt:
        c.put(x, y, rgb(bolt_c))
    if gold:                                           # sparkle pixels
        c.put(7, 4, rgb('ffffff'))
        c.put(1, 10, rgb('ffffff'))
    return c.image()



# ---------------------------------------------------------------- menu icons (M8)

def _icon_from(rows, pal):
    """Tiny pixel icon from a char map; '.' transparent, outline auto."""
    c = Canvas(len(rows[0]), len(rows))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != '.':
                c.put(x, y, rgb(pal[ch]))
    return c.image()


def icon_coin():
    rows = ['..oooo..', '.oyyyyo.', 'oyywyyyo', 'oywyyyho', 'oyyyyyho', 'oyyyyhho', '.ohhhho.', '..oooo..']
    return _icon_from(rows, {'o': '8a5a10', 'y': 'ffd23a', 'w': 'fff6c0', 'h': 'e0a020'})


def icon_gem():
    rows = ['..oooooo..', '.owwccbbo.', 'owwccbbbbo', 'occccbbbdo', '.occbbbdo.', '..ocbbdo..', '...obdo...', '....oo....']
    return _icon_from(rows, {'o': '0e3c6e', 'w': 'e8fbff', 'c': '7fe0ff', 'b': '30a8f0', 'd': '1870c0'})


def icon_star():
    rows = ['....oo....', '...oyyo...', 'oooyyyyooo', 'oyyywyyyyo', '.oyyyyyyo.', '..oyyyyo..', '.oyyooyyo.', '.oyo..oyo.', '.oo....oo.']
    return _icon_from(rows, {'o': '6a3a9a', 'y': 'b070ff', 'w': 'f0d8ff'})


def icon_whistle():
    rows = ['..........oo', '.oooooo..ogo', 'ossswsso.oo.', 'osssssssoo..', 'osbbsssso...', 'osbbssso....', '.osssso.....', '..oooo......']
    return _icon_from(rows, {'o': '1b2030', 's': 'c8d0dc', 'w': 'ffffff', 'b': '5a6478', 'g': 'ffd23a'})


def icon_shirt():
    rows = ['.oo....oo.', 'oyyoooo yyo'.replace(' ', 'o')[:10], 'oyyyyyyyyo', 'ooyywwyyoo', '.oyyyyyyo.', '.oyyyyyyo.', '.oyyyyyyo.', '.oooooooo.']
    return _icon_from(rows, {'o': '1b2030', 'y': 'f1c40f', 'w': '2a7a3a'})


def icon_lock():
    rows = ['..oooo..', '.o....o.', '.o....o.', 'oooooooo', 'oyyyyyyo', 'oyyooyyo', 'oyyyyyyo', 'oooooooo']
    return _icon_from(rows, {'o': '1b2030', 'y': 'c8d0dc'})


def icon_trophy():
    """League cup (M9.2 Sokak Dünya Kupası)."""
    rows = ['oooooooooo', 'oyywyyyyho', 'ooywyyyhoo', 'o.oyyyyho.o'[:10], '.ooyyyhoo.', '...oyho...', '....oo....', '...oyyo...', '..oddddo..', '..oooooo..']
    return _icon_from(rows, {'o': '6a4a08', 'y': 'ffd23a', 'w': 'fff6c0', 'h': 'e0a020', 'd': '8a5a10'})


# ---------------------------------------------------------------- crowd + HUD

FAN_SHIRTS = ['e74c3c', 'f1c40f', '3498db', '2ecc71', 'f2f2f2', 'e67e22']
FAN_SKINS = ['e8b48a', '7a4a2c', 'c98d64']


def fan(variant: int, cheer: bool) -> Image.Image:
    """Tiny stands spectator (6x9). Idle = arms down, cheer = arms up."""
    c = Canvas(7, 10)
    skin = rgb(FAN_SKINS[variant % len(FAN_SKINS)])
    shirt = rgb(FAN_SHIRTS[variant % len(FAN_SHIRTS)])
    hair = rgb('231710') if variant % 2 else rgb('6b3f22')
    top = 3 if cheer else 4
    c.rect(2, top, 4, top + 2, skin)                    # head
    c.rect(2, top, 4, top, hair)
    c.rect(1, top + 3, 5, 9, shirt)                     # body (cut off by the row in front)
    if cheer:
        c.rect(0, top - 1, 0, top + 3, skin)
        c.rect(6, top - 1, 6, top + 3, skin)
    return c.image()


def hud_scoreboard() -> Image.Image:
    """Scoreboard panel (sprite px): two team slots + a center score slot."""
    w, h = 110, 18
    c = Canvas(w, h)
    c.rect(0, 0, w - 1, h - 1, rgb('1b1f2a'))
    c.rect(1, 1, w - 2, 1, rgb('3a4256'))                 # top bevel
    c.rect(1, h - 2, w - 2, h - 2, rgb('0d0f15'))         # bottom bevel
    c.rect(32, 2, 77, h - 3, rgb('0b0d12'))               # score well
    c.rect(32, 2, 77, 2, rgb('000000'))
    for x in (31, 78):
        c.rect(x, 2, x, h - 3, rgb('ffe066'))
    return c.image()


def hud_energy_cell(full: bool) -> Image.Image:
    c = Canvas(12, 8)
    c.rect(0, 0, 11, 7, rgb('1b1f2a'))
    if full:
        c.rect(1, 1, 10, 6, rgb('ffcf33'))
        c.rect(1, 1, 10, 2, rgb('fff3a0'))
        c.rect(1, 6, 10, 6, rgb('d48a00'))
        for (x, y) in [(6, 1), (5, 2), (5, 3), (6, 3), (7, 3), (6, 4), (5, 5)]:
            c.put(x, y, rgb('ffffff'))
    else:
        c.rect(1, 1, 10, 6, rgb('2e3444'))
        c.rect(1, 6, 10, 6, rgb('232836'))
    return c.image()


def hud_button() -> Image.Image:
    w, h = 40, 12
    c = Canvas(w, h)
    c.rect(0, 0, w - 1, h - 1, rgb('2c3e50'))
    c.rect(1, 1, w - 2, 1, rgb('4f6b86'))
    c.rect(1, h - 2, w - 2, h - 2, rgb('1a2633'))
    return c.image()


# 3x5 caps font in a 4x8 cell: rows 0-1 accents, rows 2-6 glyph, row 7 cedilla.
FONT_GLYPHS = {
    'A': ['.#.', '#.#', '###', '#.#', '#.#'], 'B': ['##.', '#.#', '##.', '#.#', '##.'],
    'C': ['.##', '#..', '#..', '#..', '.##'], 'D': ['##.', '#.#', '#.#', '#.#', '##.'],
    'E': ['###', '#..', '##.', '#..', '###'], 'F': ['###', '#..', '##.', '#..', '#..'],
    'G': ['.##', '#..', '#.#', '#.#', '.##'], 'H': ['#.#', '#.#', '###', '#.#', '#.#'],
    'I': ['###', '.#.', '.#.', '.#.', '###'], 'J': ['..#', '..#', '..#', '#.#', '.#.'],
    'K': ['#.#', '#.#', '##.', '#.#', '#.#'], 'L': ['#..', '#..', '#..', '#..', '###'],
    'M': ['#.#', '###', '###', '#.#', '#.#'], 'N': ['##.', '#.#', '#.#', '#.#', '#.#'],
    'O': ['.#.', '#.#', '#.#', '#.#', '.#.'], 'P': ['##.', '#.#', '##.', '#..', '#..'],
    'Q': ['.#.', '#.#', '#.#', '##.', '.##'], 'R': ['##.', '#.#', '##.', '#.#', '#.#'],
    'S': ['.##', '#..', '.#.', '..#', '##.'], 'T': ['###', '.#.', '.#.', '.#.', '.#.'],
    'U': ['#.#', '#.#', '#.#', '#.#', '###'], 'V': ['#.#', '#.#', '#.#', '#.#', '.#.'],
    'W': ['#.#', '#.#', '###', '###', '#.#'], 'X': ['#.#', '#.#', '.#.', '#.#', '#.#'],
    'Y': ['#.#', '#.#', '.#.', '.#.', '.#.'], 'Z': ['###', '..#', '.#.', '#..', '###'],
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
    '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '##.'],
    ' ': ['...'] * 5, ':': ['...', '.#.', '...', '.#.', '...'], '-': ['...', '...', '###', '...', '...'],
    '.': ['...', '...', '...', '...', '.#.'], '!': ['.#.', '.#.', '.#.', '...', '.#.'],
    '?': ['##.', '..#', '.#.', '...', '.#.'], '/': ['..#', '..#', '.#.', '#..', '#..'],
    '(': ['.#.', '#..', '#..', '#..', '.#.'], ')': ['.#.', '..#', '..#', '..#', '.#.'],
    '=': ['...', '###', '...', '###', '...'], '+': ['...', '.#.', '###', '.#.', '...'],
    '|': ['.#.', '.#.', '.#.', '.#.', '.#.'],
    '%': ['#.#', '..#', '.#.', '#..', '#.#'], ',': ['...', '...', '...', '.#.', '#..'],
}
# Turkish letters: (base glyph, accent) — accent drawn above or below.
FONT_ACCENTED = {'Ç': ('C', 'cedilla'), 'Ş': ('S', 'cedilla'), 'Ğ': ('G', 'breve'),
                 'İ': ('I', 'dot'), 'Ö': ('O', 'umlaut'), 'Ü': ('U', 'umlaut')}
FONT_CHARS = ''.join(FONT_GLYPHS.keys()) + ''.join(FONT_ACCENTED.keys())
FONT_CELL_W, FONT_CELL_H, FONT_PER_ROW = 4, 8, 16


def pixel_font() -> Image.Image:
    """White-on-transparent fixed-width font sheet, parsed by Phaser's RetroFont
    (the char list is mirrored in src/config/hud.ts — keep them in sync)."""
    rows = (len(FONT_CHARS) + FONT_PER_ROW - 1) // FONT_PER_ROW
    img = Image.new('RGBA', (FONT_CELL_W * FONT_PER_ROW, FONT_CELL_H * rows), (0, 0, 0, 0))
    white = (255, 255, 255, 255)
    for i, ch in enumerate(FONT_CHARS):
        ox, oy = (i % FONT_PER_ROW) * FONT_CELL_W, (i // FONT_PER_ROW) * FONT_CELL_H
        base, accent = FONT_ACCENTED.get(ch, (ch, None))
        for y, row in enumerate(FONT_GLYPHS[base]):
            for x, v in enumerate(row):
                if v == '#':
                    img.putpixel((ox + x, oy + 2 + y), white)
        marks = {'dot': [(1, 1)], 'umlaut': [(0, 1), (2, 1)], 'breve': [(0, 0), (2, 0), (1, 1)],
                 'cedilla': [(1, 7)]}.get(accent, [])
        for (x, y) in marks:
            img.putpixel((ox + x, oy + y), white)
    return img


# ---------------------------------------------------------------- main

def save(img: Image.Image, *parts: str):
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    return img


def app_icon() -> Image.Image:
    """32x32 home-screen icon: a level-3 fire ball on striped grass."""
    S = 32
    img = Image.new('RGBA', (S, S), rgb('3f7d3a'))
    for x in range(S):
        if (x // 4) % 2 == 0:
            for y in range(S):
                img.putpixel((x, y), rgb('4a8c43'))
    b = ball(3, 'fire')
    img.alpha_composite(b, ((S - b.width) // 2, (S - b.height) // 2))
    return img


def main():
    sheet_rows = []
    for L in LOOKS:
        d = ('assets', 'characters', L.id)
        poses = {}
        poses['front'] = pose_front(L).image()
        poses['back'] = pose_front(L, back=True).image()
        poses['left'] = pose_side(L, 'idle').image()
        poses['right'] = flip(poses['left'])
        poses['jump'] = pose_front(L, arms='up', bent=True, lift=0).image()
        # Side-facing airborne pose — used for most jumps so the player
        # doesn't turn to face the camera mid-air (Sami: "ekrana dönüyor").
        poses['jump_left'] = pose_side(L, 'jump').image()
        poses['jump_right'] = flip(poses['jump_left'])
        poses['catch'] = pose_front(L, arms='catch').image()
        poses['stunned'] = stars(pose_front(L, eyes='x').image())
        poses['kick_left'] = pose_side(L, 'kick').image()
        poses['kick_right'] = flip(poses['kick_left'])
        for i in range(4):
            poses[f'run_left_{i}'] = pose_side(L, f'run{i}').image()
            poses[f'run_right_{i}'] = flip(poses[f'run_left_{i}'])
        poses['slide'] = lean(pose_side(L, 'run0').image(), 0.35)   # dash pose (facing left)
        poses['slide_right'] = flip(poses['slide'])
        for name, img in poses.items():
            save(img, *d, f'{name}.png')
        portrait_img = save(portrait(L), *d, 'portrait.png')
        sheet_rows.append(list(poses.values()) + [portrait_img])
        assert poses['front'].height == H

    fx = [save(ball(0), 'assets', 'fx', 'ball_power0.png')]
    for element in ELEMENT_ART:
        for lvl in range(1, 4):
            fx.append(save(ball(lvl, element), 'assets', 'fx', f'ball_{element}{lvl}.png'))
    fx.append(save(energy_drink(), 'assets', 'fx', 'energy_drink.png'))
    fx.append(save(energy_drink(gold=True), 'assets', 'fx', 'energy_drink_gold.png'))
    fx.append(save(dust(), 'assets', 'fx', 'dust.png'))
    sheet_rows.append(fx)

    fans = []
    for v in range(len(FAN_SHIRTS)):
        for cheer in (False, True):
            img = fan(v, cheer)
            save(img, 'assets', 'fx', f'fan_{v}_{"cheer" if cheer else "idle"}.png')
            fans.append(img)
    sheet_rows.append(fans)

    hud = {
        'hud_scoreboard': hud_scoreboard(),
        'hud_energy_full': hud_energy_cell(True),
        'hud_energy_empty': hud_energy_cell(False),
        'hud_button': hud_button(),
        'pixel_font': pixel_font(),
    }
    hud.update({
        'icon_coin': icon_coin(), 'icon_gem': icon_gem(), 'icon_star': icon_star(),
        'icon_whistle': icon_whistle(), 'icon_shirt': icon_shirt(), 'icon_lock': icon_lock(),
        'icon_trophy': icon_trophy(),
    })
    for name, img in hud.items():
        save(img, 'assets', 'hud', f'{name}.png')
    sheet_rows.append(list(hud.values()))

    # App icon for the installable web app (M7.1): flame ball on pitch stripes.
    icon = app_icon()
    for size in (192, 512):
        save(icon.resize((size, size), Image.NEAREST), 'assets', 'icons', f'icon-{size}.png')

    # preview sheet (x4) for docs / review
    pad, scale = 4, 4
    sw = max(sum(i.width + pad for i in r) for r in sheet_rows)
    sh = sum(max(i.height for i in r) + pad for r in sheet_rows)
    sheet = Image.new('RGBA', (sw, sh), rgb('3f7d3a'))
    y = 0
    for r in sheet_rows:
        x = 0
        for i in r:
            sheet.alpha_composite(i, (x, y))
            x += i.width + pad
        y += max(i.height for i in r) + pad
    save(sheet.resize((sw * scale, sh * scale), Image.NEAREST), 'docs', 'sprite_sheet.png')


if __name__ == '__main__':
    main()
