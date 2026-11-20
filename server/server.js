'use strict';
/* ============================================================================
   EL OBSERVADOR — server/server.js (v4.1) · Servidor de salas para 2 jugadores + hosting del juego
   ============================================================================
   Reconstruido desde la especificación (el original no venía en el ZIP):
   - Salas con código de 5 caracteres (sin caracteres ambiguos O/0/1/I/L)
   - Estados: WAITING → READY → STARTING → PLAYING → FINISHED → CLOSED
   - Máximo 2 jugadores, SIN migración de anfitrión
   - Reconexión con token (30 s)
   - Límites: 4 KB por mensaje, 90 mensajes/s, payload de estado 2 KB
   - Comprobación de origen (Origin === Host, o ALLOWED_ORIGINS) en el arranque de WebSocket
   - v4.1: sirve el propio juego (GET / → el-observador.html, con gzip) para desplegar TODO
     en un solo servicio; /healthz para el hosting; latido ws (ping/pong) para que los
     proxys no cierren el socket; reglas (cfg), aspecto (look), semilla del servidor y revancha

   Protocolo (JSON):
     cliente → { t:'create'|'join'|'ready'|'cfg'|'start'|'state'|'finish'|'rematch'|'leave'|'ping',
                 code?, name?, look?, token?, ready?, cfg?, data?, result?, c? }
     servidor → { t:'created'|'joined'|'room'|'started'|'state'|'finished'|
                  'peer-left'|'closed'|'pong'|'error', ... }

   La lógica (makeHub) no depende de `ws`: es testeable con sockets falsos.
   Uso:      node server/server.js [puerto]   (o ROOM_PORT / PORT)
   Pruebas:  cd server && npm install && npm test
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const CODE_LEN = 5, MAX_PLAYERS = 2;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const STATE = { WAITING: 'WAITING', READY: 'READY', STARTING: 'STARTING', PLAYING: 'PLAYING', FINISHED: 'FINISHED', CLOSED: 'CLOSED' };

const MODES = ['mixto', 'coop', 'versus'];
function cleanLook(l) {
  if (!l || typeof l !== 'object') return null;
  const ok = v => typeof v === 'string' && /^[A-Za-z0-9_\-áéíóúñÁÉÍÓÚÑ]{1,24}$/.test(v);
  return { char: ok(l.char) ? l.char : null, color: ok(l.color) ? l.color : null };
}
function cleanCfg(c) {
  return { mode: c && MODES.indexOf(c.mode) >= 0 ? c.mode : 'mixto' };
}
function cleanName(n) {
  if (typeof n !== 'string') return 'Jugador';
  return n.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 12) || 'Jugador';
}

function makeHub(opts) {
  opts = opts || {};
  const RECONNECT_MS = opts.reconnectMs || 30000;
  const MAX_MSG = opts.maxMsg || 4096;
  const MAX_DATA = opts.maxData || 2048;
  const RATE = opts.rate || 90, RATE_WIN = opts.rateWin || 1000;
  const START_DELAY = opts.startDelay == null ? 3000 : opts.startDelay;
  const MAX_ROOMS = opts.maxRooms || 5000;

  const rooms = new Map();
  const timers = new Set();
  const now = () => Date.now();
  const sleep = ms => new Promise(r => { const t = setTimeout(r, ms); timers.add(t); });

  function newCode() {
    for (let tries = 0; tries < 50; tries++) {
      let c = '';
      for (let i = 0; i < CODE_LEN; i++) c += ALPHABET[crypto.randomInt(ALPHABET.length)];
      if (!rooms.has(c)) return c;
    }
    return null;
  }
  const get = code => (code && rooms.get(String(code).toUpperCase())) || null;
  function send(conn, msg) { if (conn && conn.open) { try { conn.send(JSON.stringify(msg)); } catch (e) {} } }
  function err(conn, code, msg) { send(conn, { t: 'error', code, msg: msg || '' }); }
  function roomMsg(room, msg, except) { room.players.forEach(p => { if (p && p.conn && p.conn !== except) send(p.conn, msg); }); }
  function playersInfo(room) { return room.players.map(p => p ? { name: p.name, slot: p.slot, connected: !!p.conn, host: room.host === p.slot, ready: !!p.ready, look: p.look || null } : null); }
  function roomInfo(room) { return { t: 'room', code: room.code, state: room.state, cfg: room.cfg, players: playersInfo(room) }; }

  function detach(conn) {
    const room = get(conn.roomCode);
    if (!room) return null;
    const p = room.players[conn.slot];
    if (p && p.conn === conn) {
      p.conn = null; p.disconnectedAt = now(); p.ready = false;
      if (room.state === STATE.READY) room.state = STATE.WAITING;     /* nadie arranca una sala a medias */
      roomMsg(room, { t: 'peer-left', code: room.code, slot: conn.slot });
    }
    conn.roomCode = null; conn.slot = -1;
    return room;
  }

  /* cierra salas sin nadie conectado cuando se agota la ventana de reconexión */
  function sweepRoom(room) {
    if (!room || room.state === STATE.CLOSED) return;
    if (room.players.some(p => p && p.conn)) return;
    const since = Math.min.apply(null, room.players.map(p => (p && p.disconnectedAt) || now()));
    if (now() - since >= RECONNECT_MS) {
      room.state = STATE.CLOSED;
      roomMsg(room, { t: 'closed', code: room.code });
      rooms.delete(room.code);
    }
  }
  function sweepAll() { rooms.forEach(sweepRoom); }

  function close(conn, code, reason) { try { conn.close(code, reason); } catch (e) {} }

  function handle(conn, raw) {
    if (raw instanceof Buffer) raw = raw.toString('utf8');
    if (typeof raw !== 'string') return close(conn, 1003, 'binary');
    if (raw.length > MAX_MSG) return close(conn, 1009, 'too big');

    /* frecuencia: RATE mensajes por ventana */
    const t0 = now();
    conn._times = (conn._times || []).filter(x => t0 - x < RATE_WIN);
    conn._times.push(t0);
    if (conn._times.length > RATE) return close(conn, 1008, 'rate');

    let m;
    try { m = JSON.parse(raw); } catch (e) { return close(conn, 1002, 'bad json'); }
    if (!m || typeof m.t !== 'string') return close(conn, 1002, 'bad msg');

    switch (m.t) {
      case 'ping': return send(conn, { t: 'pong', at: t0, c: typeof m.c === 'number' ? m.c : null });

      case 'create': {
        if (conn.roomCode) return err(conn, 'ESTATE', 'ya estás en una sala');
        if (rooms.size >= MAX_ROOMS) return err(conn, 'EFULL', 'servidor lleno, prueba en un rato');
        const code = newCode();
        if (!code) return err(conn, 'EFULL', 'no hay códigos libres');
        const room = { code, state: STATE.WAITING, host: 0, players: [null, null], createdAt: t0, startedAt: 0, cfg: cleanCfg(m.cfg), seed: 0 };
        room.players[0] = { name: cleanName(m.name), slot: 0, conn, token: crypto.randomBytes(16).toString('hex'), disconnectedAt: 0, ready: false, look: cleanLook(m.look) };
        rooms.set(code, room);
        conn.roomCode = code; conn.slot = 0;
        return send(conn, { t: 'created', code, token: room.players[0].token, slot: 0, state: room.state, cfg: room.cfg, players: playersInfo(room) });
      }

      case 'join': {
        if (conn.roomCode) return err(conn, 'ESTATE', 'ya estás en una sala');
        const room = get(m.code);
        if (!room || room.state === STATE.CLOSED) return err(conn, 'ENOENT', 'sala no encontrada');

        /* reconexión por token (dentro de la ventana) */
        if (m.token) {
          const i = room.players.findIndex(p => p && p.token === m.token);
          if (i < 0) return err(conn, 'ETOKEN', 'token no válido');
          conn.roomCode = room.code; conn.slot = i;
          room.players[i].conn = conn; room.players[i].disconnectedAt = 0;
          send(conn, { t: 'joined', code: room.code, token: m.token, slot: i, state: room.state, cfg: room.cfg, seed: room.seed, reconnected: true, players: playersInfo(room) });
          return roomMsg(room, roomInfo(room), conn);
        }

        /* hueco nuevo: slot vacío, o slot de un invitado desconectado fuera de la ventana */
        let slot = room.players.findIndex(p => !p);
        if (slot < 0) {
          slot = room.players.findIndex(p => p && room.host !== p.slot && !p.conn && p.disconnectedAt && t0 - p.disconnectedAt >= RECONNECT_MS);
          if (slot >= 0) room.players[slot] = null;
        }
        if (slot < 0 || room.state !== STATE.WAITING && room.state !== STATE.READY) return err(conn, 'EFULL', 'sala llena');
        room.players[slot] = { name: cleanName(m.name), slot, conn, token: crypto.randomBytes(16).toString('hex'), disconnectedAt: 0, ready: false, look: cleanLook(m.look) };
        conn.roomCode = room.code; conn.slot = slot;
        send(conn, { t: 'joined', code: room.code, token: room.players[slot].token, slot, state: room.state, cfg: room.cfg, players: playersInfo(room) });
        return roomMsg(room, roomInfo(room), conn);
      }

      case 'ready': {
        const room = get(conn.roomCode);
        if (!room || conn.slot < 0) return err(conn, 'ESTATE', 'no estás en una sala');
        if (room.state !== STATE.WAITING && room.state !== STATE.READY) return err(conn, 'ESTATE', 'la partida ya empezó');
        const p = room.players[conn.slot];
        p.ready = !!m.ready;
        if (room.players.every(q => q && q.conn && q.ready)) room.state = STATE.READY;
        else if (room.state === STATE.READY) room.state = STATE.WAITING;
        return roomMsg(room, roomInfo(room));
      }

      case 'cfg': {
        const room = get(conn.roomCode);
        if (!room) return err(conn, 'ESTATE', 'no estás en una sala');
        if (room.host !== conn.slot) return err(conn, 'EHOST', 'sólo el anfitrión cambia las reglas');
        if (room.state !== STATE.WAITING && room.state !== STATE.READY) return err(conn, 'ESTATE', 'la partida ya empezó');
        room.cfg = cleanCfg(m.cfg);
        return roomMsg(room, roomInfo(room));
      }

      case 'start': {
        const room = get(conn.roomCode);
        if (!room) return err(conn, 'ESTATE', 'no estás en una sala');
        if (room.host !== conn.slot) return err(conn, 'EHOST', 'sólo el anfitrión arranca');
        if (room.state !== STATE.READY || !room.players.every(q => q && q.conn)) return err(conn, 'ESTATE', 'la sala no está lista');
        room.state = STATE.STARTING; room.startedAt = t0; room.seed = crypto.randomInt(1, 1e9);
        roomMsg(room, { t: 'started', code: room.code, at: t0, delay: START_DELAY, seed: room.seed, cfg: room.cfg, players: playersInfo(room) });
        sleep(START_DELAY).then(() => {
          if (room.state === STATE.STARTING) { room.state = STATE.PLAYING; roomMsg(room, roomInfo(room)); }
        });
        return;
      }

      case 'state': {
        const room = get(conn.roomCode);
        if (!room || room.state !== STATE.PLAYING && room.state !== STATE.STARTING) return err(conn, 'ESTATE', 'la sala no está jugando');
        const s = JSON.stringify(m.data == null ? {} : m.data);
        if (!s || s.length > MAX_DATA) return close(conn, 1009, 'data too big');
        const peer = room.players[1 - conn.slot];
        return send(peer && peer.conn, { t: 'state', from: conn.slot, data: m.data });
      }

      case 'finish': {
        const room = get(conn.roomCode);
        if (!room) return err(conn, 'ESTATE', 'no estás en una sala');
        if (room.host !== conn.slot) return err(conn, 'EHOST', 'sólo el anfitrión cierra la partida');
        if (room.state !== STATE.PLAYING) return err(conn, 'ESTATE', 'no hay partida en curso');
        room.state = STATE.FINISHED;
        return roomMsg(room, { t: 'finished', code: room.code, result: m.result == null ? null : m.result });
      }

      case 'rematch': {
        const room = get(conn.roomCode);
        if (!room) return err(conn, 'ESTATE', 'no estás en una sala');
        if (room.host !== conn.slot) return err(conn, 'EHOST', 'sólo el anfitrión pide la revancha');
        if (room.state !== STATE.FINISHED) return err(conn, 'ESTATE', 'la partida no ha terminado');
        room.players.forEach(p => { if (p) p.ready = !!p.conn; });
        room.state = room.players.every(p => p && p.conn) ? STATE.READY : STATE.WAITING;
        return roomMsg(room, roomInfo(room));
      }

      case 'leave': {
        const room = detach(conn);
        if (room) {
          /* abandono explícito: si no queda nadie conectado, la sala se cierra en el acto
             (la ventana de reconexión es para caídas, no para who wants to be here) */
          if (!room.players.some(p => p && p.conn)) {
            room.state = STATE.CLOSED;
            roomMsg(room, { t: 'closed', code: room.code });
            rooms.delete(room.code);
          } else roomMsg(room, roomInfo(room));
        }
        return;
      }

      default: return err(conn, 'EBAD', 'tipo desconocido: ' + m.t);
    }
  }

  return { handle, detach, sweepAll, get, rooms, STATE, opts: { RECONNECT_MS, MAX_MSG, MAX_DATA, RATE, RATE_WIN, START_DELAY } };
}

