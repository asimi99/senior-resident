import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
FPS=30; TOTAL=2220; CH=370
t0=time.time()
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':1080,'height':1920})
    pg.goto('file:///tmp/claude-0/vid/promo.html'); pg.wait_for_timeout(800)
    for c in range(TOTAL//CH):
        tmp=f'part{c}.tmp.mp4'
        ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p','-r',str(FPS),tmp],stdin=subprocess.PIPE)
        for i in range(c*CH,(c+1)*CH):
            pg.evaluate(f'seek({i/FPS})'); ff.stdin.write(pg.screenshot(type='jpeg',quality=92))
        ff.stdin.close(); rc=ff.wait()
        if rc==0: os.replace(tmp,f'part{c}.mp4')
        print(c,rc,round(time.time()-t0),flush=True)
    b.close()
