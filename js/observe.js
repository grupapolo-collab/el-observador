/* ============================================================================
   EL OBSERVADOR — observe.js  (v3.2)
   Memoria del Observador: reacciona a eventos del juego (EO.Observe.event).
   game.js ya llama a EO.Observe.event('death'|'pause'|'restart'|'help'|
   'mirror'|'gamepad'); antes no existía y esas llamadas no hacían nada.
   ============================================================================ */
(function (EO) {
  'use strict';
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  var L = {
    firstDeath: ['Tu primera muerte. Voy a guardarla.', 'Primera muerte. Enmarcada y colgada.'],
    pause: ['Una pausa. Qué humano.', 'Pausa registrada. No cambia nada.'],
    restart: ['Reiniciar no borra lo que has hecho. Lo sé yo.', 'Otra vez desde el principio. Qué ilusión.'],
    help: ['Pedir ayuda también cuenta. Lo apunto.', 'Anotado: has necesitado ayuda.'],
    mirror: ['Esa puerta nunca existió. Tú tampoco, un poco.'],
    gamepad: ['Un mando. Ahora sí que vas en serio.'],
    back: ['Te fuiste. Pero yo sigo aquí. Siempre.', 'Has vuelto. Yo nunca me fui.']
  };
  var last = {}, spam = {};

  function can(k, gap) {
    var now = Date.now();
    if (last[k] && now - last[k] < gap) return false;
    last[k] = now; return true;
  }
  function say(arr, opts) {
    var G = EO.Game;
    if (!G || G.mode === 'silencio' || !EO.UI) return;
    EO.UI.say(pick(arr), opts || { duration: 2800 });
  }

  EO.Observe = {
    event: function (name, data) {
      try {
        var s = EO.Store.get();
        s.seen = s.seen || {};
        switch (name) {
          case 'death':
            if (!s.seen.firstDeath) { s.seen.firstDeath = 1; EO.Store.save(); setTimeout(function () { say(L.firstDeath, { duration: 3200 }); }, 700); }
            break;
          case 'pause':   if (can('pause', 90000))   say(L.pause); break;
          case 'restart': if (can('restart', 60000)) say(L.restart); break;
          case 'help':    if (can('help', 120000))   say(L.help); break;
          case 'mirror':  if (can('mirror', 60000))  say(L.mirror); break;
          case 'gamepad': if (!s.seen.pad) { s.seen.pad = 1; EO.Store.save(); say(L.gamepad); } break;
        }
      } catch (e) { if (window.console) console.warn('observe:', e); }
    },
    /* "Te fuiste": si cerraste la pestaña en mitad de una partida */
    init: function () {
      var s = EO.Store.get();
      s.seen = s.seen || {};
      var wasMid = !!s.seen.mid;
      s.seen.mid = 0; EO.Store.save();
      window.addEventListener('pagehide', function () {
        var G = EO.Game;
        if (G && (G.phaseName === 'play' || G.phaseName === 'dead')) {
          var st = EO.Store.get(); st.seen = st.seen || {}; st.seen.mid = 1; EO.Store.save();
        }
      });
      if (wasMid) {
        var tries = 0, h = setInterval(function () {
          var G = EO.Game;
          if (G && G.phaseName === 'play' && G.lvl) { clearInterval(h); say(L.back, { duration: 3400 }); }
          else if (++tries > 600) clearInterval(h);
        }, 500);
      }
    }
  };
  window.addEventListener('DOMContentLoaded', function () { EO.Observe.init(); });
})(window.EO);
