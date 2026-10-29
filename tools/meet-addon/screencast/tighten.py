import subprocess, re, sys
HOLDS = {'v02':7,'v05':6,'v04':3.5,'v07':3.5}
def dur(f): return float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f],capture_output=True,text=True).stdout)
for name in sys.argv[1:]:
    HOLD = HOLDS.get(name, 2.5)
    src=f'seg/{name}.mp4'; out=f'seg/{name}t.mp4'
    log=subprocess.run(['ffmpeg','-i',src,'-vf','freezedetect=n=-45dB:d=1.3','-map','0:v','-f','null','-'],capture_output=True,text=True).stderr
    starts=[float(x) for x in re.findall(r'freeze_start: ([\d.]+)',log)]
    ends=[float(x) for x in re.findall(r'freeze_end: ([\d.]+)',log)]
    D=dur(src)
    if len(ends)<len(starts): ends.append(D)
    cuts=[(s+HOLD, e-0.3) for s,e in zip(starts,ends) if e-0.3 > s+HOLD]
    keep=[]; t=0
    for a,b in cuts: keep.append((t,a)); t=b
    keep.append((t,D))
    expr='+'.join(f'between(t,{a:.3f},{b:.3f})' for a,b in keep)
    subprocess.run(['ffmpeg','-v','error','-y','-i',src,'-vf',f"select='{expr}',setpts=N/30/TB",'-r','30','-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p','-an',out],check=True)
    print(name, f'{D:.1f}s ->', f'{dur(out):.1f}s', f'({len(cuts)} pauses cut)')
