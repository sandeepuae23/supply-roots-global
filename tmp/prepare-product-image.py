import json, sys
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
for item in json.loads(Path(sys.argv[1]).read_text(encoding='utf-8')):
    base = root / 'src' / 'assets' / ('catalog-' + item['slug'] + '-' + str(item['index']))
    source = Image.open(item['path']).convert('RGB')
    ImageOps.contain(source, (1254, 1254)).save(str(base) + '.jpg', quality=88, optimize=True)
    for width in (640, 1024):
        im = ImageOps.contain(source, (width, width))
        im.save(str(base) + '-' + str(width) + '.webp', quality=82, method=6)
    print(base.name)
