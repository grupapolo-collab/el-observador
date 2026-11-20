/* Alcanzabilidad de puertas: node test/reach.js
   Para cada modo/nivel/intento carga el nivel completo (trampas incluidas) y comprueba con la
   física real (SPEED 335, JUMP 775, GRAV 2150) que la plataforma de la puerta verdadera se puede alcanzar. */
const { EO, G, errors } = require('./harness');
const SPEED = 335, JUMP = 775, GRAV = 2150, COY = 0.1;
const bad = [];
function top(p) { return p.y; }
function canReach(A, B) {                      // salto/caída de A hacia B (rectángulos con margen de movimiento)
  const ax0 = A.x - (A.ax || 0), ax1 = A.x + A.w + (A.ax || 0), bx0 = B.x - (B.ax || 0), bx1 = B.x + B.w + (B.ax || 0);
  const dy = A.y - B.y - 0.5 * ((A.ay || 0) + (B.ay || 0));   // >0: B más alta; las plataformas móviles se alinean a ratos
  const gap = Math.max(0, bx0 - ax1, ax0 - bx1);
  if (dy > JUMP * JUMP / (2 * GRAV) - 4) return false;
  const disc = JUMP * JUMP - 4 * (GRAV / 2) * dy;
  const t = (JUMP + Math.sqrt(Math.max(0, disc))) / GRAV;
  return gap <= SPEED * (t + COY) - 14;
}
function analyse(tag) {
  const L = G.lvl; if (!L || L.boss) return;
  const r = L.rules || {}, gt = L.goal && L.goal.type;
  if (gt === 'wait' || gt === 'altar' || gt === 'boss' || r.twin || (r.gravity != null && r.gravity < 0) || r.canJump === false) return;
  const ex = (L.exits || []).filter(e => e.kind === 'real' && !e.hidden)[0]; if (!ex) return;
  const plats = L.platforms.filter(p => !p.wall && p.w >= 20).map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h, ax: p.type === 'move' && p.axis !== 'y' ? (p.amp || 0) : 0, ay: p.type === 'move' && p.axis === 'y' ? (p.amp || 0) : 0, p }));
  const sup = plats.filter(p => Math.abs(p.y - (ex.y + ex.h)) <= 12 && ex.x + ex.w > p.x && ex.x < p.x + p.w);
  if (!sup.length) { bad.push(tag + ': puerta (' + (ex.x | 0) + ',' + (ex.y | 0) + ') sin suelo debajo'); return; }
  const sp = L.spawn;
  const start = plats.filter(p => sp.x + 15 > p.x && sp.x + 15 < p.x + p.w && Math.abs(p.y - (sp.y + 40)) < 40)[0] || plats[0];
  const seen = new Set([start]), q = [start];
  while (q.length) { const a = q.shift(); plats.forEach(b => { if (!seen.has(b) && canReach(a, b)) { seen.add(b); q.push(b); } }); }
  if (!sup.some(s => seen.has(s))) {
    const reached = [...seen].sort((a, b) => b.x + b.w - a.x - a.w)[0];
    const nxt = plats.filter(p => !seen.has(p) && p.x > reached.x).sort((a, b) => a.x - b.x)[0];
    const d = n => n ? `${n.p.type}${n.p.tdoor ? '/tdoor' : ''}${n.p.tfake ? '/fake' : ''}@${n.x | 0},${n.y | 0} w${n.w | 0}` : '-';
    bad.push(tag + ': puerta inalcanzable (' + (ex.x | 0) + ',' + (ex.y | 0) + ') fam=' + L.family + ' último alcanzado ' + d(reached) + ' → siguiente ' + d(nxt) + ' traps=' + (L.traps || []).map(t => t.k).join(','));
  }
  /* puerta que huye: su recorrido debe quedar dentro de la plataforma */
  (L.traps || []).forEach(t => { if (t.k === 'runaway' && (t.lo > t.hi)) bad.push(tag + ': runaway lo>hi'); });
}
['story', 'infinito', 'diablo', 'diario', 'descenso', 'mirror'].forEach(mode => {
  const maxL = mode === 'story' ? (EO.STORY_END || 30) : 40;
  for (let lv = 1; lv <= maxL; lv++) for (let k = 0; k < (mode === 'story' ? 3 : 4); k++) {
    try { G.mode = mode; G.levelNum = lv; G.phaseName = 'play'; G.loadLevel(lv, false); analyse(mode + ' L' + lv + '#' + k); }
    catch (e) { bad.push(mode + ' L' + lv + ' EXC ' + e.message); }
  }
});
console.log('problemas:', bad.length); bad.slice(0, 60).forEach(b => console.log(' ✗', b));
process.exit(bad.length ? 1 : 0);
