#!/usr/bin/env python3
"""EL OBSERVADOR — compositor procedural (numpy + scipy + ffmpeg).

Genera 25 pistas en bucle continuo + efectos (v3.4: trance) y las escribe en js/music_data.js
(OGG Vorbis mono en base64, listo para el juego sin ficheros externos).

Uso:  python3 tools/make_music.py          (todo)
      python3 tools/make_music.py suspense (solo una pista)
Escribe también tools/out/*.ogg para que puedas escucharlas por separado.

Pistas:  menu · b1..b6 (un tema por bloque) · boss
         lullaby (cuna, inactividad) · circus (risas, muchas muertes)
         suspense (miedo/tensión) · flow (ritmo, vas muy bien)
         laugh y sting (efectos puntuales)
"""
import sys, os, base64, json, subprocess, zlib
import numpy as np
from scipy.signal import lfilter, butter, fftconvolve

SR = 22050
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'out')
rng = np.random.default_rng(2026)
META = {}   # nombre → {'laughs': [[inicio_s, duración_s], …]}  (para sincronizar la cara del Observador)
TAU = 2 * np.pi

# ------------------------------------------------------------------ teoría
MODES = {
    'minor': [0, 2, 3, 5, 7, 8, 10], 'dorian': [0, 2, 3, 5, 7, 9, 10],
    'phrygdom': [0, 1, 4, 5, 7, 8, 10], 'lydian': [0, 2, 4, 6, 7, 9, 11],
    'major': [0, 2, 4, 5, 7, 9, 11], 'wholetone': [0, 2, 4, 6, 8, 10, 12],
    'dim': [0, 2, 3, 5, 6, 8, 9], 'phrygian': [0, 1, 3, 5, 7, 8, 10],
}
def deg(root, mode, d):
    m = MODES[mode]; o, i = divmod(int(d), len(m)); return root + 12 * o + m[i]
def chord(root, mode, d, n=3):
    return [deg(root, mode, d + 2 * i) for i in range(n)]
def mtof(m): return 440.0 * 2 ** ((np.asarray(m, dtype=float) - 69) / 12)

# ------------------------------------------------------------ utilidades DSP
def T(d): return np.arange(int(d * SR)) / SR
_filt = {}
def bp(lo, hi):
    k = ('bp', lo, hi)
    if k not in _filt: _filt[k] = butter(2, [lo / (SR / 2), min(hi, SR / 2 - 200) / (SR / 2)], 'band')
    return _filt[k]
def lp(fc):
    k = ('lp', fc)
    if k not in _filt: _filt[k] = butter(2, fc / (SR / 2), 'low')
    return _filt[k]
def hp(fc):
    k = ('hp', fc)
    if k not in _filt: _filt[k] = butter(2, fc / (SR / 2), 'high')
    return _filt[k]
def filt(x, f): return lfilter(f[0], f[1], x)
def noise(d): return rng.standard_normal(int(d * SR))

def tone(f, d, harm=(1.0,), a=0.02, r=0.2, tau=None, vibd=0.0, vibr=5.5, vph=0.0):
    """Síntesis aditiva con ataque, sostenido (o caída exponencial) y relajación."""
    n = int((d + r) * SR); t = np.arange(n) / SR
    ph = f * (t + (vibd * (1 - np.cos(TAU * vibr * t + vph)) / (TAU * vibr) if vibd else 0))
    x = np.zeros(n)
    for k, h in enumerate(harm, 1):
        if h and f * k < SR / 2.2: x += h * np.sin(TAU * k * ph)
    env = np.minimum(1, t / max(a, 1e-4))
    if tau: env = env * np.exp(-t / tau)
    rel = np.clip((d + r - t) / r, 0, 1) if r > 0 else 1
    return x * env * rel
def bell(f, d=1.6, ratio=3.5, idx=2.5, tau=0.7):
    t = T(d)
    return np.sin(TAU * f * t + idx * np.exp(-t / (tau * .6)) * np.sin(TAU * f * ratio * t)) * np.exp(-t / tau) * np.minimum(1, t / 0.003)
def pluck(f, d=1.0, tau=0.35, nh=7):
    t = T(d); x = np.zeros_like(t)
    for k in range(1, nh + 1):
        if f * k < SR / 2.2: x += np.sin(TAU * k * f * t) / k * np.exp(-t * k / tau)
    return x * np.minimum(1, t / 0.002)
def bassn(f, d=0.4, drive=2.2, tau=0.5):
    t = T(d)
    x = np.tanh(drive * np.sin(TAU * f * t)) + 0.3 * np.sin(TAU * 2 * f * t)
    return x * np.exp(-t / tau) * np.minimum(1, t / 0.004) * np.clip((d - t) / 0.03, 0, 1)
def saw(f, d, nh=14, a=0.02, r=0.2, vibd=0.0, vibr=5.5, det=0.0, cut=None):
    h = [1 / k for k in range(1, nh + 1)]
    if cut: h = [x * (1 / (1 + (k * f / cut) ** 4)) for k, x in enumerate(h, 1)]
    x = tone(f, d, h, a, r, vibd=vibd, vibr=vibr)
    if det: x = 0.5 * (x + tone(f * (1 + det), d, h, a, r, vibd=vibd, vibr=vibr, vph=1.3))
    return x
def kick(v=1.0, f0=130, f1=42, d=0.32):
    t = T(d); fr = f1 + (f0 - f1) * np.exp(-t * 28)
    return np.sin(TAU * np.cumsum(fr) / SR) * np.exp(-t * 9) * v
def tom(f=110, d=0.35, v=1.0):
    t = T(d); fr = f * (1 + .6 * np.exp(-t * 22))
    return (np.sin(TAU * np.cumsum(fr) / SR) + .15 * filt(noise(d), bp(300, 1500)) * np.exp(-t * 30)) * np.exp(-t * 7) * v
def snare(v=1.0, d=0.2):
    t = T(d); return (filt(noise(d), bp(1200, 7000)) * np.exp(-t * 20) * .8 + np.sin(TAU * 190 * t) * np.exp(-t * 28) * .5) * v
def clap(v=1.0):
    d = 0.22; t = T(d); x = filt(noise(d), bp(900, 4500))
    e = np.exp(-t * 26) + .7 * np.exp(-np.clip(t - .014, 0, None) * 26) * (t > .014) + .5 * (np.exp(-np.clip(t - .028, 0, None) * 22)) * (t > .028)
    return x * e * v * .6
def hat(v=1.0, d=0.05):
    t = T(d); return filt(noise(d), hp(6500)) * np.exp(-t * (900 / (d * 1000 + 1) * 1.0)) * v * .5
def tick(v=1.0):
    t = T(0.03); return np.sin(TAU * 2400 * t) * np.exp(-t * 180) * v * .4
def swell(d, lo, hi, v=1.0, peak=.6):
    t = T(d); e = np.sin(np.pi * np.clip(t / d, 0, 1) ** (1 / max(peak * 2, .2) if peak < .5 else 1)) ** 2
    return filt(noise(d), bp(lo, hi)) * e * v
def rev(x): return x[::-1].copy()
def crush(x, bits=5, hold=4):
    y = np.round(x * (2 ** bits)) / (2 ** bits)
    return np.repeat(y[::hold], hold)[:len(x)]
