'use strict';
/* Pruebas del servidor de salas: node test/run.js  (dentro de server/)
   Lógica con sockets falsos + pruebas con WebSocket y HTTP reales (v4.1: reglas, aspecto, revancha, hosting del juego).
   Requisito del prompt maestro: nada de código sin validar. */
const assert = require('assert');
const { makeHub, start, STATE, cleanName, cleanLook, cleanCfg, originAllowed } = require('../server.js');
let pass = 0, fail = 0;
function ok(cond, name) { if (cond) { pass++; } else { fail++; console.log(' ✗', name); } }

/* ---------------------------------------- sockets falsos */
function fakeSock() { return { open: true, sent: [], closed: null, send(x) { this.sent.push(JSON.parse(x)); }, close(c, r) { this.closed = { c, r }; this.open = false; }, last() { return this.sent[this.sent.length - 1]; } }; }
function hub() { return makeHub({ reconnectMs: 50, startDelay: 30 }); }

/* ---------------------------------------- 1. creación y unión */
{
  const H = hub(), a = fakeSock();
  H.handle(a, JSON.stringify({ t: 'create', name: ' Ana ' }));
  const c = a.last();
  ok(c.t === 'created' && c.code.length === 5 && /^[A-Z2-9]+$/.test(c.code) && c.slot === 0 && c.token, 'create: código de 5 caracteres + token + slot 0');
  ok(a.last().code, 'create: responde con código');
  const b = fakeSock();
  H.handle(b, JSON.stringify({ t: 'join', code: c.code, name: 'Bea' }));
  ok(b.last().t === 'joined' && b.last().slot === 1, 'join: segundo jugador entra en slot 1');
  const d = fakeSock();
  H.handle(d, JSON.stringify({ t: 'join', code: c.code, name: 'Cleo' }));
  ok(d.last().t === 'error' && d.last().code === 'EFULL', 'join: máximo 2 jugadores (EFULL)');
  ok(H.get(c.code).state === STATE.WAITING, 'estado inicial WAITING');
}
/* ---------------------------------------- 2. sala inexistente / estados */
{
  const H = hub(), a = fakeSock();
  H.handle(a, JSON.stringify({ t: 'join', code: 'ZZZZZ' }));
  ok(a.last().code === 'ENOENT', 'join: sala inexistente → ENOENT');
  H.handle(a, JSON.stringify({ t: 'start' }));
  ok(a.last().code === 'ESTATE', 'start: sin sala → ESTATE');
}
/* ---------------------------------------- 3. ready / start / permisos */
{
  const H = hub(), a = fakeSock(), b = fakeSock();
  H.handle(a, JSON.stringify({ t: 'create', name: 'A' }));
  const code = a.last().code;
  H.handle(b, JSON.stringify({ t: 'join', code, name: 'B' }));
  H.handle(a, JSON.stringify({ t: 'ready', ready: true }));
  ok(H.get(code).state === STATE.WAITING, 'ready: con uno solo no pasa a READY');
  H.handle(b, JSON.stringify({ t: 'ready', ready: true }));
  ok(H.get(code).state === STATE.READY, 'ready: los dos listos → READY');
  H.handle(b, JSON.stringify({ t: 'start' }));
  ok(b.last().code === 'EHOST', 'start: el invitado no arranca (EHOST)');
  H.handle(a, JSON.stringify({ t: 'start' }));
  ok(a.last().t === 'started' && H.get(code).state === STATE.STARTING, 'start: el anfitrión arranca → STARTING');
  H.get(code).state = STATE.PLAYING;   /* (el retardo de arranque se prueba en WS real) */
  H.handle(b, JSON.stringify({ t: 'finish' }));
  ok(b.last().code === 'EHOST', 'finish: sólo el anfitrión cierra');
  H.handle(a, JSON.stringify({ t: 'finish', result: { p1: 3, p2: 1 } }));
  ok(a.last().t === 'finished' && H.get(code).state === STATE.FINISHED, 'finish: anfitrión cierra → FINISHED');
}
/* ---------------------------------------- 4. state: relevo y límites */
{
  const H = hub(), a = fakeSock(), b = fakeSock();
  H.handle(a, JSON.stringify({ t: 'create', name: 'A' }));
  const code = a.last().code;
  H.handle(b, JSON.stringify({ t: 'join', code, name: 'B' }));
  H.handle(a, JSON.stringify({ t: 'ready', ready: true }));
  H.handle(b, JSON.stringify({ t: 'ready', ready: true }));
  H.handle(a, JSON.stringify({ t: 'start' }));
  H.get(code).state = STATE.PLAYING;
  H.handle(a, JSON.stringify({ t: 'state', data: { x: 1, y: 2 } }));
  ok(b.last().t === 'state' && b.last().from === 0 && b.last().data.x === 1, 'state: el rival recibe el estado del otro');
  H.handle(a, JSON.stringify({ t: 'state', data: 'x'.repeat(3000) }));
  ok(a.closed && a.closed.c === 1009, 'state: payload > 2 KB → cierre 1009');
}
/* ---------------------------------------- 5. límites de mensaje */
{
  const H = hub(), a = fakeSock();
  H.handle(a, Buffer.from('x'));
  ok(a.closed && a.closed.c === 1002, 'mensaje binario sin JSON válido → 1002');
  H.handle(a, 'no es json');
  ok(a.closed && a.closed.c === 1002, 'JSON inválido → 1002');
  H.handle(a, 'x'.repeat(5000));
  ok(a.closed && a.closed.c === 1009, 'mensaje > 4 KB → 1009');
  const H2 = hub(), c = fakeSock();
  for (let i = 0; i < 91; i++) H2.handle(c, JSON.stringify({ t: 'ping' }));
  ok(c.closed && c.closed.c === 1008, '91 mensajes/s → 1008 (límite de frecuencia)');
  ok(c.sent.some(m => m.t === 'pong'), 'ping → pong');
}
/* ---------------------------------------- 6. reconexión con token */
{
  const H = hub(), a = fakeSock(), b = fakeSock();
  H.handle(a, JSON.stringify({ t: 'create', name: 'A' }));
  const code = a.last().code, tokB = (H.handle(b, JSON.stringify({ t: 'join', code, name: 'B' })), b.last().token);
  H.handle(b, JSON.stringify({ t: 'leave' }));
  ok(H.get(code).players[1].conn === null, 'leave: el invitado queda desconectado');
  const b2 = fakeSock();
  H.handle(b2, JSON.stringify({ t: 'join', code, token: tokB }));
  ok(b2.last().t === 'joined' && b2.last().reconnected === true && b2.last().slot === 1, 'reconexión: token válido → mismo slot');
  const b3 = fakeSock();
  H.handle(b3, JSON.stringify({ t: 'join', code, token: 'falso' }));
  ok(b3.last().code === 'ETOKEN', 'reconexión: token falso → ETOKEN');
}
/* ---------------------------------------- 7. abandono total → cierre inmediato */
{
  const H = hub(), a = fakeSock(), b = fakeSock();
  H.handle(a, JSON.stringify({ t: 'create', name: 'A' }));
  const code = a.last().code;
  H.handle(b, JSON.stringify({ t: 'join', code, name: 'B' }));
  H.handle(a, JSON.stringify({ t: 'leave' }));
  ok(H.rooms.has(code), 'leave: queda alguien → la sala sigue');
  H.handle(b, JSON.stringify({ t: 'leave' }));
  ok(!H.rooms.has(code), 'leave: abandono explícito de todos → cierre inmediato');
}
{
  const H = hub(), a = fakeSock();
  H.handle(a, JSON.stringify({ t: 'create', name: 'A' }));
  const code = a.last().code, tok = a.last().token;
  H.detach(a);            /* caída de conexión (no abandono explícito) */
  H.sweepAll();
  ok(H.rooms.has(code), 'sweep: DENTRO de la ventana de reconexión la sala sobrevive');
  const b2 = fakeSock();
  H.handle(b2, JSON.stringify({ t: 'join', code, token: tok }));
  ok(b2.last().reconnected === true, 'reconexión tardía dentro de la ventana');
  H.detach(b2); H.get(code).players.forEach(p => { if (p && !p.conn) p.disconnectedAt = Date.now() - 60000; });
  H.sweepAll();
  ok(!H.rooms.has(code), 'sweep: FUERA de la ventana la sala se cierra');
}
/* ---------------------------------------- 8. nombres y miscelánea */
{
  ok(cleanName('Lu\x00is') === 'Luis' && cleanName('muylargo-demasiado-largo') === 'muylargo-dem', 'cleanName: control chars + 12 caracteres');
  ok(cleanName('') === 'Jugador' && cleanName(null) === 'Jugador', 'cleanName: vacío → Jugador');
  const H = hub(), a = fakeSock();
  H.handle(a, JSON.stringify({ t: 'create', name: 'A' }));
  H.handle(a, JSON.stringify({ t: 'create', name: 'A' }));
  ok(a.last().code === 'ESTATE', 'create: no se crea una segunda sala desde la misma conexión');
  H.handle(a, JSON.stringify({ t: 'inventado' }));
  ok(a.last().t === 'error' && a.last().code === 'EBAD', 'tipo desconocido → EBAD');
}

