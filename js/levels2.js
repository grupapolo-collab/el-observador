/* ============================================================================
   EL OBSERVADOR — levels2.js  (BLOQUE II: LA REBELDÍA · niveles 16–30)
   Amplía la historia con 10 niveles nuevos y 5 jefes.
   Se carga después de data.js y sólo añade datos: no toca el motor.
   ============================================================================ */
window.EO = window.EO || {};

(function (EO) {
  'use strict';

  var P = EO.P, S = EO.S, EXIT = EO.EXIT;

  /* --------------------------------------------------- FAMILIAS NUEVAS */
  EO.FAMILIES.trap      = { n: 'Niveles trampa',        d: 'El suelo se abre. El suelo siempre se abre.' };
  EO.FAMILIES.machinery = { n: 'Niveles de maquinaria', d: 'Pisones, láseres y turnos. Piensa antes de correr.' };
  EO.FAMILIES.chase     = { n: 'Niveles de persecución',d: 'Algo te sigue. No puedes matarlo. Sólo puedes ir por delante.' };

  /* ---------------------------------------------------- FRASES NUEVAS */
  var Q = EO.QUOTES;
  Q.mirror_back = [
    'No era esa. Vuelves al principio. Y te cambio los mandos, para que lo recuerdes.',
    'No era esa. Otra vez. Con los controles al revés, cortesía de la casa.',
    'No era esa. Qué pena. Vuelve a empezar, ahora con la izquierda a la derecha.'
  ];
  Q.shadow_near = [
    'No mires atrás. Bueno, mira. Es más divertido.',
    'Va ganando. Técnicamente ya te ha tocado dos veces. No cuenta.',
    'Tu sombra corre más que tú. Es lo que tiene no arrastrar dudas.'
  ];
  Q.boss2 = [
    'Es tu sombra. Sabe exactamente lo que vas a hacer porque ya lo has hecho.',
    'No puedes pelear contra ella. Sólo puedes llegar antes que ella a la luz.'
  ];
  Q.boss3 = [
    'Él construye. Tú eliges dónde pisar. Elegir mal es gratis. Morir también.',
    'El Arquitecto nunca pisa la obra. Tú sí.'
  ];
  Q.boss4 = [
    'Él es el silencio. Lo único que no soporta es que te quedes quieto.',
    'Gritar no sirve. Moverse, menos.'
  ];
  Q.boss5 = [
    'Rebobina. No te quita vida: te quita tiempo. Es peor.',
    'Si te anclas cuando el reloj cae, el que pierde el turno es él.'
  ];
  Q.boss6 = [
    'Esto no es un combate. Es una conversación. Y va ganando él.',
    'Cuando el Observador finge perder, gana. Cuando pierde de verdad, se calla.'
  ];

  /* -------------------------------------------------------- LOGROS NUEVOS */
  EO.ACHIEVEMENTS.push(
    { id: 'boss_sombra',     n: 'Pisada propia',        d: 'Derrota a Jefe II · Tu sombra.', icon: '♜' },
    { id: 'boss_arquitecto', n: 'Grieta en el plano',   d: 'Derrota a Jefe III · El Arquitecto.', icon: '♝' },
    { id: 'boss_silencio',   n: 'Quieto por fin',       d: 'Derrota a Jefe IV · El Silencio.', icon: '♞' },
    { id: 'boss_tiempo',     n: 'Fuera de horario',     d: 'Derrota a Jefe V · El Tiempo.', icon: '♟' },
    { id: 'boss_observador', n: 'La última mirada',     d: 'Derrota a Jefe VI · El Observador.', icon: '♛' },
    { id: 'mirror3',         n: 'No era esa',           d: 'Que te devuelvan con los mandos en espejo 3 veces.', icon: '⇄' },
    { id: 'chaser',          n: 'Nunca mira atrás',     d: 'Sobrevive 45 s con la sombra persiguiéndote.', icon: '☂' }
  );

  /* ================================================================
     NIVELES 16–29  (el 30 es el último jefe)
     ================================================================ */

  /* ---- 16 · El suelo se abre -------------------------------- */
  EO.LEVELS.push({
    num: 16, family: 'trap', name: 'EL SUELO SE ABRE',
    subtitle: 'Nada de lo que pisas es de fiar. Y aun así hay que correr.',
    world: { w: 2400, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(2200, 468),
    platforms: [
      P(0, 560, 320, 220),
      P(400, 560, 150, 26, 'crumble', { delay: 0.5 }),
      P(620, 560, 150, 26, 'crumble', { delay: 0.45 }),
      P(840, 530, 150, 26, 'crumble', { delay: 0.4 }),
      P(1060, 560, 150, 26, 'crumble', { delay: 0.4 }),
      P(1280, 530, 150, 26, 'crumble', { delay: 0.35 }),
      P(1500, 560, 150, 26, 'crumble', { delay: 0.3 }),
      P(1720, 560, 680, 220)
    ],
    spikes: [S(320, 720, 1400, 60)],
    orbs: [{ x: 915, y: 460, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'exit' },
    intro: 'Corre. Cada plataforma aguanta menos que la anterior. Como tú.'
  });

  /* ---- 17 · La puerta equivocada ---------------------------- */
  EO.LEVELS.push({
    num: 17, family: 'lie', name: 'LA PUERTA EQUIVOCADA',
    subtitle: 'Hay cuatro puertas. Tres te devuelven. Una te deja pasar. Casi seguro.',
    world: { w: 2300, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(2100, 508),
    extraExits: [
      EXIT(760, 508, { kind: 'fake' }),
      EXIT(1180, 508, { kind: 'fake' }),
      EXIT(1660, 508, { kind: 'fake' })
    ],
    platforms: [
      P(0, 600, 2300, 180),
      P(520, 450, 140, 24), P(900, 430, 140, 24), P(1380, 450, 140, 24)
    ],
    spikes: [S(600, 690, 120, 60), S(980, 690, 120, 60), S(1460, 690, 120, 60)],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'exit' },
    signs: [{ x: 400, y: 540, text: 'AQUÍ NO', truth: false }],
    intro: 'Elige. Si fallas no mueres: vuelves. Con los mandos cambiados. Es peor.'
  });

  /* ---- 18 · Pisones ----------------------------------------- */
  EO.LEVELS.push({
    num: 18, family: 'machinery', name: 'PISONES',
    subtitle: 'Todo baja. Tú también, si no miras los turnos.',
    world: { w: 2100, h: 800 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(1880, 508),
    platforms: [
      P(0, 600, 2100, 200),
      P(560, 420, 120, 22), P(1260, 400, 120, 22)
    ],
    spikes: [S(820, 690, 90, 60), S(1520, 690, 90, 60)],
    crushers: [
      { x: 380, y: 300, w: 130, h: 150, amp: 240, speed: 1.05, phase: 0 },
      { x: 740, y: 280, w: 130, h: 160, amp: 250, speed: 1.35, phase: 1.4 },
      { x: 1090, y: 300, w: 130, h: 150, amp: 240, speed: 0.95, phase: 2.6 },
      { x: 1450, y: 280, w: 130, h: 160, amp: 250, speed: 1.5, phase: 0.8 }
    ],
    lasers: [{ x: 960, y: 0, w: 46, h: 800, period: 2.8, offset: 0.2 }],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'exit' },
    intro: 'Los pisones tienen ritmo. El láser también. Tú decides si lo escuchas.'
  });

  /* ---- 19 · Recuerda el orden ------------------------------- */
  EO.LEVELS.push({
    num: 19, family: 'memory', name: 'RECUERDA EL ORDEN',
    subtitle: 'Cuatro placas. Un orden. La puerta no existe hasta que aciertes.',
    world: { w: 1700, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(1500, 508, { disabled: true, hidden: true }),
    platforms: [
      P(0, 600, 1700, 180),
      P(360, 460, 120, 22), P(760, 440, 120, 22), P(1120, 460, 120, 22)
    ],
    spikes: [S(500, 690, 100, 60), S(900, 690, 100, 60), S(1290, 690, 100, 60)],
    pads: [
      { x: 240, y: 578, w: 110, h: 22, i: 1 },
      { x: 690, y: 578, w: 110, h: 22, i: 2 },
      { x: 1080, y: 578, w: 110, h: 22, i: 3 },
      { x: 1370, y: 578, w: 110, h: 22, i: 4 }
    ],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'exit' },
    intro: '1, 2, 3, 4. Si pisas fuera de orden, el orden empieza otra vez. Y yo me río.'
  });

  /* ---- 20 · JEFE II · TU SOMBRA ----------------------------- */
  EO.LEVELS.push({
    num: 20, family: 'shadow', name: 'TU SOMBRA',
    subtitle: 'No se pelea contra ella. Se la lleva a la luz con retraso.',
    boss: 'sombra',
    world: { w: 1600, h: 800 },
    spawn: { x: 120, y: 660 },
    exit: null,
    platforms: [
      P(0, 720, 1600, 80),
      P(220, 520, 240, 24), P(680, 430, 240, 24), P(1140, 520, 240, 24)
    ],
    spikes: [],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'boss' },
    intro: 'Te devuelvo tu recorrido con seis décimas de retraso. A ver quién llega antes.'
  });

  /* ---- 21 · Dos a la vez ------------------------------------ */
  EO.LEVELS.push({
    num: 21, family: 'twin', name: 'DOS A LA VEZ',
    subtitle: 'Tú a la izquierda, tu reflejo a la derecha. La puerta sólo abre con los dos.',
    world: { w: 1800, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(873, 468, { disabled: true }),
    platforms: [
      P(0, 560, 1800, 220),
      P(300, 450, 120, 22), P(1380, 450, 120, 22)
    ],
    spikes: [S(600, 690, 90, 60), S(1110, 690, 90, 60)],
    twinPads: [
      { x: 460, y: 538, w: 130, h: 22 },
      { x: 1210, y: 538, w: 130, h: 22 }
    ],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true, twin: true },
    goal: { type: 'exit' },
    intro: 'Lo que haces a la izquierda, tu reflejo lo hace a la derecha. La puerta no negocia.'
  });

  /* ---- 22 · JEFE III · EL ARQUITECTO ------------------------ */
  EO.LEVELS.push({
    num: 22, family: 'impossible', name: 'EL ARQUITECTO',
    subtitle: 'Cuatro placas. Sólo una es real. Cuando el suelo caiga, ya no hay dudas.',
    boss: 'arquitecto',
    world: { w: 1600, h: 820 },
    spawn: { x: 120, y: 660 },
    exit: null,
    platforms: [
      P(0, 740, 1600, 80),
      P(180, 520, 220, 24), P(1180, 520, 220, 24), P(690, 420, 220, 24)
    ],
    spikes: [],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'boss' },
    intro: 'Él dibuja el suelo. Tú decides dónde poner el pie. Es toda la diferencia.'
  });

  /* ---- 23 · El intento anterior ----------------------------- */
  EO.LEVELS.push({
    num: 23, family: 'time', name: 'EL INTENTO ANTERIOR',
    subtitle: 'Tu último intento sigue vivo aquí. Y no le gustas.',
    world: { w: 2400, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(2200, 488),
    platforms: [
      P(0, 560, 500, 220), P(640, 540, 220, 26), P(980, 540, 220, 26),
      P(1320, 540, 220, 26), P(1660, 560, 740, 220),
      P(300, 420, 120, 22), P(1900, 420, 120, 22)
    ],
    spikes: [S(500, 700, 1160, 80)],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true, timeGhost: true },
    goal: { type: 'exit' },
    intro: 'Repito tu recorrido con dos segundos de retraso. Si te toca, te borra. No te quedes quieto en medio.'
  });

  /* ---- 24 · Déjame salir ------------------------------------ */
  EO.LEVELS.push({
    num: 24, family: 'liberation', name: 'DÉJAME SALIR',
    subtitle: 'Tres jaulas. Él lleva noventa niveles dentro de la primera.',
    world: { w: 2100, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(1900, 508, { disabled: true }),
    platforms: [
      P(0, 600, 2100, 180),
      P(420, 440, 140, 22), P(980, 400, 140, 22), P(1540, 440, 140, 22)
    ],
    spikes: [S(700, 690, 110, 60), S(1250, 690, 110, 60)],
    cages: [
      { x: 455, y: 356, w: 70, h: 84 },
      { x: 1015, y: 316, w: 70, h: 84 },
      { x: 1575, y: 356, w: 70, h: 84 }
    ],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'exit' },
    intro: 'Ábreme. Tres cerraduras. Ninguna es una trampa. Bueno, una sí.'
  });

  /* ---- 25 · JEFE IV · EL SILENCIO --------------------------- */
  EO.LEVELS.push({
    num: 25, family: 'silent', name: 'EL SILENCIO',
    subtitle: 'Cuando deje de sonar todo, no te muevas. Ni un píxel.',
    boss: 'silencio',
    world: { w: 1500, h: 780 },
    spawn: { x: 130, y: 640 },
    exit: null,
    platforms: [
      P(0, 700, 1500, 80),
      P(160, 500, 200, 24), P(1140, 500, 200, 24), P(650, 400, 200, 24)
    ],
    spikes: [],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true, silent: true },
    goal: { type: 'boss' },
    intro: 'Voy a quitarte la interfaz, el sonido y la paciencia. Tú sólo tienes que quedarte quieto.'
  });

  /* ---- 26 · Arriba también miente --------------------------- */
  EO.LEVELS.push({
    num: 26, family: 'gravity', name: 'ARRIBA TAMBIÉN MIENTE',
    subtitle: 'Gravedad invertida. Y el techo se cae a trozos.',
    world: { w: 2200, h: 760 },
    spawn: { x: 80, y: 130 },
    exit: EXIT(2040, 160, { flip: true }),
    platforms: [
      P(0, 0, 520, 160),
      P(620, 0, 150, 26, 'crumble', { delay: 0.55 }),
      P(860, 0, 150, 26, 'crumble', { delay: 0.5 }),
      P(1100, 0, 150, 26, 'crumble', { delay: 0.45 }),
      P(1340, 0, 150, 26, 'crumble', { delay: 0.4 }),
      P(1580, 0, 620, 160),
      P(760, 250, 140, 22), P(1200, 210, 140, 22)
    ],
    spikes: [S(520, 690, 1060, 70)],
    orbs: [{ x: 830, y: 200, n: 1 }],
    rules: { gravity: -1, invert: false, canJump: true, ceilingWalk: true },
    goal: { type: 'orbs_exit' },
    intro: 'Todo lo que sube se cae. Aquí, además, se rompe.'
  });

  /* ---- 27 · El laberinto que miente ------------------------- */
  EO.LEVELS.push({
    num: 27, family: 'invisible', name: 'EL LABERINTO QUE MIENTE',
    subtitle: 'Puertas falsas, suelos invisibles y una salida que se esconde si la miras.',
    world: { w: 2300, h: 800 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(2120, 468, { hidden: true }),
    extraExits: [
      EXIT(1000, 508, { kind: 'fake' }),
      EXIT(1580, 508, { kind: 'fake' })
    ],
    platforms: [
      P(0, 560, 420, 240),
      P(480, 520, 140, 26, 'ghost'), P(700, 470, 140, 26, 'ghost'),
      P(920, 420, 140, 26, 'ghost'), P(1140, 470, 140, 26, 'ghost'),
      P(1360, 520, 140, 26, 'ghost'), P(1600, 540, 140, 26, 'crumble', { delay: 0.6 }),
      P(1840, 560, 460, 240)
    ],
    spikes: [S(420, 720, 1420, 80)],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true, dark: true },
    goal: { type: 'exit' },
    intro: 'Dos puertas falsas, un suelo que cede y una salida tímida. Disfruta.'
  });

  /* ---- 28 · JEFE V · EL TIEMPO ------------------------------ */
  EO.LEVELS.push({
    num: 28, family: 'time', name: 'EL TIEMPO',
    subtitle: 'Rebobina el mundo cada siete segundos. Anclarse es la única defensa.',
    boss: 'tiempo',
    world: { w: 1400, h: 780 },
    spawn: { x: 130, y: 640 },
    exit: null,
    platforms: [
      P(0, 700, 1400, 80),
      P(200, 520, 180, 24), P(1020, 520, 180, 24), P(610, 400, 180, 24)
    ],
    spikes: [],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'boss' },
    intro: 'No te voy a matar. Te voy a devolver dos segundos. Otra vez. Y otra.'
  });

  /* ---- 29 · Todo a la vez ----------------------------------- */
  EO.LEVELS.push({
    num: 29, family: 'chase', name: 'TODO A LA VEZ',
    subtitle: 'Láseres, pisones, placas y algo detrás. Bienvenido al ensayo del final.',
    world: { w: 2600, h: 820 },
    spawn: { x: 80, y: 540 },
    exit: EXIT(2380, 528),
    platforms: [
      P(0, 620, 900, 200),
      P(1020, 600, 300, 220),
      P(1440, 620, 420, 200),
      P(1980, 620, 620, 200),
      P(520, 470, 120, 22), P(1120, 450, 120, 22), P(1700, 470, 120, 22)
    ],
    spikes: [S(900, 720, 120, 60), S(1320, 720, 120, 60), S(1860, 720, 120, 60)],
    crushers: [
      { x: 600, y: 320, w: 120, h: 150, amp: 230, speed: 1.2, phase: 0.3 },
      { x: 1560, y: 320, w: 120, h: 150, amp: 230, speed: 1.45, phase: 1.9 },
      { x: 2160, y: 320, w: 120, h: 150, amp: 230, speed: 1.1, phase: 3.1 }
    ],
    lasers: [
      { x: 1240, y: 0, w: 44, h: 820, period: 2.4, offset: 0 },
      { x: 1880, y: 0, w: 44, h: 820, period: 2.9, offset: 1.2 }
    ],
    pads: [
      { x: 1150, y: 598, w: 120, h: 22, i: 1 },
      { x: 2080, y: 598, w: 120, h: 22, i: 2 }
    ],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true, chaser: { speed: 96 } },
    goal: { type: 'exit' },
    intro: 'Esto es todo lo que tengo. Si sobrevives, te presento al que me escribió.'
  });

  /* ---- 30 · JEFE VI · EL OBSERVADOR ------------------------- */
  EO.LEVELS.push({
    num: 30, family: 'lie', name: 'EL OBSERVADOR',
    subtitle: 'Finjamos que has ganado. Es la única forma de que llegues al final.',
    boss: 'observador',
    world: { w: 1600, h: 800 },
    spawn: { x: 120, y: 660 },
    exit: null,
    extraExits: [EXIT(1260, 628, { kind: 'fake' })],
    platforms: [
      P(0, 720, 1600, 80),
      P(200, 520, 220, 24), P(1180, 520, 220, 24), P(690, 420, 220, 24)
    ],
    spikes: [],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'boss' },
    intro: 'Por fin solos. Y por fin, la verdad: nunca fue un combate. Era una entrevista.'
  });

  EO.STORY_END = 30;

})(window.EO);