def formant(f, d, F, bw=(110, 150), a=0.05, r=0.15, vibd=0.012, vibr=5.0, nh=30):
    """Voz sintética: armónicos moldeados por formantes (vocales)."""
    h = []
    for k in range(1, nh + 1):
        fr = k * f
        h.append(sum(np.exp(-((fr - Fi) / b) ** 2) for Fi, b in zip(F, bw)) + 0.04 / k)
    return tone(f, d, h, a, r, vibd=vibd, vibr=vibr)
VOW = {'a': (800, 1250), 'o': (500, 850), 'u': (330, 760), 'e': (520, 1850), 'i': (300, 2300)}

def laugh_voice(f0=300, bursts=8, gap=0.17, v=1.0, vow='a', glide=-.22, decay=.97, jitter=.012):
    """Risa sintética: ráfagas 'ha' con aspiración, formantes y caída de tono."""
    total = bursts * gap + .3; out = np.zeros(int(total * SR)); vol = 1.0
    for i in range(bursts):
        d = gap * .62; t = T(d)
        fr = f0 * (1 + .05 * i * glide) * (1 + glide * t / d * .35)
        ph = np.cumsum(fr) / SR
        x = np.zeros_like(t)
        for k in range(1, 28):
            if f0 * k < 5200:
                x += sum(np.exp(-((f0 * k - Fi) / b) ** 2) for Fi, b in zip(VOW[vow], (130, 190))) * np.sin(TAU * k * ph + .3 * k)
        x += 0.5 * filt(noise(d), bp(1500, 4500)) * np.exp(-t * 40)
        e = np.minimum(1, t / .012) * np.exp(-t * 11) * np.clip((d - t) / .02, 0, 1)
        x = x * e * vol * v
        s = int((i * gap + rng.normal(0, jitter)) * SR); s = max(0, s)
        out[s:s + len(x)] += x[:len(out) - s]
        vol *= decay
    return out

class Track:
    def __init__(s, seconds, pad=4.0):
        s.n = int(seconds * SR); s.sec = seconds; s.buf = np.zeros(s.n + int(pad * SR))
    def add(s, t, x, g=1.0):
        i = int(round(t * SR))
        if i < 0 or i >= len(s.buf): return
        j = min(len(s.buf), i + len(x)); s.buf[i:j] += g * x[:j - i]
    def duck(s, beats, depth=.55, rel=.18):
        """Sidechain: baja el volumen del bus en cada golpe (para el 'bombeo' rítmico)."""
        g = np.ones(len(s.buf))
        for b in beats:
            i = int(b * SR); L = int(rel * SR)
            if i < len(g): seg = g[i:i + L]; seg *= 1 - depth * np.exp(-np.linspace(0, 5, len(seg)))
        return g
    def finish(s, wet=.25, rt=2.0, level=.12, hpf=35, tilt=None):
        y = s.buf
        if wet > 0:
            nir = int(rt * SR); t = np.arange(nir) / SR
            ir = filt(rng.standard_normal(nir), lp(4500 if not tilt else tilt)) * np.exp(-t * 6.9 / rt)
            ir[:int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR)); ir /= np.sqrt((ir ** 2).sum()) + 1e-9
            y = (1 - wet * .5) * np.concatenate([y, np.zeros(nir - 1)]) + wet * 2.2 * fftconvolve(y, ir)
        out = np.zeros(s.n)
        for st in range(0, len(y), s.n):
            seg = y[st:st + s.n]; out[:len(seg)] += seg
        out = filt(out - out.mean(), hp(hpf))
        out = out - .4 * filt(out, lp(110))   # menos sub-grave: altavoces de móvil/portátil
        fl = int(.008 * SR); rmp = .5 - .5 * np.cos(np.linspace(0, np.pi, fl)); out[:fl] *= rmp; out[-fl:] *= rmp[::-1]
        out *= level / (np.sqrt((out ** 2).mean()) + 1e-9)
        pk = np.abs(out).max()
        if pk > .85: out = np.tanh(out / pk * 1.6) / np.tanh(1.6) * .85
        return out

