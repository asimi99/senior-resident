import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve, butter, lfilter
SR=44100; DUR=74.0; N=int(SR*DUR); rng=np.random.default_rng(11)
BPM=124; beat=60/BPM; bar=4*beat; s16=beat/4
DROP=14.535; BRK0=45.435; BRK1=49.335; END=72.5
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
PROG=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]   # Am F C G
ARP=[0,1,2,1,0,2,1,2,0,1,2,1,2,1,0,2]
STAB=[0,3,6,10,12]           # 16th positions of chord stabs
nb=int(np.ceil(DUR/bar))
for b in range(nb):
    for st in range(16):
        t0=b*bar+st*s16
        if t0>=END: continue
        ch=PROG[b%4]; full=t0>=DROP and not (BRK0<=t0<BRK1); intro=t0<DROP; brk=BRK0<=t0<BRK1
        hi=t0>=BRK1
        # arp
        g=0.055 if intro else (0.06 if brk else 0.075)
        br=min(1.0,0.35+t0/DROP*0.5) if intro else (0.7 if brk else (1.0 if hi else 0.85))
        if not intro or t0>=1.0:
            add(duck,pluck(note(ch[ARP[st]]+12+(12 if hi and st%4==2 else 0)),0.3,br),t0,(-0.55,0.55)[st%2],g)
        if st==0:
            add(duck,pad([note(m) for m in ch]+[note(ch[0]+12)],bar+0.05),t0,0,0.05 if intro else (0.085 if brk else 0.075))
        if full:
            if st%4==0: add(dry,kick(),t0,0,0.62)
            if st%8==4: add(dry,clap(),t0,0,0.17)
            if st%4==2: add(dry,hat(0.09,45),t0,0.25,0.085)
            elif st%2==1: add(dry,hat(),t0,-0.2,0.035)
            if st%4==2: add(duck,bassn(note(ch[0]-12),s16*1.9),t0,0,0.22)
            if st%4==3: add(duck,bassn(note(ch[0]),s16*0.9),t0,0,0.12)
            if st in STAB:
                for m in ch: add(duck,pluck(note(m+12),0.22,1.0),t0,0,0.04)
            if hi and st in (0,6,12):
                add(duck,pluck(note(ch[2]+24),0.5,1.0),t0,0.1,0.05)
        elif intro and t0>=4.84:
            if st%4==2: add(dry,hat(),t0,0.2,0.05)
            if st%4==0: add(duck,bassn(note(ch[0]-12),s16*3.5),t0,0,0.12)
        elif brk:
            if st%4==0: add(duck,bassn(note(ch[0]-12),s16*3.8),t0,0,0.14)
            if st%8==4: add(dry,hat(0.09,45),t0,0.2,0.04)
# transitions
add(dry,riser(2.2),DROP-2.2,0,0.16); add(dry,impact(),DROP,0,0.5)
for k in range(8): add(dry,clap(),DROP-8*s16+k*s16,0,0.05+0.012*k)
add(dry,riser(1.9),BRK1-1.9,0,0.15); add(dry,impact(),BRK1,0,0.45)
for k in range(8): add(dry,clap(),BRK1-8*s16+k*s16,0,0.05+0.012*k)
add(dry,riser(1.4),13.55-1.4,0,0.07)
add(dry,impact(),END,0,0.5)
for m in PROG[0]+[69]: add(duck,pad([note(m)],2.2),END,0,0.05)
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
