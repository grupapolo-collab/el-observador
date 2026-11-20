/* Prueba de humo sin navegador: node test/smoke.js
   Carga todos los JS con un DOM falso, arranca cada modo, simula cientos de
   fotogramas con habilidades compradas y comprueba que no hay excepciones. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(f => !f.startsWith('http'));
const errors = [];
function el() {
  const e = { style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], dataset: {}, innerHTML: '', textContent: '', width: 960, height: 540,
    addEventListener() {}, removeEventListener() {}, appendChild() {}, setAttribute() {},
    getAttribute() { return null; }, click() {}, querySelectorAll() { return []; }, querySelector() { return el(); },
    closest() { return null; }, getBoundingClientRect() { return { width: 960, height: 540, left: 0, top: 0 }; },
    getContext() { return new Proxy(function () {}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : (() => {}), set: () => true }); } };
  return e;
}
const store = {};
const win = { EO: undefined, addEventListener(t, f) { (win._l[t] = win._l[t] || []).push(f); }, _l: {},
  devicePixelRatio: 1, innerWidth: 960, innerHeight: 540, location: { hash: '', reload() {} },
  matchMedia: () => ({ matches: false, addListener() {} }), console };
const doc = { body: Object.assign(el(), { className: '' }), documentElement: el(), getElementById: () => el(),
  querySelectorAll: () => [], querySelector: () => el(), createElement: () => el(), addEventListener() {} , hidden: false};
let raf = null;
const ctx = vm.createContext(Object.assign(win, { window: win, document: doc, navigator: { userAgent: 'node', getGamepads: () => [], maxTouchPoints: 0 },
  localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: k => delete store[k] },
  performance: { now: () => Date.now() }, requestAnimationFrame: f => { raf = f; return 1; },
  setTimeout, clearInterval, setInterval, clearTimeout, console, Math, JSON, Date, Object, Array, Float32Array, Uint8Array,
  atob: x => Buffer.from(x, 'base64').toString('binary'), AudioContext: undefined, webkitAudioContext: undefined }));
ctx.window = ctx;
files.forEach(f => { try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); } catch (e) { errors.push(f + ': ' + e.message); } });
(win._l.DOMContentLoaded || []).forEach(f => { try { f(); } catch (e) { errors.push('DOMContentLoaded: ' + e.stack); } });
const EO = ctx.EO, G = EO.Game;
if (!EO.Observe) errors.push('EO.Observe no existe');
const s = EO.Store.get(); s.inv = s.inv || {};
['dobleSalto', 'iman', 'vista', 'escudo', 'aire', 'dash'].forEach(k => s.inv['skill.' + k] = true);
let frames = 0;
['story', 'infinito', 'diablo', 'diario', 'descenso', 'mirror', 'silencio'].forEach(mode => {
  for (const lv of [1, 5, 15, 20, 30]) {
    try {
      G.mode = mode; G.levelNum = lv; G.phaseName = 'play'; G.paused = false;
      G.loadLevel(lv, false);
      G.phaseName = 'play';
      for (let i = 0; i < 900; i++) {
        G.keys = { right: true, jump: (i % 60) < 30, dash: i % 200 === 0 };
        G.update(1 / 120); G.updateMusic(1 / 120); frames++;
        if (G.phaseName === 'win' || G.phaseName === 'menu') break;
        if (i % 300 === 299 && G.lvl && G.lvl.player) G.kill('spike');
      }
    } catch (e) { errors.push(mode + ' L' + lv + ': ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); }
  }
});
try { EO.UI.renderProfile && EO.UI.renderProfile(); } catch (e) { errors.push('renderProfile: ' + e.message); }
console.log('fotogramas simulados:', frames);

/* --- habilidades: el dash recorre distancia y el doble salto funciona --- */
(function () {
  const rand = Math.random; Math.random = () => 0.999;   // sin eventos aleatorios (espejo, salto en huelga…)
  G.mode = 'infinito'; G.loadLevel(1, false); G.phaseName = 'play'; G.lvl._troll = false;
  const L0 = G.lvl, p = L0.player; L0.traps = []; L0.spikes = []; L0.blades = [];
  L0.platforms = [{ x: 0, y: 400, w: 3000, h: 60, type: 'solid', id: 0, bx: 0, by: 400, px: 0, py: 400, dx: 0, dy: 0, amp: 0, speed: 1, phase: 0 }];
  L0.world = { w: 3000, h: 700 }; p.x = 200; p.y = 300; p.vx = 0; p.vy = 0; G.bolts.length = 0; G.boss = null;
  for (let i = 0; i < 240 && !p.onGround; i++) { G.keys = {}; G.update(1 / 120); }
  const x0 = p.x; G.keys = { right: true, dash: true }; G.update(1 / 120); G.keys = { right: true };
  for (let i = 0; i < 20; i++) G.update(1 / 120);
  if (p.x - x0 < 60) errors.push('dash demasiado corto: ' + (p.x - x0).toFixed(1));
  G.keys = {}; p.jumpsUsed = 0; p.onGround = false; p.coyote = 0; p.vy = 0;
  G.keys = { jump: true }; G.buffer = 1; G.update(1 / 120);
  const vy1 = p.vy; G.buffer = 1; G.update(1 / 120);
  if (!(vy1 < 0 && p.jumpsUsed === 2)) errors.push('doble salto no funciona (jumpsUsed=' + p.jumpsUsed + ')');
  Math.random = rand;
})();

