"""Prepare textures for the Hakurei Shrine diorama."""
import json
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "assets")
os.makedirs(OUT, exist_ok=True)
rng = random.Random(20240607)
np_rng = np.random.default_rng(20240607)


def save(img, name):
    img.save(os.path.join(OUT, name))
    print("wrote", name, img.size)


def noise_layer(w, h, scale=1.0, octaves=3):
    """Smooth value noise via upscaling small random arrays."""
    total = np.zeros((h, w, 3), np.float32)
    amp = 1.0
    norm = 0.0
    for o in range(octaves):
        sw = max(2, int(w / (24 / (2 ** o))))
        sh = max(2, int(h / (24 / (2 ** o))))
        small = np_rng.random((sh, sw, 3)).astype(np.float32)
        small = np.repeat(np.repeat(small, 2, axis=0), 2, axis=1)
        layer = np.array(Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), np.float32) / 255.0
        total += layer * amp
        norm += amp
        amp *= 0.55
    total /= norm
    return total


def wrap_paste(base, tile, x, y):
    w, h = base.size
    tw, th = tile.size
    for dx in (-w, 0, w):
        for dy in (-h, 0, h):
            base.alpha_composite(tile, (int(x + dx), int(y + dy)))


def gravel():
    w = h = 512
    base = Image.new("RGBA", (w, h), (203, 190, 165, 255))
    n = noise_layer(w, h, octaves=3)
    arr = np.array(base, np.float32)
    arr[:, :, :3] += (n[:, :, :1] - 0.5) * 26
    arr[:, :, :3] += (np_rng.normal(0, 3.2, (h, w, 1)))
    base = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(base)
    # fine grit
    for _ in range(2600):
        x, y = rng.randrange(w), rng.randrange(h)
        r = rng.choice([0, 0, 1])
        c = rng.choice([(176, 166, 146), (188, 177, 156), (219, 208, 185), (160, 152, 135)])
        d.ellipse((x, y, x + r, y + r), fill=c + (230,))
    # larger pebbles with tiny shadow
    for _ in range(360):
        x, y = rng.randrange(w), rng.randrange(h)
        rx, ry = rng.randint(2, 5), rng.randint(1, 4)
        c = rng.choice([(169, 160, 142), (186, 176, 155), (145, 140, 128), (205, 194, 171)])
        tile = Image.new("RGBA", (rx * 2 + 5, ry * 2 + 5), (0, 0, 0, 0))
        td = ImageDraw.Draw(tile)
        td.ellipse((2, 2, 2 + rx * 2, 2 + ry * 2), fill=(52, 48, 42, 55))
        td.ellipse((1, 1, 1 + rx * 2, 1 + ry * 2), fill=c + (255,))
        wrap_paste(base, tile, x - rx, y - ry)
    # faint raked patches
    for _ in range(14):
        x, y = rng.randrange(w), rng.randrange(h)
        rw, rh = rng.randint(50, 160), rng.randint(12, 40)
        ov = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        od.ellipse((x - rw, y - rh, x + rw, y + rh), fill=(246, 238, 219, 15))
        base = Image.alpha_composite(base, ov.filter(ImageFilter.GaussianBlur(12)))
    save(base, "gravel.png")


def stone_texture():
    w = h = 256
    base = Image.new("RGBA", (w, h), (172, 175, 164, 255))
    n = noise_layer(w, h, octaves=4)
    arr = np.array(base, np.float32)
    arr[:, :, :3] += (n[:, :, :1] - 0.5) * 30
    arr[:, :, :3] += np_rng.normal(0, 4, (h, w, 1))
    base = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(base)
    for _ in range(900):
        x, y = rng.randrange(w), rng.randrange(h)
        c = rng.choice([(145, 149, 140), (190, 191, 179), (124, 130, 123)])
        d.point((x, y), fill=c)
    for _ in range(7):
        x0, y0 = rng.randrange(w), rng.randrange(h)
        pts = [(x0, y0)]
        for _ in range(4):
            x0 += rng.randint(-25, 25)
            y0 += rng.randint(4, 20)
            pts.append((x0, y0))
        d.line(pts, fill=(126, 132, 124, 120), width=1)
    save(base, "stone.png")