/* ---------------------------- servidores reales (requiere `ws`) ---------------------------- */
const GAME_FILE = path.join(__dirname, '..', 'el-observador.html');
function makeStatic(file) {
  let cache = null;
  function load() {
    const st = fs.statSync(file);
    if (cache && cache.mtime === st.mtimeMs) return cache;
    const raw = fs.readFileSync(file);
    cache = { mtime: st.mtimeMs, raw, gz: zlib.gzipSync(raw, { level: 9 }), etag: '"' + crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16) + '"' };
    return cache;
  }
  return function serve(req, res) {
    const url = (req.url || '/').split('?')[0];
    if (url === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' }); return res.end('ok\n'); }
    if (url !== '/' && url !== '/el-observador.html' && url !== '/index.html') { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('No encontrado\n'); }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { allow: 'GET, HEAD' }); return res.end(); }
    let f;
    try { f = load(); } catch (e) { res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Falta el-observador.html junto a /server (ejecuta python3 build.py)\n'); }
    const h = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', etag: f.etag, 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', vary: 'Accept-Encoding' };
    if (req.headers['if-none-match'] === f.etag) { res.writeHead(304, h); return res.end(); }
    const gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    if (gz) h['content-encoding'] = 'gzip';
    const body = gz ? f.gz : f.raw;
    h['content-length'] = body.length;
    res.writeHead(200, h);
    res.end(req.method === 'HEAD' ? undefined : body);
  };
}

