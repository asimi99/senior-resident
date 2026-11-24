import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve, butter, lfilter
SR=44100; DUR=118.25; N=int(SR*DUR); rng=np.random.default_rng(11)
BPM=120; beat=60/BPM; bar=4*beat; s16=beat/4
HOOK=9.0; DROP=16.52; BRK0=60.67; BRK1=65.55; END=115.2
def note(m): return 440*2**((m-69)/12)
dry=np.zeros((N,2)); duck=np.zeros((N,2))   # duck bus gets sidechained
def add(bus,sig,t0,pan=0.0,gain=1.0):
    i=int(t0*SR)
    if i>=N or i<0: return
    n=min(len(sig),N-i); l=np.cos((pan+1)*np.pi/4); r=np.sin((pan+1)*np.pi/4)
    bus[i:i+n,0]+=sig[:n]*gain*l; bus[i:i+n,1]+=sig[:n]*gain*r
def lp(x,f): b,a=butter(2,f/(SR/2)); return lfilter(b,a,x)
def hp(x,f): b,a=butter(2,f/(SR/2),'high'); return lfilter(b,a,x)
def saw(f,n,harm=14):
    t=np.arange(n)/SR; s=np.zeros(n)
    for k in range(1,harm+1):
        if f*k>SR/2.2: break
        s+=np.sin(2*np.pi*f*k*t)/k
    return s
def kick():
    n=int(0.28*SR); t=np.arange(n)/SR
    ph=2*np.pi*(46*t+(150-46)*(1-np.exp(-t*38))/38)
    return np.sin(ph)*np.exp(-t*13)+0.25*hp(rng.standard_normal(n),3000)*np.exp(-t*200)
def clap():
    n=int(0.2*SR); t=np.arange(n)/SR; x=rng.standard_normal(n)
    e=np.exp(-t*26)+0.6*np.exp(-np.abs(t-0.012)*400)+0.5*np.exp(-np.abs(t-0.024)*400)
    b,a=butter(2,[1100/(SR/2),5200/(SR/2)],'band'); return lfilter(b,a,x)*e
def hat(d=0.045,dec=95):
    n=int(d*SR); t=np.arange(n)/SR; return hp(rng.standard_normal(n),7500)*np.exp(-t*dec)
def pluck(f,d=0.32,bright=1.0):
    n=int(d*SR); t=np.arange(n)/SR
    s=saw(f,n,10)*np.exp(-t*(9/bright))+0.5*np.sin(2*np.pi*f*t)*np.exp(-t*5)
    s[:40]*=np.linspace(0,1,40); return lp(s,2600+2400*bright)
def bassn(f,d):
    n=int(d*SR); t=np.arange(n)/SR; e=np.minimum(1,t*200)*np.exp(-t*3.2); e[-200:]*=np.linspace(1,0,200)
    return lp(saw(f,n,8),620)*e+0.6*np.sin(2*np.pi*f*t)*e
def pad(freqs,d):
    n=int(d*SR); t=np.arange(n)/SR; s=np.zeros(n)
    for f in freqs:
        for det in (-0.35,0.35): s+=saw(f*(1+det/100),n,8)
    e=np.ones(n); a=int(0.08*SR); r=int(0.25*SR); e[:a]=np.linspace(0,1,a); e[-r:]=np.linspace(1,0,r)
    return lp(s/len(freqs)/2,1900)*e
def riser(d):
    n=int(d*SR); t=np.arange(n)/SR; x=rng.standard_normal(n)
    out=np.zeros(n); step=2048
    for i in range(0,n,step):
        f=600+7000*(i/n)**2; seg=x[i:i+step+256]
        b,a=butter(2,[f*0.7/(SR/2),min(0.95,f*1.4/(SR/2))],'band'); out[i:i+step]=lfilter(b,a,seg)[:len(out[i:i+step])]
    return out*(t/d)**2
def impact():
    n=int(1.6*SR); t=np.arange(n)/SR
    return np.sin(2*np.pi*(38*t+40*(1-np.exp(-t*8))/8))*np.exp(-t*3)+0.5*lp(rng.standard_normal(n),900)*np.exp(-t*4)

def keys(f,d=1.6,bright=.5):
    n=int(d*SR); t=np.arange(n)/SR
    s=(np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*2*f*t)*np.exp(-t*3)+.25*np.sin(2*np.pi*3*f*t)*np.exp(-t*5))*np.exp(-t*(2.2/max(.3,bright)))
    s[:60]*=np.linspace(0,1,60); s[-400:]*=np.linspace(1,0,400); return s
def lead(f,d):
    n=int(d*SR); t=np.arange(n)/SR; vib=1+0.004*np.sin(2*np.pi*5.2*t)*np.minimum(1,t*3)
    ph=2*np.pi*np.cumsum(f*vib)/SR; s=np.sin(ph)+.35*np.sin(2*ph)+.12*np.sin(3*ph)
    e=np.minimum(1,t*30)*np.exp(-t*1.1); r=int(.08*SR); e[-r:]*=np.linspace(1,0,r); return s*e
