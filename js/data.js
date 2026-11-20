/* ============================================================================
   EL OBSERVADOR — data.js
   Datos del juego: temas cromáticos, frases del Observador, logros y los
   primeros 15 niveles (hechos a mano). Todo es data-driven: para añadir un
   nivel nuevo basta con añadir un objeto a EO.LEVELS o usar EO.LevelBuilder.
   ============================================================================ */
window.EO = window.EO || {};

(function (EO) {
  'use strict';

  EO.VW = 1280;   // resolución virtual (se escala sin deformar)
  EO.VH = 720;

  /* ---------------------------------------------------------------- TEMAS */
  EO.THEMES = {
    1: { name: 'LA INICIACIÓN',  cls: 'theme-b1', glow: '#7c6bff', bg: ['#050a24', '#0d1640', '#2a1a63'], accent: '#8b5cf6' },
    2: { name: 'LA DESCONFIANZA', cls: 'theme-b2', glow: '#e05cff', bg: ['#100621', '#260d40', '#4d1660'], accent: '#e05cff' },
    3: { name: 'LA MANIPULACIÓN', cls: 'theme-b3', glow: '#ff4d88', bg: ['#18030c', '#36081f', '#6b1038'], accent: '#ff4d88' },
    4: { name: 'LA PARANOIA',    cls: 'theme-b4', glow: '#ff5d3a', bg: ['#150303', '#310606', '#5e0c0c'], accent: '#ff5d3a' },
    5: { name: 'LA RUPTURA',     cls: 'theme-b5', glow: '#ffb020', bg: ['#171003', '#332403', '#5c4205'], accent: '#ffb020' },
    6: { name: 'LA CONCIENCIA',  cls: 'theme-b6', glow: '#2ee6d6', bg: ['#03141a', '#06272e', '#0b4650'], accent: '#2ee6d6' }
  };
  EO.themeFor = function (num) {
    return EO.THEMES[Math.min(6, Math.floor((num - 1) / 15) + 1)];
  };

  /* --------------------------------------------------------- FAMILIAS (20) */
  EO.FAMILIES = {
    invisible:  { n: 'Niveles invisibles',      d: 'Plataformas que no ves. Las pistas están en las sombras.' },
    impossible: { n: 'Niveles imposibles',      d: 'Geometría que desafía la lógica. Siempre hay una solución.' },
    mirror:     { n: 'Niveles espejo',          d: 'Controles invertidos. El reflejo miente.' },
    lie:        { n: 'Niveles de mentira',      d: 'La salida es falsa. El cartel señala el peligro.' },
    time:       { n: 'Niveles temporales',      d: 'Vives con tus acciones pasadas.' },
    gravity:    { n: 'Niveles de gravedad',     d: 'El suelo puede estar donde tú no miras.' },
    decisions:  { n: 'Niveles de decisiones',   d: 'Varias puertas. No todas son puertas.' },
    silent:     { n: 'Niveles silenciosos',     d: 'Sin música, sin mensajes, sin ayuda.' },
    nojump:     { n: 'Niveles sin salto',       d: 'Salta y descubrirás cuánto aprecias saltar.' },
    jump:       { n: 'Niveles de salto obligatorio', d: 'El suelo no es una opción.' },
    twin:       { n: 'Niveles de dos personajes',d: 'Tú y otra cosa. Los dos a la vez.' },
    shadow:     { n: 'Niveles de sombra',       d: 'Tu sombra hace lo que tú hiciste.' },
    moving:     { n: 'Niveles de escenario móvil', d: 'El mundo se mueve. Tú no.' },
    gaze:       { n: 'Niveles de mirada',       d: 'Si miras hacia otro lado, cambia.' },
    inaction:   { n: 'Niveles de inacción',     d: 'El objetivo es no hacer absolutamente nada.' },
    defeat:     { n: 'Niveles de derrota',      d: 'Ganar aquí significa perder.' },
    ignore:     { n: 'Niveles de ignorancia',   d: 'La salida aparece si desobedeces.' },
    memory:     { n: 'Niveles de memoria',      d: 'Recuerda la secuencia. Ahora cambia.' },
    imitation:  { n: 'Niveles de imitación',    d: 'Alguien intenta jugar como tú.' },
    liberation: { n: 'Niveles de liberación',   d: 'El Observador te pide que lo ayudes a escapar.' }
  };

  /* ------------------------------------------------- FRASES DEL OBSERVADOR
     Se eligen por contexto y se filtran por personalidad. Las etiquetas
     permiten escribir cientos de líneas sin tocar el motor.               */
  EO.QUOTES = {
    intro: [
      'Bienvenido. Llevo esperándote desde antes de que existieras.',
      'Ah, ya estás aquí. Qué puntualidad tan innecesaria.',
      'No todos los niveles quieren que ganes. Este sí. Creo.'
    ],
    start: [
      'Adelante. Las reglas son sencillas. Por eso las cambio.',
      'Voy a observarte. No es nada personal. Es mi único trabajo.',
      'Esto es fácil. Lo digo siempre y a veces hasta es verdad.'
    ],
    idle: [
      '¿Necesitas que te reserve una habitación?',
      'La paciencia es una virtud. Esto ya es otra cosa.',
      'Si esperas lo suficiente, quizá el nivel se complete solo. No.',
      'Me estás poniendo nervioso. Y yo no tengo nervios.',
      '¿Estás meditando o te has roto?'
    ],
    death_absurd: [
      'No voy a preguntar.',
      'Eso fue arte contemporáneo.',
      'He visto tostadoras tomar mejores decisiones.',
      '¿Estabas probando la gravedad? Confirmado: funciona.',
      'Anotado: los pinchos siguen siendo pinchos.'
    ],
    death_five: [
      'Voy a empezar a hacer apuestas sobre tu próxima muerte. Van tres a uno.',
      'Quinta vez. Ya estamos creando un vínculo.',
      'Me estás haciendo rico y no cobro nada.'
    ],
    death_near_win: [
      'La puerta estaba literalmente ahí.',
      'No quiero arruinar el momento, pero...',
      'Qué manera tan elegante de fracasar.',
      'Un centímetro. Qué número tan cruel.'
    ],
    win: [
      'Qué desagradable. Estás aprendiendo.',
      'Voy a fingir que fue suerte.',
      'No estaba preparado para esto. Nadie lo estaba.',
      'Has ganado. Disfruta el momento antes de que lo estropee.'
    ],
    win_flawless: [
      'Sin morir. Eso no estaba en mis cálculos.',
      'Voy a fingir que fue suerte. Otra vez.',
      'Te has superado. Me disgusta profundamente.'
    ],
    tricked: [
      'Eso no estaba en mis cálculos.',
      'Retiro lo dicho. Por ahora.',
      'No vuelvas a hacer eso. Me gustó.',
      'Me has engañado. Eso merece un nivel peor.'
    ],
    help_offer: [
      'Tengo una pista magnífica. Pero no sé si mereces escucharla.',
      'Esta vez sí te voy a ayudar. Lo prometo.',
      'Confía en mí. Bueno, eso sonó mal.',
      'Puedes ganar sin moverte. Creo.',
      'Voy a decirte la verdad. Una sola vez. Aprovecha.'
    ],
    help_given: [
      'Ahí lo tienes. Úsalo mal, como siempre.',
      'No digas que nunca hice nada por ti.',
      'Toma sabiduría. No la derrames.'
    ],
    help_lie: [
      'Hacia allí. Seguro. Casi seguro.',
      'Ese es el camino. Lo he visto en un sueño.',
      'No hagas caso a lo que voy a decirte.',
      'Esa plataforma es sólida. Físicamente. Espiritualmente, no.'
    ],
    no_help: [
      'Ignoras mi ayuda. Me ofende. También me alegra.',
      'Bien. Sufre en silencio. Es más elegante.',
      'No confías en mí. Qué persona tan razonable.'
    ],
    boss: [
      'Él lo sabe todo. O eso dice. No le creas.',
      'Yo no debería estar aquí. Él me da miedo.',
      'No lo mires a los ojos. Bueno, no tiene.'
    ],
    boss_fear: [
      'No deberías haber llegado hasta aquí.',
      'Yo... yo no controlo esto. Él sí.',
      'Escúchame una vez: no te quedes quieto.'
    ],
    boss_win: [
      'Imposible. Ha perdido. Ha perdido de verdad.',
      'Mientes. Eso no ha pasado.',
      'Vale. Vale. Esta vez te lo has ganado.'
    ],
    secret: [
      'Esa habitación no existe. No la mires.',
      'Has encontrado algo que no había puesto aquí. Preocupante.',
      'No estaba en el mapa. Y el mapa era mío.'
    ]
  };

  /* ------------------------------------------------------------- LOGROS */
  EO.ACHIEVEMENTS = [
    { id: 'first',     n: 'Primer contacto',        d: 'Supera el nivel 1.', icon: '◈' },
    { id: 'flawless',  n: 'Esto no estaba previsto', d: 'Supera un nivel sin morir.', icon: '✦' },
    { id: 'deaths10',  n: 'Diez veces el mismo sitio', d: 'Muere 10 veces en un mismo nivel.', icon: '☠' },
    { id: 'nohelp',    n: 'No confío ni en mi sombra', d: 'Supera un nivel sin usar ninguna ayuda.', icon: '◐' },
    { id: 'trickster', n: 'Sabotaje',               d: 'Engaña al Observador 5 veces.', icon: '✧' },
    { id: 'boss1',     n: 'El que no lo sabía todo',d: 'Derrota al Jefe I.', icon: '♛' },
    { id: 'idle',      n: 'Estatua',                d: 'Quédate quieto 20 segundos.', icon: '◉' },
    { id: 's5',        n: 'Cinco de cinco',         d: 'Llega al nivel 5.', icon: '❖' },
    { id: 's10',       n: 'La mitad del abismo',    d: 'Llega al nivel 10.', icon: '❖' },
    { id: 'descenso',  n: 'El Descenso',            d: 'Juega el modo El Descenso.', icon: '▼' },
    { id: 'truth',     n: 'La Verdad',              d: 'Completa la historia.', icon: '◍' }
  ];

  /* -------------------------------------------------- AYUDAS (5 tipos) */
  EO.HELP_TYPES = {
    sincera:     'Ayuda sincera',
    incompleta:  'Ayuda incompleta',
    enganosa:    'Ayuda engañosa',
    invertida:   'Ayuda invertida',
    desesperada: 'Ayuda desesperada'
  };

  /* --------------------------------------------------------- CONSTRUCTORES */
  var P = EO.P = function (x, y, w, h, type, extra) {
    var o = { x: x, y: y, w: w, h: h, type: type || 'solid' };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  };
  var S = EO.S = function (x, y, w, h) { return { x: x, y: y, w: w, h: h }; };
  var EXIT = EO.EXIT = function (x, y, extra) {
    var o = { x: x, y: y, w: 54, h: 92, kind: 'real' };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  };

  /* ============================================================
     NIVELES 1–15 · hechos a mano (la columna vertebral narrativa)
     ============================================================ */
  EO.LEVELS = [];

  /* ---- 1 · Bienvenido ---------------------------------------- */
  EO.LEVELS.push({
    num: 1, family: 'lie', name: 'BIENVENIDO',
    subtitle: 'Salta. Es lo único que te voy a decir sin mentir.',
    world: { w: 2280, h: 760 },
    spawn: { x: 80, y: 540 },
    exit: EXIT(2080, 508),
    platforms: [
      P(0, 600, 700, 160), P(780, 600, 420, 160),
      P(1290, 560, 400, 200), P(1770, 600, 500, 160),
      P(980, 470, 130, 24, 'solid')
    ],
    spikes: [],
    orbs: [{ x: 1040, y: 430, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'orbs_exit' },
    signs: [{ x: 300, y: 520, text: 'SALIDA →', truth: true }],
    intro: 'Camina, salta, llega a la puerta. Ni yo puedo estropear esto. Aún no.'
  });

  /* ---- 2 · El suelo miente ----------------------------------- */
  EO.LEVELS.push({
    num: 2, family: 'lie', name: 'EL SUELO MIENTE',
    subtitle: 'No todas las plataformas que ves están de tu lado.',
    world: { w: 2000, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(1780, 488),
    platforms: [
      P(0, 560, 520, 220),
      P(660, 540, 150, 24), P(880, 540, 150, 24, 'fake'),
      P(1040, 560, 160, 24), P(1330, 560, 240, 220),
      P(1640, 560, 400, 220),
      P(400, 430, 120, 24, 'solid')
    ],
    spikes: [S(520, 700, 820, 80)],
    orbs: [{ x: 430, y: 400, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'orbs_exit' },
    signs: [{ x: 240, y: 520, text: 'TODAS SÓLIDAS', truth: false }],
    intro: 'Ese cartel es de fiar. Como yo.'
  });

  /* ---- 3 · No mires abajo ------------------------------------ */
  EO.LEVELS.push({
    num: 3, family: 'invisible', name: 'NO MIRES ABAJO',
    subtitle: 'Hay plataformas. No las vas a ver. Ese es el juego.',
    world: { w: 2100, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(1860, 468),
    platforms: [
      P(0, 560, 380, 220),
      P(440, 520, 130, 26, 'ghost'), P(610, 470, 130, 26, 'ghost'),
      P(790, 420, 130, 26, 'ghost'), P(960, 360, 130, 26, 'ghost'),
      P(1130, 420, 130, 26, 'ghost'), P(1300, 470, 130, 26, 'ghost'),
      P(1480, 520, 150, 26, 'ghost'),
      P(1700, 560, 400, 220)
    ],
    spikes: [S(380, 700, 1320, 80)],
    orbs: [{ x: 1025, y: 320, n: 1 }],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'orbs_exit' },
    intro: 'No hay nada ahí. Confía en el vacío.'
  });

  /* ---- 4 · Dos puertas --------------------------------------- */
  EO.LEVELS.push({
    num: 4, family: 'decisions', name: 'DOS PUERTAS',
    subtitle: 'Una te lleva al siguiente nivel. La otra, a una conversación.',
    world: { w: 1900, h: 760 },
    spawn: { x: 70, y: 540 },
    exit: EXIT(1620, 508),
    extraExits: [EXIT(1400, 508, { kind: 'fake' })],
    platforms: [
      P(0, 600, 1900, 160),
      P(560, 480, 150, 26), P(860, 430, 150, 26), P(1160, 480, 150, 26)
    ],
    spikes: [S(480, 690, 120, 60), S(760, 690, 120, 60), S(1060, 690, 120, 60)],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'exit' },
    signs: [{ x: 1300, y: 560, text: 'PUERTA BUENA ↗', truth: false }],
    intro: 'A la derecha o a la izquierda. No pienso decirte cuál.'
  });

  /* ---- 5 · Espejo -------------------------------------------- */
  EO.LEVELS.push({
    num: 5, family: 'mirror', name: 'ESPEJO',
    subtitle: 'Izquierda es derecha. Lo siento. No lo siento.',
    world: { w: 2000, h: 760 },
    spawn: { x: 1800, y: 540 },
    exit: EXIT(120, 508),
    platforms: [
      P(0, 600, 500, 160), P(600, 560, 300, 200), P(1000, 600, 300, 160),
      P(1400, 540, 600, 220),
      P(700, 420, 140, 24), P(1100, 400, 140, 24)
    ],
    spikes: [S(500, 690, 100, 60), S(900, 690, 100, 60)],
    orbs: [{ x: 770, y: 380, n: 1 }],
    rules: { gravity: 1, invert: true, canJump: true },
    goal: { type: 'orbs_exit' },
    intro: 'Vas a odiar los controles. Es parte del encanto.'
  });

  /* ---- 6 · Predicción ---------------------------------------- */
  EO.LEVELS.push({
    num: 6, family: 'impossible', name: 'PREDICCIÓN',
    subtitle: 'Sé dónde vas a caer. Lo sé antes que tú.',
    world: { w: 2200, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(2000, 488),
    platforms: [
      P(0, 560, 460, 220), P(620, 520, 200, 200), P(960, 470, 200, 200),
      P(1300, 520, 200, 200), P(1640, 560, 560, 220)
    ],
    spikes: [S(460, 700, 1180, 80)],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true, predict: true },
    goal: { type: 'exit' },
    intro: 'Salta tranquilo. Si acierto, no es culpa mía. Bueno, sí.'
  });

  /* ---- 7 · La puerta que se mueve ---------------------------- */
  EO.LEVELS.push({
    num: 7, family: 'moving', name: 'LA PUERTA QUE SE MUEVE',
    subtitle: 'La salida no se queda quieta. Tú tampoco deberías.',
    world: { w: 2200, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(1700, 200, { mover: { axis: 'y', amp: 210, speed: 0.9, phase: 0 } }),
    platforms: [
      P(0, 560, 420, 220),
      P(520, 520, 150, 24, 'move', { axis: 'x', amp: 120, speed: 0.8, phase: 0 }),
      P(820, 470, 150, 24, 'move', { axis: 'y', amp: 90, speed: 1.1, phase: 1 }),
      P(1120, 520, 150, 24, 'move', { axis: 'x', amp: 140, speed: 0.7, phase: 2 }),
      P(1420, 470, 150, 24, 'move', { axis: 'y', amp: 110, speed: 1.3, phase: 0.5 }),
      P(1650, 560, 550, 220)
    ],
    spikes: [S(420, 700, 1230, 80)],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'exit' },
    intro: 'La puerta está arriba. Luego abajo. Luego donde le apetezca.'
  });

  /* ---- 8 · Gravedad ------------------------------------------ */
  EO.LEVELS.push({
    num: 8, family: 'gravity', name: 'ARRIBA ES ABAJO',
    subtitle: 'El techo es el suelo. No preguntes.',
    world: { w: 2100, h: 760 },
    spawn: { x: 80, y: 130 },
    exit: EXIT(1900, 160, { flip: true }),
    platforms: [
      P(0, 0, 700, 160), P(800, 0, 420, 160), P(1320, 0, 780, 160),
      P(900, 260, 140, 24), P(1150, 210, 140, 24)
    ],
    spikes: [S(620, 690, 1480, 70)],
    orbs: [{ x: 970, y: 196, n: 1 }],
    rules: { gravity: -1, invert: false, canJump: true, ceilingWalk: true },
    goal: { type: 'orbs_exit' },
    intro: 'He invertido la gravedad. De nada.'
  });

  /* ---- 9 · Cuenta atrás -------------------------------------- */
  EO.LEVELS.push({
    num: 9, family: 'gaze', name: 'CUENTA ATRÁS',
    subtitle: 'Las plataformas existen por turnos. Tú también.',
    world: { w: 2300, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(2080, 488),
    platforms: [
      P(0, 560, 400, 220),
      P(500, 520, 140, 24, 'phase', { period: 2.4, offset: 0 }),
      P(720, 470, 140, 24, 'phase', { period: 2.4, offset: 0.6 }),
      P(940, 420, 140, 24, 'phase', { period: 2.4, offset: 1.2 }),
      P(1160, 470, 140, 24, 'phase', { period: 2.4, offset: 1.8 }),
      P(1400, 520, 140, 24, 'solid'),
      P(1640, 560, 660, 220)
    ],
    spikes: [S(400, 700, 1240, 80)],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'exit' },
    intro: 'Cuenta hasta tres. O no. Da igual, no van a estar.'
  });

  /* ---- 10 · No hagas nada ------------------------------------ */
  EO.LEVELS.push({
    num: 10, family: 'inaction', name: 'NO HAGAS NADA',
    subtitle: 'Objetivo: permanecer quieto 8 segundos. Sin trampas. Casi.',
    world: { w: 1600, h: 760 },
    spawn: { x: 720, y: 520 },
    exit: EXIT(760, 470, { disabled: true }),
    platforms: [P(0, 560, 1600, 220), P(300, 420, 120, 22), P(1180, 420, 120, 22)],
    spikes: [],
    blades: [
      { x: 0, y: 424, r: 28, axis: 'x', amp: 690, speed: 1.15, phase: 0 },
      { x: 0, y: 478, r: 20, axis: 'x', amp: 690, speed: 1.75, phase: 2 }
    ],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'wait', time: 8 },
    intro: 'No te muevas. Ni un píxel. Bueno, respira si eso.'
  });

  /* ---- 11 · El precio de ganar ------------------------------- */
  EO.LEVELS.push({
    num: 11, family: 'defeat', name: 'EL PRECIO DE GANAR',
    subtitle: 'La puerta no se abre. La puerta cobra.',
    world: { w: 1900, h: 760 },
    spawn: { x: 90, y: 540 },
    exit: EXIT(1720, 508, { disabled: true }),
    altars: [{ x: 880, y: 520, w: 90, h: 80 }],
    platforms: [
      P(0, 600, 700, 160), P(760, 600, 320, 160), P(1160, 600, 740, 160),
      P(500, 440, 120, 22), P(1300, 440, 120, 22)
    ],
    spikes: [S(700, 690, 60, 60), S(1080, 690, 80, 60), S(820, 380, 160, 24, 'fake')],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'altar' },
    signs: [{ x: 1660, y: 560, text: 'NO HAS HECHO SUFICIENTE', truth: true }],
    intro: 'Si llegas a esa puerta, te regalo algo. Algo horrible.'
  });

  /* ---- 12 · Escher ------------------------------------------- */
  EO.LEVELS.push({
    num: 12, family: 'impossible', name: 'LA HABITACIÓN DE ESCHER',
    subtitle: 'Sube. Y sube. Y vuelve a subir. Hasta que no.',
    world: { w: 1700, h: 1300 },
    spawn: { x: 90, y: 1120 },
    exit: EXIT(1400, 180),
    platforms: [
      P(0, 1180, 600, 120),
      P(700, 1120, 240, 24), P(1020, 1060, 240, 24),
      P(700, 1000, 240, 24), P(380, 940, 240, 24),
      P(700, 880, 240, 24), P(1020, 820, 240, 24),
      P(700, 760, 240, 24), P(380, 700, 240, 24),
      P(700, 640, 240, 24), P(1020, 580, 240, 24),
      P(700, 520, 240, 24), P(380, 460, 240, 24),
      P(700, 400, 240, 24), P(1020, 340, 240, 24),
      P(1200, 240, 500, 60, 'solid')
    ],
    spikes: [S(1550, 900, 150, 400), S(0, 0, 1700, 130, 'solid')],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'exit' },
    intro: 'Todo lo que sube vuelve a subir. Aquí, al menos.'
  });

  /* ---- 13 · Silencio ----------------------------------------- */
  EO.LEVELS.push({
    num: 13, family: 'silent', name: 'SILENCIO',
    subtitle: 'No voy a decir nada. Ni siquiera esto.',
    world: { w: 2100, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(1920, 448, { hidden: true }),
    platforms: [
      P(0, 560, 520, 220), P(640, 500, 180, 60), P(900, 440, 180, 60),
      P(1160, 500, 180, 60), P(1420, 440, 180, 60), P(1680, 560, 420, 220)
    ],
    spikes: [S(520, 700, 1160, 80)],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true, silent: true, dark: true },
    goal: { type: 'exit' },
    intro: ''
  });

  /* ---- 14 · Tu sombra ---------------------------------------- */
  EO.LEVELS.push({
    num: 14, family: 'shadow', name: 'TU SOMBRA',
    subtitle: 'Tu intento anterior sigue aquí. Y quiere llegar antes.',
    world: { w: 2200, h: 780 },
    spawn: { x: 70, y: 520 },
    exit: EXIT(2020, 468),
    platforms: [
      P(0, 560, 480, 220), P(600, 520, 160, 24), P(860, 460, 160, 24),
      P(1120, 400, 160, 24), P(1380, 460, 160, 24), P(1640, 520, 160, 24),
      P(1860, 560, 340, 220)
    ],
    spikes: [S(480, 700, 1380, 80)],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true, echo: true },
    goal: { type: 'exit' },
    intro: 'Te voy a devolver tu último intento. Íntegro. Con tus errores.'
  });

  /* ---- 15 · JEFE I (arena generada por el motor) -------------- */
  EO.LEVELS.push({
    num: 15, family: 'impossible', name: 'EL QUE TODO LO SABE',
    subtitle: 'No lo derrotas con fuerza. Lo derrotas mintiéndole.',
    boss: 'saber',
    world: { w: 1700, h: 800 },
    spawn: { x: 120, y: 660 },
    exit: null,
    platforms: [
      P(0, 720, 1700, 80),
      P(120, 560, 300, 26), P(560, 500, 300, 26),
      P(1000, 560, 300, 26), P(1440, 500, 240, 26),
      P(400, 360, 260, 26), P(1000, 320, 260, 26)
    ],
    spikes: [],
    orbs: [],
    rules: { gravity: 1, invert: false, canJump: true },
    goal: { type: 'boss' },
    intro: 'Él lo sabe todo. Yo solo lo finjo. Empieza a correr.'
  });

  /* --------------------------------------------------- META / PROGRESIÓN */
  EO.STORY_END = 15;

  EO.levelByNumber = function (num) {
    return EO.LEVELS[num - 1] || null;
  };

})(window.EO);
