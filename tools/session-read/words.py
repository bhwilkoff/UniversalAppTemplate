#!/usr/bin/env python3
"""What was said in a session's recording, placed on the turns read.py found.

Speech becomes text on the job's own computer, so no outside service hears it.
Each word goes to whoever's tile was marked at that moment. Nothing about the
words is printed, because everyone with access to the repository can read this
job's log.
"""
import subprocess

MODEL = 'small.en'
RATE = 16000
# Meet marks a tile a moment after someone starts and keeps it a moment after
# they stop, so a word is placed by where the mark was a little later. Two
# seconds put the handoffs of the Week 1 recording within a word or two.
LAG = 2.0
NEAR = 2
SNAP = 3
LONGEST = 45
# Words every session uses that it otherwise mishears ("Cloud Code").
TERMS = ['Claude', 'Claude Code', 'GitHub', 'Human Shaped']


def audio(video):
    import numpy as np
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-f', 'f32le', '-ac', '1', '-ar', str(RATE), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def speech(video, names):
    """Each word as (start, end, text). Names help it spell the people here."""
    from faster_whisper import WhisperModel
    model = WhisperModel(MODEL, device='cpu', compute_type='int8')
    hint = ', '.join(TERMS + sorted({p['name'] for p in names if p.get('name')}))
    parts, _ = model.transcribe(audio(video), language='en', vad_filter=True, word_timestamps=True,
                                hotwords=hint, condition_on_previous_text=False)
    return [(w.start, w.end, w.word) for s in parts for w in s.words]


def whose(at, turns):
    """The turn marked at this moment, or the nearest one close by."""
    best, gap = None, NEAR + 1
    for t in turns:
        d = 0 if t['start'] <= at < t['end'] else min(abs(at - t['start']), abs(at - t['end']))
        if d < gap:
            best, gap = t, d
    return best


def snap(said, owners):
    """A handoff that lands a word or two from a sentence's end moves to it."""
    ends = lambda i: said[i][2].rstrip()[-1:] in ('.', '?', '!')
    for i in range(1, len(said)):
        if owners[i] == owners[i - 1] or ends(i - 1):
            continue
        for d in range(1, SNAP + 1):
            if i + d - 1 < len(said) and ends(i + d - 1) and owners[i - 1:i] != owners[i + d:i + d + 1]:
                owners[i:i + d] = [owners[i - 1]] * d
                break
            if i - d - 1 >= 0 and ends(i - d - 1):
                owners[i - d:i] = [owners[i]] * d
                break
    return owners


def place(said, turns):
    """Stretches of one person's words. Long ones break at a sentence's end,
    so a reader can find a moment, and every stretch keeps who said it."""
    marked = [whose((start + end) / 2 + LAG, turns) for start, end, _ in said]
    owners = snap(said, [(t.get('user_id'), t.get('name')) if t else (None, None) for t in marked])
    rows = []
    for (start, end, text), who in zip(said, owners):
        last = rows[-1] if rows else None
        ended = last and last['text'].rstrip()[-1:] in ('.', '?', '!') and start - last['start'] >= LONGEST
        if last and (last['user_id'], last['name']) == who and not ended:
            last['text'] += text
            last['end'] = max(last['end'], int(end) + 1)
        else:
            rows.append({'start': int(start), 'end': int(end) + 1, 'user_id': who[0], 'name': who[1], 'text': text})
    for r in rows:
        r['text'] = r['text'].strip()
    return [r for r in rows if r['text']]
