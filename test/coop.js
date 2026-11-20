/* Cooperativo: node test/coop.js — niveles alcanzables, física sin NaN, flujo de rondas completo */
const { EO } = require('./harness');
const C = EO.Coop, T = C._t, bad = [];
const SPEED = 335, JUMP = 775, GRAV = 2150, COY = .1;
function canReach(A, B) {
  const ax0 = A.x - (A.ax || 0), ax1 = A.x + A.w + (A.ax || 0), bx0 = B.x - (B.ax || 0), bx1 = B.x + B.w + (B.ax || 0);
  const dy = A.by - B.by - 0.5 * ((A.ay || 0) + (B.ay || 0)); const gap = Math.max(0, bx0 - ax1, ax0 - bx1);
  if (dy > JUMP * JUMP / (2 * GRAV) - 4) return false;
  const t = (JUMP + Math.sqrt(Math.max(0, JUMP * JUMP - 2 * GRAV * dy))) / GRAV; return gap <= SPEED * (t + COY) - 14;
}
const types = ['carrera', 'juntos', 'torre', 'puente', 'caos']; let lens = [];
types.forEach(t => { for (let seed = 1; seed <= 40; seed++) {
  const L = C.build(t, seed * 7919); lens.push(L.W);
  const pl = L.plats.filter(p => p.w >= 20).map(p => Object.assign({}, p, { by: p.by }));
  const seen = new Set([pl[0]]), q = [pl[0]];
  while (q.length) { const a = q.shift(); pl.forEach(b => { if (!seen.has(b) && canReach(a, b)) { seen.add(b); q.push(b); } }); }
  const last = pl[pl.length - 1]; if (!seen.has(last)) bad.push(t + '#' + seed + ': plataforma final inalcanzable');
  if (L.W < 5000) bad.push(t + '#' + seed + ': nivel corto ' + L.W);
  L.gates.forEach(g => { if (!L.plates.some(p => L.gates.indexOf(g) === p.gate)) bad.push(t + ': verja sin placa'); });
  L.spikes.forEach(s => { if (!L.plats.some(p => s.x >= p.x && s.x + s.w <= p.x + p.w + 1)) bad.push(t + ': pinchos en el aire'); });
} });
console.log('niveles: ' + lens.length + ' · largo medio ' + Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) + ' px · mín ' + Math.min(...lens));

/* partida completa con teclas aleatorias y llegadas forzadas */
const S = T.newMatch('mixto'); S.phase = 'lobby';
const codes = ['KeyA', 'KeyD', 'KeyW', 'Space', 'KeyQ', 'KeyE', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Comma', 'Period'];
let rounds = 0;
S.round = 0; S.p.forEach(p => p.pts = 0); C.startRound();
for (let r = 0; r < S.plan.length; r++) {
  for (let i = 0; i < 120 * 12; i++) {
    const k = {}, e = {}; codes.forEach(c => { if (Math.random() < .5) k[c] = true; if (Math.random() < .02) e[c] = true; });
    T.setKeys(k, e); T.update(1 / 120);
    S.p.forEach(p => { if (!isFinite(p.x) || !isFinite(p.y)) bad.push('NaN en jugador ' + p.i); });
  }
  if (S.phase !== 'play') { bad.push('ronda ' + S.plan[r] + ' no entró en juego (' + S.phase + ')'); }
  const D = S.lvl.door;                         // forzar llegada de ambos
  S.p.forEach((p, i) => { p.alive = true; p.x = D.x + 5 + i * 8; p.y = D.y + 20; p.vy = 0; });
  T.setKeys({}, {}); for (let i = 0; i < 20; i++) T.update(1 / 120);
  if (S.phase === 'play') { for (let i = 0; i < 120 * 12 && S.phase === 'play'; i++) T.update(1 / 120); }
  if (S.phase !== 'end') bad.push('ronda ' + S.plan[r] + ' no terminó (' + S.phase + ')');
  rounds++; T.nextRound(); if (S.phase === 'countdown') for (let i = 0; i < 120 * 4; i++) T.update(1 / 120);
}
if (S.phase !== 'final') bad.push('no llegó a la pantalla final: ' + S.phase);
console.log('rondas jugadas', rounds, '· puntos', S.p.map(p => p.pts).join(' / '), '· fase', S.phase);
/* mecánica de la torre: ¿se puede subir al muro a la cabeza del compañero, y baja la escalera? */
(function () {
  const M = T.newMatch('coop'); M.round = 0; M.plan = ['torre']; C.startRound(); M.phase = 'play';
  const L = M.lvl, w = L.walls[0]; const base = L.plats.filter(p => w.x > p.x && w.x < p.x + p.w)[0];
  const A = M.p[0], B = M.p[1];
  B.x = w.x - 60; B.y = base.y - 40; A.x = B.x - 120; A.y = base.y - 40; A.vy = B.vy = 0;
  T.setKeys({}, {}); for (let i = 0; i < 60; i++) T.update(1 / 120);
  // A camina hacia B y salta sobre su cabeza
  A.x = B.x - 4; A.y = B.y - 60; A.vy = 0; for (let i = 0; i < 40; i++) T.update(1 / 120);
  const onHead = Math.abs((A.y + A.h) - B.y) < 3;
  // A salta con 'derecha'
  T.setKeys({ KeyW: true, KeyD: true }, { KeyW: true }); T.update(1 / 120); T.setKeys({ KeyW: true, KeyD: true }, {});
  for (let i = 0; i < 60; i++) T.update(1 / 120);
  T.setKeys({ KeyD: true }, {}); for (let i = 0; i < 60; i++) T.update(1 / 120);
  const top = A.x > w.x + w.w - 5;   // ha pasado por encima del muro
  if (!onHead) bad.push('torre: no se puede subir a la cabeza del compañero');
  if (!top) bad.push('torre: no se supera el muro desde la cabeza (A.y=' + Math.round(A.y) + ' muro=' + w.y + ')');
  // la placa de arriba activa la escalera
  const pl = L.plates[0]; A.x = pl.x + 2; A.y = pl.y - 40; A.vy = 0; T.setKeys({}, {}); for (let i = 0; i < 30; i++) T.update(1 / 120);
  const stairs = L.gates[0], act = pl.timer > 0 || pl.press;
  if (!act) bad.push('torre: la placa de arriba no se activa');
  console.log('torre: cabeza', onHead, '· cima', top, '· placa', !!act);
})();
console.log('problemas:', bad.length); bad.slice(0, 20).forEach(b => console.log(' ✗', b)); process.exit(bad.length ? 1 : 0);
