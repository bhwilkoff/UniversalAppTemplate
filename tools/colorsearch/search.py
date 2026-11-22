"""Color search (first written for CentMemo), following Human Shaped's method (humanshaped-site
DECISIONS "Forest and thistle"; research/notes/ai-design-anti-patterns.md).

A candidate is a PAIRING: a bold ground + a dark pencil lead drawn on it.
A pairing is TAKEN when one brand has a color within dE 12 (CIEDE2000) of
each of its two colors. Grounds are also flagged when a finance-lane brand
sits within dE 10 of them on their own (a bank's single color is enough to
read as theirs in this lane).
Run: python3 -I search.py <branddata dir>
"""
import json, math, sys, itertools, colorsys

D = sys.argv[1]

# ---------- color math ----------
def hex2rgb(h):
    h = h.strip().lstrip('#')
    if len(h) == 3: h = ''.join(c*2 for c in h)
    return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))

def srgb2lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def lin2srgb(c): return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1/2.4) - 0.055

def rgb2lab(rgb):
    r, g, b = (srgb2lin(c) for c in rgb)
    x = (0.4124*r + 0.3576*g + 0.1805*b) / 0.95047
    y = (0.2126*r + 0.7152*g + 0.0722*b)
    z = (0.0193*r + 0.1192*g + 0.9505*b) / 1.08883
    f = lambda t: t ** (1/3) if t > 216/24389 else (24389/27*t + 16) / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116*fy - 16, 500*(fx - fy), 200*(fy - fz))

def ciede2000(l1, l2):
    L1, a1, b1 = l1; L2, a2, b2 = l2
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cb**7 / (Cb**7 + 25**7)))
    a1p, a2p = (1+G)*a1, (1+G)*a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360
    h2p = math.degrees(math.atan2(b2, a2p)) % 360
    dLp, dCp = L2 - L1, C2p - C1p
    dh = h2p - h1p
    if C1p*C2p == 0: dh = 0
    elif dh > 180: dh -= 360
    elif dh < -180: dh += 360
    dHp = 2*math.sqrt(C1p*C2p)*math.sin(math.radians(dh/2))
    Lbp, Cbp = (L1+L2)/2, (C1p+C2p)/2
    if C1p*C2p == 0: hbp = h1p + h2p
    elif abs(h1p-h2p) <= 180: hbp = (h1p+h2p)/2
    elif h1p + h2p < 360: hbp = (h1p+h2p+360)/2
    else: hbp = (h1p+h2p-360)/2
    T = 1 - 0.17*math.cos(math.radians(hbp-30)) + 0.24*math.cos(math.radians(2*hbp)) \
        + 0.32*math.cos(math.radians(3*hbp+6)) - 0.20*math.cos(math.radians(4*hbp-63))
    dtheta = 30*math.exp(-((hbp-275)/25)**2)
    Rc = 2*math.sqrt(Cbp**7/(Cbp**7+25**7))
    Sl = 1 + 0.015*(Lbp-50)**2/math.sqrt(20+(Lbp-50)**2)
    Sc, Sh = 1 + 0.045*Cbp, 1 + 0.015*Cbp*T
    Rt = -math.sin(math.radians(2*dtheta))*Rc
    return math.sqrt((dLp/Sl)**2 + (dCp/Sc)**2 + (dHp/Sh)**2 + Rt*(dCp/Sc)*(dHp/Sh))

def oklch2hex(L, C, h):
    a, b = C*math.cos(math.radians(h)), C*math.sin(math.radians(h))
    l_ = L + 0.3963377774*a + 0.2158037573*b
    m_ = L - 0.1055613458*a - 0.0638541728*b
    s_ = L - 0.0894841775*a - 1.2914855480*b
    l, m, s = l_**3, m_**3, s_**3
    r = 4.0767416621*l - 3.3077115913*m + 0.2309699292*s
    g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
    bb = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
    rgb = [lin2srgb(max(0, min(1, c))) for c in (r, g, bb)]
    inside = all(-0.001 <= c <= 1.001 for c in (r, g, bb))
    return '#%02X%02X%02X' % tuple(round(c*255) for c in rgb), inside