def roof_tile():
    w = h = 512
    base = Image.new("RGBA", (w, h), (55, 69, 75, 255))
    arr = np.array(base, np.float32)
    n = noise_layer(w, h, octaves=3)
    arr[:, :, :3] += (n[:, :, :1] - 0.5) * 12
    base = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(base, "RGBA")
    col = 32
    for x in range(0, w, col):
        # rounded tile ridge: highlight left of each rib, shadow at the seam
        d.rectangle((x + 1, 0, x + 3, h), fill=(78, 94, 98, 120))
        d.rectangle((x + 4, 0, x + 5, h), fill=(64, 78, 83, 80))
        d.rectangle((x + 25, 0, x + 29, h), fill=(40, 52, 58, 150))
        d.line((x + 30, 0, x + 30, h), fill=(28, 38, 44, 170))
        d.line((x + 0, 0, x + 0, h), fill=(30, 40, 46, 120))
    row = 46
    for y in range(0, h, row):
        d.rectangle((0, y, w, y + 6), fill=(43, 56, 62, 110))
        d.line((0, y + 1, w, y + 1), fill=(83, 98, 101, 80))
        d.line((0, y + 7, w, y + 7), fill=(26, 35, 41, 170))
    # subtle stains
    for _ in range(18):
        x, y = rng.randrange(w), rng.randrange(h)
        ov = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        od.ellipse((x - 40, y - 12, x + 40, y + 12), fill=(112, 126, 118, 18))
        base = Image.alpha_composite(base, ov.filter(ImageFilter.GaussianBlur(14)))
    save(base, "roof-tile.png")


def wood_texture():
    w = h = 256
    base = Image.new("RGBA", (w, h), (139, 98, 66, 255))
    arr = np.array(base, np.float32)
    n = noise_layer(w, h, octaves=4)
    arr[:, :, :3] += (n[:, :, :1] - 0.5) * 20
    base = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(base, "RGBA")
    for _ in range(44):
        x = rng.randrange(w)
        amp = rng.uniform(1, 5)
        phase = rng.uniform(0, 6.28)
        pts = [(x + math.sin(y * 0.03 + phase) * amp, y) for y in range(0, h + 4, 4)]
        c = rng.choice([(112, 76, 50, 70), (166, 121, 82, 60), (92, 62, 42, 40)])
        d.line(pts, fill=c, width=rng.choice([1, 1, 2]))
    for _ in range(5):
        x, y = rng.randrange(w), rng.randrange(h)
        d.ellipse((x - 3, y - 5, x + 3, y + 5), outline=(102, 69, 47, 90), width=1)
        d.ellipse((x - 1, y - 2, x + 1, y + 2), fill=(112, 78, 54, 80))
    save(base, "wood.png")


def plaster_texture():
    w = h = 256
    base = Image.new("RGBA", (w, h), (220, 205, 178, 255))
    arr = np.array(base, np.float32)
    n = noise_layer(w, h, octaves=4)
    arr[:, :, :3] += (n[:, :, :1] - 0.5) * 14
    arr[:, :, :3] += np_rng.normal(0, 2.2, (h, w, 1))
    base = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(base, "RGBA")
    for _ in range(700):
        x, y = rng.randrange(w), rng.randrange(h)
        d.point((x, y), fill=(190, 176, 151, 50))
    save(base, "plaster.png")


