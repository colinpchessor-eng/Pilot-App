import glob
import os
import re
import sys


def _frame_index(path: str) -> int:
    name = os.path.basename(path)
    m = re.search(r"frame_(\d+)", name, re.IGNORECASE)
    return int(m.group(1)) if m else 0


def _frame_delay_ms(path: str) -> int:
    name = os.path.basename(path)
    m = re.search(r"delay-([0-9.]+)s\.webp$", name, re.IGNORECASE)
    if not m:
        return 41
    try:
        return int(float(m.group(1)) * 1000)
    except Exception:
        return 41


def main() -> int:
    frames_dir = os.path.join("public", "assets", "network-map.webp")
    out_path = os.path.join("public", "assets", "network-map-animated.webp")

    # If the repo has frames stored under a folder named "network-map.webp",
    # this script can merge them into a single animated WebP file at /public/assets/network-map.webp.
    if not os.path.isdir(frames_dir):
        print(f"Frames folder not found: {frames_dir}")
        print("Expected: public/assets/network-map.webp/frame_000_delay-...webp")
        return 1

    frame_paths = glob.glob(os.path.join(frames_dir, "*.webp"))
    if not frame_paths:
        print(f"No .webp frames found in: {frames_dir}")
        return 1

    frame_paths.sort(key=lambda p: (_frame_index(p), os.path.basename(p)))

    try:
        from PIL import Image  # type: ignore
    except Exception:
        print("Missing dependency: Pillow")
        print("Run: pip install pillow")
        return 1

    images = []
    durations_ms = []
    for p in frame_paths:
        images.append(Image.open(p).convert("RGBA"))
        durations_ms.append(_frame_delay_ms(p))

    first, rest = images[0], images[1:]

    # Ensure output directory exists
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    first.save(
        out_path,
        format="WEBP",
        save_all=True,
        append_images=rest,
        duration=durations_ms,
        loop=0,
        quality=85,
        method=6,
    )

    print(f"\nDone! Saved to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

