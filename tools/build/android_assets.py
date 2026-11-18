"""Generate Android launcher icons + splash screens from the web icon (M9.1).

Run after changing assets/icons/icon-512.png:
    python3 tools/build/android_assets.py
Pixel art is scaled with nearest-neighbour so it stays crisp.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets/icons/icon-512.png"
RES = ROOT / "android/app/src/main/res"
BG = (0x0B, 0x0F, 0x14, 255)          # same as theme_color / Phaser background
DENSITY = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
LEGACY_DP, ADAPTIVE_DP = 48, 108
SPLASH_ICON_FRACTION = 0.4             # icon height / short side of the splash


def scaled(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.NEAREST)


def main() -> None:
    icon = Image.open(SRC).convert("RGBA")
    for name, k in DENSITY.items():
        d = RES / f"mipmap-{name}"
        legacy = scaled(icon, round(LEGACY_DP * k))
        legacy.save(d / "ic_launcher.png")
        mask = Image.new("L", legacy.size, 0)
        ImageDraw.Draw(mask).ellipse((0, 0, legacy.size[0] - 1, legacy.size[1] - 1), fill=255)
        rnd = Image.new("RGBA", legacy.size, (0, 0, 0, 0))
        rnd.paste(legacy, (0, 0), mask)
        rnd.save(d / "ic_launcher_round.png")
        # Adaptive foreground: full-bleed art; the launcher mask keeps the
        # centre 72/108 which is where the ball sits.
        scaled(icon, round(ADAPTIVE_DP * k)).save(d / "ic_launcher_foreground.png")

    for f in RES.glob("drawable*/splash.png"):
        w, h = Image.open(f).size
        s = Image.new("RGBA", (w, h), BG)
        size = int(min(w, h) * SPLASH_ICON_FRACTION)
        s.paste(scaled(icon, size), ((w - size) // 2, (h - size) // 2))
        s.save(f)

    (RES / "values/ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        '    <color name="ic_launcher_background">#4A8C4A</color>\n</resources>\n'
    )


if __name__ == "__main__":
    main()