def paper_texture():
    w = h = 256
    base = Image.new("RGBA", (w, h), (239, 226, 200, 255))
    arr = np.array(base, np.float32)
    n = noise_layer(w, h, octaves=3)
    arr[:, :, :3] += (n[:, :, :1] - 0.5) * 8
    base = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(base, "RGBA")
    for _ in range(300):
        x, y = rng.randrange(w), rng.randrange(h)
        d.line((x, y, x + rng.randint(-10, 10), y + rng.randint(-2, 2)), fill=(214, 198, 168, 40))
    save(base, "paper.png")


def shadow_texture():
    w = 128
    y, x = np.mgrid[0:w, 0:w]
    d = np.sqrt((x - w / 2 + 0.5) ** 2 + (y - w / 2 + 0.5) ** 2) / (w / 2)
    a = np.clip(1 - d, 0, 1) ** 1.7
    img = np.zeros((w, w, 4), np.uint8)
    img[:, :, 0:3] = 18
    img[:, :, 3] = (a * 255).astype(np.uint8)
    save(Image.fromarray(img), "soft-shadow.png")


def glow_texture():
    w = 128
    y, x = np.mgrid[0:w, 0:w]
    d = np.sqrt((x - w / 2 + 0.5) ** 2 + (y - w / 2 + 0.5) ** 2) / (w / 2)
    a = np.clip(1 - d, 0, 1) ** 2.2
    img = np.zeros((w, w, 4), np.uint8)
    img[:, :, 0], img[:, :, 1], img[:, :, 2] = 255, 220, 150
    img[:, :, 3] = (a * 255).astype(np.uint8)
    save(Image.fromarray(img), "glow.png")


def petal_texture():
    w = h = 32
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((9, 5, 23, 22), fill=(242, 184, 190, 255))
    d.polygon([(16, 21), (11, 28), (16, 25), (21, 28)], fill=(230, 162, 172, 255))
    d.line((16, 10, 16, 25), fill=(206, 133, 148, 120), width=1)
    save(img, "petal.png")


def leaf_texture():
    w = h = 32
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((7, 11, 25, 22), fill=(176, 116, 65, 255))
    d.polygon([(25, 16), (30, 14), (26, 18)], fill=(160, 100, 57, 255))
    d.line((9, 16, 27, 16), fill=(132, 79, 48, 160), width=1)
    save(img, "leaf.png")


