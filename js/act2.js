/* ============================================================================
   EL OBSERVADOR — act2.js  (v4.0 · FINAL FALSO del nivel 30 + puente al Acto II)
   ----------------------------------------------------------------------------
   El marketing sigue diciendo «30 niveles»: el truco lo exige. Al completar el
   30 no hay nivel siguiente: hay CRÉDITOS, SILENCIO del Observador, una SALA
   VACÍA… y la revelación. Recién ahí se abre el Acto II (31-60).

   Ganchos de prueba:  el-observador.html#ending=1     (falso final)
                       el-observador.html#ending=real  (final real, nivel 60)
   ============================================================================ */
window.EO = window.EO || {};
(function (EO) {
  'use strict';
  var G = EO.Game;
  var FALSE_END = EO.FALSE_END = 30;

  /* ---- al terminar el 30 no hay "siguiente". Hay final. ---- */
  var prevNext = G.next;
  G.next = function () {
    if (this.mode === 'story' && this.levelNum === FALSE_END && !this._act2Open) { this.fakeEnding(); return; }
    return prevNext.apply(this, arguments);
  };

  /* ---------------------------------------------------------------
     FINAL FALSO: créditos reales → silencio → sala vacía → revelación
     --------------------------------------------------------------- */
  G.fakeEnding = function () {
    var self = this;
    this._act2Open = true;
    try { EO.Audio.stopDrone(); } catch (e) {}
    try { EO.Score.stop(1.2); } catch (e) {}
    EO.UI.hideAll();
    EO.UI.hideDialog();
    document.body.classList.remove('mute-hud');
    var el = document.getElementById('screen-end');
    var cr = document.getElementById('end-credits');
    var oldBtn = document.getElementById('end-continue');
    if (oldBtn) oldBtn.classList.add('hidden');
    el.classList.remove('hidden');

    /* silencio absoluto del Observador durante TODA la secuencia */
    var realSay = EO.UI.say;
    EO.UI.say = function () {};

    var lines = [
      '<div class="k">FINAL — EL OBSERVADOR</div>',
      '<p>Has derrotado a los seis. Tu sombra, el arquitecto, el silencio, el tiempo y él.</p>',
      '<p>La puerta se cierra detrás de ti. Hace un ruido honesto.<br>Es el único ruido honesto de todo el juego.</p>',
      '<div class="k" style="margin-top:18px">CRÉDITOS</div>',
      '<p>Un jugador que desconfiaba de los carteles · tú<br>Burlas, todas con causa · el Motor de Caos<br>El suelo, que miente · plataformas fantasma anónimas<br>No aparece · el Observador</p>',
      '<div class="k" style="margin-top:26px;font-size:30px;letter-spacing:.3em">EL FIN</div>'
    ];
    var i = 0;
    function step() {
      if (i < lines.length) { cr.innerHTML += lines[i++]; setTimeout(step, 1500); }
      else {
        /* 2,6 s de nada. La sala vacía. */
        setTimeout(function () {
          cr.innerHTML += '<p style="opacity:.6;margin-top:24px">La sala está vacía.</p>';
          setTimeout(function () {
            cr.innerHTML += '<p style="opacity:.4">No hay aplausos. No hay risa. No hay nadie arriba mirándote.</p>';
            setTimeout(function () {
              cr.innerHTML += '<p style="opacity:.25">…</p>';
              setTimeout(function () {
                /* REVELACIÓN */
                try { EO.Audio.tone(60, 2.4, 'sawtooth', .3, 34); } catch (e) {}
                self.shake = 22; self.winFlash = 1;
                cr.innerHTML +=
                  '<p style="color:var(--glow);font-size:17px;letter-spacing:.08em;margin-top:22px">«¿De verdad pensaste que te iba a dejar ir?»</p>' +
                  '<p style="margin-top:8px">La silla está calentísima. Siempre lo estuvo.</p>' +
                  '<p style="opacity:.85;margin-top:6px"><b>ACTO II · LA MÁSCARA</b> · niveles 31-60 · El Eco y El Coleccionista te esperan</p>';
                var btn = document.createElement('button');
                btn.className = 'btn primary';
                btn.style.marginTop = '18px';
                btn.textContent = 'Seguir adentro';
                btn.addEventListener('click', function () {
                  EO.UI.say = realSay;   /* vuelve a hablar. Nunca dejó de mirar. */
                  try {
                    var s = EO.Store.get();
                    s.level = Math.max(s.level || 1, 31);
                    EO.Store.save();
                  } catch (e) {}
                  EO.UI.hideAll();
                  self.mode = 'story'; self.levelNum = 31; self.deaths = 0;
                  self.phaseName = 'play';
                  try { EO.Audio.startDrone(50); } catch (e) {}
                  self.loadLevel(31, true);
                });
                el.appendChild(btn);
                try { EO.Store.get().achv.act2 = true; EO.Store.save(); } catch (e) {}
              }, 2600);
            }, 2200);
          }, 2200);
        }, 2600);
      }
    }
    cr.innerHTML = '';
    step();
  };

  /* ---- gancho de prueba por URL ---- */
  window.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      try {
        var h = (location.hash || '').replace('#', '');
        if (!h) return;
        var q = {};
        h.split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[p[0]] = decodeURIComponent(p[1] || ''); });
        if (q.ending === '1') {
          EO.UI.hideAll();
          G.mode = 'story'; G.levelNum = 30; G.deaths = 0; G.phaseName = 'play';
          G.loadLevel(30, false);
          G.fakeEnding();
        } else if (q.ending === 'real') {
          EO.UI.hideAll();
          G.mode = 'story'; G.levelNum = EO.STORY_END; G.deaths = 0; G.phaseName = 'play';
          G.loadLevel(EO.STORY_END, false);
          G.endingSequence();
        }
      } catch (e) { /* modo normal */ }
    }, 80);
  });
})(window.EO);
