"""Rewrite the scene textures as lossless WebP, verifying every pixel survives."""

from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent / "public" / "assets"
KEEP = {".webp"}


def main() -> None:
    total_png = 0
    total_webp = 0
    for src in sorted(ROOT.glob("*.png")):
        dst = src.with_suffix(".webp")
        before = src.stat().st_size
        img = Image.open(src)
        img.load()
        mode = img.mode
        img.save(dst, "WEBP", lossless=True, quality=100, method=6)

        back = Image.open(dst)
        back.load()
        diff = ImageChops.difference(img.convert("RGBA"), back.convert("RGBA"))
        if diff.getbbox() is not None:
            raise SystemExit(f"NOT lossless: {src.name}")
        if back.size != img.size or back.mode != mode:
            raise SystemExit(f"SHAPE CHANGED: {src.name} {img.mode} {img.size} -> {back.mode} {back.size}")

        after = dst.stat().st_size
        total_png += before
        total_webp += after
        print(f"{src.name:26} {before/1024:8.1f}K -> {after/1024:8.1f}K  {after/before*100:5.1f}%")

    print(f"{'TOTAL':26} {total_png/1024:8.1f}K -> {total_webp/1024:8.1f}K  {total_webp/total_png*100:5.1f}%")


if __name__ == "__main__":
    main()
