"""Google Play feature graphic (1024x500) — M9.3 store listing.

Composites the in-game pitch (from the store screenshot that
tools/store/capture.cjs writes), the two character portraits and the
title drawn with the game's own pixel font (assets/hud/pixel_font.png).

    python3 tools/store/feature_graphic.py      # writes docs/store/<lang>/feature_graphic.png
"""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
FONT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :-.!?/()=+|%,ÇŞĞİÖÜ'  # = config/hud.ts
CELL_W, CELL_H, PER_ROW = 4, 8, 16
SIZE = (1024, 500)
# Crop of the 1920x1080 match screenshot used as the backdrop (centre pitch).
BG_CROP = (480, 300, 1440, 769)
BG_BRIGHTNESS = 0.6
BG_BLUR = 5
PORTRAIT_SCALE = 6
TITLE_SCALE = 12
SUB_SCALE = 4
TITLE_COLOR = (255, 214, 64)
SUB_COLOR = (255, 255, 255)
SHADOW_COLOR = (20, 16, 40)
# Neutral on purpose: "World Cup" is a FIFA mark (see docs/store/LISTING.md).
SUBTITLE = {'tr': '1V1 SOKAK FUTBOLU', 'en': '1V1 STREET FOOTBALL'}

FONT = Image.open(ROOT / 'assets/hud/pixel_font.png').convert('RGBA')


def text_image(text: str, scale: int, color) -> Image.Image:
    out = Image.new('RGBA', (len(text) * CELL_W, CELL_H), (0, 0, 0, 0))
    for i, ch in enumerate(text):
        idx = FONT_CHARS.index(ch)
        cell = FONT.crop(((idx % PER_ROW) * CELL_W, (idx // PER_ROW) * CELL_H,
                          (idx % PER_ROW + 1) * CELL_W, (idx // PER_ROW + 1) * CELL_H))
        out.alpha_composite(cell, (i * CELL_W, 0))
    solid = Image.new('RGBA', out.size, color + (255,))
    solid.putalpha(out.getchannel('A'))
    return solid.resize((out.width * scale, out.height * scale), Image.NEAREST)


def paste_text(canvas, text, scale, color, cy):
    img = text_image(text, scale, color)
    shadow = text_image(text, scale, SHADOW_COLOR)
    x = (canvas.width - img.width) // 2
    for dx, dy in ((scale // 2, scale // 2), (scale // 2, 0), (0, scale // 2), (-scale // 4, -scale // 4)):
        canvas.alpha_composite(shadow, (x + dx, cy + dy))
    canvas.alpha_composite(img, (x, cy))


def build(lang: str) -> None:
    src = ROOT / f'docs/store/{lang}/01_power_charge.png'
    bg = Image.open(src).convert('RGB').crop(BG_CROP).resize(SIZE, Image.LANCZOS).filter(ImageFilter.GaussianBlur(BG_BLUR))
    canvas = ImageEnhance.Brightness(bg).enhance(BG_BRIGHTNESS).convert('RGBA')

    def portrait(cid, flip):
        p = Image.open(ROOT / f'assets/characters/{cid}/portrait.png').convert('RGBA')
        if flip:
            p = p.transpose(Image.FLIP_LEFT_RIGHT)
        return p.resize((p.width * PORTRAIT_SCALE, p.height * PORTRAIT_SCALE), Image.NEAREST)

    left, right = portrait('brazil', False), portrait('congo', True)
    y = SIZE[1] - left.height - 40
    canvas.alpha_composite(left, (40, y))
    canvas.alpha_composite(right, (SIZE[0] - right.width - 40, y))

    paste_text(canvas, 'PLATFORM', TITLE_SCALE, TITLE_COLOR, 90)
    paste_text(canvas, 'FOOTBALL', TITLE_SCALE, TITLE_COLOR, 90 + CELL_H * TITLE_SCALE + 12)
    paste_text(canvas, SUBTITLE[lang], SUB_SCALE, SUB_COLOR, 90 + 2 * (CELL_H * TITLE_SCALE + 12) + 18)

    out = ROOT / f'docs/store/{lang}/feature_graphic.png'
    canvas.convert('RGB').save(out)
    print('wrote', out.relative_to(ROOT))


if __name__ == '__main__':
    for lang in ('tr', 'en'):
        build(lang)
