/* ============================================================================
   EL OBSERVADOR — ui.js
   Detección de dispositivo, guardado, audio sintetizado, diálogos,
   pantallas, toasts y ajustes. Sin dependencias externas.
   ============================================================================ */
(function (EO) {
  'use strict';

  /* ------------------------------------------------------------- GUARDADO */
  var KEY = 'eo_save_v1';
  var DEFAULT = {
    level: 1, coins: 0, deaths: 0, totalDeaths: 0, tricked: 0,
    achv: {}, best: { infinito: 0, descenso: 0, diablo: 0 }, seen: {},
    settings: { sound: true, music: true, shake: true, particles: true, bigButtons: false, forceTouch: false }
  };
  var cache = null;

  EO.Store = {
    get: function () {
      if (cache) return cache;
      var d = null;
      try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
      cache = Object.assign({}, DEFAULT, d || {});
      cache.settings = Object.assign({}, DEFAULT.settings, (d && d.settings) || {});
      cache.best = Object.assign({}, DEFAULT.best, (d && d.best) || {});
      cache.achv = (d && d.achv) || {};
      cache.seen = (d && d.seen) || {};
      return cache;
    },
    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.get())); } catch (e) {}
    },
    reset: function () {
      cache = null;
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    }
  };

  /* --------------------------------------------------------------- AUDIO */
  // Sintetizador minúsculo: sin ficheros, sin licencias, sin descargas.
  var Audio = EO.Audio = {
    ctx: null, master: null, drone: null, enabled: true,
    init: function () {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    },
    tone: function (freq, dur, type, vol, slideTo) {
      if (!this.enabled) return;
      this.init(); if (!this.ctx) return;
      var t = this.ctx.currentTime;
      var o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol == null ? 0.3 : vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise: function (dur, vol) {
      if (!this.enabled) return;
      this.init(); if (!this.ctx) return;
      var n = Math.floor(this.ctx.sampleRate * dur);
      var buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var s = this.ctx.createBufferSource(); s.buffer = buf;
      var g = this.ctx.createGain(); g.gain.value = vol == null ? 0.25 : vol;
      var f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
      s.connect(f); f.connect(g); g.connect(this.master); s.start();
    },
    jump: function () { this.tone(430, 0.16, 'square', 0.16, 720); },
    land: function () { this.tone(150, 0.09, 'sine', 0.1, 90); },
    death: function () { this.tone(300, 0.5, 'sawtooth', 0.22, 55); this.noise(0.3, 0.18); },
    win: function () { var s = [523, 659, 784, 1046]; var self = this; s.forEach(function (f, i) { setTimeout(function () { self.tone(f, 0.32, 'triangle', 0.2); }, i * 95); }); },
    orb: function () { this.tone(880, 0.14, 'triangle', 0.18, 1320); },
    click: function () { this.tone(660, 0.05, 'square', 0.09, 520); },
    trick: function () { this.tone(220, 0.3, 'sawtooth', 0.16, 880); },
    boss: function () { this.tone(70, 1.4, 'sawtooth', 0.26, 42); this.noise(0.8, 0.12); },
    startDrone: function (base) {
      if (!this.enabled) return;
      this.init(); if (!this.ctx || this.drone) return;
      var self = this;
      var o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine'; o2.type = 'triangle';
      o.frequency.value = base || 55; o2.frequency.value = (base || 55) * 1.5;
      g.gain.value = 0.045;
      var lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      lfo.frequency.value = 0.11; lg.gain.value = 0.03;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); o2.connect(g); g.connect(this.master);
      o.start(); o2.start(); lfo.start();
      this.drone = { o: o, o2: o2, g: g, lfo: lfo, self: self };
    },
    setDrone: function (base) { if (this.drone) { try { this.drone.o.frequency.value = base; this.drone.o2.frequency.value = base * 1.5; } catch (e) {} } },
    stopDrone: function () {
      if (!this.drone) return;
      try { this.drone.o.stop(); this.drone.o2.stop(); this.drone.lfo.stop(); } catch (e) {}
      this.drone = null;
    }
  };

  /* --------------------------------------------------------- DISPOSITIVO */
  EO.Device = (function () {
    var coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
    var touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    var ua = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent);
    return {
      isTouch: touch || coarse,
      isMobile: coarse || ua,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
      label: (coarse || ua) ? 'Móvil' : 'Escritorio'
    };
  })();

  /* ------------------------------------------------------------------ UI */
  var UI = EO.UI = {
    screens: ['menu', 'modes', 'achv', 'settings', 'pause', 'result', 'end'],
    current: 'menu',

    init: function () {
      var st = EO.Store.get().settings;
      document.body.classList.toggle('mobile', (EO.Device.isMobile || st.forceTouch));
      document.body.classList.add('theme-b1');
      Audio.enabled = st.sound;
      this.applySettings();
      this.wire();
      this.updateMenu();
      try {
        var el = document.getElementById('device-line');
        if (el) el.textContent = 'Dispositivo detectado: ' + EO.Device.label + ' · ' + window.innerWidth + '×' + window.innerHeight;
      } catch (e) {}
    },

    show: function (id) {
      this.screens.forEach(function (s) {
        var el = document.getElementById('screen-' + s);
        if (el) el.classList.toggle('hidden', s !== id);
      });
      this.current = id || null;
    },
    hideAll: function () { this.show(null); },

    /* ---- diálogo con máquina de escribir ---- */
    dialogTimer: null, typing: null,
    say: function (text, opts) {
      if (!text) return;
      opts = opts || {};
      var box = document.getElementById('dialog');
      var tx = document.getElementById('dialog-text');
      var who = document.getElementById('dialog-who');
      if (!box || !tx) return;
      if (who) who.textContent = opts.who || 'EL OBSERVADOR';
      box.classList.add('show');
      clearInterval(this.typing);
      clearTimeout(this.dialogTimer);
      var i = 0, speed = opts.instant ? text.length : 18;
      tx.textContent = '';
      var self = this;
      this.typing = setInterval(function () {
        i += 2;
        tx.textContent = text.slice(0, i);
        if (i >= text.length) { clearInterval(self.typing); self.typing = null; }
      }, speed);
      var life = opts.duration || Math.min(9000, 2200 + text.length * 42);
      this.dialogTimer = setTimeout(function () { box.classList.remove('show'); }, life);
    },
    hideDialog: function () { var b = document.getElementById('dialog'); if (b) b.classList.remove('show'); },

    quote: function (cat) {
      var arr = EO.QUOTES[cat];
      if (!arr || !arr.length) return '';
      return arr[Math.floor(Math.random() * arr.length)];
    },

    toast: function (title, text, ms) {
      var box = document.getElementById('toasts');
      if (!box) return;
      var d = document.createElement('div');
      d.className = 'toast';
      d.innerHTML = '<span class="t">' + title + '</span>' + text;
      box.appendChild(d);
      setTimeout(function () {
        d.style.transition = '.4s'; d.style.opacity = '0'; d.style.transform = 'translateX(24px)';
        setTimeout(function () { d.remove(); }, 420);
      }, ms || 3200);
    },

    hud: function (o) {
      if (o.level != null) document.getElementById('hud-level').textContent = String(o.level).padStart(2, '0');
      if (o.deaths != null) document.getElementById('hud-deaths').textContent = o.deaths;
      if (o.coins != null) document.getElementById('hud-coins').textContent = o.coins;
      if (o.block) document.getElementById('hud-block').textContent = o.block;
      if (o.progress != null) {
        var b = document.querySelector('#levelbar i');
        if (b) b.style.width = Math.max(0, Math.min(100, o.progress * 100)) + '%';
      }
    },

    interstitial: function (data, cb) {
      var el = document.getElementById('interstitial');
      if (!el) { cb(); return; }
      document.getElementById('inter-k').textContent = data.k || '';
      document.getElementById('inter-n').textContent = data.n || '';
      document.getElementById('inter-s').textContent = data.s || '';
      document.getElementById('inter-fam').textContent = data.fam || '';
      el.classList.remove('hidden');
      var done = false;
      function go() {
        if (done) return; done = true;
        el.classList.add('hidden');
        el.removeEventListener('click', go);
        document.removeEventListener('keydown', keyGo);
        cb();
      }
      function keyGo(e) { if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); go(); } }
      setTimeout(function () {
        el.addEventListener('click', go);
        document.addEventListener('keydown', keyGo);
        var hint = document.getElementById('inter-hint');
        if (hint) hint.classList.add('blink');
        // auto-arranque por si el jugador toca fuera
        setTimeout(go, 4600);
      }, 260);
    },

    updateMenu: function () {
      var s = EO.Store.get();
      var sub = document.getElementById('m-play-sub');
      if (sub) sub.textContent = s.level > 1 ? 'Nivel ' + s.level : 'Nueva partida';
      var dl = document.getElementById('device-line');
      if (dl) dl.textContent = EO.Device.label + ' · ' + (EO.Device.isTouch ? 'controles táctiles' : 'teclado') + ' · progreso guardado automáticamente';
    },

    applySettings: function () {
      var st = EO.Store.get().settings;
      Audio.enabled = !!st.sound;
      document.querySelectorAll('[data-set]').forEach(function (el) {
        el.classList.toggle('on', !!st[el.getAttribute('data-set')]);
      });
      document.body.classList.toggle('mobile', EO.Device.isMobile || st.forceTouch);
      document.body.classList.toggle('bigtouch', !!st.bigButtons);
    },

    wire: function () {
      var self = this;
      var S = EO.Store;

      function click(id, fn) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', function (e) { Audio.click(); fn(e); });
      }

      click('m-play', function () { EO.Game.start('story'); });
      click('m-modes', function () { self.renderModes(); self.show('modes'); });
      click('m-achv', function () { self.renderProfile(); self.show('achv'); });
      click('m-settings', function () { self.show('settings'); });
      click('btn-reset', function () { if (confirm('¿Borrar todo el progreso? El Observador recordará que lo hiciste.')) S.reset(); });
      click('btn-help', function () { EO.Game.askHelp(); });
      click('btn-restart', function () { EO.Game.restart(); });
      click('btn-pause', function () { EO.Game.togglePause(); });
      click('p-resume', function () { EO.Game.togglePause(); });
      click('p-restart', function () { EO.Game.togglePause(); EO.Game.restart(); });
      click('p-settings', function () { self.show('settings'); });
      click('p-menu', function () { EO.Game.toMenu(); });
      click('r-next', function () { EO.Game.next(); });
      click('r-replay', function () { EO.Game.replay(); });
      click('r-menu', function () { EO.Game.toMenu(); });
      click('end-continue', function () { EO.Game.afterEnding(); });

      document.querySelectorAll('[data-back]').forEach(function (b) {
        b.addEventListener('click', function () { Audio.click(); self.updateMenu(); self.show('menu'); });
      });

      document.querySelectorAll('[data-set]').forEach(function (el) {
        el.addEventListener('click', function () {
          var k = el.getAttribute('data-set');
          var st = S.get().settings;
          st[k] = !st[k];
          S.save(); self.applySettings(); Audio.click();
        });
      });

      document.querySelectorAll('.mode').forEach(function (m) {
        m.addEventListener('click', function () {
          if (m.classList.contains('locked')) { self.toast('BLOQUEADO', 'Sigue jugando. El Observador decide cuándo.'); return; }
          Audio.click();
          EO.Game.start(m.getAttribute('data-mode'));
        });
      });

      // pausa con Escape
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { EO.Game.togglePause(); }
        if (e.key === 'h' || e.key === 'H') EO.Game.askHelp();
        if (e.key === 'r' || e.key === 'R') EO.Game.restart();
        if (e.key === 'p' || e.key === 'P') { EO.Game.togglePause(); }
      });

      window.addEventListener('orientationchange', function () { setTimeout(self.checkOrientation, 220); });
      window.addEventListener('resize', function () { self.checkOrientation(); });
      this.checkOrientation();
    },

    checkOrientation: function () {
      var portrait = window.innerHeight > window.innerWidth;
      document.body.classList.toggle('portrait', portrait);
      document.body.classList.toggle('tooSmall', portrait && window.innerWidth < 760);
    },

    renderModes: function () {
      var s = EO.Store.get();
      document.querySelectorAll('.mode').forEach(function (m) {
        var id = m.getAttribute('data-mode');
        var locked = (id === 'mirror' && (s.level || 1) < 10) || (id === 'silencio' && (s.level || 1) < 13);
        m.classList.toggle('locked', locked);
      });
    },

    renderProfile: function () {
      var s = EO.Store.get();
      var box = document.getElementById('profile-stats');
      if (box) {
        var items = [
          ['NIVEL MÁXIMO', s.level || 1], ['MUERTES', s.totalDeaths || 0],
          ['CAOS', s.coins || 0], ['ENGAÑOS', s.tricked || 0],
          ['NIVEL MÁS DURO', (function () { var h = EO.Shop && EO.Shop.hardestLevel && EO.Shop.hardestLevel(); return h ? h.level + ' · ' + h.deaths + '☠' : '—'; })()],
          ['RÉCORD INFINITO', s.best.infinito || 0], ['RÉCORD DESCENSO', s.best.descenso || 0], ['RÉCORD DIABLO', s.best.diablo || 0]
        ];
        box.innerHTML = items.map(function (i) {
          return '<div class="stat"><div class="v">' + i[1] + '</div><div class="l">' + i[0] + '</div></div>';
        }).join('');
      }
      var list = document.getElementById('achv-list');
      if (list) {
        list.innerHTML = EO.ACHIEVEMENTS.map(function (a) {
          var got = !!s.achv[a.id];
          return '<div class="card" style="' + (got ? 'border-color:var(--glow)' : 'opacity:.5') + '">' +
            '<h3>' + (got ? a.icon + ' DESBLOQUEADO' : '● BLOQUEADO') + '</h3>' +
            '<p><b>' + a.n + '</b><br>' + a.d + '</p></div>';
        }).join('');
      }
    }
  };

  /* --------------------------------------------------------------- BOOT */
  window.addEventListener('DOMContentLoaded', function () {
    EO.UI.init();
    if (EO.Game && EO.Game.init) EO.Game.init();
  });
  window.addEventListener('pointerdown', function once() {
    EO.Audio.init();
    window.removeEventListener('pointerdown', once);
  });

})(window.EO);
