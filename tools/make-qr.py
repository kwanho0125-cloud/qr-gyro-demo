#!/usr/bin/env python3
"""Generate a high-contrast QR PNG for the live demo URL."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

def main() -> int:
    parser = argparse.ArgumentParser(description="Write a QR code PNG for a URL.")
    parser.add_argument("url")
    parser.add_argument("output", nargs="?", default="qr.png")
    args = parser.parse_args()

    try:
        import qrcode
        from qrcode.constants import ERROR_CORRECT_M
    except ImportError:
        sys.stderr.write("Install dependencies first: pip install qrcode pillow\n")
        return 1

    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_M, box_size=16, border=4)
    qr.add_data(args.url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    out = Path(args.output)
    img.convert("RGB").save(out)
    print(f"Wrote {out.resolve()} for {args.url}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