def lum(h): return sum(w*srgb2lin(c) for w, c in zip((0.2126, 0.7152, 0.0722), hex2rgb(h)))
def contrast(a, b):
    x, y = lum(a), lum(b)
    return (max(x, y) + 0.05) / (min(x, y) + 0.05)

# ---------- brands ----------
brands = {}  # name -> list of hex
def add(name, hexes, lane=False):
    brands.setdefault(name, {'hex': [], 'lane': lane})
    brands[name]['hex'] += [h if h.startswith('#') else '#'+h for h in hexes]
    brands[name]['lane'] |= lane

si = json.load(open(D + '/simple-icons.json')); si = si.get('icons', si)
for i in si: add('SI:' + i['title'], [i['hex']])
bc = json.load(open(D + '/brand-colors.json'))
import re
for k, v in bc.items():  # keys like "facebook" or "google-blue"/"google-1"
    base = re.sub(r'-(\d+|[a-z]+)$', '', k) if '-' in k else k
    add('BC:' + base, [v])

# Finance, journaling, and adjacent brands, hand-entered (approximate public
# brand colors); lane=True means a single close color is enough to flag.
LANE = {
 'Chase': ['#117ACA', '#0F5BA7'], 'Capital One': ['#004977', '#D03027'], 'American Express': ['#006FCF', '#00175A'],
 'Discover': ['#FF6000', '#23201F'], 'Citi': ['#003B70', '#DA291C'], 'Wells Fargo': ['#D71E28', '#FFCD41'],
 'Bank of America': ['#E31837', '#012169'], 'Ally': ['#852EF2', '#954293', '#50104A'], 'SoFi': ['#00A2C7', '#1B1B1B'],
 'Chime': ['#1EC677', '#0E1A2B'], 'Cash App': ['#00D632', '#000000'], 'Venmo': ['#3D95CE', '#008CFF'],
 'PayPal': ['#003087', '#009CDE'], 'Zelle': ['#6D1ED4'], 'Robinhood': ['#CCFF00', '#00C805', '#000000'],
 'Wise': ['#9FE870', '#163300'], 'Revolut': ['#0666EB', '#191C1F'], 'Monzo': ['#FF4F40', '#14233C'],
 'Klarna': ['#FFB3C7', '#17120F'], 'Affirm': ['#4A4AF4', '#060809'], 'Afterpay': ['#B2FCE4', '#000000'],
 'Stripe': ['#635BFF', '#0A2540'], 'Intuit Mint': ['#00A6A4', '#3EB489'], 'Credit Karma': ['#00A6A6', '#2B2D3A'],
 'Rocket Money': ['#F05A5A', '#1C1B3A'], 'YNAB': ['#2E5BCE', '#1A2F6B'], 'Monarch': ['#FF692D', '#1B2A41'],
 'Copilot Money': ['#3E6BF5', '#111111'], 'Simplifi': ['#0057FF', '#0A1F44'], 'Lunch Money': ['#F8C04B', '#2E2A26'],
 'PocketSmith': ['#C7193A', '#1F1F1F'], 'Tiller': ['#00A86B', '#123B2A'], 'Wealthfront': ['#4840BB', '#1E1A4C'],
 'Betterment': ['#1A73E8', '#06253F'], 'Acorns': ['#7BC143', '#2F4E2A'], 'Stash': ['#6C3EF4'],
 'Mercury': ['#5266EB', '#171721'], 'Brex': ['#F46A35', '#000000'], 'Ramp': ['#E4F222', '#000000'],
 'Navy Federal': ['#00205B', '#FFB81C'], 'USAA': ['#002F6C', '#FFB81C'], 'Fidelity': ['#368727', '#1F3A1B'],
 'Vanguard': ['#96151D', '#1A1A1A'], 'Schwab': ['#00A0DF', '#003C71'], 'TD Bank': ['#34A853', '#1A5336'],
 'Goldman Sachs': ['#7399C6', '#1E2C47'], 'Barclays': ['#00AEEF', '#00395D'], 'HSBC': ['#DB0011', '#000000'],
 'Marcus': ['#0E1B2C', '#B98B4F'], 'Apple Card': ['#E3E4E5', '#F5F5F7'], 'Google Pay': ['#4285F4', '#34A853', '#FBBC05', '#EA4335'],
 'Day One': ['#44C0FF', '#1B2A3A'], 'Ticonderoga': ['#FFC300', '#2A7D3A'], 'Field Notes': ['#C9A57A', '#2B2B2B'],
 'Caterpillar': ['#FFCD11', '#000000'], 'Bumble': ['#FFC629', '#000000'], 'Mailchimp': ['#FFE01B', '#241C15'],
 'Gumroad': ['#FF90E8', '#FFC900', '#000000'], 'Barbie': ['#E0218A'], 'Tiffany': ['#81D8D0'],
 'Anthropic / Claude': ['#D97757', '#141413', '#F0EEE6', '#C15F3C'],
 'Human Shaped (Ben)': ['#1F4D3A', '#DCC4F0'],
}
for n, hs in LANE.items(): add('LANE:' + n, hs, lane=True)

