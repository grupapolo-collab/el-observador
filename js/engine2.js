/* ============================================================================
   EL OBSERVADOR — engine2.js  (MOTOR AMPLIADO v2.1)
   Capa incremental sobre game.js / render.js. No reescribe nada: envuelve
   las funciones existentes y añade sistemas nuevos.
   ----------------------------------------------------------------------------
   v2.0.1: initBoss / updateBoss / resetBoss ahora hacen fallback a la
   implementación de render.js (Jefe I) cuando no hay BossDefs para el id
   del boss. Así el nivel 15 vuelve a tener jefe.
   ============================================================================ */
window.EO = window.EO || {};

(function (EO) {
  'use strict';

  var G = EO.Game;
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var dst = function (ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); };

  /* ==========================================================
     0 · ESTADO NUEVO
     ========================================================== */
  G.mirrorUntil = 0;
  G.mirrorCount = 0;
  G.padProg = 0;

  function L() { return G.lvl; }
  function P() { return G.lvl ? G.lvl.player : null; }

  /* ==========================================================
     1 · PLATAFORMAS NUEVAS (crumble / invisible al derrumbarse)
     ========================================================== */
  var origActive = G.platformActive;
  G.platformActive = function (pl) {
    if (pl.type === 'crumble') return !pl.gone;
    if (this.lvl && this.lvl.noFloor && pl.w > this.lvl.world.w * 0.7) return false;
    return origActive.call(this, pl);
  };

  var origUpdatePlatforms = G.updatePlatforms;
  G.updatePlatforms = function (dt) {
    origUpdatePlatforms.call(this, dt);
    var lv = L(); if (!lv) return;
    var p = lv.player;
    /* puertas móviles (mover): ahora de verdad suben y bajan */
    var exitsArr = lv.exits || [];
    for (var ee = 0; ee < exitsArr.length; ee++) {
      var eX = exitsArr[ee];
      if (eX.mover && eX.by != null) {
        /* la puerta flotan POR ENCIMA de su base y vuelve a bajar */
        eX.y = eX.by - (Math.sin(G.t * (eX.mover.speed || 1) + (eX.mover.phase || 0)) * 0.5 + 0.5) * eX.mover.amp;
      }
    }
    for (var i = 0; i < lv.platforms.length; i++) {
      var pl = lv.platforms[i];
      if (pl.type !== 'crumble') continue;
      if (pl.touch == null) pl.touch = 0;
      if (pl.gone) {
        pl.regen = (pl.regen || 2.6) - dt;
        if (pl.regen <= 0) { pl.gone = false; pl.touch = 0; }
        continue;
      }
      if (p && p.alive && p.standing === i && p.onGround) {
        pl.touch += dt;
        var d = pl.delay || 0.5;
        if (pl.touch > d) {
          pl.gone = true; pl.regen = 2.6; pl.touch = 0;
          this.shake = Math.max(this.shake, 6);
          this.burst(pl.x + pl.w / 2, pl.y, 12, '#c9c2ff', 160);
          EO.Audio.tone(180, 0.18, 'square', 0.1, 80);
        }
      } else if (pl.touch > 0) {
        pl.touch = Math.max(0, pl.touch - dt * 1.6);
      }
    }
  };

  /* ==========================================================
     2 · CASTIGO EN ESPEJO ("NO ERA ESA")
     ========================================================== */
  G.mirrorBack = function (why) {
    var lv = L(); if (!lv) return;
    var p = lv.player;
    this.mirrorCount++;
    this.mirrorUntil = this.t + 6.0;
    lv.rules.invert = true;
    p.x = p.spawnX; p.y = p.spawnY; p.vx = 0; p.vy = 0;
    p.onGround = false;
    this.shake = 14;
    this.deathFlash = 0.6;
    EO.Audio.trick();
    this.burst(p.x + p.w / 2, p.y + p.h / 2, 26, '#ff77aa', 260);
    EO.UI.toast('NO ERA ESA', 'Vuelves al principio. Mandos en espejo: <b>izquierda es derecha</b>.', 3600);
    if (this.mode !== 'silencio') EO.UI.say(EO.UI.quote('mirror_back'), { duration: 4200 });
    EO.Store.get().tricked = (EO.Store.get().tricked || 0) + 1;
    EO.Store.save();
    this.checkAchv('mirror3', this.mirrorCount >= 3);
    this.checkAchv('trickster', EO.Store.get().tricked >= 5);
    return why;
  };

  var origFakeDoor = G.fakeDoor;
  G.fakeDoor = function (ex) {
    if (ex.found) return;
    origFakeDoor.call(this, ex);
    this.mirrorBack('puerta');
  };

  /* ==========================================================
     3 · PELIGROS NUEVOS: pisones, láseres, fantasma, perseguidor
     ========================================================== */
  var origHazards = G.updateHazards;
  G.updateHazards = function (dt) {
    var lv = L(), p = lv && lv.player;
    if (!lv || !p || !p.alive || this.phaseName !== 'play') { origHazards.call(this, dt); return; }

    /* rescate si el suelo se ha abierto bajo tus pies (Jefe III) */
    if (lv.noFloor && p.y > lv.world.h - 150) {
      p.x = p.spawnX; p.y = p.spawnY - 40; p.vx = 0; p.vy = 0;
      this.shake = 12;
      EO.UI.toast('EL ARQUITECTO TE DEVUELVE', 'Reconstruye el suelo. Tú vuelves al principio.', 2400);
      EO.Audio.trick();
    }

    if (lv.crushers) {
      for (var i = 0; i < lv.crushers.length; i++) {
        var c = lv.crushers[i];
        var t = this.t * (c.speed || 1) + (c.phase || 0);
        c.cy = c.y + (Math.sin(t) * 0.5 + 0.5) * (c.amp || 220);
        var box = { x: c.x, y: c.cy, w: c.w, h: c.h };
        if (this.aabb(p, box)) { this.kill('crusher'); return; }
      }
    }
    if (lv.lasers) {
      for (var k = 0; k < lv.lasers.length; k++) {
        var lz = lv.lasers[k];
        var on = Math.sin((this.t / (lz.period || 2.8)) * Math.PI * 2 + (lz.offset || 0) * Math.PI * 2) > 0.15;
        lz.active = on;
        if (on && this.aabb(p, lz)) { this.kill('laser'); return; }
      }
    }
    if (lv.rules && lv.rules.timeGhost) {
      /* v3.4: el fantasma repite tu recorrido con 2 s de retraso REALES.
         Antes tomaba el índice 0 del historial (tu punto de salida) mientras había <150 fotogramas
         → nacía encima de ti y te mataba al empezar. Ahora no existe hasta que haya 2 s de pasado,
         tiene 1,2 s de gracia y se reinicia tras cada muerte. */
      if (!this.ghostHist || this._ghostDeaths !== this.deaths) { this.ghostHist = []; this.ghostT = 0; this.ghostPos = null; this._ghostArmed = false; this._ghostDeaths = this.deaths; }
      this.ghostT = (this.ghostT || 0) + dt;
      var gnow = this.ghostT, GDELAY = 2.0;
      this.ghostHist.push({ x: p.x, y: p.y, t: gnow });
      while (this.ghostHist.length > 2 && this.ghostHist[1].t < gnow - GDELAY) this.ghostHist.shift();
      var g = this.ghostHist[0];
      /* el fantasma solo se arma cuando te alejas 200 px de la salida: quedarte leyendo el cartel no es morir */
      if (!this._ghostArmed && Math.abs(p.x - (p.spawnX != null ? p.spawnX : lv.spawn.x)) > 200) this._ghostArmed = true;
      if (this._ghostArmed && gnow >= GDELAY && g && g.t <= gnow - GDELAY + 0.25) {
        this.ghostPos = { x: g.x, y: g.y };
        if (gnow > GDELAY + 1.2 && dst(g.x + 15, g.y + 20, p.x + 15, p.y + 20) < 30) { this.kill('time'); return; }
      } else { this.ghostPos = null; }
    }
    if (lv.rules && lv.rules.chaser) {
      if (!lv.chaser) lv.chaser = { x: p.spawnX - 200, y: p.spawnY, vx: 0, active: true };
      var ch = lv.chaser;
      var spd = lv.rules.chaser.speed || 96;
      var dx = (p.x + p.w / 2) - (ch.x + 22);
      ch.vx = clamp(dx * 1.1, -spd, spd);
      ch.x += ch.vx * dt;
      ch.y += ((p.y) - ch.y) * Math.min(1, dt * 1.6);
      this.chaserSurvive = (this.chaserSurvive || 0) + dt;
      this.checkAchv('chaser', this.chaserSurvive > 45);
      if (this.aabb({ x: ch.x, y: ch.y, w: 44, h: 46 }, p)) { this.kill('chaser'); return; }
    }

    origHazards.call(this, dt);
    if (this.phaseName !== 'play' || !p.alive) return;

    /* placas de memoria (nivel 19) */
    if (lv.pads && lv.pads.length && !lv.padDone) {
      for (var q = 0; q < lv.pads.length; q++) {
        var pad = lv.pads[q];
        if (this.aabb(p, { x: pad.x, y: pad.y - 10, w: pad.w, h: pad.h + 14 })) {
          if (pad.i === this.padProg + 1) {
            this.padProg++;
            EO.Audio.tone(520 + this.padProg * 90, 0.14, 'triangle', 0.16, 880);
            this.burst(pad.x + pad.w / 2, pad.y, 12, '#8ef4ff', 150);
            if (this.padProg >= lv.pads.length) {
              lv.padDone = true;
              lv.exits.forEach(function (e) { e.disabled = false; e.hidden = false; e.found = true; });
              EO.UI.toast('ORDEN CORRECTO', 'La salida existe ahora. No antes.', 3200);
              EO.UI.say('Cuatro de cuatro. Y sólo has tenido que pensar.', { duration: 3200 });
            }
          } else if (pad.i !== this.padProg) {
            this.padProg = 0;
            this.shake = 8;
            EO.Audio.trick();
            EO.UI.toast('ORDEN ROTO', 'Empieza otra vez: 1 → 2 → 3 → 4.', 2400);
          }
        }
      }
    }

    /* jaulas (nivel 24) */
    if (lv.cages) {
      for (var w = 0; w < lv.cages.length; w++) {
        var cg = lv.cages[w];
        if (cg.freed) continue;
        if (this.aabb(p, cg)) {
          if (cg.trap) {
            cg.trap = false; cg.freed = true;
            this.mirrorBack('jaula');
          } else {
            cg.freed = true;
            EO.Audio.orb();
            this.burst(cg.x + cg.w / 2, cg.y + cg.h / 2, 18, '#6bffb4', 200);
            var left = lv.cages.filter(function (x) { return !x.freed; }).length;
            EO.UI.toast('CERRADURA ABIERTA', left > 0 ? 'Quedan ' + left + '. Sigue.' : 'Las tres. La puerta te espera.', 2200);
            if (left === 0) lv.exits.forEach(function (e) { e.disabled = false; });
          }
        }
      }
    }

    /* gemelo (nivel 21) */
    if (lv.rules.twin && lv.twinPads) {
      var mid = lv.world.w / 2;
      var gp = { x: mid * 2 - (p.x + p.w) + 0, y: p.y, w: p.w, h: p.h };
      this.twinPos = gp;
      var onA = this.aabb(p, lv.twinPads[0]);
      var onB = this.aabb(gp, lv.twinPads[1]);
      if (onA && onB && !lv.twinDone) {
        lv.twinDone = true;
        lv.exits.forEach(function (e) { e.disabled = false; });
        EO.UI.toast('SINCRONÍA', 'Los dos a la vez. La puerta se abre.', 2600);
        this.burst(p.x + p.w / 2, p.y, 20, '#8ef4ff', 220);
      }
    }

    /* espejo temporal: al acabar, devolver los mandos */
    if (this.mirrorUntil && this.t > this.mirrorUntil) {
      this.mirrorUntil = 0;
      if (!lv.mirrorLvl) lv.rules.invert = false;
      EO.UI.toast('MANDOS RESTAURADOS', 'Ya puedes volver a confiar en tu izquierda.', 2200);
    }
  };

  /* ==========================================================
     4 · JEFES: DESPACHO CON FALLBACK A JEFE I  (v2.0.1)
     Guardamos la implementación original de render.js antes de
     sobrescribir, y la usamos cuando no hay BossDefs para el boss.
     ========================================================== */
  var origInitBoss   = G.initBoss;    // render.js — Jefe I
  var origResetBoss  = G.resetBoss;   // render.js — Jefe I
  var origUpdateBoss = G.updateBoss;  // render.js — Jefe I

  G.initBoss = function (lv) {
    var def = EO.BossDefs && EO.BossDefs[lv.boss];
    if (!def) {
      // sin definición: usar la implementación original (Jefe I)
      if (typeof origInitBoss === 'function') return origInitBoss.call(this, lv);
      return;
    }
    this.boss = def.init(this, lv);
    this.boss.hits = this.boss.hits || 3;
    if (lv._bossHits) this.boss.hits = lv._bossHits;   // infinito: los jefes aguantan más
    this.boss.tick = 0;
  };
  G.resetBoss = function () {
    var def = this.boss && EO.BossDefs && EO.BossDefs[this.boss.id];
    if (def && def.reset) { def.reset(this, this.boss); return; }
    if (typeof origResetBoss === 'function') origResetBoss.call(this);
  };
  G.updateBoss = function (dt) {
    var def = this.boss && EO.BossDefs && EO.BossDefs[this.boss.id];
    if (def && def.update) { def.update(this, this.boss, dt); return; }
    if (typeof origUpdateBoss === 'function') origUpdateBoss.call(this, dt);
  };

  var origBossArena = G.drawBossArena;
  G.drawBossArena = function (ctx, th) {
    var b = this.boss;
    if (!b) return;
    var def = EO.BossDefs && EO.BossDefs[b.id];
    if (def) {
      def.draw(this, ctx, th);
      // HUD del jefe, en coordenadas de pantalla
      ctx.save();
      ctx.translate(this.cam.x, this.cam.y);
      var w = 300, x = EO.VW / 2 - w / 2, y = EO.VH - 54;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(6,4,16,.72)';
      ctx.fillRect(x, y, w, 30);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, 30);
      ctx.font = '700 11px ui-monospace,monospace';
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, x + w / 2, y + 12);
      for (var i = 0; i < b.hits; i++) {
        ctx.beginPath();
        ctx.arc(x + w / 2 - (b.hits - 1) * 12 + i * 24, y + 22, 6, 0, 6.283);
        ctx.fillStyle = i < b.fooled ? '#6bffb4' : 'rgba(255,255,255,.18)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.stroke();
      }
      ctx.textAlign = 'left';
      ctx.restore();
    } else {
      // Jefe I u otro sin BossDefs: delegar a render.js
      origBossArena.call(this, ctx, th);
    }
  };

  /* ==========================================================
     5 · DIBUJO EXTRA  (se engancha dentro de la cámara)
     ========================================================== */
  var origDrawBolts = G.drawBolts;
  G.drawBolts = function (ctx) {
    var lv = L();
    if (lv) {
      if (lv.crushers) for (var i = 0; i < lv.crushers.length; i++) {
        var c = lv.crushers[i];
        var cy = c.cy == null ? c.y : c.cy;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,.10)';
        ctx.fillRect(c.x, c.y - 2, c.w, (cy - c.y) + 2);
        var g = ctx.createLinearGradient(0, cy, 0, cy + c.h);
        g.addColorStop(0, 'rgba(255,120,150,.95)');
        g.addColorStop(1, 'rgba(40,10,30,.95)');
        ctx.fillStyle = g;
        ctx.fillRect(c.x, cy, c.w, c.h);
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
        ctx.strokeRect(c.x, cy, c.w, c.h);
        ctx.fillStyle = '#ff6b8a';
        ctx.beginPath();
        for (var k = 0; k < 5; k++) {
          var xx = c.x + k * (c.w / 5);
          ctx.moveTo(xx, cy + c.h); ctx.lineTo(xx + c.w / 10, cy + c.h + 16); ctx.lineTo(xx + c.w / 5, cy + c.h);
        }
        ctx.fill();
        ctx.restore();
      }
      if (lv.lasers) for (var j = 0; j < lv.lasers.length; j++) {
        var lz = lv.lasers[j];
        ctx.save();
        if (lz.active) {
          var lg = ctx.createLinearGradient(lz.x, 0, lz.x + lz.w, 0);
          lg.addColorStop(0, 'rgba(255,60,60,0)');
          lg.addColorStop(0.5, 'rgba(255,120,120,.9)');
          lg.addColorStop(1, 'rgba(255,60,60,0)');
          ctx.fillStyle = lg;
          ctx.fillRect(lz.x - 8, 0, lz.w + 16, lz.h);
        } else {
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 1.5;
          ctx.setLineDash([10, 12]);
          ctx.beginPath(); ctx.moveTo(lz.x + lz.w / 2, 0); ctx.lineTo(lz.x + lz.w / 2, lz.h); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }
      if (lv.pads) for (var q = 0; q < lv.pads.length; q++) {
        var pad = lv.pads[q], done = lv.padDone || pad.i <= this.padProg;
        ctx.save();
        ctx.fillStyle = done ? 'rgba(107,255,180,.32)' : 'rgba(255,255,255,.08)';
        ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
        ctx.strokeStyle = done ? '#6bffb4' : 'rgba(255,255,255,.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);
        ctx.fillStyle = done ? '#0a0818' : 'rgba(255,255,255,.8)';
        ctx.font = '700 13px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(pad.i), pad.x + pad.w / 2, pad.y + 17);
        ctx.textAlign = 'left';
        ctx.restore();
      }
      if (lv.cages) for (var w = 0; w < lv.cages.length; w++) {
        var cg = lv.cages[w];
        ctx.save();
        ctx.strokeStyle = cg.freed ? 'rgba(107,255,180,.9)' : 'rgba(255,255,255,.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(cg.x, cg.y, cg.w, cg.h);
        for (var bb = 1; bb < 5; bb++) {
          ctx.beginPath();
          ctx.moveTo(cg.x + (cg.w / 5) * bb, cg.y);
          ctx.lineTo(cg.x + (cg.w / 5) * bb, cg.y + cg.h);
          ctx.stroke();
        }
        if (!cg.freed) {
          ctx.globalAlpha = 0.5 + Math.sin(this.t * 3 + w) * 0.3;
          ctx.fillStyle = '#ff6bd6';
          ctx.beginPath(); ctx.arc(cg.x + cg.w / 2, cg.y + cg.h / 2, 7, 0, 6.283); ctx.fill();
        }
        ctx.restore();
      }
      if (lv.rules.twin && this.twinPos) {
        var gp = this.twinPos;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#8ef4ff';
        ctx.shadowColor = '#8ef4ff'; ctx.shadowBlur = 20;
        ctx.fillRect(gp.x, gp.y, gp.w, gp.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#001018';
        ctx.fillRect(gp.x + 7, gp.y + 12, 4, 5);
        ctx.fillRect(gp.x + 18, gp.y + 12, 4, 5);
        ctx.restore();
        for (var tp = 0; tp < lv.twinPads.length; tp++) {
          var pd = lv.twinPads[tp];
          ctx.save();
          ctx.strokeStyle = lv.twinDone ? '#6bffb4' : 'rgba(142,244,255,.8)';
          ctx.lineWidth = 2;
          ctx.strokeRect(pd.x, pd.y, pd.w, pd.h);
          ctx.restore();
        }
      }
      if (lv.rules.timeGhost && this.ghostPos) {
        var gh = this.ghostPos;
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(this.t * 6) * 0.15;
        ctx.fillStyle = '#ff7ad9';
        ctx.shadowColor = '#ff7ad9'; ctx.shadowBlur = 22;
        ctx.fillRect(gh.x, gh.y, 30, 40);
        ctx.restore();
      }
      if (lv.chaser) {
        var ch = lv.chaser;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#05030c';
        ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 30;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(ch.x, ch.y, 44, 46, 10); else ctx.rect(ch.x, ch.y, 44, 46);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff2d55';
        ctx.fillRect(ch.x + 11, ch.y + 16, 6, 5);
        ctx.fillRect(ch.x + 27, ch.y + 16, 6, 5);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ff2d55';
        ctx.fillRect(ch.x - 26, ch.y + 6, 22, 34);
        ctx.restore();
      }
      for (var pi = 0; pi < lv.platforms.length; pi++) {
        var ppl = lv.platforms[pi];
        if (ppl.type !== 'crumble') continue;
        ctx.save();
        ctx.globalAlpha = ppl.gone ? 0.12 : 0.35 + (ppl.touch || 0) * 0.9;
        ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.4;
        for (var cr = 0; cr < 4; cr++) {
          var cx0 = ppl.x + 12 + cr * (ppl.w / 4.4);
          ctx.beginPath();
          ctx.moveTo(cx0, ppl.y);
          ctx.lineTo(cx0 + 7, ppl.y + ppl.h * 0.6);
          ctx.lineTo(cx0 - 4, ppl.y + ppl.h);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    origDrawBolts.call(this, ctx);
  };

  var origDrawPlatforms = G.drawPlatforms;
  G.drawPlatforms = function (ctx, th) {
    if (this.lvl && this.lvl.noFloor) {
      var hidden = this.lvl.platforms.filter(function (p) { return p.w > G.lvl.world.w * 0.7; });
      hidden.forEach(function (p) { p._w = p.w; p.w = 0; });
      origDrawPlatforms.call(this, ctx, th);
      hidden.forEach(function (p) { p.w = p._w; });
      return;
    }
    origDrawPlatforms.call(this, ctx, th);
  };

  /* ==========================================================
     6 · CAOS v2.1 — AMPLIFICADOR DE NIVELES
     · Pasillo de caos: alarga cada nivel antes de la salida real
     · La puerta que perseguías puede convertirse en PUERTA FALSA
     · Trampas re-sembradas en CADA intento (no memorizable)
     · Infinito: escalado continuo, combinado y SIN LÍMITE
     ========================================================== */
  function mulberry32(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  EO.Chaos = {
    /* semilla por (partida, nivel, intento): el mismo nivel NUNCA
       se juega igual dos veces → imposible memorizarlo */
    seedFor: function (Gm, num) {
      /* desafío diario: misma semilla para todo el mundo, sin intento */
      if (Gm.mode === 'diario' && Gm.dailySeed) return ((Gm.dailySeed ^ (num * 9176)) >>> 0) || 1;
      var run = Gm.runSeed || (Gm.runSeed = (Math.random() * 1e9) | 0);
      return ((run ^ (num * 9176) ^ ((Gm.attemptN || 0) * 7919)) >>> 0) || 1;
    },
    /* caos continuo: historia suave, infinito sin techo */
    chaosOf: function (mode, num) {
      if (mode === 'story') return Math.min(0.5, 0.16 + num * 0.022);
      if (mode === 'diablo') return Math.min(0.8, 0.3 + num * 0.025);
      return Math.min(1, 0.34 + num * 0.026);
    },

    amplify: function (def, num, R, chaos, mode) {
      if (!def || def.boss || def._amp) return def;
      def._amp = true;
      def.signs = def.signs || [];
      def.spikes = def.spikes || [];
      def.extraExits = def.extraExits || [];

      var goalT = def.goal && def.goal.type;
      var twin = !!(def.rules && def.rules.twin);
      var flip = !!(def.rules && def.rules.gravity < 0);
      var noJ = !!(def.rules && def.rules.canJump === false);
      var simple = goalT === 'wait' || goalT === 'altar' || twin || flip;

      var segs = simple ? 0 : (2 + Math.min(6, Math.round(0.6 + num * 0.14)));
      var W = def.world.w;
      var ex = def.exit;
      var side = (ex && ex.x + ex.w / 2 < W / 2) ? -1 : 1;

      /* salida a la izquierda → desplazamos el nivel a la derecha
         y construimos el pasillo hacia la izquierda */
      if (side < 0 && segs > 0) {
        var shift = segs * 420 + 240;
        def.world.w = W + shift;
        var sh = function (o) { o.x += shift; };
        def.platforms.forEach(sh);
        ['spikes', 'orbs', 'signs', 'extraExits', 'lasers', 'crushers', 'pads', 'cages', 'twinPads', 'altars'].forEach(function (kk) {
          (def[kk] || []).forEach(sh);
        });
        (def.blades || []).forEach(function (b) { b.x = (b.x || 0) + shift; });
        if (def.spawn) def.spawn.x += shift;
        if (ex) ex.x += shift;
        W = def.world.w;
      }

      if (segs > 0) {
        var anchorX = side > 0 ? 0 : W;
        var i, pl;
        for (i = 0; i < def.platforms.length; i++) {
          pl = def.platforms[i];
          var edge = side > 0 ? pl.x + pl.w : pl.x;
          anchorX = side > 0 ? Math.max(anchorX, edge) : Math.min(anchorX, edge);
        }
        var anchorY = null;
        if (ex) {
          var eb = ex.y + ex.h;
          for (i = 0; i < def.platforms.length; i++) {
            pl = def.platforms[i];
            if (ex.x + ex.w / 2 >= pl.x && ex.x + ex.w / 2 <= pl.x + pl.w && Math.abs(eb - pl.y) < 90) { anchorY = pl.y; break; }
          }
        }
        if (anchorY == null) anchorY = clamp(def.spawn ? def.spawn.y + 44 : def.world.h - 220, 200, def.world.h - 200);

        var yMin = Math.max(170, Math.min(anchorY - 190, def.world.h - 200));
        var yMax = Math.min(def.world.h - 200, anchorY + 190);
        if (yMin > yMax) { yMin = yMax = anchorY; }

        var x = anchorX, y = anchorY, lastSeg = null;
        for (var s2 = 0; s2 < segs; s2++) {
          var gap = noJ ? 0 : (112 + R() * 52);
          var pw = noJ ? (260 + R() * 120) : (150 + R() * 110);
          if (side < 0 && x - gap - pw < 70) break;
          if (side > 0 && x + gap + pw > 6800) break;
          y = clamp(y + (R() - 0.45) * 130, yMin, yMax);
          var r2 = R(), type = 'solid';
          if (!noJ && r2 < chaos * 0.5) type = 'crumble';
          else if (!noJ && r2 < chaos * 0.5 + chaos * 0.22) type = 'phase';
          var segX = Math.round(side > 0 ? x + gap : x - gap - pw);
          var seg = { x: segX, y: Math.round(y), w: Math.round(pw), h: type === 'solid' ? 200 : 26, type: type };
          if (type === 'crumble') seg.delay = Math.max(0.28, 0.6 - chaos * 0.4);
          if (type === 'phase') { seg.period = 2.1 + R() * 1.5; seg.offset = R(); }
          def.platforms.push(seg);
          lastSeg = seg;
          if (noJ && R() < 0.6) {
            def.spikes.push({ x: Math.round(segX + 20 + R() * (pw - 110)), y: Math.round(seg.y - 24), w: Math.round(60 + R() * 50), h: 26, period: 1.5 + R() * 1.3, offset: R() });
          } else if (!noJ && y > def.world.h - 340 && chaos > 0.24 && R() < 0.55) {
            var sx0 = side > 0 ? x + 4 : segX + pw + 4;
            def.spikes.push({ x: Math.round(sx0), y: def.world.h - 130, w: Math.round(gap - 8), h: 118 });
          }
          x = side > 0 ? segX + pw : segX;
        }
        if (side > 0) def.world.w = Math.max(def.world.w, Math.round(x + 620));

        if (lastSeg) {
          if (ex) {
            /* TROLLEO: la puerta que perseguías puede quedar como falsa */
            if (chaos >= 0.38 && R() < 0.8) {
              def.extraExits.push({ x: ex.x, y: ex.y, w: ex.w || 54, h: ex.h || 92, kind: 'fake' });
              def.signs.push({ x: clamp(ex.x - 170 * side, 30, def.world.w - 220), y: ex.y + 40, text: 'SALIDA ✓', truth: false });
            }
            if (ex.mover) ex.mover.amp = Math.min(ex.mover.amp || 0, 170);  // conserva el vaivén, con salto alcanzable
            ex.x = Math.round(lastSeg.x + lastSeg.w / 2 - 27);
            ex.y = Math.round(lastSeg.y - 92);
            ex.kind = 'real'; ex.found = false;
          } else {
            def.exit = { x: Math.round(lastSeg.x + lastSeg.w / 2 - 27), y: Math.round(lastSeg.y - 92), w: 54, h: 92, kind: 'real' };
          }
          /* puerta falsa intermedia en el pasillo */
          if (segs > 2 && chaos > 0.66 && R() < 0.55) {
            var fs = def.platforms[def.platforms.length - 2 - Math.floor(R() * 2)];
            def.extraExits.push({ x: Math.round(fs.x + fs.w / 2 - 27), y: Math.round(fs.y - 92), w: 54, h: 92, kind: 'fake' });
          }
          /* láser del pasillo */
          var spanL = Math.abs(x - anchorX);
          if (chaos > 0.35 && segs > 1 && spanL > 460) {
            def.lasers = def.lasers || [];
            def.lasers.push({ x: Math.round(anchorX + side * (240 + R() * (spanL - 420))), y: 0, w: 42, h: def.world.h, period: Math.max(1.1, 2.7 - chaos * 1.4), offset: R() });
          }
          /* pisón del pasillo */
          if (chaos > 0.55 && !flip && spanL > 520) {
            def.crushers = def.crushers || [];
            def.crushers.push({ x: Math.round(anchorX + side * (300 + R() * (spanL - 460))), y: 130, w: 110, h: 140, amp: 300, speed: 0.9 + chaos * 0.9, phase: R() * 6 });
          }
        }
      }

      /* --- escalado global (infinito / descenso / diario): SIN LÍMITE --- */
      if (mode !== 'story' && mode !== 'diablo' && goalT !== 'wait') {
        var k = num;
        def.platforms.forEach(function (pl2, idx) {
          if (pl2.type === 'solid' && idx > 0 && k >= 5 && R() < Math.min(0.6, 0.10 + k * 0.015)) {
            pl2.type = 'crumble'; pl2.delay = Math.max(0.25, 0.6 - k * 0.005);
          }
        });
        def.lasers = def.lasers || [];
        var nl = 1 + Math.floor(k / 6);
        for (var li = 0; li < nl; li++) {
          var lx = 420 + R() * Math.max(220, def.world.w - 720);
          var dup = false;
          for (var q = 0; q < def.lasers.length; q++) if (Math.abs(def.lasers[q].x - lx) < 150) { dup = true; break; }
          if (!dup) def.lasers.push({ x: Math.round(lx), y: 0, w: 40 + Math.round(R() * 22), h: def.world.h, period: Math.max(0.55, 3.0 - k * 0.035), offset: R() });
        }
        if (k >= 7 && !flip) {
          def.crushers = def.crushers || [];
          var nc = Math.min(8, 1 + Math.floor((k - 5) / 3));
          for (var ci = 0; ci < nc; ci++) {
            var cx0 = 300 + R() * Math.max(240, def.world.w - 620);
            var dup2 = false;
            for (var q2 = 0; q2 < def.crushers.length; q2++) if (Math.abs(def.crushers[q2].x - cx0) < 140) { dup2 = true; break; }
            if (!dup2) def.crushers.push({ x: Math.round(cx0), y: 130, w: 100 + Math.round(R() * 40), h: 130 + Math.round(R() * 30), amp: 280 + R() * 60 + k * 2, speed: 0.85 + k * 0.045, phase: R() * 6 });
          }
        }
        /* perseguidor: velocidad SIN TOPE (te alcanza si te descuidas) */
        if (k >= 9) def.rules.chaser = { speed: 80 + k * 5.0 };
        /* ciclos de espejo: cada 7 niveles, mandos invertidos */
        if (k >= 14 && !def.rules.invert && k % 7 === 0) def.rules.invert = true;
        (def.spikes || []).forEach(function (s) {
          if (s.period) s.period = Math.max(0.8, s.period - k * 0.02);
          else if (s.h > 40) { s.period = Math.max(1.0, 3.2 - k * 0.04); s.offset = R(); }
        });
        if (k % 5 === 0) def.intro = 'Cinco niveles más y esto ya no se llama juego. Se llama penitencia.';
      }
      return def;
    },

    /* tras cada muerte, las trampas CAMBIAN de ritmo y de posición
       relativa: memorizar el timing no sirve de nada */
    pulse: function () {
      var Gm = EO.Game, lv = Gm.lvl;
      if (!lv) return;
      var R = mulberry32((EO.Chaos.seedFor(Gm, Gm.levelNum) ^ ((Gm.deaths || 0) * 131)) >>> 0);
      (lv.lasers || []).forEach(function (lz) { lz.offset = R(); lz.period = Math.max(0.7, lz.period * (0.9 + R() * 0.2)); });
      (lv.crushers || []).forEach(function (c) { c.phase = R() * 6; c.speed = Math.max(0.5, c.speed * (0.92 + R() * 0.2)); });
      (lv.spikes || []).forEach(function (s) { if (s.period) { s.offset = R(); s.period = Math.max(0.8, s.period * (0.9 + R() * 0.2)); } });
    }
  };

  var origGetLevelDef = G.getLevelDef;

  function bossLevelFor(n) {
    var order = [20, 22, 25, 28, 30, 20, 22, 25, 28, 30];
    var baseNum = order[Math.floor(n / 10 - 1) % order.length] || 20;
    var base = EO.levelByNumber(baseNum);
    if (!base) return null;
    var def = JSON.parse(JSON.stringify(base));
    def.num = n;
    def.name = def.name + ' · ' + n;
    def.subtitle = 'Versión ' + (Math.floor(n / 10)) + '. Más rápida. Menos justa.';
    def._bossHits = 3 + Math.floor(n / 30);
    return def;
  }

  /* UNIFICADO: historia hecha a mano + pasillo de caos;
     resto de modos: generador + pasillo + escalado sin límite */
  G.getLevelDef = function (num) {
    var def;
    if (this.mode === 'story') {
      var hand = EO.levelByNumber(num);
      def = hand ? JSON.parse(JSON.stringify(hand)) : origGetLevelDef.call(this, num);
    } else {
      def = origGetLevelDef.call(this, num);
      if (this.mode === 'diablo' && EO.Trolls && EO.Trolls.eligible) {
        for (var rt = 0; rt < 10 && !EO.Trolls.eligible(def); rt++) def = origGetLevelDef.call(this, num);
      }
      if (this.mode === 'infinito' && num % 10 === 0) {
        var bl = bossLevelFor(num);
        if (bl) return bl;
      }
    }
    if (def && !def.boss) {
      var Rc = mulberry32(EO.Chaos.seedFor(this, num));
      EO.Chaos.amplify(def, num, Rc, EO.Chaos.chaosOf(this.mode, num), this.mode);
    }
    return def;
  };

  /* tras cada muerte, las trampas se re-colocan */
  var origKill = G.kill;
  G.kill = function (cause) {
    origKill.call(this, cause);
    if (this.phaseName === 'dead' && EO.Chaos.pulse) EO.Chaos.pulse();
  };

  /* ==========================================================
     7 · FINAL: seis finales encadenados
     ========================================================== */
  G.endingSequence = function () {
    var self = this;
    EO.Audio.stopDrone();
    EO.UI.hideAll();
    EO.UI.hideDialog();
    document.body.classList.remove('mute-hud');
    var el = document.getElementById('screen-end');
    var cr = document.getElementById('end-credits');
    document.getElementById('end-continue').classList.add('hidden');
    el.classList.remove('hidden');
    var lines = [
      '<div class="k">FINAL 6 — EL OBSERVADOR</div>',
      '<p>Has derrotado a los seis. Tu sombra, el arquitecto, el silencio, el tiempo y él.</p>',
      '<p>Lo único que no has derrotado es la costumbre de mirar arriba esperando instrucciones.<br>Y eso, técnicamente, es la victoria.</p>',
      '<div class="k" style="margin-top:18px">CRÉDITOS</div>',
      '<p>Diseño y dirección · tú<br>Hostigamiento psicológico · El Observador<br>Niveles que mienten · el Motor de Caos<br>Inexistencia · osciladores anónimos</p>'
    ];
    var i = 0;
    function step() {
      if (i < lines.length) { cr.innerHTML += lines[i++]; setTimeout(step, 1150); }
      else {
        cr.innerHTML += '<p class="blink" style="margin-top:20px;color:#fff">El Observador tiene algo más que decirte…</p>';
        setTimeout(function () {
          cr.innerHTML += '<p style="color:var(--glow); font-size:16px; letter-spacing:.08em">«¿De verdad pensaste que te iba a dejar ir?»</p>' +
            '<p style="opacity:.8">Modo Infinito desbloqueado. Ahora la sombra va detrás de ti. Y acelera.</p>';
          document.getElementById('end-continue').classList.remove('hidden');
          EO.Audio.tone(60, 2.2, 'sawtooth', 0.3, 34);
          self.shake = 20;
          EO.Store.get().achv.truth = true;
          EO.Store.get().level = EO.STORY_END;
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
    this.levelNum = 1;
    this.deaths = 0;
    this.chaserSurvive = 0;
    this.phaseName = 'play';
    EO.Audio.startDrone(42);
    this.loadLevel(1, true);
  };

  /* ==========================================================
     8 · REINICIO LIMPIO AL CARGAR NIVEL
     ========================================================== */
  var origLoad = G.loadLevel;
  G.loadLevel = function (num, showIntro, retry) {
    this.attemptN = (this.attemptN || 0) + 1;   // cada intento = trampas nuevas
    this.padProg = 0;
    this.mirrorCount = 0;
    this.mirrorUntil = 0;
    this.ghostHist = [];
    this.chaserSurvive = 0;
    document.body.classList.remove('mute-hud');
    origLoad.call(this, num, showIntro, retry);
    var lv = this.lvl;
    if (!lv) return;
    lv.mirrorLvl = !!(lv.rules && lv.rules.invert);
    if (lv.cages && lv.cages.length) {
      var t = Math.floor(Math.random() * lv.cages.length);
      lv.cages.forEach(function (c, i) { c.trap = i === t; c.freed = false; });
    }
    if (lv.rules && lv.rules.chaser) this.chaserSurvive = 0;
    if (this.mode === 'silencio') document.body.classList.add('mute-hud');
  };

})(window.EO);

/* ============================================================================
   9 · ARRANQUE RÁPIDO POR URL (para probar niveles y jefes sin jugar 15)
      el-observador.html#level=15   → prueba el Jefe I
      el-observador.html#level=20   → prueba el Jefe II
      el-observador.html#mode=infinito&level=12
   ============================================================================ */
window.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    try {
      var h = (location.hash || '').replace('#', '');
      if (!h) return;
      var q = {};
      h.split('&').forEach(function (kv) {
        var p = kv.split('=');
        if (p[0]) q[p[0]] = decodeURIComponent(p[1] || '');
      });
      if (!q.level && !q.mode) return;
      var G2 = EO.Game;
      EO.UI.hideAll();
      G2.mode = q.mode || 'story';
      G2.runSeed = (Math.random() * 1e9) | 0; G2.attemptN = 0;
      if (G2.mode === 'diario') { var dd = new Date(); G2.dailySeed = dd.getFullYear() * 10000 + (dd.getMonth() + 1) * 100 + dd.getDate(); }
      G2.levelNum = parseInt(q.level || '1', 10) || 1;
      G2.deaths = 0;
      G2.phaseName = 'play';
      EO.Audio.startDrone(50);
      G2.loadLevel(G2.levelNum, q.intro === '1');
      if (q.skip === '1') {
        var el = document.getElementById('interstitial');
        if (el) el.classList.add('hidden');
        G2.phaseName = 'play';
      }
    } catch (e) { /* modo normal */ }
  }, 60);
});

/* ============================================================================
   10 · HISTORIA DE 30 NIVELES (parche de progresión)  [CORREGIDO v2.0.1]
   ============================================================================ */
(function (EO) {
  'use strict';
  var G = EO.Game;

  var origStart = G.start;
  G.start = function (mode) {
    this.runSeed = (Math.random() * 1e9) | 0;   // nueva semilla de partida
    this.attemptN = 0;
    origStart.call(this, mode);
    if (mode === 'story') {
      var s = EO.Store.get();
      var n = Math.max(1, Math.min(s.level || 1, EO.STORY_END));
      if (n !== this.levelNum) this.loadLevel(n, true);   // (red de seguridad; game.js ya clampa a STORY_END)
    }
  };

  var origNext = G.next;
  G.next = function () {
    // En el nivel final de la historia → lanzar FINAL 6
    if (this.mode === 'story' && this.levelNum >= EO.STORY_END) { this.endingSequence(); return; }
    origNext.call(this);
  };

  var origComplete = G.complete;
  G.complete = function () {
    var isFinal = this.mode === 'story' && this.levelNum >= EO.STORY_END;
    if (isFinal) {
      // evitar que complete() lance endingSequence ANTES de que el user pulse Next
      this.mode = 'story-final';
    }
    origComplete.call(this);
    if (isFinal) {
      this.mode = 'story';
      this.levelNum = EO.STORY_END;
    }
  };

  var origLoad3 = G.loadLevel;
  G.loadLevel = function (num, a, b) {
    origLoad3.call(this, num, a, b);
    if (!this.lvl || !this.lvl.boss) return;
    var map = { sombra: 'boss_sombra', arquitecto: 'boss_arquitecto', silencio: 'boss_silencio', tiempo: 'boss_tiempo', observador: 'boss_observador' };
    this._bossAchv = map[this.lvl.boss] || null;
  };

  var origCheck = G.checkGoal;
  G.checkGoal = function (dt) {
    origCheck.call(this, dt);
    if (this.phaseName === 'win' && this._bossAchv) this.checkAchv(this._bossAchv, true);
  };
})(window.EO);