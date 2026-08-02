#!/usr/bin/env python3
"""
Generate the PWA icons in public/.

The mark is the line itself: a stretch of track with three stops and the amber
you-are-here marker between them - the same language as the route map, with no
letterform. Drawn from the app's palette so the home screen icon and the app
agree.

    python3 scripts/build-icons.py

Two purposes are produced:
  icon-{192,512}.png            rounded, for iOS and anywhere the icon is used as-is
  icon-{192,512}-maskable.png   full bleed with the mark inside the safe zone, so
                                Android can crop it to a circle/squircle without
                                clipping the artwork

Everything is drawn at 4x and downsampled, which is what gives clean edges.
"""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public"

PAPER = "#f3f3f0"
TEAL = "#0a8ea0"
AMBER = "#e8992f"
TRACK = "#d5d5cd"  # unreached track - darker than the UI hairline so it holds at 40px

SS = 4  # supersample factor


def draw(size: int, maskable: bool) -> Image.Image:
    px = size * SS
    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # The plain icon carries its own rounded corners with transparency outside.
    # A maskable icon must bleed to the edges - the OS supplies the shape, and
    # rounding it here would show as a notch inside the OS mask.
    if maskable:
        d.rectangle([0, 0, px, px], fill=PAPER)
    else:
        d.rounded_rectangle([0, 0, px - 1, px - 1], radius=int(px * 0.22), fill=PAPER)

    # Unit -> pixel. The mark shrinks for maskable so it clears Android's safe zone.
    k = 0.82 if maskable else 1.0
    def u(v: float) -> float:
        return (50 + (v - 50) * k) * px / 100

    # Stops are small and well separated so the rail stays visible between them -
    # the mark has to read as a line with stations, not a stack of blobs.
    rail = max(1, round(u(50 + 2.5) - u(50 - 2.5)))
    top, mid, bot = 18.0, 50.0, 82.0

    d.line([(u(50), u(top)), (u(50), u(bot))], fill=TRACK, width=rail)
    d.line([(u(50), u(top)), (u(50), u(mid))], fill=TEAL, width=rail)

    def dot(cy: float, r: float, fill, outline=None, w: float = 0):
        box = [u(50 - r), u(cy - r), u(50 + r), u(cy + r)]
        d.ellipse(box, fill=fill, outline=outline,
                  width=max(1, round(u(50 + w) - u(50))) if w else 0)

    dot(top, 8.5, TEAL)                       # a stop already passed
    dot(bot, 8.0, PAPER, outline=TRACK, w=3)  # a stop still ahead
    dot(mid, 11.0, AMBER)                     # you are here - the focal point

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    for size in (192, 512):
        for maskable in (False, True):
            name = f"icon-{size}{'-maskable' if maskable else ''}.png"
            draw(size, maskable).save(OUT / name, optimize=True)
            print(f"  {name:<24} {(OUT / name).stat().st_size:>6,} bytes")

    # iOS ignores the manifest icons for Add to Home Screen and renders any
    # transparency as black, so it gets its own square, fully opaque copy at the
    # size it asks for. iOS applies its own rounding.
    art = draw(180, maskable=False)
    apple = Image.new("RGB", (180, 180), PAPER)
    apple.paste(art, (0, 0), art)  # flattening onto paper also squares off the corners
    apple.save(OUT / "apple-touch-icon.png", optimize=True)
    print(f"  {'apple-touch-icon.png':<24} {(OUT / 'apple-touch-icon.png').stat().st_size:>6,} bytes")


if __name__ == "__main__":
    main()
