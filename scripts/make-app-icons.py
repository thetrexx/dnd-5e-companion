"""Generate public/app-icon-192.png and app-icon-512.png (gold d20 line art on dark).
Run: python -I scripts/make-app-icons.py
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

BG, GOLD = (0x1B, 0x17, 0x12), (0xD9, 0xB4, 0x5F)
OUT = Path(__file__).resolve().parent.parent / 'public'
SS = 4  # supersample for smooth lines


def polygon(c, r, count, start=-90):
    step = 360 / count
    return [(c + r * math.cos(math.radians(start + step * i)), c + r * math.sin(math.radians(start + step * i))) for i in range(count)]


def render(size):
    n = size * SS
    img = Image.new('RGB', (n, n), BG)
    d = ImageDraw.Draw(img)
    w = max(1, round(n * 0.04))
    c, r = n / 2, n * 0.36
    hexa = polygon(c, r, 6)
    tri = polygon(c, r * 0.5, 3)

    def line(a, b):
        d.line([a, b], fill=GOLD, width=w)
        for p in (a, b):
            d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=GOLD)

    for i in range(6):
        line(hexa[i], hexa[(i + 1) % 6])
    for i in range(3):
        line(tri[i], tri[(i + 1) % 3])
        # triangle corner i points at hexagon corner 2*i; join to its two neighbours
        line(tri[i], hexa[(2 * i - 1) % 6])
        line(tri[i], hexa[(2 * i + 1) % 6])
    return img.resize((size, size), Image.LANCZOS)


for s in (192, 512):
    render(s).save(OUT / f'app-icon-{s}.png')
