/* ============================================================================
   EL OBSERVADOR — game.js  (núcleo)   [v3.2 · skills + música + stats]
   Motor de plataformas 2D sobre Canvas, sin dependencias.
   ============================================================================ */
window.EO = window.EO || {};

(function (EO) {
  'use strict';

  var VW = EO.VW, VH = EO.VH;
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var sign = function (v) { return v < 0 ? -1 : 1; };

  /* --------------------------------------------------------------- FÍSICA */
  var SPEED = 335, ACC = 2600, FRIC = 2800, GRAV = 2150,
      JUMP = 775, MAXFALL = 1250, COYOTE = 0.10, BUFFER = 0.13;

  var G = EO.Game = {
    canvas: null, ctx: null, dpr: 1,
    mode: 'story', levelNum: 1, lvl: null, phaseName: 'menu',
    paused: false, t: 0, deaths: 0, helpUsed: 0, orbsGot: 0,
    cam: { x: 0, y: 0 }, shake: 0, particles: [], bolts: [], rings: [],
    boss: null, echoHist: [], echoIdx: 0, echoGhost: null,
    keys: {}, last: 0, acc: 0, startsAt: 0, wait: 0, won: false,
    theme: EO.THEMES[1], stars: [], ambient: [], deathFlash: 0, winFlash: 0,
    helpCooldown: 0, lastBossSay: 0, secretSeen: {},
    pad: { left: false, right: false, jump: false, connected: false, dash: false },
    _pJump: false, _pStart: false, _pSel: false, _pDash: false,
    /* v3.2 */
    shieldUsed: false, dashTimer: 0, dashCooldown: 0,
    musicMood: 'normal', _musicTick: 0, _musicNext: 0,
    _prevMusicLine: ''
  };

  var P = function () { return G.lvl ? G.lvl.player : null; };

  /* ============================================================
     HABILIDADES v3.2 — solo se aplican en modos no-historia
     ============================================================ */
  G.hasSkill = function (id) {
    if (this.mode === 'story' || this.mode === 'story-final') return false;
    var s = EO.Store.get();
    return !!(s.inv && s.inv['skill.' + id]);
  };

  /* ------------------------------------------------------------- ARRANQUE */
  G.init = function () {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.makeStars();
    this.bindInput();
    var self = this;
    window.addEventListener('resize', function () { self.resize(); });
    if (window.ResizeObserver) {
      try { new ResizeObserver(function () { self.resize(); }).observe(document.getElementById('stage')); } catch (e) {}
    }
    this.last = performance.now();
    requestAnimationFrame(function (ts) { self.loop(ts); });
    this.theme = EO.themeFor(1);
  };

  G.resize = function () {
    var stage = document.getElementById('stage');
    if (!stage || !this.canvas) return;
    var r = stage.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.dpr = dpr;
    this.canvas.width = Math.max(320, Math.round(r.width * dpr));
    this.canvas.height = Math.max(180, Math.round(r.height * dpr));
  };

  G.makeStars = function () {
    this.stars.length = 0;
    for (var i = 0; i < 150; i++) {
      this.stars.push({ x: Math.random() * VW, y: Math.random() * VH, r: rnd(0.4, 1.7), a: rnd(0.15, 0.85), s: rnd(0.05, 0.5), layer: Math.random() < 0.5 ? 0.25 : 0.6 });
    }
    this.ambient.length = 0;
    for (var j = 0; j < 40; j++) {
      this.ambient.push({ x: rnd(0, VW), y: rnd(0, VH), r: rnd(1, 3.4), vy: rnd(-14, -3), vx: rnd(-8, 8), a: rnd(0.05, 0.3) });
    }
  };

  /* ---------------------------------------------------------------- ENTRADA */
  G.bindInput = function () {
    var self = this;
    var map = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up', Space: 'jump', ArrowDown: 'down', KeyS: 'down',
      ShiftLeft: 'dash', ShiftRight: 'dash', KeyK: 'dash'
    };
    window.addEventListener('keydown', function (e) {
      var k = map[e.code];
      if (k) {
        if (k === 'jump' && !self.keys.jump) self.buffer = BUFFER;
        if (k === 'up' && !self.keys.up) self.buffer = BUFFER;
        self.keys[k] = true;
        if (e.code === 'Space' && self.phaseName === 'play') e.preventDefault();
      }
    });
    window.addEventListener('keyup', function (e) {
      var k = map[e.code];
      if (k) self.keys[k] = false;
    });
    window.addEventListener('blur', function () { self.keys = {}; });

    document.querySelectorAll('#touch [data-key]').forEach(function (btn) {
      var key = btn.getAttribute('data-key');
      var down = function (e) {
        e.preventDefault();
        EO.Audio.init();
        if (key === 'jump') { self.buffer = BUFFER; self.keys.jump = true; }
        else if (key === 'help') { self.askHelp(); return; }
        else self.keys[key] = true;
        btn.classList.add('active');
      };
      var up = function (e) {
        e.preventDefault();
        self.keys[key] = false;
        btn.classList.remove('active');
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
    document.getElementById('stage').addEventListener('pointerdown', function (e) {
      if (e.target.closest('#touch') || e.target.closest('.hud-btn') || e.target.closest('.screen')) return;
      if (document.body.classList.contains('mobile')) { self.buffer = BUFFER; self.keys.jump = true; setTimeout(function () { self.keys.jump = false; }, 90); }
      EO.Audio.init();
    });
  };

  /* ------------------------------------------------------------ FLUJO / MODOS */
  G.start = function (mode) {
    this.mode = mode || 'story';
    this.paused = false;
    this.won = false;
    EO.UI.hideAll();
    EO.UI.hideDialog();
    EO.Audio.init();
    if (mode === 'story') {
      var s = EO.Store.get();
      this.levelNum = clamp(s.level || 1, 1, EO.STORY_END || 15);
    } else if (mode === 'descenso') {
      this.levelNum = 1;
      EO.Store.get().achv.descenso = true; EO.Store.save();
    } else {
      this.levelNum = 1;
    }
    if (mode === 'diario') {
      var d = new Date();
      this.dailySeed = (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate());
    }
    this.deaths = 0;
    this.phaseName = 'play';
    EO.Audio.startDrone(mode === 'story' ? 55 : 48);
    this.loadLevel(this.levelNum, true);
  };

  G.toMenu = function () {
    this.phaseName = 'menu';
    this.paused = false;
    this.lvl = null;
    EO.UI.hideDialog();
    EO.Audio.stopDrone();
    EO.UI.updateMenu();
    EO.UI.show('menu');
  };

  G.togglePause = function () {
    if (this.phaseName !== 'play' && this.phaseName !== 'dead') return;
    this.paused = !this.paused;
    if (this.paused) {
      EO.UI.show('pause');
      var q = document.getElementById('pause-quote');
      if (q) q.textContent = EO.UI.quote('idle');
      if (EO.Observe) EO.Observe.event('pause');
    } else {
      EO.UI.hideAll();
      this.last = performance.now();
    }
  };

  G.restart = function () {
    if (this.phaseName !== 'play' && this.phaseName !== 'dead') return;
    this.paused = false;
    EO.UI.hideAll();
    if (EO.Observe) EO.Observe.event('restart');
    this.loadLevel(this.levelNum, false, true);
  };

  G.replay = function () {
    this._replay = true;
    this.paused = false;
    EO.UI.hideAll();
    this.loadLevel(this.levelNum, false, true);
  };

  G.next = function () {
    this._replay = false;
    EO.UI.hideAll();
    this.paused = false;
    if (this.mode === 'story') {
      this.levelNum++;
      var s = EO.Store.get();
      if (s.level < this.levelNum) { s.level = this.levelNum; EO.Store.save(); }
    } else if (this.mode === 'descenso') {
      this.levelNum++;
      var s2 = EO.Store.get();
      if (this.levelNum - 1 > s2.best.descenso) { s2.best.descenso = this.levelNum - 1; EO.Store.save(); }
    } else {
      this.levelNum++;
      if (this.mode === 'infinito' || this.mode === 'diablo') {
        var s3 = EO.Store.get();
        if (this.levelNum - 1 > (s3.best[this.mode] || 0)) { s3.best[this.mode] = this.levelNum - 1; EO.Store.save(); }
      }
    }
    this.loadLevel(this.levelNum, true);
  };

  /* ------------------------------------------------------------ CARGA DE NIVEL */
  G.getLevelDef = function (num) {
    if (this.mode === 'story' && num <= (EO.STORY_END || 15)) {
      var d = EO.levelByNumber(num);
      return d ? JSON.parse(JSON.stringify(d)) : EO.LevelBuilder.generate(num, num * 7919, this.mode);
    }
    var seed = (this.mode === 'diario') ? (this.dailySeed + num * 131) : (Math.floor(Math.random() * 1e9) + num * 977);
    if (this.mode === 'descenso') seed = num * 4507 + (this.runSeed || (this.runSeed = Math.floor(Math.random() * 1e6))) + this.deaths * 13;
    return EO.LevelBuilder.generate(num, seed, this.mode);
  };

  G.loadLevel = function (num, showIntro, retry) {
    this.levelNum = num;
    var def = this.getLevelDef(num);
    if (this.mode === 'mirror') def.rules.invert = true;

    this.lvl = def;
    this.theme = EO.themeFor(num);
    document.body.className = document.body.className.replace(/theme-b\d/g, '').trim();
    document.body.classList.add(this.theme.cls);
    document.documentElement.style.setProperty('--glow', this.theme.glow);

    var L = this.lvl, i;
    L.spikes = L.spikes || []; L.orbs = L.orbs || []; L.signs = L.signs || [];
    L.blades = L.blades || []; L.altars = L.altars || []; L.exits = [];
    L.rules = L.rules || { gravity: 1, invert: false, canJump: true };

    L.platforms.forEach(function (p, idx) {
      p.id = idx; p.bx = p.x; p.by = p.y; p.px = p.x; p.py = p.y; p.dx = 0; p.dy = 0;
      if (typeof p.amp !== 'number') p.amp = 0;
      p.speed = p.speed || 1; p.phase = p.phase || 0;
    });
    if (L.exit && !L.exit.disabled2) L.exits.push(L.exit);
    if (L.extraExits) L.extraExits.forEach(function (e) { L.exits.push(e); });
    L.exits.forEach(function (e) {
      e.w = e.w || 54; e.h = e.h || 92; e.bx = e.x; e.by = e.y; e.found = false;
    });

    L.orbs.forEach(function (o) { o.got = false; o.n = o.n || 1; o.r = 13; });
    L.spikes.forEach(function (s) { s.hits = 0; });

    var gy = L.rules.gravity || 1;
    L.player = {
      x: L.spawn.x, y: L.spawn.y, w: 30, h: 40, vx: 0, vy: 0,
      onGround: false, coyote: 0, facing: 1, alive: true, standing: -1,
      spawnX: L.spawn.x, spawnY: L.spawn.y, trail: [], jumpsUsed: 0
    };
    this.cam.x = clamp(L.player.x - VW / 2, 0, Math.max(0, L.world.w - VW));
    this.cam.y = clamp(L.player.y - VH / 2, 0, Math.max(0, L.world.h - VH));
    this.deaths = 0;
    this.helpUsed = 0;
    this.orbsGot = 0;
    this.wait = 0;
    this.won = false;
    this.particles.length = 0;
    this.bolts.length = 0;
    this.rings.length = 0;
    this.echoHist = [];
    this.echoIdx = 0;
    this.boss = null;
    this.buffer = 0;

    /* v3.2 — reset de estado por nivel */
    this.shieldUsed = false; this.shieldHits = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;

    this.startsAt = this.t;
    this.phaseName = 'play';
    this.paused = false;
    EO.UI.hideAll();

    var sa = EO.Store.get(); sa.stats = sa.stats || {};
    var ka = 'l' + num; if (!sa.stats[ka]) sa.stats[ka] = { attempts: 0, deaths: 0, time: 0 };
    sa.stats[ka].attempts = (sa.stats[ka].attempts || 0) + 1;

    EO.UI.hud({ level: num, deaths: 0, coins: EO.Store.get().coins, block: this.theme.name, progress: 0 });

    var total = L.exits.filter(function (e) { return e.kind === 'real' || e.kind === 'hidden' || !e.kind; }).length;
    if (L.goal && L.goal.type === 'orbs_exit') total = total;
    this.needOrbs = L.orbs.length;

    if (L.boss) this.initBoss(L);

    var self = this;
    var fam = L.family && EO.FAMILIES[L.family] ? EO.FAMILIES[L.family].n : 'Nivel generado';
    var inter = {
      k: (L.boss ? 'JEFE MAESTRO · NIVEL ' : 'NIVEL ') + String(num).padStart(2, '0'),
      n: L.name || 'SIN TÍTULO',
      s: L.subtitle || '',
      fam: (L.boss ? '★ ' : '') + fam
    };
    if (showIntro) {
      EO.UI.interstitial(inter, function () {
        self.phaseName = 'play';
        self.startsAt = self.t;
        if (L.intro && self.mode !== 'silencio') EO.UI.say(L.intro);
        if (L.boss) { EO.Audio.boss(); self.shake = 16; }
      });
      this.phaseName = 'intro';
    } else {
      if (L.intro && this.mode !== 'silencio' && Math.random() < 0.5) EO.UI.say(L.intro);
    }
    if (L.boss) EO.Audio.setDrone(38);
    else EO.Audio.setDrone(55 + Math.min(24, num));
  };

  /* --------------------------------------------------------------- BUCLE */
  G.loop = function (ts) {
    var dt = (ts - this.last) / 1000;
    this.last = ts;
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 0.05);
    this.t += dt;
    try { this.pollGamepad(); } catch (e) {}
    try { this.updateMusic(dt); } catch (e) {}

    if (!this.paused) {
      if (this.phaseName === 'play' || this.phaseName === 'dead' || this.phaseName === 'intro') {
        this.acc += dt;
        var step = 1 / 120, guard = 0;
        while (this.acc >= step && guard < 12) { this.update(step); this.acc -= step; guard++; }
        if (guard >= 12) this.acc = 0;
      }
      this.updateParticles(dt);
    }
    this.render(dt);
    var self = this;
    requestAnimationFrame(function (t2) { self.loop(t2); });
  };

  /* --------------------------------------------------------------- UPDATE */
  G.update = function (dt) {
    var L = this.lvl;
    if (!L) return;
    if (this.phaseName === 'intro') { this.updateAmbientOnly(dt); return; }

    this.updatePlatforms(dt);
    if (this.phaseName === 'play') this.updatePlayer(dt);
    this.updateHazards(dt);
    if (this.boss) this.updateBoss(dt);
    this.checkGoal(dt);
    this.updateCamera(dt);

    this.shake = Math.max(0, this.shake - dt * 42);
    this.deathFlash = Math.max(0, this.deathFlash - dt * 2.4);
    this.winFlash = Math.max(0, this.winFlash - dt * 1.6);
    this.helpCooldown = Math.max(0, this.helpCooldown - dt);

    var p = L.player;
    if (p && (p.y > L.world.h + 260 || p.y < -420)) this.kill('fall');
  };

  G.updateAmbientOnly = function (dt) {
    this.ambient.forEach(function (a) {
      a.y += a.vy * dt; a.x += a.vx * dt;
      if (a.y < -10) { a.y = VH + 10; a.x = rnd(0, VW); }
    });
  };

  G.updatePlatforms = function (dt) {
    var L = this.lvl, p = L.player;
    L.platforms.forEach(function (pl) {
      pl.px = pl.x; pl.py = pl.y;
      if (pl.type === 'move' && pl.amp) {
        var t = G.t * pl.speed + (pl.phase || 0);
        var off = Math.sin(t) * pl.amp;
        if (pl.axis === 'y') pl.y = pl.by + off; else pl.x = pl.bx + off;
      }
      pl.dx = pl.x - pl.px; pl.dy = pl.y - pl.py;
    });
    if (p && p.onGround && p.standing >= 0) {
      var s = L.platforms[p.standing];
      if (s && s.type === 'move') { p.x += s.dx; p.y += s.dy; }
    }
  };

  G.platformActive = function (pl) {
    if (pl.type === 'fake') return false;
    if (pl.type === 'phase') {
      var per = pl.period || 2.4;
      return Math.sin((G.t / per) * Math.PI * 2 + (pl.offset || 0) * Math.PI * 2) > -0.25;
    }
    return true;
  };

  G.updatePlayer = function (dt) {
    var L = this.lvl, p = L.player, r = L.rules;
    if (!p.alive) return;
    var inv = !!r.invert;

    /* v3.2 — skills */
    var sk = {
      doubleJump: this.hasSkill('dobleSalto'),
      iman: this.hasSkill('iman'),
      aire: this.hasSkill('aire'),
      dash: this.hasSkill('dash')
    };
    this.dashCooldown = Math.max(0, (this.dashCooldown || 0) - dt);
    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (p.onGround) p.jumpsUsed = 0;

    var left = this.keys.left || this.pad.left, right = this.keys.right || this.pad.right;
    if (inv) { var tmp = left; left = right; right = tmp; }

    var target = 0;
    if (left && !right) target = -1;
    else if (right && !left) target = 1;
    var dashing = this.dashTimer > 0;
    if (dashing) {
      if (target !== 0) p.facing = target;
    } else if (target !== 0) {
      p.vx += target * ACC * dt;
      p.vx = clamp(p.vx, -SPEED, SPEED);
      p.facing = target;
    } else {
      var f = FRIC * dt;
      if (Math.abs(p.vx) <= f) p.vx = 0; else p.vx -= sign(p.vx) * f;
    }

    var g = r.gravity || 1;
    p.vy += GRAV * g * (dashing ? 0.15 : 1) * dt;
    p.vy = clamp(p.vy, -MAXFALL, MAXFALL);

    /* Aire controlado */
    if (sk.aire && (this.keys.jump || this.keys.up || this.pad.jump) && g > 0 && p.vy > 160) {
      p.vy = Math.max(160, p.vy - 3200 * dt);
    }

    /* Dash corto */
    var dashPressed = this.keys.dash || this.pad.dash;
    if (dashPressed && !this._prevDash && sk.dash && this.dashCooldown <= 0 && p.alive) {
      p.vx = p.facing * 900;
      this.dashTimer = 0.15;
      this.dashCooldown = 1.5;
      this.burst(p.x + p.w / 2, p.y + p.h / 2, 12, '#8ef4ff', 220);
      EO.Audio.tone(700, 0.12, 'sawtooth', 0.14, 1400);
    }
    this._prevDash = dashPressed;

    this.buffer = Math.max(0, (this.buffer || 0) - dt);
    p.coyote = Math.max(0, p.coyote - dt);

    if (!p.onGround && p.coyote <= 0 && (p.jumpsUsed || 0) === 0) p.jumpsUsed = 1;
    var canJump = r.canJump !== false;
    var maxJumps = sk.doubleJump ? 2 : 1;
    var canJumpNow = (p.onGround || p.coyote > 0) || ((p.jumpsUsed || 0) >= 1 && (p.jumpsUsed || 0) < maxJumps);
    if (this.buffer > 0 && canJumpNow && canJump) {
      p.vy = JUMP * -g;
      p.onGround = false; p.coyote = 0; this.buffer = 0;
      p.jumpsUsed = (p.jumpsUsed || 0) + 1;
      EO.Audio.jump();
      this.burst(p.x + p.w / 2, p.y + (g > 0 ? p.h : 0), 7, this.theme.glow, 130);
      if (sk.doubleJump && p.jumpsUsed === 2) {
        this.burst(p.x + p.w / 2, p.y + p.h / 2, 10, '#8ef4ff', 180);
      }
    }
    if (!this.keys.jump && !this.keys.up && !this.pad.jump && ((g > 0 && p.vy < -260) || (g < 0 && p.vy > 260))) {
      p.vy *= 0.55;
    }

    p.x += p.vx * dt;
    var i, pl;
    for (i = 0; i < L.platforms.length; i++) {
      pl = L.platforms[i];
      if (!this.platformActive(pl)) continue;
      if (this.aabb(p, pl)) {
        if (p.vx > 0) p.x = pl.x - p.w;
        else if (p.vx < 0) p.x = pl.x + pl.w;
        p.vx = 0;
      }
    }
    p.x = clamp(p.x, -20, L.world.w - p.w + 20);

    p.y += p.vy * dt;
    var wasGround = p.onGround;
    p.onGround = false; p.standing = -1;
    for (i = 0; i < L.platforms.length; i++) {
      pl = L.platforms[i];
      if (!this.platformActive(pl)) continue;
      if (this.aabb(p, pl)) {
        if (p.vy > 0) { p.y = pl.y - p.h; p.vy = 0; p.onGround = true; p.standing = i; }
        else if (p.vy < 0) { p.y = pl.y + pl.h; p.vy = 0; }
      }
    }
    if (g < 0) {
      p.onGround = false; p.standing = -1;
      for (i = 0; i < L.platforms.length; i++) {
        pl = L.platforms[i];
        if (!this.platformActive(pl)) continue;
        if (this.aabb({ x: p.x, y: p.y - 3, w: p.w, h: p.h + 3 }, pl) && p.vy <= 0) {
          p.onGround = true; p.standing = i;
        }
      }
    }
    if (p.onGround) {
      p.coyote = COYOTE;
      p.jumpsUsed = 0;
      if (!wasGround && Math.abs(p.vy) < 60) { EO.Audio.land(); this.burst(p.x + p.w / 2, p.y + p.h, 4, '#ffffff', 70); }
    }

    p.trail.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, t: this.t });
    if (p.trail.length > 26) p.trail.shift();

    if (r.echo) {
      this.echoHist.push({ x: p.x, y: p.y, f: p.facing });
      if (this.echoHist.length > 900) this.echoHist.shift();
      if (this.echoIdx < this.echoHist.length - 120) {
        var e = this.echoHist[Math.max(0, this.echoHist.length - 240 + (this.echoHist.length - this.echoIdx) % 120)];
        if (e) this.echoGhost = e;
        this.echoIdx = Math.min(this.echoHist.length, this.echoIdx + 1);
      }
    }

    /* Imán de orbes */
    if (sk.iman && L.orbs && L.orbs.length) {
      var pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
      for (var oi = 0; oi < L.orbs.length; oi++) {
        var ob = L.orbs[oi];
        if (ob.got) continue;
        if (Math.hypot(ob.x - pcx, ob.y - pcy) < 80) {
          ob.got = true; this.orbsGot++;
          EO.Audio.orb();
          this.burst(ob.x, ob.y, 16, '#ffe9a8', 190);
          this.rings.push({ x: ob.x, y: ob.y, r: 8, a: 1 });
        }
      }
    }

    var self = this;
    L.orbs.forEach(function (o) {
      if (o.got) return;
      if (Math.abs((p.x + p.w / 2) - o.x) < 26 && Math.abs((p.y + p.h / 2) - o.y) < 30) {
        o.got = true; G.orbsGot++;
        EO.Audio.orb();
        self.burst(o.x, o.y, 16, '#ffe9a8', 190);
        self.rings.push({ x: o.x, y: o.y, r: 8, a: 1 });
        if (G.mode !== 'silencio') EO.UI.say('Ese lo has cogido tú. Los hay que no existen.');
      }
    });

    L.exits.forEach(function (ex) {
      if (ex.kind === 'fake' && ex.found) return;
      if (ex.illusionOff) return;
      if ((ex.disabled || L.goal.type === 'orbs_exit' || L.goal.type === 'altar') && !G.conditionMet()) return;
      if (G.aabb({ x: p.x, y: p.y, w: p.w, h: p.h }, { x: ex.x, y: ex.y, w: ex.w, h: ex.h })) {
        if (ex.kind === 'fake') { G.fakeDoor(ex); return; }
        if (ex.hidden && !ex.found && !G.canReachHidden()) return;
        if (EO.Illusion && EO.Illusion.intercept(G, ex)) return;   // v3.4: puerta-ilusión
        G.complete();
      }
    });
  };

  G.aabb = function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  G.updateHazards = function (dt) {
    var L = this.lvl, p = L.player, self = this;
    if (!p || !p.alive) return;

    for (var i = 0; i < L.spikes.length; i++) {
      var sp = L.spikes[i];
      if (sp.period) {
        var on = Math.sin((this.t / sp.period) * Math.PI * 2 + (sp.offset || 0) * Math.PI * 2) > 0.1;
        if (!on) continue;
      }
      if (this.aabb(p, sp)) { this.kill('spike'); return; }
    }
    for (var k = this.bolts.length - 1; k >= 0; k--) {
      var bo = this.bolts[k];
      if (bo.warn > 0) { bo.warn -= dt; bo.life -= dt; continue; }
      bo.vy += 1400 * dt;
      bo.y += bo.vy * dt; bo.x += (bo.vx || 0) * dt;
      bo.life -= dt;
      if (bo.life <= 0 || bo.y > L.world.h + 100) { this.bolts.splice(k, 1); continue; }
      if (Math.hypot((p.x + p.w / 2) - bo.x, (p.y + p.h / 2) - bo.y) < bo.r + 14) { this.kill('bolt'); return; }
    }
    if (this.boss && this.boss.beam && this.boss.beam.active && this.boss.state === 'fire') {
      var bm = this.boss.beam;
      if (Math.abs((p.x + p.w / 2) - bm.cx) < bm.w / 2) { this.kill('beam'); return; }
    }
  };

  G.conditionMet = function () {
    var L = this.lvl;
    if (!L) return false;
    if (L.goal.type === 'altar') return !!L.altarDone;
    if (L.goal.type === 'orbs_exit') return this.orbsGot >= L.orbs.length;
    return true;
  };

  G.canReachHidden = function () {
    var L = this.lvl, p = L.player;
    var ex = L.exits.filter(function (e) { return e.hidden; })[0];
    if (!ex) return true;
    var d = Math.hypot(p.x - ex.x, p.y - ex.y);
    if (d < 220) { ex.found = true; ex.hidden = false; return true; }
    return false;
  };

  G.fakeDoor = function (ex) {
    ex.found = true;
    this.shake = 9;
    EO.Audio.trick();
    this.burst(ex.x + 27, ex.y + 46, 26, '#ff5d3a', 260);
    if (this.faceCause) this.faceCause('laugh', 2.2);   /* v4.0: risa con causa (puerta falsa) */
    EO.UI.say(EO.UI.quote('tricked'));
    EO.UI.toast('PUERTA FALSA', 'El Observador se ríe. La puerta se ha desvanecido.');
    EO.Store.get().tricked = (EO.Store.get().tricked || 0) + 1;
    EO.Store.save();
    this.checkAchv('trickster', EO.Store.get().tricked >= 5);
    if (EO.Observe) EO.Observe.event('mirror');
  };

  G.kill = function (cause) {
    var L = this.lvl, p = L.player;
    if (!p || !p.alive || this.phaseName !== 'play') return;

    /* v3.2 — Escudo espectral (solo modos no-historia) */
    if (this.hasSkill('escudo') && !this.shieldUsed) {
      this.shieldUsed = true;
      var px0 = p.x + p.w / 2, py0 = p.y + p.h / 2;
      p.x = p.spawnX; p.y = p.spawnY; p.vx = 0; p.vy = 0;
      this.bolts.length = 0; this.shieldHits = (this.shieldHits || 0) + 1;
      this.shake = 14;
      this.deathFlash = 0.4;
      this.burst(px0, py0, 34, '#6bffb4', 280);
      EO.Audio.trick();
      EO.UI.toast('ESCUDO', 'El Observador no cuenta esta muerte. Solo una vez por nivel.');
      if (this.mode !== 'silencio') EO.UI.say('Te perdono esa. Una. La próxima me la quedo.', { duration: 3000 });
      return;
    }

    /* v3.2 — Stats: nivel más difícil */
    var ss = EO.Store.get();
    ss.stats = ss.stats || {};
    var skey = 'l' + this.levelNum;
    if (!ss.stats[skey]) ss.stats[skey] = { attempts: 0, deaths: 0, time: 0 };
    ss.stats[skey].deaths = (ss.stats[skey].deaths || 0) + 1;
    EO.Store.save();

    p.alive = false;
    this.phaseName = 'dead';
    this.deaths++;
    this.deathFlash = 1;
    this.shake = 14;
    EO.Audio.death();
    if (this.faceCause) this.faceCause('laugh', 1.6);   /* v4.0: se ríe PORQUE has muerto, no al azar */
    EO.Store.get().totalDeaths = (EO.Store.get().totalDeaths || 0) + 1;
    EO.Store.save();
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 34, '#ff6b6b', 300);
    EO.UI.hud({ deaths: this.deaths });

    if (EO.Observe) EO.Observe.event('death', { trap: cause });

    if (this.mode === 'descenso') {
      var self = this;
      setTimeout(function () {
        if (self.phaseName !== 'dead') return;
        EO.UI.say('Retrocedes. El Descenso no negocia.');
        self.levelNum = Math.max(1, self.levelNum - 1);
        self.loadLevel(self.levelNum, true, true);
      }, 700);
      return;
    }

    var q;
    var near = 1e9;
    L.exits.forEach(function (ex) { if (ex.kind !== 'fake') near = Math.min(near, Math.hypot(p.x - ex.x, p.y - ex.y)); });
    if (this.mode !== 'silencio') {
      if (this.deaths >= 5) q = EO.UI.quote('death_five');
      else if (near < 150) q = EO.UI.quote('death_near_win');
      else q = EO.UI.quote('death_absurd');
      EO.UI.say(q, { duration: 2600 });
    }
    var effD = this.deaths + (this.hasSkill('escudo') ? this.shieldHits || 0 : 0) * 1;
    if (effD >= 10) this.checkAchv('deaths10', true);

    var me = this;
    setTimeout(function () {
      if (me.phaseName !== 'dead') return;
      me.phaseName = 'play';
      me.respawn();
    }, 620);
  };

  G.respawn = function () {
    var L = this.lvl, p = L.player;
    p.x = p.spawnX; p.y = p.spawnY; p.vx = 0; p.vy = 0; p.alive = true;
    p.trail.length = 0; p.onGround = false; p.jumpsUsed = 0;
    L.orbs.forEach(function (o) { o.got = false; });
    this.orbsGot = 0;
    this.wait = 0;
    this.bolts.length = 0;
    if (this.boss) this.resetBoss();
    this.startsAt = this.t;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 14, this.theme.glow, 150);
  };

  G.complete = function () {
    if (this.won) return;
    this.won = true;
    this.phaseName = 'win';
    this.winFlash = 1;
    this.shake = 8;
    EO.Audio.win();
    var L = this.lvl, p = L.player;
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 50, '#fff3c4', 330);
    var self = this;
    var time = Math.max(1, Math.round(this.t - this.startsAt));

    /* v3.2 — Stats: guardar tiempo del nivel */
    var ss2 = EO.Store.get();
    ss2.stats = ss2.stats || {};
    var skey2 = 'l' + this.levelNum;
    if (!ss2.stats[skey2]) ss2.stats[skey2] = { attempts: 0, deaths: 0, time: 0 };
    ss2.stats[skey2].time = (ss2.stats[skey2].time || 0) + time;
    ss2.stats[skey2].cleared = true;
    EO.Store.save();

    var s = EO.Store.get();
    var rw = EO.Shop.reward(this, L), coins = rw.total;
    s.coins = (s.coins || 0) + coins;
    EO.Store.save();
    EO.UI.hud({ coins: s.coins });
    this.bubble('+' + coins + ' CAOS', 2.4);

    this.checkAchv('first', true);
    if (this.deaths === 0) this.checkAchv('flawless', true);
    if (this.helpUsed === 0) this.checkAchv('nohelp', true);
    if (this.levelNum >= 5) this.checkAchv('s5', true);
    if (this.levelNum >= 10) this.checkAchv('s10', true);
    if (L.boss === 'saber') this.checkAchv('boss1', true);

    var STORY_END = EO.STORY_END || 15;
    if (this.mode === 'story' && this.levelNum >= STORY_END) {
      setTimeout(function () { self.endingSequence(); }, 1300);
      return;
    }

    if (this.faceCause) this.faceCause(this.deaths === 0 ? 'scared' : 'shock', 2.5);   /* v4.0 */
    EO.UI.say(this.deaths === 0 ? EO.UI.quote('win_flawless') : EO.UI.quote('win'), { duration: 2600 });

    setTimeout(function () {
      if (self.phaseName !== 'win') return;
      EO.UI.show('result');
      document.getElementById('r-k').textContent = L.boss ? 'JEFE DERROTADO' : 'NIVEL SUPERADO';
      document.getElementById('r-title').textContent = L.name || 'HAS GANADO';
      document.getElementById('r-text').textContent = self.mode === 'descenso'
        ? 'Avanzas al nivel ' + (self.levelNum + 1) + '. Recuerda: aquí no hay puntos de guardado.'
        : 'El Observador ha anotado cada uno de tus movimientos.';
      document.getElementById('r-stats').innerHTML = [
        ['TIEMPO', time + 's'], ['MUERTES', self.deaths],
        ['AYUDAS', self.helpUsed], ['CAOS', '+' + coins]
      ].map(function (i) { return '<div class="stat"><div class="v">' + i[1] + '</div><div class="l">' + i[0] + '</div></div>'; }).join('');
      var rb = document.getElementById('r-break'); if (rb) rb.textContent = rw.txt;
      if (EO.Shop) EO.Shop.sub();
      var nx = document.getElementById('r-next');
      if (nx) nx.textContent = self.mode === 'descenso' ? 'Siguiente (nivel ' + (self.levelNum + 1) + ')' : 'Siguiente nivel';
    }, 900);
  };

  G.checkAchv = function (id, cond) {
    if (!cond) return;
    var s = EO.Store.get();
    if (s.achv[id]) return;
    s.achv[id] = true; s.coins = (s.coins || 0) + 15; EO.Store.save(); EO.UI.hud({ coins: s.coins });
    var a = EO.ACHIEVEMENTS.filter(function (x) { return x.id === id; })[0];
    if (a) EO.UI.toast('LOGRO · ' + a.icon, '<b>' + a.n + '</b><br>' + a.d + '<br><b>+15 CAOS</b>', 4200);
  };

  G.updateCamera = function (dt) {
    var L = this.lvl, p = L.player;
    var maxX = Math.max(0, L.world.w - VW), maxY = Math.max(0, L.world.h - VH);
    var tx = clamp(p.x + p.w / 2 - VW / 2 + p.vx * 0.14, 0, maxX);
    var ty = clamp(p.y + p.h / 2 - VH / 2, 0, maxY);
    var k = 1 - Math.pow(0.0016, dt);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
  };

  G.burst = function (x, y, n, color, spd) {
    if (!EO.Store.get().settings.particles) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = rnd(spd * 0.25, spd);
      this.particles.push({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: rnd(0.3, 0.95), max: 1, r: rnd(1.4, 4.2), color: color, g: rnd(200, 640)
      });
    }
  };

  G.updateParticles = function (dt) {
    var arr = this.particles, i;
    for (i = arr.length - 1; i >= 0; i--) {
      var p = arr[i];
      p.life -= dt;
      if (p.life <= 0) { arr.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.985;
    }
    for (i = this.rings.length - 1; i >= 0; i--) {
      var r = this.rings[i];
      r.r += dt * 160; r.a -= dt * 1.6;
      if (r.a <= 0) this.rings.splice(i, 1);
    }
    for (i = this.ambient.length - 1; i >= 0; i--) {
      var a = this.ambient[i];
      a.y += a.vy * dt; a.x += a.vx * dt;
      if (a.y < -12) { a.y = VH + 12; a.x = rnd(0, VW); }
      if (a.x < -12) a.x = VW + 12; if (a.x > VW + 12) a.x = -12;
    }
    this.updateAmbientOnly(0);
  };

  G.checkGoal = function (dt) {
    var L = this.lvl, p = L.player;
    if (!p || !p.alive) return;
    if (L.goal.type === 'wait') {
      if (!L.exit || !L.exit.disabled) return;
      this.wait += dt;
      var left = Math.max(0, L.goal.time - this.wait);
      if (left <= 0) {
        L.exit.disabled = false;
        EO.UI.say('Ya está. Se ha abierto. No preguntes por qué.');
      }
      if (Math.floor(left) !== Math.floor(left + dt)) EO.UI.hud({ progress: 1 - left / L.goal.time });
    }
    if (L.goal.type === 'altar') {
      L.altars.forEach(function (a) {
        if (L.altarDone) return;
        if (G.aabb(p, a)) {
          L.altarDone = true;
          G.shake = 10;
          EO.Audio.trick();
          G.burst(a.x + a.w / 2, a.y, 30, '#ff6bd6', 240);
          EO.UI.say('Sacrificio aceptado. No preguntes qué has sacrificado.');
          L.exits.forEach(function (e) { e.disabled = false; });
        }
      });
    }
    var prog = clamp((p.x) / Math.max(1, L.world.w - 200), 0, 1);
    this.hudTick = (this.hudTick || 0) + dt;
    if (this.hudTick > 0.15) { this.hudTick = 0; EO.UI.hud({ progress: prog, deaths: this.deaths }); }

    if (this.goalIdle == null) this.goalIdle = 0;
    if (Math.abs(p.vx) < 12 && p.onGround) {
      this.idle = (this.idle || 0) + dt;
      if (this.idle > 3 && !this._idleSaid) { this._idleSaid = true; if (this.mode !== 'silencio') EO.UI.say(EO.UI.quote('idle')); }
      if (this.idle > 20) this.checkAchv('idle', true);
    } else { this.idle = 0; this._idleSaid = false; }
  };

  G.askHelp = function () {
    if (this.phaseName !== 'play' || !this.lvl) return;
    if (this.helpCooldown > 0) { EO.UI.toast('CALMA', 'El Observador está pensando otra mentira.'); return; }
    this.helpCooldown = 2.2;
    this.helpUsed++;
    if (EO.Observe) EO.Observe.event('help');
    if (this.mode === 'silencio') { EO.UI.toast('SIN OBSERVADOR', 'Aquí nadie te va a ayudar. Ni a mentir.'); EO.Store.get().settings.sound && EO.Audio.tone(180, 0.2, 'sine', 0.1); return; }

    var L = this.lvl, p = L.player;
    var target = null;
    if (L.boss) {
      EO.UI.say('Está a tu izquierda. O a tu derecha. Depende de cuándo leas esto.', { duration: 4000 });
      EO.Audio.click();
      return;
    }
    var best = 1e9;
    L.exits.forEach(function (e) { if (e.kind === 'fake') return; var d = Math.hypot(p.x - e.x, p.y - e.y); if (d < best) { best = d; target = e; } });
    if (L.orbs.some(function (o) { return !o.got; })) {
      var o = L.orbs.filter(function (o2) { return !o2.got; })[0];
      if (o) { target = { x: o.x, y: o.y, orb: true }; best = Math.hypot(p.x - o.x, p.y - o.y); }
    }
    if (!target) { EO.UI.say('No hay salida. Eso es un dato, no una amenaza.'); return; }

    var dx = target.x - p.x, dy = target.y - p.y;
    var hor = dx < -20 ? 'izquierda' : (dx > 20 ? 'derecha' : 'donde estás');
    var ver = dy < -40 ? 'arriba' : (dy > 40 ? 'abajo' : 'a tu altura');
    var types = ['sincera', 'incompleta', 'enganosa', 'invertida', 'desesperada'];
    var type = types[Math.floor(Math.random() * types.length)];
    var msg = '';

    if (type === 'sincera') {
      msg = 'Sinceridad: ' + hor + ', ' + ver + '. No lo repetiré.';
    } else if (type === 'incompleta') {
      msg = 'Está ' + ver + '. El resto te lo dejo de deberes.';
    } else if (type === 'enganosa') {
      var wrong = hor === 'izquierda' ? 'derecha' : (hor === 'derecha' ? 'izquierda' : 'abajo');
      msg = 'Lo tengo clarísimo: ' + wrong + '. Sí, sí. ' + wrong + '.';
    } else if (type === 'invertida') {
      var opp = hor === 'izquierda' ? 'derecha' : (hor === 'derecha' ? 'izquierda' : 'arriba');
      msg = 'Haz exactamente lo contrario de lo que voy a decir: ve a la ' + opp + '.';
    } else {
      if (best < 400) msg = 'Está ' + hor + ', ' + ver + '. Por favor. Por favor.';
      else msg = 'Yo que tú miraría ' + hor + '. Y no me hagas rogar.';
    }
    EO.UI.say(msg, { duration: 4600, who: 'EL OBSERVADOR · ' + EO.HELP_TYPES[type].toUpperCase() });
    EO.Audio.tone(520, 0.14, 'triangle', 0.14, 300);
    if (type === 'enganosa' || type === 'invertida') EO.Audio.trick();
  };

  /* ---------------------------------------------------------------
     MANDO — lectura en paralelo al teclado.
     Stick izq./cruceta = mover · A/B/X/Y = saltar · LB/RB = dash
     Start = pausa · Select = ayuda · en menús A/Start = botón principal
     --------------------------------------------------------------- */
  G.pollGamepad = function () {
    if (!navigator.getGamepads) return;
    var gps = navigator.getGamepads(), gp = null, i;
    for (i = 0; i < gps.length; i++) if (gps[i] && gps[i].connected) { gp = gps[i]; break; }
    if (!gp) {
      if (this.pad.connected) {
        this.pad.connected = false; this.pad.left = this.pad.right = this.pad.jump = false; this.pad.dash = false;
        EO.UI.toast('MANDO DESCONECTADO', 'Vuelves al teclado.');
      }
      return;
    }
    if (!this.pad.connected) {
      this.pad.connected = true;
      EO.UI.toast('MANDO CONECTADO', (gp.id || 'Gamepad').slice(0, 42));
      if (EO.Observe) EO.Observe.event('gamepad');
    }
    var b = gp.buttons || [], pr = function (n) { return !!(b[n] && b[n].pressed); };
    var ax = gp.axes[0] || 0, DEAD = 0.28;
    var jump = pr(0) || pr(1) || pr(2) || pr(3) || pr(12), start = pr(9), sel = pr(8);
    var dash = pr(4) || pr(5);
    this.pad.left = ax < -DEAD || pr(14);
    this.pad.right = ax > DEAD || pr(15);
    this.pad.dash = dash;
    if (jump && !this._pJump) {
      this.buffer = BUFFER;
      if (this.phaseName === 'intro') { var it = document.getElementById('interstitial'); if (it) it.click(); }
      else if (EO.UI.current === 'menu') { var mp = document.getElementById('m-play'); if (mp) mp.click(); }
      else if (EO.UI.current === 'result') { var rn = document.getElementById('r-next'); if (rn) rn.click(); }
    }
    if (start && !this._pStart) {
      if (this.phaseName === 'intro') { var it2 = document.getElementById('interstitial'); if (it2) it2.click(); }
      else if (EO.UI.current === 'menu') { var mp2 = document.getElementById('m-play'); if (mp2) mp2.click(); }
      else this.togglePause();
    }
    if (sel && !this._pSel) this.askHelp();
    this.pad.jump = jump; this._pJump = jump; this._pStart = start; this._pSel = sel;
  };

  G.initBoss = function () { /* sobrescrito por render.js / engine2.js */ };
  G.updateBoss = function () {};
  G.resetBoss = function () {};

  /* ============================================================
     MÚSICA ADAPTATIVA v3.2
     El Observador cambia de "mood" según tu estado y te lo dice.
     ============================================================ */
  EO.Music = {
    current: 'normal',
    noteIdx: 0,
    _tick: 0,
    _nextAt: 0,
    _lastLine: '',
    patterns: {
      normal:  { notes: [55, 82],                          type: 'sine',     interval: 0.55, vol: 0.030 },
      lullaby: { notes: [262, 330, 392, 330, 294, 262],    type: 'sine',     interval: 1.10, vol: 0.045 },
      silly:   { notes: [130, 175, 110, 165, 130, 196],    type: 'square',   interval: 0.42, vol: 0.045 },
      panic:   { notes: [220, 330, 440, 330],              type: 'sawtooth', interval: 0.16, vol: 0.040 },
      epic:    { notes: [262, 330, 392, 523, 392, 330],    type: 'triangle', interval: 0.32, vol: 0.055 },
      sad:     { notes: [440, 370, 294, 220, 196],         type: 'sine',     interval: 0.95, vol: 0.045 }
    },
    bases: { normal: 55, lullaby: 80, silly: 40, panic: 90, epic: 45, sad: 35 },
    lines: {
      lullaby: ['Te has parado. Te pongo música de cuna.', 'Música relajante. No servirá.', 'Relájate. Todo va a salir mal igualmente.'],
      silly:   ['Esto ya no tiene remedio. Cambio de tono.', 'Algo más alegre para tus fracasos.', 'Música de circo. Te pega.'],
      panic:   ['¡No! ¡No! ¡NO!', 'Algo se acerca. Y no soy yo.', 'Rápido. RÁPIDO.'],
      epic:    ['Casi. Música épica. La necesitas.', 'Se acerca el final. Al menos el tuyo.', 'Una más. Por favor.'],
      sad:     ['...', 'No digo nada. La música habla por mí.', 'Silencio. Solo la melodía.'],
      normal:  ['Volvemos a lo normal. Sea lo que sea.', 'Bien. Sin adornos.']
    },
    set: function (mood, silent) {
      if (this.current === mood) return;
      this.current = mood;
      this.noteIdx = 0;
      this._nextAt = this._tick;
      try {
        var Gm = EO.Game, base = this.bases[mood] || 55;
        if (mood === 'normal') base = (Gm && Gm.lvl && Gm.lvl.boss) ? 38 : 55 + Math.min(24, (Gm && Gm.levelNum) || 1);
        if (EO.Audio.drone) EO.Audio.setDrone(base);
      } catch (e) {}
      if (silent || !EO.UI) return;
      var arr = this.lines[mood];
      if (arr && arr.length) {
        var txt = arr[Math.floor(Math.random() * arr.length)];
        if (txt !== this._lastLine) {
          this._lastLine = txt;
          EO.UI.say(txt, { duration: 2800, who: 'EL OBSERVADOR · ♪' });
        }
      }
    },
    update: function (dt) {
      this._tick += dt;
      var pat = this.patterns[this.current];
      if (!pat) return;
      if (this._tick >= this._nextAt) {
        this._nextAt = this._tick + pat.interval;
        var f = pat.notes[this.noteIdx % pat.notes.length];
        this.noteIdx++;
        if (EO.Audio.enabled) EO.Audio.tone(f, pat.interval * 0.9, pat.type, pat.vol);
      }
    }
  };

  G.updateMusic = function (dt) {
    if (EO.Score && EO.Score.usable()) { EO.Score.drive(this, dt); return; }   // v3.3: pistas generadas con Python
    if (this.phaseName !== 'play' || !this.lvl || !this.lvl.player || this.paused || !EO.Audio.drone) {
      EO.Music.set('normal', true);
      return;
    }
    EO.Music.update(dt);
    this._musicCheck = (this._musicCheck || 0) + dt;
    if (this._musicCheck < 1.2) return;
    this._musicCheck = 0;

    var idle = this.idle || 0;
    if (this.boss && this.boss.state === 'aim') { EO.Music.set('panic'); return; }
    if (this.boss && this.boss.fooled >= (this.boss.hits - 1)) { EO.Music.set('epic'); return; }
    if (idle > 10) { EO.Music.set('lullaby'); return; }
    if (this.deaths >= 5 && Math.random() < 0.35) { EO.Music.set('silly'); return; }
    if (this.deaths >= 3 && Math.random() < 0.18) { EO.Music.set('sad'); return; }
    EO.Music.set('normal');
  };

  G.endingSequence = function () {
    var self = this;
    EO.Audio.stopDrone();
    EO.UI.hideAll();
    EO.UI.hideDialog();
    var el = document.getElementById('screen-end');
    var cr = document.getElementById('end-credits');
    document.getElementById('end-continue').classList.add('hidden');
    el.classList.remove('hidden');
    var lines = [
      '<div class="k">FINAL 5 — LA VERDAD</div>',
      '<p>Has llegado al final. El Observador ha dejado de mirarte.</p>',
      '<p>Durante todo este tiempo creíste que él controlaba las reglas.<br>Las reglas las escribiste tú cada vez que aceptaste una ayuda.</p>',
      '<div class="k" style="margin-top:18px">CRÉDITOS</div>',
      '<p>Diseño y dirección · tú<br>Hostigamiento psicológico · El Observador<br>Niveles que mienten · el Motor de Caos<br>Banda sonora · osciladores anónimos</p>'
    ];
    var i = 0;
    function step() {
      if (i < lines.length) { cr.innerHTML += lines[i++]; setTimeout(step, 1150); }
      else {
        cr.innerHTML += '<p class="blink" style="margin-top:20px; color:#fff">El Observador tiene algo más que decirte…</p>';
        setTimeout(function () {
          cr.innerHTML += '<p style="color:var(--glow); font-size:16px; letter-spacing:.08em">«¿De verdad pensaste que te iba a dejar ir?»</p>';
          document.getElementById('end-continue').classList.remove('hidden');
          EO.Audio.tone(60, 2.2, 'sawtooth', 0.3, 34);
          self.shake = 20;
          EO.Store.get().achv.truth = true;
          EO.Store.get().level = EO.STORY_END || 15;
          EO.Store.save();
        }, 2100);
      }
    }
    cr.innerHTML = '';
    step();
  };

  G.afterEnding = function () {
    EO.UI.hideAll();
    this.mode = 'infinito';
    this.levelNum = 16;
    this.deaths = 0;
    this.phaseName = 'play';
    EO.Audio.startDrone(42);
    this.loadLevel(16, true);
  };

})(window.EO);