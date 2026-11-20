/* ============================================================================
   EL OBSERVADOR — score.js  (v3.4)  ·  Banda sonora adaptativa (ahora con trance)
   Reproduce las pistas generadas con tools/make_music.py (EO.MUSIC_DATA).
   Una pista por escenario (menú, bloques 1-6, jefe) y cuatro "estados de ánimo"
   que se imponen al tema según cómo juegas:
     lullaby  · llevas >10 s quieto            → nana de caja de música
     suspense · trampa a punto de saltar,      → latido + Shepard + cuerdas rotas
                tramo final, jefe apuntando
     flow     · vas rápido y sin parar         → ritmo (bombo, bajo, arpegio)
     circus   · 5+ muertes en el nivel         → circo con risas
   v3.4: cada bloque tiene DOS temas (el original `bN` y una versión trance `tN`); el ritmo
   tiene `euphoria`, el circo `circus2` (festival con risas), el jefe `boss2` y el menú `menu2`.
   Se elige uno al empezar cada nivel (≈70 % trance). Hay risas de fondo (giggle/crowd) y
   `EO.Fx` anima la cara del Observador en sincronía con las risas (EO.MUSIC_META).
   Si el navegador no decodifica OGG, cae al sintetizador antiguo (EO.Music).
   ============================================================================ */