/* ---------------------------------------- 8b. v4.1: reglas, aspecto, semilla, revancha */
{
  ok(cleanCfg({ mode: 'versus' }).mode === 'versus' && cleanCfg({ mode: '<script>' }).mode === 'mixto' && cleanCfg(null).mode === 'mixto', 'cleanCfg: solo modos válidos');
  const lk = cleanLook({ char: 'robot', color: 'rosa<x>' });
  ok(lk.char === 'robot' && lk.color === null && cleanLook('x') === null, 'cleanLook: valida y descarta valores raros');
  const H = hub(), a = fakeSock(), b = fakeSock();
  H.handle(a, JSON.stringify({ t: 'create', name: 'A', look: { char: 'gato', color: 'azul' }, cfg: { mode: 'coop' } }));
  const code = a.last().code;
  ok(a.last().cfg.mode === 'coop' && a.last().players[0].look.char === 'gato', 'create: guarda reglas y aspecto del anfitrión');
  H.handle(b, JSON.stringify({ t: 'join', code, name: 'B', look: { char: 'robot', color: 'rosa' } }));
  ok(b.last().cfg.mode === 'coop' && b.last().players[0].look.color === 'azul' && b.last().players[1].look.char === 'robot', 'join: el invitado ve reglas y el aspecto de los dos');
  H.handle(b, JSON.stringify({ t: 'cfg', cfg: { mode: 'versus' } }));
  ok(b.last().code === 'EHOST', 'cfg: el invitado no cambia las reglas');
  H.handle(a, JSON.stringify({ t: 'cfg', cfg: { mode: 'versus' } }));
  ok(b.last().t === 'room' && b.last().cfg.mode === 'versus', 'cfg: el anfitrión cambia las reglas y el rival lo ve');
  H.handle(a, JSON.stringify({ t: 'start' }));
  ok(a.last().code === 'ESTATE', 'start: sin estar los dos listos → ESTATE');
  H.handle(a, JSON.stringify({ t: 'ready', ready: true })); H.handle(b, JSON.stringify({ t: 'ready', ready: true }));
  /* un rival se cae justo antes de empezar: la sala vuelve a WAITING y no arranca a medias */
  H.detach(b);
  ok(H.get(code).state === STATE.WAITING && H.get(code).players[1].ready === false, 'detach: READY se degrada a WAITING si alguien se cae');
  const b2 = fakeSock(); H.handle(b2, JSON.stringify({ t: 'join', code, token: H.get(code).players[1].token }));
  H.handle(b2, JSON.stringify({ t: 'ready', ready: true }));
  ok(H.get(code).state === STATE.READY, 'reconexión + listo → READY otra vez');
  H.handle(a, JSON.stringify({ t: 'start' }));
  const st = a.sent.filter(m => m.t === 'started').pop();
  ok(st && st.seed > 0 && st.cfg.mode === 'versus' && st.players.length === 2 && typeof st.at === 'number', 'started: semilla del servidor, reglas, jugadores y hora');
  H.handle(a, JSON.stringify({ t: 'cfg', cfg: { mode: 'coop' } }));
  ok(a.last().code === 'ESTATE', 'cfg: no se cambian reglas en plena partida');
  H.get(code).state = STATE.PLAYING;
  H.handle(a, JSON.stringify({ t: 'rematch' }));
  ok(a.last().code === 'ESTATE', 'rematch: solo tras terminar');
  H.handle(a, JSON.stringify({ t: 'finish', result: {} }));
  H.handle(b2, JSON.stringify({ t: 'rematch' }));
  ok(b2.last().code === 'EHOST', 'rematch: solo el anfitrión');
  H.handle(a, JSON.stringify({ t: 'rematch' }));
  ok(H.get(code).state === STATE.READY && b2.last().t === 'room' && b2.last().players.every(p => p.ready), 'rematch: FINISHED → READY con los dos listos');
  H.handle(a, JSON.stringify({ t: 'ping', c: 123 }));
  ok(a.last().t === 'pong' && a.last().c === 123 && typeof a.last().at === 'number', 'ping: el pong devuelve la hora del servidor y el eco del cliente');
  const H3 = makeHub({ maxRooms: 1 }), c1 = fakeSock(), c2 = fakeSock();
  H3.handle(c1, JSON.stringify({ t: 'create' })); H3.handle(c2, JSON.stringify({ t: 'create' }));
  ok(c2.last().code === 'EFULL', 'límite de salas del servidor');
  ok(originAllowed('https://a.example', 'a.example', []) && !originAllowed('https://b.example', 'a.example', []) && originAllowed('https://b.example', 'a.example', ['https://b.example']) && originAllowed(undefined, 'x', []) && !originAllowed('null', 'x', []), 'originAllowed: propio, lista permitida, sin origen, file://');
}

