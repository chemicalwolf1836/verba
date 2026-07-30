#!/usr/bin/env python3
"""
Rebuild the self-hosted webfonts in public/fonts/.

Verba ships its fonts inside the app so it keeps working with no network. The
Japanese face is subset to exactly the glyphs the course data uses, plus the full
kana ranges - a full Japanese font is megabytes, which is not something to make a
commuter download.

Re-run this after changing vocabulary:

    python3 scripts/build-fonts.py

Any Japanese glyph not in the subset falls back to the platform gothic stack, so
a missed regeneration degrades to the pre-2026-07 behaviour rather than to tofu.
"""

import re
import ssl
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

ssl._create_default_https_context = ssl._create_unverified_context


def course_glyphs() -> str:
    """Every Japanese character appearing in the course data, plus all kana."""
    src = ""
    for name in ("bjt.ts", "shadow.ts"):
        src += (ROOT / "lib" / "courses" / name).read_text(encoding="utf-8")
    used = set(re.findall(r"[　-〿぀-ヿ㐀-䶿一-鿿＀-￯]", src))
    kana = {chr(c) for c in range(0x3041, 0x3097)} | {chr(c) for c in range(0x30A1, 0x30FB)}
    return "".join(sorted(used | kana | set("ー・、。")))


def css(family: str, text: str | None = None) -> str:
    query = {"family": family}
    if text:
        query["text"] = text
    url = "https://fonts.googleapis.com/css2?" + urllib.parse.urlencode(query)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=60).read().decode()


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=60).read()


def latin_only(sheet: str) -> str:
    """The latin @font-face url. Google returns one block per script; without a
    text= subset we only want latin, not cyrillic/greek/vietnamese."""
    blocks = re.split(r"/\*\s*([\w-]+)\s*\*/", sheet)
    for i in range(1, len(blocks) - 1, 2):
        if blocks[i] == "latin":
            found = re.search(r"src:\s*url\(([^)]+)\)\s*format\('woff2'\)", blocks[i + 1])
            if found:
                return found.group(1)
    raise SystemExit("no latin subset found")


def only_url(sheet: str) -> str:
    found = re.search(r"src:\s*url\(([^)]+)\)\s*format\('woff2'\)", sheet)
    if not found:
        raise SystemExit("no woff2 found")
    return found.group(1)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    glyphs = course_glyphs()
    print(f"Japanese subset: {len(glyphs)} glyphs")

    for weight in (400, 600, 700):
        data = download(latin_only(css(f"Manrope:wght@{weight}")))
        (OUT / f"manrope-{weight}.woff2").write_bytes(data)
        print(f"  manrope-{weight}.woff2  {len(data):>7,} bytes")

    for weight in (400, 700):
        data = download(only_url(css(f"Zen Kaku Gothic New:wght@{weight}", glyphs)))
        (OUT / f"zenkaku-{weight}.woff2").write_bytes(data)
        print(f"  zenkaku-{weight}.woff2  {len(data):>7,} bytes")


if __name__ == "__main__":
    main()