SAD=[[57,60,64],[53,57,60],[50,53,57],[52,55,59]]            # Am F Dm Em : heavy, slow
HOPE=[[60,64,67],[55,59,62],[57,60,64],[53,57,60]]           # C G Am F : lifts
MEL=[[76,79,None,84],[74,79,None,83],[76,81,None,84],[77,81,84,None]]  # one note a beat
MELB=[[72,None,76,None],[74,None,79,None],[76,None,81,None],[84,None,None,None]]
ARP=[0,1,2,1,0,2,1,2,0,1,2,1,2,1,0,2]
STAB=[0,3,6,10,12]
nb=int(np.ceil(DUR/bar)); b0=int(round(DROP/bar))
for b in range(nb):
    for st in range(16):
        t0=b*bar+st*s16
        if t0>=END: continue
        sad=t0<HOOK; build=HOOK<=t0<DROP; brk=BRK0<=t0<BRK1; hi=t0>=BRK1; full=t0>=DROP and not brk
        ch=(SAD if t0<DROP else HOPE)[b%4]
        if sad:                                     # half-time: one soft note a beat, long tails, no drums
            if st%4==0 and t0>=.4: add(duck,keys(note(ch[(st//4)%3]+12),2.2,.35),t0,(-.3,.3)[(st//4)%2],.11)
            if st==0: add(duck,pad([note(m) for m in ch],bar+.05),t0,0,.05); add(duck,keys(note(ch[0]-12),bar,.3),t0,0,.12)
            if st in (0,8) and t0>4.2: add(dry,hat(.03,140),t0,.2,.02+.03*(t0-4.2)/6)      # the clock starts ticking as the cycle speeds up
            if st%4==0 and t0>7: add(dry,hat(.03,140),t0,-.2,.03)
            continue
        if build:
            if st%2==0: add(duck,keys(note(ch[ARP[st]]+12),1.0,.5+.3*(t0-HOOK)/(DROP-HOOK)),t0,(-.4,.4)[(st//2)%2],.085)
            if st==0: add(duck,pad([note(m) for m in ch]+[note(ch[0]+12)],bar+.05),t0,0,.06)
            if st%4==0: add(duck,bassn(note(ch[0]-12),s16*3.5),t0,0,.13)
            if st%4==2: add(dry,hat(),t0,.2,.05)
            continue
        g=.06 if brk else .07
        add(duck,pluck(note(ch[ARP[st]]+12+(12 if hi and st%4==2 else 0)),.3,.75 if brk else (1.0 if hi else .88)),t0,(-.55,.55)[st%2],g)
        if st==0:
            add(duck,pad([note(m) for m in ch]+[note(ch[0]+12),note(ch[2]+12)],bar+.05),t0,0,.09 if brk else .07)
        if st%4==0:
            m=(MELB if brk else MEL)[b%4][st//4]
            if m and (brk or hi or (b-b0)%8>=4): add(duck,lead(note(m),beat*(1.9 if brk else 1.2)),t0,.05,.075 if brk else (.06 if hi else .045))
            if brk: add(duck,keys(note(ch[(st//4)%3]+12),1.8,.7),t0,-.2,.1)
        if full:
            drop_bar=(b-b0)%8==7 and not hi          # one bar of air every eight
            if st%4==0 and not (drop_bar and st>=8): add(dry,kick(),t0,0,.6)
            if st%8==4: add(dry,clap(),t0,0,.17)
            if st%4==2: add(dry,hat(.09,45),t0,.25,.085)
            elif st%2==1: add(dry,hat(),t0,-.2,.035)
            if st%4==2: add(duck,bassn(note(ch[0]-12),s16*1.9),t0,0,.22)
            if st%4==3: add(duck,bassn(note(ch[0]),s16*.9),t0,0,.12)
            if st in STAB:
                for m in ch: add(duck,pluck(note(m+12),.22,1.0),t0,0,.04)
            if hi and st in (0,6,12): add(duck,pluck(note(ch[2]+24),.5,1.0),t0,.1,.05)
        elif brk:
            if st%4==0: add(duck,bassn(note(ch[0]-12),s16*3.8),t0,0,.14)
add(dry,riser(2.4),DROP-2.4,0,.16); add(dry,impact(),DROP,0,.5)
for k in range(8): add(dry,clap(),DROP-8*s16+k*s16,0,.05+.012*k)
add(dry,riser(2.0),BRK1-2.0,0,.15); add(dry,impact(),BRK1,0,.45)
for k in range(8): add(dry,clap(),BRK1-8*s16+k*s16,0,.05+.012*k)
add(dry,impact(),END,0,.5)
for m in [48,60,64,67,72,76]: add(duck,pad([note(m)],1.8),END,0,.05)
add(duck,lead(note(84),1.7),END,0,.06)
# sidechain pump on the duck bus
env=np.ones(N); 
for b in range(int(DUR/beat)+1):
    t0=b*beat
    if t0<DROP or (BRK0<=t0<BRK1) or t0>=END: continue
    i=int(t0*SR); n=min(int(beat*SR),N-i); t=np.arange(n)/(beat*SR)
    env[i:i+n]=np.minimum(env[i:i+n],0.28+0.72*np.minimum(1,t/0.55)**1.6)
mix=dry+duck*env[:,None]
ir_n=int(1.3*SR); ir=rng.standard_normal((ir_n,2))*np.exp(-np.arange(ir_n)/SR*4)[:,None]; ir[0]=0
wet=np.stack([fftconvolve(duck[:,c]*env,ir[:,c])[:N] for c in range(2)],1)
mix=mix+0.012*wet
mix=hp(mix.T,28).T
fade=np.ones(N); fi=int(0.25*SR); fo=int(1.0*SR); fade[:fi]=np.linspace(0,1,fi); fade[-fo:]=np.linspace(1,0,fo)**1.5
mix*=fade[:,None]; mix=np.tanh(mix*1.7); mix=mix/np.abs(mix).max()*0.86
wavfile.write('music.wav',SR,(mix*32767).astype(np.int16)); print('ok',round(float(np.sqrt((mix**2).mean())),3))
