/* ============================================================================
   EL OBSERVADOR — trolls.js  (DIRECTOR DE TRAMPAS · estilo "Level Devil")
   ----------------------------------------------------------------------------
   El suelo se abre cuando pisas, aparecen pinchos donde ibas a aterrizar,
   caen bloques, te empujan, la puerta huye, brota una pared, los carteles
   mienten y el Observador se ríe encima de tu cabeza.

   Principios de diseño
   · NO ES MEMORIZABLE: cada intento semilla trampas nuevas, y tras cada
     muerte las trampas mutan (cambian de sitio, de disparador, de ritmo).
   · PERO ES JUSTO: toda trampa tiene un aviso mínimo (grieta, sombra,
     retardo de décimas) que se hace MÁS visible cuanto más mueres, y
     ninguna trampa impide superar el nivel (huecos ≤ 130 px, paredes ≤ 108 px).
   · SE BURLA: burbujas sobre tu cabeza y frases por tipo de trampa.
   Capa incremental: envuelve funciones de game.js / engine2.js; no las reescribe.
   ============================================================================ */
window.EO = window.EO || {};

(function (EO) {
  'use strict';

  var G = EO.Game, VW = EO.VW, VH = EO.VH;
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };

  function mb(seed) {            // mulberry32
    var s = (seed >>> 0) || 1;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(R, a) { return a[Math.floor(R() * a.length)]; }
  function rr(R, a, b) { return a + R() * (b - a); }

  /* ======================================================================
     FRASES  (por tipo de trampa, muerte, aprendizaje, misericordia…)
     ====================================================================== */
  var Q = EO.QUOTES;
  Q.trap_trapdoor = [
    'El suelo era una sugerencia.',
    'Ahí había suelo. Ahora hay una oportunidad de reflexión.',
    'Qué bien caes. En serio, lo haces con gracia.',
    'Pisaste donde se pisa. Ese fue tu error.',
    'Lo tapé con mucho cariño y tú, ¡pum!, directo al fondo.'
  ];
  Q.trap_fakefloor = [
    'Parecía suelo. Eso es todo lo que prometí.',
    'Es suelo decorativo. Disculpa si no lo aclaré.',
    'Fíjate: en el cartel de abajo pone "no es de verdad". Es que no hay cartel.',
    'Los huecos con buena pintura pasan por suelo. Lo sé de primera mano.'
  ];
  Q.trap_popspike = [
    'Los pinchos tienen ganas de conocerte.',
    'Brotaron justo donde ibas a caer. Qué casualidad. No lo es.',
    'Ahí no había nada. Hasta que lo hubo.',
    'Aterrizaje de diez. Lástima el comité de bienvenida.',
    'La naturaleza siempre encuentra un camino. Los pinchos, también.'
  ];
  Q.trap_thwomp = [
    'Mira arriba. A veces.',
    'Ese bloque lleva toda la vida esperándote.',
    'Un poco de sombra no te vendría mal. Has tenido cinco toneladas.',
    '¿Oíste algo? Yo tampoco. Por eso funcionó.',
    'La gravedad te manda recuerdos.'
  ];
  Q.trap_shove = [
    '¿Te empujé? Qué grosería. Ah, sí. Fui yo.',
    'Un empujoncito. De los que cambian vidas.',
    'No fue una mano. Fue una opinión.',
    'Dirección equivocada, amigo. Siempre.',
    'Lo siento. No lo siento. Me ha encantado.'
  ];
  Q.trap_wall = [
    'Esa pared llevaba ahí toda la vida. Tú llegaste tarde.',
    'No lo viste venir porque no estaba. Qué descuidado soy.',
    'Las paredes también se hacen ilusiones.',
    'Un salto. Era solo un salto. Y mira.'
  ];
  Q.trap_bait = [
    'Tenía pinta de premio. Eso es publicidad engañosa.',
    'Era una trampa. Con lazo. Con lazo muy bonito.',
    'La codicia es una gran maestra. De mí.'
  ];
  Q.trap_runaway = [
    'Era mi puerta. Y no tiene prisa por conocerte.',
    'No corras detrás de ella. Las puertas huyen del que corre.'
  ];
  Q.trap_learn = [
    'Ahora está ahí. Antes no. No es culpa mía.',
    'La trampa se ha mudado. Me dijo que le debías un favor.',
    'Aprendiste dónde estaba. Qué mono. Se acabó.',
    'Cambié las cosas de sitio. No hace falta que me lo agradezcas.',
    'Lo de antes era un ensayo. Esto es el estreno.'
  ];
  Q.trap_mercy = [
    'Vale, te doy una pista: mira bien el suelo. Una sola vez.',
    'Me das pena. Te regalo un aviso. No lo gastes en tonterías.',
    'He subido el brillo de las grietas. Solo por ti. No se lo cuentes a nadie.'
  ];
  Q.psy_fakewin = [
    'Perdón. Era un ensayo. Se me ha escapado el confeti.',
    '¿Pensaste que ya? Qué ilusión. Qué ternura.',
    'Error administrativo. Pásate por ventanilla. Cerrada.'
  ];
  Q.psy_fakedeath = [
    'Es un simulacro. No lo era. Mentira. Sí lo era.',
    'Quería saber qué cara pondrías. Ya lo sé.',
    'No has muerto. Aún. Calma, que me estoy organizando.'
  ];
  Q.psy_static = [
    '¿Lo has visto? Yo tampoco.',
    'Se ha ido la señal. Y no tengo antena.',
    'Es normal. Es normal. Seguro que es normal.'
  ];
  Q.psy_nojump = [
    'Salto no disponible. Intenta de nuevo más tarde.',
    'Estamos de mantenimiento. Las piernas, también.',
    'Tu botón de saltar está en huelga.'
  ];
  Q.psy_mirror = [
    'Mandos en mantenimiento. Izquierda es derecha un ratito.',
    'Un pequeño cambio de perspectiva. Gratis.',
    'Derecha, izquierda. Qué importa. Todo es relativo.'
  ];
  Q.bub_fire = ['¡Plof!', 'Ups.', 'Jaja.', 'Ay.', '¿Eh?', 'Vaya.', 'Mmm.', '¿Seguro?'];
  Q.bub_dodge = ['¡Eh! ¿Adónde vas?', 'Qué prisa.', 'No tan rápido.', 'Por aquí no.', 'Jiji.'];
  Q.bub_surrender = ['Vale. Me rindo. Entra.', 'Estoy cansada. Pasa.'];
  Q.bub_bait = ['Gracias por tu contribución.', 'Era una trampa. De nada.', 'Qué curioso.'];
  Q.bub_idle = ['No pienses tanto.', 'Se nota que sospechas.', 'Sigue. No hay nada. (Hay algo.)'];

  var SIGN_LIES = ['SEGURO ✓', 'SUELO SÓLIDO', 'AQUÍ NO PASA NADA', 'CAMINO LIBRE', 'TODO BAJO CONTROL',
    'CONFÍA EN MÍ', 'PISO FIRME ✓', 'NADA QUE VER AQUÍ', 'ZONA TRANQUILA'];
  var SIGN_TRUTH = ['OJO AL SUELO', '⚠ CUIDADO', 'MIRA ARRIBA', 'NO CONFÍES', 'TE ESTOY MIRANDO', '¿SEGURO?'];

  /* ======================================================================
     CONFIGURACIÓN · cantidad, desbloqueo y elegibilidad
     ====================================================================== */
  function effLevel(mode, num) {
    if (mode === 'story') return num;
    if (mode === 'diablo') return num + 8;
    return num + 5;
  }
  function countFor(mode, num) {
    if (mode === 'story') return clamp(Math.round(1 + num * 0.28), 1, 9);
    if (mode === 'diablo') return Math.min(18, 5 + Math.floor(num * 0.7));
    if (mode === 'infinito') return Math.min(16, 3 + Math.floor(num * 0.55));
    return Math.min(14, 3 + Math.floor(num * 0.4));
  }
  var KINDS = [
    { k: 'trapdoor', from: 1, w: 3.2 },
    { k: 'fakefloor', from: 2, w: 1.5 },
    { k: 'popspike', from: 3, w: 2.6 },
    { k: 'thwomp', from: 5, w: 2.2 },
    { k: 'shove', from: 6, w: 1.6 }
  ];

  function eligible(lv) {
    if (!lv || lv.boss) return false;
    var r = lv.rules || {}, gt = lv.goal && lv.goal.type;
    if (gt === 'wait' || gt === 'altar' || gt === 'boss') return false;
    if (r.twin || (r.gravity != null && r.gravity < 0) || r.canJump === false) return false;
    return true;
  }

  /* ======================================================================
     UTILIDADES DE GEOMETRÍA
     ====================================================================== */
  function clonePl(p) { var o = {}; for (var k in p) o[k] = p[k]; return o; }

  function realExit(lv) {
    var e = (lv.exits || []).filter(function (x) { return x.kind === 'real' && !x.hidden; })[0];
    return e || null;
  }

  function surfacesOf(lv) {
    var out = [];
    lv._base.forEach(function (p, i) {
      if (p.type === 'solid' && p.w >= 150 && p.h >= 40) out.push({ p: p, i: i });
    });
    return out;
  }

  /* reconstruye lv.platforms = base + trampas de geometría */
  function geometry(G) {
    var lv = G.lvl;
    var plats = lv._base.map(clonePl);
    lv.traps.forEach(function (t) { if (t.k === 'trapdoor') { t.pl = null; } });
    var doors = lv.traps.filter(function (t) { return t.k === 'trapdoor'; }).sort(function (a, b) { return a.x - b.x; });
    doors.forEach(function (t) {
      for (var i = 0; i < plats.length; i++) {
        var p = plats[i];
        if (p.type !== 'solid' || p.tdoor || p.x > t.x + 0.5 || p.x + p.w < t.x + t.w - 0.5 || Math.abs(p.y - t.sy) > 1) continue;
        var left = clonePl(p), door = clonePl(p), right = clonePl(p), repl = [];
        left.w = t.x - p.x;
        door.x = t.x; door.w = t.w; door.tdoor = t; door.tgone = false;
        right.x = t.x + t.w; right.w = p.x + p.w - (t.x + t.w);
        if (left.w > 1) repl.push(left);
        repl.push(door);
        if (right.w > 1) repl.push(right);
        plats.splice.apply(plats, [i, 1].concat(repl));
        t.pl = door;
        return;
      }
    });
    lv.traps.forEach(function (t) {
      if (t.k !== 'fakefloor') return;
      var f = { x: t.x, y: t.sy, w: t.w, h: 60, type: 'solid', tfake: true, amp: 0, speed: 1, phase: 0 };
      plats.push(f); t.pl = f;
    });
    plats.forEach(function (p, i) {
      p.id = i; p.bx = p.bx != null ? p.bx : p.x; p.by = p.by != null ? p.by : p.y;
      p.px = p.x; p.py = p.y; p.dx = 0; p.dy = 0;
      if (typeof p.amp !== 'number') p.amp = 0;
      p.speed = p.speed || 1; p.phase = p.phase || 0;
    });
    lv.platforms = plats;
  }

  /* ampliar la plataforma de la salida (para que la puerta pueda huir) */
  function extendExitPlatform(lv, ex, dir) {
    var cx = ex.x + 27, bottom = ex.y + ex.h, sp = null, i;
    for (i = 0; i < lv.platforms.length; i++) {
      var pl = lv.platforms[i];
      if (pl.type === 'solid' && cx >= pl.x && cx <= pl.x + pl.w && Math.abs(bottom - pl.y) < 14) { sp = pl; break; }
    }
    if (!sp) return null;
    var room = dir > 0 ? (sp.x + sp.w) - (ex.x + ex.w) : ex.x - sp.x;
    if (room >= 260) return sp;
    var need = 300 - room;
    var nx0 = dir > 0 ? sp.x + sp.w : sp.x - need, nx1 = nx0 + need;
    for (i = 0; i < lv.platforms.length; i++) {
      var o = lv.platforms[i];
      if (o !== sp && o.x < nx1 + 70 && o.x + o.w > nx0 - 70 && o.y < sp.y + sp.h && o.y + o.h > sp.y - 320) return null;
    }
    if (dir > 0) {
      sp.w += need;
      if (sp.x + sp.w + 90 > lv.world.w) lv.world.w = Math.round(sp.x + sp.w + 90);
    } else {
      if (sp.x - need < 50) return null;
      sp.x -= need; sp.w += need; sp.bx = sp.x;
    }
    return sp;
  }

  /* ======================================================================
     CONSTRUCCIÓN DE TRAMPAS
     ====================================================================== */
  function tooClose(lv, cx, minD) {
    for (var i = 0; i < lv.traps.length; i++) {
      var t = lv.traps[i];
      if (t.x == null) continue;
      if (Math.abs((t.x + (t.w || 0) / 2) - cx) < minD) return true;
    }
    return false;
  }

  function placeOnSurface(R, lv, wTrap, margin, opts) {
    opts = opts || {};
    var S = lv._surf, tot = 0, i;
    if (!S.length) return null;
    for (i = 0; i < S.length; i++) tot += S[i].p.w;
    var ex = realExit(lv);
    for (var tries = 0; tries < 24; tries++) {
      var r = R() * tot, s = S[0];
      for (i = 0; i < S.length; i++) { r -= S[i].p.w; if (r <= 0) { s = S[i]; break; } }
      var lo = s.p.x + margin, hi = s.p.x + s.p.w - margin - wTrap;
      if (hi < lo) continue;
      var x = Math.round(lo + R() * (hi - lo)), cx = x + wTrap / 2;
      if (Math.abs(cx - lv.spawn.x) < 300) continue;
      if (ex && !opts.nearExit && Math.abs(cx - (ex.x + 27)) < 170) continue;
      if (tooClose(lv, cx, opts.gap || 230)) continue;
      return { x: x, s: s };
    }
    return null;
  }

  function tellFor(R, G) {
    var mode = G.mode, base = mode === 'story' ? (G.levelNum < 8 ? 0.85 : 0.55) : 0.3;
    return clamp(base + (R() - 0.5) * 0.4, 0, 1);
  }

  var MAKE = {
    trapdoor: function (R, G, lv, eff) {
      var w = Math.round(rr(R, 74, 112));
      var pos = placeOnSurface(R, lv, w, 58); if (!pos) return null;
      var vs = ['step', 'step', 'near', 'passed'];
      return { k: 'trapdoor', x: pos.x, w: w, sy: pos.s.p.y, bi: pos.s.i, v: pick(R, vs), delay: rr(R, 0.1, 0.3), near: rr(R, 90, 150) };
    },
    fakefloor: function (R, G, lv) {
      var S = lv._surf.slice().sort(function (a, b) { return a.p.x - b.p.x; }), c = [];
      for (var i = 0; i < S.length - 1; i++) {
        var A = S[i].p, B = S[i + 1].p, gap = B.x - (A.x + A.w);
        if (gap >= 80 && gap <= 190 && Math.abs(A.y - B.y) <= 60) {
          var cx = A.x + A.w + gap / 2;
          if (Math.abs(cx - lv.spawn.x) < 300 || tooClose(lv, cx, 200)) continue;
          c.push({ x: A.x + A.w, w: gap, sy: Math.min(A.y, B.y) });
        }
      }
      if (!c.length) return null;
      var g = pick(R, c);
      return { k: 'fakefloor', x: g.x, w: g.w, sy: g.sy, bi: -1 };
    },
    popspike: function (R, G, lv) {
      var w = Math.round(rr(R, 48, 72));
      var pos = placeOnSurface(R, lv, w, 60); if (!pos) return null;
      return { k: 'popspike', x: pos.x, w: w, h: 36, sy: pos.s.p.y, bi: pos.s.i, v: R() < 0.5 ? 'near' : 'landing', near: rr(R, 110, 190), hold: rr(R, 1.4, 2.4) };
    },
    thwomp: function (R, G, lv) {
      var w = Math.round(rr(R, 88, 110));
      var pos = placeOnSurface(R, lv, w, 70); if (!pos) return null;
      return { k: 'thwomp', x: pos.x, w: w, h: 92, sy: pos.s.p.y, bi: pos.s.i, trig: rr(R, 130, 200), warn: rr(R, 0.28, 0.42) };
    },
    shove: function (R, G, lv) {
      var w = 150;
      var pos = placeOnSurface(R, lv, w, 40); if (!pos) return null;
      return { k: 'shove', x: pos.x, w: w, sy: pos.s.p.y, bi: pos.s.i, pushBack: R() < 0.65, str: rr(R, 430, 640), dur: rr(R, 0.4, 0.6) };
    }
  };

  function weightedKind(R, eff) {
    var pool = KINDS.filter(function (k) { return eff >= k.from; }), tot = 0, i;
    pool.forEach(function (k) { tot += k.w; });
    var r = R() * tot;
    for (i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) return pool[i].k; }
    return pool[0].k;
  }

  function addTrap(G, lv, kind, R) {
    var eff = effLevel(G.mode, G.levelNum);
    var t = MAKE[kind](R, G, lv, eff);
    if (!t) return null;
    t.id = lv.traps.length ? lv.traps[lv.traps.length - 1].id + 1 : 1;
    t.deaths = 0; t.tell = tellFor(R, G);
    armTrap(t);
    lv.traps.push(t);
    return t;
  }

  /* estado de ejecución (se reinicia en cada intento) */
  function armTrap(t) {
    t.fired = false; t.arm = -1; t.fy = 0; t.fvy = 0; t.rot = 0; t.up = 0; t.t = 0;
    t.state = 'idle'; t.act = 0; t.anim = 0; t.touched = false; t.cd = 0; if (t.k !== 'runaway') t.y0 = null; /* en la puerta que huye y0 es su altura de origen: no borrar */ t.ty = 0; t.pl = t.pl || null;
    t.got = false; t.dead = false;
  }

  /* ======================================================================
     BUILD  (tras cargar el nivel)
     ====================================================================== */
  EO.Trolls = {
    enabled: true,
    eligible: eligible,

    build: function (G) {
      var lv = G.lvl;
      if (!lv) return;
      lv.traps = []; lv.psy = null; lv._troll = false;
      G.bubbles = []; G.fx = { noise: 0, fake: 0, fakeText: '' };
      if (!this.enabled || !eligible(lv)) { lv._base = lv.platforms.map(clonePl); return; }

      lv._troll = true;
      var seed = (EO.Chaos && EO.Chaos.seedFor ? EO.Chaos.seedFor(G, G.levelNum) : (Math.random() * 1e9) | 0) ^ 0x51ED270B;
      lv._seed = seed >>> 0;
      var R = mb(lv._seed);
      var eff = effLevel(G.mode, G.levelNum);
      var ex = realExit(lv);
      lv._dir = (ex && ex.x < lv.spawn.x) ? -1 : 1;

      /* puerta que huye: ampliamos su plataforma ANTES de capturar la base */
      var runaway = false;
      if (ex && !ex.mover && eff >= 4 && R() < clamp(0.35 + eff * 0.018, 0.35, 0.8) && (lv.goal.type === 'exit' || lv.goal.type === 'orbs_exit')) {
        var sp = extendExitPlatform(lv, ex, lv._dir);
        if (sp) { runaway = { sp: sp }; }
      }

      lv._base = lv.platforms.map(clonePl);
      lv._surf = surfacesOf(lv);

      var n = countFor(G.mode, G.levelNum), guard = 0;
      while (lv.traps.length < n && guard++ < n * 6) {
        addTrap(G, lv, weightedKind(R, eff), R);
      }
      /* trampas únicas */
      if (runaway && ex) {
        var spb = lv._base.filter(function (p) { return Math.abs(p.x - runaway.sp.x) < 1 && Math.abs(p.y - runaway.sp.y) < 1; })[0] || runaway.sp;
        var rt = { k: 'runaway', id: 90, ex: ex, x: ex.x, w: 54, sy: runaway.sp.y, x0: ex.x, y0: ex.y,
          lo: spb.x + 16, hi: spb.x + spb.w - 70, dodges: 2 + Math.floor(R() * 3), deaths: 0, tell: 0 };
        armTrap(rt); rt.x0 = ex.x; lv.traps.push(rt);
      }
      if (ex && eff >= 8 && R() < 0.4 && (lv.goal.type === 'exit' || lv.goal.type === 'orbs_exit')) {
        var wsurf = lv._surf.filter(function (s) { var cx = ex.x + 27 - lv._dir * 150; return cx > s.p.x + 30 && cx < s.p.x + s.p.w - 30 && Math.abs(ex.y + ex.h - s.p.y) < 14; })[0];
        if (wsurf) {
          var wt = { k: 'wall', id: 91, x: Math.round(ex.x + 27 - lv._dir * 150 - 22), w: 44, h: Math.round(rr(R, 96, 108)), sy: wsurf.p.y, bi: wsurf.i, trig: 270, deaths: 0, tell: 0 };
          armTrap(wt); lv.traps.push(wt);
        }
      }
      if (eff >= 9 && R() < 0.45) {
        var bp = placeOnSurface(R, lv, 40, 50, {});
        if (bp) { var bt = { k: 'bait', id: 92, x: bp.x, w: 40, sy: bp.s.p.y, bi: bp.s.i, deaths: 0, tell: 0 }; armTrap(bt); lv.traps.push(bt); }
      }

      geometry(G);
      lv.traps.forEach(function (t) { if (t.k === 'runaway') { t.ex.x = t.x0; t.ex.y = t.y0; t.ex._tx = t.x0; } });

      /* carteles que mienten (y alguno que dice la verdad) */
      lv.signs = lv.signs || [];
      lv.traps.forEach(function (t) {
        if (t.x == null || t.k === 'runaway' || t.k === 'wall' || R() > 0.34) return;
        var lie = R() < 0.65;
        var sx = Math.round(t.x - lv._dir * 170);
        lv.signs.push({ x: clamp(sx, 30, lv.world.w - 160), y: t.sy - 76, text: pick(R, lie ? SIGN_LIES : SIGN_TRUTH), truth: !lie, troll: true });
      });
      /* cartel-señuelo: advierte de un peligro que no existe */
      if (eff >= 3 && lv._surf.length && R() < 0.7) {
        var dp = placeOnSurface(R, lv, 130, 40, { gap: 160 });
        if (dp) lv.signs.push({ x: dp.x, y: dp.s.p.y - 76, text: '⚠ TRAMPA ⚠', truth: false, troll: true });
      }

      /* eventos psicológicos */
      if (eff >= 3) lv.psy = { t: rr(R, 8, 14), n: 0 };
    },

    /* ================================================================
       MUTACIÓN tras cada muerte: el nivel aprende de ti
       ================================================================ */
    afterRespawn: function (G) {
      var lv = G.lvl;
      if (!lv || !lv._troll || !lv.traps || !lv._base) return;
      var R = mb(((lv._seed || 1) ^ ((G.deaths || 0) * 977)) >>> 0);
      var eff = effLevel(G.mode, G.levelNum);
      var learned = false, i;
      if (lv.rules && lv._njUntil) { lv.rules.canJump = true; lv._njUntil = 0; }

      /* misericordia: tras muchas muertes, avisos más visibles; y se retira lo que más te mata */
      var mercy = G.deaths >= 7;
      if (mercy) lv.traps.forEach(function (t) { t.tell = 1; });
      if (G.deaths >= 12 && lv.lastKiller && lv.traps.length > 2) {
        var ix = lv.traps.indexOf(lv.lastKiller);
        if (ix >= 0 && lv.lastKiller.k !== 'runaway') { lv.traps.splice(ix, 1); G.bubble('Te perdono esa.', 2.4); }
      }
      if (G.deaths === 7 && G.mode !== 'silencio') EO.UI.say(EO.UI.quote('trap_mercy'), { duration: 3600 });

      lv.traps.forEach(function (t) {
        if (t.k === 'runaway') { t.ex.x = t.x0; t.ex.y = t.y0; t.ex._tx = t.x0; t.dodges = Math.max(1, 2 + Math.floor(R() * 3) - (G.deaths >= 6 ? 1 : 0)); armTrap(t); return; }
        var heavy = t.deaths >= 2 && R() < 0.65, light = R() < 0.32;
        if (heavy || light) {
          if (t.bi >= 0 && t.k !== 'wall' && t.k !== 'fakefloor') {
            var b = lv._base[t.bi], margin = t.k === 'thwomp' ? 70 : 58;
            var lo = b.x + margin, hi = b.x + b.w - margin - t.w;
            if (hi > lo) {
              for (var k = 0; k < 10; k++) {
                var nx = Math.round(lo + R() * (hi - lo)), cx = nx + t.w / 2, ok = true;
                lv.traps.forEach(function (o) { if (o !== t && o.x != null && o.k !== 'runaway' && Math.abs(o.x + o.w / 2 - cx) < 200) ok = false; });
                if (Math.abs(cx - lv.spawn.x) < 300) ok = false;
                if (ok) { if (heavy && Math.abs(nx - t.x) > 60) learned = true; t.x = nx; break; }
              }
            }
          }
          if (t.k === 'trapdoor') { t.v = pick(R, ['step', 'near', 'passed']); t.delay = rr(R, 0.08, 0.3); t.near = rr(R, 80, 160); }
          else if (t.k === 'popspike') { t.v = R() < 0.5 ? 'near' : 'landing'; t.near = rr(R, 100, 200); t.hold = rr(R, 1.3, 2.6); }
          else if (t.k === 'thwomp') { t.trig = rr(R, 120, 210); t.warn = rr(R, 0.26, 0.42); }
          else if (t.k === 'shove') { t.pushBack = R() < 0.6; t.str = rr(R, 420, 660); }
        }
        armTrap(t);
      });

      /* el nivel crece: cada 3 muertes aparece una trampa nueva */
      var cap = countFor(G.mode, G.levelNum) + 4;
      if (G.deaths > 0 && G.deaths % 3 === 0 && !mercy && lv.traps.length < cap) {
        var nt = addTrap(G, lv, weightedKind(R, eff), R);
        if (nt) learned = true;
      }
      geometry(G);
      lv.traps.forEach(function (t) { if (t.k === 'runaway') { t.ex.x = t.x0; t.ex._tx = t.x0; } });
      lv.lastKiller = null;
      if (lv.psy) lv.psy.t = rr(R, 7, 13);
      G._blame = null;
      if (learned && !mercy && G.mode !== 'silencio' && R() < 0.7) EO.UI.say(EO.UI.quote('trap_learn'), { duration: 3200 });
    }
  };

  /* ======================================================================
     UTILIDADES DE EJECUCIÓN
     ====================================================================== */
  G.bubbles = []; G.fx = { noise: 0, fake: 0, fakeText: '' };
  G.bubble = function (text, life) {
    if (!text || this.mode === 'silencio') return;
    this.bubbles = this.bubbles || [];
    this.bubbles.push({ text: text, t: 0, life: life || 1.8 });
    if (this.bubbles.length > 2) this.bubbles.shift();
  };
  function blame(G, t) { G._blame = { trap: t, t: G.t }; }
  function say(G, cat, ms) { if (G.mode !== 'silencio') EO.UI.say(EO.UI.quote(cat), { duration: ms || 2600 }); }
  function quip(G, cat, chance) { if (Math.random() < (chance == null ? 0.55 : chance)) G.bubble(EO.UI.quote(cat), 1.5); }

  function collides(G, lv, p) {
    for (var i = 0; i < lv.platforms.length; i++) {
      var pl = lv.platforms[i];
      if (!G.platformActive(pl)) continue;
      if (G.aabb(p, pl)) return true;
    }
    return false;
  }

  /* ======================================================================
     ACTUALIZACIÓN POR TIPO DE TRAMPA  (devuelve true si ha matado)
     ====================================================================== */
  var UPD = {};

  UPD.trapdoor = function (G, lv, p, t, dt, dir, px, feet) {
    var pl = t.pl; if (!pl) return false;
    if (!t.fired) {
      var d = dir > 0 ? pl.x - (p.x + p.w) : p.x - (pl.x + pl.w);
      var passed = -d - pl.w;
      var level = p.onGround && Math.abs(feet - pl.y) < 8;
      var trig = false;
      if (t.v === 'step') trig = p.standing >= 0 && lv.platforms[p.standing] === pl;
      else if (t.v === 'near') trig = level && d <= t.near && d > -pl.w;
      else trig = level && passed > t.near && passed < 520;
      if (trig && t.arm < 0) {
        t.arm = t.v === 'step' ? t.delay : 0;
        if (t.arm > 0) G.burst(pl.x + pl.w / 2, pl.y, 6, '#bdb6f0', 70);
      }
      if (t.arm >= 0) {
        t.arm -= dt;
        if (t.arm <= 0) {
          pl.tgone = true; t.fired = true; t.fvy = -140;
          G.shake = Math.max(G.shake, 7);
          G.burst(pl.x + pl.w / 2, pl.y, 18, '#cfc8ff', 210);
          EO.Audio.tone(150, 0.28, 'sawtooth', 0.12, 46);
          blame(G, t); quip(G, 'bub_fire', 0.5);
        }
      }
    } else {
      t.fvy += 2300 * dt; t.fy += t.fvy * dt; t.rot += dt * 3.2;
      if (p.y > t.sy + 170 && px > t.x - 26 && px < t.x + t.w + 26) { G.kill('trap:trapdoor'); return true; }
    }
    return false;
  };

  UPD.fakefloor = function (G, lv, p, t, dt, dir, px, feet) {
    var pl = t.pl; if (!pl) return false;
    t.t += dt;
    if (!t.touched && px > pl.x && px < pl.x + pl.w && feet > pl.y - 6 && feet < pl.y + 80) {
      t.touched = true; blame(G, t);
      EO.Audio.tone(220, 0.3, 'triangle', 0.1, 90);
      quip(G, 'bub_fire', 0.6);
    }
    if (t.touched && p.y > pl.y + 170) { G.kill('trap:fakefloor'); return true; }
    return false;
  };

  UPD.popspike = function (G, lv, p, t, dt, dir, px, feet) {
    var cx = t.x + t.w / 2;
    if (!t.fired) {
      var d = dir > 0 ? t.x - (p.x + p.w) : p.x - (t.x + t.w);
      var trig = false;
      if (t.v === 'near') trig = p.onGround && Math.abs(feet - t.sy) < 8 && d > 40 && d < t.near;
      else trig = !p.onGround && p.vy > -120 && Math.abs(px - cx) < t.w / 2 + 28 && feet < t.sy - 90 && t.sy - feet < 260;
      if (trig) {
        t.fired = true; t.t = 0; blame(G, t);
        EO.Audio.tone(900, 0.12, 'square', 0.1, 300);
        G.burst(cx, t.sy, 10, '#ff8ba3', 150);
        quip(G, 'bub_fire', 0.4);
      }
    } else {
      t.t += dt;
      var tgt = t.t < t.hold ? 1 : 0;
      t.up = clamp(t.up + (tgt ? dt * 8 : -dt * 3), 0, 1);
      if (t.up > 0.55) {
        var hh = t.h * t.up;
        if (G.aabb(p, { x: t.x + 8, y: t.sy - hh + 8, w: t.w - 16, h: hh - 8 })) { G.kill('trap:popspike'); return true; }
      }
    }
    return false;
  };

  UPD.thwomp = function (G, lv, p, t, dt, dir, px, feet) {
    if (t.y0 == null) { t.y0 = t.sy - 480 - t.h; t.ty = t.y0; }
    var cx = t.x + t.w / 2;
    if (t.cd > 0) t.cd -= dt;
    if (t.state === 'idle') {
      var d = dir > 0 ? t.x - (p.x + p.w) : p.x - (t.x + t.w);
      var under = Math.abs(px - cx) < t.w / 2 + 10;
      if (t.cd <= 0 && ((d > -4 && d < t.trig) || under) && Math.abs(feet - t.sy) < 220) {
        t.state = 'warn'; t.t = 0; blame(G, t);
        EO.Audio.tone(70, t.warn, 'sawtooth', 0.12, 40);
      }
    } else if (t.state === 'warn') {
      t.t += dt;
      if (Math.random() < 0.5) G.burst(cx + (Math.random() - 0.5) * t.w, t.sy - 380 + Math.random() * 60, 1, '#9d97c9', 60);
      if (t.t >= t.warn) { t.state = 'fall'; t.fvy = 0; G.shake = Math.max(G.shake, 3); }
    } else if (t.state === 'fall') {
      t.fvy = Math.min(1900, t.fvy + 4600 * dt); t.ty += t.fvy * dt;
      if (t.ty + t.h >= t.sy) {
        t.ty = t.sy - t.h; t.state = 'rest'; t.t = 0;
        G.shake = Math.max(G.shake, 12);
        G.burst(cx, t.sy, 22, '#d6d0ff', 240);
        EO.Audio.tone(55, 0.4, 'square', 0.22, 28);
      }
    } else if (t.state === 'rest') {
      t.t += dt; if (t.t > 0.65) { t.state = 'rise'; }
    } else if (t.state === 'rise') {
      t.ty -= 330 * dt;
      if (t.ty <= t.y0) { t.ty = t.y0; t.state = 'idle'; t.cd = 1.6; }
    }
    if (t.state === 'fall' || t.state === 'rest' || (t.state === 'rise' && t.ty > t.sy - t.h - 40)) {
      if (G.aabb(p, { x: t.x + 5, y: t.ty + 6, w: t.w - 10, h: t.h - 6 })) { G.kill('trap:thwomp'); return true; }
    }
    return false;
  };

  UPD.shove = function (G, lv, p, t, dt, dir, px, feet) {
    if (!t.fired) {
      if (p.onGround && Math.abs(feet - t.sy) < 8 && px > t.x && px < t.x + t.w) {
        t.fired = true; t.act = t.dur; t.dirP = t.pushBack ? -dir : dir;
        blame(G, t); EO.Audio.tone(110, 0.35, 'sawtooth', 0.14, 380);
        G.shake = Math.max(G.shake, 5); quip(G, 'bub_fire', 0.35);
      }
    } else if (t.act > 0) {
      t.act -= dt;
      var v = t.str * (G.hasSkill('dobleSalto') ? 1.5 : 1) * Math.max(0, t.act / t.dur), dx = t.dirP * v * dt;
      p.x += dx;
      if (collides(G, lv, p)) p.x -= dx;
      if (Math.random() < 0.5) G.burst(p.x + p.w / 2 - t.dirP * 14, p.y + p.h * 0.6, 1, '#cfc8ff', 90);
    }
    return false;
  };

  UPD.runaway = function (G, lv, p, t, dt, dir, px, feet) {
    var ex = t.ex; if (!ex) return false;
    if (ex._tx == null) ex._tx = ex.x;
    ex.x += (ex._tx - ex.x) * Math.min(1, dt * 9);
    if (t.dodges > 0 && Math.abs(ex._tx - ex.x) < 6) {
      var cxE = ex.x + ex.w / 2;
      if (Math.abs(px - cxE) < 175 && Math.abs(feet - (ex.y + ex.h)) < 120) {
        var sgn = px < cxE ? 1 : -1;
        var tgt = clamp(ex.x + sgn * rr(Math.random, 150, 205), t.lo, t.hi);
        if (Math.abs(tgt - ex.x) < 40) {
          t.dodges = 0;
          G.bubble(pick(Math.random, Q.bub_surrender), 2);
        } else {
          ex._tx = tgt; t.dodges--;
          G.burst(cxE, ex.y + 46, 18, '#8ef4ff', 200);
          G.shake = Math.max(G.shake, 4);
          EO.Audio.tone(620, 0.16, 'triangle', 0.12, 260);
          G.bubble(pick(Math.random, Q.bub_dodge), 1.4);
          if (t.dodges <= 0) G.bubble(pick(Math.random, Q.bub_surrender), 2.2);
        }
      }
    }
    return false;
  };

  UPD.wall = function (G, lv, p, t, dt, dir, px, feet) {
    if (!t.fired) {
      var d = dir > 0 ? t.x - (p.x + p.w) : p.x - (t.x + t.w);
      if (p.onGround && Math.abs(feet - t.sy) < 8 && d < t.trig && d > 90) {
        t.fired = true; t.anim = 0; blame(G, t);
        var wp = { x: t.x, y: t.sy - t.h, w: t.w, h: t.h, type: 'solid', wall: true, wallUp: 0, id: lv.platforms.length, amp: 0, speed: 1, phase: 0 };
        wp.bx = wp.x; wp.by = wp.y; wp.px = wp.x; wp.py = wp.y; wp.dx = 0; wp.dy = 0;
        lv.platforms.push(wp); t.pl = wp;
        EO.Audio.tone(80, 0.22, 'square', 0.16, 160);
        G.shake = Math.max(G.shake, 6);
        G.burst(t.x + t.w / 2, t.sy, 16, '#d6d0ff', 200);
        G.bubble('Pared.', 1.6);
      }
    } else if (t.pl) {
      t.anim = Math.min(1, t.anim + dt * 6);
      t.pl.wallUp = t.anim;
    }
    return false;
  };

  UPD.bait = function (G, lv, p, t, dt, dir, px, feet) {
    if (t.got) return false;
    var ox = t.x + t.w / 2, oy = t.sy - 92;
    var near = Math.abs(px - ox) < 28 && Math.abs((p.y + p.h / 2) - oy) < 32;
    if (!near && G.hasSkill('iman')) near = Math.hypot(px - ox, (p.y + p.h / 2) - oy) < 80;
    if (near) {
      t.got = true; blame(G, t);
      EO.Audio.orb();
      G.burst(ox, oy, 22, '#ff6bd6', 220);
      G.bubble(pick(Math.random, Q.bub_bait), 2);
      G.curse();
    }
    return false;
  };

  /* maldiciones temporales (cebo / eventos) */
  G.curse = function (kind) {
    var lv = this.lvl; if (!lv) return;
    var opts = ['mirror', 'nojump'];
    if (!kind) kind = opts[Math.floor(Math.random() * opts.length)];
    if (kind === 'mirror' && !lv.mirrorLvl) {
      lv.rules.invert = true; this.mirrorUntil = this.t + 3.2;
      EO.UI.toast('MANDOS EN ESPEJO', 'Durante unos segundos, izquierda es derecha.', 2400);
    } else {
      lv._njUntil = this.t + 1.3; lv.rules.canJump = false;
      EO.UI.toast('SALTO NO DISPONIBLE', 'Inténtalo más tarde.', 1800);
    }
  };

  /* ======================================================================
     EVENTOS PSICOLÓGICOS (sin posición: te pillan donde estés)
     ====================================================================== */
  function psyUpdate(G, lv, p, dt) {
    if (lv._njUntil && G.t > lv._njUntil) { lv.rules.canJump = true; lv._njUntil = 0; }
    var psy = lv.psy; if (!psy) return;
    psy.t -= dt;
    if (psy.t > 0) return;
    var pl = p.standing >= 0 ? lv.platforms[p.standing] : null;
    var safe = p.onGround && pl && pl.type === 'solid' && !pl.tdoor && !pl.tfake && !pl.wall &&
      (p.x + p.w / 2) > pl.x + 70 && (p.x + p.w / 2) < pl.x + pl.w - 70;
    var prog = p.x / Math.max(1, lv.world.w);
    if (!safe || prog < 0.12) { psy.t = 0.6; return; }
    var eff = effLevel(G.mode, G.levelNum);
    var list = ['static', 'fakewin', 'fakedeath', 'mirror', 'nojump'];
    var ev = list[Math.floor(Math.random() * list.length)];
    psy.n++; psy.t = Math.max(6, 16 - eff * 0.25) + Math.random() * 6;
    if (ev === 'static') {
      G.fx.noise = 0.7; EO.Audio.tone(60, 0.5, 'sawtooth', 0.1, 220);
      say(G, 'psy_static', 2400);
    } else if (ev === 'fakewin') {
      EO.UI.toast('NIVEL SUPERADO', 'Enhorabuena. Cobrar el premio en ventanilla.', 1700);
      EO.Audio.win(); G.burst(p.x + p.w / 2, p.y, 40, '#fff3c4', 300); G.winFlash = 0.8;
      setTimeout(function () { if (G.phaseName === 'play') say(G, 'psy_fakewin', 3000); }, 1200);
    } else if (ev === 'fakedeath') {
      G.fx.fake = 0.6; G.fx.fakeText = 'HAS MUERTO'; G.deathFlash = 1; EO.Audio.death();
      setTimeout(function () { if (G.phaseName === 'play') say(G, 'psy_fakedeath', 3000); }, 700);
    } else if (ev === 'mirror') {
      if (!lv.mirrorLvl) { lv.rules.invert = true; G.mirrorUntil = G.t + 2.6; say(G, 'psy_mirror', 2600); }
    } else {
      lv._njUntil = G.t + 1.3; lv.rules.canJump = false; say(G, 'psy_nojump', 2200);
    }
  }

  /* ======================================================================
     HOOKS SOBRE EL MOTOR
     ====================================================================== */
  var origPlatformActive = G.platformActive;
  G.platformActive = function (pl) {
    if (pl.tdoor && pl.tgone) return false;
    if (pl.tfake) return false;
    if (pl.wall && !(pl.wallUp >= 0.85)) return false;
    return origPlatformActive.call(this, pl);
  };

  var origUpdate = G.update;
  G.update = function (dt) {
    origUpdate.call(this, dt);
    var lv = this.lvl;
    if (!lv || !lv.traps || this.phaseName !== 'play') return;
    var p = lv.player; if (!p || !p.alive) return;
    var dir = lv._dir || 1, px = p.x + p.w / 2, feet = p.y + p.h;
    var vista = this.hasSkill('vista');
    for (var i = 0; i < lv.traps.length; i++) {
      var t = lv.traps[i], f = UPD[t.k];
      if (vista && t.tell < 1) t.tell = 1;
      if (f && f(this, lv, p, t, dt, dir, px, feet) === true) return;
    }
    psyUpdate(this, lv, p, dt);
  };

  var origKill = G.kill;
  G.kill = function (cause) {
    var lv = this.lvl, blamed = null;
    if (lv && lv.player && lv.player.alive && this.phaseName === 'play') {
      if (typeof cause === 'string' && cause.indexOf('trap:') === 0) {
        blamed = this._blame && this._blame.trap;
      } else if ((cause === 'fall' || cause === 'spike') && this._blame && this.t - this._blame.t < 2.4) {
        blamed = this._blame.trap; cause = 'trap:' + blamed.k;
      }
    }
    origKill.call(this, cause);
    if (blamed && this.phaseName === 'dead' && lv) {
      blamed.deaths = (blamed.deaths || 0) + 1;
      lv.lastKiller = blamed;
      if (this.mode !== 'silencio') {
        var cat = 'trap_' + blamed.k;
        if (EO.QUOTES[cat]) EO.UI.say(EO.UI.quote(cat), { duration: 2800 });
      }
    }
  };

  var origRespawn = G.respawn;
  G.respawn = function () {
    origRespawn.call(this);
    try { EO.Trolls.afterRespawn(this); } catch (e) { if (window.console) console.warn('trolls:', e); }
  };

  var origLoad = G.loadLevel;
  G.loadLevel = function (num, showIntro, retry) {
    origLoad.call(this, num, showIntro, retry);
    try { EO.Trolls.build(this); } catch (e) { if (window.console) console.warn('trolls build:', e); if (this.lvl) { this.lvl.traps = []; } }
    this._blame = null;
  };

  var origParticles = G.updateParticles;
  G.updateParticles = function (dt) {
    origParticles.call(this, dt);
    var b = this.bubbles;
    if (b) for (var i = b.length - 1; i >= 0; i--) { b[i].t += dt; if (b[i].t > b[i].life) b.splice(i, 1); }
    var fx = this.fx;
    if (fx) { fx.noise = Math.max(0, fx.noise - dt); fx.fake = Math.max(0, fx.fake - dt); }
  };

  /* ======================================================================
     DIBUJO
     ====================================================================== */
  var origDrawPlatforms = G.drawPlatforms;
  G.drawPlatforms = function (ctx, th) {
    var lv = this.lvl, hid = [];
    if (lv) {
      lv.platforms.forEach(function (p) {
        if ((p.tdoor && p.tgone) || (p.wall && p.wallUp < 1)) { hid.push([p, p.w]); p.w = 0; }
      });
    }
    origDrawPlatforms.call(this, ctx, th);
    hid.forEach(function (h) { h[0].w = h[1]; });
  };

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  function drawTraps(G, ctx) {
    var lv = G.lvl; if (!lv || !lv.traps) return;
    var cam = G.cam, tm = G.t, i;
    for (i = 0; i < lv.traps.length; i++) {
      var t = lv.traps[i];
      if (t.x != null && (t.x + (t.w || 0) < cam.x - 140 || t.x > cam.x + VW + 140) && t.k !== 'thwomp') continue;
      ctx.save();
      switch (t.k) {
        case 'trapdoor': {
          var pl = t.pl; if (!pl) break;
          if (!t.fired) {
            var a = 0.12 + t.tell * 0.5 + (t.arm >= 0 ? 0.35 : 0);
            ctx.globalAlpha = Math.min(0.9, a);
            ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(pl.x + 8, pl.y + 1); ctx.lineTo(pl.x + 8, pl.y + 7);
            ctx.moveTo(pl.x + pl.w - 8, pl.y + 1); ctx.lineTo(pl.x + pl.w - 8, pl.y + 7);
            if (t.tell > 0.5) { ctx.moveTo(pl.x + pl.w / 2 - 6, pl.y + 2); ctx.lineTo(pl.x + pl.w / 2 + 3, pl.y + 11); ctx.lineTo(pl.x + pl.w / 2 - 2, pl.y + 17); }
            ctx.stroke();
            if (t.arm >= 0) { ctx.translate((Math.random() - 0.5) * 3, 0); }
          } else if (t.fy < 700) {
            ctx.globalAlpha = Math.max(0, 1 - t.fy / 700);
            ctx.translate(pl.x + pl.w / 2, pl.y + t.fy + 30); ctx.rotate(t.rot * (t.x % 2 ? 1 : -1) * 0.4);
            var gg = ctx.createLinearGradient(0, -30, 0, 30);
            gg.addColorStop(0, 'rgba(255,255,255,.92)'); gg.addColorStop(0.2, G.theme.glow); gg.addColorStop(1, 'rgba(8,6,20,.98)');
            ctx.fillStyle = gg; ctx.fillRect(-pl.w / 2, -30, pl.w, 60);
          }
          break;
        }
        case 'fakefloor': {
          var f = t.pl; if (!f) break;
          var near = Math.abs((G.lvl.player.x + 15) - (f.x + f.w / 2)) < 200;
          if (near && (t.tell > 0.45 || t.touched)) {
            ctx.globalAlpha = (0.15 + t.tell * 0.4) * (0.6 + Math.sin(tm * 14) * 0.4);
            ctx.fillStyle = '#fff'; ctx.fillRect(f.x, f.y, f.w, 3);
          }
          ctx.globalAlpha = 1;
          if (!t.touched) {
            /* el hueco "con suelo" se dibuja como suelo normal */
            var th2 = G.theme, g2 = ctx.createLinearGradient(0, f.y, 0, f.y + 200);
            g2.addColorStop(0, 'rgba(255,255,255,.92)'); g2.addColorStop(0.12, th2.glow);
            g2.addColorStop(0.28, 'rgba(20,14,44,.96)'); g2.addColorStop(1, 'rgba(8,6,20,.98)');
            ctx.fillStyle = g2; ctx.fillRect(f.x, f.y, f.w, 120);
            ctx.fillStyle = '#fff'; ctx.fillRect(f.x, f.y, f.w, 2.5);
          } else {
            ctx.globalAlpha = 0.3; ctx.fillStyle = '#ff6bd6'; ctx.fillRect(f.x, f.y, f.w, 4);
          }
          break;
        }
        case 'popspike': {
          if (!t.fired) {
            ctx.globalAlpha = 0.1 + t.tell * 0.45;
            ctx.fillStyle = '#ff9db0';
            for (var s = 0; s < 3; s++) ctx.fillRect(t.x + 8 + s * (t.w - 22) / 2, t.sy - 2, 6, 2);
          } else if (t.up > 0.02) {
            var hh = t.h * t.up, n = Math.max(2, Math.floor(t.w / 18));
            ctx.fillStyle = 'rgba(255,70,90,.92)'; ctx.shadowColor = '#ff3b6b'; ctx.shadowBlur = 14;
            ctx.beginPath();
            for (var k = 0; k < n; k++) {
              var x0 = t.x + k * (t.w / n), x1 = x0 + t.w / n;
              ctx.moveTo(x0, t.sy); ctx.lineTo((x0 + x1) / 2, t.sy - hh); ctx.lineTo(x1, t.sy);
            }
            ctx.fill();
          }
          break;
        }
        case 'thwomp': {
          var gx = t.x, cxT = t.x + t.w / 2;
          if (t.state === 'warn') {
            ctx.globalAlpha = 0.18 + 0.2 * Math.sin(tm * 40);
            ctx.fillStyle = '#000'; ctx.fillRect(gx - 6, t.sy - 4, t.w + 12, 5);
            ctx.globalAlpha = 0.5; ctx.fillStyle = '#9d97c9';
            for (var q = 0; q < 4; q++) ctx.fillRect(cxT - t.w / 2 + ((tm * 90 + q * 29) % t.w), t.sy - 420 + ((tm * 310 + q * 77) % 360), 3, 3);
          } else if (t.tell > 0.4 && t.state === 'idle') {
            ctx.globalAlpha = 0.1 + t.tell * 0.2; ctx.fillStyle = '#fff';
            ctx.fillRect(cxT - 1, t.sy - 3, 2, 3);
          }
          if (t.state !== 'idle' && t.state !== 'warn') {
            ctx.globalAlpha = 1;
            var tg = ctx.createLinearGradient(0, t.ty, 0, t.ty + t.h);
            tg.addColorStop(0, '#3a3156'); tg.addColorStop(1, '#14102a');
            ctx.fillStyle = tg; ctx.shadowColor = '#000'; ctx.shadowBlur = 14;
            rrect(ctx, gx, t.ty, t.w, t.h, 8); ctx.fill();
            ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
            rrect(ctx, gx, t.ty, t.w, t.h, 8); ctx.stroke();
            ctx.fillStyle = '#ff4d6d';
            ctx.beginPath(); ctx.moveTo(gx + 16, t.ty + 28); ctx.lineTo(gx + 40, t.ty + 36); ctx.lineTo(gx + 16, t.ty + 42); ctx.fill();
            ctx.beginPath(); ctx.moveTo(gx + t.w - 16, t.ty + 28); ctx.lineTo(gx + t.w - 40, t.ty + 36); ctx.lineTo(gx + t.w - 16, t.ty + 42); ctx.fill();
            ctx.fillStyle = '#ff6b8a';
            ctx.beginPath();
            for (var sp = 0; sp < 5; sp++) {
              var xx = gx + sp * (t.w / 5);
              ctx.moveTo(xx, t.ty + t.h); ctx.lineTo(xx + t.w / 10, t.ty + t.h + 14); ctx.lineTo(xx + t.w / 5, t.ty + t.h);
            }
            ctx.fill();
          }
          break;
        }
        case 'shove': {
          if (t.fired && t.act > 0) {
            var pp = lv.player, pr = t.act / t.dur, sd = t.dirP;
            ctx.globalAlpha = Math.min(0.75, pr * 1.2);
            var hx = pp.x + pp.w / 2 - sd * 70;
            ctx.fillStyle = 'rgba(255,255,255,.85)';
            rrect(ctx, hx - 36, pp.y - 6, 72, 58, 18); ctx.fill();
            for (var fg = 0; fg < 4; fg++) { rrect(ctx, hx + sd * 30 - (sd < 0 ? 26 : 0), pp.y - 4 + fg * 14, 26, 11, 5); ctx.fill(); }
            ctx.strokeStyle = 'rgba(207,200,255,.7)'; ctx.lineWidth = 3;
            for (var ln = 0; ln < 4; ln++) {
              ctx.beginPath(); ctx.moveTo(hx - sd * (40 + ln * 20), pp.y + 6 + ln * 14); ctx.lineTo(hx - sd * (100 + ln * 20), pp.y + 6 + ln * 14); ctx.stroke();
            }
          } else if (!t.fired && t.tell > 0.6) {
            ctx.globalAlpha = 0.14; ctx.fillStyle = '#cfc8ff';
            ctx.fillRect(t.x, t.sy - 2, t.w, 2);
          }
          break;
        }
        case 'wall': {
          if (t.fired && t.pl && t.anim < 1) {
            var hv = t.h * t.anim, th3 = G.theme, g4 = ctx.createLinearGradient(0, t.sy - hv, 0, t.sy);
            g4.addColorStop(0, 'rgba(255,255,255,.92)'); g4.addColorStop(0.1, th3.glow); g4.addColorStop(1, 'rgba(8,6,20,.98)');
            ctx.fillStyle = g4; ctx.fillRect(t.x, t.sy - hv, t.w, hv);
          }
          break;
        }
        case 'bait': {
          if (t.got) break;
          var bx = t.x + t.w / 2, by = t.sy - 92 + Math.sin(tm * 3 + t.id) * 5, pulse = 0.8 + Math.sin(tm * 5) * 0.2;
          ctx.shadowColor = '#ff6bd6'; ctx.shadowBlur = 24;
          ctx.fillStyle = '#ff9be7';
          ctx.beginPath();
          for (var pt = 0; pt < 10; pt++) {
            var rad = (pt % 2 ? 6 : 15) * pulse, ang = pt * Math.PI / 5 - Math.PI / 2 + tm;
            ctx.lineTo(bx + Math.cos(ang) * rad, by + Math.sin(ang) * rad);
          }
          ctx.closePath(); ctx.fill();
          ctx.shadowBlur = 0; ctx.fillStyle = '#2a0a26'; ctx.font = '800 12px ui-monospace,monospace';
          ctx.textAlign = 'center'; ctx.fillText('?', bx, by + 4);
          break;
        }
      }
      ctx.restore();
    }
  }

  var origDrawBolts = G.drawBolts;
  G.drawBolts = function (ctx) {
    origDrawBolts.call(this, ctx);
    try { drawTraps(this, ctx); } catch (e) { /* un fallo visual no debe romper el juego */ }
  };

  /* burbujas sobre la cabeza (dentro de la cámara, tras dibujar al jugador) */
  var origDrawParticles = G.drawParticles;
  G.drawParticles = function (ctx) {
    origDrawParticles.call(this, ctx);
    var lv = this.lvl, b = this.bubbles;
    if (!lv || !lv.player || !b || !b.length) return;
    var p = lv.player;
    ctx.save();
    ctx.font = '700 13px ui-monospace,monospace';
    for (var i = 0; i < b.length; i++) {
      var m = b[i], a = Math.min(1, m.t * 8, (m.life - m.t) * 3);
      var w = ctx.measureText(m.text).width + 24, h = 26;
      var x = clamp(p.x + p.w / 2 - w / 2, this.cam.x + 10, this.cam.x + VW - w - 10);
      var y = p.y - 60 - i * 32 - m.t * 6;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = 'rgba(250,246,255,.96)';
      rrect(ctx, x, y, w, h, 10); ctx.fill();
      ctx.beginPath();
      var tx = clamp(p.x + p.w / 2, x + 14, x + w - 14);
      ctx.moveTo(tx - 6, y + h - 1); ctx.lineTo(tx, y + h + 8); ctx.lineTo(tx + 6, y + h - 1); ctx.fill();
      ctx.fillStyle = '#17112e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(m.text, x + w / 2, y + h / 2 + 1);
    }
    ctx.restore();
  };

  /* efectos de pantalla: ruido de señal y falso "has muerto" */
  var origDrawVignette = G.drawVignette;
  G.drawVignette = function (ctx, th) {
    origDrawVignette.call(this, ctx, th);
    var fx = this.fx; if (!fx) return;
    if (fx.noise > 0) {
      ctx.save();
      var k = Math.min(1, fx.noise * 2);
      for (var i = 0; i < 46; i++) {
        ctx.globalAlpha = Math.random() * 0.22 * k;
        ctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#8ef4ff';
        ctx.fillRect(0, Math.random() * VH, VW, 1 + Math.random() * 3);
      }
      ctx.globalAlpha = 0.18 * k; ctx.fillStyle = '#ff2d55'; ctx.fillRect(Math.random() * 6, 0, VW, VH);
      ctx.restore();
    }
    if (fx.fake > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, fx.fake * 3);
      ctx.fillStyle = 'rgba(40,0,6,.82)'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#ff4d4d'; ctx.font = '800 64px ui-monospace,monospace'; ctx.textAlign = 'center';
      ctx.fillText(fx.fakeText || 'HAS MUERTO', VW / 2, VH / 2);
      ctx.restore();
    }
  };

})(window.EO);
