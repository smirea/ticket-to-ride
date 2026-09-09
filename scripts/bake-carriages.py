# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy==2.4.3", "pillow==12.1.1"]
# ///
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

FLEET = {
    "red": ("carriage", "#cf201e"),
    "blue": ("passenger", "#047ac1"),
    "green": ("flatbed", "#19854b"),
    "yellow": ("boxcar", "#efb900"),
    "black": ("coal", "#343c43"),
}
SIZE, LENGTH, SAMPLES = 192, 128, 3
INCLINATION = np.deg2rad(28)
LIGHT = np.array([-0.45, -0.65, 1.0])
LIGHT /= np.linalg.norm(LIGHT)


def mesh(model, color):
    triangles, normals, colors = [], [], []
    for part in model["parts"]:
        vertices = np.array(part["positions"]).reshape(-1, 3)
        faces = np.array(part["indices"]).reshape(-1, 3)
        tri = vertices[faces]
        area = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
        face_normals = area / np.linalg.norm(area, axis=1)[:, None]
        adjacent = {}
        for face, corners in enumerate(tri):
            for corner in corners:
                adjacent.setdefault(tuple(np.round(corner, 6)), []).append(face)
        smooth = np.empty_like(tri)
        for face, corners in enumerate(tri):
            for index, corner in enumerate(corners):
                neighbors = adjacent[tuple(np.round(corner, 6))]
                eligible = [neighbor for neighbor in neighbors if face_normals[face] @ face_normals[neighbor] > 0.707]
                normal = area[eligible].sum(axis=0)
                smooth[face, index] = normal / np.linalg.norm(normal)
        paint = color if part["material"] != "dark" else "#30373b"
        rgb = np.array([int(paint[i:i + 2], 16) for i in (1, 3, 5)])
        triangles.append(tri)
        normals.append(smooth)
        colors.extend([rgb] * len(tri))
    return np.concatenate(triangles), np.concatenate(normals), np.array(colors)


def render(triangles, normals, colors, angle):
    # Inverse projection keeps the visible car axis aligned to the board's exact route heading.
    yaw = np.arctan2(np.sin(angle) / np.cos(INCLINATION), np.cos(angle))
    c, s = np.cos(yaw), np.sin(yaw)
    rotation = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    world = triangles @ rotation.T
    normal = normals @ rotation.T
    unit_length = np.hypot(c, s * np.cos(INCLINATION))
    scale = LENGTH * SAMPLES / unit_length
    extent = SIZE * SAMPLES
    projection = np.array([[1, 0, 0], [0, np.cos(INCLINATION), -np.sin(INCLINATION)], [0, np.sin(INCLINATION), np.cos(INCLINATION)]])
    projected = world @ projection.T * scale
    projected[:, :, :2] += extent / 2
    light = np.clip(normal @ LIGHT, 0, 1)
    brightness = 0.57 + light * 0.52
    paint = np.clip(colors[:, None, :] * brightness[:, :, None], 0, 255)
    depth = np.full((extent, extent), -np.inf)
    pixels = np.zeros((extent, extent, 4), dtype=np.uint8)
    for triangle, shades in zip(projected, paint):
        low = np.maximum(np.floor(triangle[:, :2].min(axis=0)).astype(int), 0)
        high = np.minimum(np.ceil(triangle[:, :2].max(axis=0)).astype(int), extent - 1)
        if np.any(high < low):
            continue
        x, y = np.meshgrid(np.arange(low[0], high[0] + 1) + 0.5, np.arange(low[1], high[1] + 1) + 0.5)
        a, b, c = triangle
        determinant = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(determinant) < 1e-8:
            continue
        u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / determinant
        v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / determinant
        w = 1 - u - v
        z = u * a[2] + v * b[2] + w * c[2]
        target = depth[low[1]:high[1] + 1, low[0]:high[0] + 1]
        mask = (u >= 0) & (v >= 0) & (w >= 0) & (z > target)
        target[mask] = z[mask]
        rgb = u[:, :, None] * shades[0] + v[:, :, None] * shades[1] + w[:, :, None] * shades[2]
        buffer = pixels[low[1]:high[1] + 1, low[0]:high[0] + 1]
        buffer[mask, :3] = np.clip(rgb[mask], 0, 255).astype(np.uint8)
        buffer[mask, 3] = 255
    shadow = Image.new("RGBA", (extent, extent))
    draw = ImageDraw.Draw(shadow)
    floor = world.copy()
    floor[:, :, 0] += floor[:, :, 2] * 0.25
    floor[:, :, 1] += floor[:, :, 2] * 0.45
    floor[:, :, 2] = 0
    floor = floor @ projection.T * scale
    floor[:, :, :2] += extent / 2
    for triangle in floor:
        draw.polygon([tuple(point[:2]) for point in triangle], fill=(18, 23, 21, 55))
    shadow = shadow.filter(ImageFilter.GaussianBlur(1.4 * SAMPLES))
    shadow.alpha_composite(Image.fromarray(pixels))
    return shadow.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main(source, output, preview):
    asset = json.loads(source.read_text())
    models = {model["id"]: model for model in asset["models"]}
    output.mkdir(parents=True, exist_ok=True)
    contact = Image.new("RGB", (SIZE * 6, (SIZE + 26) * 5), "#e8dfc8")
    label = ImageDraw.Draw(contact)
    sheets = {}
    for row, (color, (model_id, hex_color)) in enumerate(FLEET.items()):
        geometry = mesh(models[model_id], hex_color)
        sheet = Image.new("RGBA", (SIZE * 6, SIZE * 6))
        for heading in range(36):
            frame = render(*geometry, np.deg2rad(heading * 10))
            assert frame.getbbox() is not None
            box = frame.getbbox()
            assert box[0] > 0 and box[1] > 0 and box[2] < SIZE and box[3] < SIZE, (color, heading, box)
            sheet.paste(frame, ((heading % 6) * SIZE, (heading // 6) * SIZE))
            if heading % 6 == 0:
                x, y = (heading // 6) * SIZE, row * (SIZE + 26)
                contact.paste(frame, (x, y), frame)
                label.text((x + 12, y + SIZE), f"{color} / {model_id} / {heading * 10} deg", fill="#24343b")
        filename = f"carriage-{color}.webp"
        sheet.save(output / filename, lossless=True, method=6, exact=True)
        sheets[color] = f"/game-assets/trains/{filename}"
        print(f"{color}: {(output / filename).stat().st_size:,} bytes", flush=True)
    manifest = {"version": 1, "frameSize": SIZE, "columns": 6, "rows": 6, "anchor": {"x": SIZE / 2, "y": SIZE / 2}, "pixelsPerModelUnit": LENGTH, "headings": 36, "headingStep": 10, "inclinationDegrees": 28, "sheets": sheets, "models": {color: model for color, (model, _) in FLEET.items()}, "sourceSha256": asset["sourceSha256"]}
    (output / "carriage-sprites.json").write_text(json.dumps(manifest, indent=2) + "\n")
    preview.parent.mkdir(parents=True, exist_ok=True)
    contact.save(preview)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("scripts/assets/printables-trains.json"))
    parser.add_argument("--output", type=Path, default=Path("apps/ui/static/game-assets/trains"))
    parser.add_argument("--preview", type=Path, default=Path("artifacts/carriage-bake/contact-sheet.png"))
    args = parser.parse_args()
    main(args.source, args.output, args.preview)
