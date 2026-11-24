"""Finer sweep: for each open lead, the boldest clear grounds per hue.
Clear = no brand within dE 12 of both ground and lead (Human Shaped's rule),
AND no finance-lane brand within dE 10 of the ground alone (CentMemo's lane rule).
Run: python3 -I sweep.py ../branddata"""
import sys, json
sys.argv = [sys.argv[0], sys.argv[1]]
exec(open('search.py').read().split('# ---------- candidates ----------')[0])
LEADS = {'Sanguine (oxblood)': '#4A1520', 'Bottle green': '#0F3B35', 'Navy pencil': '#14233C', 'Plum ink': '#3B1C3F', 'Espresso': '#3A2418'}
allb = [(n, b) for n, b in brands.items() if b['lab']]
leadlab = {k: rgb2lab(hex2rgb(v)) for k, v in LEADS.items()}
near_lead = {k: {n for n, b in allb if min(ciede2000(l, x) for x in b['lab']) < 12} for k, l in leadlab.items()}
out = {k: [] for k in LEADS}
for h in range(0, 360, 6):
    for C in (0.17, 0.15, 0.13, 0.11, 0.09):
        for L in (0.80, 0.84, 0.88):
            g, ok = oklch2hex(L, C, h)
            if not ok: continue
            glab = rgb2lab(hex2rgb(g))
            d = {n: min(ciede2000(glab, x) for x in b['lab']) for n, b in allb}
            gclose = {n for n, v in d.items() if v < 12}
            lane_min = min((v, n) for n, v in d.items() if brands[n]['lane'])
            if lane_min[0] < 10: continue
            for k, lead in LEADS.items():
                if contrast(g, lead) < 7: continue
                if gclose & near_lead[k]: continue
                out[k].append(dict(h=h, L=L, C=C, g=g, cr=round(contrast(g, lead), 1), near10=sum(1 for v in d.values() if v < 10),
                                   lane=f"{lane_min[1].split(':',1)[1]} {lane_min[0]:.1f}"))
best = {}
for k, rs in out.items():
    byhue = {}
    for r in rs:  # boldest (highest C, then lowest L) per 30-degree family
        f = r['h'] // 30 * 30
        if f not in byhue or (r['C'], -r['L']) > (byhue[f]['C'], -byhue[f]['L']): byhue[f] = r
    best[k] = byhue
    print(f"\n{k} {LEADS[k]}: {len(rs)} clear grounds")
    for f in sorted(byhue):
        r = byhue[f]
        print(f"  hue {f:3}-{f+29:3}: {r['g']} (C {r['C']}, L {r['L']}) {r['cr']}:1  brands<10: {r['near10']:3}  nearest lane: {r['lane']}")
json.dump({'leads': LEADS, 'best': best}, open('sweep.json', 'w'), indent=1)
