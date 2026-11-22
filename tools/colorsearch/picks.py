"""Hand-picked grounds (memo-pad paper stocks, print inks) x pencil/ink leads,
scored with search.py's method. Run: python3 -I picks.py ../branddata"""
import sys, json
sys.argv = [sys.argv[0], sys.argv[1]]
exec(open('search.py').read().split('# ---------- candidates ----------')[0])
GROUNDS = {
 'Persimmon': '#F2784B', 'Poppy': '#F25C54', 'Coral paper': '#FF8A70', 'Apricot stock': '#FBA66E', 'Mandarin': '#FF9F1C',
 'Saffron': '#F4B942', 'Marigold': '#F6B724', 'Mustard': '#D9A520', 'Citrine': '#E3D34B', 'Chartreuse': '#C7D93A',
 'Pistachio': '#A8D58A', 'Fern': '#7FC97A', 'Kelly': '#4CB86A', 'Jade': '#3DBB9A', 'Mint stock': '#8FE0C4',
 'Seaglass': '#7FD6C2', 'Turquoise': '#38C6C9', 'Lagoon': '#3FB6D6', 'Cerulean': '#4AA8E8', 'Cornflower': '#7EA6F6',
 'Periwinkle': '#9AA5F5', 'Hyacinth': '#A98CF0', 'Lilac stock': '#C3A6F2', 'Orchid': '#D08AE8', 'Peony': '#EE8FC8',
 'Raspberry': '#E8668F', 'Watermelon': '#F27A86', 'Blush stock': '#F6A6A6', 'Butter': '#F7DC6F', 'Lemon chiffon': '#F2E58A',
 'Sage': '#A9C2A0', 'Clay pink': '#E6A493', 'Sand': '#E3C08D', 'Steel blue': '#8FB3D9', 'Ice blue': '#A8D8F0',
}
LEADS = {'Graphite': '#262422', 'Indigo ink': '#1F2A4D', 'Oxblood': '#4A1520', 'Forest lead': '#173A2A',
         'Espresso': '#3A2418', 'Plum ink': '#3B1C3F', 'Navy pencil': '#14233C', 'Bottle green': '#0F3B35'}
allb = list(brands.items()); lane = [(n, b) for n, b in allb if b['lane']]
rows = []
for gname, g in GROUNDS.items():
    glab = rgb2lab(hex2rgb(g))
    dists = {n: min(ciede2000(glab, l) for l in b['lab']) for n, b in allb if b['lab']}
    gclose = {n for n, d in dists.items() if d < 12}
    lanen = min(((d, n) for n, d in dists.items() if brands[n]['lane']), default=(99, ''))
    within10 = sorted((d, n) for n, d in dists.items() if d < 10)
    for lname, lead in LEADS.items():
        cr = contrast(g, lead)
        llab = rgb2lab(hex2rgb(lead))
        taken = sorted(n for n in gclose if min(ciede2000(llab, l) for l in brands[n]['lab']) < 12)
        rows.append(dict(ground=gname, g=g, lead=lname, l=lead, contrast=round(cr, 1), taken=taken,
                         lane_d=round(lanen[0], 1), lane_n=lanen[1], near10=len(within10),
                         nearest=[f'{n.split(":",1)[1]} {d:.1f}' for d, n in within10[:3]]))
json.dump(rows, open('picks.json', 'w'), indent=1)
print('brands', len(brands))
for gname in GROUNDS:
    rs = [r for r in rows if r['ground'] == gname]
    r0 = rs[0]
    ok = [r for r in rs if not r['taken'] and r['contrast'] >= 7]
    flag = 'LANE ' + r0['lane_n'].split(':', 1)[1] + f' {r0["lane_d"]}' if r0['lane_d'] < 10 else ''
    print(f"{gname:14} {r0['g']}  near<10:{r0['near10']:3}  {flag:28} clear leads (>=7:1): " +
          ', '.join(f"{r['lead']} {r['contrast']}" for r in ok) +
          ('' if ok else '  -- none; taken by ' + '; '.join(sorted({t.split(':',1)[1] for r in rs for t in r['taken']})[:4])))
