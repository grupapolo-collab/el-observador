/* ============================================================================
   EL OBSERVADOR — illusion.js  (v3.4)  ·  Puertas-ilusión
   A veces la puerta verdadera NO lo es: al tocarla el Observador te dice
   «esa puerta solo es una ilusión» y te devuelve atrás. Para que sea divertido y no
   frustrante:
     · como mucho UNA vez por nivel y sesión (si mueres y reintentas, ya no se repite)
     · nunca en tutorial (niveles 1-2), jefes, ni niveles con reglas especiales
     · nunca si ya llevas 6+ muertes en el nivel (misericordia)
     · nunca en dos niveles seguidos
     · casi siempre te devuelve a una plataforma de MITAD de nivel, no al inicio
     · cada versión tiene su gracia y un premio de consolación
     · hay un «aviso»: la puerta tiembla como un espejismo cuando estás cerca
     · la mascota pez la huele y te avisa (y la deshace)
   Versiones:  burbuja · payaso · espejo · eco (la puerta de verdad estaba a mitad de camino)
   Para probar:  el-observador.html#level=5&illusion=burbuja|payaso|espejo|eco
   ============================================================================ */
(function (EO) {
  'use strict';
  var G = EO.Game;
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };

  var TXT = {
    first: ['Esa puerta solo es una ilusión.', 'Ay. Esa puerta era una ilusión.', 'Qué mona. Pero esa puerta solo es una ilusión.'],
    burbuja: ['Era una burbuja. Bonita, ¿verdad? Vuelve a la plataforma de antes.', 'Pop. Una ilusión. Te devuelvo a un sitio cómodo.'],
    payaso: ['¡SORPRESA! Hoy la puerta traía payaso.', 'Detrás de la puerta solo hay circo. Para ti, desde el principio.'],
    espejo: ['Era un espejo. Eras tú. Siempre eres tú.', 'Esa puerta te miraba. Y tú la mirabas a ella. Nadie salió ganando.'],
    eco: ['Vale, vale. La de verdad estaba a mitad de camino. Te ahorro el viaje.', 'La puerta buena se había quedado atrás. Culpa mía. Mentira, no.'],
    consuelo: ['Premio de consolación.', 'Toma, por tu paciencia.', 'No lo cuentes.'],
    pez: ['Glub… esa puerta es un espejismo', 'Glub. No te fíes de esa puerta.']
  };

  var KINDS = ['burbuja', 'payaso', 'espejo', 'eco'];
  var WEIGHT = { burbuja: 35, payaso: 25, espejo: 20, eco: 20 };
  function weighted() {
    var r = Math.random() * 100, acc = 0;
    for (var i = 0; i < KINDS.length; i++) { acc += WEIGHT[KINDS[i]]; if (r < acc) return KINDS[i]; }
    return 'burbuja';
  }

  var I = EO.Illusion = { kinds: KINDS };
  I.done = {};      // 'modo:nivel' → true  (sobrevive a reintentos)
  I.lastLevel = -9;

  function realExit(L) { return (L.exits || []).filter(function (e) { return e.kind === 'real' && !e.hidden; })[0] || null; }

  I.eligible = function (g) {
    var L = g.lvl; if (!L || L.boss || !L.player) return false;
    if (g.mode === 'silencio' || g.mode === 'coop') return false;
    var r = L.rules || {}, gt = L.goal && L.goal.type;
    if (gt !== 'exit' && gt !== 'orbs_exit') return false;
    if (r.twin || r.canJump === false || (r.gravity != null && r.gravity < 0) || r.chaser || r.timeGhost) return false;
    if (g.levelNum < 3 && (g.mode === 'story' || g.mode === 'story-final')) return false;
    if (g.levelNum < 2) return false;
    return !!realExit(L);
  };

  /* plataforma segura hacia ~45 % del recorrido: ahí te devolvemos */
  I.checkpoint = function (L, ex) {
    var sp = L.spawn, dir = ex.x > sp.x ? 1 : -1, span = Math.abs(ex.x - sp.x);
    if (span < 700) return null;
    var best = null, bd = 1e9;
    L.platforms.forEach(function (p) {
      if (p.type !== 'solid' || p.wall || p.tdoor || p.tfake || p.w < 180 || p.h < 30) return;
      var f = (p.x + p.w / 2 - sp.x) * dir / span;
      if (f < 0.25 || f > 0.65) return;
      var d = Math.abs(f - 0.45); if (d < bd) { bd = d; best = p; }
    });
    return best ? { x: Math.round(best.x + best.w / 2 - 15), y: best.y - 40, p: best } : null;
  };

  I.plan = function (g) {
    var L = g.lvl; if (!L) return;
    L.illusion = null;
    var forced = null;
    try { var m = /illusion=(\w+)/.exec(window.location.hash || ''); if (m) forced = m[1]; } catch (e) {}
    var key = g.mode + ':' + g.levelNum;
    if (!I.eligible(g)) return;
    if (I.done[key]) return;
    if (!forced) {
      if (g.deaths >= 6) return;
      if (I.lastLevel === g.levelNum - 1) return;
      var p = g.mode === 'diablo' ? 0.16 : Math.min(0.46, 0.26 + g.levelNum * 0.008);
      if (Math.random() > p) return;
    }
    var kind = forced && KINDS.indexOf(forced) >= 0 ? forced : weighted();
    L.illusion = { kind: kind, state: 'armed', key: key };
  };

  function say(g, txt, ms) { if (g.mode !== 'silencio') EO.UI.say(txt, { duration: ms || 3000 }); }
  function later(g, sec, fn) { var L = g.lvl; L._illuQ = L._illuQ || []; L._illuClock = L._illuClock || 0; L._illuQ.push({ at: L._illuClock + sec, fn: fn }); }
  function confetti(g, x, y, n) {
    var cols = ['#ff5d8f', '#ffd24d', '#6bffb4', '#8ef4ff', '#b48cff', '#ff9d3a'];
    for (var i = 0; i < n; i++) g.burst(x + (Math.random() - .5) * 30, y + (Math.random() - .5) * 30, 2, cols[i % cols.length], 330);
  }
  function reward(g, n) {
    var s = EO.Store.get(); s.coins = (s.coins || 0) + n; EO.Store.save(); EO.UI.hud({ coins: s.coins });
    g.bubble('+' + n + ' CAOS', 2.2);
  }

  /* la puerta toca al jugador: ¿es una ilusión? */
  I.intercept = function (g, ex) {
    var L = g.lvl, il = L && L.illusion;
    if (!il || il.state !== 'armed' || ex.kind !== 'real' || g.phaseName !== 'play') return false;
    var p = L.player, cp = I.checkpoint(L, ex), kind = il.kind;
    if (kind === 'eco' && !cp) kind = 'burbuja';
    il.state = 'used'; I.done[il.key] = true; I.lastLevel = g.levelNum;
    var s = EO.Store.get(); s.illusions = (s.illusions || 0) + 1; EO.Store.save();

    var cx = ex.x + ex.w / 2, cy = ex.y + ex.h / 2;
    g.shake = 10; g.winFlash = Math.max(g.winFlash || 0, .35);
    EO.Audio.trick();
    if (EO.Score && EO.Score.once) EO.Score.once('laugh', .8);
    if (EO.Fx && EO.Fx.laughNow) EO.Fx.laughNow(g, 3.0);
    g.burst(cx, cy, 36, '#cfe9ff', 300);
    EO.UI.toast('ILUSIÓN', 'Esa puerta no era real.');
    say(g, pick(TXT.first), 2400);

    ex.illusionOff = true;                              // la puerta se desvanece…
    var dest = (kind === 'payaso' || kind === 'eco' || !cp) ? { x: L.spawn.x, y: L.spawn.y } : { x: cp.x, y: cp.y };
    later(g, 1.5, function () {                         // …y te devuelve
      if (!L.player || g.lvl !== L) return;
      if (!p.alive || g.phaseName !== 'play') { ex.illusionOff = false; return; }   // si has muerto entre tanto, no te teletransporto
      g.burst(p.x + 15, p.y + 20, 28, '#b48cff', 260);
      p.x = dest.x; p.y = dest.y; p.vx = 0; p.vy = 0;
      g.burst(p.x + 15, p.y + 20, 28, '#8ef4ff', 260);
      g.shake = Math.max(g.shake, 6);
      EO.Audio.tone(300, .35, 'sine', .12, 900);
      if (kind === 'espejo') { L.rules.invert = true; g.mirrorUntil = g.t + 4.2; }
      if (kind === 'payaso') { confetti(g, p.x + 15, p.y, 40); reward(g, 4); }
      if (kind === 'burbuja' && cp) reward(g, 2);
      if (kind === 'eco') {
        var tgt = cp.p;
        ex.x = Math.round(tgt.x + tgt.w / 2 - ex.w / 2); ex.y = tgt.y - ex.h; ex.bx = ex.x; ex.by = ex.y;
        reward(g, 3);
      }
      say(g, pick(TXT[kind]), 3600);
      later(g, 2.2, function () { say(g, pick(TXT.consuelo), 1800); });
      ex.illusionOff = false;
      if (ex._tx != null) ex._tx = ex.x;
      /* la puerta huye (si la hay) vuelve a su sitio de origen */
      (L.traps || []).forEach(function (t) { if (t.k === 'runaway' && kind === 'eco') { t.x0 = ex.x; t.y0 = ex.y; t.dodges = 0; t.lo = ex.x - 10; t.hi = ex.x + 10; } });
      if (EO.Observe && EO.Observe.event) EO.Observe.event('mirror');
    });
    return true;
  };

  /* aviso visual: la puerta-ilusión tiembla cuando estás a menos de 520 px */
  var origDrawExits = G.drawExits;
  G.drawExits = function (ctx, th) {
    origDrawExits.call(this, ctx, th);
    var L = this.lvl, il = L && L.illusion;
    if (!il || il.state !== 'armed' || !L.player) return;
    var ex = realExit(L); if (!ex || ex.hidden || ex.illusionOff) return;
    var d = Math.abs((L.player.x + 15) - (ex.x + ex.w / 2));
    if (d > 520) return;
    var a = Math.min(1, (520 - d) / 300) * 0.55, t = this.t;
    ctx.save(); ctx.translate(ex.x, ex.y); ctx.globalAlpha = a; ctx.strokeStyle = '#cfe9ff'; ctx.lineWidth = 1.5;
    for (var i = 0; i < 5; i++) {
      var yy = ex.h * (i + 0.5) / 5, off = Math.sin(t * 7 + i * 1.7) * 5;
      ctx.beginPath(); ctx.moveTo(-6 + off, yy); ctx.lineTo(ex.w + 6 + off, yy + Math.sin(t * 5 + i) * 2); ctx.stroke();
    }
    ctx.restore();
  };

  /* cola de eventos + aviso del pez */
  var origUpdate = G.update;
  G.update = function (dt) {
    origUpdate.call(this, dt);
    var L = this.lvl; if (!L) return;
    L._illuClock = (L._illuClock || 0) + dt;
    if (L._illuQ && L._illuQ.length) {
      for (var i = L._illuQ.length - 1; i >= 0; i--) {
        if (L._illuClock >= L._illuQ[i].at) { var q = L._illuQ.splice(i, 1)[0]; try { q.fn(); } catch (e) { if (window.console) console.warn('illusion:', e); } }
      }
    }
    var il = L.illusion, pet = this.pet;
    if (il && il.state === 'armed' && pet && pet.type === 'pez' && L.player && (pet.helps || 0) < 4) {
      var ex = realExit(L);
      if (ex && Math.abs(L.player.x - ex.x) < 380) {
        pet.helps = (pet.helps || 0) + 1; il.state = 'defused';
        pet.say = { txt: pick(TXT.pez), t: 0, life: 2.6 };
        this.burst(ex.x + ex.w / 2, ex.y + 40, 20, '#8ef4ff', 200);
        EO.UI.toast('PEZ', 'Ha deshecho el espejismo. Esa puerta es de verdad.');
      }
    }
  };

  var origLoad = G.loadLevel;
  G.loadLevel = function (num, showIntro, retry) {
    origLoad.call(this, num, showIntro, retry);
    try { I.plan(this); } catch (e) { if (window.console) console.warn('illusion plan:', e); }
  };
})(window.EO);
