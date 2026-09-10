import hashlib
import importlib.metadata
import json
from pathlib import Path

import pdf_inspector
import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parent


def main():
    catalog = json.loads((ROOT / "catalog.json").read_text())
    errors = []
    documents = []
    image_count = 0
    cache = {}
    for entry in catalog["entries"]:
        folder = ROOT / entry["folder"]
        metadata = json.loads((folder / "sources.json").read_text())
        required = ["rules.md", f'{entry["id"]}-map.png']
        if entry["asset_status"] == "source-kit-present":
            required.append("rules.pdf")
        for name in required:
            if not (folder / name).is_file():
                errors.append(f'{entry["id"]}: missing {name}')
        for name, expected in metadata["files"].items():
            path = folder / name
            if not path.is_file():
                errors.append(f'{entry["id"]}: missing recorded file {name}')
                continue
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest != expected["sha256"] or path.stat().st_size != expected["bytes"]:
                errors.append(f'{entry["id"]}: hash/size mismatch for {name}')
            if path.suffix == ".png":
                with Image.open(path) as image:
                    image.verify()
                image_count += 1
            if path.suffix != ".pdf":
                continue
            try:
                if digest not in cache:
                    result = pdf_inspector.process_pdf(str(path))
                    with pymupdf.open(path) as document:
                        pages = len(document)
                        for page in document:
                            page.get_pixmap(matrix=pymupdf.Matrix(0.15, 0.15))
                    if result.page_count != pages:
                        errors.append(f"{path.relative_to(ROOT)}: parser page-count mismatch")
                    cache[digest] = {
                        "page_count": pages,
                        "pdf_type": result.pdf_type,
                        "pages_needing_ocr": result.pages_needing_ocr,
                        "has_encoding_issues": result.has_encoding_issues,
                        "extracted_markdown_characters": len(result.markdown or ""),
                        "processing_time_ms": result.processing_time_ms,
                    }
                documents.append({"path": str(path.relative_to(ROOT)), "sha256": digest, **cache[digest]})
            except Exception as error:
                errors.append(f"{path.relative_to(ROOT)}: {error}")
    report = {
        "pdf_inspector_version": importlib.metadata.version("pdf-inspector"),
        "pymupdf_version": importlib.metadata.version("pymupdf"),
        "ocr_enabled": False,
        "notes": [
            "Parser output was measured but is not persisted as full rulebook text.",
            "OCR recommendations are heuristics; illustrated covers and board/ticket sheets may legitimately lack text.",
            "Passing checks means files decode and match their manifest, not that rule semantics or reading order are verified.",
            "Duplicate PDF bytes reuse the same inspection result and timing.",
        ],
        "folder_count": len(catalog["entries"]),
        "missing_rules_pdf": catalog["missing_pdf_folders"],
        "pdf_file_count": len(documents),
        "unique_pdf_count": len(cache),
        "verified_png_count": image_count,
        "documents": documents,
        "errors": errors,
    }
    (ROOT / "inspection.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in ["folder_count", "pdf_file_count", "unique_pdf_count", "verified_png_count", "missing_rules_pdf", "errors"]}, indent=2))
    raise SystemExit(bool(errors))


if __name__ == "__main__":
    main()
