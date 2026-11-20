/* ============================================================================
   EL OBSERVADOR — coop.js  (v4.1)  ·  COOPERATIVO (local 2 jugadores · y ONLINE vía coop-online.js)
   Una partida son 5 RONDAS en niveles largos (7-10 mil px), con checkpoints. Cada ronda
   tiene sus reglas; los dos jugadores se ven siempre en pantalla:
     CARRERA   primero a la puerta (3 pts, el otro 1). Se puede sabotear.
     JUNTOS    hay que entrar los DOS en la puerta. Placas y verjas: uno sujeta, el otro pasa.
     LA TORRE  muros de 150 px: uno se sube a la cabeza del otro; arriba hay una placa que
               baja la escalera para el de abajo.
     EL PUENTE placas de presión y verjas encadenadas, plataformas que se caen.
     CAOS      carrera con energía x2: sabotajes sin parar y trampas del Observador.
   Controles  P1: A/D mover · W/Espacio saltar · Q ayudar · E sabotear   (mando 1)
              P2: ←/→ mover · ↑ saltar · , ayudar · . sabotear            (mando 2)
   Energía: se recarga sola y con las chispas. Ayuda (25): plataforma de rescate si tu
   compañero cae, o salto potenciado. Sabotaje (40): empujón · pinchos · mareo · plomo,
   siempre con aviso de 0,7 s (justo, divertido, no frustrante).
   Modos: MIXTO (default) · COOPERATIVO (5 rondas de equipo) · VERSUS (carreras y caos).
   ============================================================================ */