(function (EO) {
  'use strict';
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  var PRI = { normal: 0, circus: 1, flow: 2, suspense: 3, lullaby: 4 };
  var LINES = {
    lullaby: ['Te has parado. Te pongo música de cuna.', 'Shhh. Duerme. Yo vigilo.', 'Relájate. Todo va a salir mal igualmente.'],
    circus: ['Esto ya no tiene remedio. Música de circo.', 'Algo alegre para tus fracasos.', 'Te pega. Te pega mucho.'],
    flow: ['Vas demasiado bien. Eso me preocupa.', 'Ritmo. Qué atrevimiento.', 'Sigue así. Me encanta verte caer desde arriba.'],
    suspense: ['...', 'Algo va a pasar.', 'No mires. Mira.']
  };

  var S = EO.Score = {
    vol: 0.4, buffers: {}, loading: {}, cur: null, curName: null, want: null,
    okOnce: false, failed: false, fails: 0,
    mood: 'normal', holdUntil: 0, flow: 0, _susUntil: 0, _susCool: 0, _susStart: 0,
    _lvl: null, _deaths: 0, _sayAt: -99, _stingAt: -99, _duck: 1, _lastDeathAt: null
  };

  S.usable = function () {
    var st = EO.Store.get().settings;
    return !S.failed && !!EO.MUSIC_DATA && st.music !== false;
  };
  function ctx() { return EO.Audio && EO.Audio.ctx; }
  function bus() {
    var c = ctx(); if (!c) return null;
    if (!S._bus || S._bus.context !== c) { S._bus = c.createGain(); S._bus.gain.value = S.vol * S._duck; S._bus.connect(c.destination); }
    return S._bus;
  }
  function b64(s) { var bin = atob(s), n = bin.length, u = new Uint8Array(n); for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; }

  S.load = function (name, cb) {
    if (S.buffers[name]) { cb && cb(S.buffers[name]); return; }
    if (S.loading[name]) { cb && S.loading[name].push(cb); return; }
    var c = ctx(); if (!c || !EO.MUSIC_DATA || !EO.MUSIC_DATA[name]) return;
    S.loading[name] = cb ? [cb] : [];
    var ok = function (buf) {
      S.buffers[name] = buf; S.okOnce = true;
      var q = S.loading[name] || []; delete S.loading[name]; q.forEach(function (f) { try { f(buf); } catch (e) {} });
    };
    var bad = function () {
      delete S.loading[name]; S.fails++;
      if (!S.okOnce && S.fails >= 2) { S.failed = true; if (window.console) console.warn('score: sin decodificador OGG, uso sintetizador'); }
    };
    try { var pr = c.decodeAudioData(b64(EO.MUSIC_DATA[name]), ok, bad); if (pr && pr.catch) pr.catch(function () {}); } catch (e) { bad(); }
  };

  function startTrack(name, buf, fade) {
    var c = ctx(), b = bus(); if (!c || !b) return;
    if (c.state === 'suspended' && c.resume) c.resume();
    var t = c.currentTime, g = c.createGain(), src = c.createBufferSource();
    src.buffer = buf; src.loop = true; src.connect(g); g.connect(b);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + fade);
    src.start(0);
    if (S.cur) {
      var o = S.cur;
      try { o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(o.g.gain.value, t); o.g.gain.linearRampToValueAtTime(0, t + fade); } catch (e) {}
      setTimeout(function () { try { o.src.stop(); o.src.disconnect(); o.g.disconnect(); } catch (e) {} }, (fade + 0.3) * 1000);
    }
    S.cur = { src: src, g: g, name: name, t0: t, dur: buf.duration || 0 }; S.curName = name;
    if (EO.Audio.drone) EO.Audio.stopDrone();   // la banda sonora sustituye al dron
  }

  S.play = function (name, fade) {
    if (S.curName === name || S._pending === name) return;
    S.want = name;
    if (!ctx()) return;
    S._pending = name;
    S.load(name, function (buf) {
      if (S._pending === name) S._pending = null;
      if (S.want === name && S.curName !== name) startTrack(name, buf, fade == null ? 1.8 : fade);
    });
    if (!S.loading[name] && !S.buffers[name]) S._pending = null;   // falló la carga
  };
  S.stop = function (fade) {
    var c = ctx(); S.want = null; S._pending = null;
    if (!c || !S.cur) { S.curName = null; return; }
    var o = S.cur, t = c.currentTime; fade = fade == null ? .6 : fade;
    try { o.g.gain.cancelScheduledValues(t); o.g.gain.setValueAtTime(o.g.gain.value, t); o.g.gain.linearRampToValueAtTime(0, t + fade); } catch (e) {}
    setTimeout(function () { try { o.src.stop(); } catch (e) {} }, (fade + .2) * 1000);
    S.cur = null; S.curName = null;
  };
  S.once = function (name, v) {
    var c = ctx(); if (!c || !EO.Audio.enabled) return;
    S.load(name, function (buf) {
      var b = bus(); if (!b) return;
      var g = c.createGain(), s = c.createBufferSource(); g.gain.value = v == null ? .9 : v;
      s.buffer = buf; s.connect(g); g.connect(b); s.start(0);
      if (name === 'laugh' || name === 'giggle' || name === 'crowd') {
        var dd = (buf.duration || 2) * (name === 'laugh' ? .85 : .9);
        S._sfxLaughUntil = Math.max(S._sfxLaughUntil || 0, c.currentTime + dd);
        if (EO.Fx && EO.Fx.laughNow) EO.Fx.laughNow(null, dd, name === 'crowd' ? 'crowd' : name);
      }
    });
  };
  /* ¿Hay una risa sonando ahora mismo? (0 = no, 0-1 = intensidad). Sirve para animar al Observador. */
  S.laughLevel = function () {
    var c = ctx(); if (!c) return 0;
    var lv = 0;
    if (S._sfxLaughUntil && c.currentTime < S._sfxLaughUntil) lv = 1;
    var m = S.cur && EO.MUSIC_META && EO.MUSIC_META[S.cur.name];
    if (m && m.laughs && S.cur.dur) {
      var pos = (c.currentTime - S.cur.t0) % S.cur.dur;
      for (var i = 0; i < m.laughs.length; i++) {
        var a = m.laughs[i][0], d = m.laughs[i][1];
        if (pos >= a && pos <= a + d) { lv = Math.max(lv, .6 + .4 * Math.sin((pos - a) / d * Math.PI)); break; }
      }
    }
    return lv;
  };
  S.duck = function (x) {
    if (x === S._duck) return; S._duck = x;
    var b = S._bus, c = ctx(); if (b && c) { try { b.gain.setTargetAtTime(S.vol * x, c.currentTime, .12); } catch (e) {} }
  };

  /* ---------------------------------------------------------- DIRECTOR */
  function say(G, mood) {
    if (!LINES[mood] || G.mode === 'silencio' || G.t - S._sayAt < 22) return;
    if (mood === 'suspense' && Math.random() > .25) return;
    S._sayAt = G.t; EO.UI.say(pick(LINES[mood]), { duration: 2800, who: 'EL OBSERVADOR · ♪' });
  }
  function nearestThreat(L, px, face) {
    var d = Infinity, i, t, c;
    var tr = L.traps || [];
    for (i = 0; i < tr.length; i++) {
      t = tr[i]; if (typeof t.x !== 'number' || t.got || t.k === 'runaway') continue;
      c = (t.x + (t.w || 0) / 2 - px) * face; if (c > -20 && c < d) d = c;
    }
    for (i = 0; i < (L.spikes || []).length; i++) {
      t = L.spikes[i]; c = (t.x + (t.w || 0) / 2 - px) * face; if (c > -20 && c < d) d = c;
    }
    return d;
  }
  S.mix = function (G, dt) {
    var L = G.lvl, p = L.player, now = G.t, i;
    if (S._lvl !== L) { S._lvl = L; S.flow = 0; S._susUntil = 0; S._susCool = 0; S.mood = 'normal'; S.holdUntil = 0; S._deaths = 0; }
    if (G.deaths !== S._deaths) {
      if (G.deaths > S._deaths) {
        S.flow = 0;
        S._lastDeathAt = now;   /* v4.0 causalidad: registro cuándo fue la última muerte */
        if (G.deaths >= 5 && (G.deaths - 5) % 4 === 0 && G.mode !== 'silencio') S.once('laugh', .8);   // risa en la 5ª, 9ª, 13ª muerte…
      }
      S._deaths = G.deaths;
    }
    if (G.phaseName === 'play' && p && p.alive) {
      var moving = Math.abs(p.vx) > 110 || !p.onGround;
      S.flow = clamp(S.flow + (moving ? dt : -dt * 2.2), 0, 40);
    }
    /* suspense: algo está a punto de pasar */
    var sus = false, face = p.facing || 1, px = p.x + p.w / 2;
    if (G.boss && G.boss.state === 'aim') sus = true;
    if (G._blame && now - G._blame.t < 0.5) { sus = true; S._susCool = 0; }
    if (!sus && now > S._susCool) {
      var d = nearestThreat(L, px, face);
      if (d < 170 && (G.deaths >= 1 || (L.traps || []).some(function (t) { return t.k === 'thwomp'; }))) sus = true;
      if (!sus && (L.traps || []).length && G.deaths >= 1) {
        for (i = 0; i < L.exits.length; i++) { var ex = L.exits[i]; if (ex.kind !== 'fake' && Math.hypot(p.x - ex.x, p.y - ex.y) < 260) sus = true; }
      }
    }
    if (sus) { if (now >= S._susUntil) S._susStart = now; S._susUntil = Math.max(S._susUntil, now + 4.5); }
    var susOn = now < S._susUntil;
    if (susOn && now - S._susStart > 9) { susOn = false; S._susUntil = 0; S._susCool = now + 14; }   // no agobiar sin parar

    var boss = !!L.boss, want = 'normal';
    if (!boss) {
      if (S.flow >= 14 || (S.mood === 'flow' && S.flow >= 6)) want = 'flow';
      else if (G.deaths >= 5) want = 'circus';
    }
    if (susOn) want = 'suspense';
    if ((G.idle || 0) > 10) want = 'lullaby';

    if (want !== S.mood && !(now < S.holdUntil && PRI[want] < PRI[S.mood])) {
      var prev = S.mood; S.mood = want; S.holdUntil = now + (want === 'suspense' ? 5 : 8);
      if (want === 'suspense' && now - S._stingAt > 20) { S._stingAt = now; S.once('sting', .7); }
      if (want === 'circus' && prev !== 'circus') S.once('laugh', .7);
      if (want !== 'normal') say(G, want);
    }
    /* v3.4: variante elegida al empezar el nivel (≈70 % trance) */
    if (S._varLvl !== L) { S._varLvl = L; S._varNew = Math.random() < .7; S._varAlt = Math.random() < .5; S._nextGiggle = now + 30 + Math.random() * 25; }
    var base = boss ? 'boss' : (G.theme && G.theme.cls ? G.theme.cls.replace('theme-', '') : 'b1');
    var out = S.mood === 'normal' ? base : S.mood;
    if (G.mode === 'coop') out = 'coop';
    else if (out === 'boss') out = S._varAlt ? 'boss2' : 'boss';
    else if (out === 'flow') out = S._varNew ? 'euphoria' : 'flow';
    else if (out === 'circus') out = S._varAlt ? 'circus2' : 'circus';
    else if (/^b[1-6]$/.test(out) && S._varNew) out = 't' + out.charAt(1);
    /* v4.0 causalidad: risas de fondo solo con causa reciente — tiene que haber una
       muerte en los últimos 12 s. Nada de temporizadores ciegos. */
    if (G.phaseName === 'play' && G.deaths >= 2 && G.mode !== 'silencio' && now > S._nextGiggle) {
      if (S._lastDeathAt != null && now - S._lastDeathAt < 12) {
        S._nextGiggle = now + 35 + Math.random() * 45;
        S.once(Math.random() < .35 ? 'crowd' : 'giggle', .3);
      } else S._nextGiggle = now + 10;   /* sin causa reciente: reintentar más tarde */
    }
    return out;
  };

  S.drive = function (G, dt) {
    if (!EO.Audio.enabled || EO.Store.get().settings.music === false) { if (S.curName) S.stop(.4); return; }
    if (!ctx()) return;
    var name;
    if (G.coopActive) { S._menuAt = 'coop'; name = 'coop'; }
    else if (!G.lvl || G.phaseName === 'menu') {
      if (S._menuPick == null || S._menuAt !== 'menu') S._menuPick = Math.random() < .55 ? 'menu2' : 'menu';
      S._menuAt = 'menu'; name = S._menuPick;
    }
    else { S._menuAt = 'play'; try { name = S.mix(G, dt); } catch (e) { name = 'b1'; } }
    S.duck(G.paused ? .3 : (G.phaseName === 'intro' ? .75 : 1));
    S.play(name, name === 'suspense' || name === 'lullaby' ? 1.2 : 2.0);
  };

  var aw = EO.Audio.win;
  EO.Audio.win = function () { var r = aw && aw.apply(this, arguments); try { if (S.usable() && ctx()) S.once('win', .75); } catch (e) {} return r; };

  /* si hay banda sonora, el dron antiguo sobra */
  var sd = EO.Audio.startDrone;
  EO.Audio.startDrone = function (base) { if (S.okOnce && S.usable()) return; return sd.call(this, base); };
})(window.EO);
