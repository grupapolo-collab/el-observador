/* ============================================================================
   EL OBSERVADOR — bosses.js  (JEFES II–VI)
   Cada jefe: máquina de estados propia, patrón de ataque real y una condición
   de derrota que exige pensar (no spamear saltos).
     II  TU SOMBRA      · tu sombra repite tus pasos con retraso; la luz la quema
     III EL ARQUITECTO  · señala cuatro placas, abre el suelo, sólo una es real
     IV  EL SILENCIO    · te quita la interfaz y el sonido; muérete si te mueves
     V   EL TIEMPO      · rebobina el mundo; anclarse en el momento justo le cuesta
     VI  EL OBSERVADOR  · finge perder, clona, miente y luego te hace elegir
   ============================================================================ */
window.EO = window.EO || {};

(function (EO) {
  'use strict';

  var G = EO.Game;
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var dst = function (ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); };

  var D = EO.BossDefs = {};

  /* ------------------------------------------------------------- helpers */
  function registerHit(G, b, line) {
    b.fooled++;
    G.shake = 18;
    EO.Audio.trick();
    var p = G.lvl.player;
    G.burst(p.x + p.w / 2, p.y + p.h / 2, 26, '#7cffd4', 260);
    EO.UI.toast('GOLPE ' + b.fooled + ' / ' + b.hits, line || 'El jefe ha fallado. Otra vez.');
    if (b.fooled >= b.hits) defeatBoss(G, b);
  }

  function defeatBoss(G, b) {
    if (b.state === 'defeated') return;
    b.state = 'defeated';
    G.winFlash = 1;
    G.shake = 24;
    EO.Audio.boss();
    EO.UI.say(EO.UI.quote('boss_win'), { duration: 5200 });
    setTimeout(function () { if (G.phaseName === 'play') G.complete(); }, 2100);
  }

  function floorTop(L) {
    var f = null;
    for (var i = 0; i < L.platforms.length; i++) {
      if (L.platforms[i].w > L.world.w * 0.7) { f = L.platforms[i]; break; }
    }
    return f ? f.y : L.world.h - 80;
  }

  function say(G, text, ms) {
    if (G.mode === 'silencio') return;
    EO.UI.say(text, { duration: ms || 2600 });
  }

  function bars(ctx, w, h, color) {
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
    ctx.fillStyle = color;
  }

  /* ==========================================================================
     II · TU SOMBRA
     ========================================================================== */
  D.sombra = {
    name: 'TU SOMBRA',
    hint: 'La luz quema a los dos. Entra en el haz y sal ANTES del disparo: tu sombra llega 0,6 s tarde.',
    init: function (G, L) {
      var p = L.player;
      var b = {
        id: 'sombra', name: 'TU SOMBRA', state: 'fight', fooled: 0, hits: 3,
        hist: [], shadow: { x: p.x, y: p.y }, taunt: 4.5, flashHit: false,
        pillars: [
          { x: Math.round(L.world.w * 0.18), t: 2.6, state: 'idle' },
          { x: Math.round(L.world.w * 0.5), t: 4.4, state: 'idle' },
          { x: Math.round(L.world.w * 0.82), t: 6.2, state: 'idle' }
        ]
      };
      for (var i = 0; i < 160; i++) b.hist.push({ x: p.x - 190 - i * 0.5, y: p.y });
      b.grace = 1.6;
      if (G.mode !== 'silencio') EO.UI.say(EO.UI.quote('boss2'), { duration: 5000 });
      EO.UI.toast('JEFE II · TU SOMBRA', 'No se golpea. Se la engaña: <b>luz + retraso</b>. Tres veces.');
      return b;
    },
    reset: function (G, b) {
      b.fooled = 0; b.state = 'fight'; b.taunt = 4.5;
      b.pillars.forEach(function (pl) { pl.state = 'idle'; pl.t = 2.2 + Math.random() * 3; });
      var p = G.lvl.player;
      b.hist.length = 0;
      for (var i = 0; i < 160; i++) b.hist.push({ x: p.x - 190 - i * 0.5, y: p.y });
      b.grace = 1.4;
    },
    update: function (G, b, dt) {
      var L = G.lvl, p = L.player;
      if (b.state === 'defeated' || !p.alive) return;

      /* la sombra es tu posición de hace 0,6 s (0,35 s en fase final) */
      b.hist.push({ x: p.x, y: p.y });
      if (b.hist.length > 1400) b.hist.shift();
      var lag = b.fooled >= 2 ? 42 : 72;
      var tgt = b.hist[Math.max(0, b.hist.length - lag)];
      b.shadow.x = tgt.x;
      b.shadow.y = tgt.y;

      b.grace = Math.max(0, (b.grace || 0) - dt);
      if (!b.grace && G.phaseName === 'play' && dst(b.shadow.x + 15, b.shadow.y + 20, p.x + 15, p.y + 20) < 32) {
        G.kill('shadow');
        return;
      }

      b.taunt -= dt;
      if (b.taunt <= 0 && G.mode !== 'silencio') {
        b.taunt = 9;
        EO.UI.say(EO.UI.quote('shadow_near'), { duration: 2600 });
      }

      for (var i = 0; i < b.pillars.length; i++) {
        var pl = b.pillars[i];
        pl.t -= dt;
        if (pl.state === 'idle' && pl.t <= 0) { pl.state = 'charge'; pl.t = 1.05; EO.Audio.tone(280, 0.4, 'sawtooth', 0.1, 640); }
        else if (pl.state === 'charge' && pl.t <= 0) {
          pl.state = 'flash'; pl.t = 0.5; b.flashHit = false;
          G.shake = 9;
          EO.Audio.tone(95, 0.35, 'square', 0.2, 45);
          G.burst(pl.x, L.world.h - 90, 18, '#fff2b0', 220);
        } else if (pl.state === 'flash' && pl.t <= 0) {
          pl.state = 'idle'; pl.t = 3.4 - b.fooled * 0.4;
        }
        if (pl.state === 'flash') {
          var half = 42;
          var pc = p.x + p.w / 2;
          if (Math.abs(pc - pl.x) < half) { G.kill('light'); return; }
          if (!b.flashHit && Math.abs(b.shadow.x + 15 - pl.x) < half) {
            b.flashHit = true;
            registerHit(G, b, 'La luz la ha alcanzado a ella. No a ti.');
            say(G, 'Eso ha dolido. Y no tengo nervios.', 2400);
          }
        }
      }
    },
    draw: function (G, ctx, th) {
      var b = G.boss, L = G.lvl;
      if (!b) return;
      /* presencia: masa de oscuridad que ocupa la arena */
      ctx.save();
      ctx.globalAlpha = 0.5;
      var mg = ctx.createRadialGradient(L.world.w / 2, 240, 40, L.world.w / 2, 240, 620);
      mg.addColorStop(0, 'rgba(6,3,14,.95)');
      mg.addColorStop(1, 'rgba(6,3,14,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(0, 0, L.world.w, L.world.h);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#05030c';
      ctx.beginPath();
      ctx.ellipse(L.world.w / 2, 300, 170, 120 + Math.sin(G.t * 0.8) * 6, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,70,90,.85)';
      ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.ellipse(L.world.w / 2 - 56, 292, 26, 4.5, -0.12, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(L.world.w / 2 + 56, 292, 26, 4.5, 0.12, 0, 6.283); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      for (var i = 0; i < b.pillars.length; i++) {
        var pl = b.pillars[i], h = L.world.h;
        if (pl.state === 'idle') {
          ctx.globalAlpha = 0.42;
          ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 2;
          ctx.setLineDash([14, 12]);
          ctx.beginPath(); ctx.moveTo(pl.x - 42, 0); ctx.lineTo(pl.x - 42, h); ctx.moveTo(pl.x + 42, 0); ctx.lineTo(pl.x + 42, h); ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.13;
          ctx.fillStyle = '#fff6c8';
          ctx.fillRect(pl.x - 42, 0, 84, h);
          ctx.globalAlpha = 1;
        } else if (pl.state === 'charge') {
          ctx.globalAlpha = 0.22 + Math.sin(G.t * 26) * 0.12;
          ctx.fillStyle = '#ffe9a8';
          ctx.fillRect(pl.x - 42, 0, 84, h);
          ctx.globalAlpha = 0.85;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          ctx.strokeRect(pl.x - 42, 0, 84, h);
          ctx.globalAlpha = 1;
        } else {
          var g = ctx.createLinearGradient(pl.x - 60, 0, pl.x + 60, 0);
          g.addColorStop(0, 'rgba(255,250,220,0)');
          g.addColorStop(0.5, 'rgba(255,255,255,.95)');
          g.addColorStop(1, 'rgba(255,250,220,0)');
          ctx.fillStyle = g;
          ctx.fillRect(pl.x - 60, 0, 120, h);
        }
      }
      // sombra
      var s = b.shadow;
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = '#0b0718';
      ctx.shadowColor = '#ff2d55'; ctx.shadowBlur = 22;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(s.x, s.y, 30, 40, 8); else ctx.rect(s.x, s.y, 30, 40);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff5d5d';
      ctx.fillRect(s.x + 7, s.y + 12, 4, 4);
      ctx.fillRect(s.x + 18, s.y + 12, 4, 4);
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#ff5d5d'; ctx.lineWidth = 1;
      ctx.strokeRect(s.x - 3, s.y - 3, 36, 46);
      ctx.restore();
    }
  };

  /* ==========================================================================
     III · EL ARQUITECTO
     ========================================================================== */
  D.arquitecto = {
    name: 'EL ARQUITECTO',
    hint: 'Cuatro placas. La real lleva una runa y aguanta el derrumbe. Pisa la buena y el suelo que cae es el suyo.',
    init: function (G, L) {
      var ft = floorTop(L);
      var b = {
        id: 'arquitecto', name: 'EL ARQUITECTO', state: 'build', fooled: 0, hits: 3,
        timer: 4.6, collapse: 0, real: 0, blocks: [], tick: 0, said: false,
        pads: [0, 1, 2, 3].map(function (i) {
          return { x: Math.round(L.world.w * 0.12 + i * (L.world.w * 0.76 / 3)), y: ft - 16, w: 150, h: 16, i: i };
        })
      };
      b.real = Math.floor(Math.random() * 4);
      if (G.mode !== 'silencio') EO.UI.say(EO.UI.quote('boss3'), { duration: 5000 });
      EO.UI.toast('JEFE III · EL ARQUITECTO', 'Sólo una placa es estructural. La runa no miente. El resto del suelo, sí.');
      return b;
    },
    reset: function (G, b) {
      b.fooled = 0; b.state = 'build'; b.timer = 4.6; b.collapse = 0; b.blocks.length = 0;
      b.real = Math.floor(Math.random() * 4);
      G.lvl.noFloor = false;
    },
    update: function (G, b, dt) {
      var L = G.lvl, p = L.player;
      if (b.state === 'defeated' || !p.alive) return;

      /* bloques que caen */
      b.tick -= dt;
      if (b.tick <= 0) {
        b.tick = 0.85;
        b.blocks.push({ x: rnd(80, L.world.w - 120), y: -60, vy: 0, w: 46, h: 46 });
      }
      for (var i = b.blocks.length - 1; i >= 0; i--) {
        var bl = b.blocks[i];
        bl.vy += 1500 * dt; bl.y += bl.vy * dt;
        if (bl.y > L.world.h + 80) { b.blocks.splice(i, 1); continue; }
        if (G.aabb(p, bl)) { G.kill('brick'); return; }
      }

      if (b.state === 'build') {
        b.timer -= dt;
        if (b.timer <= 0) {
          b.state = 'collapse';
          b.collapse = 1.15;
          G.shake = 18;
          EO.Audio.noise(0.7, 0.22);
          L.noFloor = true;
          // ¿estabas en la placa real?
          var pad = b.pads[b.real];
          var pc = p.x + p.w / 2;
          var onPad = Math.abs(pc - (pad.x + pad.w / 2)) < pad.w / 2 + 6 && p.y + p.h > pad.y - 30 && p.y + p.h < pad.y + 40;
          if (onPad) {
            registerHit(G, b, 'El suelo que ha caído era el suyo.');
            say(G, 'Estructural. Maldita sea. Estructural.', 2800);
          } else {
            say(G, 'Ahí no. Ahí nunca.', 2000);
          }
        }
      } else if (b.state === 'collapse') {
        b.collapse -= dt;
        if (b.collapse <= 0) {
          b.state = 'build';
          b.timer = Math.max(3.0, 4.6 - b.fooled * 0.5);
          b.real = Math.floor(Math.random() * 4);
          L.noFloor = false;
          G.shake = 8;
        }
      }
    },
    draw: function (G, ctx, th) {
      var b = G.boss, L = G.lvl;
      if (!b) return;
      // placas
      for (var i = 0; i < b.pads.length; i++) {
        var pd = b.pads[i], real = i === b.real;
        ctx.save();
        ctx.fillStyle = real ? 'rgba(124,255,212,.28)' : 'rgba(255,255,255,.06)';
        ctx.fillRect(pd.x, pd.y, pd.w, pd.h);
        ctx.strokeStyle = real ? '#7cffd4' : 'rgba(255,255,255,.28)';
        ctx.lineWidth = real ? 2.5 : 1.2;
        ctx.strokeRect(pd.x, pd.y, pd.w, pd.h);
        if (real) {
          ctx.fillStyle = '#7cffd4';
          ctx.font = '700 15px ui-monospace,monospace';
          ctx.textAlign = 'center';
          ctx.fillText('▲', pd.x + pd.w / 2, pd.y - 8 + Math.sin(G.t * 4) * 2);
          ctx.textAlign = 'left';
        }
        ctx.restore();
      }
      // grieta que avisa del derrumbe
      if (b.state === 'build' && b.timer < 1.2) {
        ctx.globalAlpha = 0.35 + Math.sin(G.t * 20) * 0.25;
        ctx.strokeStyle = '#ff5d3a'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, L.world.h - 84); ctx.lineTo(L.world.w, L.world.h - 84);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // bloques
      for (var k = 0; k < b.blocks.length; k++) {
        var bl = b.blocks[k];
        ctx.fillStyle = 'rgba(210,200,255,.9)';
        ctx.shadowColor = th.glow; ctx.shadowBlur = 14;
        ctx.fillRect(bl.x, bl.y, bl.w, bl.h);
        ctx.shadowBlur = 0;
      }
      // arquitecto (figura alta arriba)
      var ax = L.world.w / 2, ay = 180 + Math.sin(G.t * 0.9) * 10;
      ctx.save();
      ctx.globalAlpha = b.state === 'defeated' ? 0.15 : 0.85;
      ctx.fillStyle = th.glow;
      ctx.shadowColor = th.glow; ctx.shadowBlur = 30;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(ax - 26, ay - 40, 52, 120, 10); ctx.fill(); }
      else ctx.fillRect(ax - 26, ay - 40, 52, 120);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0a0818';
      ctx.fillRect(ax - 16, ay - 18, 10, 6);
      ctx.fillRect(ax + 6, ay - 18, 10, 6);
      ctx.restore();
    }
  };

  /* ==========================================================================
     IV · EL SILENCIO
     ========================================================================== */
  D.silencio = {
    name: 'EL SILENCIO',
    hint: 'Mientras carga, muévete para esquivar lo que cae. Cuando la pantalla se cierre: QUIETO. Tres veces.',
    init: function (G, L) {
      var b = {
        id: 'silencio', name: 'EL SILENCIO', state: 'charge', fooled: 0, hits: 3,
        timer: 4.6, dropT: 0.7, drops: [], blind: 0, said: false
      };
      document.body.classList.add('mute-hud');
      if (G.mode !== 'silencio') EO.UI.say(EO.UI.quote('boss4'), { duration: 5200 });
      EO.UI.toast('JEFE IV · EL SILENCIO', 'Te quita la interfaz. Y el sonido. Sobrevive quieto cuando se cierre.');
      return b;
    },
    reset: function (G, b) {
      b.fooled = 0; b.state = 'charge'; b.timer = 4.6; b.drops.length = 0; b.blind = 0;
    },
    update: function (G, b, dt) {
      var L = G.lvl, p = L.player;
      if (b.state === 'defeated' || !p.alive) return;

      b.dropT -= dt;
      if (b.dropT <= 0 && b.state === 'charge') {
        b.dropT = 0.55;
        b.drops.push({ x: rnd(120, L.world.w - 120), y: -50, vy: 0, w: 40, h: 54 });
      }
      for (var i = b.drops.length - 1; i >= 0; i--) {
        var d = b.drops[i];
        d.vy += 1700 * dt; d.y += d.vy * dt;
        if (d.y > L.world.h + 60) { b.drops.splice(i, 1); continue; }
        if (G.aabb(p, d)) { G.kill('drop'); return; }
      }

      if (b.state === 'charge') {
        b.timer -= dt;
        b.blind = Math.max(0, b.blind - dt);
        if (b.timer <= 0) {
          b.state = 'release'; b.timer = 1.25; b.blind = 1;
          EO.Audio.stopDrone();
          G.shake = 10;
          EO.UI.say('— — —', { duration: 1200, who: 'EL SILENCIO' });
          EO.UI.toast('SILENCIO', 'No te muevas.', 1400);
        }
      } else if (b.state === 'release') {
        b.timer -= dt;
        var moving = Math.abs(p.vx) > 42 || !p.onGround;
        if (moving) {
          EO.Audio.setDrone(40);
          G.kill('silence');
          return;
        }
        if (b.timer <= 0) {
          registerHit(G, b, 'Quieto. Del todo. Le has ganado el turno.');
          say(G, '...no deberías haber podido.', 2400);
          b.state = 'charge'; b.timer = Math.max(3.2, 4.6 - b.fooled * 0.5);
          b.blind = 0;
          EO.Audio.setDrone(44);
        }
      }
    },
    draw: function (G, ctx, th) {
      var b = G.boss, L = G.lvl;
      if (!b) return;
      var cx = L.world.w / 2, cy = 260;
      ctx.save();
      ctx.globalAlpha = b.state === 'release' ? 0.9 : 0.5;
      ctx.fillStyle = '#050509';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 220, 140 + Math.sin(G.t * 0.8) * 8, 0, 0, 6.283);
      ctx.fill();
      ctx.shadowBlur = 0;
      // dos rendijas
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = b.state === 'release' ? '#fff' : 'rgba(220,220,255,.55)';
      ctx.beginPath(); ctx.ellipse(cx - 60, cy - 10, 34, 4, -0.1, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 60, cy - 10, 34, 4, 0.1, 0, 6.283); ctx.fill();
      ctx.restore();
      // bloques
      for (var i = 0; i < b.drops.length; i++) {
        var d = b.drops[i];
        ctx.fillStyle = 'rgba(24,20,44,.95)';
        ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1;
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeRect(d.x, d.y, d.w, d.h);
      }
      if (b.state === 'release') {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, L.world.w, 90);
        ctx.fillRect(0, L.world.h - 120, L.world.w, 120);
        ctx.restore();
      }
    }
  };

  /* ==========================================================================
     V · EL TIEMPO
     ========================================================================== */
  D.tiempo = {
    name: 'EL TIEMPO',
    hint: 'Cada 7 s rebobina el mundo 2 s. Estar sobre un ancla cuando cae el reloj le rompe una aguja.',
    init: function (G, L) {
      var ft = floorTop(L);
      var b = {
        id: 'tiempo', name: 'EL TIEMPO', state: 'run', fooled: 0, hits: 3,
        timer: 8.0, hist: [], anchors: [], flash: 0, said: false
      };
      var n = 3;
      for (var i = 0; i < n; i++) {
        b.anchors.push({ x: Math.round(L.world.w * 0.16 + i * (L.world.w * 0.64 / (n - 1))), y: ft - 18, used: false });
      }
      var p = L.player;
      for (var k = 0; k < 260; k++) b.hist.push({ x: p.x, y: p.y });
      if (G.mode !== 'silencio') EO.UI.say(EO.UI.quote('boss5'), { duration: 5200 });
      EO.UI.toast('JEFE V · EL TIEMPO', 'Ancla + cuenta atrás = golpe. Si no, retrocedes 2 segundos.');
      return b;
    },
    reset: function (G, b) {
      b.fooled = 0; b.state = 'run'; b.timer = 8.0; b.hist.length = 0; b.flash = 0;
      b.anchors.forEach(function (a) { a.used = false; });
      var p = G.lvl.player;
      for (var k = 0; k < 260; k++) b.hist.push({ x: p.x, y: p.y });
    },
    update: function (G, b, dt) {
      var L = G.lvl, p = L.player;
      if (b.state === 'defeated' || !p.alive) return;
      b.hist.push({ x: p.x, y: p.y });
      if (b.hist.length > 900) b.hist.shift();
      b.flash = Math.max(0, b.flash - dt);

      b.timer -= dt;
      if (b.timer <= 0) {
        var pc = p.x + p.w / 2;
        var anchor = null;
        for (var i = 0; i < b.anchors.length; i++) {
          var a = b.anchors[i];
          if (!a.used && Math.abs(pc - a.x) < 62) { anchor = a; break; }
        }
        if (anchor && p.onGround) {
          anchor.used = true;
          b.flash = 0.5;
          registerHit(G, b, 'Anclado. El reloj ha perdido su turno.');
          say(G, 'Ese segundo era mío. Devuélvelo.', 2200);
        } else {
          var old = b.hist[Math.max(0, b.hist.length - 240)];
          p.x = old.x; p.y = old.y; p.vx = 0; p.vy = 0;
          G.shake = 16;
          G.deathFlash = 0.5;
          EO.Audio.trick();
          EO.UI.toast('REBOBINADO', 'Dos segundos menos. No has muerto: es peor.', 2200);
          say(G, 'Otra vez. Y otra. Hasta que aprendas dónde pisar.', 2400);
        }
        b.state = 'rewind'; b.timer = 1.0;
      } else if (b.state === 'rewind') {
        if (b.timer <= -0.001) { /* nada */ }
        b.timer -= dt;
        if (b.timer <= 0) { b.state = 'run'; b.timer = Math.max(5.2, 8.0 - b.fooled * 0.9); }
      }
    },
    draw: function (G, ctx, th) {
      var b = G.boss, L = G.lvl;
      if (!b) return;
      // anclas
      for (var i = 0; i < b.anchors.length; i++) {
        var a = b.anchors[i];
        ctx.save();
        ctx.strokeStyle = a.used ? '#6bffb4' : '#ffd166';
        ctx.lineWidth = 2.4;
        ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(a.x, a.y, 26 + Math.sin(G.t * 3 + i) * 3, 0, 6.283); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.x, a.y - 12); ctx.lineTo(a.x, a.y + 12); ctx.moveTo(a.x - 12, a.y); ctx.lineTo(a.x + 12, a.y); ctx.stroke();
        ctx.restore();
      }
      // reloj
      var cx = L.world.w / 2, cy = 180, r = 76;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalAlpha = b.state === 'defeated' ? 0.2 : 0.9;
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
      var ang = (G.t * 0.9) % (Math.PI * 2);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * r * 0.72, Math.sin(ang) * r * 0.72); ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-ang * 0.4) * r * 0.45, Math.sin(-ang * 0.4) * r * 0.45); ctx.stroke();
      ctx.shadowBlur = 0;
      // cuenta atrás
      if (b.timer < 2.4) {
        ctx.fillStyle = 'rgba(255,209,102,.95)';
        ctx.font = '700 34px ui-monospace,monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.max(0, b.timer).toFixed(1), 0, r + 44);
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }
  };

  /* ==========================================================================
     VI · EL OBSERVADOR
     ========================================================================== */
  D.observador = {
    name: 'EL OBSERVADOR',
    hint: 'Fase 1: no es la puerta. Fase 2: el clon que parpadea es el real. Fase 3: la puerta que ÉL no nombra.',
    init: function (G, L) {
      var b = {
        id: 'observador', name: 'EL OBSERVADOR', state: 'fake_win', fooled: 0, hits: 3,
        timer: 5.5, phase: 1, clones: [], doors: [], real: 0, said: false, blink: 1.4,
        mirrorSeen: false
      };
      if (G.mode !== 'silencio') EO.UI.say(EO.UI.quote('boss6'), { duration: 5200 });
      EO.UI.toast('JEFE VI · EL OBSERVADOR', 'No le ganarás con fuerza. Ni con reflejos. Con desconfianza.');
      EO.UI.say('He perdido. De verdad. Mira: la salida está ahí, a la derecha.', { duration: 4600 });
      return b;
    },
    reset: function (G, b) {
      b.fooled = 0; b.state = 'fake_win'; b.phase = 1; b.timer = 5.5;
      b.clones.length = 0; b.doors.length = 0; b.mirrorSeen = false;
    },
    update: function (G, b, dt) {
      var L = G.lvl, p = L.player;
      if (b.state === 'defeated' || !p.alive) return;

      /* ---- FASE 1: falsa victoria ---- */
      if (b.phase === 1) {
        b.timer -= dt;
        if (G.mirrorUntil > G.t) b.mirrorSeen = true;
        if (b.mirrorSeen || b.timer <= 0) {
          b.phase = 2;
          b.said = false;
          b.blink = 1.2;
          var n = 3;
          b.clones = [];
          for (var i = 0; i < n; i++) {
            b.clones.push({ x: 220 + i * 480, y: 600, vx: rnd(-22, 22), vy: 0, real: false, ph: rnd(0, 6) });
          }
          b.real = Math.floor(Math.random() * n);
          b.clones[b.real].real = true;
          EO.UI.toast('FASE 2', 'Tres. Uno es él. El que parpadea y te mira.');
          EO.UI.say('Sigo aquí. Elige bien a quién tocas.', { duration: 3600 });
        }
        return;
      }

      /* ---- FASE 2: clones ---- */
      if (b.phase === 2) {
        b.blink -= dt;
        if (b.blink <= 0) b.blink = 1.4 + Math.random() * 1.6;
        for (var k = 0; k < b.clones.length; k++) {
          var c = b.clones[k];
          c.ph += dt;
          c.vx += Math.sin(c.ph * 1.7) * 26 * dt;
          c.vx = clamp(c.vx, -70, 70);
          c.x += c.vx * dt;
          if (c.x < 90) { c.x = 90; c.vx = Math.abs(c.vx); }
          if (c.x > L.world.w - 120) { c.x = L.world.w - 120; c.vx = -Math.abs(c.vx); }
          c.y = 600 + Math.sin(c.ph * 2.1) * 10;
          if (dst(c.x + 22, c.y + 26, p.x + 15, p.y + 20) < 40) {
            if (c.real) {
              registerHit(G, b, 'Era él. Se ha dejado tocar. Qué raro.');
              G.shake = 20;
              // recolocar
              b.real = (b.real + 1 + Math.floor(Math.random() * 2)) % b.clones.length;
              b.clones.forEach(function (cc, idx) { cc.real = idx === b.real; cc.x = 180 + idx * 500; });
              EO.UI.say('No cuenta. Ese era un empleado.', { duration: 2400 });
              if (b.fooled >= b.hits) return;
            } else {
              G.mirrorBack('clon');
              G.shake = 12;
              EO.UI.say('Ese no era yo. Te devuelvo al principio. Con los mandos cambiados.', { duration: 3000 });
              b.clones.forEach(function (cc, idx) { cc.x = 180 + idx * 500; });
            }
          }
        }
        if (b.fooled >= b.hits - 1) {
          b.phase = 3;
          b.doors = [
            { x: 260, y: 628, w: 54, h: 92, good: false },
            { x: 760, y: 628, w: 54, h: 92, good: false },
            { x: 1260, y: 628, w: 54, h: 92, good: true }
          ];
          // el bueno es siempre el que él NO nombra
          var named = 0;
          var good = Math.floor(Math.random() * 3);
          b.doors.forEach(function (d, idx) { d.good = idx === good; });
          if (G.mode !== 'silencio') {
            var names = ['la de la izquierda', 'la del centro', 'la de la derecha'];
            EO.UI.say('Estoy cansado. Coge ' + names[good === 0 ? 1 : 0] + '. Es la buena. Te lo juro.', { duration: 4600 });
            EO.UI.toast('FASE 3', 'Tres puertas. Él acaba de nombrar una. No es esa.');
          }
        }
        return;
      }

      /* ---- FASE 3: las puertas ---- */
      if (b.phase === 3) {
        for (var d2 = 0; d2 < b.doors.length; d2++) {
          var door = b.doors[d2];
          if (G.aabb(p, door)) {
            if (door.good) {
              b.fooled = b.hits;
              defeatBoss(G, b);
              EO.UI.say('...vale. Vale. Esta vez te lo has ganado. No vuelvas.', { duration: 5200 });
            } else {
              G.mirrorBack('puerta');
              EO.UI.say('No era esa. Te lo he dicho con la boca pequeña.', { duration: 3000 });
            }
            return;
          }
        }
      }
    },
    draw: function (G, ctx, th) {
      var b = G.boss, L = G.lvl;
      if (!b) return;
      var eyeX = L.world.w / 2, eyeY = 190;

      // ojo (siempre)
      ctx.save();
      ctx.globalAlpha = b.state === 'defeated' ? 0.12 : 0.5;
      ctx.fillStyle = th.glow;
      ctx.shadowColor = th.glow; ctx.shadowBlur = 50;
      ctx.beginPath(); ctx.ellipse(eyeX, eyeY, 190, 84, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = b.state === 'defeated' ? 0.2 : 0.95;
      ctx.fillStyle = '#08040f';
      ctx.beginPath(); ctx.arc(eyeX, eyeY, 46, 0, 6.283); ctx.fill();
      var p = L.player;
      var dx = clamp((p.x - eyeX) / 500, -1, 1) * 16;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(eyeX + dx, eyeY, 18, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#08040f';
      ctx.beginPath(); ctx.arc(eyeX + dx, eyeY, 8, 0, 6.283); ctx.fill();
      ctx.restore();

      if (b.phase === 1) {
        // sonrisa de "he perdido"
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(eyeX, 300, 46, 0.15, Math.PI - 0.15); ctx.stroke();
        ctx.restore();
      }

      if (b.phase === 2) {
        for (var i = 0; i < b.clones.length; i++) {
          var c = b.clones[i];
          var alpha = c.real ? (b.blink < 0.3 ? 0.25 : 0.95) : 0.7;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = c.real ? '#f6f1ff' : 'rgba(180,170,230,.55)';
          ctx.shadowColor = c.real ? '#fff' : '#7c6bb0'; ctx.shadowBlur = c.real ? 26 : 8;
          if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(c.x, c.y, 44, 52, 12); ctx.fill(); }
          else ctx.fillRect(c.x, c.y, 44, 52);
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#0a0818';
          var look = clamp((p.x - c.x) / 300, -1, 1) * 4;
          if (c.real && b.blink < 0.22) {
            ctx.fillRect(c.x + 10, c.y + 20, 24, 3);
          } else {
            ctx.beginPath(); ctx.arc(c.x + 14 + look, c.y + 21, 4, 0, 6.283); ctx.fill();
            ctx.beginPath(); ctx.arc(c.x + 30 + look, c.y + 21, 4, 0, 6.283); ctx.fill();
          }
          ctx.restore();
        }
      }

      if (b.phase === 3) {
        for (var d = 0; d < b.doors.length; d++) {
          var dr = b.doors[d];
          ctx.save();
          ctx.strokeStyle = dr.good ? 'rgba(255,255,255,.9)' : 'rgba(255,120,140,.8)';
          ctx.lineWidth = 3;
          ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 20;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(dr.x, dr.y, dr.w, dr.h, [dr.w / 2, dr.w / 2, 4, 4]);
          else ctx.rect(dr.x, dr.y, dr.w, dr.h);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,250,224,.16)';
          ctx.fillRect(dr.x + 4, dr.y + 4, dr.w - 8, dr.h - 8);
          ctx.restore();
        }
      }
    }
  };

})(window.EO);
