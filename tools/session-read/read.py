#!/usr/bin/env python3
"""Who was speaking in a session's recording, read from the picture.

The recorder captures the Meet tab, and Meet draws a light border around the
tile of whoever is speaking, with the person's name on the tile. So this reads
one frame a second, finds that border, and reads the name. It listens to
nothing: no audio is used, and no voice is measured or kept.

    read.py VIDEO NAMES.json OUT.json

NAMES.json is a list of {"id", "name"}. OUT.json gets each turn and how much
was read. Nothing about any person is printed, because the job that runs this
keeps a log that everyone with access to the repository can read.
"""
import difflib, glob, json, os, re, subprocess, sys, tempfile
from collections import Counter, defaultdict

import numpy as np
from PIL import Image, ImageOps

WIDTH = 1280
MIN_W, MIN_H = 120, 70


def lit(a):
    r, g, b = (a[..., i].astype(np.int16) for i in range(3))
    return (b > 205) & (r > 130) & (r < 215) & (g > 165) & (g > r) & (b - r > 25)


def runs(line, need):
    idx = np.flatnonzero(line)
    if idx.size == 0:
        return []
    cuts = np.flatnonzero(np.diff(idx) > 3)
    starts = np.r_[idx[0], idx[cuts + 1]]
    ends = np.r_[idx[cuts], idx[-1]]
    return [(int(s), int(e)) for s, e in zip(starts, ends) if e - s >= need]


def border(m):
    """The speaking tile's rectangle in this frame, or None."""
    h, w = m.shape
    cols = np.flatnonzero(m.sum(0) >= MIN_H * 0.7)
    edges = []
    for x in cols:
        band = m[:, max(0, x - 1):x + 2].any(1)
        for y0, y1 in runs(band, int(MIN_H * 0.7)):
            edges.append((int(x), y0, y1))
    best = None
    for i, (x0, a0, a1) in enumerate(edges):
        for x1, b0, b1 in edges[i + 1:]:
            if x1 - x0 < MIN_W or abs(a0 - b0) > 10 or abs(a1 - b1) > 10:
                continue
            top = m[max(0, a0 - 14):a0 + 6, x0:x1].any(0).mean()
            bot = m[max(0, a1 - 6):a1 + 14, x0:x1].any(0).mean()
            if top > 0.5 or bot > 0.5:
                area = (x1 - x0) * (a1 - a0)
                if best is None or area > best[0]:
                    best = (area, x0, min(a0, b0) - 12, x1, max(a1, b1) + 12)
    return best[1:] if best else None


def name_in(path, box):
    """What the tile's label says, several ways: white text sits on anything
    from a dark room to a bright window, so one treatment cannot read them all."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    im = Image.open(path).convert('L').crop((x0 + 2, int(y1 - max(h * 0.2, 26)), int(x0 + w * 0.8), y1 - 2))
    im = im.resize((im.width * 4, im.height * 4), Image.LANCZOS)
    tries = [im, ImageOps.autocontrast(im), ImageOps.invert(im)]
    tries += [im.point(lambda v, c=c: 0 if v > c else 255) for c in (150, 185, 215, 235)]
    found = []
    with tempfile.NamedTemporaryFile(suffix='.png') as t:
        for one in tries:
            one.save(t.name)
            out = subprocess.run(['tesseract', t.name, '-', '--psm', '7'], capture_output=True, text=True).stdout
            text = re.sub(r"[^A-Za-z .'-]", '', out).strip()
            if len(text) > 3:
                found.append(text)
    return found


def closest(text, names):
    best, score = None, 0
    for n in names:
        s = difflib.SequenceMatcher(None, text.lower(), n['name'].lower()).ratio()
        if s > score:
            best, score = n, s
    return (best, score) if score >= 0.6 else (None, score)


def read(video, names):
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-i', video, '-vf',
                        f'fps=1,scale={WIDTH}:-1', '-q:v', '3', os.path.join(d, '%06d.jpg')], check=True)
        frames = sorted(glob.glob(os.path.join(d, '*.jpg')))
        seen = []
        for p in frames:
            seen.append(border(lit(np.asarray(Image.open(p).convert('RGB')))))
        # Turns: runs of frames on the same tile, with gaps under two seconds closed.
        key = lambda b: tuple(round(v / 12) for v in b)
        turns = []
        for i, b in enumerate(seen):
            if b is None:
                continue
            if turns and turns[-1]['key'] == key(b) and i - turns[-1]['end'] <= 2:
                turns[-1]['end'] = i + 1
            else:
                turns.append({'key': key(b), 'box': b, 'start': i, 'end': i + 1})
        # A tile keeps its person while the layout holds, so names vote per tile.
        votes = defaultdict(Counter)
        raw = {}
        spots = defaultdict(list)
        for t in turns:
            spots[t['key']] += [(t['box'], i) for i in (t['start'], (t['start'] + t['end'] - 1) // 2, t['end'] - 1)]
        for k, seen_at in spots.items():
            step = max(1, len(seen_at) // 6)
            for box, i in seen_at[::step][:6]:
                for text in name_in(frames[i], box):
                    who, score = closest(text, names)
                    if who:
                        votes[k][who['id']] += score
                    else:
                        raw.setdefault(k, Counter())[text] += 1
        out = []
        for t in turns:
            v = votes.get(t['key'])
            person = v.most_common(1)[0][0] if v else None
            label = None if person else (raw[t['key']].most_common(1)[0][0] if t['key'] in raw else None)
            out.append({'user_id': person, 'name': label, 'start': t['start'], 'end': t['end']})
        return {'read_seconds': len(frames), 'tiles': len({t['key'] for t in turns}), 'turns': out}


if __name__ == '__main__':
    video, names, target = sys.argv[1:4]
    result = read(video, json.load(open(names)))
    json.dump(result, open(target, 'w'))
    print(f"Read {result['read_seconds']} seconds, {len(result['turns'])} turns, {result['tiles']} tiles.")