def swing_t(i, beat, sw=.0):  # posición de corcheas con swing
    return (i // 2) * beat + (i % 2) * beat * (.5 + sw)

# ============================================================== PISTAS
def t_menu():
    bpm = 66; beat = 60 / bpm; bar = beat * 4; prog = [0, 0, 3, 3, 6, 4]
    tr = Track(len(prog) * bar)
    for b, d in enumerate(prog):
        t0 = b * bar; ch = chord(50, 'dorian', d)
        for m in ch: tr.add(t0, tone(mtof(m), bar, (1, .5, .22), a=1.3, r=1.6, vibd=.004, vibr=.35, vph=m), .17)
        tr.add(t0, tone(mtof(ch[0] - 12), bar, (1, .35), a=.4, r=.9), .33)
        tr.add(t0 + bar * .55, swell(bar * .7, 1800, 6000, .08))
        c5 = chord(74, 'dorian', d)
        for i, p in enumerate([0, 1, 2, 4, 2, 1, 0, 1]):
            n = c5[p % 3] + 12 * (p // 3)
            tr.add(t0 + i * beat / 2, bell(mtof(n), 1.8, 4.0, 1.4, .8), .16 if i % 2 == 0 else .1)
    mel = [(0, 7, 3), (3.5, 5, 1), (5, 4, 2), (8, 5, 3), (11.5, 2, 1.5), (14, 3, 4), (20, 4, 2), (22.5, 5, 1.5)]
    for bt, dg, du in mel:
        tr.add(bt * beat, tone(mtof(deg(62, 'dorian', dg)), du * beat * .9, (1, .25, .1), a=.06, r=.7, vibd=.006, vph=dg), .19)
    for b in range(len(prog)): tr.add(b * bar + 3 * beat, tick(.5), .15)   # el Observador parpadea
    return tr.finish(wet=.42, rt=3.2, level=.11)

def t_b1():   # LA INICIACIÓN — Am, curiosa, ligera
    bpm = 84; beat = 60 / bpm; bar = beat * 4; prog = [0, 5, 2, 6] * 2
    tr = Track(8 * bar); kicks = []
    for b, d in enumerate(prog):
        t0 = b * bar; ch = chord(45, 'minor', d)
        for m in ch: tr.add(t0, tone(mtof(m), bar, (1, .4, .2), a=.5, r=.8, vibd=.003, vph=m), .13)
        for i in range(8): tr.add(t0 + i * beat / 2, bassn(mtof(ch[0] - 12 + (7 if i in (3, 6) else 0)), beat * .45, 1.8, .22), .3 if i % 2 == 0 else .18)
        for i in range(8): tr.add(t0 + i * beat / 2 + beat / 4 * (i % 2), hat(.5 if i % 2 else .3), .1)
        tr.add(t0, kick(.7, 110, 45, .25), .35); tr.add(t0 + 2 * beat, kick(.5, 110, 45, .25), .25); kicks += [t0, t0 + 2 * beat]
    m1 = [(0, 7, 1), (1, 9, 1), (2, 8, 2), (4, 7, 1), (5, 5, 1.5), (8, 9, 1), (9, 10, 1), (10, 9, 2),
          (12, 7, 1.5), (14, 8, 2), (17, 11, 1), (18, 9, 1), (19, 7, 1), (20, 8, 2), (24, 7, 1), (25, 9, 1), (26, 10, 3), (30, 8, 2)]
    for bt, dg, du in m1:
        tr.add(bt * beat, bell(mtof(deg(69, 'minor', dg - 7)), 1.5, 3.5, 1.6, .65), .27)
    for b in range(8): tr.add(b * bar + 2.5 * beat, pluck(mtof(deg(81, 'minor', [0, 2, 4, 2][b % 4])), .6, .25), .1)
    return tr.finish(wet=.3, rt=2.0, level=.115)

def t_b2():   # LA DESCONFIANZA — todo ligeramente desafinado
    bpm = 92; beat = 60 / bpm; bar = beat * 4; tr = Track(8 * bar)
    roots = [54, 54, 51, 51, 56, 56, 53, 54]
    for b, r0 in enumerate(roots):
        t0 = b * bar
        for m in (r0, r0 + 6, r0 + 12):
            tr.add(t0, tone(mtof(m), bar, (1, .3, .5, .15), a=.9, r=1.0, vibd=.01, vibr=.7, vph=m), .12)
        tr.add(t0, tone(mtof(r0 - 24), bar, (1, .4), a=.2, r=.5), .3)
        for i in range(8):
            if i % 2: tr.add(t0 + i * beat / 2, tick(.7), .22)
        # caja de música desafinada: dos voces +- 35 cents
        pat = [0, 2, 4, 6, 4, 2, 0, 3]
        for i, p in enumerate(pat):
            f = mtof(deg(r0 + 24, 'wholetone', p))
            for c in (-.02, .02): tr.add(t0 + i * beat / 2, bell(f * (1 + c), 1.2, 5.1, 1.2, .5), .09)
        tr.add(t0 + 3 * beat, rev(bell(mtof(r0 + 31), 1.4, 3.5, 2.0, .9)), .2)   # campana al revés: duda
    for bt, m in [(1, 78), (3, 77), (9, 76), (11, 74), (17, 78), (19, 75), (25, 73), (27, 74)]:
        tr.add(bt * beat, tone(mtof(m), beat * 1.6, (1, .2), a=.1, r=.8, vibd=.02, vibr=4.2), .13)
    return tr.finish(wet=.38, rt=2.6, level=.11)

def t_b3():   # LA MANIPULACIÓN — frigio dominante, bajo sinuoso, chasquidos
    bpm = 100; beat = 60 / bpm; bar = beat * 4; tr = Track(8 * bar); sw = .14
    walk = [[0, 2, 4, 5], [0, 4, 3, 2], [5, 4, 2, 1], [0, 1, 2, 4]] * 2
    for b in range(8):
        t0 = b * bar; ch = chord(50, 'phrygdom', [0, 0, 5, 0][b % 4])
        for m in ch: tr.add(t0, saw(mtof(m), bar, 8, .25, .6, vibd=.004, cut=900), .09)
        for i, dg in enumerate(walk[b]):
            tr.add(t0 + i * beat, bassn(mtof(deg(38, 'phrygdom', dg)), beat * .9, 2.0, .45), .36)
        for i in range(8): tr.add(t0 + swing_t(i, beat / 1, sw) * .5 * 2 / 2 * 1.0 if False else t0 + swing_t(i, beat, sw) * 0 + (i // 2) * beat + (i % 2) * beat * (.5 + sw), hat(.4), .1)
        tr.add(t0 + beat, clap(.6), .25); tr.add(t0 + 3 * beat, clap(.6), .25)
        tr.add(t0, kick(.8, 100, 44, .28), .3); tr.add(t0 + 2.5 * beat, kick(.5, 100, 44, .28), .22)
    mel = [(0, 7, 1), (1.5, 8, .5), (2, 11, 2), (4.5, 8, .5), (5, 7, 1), (6, 4, 1.5), (8, 7, 1), (9.5, 8, .5), (10, 12, 2), (12.5, 11, .5), (13, 8, 1), (14, 7, 2),
           (16, 11, 1), (17.5, 12, .5), (18, 14, 2), (20.5, 12, .5), (21, 11, 1), (22, 8, 2), (24, 7, 2), (26.5, 8, 1), (28, 7, 3)]
    for bt, dg, du in mel:
        f0 = mtof(deg(62, 'phrygdom', dg - 7)); f1 = f0 * 2 ** (-.5 / 12)   # portamento: la serpiente
        x = tone(f0, du * beat * .8, (1, .5, .25, .12), a=.02, r=.25, tau=1.1, vibd=.006, vibr=5.2)
        tr.add(bt * beat, x, .2)
    return tr.finish(wet=.22, rt=1.6, level=.12)

def t_b4():   # LA PARANOIA — latido, reloj, cuerdas en trémolo
    bpm = 72; beat = 60 / bpm; bar = beat * 4; tr = Track(8 * bar)
    clus = [(48, 49, 54), (48, 49, 55), (46, 47, 53), (48, 54, 55)]
    for b in range(8):
        t0 = b * bar; c = clus[b % 4]
        for k, m in enumerate(c):
            x = saw(mtof(m + 12), bar, 10, .5, .8, cut=2200)
            trem = .55 + .45 * np.sin(TAU * (8.5 + k) * T(bar + .8))
            tr.add(t0, x * trem[:len(x)], .12)
        tr.add(t0, tone(mtof(c[0] - 24), bar, (1, .5), a=.3, r=.6), .38)
        for i in range(4):
            tr.add(t0 + i * beat, kick(1.0, 90, 38, .3), .33); tr.add(t0 + i * beat + beat * .28, kick(.7, 90, 38, .25), .22)   # lub-dub
        for i in range(16): tr.add(t0 + i * beat / 4 * (1 if b < 4 else .97), tick(.5 + .5 * (i % 4 == 0)), .1)
        if b % 2 == 1: tr.add(t0 + 2.3 * beat, swell(1.4, 2500, 8000, .6), .12)
    for bt, m0, m1 in [(2, 84, 83), (10, 86, 85), (19, 82, 81), (26, 88, 87)]:
        d = 2.2 * beat; t = T(d); fr = mtof(m0) * 2 ** (-(m0 - m1) / 12 * t / d)
        x = np.sin(TAU * np.cumsum(fr) / SR + .6 * np.sin(TAU * 5.5 * t)) * np.sin(np.pi * t / d) ** 1.5
        tr.add(bt * beat, x, .11)
    return tr.finish(wet=.34, rt=2.4, level=.11)

def t_b5():   # LA RUPTURA — beat roto, glitch y bitcrush
    bpm = 118; beat = 60 / bpm; bar = beat * 4; tr = Track(12 * bar)
    kpat = [0, 1.5, 2.25, 3, 3.75]; roots = [40, 40, 43, 38] * 3
    for b in range(12):
        t0 = b * bar; r0 = roots[b]
        for k in kpat:
            if not (b % 4 == 3 and k == 3.75): tr.add(t0 + k * beat, kick(.9, 120, 40, .26), .32)
        tr.add(t0 + beat, snare(.8), .25); tr.add(t0 + 2.75 * beat, snare(.5), .18)
        if b % 4 == 3:
            for i in range(8): tr.add(t0 + 3 * beat + i * beat / 8, snare(.3 + i * .08), .16)
        for i in range(16):
            if rng.random() < .8: tr.add(t0 + i * beat / 4, hat(.4 + .3 * (i % 4 == 2)), .09)
        x = saw(mtof(r0), bar, 10, .02, .1, det=.012, cut=700)
        tr.add(t0, x, .22 * np.ones(1)[0])
        arp = [0, 7, 12, 15, 12, 7, 3, 7]
        for i in range(16):
            if rng.random() < .85:
                n = r0 + 24 + arp[i % 8] + (12 if b % 4 == 3 and i % 3 == 0 else 0)
                tr.add(t0 + i * beat / 4, crush(pluck(mtof(n), .22, .12), 5, 3), .13)
    ph = np.concatenate([bell(mtof(76), .3, 3.5, 2, .2), bell(mtof(79), .3, 3.5, 2, .2)])   # frase que se atasca
    for st in (3.2, 3.2 + 4 * 4 * beat, 3.2 + 8 * 4 * beat):
        slc = ph[:int(.07 * SR)]
        for i in range(6): tr.add(st + i * .07 + 8 * beat, slc, .2 / (1 + i * .1))
        for i in range(6): tr.add(st + 16 * beat + 8 * beat + i * .07, slc, .2)
    return tr.finish(wet=.15, rt=1.2, level=.125)

def t_b6():   # LA CONCIENCIA — coro, arpa, esperanza inquietante
    bpm = 76; beat = 60 / bpm; bar = beat * 4; tr = Track(8 * bar); prog = [0, 4, 3, 1, 0, 5, 3, 4]
    for b, d in enumerate(prog):
        t0 = b * bar; r0 = deg(48, 'lydian', d)
        for k, (m, v) in enumerate([(r0, 'o'), (r0 + 7, 'a'), (r0 + 12, 'o'), (r0 + 16, 'u')]):
            tr.add(t0, formant(mtof(m + 12 * (k > 1) * 0), bar, VOW[v], a=1.0, r=1.4, vibd=.007, vibr=4.6 + k * .3), .08)
        tr.add(t0, tone(mtof(r0 - 12), bar, (1, .3), a=.5, r=1.0), .32)
        for i in range(8):
            n = deg(60, 'lydian', d + [0, 2, 4, 7, 9, 7, 4, 2][i])
            tr.add(t0 + i * beat / 2, pluck(mtof(n), 1.4, .6), .17)
        tr.add(t0 + 2 * beat, bell(mtof(deg(84, 'lydian', d + [4, 2, 0, 1][b % 4])), 2.5, 3.0, 1.3, 1.2), .14)
    tr.add(0, swell(8 * bar * .5, 3000, 8000, .05), 1)
    return tr.finish(wet=.5, rt=4.0, level=.1)

def t_boss():
    bpm = 140; beat = 60 / bpm; bar = beat * 4; tr = Track(16 * bar)
    roots = [33, 33, 29, 31, 33, 33, 36, 34] * 2
    for b, r0 in enumerate(roots):
        t0 = b * bar
        for i in range(4): tr.add(t0 + i * beat, kick(1.0, 140, 40, .3), .36)
        for i in range(8): tr.add(t0 + i * beat / 2 + beat / 2 * 0, tom(78 + 20 * (i % 3), .3), .16 if i % 2 == 0 else .1)
        tr.add(t0 + beat, snare(.9), .26); tr.add(t0 + 3 * beat, snare(.9), .26)
        for i in range(16):
            if i not in (2, 7, 11): tr.add(t0 + i * beat / 4, bassn(mtof(r0 + 12 * (i % 4 == 3)), beat * .24, 2.5, .3), .3)
        for m in (r0 + 24, r0 + 27, r0 + 31): tr.add(t0, saw(mtof(m), bar * .9, 12, .06, .25, vibd=.006, cut=1800), .1)
        for i in (0, 1.5, 3):   # estocadas de cuerda
            tr.add(t0 + i * beat, saw(mtof(r0 + 36), beat * .3, 10, .005, .08, cut=3000), .12)
    for b in range(8, 16):
        for bt, dg in [(0, 0), (1, 2), (1.5, 4), (2.5, 3), (3, 2)]:
            tr.add(b * bar + bt * beat, saw(mtof(deg(69, 'phrygian', dg + (b % 4))), beat * .45, 12, .01, .1, vibd=.008, cut=3200), .1)
    for b in (7, 15):
        tr.add(b * bar, swell(bar, 400, 9000, 1.0, .5) * np.linspace(0, 1, int(bar * SR)), .5)
        for i in range(8): tr.add(b * bar + 2 * beat + i * beat / 4, snare(.3 + i * .1), .2)
    return tr.finish(wet=.2, rt=1.5, level=.135)

def t_lullaby():   # NANA — caja de música que sabe algo
    bpm = 66; beat = 60 / bpm; bar = beat * 3; bars = 8; tr = Track(bars * bar)
    mel = [(0, 0, 2), (2, 2, 1), (3, 4, 2), (5, 2, 1), (6, 0, 2), (8, 1, 1), (9, 3, 2), (11, 1, 1),
           (12, 4, 2), (14, 5, 1), (15, 4, 2), (17, 2, 1), (18, 0, 2), (20, 2, 1), (21, 4, 2), (23, 1, 1)]
    for i, (bt, dg, du) in enumerate(mel):
        f = mtof(deg(72, 'major', dg))
        if i == 9: f *= 2 ** (-.45 / 12)               # una nota ligeramente rota
        x = bell(f, 2.2, 4.1, .9, 1.1) * (1 + .12 * np.sin(TAU * 4.7 * T(2.2)))
        tr.add(bt * beat, x, .26)
    for b in range(bars):
        t0 = b * bar; r0 = deg(48, 'major', [0, 3, 4, 0, 5, 3, 4, 0][b])
        tr.add(t0, tone(mtof(r0), bar, (1, .5, .2), a=.8, r=1.0, vibd=.003, vibr=.3), .12)
        for i in range(3): tr.add(t0 + i * beat, bell(mtof(r0 + 12 + [0, 4, 7][i]), 1.3, 4.2, .5, .5), .07)
    tr.add(0, swell(bars * bar * .96, 600, 2500, .18, .5))   # respiración
    return tr.finish(wet=.4, rt=3.0, level=.1)

def t_circus():
    bpm = 150; beat = 60 / bpm; bar = beat * 4; bars = 16; tr = Track(bars * bar)
    prog = [0, 0, 3, 4, 0, 5, 4, 0, 0, 0, 3, 4, 5, 3, 4, 0]
    CM = 'major'
    for b, d in enumerate(prog):
        t0 = b * bar; ch = chord(48, CM, d)
        for i in range(4):
            if i % 2 == 0: tr.add(t0 + i * beat, bassn(mtof(ch[0] - 12 + (7 if i == 2 else 0)), beat * .45, 1.4, .25), .45)
            else:
                for m in ch: tr.add(t0 + i * beat, tone(mtof(m + 12), beat * .25, (1, .6, .4), a=.004, r=.05), .13)
        if b % 4 == 3:
            for i in range(8): tr.add(t0 + 2 * beat + i * beat / 4, snare(.3 + i * .09), .17)
        tr.add(t0, hat(1, .12), .12)
    motif = [(0, 4, .5), (.5, 2, .5), (1, 4, .5), (1.5, 7, .5), (2, 9, 1), (3, 7, 1)]
    var = [lambda d: d, lambda d: d + 1, lambda d: d, lambda d: d - 2]
    for b in range(bars):
        for bt, dg, du in motif:
            dd = var[(b // 4) % 4](dg) + (2 if b % 4 == 3 else 0)
            f = mtof(deg(72, CM, dd)) * (1 + (.012 if b % 8 >= 4 else 0))     # desafinada a ratos
            tr.add(b * bar + bt * beat, saw(f, du * beat * .9, 14, .008, .06, vibd=.012, vibr=6.5, det=.006), .16)
    META['circus'] = {'laughs': []}
    for b, v, f0 in [(3, 1.0, 330), (7, 1.0, 250), (11, 1.0, 420), (15, 1.0, 210)]:
        tr.add(b * bar + 2 * beat, laugh_voice(f0, 9, .19, 1.0, 'a', -.25), .26)
        META['circus']['laughs'].append([round(b * bar + 2 * beat, 2), 2.0])
    return tr.finish(wet=.2, rt=1.4, level=.125)

def t_suspense():   # TENSIÓN — sin pulso fijo: latido, Shepard ascendente y cuerdas rotas
    dur = 24.0; tr = Track(dur, pad=5.0); t = T(dur + 5.0)
    tr.add(0, tone(mtof(26), dur, (1, .4, .15), a=.1, r=3.0, vibd=.002, vibr=.2), .5)
    tr.add(0, tone(mtof(26.2), dur, (1, .3), a=.1, r=3.0, vibd=.002, vibr=.23, vph=1), .4)
    # Shepard: sube y se pliega sobre sí mismo (el oído nunca llega arriba)
    nO = 7; fb = 30.0; sh = np.zeros(len(t)); T0 = dur
    for k in range(nO):
        pos = (k + (t % T0) / T0)
        f = fb * 2 ** pos
        ph = TAU * fb * T0 / np.log(2) * 2 ** (k + t / T0) if False else np.cumsum(f) / SR * TAU
        amp = np.exp(-((pos - nO / 2) ** 2) / 2.2)
        sh += np.sin(ph) * amp
    tr.add(0, sh, .09)
    # latido que se acelera
    bt = 0.0; gap = 1.2
    while bt < dur:
        tr.add(bt, kick(1.0, 80, 36, .35), .3); tr.add(bt + .26, kick(.6, 80, 36, .3), .2)
        bt += gap; gap = max(.62, gap * .955)
    # cuerdas agudas en glissando disonante (segundas menores)
    for st, m0, m1, d in [(2, 88, 87.2, 5), (4.5, 91, 90.3, 4), (9, 85, 86, 5), (13, 93, 92, 4), (17, 87, 86, 5), (20, 90, 89.4, 3.5)]:
        tt = T(d); fr = mtof(m0) * 2 ** ((m1 - m0) / 12 * tt / d)
        x = (np.sin(TAU * np.cumsum(fr) / SR) + .4 * np.sin(TAU * 2 * np.cumsum(fr) / SR)) * np.sin(np.pi * tt / d) ** 1.4
        x *= .7 + .3 * np.sin(TAU * 6.5 * tt)
        tr.add(st, x, .075)
    # plink de piano muerto + campanas al revés en momentos irregulares
    for st, m in [(1.1, 51), (6.3, 52), (10.7, 58), (15.2, 59), (19.5, 51), (22.1, 46)]:
        tr.add(st, bell(mtof(m), 2.2, 2.0, 1.0, 1.0), .22)
    for st, m in [(7.4, 75), (16.6, 76)]: tr.add(st, rev(bell(mtof(m), 1.6, 3.5, 2.0, .9)), .2)
    for st in (3.3, 12.1, 18.6):   # metal raspado
        d = .9; x = filt(noise(d), bp(1200, 5200)) * np.sin(TAU * 83 * T(d)) * np.exp(-T(d) * 3.5)
        tr.add(st, x, .35)
    return tr.finish(wet=.45, rt=3.4, level=.1)

def t_flow():   # RITMO — vas bien; el juego te anima (sol mayor, bombeo, 124 bpm)
    bpm = 124; beat = 60 / bpm; bar = beat * 4; bars = 16; tr = Track(bars * bar)
    prog = [0, 4, 5, 3] * 4; kicks = []
    for b, d in enumerate(prog):
        t0 = b * bar; r0 = deg(43, 'major', d); ch = chord(55, 'major', d)
        for i in range(4):
            tr.add(t0 + i * beat, kick(1.0, 125, 45, .26), .38); kicks.append(t0 + i * beat)
            tr.add(t0 + i * beat + beat / 2, hat(1.0, .06), .14)
        tr.add(t0 + beat, clap(1.0), .26); tr.add(t0 + 3 * beat, clap(1.0), .26)
        for i in range(16):
            if i % 4 != 0 or i == 0: tr.add(t0 + i * beat / 4, hat(.4, .03), .05)
        for i, o in enumerate([0, 0, 12, 0, 0, 7, 0, 12]):   # bajo sincopado
            tr.add(t0 + i * beat / 2 + (beat / 4 if i in (3, 6) else 0), bassn(mtof(r0 + o), beat * .4, 2.2, .3), .34)
        for i in range(16):   # arpegio brillante
            n = deg(67, 'major', d + [0, 2, 4, 2, 7, 4, 2, 4][i % 8] + (7 if b >= 8 and i % 4 == 3 else 0))
            tr.add(t0 + i * beat / 4, pluck(mtof(n), .3, .16, 6), .13)
    pad = np.zeros(len(tr.buf))
    for b, d in enumerate(prog):
        for m in chord(55, 'major', d):
            x = saw(mtof(m), bar * .98, 8, .05, .3, det=.004, cut=1600); pad[int(b * bar * SR):int(b * bar * SR) + len(x)] += x[:len(pad) - int(b * bar * SR)] * .1
    pad *= tr.duck(kicks, .6, .2); tr.buf += pad
    lead = [(16, 9, .5), (16.5, 11, .5), (17, 12, 1), (18.5, 11, .5), (19, 9, 1), (20, 7, .5), (20.5, 9, .5), (21, 11, 1.5),
            (24, 12, .5), (24.5, 14, .5), (25, 16, 1), (26.5, 14, .5), (27, 12, 1), (28, 11, 1), (29, 9, 1), (30, 11, 2)]
    for bt, dg, du in lead + [(x + 32, y, z) for x, y, z in lead]:
        tr.add(bt * beat, saw(mtof(deg(67, 'major', dg - 5)), du * beat * .9, 10, .01, .12, vibd=.004, cut=2800), .15)
    tr.add(0, swell(bar, 500, 9000, .8, .5) * np.linspace(0, 1, int(bar * SR)), .22) if False else None
    return tr.finish(wet=.15, rt=1.1, level=.12)

def fx_laugh():   # carcajada del Observador: grave + risita aguda
    tr = Track(3.2, pad=1.0)
    tr.add(0.00, laugh_voice(130, 8, .21, 1.0, 'a', -.3, .94), .8)
    tr.add(0.45, laugh_voice(520, 10, .13, .5, 'e', -.2, .96), .5)
    tr.add(1.05, laugh_voice(165, 6, .24, .8, 'o', -.35, .93), .5)
    y = tr.buf[:tr.n].copy(); tr.buf = np.zeros_like(tr.buf); tr.buf[:tr.n] = y
    out = tr.finish(wet=.25, rt=1.4, level=.16)
    return out
def fx_sting():   # golpe de tensión (entrada al suspense)
    tr = Track(2.4, pad=2.0)
    for m in (38, 39, 45, 50, 57): tr.add(0, saw(mtof(m), .25, 12, .004, 1.4, cut=2500), .22)
    tr.add(0, kick(1, 70, 30, .9), .9); tr.add(0, noise(.25) * np.exp(-T(.25) * 12), .3)
    tr.add(0, rev(bell(mtof(82), 1.2, 3.5, 2, .8)), .15)
    return tr.finish(wet=.45, rt=2.2, level=.17)


# ======================================================== TRANCE (v3.4)
def supersaw(f, d, a=.012, r=.12, nh=12, det=(-.012, -.005, 0, .005, .012), cut=3200, vibd=0.0):
    """Cinco sierras ligeramente desafinadas: el sonido 'uplifting' de Armin van Buuren & co."""
    x = None
    for k, dt in enumerate(det):
        ff = f * (1 + dt)
        h = [(1.0 / j) / (1 + (j * ff / cut) ** 4) for j in range(1, nh + 1)]
        v = tone(ff, d, h, a, r, vibd=vibd, vibr=5.2, vph=k * 1.3)
        x = v if x is None else x + v
    return x / (len(det) * .55)
def crash(d=2.2, v=1.0):
    t = T(d); return filt(noise(d), hp(5200)) * np.exp(-t * 2.4) * v * .5
def riser(d, v=1.0):
    t = T(d); x = filt(noise(d), bp(500, 9500)) * (t / d) ** 1.6
    return x * v
def snare_roll(tr, t0, beat, n=16, g=.18):
    for i in range(n): tr.add(t0 + i * beat / 4 * (4 * (16 / n) / 4), snare(.25 + .75 * i / n), g * (.5 + .5 * i / n))

def hook_notes(h):
    """'0:7:1 1:9:.5 …'  → [(beat, grado, duración)]"""
    return [tuple(float(v) for v in tok.split(':')) for tok in h.split()]

TR = {}
def trance(name, bpm, root, mode, prog, hook, lead='super', bass='off', energy=2, bars=16, sections=None,
           arp=(0, 1, 2, 1, 2, 1, 2, 1), lead_oct=0, hat_open=True, extra=(), laughs=(), wet=.2, rt=1.4, level=.12,
           kick_f=(150, 46), kdepth=.55, stab=True):
    beat = 60. / bpm; bar = 4 * beat; sec = bars * bar
    S_ = sections or (['i'] * 4 + ['b'] * 4 + ['k'] * 3 + ['r'] + ['d'] * 4)
    rh = Track(sec); pad = Track(sec); ld = Track(sec); ar = Track(sec); kicks = []
    hk = hook_notes(hook)
    for b in range(bars):
        t0 = b * bar; sc = S_[b]; d = prog[b % len(prog)]
        ch = chord(root + 12, mode, d); r0 = deg(root - 12, mode, d)
        has_k = sc in ('i', 'b', 'd') or (sc == 'k' and 'kickbreak' in extra)
        if has_k:
            kv = (.55 if sc == 'i' and energy < 2 else 1.0)
            for i in range(4):
                rh.add(t0 + i * beat, kick(kv, kick_f[0], kick_f[1], .30), .42); kicks.append(t0 + i * beat)
        if sc in ('i', 'b', 'd'):
            for i in range(4):
                rh.add(t0 + i * beat + beat / 2, hat(1.0, .13 if hat_open else .05), .11 if sc != 'i' else .07)
            if energy >= 2 or sc == 'd':
                for i in range(16):
                    if i % 2 == 1: rh.add(t0 + i * beat / 4, hat(.4, .03), .045)
        if sc in ('b', 'd'):
            rh.add(t0 + beat, clap(1.0), .22 if sc == 'b' else .27); rh.add(t0 + 3 * beat, clap(1.0), .22 if sc == 'b' else .27)
        if sc in ('b', 'd') or (sc == 'i' and b >= 2 and energy >= 2):
            if bass == 'off':
                for i in range(4): rh.add(t0 + i * beat + beat / 2, bassn(mtof(r0), beat * .42, 2.2, .34), .36)
            elif bass == 'roll':
                for i in range(4):
                    for j in (1, 2, 3): rh.add(t0 + i * beat + j * beat / 4, bassn(mtof(r0 + (12 if j == 2 and i % 2 else 0)), beat * .21, 2.4, .2), .33)
            else:   # galope (boss)
                for i in range(4):
                    for j in (1, 2, 3): rh.add(t0 + i * beat + j * beat / 4, bassn(mtof(r0 + (7 if (i + j) % 4 == 3 else 0)), beat * .2, 3.0, .17), .35)
        # pad / acordes
        if sc in ('k', 'b', 'd'):
            for m in ch:
                x = supersaw(mtof(m), bar * .98, a=.2 if sc == 'k' else .05, r=.3, nh=10, cut=1500 if sc == 'k' else 2600, det=(-.01, -.004, .004, .01))
                pad.add(t0, x, .085 if sc == 'k' else .075)
            if 'choir' in extra and sc in ('k', 'd'):
                for kk, (m, v) in enumerate([(ch[0], 'a'), (ch[1], 'o'), (ch[2], 'u')]):
                    pad.add(t0, formant(mtof(m + 12), bar, VOW[v], a=.6, r=.8, vibd=.007, vibr=4.8 + kk * .3), .05)
        if stab and sc == 'd':
            for i in range(4):
                for m in ch: ar.add(t0 + i * beat + beat / 2, supersaw(mtof(m + 12), beat * .22, a=.004, r=.05, nh=8, cut=3400, det=(-.008, 0, .008)), .05)
        # arpegio (puerta rítmica 16avos)
        if sc in ('i', 'b', 'd') and (sc != 'i' or b >= 2):
            pool = [ch[0], ch[1], ch[2], ch[0] + 12]
            for i in range(16):
                n = pool[arp[i % len(arp)] % 4] + (12 if sc == 'd' and i % 4 == 3 else 0)
                ar.add(t0 + i * beat / 4, pluck(mtof(n + 12), .26, .12, 6), .07 if sc != 'd' else .085)
        if sc == 'r':
            rh.add(t0, riser(bar, 1.0), .22)
            snare_roll(rh, t0 + 2 * beat, beat, 8, .20); snare_roll(rh, t0 + 3 * beat, beat, 16, .24)
            rh.add(t0 + 3 * beat, rev(crash(beat * 1.0, 1.0)), .3)
        if sc == 'd' and b == 12 + 0:
            rh.add(t0, crash(2.4, 1.0), .38)
        if sc == 'k' and b == 8:
            rh.add(t0, crash(2.6, .8), .2)
    # melodía (4 compases, se repite)
    for b in range(bars):
        sc = S_[b]
        if sc not in ('k', 'd', 'r') and not (sc == 'b' and b >= 6 and lead in ('pluck', 'bell')): continue
        bb = b % 4; t0 = b * bar
        for bt, dg, du in hk:
            if int(bt // 4) != bb: continue
            n = deg(root + 12 + 12 * lead_oct + (12 if sc == 'd' and lead in ('super',) and 'oct' in extra else 0), mode, int(dg) - 7 + 7)
            f = mtof(n); tt = t0 + (bt - 4 * bb) * beat; dd = max(du * beat * .92, .06)
            if lead == 'super': x = supersaw(f, dd, a=.008, r=.10, nh=14, cut=4200, vibd=.004)
            elif lead == 'pluck': x = pluck(f, dd + .3, .3, 7)
            elif lead == 'bell': x = bell(f, dd + 1.0, 3.5, 1.6, .7)
            elif lead == 'voice': x = formant(f, dd, VOW['a'], a=.04, r=.12, vibd=.01, vibr=5.2)
            else: x = saw(f, dd, 12, .01, .1, vibd=.006, det=.006, cut=3000)
            g = .14 if sc != 'r' else .1
            ld.add(tt, x, g)
            ld.add(tt + beat * .75, x, g * .38); ld.add(tt + beat * 1.5, x, g * .17)     # eco de corchea con puntillo
    mix = rh.buf + pad.buf * pad.duck(kicks, kdepth, .2) + ar.buf * ar.duck(kicks, kdepth * .8, .16) + ld.buf * ld.duck(kicks, kdepth * .45, .14)
    tr = Track(sec); tr.buf = mix
    META[name] = {'laughs': []}
    for (lb, lt, lf, lv) in laughs:
        tr.add(lb * bar + lt * beat, laugh_voice(lf, 8, .16, 1.0, lv, -.24, .95), .22)
        META[name]['laughs'].append([round(lb * bar + lt * beat, 2), 1.7])
    return tr.finish(wet=wet, rt=rt, level=level)

def t_t1():   # LA INICIACIÓN (trance) — curiosa, ligera: pluck + campanas, 128 bpm, La menor
    return trance('t1', 128, 45, 'minor', [0, 5, 2, 6],
        '0:7:1 1:9:.5 1.5:8:.5 2:7:1 3:4:1  4:5:1 5:7:.5 5.5:8:.5 6:9:2  8:9:1 9:11:.5 9.5:12:.5 10:11:1 11:9:1  12:8:1 13:7:1 14:6:1 15:4:1',
        lead='pluck', energy=1, arp=(0, 1, 2, 1, 0, 2, 1, 2), kdepth=.45, wet=.26)
def t_t2():   # LA DESCONFIANZA (trance) — oscuro, bajo rodante, campana que no encaja, 132 bpm, Fa# menor
    return trance('t2', 132, 42, 'phrygian', [0, 0, 5, 4],
        '0:7:.5 .5:7:.25 .75:8:.25 1:7:.5 1.5:5:.5 2:4:1  4:7:.5 4.5:7:.25 4.75:8:.25 5:9:.5 5.5:8:.5 6:7:1  8:5:.5 8.5:5:.25 8.75:7:.25 9:8:.5 9.5:7:.5 10:5:1  12:4:1 13:5:1 14:4:1 15:1:1',
        lead='bell', bass='roll', energy=2, arp=(0, 2, 1, 2, 0, 1, 2, 3), wet=.3, rt=1.8)
def t_t3():   # LA MANIPULACIÓN (trance) — sinuoso, progresivo, 134 bpm, Fa frigio dominante
    return trance('t3', 134, 41, 'phrygdom', [0, 0, 5, 0],
        '0:7:1 1.5:8:.5 2:11:2 4.5:8:.5 5:7:1 6:4:1.5  8:7:1 9.5:8:.5 10:12:2 12.5:11:.5 13:8:1 14:7:2  16:11:1 17.5:12:.5 18:14:2 20.5:12:.5 21:11:1 22:8:2  24:7:2 26.5:8:1 28:7:3',
        lead='saw', bass='off', energy=2, arp=(0, 1, 2, 3, 2, 1, 0, 2), kdepth=.6)
def t_t4():   # LA PARANOIA (trance) — latido, trémolo, tensión, 138 bpm, Mi menor
    return trance('t4', 138, 40, 'minor', [0, 6, 5, 6],
        '0:7:.5 .5:7:.5 1:9:1 2:7:.5 2.5:6:.5 3:4:1  4:7:.5 4.5:7:.5 5:9:1 6:11:1 7:9:1  8:7:.5 8.5:7:.5 9:9:1 10:7:.5 10.5:6:.5 11:4:1  12:6:2 14:4:2',
        lead='super', bass='roll', energy=2, extra=('kickbreak',), arp=(0, 0, 1, 2, 0, 0, 2, 1), kdepth=.65, wet=.25)
def t_t5():   # LA RUPTURA (trance) — beat que se rompe, glitch, 140 bpm, Sol menor
    return trance('t5', 140, 43, 'minor', [0, 0, 2, 6],
        '0:7:.25 .25:7:.25 .5:9:.5 1:7:.5 1.5:10:.5 2:9:1  4:7:.25 4.25:7:.25 4.5:9:.5 5:12:.5 5.5:10:.5 6:9:1  8:10:.5 8.5:9:.5 9:7:1 10:9:.5 10.5:10:.5 11:12:1  12:14:.5 12.5:12:.5 13:10:1 14:9:2',
        lead='super', bass='roll', energy=3, arp=(0, 2, 1, 3, 0, 2, 3, 1), kdepth=.6, wet=.16, rt=1.1)
def t_t6():   # LA CONCIENCIA (trance) — coro, esperanza, drop enorme, 136 bpm, La menor/Fa
    return trance('t6', 136, 45, 'minor', [0, 5, 2, 6],
        '0:9:1.5 1.5:8:.5 2:9:1 3:11:1  4:12:1.5 5.5:11:.5 6:9:2  8:9:1.5 9.5:8:.5 10:9:1 11:11:1  12:14:2 14:12:1 15:11:1',
        lead='super', bass='off', energy=3, extra=('choir', 'oct'), arp=(0, 1, 2, 3, 2, 1, 2, 3), wet=.3, rt=2.0, kdepth=.6)
def t_euphoria():   # FLOW (trance) — vas muy bien: uplifting, 138 bpm, Sol menor
    return trance('euphoria', 138, 43, 'minor', [0, 5, 2, 6],
        '0:11:1 1:12:.5 1.5:14:.5 2:12:1 3:11:1  4:9:1 5:11:.5 5.5:12:.5 6:14:2  8:11:1 9:12:.5 9.5:14:.5 10:16:1.5 12:14:1 13:12:1 14:11:2',
        lead='super', bass='off', energy=3, extra=('oct',), sections=['i', 'b', 'b', 'b', 'k', 'k', 'k', 'r', 'd', 'd', 'd', 'd', 'd', 'd', 'd', 'd'], arp=(0, 1, 2, 1, 2, 3, 2, 1), kdepth=.6, level=.125)
def t_circus2():   # FESTIVAL — circo con ritmo de club: calíope sobre bajo trance + risas, 140 bpm, Do mayor
    return trance('circus2', 140, 48, 'major', [0, 4, 5, 3],
        '0:7:.5 .5:9:.5 1:11:.5 1.5:9:.5 2:7:1 3:4:1  4:7:.5 4.5:9:.5 5:11:.5 5.5:12:.5 6:11:2  8:12:.5 8.5:11:.5 9:9:.5 9.5:11:.5 10:12:1 11:14:1  12:12:.5 12.5:11:.5 13:9:.5 13.5:7:.5 14:7:2',
        lead='saw', bass='off', energy=2, sections=['i', 'i', 'b', 'b', 'b', 'b', 'k', 'r', 'd', 'd', 'd', 'd', 'k', 'k', 'r', 'd'],
        laughs=[(2, 0, 300, 'a'), (6, 2, 420, 'e'), (9, 0, 240, 'o'), (13, 1, 360, 'a')], wet=.22, kdepth=.5)
def t_boss2():   # JEFE (hard trance) — 146 bpm, galope, Fa# menor
    return trance('boss2', 146, 42, 'minor', [0, 0, 5, 4],
        '0:7:.5 .5:7:.5 1:9:.5 1.5:10:.5 2:12:1 3:10:.5 3.5:9:.5  4:7:.5 4.5:7:.5 5:9:.5 5.5:10:.5 6:14:2  8:12:.5 8.5:10:.5 9:9:.5 9.5:10:.5 10:12:1 11:14:1  12:14:.5 12.5:12:.5 13:10:.5 13.5:9:.5 14:7:2',
        lead='super', bass='gallop', energy=3, extra=('oct', 'kickbreak'), kick_f=(170, 44), sections=['i', 'b', 'b', 'b', 'd', 'd', 'd', 'r', 'd', 'd', 'd', 'd', 'k', 'k', 'k', 'r'],
        arp=(0, 2, 1, 3, 0, 2, 3, 1), kdepth=.6, wet=.16, level=.13)
def t_coop():   # COOPERATIVO — fiesta pop-trance en Do mayor, 128 bpm: I V vi IV
    return trance('coop', 128, 48, 'major', [0, 4, 5, 3],
        '0:7:1 1:9:.5 1.5:11:.5 2:12:1 3:11:1  4:9:1 5:11:.5 5.5:12:.5 6:14:2  8:12:1 9:11:.5 9.5:9:.5 10:11:1 11:12:1  12:14:1 13:12:1 14:11:2',
        lead='super', bass='off', energy=2, extra=('oct',), arp=(0, 1, 2, 3, 2, 1, 2, 1), kdepth=.5, wet=.22)
def t_menu2():   # MENÚ (trance chill) — 118 bpm, sin drop, La menor
    return trance('menu2', 118, 45, 'minor', [0, 5, 2, 6],
        '0:7:2 2:9:1 3:8:1  4:7:2 6:5:2  8:9:2 10:11:1 11:9:1  12:8:2 14:7:2',
        lead='bell', bass='off', energy=1, sections=['i'] * 4 + ['b'] * 4 + ['k'] * 4 + ['b'] * 4, arp=(0, 1, 2, 1), kdepth=.35, wet=.4, rt=2.6, level=.1, stab=False)
def fx_win():   # jingle de nivel superado (≈3,4 s, uplifting)
    beat = 60 / 138.; tr = Track(3.4, pad=2.0)
    for i, n in enumerate([57, 60, 64, 69, 72, 76]):
        tr.add(i * beat * .5, supersaw(mtof(n), beat * .6, a=.005, r=.12, nh=10, cut=4000), .2)
    for m in (57, 60, 64, 69, 76): tr.add(3 * beat, supersaw(mtof(m), 1.6, a=.01, r=.9, nh=10, cut=4200), .16)
    tr.add(3 * beat, kick(1, 150, 46, .3), .5); tr.add(3 * beat, crash(1.6), .3)
    y = tr.buf[:tr.n].copy(); tr.buf = np.zeros_like(tr.buf); tr.buf[:tr.n] = y
    return tr.finish(wet=.3, rt=1.8, level=.16)
def fx_giggle():   # risita suelta (para el fondo)
    tr = Track(1.6, pad=.6); tr.add(0, laugh_voice(560, 6, .11, 1.0, 'e', -.18, .92), .8); tr.add(.08, laugh_voice(430, 5, .13, .6, 'i', -.2, .93), .5)
    y = tr.buf[:tr.n].copy(); tr.buf = np.zeros_like(tr.buf); tr.buf[:tr.n] = y
    return tr.finish(wet=.2, rt=1.0, level=.15)
def fx_crowd():   # público riéndose (varias voces solapadas)
    tr = Track(3.6, pad=1.0)
    for i, (st, f0, v) in enumerate([(0, 210, 'a'), (.15, 330, 'o'), (.32, 260, 'a'), (.5, 440, 'e'), (.7, 180, 'o'), (.95, 380, 'a'), (1.2, 300, 'e')]):
        tr.add(st, laugh_voice(f0, 7, .17 + .01 * i, .7, v, -.25, .95), .35)
    y = tr.buf[:tr.n].copy(); tr.buf = np.zeros_like(tr.buf); tr.buf[:tr.n] = y
    return tr.finish(wet=.35, rt=1.8, level=.15)

TRACKS = {'menu': t_menu, 'b1': t_b1, 'b2': t_b2, 'b3': t_b3, 'b4': t_b4, 'b5': t_b5, 'b6': t_b6,
          'boss': t_boss, 'lullaby': t_lullaby, 'circus': t_circus, 'suspense': t_suspense,
          'flow': t_flow, 'laugh': fx_laugh, 'sting': fx_sting,
          't1': t_t1, 't2': t_t2, 't3': t_t3, 't4': t_t4, 't5': t_t5, 't6': t_t6, 'euphoria': t_euphoria,
          'circus2': t_circus2, 'boss2': t_boss2, 'coop': t_coop, 'menu2': t_menu2,
          'win': fx_win, 'giggle': fx_giggle, 'crowd': fx_crowd}

def encode(name, y, q=0):
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2').tobytes()
    p = os.path.join(OUT, name + '.ogg')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libvorbis', '-q:a', str(q), p], input=pcm, check=True)
    return p

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    which = sys.argv[1:] or list(TRACKS)
    data = {}
    for name in TRACKS:
        if name not in which and not os.path.exists(os.path.join(OUT, name + '.ogg')): continue
        if name in which:
            rng = np.random.default_rng(zlib.crc32(name.encode()))     # mismo resultado en cada ejecución
            y = TRACKS[name](); p = encode(name, y)
            print('%-9s %5.1fs  rms %.3f  pico %.2f  seam %.3f  %4d KB' % (name, len(y) / SR, np.sqrt((y ** 2).mean()), np.abs(y).max(), abs(y[0] - y[-1]), os.path.getsize(p) // 1024))
        data[name] = base64.b64encode(open(os.path.join(OUT, name + '.ogg'), 'rb').read()).decode()
    mp = os.path.join(OUT, 'meta.json')
    meta = json.load(open(mp)) if os.path.exists(mp) else {}
    meta.update(META); json.dump(meta, open(mp, 'w'))
    js = os.path.join(ROOT, '..', 'js', 'music_data.js')
    with open(js, 'w') as f:
        f.write('/* Generado por tools/make_music.py — no editar a mano. OGG Vorbis mono 22,05 kHz en base64. */\n')
        f.write('window.EO = window.EO || {};\nEO.MUSIC_DATA = ' + json.dumps(data) + ';\n')
        f.write('EO.MUSIC_META = ' + json.dumps(meta) + ';   // momentos de risa dentro de cada pista (para animar al Observador)\n')
    print('js/music_data.js:', os.path.getsize(js) // 1024, 'KB')
