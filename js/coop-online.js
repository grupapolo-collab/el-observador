/* ============================================================================
   EL OBSERVADOR — coop-online.js  (v4.1 · COOPERATIVO ONLINE por código de sala)
   ----------------------------------------------------------------------------
   Cliente WebSocket del servidor de salas (server/server.js). Sin PeerJS ni
   CDN: el mismo servidor que sirve el juego aloja las salas.

   Modelo de red (autoridad por jugador):
   - Cada cliente simula SOLO a su jugador (sin retardo de entrada, sin lag
     propio) y envía su estado a ~20 Hz: posición, velocidad, vida, energía…
   - El rival se dibuja suavizado con extrapolación corta.
   - Lo compartido va por eventos: plataformas que se rompen, chispas, rescates,
     pinchos, sabotajes, lluvia del Observador, llegada a la puerta y rondas.
   - El anfitrión (slot 0) da por terminadas las rondas y decide la siguiente.
   - Reloj común: el servidor responde a cada ping con su hora; con la mejor
     muestra se calcula el desfase. Cuenta atrás, plataformas móviles y
     temporizadores usan esa hora → los dos ven el mismo mundo.
   - Reconexión con token (30 s): si se cae la red, la partida espera.
   ============================================================================ */
window.EO = window.EO || {};
(function (EO) {
  'use strict';
  var C = EO.Coop;
  if (!C || !C._t) return;

  var NETO = EO.Net = { connected: false, code: '', slot: -1, host: false, ping: null, inMatch: false };
  var ws = null, url = '', token = '', code = '', slot = -1, room = null, cfg = { mode: 'mixto' };
  var offset = null, bestRtt = 1e9, samples = 0;
  var queue = [], inMatch = false, flushT = 0, watchT = 0, pingT = 0, reconT = 0, reconTry = 0, closing = false;
  var lastPeerSeen = 0, peerGone = 0, finishedSent = false, wantRole = '', pendingJoin = null;
  var sess = null;

  function $(id) { return document.getElementById(id); }
  function now() { return Date.now() + (offset || 0); }
  function myName() { try { return (localStorage.getItem('eo.name') || 'Jugador'); } catch (e) { return 'Jugador'; } }
  function status(s, col) { var el = $('ol-status'); if (el) { el.textContent = s || ''; el.style.color = col || '#b8b0e0'; } }
  var OK = '#6bffb4', BAD = '#ff7a6b', WARN = '#ffd24d';

  /* ------------------------------------------------------------ servidor */
  function defaultUrl() {
    try { var m = /[#&]servidor=([^&]+)/.exec(location.hash || ''); if (m) return decodeURIComponent(m[1]); } catch (e) {}
    if (/^https?:$/.test(location.protocol)) return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;   /* el juego se sirvió desde el propio servidor */
    var saved = ''; try { saved = localStorage.getItem('eo.server') || ''; } catch (e) {}
    return saved || EO.ONLINE_URL || '';
  }
  function normUrl(u) {
    u = (u || '').trim(); if (!u) return '';
    if (/^https?:\/\//i.test(u)) u = u.replace(/^http/i, 'ws');
    if (!/^wss?:\/\//i.test(u)) u = (/^(localhost|127\.|192\.168\.|10\.)/.test(u) ? 'ws://' : 'wss://') + u;
    return u.replace(/\/+$/, '');
  }
  function httpBase() { return url.replace(/^ws/i, 'http'); }

  function send(o) { try { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(o)); return true; } } catch (e) {} return false; }

  function connect(then) {
    var u = normUrl($('ol-server') && $('ol-server').value) || normUrl(defaultUrl());
    if (!u) { status('Escribe la dirección del servidor (Servidor ▾).', BAD); return; }
    if (typeof WebSocket === 'undefined') { status('Este navegador no soporta WebSocket.', BAD); return; }
    url = u; closing = false;
    try { if ($('ol-server') && $('ol-server').dataset.touched) localStorage.setItem('eo.server', url); } catch (e) {}
    status('Conectando con el servidor…', WARN);
    try { ws = new WebSocket(url); } catch (e) { status('Dirección de servidor no válida.', BAD); return; }
    var mine = ws, opened = false;
    var timeout = setTimeout(function () { if (!opened) { try { mine.close(); } catch (e) {} } }, 12000);
    mine.onopen = function () { opened = true; clearTimeout(timeout); NETO.connected = true; startPing(); then && then(); };
    mine.onmessage = function (ev) { if (mine !== ws) return; var m; try { m = JSON.parse(ev.data); } catch (e) { return; } onMsg(m); };
    mine.onerror = function () {};
    mine.onclose = function () {
      clearTimeout(timeout); if (mine !== ws) return;
      NETO.connected = false; stopPing();
      if (closing) return;
      if (!opened && !code) { status('No se pudo conectar con el servidor. Si es Render gratis, puede estar despertando: reintenta en 30 s.', BAD); return; }
      if (code && token) scheduleReconnect(); else { status('Conexión perdida.', BAD); showPanel('home'); }
    };
  }

  /* ------------------------------------------------------------ reloj y latencia */
  function startPing() { stopPing(); samples = 0; bestRtt = 1e9; doPing(); pingT = setInterval(doPing, 2500); setTimeout(doPing, 200); setTimeout(doPing, 450); setTimeout(doPing, 800); }
  function stopPing() { if (pingT) { clearInterval(pingT); pingT = 0; } }
  function doPing() { send({ t: 'ping', c: Date.now() }); }
  function onPong(m) {
    if (typeof m.c !== 'number') return;
    var t1 = Date.now(), rtt = t1 - m.c; if (rtt < 0 || rtt > 5000) return;
    NETO.ping = Math.round(rtt); samples++;
    /* la muestra con menor RTT es la que menos error de reloj tiene */
    if (rtt <= bestRtt + 2 || offset === null || samples % 12 === 0) { bestRtt = Math.min(rtt, bestRtt + 15); offset = m.at - (m.c + rtt / 2); }
  }

  /* ------------------------------------------------------------ mensajes */
  function onMsg(m) {
    switch (m.t) {
      case 'pong': return onPong(m);
      case 'created': token = m.token; code = m.code; slot = m.slot; NETO.code = code; NETO.slot = slot; NETO.host = slot === 0; applyRoom(m); showPanel('room'); status('Sala creada. Pasa el código o el enlace a tu rival.', OK); return;
      case 'joined':
        token = m.token; code = m.code; slot = m.slot; NETO.code = code; NETO.slot = slot; NETO.host = slot === 0; reconTry = 0; clearTimeout(reconT);
        applyRoom(m);
        if (m.reconnected) { status('¡Reconectado!', OK); peerGone = 0; if (inMatch && C._t.state()) C._t.state().netBanner = null; }
        else { showPanel('room'); status('Dentro de la sala. Esperando a que el anfitrión empiece…', OK); }
        autoReady(); return;
      case 'room': applyRoom(m); return;
      case 'started': return onStarted(m);
      case 'state': return onState(m);
      case 'peer-left': return onPeerLeft(m);
      case 'finished': return;
      case 'closed': return endSession('La sala se cerró.', true);
      case 'error': return onError(m);
    }
  }
  function onError(m) {
    var txt = { ENOENT: 'No existe esa sala. Revisa el código (5 caracteres).', EFULL: 'La sala está llena.', ETOKEN: 'No se pudo recuperar tu sitio en la sala.', EHOST: 'Solo el anfitrión puede hacer eso.', ESTATE: m.msg || 'Ahora no se puede hacer eso.' }[m.code] || (m.msg || 'Error del servidor.');
    if (m.code === 'ETOKEN' || (m.code === 'ENOENT' && token)) { endSession('La sala ya no existe.', true); return; }
    status(txt, BAD);
    if (!room && !inMatch) { try { closing = true; ws && ws.close(); } catch (e) {} code = ''; token = ''; }
  }

  function applyRoom(m) {
    if (m.cfg) cfg = m.cfg;
    if (m.players) room = { state: m.state || (room && room.state), players: m.players, code: m.code || code };
    else if (m.state && room) room.state = m.state;
    if (m.t === 'room') { room.state = m.state; }
    if (!room) return;
    /* tras una partida el anfitrión pide la revancha: el servidor vuelve a READY/WAITING y los dos regresan a la sala */
    if (inMatch && (room.state === 'READY' || room.state === 'WAITING')) backToLobby();
    renderRoom();
    autoReady();
  }
  function autoReady() {
    if (!room || slot < 0) return;
    var me = room.players[slot];
    if (me && me.connected && !me.ready && (room.state === 'WAITING' || room.state === 'READY')) send({ t: 'ready', ready: true });
  }

  function onPeerLeft(m) {
    if (m.slot === slot) return;
    peerGone = Date.now();
    var S = C._t.state(), who = room && room.players[m.slot] ? room.players[m.slot].name : 'Tu rival';
    if (inMatch && S) {
      if (S.phase === 'final') { backToLobby(); status(who + ' se fue de la sala.', WARN); if (!NETO.host) endSession(who + ' cerró la sala.', true); return; }
      S.netBanner = who + ' se desconectó… esperando (30 s)';
    } else status(who + ' salió de la sala.', WARN);
    renderRoom();
  }

  /* ------------------------------------------------------------ sala (UI) */
  function openOverlay() {
    var ov = $('screen-online'); if (!ov) return;
    ov.classList.remove('hidden'); $('ol-name').value = myName(); fillPickers();
    var sv = $('ol-server'); if (sv && !sv.value) sv.value = defaultUrl();
    if (!room) showPanel('home');
  }
  function closeOverlay() { var ov = $('screen-online'); if (ov) ov.classList.add('hidden'); }
  function showPanel(which) {
    ['ol-home', 'ol-room'].forEach(function (id) { var el = $(id); if (el) el.classList.toggle('hidden', id !== 'ol-' + which); });
    var b = $('ol-back'); if (b) b.textContent = which === 'room' ? 'Salir de la sala' : 'Volver';
  }
  function chars() { return EO.Shop.items.filter(function (it) { return it.slot === 'char' && !it.a; }).map(function (it) { return it.id; }); }
  function colors() { return EO.Shop.items.filter(function (it) { return it.slot === 'color'; }).map(function (it) { return it.id; }); }
  function fillPickers() {
    try {
      fill('ol-char', chars()); fill('ol-color', colors());
      var eq = EO.Shop.equip(); if (chars().indexOf(eq.char) >= 0) $('ol-char').value = eq.char; if (colors().indexOf(eq.color) >= 0) $('ol-color').value = eq.color;
    } catch (e) {}
  }
  function fill(id, list) { var el = $(id); if (!el || el.options.length) return; list.forEach(function (v) { var o = document.createElement('option'); o.value = v; o.textContent = v; el.appendChild(o); }); }
  function myLook() { try { return { char: $('ol-char').value, color: $('ol-color').value }; } catch (e) { return null; } }
  function saveName() { var n = (($('ol-name').value || '').replace(/[\u0000-\u001f]/g, '').trim() || 'Jugador').slice(0, 12); try { localStorage.setItem('eo.name', n); } catch (e) {} return n; }
  var MODE_TXT = { mixto: 'MIXTO · variado', coop: 'COOPERATIVO · solo equipo', versus: 'VERSUS · carreras y caos' };

  function renderRoom() {
    if (!room) return;
    var c = $('ol-code'); if (c) c.textContent = room.code || code;
    var box = $('ol-players'); if (box) {
      box.innerHTML = '';
      [0, 1].forEach(function (i) {
        var p = room.players[i], d = document.createElement('div');
        d.className = 'ol-slot ' + (!p ? 'empty' : i === slot ? 'me' : 'them');
        if (!p) d.textContent = 'Esperando rival…';
        else {
          d.textContent = p.name + (i === slot ? ' (tú)' : '') + (p.host ? ' ★' : '');
          var sm = document.createElement('small'); sm.textContent = !p.connected ? 'sin conexión…' : p.ready ? 'listo ✓' : 'entrando…'; d.appendChild(sm);
        }
        box.appendChild(d);
      });
    }
    var host = slot === 0, both = room.players[0] && room.players[1] && room.players[0].connected && room.players[1].connected;
    $('ol-cfg-host').classList.toggle('hidden', !host); $('ol-cfg-guest').classList.toggle('hidden', host);
    if (host) {
      $('ol-mode').value = cfg.mode; var go = $('ol-go'); go.disabled = !(both && room.state === 'READY'); go.textContent = both ? 'Empezar' : 'Esperando rival…';
      if (!inMatch && both && room.state === 'READY' && /Sala creada|salió|no volvió|revancha/.test((($('ol-status') || {}).textContent) || '')) status('¡' + room.players[1].name + ' está dentro! Elige las reglas y pulsa Empezar.', OK);
    }
    else $('ol-mode-txt').textContent = 'Modo: ' + (MODE_TXT[cfg.mode] || cfg.mode);
    var lk = $('ol-link'); if (lk) lk.style.display = httpBase() ? '' : 'none';
  }

  function copyText(txt, okMsg) {
    function fb() { try { var ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); status(okMsg, OK); } catch (e) { status(txt, WARN); } }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { status(okMsg, OK); }, fb); else fb(); } catch (e) { fb(); }
  }

  /* ------------------------------------------------------------ acciones */
  function createRoom() {
    var nm = saveName();
    status('', null);
    connect(function () { send({ t: 'create', name: nm, look: myLook(), cfg: { mode: 'mixto' } }); });
  }
  function joinRoom(c0) {
    var nm = saveName();
    var c = (c0 || $('ol-code-in').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    if (c.length !== 5) { status('El código tiene 5 caracteres. Pídeselo a tu anfitrión.', BAD); return; }
    connect(function () { send({ t: 'join', code: c, name: nm, look: myLook() }); });
  }
  function hostStart() {
    if (slot !== 0) return;
    send({ t: 'cfg', cfg: { mode: $('ol-mode').value } });
    send({ t: 'start' });
    $('ol-go').disabled = true;
  }
  function leaveRoom() {
    closing = true; clearTimeout(reconT);
    send({ t: 'leave' });
    endSession('', false);
  }
  function endSession(msg, show) {
    closing = true; clearTimeout(reconT); stopPing(); stopLoops();
    try { if (ws) ws.close(); } catch (e) {}
    ws = null; token = ''; code = ''; slot = -1; room = null; peerGone = 0; NETO.connected = false; NETO.code = ''; NETO.slot = -1; NETO.host = false;
    var wasMatch = inMatch; inMatch = false; NETO.inMatch = false; sess = null;
    try { C.netDetach(); } catch (e) {}
    if (wasMatch) { try { C.closeSilent(); } catch (e) {} }
    if (msg) { openOverlay(); showPanel('home'); status(msg, WARN); }
    else { closeOverlay(); showPanel('home'); status('', null); try { EO.UI.updateMenu(); EO.UI.show('menu'); } catch (e) {} }
  }

  function scheduleReconnect() {
    reconTry++;
    var S = C._t.state();
    if (reconTry > 12) { endSession('Se perdió la conexión con el servidor.', true); return; }
    if (inMatch && S) S.netBanner = 'Reconectando… (' + reconTry + ')';
    else status('Reconectando… (' + reconTry + ')', WARN);
    reconT = setTimeout(function () {
      closing = false;
      try { ws = new WebSocket(url); } catch (e) { scheduleReconnect(); return; }
      var mine = ws, opened = false;
      mine.onopen = function () { opened = true; NETO.connected = true; startPing(); send({ t: 'join', code: code, token: token, name: myName(), look: myLook() }); };
      mine.onmessage = function (ev) { if (mine !== ws) return; var m; try { m = JSON.parse(ev.data); } catch (e) { return; } onMsg(m); };
      mine.onerror = function () {};
      mine.onclose = function () { if (mine !== ws || closing) return; NETO.connected = false; stopPing(); scheduleReconnect(); };
    }, Math.min(3000, 400 * reconTry));
  }

  /* ------------------------------------------------------------ partida */
  function validLook(l, i) {
    var ch = chars(), co = colors(), base = i ? { char: 'robot', color: 'rosa' } : { char: 'cubo', color: 'cian' };
    var out = { char: l && ch.indexOf(l.char) >= 0 ? l.char : (ch.indexOf(base.char) >= 0 ? base.char : ch[0]), color: l && co.indexOf(l.color) >= 0 ? l.color : (co.indexOf(base.color) >= 0 ? base.color : co[0]) };
    return out;
  }
  function onStarted(m) {
    if (!room) return;
    if (m.players) room.players = m.players;
    if (m.cfg) cfg = m.cfg;
    if (offset === null) offset = (m.at || Date.now()) - Date.now();      /* sin muestra de ping aún: mejor aproximación */
    startMatch(m);
  }
  function startMatch(m) {
    closeOverlay(); queue = []; finishedSent = false; peerGone = 0; lastPeerSeen = Date.now();
    var pl = room.players;
    sess = {
      slot: slot, host: slot === 0, ping: null, escAt: 0,
      now: now, emit: function (e) { if (queue.length < 40) queue.push(e); },
      leave: leaveRoom, toLobby: toLobby
    };
    Object.defineProperty(sess, 'ping', { get: function () { return NETO.ping; } });
    C.netAttach(sess);
    C.open();                                            /* crea el lienzo y el bucle */
    var S = C.newMatch(cfg.mode || 'mixto');
    S.seed = (m.seed | 0) || 12345; S.net = true; S.slot = slot; S.round = 0;
    S.names = [pl[0] ? pl[0].name : 'P1', pl[1] ? pl[1].name : 'P2'];
    [0, 1].forEach(function (i) {
      var lk = validLook(pl[i] && pl[i].look, i); S.p[i].lo = Object.assign({}, S.p[i].lo, lk); S.p[i].pts = 0;
    });
    S.netPlayAt = (m.at || now()) + 4000;                 /* misma hora de salida para los dos (hora del servidor) */
    C.startRound();
    C.netEnsureRoot();
    inMatch = true; NETO.inMatch = true;
    startLoops();
  }
  function onState(m) {
    var S = C._t.state(); if (!inMatch || !S || !m.data || m.from === slot) return;
    lastPeerSeen = Date.now(); peerGone = 0;
    if (S.netBanner && /desconect|Sin señal/.test(S.netBanner)) S.netBanner = null;
    var d = m.data;
    if (d.ev && d.ev.length) for (var i = 0; i < d.ev.length && i < 40; i++) { try { C.netEvent(d.ev[i]); } catch (e) { if (window.console) console.error('net ev', e); } }
    if (d.s) { try { C.netSnap(d.s); } catch (e) { if (window.console) console.error('net snap', e); } }
  }

  function startLoops() {
    stopLoops();
    flushT = setInterval(function () {
      var S = C._t.state(); if (!inMatch || !S) return;
      var snap = C.netSnapshot(); if (!snap && !queue.length) return;
      var ev = queue.splice(0, 12), data = { s: snap }; if (ev.length) data.ev = ev;
      var txt = JSON.stringify(data);
      if (txt.length > 1800) { data = { s: snap }; txt = JSON.stringify(data); }
      send({ t: 'state', data: data });
      /* el anfitrión cierra la partida en el servidor al llegar al marcador final */
      if (slot === 0 && S.phase === 'final' && !finishedSent) { finishedSent = true; send({ t: 'finish', result: { p1: S.p[0].pts, p2: S.p[1].pts } }); }
    }, 50);
    watchT = setInterval(function () {
      var S = C._t.state(); if (!inMatch || !S) return;
      var n = Date.now();
      if (!NETO.connected) return;                                     /* el banner de reconexión manda */
      if (peerGone) {
        var left = Math.max(0, 30 - Math.floor((n - peerGone) / 1000));
        S.netBanner = (room && room.players[1 - slot] ? room.players[1 - slot].name : 'Tu rival') + ' se desconectó… esperando (' + left + ' s)';
        if (left <= 0) { peerGone = 0; if (slot === 0) { backToLobby(); status('Tu rival no volvió. La sala sigue abierta.', WARN); } else endSession('El anfitrión no volvió.', true); }
      } else if (S.phase === 'play' && n - lastPeerSeen > 2500) S.netBanner = 'Sin señal del rival…';
      else if (S.netBanner && /Sin señal|desconect/.test(S.netBanner)) S.netBanner = null;
    }, 400);
  }
  function stopLoops() { if (flushT) clearInterval(flushT); if (watchT) clearInterval(watchT); flushT = watchT = 0; }

  function toLobby() { if (slot !== 0) return; send({ t: 'rematch' }); /* el servidor emite 'room' y los dos vuelven */ }
  function backToLobby() {
    if (!inMatch) return;
    inMatch = false; NETO.inMatch = false; stopLoops(); queue = [];
    try { C.closeSilent(); C.netDetach(); } catch (e) {}
    sess = null; openOverlay(); showPanel('room'); renderRoom();
    status('Partida terminada. Cuando queráis, el anfitrión empieza la revancha.', OK);
  }

  /* ------------------------------------------------------------ arranque */
  window.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      var map = { 'm-online': function () { try { EO.Audio.click(); } catch (e) {} openOverlay(); }, 'ol-create': createRoom, 'ol-join-btn': function () { joinRoom(); }, 'ol-go': hostStart,
        'ol-back': function () { if (room || code) leaveRoom(); else { closeOverlay(); try { EO.UI.updateMenu(); EO.UI.show('menu'); } catch (e) {} } },
        'ol-copy': function () { copyText(code, 'Código copiado: ' + code); },
        'ol-link': function () { copyText(httpBase() + '/#sala=' + code, 'Enlace copiado. Quien lo abra entra directo a la sala.'); } };
      Object.keys(map).forEach(function (id) { var el = $(id); if (el) el.addEventListener('click', map[id]); });
      var sv = $('ol-server'); if (sv) sv.addEventListener('input', function () { sv.dataset.touched = '1'; });
      var ci = $('ol-code-in'); if (ci) { ci.addEventListener('input', function () { ci.value = ci.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); }); ci.addEventListener('keydown', function (e) { if (e.key === 'Enter') joinRoom(); }); }
      var md = $('ol-mode'); if (md) md.addEventListener('change', function () { if (slot === 0) send({ t: 'cfg', cfg: { mode: md.value } }); });
      window.addEventListener('pagehide', function () { if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify({ t: 'leave' })); } catch (e) {} } });
      /* enlace compartido:  …/#sala=ABCDE  → abre la sala online con el código puesto (también si se pega en la misma pestaña) */
      function fromHash() {
        var mm = /[#&]sala=([A-Za-z0-9]{5})/.exec(location.hash || ''); if (!mm || room || code) return;
        openOverlay(); showPanel('home'); $('ol-code-in').value = mm[1].toUpperCase(); status('Escribe tu nombre y pulsa «Entrar a la sala» para unirte a ' + mm[1].toUpperCase() + '.', OK);
      }
      fromHash(); window.addEventListener('hashchange', fromHash);
    }, 0);
  });

  NETO._drop = function () { try { if (ws) ws.close(); } catch (e) {} };      /* prueba: simula una caída de red */
  NETO._dbg = function () { return { room: room, cfg: cfg, slot: slot, offset: offset, inMatch: inMatch, url: url }; };
})(window.EO);