def process_atlas():
    src = Image.open(os.path.join(ROOT, "ref", "reimu-sweeping-atlas.png")).convert("RGBA")
    arr = np.array(src).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    spill = g - np.maximum(r, b)
    alpha = np.clip((55.0 - spill) / 38.0, 0.0, 1.0)
    # un-premultiply the green screen and clamp
    a3 = np.clip(alpha, 0.06, 1.0)[..., None]
    bg = np.array([14.0, 240.0, 17.0], np.float32)
    rgb = (arr[:, :, :3] - bg * (1.0 - a3)) / a3
    rgb = np.clip(rgb, 0, 255)
    # palette unify: a touch less saturation, a soft dark lift on the outline
    luma = rgb[:, :, 0] * 0.299 + rgb[:, :, 1] * 0.587 + rgb[:, :, 2] * 0.114
    rgb = rgb * 0.955 + luma[..., None] * 0.115
    rgb = np.clip(rgb * 0.982 + np.array([3.0, 2.2, 1.8]), 0, 255)
    dark = luma < 52
    rgb[dark] = rgb[dark] * 0.72 + np.array([45.0, 31.0, 31.0]) * 0.28
    alpha[alpha < 0.06] = 0.0
    for c in range(3):
        rgb[:, :, c][alpha <= 0] = 0
    out = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
    # drop tiny detached keying islands (keeps the silhouette clean)
    solid = out[:, :, 3] > 60
    seen = np.zeros_like(solid, dtype=bool)
    hh, ww = solid.shape
    for sy in range(hh):
        for sx in range(ww):
            if not solid[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]
            seen[sy, sx] = True
            comp = []
            while stack:
                y, x = stack.pop()
                comp.append((y, x))
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < hh and 0 <= nx < ww and solid[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if len(comp) < 18:
                for y, x in comp:
                    out[y, x, 3] = 0
    img = Image.fromarray(out, "RGBA")
    save(img, "reimu-atlas-full.png")

    W, H = img.size
    cw, ch = W // 4, H // 2
    # bbox per cell, then a shared union in cell coordinates
    boxes = []
    for row in range(2):
        for col in range(4):
            cell = img.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
            boxes.append(cell.getbbox())
    x0 = min(b[0] for b in boxes)
    y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes)
    y1 = max(b[3] for b in boxes)
    pad = 8
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(cw, x1 + pad)
    y1 = min(ch, y1 + pad)
    fw, fh = x1 - x0, y1 - y0

    frames = []
    for row in range(2):
        for col in range(4):
            cell = img.crop((col * cw + x0, row * ch + y0, col * cw + x1, row * ch + y1))
            frames.append(cell)
    # foot anchor: lowest opaque shoe row in the middle 55% of the frame
    arrf = [np.array(f)[:, :, 3] for f in frames]
    foot_xs = []
    foot_y = 0
    for a in arrf:
        occ = a > 90
        ys = np.where(occ.any(axis=1))[0]
        if len(ys) == 0:
            continue
        foot_y = max(foot_y, int(ys[-1]) + 1)
        band = occ[-10:, int(a.shape[1] * 0.28): int(a.shape[1] * 0.72)]
        xs = np.where(band.any(axis=0))[0]
        if len(xs):
            foot_xs.append(float(xs.mean()) + a.shape[1] * 0.28)
    foot_x = float(np.median(foot_xs)) if foot_xs else fw / 2
    # pack 4x2 with no padding, same cell dimensions
    dst = Image.new("RGBA", (fw * 4, fh * 2), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        dst.alpha_composite(f, ((i % 4) * fw, (i // 4) * fh))
    save(dst, "reimu-atlas.png")

    # a blurred silhouette atlas for the soft ground shadow
    shadow = Image.new("RGBA", dst.size, (0, 0, 0, 0))
    for i, f in enumerate(frames):
        alpha = f.getchannel("A").filter(ImageFilter.GaussianBlur(4.0))
        sh = Image.new("RGBA", (fw, fh), (255, 255, 255, 0))
        sh.putalpha(alpha.point(lambda v: int(v * 0.82)))
        shadow.alpha_composite(sh, ((i % 4) * fw, (i // 4) * fh))
    save(shadow, "reimu-shadow-atlas.png")

    # hand-measured shoe anchors (the scripted band detector also catches the broom)
    meta = {
        "cellW": fw,
        "cellH": fh,
        "cols": 4,
        "rows": 2,
        "frameCount": 8,
        "footX": [264.66, 259.09, 259.42, 259.96, 262.53, 255.27, 255.55, 260.19],
        "footY": [388, 388, 388, 388, 376, 378, 378, 375],
        "fps": 9,
    }
    with open(os.path.join(ROOT, "src", "atlasMeta.js"), "w", encoding="utf-8") as f:
        f.write("// Per-frame ground anchors measured from the keyed atlas (cell-local pixels).\n")
        f.write("// These track the shoes, not the broom, so the sprite can be planted on the path.\n")
        f.write("export const ATLAS = " + json.dumps(meta, indent=2) + ";\n")
    # preview over a neutral mat
    prev = Image.new("RGBA", (dst.width + 40, dst.height + 40), (86, 98, 94, 255))
    prev.alpha_composite(dst, (20, 20))
    save(prev, "reimu-preview.png")
    print("anchor", meta)


if __name__ == "__main__":
    gravel()
    stone_texture()
    roof_tile()
    wood_texture()
    plaster_texture()
    paper_texture()
    shadow_texture()
    glow_texture()
    petal_texture()
    leaf_texture()
    process_atlas()
