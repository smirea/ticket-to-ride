# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy==2.4.3", "fast-simplification==0.2.0"]
# ///
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

import fast_simplification
import numpy as np

MODELS = [
    ("carriage", "Panelled carriage", 43, [(1, "dark", 800), (5, "body", 1100)]),
    ("passenger", "Passenger coach", 43, [(2, "dark", 800), (6, "body", 1100)]),
    ("boxcar", "Box wagon", 43, [(3, "dark", 800), (4, "body", 1100)]),
    ("flatbed", "Open flatbed", 36, [(38, "body", 1900)]),
    ("coal", "Coal wagon", 56, [(82, "dark", 750), (83, "body", 250), (84, "dark", 900)]),
    ("caboose", "Raised-roof caboose", 50, [(45, "dark", 750), (49, "body", 1150)]),
    ("hopper", "Covered hopper", 50, [(46, "dark", 750), (50, "body", 1150)]),
    ("tanker", "Tank wagon", 50, [(47, "dark", 750), (48, "body", 1150)]),
]


def mesh(archive, assembly, object_id):
    root = ET.fromstring(archive.read(f"3D/Objects/Assembly_{assembly}.model"))
    obj = next(item for item in root.findall(".//{*}object") if int(item.attrib["id"]) == object_id)
    component = next(item for item in root.findall(".//{*}component") if int(item.attrib["objectid"]) == object_id)
    transform = np.array([float(value) for value in component.attrib["transform"].split()])
    vertices = np.array([[float(vertex.attrib[axis]) for axis in ("x", "y", "z")] for vertex in obj.findall(".//{*}vertex")])
    vertices = vertices @ transform[:9].reshape(3, 3) + transform[9:]
    faces = np.array([[int(face.attrib[axis]) for axis in ("v1", "v2", "v3")] for face in obj.findall(".//{*}triangle")], dtype=np.int32)
    return vertices, faces


def pack(vertices, faces, material, source_id):
    used, indices = np.unique(faces.flatten(), return_inverse=True)
    return {"material": material, "sourceObject": source_id, "positions": np.round(vertices[used], 6).flatten().tolist(), "indices": indices.tolist()}


def convert(source, destination):
    models = []
    archive = zipfile.ZipFile(source)
    for model_id, name, assembly, definitions in MODELS:
        originals = [(source_id, material, budget, *mesh(archive, assembly, source_id)) for source_id, material, budget in definitions]
        all_vertices = np.concatenate([part[3] for part in originals])
        minimum, maximum = all_vertices.min(axis=0), all_vertices.max(axis=0)
        origin = np.array([(minimum[0] + maximum[0]) / 2, (minimum[1] + maximum[1]) / 2, minimum[2]])
        length = maximum[0] - minimum[0]
        height = (maximum[2] - minimum[2]) / length
        parts = []
        for source_id, material, budget, vertices, faces in originals:
            vertices, faces = fast_simplification.simplify(vertices, faces, target_count=budget, agg=7)
            vertices = (vertices - origin) / length
            triangles = vertices[faces]
            normals = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
            centers = triangles.mean(axis=1)
            # Material accents partition original faces; no decorative replacement geometry is introduced.
            trim = (centers[:, 2] > height - 0.035) & (normals[:, 2] > np.linalg.norm(normals, axis=1) * 0.45) if material == "body" else np.zeros(len(faces), dtype=bool)
            chassis = (centers[:, 2] < 0.075) if model_id == "flatbed" else np.zeros(len(faces), dtype=bool)
            for role, mask in [("trim", trim & ~chassis), ("dark", chassis), (material, ~trim & ~chassis)]:
                if mask.any():
                    parts.append(pack(vertices, faces[mask], role, source_id))
        reduced = np.concatenate([np.array(part["positions"]).reshape(-1, 3) for part in parts])
        low, high = reduced.min(axis=0), reduced.max(axis=0)
        center = np.array([(low[0] + high[0]) / 2, (low[1] + high[1]) / 2, low[2]])
        for part in parts:
            vertices = np.array(part["positions"]).reshape(-1, 3)
            vertices = np.round((vertices - center) / (high[0] - low[0]), 6)
            faces = np.array(part["indices"]).reshape(-1, 3)
            triangles = vertices[faces]
            area = np.linalg.norm(np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0]), axis=1)
            part.update(pack(vertices, faces[area > 1e-12], part["material"], part["sourceObject"]))
        count = sum(len(part["indices"]) // 3 for part in parts)
        model = {"id": model_id, "name": name, "sourceAssembly": assembly, "sourceObjects": [part[0] for part in definitions], "sourceTriangles": sum(len(part[4]) for part in originals), "triangles": count, "parts": parts}
        models.append(model)
        print(f"{model_id}: {model['sourceTriangles']} → {count} triangles, {len(parts)} material parts")
    result = {"version": 1, "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "coordinates": "X longitudinal, Y width, Z up; X length 1, centered XY, floor Z 0", "models": models}
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"Wrote {destination}: {destination.stat().st_size:,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("apps/ui/static/game-assets/trains/printables-trains.json"))
    arguments = parser.parse_args()
    convert(arguments.source, arguments.output)
