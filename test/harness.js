/* Arnés compartido (DOM falso). */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(f => !f.startsWith('http'));
const errors = [];
function el() {
  const e = { style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [], dataset: {}, innerHTML: '', textContent: '', width: 960, height: 540,
    addEventListener() {}, removeEventListener() {}, appendChild() {}, setAttribute() {},
    getAttribute() { return null; }, click() {}, remove() {}, querySelectorAll() { return []; }, querySelector() { return el(); },
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
module.exports = { ctx, EO, G, errors, win };
