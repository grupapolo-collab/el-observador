#!/usr/bin/env python3
"""Prueba de extremo a extremo del modo ONLINE con DOS navegadores reales (Chromium) y el servidor real.
Requisitos: pip install playwright && playwright install chromium ; cd server && npm install
Uso:  python3 test/e2e-online.py            (arranca el servidor solo, en el puerto 8099)"""
import subprocess, time, os, sys, json
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('E2E_PORT', '8099'))
URL = f'http://localhost:{PORT}/'
fails, passes = [], 0
def ok(c, name, extra=''):
    global passes
    if c: passes += 1; print('  ok  ', name)
    else: fails.append(name); print('  FALLA', name, extra)

env = dict(os.environ)
if os.path.isdir('/opt/npm-tools/node_modules'): env['NODE_PATH'] = '/opt/npm-tools/node_modules' + os.pathsep + env.get('NODE_PATH', '')   # (solo en este entorno de pruebas; normalmente basta `cd server && npm install`)
srv = subprocess.Popen(['node', os.path.join(ROOT, 'server', 'server.js'), str(PORT)], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
import socket
for _ in range(100):
    if srv.poll() is not None: print('el servidor no arrancó:', srv.stdout.read().decode()); sys.exit(2)
    try: socket.create_connection(('127.0.0.1', PORT), timeout=.2).close(); break
    except OSError: time.sleep(.1)
ST = "(()=>{const S=EO.Coop._t.state();return S})()"

def S(pg, expr):  # evalúa una expresión sobre el estado del coop
    return pg.evaluate("(()=>{const S=EO.Coop._t.state(); return " + expr + "})()")

def wait_for(pg, expr, ms=15000, step=100):
    t = 0
    while t < ms:
        try:
            if pg.evaluate(expr): return True
        except Exception: pass
        pg.wait_for_timeout(step); t += step
    return False

try:
    with sync_playwright() as p:
        br = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        errs = []
        def page(name, **kw):
            ctx = br.new_context(viewport={'width': 1100, 'height': 650}, **kw)
            pg = ctx.new_page()
            pg.on('console', lambda m, n=name: errs.append((n, m.text)) if m.type == 'error' else None)
            pg.on('pageerror', lambda e, n=name: errs.append((n, 'pageerror ' + str(e))))
            pg.goto(URL); pg.wait_for_timeout(800)
            return ctx, pg
        ca, A = page('host'); cb, B = page('guest')

        print('# 1. Sala'); 
        A.fill('#ol-name', 'Ana') if A.is_visible('#ol-name') else None
        A.click('#m-online'); A.fill('#ol-name', 'Ana'); A.click('#ol-create')
        ok(wait_for(A, "document.getElementById('ol-code').textContent.length===5 && !/·/.test(document.getElementById('ol-code').textContent)"), 'anfitrión recibe código de 5 caracteres')
        code = A.inner_text('#ol-code').strip()
        B.click('#m-online'); B.fill('#ol-name', 'Beto'); B.fill('#ol-code-in', code.lower()); B.click('#ol-join-btn')
        ok(wait_for(B, "!document.getElementById('ol-room').classList.contains('hidden')"), 'invitado entra en la sala')
        ok(wait_for(A, "document.getElementById('ol-go').disabled===false"), 'anfitrión: «Empezar» se habilita cuando están los dos')
        ok('Beto' in A.inner_text('#ol-players') and 'Ana' in B.inner_text('#ol-players'), 'cada uno ve el nombre del otro')

        print('# 2. Partida (versus para probar carrera)')
        A.select_option('#ol-mode', 'mixto'); A.click('#ol-go')
        ok(wait_for(A, "EO.Coop.active===true") and wait_for(B, "EO.Coop.active===true"), 'los dos entran en la partida')
        ok(wait_for(A, "EO.Coop._t.state().phase==='play'", 9000) and wait_for(B, "EO.Coop._t.state().phase==='play'", 9000), 'cuenta atrás sincronizada → play')
        sa, sb = S(A, "S.seed"), S(B, "S.seed"); ok(sa == sb and sa > 0, f'misma semilla ({sa}) → mismo nivel')
        ok(S(A, "S.lvl.W") == S(B, "S.lvl.W") and S(A, "S.type") == S(B, "S.type"), 'mismo nivel y ronda')
        ok(S(A, "S.names.join()") == 'Ana,Beto' == S(B, "S.names.join()"), 'nombres en ambos lados')
        off = A.evaluate("EO.Net._dbg().offset"), B.evaluate("EO.Net._dbg().offset")
        ok(all(o is not None for o in off), f'desfase de reloj calculado {off}')

        print('# 3. Se ve al contrincante')
        x0a, x0b = S(A, "S.p[0].x"), S(B, "S.p[0].x")
        A.keyboard.down('KeyD'); A.wait_for_timeout(1500); A.keyboard.up('KeyD'); A.wait_for_timeout(500)
        xa, xb = S(A, "S.p[0].x"), S(B, "S.p[0].x")
        ok(xa - x0a > 200, f'P1 (anfitrión) avanza en su pantalla: {x0a:.0f}→{xa:.0f}')
        ok(abs(xa - xb) < 60 and xb - x0b > 150, f'el invitado VE avanzar a P1: {x0b:.0f}→{xb:.0f} (dif {abs(xa-xb):.0f}px)')
        y0 = S(B, "S.p[1].x")
        B.keyboard.down('ArrowRight'); B.wait_for_timeout(1200); B.keyboard.up('ArrowRight'); B.wait_for_timeout(500)
        ya, yb = S(A, "S.p[1].x"), S(B, "S.p[1].x")
        ok(yb - y0 > 150 and abs(ya - yb) < 60, f'el anfitrión VE avanzar a P2: {y0:.0f}→{ya:.0f} (real {yb:.0f})')
        def respawn_both():
            for pg in (A, B):
                pg.evaluate("(()=>{const S=EO.Coop._t.state();const me=S.p[S.slot];me.x=S.lvl.spawn.x+S.slot*46;me.y=S.lvl.spawn.y;me.vx=me.vy=0;me.alive=true;me.inv=me.weak=me.boost=0;})()")
            A.wait_for_timeout(700)
        respawn_both()
        # salto: B salta y A lo ve subir
        yb0 = S(B, "S.p[1].y"); ymin_a = 1e9; ymin_b = 1e9
        B.keyboard.down('ArrowUp')
        for _ in range(16):
            ymin_a = min(ymin_a, S(A, "S.p[1].y")); ymin_b = min(ymin_b, S(B, "S.p[1].y")); B.wait_for_timeout(40)
        B.keyboard.up('ArrowUp'); B.wait_for_timeout(800)
        ok(yb0 - ymin_b > 60, f'el salto de P2 funciona en su pantalla (subió {yb0-ymin_b:.0f}px)')
        ok(yb0 - ymin_a > 40, f'el anfitrión VE saltar a P2 (subió {yb0-ymin_a:.0f}px)')
        ok(S(A, "S.p[1].alive") is True and S(B, "S.p[0].alive") is True, 'ambos siguen vivos')

        print('# 4. Eventos: ayuda / sabotaje / chispas')
        respawn_both()
        A.evaluate("EO.Coop._t.state().p[0].energy=100")
        A.keyboard.press('KeyQ')
        ok(wait_for(B, "EO.Coop._t.state().p[1].boost===1", 3000), 'ayuda de P1 → P2 recibe «salto potenciado»')
        A.evaluate("EO.Coop._t.state().p[0].energy=100")
        A.keyboard.press('KeyE')
        ok(wait_for(B, "(()=>{const S=EO.Coop._t.state();return S.say&&/→/.test(S.say.txt)||S.fx.some(f=>f.k==='tele')})()", 3000), 'sabotaje de P1 aparece en la pantalla de P2')
        B.wait_for_timeout(1800)
        # chispa: A recoge la primera chispa → B la ve recogida
        og = A.evaluate("(()=>{const S=EO.Coop._t.state();const o=S.lvl.orbs[0];const me=S.p[S.slot];me.x=o.x-15;me.y=o.y-20;me.vx=me.vy=0;return 1})()")
        ok(wait_for(B, "EO.Coop._t.state().lvl.orbs[0].got===1", 3000), 'la chispa que recoge P1 desaparece también en la pantalla de P2')
        respawn_both()
        # plataforma que se rompe: P1 pisa una y B la ve temblar
        ci = A.evaluate("(()=>{const S=EO.Coop._t.state();return S.lvl.plats.findIndex(q=>q.kind==='crumble')})()")
        if ci >= 0:
            A.evaluate(f"(()=>{{const S=EO.Coop._t.state();const q=S.lvl.plats[{ci}];const me=S.p[S.slot];me.x=q.x+q.w/2-15;me.y=q.y-40;me.vx=me.vy=0;}})()")
            ok(wait_for(B, f"EO.Coop._t.state().lvl.plats[{ci}].state>=1", 3000), 'la plataforma que se rompe cae en las DOS pantallas')
        else: print('  (sin plataformas frágiles en esta ronda)')
        respawn_both()

        print('# 5. Rondas: ambos a la puerta')
        def to_door():
            for pg in (A, B):
                pg.evaluate("(()=>{const S=EO.Coop._t.state();const me=S.p[S.slot];const D=S.lvl.door;me.x=D.x+12;me.y=D.y+D.h-me.h-1;me.vy=0;me.vx=0;me.alive=true;})()")
        rounds_seen = []
        for r in range(5):
            if not wait_for(A, f"EO.Coop._t.state().round=={r} && EO.Coop._t.state().phase==='play'", 14000):
                ok(False, f'ronda {r+1} llega a «play»'); break
            rounds_seen.append(S(A, "S.type"))
            ok(S(B, "S.type") == S(A, "S.type"), f'ronda {r+1} ({S(A,"S.type")}): mismo tipo en los dos')
            for _ in range(40):
                to_door()
                A.wait_for_timeout(150)
                if S(A, "S.phase") in ('end', 'final'): break
            ok(wait_for(B, "['end','final'].includes(EO.Coop._t.state().phase)", 6000), f'ronda {r+1}: el invitado también ve el final de ronda')
        ok(wait_for(A, "EO.Coop._t.state().phase==='final'", 12000) and wait_for(B, "EO.Coop._t.state().phase==='final'", 12000), 'marcador final en los dos')
        pa, pb = S(A, "S.p.map(p=>p.pts).join()"), S(B, "S.p.map(p=>p.pts).join()")
        ok(pa == pb, f'puntos idénticos en ambos ({pa})')

        print('# 6. Revancha')
        A.keyboard.press('Enter')
        ok(wait_for(A, "!document.getElementById('screen-online').classList.contains('hidden')", 5000) and wait_for(B, "!document.getElementById('screen-online').classList.contains('hidden')", 5000), 'los dos vuelven a la sala')
        ok(wait_for(A, "document.getElementById('ol-go').disabled===false", 5000), 'revancha: «Empezar» disponible')
        seed1 = sa; A.click('#ol-go')
        ok(wait_for(A, "EO.Coop.active && EO.Coop._t.state().phase==='countdown'") and wait_for(B, "EO.Coop.active"), 'segunda partida arranca')
        ok(S(A, "S.seed") != seed1, 'semilla nueva en la revancha')
        wait_for(A, "EO.Coop._t.state().phase==='play'", 9000)

        print('# 7. Caída de red y reconexión')
        B.evaluate("EO.Net._drop()")
        ok(wait_for(B, "EO.Net.connected===true", 8000), 'el invitado se reconecta solo con su token')
        A.wait_for_timeout(600)
        xa1 = S(B, "S.p[0].x"); A.keyboard.down('KeyD'); A.wait_for_timeout(900); A.keyboard.up('KeyD'); A.wait_for_timeout(500)
        ok(S(B, "S.p[0].x") - xa1 > 100, 'tras reconectar se sigue viendo al rival')

        print('# 8. Salir')
        A.keyboard.press('Escape'); A.wait_for_timeout(300); A.keyboard.press('Escape')
        ok(wait_for(B, "document.getElementById('ol-status').textContent.length>0 || !EO.Coop.active", 5000), 'al salir el anfitrión, el rival es avisado')
        ok(wait_for(A, "EO.Coop.active===false", 3000), 'el anfitrión vuelve al menú')

        # captura final
        ok(not [e for e in errs if 'favicon' not in e[1]], 'sin errores de consola/página', str(errs[:5]))
        br.close()
finally:
    srv.terminate()

print(f'\nonline e2e · {passes} ok / {len(fails)} fallos'); 
if fails: print('FALLOS:', fails); sys.exit(1)
