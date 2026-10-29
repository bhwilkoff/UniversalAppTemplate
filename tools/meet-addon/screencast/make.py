import html, json, subprocess, os
cards = json.load(open('cards.json'))
chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
for i, c in enumerate(cards, 1):
    body = ''.join(f'<p>{html.escape(p)}</p>' for p in c.get('body', []))
    items = ''.join(f'<li>{html.escape(p)}</li>' for p in c.get('list', []))
    page = f'''<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Commissioner:wght@300..700&display=swap" rel="stylesheet">
<style>
html,body{{margin:0;width:1920px;height:1080px;background:#1F4D3A;color:#fff;font-family:Commissioner,system-ui,sans-serif}}
main{{box-sizing:border-box;height:1080px;padding:120px 160px;display:flex;flex-direction:column;justify-content:center}}
img{{height:56px;width:auto;align-self:flex-start;margin-bottom:64px}}
.k{{color:#DCC4F0;font-size:30px;font-weight:500;margin:0 0 20px;letter-spacing:.02em}}
h1{{font-size:72px;font-weight:600;line-height:1.1;margin:0 0 40px;max-width:1500px}}
p,li{{font-size:38px;line-height:1.45;color:#E8EDEA;max-width:1500px;margin:0 0 22px;font-weight:400}}
ul{{margin:0;padding-left:1.1em}} code{{font-family:ui-monospace,Menlo,monospace;font-size:.92em;color:#fff}}
</style><main><img src="wordmark-white.svg" alt=""><p class="k">{html.escape(c.get("kicker",""))}</p><h1>{html.escape(c["title"])}</h1>{body}<ul>{items}</ul></main>'''
    page = page.replace('userinfo.email', '<code>userinfo.email</code>').replace('userinfo.profile', '<code>userinfo.profile</code>')
    f = f'card{i:02d}.html'; open(f, 'w').write(page)
    subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1920,1080',
                    '--virtual-time-budget=4000', f'--screenshot={os.getcwd()}/card{i:02d}.png', f'file://{os.getcwd()}/{f}'],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    print('card', i, c['title'])
