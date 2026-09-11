import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path

BASE = 'http://127.0.0.1:5173'
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.images = []
        self.buttons = []
        self.sources = []
        self.links = set()
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'a' and a.get('href', '').startswith('/products/'):
            self.links.add(a['href'].split('?')[0].rstrip('/'))
        if tag == 'div':
            if self.depth:
                self.depth += 1
            elif a.get('role') == 'group' and a.get('aria-label', '').endswith('image gallery'):
                self.depth = 1
        if self.depth:
            if tag == 'img': self.images.append(a['src'])
            if tag == 'button': self.buttons.append(a)
            if tag == 'source': self.sources.extend(s.strip().split(' ')[0] for s in a['srcset'].split(','))
    def handle_endtag(self, tag):
        if tag == 'div' and self.depth: self.depth -= 1

def fetch(path):
    with urllib.request.urlopen(BASE + path, timeout=60) as response:
        assert response.status == 200, path
        return response.read()

def verify(slug):
    p = Page()
    p.feed(fetch('/products/' + slug).decode())
    assert len(p.buttons) >= 2, (slug, 'missing thumbnails')
    assert p.images[0].split('?')[0].endswith('/catalog-' + slug + '-1.jpg'), (slug, p.images[0])
    assert p.buttons[0].get('aria-current') == 'true', slug
    assert all(b.get('aria-current') == 'false' for b in p.buttons[1:]), slug
    thumbnails = p.images[1:]
    assert len(thumbnails) == len(set(thumbnails)) == len(p.buttons), slug
    for path in set(p.images + p.sources):
        fetch(path)
    return slug, len(p.buttons)

plan = json.loads(Path('tmp/product-image-plan.json').read_text())
slugs = [entry[0] for entry in plan]
catalog = Page()
catalog.feed(fetch('/products/').decode())
assert all('/products/' + slug in catalog.links for slug in slugs), 'Missing product links'
with ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(verify, slugs))
print(f'PASS: {len(results)} product links and detail pages, {sum(n for _, n in results)} unique gallery photos, all JPG/WebP URLs return HTTP 200.')