function originAllowed(origin, host, allowed) {
  if (!origin) return true;                       /* clientes que no son navegador */
  try {
    const u = new URL(origin);
    if (u.host === host) return true;
    if (u.protocol === 'file:' || origin === 'null') return false;
    return (allowed || []).some(a => a === origin || a === u.host);
  } catch (e) { return false; }
}

function start(opts, cb) {
  opts = opts || {};
  const hub = makeHub(opts);
  const allowed = (opts.allowedOrigins || (process.env.ALLOWED_ORIGINS || '').split(',')).map(x => x.trim()).filter(Boolean);
  const serve = opts.serveGame === false ? (req, res) => { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('EL OBSERVADOR · servidor de salas\n'); } : makeStatic(opts.gameFile || GAME_FILE);
  const srv = http.createServer(serve);
  const WebSocketServer = require('ws').WebSocketServer;
  const wss = new WebSocketServer({ server: srv, maxPayload: 8192, perMessageDeflate: false });
  wss.on('connection', (ws, req) => {
    /* origen: el del propio servidor (juego servido desde aquí) o uno de ALLOWED_ORIGINS (juego en otro hosting) */
    if (opts.checkOrigin !== false && !originAllowed(req.headers.origin, req.headers.host, allowed)) { ws.close(1008, 'origin'); return; }
    ws.open = true; ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', d => { try { hub.handle(ws, d); } catch (e) { try { ws.close(1011, 'crash'); } catch (e2) {} } });
    ws.on('close', () => { ws.open = false; const room = hub.detach(ws); if (room) hub.sweepAll(); });
    ws.on('error', () => {});
  });
  /* latido: los proxys (Render, Fly, Nginx…) cierran sockets mudos a los ~55-60 s */
  const beat = setInterval(() => {
    wss.clients.forEach(ws => { if (ws.isAlive === false) { try { ws.terminate(); } catch (e) {} return; } ws.isAlive = false; try { ws.ping(); } catch (e) {} });
    hub.sweepAll();
  }, opts.beatMs || 20000);
  beat.unref && beat.unref();
  srv.on('close', () => clearInterval(beat));
  srv.listen(opts.port || 0, opts.host, () => cb && cb({ srv, wss, hub }));
  return { srv, wss, hub };
}

if (require.main === module) {
  const port = parseInt(process.env.ROOM_PORT || process.env.PORT || process.argv[2] || '8080', 10);
  const s = start({ port, host: process.env.HOST || '0.0.0.0' }, ({ srv }) => {
    console.log('EL OBSERVADOR · escuchando en el puerto', srv.address().port);
    console.log('  juego:  http://localhost:' + srv.address().port + '/   (salas WebSocket en el mismo puerto)');
  });
  const bye = () => { try { s.wss.clients.forEach(w => w.close(1001, 'reinicio')); s.srv.close(() => process.exit(0)); setTimeout(() => process.exit(0), 1500).unref(); } catch (e) { process.exit(0); } };
  process.on('SIGTERM', bye); process.on('SIGINT', bye);
}

module.exports = { makeHub, start, STATE, cleanName, cleanLook, cleanCfg, originAllowed };
