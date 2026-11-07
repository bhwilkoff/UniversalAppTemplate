// The one file a cohort's private repository holds for reading its
// recordings. session-read refuses any run whose file differs from this by a
// byte, because learners can write to that repository (Ben, November 6, 2026:
// use "the same private repositories"). The work itself lives on
// humanshaped.org, so it can change without touching any cohort's repository.
export const WORKFLOW_PATH = '.github/workflows/session-read.yml';
export const WORKFLOW = [
  '# Written by humanshaped.org. It reads who was speaking and what was said',
  '# from a session’s recording and sends only that to humanshaped.org. It',
  '# keeps nothing here and logs no names, words, or numbers. An edited copy',
  '# of this file is refused.',
  'name: Read a session',
  'on:',
  '  repository_dispatch:',
  '    types: [read-session]',
  'permissions:',
  '  id-token: write',
  'concurrency: session-read',
  'jobs:',
  '  read:',
  '    runs-on: ubuntu-latest',
  '    timeout-minutes: 120',
  '    steps:',
  '      - name: Read the recording',
  '        env:',
  '          SESSION: ${{ github.event.client_payload.session }}',
  '        run: |',
  '          sudo apt-get update -qq',
  '          sudo apt-get install -y -qq ffmpeg tesseract-ocr > /dev/null',
  '          python3 -m venv reader',
  '          reader/bin/pip install -q numpy pillow faster-whisper==1.2.1',
  '          curl -fsSL https://humanshaped.org/tools/session-read/read.py -o read.py',
  '          curl -fsSL https://humanshaped.org/tools/session-read/run.py -o run.py',
  '          curl -fsSL https://humanshaped.org/tools/session-read/words.py -o words.py',
  '          reader/bin/python run.py "$SESSION"',
  '',
].join('\n');
