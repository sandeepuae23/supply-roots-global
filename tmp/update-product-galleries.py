import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
plan = json.loads((root / 'tmp/product-image-plan.json').read_text())
imports, rows = [], []
for slug, subject, existing in plan:
    photos = [f'catalog-{slug}-{i}' for i in (1, 2) if (root / f'src/assets/catalog-{slug}-{i}.jpg').exists()]
    if existing:
        photos.append(existing)
    if not photos:
        continue
    names = []
    for photo in photos:
        name = 'photo' + str(len(imports))
        imports.append(f'import {name} from "@/assets/{photo}.jpg";')
        names.append(name)
    rows.append(f'  "{slug}": [{", ".join(names)}],')
(root / 'src/data/product-images.ts').write_text('\n'.join(imports) + '\n\n/** Product-specific gallery photos, hero first. */\nexport const productGalleries: Record<string, string[]> = {\n' + '\n'.join(rows) + '\n};\n', encoding='utf-8')
print(f'Updated {len(rows)} product galleries')
