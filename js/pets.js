/* ============================================================================
   EL OBSERVADOR — pets.js  (v3.3)  ·  Mascotas con vida propia
   La mascota ya no va pegada al jugador: tiene posición, física y carácter.
   · Te sigue a su ritmo y a veces se adelanta, pero NUNCA pasa de ti si hay una
     trampa o pinchos por delante (a menos de 380 px).
   · Las terrestres caminan sobre su plataforma; si tú saltas a otra, esperan a
     que aterrices con calma y saltan hasta ti (o se teletransportan si queda lejos).
     Si te caes, NO se tiran detrás: se quedan esperando.
   · Las voladoras te siguen al aire. Polilla y pez te acompañan hacia abajo
     (flotan); murciélago, cuervo y búho se quedan en lo alto si caes.
   · Cada una te ayuda de vez en cuando (máx. 4 veces por nivel) a su manera.
   ============================================================================ */
(function (EO) {
  'use strict';
  var G = EO.Game;
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var MAXHELP = 4, SAFE = 380;

  /* dx,dy: desfase con el que está dibujada cada mascota en shop.js (para recolocarla) */
  var PET = {
    rata:       { fly: 0, r: 6,  dx: -26, dy: 6,   spd: 300, lead: 60,  help: 'olfato',    cd: 26 },
    rana:       { fly: 0, r: 8,  dx: 24,  dy: 8,   spd: 230, lead: 50,  help: 'huecos',    cd: 20 },
    gato:       { fly: 0, r: 8,  dx: -30, dy: 4,   spd: 340, lead: 80,  help: 'intuicion', cd: 18 },
    slime:      { fly: 0, r: 8,  dx: -28, dy: 10,  spd: 170, lead: 40,  help: 'cebo',      cd: 35 },
    polilla:    { fly: 1, r: 4,  dx: -20, dy: -20, k: 5,   lead: 120, help: 'luz',       cd: 30, fall: 1 },
    pez:        { fly: 1, r: 6,  dx: 35,  dy: -10, k: 4,   lead: 100, help: 'puertas',   cd: 30, fall: 1 },
    murcielago: { fly: 1, r: 6,  dx: -15, dy: -25, k: 6,   lead: 110, help: 'eco',       cd: 30, fall: 0 },
    cuervo:     { fly: 1, r: 6,  dx: -20, dy: -30, k: 3.5, lead: 100, help: 'robar',     cd: 34, fall: 0 },
    buho:       { fly: 1, r: 9,  dx: -22, dy: -22, k: 3,   lead: 60,  help: 'memoria',   cd: 12, fall: 0 },
    /* v3.4 — comparten habilidades con las anteriores */
    conejo:     { fly: 0, r: 7,  dx: 28,  dy: 8,   spd: 360, lead: 70,  help: 'huecos',    cd: 22 },
    pinguino:   { fly: 0, r: 7,  dx: 26,  dy: 6,   spd: 200, lead: 45,  help: 'olfato',    cd: 24 },
    zorro:      { fly: 0, r: 8,  dx: -32, dy: 5,   spd: 330, lead: 80,  help: 'intuicion', cd: 18 },
    medusa:     { fly: 1, r: 8,  dx: 30,  dy: -24, k: 3.5, lead: 90,  help: 'eco',       cd: 30, fall: 1 },
    abeja:      { fly: 1, r: 5,  dx: 22,  dy: -22, k: 6,   lead: 120, help: 'luz',       cd: 28, fall: 1 },
    dragoncito: { fly: 1, r: 7,  dx: -24, dy: -28, k: 3.5, lead: 90,  help: 'robar',     cd: 30, fall: 0 }
  };
  var INFO = {
    rata: ['Olfato', 'Si llevas un rato parado o has muerto, te señala un orbe cercano.'],
    rana: ['Huecos', 'Croa y marca los suelos falsos y huecos disimulados que vienen.'],
    gato: ['Intuición', 'Se frena y arquea el lomo ante pinchos, pisones, paredes y empujones.'],
    slime: ['Pegajoso', 'Se come el cebo «?» antes de que te maldiga.'],
    polilla: ['Luz guía', 'Si estás perdido o has muerto, vuela hacia la salida verdadera. Te sigue al caer.'],
    pez: ['Fantasma', 'Rodea las puertas falsas y las deshace. Flota contigo si caes.'],
    murcielago: ['Eco', 'Emite un pulso que hace visibles los avisos de las trampas cercanas.'],
    cuervo: ['Ladrón', 'Va a por un orbe cercano y te lo trae. No baja a buscarte si caes.'],
    conejo: ['Olfato de huecos', 'Salta a ratos y marca los suelos falsos y huecos disimulados.'],
    pinguino: ['Olfato', 'Si llevas un rato parado o has muerto, te señala un orbe cercano.'],
    zorro: ['Astucia', 'Se frena y gruñe ante pinchos, pisones, paredes y empujones.'],
    medusa: ['Pulso', 'Emite un pulso que hace visibles los avisos de las trampas cercanas. Flota contigo si caes.'],
    abeja: ['Zumbido guía', 'Si estás perdido o has muerto, vuela hacia la salida verdadera. Te sigue al caer.'],
    dragoncito: ['Rapiña', 'Va a por un orbe cercano y te lo trae. No baja a buscarte si caes.'],
    buho: ['Memoria', 'Tras 3 muertes te recuerda con un aviso lo que te mató. No baja si caes.']
  };
  var CHIRP = { rata: [900, 'square'], rana: [180, 'square'], gato: [620, 'triangle'], slime: [260, 'sine'],
    polilla: [1300, 'sine'], pez: [740, 'sine'], murcielago: [1900, 'triangle'], cuervo: [300, 'sawtooth'], buho: [240, 'sine'],
    conejo: [700, 'triangle'], pinguino: [420, 'square'], zorro: [520, 'triangle'], medusa: [350, 'sine'], abeja: [1100, 'sawtooth'], dragoncito: [200, 'sawtooth'] };

  var P = EO.Pets = { def: PET, info: INFO };

  function curType() { var s = EO.Store.get(); return (s.equip && s.equip.pet) || 'none'; }
  function chirp(pet, v) {
    var c = CHIRP[pet.type]; if (!c || !EO.Audio.tone) return;
    EO.Audio.tone(c[0], .12, c[1], v || .08, c[0] * 1.5);
  }
  function platUnder(L, x, yFeet) {   // plataforma activa más cercana por debajo de yFeet
    var best = -1, by = 1e9;
    for (var i = 0; i < L.platforms.length; i++) {
      var pl = L.platforms[i];
      if (!G.platformActive(pl) || x < pl.x + 2 || x > pl.x + pl.w - 2) continue;
      if (pl.y >= yFeet - 8 && pl.y < by) { by = pl.y; best = i; }
    }
    return best;
  }
  function say(pet, txt, life) { pet.say = { txt: txt, t: 0, life: life || 1.6 }; }
  function mark(pet, x, y, txt) { pet.mark = { x: x, y: y, txt: txt || '!', t: 0, life: 3.6 }; }
  function trapY(t, fb) { return (typeof t.sy === 'number' ? t.sy : fb) - 64; }

  /* ------------------------------------------------------------- AMENAZAS */
  function threat(L, px, face) {   // distancia a lo más cercano que mata, por delante
    var d = Infinity, i, t, c, tr = L.traps || [];
    for (i = 0; i < tr.length; i++) {
      t = tr[i]; if (typeof t.x !== 'number' || t.got || t.k === 'runaway') continue;
      c = (t.x + (t.w || 0) / 2 - px) * face; if (c > -30 && c < d) d = c;
    }
    var sp = L.spikes || [];
    for (i = 0; i < sp.length; i++) { c = (sp[i].x + (sp[i].w || 0) / 2 - px) * face; if (c > -30 && c < d) d = c; }
    return d;
  }
  function nearestKind(L, px, face, kinds, range, anyDir) {
    var best = null, bd = range, tr = L.traps || [];
    for (var i = 0; i < tr.length; i++) {
      var t = tr[i]; if (typeof t.x !== 'number' || kinds.indexOf(t.k) < 0 || t.got) continue;
      var c = (t.x + (t.w || 0) / 2 - px) * (anyDir ? 1 : face); if (anyDir) c = Math.abs(c);
      if (c > -20 && c < bd) { bd = c; best = t; }
    }
    return best;
  }

  /* ------------------------------------------------------------ CICLO VIDA */
  P.init = function (g, puff, keep) {
    var type = curType(), def = PET[type], L = g.lvl, old = g.pet;
    if (!L || !L.player || !def) { g.pet = null; return; }
    var p = L.player, face = p.facing || 1;
    var pet = {
      type: type, def: def, face: face, x: p.x + p.w / 2 - face * Math.abs(def.dx), y: p.y + p.h / 2, z: 0, vz: 0, vy: 0,
      plat: -1, mode: def.fly ? 'air' : 'ground', hop: null, cd: def.cd * .5, helps: 0, say: null, mark: null,
      safeY: p.y + def.dy, standT: 0, pgPrev: -1, ph: Math.random() * 6.28, fetch: null, guide: 0, lastHelpDeath: 0,
      wasGround: true, lost: false
    };
    if (!def.fly) {
      var i = p.standing >= 0 ? p.standing : platUnder(L, pet.x, p.y + p.h);
      if (i < 0) i = platUnder(L, p.x + p.w / 2, p.y + p.h);
      if (i >= 0) { var pl = L.platforms[i]; pet.plat = i; pet.x = clamp(pet.x, pl.x + def.r + 3, pl.x + pl.w - def.r - 3); pet.y = pl.y - def.r; }
      else pet.mode = 'fall';
    }
    if (keep && old && old.type === type) { pet.helps = old.helps; pet.lastHelpDeath = old.lastHelpDeath; pet.cd = old.cd; }
    g.pet = pet;
    if (puff) g.burst(pet.x, pet.y, 8, '#ffffff', 90);
  };

  function startHop(g, pet, L, pg, tx, warp) {
    var def = pet.def, pl = L.platforms[pg];
    tx = clamp(tx, pl.x + def.r + 4, pl.x + pl.w - def.r - 4);
    var ty = pl.y - def.r, dist = Math.hypot(tx - pet.x, ty - pet.y);
    if (warp || dist > 520 || ty - pet.y < -280) {
      g.burst(pet.x, pet.y, 8, '#ffffff', 90); pet.x = tx; pet.y = ty; pet.plat = pg; pet.mode = 'ground'; pet.lost = false;
      g.burst(pet.x, pet.y, 8, '#ffffff', 90); chirp(pet, .05); return;
    }
    pet.mode = 'hop'; pet.plat = -1;
    pet.hop = { t: 0, dur: .36 + dist / 1100, x0: pet.x, y0: pet.y, x1: tx, y1: ty, h: 55 + dist * .12, plat: pg };
    chirp(pet, .06);
  }

  P.update = function (g, dt) {
    var pet = g.pet, L = g.lvl;
    if (!L || !L.player) return;
    if (!pet || pet.type !== curType()) { if (!pet && curType() === 'none') return; P.init(g, false); pet = g.pet; if (!pet) return; }
    if (g.phaseName === 'intro' || g.phaseName === 'win') return;
    var def = pet.def, p = L.player, i;
    if (pet.say) { pet.say.t += dt; if (pet.say.t > pet.say.life) pet.say = null; }
    if (pet.mark) { pet.mark.t += dt; if (pet.mark.t > pet.mark.life) pet.mark = null; }
    if (!p.alive || g.phaseName === 'dead') return;

    var px = p.x + p.w / 2, face = p.facing || 1;
    /* teletransporte del jugador (escudo espectral, respawn interno…): la mascota se recoloca a su lado */
    if (pet.lastPx != null && (Math.abs(px - pet.lastPx) > 80 || Math.abs(p.y - pet.lastPy) > 160)) {
      P.init(g, true, true); pet = g.pet; if (!pet) return; def = pet.def;
    }
    pet.lastPx = px; pet.lastPy = p.y;
    var pg = (p.onGround && p.standing >= 0) ? p.standing : -1;
    if (pg >= 0) { if (pg === pet.pgPrev) pet.standT += dt; else { pet.standT = 0; pet.pgPrev = pg; } }
    else { pet.standT = 0; pet.pgPrev = -1; }
    if (def.fly && p.onGround && pet.standT > .6) pet.safeY = p.y + def.dy;

    /* adelantarse a ratos… salvo si hay peligro por delante */
    var thr = threat(L, px, face), back = Math.abs(def.dx), lead = 0;
    if (thr > SAFE) lead = def.lead * Math.max(0, Math.sin(g.t * .35 + pet.ph));
    var tx = px - face * back + face * lead;
    if (thr <= SAFE) tx = px - face * Math.max(back, 26);
    if (pet.guide > 0 && thr > SAFE) { pet.guide -= dt; tx = px + (pet.guideDir || face) * pet.guideLen; }
    pet.cd = Math.max(0, pet.cd - dt);

    if (def.fly) {
      if (pet.mode === 'fetch' && pet.fetch) {   // cuervo: va a por el orbe
        var o = pet.fetch;
        pet.x += (o.x - pet.x) * (1 - Math.exp(-6 * dt)); pet.y += (o.y - pet.y) * (1 - Math.exp(-6 * dt));
        pet.face = o.x > pet.x ? 1 : -1;
        if (o.got) { pet.mode = 'air'; pet.fetch = null; }
        else if (Math.hypot(o.x - pet.x, o.y - pet.y) < 16) {
          o.got = true; g.orbsGot++; EO.Audio.orb(); g.burst(o.x, o.y, 16, '#ffe9a8', 190); say(pet, '¡Toma!', 1.4);
          pet.mode = 'air'; pet.fetch = null;
        }
        return;
      }
      var ty = p.y + p.h / 2 + def.dy + Math.sin(g.t * 2 + pet.ph) * 4;
      if (def.fall === 0) ty = Math.min(ty, pet.safeY + 90);                 // no se tira al vacío
      else ty = Math.min(ty, L.world.h - 40);
      var k = 1 - Math.exp(-def.k * dt), ox = pet.x;
      pet.x += (tx - pet.x) * k; pet.y += (ty - pet.y) * k;
      if (Math.abs(pet.x - ox) > .05) pet.face = pet.x > ox ? 1 : -1;
      if (Math.hypot(px - pet.x, p.y - pet.y) > 700) { g.burst(pet.x, pet.y, 8, '#fff', 90); pet.x = tx; pet.y = ty; }
    } else {
      var pl = pet.plat >= 0 ? L.platforms[pet.plat] : null;
      if (pl && !G.platformActive(pl)) { pet.plat = -1; pl = null; pet.mode = 'fall'; pet.vy = 0; say(pet, '¡!', 1); }
      if (pet.mode === 'hop') {
        var h = pet.hop; h.t += dt; var s = Math.min(1, h.t / h.dur);
        pet.x = h.x0 + (h.x1 - h.x0) * s; pet.y = h.y0 + (h.y1 - h.y0) * s - h.h * 4 * s * (1 - s);
        pet.face = h.x1 > h.x0 ? 1 : -1;
        if (s >= 1) { pet.mode = 'ground'; pet.plat = h.plat; }
      } else if (pet.mode === 'fall') {
        var oy = pet.y; pet.vy += 2000 * dt; pet.y += pet.vy * dt;
        for (i = 0; i < L.platforms.length; i++) {
          var q = L.platforms[i];
          if (!G.platformActive(q) || pet.x < q.x || pet.x > q.x + q.w) continue;
          if (oy + def.r <= q.y + 4 && pet.y + def.r >= q.y) { pet.plat = i; pet.y = q.y - def.r; pet.mode = 'ground'; pet.vy = 0; break; }
        }
        if (pet.mode === 'fall' && pet.y > L.world.h + 120) pet.mode = 'lost';
      } else if (pet.mode === 'lost') {
        if (pg >= 0 && pet.standT > .5) startHop(g, pet, L, pg, tx, true);
      } else if (pl) {
        if (pg >= 0 && pg !== pet.plat && pet.standT > .45) startHop(g, pet, L, pg, tx, false);   // espera a que aterrices
        else {
          var goal = pg === pet.plat ? tx : clamp(px, pl.x, pl.x + pl.w);   // si estás en otra, espera en el borde
          goal = clamp(goal, pl.x + def.r + 3, pl.x + pl.w - def.r - 3);
          var v = clamp((goal - pet.x) * 6, -def.spd, def.spd);
          pet.x += v * dt + (pl.dx || 0); pet.y = pl.y - def.r;
          if (v > 6) pet.face = 1; else if (v < -6) pet.face = -1;
          if (pg < 0) { var e = clamp(px - pet.x, -1, 1); if (Math.abs(px - pet.x) > 40) pet.face = e; }
          if (p.vy < -300 && pet.wasGround && pg === pet.plat && Math.random() < .5 && pet.z === 0) pet.vz = 260;   // salta contigo
        }
      }
      if (pet.z > 0 || pet.vz > 0) { pet.vz -= 1500 * dt; pet.z = Math.max(0, pet.z + pet.vz * dt); if (pet.z === 0) pet.vz = 0; }
      pet.wasGround = p.onGround;
    }
    help(g, pet, L, p, px, face, thr);
  };

  /* --------------------------------------------------------------- AYUDAS */
  function help(g, pet, L, p, px, face, thr) {
    if (pet.helps >= MAXHELP || pet.cd > 0) return;
    var def = pet.def, t, o, ex, used = false, i;
    function done(txt) { pet.helps++; pet.cd = def.cd; say(pet, txt, 1.6); chirp(pet, .09); used = true; }
    switch (def.help) {
      case 'intuicion':
        t = nearestKind(L, px, face, ['popspike', 'thwomp', 'wall', 'shove'], 240, false);
        if (t) { t.tell = Math.max(t.tell || 0, .8); mark(pet, t.x + (t.w || 0) / 2, trapY(t, p.y), '!'); done('¡Miau!'); }
        break;
      case 'huecos':
        t = nearestKind(L, px, face, ['trapdoor', 'fakefloor'], 260, false);
        if (t) { t.tell = Math.max(t.tell || 0, .85); mark(pet, t.x + (t.w || 0) / 2, trapY(t, p.y), '!'); done('¡Croac!'); }
        break;
      case 'cebo':
        t = nearestKind(L, px, face, ['bait'], 230, false);
        if (t && !t.got) { t.got = true; g.burst(t.x + t.w / 2, t.sy - 92, 18, '#7cffd4', 160); done('¡Ñam!'); }
        break;
      case 'olfato':
        if ((g.idle || 0) > 2.5 || g.deaths >= 2) {
          for (i = 0; i < L.orbs.length; i++) {
            o = L.orbs[i]; if (!o.got && Math.hypot(o.x - px, o.y - p.y) < 520) { mark(pet, o.x, o.y - 30, '?'); done('¡Hmm!'); break; }
          }
        }
        break;
      case 'luz':
        if ((g.idle || 0) > 3 || g.deaths >= 2) {
          ex = null; for (i = 0; i < L.exits.length; i++) { if (L.exits[i].kind !== 'fake' && !L.exits[i].hidden) { ex = L.exits[i]; break; } }
          if (ex && thr > SAFE) {
            var dx = ex.x + ex.w / 2 - px; pet.guide = 4; pet.guideDir = dx < 0 ? -1 : 1; pet.guideLen = Math.min(190, Math.abs(dx));
            mark(pet, ex.x + ex.w / 2, ex.y - 20, '✦'); done('✦');
          }
        }
        break;
      case 'puertas':
        for (i = 0; i < L.exits.length; i++) {
          ex = L.exits[i];
          if (ex.kind === 'fake' && !ex.found && Math.hypot(px - ex.x, p.y - ex.y) < 280) {
            ex.found = true; mark(pet, ex.x + ex.w / 2, ex.y - 14, '✖'); g.burst(ex.x + ex.w / 2, ex.y + ex.h / 2, 18, '#8ef4ff', 200); done('✖'); break;
          }
        }
        break;
      case 'eco':
        var any = false, tr = L.traps || [];
        for (i = 0; i < tr.length; i++) if (typeof tr[i].x === 'number' && Math.abs(tr[i].x - px) < 380 && tr[i].k !== 'runaway') any = true;
        if (any) {
          for (i = 0; i < tr.length; i++) if (typeof tr[i].x === 'number' && Math.abs(tr[i].x - px) < 380) tr[i].tell = Math.max(tr[i].tell || 0, .9);
          g.rings.push({ x: pet.x, y: pet.y, r: 8, a: 1 }); done('))');
        }
        break;
      case 'robar':
        for (i = 0; i < L.orbs.length; i++) {
          o = L.orbs[i];
          if (!o.got && Math.hypot(o.x - px, o.y - p.y) < 330) { pet.mode = 'fetch'; pet.fetch = o; done('¡Cra!'); break; }
        }
        break;
      case 'memoria':
        if (g.deaths >= 3 && g.deaths > pet.lastHelpDeath && L.lastKiller && typeof L.lastKiller.x === 'number') {
          t = L.lastKiller; pet.lastHelpDeath = g.deaths; t.tell = 1;
          mark(pet, t.x + (t.w || 0) / 2, trapY(t, p.y), '!'); pet.helps++; pet.cd = def.cd; say(pet, 'Uuh…', 1.8); chirp(pet, .09);
        }
        break;
    }
    return used;
  }

  /* --------------------------------------------------------------- DIBUJO */
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  P.draw = function (ctx, g) {
    var pet = g.pet; if (!pet) return;
    var def = pet.def, t = g.t;
    if (pet.mark) {
      var m = pet.mark, a = Math.min(1, m.t * 4, (m.life - m.t) * 2) * (.7 + .3 * Math.sin(t * 12));
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.shadowColor = '#ffd24d'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffe28a'; ctx.fillText(m.txt, m.x, m.y - Math.sin(t * 5) * 4); ctx.restore();
    }
    EO.Shop.drawPet(ctx, pet.type, pet.x - pet.face * def.dx, pet.y - def.dy - pet.z, t, pet.face);
    if (pet.say) {
      var s = pet.say, al = Math.min(1, s.t * 6, (s.life - s.t) * 3);
      ctx.save(); ctx.globalAlpha = Math.max(0, al); ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      var w = ctx.measureText(s.txt).width + 12, bx = pet.x - w / 2, by = pet.y - def.r - 34 - s.t * 6;
      ctx.fillStyle = 'rgba(12,10,30,.88)'; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
      rr(ctx, bx, by, w, 18, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(s.txt, pet.x, by + 13); ctx.restore();
    }
  };

  /* ------------------------------------------------------------- ENGANCHES */
  var origUpdate = G.update;
  G.update = function (dt) {
    origUpdate.call(this, dt);
    try { P.update(this, dt); } catch (e) { if (window.console) console.warn('pets:', e); this.pet = null; }
  };
  var origLoad = G.loadLevel;
  G.loadLevel = function (num, showIntro, retry) {
    origLoad.call(this, num, showIntro, retry);
    try { P.init(this, false); } catch (e) { this.pet = null; }
  };
  var origRespawn = G.respawn;
  G.respawn = function () {
    origRespawn.call(this);
    try { P.init(this, true, true); } catch (e) { this.pet = null; }
  };
})(window.EO);
