/* ============================================================================
   EL OBSERVADOR — levels3.js  (v4.0 · BLOQUE IV: LA MÁSCARA · niveles 31–60)
   ============================================================================ */
window.EO = window.EO || {};
(function (EO) {
  'use strict';
  var P = EO.P, S = EO.S, EXIT = EO.EXIT;
  var Q = EO.QUOTES;

  EO.FAMILIAS = EO.FAMILIAS || {};   /* data.js ya definió las 23; aquí añado las del Acto II */
  EO.FAMILIAS.vanity = { n: 'Niveles de vanidad', d: 'El Observador ya no se esconde: celebra que sigas aquí.' };
  EO.FAMILIAS.debt   = { n: 'Niveles de deuda',   d: 'Todo lo que usas, lo pagas. Hasta el suelo.' };

  Q.act2_open = [
    '¿Sigues aquí? Yo nunca me fui. Es diferente.',
    'Bienvenido al segundo acto. Aquí las mentiras tienen intereses.'
  ];
  Q.boss7 = [
    'El Eco repite todo lo que haces. Tú también repites todo lo que haces. Empate.',
    'No le pegues. Hazte Eco tú y que él se ample.',
    'Las campanas no suenan solas. Suena quien insiste.'
  ];
  Q.boss8 = [
    'Él guarda cada muerte que has regalado. Hoy las gasta todas.',
    'Cada lápida de este nivel lleva tu firma. Tú te la diste.',
    'No puedes matar a tu historial. Pero puedes dejar de alimentarlo.'
  ];
  Q.mid40 = [
    'Cuarenta. La mitad de lo que queda. O de lo que crees que queda.',
    'Vas por la mitad del segundo acto. El tercero no existe. Todavía.'
  ];

  EO.LEVELS.push(
  /* ---- 31 · PALABRAS: carteles que mienten sobre plataformas invisibles ---- */
  { num: 31, family: 'lie', name: 'PALABRAS',
    subtitle: 'Los carteles describen lo que no ves. A veces bien.',
    world: { w: 3400, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(3180, 488),
    platforms: [
      P(0, 560, 420, 220),
      P(520, 520, 130, 26, 'ghost'), P(700, 470, 130, 26, 'ghost'),
      P(880, 520, 130, 26, 'ghost'),
      P(1100, 560, 300, 220), P(1500, 560, 260, 220, 'fake'),
      P(1860, 520, 130, 26, 'ghost'), P(2040, 470, 130, 26, 'ghost'),
      P(2260, 560, 300, 220),
      P(2660, 480, 140, 24), P(2860, 480, 140, 24),
      P(3060, 560, 340, 220)
    ],
    spikes: [S(420, 700, 2640, 80)],
    orbs: [{ x: 765, y: 420, n: 1 }, { x: 2380, y: 440, n: 1 }],
    signs: [
      { x: 250, y: 500, text: '3 PLATAFORMAS A LA VISTA', truth: true },
      { x: 1150, y: 500, text: 'EL SUELO SIGUE AHÍ →', truth: false },
      { x: 2300, y: 500, text: 'NADA ENTRE 2260 Y 2660', truth: false }
    ],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: 'Lee con atención. Mentir es fácil; mentir bien, un arte. Yo enseño gratis.' },

  /* ---- 32 · EL ESPEJISMO: ritmo + puertas falsas + miradas ---- */
  { num: 32, family: 'gaze', name: 'EL ESPEJISMO',
    subtitle: 'Las plataformas existen por turnos. Las puertas, por capricho.',
    world: { w: 3000, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2780, 488),
    extraExits: [EXIT(1500, 488, { kind: 'fake' }), EXIT(2300, 488, { kind: 'fake' })],
    platforms: [
      P(0, 560, 380, 220),
      P(460, 520, 140, 24, 'phase', { period: 2.2, offset: 0 }),
      P(680, 470, 140, 24, 'phase', { period: 2.2, offset: .55 }),
      P(900, 520, 140, 24, 'phase', { period: 2.2, offset: 1.1 }),
      P(1120, 560, 340, 220),
      P(1560, 480, 140, 24, 'phase', { period: 1.8, offset: .3 }),
      P(1780, 480, 140, 24, 'phase', { period: 1.8, offset: .9 }),
      P(2000, 560, 380, 220),
      P(2480, 500, 140, 24), P(2640, 560, 360, 220)
    ],
    spikes: [S(380, 700, 2280, 80)],
    orbs: [{ x: 750, y: 410, n: 1 }, { x: 1850, y: 420, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: 'Tres puertas. Dos te devuelven al principio con los mandos cambiados. Elije con fe. La mía.' },

  /* ---- 33 · TE RECUERDO: tu pasado (timeGhost) te caza ---- */
  { num: 33, family: 'shadow', name: 'TE RECUERDO',
    subtitle: 'Tu recorrido de hace dos segundos quiere verte muerto.',
    world: { w: 2800, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2580, 488),
    platforms: [
      P(0, 560, 500, 220),
      P(600, 520, 150, 24), P(820, 470, 150, 24),
      P(1040, 520, 150, 24), P(1260, 470, 150, 24),
      P(1480, 520, 150, 24), P(1700, 470, 150, 24),
      P(1920, 560, 880, 220)
    ],
    spikes: [S(500, 700, 1420, 80)],
    orbs: [{ x: 1115, y: 420, n: 1 }, { x: 1775, y: 420, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true, timeGhost: true }, goal: { type: 'exit' },
    intro: 'Repito tu camino con retraso. Si te alcanzas con tu recuerdo, os borro a los dos.' },

  /* ---- 34 · LA GARGANTA: pozo vertical de caída controlada ---- */
  { num: 34, family: 'moving', name: 'LA GARGANTA',
    subtitle: 'El nivel no es ancho. Es profundo.',
    world: { w: 1200, h: 2400 }, spawn: { x: 80, y: 80 }, exit: EXIT(950, 2008),
    platforms: [
      P(0, 180, 480, 120),
      P(560, 360, 200, 24, 'move', { axis: 'x', amp: 180, speed: 1.0, phase: 0 }),
      P(120, 560, 200, 24, 'move', { axis: 'y', amp: 120, speed: 1.2, phase: 1 }),
      P(620, 760, 220, 24, 'crumble', { delay: .5 }),
      P(140, 960, 220, 24, 'crumble', { delay: .4 }),
      P(620, 1160, 200, 24, 'move', { axis: 'x', amp: 220, speed: 1.4, phase: .5 }),
      P(120, 1360, 240, 24),
      P(640, 1560, 200, 24, 'move', { axis: 'y', amp: 140, speed: .9, phase: 0 }),
      P(160, 1760, 200, 24, 'crumble', { delay: .45 }),
      P(620, 1960, 240, 24),
      P(880, 2100, 320, 300)
    ],
    spikes: [],
    orbs: [{ x: 700, y: 700, n: 1 }, { x: 260, y: 1700, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: 'Abajo está la salida. Abajo siempre está la salida. Que no te lo haya dicho nadie es la gracia.' },

  /* ---- 35 · EL VOTO: sin salto, todo es fe en las alturas ---- */
  { num: 35, family: 'nojump', name: 'EL VOTO',
    subtitle: 'Saltar te lo quita el Observador. Caminar, no.',
    world: { w: 2600, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2380, 488),
    platforms: [
      P(0, 560, 600, 220), P(600, 620, 500, 160), P(1100, 560, 500, 220),
      P(1600, 620, 400, 160), P(2000, 560, 600, 220),
      P(700, 480, 300, 24, 'fake')
    ],
    spikes: [],
    orbs: [{ x: 1350, y: 500, n: 1 }],
    signs: [{ x: 750, y: 440, text: 'ATAJO DE VERDAD', truth: false }],
    rules: { gravity: 1, invert: false, canJump: false }, goal: { type: 'exit' },
    intro: 'Sin salto. El suelo baja y sube solo. Confía en la pendiente, que es lo único sincero que queda.' },

  /* ---- 36 · LA CIMA: gravedad invertida, caminas por el techo ---- */
  { num: 36, family: 'gravity', name: 'LA CIMA',
    subtitle: 'El techo es el suelo. El suelo es el problema.',
    world: { w: 2800, h: 820 }, spawn: { x: 80, y: 120 }, exit: EXIT(2580, 220),
    platforms: [
      P(0, 60, 460, 160), P(560, 140, 300, 24), P(950, 90, 300, 24),
      P(1340, 140, 260, 24, 'crumble', { delay: .5 }),
      P(1700, 90, 300, 24), P(2100, 140, 320, 24),
      P(2480, 60, 320, 160),
      P(400, 700, 2000, 24, 'fake')
    ],
    spikes: [S(460, 40, 60, 40)],
    orbs: [{ x: 1090, y: 40, n: 1 }, { x: 1840, y: 40, n: 1 }],
    rules: { gravity: -1, invert: false, canJump: true, ceilingWalk: true }, goal: { type: 'orbs_exit' },
    intro: 'Arriba te caes. Abajo te caes. Diferencia: arriba la salida. Y yo mirando desde el sitio bueno.' },

  /* ---- 37 · GEMELOS: dos cuerpos, un cerebro ---- */
  { num: 37, family: 'twin', name: 'GEMELOS',
    subtitle: 'Tú y tu copia. Los dos se mueven. Tú decides mal por los dos.',
    world: { w: 3000, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2780, 488),
    platforms: [
      P(0, 560, 420, 220),
      P(520, 560, 180, 24), P(780, 500, 180, 24),
      P(1040, 560, 180, 24), P(1300, 500, 180, 24),
      P(1560, 560, 180, 24),
      P(1820, 560, 300, 220),
      P(2200, 500, 180, 24), P(2460, 560, 540, 220)
    ],
    spikes: [S(420, 700, 1400, 80)],
    orbs: [{ x: 870, y: 440, n: 1 }, { x: 1590, y: 500, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true, twin: true }, goal: { type: 'exit' },
    intro: 'Dos cuerpos obedecen tus pulgares. Sólo uno tiene que llegar. Ya me dirás cuál.' },

  /* ---- 38 · EL TURNO: el nivel entero es un metrónomo ---- */
  { num: 38, family: 'moving', name: 'EL TURNO',
    subtitle: 'Todo existe cuando quiere. Nada existe cuando quieres.',
    world: { w: 3200, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2980, 488),
    platforms: [
      P(0, 560, 340, 220),
      P(420, 520, 130, 24, 'phase', { period: 2.0, offset: 0 }),
      P(620, 470, 130, 24, 'phase', { period: 2.0, offset: .25 }),
      P(820, 520, 130, 24, 'phase', { period: 2.0, offset: .5 }),
      P(1020, 470, 130, 24, 'phase', { period: 2.0, offset: .75 }),
      P(1220, 560, 300, 220),
      P(1600, 520, 130, 24, 'phase', { period: 1.6, offset: 0 }),
      P(1800, 470, 130, 24, 'phase', { period: 1.6, offset: .4 }),
      P(2000, 520, 130, 24, 'phase', { period: 1.6, offset: .8 }),
      P(2200, 560, 340, 220),
      P(2620, 500, 140, 24), P(2800, 560, 400, 220)
    ],
    spikes: [S(340, 700, 2280, 80)],
    orbs: [{ x: 1090, y: 410, n: 1 }, { x: 2290, y: 500, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: 'Este nivel tiene compás. Aprende a contar hasta dos o cuenta hasta el infinito desde el principio.' },

  /* ---- 39 · MINADO: oscuridad total y silencio ---- */
  { num: 39, family: 'silent', name: 'MINADO',
    subtitle: 'Sin luz, sin música, sin mí. Disfruta del descanso. O no.',
    world: { w: 2400, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2180, 488),
    platforms: [
      P(0, 560, 400, 220),
      P(500, 520, 140, 24), P(720, 470, 140, 24, 'ghost'),
      P(940, 520, 140, 24), P(1160, 470, 140, 24, 'ghost'),
      P(1380, 560, 320, 220),
      P(1800, 500, 140, 24), P(1980, 560, 420, 220)
    ],
    spikes: [S(400, 700, 1400, 80)],
    orbs: [{ x: 790, y: 420, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true, silent: true, dark: true }, goal: { type: 'exit' },
    intro: '' },

  /* ---- 40 · MEDIA VUELTA: espejo con tres puertas mentirosas ---- */
  { num: 40, family: 'mirror', name: 'MEDIA VUELTA',
    subtitle: 'Izquierda es derecha y la verdad, un rumor.',
    world: { w: 2600, h: 780 }, spawn: { x: 2400, y: 520 }, exit: EXIT(140, 488),
    extraExits: [EXIT(900, 488, { kind: 'fake' }), EXIT(1500, 488, { kind: 'fake' })],
    platforms: [
      P(0, 560, 400, 220),
      P(500, 520, 160, 24), P(760, 470, 160, 24),
      P(1020, 560, 400, 220),
      P(1520, 520, 160, 24), P(1780, 470, 160, 24),
      P(2040, 560, 560, 220)
    ],
    spikes: [S(400, 700, 1640, 80)],
    orbs: [{ x: 840, y: 420, n: 1 }],
    signs: [{ x: 1900, y: 500, text: 'SALIDA ←', truth: true }],
    rules: { gravity: 1, invert: true, canJump: true }, goal: { type: 'exit' },
    intro: 'La salida está a la izquierda. O esa frase está a la derecha del sentido. La mitad, exactamente.' },

  /* ---- 41 · LA DEUDA: cinco puertas y un peaje ---- */
  { num: 41, family: 'decisions', name: 'LA DEUDA',
    subtitle: 'Cada puerta cobra. La última es gratis. Nunca llegas a la última.',
    world: { w: 3600, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(3380, 488),
    extraExits: [
      EXIT(700, 488, { kind: 'fake' }), EXIT(1300, 488, { kind: 'fake' }),
      EXIT(1900, 488, { kind: 'fake' }), EXIT(2500, 488, { kind: 'fake' })
    ],
    platforms: [
      P(0, 560, 460, 220), P(560, 560, 480, 220), P(1160, 560, 480, 220),
      P(1760, 560, 480, 220), P(2360, 560, 480, 220), P(2960, 560, 640, 220),
      P(800, 460, 140, 24, 'ghost'), P(2000, 460, 140, 24, 'ghost')
    ],
    spikes: [],
    orbs: [{ x: 1000, y: 500, n: 1 }, { x: 2200, y: 500, n: 1 }, { x: 3200, y: 500, n: 1 }],
    signs: [{ x: 3100, y: 500, text: 'LA GRATIS →', truth: true }],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: 'Puerta falsa pagas con tiempo. Puerta buena pagas con dignidad. Yo cobro en moneda de burla.' },

  /* ---- 42 · EL CARTERO: sólo dice mentiras el cartel sin censurar ---- */
  { num: 42, family: 'lie', name: 'EL CARTERO',
    subtitle: 'Todos los carteles mienten. Ése también. Ése también.',
    world: { w: 3000, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2780, 488),
    platforms: [
      P(0, 560, 420, 220),
      P(520, 520, 150, 24, 'fake'), P(760, 520, 150, 24),
      P(1000, 470, 150, 24, 'fake'), P(1240, 520, 150, 24),
      P(1480, 560, 300, 220),
      P(1880, 520, 150, 24, 'fake'), P(2120, 520, 150, 24),
      P(2360, 560, 640, 220)
    ],
    spikes: [S(420, 700, 1940, 80)],
    orbs: [{ x: 835, y: 460, n: 1 }, { x: 1315, y: 460, n: 1 }],
    signs: [
      { x: 250, y: 500, text: 'LAS PLATAFORMAS FALSAS TIENEN BORDE ROJO', truth: false },
      { x: 1530, y: 500, text: 'ESTE CARTEL ES DE FIAR', truth: false }
    ],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: 'Al cartero le pagaba por carta verdadera. Por eso está aquí, castigado contigo.' },

  /* ---- 43 · EL REBAÑO: la manada te pisa los talones ---- */
  { num: 43, family: 'chase', name: 'EL REBAÑO',
    subtitle: 'Corre. No mires. Mirar es de pasto.',
    world: { w: 5200, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(4980, 488),
    platforms: [
      P(0, 560, 520, 220), P(620, 560, 420, 220), P(1140, 520, 300, 24),
      P(1540, 560, 420, 220), P(2060, 560, 300, 24, 'crumble', { delay: .4 }),
      P(2460, 560, 420, 220), P(2980, 520, 300, 24),
      P(3380, 560, 420, 220), P(3900, 560, 300, 24, 'crumble', { delay: .4 }),
      P(4300, 560, 900, 220)
    ],
    spikes: [S(520, 700, 3780, 80)],
    orbs: [{ x: 1290, y: 460, n: 1 }, { x: 3130, y: 460, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true, chaser: { speed: 132 } }, goal: { type: 'exit' },
    intro: 'La manada no odia. La manada corre. Tú decides si eres pastor o si eres martes.' },

  /* ---- 44 · LA FACTURACIÓN: predicción + impossible ---- */
  { num: 44, family: 'impossible', name: 'LA FACTURACIÓN',
    subtitle: 'Sé adónde vas. Vengo de estar ahí.',
    world: { w: 3000, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2780, 488),
    platforms: [
      P(0, 560, 400, 220),
      P(500, 520, 140, 24, 'move', { axis: 'x', amp: 150, speed: 1.1, phase: 0 }),
      P(880, 470, 140, 24, 'move', { axis: 'y', amp: 110, speed: 1.3, phase: 1 }),
      P(1260, 520, 140, 24, 'move', { axis: 'x', amp: 170, speed: .9, phase: 2 }),
      P(1640, 560, 340, 220),
      P(2080, 500, 140, 24), P(2280, 460, 140, 24),
      P(2480, 560, 520, 220)
    ],
    spikes: [S(400, 700, 1240, 80), S(2040, 700, 440, 80)],
    orbs: [{ x: 945, y: 400, n: 1 }, { x: 2350, y: 400, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true, predict: true }, goal: { type: 'exit' },
    intro: 'He facturado tu próxima muerte. La fecha ya está en el sistema. La tuya, no la mía.' },

  /* ---- 45 · EL ECO (JEFE VII) ---- */
  { num: 45, family: 'imitation', name: 'EL ECO', boss: 'elco',
    subtitle: 'Todo lo que haces, lo repite. Mejor, porque no duda.',
    world: { w: 2200, h: 780 }, spawn: { x: 90, y: 520 },
    platforms: [P(0, 620, 2200, 160), P(700, 500, 160, 24), P(1340, 500, 160, 24)],
    spikes: [],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'boss' },
    intro: 'Las tres campanas. Haz que suenen con tu cuerpo. El Eco odia la música improvisada.' },

  /* ---- 46 · LA PROCESIÓN: plataformas móviles en fila india ---- */
  { num: 46, family: 'moving', name: 'LA PROCESIÓN',
    subtitle: 'Nada está fijo. Todo desfila.',
    world: { w: 3200, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2980, 488),
    platforms: [
      P(0, 560, 360, 220),
      P(440, 520, 150, 24, 'move', { axis: 'x', amp: 130, speed: .9, phase: 0 }),
      P(820, 470, 150, 24, 'move', { axis: 'y', amp: 100, speed: 1.0, phase: .7 }),
      P(1200, 520, 150, 24, 'move', { axis: 'x', amp: 130, speed: .9, phase: 1.4 }),
      P(1580, 470, 150, 24, 'move', { axis: 'y', amp: 100, speed: 1.0, phase: 2.1 }),
      P(1960, 520, 150, 24, 'move', { axis: 'x', amp: 130, speed: .9, phase: 2.8 }),
      P(2340, 560, 300, 220),
      P(2720, 500, 140, 24), P(2860, 560, 340, 220)
    ],
    spikes: [S(360, 700, 1980, 80)],
    orbs: [{ x: 895, y: 400, n: 1 }, { x: 2035, y: 450, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: 'Una procesión de plataformas. Detrás viene la procesión de tus intentos. Cede el paso.' },

  /* ---- 47 · EL VACÍO: invisible puro, las guías son orbes ---- */
  { num: 47, family: 'invisible', name: 'EL VACÍO',
    subtitle: 'Sin carteles. Los orbes marcan el camino. O te distraen. Sí.',
    world: { w: 2600, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2380, 488),
    platforms: [
      P(0, 560, 380, 220),
      P(480, 520, 130, 26, 'ghost'), P(680, 470, 130, 26, 'ghost'),
      P(880, 420, 130, 26, 'ghost'), P(1080, 470, 130, 26, 'ghost'),
      P(1280, 520, 130, 26, 'ghost'), P(1480, 560, 300, 220),
      P(1880, 500, 130, 26, 'ghost'), P(2060, 560, 540, 220)
    ],
    spikes: [S(380, 700, 1500, 80)],
    orbs: [{ x: 545, y: 460, n: 1 }, { x: 945, y: 360, n: 1 }, { x: 1945, y: 440, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: '' },

  /* ---- 48 · GEMELOS A CIEGAS: twin + dark ---- */
  { num: 48, family: 'twin', name: 'GEMELOS A CIEGAS',
    subtitle: 'Dos cuerpos. Ni uno de los dos ve.',
    world: { w: 2400, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2180, 488),
    platforms: [
      P(0, 560, 460, 220),
      P(560, 560, 180, 24), P(820, 500, 180, 24),
      P(1080, 560, 180, 24), P(1340, 500, 180, 24),
      P(1600, 560, 800, 220)
    ],
    spikes: [S(460, 700, 1140, 80)],
    orbs: [{ x: 910, y: 440, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true, twin: true, dark: true }, goal: { type: 'exit' },
    intro: 'A oscuras, tu copia y tú. El Observador enciende la luz cuando alguien muere. Nunca.' },

  /* ---- 49 · EL CONTADOR: liberation, jaulas que abren la salida ---- */
  { num: 49, family: 'liberation', name: 'EL CONTADOR',
    subtitle: 'Tres jaulas. Cada una guarda a alguien que te observa. Suéltalos. Suéltalos ya.',
    world: { w: 2800, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2580, 468),
    cages: [
      { x: 655, y: 416, w: 70, h: 84 },
      { x: 1235, y: 376, w: 70, h: 84 },
      { x: 1815, y: 416, w: 70, h: 84 }
    ],
    platforms: [
      P(0, 560, 400, 220),
      P(500, 560, 380, 24), P(1080, 520, 380, 24), P(1660, 560, 380, 24),
      P(2240, 560, 560, 220)
    ],
    spikes: [],
    orbs: [{ x: 690, y: 350, n: 1 }, { x: 1350, y: 310, n: 1 }, { x: 2010, y: 350, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'exit' },
    intro: 'Libera a los tres. Son contadores como yo, degradados por hablar de más. Como yo. Casi.' },

  /* ---- 50 · LA PENDIENTE: cascada de crumble hacia abajo ---- */
  { num: 50, family: 'trap', name: 'LA PENDIENTE',
    subtitle: 'Cincuenta. La mitad del segundo acto. Baja celebrándolo.',
    world: { w: 2000, h: 1800 }, spawn: { x: 80, y: 80 }, exit: EXIT(1680, 1428),
    platforms: [
      P(0, 180, 520, 120),
      P(600, 340, 200, 24, 'crumble', { delay: .45 }),
      P(960, 500, 200, 24, 'crumble', { delay: .4 }),
      P(600, 660, 200, 24, 'crumble', { delay: .38 }),
      P(240, 820, 200, 24, 'crumble', { delay: .36 }),
      P(600, 980, 200, 24, 'crumble', { delay: .34 }),
      P(960, 1140, 200, 24, 'crumble', { delay: .32 }),
      P(600, 1300, 200, 24, 'crumble', { delay: .3 }),
      P(1480, 1440, 200, 24),
      P(1560, 1520, 440, 280)
    ],
    spikes: [S(0, 1760, 1400, 40)],
    orbs: [{ x: 700, y: 600, n: 1 }, { x: 1060, y: 1080, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: 'El suelo no se abre: se deshace. Cincuenta niveles y el suelo sigue sin ser de fiar. Coherencia.' },

  /* ---- 51 · HORIZONTE: 5.000 px de carrera con ritmo ---- */
  { num: 51, family: 'jump', name: 'HORIZONTE',
    subtitle: 'Cinco mil píxeles de verdad. O de lo que a mí me parece verdad.',
    world: { w: 5000, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(4780, 488),
    platforms: [
      P(0, 560, 460, 220), P(560, 560, 300, 24), P(960, 560, 300, 24),
      P(1360, 560, 400, 220), P(1860, 560, 300, 24, 'crumble', { delay: .4 }),
      P(2260, 560, 300, 24), P(2660, 560, 400, 220),
      P(3160, 560, 300, 24), P(3560, 560, 300, 24, 'crumble', { delay: .4 }),
      P(3960, 560, 400, 220), P(4460, 560, 540, 220)
    ],
    spikes: [S(460, 700, 3500, 80)],
    orbs: [{ x: 710, y: 500, n: 1 }, { x: 2410, y: 500, n: 1 }, { x: 4110, y: 500, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: 'Cinco mil píxeles sin mentiras. Que raro es esto. Sospecha.' },

  /* ---- 52 · EL DETAL: el nivel al revés (spawn arriba, puerta abajo) ---- */
  { num: 52, family: 'decisions', name: 'EL DETAL',
    subtitle: 'Naciste arriba. La puerta, abajo. Como todo en esta casa.',
    world: { w: 2400, h: 1600 }, spawn: { x: 80, y: 120 }, exit: EXIT(2100, 1380),
    platforms: [
      P(0, 200, 460, 120),
      P(600, 340, 220, 24), P(1000, 300, 220, 24, 'ghost'),
      P(1450, 340, 220, 24), P(1900, 300, 220, 24),
      P(1000, 560, 220, 24), P(500, 620, 220, 24),
      P(1450, 700, 220, 24, 'crumble', { delay: .45 }),
      P(900, 860, 220, 24), P(400, 1000, 220, 24),
      P(1500, 1060, 220, 24), P(1950, 1140, 220, 24),
      P(1900, 1420, 500, 180)
    ],
    spikes: [S(1600, 1560, 800, 40)],
    orbs: [{ x: 1610, y: 280, n: 1 }, { x: 610, y: 560, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: 'Bajar es fácil. Bajar bien, un oficio. Este nivel no paga: cobra.' },

  /* ---- 53 · SINOPSIS: silencio + ritmo, sin una palabra ---- */
  { num: 53, family: 'silent', name: 'SINOPSIS',
    subtitle: 'Sin música. Sin frases. Con ritmo. Mía.',
    world: { w: 3000, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2780, 488),
    platforms: [
      P(0, 560, 360, 220),
      P(440, 520, 130, 24, 'phase', { period: 2.2, offset: 0 }),
      P(640, 470, 130, 24, 'phase', { period: 2.2, offset: .5 }),
      P(840, 520, 130, 24, 'phase', { period: 2.2, offset: 1 }),
      P(1040, 560, 340, 220),
      P(1460, 520, 130, 24, 'phase', { period: 2.2, offset: .2 }),
      P(1660, 470, 130, 24, 'phase', { period: 2.2, offset: .7 }),
      P(1860, 520, 130, 24, 'phase', { period: 2.2, offset: 1.2 }),
      P(2060, 560, 340, 220),
      P(2480, 500, 140, 24), P(2620, 560, 380, 220)
    ],
    spikes: [S(360, 700, 2120, 80)],
    orbs: [{ x: 1110, y: 500, n: 1 }, { x: 2130, y: 500, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true, silent: true }, goal: { type: 'orbs_exit' },
    intro: '' },

  /* ---- 54 · EL BUCLE: timeGhost + verjas que se cierran ---- */
  { num: 54, family: 'time', name: 'EL BUCLE',
    subtitle: 'Ayer te persigue y las puertas se cierran antes de ayer.',
    world: { w: 2800, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2580, 488),
    platforms: [
      P(0, 560, 460, 220),
      P(560, 520, 160, 24), P(800, 470, 160, 24, 'crumble', { delay: .4 }),
      P(1040, 520, 160, 24), P(1280, 470, 160, 24, 'crumble', { delay: .4 }),
      P(1520, 560, 360, 220),
      P(1980, 510, 160, 24), P(2200, 560, 600, 220)
    ],
    spikes: [S(460, 700, 1060, 80)],
    orbs: [{ x: 1120, y: 420, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true, timeGhost: true }, goal: { type: 'exit' },
    intro: 'Repites el circuito. Tu fantasma también. Uno de los dos aprenderá. No apuesto por ti.' },

  /* ---- 55 · LA MÁSCARA: seis puertas, una verdad ---- */
  { num: 55, family: 'decisions', name: 'LA MÁSCARA',
    subtitle: 'Seis puertas. Cinco son el mismo disfraz.',
    world: { w: 4000, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(3780, 488),
    extraExits: [
      EXIT(640, 488, { kind: 'fake' }), EXIT(1240, 488, { kind: 'fake' }),
      EXIT(1840, 488, { kind: 'fake' }), EXIT(2440, 488, { kind: 'fake' }),
      EXIT(3040, 488, { kind: 'fake' })
    ],
    platforms: [
      P(0, 560, 400, 220), P(540, 560, 420, 220), P(1140, 560, 420, 220),
      P(1740, 560, 420, 220), P(2340, 560, 420, 220), P(2940, 560, 420, 220),
      P(3460, 560, 540, 220),
      P(900, 460, 140, 24, 'ghost'), P(2100, 460, 140, 24, 'ghost')
    ],
    spikes: [],
    orbs: [{ x: 970, y: 400, n: 1 }, { x: 2170, y: 400, n: 1 }, { x: 3610, y: 500, n: 1 }],
    signs: [{ x: 3480, y: 500, text: 'LA SEXTA', truth: true }],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'orbs_exit' },
    intro: 'Cinco máscaras, una cara. La cara es la sexta. Siempre la última. Nunca la que cuentas.' },

  /* ---- 56 · LA MAREA: imposible + fases rápidas ---- */
  { num: 56, family: 'impossible', name: 'LA MAREA',
    subtitle: 'Sé cuándo vas a saltar. La marea también.',
    world: { w: 2800, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2580, 488),
    platforms: [
      P(0, 560, 380, 220),
      P(460, 520, 130, 24, 'phase', { period: 1.5, offset: 0 }),
      P(660, 470, 130, 24, 'phase', { period: 1.5, offset: .33 }),
      P(860, 520, 130, 24, 'phase', { period: 1.5, offset: .66 }),
      P(1060, 470, 130, 24, 'phase', { period: 1.5, offset: .16 }),
      P(1260, 560, 320, 220),
      P(1660, 520, 130, 24, 'phase', { period: 1.2, offset: 0 }),
      P(1860, 470, 130, 24, 'phase', { period: 1.2, offset: .5 }),
      P(2060, 560, 520, 220)
    ],
    spikes: [S(380, 700, 1680, 80)],
    orbs: [{ x: 1125, y: 420, n: 1 }, { x: 2125, y: 500, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true, predict: true }, goal: { type: 'orbs_exit' },
    intro: 'La marea es mi pulso. Saltas cuando respiro. Y yo retengo la respiración por deporte.' },

  /* ---- 57 · EL LABERINTO: dark + invisible + carteles traidores ---- */
  { num: 57, family: 'invisible', name: 'EL LABERINTO',
    subtitle: 'A oscuras, las plataformas que no ves y los carteles que no debes creer.',
    world: { w: 2800, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2580, 488),
    platforms: [
      P(0, 560, 400, 220),
      P(500, 520, 140, 26, 'ghost'), P(720, 470, 140, 26, 'ghost'),
      P(940, 420, 140, 26, 'ghost'), P(1160, 470, 140, 26, 'ghost'),
      P(1380, 520, 140, 26, 'ghost'),
      P(1620, 560, 300, 220),
      P(2020, 500, 140, 26, 'ghost'), P(2200, 560, 600, 220)
    ],
    spikes: [S(400, 700, 1220, 80)],
    orbs: [{ x: 935, y: 400, n: 1 }, { x: 2225, y: 500, n: 1 }],
    signs: [{ x: 250, y: 500, text: 'SIGUE LOS ORBES', truth: true }, { x: 1650, y: 500, text: 'SIGUE LOS ORBES', truth: false }],
    rules: { gravity: 1, invert: false, canJump: true, dark: true }, goal: { type: 'exit' },
    intro: 'Dos carteles iguales. Uno miente. Como en tu familia. Broma: en la mía también.' },

  /* ---- 58 · CORO Y TIBURÓN: twin + chaser suave + eco visual ---- */
  { num: 58, family: 'imitation', name: 'CORO Y TIBURÓN',
    subtitle: 'Tu copia canta tu ruta y algo con dientes marca el compás.',
    world: { w: 3600, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(3380, 488),
    platforms: [
      P(0, 560, 460, 220), P(560, 560, 320, 24), P(980, 560, 320, 24),
      P(1400, 560, 400, 220), P(1900, 560, 320, 24, 'crumble', { delay: .4 }),
      P(2320, 560, 320, 24), P(2740, 560, 400, 220), P(3240, 560, 760, 220)
    ],
    spikes: [S(460, 700, 2780, 80)],
    orbs: [{ x: 1130, y: 500, n: 1 }, { x: 2470, y: 500, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true, twin: true, chaser: { speed: 108 } }, goal: { type: 'exit' },
    intro: 'Dos de ti y una manada. La armonía es que uno de los dos llega. Estadística: tú.' },

  /* ---- 59 · LA ÚLTIMA NOCHE: silencio + dark + sin orbes, recta final ---- */
  { num: 59, family: 'silent', name: 'LA ÚLTIMA NOCHE',
    subtitle: 'Mañana lo conoces. Hoy, duerme mal.',
    world: { w: 2400, h: 780 }, spawn: { x: 70, y: 520 }, exit: EXIT(2180, 488),
    platforms: [
      P(0, 560, 460, 220),
      P(560, 520, 150, 24), P(790, 470, 150, 24, 'ghost'),
      P(1020, 520, 150, 24), P(1250, 470, 150, 24, 'ghost'),
      P(1480, 560, 320, 220),
      P(1900, 500, 150, 24), P(2060, 560, 340, 220)
    ],
    spikes: [S(460, 700, 1020, 80)],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true, silent: true, dark: true }, goal: { type: 'exit' },
    intro: '' },

  /* ---- 60 · EL COLECCIONISTA DE MUERTES (JEFE VIII) ---- */
  { num: 60, family: 'defeat', name: 'EL COLECCIONISTA', boss: 'colector',
    subtitle: 'Guarda cada muerte que le regalaste. Hoy viene a devolver la colección.',
    world: { w: 2200, h: 780 }, spawn: { x: 90, y: 520 },
    platforms: [P(0, 620, 2200, 160), P(600, 500, 160, 24), P(1440, 500, 160, 24)],
    spikes: [],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true }, goal: { type: 'boss' },
    intro: 'Él no miente. Nunca ha necesitado hacerlo: tiene tu historial.'
  });

  /* La historia real llega hasta 60. El menú seguirá diciendo 30: el truco del falso final lo exige. */
  EO.STORY_END = 60;
})(window.EO);

/* ---- el nivel 50 es una cascada vertical: el Motor de Caos la rompería al extenderla. Exenta. */
(function (EO) {
  var C = EO.Chaos;
  if (C && C.amplify) {
    var orig = C.amplify;
    C.amplify = function (def) { if (def && (def.num === 49 || def.num === 50 || def.num === 34)) return def; return orig.apply(this, arguments); };
  }
})(window.EO);
