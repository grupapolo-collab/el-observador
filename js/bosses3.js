/* ============================================================================
   EL OBSERVADOR — bosses3.js  (v4.0 · jefes VII y VIII del Acto II)
   VII  EL ECO (nivel 45)        · repite tus movimientos con retraso; se le
                                   vence haciendo sonar 3 campanas cuando él
                                   no está mirando
   VIII EL COLECCIONISTA (n. 60) · usa tu historial REAL de muertes; esquiva
                                   sus calaveras, déjalas reventar sus lápidas
                                   y toca el cofre cuando lo abra
   ============================================================================ */
window.EO = window.EO || {};
(function (EO) {
  'use strict';
  var D = EO.BossDefs = EO.BossDefs || {};

  /* ==========================================================================
     VII · EL ECO
     ========================================================================== */
  D.elco = {
    name: 'EL ECO',
    hint: 'Toca una campana cuando el Eco esté lejos. Si está cerca, se oye lo que él quiera. Tres veces.',
    init: function (G, L) {
      var p = L.player;
      var b = { id: 'elco', name: 'EL ECO', state: 'fight', fooled: 0, hits: 3, tick: 0, grace: 2.2,
        hist: [], echo: { x: p.x - 260, y: p.y }, sayT: 7,
        bells: [
          { x: 780, y: 430, st: 'ready', t: 0 },
          { x: 1100, y: 470, st: 'ready', t: 0 },
          { x: 1420, y: 430, st: 'ready', t: 0 }
        ] };
      for (var i = 0; i < 200; i++) b.hist.push({ x: p.x - 260 - i * 1.2, y: p.y });
      if (G.mode !== 'silencio') EO.UI.say(EO.UI.quote('boss7'), { duration: 5000 });
      EO.UI.toast('JEFE VII · EL ECO', 'Toca una campana cuando el Eco esté <b>lejos</b> de ella. Tres veces.');
      return b;
    },
    reset: function (G, b) {
      b.fooled = 0; b.state = 'fight'; b.grace = 2; b.sayT = 7;
      b.bells.forEach(function (x) { x.st = 'ready'; x.t = 0; });
      var p = G.lvl.player;
      b.hist.length = 0;
      for (var i = 0; i < 200; i++) b.hist.push({ x: p.x - 260 - i * 1.2, y: p.y });
    },
    update: function (G, b, dt) {
      if (b.state === 'defeated' || !G.lvl.player.alive) return;
      var L = G.lvl, p = L.player;

      /* el eco repite tu recorrido con retraso (90 fotogramas ≈ 0,75 s) */
      b.hist.push({ x: p.x, y: p.y });
      if (b.hist.length > 1200) b.hist.shift();
      var tgt = b.hist[Math.max(0, b.hist.length - 90)];
      b.echo.x = tgt.x; b.echo.y = tgt.y;

      b.grace = Math.max(0, b.grace - dt);
      if (!b.grace && Math.abs((b.echo.x + 15) - (p.x + 15)) < 34 && Math.abs((b.echo.y + 20) - (p.y + 20)) < 44) {
        G.kill('eco'); return;
      }

      for (var i = 0; i < b.bells.length; i++) {
        var bl = b.bells[i];
        if (bl.st === 'ready') {
          if (Math.hypot(p.x + 15 - bl.x, p.y + 20 - bl.y) < 44) {
            if (Math.hypot(b.echo.x - bl.x, b.echo.y - bl.y) < 120) {
              bl.st = 'cool'; bl.t = 1.2;
              EO.Audio.tone(160, .3, 'sawtooth', .12, 90);
              if (G.mode !== 'silencio') EO.UI.say('No con él delante. Tiene oído absoluto.', { duration: 2200 });
            } else {
              bl.st = 'ring'; bl.t = .9; b.fooled++;
              EO.Audio.tone(880, .7, 'triangle', .2, 1320);
              G.shake = 6; G.burst(bl.x, bl.y, 20, '#ffe08a', 240);
              if (G.mode !== 'silencio') EO.UI.say(['Una.', 'Dos.', 'Tres. Ya está. ¿Y si te copio la salida?'][b.fooled - 1], { duration: 2200 });
              if (b.fooled >= 3) {
                b.state = 'defeated'; G.winFlash = 1; EO.Audio.boss();
                if (G.faceCause) G.faceCause('scared', 3);
                EO.UI.say(EO.UI.quote('boss_win'), { duration: 5200 });
                setTimeout(function () { if (G.phaseName === 'play') G.complete(); }, 1800);
                return;
              }
            }
          }
        } else if (bl.st === 'ring') {
          bl.t -= dt;
          if (bl.t <= 0) {
            bl.st = 'done';
            b.echo.x = bl.x; b.echo.y = bl.y;
            b.hist.length = 0;
            for (var k = 0; k < 60; k++) b.hist.push({ x: bl.x, y: bl.y });
            b.grace = 1.0;
            EO.Audio.tone(120, .5, 'sawtooth', .16, 50);
          }
        } else if (bl.st === 'cool') {
          bl.t -= dt; if (bl.t <= 0) bl.st = 'ready';
        }
      }
      b.sayT -= dt;
      if (b.sayT <= 0 && G.mode !== 'silencio') { b.sayT = 10; EO.UI.say(EO.UI.quote('boss7'), { duration: 2400 }); }
    },
    draw: function (G, ctx, th) {
      var b = G.boss, L = G.lvl, t = G.t;
      /* anillos de eco de fondo */
      ctx.save();
      for (var i = 1; i <= 3; i++) {
        ctx.globalAlpha = .14 + .06 * Math.sin(t * 2 + i);
        ctx.beginPath();
        ctx.arc(L.world.w / 2, 160, i * 90 + Math.sin(t * 1.3 + i) * 10, 0, 6.283);
        ctx.lineWidth = 2; ctx.strokeStyle = '#8ef4ff'; ctx.stroke();
      }
      ctx.restore();
      /* campanas */
      b.bells.forEach(function (bl) {
        if (bl.st === 'done') return;
        var s = bl.st === 'ring' ? 1 + .2 * Math.sin(t * 40) : 1;
        ctx.save(); ctx.translate(bl.x, bl.y); ctx.scale(s, s);
        ctx.fillStyle = bl.st === 'ring' ? '#ffe08a' : '#c9c2e8';
        ctx.shadowColor = '#ffe08a'; ctx.shadowBlur = bl.st === 'ring' ? 24 : 10;
        ctx.beginPath(); ctx.arc(0, 0, 16, Math.PI, 0); ctx.lineTo(20, 10); ctx.lineTo(-20, 10); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 14, 4, 0, 6.283); ctx.fill();
        ctx.restore();
      });
      /* el eco: tu silueta en azul fantasma */
      var e = b.echo;
      ctx.save();
      ctx.globalAlpha = .55; ctx.fillStyle = '#8ef4ff';
      ctx.shadowColor = '#8ef4ff'; ctx.shadowBlur = 18;
      ctx.fillRect(e.x, e.y, 30, 40);
      ctx.globalAlpha = .95; ctx.fillStyle = '#0a0818';
      ctx.fillRect(e.x + 6, e.y + 8, 5, 5); ctx.fillRect(e.x + 19, e.y + 8, 5, 5);
      ctx.restore();
    }
  };

  /* ==========================================================================
     VIII · EL COLECCIONISTA DE MUERTES
     ========================================================================== */
  D.colector = {
    name: 'EL COLECCIONISTA',
    hint: 'Esquiva sus calaveras: revientan lápidas. Cuando abra el cofre,tócalo. Tres veces.',
    init: function (G, L) {
      var total = (EO.Store.get() && EO.Store.get().totalDeaths) || 0;
      var nT = Math.max(1, Math.min(3, Math.floor(total / 100)));
      var b = { id: 'colector', name: 'EL COLECCIONISTA', state: 'volley', fooled: 0, hits: 3, tick: 0,
        x: L.world.w / 2, y: 120, skT: 1.2, skulls: [], exposedT: 0, total: total, sayT: 5, tombs: [] };
      for (var i = 0; i < nT; i++) b.tombs.push({ x: 300 + i * 700, y: 510, w: 90, h: 110, alive: true });
      if (G.mode !== 'silencio') EO.UI.say(EO.UI.quote('boss8'), { duration: 5200 });
      EO.UI.toast('JEFE VIII · EL COLECCIONISTA', 'Llevas <b>' + total + '</b> muertes regaladas. Esquiva sus calaveras y toca el cofre. Tres veces.');
      return b;
    },
    reset: function (G, b) {
      b.fooled = 0; b.state = 'volley'; b.skulls = []; b.skT = 1; b.sayT = 5;
      b.tombs.forEach(function (t) { t.alive = true; });
    },
    update: function (G, b, dt) {
      if (b.state === 'defeated' || !G.lvl.player.alive) return;
      var L = G.lvl, p = L.player;

      b.x = L.world.w / 2 + Math.sin(G.t * .7) * 420;
      b.y = 120 + Math.sin(G.t * 1.1) * 30;

      if (b.state === 'volley') {
        b.skT -= dt;
        if (b.skT <= 0) {
          b.skT = 1.1;
          var dx = (p.x + 15) - b.x, dy = (p.y + 20) - b.y, d = Math.hypot(dx, dy) || 1, sp = 330;
          b.skulls.push({ x: b.x, y: b.y, vx: dx / d * sp, vy: dy / d * sp, r: 14 });
          EO.Audio.tone(220, .25, 'square', .12, 110);
        }
        var aliveT = 0; b.tombs.forEach(function (t) { if (t.alive) aliveT++; });
        if (b.skulls.length >= 7 || aliveT === 0) {
          b.state = 'exposed'; b.exposedT = 4.5; b.skulls = [];
          EO.Audio.tone(500, .4, 'triangle', .16, 760);
          if (G.mode !== 'silencio') EO.UI.say('El cofre está abierto. Ahora te pido yo una muerte. Regálamela.', { duration: 3000 });
        }
      } else if (b.state === 'exposed') {
        b.exposedT -= dt;
        var cx0 = L.world.w / 2, cy0 = 500;
        if (Math.hypot(p.x + 15 - cx0, p.y + 20 - cy0) < 52) {
          b.fooled++;
          EO.Audio.tone(660, .5, 'triangle', .2, 990);
          G.shake = 10; G.burst(cx0, cy0, 30, '#ffd24d', 300);
          if (G.faceCause) G.faceCause('shock', 2);
          b.tombs.forEach(function (t) { t.alive = true; });
          if (b.fooled >= 3) {
            b.state = 'defeated'; G.winFlash = 1; EO.Audio.boss();
            EO.UI.say('No era mía. Era nuestra. Llévatela.', { duration: 5200 });
            setTimeout(function () { if (G.phaseName === 'play') G.complete(); }, 1900);
            return;
          }
          b.state = 'volley'; b.skT = 1.4;
        } else if (b.exposedT <= 0) {
          b.tombs.forEach(function (t) { t.alive = true; });
          b.state = 'volley'; b.skT = .8;
        }
      }

      for (var i = b.skulls.length - 1; i >= 0; i--) {
        var s = b.skulls[i];
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (Math.hypot(s.x - (p.x + 15), s.y - (p.y + 20)) < 24) { G.kill('coleccion'); return; }
        var dead = false;
        for (var j = 0; j < b.tombs.length; j++) {
          var t2 = b.tombs[j];
          if (t2.alive && s.x > t2.x && s.x < t2.x + t2.w && s.y > t2.y && s.y < t2.y + t2.h) {
            t2.alive = false; dead = true;
            G.burst(t2.x + 45, t2.y + 40, 24, '#b8b0e0', 260);
            G.shake = 8;
            EO.Audio.tone(90, .4, 'square', .18, 40);
            if (G.mode !== 'silencio') EO.UI.say('Esa lápida era de las buenas.', { duration: 2000 });
          }
        }
        if (s.x < -40 || s.x > L.world.w + 40 || s.y > L.world.h + 40) dead = true;
        if (dead) b.skulls.splice(i, 1);
      }
      b.sayT -= dt;
      if (b.sayT <= 0 && G.mode !== 'silencio') { b.sayT = 12; EO.UI.say(EO.UI.quote('boss8'), { duration: 2600 }); }
    },
    draw: function (G, ctx, th) {
      var b = G.boss, L = G.lvl, t = G.t;
      /* la capa */
      ctx.save();
      ctx.fillStyle = '#1c0f2e'; ctx.strokeStyle = '#ff5d3a'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - 90, b.y + 260);
      ctx.quadraticCurveTo(b.x - 70, b.y + 40, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 70, b.y + 40, b.x + 90, b.y + 260);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      /* los ojos de la colección */
      ctx.fillStyle = '#ffd24d';
      for (var i = 0; i < 7; i++) {
        var ox = b.x - 56 + i * 19, oy = b.y + 50 + Math.sin(t * 3 + i) * 6;
        ctx.beginPath(); ctx.arc(ox, oy, 4.5, 0, 6.283); ctx.fill();
      }
      ctx.restore();
      /* lápidas (una por cada 100 muertes tuyas, máx. 3) */
      b.tombs.forEach(function (tm) {
        ctx.save(); ctx.globalAlpha = tm.alive ? 1 : .15;
        ctx.fillStyle = '#5a5a72';
        ctx.beginPath();
        ctx.moveTo(tm.x, tm.y + tm.h); ctx.lineTo(tm.x, tm.y + 30);
        ctx.arc(tm.x + tm.w / 2, tm.y + 30, tm.w / 2, Math.PI, 0);
        ctx.lineTo(tm.x + tm.w, tm.y + tm.h); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c9c2e8'; ctx.font = '700 16px monospace'; ctx.textAlign = 'center';
        ctx.fillText('RIP', tm.x + tm.w / 2, tm.y + 70);
        ctx.restore();
      });
      /* calaveras */
      b.skulls.forEach(function (s) {
        ctx.save();
        ctx.fillStyle = '#f6f1ff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#0a0818';
        ctx.beginPath(); ctx.arc(s.x - 5, s.y - 2, 3, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(s.x + 5, s.y - 2, 3, 0, 6.283); ctx.fill();
        ctx.restore();
      });
      /* el cofre expuesto */
      if (b.state === 'exposed') {
        var cx0 = L.world.w / 2, cy0 = 500, pul = 1 + .08 * Math.sin(t * 10);
        ctx.save(); ctx.translate(cx0, cy0); ctx.scale(pul, pul);
        ctx.fillStyle = '#ffd24d'; ctx.shadowColor = '#ffd24d'; ctx.shadowBlur = 26;
        ctx.fillRect(-30, -22, 60, 44);
        ctx.shadowBlur = 0; ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 3;
        ctx.strokeRect(-30, -22, 60, 44);
        ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, 22); ctx.stroke();
        ctx.restore();
      }
    }
  };
})(window.EO);
