import hashlib
import importlib.metadata
import json
import tempfile
from pathlib import Path

import pdf_inspector
import pymupdf

ROOT = Path(__file__).resolve().parent


def main():
    catalog = json.loads((ROOT / "catalog.json").read_text())
    total_pages = 0
    for entry in catalog["entries"]:
        folder = ROOT / entry["folder"]
        source = folder / "rules.pdf"
        metadata_path = folder / "sources.json"
        metadata = json.loads(metadata_path.read_text())
        images = folder / "images"
        images.mkdir(exist_ok=True)
        pages = []
        parts = [
            f'# {entry["name"]}',
            '[Source PDF](rules.pdf) · [Map reference](' + metadata["map"]["path"] + ')',
            'Parsed locally with pdf-inspector. Original page images preserve diagrams, tables, and layout; consult them where extraction is unclear.',
        ]
        with pymupdf.open(source) as document, tempfile.TemporaryDirectory() as temp:
            for index, page in enumerate(document):
                page_number = index + 1
                single_page = Path(temp) / "page.pdf"
                with pymupdf.open() as excerpt:
                    excerpt.insert_pdf(document, from_page=index, to_page=index)
                    excerpt.save(single_page)
                result = pdf_inspector.process_pdf(str(single_page))
                image_path = f"images/rules-page-{page_number:03}.png"
                scale = 2000 / max(page.rect.width, page.rect.height)
                page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False).save(folder / image_path)
                text = (result.markdown or "").strip()
                parts.extend([
                    f"## PDF page {page_number}",
                    text or "The parser returned no text for this page. Refer to the page image below.",
                    f"![Original PDF page {page_number}, including diagrams and tables]({image_path})",
                ])
                pages.append({
                    "pdf_page": page_number,
                    "image_path": image_path,
                    "extracted_characters": len(text),
                    "ocr_recommended": bool(result.pages_needing_ocr),
                    "has_encoding_issues": result.has_encoding_issues,
                })
        (folder / "rules.md").write_text("\n\n".join(parts) + "\n")
        metadata["markdown"] = {
            "path": "rules.md",
            "type": "parsed-rulebook",
            "parser": "pdf-inspector",
            "parser_version": importlib.metadata.version("pdf-inspector"),
            "source_pdf_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "coverage": "All PDF pages, including non-English and printable component pages where present.",
            "ocr_enabled": False,
            "image_method": "Full-page renders preserve raster and vector diagrams without dropping figure labels.",
            "pages": pages,
        }
        metadata["files"] = {
            str(path.relative_to(folder)): {
                "bytes": path.stat().st_size,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
            for path in sorted(folder.rglob("*"))
            if path.is_file() and path != metadata_path
        }
        metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
        total_pages += len(pages)
        print(f'{entry["folder"]}: {len(pages)} pages', flush=True)
    print(f'Parsed {len(catalog["entries"])} rulebooks, {total_pages} pages.')


if __name__ == "__main__":
    main()