/* --- mascotas: lógica de seguimiento, trampas, caídas y ayudas --- */
const PETS = Object.keys(EO.Pets.def);
function plat(x, y, w) { return { x, y, w, h: 40, type: 'solid', id: 0, bx: x, by: y, px: x, py: y, dx: 0, dy: 0, amp: 0, speed: 1, phase: 0 }; }
PETS.forEach(type => {
  s.equip = Object.assign({}, s.equip, { pet: type });
  /* 1) recorridos largos en niveles con trampas: nunca más de lead+40 por delante y nunca pasa de las trampas */
  for (const mode of ['diablo', 'infinito']) for (const lv of [3, 9, 16]) {
    G.mode = mode; G.loadLevel(lv, false); G.phaseName = 'play';
    const def = EO.Pets.def[type]; let near = 0, maxAhead = -1e9;
    for (let i = 0; i < 1500; i++) {
      G.keys = { right: true, jump: (i % 70) < 25 }; G.update(1 / 120);
      const L = G.lvl, pl = L.player, pet = G.pet;
      if (G.phaseName !== 'play' || !pl || !pl.alive) { if (G.phaseName === 'win') break; continue; }
      if (!pet) { errors.push(type + ': sin mascota en ' + mode + lv); break; }
      if (!isFinite(pet.x) || !isFinite(pet.y)) { errors.push(type + ' NaN'); break; }
      const px = pl.x + pl.w / 2, face = pl.facing || 1, ahead = (pet.x - px) * face;
      maxAhead = Math.max(maxAhead, ahead);
      let thr = Infinity; (L.traps || []).forEach(t => { if (typeof t.x === 'number' && !t.got && t.k !== 'runaway') { const c = (t.x + (t.w || 0) / 2 - px) * face; if (c > -30 && c < thr) thr = c; } });
      (L.spikes || []).forEach(t => { const c = (t.x + (t.w || 0) / 2 - px) * face; if (c > -30 && c < thr) thr = c; });
      const sameFloor = def.fly || (pl.onGround && pl.standing === pet.plat);   // en tierra solo importa si compartís plataforma
      if (!sameFloor) { near = 0; continue; }
      if (ahead > def.lead + 45 && pet.mode !== 'hop') { errors.push(type + ' demasiado adelantada: ' + ahead.toFixed(0)); break; }
      if (thr <= 380) near++; else near = 0;
      if (near > 240 && ahead > 40 && pet.mode !== 'hop') { errors.push(type + ' se adelanta con peligro a ' + thr.toFixed(0) + 'px (ahead ' + ahead.toFixed(0) + ')'); break; }
      if (pet.helps > 4) { errors.push(type + ' ayudó ' + pet.helps + ' veces'); break; }
    }
  }
  /* 2) caída: terrestres se quedan, murciélago/cuervo/búho no bajan, polilla/pez sí pueden */
  const rand2 = Math.random; Math.random = () => 0.999;
  G.mode = 'infinito'; G.loadLevel(1, false); G.phaseName = 'play';
  const L = G.lvl, pl = L.player; L.traps = []; L.spikes = []; L.blades = []; L.orbs = []; L.exits = L.exits || [];
  L.lasers = []; L.traps = []; L._troll = false; L.spawn = { x: 600, y: 300 }; pl.spawnX = 600; pl.spawnY = 300;
  L.platforms = [plat(0, 400, 800), plat(0, 1300, 3000)]; L.world = { w: 3000, h: 1700 };
  pl.x = 600; pl.y = 300; pl.vx = 0; pl.vy = 0; pl.facing = 1; G.pet = null; EO.Pets.init(G, false);
  for (let i = 0; i < 240; i++) { G.keys = {}; G.update(1 / 120); }
  const y0 = G.pet.y, def2 = EO.Pets.def[type]; let maxY = y0, fell = false, dbgInfo = '';
  for (let i = 0; i < 600; i++) {            // el jugador se lanza al vacío por el borde derecho
    G.keys = { right: true }; G.update(1 / 120);
    if (pl.y > 450) fell = true;
    if (fell && pl.onGround) break;
    if (fell) { if (G.pet.y > maxY) { maxY = G.pet.y; dbgInfo = 'f' + i + ' mode=' + G.pet.mode + ' plat=' + G.pet.plat + ' px=' + (pl.x | 0) + ' pety=' + (G.pet.y | 0) + ' petx=' + (G.pet.x | 0) + ' ph=' + G.phaseName + ' deaths=' + G.deaths; } }
  }
  if (!fell) errors.push(type + ': el test de caída no cayó');
  if (!def2.fly && Math.abs(maxY - y0) > 2) errors.push(type + ' (terrestre) se tiró tras la caída: dy=' + (maxY - y0).toFixed(0) + ' ' + dbgInfo);
  if (def2.fly && def2.fall === 0 && maxY > y0 + 100) errors.push(type + ' (no sigue caídas) bajó ' + (maxY - y0).toFixed(0));
  if (def2.fly && def2.fall === 1 && maxY < y0 + 20) errors.push(type + ' (flota contigo) no te acompañó al caer');
  Math.random = rand2;
});

