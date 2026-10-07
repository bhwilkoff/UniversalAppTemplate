#!/usr/bin/env python3
"""Write a page on this site for every page of the template's stuck library.

Curriculum C7. Each page is a folder with an index.html that names its
template file with data-doc, so assets/render.js reads the current text
from the template's main branch, the way /path/ and /teach/guide/ do. The
list of pages is assets/curriculum-pages-lib.js (STUCK), read through node,
so the site has one list. Run from the site's root:

    python3 tools/make_stuck_pages.py

It rewrites stuck/**/index.html and the stuck entries in sitemap.xml, and
changes nothing else.
"""
import html
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(ROOT, 'teach', 'guide', 'week-1', 'index.html')

pages = json.loads(subprocess.check_output(
    ['node', '-e', "process.stdout.write(JSON.stringify(require('./assets/curriculum-pages-lib.js').STUCK))"],
    cwd=ROOT))
by_url = {p['url']: p for p in pages}
model = open(MODEL, encoding='utf-8').read()
head_end = model.index('<body>')
header = model[model.index('<header class="site-header">'):model.index('</header>', model.index('<header class="site-header">')) + len('</header>')]
footer = model[model.index('<footer class="site-footer">'):model.index('</footer>') + len('</footer>')]
scripts = re.findall(r'  <script src="[^"]*(?:site\.js|marked|purify|render\.js)[^"]*"[^>]*></script>\n', model)
style_head = model[model.index('  <link rel="icon"'):model.index('  <script src="/assets/site.js"')]

# The header marks no section as current on these pages.
header = header.replace(' aria-current="true"', '')

DESCRIPTION = 'When you are stuck building with your agent: a question to ask yourself first, what to try, and who to ask.'


def esc(s):
    return html.escape(s, quote=True)


def nav_for(page):
    move = page['move']
    items = [p for p in pages if p['move'] is None or p['url'].endswith(('/writing/', '/playing/', '/publishing/'))]
    if move:
        items += [p for p in pages if p['move'] == move and not p['doc'].endswith('README.md')]
    out = []
    for p in items:
        cur = ' aria-current="page"' if p['url'] == page['url'] else ''
        nested = p['move'] == move and move and not p['doc'].endswith('README.md')
        cls = ' class="sub"' if nested else ''
        out.append('            <li%s><a href="%s"%s><span aria-hidden="true"></span>%s</a></li>' % (cls, p['url'], cur, esc(p['title'])))
    return '\n'.join(out)


def crumbs_for(page):
    parts = ['<a href="/cohorts/">Cohorts</a>']
    if page['url'] != '/stuck/':
        parts.append('<a href="/stuck/">When you are stuck</a>')
    if page['move'] and not page['doc'].endswith('README.md'):
        mv = by_url['/stuck/%s/' % page['move']]
        parts.append('<a href="%s">%s</a>' % (mv['url'], esc(mv['title'])))
    parts.append(esc(page['title']))
    return ' &rsaquo; '.join(parts)


def neighbors(page):
    i = pages.index(page)
    prev = pages[i - 1] if i > 0 else None
    nxt = pages[i + 1] if i + 1 < len(pages) else None
    links = []
    if prev:
        links.append('            <a href="%s">%s</a>' % (prev['url'], esc(prev['title'])))
    if nxt:
        links.append('            <a href="%s">%s</a>' % (nxt['url'], esc(nxt['title'])))
    return '\n'.join(links)


def page_html(page):
    title = page['title']
    url = 'https://humanshaped.org' + page['url']
    gh = 'https://github.com/bhwilkoff/UniversalAppTemplate/blob/main/' + page['doc']
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)} | Human Shaped</title>
  <meta name="description" content="{esc(DESCRIPTION)}">
  <link rel="canonical" href="{url}">
  <meta property="og:url" content="{url}">
  <meta property="og:site_name" content="Human Shaped">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(DESCRIPTION)}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="https://humanshaped.org/assets/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
{style_head}  <script>
    (function () {{
      var q = location.search, t = null;
      if (/[?&]dark\\b/.test(q)) t = 'dark'; else if (/[?&]light\\b/.test(q)) t = 'light';
      else {{ try {{ t = localStorage.getItem('hs-theme'); }} catch (e) {{}} }}
      if (t) document.documentElement.setAttribute('data-theme', t);
    }})();
  </script>
{''.join(scripts)}</head>
<body>
  <!-- Made by tools/make_stuck_pages.py (curriculum C7). The text is the
       template's {page['doc']}, read live from GitHub. -->
  <a class="skip" href="#main">Skip to the page</a>

  {header}

  <main id="main">
    <div class="wrap">
      <p class="crumbs">{crumbs_for(page)}</p>
      <header class="stage-head">
        <p class="num">When you are stuck</p>
        <h1 data-doc-title>{esc(title)}</h1>
        <p class="where" data-doc-lede hidden></p>
        <p class="meta" data-doc-meta hidden></p>
      </header>

      <div class="stage-layout">
        <nav class="stage-toc" aria-label="The stuck library">
          <h2>When you are stuck</h2>
          <ol>
{nav_for(page)}
          </ol>
        </nav>

        <div class="article-col">
          <article class="article" data-doc="{page['doc']}">
            <div class="doc-status" data-doc-status aria-live="polite"></div>
            <noscript>
              <div class="doc-error">
                <h2>This page reads its text from GitHub.</h2>
                <p>The text lives in the template on GitHub, and this page needs JavaScript to bring it here. You can read exactly the same page <a href="{gh}">on GitHub</a>.</p>
              </div>
            </noscript>
            <div class="doc-body" data-doc-body></div>
          </article>
          <p class="source"><a href="{gh}">Read it on GitHub</a></p>
          <nav class="next-stage" aria-label="Previous and next">
{neighbors(page)}
          </nav>
        </div>
      </div>
    </div>
  </main>

  {footer}
</body>
</html>
'''


for page in pages:
    folder = os.path.join(ROOT, page['url'].strip('/'))
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(page_html(page))

# The sitemap: drop any old stuck entries, then add one per page.
sm_path = os.path.join(ROOT, 'sitemap.xml')
sm = open(sm_path, encoding='utf-8').read()
sm = re.sub(r'\n  <url><loc>https://humanshaped\.org/stuck/[^<]*</loc>[^\n]*</url>', '', sm)
entries = ''.join('  <url><loc>https://humanshaped.org%s</loc><lastmod>2026-10-07</lastmod></url>\n' % p['url'] for p in pages)
sm = sm.replace('</urlset>', entries + '</urlset>')
open(sm_path, 'w', encoding='utf-8').write(sm)
print('wrote %d stuck pages and their sitemap entries' % len(pages))
