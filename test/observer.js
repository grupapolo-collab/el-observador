/* Causalidad del Observador: node test/observer.js
   Regla 9 del prompt maestro: el Observador no se ríe sin un evento real que lo motive.
   1) Estático: ninguna risa queda atada a un temporizador ciego.
   2) Runtime: la cara y las risas tienen SIEMPRE un evento real detrás. */
const fs = require('fs'), path = require('path');
const { EO, G, errors } = require('./harness');
const bad = errors.slice();
const A = (cond, msg) => { if (!cond) bad.push(msg); };
const src = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');

/* ------------------------------------------------ 1 · COMPROBACIONES ESTÁTICAS */
const coop = src('coop.js'), score = src('score.js'), render = src('render.js');

/* coop.finish: la risa del final depende de muertes/sabotajes; nada de risa incondicional */
const fin = coop.slice(coop.indexOf('function finish'), coop.indexOf('function nextRound'));
A(/dirty/.test(fin), 'coop.finish: la risa no depende de una causa (dirty)');
A(!/phase = 'end'; S\.phT = 4\.5;\s*laugh\(/.test(fin), 'coop.finish: risa incondicional al cerrar la ronda');

/* coop: la lluvia del CAOS tiene objetivo real y enfriamiento */
A(/_rainCd = 7/.test(coop), 'coop.rain: la lluvia no tiene enfriamiento (temporizador ciego)');

/* score.mix: el giggle de fondo exige una muerte reciente, no un temporizador */
const gig = score.slice(score.indexOf('risas de fondo'));
A(/_lastDeathAt/.test(gig), 'score.mix: giggle de fondo sin causa (muerte reciente)');

/* render.drawFace: 'laugh' ya no sale del sorteo aleatorio y existe el canal de eventos */
const swap = render.slice(render.indexOf("var pool = ['smug'"), render.indexOf('f.expr = pool[')).replace(/\/\*[\s\S]*?\*\//g, '');
A(!/'laugh'/.test(swap), "render.drawFace: 'laugh' sigue en el pool aleatorio");
A(/f\.expr === 'scared'/.test(render), "render.drawFace: falta la rama de dibujo 'scared'");
A(/faceCause = function/.test(render), 'render: falta G.faceCause (evento → expresión)');

/* ------------------------------------------------ 2 · RUNTIME */
/* a) matar al jugador → la cara se ríe PORQUE ha pasado algo real */
G.mode = 'story'; G.levelNum = 3; G.phaseName = 'play';
G.loadLevel(3, false); G.phaseName = 'play';
G.kill('spike');
A(G.faceState.expr === 'laugh', 'kill: la cara no se ríe tras una muerte real (' + G.faceState.expr + ')');

/* b) el canal de eventos fija y mantiene la expresión */
G.faceCause('scared', 2);
A(G.faceState.expr === 'scared', 'faceCause: no fija la expresión del evento');

/* c) cooperativo: ronda limpia en equipo → 0 risas; ronda sucia → risa con causa */
const C = EO.Coop, T = C._t;
function finishRound(dirty) {
  const S = T.newMatch('mixto'); S.phase = 'lobby'; S.round = 0; S.plan = ['juntos'];
  S.p.forEach(p => p.pts = 0);
  C.startRound();
  for (let i = 0; i < 120 * 4 && S.phase !== 'play'; i++) T.update(1 / 120);
  if (S.phase !== 'play') { bad.push('coop: la ronda no entró en juego'); return -1; }
  const D = S.lvl.door;
  if (dirty) { S.p[0].deaths = 1; S.p[1].deaths = 1; S.sabCount = 2; }
  S.p.forEach((p, i) => { p.alive = true; p.x = D.x + 5 + i * 8; p.y = D.y + 20; p.vy = 0; });
  T.setKeys({}, {});
  let laughs = 0; const real = EO.Fx.laughNow; EO.Fx.laughNow = () => { laughs++; };
  try { for (let i = 0; i < 40 && S.phase === 'play'; i++) T.update(1 / 120); } finally { EO.Fx.laughNow = real; }
  return laughs;
}
const clean = finishRound(false), dirty = finishRound(true);
A(clean === 0, 'coop: ronda limpia en equipo → 0 risas (obtuve ' + clean + ')');
A(dirty > 0, 'coop: ronda sucia → la risa del final tiene causa');

console.log('observer · estáticas + runtime');
console.log('problemas:', bad.length); bad.slice(0, 20).forEach(b => console.log(' ✗', b));
process.exit(bad.length ? 1 : 0);