/* --- música adaptativa: elige pista según menú / tema / estado de ánimo --- */
(function () {
  const rand = Math.random; Math.random = () => 0.999;
  const node = () => ({ gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {}, disconnect() {}, start() {}, stop() {}, loop: false });
  EO.Audio.ctx = { currentTime: 0, state: 'running', destination: {}, createGain: node, createBufferSource: node, decodeAudioData: (ab, ok) => ok({ fake: ab.byteLength }) };
  EO.Audio.enabled = true; const S = EO.Score;
  const names = Object.keys(EO.MUSIC_DATA || {});
  if (names.length < 25) errors.push('music_data incompleto: ' + names.length + ' pistas');
  if (!EO.MUSIC_META || !EO.MUSIC_META.circus2 || !EO.MUSIC_META.circus2.laughs.length) errors.push('MUSIC_META sin risas de circus2');
  const step = (n) => { for (let i = 0; i < n; i++) { G.t += .1; S.drive(G, .1); } return S.curName; };
  const expect = (what, got, want) => { const alt = { b1: ['t1'], b4: ['t4'], boss: ['boss2'], circus: ['circus2'], flow: ['euphoria'], menu: ['menu2'] }[want] || []; if (got !== want && alt.indexOf(got) < 0) errors.push('música: ' + what + ' → ' + got + ' (esperado ' + want + ')'); };
  G.phaseName = 'menu'; G.lvl = null; expect('menú', step(2), 'menu');
  G.mode = 'infinito'; G.loadLevel(1, false); G.phaseName = 'play'; const L = G.lvl, p = L.player; L.traps = []; L.spikes = []; G.deaths = 0; G.idle = 0; G.boss = null;
  expect('tema bloque 1', step(2), 'b1');
  G.loadLevel(47, false); G.phaseName = 'play'; G.lvl.traps = []; G.lvl.spikes = []; G.deaths = 0; G.idle = 0; expect('tema bloque 4', step(2), 'b4');
  G.loadLevel(1, false); G.phaseName = 'play'; G.lvl.traps = []; G.lvl.spikes = []; G.deaths = 0; G.idle = 0; step(2);
  G.idle = 11; G.t += 30; expect('inactividad → nana', step(2), 'lullaby');
  G.idle = 0; G.t += 30; expect('vuelve el tema', step(2), 'b1');
  G.deaths = 5; G.t += 30; expect('5 muertes → circo', step(2), 'circus');
  S.flow = 20; G.t += 30; expect('ritmo si vas muy bien', step(2), 'flow');
  S.flow = 0; G.deaths = 1; G.t += 30;
  G.lvl.traps = [{ k: 'popspike', x: G.lvl.player.x + 120, w: 40, sy: 400 }]; G.lvl.player.facing = 1; G.t += 30; expect('trampa cerca → suspense', step(2), 'suspense');
  G.lvl.traps = []; G.t += 60; S._susUntil = 0; S._susCool = 0; step(1); G.t += 30; step(2);
  G.lvl.boss = 'x'; G.deaths = 0; G.t += 30; expect('jefe', step(2), 'boss'); G.lvl.boss = null;
  EO.Store.get().settings.music = false; step(1); expect('música desactivada', S.curName, null); EO.Store.get().settings.music = true;
  EO.Audio.ctx = null; Math.random = rand;
})();
console.log('mascotas comprobadas:', PETS.length);
console.log('habilidades comprobadas · errores totales:', errors.length);
errors.slice(0, 15).forEach(e => console.log(' ✗', e));
process.exit(errors.length ? 1 : 0);