/* ---------------------------------------- 9. WebSocket real (8 pruebas) */
async function real() {
  const { srv, hub: H } = await new Promise(r => start({ port: 0, startDelay: 30 }, r));
  const port = srv.address().port;
  const WebSocket = require('ws');
  const open = () => new Promise((res, rej) => { const w = new WebSocket('ws://127.0.0.1:' + port); w.on('open', () => res(w)).on('error', rej); wmsgs(w); });
  const wmsgs = w => { w._msgs = []; w.on('message', d => w._msgs.push(JSON.parse(d.toString()))); };
  const wait = (w, t, ms) => new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('timeout ' + t)), ms || 2000); w.on('message', function h(d) { const m = JSON.parse(d.toString()); if (m.t === t) { clearTimeout(to); w.off('message', h); res(m); } }); });
  const send = (w, o) => w.send(JSON.stringify(o));

  try {
    /* 9.1 ciclo completo de una sala */
    const a = await open(), b = await open();
    send(a, { t: 'create', name: 'Ana' });
    const cr = await wait(a, 'created');
    ok(cr.code.length === 5, 'WS real: created');
    send(b, { t: 'join', code: cr.code, name: 'Bea' });
    ok((await wait(b, 'joined')).slot === 1, 'WS real: joined');
    ok((await wait(a, 'room')).players.length === 2, 'WS real: room broadcast');
    send(a, { t: 'ready', ready: true }); send(b, { t: 'ready', ready: true });
    await wait(a, 'room');
    send(a, { t: 'start' });
    ok((await wait(b, 'started')).delay >= 0, 'WS real: started');
    await new Promise(r => setTimeout(r, 80));   /* el arranque tiene un retardo real (STARTING → PLAYING) */
    send(b, { t: 'state', data: { x: 9 } });
    ok((await wait(a, 'state')).data.x === 9, 'WS real: state relay');
    send(a, { t: 'finish', result: 'p1' });
    ok((await wait(b, 'finished')).result === 'p1', 'WS real: finished');

    /* 9.2 desconexión: el anfitrión ve peer-left (la reconexión con token se prueba en 9.4) */
    b.close();
    ok((await wait(a, 'peer-left')).slot === 1, 'WS real: peer-left');
  } catch (e) { ok(false, 'WS real ciclo: ' + e.message); }

  try {
    /* 9.3 origen rechazado */
    const evil = new WebSocket('ws://127.0.0.1:' + port, { headers: { origin: 'https://malo.example' } });
    const closed = await new Promise(r => { evil.on('close', (c) => r(c)); evil.on('error', () => {}); });
    ok(closed === 1008, 'WS real: origen ajeno → 1008');
  } catch (e) { ok(false, 'WS real origen: ' + e.message); }

  try {
    /* 9.4 reconexión real con token */
    const a = await open(), b = await open();
    send(a, { t: 'create', name: 'A' });
    const cr = await wait(a, 'created');
    send(b, { t: 'join', code: cr.code, name: 'B' });
    const j = await wait(b, 'joined');
    b.close();
    await wait(a, 'peer-left');
    const b2 = await open();
    send(b2, { t: 'join', code: cr.code, token: j.token });
    ok((await wait(b2, 'joined')).reconnected === true, 'WS real: reconexión con token');
  } catch (e) { ok(false, 'WS real reconexión: ' + e.message); }

  try {
    /* 9.5 hosting del juego: / → HTML (gzip + etag), /healthz, 404 */
    const http = require('http'), zlib = require('zlib'), fsx = require('fs'), os = require('os'), pth = require('path');
    const tmp = pth.join(os.tmpdir(), 'eo-game-' + process.pid + '.html'); fsx.writeFileSync(tmp, '<!doctype html><title>x</title>' + 'A'.repeat(5000));
    const s2 = await new Promise(r => start({ port: 0, gameFile: tmp }, r)); const p2 = s2.srv.address().port;
    const get = (path, hdr) => new Promise((res, rej) => http.get({ port: p2, path, headers: hdr || {} }, r => { const ch = []; r.on('data', d => ch.push(d)); r.on('end', () => res({ s: r.statusCode, h: r.headers, b: Buffer.concat(ch) })); }).on('error', rej));
    const g = await get('/', { 'accept-encoding': 'gzip' });
    ok(g.s === 200 && g.h['content-encoding'] === 'gzip' && zlib.gunzipSync(g.b).toString().includes('<title>x</title>'), 'HTTP: / sirve el juego con gzip');
    const g2 = await get('/el-observador.html'); ok(g2.s === 200 && g2.b.length > 5000 && !g2.h['content-encoding'], 'HTTP: sin gzip si el cliente no lo pide');
    const g3 = await get('/', { 'if-none-match': g.h.etag }); ok(g3.s === 304, 'HTTP: ETag → 304');
    ok((await get('/healthz')).s === 200 && (await get('/secreto.txt')).s === 404 && (await get('/..%2fserver.js')).s === 404, 'HTTP: /healthz 200 y nada más se expone (404)');
    /* WebSocket desde la propia página (origin = host) y desde otra → rechazada salvo ALLOWED_ORIGINS */
    const okWs = new WebSocket('ws://127.0.0.1:' + p2, { headers: { origin: 'http://127.0.0.1:' + p2 } });
    ok(await new Promise(r => { okWs.on('open', () => r(true)); okWs.on('close', () => r(false)); okWs.on('error', () => {}); }), 'WS: origen = servidor (juego servido desde aquí) → admitido');
    okWs.close(); s2.srv.close(); fsx.unlinkSync(tmp);
    const s3 = await new Promise(r => start({ port: 0, serveGame: false, allowedOrigins: ['https://juego.example'] }, r)); const p3 = s3.srv.address().port;
    const w3 = new WebSocket('ws://127.0.0.1:' + p3, { headers: { origin: 'https://juego.example' } });
    ok(await new Promise(r => { w3.on('open', () => r(true)); w3.on('close', () => r(false)); w3.on('error', () => {}); }), 'WS: ALLOWED_ORIGINS admite el juego alojado en otro dominio');
    w3.close(); s3.srv.close();
  } catch (e) { ok(false, 'HTTP/hosting: ' + e.message); }

  srv.close();
}

(async () => {
  await real();
  console.log('servidor · ' + pass + ' ok / ' + fail + ' fallos');
  process.exit(fail ? 1 : 0);
})();