for b in brands.values():
    b['lab'] = []
    for h in b['hex']:
        try: b['lab'].append(rgb2lab(hex2rgb(h)))
        except Exception: pass
nbrands = len(brands); ncolors = sum(len(b['lab']) for b in brands.values())

# ---------- candidates ----------
# Bold grounds: bright enough that a dark lead reads (OKLCH L 0.74-0.86), as
# saturated as sRGB allows. Leads: deep inks/graphites with a hue, plus neutral.
grounds = []
for h in range(0, 360, 8):
    for L in (0.74, 0.80, 0.86):
        for C in (0.20, 0.16, 0.12):
            hx, ok = oklch2hex(L, C, h)
            if ok: grounds.append((hx, L, C, h)); break
leads = [('#262422', 'graphite', None)]
for h in range(0, 360, 15):
    for C in (0.07, 0.05):
        hx, ok = oklch2hex(0.27, C, h)
        if ok: leads.append((hx, 'lead h%d' % h, h)); break

def nearest(lab, pool):
    best = (999, None, None)
    for name, b in pool:
        for i, l in enumerate(b['lab']):
            d = ciede2000(lab, l)
            if d < best[0]: best = (d, name, b['hex'][i])
    return best

allb = list(brands.items())
lane = [(n, b) for n, b in allb if b['lane']]
results = []
for g, L, C, gh in grounds:
    glab = rgb2lab(hex2rgb(g))
    lane_near = nearest(glab, lane)
    gnear_all = [(n, min(ciede2000(glab, l) for l in b['lab'])) for n, b in allb if b['lab']]
    gclose = {n for n, d in gnear_all if d < 12}
    for lead, lname, lh in leads:
        cr = contrast(g, lead)
        if cr < 7: continue
        llab = rgb2lab(hex2rgb(lead))
        taken_by = [n for n in gclose if min(ciede2000(llab, l) for l in brands[n]['lab']) < 12]
        results.append({'ground': g, 'gL': L, 'gC': C, 'gh': gh, 'lead': lead, 'lead_name': lname,
                        'contrast': round(cr, 1), 'taken_by': sorted(taken_by)[:6], 'n_taken': len(taken_by),
                        'lane_near': (round(lane_near[0], 1), lane_near[1]), 'ground_brands_within_10':
                        sum(1 for n, d in gnear_all if d < 10)})

clear = [r for r in results if r['n_taken'] == 0 and r['lane_near'][0] >= 10]
json.dump({'brands': nbrands, 'colors': ncolors, 'results': results}, open('results.json', 'w'))
print('brands', nbrands, 'colors', ncolors, 'grounds', len(grounds), 'leads', len(leads), 'pairs>=7:1', len(results), 'clear', len(clear))
# summarize by ground hue family
fam = {}
for r in clear:
    fam.setdefault(r['gh'] // 30 * 30, []).append(r)
for k in sorted(fam):
    rs = sorted(fam[k], key=lambda r: (r['ground_brands_within_10'], -r['contrast']))
    print('hue %3d-%3d: %3d clear; e.g.' % (k, k+29, len(rs)), ', '.join('%s+%s(%s, %.1f:1, %d near)' % (r['ground'], r['lead'], r['lead_name'], r['contrast'], r['ground_brands_within_10']) for r in rs[:3]))
