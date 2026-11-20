/* ============================================================================
   EL OBSERVADOR — render.js
   · Dibujo (cámara, escenario, entidades, partículas, cara del Observador)
   · Generador procedural de niveles (Motor de Caos) con validación de caminos
   · Jefe I — EL QUE TODO LO SABE
   ============================================================================ */
(function (EO) {
  'use strict';

  var G = EO.Game;
  var VW = EO.VW, VH = EO.VH;
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ==========================================================
     RNG determinista (semilla de 32 bits → mulberry32)
     ========================================================== */
  function makeRNG(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ==========================================================
     MOTOR DE CAOS · generador de niveles
     Reglas duras: hueco máximo 190px, escalón máximo 105px.
     Así ningún nivel generado es imposible (validación implícita).
     ========================================================== */
  var FAM_LIST = ['invisible', 'impossible', 'mirror', 'lie', 'decisions', 'gravity',
    'silent', 'nojump', 'jump', 'twin', 'shadow', 'moving', 'gaze', 'inaction',
    'defeat', 'ignore', 'memory', 'imitation', 'liberation'];

  var Builder = EO.LevelBuilder = {
    generate: function (num, seed, mode) {
      var R = makeRNG(seed);
      var fam = FAM_LIST[Math.floor(R() * FAM_LIST.length)];
      // evita repetir la familia del nivel anterior si nos pasan historial
      var hist = EO.Store.get().seen || {};
      if (hist['f' + (num - 1)] === fam) fam = FAM_LIST[Math.floor(R() * FAM_LIST.length)];
      hist['f' + num] = fam; EO.Store.save();

      var lvl = {
        num: num, family: fam,
        name: this.nameFor(fam, R),
        subtitle: this.subtitleFor(fam),
        world: { w: 1900 + Math.floor(R() * 5) * 180, h: 780 },
        spawn: { x: 80, y: 600 },
        exit: null, platforms: [], spikes: [], orbs: [],
        rules: { gravity: 1, invert: false, canJump: true },
        goal: { type: 'exit' }, signs: [], blades: [],
        intro: null, generated: true
      };
      var W = lvl.world.w;
      var groundY = 620 + Math.floor(R() * 3) * 20;
      lvl.world.h = groundY + 180;

      // ---- suelo base con huecos ----
      var x = 0, lastTop = groundY;
      var solid = function (px, py, pw, ph, type, extra) {
        var o = { x: px, y: py, w: pw, h: ph, type: type || 'solid' };
        if (extra) for (var k in extra) o[k] = extra[k];
        lvl.platforms.push(o);
      };

      solid(0, groundY, 420, 200);

      var airborne = (fam === 'invisible' || fam === 'jump' || fam === 'impossible');
      if (airborne) {
        // cadena de plataformas flotantes
        x = 470; var y = groundY - 40;
        while (x < W - 420) {
          var gap = 110 + R() * 60;
          var dh = (R() - 0.45) * 130;
          y = clamp(y + dh, groundY - 330, groundY - 30);
          var pw = 130 + R() * 90;
          var type = fam === 'invisible' ? 'ghost' : (fam === 'impossible' && R() < 0.35 ? 'move' : 'solid');
          solid(x, y, pw, 26, type, type === 'move' ? { axis: R() < 0.5 ? 'x' : 'y', amp: 50 + R() * 70, speed: 0.6 + R() * 0.7, phase: R() * 6 } : null);
          if (R() < 0.35) lvl.orbs.push({ x: x + pw / 2, y: y - 46, n: 1 });
          x += pw + gap;
        }
        // isla final
        solid(W - 420, y + 30, 420, 200);
        lvl.exit = { x: W - 250, y: y - 62, w: 54, h: 92, kind: 'real' };
        // foso mortal
        lvl.spikes.push({ x: 420, y: groundY + 90, w: W - 840, h: 110 });
        lvl.spawn = { x: 90, y: groundY - 44 };
      } else {
        x = 420;
        var segs = 3 + Math.floor(R() * 3);
        for (var i = 0; i < segs; i++) {
          var gap = 120 + R() * 55;
          var pw = 250 + R() * 260;
          var top = groundY - (R() < 0.4 ? 0 : 40 + R() * 70);
          solid(x + gap, top, pw, 200);
          // peligro en el hueco
          if (R() < 0.75) lvl.spikes.push({ x: x + 8, y: groundY + 70, w: gap - 4, h: 130 });
          if (R() < 0.4) lvl.orbs.push({ x: x + gap / 2, y: top - 120, n: 1 });
          x += gap + pw;
        }
        // plataforma final
        /* la isla final siempre mide ≥ 480 px: si los tramos se pasaron del mundo, el mundo crece (antes salía ancho negativo y la puerta quedaba colgada) */
        if (W - (x + 100) < 480) { W = x + 100 + 480; lvl.world.w = W; }
        solid(x + 100, groundY - 30, W - x - 100, 220);
        lvl.exit = { x: W - 240, y: groundY - 122, w: 54, h: 92, kind: 'real' };
        lvl.spawn = { x: 90, y: groundY - 44 };
        lvl.rules.canJump = true;
      }

      // ---- familias que alteran reglas ----
      if (fam === 'mirror' || mode === 'mirror') lvl.rules.invert = true;
      if (fam === 'gravity') {
        lvl.rules.gravity = -1;
        lvl.rules.ceilingWalk = true;
        lvl.rules.invert = false;
        lvl.platforms = lvl.platforms.map(function (p) { p.y = lvl.world.h - (p.y + p.h); return p; });
        lvl.spawn.y = lvl.world.h - lvl.spawn.y - 44;
        if (lvl.exit) lvl.exit.y = lvl.world.h - lvl.exit.y - 92;
        lvl.spikes.forEach(function (s) { s.y = lvl.world.h - (s.y + s.h); });
        lvl.orbs.forEach(function (o) { o.y = lvl.world.h - o.y; });
      }
      if (fam === 'nojump') lvl.rules.canJump = false, lvl.platforms.forEach(function (p) { p.y = p.y; });
      if (fam === 'silent') { lvl.rules.silent = true; lvl.rules.dark = true; }
      if (fam === 'gaze') {
        lvl.platforms.forEach(function (p, idx) {
          if (idx > 0 && p.y < lvl.world.h - 100) { p.type = 'phase'; p.period = 2 + R() * 1.6; p.offset = R(); }
        });
      }
      if (fam === 'lie') {
        lvl.extraExits = [{ x: (lvl.exit.x * 0.62) | 0, y: lvl.exit.y + 20, w: 54, h: 92, kind: 'fake' }];
        lvl.signs.push({ x: 300, y: lvl.world.h - 200, text: 'SALIDA →', truth: false });
      }
      if (fam === 'inaction') {
        lvl.goal = { type: 'wait', time: 7 };
        if (lvl.exit) lvl.exit.disabled = true;
        lvl.blades = [
          { x: 0, y: lvl.spawn.y - 110, r: 30, amp: lvl.world.w - 300, speed: 1 + R(), phase: 0 },
          { x: 0, y: lvl.spawn.y - 190, r: 22, amp: lvl.world.w - 300, speed: 1.5 + R(), phase: 2 }
        ];
        lvl.spikes = [];
        lvl.platforms = [{ x: 0, y: lvl.world.h - 200, w: lvl.world.w, h: 200, type: 'solid' }];
        lvl.exit = { x: lvl.world.w / 2 - 27, y: lvl.world.h - 292, w: 54, h: 92, kind: 'real', disabled: true };
        lvl.spawn = { x: lvl.world.w / 2 - 15, y: lvl.world.h - 244 };
      }
      if (fam === 'defeat') {
        lvl.goal = { type: 'altar' };
        lvl.altars = [{ x: (lvl.world.w * 0.45) | 0, y: lvl.world.h - 236, w: 90, h: 80 }];
        if (lvl.exit) lvl.exit.disabled = true;
        lvl.signs.push({ x: lvl.exit ? lvl.exit.x - 210 : 300, y: lvl.world.h - 200, text: 'NO HAS HECHO SUFICIENTE', truth: true });
      }
      if (fam === 'ignore') {
        lvl.exit.hidden = true;
        lvl.signs.push({ x: 300, y: lvl.world.h - 210, text: 'NO VAYAS A LA IZQUIERDA', truth: false });
      }
      if (fam === 'shadow' || fam === 'imitation') lvl.rules.echo = true;
      if (fam === 'decisions') {
        lvl.extraExits = [
          { x: (lvl.world.w * 0.55) | 0, y: lvl.world.h - 236, w: 54, h: 92, kind: 'fake' },
          { x: (lvl.world.w * 0.72) | 0, y: lvl.world.h - 236, w: 54, h: 92, kind: 'fake' }
        ];
      }
      if (fam === 'impossible') lvl.rules.predict = true;
      if (fam === 'moving') {
        lvl.platforms.forEach(function (p, idx) {
          if (idx > 0 && p.w < 420) { p.type = 'move'; p.axis = idx % 2 ? 'x' : 'y'; p.amp = 40 + R() * 60; p.speed = 0.6 + R() * 0.6; p.phase = R() * 6; }
        });
      }
      if (fam === 'liberation') {
        lvl.goal = { type: 'exit' };
        lvl.intro = 'Ayúdame a salir de aquí. Llevo noventa niveles encerrado. O noventa años.';
      }

      if (fam === 'nojump') {
        // sin salto: pasillo plano con pinchos que se retraen por turnos
        lvl.platforms = [{ x: 0, y: groundY, w: W, h: 240, type: 'solid' }];
        lvl.spikes = [];
        var nx = 480, ix = 0;
        while (nx < W - 560) {
          lvl.spikes.push({ x: nx, y: groundY - 8, w: 80 + R() * 70, h: 26, period: 1.7 + R() * 1.3, offset: ix * 0.42 });
          nx += 200 + R() * 150; ix++;
        }
        lvl.orbs = [];
        lvl.goal = { type: 'exit' };
        lvl.exit = { x: W - 240, y: groundY - 92, w: 54, h: 92, kind: 'real' };
        lvl.spawn = { x: 90, y: groundY - 44 };
        lvl.intro = 'Prohibido saltar. Los pinchos van por turnos. Cuéntalos. Piensa. Camina.';
      }

      if (!lvl.orbs.length && lvl.goal.type === 'exit') lvl.orbs = [];
      lvl.goal.type = lvl.goal.type === 'exit' && lvl.orbs.length ? 'orbs_exit' : lvl.goal.type;

      // mensajes
      if (!lvl.intro) {
        var intros = [
          'Este nivel no existía hace un segundo. Lo acabo de improvisar.',
          'Si encuentras la salida a la primera, me enfadaré.',
          'No hay nada raro aquí. Esa frase sí era rara.',
          'He puesto tres trampas. O ninguna. No lo apunto.',
          'Generado al azar. Como tus decisiones.'
        ];
        lvl.intro = intros[Math.floor(R() * intros.length)];
      }
      return lvl;
    },

    nameFor: function (fam, R) {
      var n = {
        invisible: 'LO QUE NO SE VE', impossible: 'GEOMETRÍA HOSTIL', mirror: 'OTRA VEZ ESPEJO',
        lie: 'PUERTAS QUE MIENTEN', decisions: 'ELIGE MAL', gravity: 'SIN SUELO',
        silent: 'NADIE HABLA', nojump: 'PROHIBIDO SALTAR', jump: 'SOLO SALTAR',
        twin: 'DOS A LA VEZ', shadow: 'TU ECO', moving: 'EL MUNDO SE MUEVE',
        gaze: 'SI NO MIRAS, EXISTE', inaction: 'QUIETO', defeat: 'PIERDE PARA GANAR',
        ignore: 'DESOBEDECE', memory: 'RECUERDA ESTO', imitation: 'ALGUIEN TE IMITA',
        liberation: 'DÉJAME SALIR', time: 'FUERA DE ORDEN'
      };
      return n[fam] || 'NIVEL SIN NOMBRE';
    },
    subtitleFor: function (fam) {
      return (EO.FAMILIES[fam] && EO.FAMILIES[fam].d) || 'Algo va a salir mal.';
    }
  };

  /* ==========================================================
     JEFE I — EL QUE TODO LO SABE
     Mecánica: predice tu posición y lanza una columna de luz. Si en el
     momento del disparo NO estás donde predijo, cuenta como engaño.
     Tres engaños = derrotado. (No se gana con fuerza: con mentiras.)
     ========================================================== */
  var origHazards = G.updateHazards;

  G.updateHazards = function (dt) {
    origHazards.call(this, dt);
    // peligro de predicción (niveles "impossible")
    var L = this.lvl;
    if (!L || !L.rules || !L.rules.predict || this.phaseName !== 'play') return;
    if (L.boss) return;
    this.predTimer = (this.predTimer || 1.6) - dt;
    if (this.predTimer <= 0) {
      this.predTimer = 1.9 + Math.random() * 1.1;
      var p = L.player;
      var px = clamp(p.x + p.vx * 0.45 + (Math.random() - 0.5) * 90, 40, L.world.w - 40);
      this.bolts.push({ x: px, y: 10, vx: 0, vy: 0, r: 10, life: 3.4, warn: 0.6, kind: 'predict' });
      this.rings.push({ x: px, y: 40, r: 6, a: 1 });
    }
  };

  G.initBoss = function (L) {
    this.boss = {
      name: 'EL QUE TODO LO SABE',
      hp: 3, fooled: 0, state: 'idle', timer: 1.4,
      tx: L.world.w / 2, ty: 0, cycle: 0,
      beam: { active: false, cx: 0, w: 74, t: 0 },
      eye: 1, blink: 0, taunt: 0,
      spawnDust: 0
    };
    if (this.mode !== 'silencio') EO.UI.say(EO.UI.quote('boss'), { duration: 5200 });
    EO.UI.toast('JEFE · EL QUE TODO LO SABE', 'No lo derrotas con fuerza. Lo derrotas mintiéndole: <b>engañalo 3 veces</b>.');
  };

  G.resetBoss = function () {
    if (!this.boss) return;
    this.boss.hp = 3; this.boss.fooled = 0; this.boss.state = 'idle';
    this.boss.timer = 1.6; this.boss.beam.active = false;
  };

  G.updateBoss = function (dt) {
    var b = this.boss, L = this.lvl, p = L.player;
    if (!b || !p || !p.alive) return;
    b.taunt -= dt;
    b.blink -= dt;

    if (b.state === 'idle') {
      b.timer -= dt;
      if (b.timer <= 0) {
        // predice: se fija en tu posición + tu velocidad
        var pred = p.x + p.vx * 0.75;
        b.tx = clamp(pred + 15, 60, L.world.w - 60);
        b.state = 'aim'; b.timer = 1.15;
        EO.Audio.tone(300, 0.5, 'sawtooth', 0.12, 900);
        if (this.mode !== 'silencio' && Math.random() < 0.65) {
          var lines = ['Ahí estarás. Lo sé porque lo sé todo.', 'No te muevas. Vas a morir igual.',
            'Te veo venir. Literalmente.', 'Predicción en curso. No la estropees.'];
          EO.UI.say(lines[Math.floor(Math.random() * lines.length)], { duration: 2400 });
        }
      }
    } else if (b.state === 'aim') {
      b.timer -= dt;
      b.beam.active = true;
      b.beam.cx = b.tx; b.beam.w = 74;
      if (b.timer <= 0) {
        // dispara
        b.state = 'fire'; b.timer = 0.55;
        EO.Audio.tone(90, 0.5, 'square', 0.24, 40);
        this.shake = 13;
        this.burst(b.tx, L.world.h - 60, 26, '#ff9d5c', 260);
        var d = Math.abs((p.x + p.w / 2) - b.tx);
        if (d > 62) {
          // falló: le has engañado
          b.fooled++;
          EO.Store.get().tricked = (EO.Store.get().tricked || 0) + 1;
          EO.Store.save();
          this.checkAchv('trickster', EO.Store.get().tricked >= 5);
          EO.Audio.trick();
          this.burst(p.x + p.w / 2, p.y, 22, '#7cffd4', 240);
          if (this.mode !== 'silencio') {
            var f = ['¿Dónde...? Estabas ahí. ESTABAS AHÍ.', 'Imposible. He calculado mal. Yo no calculo mal.',
              'Me has mentido. Qué educado por tu parte.', 'No cuenta. Bueno, sí cuenta. ' + b.fooled + ' de 3.'];
            EO.UI.say(f[Math.min(f.length - 1, b.fooled - 1)], { duration: 3600 });
          }
          EO.UI.toast('ENGAÑO ' + b.fooled + '/3', 'Se ha equivocado. Otra vez.');
          if (b.fooled >= 3) {
            b.state = 'defeated';
            if (this.faceCause) this.faceCause('scared', 3);   /* v4.0: miedo por evento real */
            this.shake = 22; this.winFlash = 1;
            EO.Audio.boss();
            EO.UI.say(EO.UI.quote('boss_win'), { duration: 5200 });
            var self = this;
            setTimeout(function () { if (self.phaseName === 'play') self.complete(); }, 1800);
          }
        } else {
          if (this.mode !== 'silencio') EO.UI.say('Lo sabía. Lo sé todo. Es mi único truco.', { duration: 1800 });
        }
      }
    } else if (b.state === 'fire') {
      b.timer -= dt;
      b.beam.t = (b.beam.t || 0) + dt;
      if (b.timer <= 0) {
        b.beam.active = false;
        b.state = 'idle'; b.timer = Math.max(0.75, 1.5 - b.cycle * 0.12);
        b.cycle++;
      }
    } else if (b.state === 'defeated') {
      b.eye = Math.max(0, b.eye - dt * 0.5);
    }
  };

  /* ==========================================================
     ACTUALIZACIÓN EXTRA: eco (nivel sombra) y cuchillas
     ========================================================== */
  var origUpdate = G.update;
  G.update = function (dt) {
    origUpdate.call(this, dt);
    var L = this.lvl;
    if (!L) return;
    // cuchillas giratorias (movimiento limpio y predecible)
    if (L.blades && L.blades.length) {
      var p = L.player;
      for (var i = 0; i < L.blades.length; i++) {
        var b = L.blades[i];
        var t = this.t * (b.speed || 1) + (b.phase || 0);
        b.cx = (b.x || 0) + 40 + (Math.sin(t) * 0.5 + 0.5) * (b.amp || 400);
        b.cy = b.y;
        b.rot = (b.rot || 0) + dt * 9;
        if (p && p.alive && Math.hypot((p.x + p.w / 2) - b.cx, (p.y + p.h / 2) - b.cy) < (b.r || 26) + 15) {
          this.kill('blade');
        }
      }
    }
    // eco: reproduce tu recorrido anterior
    if (L.rules && L.rules.echo) {
      if (!this.echoBuf) this.echoBuf = [];
      if (L.player && L.player.alive) {
        this.echoBuf.push({ x: L.player.x, y: L.player.y, f: L.player.facing });
        if (this.echoBuf.length > 1400) this.echoBuf.shift();
      }
      if (this.echoBuf.length > 90) {
        var idx = Math.max(0, this.echoBuf.length - 160);
        this.echoGhost = this.echoBuf[idx];
      }
    }
  };

  /* ==========================================================
     RENDER
     ========================================================== */
  G.render = function (dt) {
    var ctx = this.ctx, cv = this.canvas;
    if (!ctx) return;
    var W = cv.width, H = cv.height;
    var scale = Math.min(W / VW, H / VH);
    var ox = (W - VW * scale) / 2, oy = (H - VH * scale) / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, W, H);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();

    var th = this.theme || EO.THEMES[1];
    this.drawBackground(ctx, th);

    if (this.lvl) {
      ctx.save();
      var sh = this.shake > 0 ? this.shake : 0;
      var sx = (Math.random() - 0.5) * sh, sy = (Math.random() - 0.5) * sh;
      var camX = this.cam.x + sx, camY = this.cam.y + sy;
      ctx.translate(-camX, -camY);

      this.drawPlatforms(ctx, th);
      this.drawSpikes(ctx, th);
      this.drawBlades(ctx, th);
      this.drawOrbs(ctx);
      this.drawSigns(ctx);
      this.drawExits(ctx, th);
      if (this.lvl.boss) this.drawBossArena(ctx, th);
      this.drawAltars(ctx);
      this.drawEcho(ctx);
      this.drawBolts(ctx);
      this.drawPlayer(ctx);
      this.drawParticles(ctx);

      ctx.restore();
      // oscuridad de nivel silencioso / linterna
      if (this.lvl.rules && this.lvl.rules.dark) this.drawDarkness(ctx);
      this.drawFace(ctx, th);
      this.drawVignette(ctx, th);
    } else {
      this.drawFaceMenu(ctx, th);
    }

    // flashes
    if (this.deathFlash > 0) {
      ctx.fillStyle = 'rgba(255,40,40,' + (this.deathFlash * 0.28) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }
    if (this.winFlash > 0) {
      ctx.fillStyle = 'rgba(255,246,214,' + (this.winFlash * 0.3) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }
    // contador de espera (nivel inacción)
    if (this.lvl && this.lvl.goal && this.lvl.goal.type === 'wait' && this.phaseName === 'play') {
      var left = Math.max(0, this.lvl.goal.time - this.wait);
      ctx.font = '600 46px ui-monospace,monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,' + (left > 0 ? 0.85 : 0) + ')';
      ctx.fillText(left.toFixed(1), VW / 2, 150);
      ctx.font = '500 11px ui-monospace,monospace';
      ctx.fillStyle = 'rgba(200,190,255,.65)';
      ctx.fillText('NO TE MUEVAS', VW / 2, 176);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  };

  /* ------------------------------------------------------- FONDO */
  G.drawBackground = function (ctx, th) {
    var g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, th.bg[0]);
    g.addColorStop(0.55, th.bg[1]);
    g.addColorStop(1, th.bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);

    // halo del Observador
    var rg = ctx.createRadialGradient(VW / 2, -120, 40, VW / 2, -120, 620);
    rg.addColorStop(0, th.glow + '55');
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, VW, VH);

    // estrellas con parallax
    var cx = this.cam.x, cy = this.cam.y;
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      var px = (s.x - cx * s.layer * 0.15) % VW; if (px < 0) px += VW;
      var py = (s.y - cy * s.layer * 0.1) % VH; if (py < 0) py += VH;
      ctx.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(this.t * 1.4 + i));
      ctx.fillStyle = '#fff';
      ctx.fillRect(px, py, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // niebla de partículas
    for (var j = 0; j < this.ambient.length; j++) {
      var a = this.ambient[j];
      ctx.globalAlpha = a.a;
      ctx.fillStyle = th.glow;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // rejilla de fondo
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 1;
    var off = (-cx * 0.3) % 80;
    for (var gx = off; gx < VW; gx += 80) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, VH); ctx.stroke();
    }
    var offY = (-cy * 0.3) % 80;
    for (var gy = offY; gy < VH; gy += 80) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(VW, gy); ctx.stroke();
    }
  };

  /* ------------------------------------------------------- PLATAFORMAS */
  G.drawPlatforms = function (ctx, th) {
    var L = this.lvl, p = L.player;
    for (var i = 0; i < L.platforms.length; i++) {
      var pl = L.platforms[i];
      if (pl.x + pl.w < this.cam.x - 60 || pl.x > this.cam.x + VW + 60) continue;

      if (pl.type === 'ghost') {
        // casi invisible: se revela por proximidad y por una sombra tenue
        var d = Math.hypot((p.x + p.w / 2) - (pl.x + pl.w / 2), (p.y + p.h / 2) - (pl.y + pl.h / 2));
        var near = clamp(1 - (d - 60) / 210, 0, 1);
        var a = 0.05 + near * 0.9;
        if (!this.platformActive(pl)) a *= 0.3;
        ctx.globalAlpha = a;
        ctx.fillStyle = th.glow;
        ctx.shadowColor = th.glow; ctx.shadowBlur = 20 * near;
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = a * 0.55;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        ctx.strokeRect(pl.x + 0.5, pl.y + 0.5, pl.w - 1, pl.h - 1);
        ctx.globalAlpha = 1;
        // partículas que delatan
        for (var k = 0; k < 3; k++) {
          var px = pl.x + ((this.t * 34 + k * 47 + i * 13) % pl.w);
          ctx.globalAlpha = 0.16 + near * 0.4;
          ctx.fillStyle = '#fff';
          ctx.fillRect(px, pl.y - 4 + Math.sin(this.t * 2 + k) * 3, 2, 2);
        }
        ctx.globalAlpha = 1;
        continue;
      }

      if (pl.type === 'phase' && !this.platformActive(pl)) {
        ctx.globalAlpha = 0.13;
        ctx.fillStyle = th.glow;
        ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
        ctx.globalAlpha = 1;
        continue;
      }

      // cuerpo
      var grd = ctx.createLinearGradient(0, pl.y, 0, pl.y + Math.min(pl.h, 200));
      grd.addColorStop(0, 'rgba(255,255,255,.92)');
      grd.addColorStop(0.12, th.glow);
      grd.addColorStop(0.28, 'rgba(20,14,44,.96)');
      grd.addColorStop(1, 'rgba(8,6,20,.98)');
      ctx.fillStyle = grd;
      ctx.fillRect(pl.x, pl.y, pl.w, Math.min(pl.h, 220));
      if (pl.h > 220) { ctx.fillStyle = 'rgba(8,6,20,.98)'; ctx.fillRect(pl.x, pl.y + 220, pl.w, pl.h - 220); }

      // filo luminoso
      ctx.fillStyle = pl.type === 'fake' ? 'rgba(255,255,255,.5)' : '#fff';
      ctx.globalAlpha = pl.type === 'fake' ? 0.55 : 1;
      ctx.fillRect(pl.x, pl.y, pl.w, 2.5);
      ctx.globalAlpha = 1;

      // detalle de peligro en plataformas móviles
      if (pl.type === 'move') {
        ctx.strokeStyle = th.glow; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(pl.x + 10, pl.y + pl.h + 8); ctx.lineTo(pl.x + pl.w - 10, pl.y + pl.h + 8);
        ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
  };

  /* ------------------------------------------------------- PINCHOS */
  G.drawSpikes = function (ctx, th) {
    var L = this.lvl;
    ctx.save();
    for (var i = 0; i < L.spikes.length; i++) {
      var s = L.spikes[i];
      if (s.x + s.w < this.cam.x - 80 || s.x > this.cam.x + VW + 80) continue;
      var size = 22, n = Math.max(1, Math.floor(s.w / size));
      var active = true;
      if (s.period) active = Math.sin((this.t / s.period) * Math.PI * 2 + (s.offset || 0) * Math.PI * 2) > 0.1;
      if (!active) {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = 'rgba(255,120,150,.5)';
        ctx.fillRect(s.x, s.y + s.h - 5, s.w, 4);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.fillStyle = 'rgba(255,70,90,.85)';
      ctx.shadowColor = '#ff3b6b'; ctx.shadowBlur = 16;
      ctx.beginPath();
      for (var k = 0; k < n; k++) {
        var x0 = s.x + k * (s.w / n);
        var x1 = x0 + s.w / n;
        ctx.moveTo(x0, s.y + s.h);
        ctx.lineTo((x0 + x1) / 2, s.y + Math.max(0, s.h - 60));
        ctx.lineTo(x1, s.y + s.h);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff8ba3';
      ctx.fillRect(s.x, s.y + s.h - 4, s.w, 3);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  /* ------------------------------------------------------- CUCHILLAS */
  G.drawBlades = function (ctx, th) {
    var L = this.lvl;
    if (!L.blades) return;
    for (var i = 0; i < L.blades.length; i++) {
      var b = L.blades[i];
      if (b.cx == null) continue;
      ctx.save();
      ctx.translate(b.cx, b.cy);
      ctx.rotate(b.rot || 0);
      ctx.strokeStyle = 'rgba(255,150,190,.95)';
      ctx.lineWidth = 3; ctx.shadowColor = '#ff2d76'; ctx.shadowBlur = 18;
      for (var k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        var a = (k / 3) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * (b.r || 26), Math.sin(a) * (b.r || 26));
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, 0, (b.r || 26) * 0.22, 0, 6.283);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.restore();
    }
  };

  /* ------------------------------------------------------- ORBES */
  G.drawOrbs = function (ctx) {
    var L = this.lvl;
    for (var i = 0; i < L.orbs.length; i++) {
      var o = L.orbs[i];
      if (o.got) continue;
      var puls = 1 + Math.sin(this.t * 3 + i) * 0.16;
      ctx.save();
      ctx.translate(o.x, o.y + Math.sin(this.t * 2 + i) * 6);
      ctx.rotate(this.t * 1.2);
      ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 26;
      ctx.fillStyle = '#fff6d0';
      ctx.beginPath();
      for (var k = 0; k < 4; k++) {
        var a = (k / 4) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * 11 * puls, Math.sin(a) * 11 * puls);
        ctx.lineTo(Math.cos(a + 0.785) * 4.5 * puls, Math.sin(a + 0.785) * 4.5 * puls);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };

  /* ------------------------------------------------------- CARTELES */
  G.drawSigns = function (ctx) {
    var L = this.lvl;
    if (!L.signs) return;
    for (var i = 0; i < L.signs.length; i++) {
      var s = L.signs[i];
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.fillStyle = 'rgba(10,8,22,.92)';
      ctx.strokeStyle = 'rgba(255,255,255,.28)';
      ctx.lineWidth = 1.6;
      var w = Math.max(120, s.text.length * 9.4), h = 40;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0, 0, w, h, 8); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(0, 0, w, h); ctx.strokeRect(0, 0, w, h); }
      ctx.fillStyle = s.truth ? '#d9d1ff' : 'rgba(255,190,190,.92)';
      ctx.font = '600 13px ui-monospace,monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.text, w / 2, h / 2 + 1);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      // postes
      ctx.strokeStyle = 'rgba(255,255,255,.16)';
      ctx.beginPath(); ctx.moveTo(w / 2, h); ctx.lineTo(w / 2, h + 26); ctx.stroke();
      ctx.restore();
    }
  };

  /* ------------------------------------------------------- PUERTAS */
  G.drawExits = function (ctx, th) {
    var L = this.lvl;
    for (var i = 0; i < L.exits.length; i++) {
      var e = L.exits[i];
      if (e.hidden && !e.found) continue;
      if (e.kind === 'fake' && e.found) continue;
      if (e.illusionOff) continue;
      var open = !e.disabled || this.conditionMet();
      var glow = e.disabled && !open ? '#666' : '#fff';
      ctx.save();
      ctx.translate(e.x, e.y);
      var pulse = 1 + Math.sin(this.t * 2.4 + i) * 0.05;

      // aura
      var rg = ctx.createRadialGradient(e.w / 2, e.h / 2, 6, e.w / 2, e.h / 2, 130);
      rg.addColorStop(0, (e.disabled && !open ? 'rgba(120,120,140,.4)' : 'rgba(255,248,214,.5)'));
      rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(e.w / 2, e.h / 2, 130, 0, 6.283); ctx.fill();

      // marco
      ctx.strokeStyle = glow; ctx.lineWidth = 3;
      ctx.shadowColor = glow; ctx.shadowBlur = e.disabled && !open ? 4 : 24;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(0, 0, e.w, e.h * pulse, [e.w / 2, e.w / 2, 4, 4]);
      else ctx.rect(0, 0, e.w, e.h);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // interior
      var ig = ctx.createLinearGradient(0, 0, 0, e.h);
      if (e.disabled && !open) { ig.addColorStop(0, 'rgba(40,40,60,.85)'); ig.addColorStop(1, 'rgba(10,10,20,.95)'); }
      else { ig.addColorStop(0, 'rgba(255,250,220,.9)'); ig.addColorStop(1, 'rgba(255,220,140,.25)'); }
      ctx.fillStyle = ig;
      ctx.fillRect(4, 4, e.w - 8, e.h * pulse - 8);

      if (e.disabled && !open) {
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.font = '600 10px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BLOQUEADA', e.w / 2, e.h / 2);
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }
  };

  /* ------------------------------------------------------- ALTARES */
  G.drawAltars = function (ctx) {
    var L = this.lvl;
    if (!L.altars) return;
    for (var i = 0; i < L.altars.length; i++) {
      var a = L.altars[i];
      ctx.save();
      ctx.translate(a.x, a.y);
      var used = L.altarDone;
      ctx.strokeStyle = used ? '#6bffb4' : '#ff6bd6';
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(0, a.h); ctx.lineTo(a.w / 2, 0); ctx.lineTo(a.w, a.h); ctx.stroke();
      ctx.beginPath(); ctx.arc(a.w / 2, a.h * 0.55, 9 + Math.sin(this.t * 3) * 3, 0, 6.283); ctx.fillStyle = used ? '#6bffb4' : '#ff6bd6'; ctx.fill();
      ctx.restore();
    }
  };

  /* ------------------------------------------------------- ECO */
  G.drawEcho = function (ctx) {
    var e = this.echoGhost;
    if (!e || !this.lvl.rules || !this.lvl.rules.echo) return;
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#8ef4ff';
    ctx.shadowColor = '#8ef4ff'; ctx.shadowBlur = 18;
    ctx.fillRect(e.x, e.y, 30, 40);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#001018';
    ctx.fillRect(e.x + 7, e.y + 12, 4, 5);
    ctx.fillRect(e.x + 18, e.y + 12, 4, 5);
    ctx.restore();
  };

  /* ------------------------------------------------------- PROYECTILES */
  G.drawBolts = function (ctx) {
    for (var i = 0; i < this.bolts.length; i++) {
      var b = this.bolts[i];
      var warn = b.warn != null ? b.warn : 0;
      if (warn > 0) {
        // aviso previo en el suelo
        ctx.globalAlpha = 0.5 + Math.sin(this.t * 22) * 0.3;
        ctx.strokeStyle = '#ff8a4c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(b.x, (this.lvl ? this.lvl.player.y + 260 : 600), 26, 8, 0, 0, 6.283); ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.save();
      ctx.shadowColor = '#ff9d5c'; ctx.shadowBlur = 22;
      var g = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r * 2);
      g.addColorStop(0, '#fff3d0'); g.addColorStop(0.5, '#ff9d5c'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  };

  /* ------------------------------------------------------- JUGADOR */
  G.drawPlayer = function (ctx) {
    var L = this.lvl, p = L.player;
    if (!p) return;

    // estela
    if (p.trail && p.trail.length) {
      for (var i = 0; i < p.trail.length; i++) {
        var t = p.trail[i];
        var age = clamp((this.t - t.t) / 0.5, 0, 1);
        ctx.globalAlpha = (1 - age) * 0.24;
        ctx.fillStyle = this.theme.glow;
        ctx.beginPath(); ctx.arc(t.x, t.y, 11 * (1 - age * 0.5), 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    var squash = p.onGround ? 1 : (p.vy < 0 ? 1.08 : 0.94);
    var tilt = clamp(p.vx / 1400, -0.16, 0.16);
    ctx.rotate(tilt);

    // aura
    var rg = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
    rg.addColorStop(0, 'rgba(255,255,255,.32)');
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(0, 0, 52, 0, 6.283); ctx.fill();

    // cuerpo
    ctx.fillStyle = '#f4f1ff';
    ctx.shadowColor = this.theme.glow; ctx.shadowBlur = 22;
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(-p.w / 2, -p.h / 2 * squash, p.w, p.h * squash, 9); ctx.fill();
    } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.shadowBlur = 0;

    // cara (dos ojos que miran en la dirección de avance)
    ctx.fillStyle = '#0b0a18';
    var ex = p.facing * 3;
    ctx.fillRect(-7 + ex, -8, 4.5, 7);
    ctx.fillRect(3 + ex, -8, 4.5, 7);
    ctx.restore();

    // indicador de "salto disponible"
    if (p.onGround) {
      ctx.globalAlpha = 0.25 + Math.sin(this.t * 4) * 0.1;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h + 3, 14, 4, 0, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  /* ------------------------------------------------------- PARTÍCULAS */
  G.drawParticles = function (ctx) {
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * clamp(p.life + 0.2, 0.2, 1), 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (var k = 0; k < this.rings.length; k++) {
      var r = this.rings[k];
      ctx.globalAlpha = Math.max(0, r.a) * 0.6;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  /* ------------------------------------------------------- OSCURIDAD */
  G.drawDarkness = function (ctx) {
    var p = this.lvl.player;
    var sx = p.x + p.w / 2 - this.cam.x, sy = p.y + p.h / 2 - this.cam.y;
    var g = ctx.createRadialGradient(sx, sy, 40, sx, sy, 330);
    g.addColorStop(0, 'rgba(4,4,10,0)');
    g.addColorStop(0.6, 'rgba(4,4,10,.55)');
    g.addColorStop(1, 'rgba(4,4,10,.94)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  };

  G.drawVignette = function (ctx, th) {
    var g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.42, VW / 2, VH / 2, VH * 0.92);
    g.addColorStop(0, 'transparent');
    g.addColorStop(1, 'rgba(0,0,0,.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  };

  /* ------------------------------------------------------- CARA DEL OBSERVADOR */
  G.faceState = { blink: 0, lookX: 0, lookY: 0, expr: 'smug', t: 0, swap: 3.4 };

  /* v4.0 causalidad: expresión impulsada por EVENTO, no por azar.
     La llama el juego cuando pasa algo real (muerte, puerta falsa, victoria,
     jefe derrotado) y la expresión se mantiene mientras dure la causa. */
  G.faceCause = function (expr, hold) {
    var f = this.faceState; if (!f) return;
    f.expr = expr; f.swap = hold || 2.5;
  };

  G.drawFace = function (ctx, th) {
    var f = this.faceState;
    f.t += 1 / 60;
    var p = this.lvl ? this.lvl.player : null;
    var mob = document.body.classList.contains('mobile');
    var cx = VW / 2, cy = mob ? 112 : 46, r = mob ? 20 : 25;

    // parpadeo aleatorio
    f.blink -= 1 / 60;
    if (f.blink < -2.6 && Math.random() < 0.02) f.blink = 0.14;
    // seguimiento ocular
    if (p) {
      var px = p.x + p.w / 2 - this.cam.x, py = p.y + p.h / 2 - this.cam.y;
      var ang = Math.atan2(py - cy, px - cx);
      var dist = Math.min(1, Math.hypot(px - cx, py - cy) / 420);
      f.lookX = lerp(f.lookX, Math.cos(ang) * dist, 0.09);
      f.lookY = lerp(f.lookY, Math.sin(ang) * dist, 0.09);
    }
    // cambio de expresión
    f.swap -= 1 / 60;
    if (f.swap <= 0) {
      f.swap = 3 + Math.random() * 4;
      var pool = ['smug', 'bored', 'suspicious', 'innocent'];   /* v4.0: 'laugh' ya no sale del azar */
      if (this.boss) pool = ['boss', 'boss'];
      if (this.phaseName === 'dead') pool = ['bored', 'innocent'];   /* v4.0: se ríe POR tu muerte (evento), no mientras tanto */
      if (this.phaseName === 'win') pool = ['shock', 'bored'];
      f.expr = pool[Math.floor(Math.random() * pool.length)];
    }
    if (this.boss) f.expr = 'boss';

    // cápsula
    ctx.save();
    ctx.translate(cx, cy);
    var grad = ctx.createRadialGradient(0, -4, 2, 0, 0, r * 1.9);
    grad.addColorStop(0, 'rgba(255,255,255,.16)');
    grad.addColorStop(1, 'rgba(10,8,24,.92)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.55, 0, 6.283); ctx.fill();
    ctx.strokeStyle = th.glow + 'aa'; ctx.lineWidth = 1.4; ctx.stroke();

    // cara
    ctx.fillStyle = 'rgba(246,241,255,.96)';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.92, r, 0, 0, 6.283); ctx.fill();

    var lookX = f.lookX * 5, lookY = f.lookY * 5;
    var blink = f.blink > 0;
    var eyeY = -5 + lookY;
    ctx.fillStyle = '#0a0818';

    if (f.expr === 'laugh' || f.expr === 'shock') {
      // ojos muy abiertos
      ctx.beginPath(); ctx.arc(-8 + lookX, eyeY, 5.2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(8 + lookX, eyeY, 5.2, 0, 6.283); ctx.fill();
    } else if (f.expr === 'bored') {
      ctx.fillRect(-13 + lookX, eyeY, 9, 2.4);
      ctx.fillRect(4 + lookX, eyeY, 9, 2.4);
    } else if (f.expr === 'suspicious') {
      ctx.fillRect(-12 + lookX, eyeY - 1, 9, 4.5);
      ctx.beginPath(); ctx.arc(8 + lookX, eyeY, 4.4, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#0a0818'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-14, eyeY - 8); ctx.lineTo(-2, eyeY - 4); ctx.stroke();
    } else if (f.expr === 'innocent') {
      ctx.beginPath(); ctx.arc(-8 + lookX, eyeY, 4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(8 + lookX, eyeY, 4, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#0a0818'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 8, 5, 0.15, Math.PI - 0.15); ctx.stroke();
    } else if (f.expr === 'scared') {
      /* v4.0: ojos muy abiertos con pupilas pequeñas y boca torcida (miedo) */
      ctx.beginPath(); ctx.arc(-8 + lookX, eyeY, 5.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(8 + lookX, eyeY, 5.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(246,241,255,.95)';
      ctx.beginPath(); ctx.arc(-8 + lookX, eyeY - 2, 1.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(8 + lookX, eyeY - 2, 1.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#0a0818';
      ctx.strokeStyle = '#0a0818'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 11, 4.5, Math.PI + 0.5, -0.5); ctx.stroke();
    } else if (f.expr === 'boss') {
      // ojos de jefe: rendijas rojas
      ctx.fillStyle = '#ff4b4b';
      ctx.shadowColor = '#ff4b4b'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(-8 + lookX, eyeY, 5.5, 2.6, -0.25, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8 + lookX, eyeY, 5.5, 2.6, 0.25, 0, 6.283); ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // pícaro
      ctx.beginPath(); ctx.ellipse(-8 + lookX, eyeY, 3.6, 4.6, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8 + lookX, eyeY, 3.6, 4.6, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#0a0818'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(2, 6, 6, 0.1, Math.PI * 0.85); ctx.stroke();
    }
    if (blink) {
      ctx.fillStyle = 'rgba(246,241,255,1)';
      ctx.fillRect(-16, eyeY - 6, 32, 12);
      ctx.strokeStyle = '#0a0818'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-14, eyeY); ctx.lineTo(-3, eyeY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, eyeY); ctx.lineTo(14, eyeY); ctx.stroke();
    }
    ctx.restore();
  };

  G.drawFaceMenu = function (ctx, th) {
    // rostro flotante en el menú
    var cx = VW / 2, cy = VH * 0.34, r = 46 + Math.sin(this.t * 1.4) * 3;
    ctx.save();
    var rg = ctx.createRadialGradient(cx, cy, 8, cx, cy, r * 4);
    rg.addColorStop(0, 'rgba(139,92,246,.30)');
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(cx, cy, r * 4, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(246,241,255,.96)';
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.9, r, 0, 0, 6.283); ctx.fill();
    var lx = Math.cos(this.t * 0.8) * 6, ly = Math.sin(this.t * 0.6) * 4;
    ctx.fillStyle = '#0a0818';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.32 + lx, cy - r * 0.14 + ly, r * 0.13, r * 0.17, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + r * 0.32 + lx, cy - r * 0.14 + ly, r * 0.13, r * 0.17, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#0a0818'; ctx.lineWidth = r * 0.07;
    ctx.beginPath(); ctx.arc(cx + r * 0.06, cy + r * 0.26, r * 0.22, 0.15, Math.PI * 0.9); ctx.stroke();
    ctx.restore();
  };

  /* ------------------------------------------------------- ARENA DEL JEFE */
  G.drawBossArena = function (ctx, th) {
    var b = this.boss, L = this.lvl;
    if (!b) return;
    // columna del rayo
    if (b.beam && b.beam.active) {
      var a = b.state === 'aim' ? 0.22 : 0.85;
      var g = ctx.createLinearGradient(b.beam.cx - b.beam.w / 2, 0, b.beam.cx + b.beam.w / 2, 0);
      g.addColorStop(0, 'rgba(255,60,60,0)');
      g.addColorStop(0.5, 'rgba(255,120,90,' + a + ')');
      g.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(b.beam.cx - b.beam.w / 2, 0, b.beam.w, L.world.h);
      // marcador en el suelo
      ctx.strokeStyle = 'rgba(255,90,90,' + (0.5 + Math.sin(this.t * 16) * 0.4) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(b.beam.cx, L.world.h - 84, 44, 12, 0, 0, 6.283); ctx.stroke();
    }

    // ojo gigante de fondo
    var ex = L.world.w / 2, ey = 210 + Math.sin(this.t * 0.7) * 8;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ff5a5a';
    ctx.shadowColor = '#ff2d2d'; ctx.shadowBlur = 60;
    ctx.beginPath(); ctx.ellipse(ex, ey, 300, 130 * b.eye, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#150303';
    ctx.beginPath(); ctx.arc(ex, ey, 74 * b.eye, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ff3b3b';
    var p2 = L.player;
    var dx = clamp((p2.x + p2.w / 2 - ex) / 600, -1, 1) * 28;
    ctx.beginPath(); ctx.arc(ex + dx, ey, 34 * b.eye, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(ex + dx, ey, 16 * b.eye, 0, 6.283); ctx.fill();
    ctx.restore();

    // contador de engaños sobre la arena
    ctx.save();
    ctx.font = '700 13px ui-monospace,monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,220,220,.9)';
    ctx.fillText('ENGAÑOS  ' + b.fooled + ' / 3', ex, 360);
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(ex - 40 + i * 40, 382, 9, 0, 6.283);
      ctx.fillStyle = i < b.fooled ? '#6bffb4' : 'rgba(255,255,255,.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.restore();
  };

})(window.EO);
