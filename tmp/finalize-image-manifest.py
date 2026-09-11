import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
records = {}
for path in [root / 'tmp/initial-product-images.json', *sorted((root / 'tmp').glob('image-*.json')), root / 'tmp/mango-corrected.json']:
    for item in json.loads(path.read_text(encoding='utf-8')):
        records[(item['slug'], item['index'])] = item
assets = []
for (slug, index), item in sorted(records.items()):
    base = f'src/assets/catalog-{slug}-{index}'
    files = [base + '.jpg', base + '-640.webp', base + '-1024.webp']
    for file in files:
        assert (root / file).is_file(), file
    assets.append({'product': slug, 'files': files, 'prompt': item['prompt']})
assert len(assets) == 111, len(assets)
(root / 'docs').mkdir(exist_ok=True)
(root / 'docs/product-image-prompts.json').write_text(json.dumps({'generator': 'Built-in image_gen', 'assets': assets}, indent=2) + '\n', encoding='utf-8')
print(f'Saved prompts and verified all three image formats for {len(assets)} generated photos.')
