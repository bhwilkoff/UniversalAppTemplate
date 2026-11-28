#!/usr/bin/env python3
"""Ideas at Play's models as a catalog the add-on reads (assets/ideas-at-play.json).

Reads ideasatplay.org's own pages: the home page's list of models, then each
model's page for its title, author, newest version, and description. Every
model is CC BY 4.0 (each page says so; the site's terms, section 4), and Alexis
Diamond approved this use (Ben, November 28, 2026). Nothing here is written by
us: the add-on shows each model by its own name and credits it as its page asks.

    python3 tools/ideas-at-play/catalog.py
"""
import html, json, re, sys, time, urllib.request
from pathlib import Path

SITE = 'https://ideasatplay.org'
OUT = Path(__file__).resolve().parents[2] / 'assets' / 'ideas-at-play.json'
UA = {'User-Agent': 'Mozilla/5.0 (compatible; human-shaped-catalog/1.0)'}

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode('utf-8', 'replace')

def one(slug):
    s = html.unescape(get(SITE + '/artifacts/' + slug))
    title = re.search(r'<title>(.*?)</title>', s)
    title = title.group(1).replace(' · Ideas at Play', '').strip() if title else None
    vs = [int(v) for v in re.findall(r'/play/' + re.escape(slug) + r'\?v=(\d+)', s)]
    desc = re.search(r'og:description" content="([^"]*)"', s)
    # The page's own "Cite this": "<author> (<year>). <title> ... version N."
    author = re.search(r'([A-Z][^<>"\\(){}]{1,80}?) \((20\d\d)\)\. ' + re.escape((title or '')[:25]), s)
    licensed = 'creativecommons.org/licenses/by/4.0' in s
    if not (title and vs and licensed):
        return None
    return {
        'slug': slug, 'title': title, 'v': max(vs),
        'author': author.group(1) if author else None, 'year': int(author.group(2)) if author else None,
        'about': desc.group(1).strip()[:300] if desc else None,
    }

def main():
    home = get(SITE + '/')
    slugs = sorted(set(re.findall(r'/artifacts/([a-z0-9-]+-[0-9a-f]{6})\b', home)))
    out, skipped = [], []
    for slug in slugs:
        try:
            m = one(slug)
        except Exception as e:
            m = None
        (out.append(m) if m else skipped.append(slug))
        time.sleep(1)
    out.sort(key=lambda m: m['title'].lower())
    OUT.write_text(json.dumps({'source': SITE, 'license': 'CC BY 4.0', 'read': time.strftime('%Y-%m-%d'), 'models': out}, indent=1, ensure_ascii=False) + '\n')
    print(len(out), 'models,', len(skipped), 'skipped', skipped[:5])

if __name__ == '__main__':
    main()
