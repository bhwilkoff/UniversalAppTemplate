// The one file a cohort's private repository holds for reading its
// recordings. session-read refuses any run whose file differs from this by a
// byte, because learners can write to that repository (Ben, November 6, 2026:
// use "the same private repositories"). The work itself lives on
// humanshaped.org, so it can change without touching any cohort's repository.
export const WORKFLOW_PATH = '.github/workflows/session-read.yml';
export const WORKFLOW = [
  '# Written by humanshaped.org. It reads who was speaking from a session’s',
  '# recording and sends only that to humanshaped.org. It keeps nothing here',
  '# and logs no names or numbers. An edited copy of this file is refused.',
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
  '    timeout-minutes: 50',
  '    steps:',
  '      - name: Read the recording',
  '        env:',
  '          SESSION: ${{ github.event.client_payload.session }}',
  '        run: |',
  '          sudo apt-get update -qq',
  '          sudo apt-get install -y -qq ffmpeg tesseract-ocr python3-numpy python3-pil > /dev/null',
  '          curl -fsSL https://humanshaped.org/tools/session-read/read.py -o read.py',
  '          curl -fsSL https://humanshaped.org/tools/session-read/run.py -o run.py',
  '          python3 run.py "$SESSION"',
  '',
].join('\n');
