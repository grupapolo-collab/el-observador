/* ============================================================================
   EL OBSERVADOR — shop.js  (v3.2 · TIENDA EXPANDIDA)
   · Economía: CAOS por nivel, orbes, jefes, logros y bono diario
   · Personajes, colores, ojos, accesorios, estelas, MASCOTAS y HABILIDADES
   · Las habilidades SOLO se aplican en modos no-historia
   ============================================================================ */
(function (EO) {
  'use strict';
  var G = EO.Game, TAU = 6.283185;
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  var DEF = { char: 'cubo', color: 'blanco', eyes: 'normal', hat: 'none', trail: 'glow', pet: 'none' };
  var COL = { blanco: '#f4f1ff', violeta: '#b69cff', cian: '#7ef0ff', menta: '#7cffd4', rosa: '#ff8bd0',
    coral: '#ff7a6b', ambar: '#ffc25c', medianoche: '#2a2447', oro: '#ffd24d', verde: '#7cff9c',
    turquesa: '#2ee6d6', fucsia: '#ff3fa4', lima: '#c6ff3d', lava: '#ff5a1f', hielo: '#d6f4ff', uva: '#7a3fd1', chicle: '#ffb3e6', carbon: '#3a3a48' };

  /* ---------------------------------------------------------- CATÁLOGO */
  var ITEMS = [];
  function add(slot, list) { list.forEach(function (a) { ITEMS.push({ slot: slot, id: a[0], n: a[1], p: a[2], a: a[3], desc: a[4], draw: a[5] }); }); }

  add('char', [
    ['cubo', 'Cubo', 0],
    ['fantasma', 'Fantasma', 30], ['slime', 'Slime', 30],
    ['robot', 'Robot', 60], ['gato', 'Gato', 60],
    ['pez', 'Pez', 70],
    ['ninja', 'Ninja', 80], ['zombi', 'Zombi', 85],
    ['bruja', 'Bruja', 90], ['pirata', 'Pirata', 90],
    ['bufón', 'Bufón', 95],
    ['angel', 'Ángel', 100], ['demonio', 'Demonio', 100],
    ['calavera', 'Calavera', 110],
    ['astronauta', 'Astronauta', 120],
    ['dragon', 'Dragón', 150],
    ['payaso', 'Payaso', 90], ['alien', 'Alienígena', 100], ['panda', 'Panda', 85], ['hongo', 'Hongo', 80], ['conejo', 'Conejo', 75],
    ['observador', 'Observador', 0, 'boss_observador']
  ]);
  add('color', [
    ['blanco', 'Blanco', 0], ['violeta', 'Violeta', 20], ['cian', 'Cian', 20], ['menta', 'Menta', 20],
    ['rosa', 'Rosa', 25], ['coral', 'Coral', 25], ['ambar', 'Ámbar', 25],
    ['verde', 'Verde', 30],
    ['medianoche', 'Medianoche', 60], ['oro', 'Oro', 90], ['rainbow', 'Arcoíris', 150],
    ['turquesa', 'Turquesa', 25], ['fucsia', 'Fucsia', 30], ['lima', 'Lima', 30], ['chicle', 'Chicle', 30],
    ['hielo', 'Hielo', 35], ['lava', 'Lava', 40], ['uva', 'Uva', 40], ['carbon', 'Carbón', 45],
    ['neon', 'Neón', 100], ['galaxia', 'Galaxia', 130], ['disco', 'Discoteca', 160]
  ]);
  add('eyes', [
    ['normal', 'Clásicos', 0], ['redondos', 'Redondos', 15], ['feliz', 'Felices', 20],
    ['enfadado', 'Enfadados', 25], ['mareado', 'Mareados', 30], ['ciclope', 'Cíclope', 40],
    ['corazones', 'Corazones', 45], ['estrellas', 'Estrellas', 55]
  ]);
  add('hat', [
    ['none', 'Nada', 0], ['antena', 'Antena', 40], ['gafas', 'Gafas', 50], ['cuernos', 'Cuernos', 60],
    ['mago', 'Mago', 70], ['halo', 'Halo', 80], ['corona', 'Corona', 120],
    ['copa', 'Copa', 65], ['auriculares', 'Auriculares', 55], ['bigote', 'Bigote', 35],
    ['parche', 'Parche', 45], ['bufanda', 'Bufanda', 50], ['capa', 'Capa', 75],
    ['mochila', 'Mochila', 60], ['globo', 'Globo', 40],
    ['orejas', 'Orejas de conejo', 55], ['flor', 'Flor', 40], ['lazo', 'Pajarita', 45], ['antifaz', 'Antifaz', 50],
    ['gorra', 'Gorra', 45], ['sombrero', 'Sombrero pirata', 85], ['nariz', 'Nariz de payaso', 35], ['estrella', 'Estrella flotante', 90],
    ['dj', 'Cascos DJ', 110], ['fiesta', 'Gorro de fiesta', 50]
  ]);
  add('trail', [
    ['glow', 'Brillo', 0], ['none', 'Ninguna', 0], ['pixel', 'Píxeles', 40], ['fuego', 'Fuego', 50],
    ['star', 'Estrellas', 70], ['rainbow', 'Arcoíris', 90],
    ['burbuja', 'Burbujas', 45], ['hojas', 'Hojas', 50],
    ['notas', 'Notas', 60], ['corazones', 'Corazones', 55],
    ['confeti', 'Confeti', 65], ['rayos', 'Rayos', 80]
  ]);
  add('pet', [
    ['none', 'Ninguna', 0],
    ['rata', 'Rata', 60],
    ['rana', 'Rana', 65],
    ['gato', 'Gato negro', 70],
    ['polilla', 'Polilla', 70],
    ['slime', 'Slime', 75],
    ['pez', 'Pez fantasma', 80],
    ['murcielago', 'Murciélago', 85],
    ['cuervo', 'Cuervo', 90],
    ['buho', 'Búho', 95],
    ['conejo', 'Conejo', 65], ['pinguino', 'Pingüino', 70], ['zorro', 'Zorro', 80],
    ['medusa', 'Medusa', 85], ['abeja', 'Abeja', 75], ['dragoncito', 'Dragoncito', 120]
  ]);
  /* HABILIDADES — solo modos no-historia */
  var SKILLS = [
    { id: 'dobleSalto', n: 'Doble salto', p: 150, desc: 'Salta una segunda vez en el aire.',
      bad: 'La trampa "empujón" te lanza 1.5× más lejos.' },
    { id: 'iman', n: 'Imán de orbes', p: 120, desc: 'Atrae orbes a 80 px.',
      bad: 'El cebo "?" te atrae desde más lejos.' },
    { id: 'vista', n: 'Vista de grieta', p: 100, desc: 'Las grietas del suelo se ven siempre.',
      bad: 'Ganas 20% menos CAOS por nivel.' },
    { id: 'escudo', n: 'Escudo espectral', p: 200, desc: 'Una muerte gratis por nivel.',
      bad: 'Las muertes cuentan doble para logros.' },
    { id: 'aire', n: 'Aire controlado', p: 180, desc: 'Mantén salto en el aire: caes más lento.',
      bad: 'Más tiempo en el aire = más tiempo para que te pillen.' },
    { id: 'dash', n: 'Dash corto', p: 220, desc: 'Shift / LB: impulso horizontal.',
      bad: 'Cooldown 1.5 s. Vulnerable durante el impulso.' }
  ];

  var TABS = [['char', 'Personaje'], ['color', 'Color'], ['eyes', 'Ojos'],
    ['hat', 'Accesorio'], ['trail', 'Estela'], ['pet', 'Mascota'], ['skill', 'Habilidades']];
  var RAR = { c: 'COMÚN', r: 'RARO', e: 'ÉPICO', l: 'LEGENDARIO' };
  function rarity(it) { return it.a ? 'l' : it.p >= 100 ? 'l' : it.p >= 60 ? 'e' : it.p >= 30 ? 'r' : 'c'; }
  function find(k) { return ITEMS.filter(function (i) { return i.slot + '.' + i.id === k; })[0]; }
  function findSkill(id) { return SKILLS.filter(function (s) { return s.id === id; })[0]; }

  function St() {
    var s = EO.Store.get();
    s.inv = s.inv || {}; s.cleared = s.cleared || {};
    s.equip = Object.assign({}, DEF, s.equip || {});
    return s;
  }
  function owned(it, s) { return (!it.a && it.p === 0) || !!s.inv[it.slot + '.' + it.id] || (!!it.a && !!s.achv[it.a]); }
  function hasSkill(id, s) { s = s || St(); return !!(s.inv && s.inv['skill.' + id]); }
  function colorOf(id, t) {
    if (id === 'galaxia') return 'hsl(' + (255 + Math.sin(t * 1.4) * 45 | 0) + ',80%,' + (48 + Math.sin(t * 3) * 10 | 0) + '%)';
    if (id === 'disco') return 'hsl(' + ((t * 260) % 360 | 0) + ',95%,' + (60 + Math.sin(t * 8) * 12 | 0) + '%)';
    if (id === 'neon') return 'hsl(150,100%,' + (52 + Math.sin(t * 5) * 14 | 0) + '%)';
    return id === 'rainbow' ? 'hsl(' + ((t * 90) % 360 | 0) + ',85%,76%)' : (COL[id] || COL.blanco); }

  /* ---------------------------------------------------------- AVATAR */
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }

  function avatar(c, x, y, lo, t, o) {
    o = o || {};
    var ch = lo.char, dk = lo.color === 'medianoche', f = o.face || 1, col = colorOf(lo.color, t);
    var ey = (ch === 'slime' || ch === 'pez') ? -2 : ch === 'robot' ? -5 : -7;
    var ec = (ch === 'robot' || ch === 'ninja') ? '#6ff3ff' : dk ? '#8ef4ff' : '#0b0a18';
    var blink = (t % 3.4) > 3.28, top = { fantasma: -21, slime: -22, gato: -18, dragon: -24 }[ch] || -20, fx = f * 3;
    c.save(); c.translate(x, y);
    if (o.tilt) c.rotate(o.tilt);
    c.scale(1, o.sq || 1);
    if (o.aura) {
      var g = c.createRadialGradient(0, 0, 4, 0, 0, 52);
      g.addColorStop(0, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'transparent');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 52, 0, TAU); c.fill();
    }
    c.fillStyle = col; c.shadowColor = o.glow || '#8b5cf6'; c.shadowBlur = o.aura ? 22 : 0;

    /* cuerpo base */
    if (ch === 'fantasma') {
      c.beginPath(); c.moveTo(-15, 20); c.lineTo(-15, -6); c.arc(0, -6, 15, Math.PI, 0); c.lineTo(15, 20);
      c.lineTo(10, 14); c.lineTo(5, 20); c.lineTo(0, 14); c.lineTo(-5, 20); c.lineTo(-10, 14); c.closePath();
    } else if (ch === 'slime') {
      c.beginPath(); c.moveTo(-18, 20); c.bezierCurveTo(-20, -4, -8, -22, 0, -22);
      c.bezierCurveTo(8, -22, 20, -4, 18, 20); c.closePath();
    } else if (ch === 'pez') {
      c.beginPath(); c.ellipse(0, 0, 16, 12, 0, 0, TAU); c.closePath();
      c.fill();
      c.beginPath(); c.moveTo(16, 0); c.lineTo(26, -10); c.lineTo(26, 10); c.closePath(); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = dk ? '#8ef4ff' : '#0b0a18';
      c.beginPath(); c.arc(-6 + fx, -2, 2.4, 0, TAU); c.fill();
      c.beginPath(); c.arc(4 + fx, -2, 2.4, 0, TAU); c.fill();
      c.restore(); return;
    } else if (ch === 'observador') { c.beginPath(); c.ellipse(0, 0, 15, 20, 0, 0, TAU); }
    else if (ch === 'alien') { c.beginPath(); c.moveTo(-9, 20); c.bezierCurveTo(-24, 6, -20, -24, 0, -24); c.bezierCurveTo(20, -24, 24, 6, 9, 20); c.closePath(); }
    else if (ch === 'hongo') { c.beginPath(); c.ellipse(0, 6, 11, 14, 0, 0, TAU); }
    else rr(c, -15, -20, 30, ch === 'gato' ? 38 : 40, ch === 'robot' || ch === 'astronauta' ? 4 : ch === 'calavera' ? 12 : 9);
    c.fill();

    /* detalles específicos */
    if (ch === 'gato') {
      c.beginPath(); c.moveTo(-15, -12); c.lineTo(-12, -28); c.lineTo(-3, -19);
      c.moveTo(15, -12); c.lineTo(12, -28); c.lineTo(3, -19); c.fill();
    }
    if (ch === 'robot') {
      c.strokeStyle = '#8a8fb0'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -20); c.lineTo(0, -27); c.stroke();
      c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(0, -28, 2.6, 0, TAU); c.fill();
      c.fillStyle = '#0c1224'; rr(c, -11, -12, 22, 13, 3); c.fill();
    }
    if (ch === 'astronauta') {
      c.fillStyle = 'rgba(200,230,255,.35)';
      c.beginPath(); c.arc(0, -4, 16, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(0, -4, 16, 0, TAU); c.stroke();
    }
    if (ch === 'ninja') {
      c.fillStyle = 'rgba(20,20,40,.9)';
      c.fillRect(-14, -6, 28, 7);
      c.fillStyle = '#0b0a18';
      c.fillRect(-9 + fx, -3, 5, 2); c.fillRect(4 + fx, -3, 5, 2);
    }
    if (ch === 'bruja') {
      c.fillStyle = 'rgba(40,20,60,.7)';
      c.beginPath(); c.moveTo(-15, 4); c.lineTo(0, 18); c.lineTo(15, 4); c.closePath(); c.fill();
    }
    if (ch === 'demonio') {
      c.fillStyle = '#e8334f';
      c.beginPath(); c.moveTo(-12, -18); c.lineTo(-15, -30); c.lineTo(-5, -20); c.fill();
      c.beginPath(); c.moveTo(12, -18); c.lineTo(15, -30); c.lineTo(5, -20); c.fill();
    }
    if (ch === 'angel') {
      c.fillStyle = 'rgba(255,255,255,.7)';
      c.beginPath(); c.ellipse(-18, -2, 8, 16, -0.3, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(18, -2, 8, 16, 0.3, 0, TAU); c.fill();
    }
    if (ch === 'bufón') {
      c.fillStyle = '#ff4d6d'; c.fillRect(-15, -20, 15, 40);
      c.fillStyle = '#4d6dff'; c.fillRect(0, -20, 15, 40);
      c.fillStyle = '#ffd24d'; c.fillRect(-15, 4, 30, 4);
    }
    if (ch === 'pirata') {
      c.fillStyle = '#0a0818'; c.fillRect(-13, ey - 4, 9, 9);
      c.strokeStyle = '#0a0818'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-14, ey - 6); c.lineTo(10, ey - 10); c.stroke();
    }
    if (ch === 'zombi') {
      c.fillStyle = 'rgba(60,120,60,.6)';
      c.fillRect(-20, 4, 8, 20); c.fillRect(12, 4, 8, 20);
    }
    if (ch === 'dragon') {
      c.fillStyle = '#7cff9c';
      c.beginPath();
      for (var d = -3; d <= 3; d++) { c.moveTo(d * 4, -22); c.lineTo(d * 4 + 2, -28); c.lineTo(d * 4 + 4, -22); }
      c.fill();
    }
    if (ch === 'payaso') {
      c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(-15, -18, 6, 0, TAU); c.arc(15, -18, 6, 0, TAU); c.arc(0, -22, 6, 0, TAU); c.fill();
      c.fillStyle = '#ffd24d'; c.beginPath(); c.moveTo(-15, 15); c.lineTo(0, 22); c.lineTo(15, 15); c.lineTo(10, 10); c.lineTo(-10, 10); c.fill();
      c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(fx, 0, 4.4, 0, TAU); c.fill();
    }
    if (ch === 'alien') {
      c.strokeStyle = '#7cff9c'; c.lineWidth = 2; c.beginPath(); c.moveTo(-7, -22); c.lineTo(-12, -32); c.moveTo(7, -22); c.lineTo(12, -32); c.stroke();
      c.fillStyle = '#7cff9c'; c.beginPath(); c.arc(-12, -33, 2.6, 0, TAU); c.arc(12, -33, 2.6, 0, TAU); c.fill();
    }
    if (ch === 'panda') {
      c.fillStyle = '#15131f'; c.beginPath(); c.arc(-14, -19, 6, 0, TAU); c.arc(14, -19, 6, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(-8, ey, 6, 7, -0.3, 0, TAU); c.ellipse(8, ey, 6, 7, 0.3, 0, TAU); c.fill();
      c.fillRect(-15, 10, 8, 10); c.fillRect(7, 10, 8, 10);
    }
    if (ch === 'hongo') {
      c.fillStyle = '#e8334f'; c.beginPath(); c.ellipse(0, -10, 22, 13, 0, Math.PI, 0); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(-10, -15, 3.4, 0, TAU); c.arc(5, -19, 3, 0, TAU); c.arc(13, -13, 2.6, 0, TAU); c.fill();
    }
    if (ch === 'conejo') {
      c.beginPath(); c.ellipse(-8, -34 + Math.sin(t * 3) * 1.5, 4.2, 13, -0.12, 0, TAU); c.ellipse(8, -34 + Math.sin(t * 3 + 1) * 1.5, 4.2, 13, 0.12, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,140,170,.7)'; c.beginPath(); c.ellipse(-8, -34, 2, 9, -0.12, 0, TAU); c.ellipse(8, -34, 2, 9, 0.12, 0, TAU); c.fill();
    }
    c.shadowBlur = 0;

    /* ojos */
    c.fillStyle = ec; c.strokeStyle = ec; c.lineWidth = 2;
    var s = lo.eyes;
    if (ch === 'ninja') {
      // ojos ya dibujados arriba, skip
    } else if (blink) { c.fillRect(-11 + fx, ey, 8, 1.6); c.fillRect(3 + fx, ey, 8, 1.6); }
    else if (s === 'redondos') {
      [-7, 7].forEach(function (d) { c.beginPath(); c.arc(d + fx, ey, 4.3, 0, TAU); c.fill(); });
      c.fillStyle = '#fff'; c.fillRect(-8 + fx, ey - 3, 2, 2); c.fillRect(6 + fx, ey - 3, 2, 2);
    } else if (s === 'feliz') {
      [-7, 7].forEach(function (d) { c.beginPath(); c.arc(d + fx, ey + 3, 4, Math.PI, 0); c.stroke(); });
    } else if (s === 'enfadado') {
      c.fillRect(-10 + fx, ey - 2, 6, 6); c.fillRect(4 + fx, ey - 2, 6, 6);
      c.beginPath(); c.moveTo(-12, ey - 8); c.lineTo(-3, ey - 3); c.moveTo(12, ey - 8); c.lineTo(3, ey - 3); c.stroke();
    } else if (s === 'mareado') {
      [-7, 7].forEach(function (d) {
        c.beginPath(); c.moveTo(d - 3.5 + fx, ey - 3.5); c.lineTo(d + 3.5 + fx, ey + 3.5);
        c.moveTo(d + 3.5 + fx, ey - 3.5); c.lineTo(d - 3.5 + fx, ey + 3.5); c.stroke();
      });
    } else if (s === 'ciclope') {
      c.beginPath(); c.arc(fx, ey, 6.5, 0, TAU); c.fill();
      c.fillStyle = dk ? '#2a2447' : '#fff'; c.beginPath(); c.arc(fx + f * 1.5, ey, 2.6, 0, TAU); c.fill();
    } else if (s === 'corazones') {
      c.fillStyle = '#ff4d6d';
      [-7, 7].forEach(function (d) {
        c.beginPath();
        c.moveTo(d + fx, ey + 3);
        c.bezierCurveTo(d - 4 + fx, ey - 2, d - 4 + fx, ey - 6, d + fx, ey - 3);
        c.bezierCurveTo(d + 4 + fx, ey - 6, d + 4 + fx, ey - 2, d + fx, ey + 3);
        c.fill();
      });
    } else if (s === 'estrellas') {
      c.fillStyle = '#ffd24d';
      [-7, 7].forEach(function (d) {
        c.beginPath();
        for (var k = 0; k < 10; k++) {
          var rad = k % 2 ? 2 : 4.5, ang = k * Math.PI / 5 - Math.PI / 2;
          c.lineTo(d + fx + Math.cos(ang) * rad, ey + Math.sin(ang) * rad);
        }
        c.closePath(); c.fill();
      });
    } else { c.fillRect(-9.5 + fx, ey - 3.5, 4.5, 7); c.fillRect(5 + fx, ey - 3.5, 4.5, 7); }

    if (ch === 'observador') { c.strokeStyle = '#0a0818'; c.beginPath(); c.arc(2, 6, 6, 0.1, 2.6); c.stroke(); }
    if (ch === 'gato') {
      c.strokeStyle = 'rgba(40,30,70,.55)'; c.lineWidth = 1; c.beginPath();
      c.moveTo(-15, 4); c.lineTo(-24, 2); c.moveTo(-15, 8); c.lineTo(-24, 10);
      c.moveTo(15, 4); c.lineTo(24, 2); c.moveTo(15, 8); c.lineTo(24, 10); c.stroke();
    }

    /* accesorio */
    var h = lo.hat;
    if (h === 'gafas') {
      c.fillStyle = '#0a0a14'; rr(c, -13, ey - 4, 11, 8, 2); c.fill(); rr(c, 2, ey - 4, 11, 8, 2); c.fill();
      c.fillRect(-3, ey - 2, 6, 2);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-11, ey - 3, 4, 2); c.fillRect(4, ey - 3, 4, 2);
    } else if (h === 'corona') {
      c.fillStyle = '#ffd24d'; c.strokeStyle = '#b8860b'; c.lineWidth = 1.2; c.beginPath();
      c.moveTo(-10, top + 1); c.lineTo(-13, top - 11); c.lineTo(-5, top - 5); c.lineTo(0, top - 14);
      c.lineTo(5, top - 5); c.lineTo(13, top - 11); c.lineTo(10, top + 1); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ff4d6d'; c.fillRect(-1.5, top - 5, 3, 3);
    } else if (h === 'mago') {
      c.fillStyle = '#5b3fd0'; c.beginPath(); c.moveTo(-12, top + 3); c.lineTo(2, top - 32); c.lineTo(12, top + 3); c.closePath(); c.fill();
      c.fillStyle = '#3c2799'; c.fillRect(-18, top, 36, 4);
      c.fillStyle = '#ffd24d'; c.fillRect(-1, top - 14, 4, 4);
    } else if (h === 'cuernos') {
      c.fillStyle = '#e8334f'; c.beginPath();
      c.moveTo(-12, top + 4); c.lineTo(-15, top - 11); c.lineTo(-5, top + 1);
      c.moveTo(12, top + 4); c.lineTo(15, top - 11); c.lineTo(5, top + 1); c.fill();
    } else if (h === 'halo') {
      c.strokeStyle = '#ffe08a'; c.lineWidth = 2.6; c.shadowColor = '#ffd24d'; c.shadowBlur = 12;
      c.beginPath(); c.ellipse(0, top - 9 + Math.sin(t * 3) * 1.5, 11, 3.4, 0, 0, TAU); c.stroke(); c.shadowBlur = 0;
    } else if (h === 'antena') {
      c.strokeStyle = '#9a96c2'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, top); c.lineTo(0, top - 13); c.stroke();
      c.fillStyle = (t * 2 % 2) < 1 ? '#6bffb4' : '#2a8f64'; c.beginPath(); c.arc(0, top - 15, 3.4, 0, TAU); c.fill();
    } else if (h === 'copa') {
      c.fillStyle = '#1a1a2a';
      c.fillRect(-13, top - 2, 26, 3);
      c.fillRect(-11, top - 16, 22, 15);
      c.fillRect(-6, top - 3, 12, 2);
      c.fillStyle = '#ff4d6d'; c.fillRect(-3, top - 12, 6, 2);
    } else if (h === 'auriculares') {
      c.strokeStyle = '#2a2447'; c.lineWidth = 3;
      c.beginPath(); c.arc(0, -2, 16, Math.PI * 0.9, Math.PI * 2.1); c.stroke();
      c.fillStyle = '#2a2447';
      c.fillRect(-17, -2, 5, 9); c.fillRect(12, -2, 5, 9);
      c.fillStyle = '#8ef4ff'; c.fillRect(-16, 0, 3, 5); c.fillRect(13, 0, 3, 5);
    } else if (h === 'bigote') {
      c.fillStyle = '#0a0818';
      c.beginPath();
      c.ellipse(-4 + fx, 6, 6, 2.5, -0.2, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(4 + fx, 6, 6, 2.5, 0.2, 0, TAU); c.fill();
    } else if (h === 'parche') {
      c.fillStyle = '#0a0818'; c.fillRect(-13 + fx, ey - 4, 10, 9);
      c.strokeStyle = '#0a0818'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-14, ey - 6); c.lineTo(10, ey - 10); c.stroke();
    } else if (h === 'bufanda') {
      c.fillStyle = '#ff4d6d'; c.fillRect(-13, 10, 26, 5);
      c.fillRect(-11, 13, 5, 12);
    } else if (h === 'capa') {
      c.fillStyle = 'rgba(150,20,80,.85)';
      c.beginPath(); c.moveTo(-15, -12); c.lineTo(-20, 22); c.lineTo(20, 22); c.lineTo(15, -12); c.closePath(); c.fill();
    } else if (h === 'mochila') {
      c.fillStyle = '#5b3fd0';
      c.fillRect(-14, -8, 6, 16); c.fillRect(8, -8, 6, 16);
      c.fillStyle = '#3c2799'; c.fillRect(-14, 0, 6, 2); c.fillRect(8, 0, 6, 2);
    } else if (h === 'globo') {
      c.strokeStyle = '#8a8fb0'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(8, top); c.lineTo(10, top - 14); c.stroke();
      c.fillStyle = '#ff4d6d';
      c.beginPath(); c.ellipse(10, top - 20, 7, 8, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(8, top - 22, 2, 3, 0, 0, TAU); c.fill();
    }
    else if (h === 'orejas') {
      c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(-7, top - 11, 4, 12, -0.15, 0, TAU); c.ellipse(7, top - 11, 4, 12, 0.15, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#ff9bb8'; c.beginPath(); c.ellipse(-7, top - 11, 1.8, 8, -0.15, 0, TAU); c.ellipse(7, top - 11, 1.8, 8, 0.15, 0, TAU); c.fill();
    } else if (h === 'flor') {
      c.fillStyle = '#ff8bd0'; for (var fp = 0; fp < 5; fp++) { c.beginPath(); c.arc(-9 + Math.cos(fp * 1.257) * 4.5, top - 3 + Math.sin(fp * 1.257) * 4.5, 3.4, 0, TAU); c.fill(); }
      c.fillStyle = '#ffd24d'; c.beginPath(); c.arc(-9, top - 3, 2.6, 0, TAU); c.fill();
    } else if (h === 'lazo') {
      c.fillStyle = '#ff4d6d'; c.beginPath(); c.moveTo(0, 13); c.lineTo(-9, 8); c.lineTo(-9, 18); c.closePath(); c.moveTo(0, 13); c.lineTo(9, 8); c.lineTo(9, 18); c.closePath(); c.fill();
      c.fillStyle = '#b8203f'; c.fillRect(-2, 11, 4, 4);
    } else if (h === 'antifaz') {
      c.fillStyle = '#15131f'; rr(c, -14, ey - 5, 28, 10, 5); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-6 + fx, ey, 3, 2.4, 0, 0, TAU); c.ellipse(6 + fx, ey, 3, 2.4, 0, 0, TAU); c.fill();
    } else if (h === 'gorra') {
      c.fillStyle = '#4d7dff'; c.beginPath(); c.ellipse(0, top + 1, 14, 9, 0, Math.PI, 0); c.fill();
      c.fillRect(0, top, 20 * (f || 1) > 0 ? 18 : -18, 3);
    } else if (h === 'sombrero') {
      c.fillStyle = '#15131f'; c.beginPath(); c.moveTo(-20, top + 2); c.lineTo(-10, top - 12); c.lineTo(10, top - 12); c.lineTo(20, top + 2); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.fillRect(-2, top - 9, 4, 4); c.fillRect(-5, top - 6, 10, 1.6);
    } else if (h === 'nariz') {
      c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(fx, ey + 7, 4.6, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(fx - 1, ey + 5.5, 1.3, 0, TAU); c.fill();
    } else if (h === 'estrella') {
      var sy = top - 20 + Math.sin(t * 3) * 3; c.fillStyle = '#ffe08a'; c.shadowColor = '#ffd24d'; c.shadowBlur = 12; c.beginPath();
      for (var sq = 0; sq < 10; sq++) { var sr = sq % 2 ? 3.6 : 8, sa = sq * Math.PI / 5 - Math.PI / 2 + t; c.lineTo(Math.cos(sa) * sr, sy + Math.sin(sa) * sr); }
      c.closePath(); c.fill(); c.shadowBlur = 0;
    } else if (h === 'dj') {
      c.strokeStyle = '#15131f'; c.lineWidth = 4; c.beginPath(); c.arc(0, -2, 18, Math.PI * 0.88, Math.PI * 2.12); c.stroke();
      var pul = 1 + Math.abs(Math.sin(t * 8.6)) * .25;
      c.fillStyle = '#15131f'; c.beginPath(); c.ellipse(-19, 3, 5 * pul, 8, 0, 0, TAU); c.ellipse(19, 3, 5 * pul, 8, 0, 0, TAU); c.fill();
      c.fillStyle = '#ff3fa4'; c.beginPath(); c.arc(-19, 3, 2.6, 0, TAU); c.arc(19, 3, 2.6, 0, TAU); c.fill();
    } else if (h === 'fiesta') {
      c.fillStyle = '#b48cff'; c.beginPath(); c.moveTo(-9, top + 1); c.lineTo(0, top - 24); c.lineTo(9, top + 1); c.closePath(); c.fill();
      c.fillStyle = '#ffd24d'; c.fillRect(-6, top - 8, 12, 3); c.beginPath(); c.arc(0, top - 25, 3.2, 0, TAU); c.fill();
    }
    c.restore();
  }

  /* un punto de estela */
  function trailDot(c, st, x, y, age, i, col, glow) {
    var k = 1 - age; c.globalAlpha = k * 0.7;
    if (st === 'glow') { c.fillStyle = glow; c.beginPath(); c.arc(x, y, 11 * (1 - age * 0.5), 0, TAU); c.fill(); }
    else if (st === 'fuego') { c.fillStyle = 'hsl(' + (12 + age * 42) + ',100%,' + (62 - age * 18) + '%)'; c.beginPath(); c.arc(x, y - age * 14, 10 * k, 0, TAU); c.fill(); }
    else if (st === 'rainbow') { c.fillStyle = 'hsl(' + ((i * 22) % 360) + ',90%,66%)'; c.beginPath(); c.arc(x, y, 9 * (1 - age * 0.4), 0, TAU); c.fill(); }
    else if (st === 'pixel') { c.fillStyle = col; var s = 9 * k; c.fillRect(x - s / 2, y - s / 2, s, s); }
    else if (st === 'star') {
      c.fillStyle = '#ffe9a8'; var r = 8 * k; c.beginPath();
      for (var q = 0; q < 8; q++) { var rad = q % 2 ? r * 0.35 : r, an = q * Math.PI / 4 + age * 3; c.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad); }
      c.closePath(); c.fill();
    }
    else if (st === 'burbuja') {
      c.strokeStyle = col; c.lineWidth = 1.5;
      c.beginPath(); c.arc(x, y - age * 20, 7 * k, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(x, y - age * 20, 7 * k, 0, TAU); c.fill();
    }
    else if (st === 'hojas') {
      c.fillStyle = 'hsl(' + (90 + i * 12) % 360 + ',70%,50%)';
      c.save(); c.translate(x, y); c.rotate(age * 6 + i);
      c.beginPath(); c.ellipse(0, 0, 6 * k, 3 * k, 0, 0, TAU); c.fill();
      c.restore();
    }
    else if (st === 'notas') {
      c.fillStyle = '#ffd24d';
      c.font = (14 * k) + 'px serif'; c.textAlign = 'center';
      c.fillText('♪', x, y - age * 18);
    }
    else if (st === 'corazones') {
      c.fillStyle = '#ff4d6d'; var hk = 5 * k;
      c.beginPath(); c.moveTo(x, y + hk * 0.8);
      c.bezierCurveTo(x - hk, y - hk * 0.4, x - hk, y - hk, x, y - hk * 0.4);
      c.bezierCurveTo(x + hk, y - hk, x + hk, y - hk * 0.4, x, y + hk * 0.8);
      c.fill();
    }
    else if (st === 'confeti') {
      c.fillStyle = 'hsl(' + ((i * 47) % 360) + ',90%,62%)'; c.save(); c.translate(x, y + age * 10); c.rotate(age * 9 + i);
      c.fillRect(-3 * k, -1.6 * k, 6 * k, 3.2 * k); c.restore();
    }
    else if (st === 'rayos') {
      c.strokeStyle = '#fff36b'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 5, y - 9 * k); c.lineTo(x + 2, y - 1); c.lineTo(x - 3, y + 1); c.lineTo(x + 4, y + 9 * k); c.stroke();
    }
    c.globalAlpha = 1;
  }

  /* ---------------------------------------------------------- MASCOTAS */
  function drawPet(c, pet, px, py, t, facing) {
    c.save();
    switch (pet) {
      case 'rata': {
        var ox = px - facing * 26, oy = py + 6 + Math.sin(t * 4) * 2;
        c.fillStyle = '#5a4a6a';
        c.beginPath(); c.ellipse(ox, oy, 7, 5, 0, 0, TAU); c.fill();
        c.beginPath(); c.arc(ox + facing * 5, oy - 3, 4, 0, TAU); c.fill();
        c.strokeStyle = '#5a4a6a'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(ox - facing * 6, oy); c.lineTo(ox - facing * 14, oy - 2 + Math.sin(t * 6) * 2); c.stroke();
        c.fillStyle = '#0a0818'; c.beginPath(); c.arc(ox + facing * 6, oy - 4, 1, 0, TAU); c.fill();
        break;
      }
      case 'rana': {
        var ox = px + facing * 24, oy = py + 8 - Math.abs(Math.sin(t * 3)) * 4;
        c.fillStyle = '#7cff9c';
        c.beginPath(); c.ellipse(ox, oy, 8, 6, 0, 0, TAU); c.fill();
        c.beginPath(); c.arc(ox - 4, oy - 5, 3.5, 0, TAU); c.fill();
        c.beginPath(); c.arc(ox + 4, oy - 5, 3.5, 0, TAU); c.fill();
        c.fillStyle = '#0a0818';
        c.beginPath(); c.arc(ox - 4, oy - 5, 1.2, 0, TAU); c.fill();
        c.beginPath(); c.arc(ox + 4, oy - 5, 1.2, 0, TAU); c.fill();
        break;
      }
      case 'gato': {
        var ox = px - facing * 30, oy = py + 4;
        c.fillStyle = '#0a0818';
        c.beginPath(); c.ellipse(ox, oy, 9, 7, 0, 0, TAU); c.fill();
        c.beginPath(); c.arc(ox - facing * 5, oy - 8, 6, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(ox - facing * 8, oy - 12); c.lineTo(ox - facing * 11, oy - 18); c.lineTo(ox - facing * 5, oy - 14); c.fill();
        c.beginPath(); c.moveTo(ox - facing * 3, oy - 12); c.lineTo(ox - facing * 1, oy - 18); c.lineTo(ox + facing * 1, oy - 12); c.fill();
        c.fillStyle = '#ffd24d';
        c.beginPath(); c.arc(ox - facing * 6, oy - 8, 1.5, 0, TAU); c.fill();
        c.beginPath(); c.arc(ox - facing * 3, oy - 8, 1.5, 0, TAU); c.fill();
        c.strokeStyle = '#0a0818'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(ox + facing * 8, oy); c.lineTo(ox + facing * 15, oy - 3 + Math.sin(t * 4) * 3); c.stroke();
        break;
      }
      case 'polilla': {
        var ox = px - facing * 20, oy = py - 20 + Math.sin(t * 5) * 5;
        c.fillStyle = 'rgba(255,235,200,.9)';
        c.beginPath(); c.ellipse(ox, oy, 4, 3, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,235,200,.6)';
        c.beginPath(); c.ellipse(ox - 5, oy - 2 + Math.sin(t * 10) * 2, 5, 3.5, -0.4, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(ox + 5, oy - 2 - Math.sin(t * 10) * 2, 5, 3.5, 0.4, 0, TAU); c.fill();
        break;
      }
      case 'slime': {
        var ox = px - facing * 28, oy = py + 10 + Math.abs(Math.sin(t * 3)) * -4;
        c.fillStyle = '#7cffd4';
        c.beginPath(); c.ellipse(ox, oy, 8, 7, 0, 0, TAU); c.fill();
        c.fillStyle = '#0a0818';
        c.beginPath(); c.arc(ox - 2, oy - 1, 1.5, 0, TAU); c.fill();
        c.beginPath(); c.arc(ox + 2, oy - 1, 1.5, 0, TAU); c.fill();
        break;
      }
      case 'pez': {
        var ox = px + facing * 35, oy = py - 10 + Math.sin(t * 2) * 4;
        c.globalAlpha = 0.7; c.fillStyle = '#8ef4ff';
        c.beginPath(); c.ellipse(ox, oy, 8, 5, 0, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(ox - facing * 8, oy); c.lineTo(ox - facing * 15, oy - 4); c.lineTo(ox - facing * 15, oy + 4); c.fill();
        c.fillStyle = '#001018';
        c.beginPath(); c.arc(ox + facing * 3, oy - 1, 1.5, 0, TAU); c.fill();
        break;
      }
      case 'murcielago': {
        var ox = px - facing * 15, oy = py - 25 + Math.sin(t * 4) * 6;
        c.fillStyle = '#2a0a26';
        c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox - 12, oy - 4 + Math.sin(t * 8) * 3); c.lineTo(ox - 10, oy + 2); c.fill();
        c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + 12, oy - 4 + Math.sin(t * 8 + 1) * 3); c.lineTo(ox + 10, oy + 2); c.fill();
        c.beginPath(); c.arc(ox, oy, 5, 0, TAU); c.fill();
        c.fillStyle = '#ff2d55';
        c.beginPath(); c.arc(ox - 2, oy - 1, 1, 0, TAU); c.fill();
        c.beginPath(); c.arc(ox + 2, oy - 1, 1, 0, TAU); c.fill();
        break;
      }
      case 'cuervo': {
        var ox = px - facing * 20, oy = py - 30 + Math.sin(t * 1.5) * 3;
        c.fillStyle = '#0a0818';
        c.beginPath(); c.ellipse(ox, oy, 7, 5, 0, 0, TAU); c.fill();
        c.beginPath(); c.arc(ox + facing * 4, oy - 4, 4, 0, TAU); c.fill();
        c.fillStyle = '#fbbf24';
        c.beginPath(); c.moveTo(ox + facing * 8, oy - 4); c.lineTo(ox + facing * 12, oy - 3); c.lineTo(ox + facing * 8, oy - 2); c.fill();
        c.fillStyle = '#ff2d55';
        c.beginPath(); c.arc(ox + facing * 5, oy - 5, 1, 0, TAU); c.fill();
        break;
      }
      case 'conejo': {
        var ox = px - facing * 28, oy = py + 8 - Math.abs(Math.sin(t * 3.5)) * 6;
        c.fillStyle = '#f4f1ff'; c.beginPath(); c.ellipse(ox, oy, 8, 6, 0, 0, TAU); c.arc(ox + facing * 6, oy - 4, 4.4, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(ox + facing * 5, oy - 12, 1.8, 6, 0.1, 0, TAU); c.ellipse(ox + facing * 8, oy - 12, 1.8, 6, 0.2, 0, TAU); c.fill();
        c.fillStyle = '#0a0818'; c.beginPath(); c.arc(ox + facing * 7.5, oy - 5, 1, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(ox - facing * 8, oy, 2.4, 0, TAU); c.fill();
        break;
      }
      case 'pinguino': {
        var ox = px + facing * 26, oy = py + 6 + Math.sin(t * 6) * 1.2;
        c.fillStyle = '#15131f'; c.beginPath(); c.ellipse(ox, oy, 6, 8, 0, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ox + facing, oy + 2, 4, 6, 0, 0, TAU); c.fill();
        c.fillStyle = '#ffb02e'; c.beginPath(); c.moveTo(ox + facing * 5, oy - 4); c.lineTo(ox + facing * 10, oy - 2); c.lineTo(ox + facing * 5, oy - 1); c.fill();
        c.beginPath(); c.ellipse(ox - 3, oy + 8, 3, 1.4, 0, 0, TAU); c.ellipse(ox + 3, oy + 8, 3, 1.4, 0, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(ox + facing * 2, oy - 5, 1.4, 0, TAU); c.fill();
        break;
      }
      case 'zorro': {
        var ox = px - facing * 32, oy = py + 5;
        c.fillStyle = '#ff7a2f'; c.beginPath(); c.ellipse(ox, oy, 9, 6, 0, 0, TAU); c.arc(ox + facing * 8, oy - 4, 5, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(ox + facing * 5, oy - 8); c.lineTo(ox + facing * 6, oy - 15); c.lineTo(ox + facing * 9, oy - 8); c.moveTo(ox + facing * 9, oy - 8); c.lineTo(ox + facing * 11, oy - 14); c.lineTo(ox + facing * 12, oy - 6); c.fill();
        c.beginPath(); c.moveTo(ox - facing * 8, oy); c.quadraticCurveTo(ox - facing * 20, oy - 8 + Math.sin(t * 4) * 3, ox - facing * 18, oy + 4); c.lineTo(ox - facing * 8, oy + 3); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(ox - facing * 18, oy + 3, 2.2, 0, TAU); c.fill();
        c.fillStyle = '#0a0818'; c.beginPath(); c.arc(ox + facing * 10, oy - 5, 1, 0, TAU); c.fill();
        break;
      }
      case 'medusa': {
        var ox = px + facing * 30, oy = py - 24 + Math.sin(t * 2.2) * 5;
        c.globalAlpha = .8; c.fillStyle = '#ff9bf0'; c.beginPath(); c.ellipse(ox, oy, 9, 7 + Math.sin(t * 4) * 1.2, 0, Math.PI, 0); c.fill();
        c.strokeStyle = '#ff9bf0'; c.lineWidth = 1.4;
        for (var mq = -1; mq <= 1; mq++) { c.beginPath(); c.moveTo(ox + mq * 5, oy); c.quadraticCurveTo(ox + mq * 5 + Math.sin(t * 5 + mq) * 3, oy + 7, ox + mq * 5, oy + 13); c.stroke(); }
        c.globalAlpha = 1; c.fillStyle = '#0a0818'; c.beginPath(); c.arc(ox - 3, oy - 2, 1, 0, TAU); c.arc(ox + 3, oy - 2, 1, 0, TAU); c.fill();
        break;
      }
      case 'abeja': {
        var ox = px + facing * 22, oy = py - 22 + Math.sin(t * 6) * 4;
        c.fillStyle = 'rgba(220,240,255,.7)'; c.beginPath(); c.ellipse(ox - 2, oy - 6, 4, 2.6 + Math.sin(t * 40), -0.3, 0, TAU); c.ellipse(ox + 3, oy - 6, 4, 2.6 - Math.sin(t * 40), 0.3, 0, TAU); c.fill();
        c.fillStyle = '#ffd24d'; c.beginPath(); c.ellipse(ox, oy, 6, 4.4, 0, 0, TAU); c.fill();
        c.fillStyle = '#15131f'; c.fillRect(ox - 2, oy - 4.2, 1.8, 8.4); c.fillRect(ox + 2, oy - 4, 1.8, 8);
        c.beginPath(); c.arc(ox + facing * 6, oy, 2.6, 0, TAU); c.fill();
        break;
      }
      case 'dragoncito': {
        var ox = px - facing * 24, oy = py - 28 + Math.sin(t * 2.6) * 4;
        c.fillStyle = 'rgba(124,255,156,.75)'; c.beginPath(); c.moveTo(ox, oy - 2); c.lineTo(ox - 10, oy - 11 + Math.sin(t * 9) * 3); c.lineTo(ox - 3, oy + 2); c.fill();
        c.beginPath(); c.moveTo(ox, oy - 2); c.lineTo(ox + 10, oy - 11 - Math.sin(t * 9) * 3); c.lineTo(ox + 3, oy + 2); c.fill();
        c.fillStyle = '#7cff9c'; c.beginPath(); c.ellipse(ox, oy, 7, 5, 0, 0, TAU); c.arc(ox + facing * 7, oy - 2, 4, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(ox - facing * 7, oy); c.lineTo(ox - facing * 15, oy + 3 + Math.sin(t * 5) * 2); c.lineTo(ox - facing * 7, oy + 3); c.fill();
        c.fillStyle = '#ff9d3a'; if ((t * 2) % 3 < .4) { c.beginPath(); c.arc(ox + facing * 13, oy - 2, 2.4, 0, TAU); c.fill(); }
        c.fillStyle = '#0a0818'; c.beginPath(); c.arc(ox + facing * 8, oy - 3, 1, 0, TAU); c.fill();
        break;
      }
      case 'buho': {
        var ox = px - facing * 22, oy = py - 22 + Math.sin(t * 2) * 2;
        c.fillStyle = '#8a6a4a';
        c.beginPath(); c.ellipse(ox, oy, 8, 9, 0, 0, TAU); c.fill();
        c.fillStyle = '#ffe08a';
        c.beginPath(); c.arc(ox - 3, oy - 2, 3, 0, TAU); c.fill();
        c.beginPath(); c.arc(ox + 3, oy - 2, 3, 0, TAU); c.fill();
        c.fillStyle = '#0a0818';
        c.beginPath(); c.arc(ox - 3, oy - 2, 1.4, 0, TAU); c.fill();
        c.beginPath(); c.arc(ox + 3, oy - 2, 1.4, 0, TAU); c.fill();
        c.fillStyle = '#ff8a4c';
        c.beginPath(); c.moveTo(ox - 2, oy + 3); c.lineTo(ox + 2, oy + 3); c.lineTo(ox, oy + 6); c.fill();
        break;
      }
    }
    c.restore();
  }

  /* ------------------------------------------------- JUEGO: drawPlayer */
  G.drawPlayer = function (ctx) {
    var L = this.lvl, p = L && L.player; if (!p) return;
    var s = St();
    var lo = s.equip, glow = this.theme.glow, col = colorOf(lo.color, this.t);

    if (lo.trail !== 'none' && p.trail) {
      for (var i = 0; i < p.trail.length; i++) {
        var q = p.trail[i];
        trailDot(ctx, lo.trail, q.x, q.y, clamp((this.t - q.t) / 0.5, 0, 1), i, col, glow);
      }
    }

    avatar(ctx, p.x + p.w / 2, p.y + p.h / 2, lo, this.t, {
      sq: p.onGround ? 1 : (p.vy < 0 ? 1.08 : 0.94), face: p.facing,
      tilt: clamp(p.vx / 1400, -0.16, 0.16), glow: glow, aura: true });

    if (lo.pet && lo.pet !== 'none') {
      if (EO.Pets && this.pet) EO.Pets.draw(ctx, this);
      else drawPet(ctx, lo.pet, p.x + p.w / 2, p.y + p.h / 2, this.t, p.facing);
    }

    if (p.onGround) {
      ctx.globalAlpha = 0.25 + Math.sin(this.t * 4) * 0.1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h + 3, 14, 4, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
  };

  /* ---------------------------------------------------------- ECONOMÍA */
  EO.Shop = {
    items: ITEMS,
    skills: SKILLS,
    drawPet: drawPet,
    avatar: avatar, colorOf: colorOf, trailDot: trailDot, equip: function () { return St().equip; },
    hasSkill: hasSkill,
    reward: function (g, L) {
      var s = St(), n = g.levelNum, parts = [['Nivel', 10 + Math.min(10, Math.floor(n / 5) * 2)]], sum = 0;
      if (g.deaths === 0) parts.push(['Sin morir', 6]);
      if (g.helpUsed === 0) parts.push(['Sin ayudas', 4]);
      if (g.orbsGot) parts.push(['Orbes', g.orbsGot * 2]);
      if (L.boss) parts.push(['Jefe', 25]);
      parts.forEach(function (a) { sum += a[1]; });
      var m = { diablo: 1.5, diario: 1.5, descenso: 1.25 }[g.mode] || 1, k = g._replay ? 0.25 : 1;
      if (g.mode === 'story' || g.mode === 'story-final') {
        if (s.cleared['l' + n]) k = Math.min(k, 0.3);
        s.cleared['l' + n] = 1;
      }
      // Vista de grieta: penalización -20%
      if (hasSkill('vista') && g.mode !== 'story') k *= 0.8;
      var mult = m * k;
      return { total: Math.max(1, Math.round(sum * mult)),
        txt: parts.map(function (a) { return a[0] + ' +' + a[1]; }).join(' · ') +
          (mult !== 1 ? ' · ×' + String(+mult.toFixed(2)) : '') };
    },
    sub: function () {
      var e = document.getElementById('m-shop-sub'); if (e) e.textContent = (St().coins || 0) + ' CAOS';
      var r = document.getElementById('r-shop'); if (r) r.textContent = 'Tienda · ' + (St().coins || 0) + ' CAOS';
    },
    hardestLevel: function () {
      var s = EO.Store.get();
      if (!s.stats) return null;
      var max = 0, k = null;
      for (var key in s.stats) {
        if (s.stats[key].deaths > max) { max = s.stats[key].deaths; k = key; }
      }
      return k ? { level: parseInt(k.slice(1), 10), deaths: max } : null;
    }
  };
  var uu = EO.UI.updateMenu;
  EO.UI.updateMenu = function () { uu.apply(this, arguments); EO.Shop.sub(); };

  /* ---------------------------------------------------------- TIENDA UI */
  var V = { tab: 'char', sel: null, ret: 'menu', raf: 0 };
  EO.UI.screens.push('shop');

  function preview(lo, t) {
    var cv = document.getElementById('shop-prev'); if (!cv) return;
    var c = cv.getContext('2d'), W = cv.width, H = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    var gl = EO.THEMES[1].glow, g = c.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, W * 0.7);
    g.addColorStop(0, gl + '55'); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    var sc = W / 200 * 3.2, cx = W / 2, cy = H * 0.5 + Math.sin(t * 2) * 4;
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(W * 0.2, cy + 20 * sc + 4, W * 0.6, 3);
    c.save(); c.translate(cx, cy); c.scale(sc, sc);
    if (lo.trail !== 'none') for (var i = 0; i < 12; i++) trailDot(c, lo.trail, -14 - i * 5.5, 4 + Math.sin(t * 3 + i) * 3, i / 12, i, colorOf(lo.color, t), gl);
    avatar(c, 0, 0, lo, t, { face: Math.sin(t * 0.7) > 0 ? 1 : -1, glow: gl, aura: true, sq: 1 + Math.sin(t * 2) * 0.03 });
    if (lo.pet && lo.pet !== 'none') drawPet(c, lo.pet, 0, 0, t, 1);
    c.restore();
  }
  function loop() {
    if (EO.UI.current !== 'shop') { V.raf = 0; return; }
    var s = St(), lo = Object.assign({}, s.equip);
    if (V.sel) { var it = find(V.sel); if (it) lo[it.slot] = it.id; }
    preview(lo, performance.now() / 1000);
    V.raf = requestAnimationFrame(loop);
  }

  function render() {
    var s = St();
    document.getElementById('shop-coins').textContent = s.coins || 0;
    var tabs = document.getElementById('shop-tabs');
    tabs.innerHTML = TABS.map(function (t) { return '<button class="shop-tab' + (t[0] === V.tab ? ' on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('');

    if (V.tab === 'skill') {
      var grid = document.getElementById('shop-grid');
      grid.innerHTML = SKILLS.map(function (sk) {
        var own = hasSkill(sk.id), canBuy = !own && (s.coins || 0) >= sk.p, sel = V.sel === 'skill.' + sk.id;
        var label = own ? '✓ ACTIVO' : (sel ? 'COMPRAR · ' + sk.p : sk.p + ' CAOS');
        return '<div class="sitem' + (own ? ' eq' : '') + (sel ? ' sel' : '') + (!own && (s.coins || 0) < sk.p ? ' poor' : '') +
          '" data-k="skill.' + sk.id + '" data-r="' + (sk.p >= 200 ? 'l' : sk.p >= 150 ? 'e' : 'r') + '" style="grid-column:span 2;text-align:left;padding:12px">' +
          '<b style="display:block;font-size:13px">' + sk.n + '</b>' +
          '<p style="font-size:10.5px;color:#c9c3ee;margin:4px 0;line-height:1.4">' + sk.desc + '</p>' +
          '<p style="font-size:10px;color:#f87171;margin:0 0 4px;line-height:1.3">⚠ ' + sk.bad + '</p>' +
          '<u style="display:block;font-family:var(--mono);font-size:10px;color:' + (own ? 'var(--good)' : 'var(--gold)') + '">' + label + '</u></div>';
      }).join('') +
        '<div class="tiny" style="grid-column:span 2;text-align:center;margin-top:8px;opacity:.7">' +
        'Las habilidades solo se aplican en modos distintos a la Historia.</div>';
      EO.Shop.sub();
      return;
    }

    var grid = document.getElementById('shop-grid'), list = ITEMS.filter(function (i) { return i.slot === V.tab; });
    grid.innerHTML = list.map(function (it) {
      var k = it.slot + '.' + it.id, own = owned(it, s), eq = s.equip[it.slot] === it.id, r = rarity(it), lab;
      if (eq) lab = '✓ EQUIPADO';
      else if (own) lab = 'TUYO';
      else if (it.a) { var a = EO.ACHIEVEMENTS.filter(function (x) { return x.id === it.a; })[0]; lab = '🔒 ' + (a ? a.n : 'Logro'); }
      else lab = V.sel === k ? 'COMPRAR · ' + it.p : it.p + ' CAOS';
      return '<div class="sitem' + (eq ? ' eq' : '') + (V.sel === k ? ' sel' : '') + (!own && (s.coins || 0) < it.p && !it.a ? ' poor' : '') +
        '" data-k="' + k + '" data-r="' + r + '"><canvas width="112" height="112"></canvas><b>' + it.n + '</b><i>' + RAR[r] + '</i><u>' + lab + '</u></div>';
    }).join('');
    if (V.tab === 'pet' && EO.Pets) {
      var pid = (V.sel && V.sel.indexOf('pet.') === 0) ? V.sel.slice(4) : s.equip.pet, inf = EO.Pets.info[pid];
      grid.innerHTML += '<div class="tiny" style="grid-column:1/-1;text-align:left;margin-top:6px;line-height:1.45">' +
        (inf ? '<b>' + inf[0] + '</b> · ' + inf[1] + ' <span style="opacity:.6">(máx. 4 ayudas por nivel; nunca se adelanta si hay trampas)</span>' : 'Elige una mascota: te sigue con vida propia y te ayuda de vez en cuando.') + '</div>';
    }
    var cvs = grid.querySelectorAll('.sitem canvas');
    list.forEach(function (it, i) {
      var c = cvs[i].getContext('2d'), lo = Object.assign({}, s.equip); lo[it.slot] = it.id;
      c.scale(1.8, 1.8);
      if (it.slot === 'trail' && it.id !== 'none') { for (var j = 0; j < 6; j++) trailDot(c, it.id, 4 + j * 3, 31, 1 - j / 6, j, colorOf(lo.color, 0.5), '#8b5cf6'); }
      if (it.slot === 'pet') {
        avatar(c, 36, 32, lo, 0.5, { face: 1 });
        if (it.id !== 'none') drawPet(c, it.id, 36, 32, 0.5, 1);
      } else {
        avatar(c, 36, 32, lo, 0.5, { face: 1 });
      }
    });
    EO.Shop.sub();
  }

  function back() { if (V.ret === 'menu') EO.UI.updateMenu(); EO.UI.show(V.ret); }

  function wire() {
    var $ = function (id) { return document.getElementById(id); };
    function on(id, fn) { var e = $(id); if (e) e.addEventListener('click', function () { EO.Audio.click(); fn(); }); }
    function open(ret) { V.ret = ret; V.sel = null; render(); EO.UI.show('shop'); if (!V.raf) V.raf = requestAnimationFrame(loop); }
    on('m-shop', function () { open('menu'); });
    on('p-shop', function () { open('pause'); });
    on('r-shop', function () { open('result'); });
    on('shop-back', back);
    on('shop-random', function () {
      var s = St();
      TABS.forEach(function (t) {
        if (t[0] === 'skill') return;
        var o = ITEMS.filter(function (i) { return i.slot === t[0] && owned(i, s); });
        if (o.length) s.equip[t[0]] = o[Math.floor(Math.random() * o.length)].id;
      });
      V.sel = null; EO.Store.save(); render();
    });
    $('shop-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('.shop-tab'); if (!b) return;
      EO.Audio.click(); V.tab = b.getAttribute('data-t'); V.sel = null; render();
    });
    $('shop-grid').addEventListener('click', function (e) {
      var el = e.target.closest('.sitem'); if (!el) return;
      var k = el.getAttribute('data-k'), s = St();

      if (k.indexOf('skill.') === 0) {
        var sk = findSkill(k.slice(6));
        if (!sk) return;
        if (hasSkill(sk.id)) { EO.UI.toast('YA ACTIVO', '<b>' + sk.n + '</b> ya está funcionando.', 2000); return; }
        if (V.sel === k) {
          if ((s.coins || 0) >= sk.p) {
            s.coins -= sk.p; s.inv[k] = true; V.sel = null; EO.Store.save();
            EO.UI.hud({ coins: s.coins }); EO.Audio.win();
            EO.UI.toast('HABILIDAD', '<b>' + sk.n + '</b> desbloqueada.', 2600);
            if (EO.Game.mode === 'story') EO.UI.toast('NOTA', 'Solo se aplicará en modos distintos a Historia.', 3200);
          } else { EO.Audio.trick(); EO.UI.toast('FALTA CAOS', 'Te faltan ' + (sk.p - (s.coins || 0)) + '.', 2200); }
        } else { V.sel = k; EO.Audio.click(); }
        render(); return;
      }

      var it = find(k);
      if (owned(it, s)) { s.equip[it.slot] = it.id; V.sel = null; EO.Store.save(); EO.Audio.click(); }
      else if (it.a) {
        var a = EO.ACHIEVEMENTS.filter(function (x) { return x.id === it.a; })[0];
        EO.UI.toast('BLOQUEADO', 'Se desbloquea con el logro «' + (a ? a.n : it.a) + '».');
        V.sel = k;
      } else if (V.sel === k) {
        if ((s.coins || 0) >= it.p) {
          s.coins -= it.p; s.inv[k] = true; s.equip[it.slot] = it.id; V.sel = null; EO.Store.save();
          EO.UI.hud({ coins: s.coins }); EO.Audio.win(); EO.UI.toast('COMPRADO', '<b>' + it.n + '</b> equipado.', 2200);
        } else { EO.Audio.trick(); EO.UI.toast('FALTA CAOS', 'Te faltan ' + (it.p - (s.coins || 0)) + ' CAOS. Sigue jugando.'); }
      } else { V.sel = k; EO.Audio.click(); }
      render();
    });
    window.addEventListener('keydown', function (e) {
      if (EO.UI.current !== 'shop') return;
      e.stopImmediatePropagation();
      if (e.key === 'Escape') back();
    }, true);
    setTimeout(function () {
      var s = St(), d = new Date(), k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      if (s.daily !== k) {
        s.daily = k; s.coins = (s.coins || 0) + 10; EO.Store.save();
        EO.UI.hud({ coins: s.coins }); EO.UI.toast('BONO DIARIO', '+10 CAOS por volver hoy.', 4200);
      }
      EO.UI.updateMenu();
    }, 450);
  }
  window.addEventListener('DOMContentLoaded', wire);
})(window.EO);