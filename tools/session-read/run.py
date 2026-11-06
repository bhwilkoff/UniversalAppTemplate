#!/usr/bin/env python3
"""The job in a cohort's private repository: prove who it is, read one
recording, send back the turns. It prints no names and no numbers about anyone,
because everyone with access to the repository can read this job's log."""
import json, os, sys, tempfile, urllib.parse, urllib.request

import read

API = 'https://bifrieqzkihuxfzttgvd.supabase.co/functions/v1/session-read'


def oidc():
    url = os.environ['ACTIONS_ID_TOKEN_REQUEST_URL'] + '&audience=' + urllib.parse.quote('https://humanshaped.org')
    r = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + os.environ['ACTIONS_ID_TOKEN_REQUEST_TOKEN']})
    return json.load(urllib.request.urlopen(r))['value']


def call(session, **body):
    r = urllib.request.Request(API, data=json.dumps({'session': session, **body}).encode(), method='POST',
                               headers={'Authorization': 'Bearer ' + oidc(), 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(r))


def main(session):
    got = call(session, action='start')
    url = 'https://drive.usercontent.google.com/download?' + urllib.parse.urlencode(
        {'id': got['file'], 'export': 'download', 'confirm': 't'})
    with tempfile.TemporaryDirectory() as d:
        video = os.path.join(d, 'recording')
        urllib.request.urlretrieve(url, video)
        result = read.read(video, got['names'])
    if not result['turns']:
        raise RuntimeError('no speaking border found')
    call(session, action='finish', read_seconds=result['read_seconds'], turns=result['turns'])
    print('Done.')


if __name__ == '__main__':
    try:
        main(sys.argv[1])
    except Exception as e:
        print('Stopped: ' + type(e).__name__)
        try:
            call(sys.argv[1], action='fail', problem=type(e).__name__ + ': ' + str(e)[:150])
        except Exception:
            pass
        sys.exit(1)