(function (EO) {
  'use strict';
  var G = EO.Game, VW = EO.VW, VH = EO.VH;
  var SPEED = 335, JUMP = 775, GRAV = 2150, COY = .1, JBUF = .12, PW = 30, PH = 40, KILLY = 1100, STEP = 1 / 120;
  var C = EO.Coop = { active: false };
  var S = null, cv = null, cx = null, root = null, raf = 0, last = 0, acc = 0;
  var NET = null;                         /* v4.1: sesión online (null = partida local). La rellena coop-online.js */
  var keys = {}, edge = {}, padPrev = [{}, {}];
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var snd = function (f, d, ty, v, sl) { try { EO.Audio.tone(f, d, ty || 'sine', v == null ? .12 : v, sl); } catch (e) {} };

  /* ------------------------------------------------------------ RONDAS */
  var ROUNDS = {
    carrera: { n: 'CARRERA', d: 'El primero a la puerta gana. ¡Sabotea con E o con .!', coop: false, sab: true, segs: 14, regen: 7, w: { gap: 5, flat: 2, moving: 3, crumble: 3 }, spk: .35, par: 70 },
    juntos: { n: 'JUNTOS', d: 'Los DOS dentro de la puerta. Si uno cae, reaparece a tu lado.', coop: true, sab: false, segs: 14, regen: 8, w: { gap: 4, flat: 2, moving: 3, crumble: 2, plategate: 3 }, spk: .3, par: 95 },
    torre: { n: 'LA TORRE', d: 'Sube a la cabeza de tu compañero. Arriba hay una placa: baja la escalera.', coop: true, sab: false, segs: 12, regen: 8, w: { gap: 3, flat: 1, moving: 2, wall: 5 }, spk: .2, par: 100 },
    puente: { n: 'EL PUENTE', d: 'Uno sujeta la placa, el otro pasa. Luego, al revés.', coop: true, sab: false, segs: 13, regen: 8, w: { gap: 3, moving: 2, crumble: 3, plategate: 5 }, spk: .25, par: 105 },
    caos: { n: 'CAOS', d: 'Energía a tope. Todo vale. El Observador también juega.', coop: false, sab: true, segs: 15, regen: 16, w: { gap: 4, moving: 4, crumble: 5, flat: 1 }, spk: .4, par: 80, rain: true }
  };
  var PLANS = {
    mixto: ['carrera', 'juntos', 'torre', 'puente', 'caos'],
    coop: ['juntos', 'torre', 'puente', 'juntos', 'torre'],
    versus: ['carrera', 'caos', 'carrera', 'caos', 'carrera']
  };
  var MODE_NAMES = { mixto: 'MIXTO', coop: 'COOPERATIVO', versus: 'VERSUS' };
  var SAB = ['EMPUJÓN', 'PINCHOS', 'MAREO', 'PLOMO'];
  var TAUNT = {
    sab: ['Eso no me lo esperaba. Mentira.', 'Qué mal compañero eres. Me encanta.', 'Uy. ¿Eso era tu amigo?'],
    help: ['Qué ternura. Qué asco.', 'Ayudar es de débiles. Y de ganadores.', 'Un abrazo virtual, ejem.'],
    die: ['Otro que cae.', 'JA. JA. JA.', 'El suelo te quiere.', 'Eso no lo he visto. Mentira: todo lo veo.', 'Ritmo de caída impecable. Si el objetivo era el suelo.'],
    die1: ['Primera caída de la ronda. La guardo.', 'Empezamos bien. Es decir, mal.', 'Cinco segundos de gracia. Ya no.'],
    rain: ['El Observador también juega.', 'Cae algo. No preguntes qué.', 'Mi turno. Siempre fue mi turno.', 'Nada personal. Bueno, sí: personal.'],
    win: ['Vaya. Habéis salido. Esta vez.', 'Os dejo pasar. Por aburrimiento.'],
    ill: ['Esa puerta era una ilusión. Es broma… o no.']
  };
  var pick = function (a, R) { return a[Math.floor((R ? R() : Math.random()) * a.length)]; };
  /* v4.0 causalidad: pickOnce evita repetir la misma frase dos veces seguidas */
  var _lastPick = {};
  var pickOnce = function (a, key) { var v, n = 0; do { v = pick(a); n++; } while (a.length > 1 && v === _lastPick[key] && n < 8); _lastPick[key] = v; return v; };

  /* ------------------------------------------------------------ NIVELES */
  function pickKind(cfg, R) {
    var tot = 0, k; for (k in cfg.w) tot += cfg.w[k];
    var r = R() * tot, acc = 0; for (k in cfg.w) { acc += cfg.w[k]; if (r < acc) return k; }
    return 'gap';
  }
  /* Genera un nivel largo; cada paso respeta el salto real (hueco ≤170, subida ≤85) */
  C.build = function (type, seed) {
    var R = rng(seed), cfg = ROUNDS[type];
    var W = { type: type, plats: [], spikes: [], orbs: [], plates: [], gates: [], cps: [], walls: [] };
    function plat(x, y, w, kind, ex) { var p = { x: x, y: y, w: w, h: 220, kind: kind || 'solid', bx: x, by: y, dx: 0, dy: 0, state: 0, t: 0 }; if (ex) for (var k in ex) p[k] = ex[k]; W.plats.push(p); return p; }
    var x = 80, y = 600, i, flag = 0;
    plat(x, y, 480); x += 480; W.spawn = { x: 170, y: y - PH }; W.cps.push({ x: 170, y: y - PH });
    for (i = 0; i < cfg.segs; i++) {
      var kind = pickKind(cfg, R), dy = Math.round(-85 + R() * 165), ny = clamp(y + dy, 380, 660), g = 90 + Math.round(R() * 75), p, w = 280 + Math.round(R() * 150);
      if (i % 6 === 5 && (kind === 'moving' || kind === 'crumble')) kind = 'gap';       // el checkpoint va sobre suelo firme
      if (kind === 'gap' || kind === 'flat') {
        if (kind === 'flat') { g = 0; ny = y; }
        if (i % 6 === 5) w = Math.max(w, 340);
        p = plat(x + g, ny, w); x += g + w; y = ny;
        if (i % 6 === 5) W.cps.push({ x: p.x + 90, y: p.y - PH });
        else if (w >= 330 && R() < cfg.spk) W.spikes.push({ x: p.x + w / 2 - 28, y: p.y - 22, w: 56, h: 22 });
        if (R() < .6) W.orbs.push({ x: p.x + w / 2, y: p.y - 80, got: 0 });
      } else if (kind === 'moving') {
        g = 290 + Math.round(R() * 70); var vert = R() < .3;
        if (vert) { g = 150; plat(x + g / 2 - 60, y, 120, 'move', { ax: 0, ay: 70, sp: 1.1 + R() * .4, ph: R() * 6, h: 24 }); }
        else plat(x + g / 2 - 60, y, 120, 'move', { ax: (g - 120) / 2 - 22, ay: 0, sp: .9 + R() * .5, ph: R() * 6, h: 24 });
        p = plat(x + g, y, 300); x += g + 300; W.orbs.push({ x: x - g / 2 - 150, y: y - 120, got: 0 });
      } else if (kind === 'crumble') {
        var cx0 = x + 100; for (var k = 0; k < 3; k++) { plat(cx0, y, 92, 'crumble', { h: 22 }); cx0 += 92 + 85 + Math.round(R() * 25); }
        p = plat(cx0, y, 300); x = cx0 + 300;
      } else if (kind === 'wall') {
        p = plat(x + 110, ny, 440); var wx = p.x + 250;
        W.walls.push({ x: wx, y: ny - 150, w: 36, h: 150 });
        var gi = W.gates.length; W.gates.push({ x: wx - 120, y: ny - 76, w: 120, h: 76, kind: 'stairs', open: 0 });
        W.plates.push({ x: wx, y: ny - 150 - 8, w: 36, h: 8, mode: 'timed', gate: gi, press: 0, timer: 0 });
        x = p.x + 440; y = ny; W.orbs.push({ x: wx + 18, y: ny - 215, got: 0 });
      } else if (kind === 'plategate') {
        p = plat(x + 120, ny, 780); var gi2 = W.gates.length;
        W.gates.push({ x: p.x + 410, y: ny - 230, w: 28, h: 230, kind: 'door', open: 0 });
        W.plates.push({ x: p.x + 50, y: ny - 8, w: 80, h: 8, mode: 'hold', gate: gi2, press: 0, timer: 0 });
        W.plates.push({ x: p.x + 600, y: ny - 8, w: 80, h: 8, mode: 'timed', gate: gi2, press: 0, timer: 0 });
        x = p.x + 780; y = ny;
      }
      if (cfg.rain === false) continue;
    }
    var fin = plat(x + 130, y, 560); W.door = { x: fin.x + 330, y: y - 92, w: 54, h: 92 };
    W.cps.push({ x: fin.x + 80, y: y - PH });
    W.W = fin.x + 560 + 400; W.len = W.W;
    return W;
  };

  /* ------------------------------------------------------------ JUGADORES */
  function mkPlayer(i, lo) {
    return { i: i, x: 0, y: 0, w: PW, h: PH, vx: 0, vy: 0, onGround: false, on: null, coy: 0, jbuf: 0, face: 1, alive: true, resp: 0,
      cp: null, energy: 50, pts: 0, lo: lo, boost: 0, inv: 0, weak: 0, sabIdx: i, dx: 0, dy: 0, cutDone: 0, done: 0, deaths: 0, wasUp: false, spark: 0 };
  }
  function allChars() { return EO.Shop.items.filter(function (it) { return it.slot === 'char' && !it.a; }).map(function (it) { return it.id; }); }
  function allColors() { return EO.Shop.items.filter(function (it) { return it.slot === 'color'; }).map(function (it) { return it.id; }); }

  C.newMatch = function (mode) {
    var eq = EO.Shop.equip();
    var lo1 = S && S.p ? S.p[0].lo : { char: eq.char, color: eq.color, eyes: eq.eyes, hat: eq.hat, trail: 'none', pet: 'none' };
    var lo2 = S && S.p ? S.p[1].lo : { char: 'robot', color: 'rosa', eyes: 'feliz', hat: 'auriculares', trail: 'none', pet: 'none' };
    S = { phase: 'lobby', mode: mode || 'mixto', round: 0, plan: PLANS[mode || 'mixto'], p: [mkPlayer(0, lo1), mkPlayer(1, lo2)], lvl: null, t: 0, clock: 0, cam: { x: 0, y: 0 },
      fx: [], temps: [], say: null, laugh: 0, hint: 0, seed: (Date.now() & 0xffff), phT: 0, result: null, totals: [0, 0], team: 0, log: [] };
    return S;
  };

  C.startRound = function () {
    var type = S.plan[S.round], cfg = ROUNDS[type];
    S.cfg = cfg; S.type = type; S.lvl = C.build(type, S.seed + S.round * 977);
    S.temps = []; S.fx = []; S.clock = 0; S.hint = 7; S.over = null; S.second = 0; S.sabCount = 0; S._rainCd = 0;
    S.p.forEach(function (p, i) {
      p.x = S.lvl.spawn.x + i * 46; p.y = S.lvl.spawn.y; p.vx = p.vy = 0; p.alive = true; p.resp = 0; p.cp = { x: S.lvl.spawn.x + i * 46, y: S.lvl.spawn.y };
      p.energy = 50; p.boost = p.inv = p.weak = 0; p.done = 0; p.on = null; p.deaths = 0; p.rp = 0;
    });
    S.cam.x = S.lvl.spawn.x - VW / 2 + 60; S.cam.y = 0;
    S.phase = 'countdown'; S.phT = 3.2; S.netRemote = null; S._remAlive = true;
    if (NET) S.phT = Math.max(.3, ((S.netPlayAt || (NET.now() + 3200)) - NET.now()) / 1000);
    say(cfg.n + ' · ' + cfg.d, 4);
  };

  function touchy() { return !!(NET && EO.Device && EO.Device.isTouch); }
  function nm(i) { return S && S.names && S.names[i] ? S.names[i] : 'P' + (i + 1); }
  function say(txt, sec) { S.say = { txt: txt, t: sec || 3 }; }
  function laugh(sec) { S.laugh = Math.max(S.laugh, sec || 1.4); try { EO.Fx.laughNow(null, sec || 1.4, 'laugh'); if (EO.Score) EO.Score.once('giggle', .35); } catch (e) {} }

  /* ------------------------------------------------------------ ENTRADA */
  var KEYMAP = [
    { l: ['KeyA'], r: ['KeyD'], j: ['KeyW', 'Space'], h: ['KeyQ'], s: ['KeyE'] },
    { l: ['ArrowLeft'], r: ['ArrowRight'], j: ['ArrowUp'], h: ['Comma'], s: ['Period'] }
  ];
  function any(list, src) { for (var i = 0; i < list.length; i++) if (src[list[i]]) return true; return false; }
  function pad(i) {
    var o = { l: 0, r: 0, j: 0, h: 0, s: 0 };
    try {
      var gps = navigator.getGamepads ? navigator.getGamepads() : [], gp = gps && gps[i];
      if (!gp) return o;
      var ax = gp.axes[0] || 0, b = gp.buttons;
      o.l = ax < -.35 || (b[14] && b[14].pressed) ? 1 : 0; o.r = ax > .35 || (b[15] && b[15].pressed) ? 1 : 0;
      o.j = (b[0] && b[0].pressed) || (b[12] && b[12].pressed) ? 1 : 0; o.h = b[2] && b[2].pressed ? 1 : 0; o.s = b[3] && b[3].pressed ? 1 : 0;
    } catch (e) {}
    return o;
  }
  function ctrl(i) {
    if (NET) {                                   /* v4.1 online: este dispositivo solo controla a SU jugador, con cualquier esquema */
      if (i !== NET.slot) return { l: 0, r: 0, j: 0, jp: 0, hp: 0, sp: 0 };
      var g0 = pad(0), pv0 = padPrev[0], A = KEYMAP[0], B = KEYMAP[1];
      var o0 = { l: any(A.l, keys) || any(B.l, keys) || g0.l, r: any(A.r, keys) || any(B.r, keys) || g0.r, j: any(A.j, keys) || any(B.j, keys) || g0.j,
        jp: any(A.j, edge) || any(B.j, edge) || (g0.j && !pv0.j), hp: any(A.h, edge) || any(B.h, edge) || (g0.h && !pv0.h), sp: any(A.s, edge) || any(B.s, edge) || (g0.s && !pv0.s) };
      padPrev[0] = g0; return o0;
    }
    var m = KEYMAP[i], g = pad(i), pv = padPrev[i];
    var o = { l: any(m.l, keys) || g.l, r: any(m.r, keys) || g.r, j: any(m.j, keys) || g.j,
      jp: any(m.j, edge) || (g.j && !pv.j), hp: any(m.h, edge) || (g.h && !pv.h), sp: any(m.s, edge) || (g.s && !pv.s) };
    padPrev[i] = g; return o;
  }

  /* ------------------------------------------------------------ FÍSICA */
  function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function gateActive(L, gi) {
    var on = false; L.plates.forEach(function (pl) { if (pl.gate === gi && (pl.press || pl.timer > 0)) on = true; }); return on;
  }
  function solids(p) {
    var L = S.lvl, out = [];
    L.plats.forEach(function (q) { if (q.state !== 2) out.push(q); });
    L.walls.forEach(function (w) { out.push(w); });
    L.gates.forEach(function (g, gi) { var a = gateActive(L, gi); if (g.kind === 'door' ? !a : a) out.push(g); });
    S.temps.forEach(function (t) { if (t.solid) out.push(t); });
    return out;
  }
  function stepPlatforms(dt) {
    var L = S.lvl, t = S.clock;
    L.plats.forEach(function (q) {
      var ox = q.x, oy = q.y;
      if (q.kind === 'move') { q.x = q.bx + Math.sin(t * q.sp + q.ph) * (q.ax || 0); q.y = q.by + Math.sin(t * q.sp + q.ph) * (q.ay || 0); }
      if (q.kind === 'crumble') {
        if (q.state === 1) { q.t -= dt; if (q.t <= 0) { q.state = 3; q.vy = 0; } }
        if (q.state === 3) { q.vy += GRAV * .6 * dt; q.y += q.vy * dt; if (q.y > q.by + 500) { q.state = 2; q.t = 4; } }
        else if (q.state === 2) { q.t -= dt; if (q.t <= 0) { q.state = 0; q.y = q.by; } }
      }
      q.dx = q.x - ox; q.dy = q.y - oy;
    });
    L.plates.forEach(function (pl) { if (pl.timer > 0) pl.timer -= dt; });
  }
  function kill(p, why) {
    if (!p.alive || S.phase !== 'play') return;
    p.alive = false; p.resp = 1.3; p.deaths++; p.vx = p.vy = 0; p.on = null;
    S.fx.push({ k: 'burst', x: p.x + 15, y: p.y + 20, t: .6, c: p.i ? '#ff8bd0' : '#7ef0ff' });
    snd(160, .3, 'sawtooth', .12, 60);
    /* v4.0 causalidad: la muerte es un evento real; la burla tiene contexto y no se repite */
    var justSabbed = p._sabbed && (S.t - p._sabbed) < 3;
    if (justSabbed) { say(pickOnce(TAUNT.sab, 'sab'), 2); laugh(1.0); }
    else if (p.deaths === 1) { say(pickOnce(TAUNT.die1, 'die1'), 2); laugh(.9); }
    else if (Math.random() < .35) { say(pickOnce(TAUNT.die, 'die'), 2); laugh(1.2); }
    void why;
  }
  function respawn(p) {
    var o = S.p[1 - p.i], pos;
    if (S.cfg.coop && o.alive && o.onGround) pos = { x: o.x + (p.i ? 36 : -36), y: o.y };
    else pos = p.cp || S.lvl.spawn;
    p.x = pos.x; p.y = pos.y - 2; p.vx = p.vy = 0; p.alive = true; p.on = null; p.inv = 0;
    S.fx.push({ k: 'burst', x: p.x + 15, y: p.y + 20, t: .5, c: '#fff' });
  }
  function platePress(p, L) {
    L = L || S.lvl;
    L.plates.forEach(function (pl) {
      if (p.onGround && p.x + p.w > pl.x && p.x < pl.x + pl.w && Math.abs(p.y + p.h - (pl.y + pl.h)) < 6) { pl._p = true; if (pl.mode === 'timed') { if (pl.timer < 7) snd(700, .08, 'triangle', .06); pl.timer = pl.mode === 'timed' ? 8 : 0; } }
    });
  }
  function movePlayer(p, c, dt) {
    if (!p.alive) { p.resp -= dt; if (p.resp <= 0) respawn(p); return; }
    var other = S.p[1 - p.i], L = S.lvl;
    p.inv = Math.max(0, p.inv - dt); p.weak = Math.max(0, p.weak - dt);
    if (p.on && p.on.dx !== undefined) { p.x += p.on.dx; p.y += p.on.dy; }
    var dir = (c.r ? 1 : 0) - (c.l ? 1 : 0); if (p.inv > 0) dir = -dir;
    if (dir) p.face = dir;
    var target = dir * SPEED; p.vx += (target - p.vx) * Math.min(1, dt * (p.onGround ? 20 : 10));
    p.coy = p.onGround ? COY : p.coy - dt; p.jbuf = c.jp ? JBUF : p.jbuf - dt;
    if (p.jbuf > 0 && p.coy > 0) {
      var jv = JUMP * (p.weak > 0 ? .62 : 1) * (p.boost ? 1.32 : 1); p.boost = 0; p.vy = -jv; p.jbuf = 0; p.coy = 0; p.onGround = false; p.on = null; p.cutDone = 0; snd(520, .09, 'square', .05, 760);
    }
    if (!c.j && p.vy < -260 && !p.cutDone) { p.vy *= .5; p.cutDone = 1; }
    p.vy = Math.min(p.vy + GRAV * dt, 1500);
    var sol = solids(p), i, r;
    p.x += p.vx * dt;
    for (i = 0; i < sol.length; i++) { r = sol[i]; if (hit(p, r)) { if (p.vx > 0 || (p.vx === 0 && p.x + p.w / 2 < r.x + r.w / 2)) p.x = r.x - p.w; else p.x = r.x + r.w; p.vx = 0; } }
    var prevBottom = p.y + p.h; p.y += p.vy * dt; p.onGround = false; var prevOn = p.on; p.on = null;
    for (i = 0; i < sol.length; i++) {
      r = sol[i];
      if (hit(p, r)) {
        if (p.vy >= 0 && prevBottom <= r.y + 12 + Math.abs(r.dy || 0)) { p.y = r.y - p.h; p.onGround = true; p.on = r; if (r.kind === 'crumble' && r.state === 0) { r.state = 1; r.t = .5; if (NET) NET.emit({ k: 'cr', i: L.plats.indexOf(r) }); } }
        else if (p.vy < 0) p.y = r.y + r.h;
        else p.y = r.y - p.h;
        p.vy = 0;
      }
    }
    if (other.alive && hit(p, other) && p.vy >= 0 && prevBottom <= other.y + 14) { p.y = other.y - p.h; p.vy = 0; p.onGround = true; p.on = other; if (other.vy < 0) { p.vy = other.vy * .3; } }
    else if (other.alive && hit(p, other)) { var push = p.x + p.w / 2 < other.x + other.w / 2 ? -1 : 1; p.x += push * 60 * dt; }
    void prevOn; void L;
    if (p.y > KILLY) kill(p, 'caida');
    // pinchos
    L = S.lvl; var hb = { x: p.x + 5, y: p.y + 6, w: p.w - 10, h: p.h - 6 };
    L.spikes.forEach(function (s) { if (hit(hb, { x: s.x + 4, y: s.y + 6, w: s.w - 8, h: s.h - 6 })) kill(p, 'pincho'); });
    S.temps.forEach(function (t) { if (t.spike && t.live && hit(hb, t)) kill(p, 'pincho'); });
    // placas
    platePress(p, L);
    // checkpoints, chispas
    L.cps.forEach(function (cp) { if (p.x > cp.x && (!p.cp || cp.x > p.cp.x) && p.onGround) { p.cp = { x: cp.x, y: cp.y }; S.fx.push({ k: 'txt', x: cp.x, y: cp.y - 30, t: 1.2, s: 'CHECKPOINT' }); } });
    L.orbs.forEach(function (o, oi) { if (!o.got && Math.hypot(o.x - (p.x + 15), o.y - (p.y + 20)) < 30) { o.got = 1; if (NET) NET.emit({ k: 'orb', i: oi }); p.energy = Math.min(100, p.energy + 25); p.spark++; snd(880, .1, 'triangle', .08, 1320); } });
    // cadena (rondas de equipo): el que va delante no se aleja más de 940 px
    if (S.cfg.coop && other.alive) { var d = p.x - other.x, MAXD = 940; if (d > MAXD && p.vx > 0) { p.x = other.x + MAXD; p.vx = 0; } if (d < -MAXD && p.vx < 0) { p.x = other.x - MAXD; p.vx = 0; } }
    p.dx = p.vx * dt; p.dy = p.vy * dt;
  }

  /* ------------------------------------------------------------ AYUDAS Y SABOTAJES */
  function help(p, o) {
    if (!p.alive || p.energy < 25 || !o.alive) return;
    p.energy -= 25;
    if (!o.onGround && o.vy > 120) {
      var rt = { x: o.x - 30, y: o.y + o.h + 10, w: 90, h: 14, solid: true, ttl: 2.6, kind: 'rescue', dx: 0, dy: 0 }; S.temps.push(rt);
      if (NET) NET.emit({ k: 'tmp', t: rt });
      say(nm(p.i) + ' ha puesto una plataforma de rescate', 2);
      /* v4.0 causalidad: solo se burla si había caída real; un salto potenciado no da risa */
      if (Math.random() < .5) { say(pickOnce(TAUNT.help, 'help'), 2.2); laugh(1.0); }
    } else { if (NET) NET.emit({ k: 'boost' }); else o.boost = 1; S.fx.push({ k: 'txt', x: o.x, y: o.y - 20, t: 1.2, s: '¡SALTO x1,3!' }); }
    snd(660, .2, 'triangle', .1, 990);
  }
  function sabotage(p, o) {
    if (!S.cfg.sab || !p.alive || p.energy < 40 || !o.alive) return;
    p.energy -= 40; var kind = SAB[p.sabIdx++ % SAB.length];
    if (NET) NET.emit({ k: 'sab', kind: kind, from: p.i }); else o._sabbed = S.t + .7;   /* v4.0: el sabotaje llega en 0,7 s; si mata, la burla se lo atribuye */
    S.sabCount = (S.sabCount || 0) + 1;
    S.fx.push({ k: 'tele', t: .7, kind: kind, target: o, src: p });
    say(nm(p.i) + ' → ' + kind + (kind === 'PINCHOS' ? ' (¡salta!)' : ''), 1.6); laugh(1.4); snd(240, .3, 'sawtooth', .1, 120);
  }
  function fireSab(f) {
    var o = f.target, p = f.src; if (!o.alive) return;
    if (NET && o.i !== NET.slot) return;          /* online: cada cliente aplica el efecto SOLO a su jugador */
    if (f.kind === 'EMPUJÓN') { o.vx = (o.x > p.x ? 1 : -1) * 700; o.vy = -330; o.onGround = false; }
    else if (f.kind === 'PINCHOS') { var sp = { x: o.x - 20, y: o.y + o.h - 24, w: 70, h: 24, spike: true, live: true, ttl: 1.6 }; S.temps.push(sp); if (NET) NET.emit({ k: 'tmp', t: sp }); }
    else if (f.kind === 'MAREO') o.inv = 3;
    else if (f.kind === 'PLOMO') o.weak = 3.2;
  }

  /* ------------------------------------------------------------ BUCLE DE RONDA */
  function rainHit(i) {
    var tp = S.p[i]; S._rainCd = 7;
    S.fx.push({ k: 'tele', t: .8, kind: 'PINCHOS', target: tp, src: tp, obs: 1 }); say(pickOnce(TAUNT.rain, 'rain'), 1.5); laugh(1.2);
  }
  /* ONLINE · el rival: se suaviza hacia lo último recibido (con extrapolación corta) */
  function stepRemote(p, dt) {
    var r = S.netRemote; if (!r || !p.alive) return;
    var ox = p.x, oy = p.y, age = Math.min(.16, Math.max(0, (Date.now() - r.at) / 1000));
    var tx = r.x + r.vx * age, ty = r.y + clamp(r.vy * age, -40, 40);
    if (Math.abs(tx - p.x) > 320 || Math.abs(ty - p.y) > 320) { p.x = tx; p.y = ty; }
    else { var k = Math.min(1, dt * 16); p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; }
    p.vx = r.vx; p.vy = r.vy; p.face = r.f || p.face; p.onGround = !!r.g;
    p.dx = p.x - ox; p.dy = p.y - oy;
  }
  function update(dt) {
    S.t += dt;
    if (S.say) { S.say.t -= dt; if (S.say.t <= 0) S.say = null; }
    S.laugh = Math.max(0, S.laugh - dt);
    if (S._rainCd) S._rainCd -= dt;
    S.fx.forEach(function (f) { f.t -= dt; if (f.k === 'tele' && f.t <= 0) fireSab(f); });
    S.fx = S.fx.filter(function (f) { return f.t > 0; });
    if (S.phase === 'countdown') {
      if (NET) S.phT = ((S.netPlayAt || 0) - NET.now()) / 1000; else S.phT -= dt;      /* online: cuenta atrás con el reloj del servidor */
      stepPlatforms(0); if (S.phT <= 0) { S.phase = 'play'; say('¡YA!', 1.2); snd(880, .3, 'square', .1); } return;
    }
    if (S.phase === 'end') { S.phT -= dt; if (NET && NET.host && S.phT <= 0) nextRound(); return; }
    if (S.phase !== 'play') return;
    if (NET) S.clock = Math.max(0, (NET.now() - S.netPlayAt) / 1000); else S.clock += dt;   /* online: reloj común → plataformas móviles idénticas */
    S.hint = Math.max(0, S.hint - dt);
    stepPlatforms(dt);
    S.lvl.plates.forEach(function (pl) { pl.press = pl._p ? 1 : 0; pl._p = false; });
    S.temps.forEach(function (t) { t.ttl -= dt; });
    S.temps = S.temps.filter(function (t) { return t.ttl > 0; });
    if (NET) {
      /* ONLINE: cada cliente simula SOLO a su jugador; el rival llega por red y se suaviza (estado + eventos) */
      var me = S.p[NET.slot], ot = S.p[1 - NET.slot], cm = ctrl(NET.slot); edge = {};
      movePlayer(me, cm, dt); stepRemote(ot, dt); if (ot.alive) platePress(ot);
      S.lvl.plates.forEach(function (pl) { pl.press = pl._p ? 1 : 0; });
      if (cm.hp) help(me, ot);
      if (cm.sp) sabotage(me, ot);
      me.energy = Math.min(100, me.energy + S.cfg.regen * dt);
    } else {
      var c0 = ctrl(0), c1 = ctrl(1); edge = {};
      movePlayer(S.p[0], c0, dt); movePlayer(S.p[1], c1, dt);
      S.lvl.plates.forEach(function (pl) { pl.press = pl._p ? 1 : 0; });
      if (c0.hp) help(S.p[0], S.p[1]); if (c1.hp) help(S.p[1], S.p[0]);
      if (c0.sp) sabotage(S.p[0], S.p[1]); if (c1.sp) sabotage(S.p[1], S.p[0]);
      S.p.forEach(function (p) { p.energy = Math.min(100, p.energy + S.cfg.regen * dt); });
    }
    // lluvia del Observador (solo CAOS)
    /* v4.0 causalidad: la lluvia tiene objetivo real y un enfriamiento de 7 s; frase variable */
    if (S.cfg.rain && S._rainCd <= 0 && (!NET || NET.host) && Math.random() < dt * .35) {   /* online: la lluvia la decide el anfitrión y la envía */
      var tp = S.p[Math.random() < .5 ? 0 : 1]; if (tp.alive && tp.onGround) { S._rainCd = 7; if (NET) NET.emit({ k: 'rain', i: tp.i }); rainHit(tp.i); }
    }
    // llegada a la puerta
    var AUTH = !NET || NET.host;               /* online: solo el anfitrión da por terminada la ronda */
    var D = S.lvl.door, inside = S.p.map(function (p) { return p.alive && hit(p, D); });
    if (S.cfg.coop) {
      if ((inside[0] || inside[1]) && !(inside[0] && inside[1])) { if (!S.waitMsg || S.waitMsg < S.t - 3) { S.waitMsg = S.t; say('Falta tu compañero en la puerta', 1.8); } }
      if (inside[0] && inside[1] && AUTH) finish('team');
    } else if (AUTH) {
      if (!S.over) { for (var i = 0; i < 2; i++) if (inside[i]) { S.over = { win: i, t: S.clock }; S.p[i].done = 1; if (NET) NET.emit({ k: 'over', win: i, t: S.clock }); say('¡' + nm(i) + ' ha llegado! El otro tiene 10 s', 2.5); snd(784, .4, 'triangle', .12, 1175); } }
      else {
        var lo = 1 - S.over.win; if (inside[lo]) { S.p[lo].done = 1; finish('race'); }
        else if (S.clock - S.over.t > 10) finish('race');
      }
    }
    if (S.clock > 210 && AUTH) finish('time');
    // cámara
    var a = S.p[0], b = S.p[1], tx, ty;
    if (NET && !S.cfg.coop) { var mm = S.p[NET.slot], rr2 = S.p[1 - NET.slot]; tx = mm.x * .8 + rr2.x * .2; ty = mm.y; }   /* online/carrera: tu cámara te sigue a ti */
    else if (S.cfg.coop || (!a.alive && !b.alive)) { tx = (a.x + b.x) / 2; ty = (a.y + b.y) / 2; } else { var lead = a.x > b.x ? a : b; tx = lead.x * .75 + (a.x + b.x) / 2 * .25; ty = lead.y; }
    S.cam.x += ((tx - VW / 2 + 40) - S.cam.x) * Math.min(1, dt * 4); S.cam.y += ((clamp(ty - VH * .58, -260, 260)) - S.cam.y) * Math.min(1, dt * 3);
    S.cam.x = clamp(S.cam.x, -60, S.lvl.W - VW + 60);
  }

  function finish(how) {
    if (S.phase !== 'play') return;
    var res = { how: how, add: [0, 0], team: 0, lines: [] }, cfg = S.cfg, par = cfg.par;
    if (how === 'team') {
      var bonus = S.clock < par ? 1 : 0; res.add = [3 + bonus, 3 + bonus]; res.team = 1;
      res.lines.push('¡Lo habéis conseguido juntos!  +3 cada uno' + (bonus ? '  ·  bonus de tiempo +1' : '')); say(pick(TAUNT.win), 3);
    } else if (how === 'race') {
      var w = S.over.win; res.add[w] = 3; res.add[1 - w] = S.p[1 - w].done ? 1 : 0;
      res.lines.push('P' + (w + 1) + ' gana la ronda  +3' + (S.p[1 - w].done ? '  ·  P' + (2 - w) + ' llega  +1' : ''));
    } else { res.lines.push('Se acabó el tiempo. Nadie gana.'); }
    S.p.forEach(function (p, i) { p.pts += res.add[i]; });
    S.result = res; S.phase = 'end'; S.phT = 4.5;
    /* v4.0 causalidad: la risa del final tiene causa — solo si la ronda fue sucia
       (muertes o sabotajes) o si en la carrera alguien se quedó sin llegar.
       Una victoria limpia en equipo NO se celebra con risas. */
    var dirty = (S.p[0].deaths + S.p[1].deaths + (S.sabCount || 0)) > 0;
    if (how === 'team') { if (dirty) laugh(1.2); }
    else if (how === 'race') { if (dirty || !S.p[1 - S.over.win].done) laugh(1.0); }
    else { if (dirty) laugh(1.2); }
    if (NET && NET.host) NET.emit({ k: 'fin', how: how, over: S.over || null, done: [S.p[0].done, S.p[1].done], clock: S.clock });
    try { EO.Audio.win(); } catch (e) {}
  }
  function nextRound() {
    S.round++;
    if (NET && NET.host) { S.netPlayAt = (S.round >= S.plan.length) ? 0 : NET.now() + 3500; NET.emit({ k: 'round', n: S.round, at: S.netPlayAt }); }
    if (S.round >= S.plan.length) { S.phase = 'final'; S.phT = 0; reward(); return; }
    C.startRound();
  }
  function reward() {
    try { var t = S.p[0].pts + S.p[1].pts, s = EO.Store.get(); s.coins = (s.coins || 0) + t * 3; s.coopMatches = (s.coopMatches || 0) + 1; EO.Store.save(); EO.UI.hud({ coins: s.coins }); S.earned = t * 3; } catch (e) { S.earned = 0; }
  }

  /* ------------------------------------------------------------ DIBUJO */
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function text(c, s, x, y, size, col, al, w) { c.font = '800 ' + size + 'px "Trebuchet MS",sans-serif'; c.textAlign = al || 'left'; c.lineWidth = 4; c.strokeStyle = 'rgba(5,3,12,.9)'; c.strokeText(s, x, y, w); c.fillStyle = col || '#f6f1ff'; c.fillText(s, x, y, w); }
  function drawAvatar(p, t) {
    var lo = p.lo;
    EO.Shop.avatar(cx, p.x + p.w / 2, p.y + p.h / 2, lo, t, { sq: p.onGround ? 1 : (p.vy < 0 ? 1.08 : .94), face: p.face, tilt: clamp(p.vx / 1400, -.16, .16), glow: p.i ? '#ff8bd0' : '#7ef0ff', aura: true });
  }
  function drawWorld(t) {
    var c = cx, L = S.lvl, cam = S.cam, i;
    c.save(); c.translate(-Math.round(cam.x), -Math.round(cam.y));
    // estrellas
    c.fillStyle = 'rgba(255,255,255,.5)';
    for (i = 0; i < 60; i++) { var sx = ((i * 197 + 40) % (L.W + 800)), sy = (i * 83) % 700 - 100, px = cam.x * .35; c.fillRect(sx - (px % 1) + cam.x * .65 - 0, sy + cam.y * .6, 2, 2); }
    L.plats.forEach(function (q) {
      if (q.state === 2) return;
      c.fillStyle = q.kind === 'move' ? '#3b2f7a' : q.kind === 'crumble' ? '#6a3f5a' : '#2b2250'; rr(c, q.x, q.y, q.w, Math.min(q.h, q.kind === 'solid' ? 220 : q.h), 6); c.fill();
      c.fillStyle = q.kind === 'move' ? '#a58bff' : q.kind === 'crumble' ? '#ff9d7a' : '#8b5cf6'; c.fillRect(q.x, q.y, q.w, 5);
      if (q.kind === 'crumble' && q.state === 1) { c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(q.x + Math.sin(t * 60) * 2, q.y, q.w, q.h); }
    });
    L.walls.forEach(function (w) { c.fillStyle = '#4a2a6a'; rr(c, w.x, w.y, w.w, w.h, 4); c.fill(); c.fillStyle = '#c08bff'; c.fillRect(w.x, w.y, w.w, 4); });
    L.gates.forEach(function (g, gi) {
      var a = gateActive(L, gi), solid = g.kind === 'door' ? !a : a;
      c.globalAlpha = solid ? 1 : .18; c.fillStyle = g.kind === 'door' ? '#ff7a6b' : '#6bffb4'; rr(c, g.x, g.y, g.w, g.h, 4); c.fill();
      if (g.kind === 'door') { c.fillStyle = 'rgba(0,0,0,.25)'; for (var k = 0; k < g.h; k += 18) c.fillRect(g.x, g.y + k, g.w, 3); }
      c.globalAlpha = 1;
    });
    L.plates.forEach(function (pl) { var on = pl.press || pl.timer > 0; c.fillStyle = on ? '#6bffb4' : '#ffd24d'; rr(c, pl.x, pl.y + (pl.press ? 4 : 0), pl.w, 8 - (pl.press ? 4 : 0), 2); c.fill();
      if (pl.mode === 'timed' && pl.timer > 0) { c.fillStyle = '#fff'; c.fillRect(pl.x, pl.y - 6, pl.w * (pl.timer / 8), 3); } });
    L.spikes.concat(S.temps.filter(function (x) { return x.spike; })).forEach(function (s) {
      c.fillStyle = s.live === false ? 'rgba(255,70,90,.25)' : '#ff4d6d'; var n = Math.max(2, Math.round(s.w / 14)), sw = s.w / n;
      for (var k = 0; k < n; k++) { c.beginPath(); c.moveTo(s.x + k * sw, s.y + s.h); c.lineTo(s.x + k * sw + sw / 2, s.y); c.lineTo(s.x + (k + 1) * sw, s.y + s.h); c.fill(); }
    });
    S.temps.forEach(function (x) { if (x.kind === 'rescue') { c.fillStyle = 'rgba(142,244,255,.7)'; rr(c, x.x, x.y, x.w, x.h, 6); c.fill(); } });
    L.orbs.forEach(function (o) { if (o.got) return; c.fillStyle = '#8ef4ff'; c.shadowColor = '#8ef4ff'; c.shadowBlur = 14; c.beginPath(); c.arc(o.x, o.y + Math.sin(t * 3 + o.x) * 4, 7, 0, 6.283); c.fill(); c.shadowBlur = 0; });
    L.cps.forEach(function (cp) { c.strokeStyle = '#ffd24d'; c.lineWidth = 3; c.beginPath(); c.moveTo(cp.x, cp.y + PH); c.lineTo(cp.x, cp.y - 40); c.stroke(); c.fillStyle = S.p.some(function (p) { return p.cp && p.cp.x >= cp.x; }) ? '#6bffb4' : '#ff7a6b'; c.fillRect(cp.x, cp.y - 40, 22, 14); });
    var D = L.door; c.fillStyle = '#ffd24d'; c.shadowColor = '#ffd24d'; c.shadowBlur = 18; rr(c, D.x - 5, D.y - 5, D.w + 10, D.h + 5, 8); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#12091f'; rr(c, D.x, D.y, D.w, D.h, 6); c.fill();
    var cnt = S.p.filter(function (p) { return p.alive && hit(p, D); }).length; c.fillStyle = 'rgba(255,224,138,' + (.25 + cnt * .3) + ')'; rr(c, D.x, D.y, D.w, D.h, 6); c.fill();
    S.fx.forEach(function (f) {
      if (f.k === 'burst') { c.strokeStyle = f.c; c.lineWidth = 3; c.globalAlpha = f.t * 1.5; c.beginPath(); c.arc(f.x, f.y, (1 - f.t) * 60, 0, 6.283); c.stroke(); c.globalAlpha = 1; }
      else if (f.k === 'txt') { c.globalAlpha = Math.min(1, f.t * 2); text(c, f.s, f.x, f.y - (1.2 - f.t) * 30, 16, '#ffe08a', 'center'); c.globalAlpha = 1; }
      else if (f.k === 'tele') { var o = f.target; c.globalAlpha = .5 + .5 * Math.sin(t * 30); text(c, '!', o.x + 15, o.y - 20, 30, '#ff4d6d', 'center'); c.fillStyle = 'rgba(255,60,90,.22)'; if (f.kind === 'PINCHOS') c.fillRect(o.x - 20, o.y + o.h - 24, 70, 24); c.globalAlpha = 1; }
    });
    S.p.forEach(function (p) {
      if (!p.alive) return;
      drawAvatar(p, t);
      c.fillStyle = p.i ? '#ff8bd0' : '#7ef0ff'; c.beginPath(); c.moveTo(p.x + 15, p.y - 24); c.lineTo(p.x + 9, p.y - 34); c.lineTo(p.x + 21, p.y - 34); c.fill();
      text(c, NET ? nm(p.i) + (p.i === NET.slot ? ' (tú)' : '') : 'P' + (p.i + 1), p.x + 15, p.y - 38, 13, p.i ? '#ff8bd0' : '#7ef0ff', 'center');
      if (p.inv > 0) text(c, '@', p.x + 15, p.y - 52, 18, '#ffd24d', 'center');
      if (p.weak > 0) text(c, '▼', p.x + 15, p.y - 52, 16, '#b69cff', 'center');
      if (p.boost) text(c, '▲', p.x + 15, p.y - 52, 16, '#6bffb4', 'center');
    });
    c.restore();
    // flechas hacia el compañero fuera de pantalla
    S.p.forEach(function (p) {
      if (NET && p.i !== NET.slot) return;
      var o = S.p[1 - p.i]; if (!o.alive) return;
      var sx = o.x - S.cam.x; if (sx < -10 || sx > VW + 10) { var left = sx < 0; c.fillStyle = o.i ? '#ff8bd0' : '#7ef0ff'; c.globalAlpha = .9; c.beginPath(); c.moveTo(left ? 14 : VW - 14, VH / 2 + 30); c.lineTo(left ? 42 : VW - 42, VH / 2 + 12); c.lineTo(left ? 42 : VW - 42, VH / 2 + 48); c.fill(); c.globalAlpha = 1; text(c, nm(o.i) + ' ' + Math.abs(Math.round(o.x - p.x)) + ' px', left ? 50 : VW - 50, VH / 2 + 36, 13, '#fff', left ? 'left' : 'right'); }
    });
  }
  function bar(x, y, w, v, col, label) { cx.fillStyle = 'rgba(10,6,24,.7)'; rr(cx, x, y, w, 12, 6); cx.fill(); cx.fillStyle = col; rr(cx, x, y, Math.max(2, w * v / 100), 12, 6); cx.fill(); text(cx, label, x, y - 4, 11, '#c9c2e8'); }
  function drawHUD(t) {
    var c = cx;
    var cfgn = S.cfg ? S.cfg.n : '';
    text(c, nm(0) + '  ' + S.p[0].pts + ' pts', 24, 34, 24, '#7ef0ff', 'left', 300); bar(24, 56, 220, S.p[0].energy, S.p[0].energy >= 40 ? '#6bffb4' : '#ffd24d', NET ? (NET.slot === 0 ? (touchy() ? 'TU ENERGÍA · ✚ ayuda · ✦ sabotaje' : 'TU ENERGÍA · Q ayuda · E sabotaje') : 'ENERGÍA') : 'ENERGÍA  Q ayuda · E sabotaje');
    text(c, S.p[1].pts + ' pts  ' + nm(1), VW - 24, 34, 24, '#ff8bd0', 'right', 300); bar(VW - 244, 56, 220, S.p[1].energy, S.p[1].energy >= 40 ? '#6bffb4' : '#ffd24d', NET ? (NET.slot === 1 ? (touchy() ? 'TU ENERGÍA · ✚ ayuda · ✦ sabotaje' : 'TU ENERGÍA · , ayuda · . sabotaje') : 'ENERGÍA') : 'ENERGÍA  , ayuda · . sabotaje');
    if (NET) {
      var png = NET.ping; text(c, (png != null ? png + ' ms' : '…') + ' · ONLINE', VW / 2, 72, 12, png == null ? '#ffd24d' : png < 120 ? '#6bffb4' : png < 250 ? '#ffd24d' : '#ff7a6b', 'center');
      if (S.netBanner) { c.globalAlpha = .55 + .45 * Math.sin(t * 6); text(c, S.netBanner, VW / 2, VH / 2 - 90, 26, '#ff7a6b', 'center', VW - 100); c.globalAlpha = 1; }
    }
    text(c, 'RONDA ' + (S.round + 1) + '/' + S.plan.length + ' · ' + cfgn, VW / 2, 30, 22, '#f6f1ff', 'center');
    var secs = Math.max(0, 210 - S.clock) | 0; text(c, (S.cfg && S.cfg.coop ? 'EQUIPO' : 'CARRERA') + '  ' + ((secs / 60) | 0) + ':' + ('0' + (secs % 60)).slice(-2), VW / 2, 54, 15, '#b8b0e0', 'center');
    if (S.laugh > 0) { EO.Fx.drawLaughFace(c, VW / 2, 120 + Math.sin(t * 20) * 3, 24); }
    if (S.say) { c.globalAlpha = Math.min(1, S.say.t * 2); text(c, S.say.txt, VW / 2, S.laugh > 0 ? 176 : 100, 20, '#ffe08a', 'center', VW - 120); c.globalAlpha = 1; }
    if (S.hint > 0 && S.phase === 'play') { c.globalAlpha = Math.min(1, S.hint); text(c, NET ? (touchy() ? 'Mueve con ◀ ▶  ·  Salta con ⤒  ·  ✚ ayuda  ·  ✦ sabotaje' : 'Mover A D / ← →  ·  Saltar W / ↑ / Espacio  ·  Ayuda Q o ,  ·  Sabotaje E o .') : 'P1: A D W · Q ayuda · E sabotaje        P2: ← → ↑ · , ayuda · . sabotaje', VW / 2, VH - 24, 16, '#c9c2e8', 'center'); c.globalAlpha = 1; }
    if (S.phase === 'countdown') text(c, String(Math.max(1, Math.ceil(S.phT - .2))), VW / 2, VH / 2, 120, '#ffe08a', 'center');
  }
  function panel(title, lines, foot) {
    var c = cx; c.fillStyle = 'rgba(8,4,20,.82)'; c.fillRect(0, 0, VW, VH);
    text(c, title, VW / 2, 120, 46, '#ffe08a', 'center'); lines.forEach(function (l, i) { text(c, l, VW / 2, 200 + i * 38, 22, '#f6f1ff', 'center', VW - 160); });
    if (foot) text(c, foot, VW / 2, VH - 50, 18, '#b8b0e0', 'center');
  }
  function drawLobby(t) {
    var c = cx; c.fillStyle = '#0a0618'; c.fillRect(0, 0, VW, VH);
    text(c, 'COOPERATIVO LOCAL', VW / 2, 90, 52, '#ffe08a', 'center');
    text(c, 'Modo: ' + MODE_NAMES[S.mode] + '   (M para cambiar)', VW / 2, 135, 22, '#f6f1ff', 'center');
    text(c, S.plan.map(function (r) { return ROUNDS[r].n; }).join('  ›  '), VW / 2, 170, 16, '#b8b0e0', 'center');
    [0, 1].forEach(function (i) {
      var p = S.p[i], x = VW / 2 + (i ? 230 : -230);
      c.fillStyle = 'rgba(255,255,255,.06)'; rr(c, x - 150, 215, 300, 250, 16); c.fill();
      p.x = x - 15; p.y = 290; p.w = 30; p.h = 40; p.onGround = true; p.vx = 0; p.vy = 0; p.face = i ? -1 : 1;
      c.save(); c.scale(2.2, 2.2); c.translate(0, 0); c.restore();
      EO.Shop.avatar(c, x, 320, p.lo, t, { face: p.face, glow: i ? '#ff8bd0' : '#7ef0ff', aura: true });
      text(c, 'JUGADOR ' + (i + 1), x, 250, 22, i ? '#ff8bd0' : '#7ef0ff', 'center');
      text(c, p.lo.char + ' · ' + p.lo.color, x, 395, 16, '#f6f1ff', 'center');
      text(c, i ? '← → personaje · ↑ ↓ color' : 'A D personaje · W S color', x, 430, 14, '#b8b0e0', 'center');
    });
    text(c, 'ENTER / botón A: empezar · Esc: salir', VW / 2, VH - 70, 22, '#6bffb4', 'center');
    text(c, 'Ayuda (25 energía) · Sabotaje (40) · chispas = energía · el Observador mira, y se ríe', VW / 2, VH - 36, 15, '#b8b0e0', 'center');
  }
  function draw(t) {
    var c = cx; c.setTransform(cv.width / VW, 0, 0, cv.height / VH, 0, 0);
    if (S.phase === 'lobby') return drawLobby(t);
    var g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#120a2a'); g.addColorStop(1, '#05030c'); c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    drawWorld(t); drawHUD(t);
    if (S.phase === 'end') { var r = S.result; panel('RONDA ' + (S.round + 1) + ' · ' + S.cfg.n, r.lines.concat(['', nm(0) + ' ' + S.p[0].pts + ' pts   ·   ' + nm(1) + ' ' + S.p[1].pts + ' pts']), NET && !NET.host ? 'Siguiente ronda en ' + Math.max(0, Math.ceil(S.phT)) + ' s · la decide el anfitrión' : 'Siguiente ronda en ' + Math.max(0, Math.ceil(S.phT)) + ' s' + (NET ? '' : ' · ENTER para saltar')); }
    if (S.phase === 'final') {
      var a = S.p[0].pts, b = S.p[1].pts, team = S.mode === 'coop';
      var head = team ? 'EQUIPO: ' + (a + b) + ' PUNTOS' : (a === b ? 'EMPATE' : 'GANA ' + nm(a > b ? 0 : 1).toUpperCase());
      panel(head, [nm(0) + ': ' + a + ' pts   ·   ' + nm(1) + ': ' + b + ' pts', 'CAOS ganado: +' + (S.earned || 0), (a + b) >= 24 ? 'El Observador no lo admite, pero está impresionado.' : 'El Observador sigue riéndose de vosotros.'], NET ? (NET.host ? 'ENTER: volver a la sala (revancha) · Esc dos veces: salir' : 'Esperando al anfitrión… · Esc dos veces: salir') : 'ENTER: otra partida · Esc: salir');
    }
  }

  /* ------------------------------------------------------------ BUCLE */
  function frame(ts) {
    if (!C.active) return;
    var dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; acc += dt;
    var guard = 0; while (acc >= STEP && guard < 12) { try { update(STEP); } catch (e) { if (window.console) console.error('coop:', e); } acc -= STEP; guard++; }
    if (guard >= 12) acc = 0;
    try { draw(ts / 1000); } catch (e) { if (window.console) console.error('coop draw:', e); }
    edge = {}; raf = requestAnimationFrame(frame);
  }
  function resize() { if (!cv) return; var w = Math.min(window.innerWidth, window.innerHeight * VW / VH); cv.style.width = w + 'px'; cv.style.height = (w * VH / VW) + 'px'; }
  function onKey(e) {
    if (!C.active) return;
    var code = e.code;
    if (code === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.type === 'keydown' && !e.repeat) {
        if (!NET) C.close();
        else { var tn = Date.now(); if (tn - (NET.escAt || 0) < 2200) NET.leave(); else { NET.escAt = tn; say('Pulsa Esc otra vez para abandonar la sala', 2.2); } }
      }
      return;
    }
    if (e.type === 'keydown') {
      if (!e.repeat) edge[code] = true; keys[code] = true;
      if (!e.repeat) lobbyKey(code);
    } else keys[code] = false;
    if (/^(Arrow|Key|Space|Enter|Comma|Period|Tab)/.test(code)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }
  function cycle(list, cur, d) { var i = list.indexOf(cur); return list[(i + d + list.length) % list.length]; }
  function lobbyKey(code) {
    if (S.phase === 'lobby') {
      var ch = allChars(), co = allColors(), p0 = S.p[0].lo, p1 = S.p[1].lo;
      if (code === 'KeyA') p0.char = cycle(ch, p0.char, -1); if (code === 'KeyD') p0.char = cycle(ch, p0.char, 1);
      if (code === 'KeyW') p0.color = cycle(co, p0.color, 1); if (code === 'KeyS') p0.color = cycle(co, p0.color, -1);
      if (code === 'ArrowLeft') p1.char = cycle(ch, p1.char, -1); if (code === 'ArrowRight') p1.char = cycle(ch, p1.char, 1);
      if (code === 'ArrowUp') p1.color = cycle(co, p1.color, 1); if (code === 'ArrowDown') p1.color = cycle(co, p1.color, -1);
      if (code === 'KeyM') { var ms = ['mixto', 'coop', 'versus']; S.mode = cycle(ms, S.mode, 1); S.plan = PLANS[S.mode]; }
      if (code === 'Enter') { S.round = 0; S.p.forEach(function (p) { p.pts = 0; }); C.startRound(); }
    } else if (S.phase === 'end' && code === 'Enter') { if (!NET || NET.host) nextRound(); }
    else if (S.phase === 'final' && code === 'Enter') { if (NET) { if (NET.host) NET.toLobby(); } else { var m = S.mode; C.newMatch(m); } }
  }
  C.open = function () {
    if (C.active) return;
    if (!root) {
      root = document.createElement('div'); root.id = 'coop-root';
      root.style.cssText = 'position:fixed;inset:0;z-index:60;background:#05030c;display:flex;align-items:center;justify-content:center;';
      cv = document.createElement('canvas'); cv.width = 1280; cv.height = Math.round(1280 * VH / VW); root.appendChild(cv); cx = cv.getContext('2d');
      document.body.appendChild(root); window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKey, true); window.addEventListener('resize', resize);
    }
    root.style.display = 'flex'; C.active = true; G.coopActive = true; keys = {}; edge = {};
    if (!S) C.newMatch('mixto'); else if (S.phase !== 'lobby') C.newMatch(S.mode);
    resize(); last = performance.now(); acc = 0; raf = requestAnimationFrame(frame);
  };
  C.close = function () {
    C.active = false; G.coopActive = false; if (raf) cancelAnimationFrame(raf); if (root) root.style.display = 'none';
    try { EO.UI.updateMenu(); EO.UI.show('menu'); } catch (e) {}
  };
  setTimeout(function () { var b = document.getElementById('m-coop'); if (b) b.addEventListener('click', function () { try { EO.Audio.click(); } catch (e) {} C.open(); }); }, 0);

  /* ------------------------------------------------------------ ONLINE (v4.1) · API para coop-online.js */
  var touchEl = null;
  function buildTouch() {
    if (touchEl || !root) return;
    touchEl = document.createElement('div');
    touchEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;touch-action:none;user-select:none;-webkit-user-select:none';
    var defs = [
      { k: 'ArrowLeft', t: '◀', pos: 'left:14px;bottom:18px', hold: 1 }, { k: 'ArrowRight', t: '▶', pos: 'left:110px;bottom:18px', hold: 1 },
      { k: 'ArrowUp', t: '⤒', pos: 'right:14px;bottom:18px', hold: 1, big: 1 },
      { k: 'Comma', t: '✚', pos: 'right:120px;bottom:30px' }, { k: 'Period', t: '✦', pos: 'right:120px;bottom:104px', sab: 1 }
    ];
    defs.forEach(function (d) {
      var b = document.createElement('div'); b.textContent = d.t; b.setAttribute('data-sab', d.sab ? '1' : '0');
      var sz = d.big ? 84 : 72;
      b.style.cssText = 'position:absolute;' + d.pos + ';width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.35);color:#fff;font:700 30px sans-serif;display:flex;align-items:center;justify-content:center;pointer-events:auto;touch-action:none';
      function down(e) { e.preventDefault(); b.style.background = 'rgba(255,224,138,.4)'; keys[d.k] = true; edge[d.k] = true; }
      function up(e) { e.preventDefault(); b.style.background = 'rgba(255,255,255,.14)'; keys[d.k] = false; }
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
      touchEl.appendChild(b);
    });
    root.appendChild(touchEl);
  }
  C.netAttach = function (o) {
    NET = o;
    if (NET && root && EO.Device && EO.Device.isTouch) { buildTouch(); }
    if (touchEl) touchEl.style.display = (NET && EO.Device && EO.Device.isTouch) ? 'block' : 'none';
  };
  C.netDetach = function () { NET = null; if (touchEl) touchEl.style.display = 'none'; if (S) { S.net = false; S.netBanner = null; } };
  C.closeSilent = function () { C.active = false; G.coopActive = false; if (raf) cancelAnimationFrame(raf); if (root) root.style.display = 'none'; keys = {}; edge = {}; };
  C.netEnsureRoot = function () { if (!root) { C.open(); } if (NET && EO.Device && EO.Device.isTouch) { buildTouch(); touchEl.style.display = 'block'; } };
  /* estado propio → rival (≈20 Hz) */
  C.netSnapshot = function () {
    if (!S || !NET || !S.p) return null; var p = S.p[NET.slot], r1 = function (v) { return Math.round(v * 10) / 10; };
    return { x: r1(p.x), y: r1(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), f: p.face, g: p.onGround ? 1 : 0, a: p.alive ? 1 : 0, e: Math.round(p.energy), d: p.deaths | 0,
      i: p.inv > 0 ? 1 : 0, w: p.weak > 0 ? 1 : 0, b: p.boost ? 1 : 0, c: p.cp ? Math.round(p.cp.x) : 0, r: S.round, ph: S.phase === 'play' ? 1 : 0 };
  };
  /* estado del rival */
  C.netSnap = function (d) {
    if (!S || !NET || !S.p || !d || d.r !== S.round) return;
    var p = S.p[1 - NET.slot], num = function (v) { return typeof v === 'number' && isFinite(v) ? v : 0; };
    var r = S.netRemote || (S.netRemote = {});
    r.x = num(d.x); r.y = num(d.y); r.vx = clamp(num(d.vx), -900, 900); r.vy = clamp(num(d.vy), -1600, 1600); r.f = d.f < 0 ? -1 : 1; r.g = d.g ? 1 : 0; r.at = Date.now();
    S.netRecvAt = r.at;
    var alive = !!d.a;
    if (p.alive && !alive && S.phase === 'play') {
      p.alive = false; p.deaths = d.d | 0; p.vx = p.vy = 0; S.fx.push({ k: 'burst', x: p.x + 15, y: p.y + 20, t: .6, c: p.i ? '#ff8bd0' : '#7ef0ff' }); snd(160, .3, 'sawtooth', .08, 60);
      if (p.deaths === 1) { say(pickOnce(TAUNT.die1, 'die1'), 2); laugh(.9); } else if (Math.random() < .3) { say(pickOnce(TAUNT.die, 'die'), 2); laugh(1.1); }
    } else if (!p.alive && alive) { p.alive = true; p.x = r.x; p.y = r.y; p.vx = p.vy = 0; S.fx.push({ k: 'burst', x: p.x + 15, y: p.y + 20, t: .5, c: '#fff' }); }
    p.deaths = d.d | 0; p.energy = clamp(num(d.e), 0, 100); p.inv = d.i ? 1 : 0; p.weak = d.w ? 1 : 0; p.boost = d.b ? 1 : 0;
    if (d.c) p.cp = { x: num(d.c), y: 0 };
  };
  /* eventos del rival */
  C.netEvent = function (e) {
    if (!S || !NET || !e || typeof e.k !== 'string') return;
    var me = S.p[NET.slot], src = S.p[1 - NET.slot], L = S.lvl;
    switch (e.k) {
      case 'cr': { var q = L && L.plats[e.i | 0]; if (q && q.kind === 'crumble' && q.state === 0) { q.state = 1; q.t = .5; } break; }
      case 'orb': { var o = L && L.orbs[e.i | 0]; if (o) o.got = 1; break; }
      case 'tmp': {
        var t = e.t; if (!t || typeof t !== 'object') break;
        var n = function (v, a, b) { v = +v; return isFinite(v) ? clamp(v, a, b) : a; };
        var nt = { x: n(t.x, -1e5, 1e5), y: n(t.y, -1e4, 1e4), w: n(t.w, 1, 400), h: n(t.h, 1, 100), ttl: n(t.ttl, .1, 3.2) };
        if (t.spike) { nt.spike = true; nt.live = true; } else { nt.solid = true; nt.kind = 'rescue'; nt.dx = 0; nt.dy = 0; }
        S.temps.push(nt); break;
      }
      case 'boost': me.boost = 1; S.fx.push({ k: 'txt', x: me.x, y: me.y - 20, t: 1.2, s: '¡SALTO x1,3!' }); snd(660, .2, 'triangle', .1, 990); break;
      case 'sab': {
        if (SAB.indexOf(e.kind) < 0 || !S.cfg.sab) break;
        me._sabbed = S.t + .7; S.sabCount = (S.sabCount || 0) + 1;
        S.fx.push({ k: 'tele', t: .7, kind: e.kind, target: me, src: src });
        say(nm(src.i) + ' → ' + e.kind + (e.kind === 'PINCHOS' ? ' (¡salta!)' : ''), 1.6); laugh(1.4); snd(240, .3, 'sawtooth', .1, 120); break;
      }
      case 'rain': if (S.cfg.rain && (e.i === 0 || e.i === 1)) rainHit(e.i); break;
      case 'over': if (!S.over && (e.win === 0 || e.win === 1)) { S.over = { win: e.win, t: +e.t || S.clock }; S.p[e.win].done = 1; say('¡' + nm(e.win) + ' ha llegado! El otro tiene 10 s', 2.5); snd(784, .4, 'triangle', .12, 1175); } break;
      case 'fin': {
        if (S.phase === 'end' || S.phase === 'final') break;
        S.phase = 'play'; S.over = e.over || null; if (typeof e.clock === 'number') S.clock = e.clock;
        if (e.done) { S.p[0].done = e.done[0] ? 1 : 0; S.p[1].done = e.done[1] ? 1 : 0; }
        finish(e.how === 'team' || e.how === 'race' ? e.how : 'time'); break;
      }
      case 'round': {
        var nn = e.n | 0; if (nn < 1 || nn > S.plan.length || nn <= S.round) break;
        S.round = nn - 1; S.netPlayAt = +e.at || (NET.now() + 3500); nextRound(); break;
      }
    }
  };

  /* ganchos de prueba (sin navegador) */
  C._t = { state: function () { return S; }, update: update, nm: nm, newMatch: C.newMatch, ctrlOverride: null, nextRound: nextRound, finish: finish, solids: solids, setKeys: function (k, e) { keys = k || {}; edge = e || {}; } };
})(window.EO);
