/* ============================================================================
   EL OBSERVADOR — fx.js  (v3.4)  ·  El Observador se ríe (y se le ve)
   Cuando suena una risa —de las pistas con risas (circo/festival, ver EO.MUSIC_META),
   de los efectos 'laugh'/'giggle'/'crowd' o de una puerta-ilusión— la cabeza del Observador:
     · crece y se sacude a carcajadas, con la boca abierta y lágrimas
     · suelta «JA JA» que suben por la pantalla
     · lleva gorro de fiesta/payaso si suena circo o público
   ============================================================================ */
(function (EO) {
  'use strict';
  var G = EO.Game, VW = EO.VW, VH = EO.VH;
  var now = function () { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; };
  var HA = ['JA', 'JA JA', 'JE JE', 'JI JI', 'HA HA', 'JO JO', 'JAJAJA'];

  var Fx = EO.Fx = { until: 0, kind: 'laugh', lvl: 0, bubbles: [], _spawn: 0, _t: 0 };

  /* arranca una risa visual de `dur` segundos (g puede ser null) */
  Fx.laughNow = function (g, dur, kind) {
    Fx.until = Math.max(Fx.until, now() + (dur || 2));
    if (kind) Fx.kind = kind;
  };

  Fx.target = function () {
    var lv = 0;
    if (Fx.until > now()) lv = 1;
    try { if (EO.Score && EO.Score.laughLevel) lv = Math.max(lv, EO.Score.laughLevel()); } catch (e) {}
    return lv;
  };

  function party() {
    var n = EO.Score && EO.Score.curName;
    return Fx.kind === 'crowd' || n === 'circus' || n === 'circus2';
  }

  /* dibuja el efecto alrededor de una cara de radio r centrada en (0,0) (coordenadas locales, ya escaladas) */
  function decorate(ctx, r, t, lv) {
    var open = .35 + .65 * Math.abs(Math.sin(t * 15));
    // boca abierta de carcajada
    ctx.save();
    ctx.fillStyle = '#1a0612';
    ctx.beginPath(); ctx.ellipse(0, r * .42, r * .5, r * .12 + r * .34 * open, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ff6f8f';
    ctx.beginPath(); ctx.ellipse(0, r * .42 + r * .16 * open, r * .3, r * .13 * open + 1, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-r * .34, r * .3, r * .68, r * .1);                         // dientes
    ctx.restore();
    // cejas arqueadas y mejillas
    ctx.strokeStyle = '#0a0818'; ctx.lineWidth = r * .08; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-r * .33, -r * .32, r * .25, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * .33, -r * .32, r * .25, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,150,.35)';
    ctx.beginPath(); ctx.arc(-r * .6, r * .15, r * .16, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(r * .6, r * .15, r * .16, 0, 6.283); ctx.fill();
    // lágrimas de risa
    ctx.fillStyle = 'rgba(120,200,255,.9)';
    for (var s = -1; s <= 1; s += 2) {
      var ph = (t * 2.4 + (s > 0 ? .5 : 0)) % 1;
      ctx.beginPath(); ctx.ellipse(s * r * .52, -r * .05 + ph * r * .7, r * .07, r * .11, 0, 0, 6.283); ctx.fill();
    }
    // gorro de fiesta / payaso
    if (party()) {
      ctx.save(); ctx.rotate(Math.sin(t * 9) * .08);
      ctx.fillStyle = '#ff5d8f';
      ctx.beginPath(); ctx.moveTo(-r * .55, -r * .78); ctx.lineTo(0, -r * 1.85); ctx.lineTo(r * .55, -r * .78); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd24d';
      ctx.fillRect(-r * .42, -r * 1.12, r * .84, r * .12);
      ctx.beginPath(); ctx.arc(0, -r * 1.88, r * .16, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ff3b3b';                                                // nariz de payaso
      ctx.beginPath(); ctx.arc(0, r * .08, r * .13, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    void lv;
  }

  /* globos «JA JA» que suben (coordenadas de pantalla) */
  function bubbles(ctx, cx, cy, r, lv) {
    var tt = now();
    if (lv > .3 && tt > Fx._spawn) {
      Fx._spawn = tt + .16 + Math.random() * .12;
      Fx.bubbles.push({ x: cx + (Math.random() - .5) * r * 3, y: cy + r * 1.2, vx: (Math.random() - .5) * 90, vy: 60 + Math.random() * 40, a: 1, txt: HA[Math.floor(Math.random() * HA.length)], rot: (Math.random() - .5) * .6, sz: 13 + Math.random() * 9 });
      if (Fx.bubbles.length > 14) Fx.bubbles.shift();
    }
    var dt = Fx._dt || 1 / 60;
    ctx.save(); ctx.textAlign = 'center';
    for (var i = Fx.bubbles.length - 1; i >= 0; i--) {
      var b = Fx.bubbles[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.vy *= .985; b.a -= dt * .7;
      if (b.a <= 0) { Fx.bubbles.splice(i, 1); continue; }
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.globalAlpha = Math.min(1, b.a * 1.6);
      ctx.font = '800 ' + b.sz + 'px "Trebuchet MS",sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,6,24,.85)'; ctx.strokeText(b.txt, 0, 0);
      ctx.fillStyle = party() ? '#ffd24d' : '#f6f1ff'; ctx.fillText(b.txt, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  /* envuelve drawFace: la cabeza crece, se sacude y suelta carcajadas */
  var origFace = G.drawFace;
  G.drawFace = function (ctx, th) {
    var tn = now(); Fx._dt = Math.min(.1, Math.max(0, tn - (Fx._last || tn))); Fx._last = tn;
    var target = Fx.target();
    Fx.lvl += (target - Fx.lvl) * Math.min(1, Fx._dt * 9);
    var lv = Fx.lvl;
    if (lv < .03) { if (Fx.bubbles.length) bubbles(ctx, VW / 2, 46, 25, 0); return origFace.call(this, ctx, th); }
    var mob = document.body.classList.contains('mobile');
    var cx = VW / 2, cy = mob ? 112 : 46, r = mob ? 20 : 25;
    var t = tn, sc = 1 + .7 * lv, sh = Math.sin(t * 38) * 3 * lv, bob = -Math.abs(Math.sin(t * 9)) * 9 * lv;
    this.faceState.expr = 'laugh'; this.faceState.swap = Math.max(this.faceState.swap, .6);
    ctx.save();
    ctx.translate(cx + sh, cy + bob + 18 * lv); ctx.scale(sc, sc); ctx.rotate(Math.sin(t * 11) * .07 * lv); ctx.translate(-cx, -cy);
    origFace.call(this, ctx, th);
    ctx.save(); ctx.translate(cx, cy); decorate(ctx, r, t, lv); ctx.restore();
    ctx.restore();
    bubbles(ctx, cx, cy + 20, r, lv);
  };

  /* utilidad para otros modos (cooperativo): dibuja la cara riendo en (cx,cy) */
  Fx.drawLaughFace = function (ctx, cx, cy, r) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(246,241,255,.96)'; ctx.beginPath(); ctx.ellipse(0, 0, r * .92, r, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#0a0818';
    ctx.beginPath(); ctx.arc(-r * .32, -r * .2, r * .2, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(r * .32, -r * .2, r * .2, 0, 6.283); ctx.fill();
    decorate(ctx, r, now(), 1);
    ctx.restore();
  };
})(window.EO);
