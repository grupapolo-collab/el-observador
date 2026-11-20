# EL OBSERVADOR v4.1

## Jugar ONLINE (nuevo en v4.1)

El juego y las salas viven en **un solo servicio**: abres su enlace, creas sala, pasas el código (o el enlace) y os veis en tiempo real.

### Publicarlo (≈5 min, gratis en Render)
1. Sube esta carpeta a un repositorio de GitHub (incluye `el-observador.html`, `server/`, `package.json`).
2. En render.com → **New → Web Service** → elige el repo. Ya trae `render.yaml` (build `npm install`, start `npm start`, health `/healthz`).
3. Cuando termine te da una URL `https://tu-app.onrender.com`: **esa es la URL del juego**. Envíala a quien quieras.
   (En el plan gratis Render duerme el servicio sin tráfico: la primera carga tarda ~30 s.)
Otras opciones: `Dockerfile` (Fly.io, Railway, VPS…) o `Procfile` (Heroku). Escucha en `$PORT`.

### Jugar
Menú → **Jugar online** → nombre/personaje → **Crear sala** → copiar código o enlace. El rival abre el enlace (o escribe el código) y entra. El anfitrión elige modo (mixto / cooperativo / versus) y pulsa Empezar. Al acabar, Enter del anfitrión = revancha. Esc dos veces = salir.
Controles: A D / ← → mover · W / ↑ / Espacio saltar · Q o , ayuda · E o . sabotaje · mando 1 · **en móvil, botones táctiles**.

### Cómo funciona
Cada cliente simula SOLO a su jugador (sin lag propio) y manda su estado a 20 Hz; al rival se le ve suavizado. Plataformas que se rompen, chispas, rescates, sabotajes, lluvia del Observador y fin de ronda van por eventos; el anfitrión decide cuándo acaba cada ronda. Reloj común con el servidor (cuenta atrás y plataformas móviles idénticas). Reconexión automática 30 s si se cae la red. Sin PeerJS ni CDN.

### Probar en local
```
npm install && npm start        # http://localhost:8080  (abre dos pestañas)
python3 test/e2e-online.py      # prueba de extremo a extremo con 2 navegadores (Playwright)
npm test                        # el resto de pruebas
```
Si alojas solo el HTML en otro sitio: abre `…/#servidor=wss://tu-app.onrender.com` y define `ALLOWED_ORIGINS=https://tu-dominio` en el servidor.

### Corregido respecto a v4.0
- El online usaba PeerJS desde un CDN y **nunca se conectaba al servidor de salas**; además no enviaba las teclas (el rival no se movía) ni abría la partida. Reescrito sobre WebSocket propio y probado con dos navegadores reales.
- Servidor: ahora sirve el juego, reglas/aspecto/semilla desde el servidor, revancha, latido anti-proxy, límite 90 msg/s, una sala `READY` ya no arranca si alguien se cae.
- Menú y pantallas altas ya no recortan el título en ventanas bajas.


Abre `el-observador.html` con doble clic. Un solo archivo, sin instalación, sin dependencias.
(`index.html` es la versión modular: carga `css/` y `js/`. Si tocas algo en `js/`, ejecuta `python3 build.py` para regenerar el archivo único.)

## Nuevo en v3.4

**Correcciones**
- **Nivel 23 (El intento anterior):** el fantasma nacía encima del jugador y lo mataba al empezar. Ahora usa 2 s reales de retraso, se reinicia tras cada muerte y solo se arma cuando te alejas 200 px de la salida.
- **Puertas fuera de alcance (2 causas):** (1) la puerta que huye se quedaba en `y=0` tras reiniciar (`armTrap` borraba `y0`); (2) los niveles generados podían dejar la isla final con ancho negativo y la puerta colgada en el vacío. `node test/reach.js` comprueba con la física real que la puerta es alcanzable en todos los modos.

**Puertas-ilusión** (`js/illusion.js`): al tocar la puerta, el Observador dice «esa puerta solo es una ilusión» y te devuelve atrás. Versiones: burbuja, payaso, espejo, eco (la puerta de verdad estaba a mitad de camino). Una vez por nivel y sesión, nunca en niveles 1-2/jefes/6+ muertes/niveles seguidos; la puerta tiembla al acercarte; el pez la detecta. Probar: `#level=5&illusion=burbuja|payaso|espejo|eco`.

**Música trance** (`tools/make_music.py`): 12 pistas nuevas (t1-t6 por bloque, euphoria, circus2, boss2, coop, menu2) + jingle de victoria, risita y público. Al empezar cada nivel se elige entre la original y la trance (≈70 % trance). Risas de fondo desde la 2.ª muerte. `js/fx.js`: el Observador se ríe en pantalla (crece, llora, suelta «JA JA», gorro de payaso con el circo) sincronizado con las risas (`EO.MUSIC_META`).

**Cosméticos:** +5 personajes (payaso, alienígena, panda, hongo, conejo), +11 colores (incl. neón, galaxia y discoteca animados), +10 accesorios (orejas, flor, pajarita, antifaz, gorra, sombrero pirata, nariz de payaso, estrella, cascos DJ, gorro de fiesta), +2 estelas (confeti, rayos) y +6 mascotas (conejo, pingüino, zorro, medusa, abeja, dragoncito).

**Cooperativo local** (`js/coop.js`, botón en el menú): 2 jugadores en una pantalla, 5 rondas en niveles de 7-10 mil px con checkpoints. Rondas: CARRERA, JUNTOS, LA TORRE, EL PUENTE, CAOS. Ayudas (plataforma de rescate / salto potenciado) y sabotajes con aviso (empujón, pinchos, mareo, plomo) con energía que se recarga. Modos: mixto, cooperativo, versus. P1: A/D/W, Q ayuda, E sabotea · P2: flechas, `,` ayuda, `.` sabotea · mandos 1 y 2. `node test/coop.js` prueba niveles, física y flujo completo.

## Nuevo en v3.3 — Música compuesta con Python y mascotas con vida propia

### Música (`tools/make_music.py` → `js/music_data.js`)
Un compositor en Python (numpy/scipy, síntesis propia + ffmpeg) genera **14 pistas en bucle continuo** (OGG mono, ~1,3 MB en total, todo embebido: sigue siendo 100 % offline). `python3 tools/make_music.py` las regenera; en `tools/out/*.ogg` puedes escucharlas sueltas.

| Pista | Cuándo suena |
|---|---|
| `menu` | Menú principal (caja de música en Re dórico, parpadeo del Observador) |
| `b1`…`b6` | Un tema por bloque: Iniciación (curiosa) · Desconfianza (todo desafinado) · Manipulación (frigio, bajo sinuoso) · Paranoia (latido, reloj, cuerdas en trémolo) · Ruptura (beat roto, glitch) · Conciencia (coro y arpa) |
| `boss` | Jefes (140 bpm, toms, metales, riser) |
| `lullaby` | **Llevas >10 s quieto**: nana con una nota deliberadamente rota |
| `circus` | **5+ muertes en el nivel**: circo en calíope desafinado con risas (y risa suelta en la 5ª, 9ª, 13ª…) |
| `suspense` | **Miedo**: trampa a punto de saltar, tramo final con trampas, jefe apuntando. Latido que se acelera + escala Shepard infinita + cuerdas rotas + golpe de tensión. Máx. 9 s seguidos y luego descanso |
| `flow` | **Vas muy bien** (≈14 s moviéndote sin morir): bombo, bajo sincopado, arpegio y bombeo. Se apaga si te paras o mueres |

Prioridad: nana > suspense > ritmo > circo > tema. Fundido cruzado entre pistas, se atenúa en pausa. Nuevo ajuste **Música** (on/off). Si el navegador no decodifica OGG, cae al sintetizador antiguo.

### Mascotas independientes (`js/pets.js`)
Ya no van pegadas: tienen posición, física y carácter.
- Te siguen y **a ratos se adelantan** (hasta su límite), pero **jamás pasan de ti si hay trampa o pinchos a menos de 380 px**.
- **Terrestres** (rata, rana, gato, slime): caminan por su plataforma; si saltas a otra esperan a que aterrices con calma y saltan hasta ti (o se teletransportan si está lejos). **Si te caes, no se tiran detrás**: esperan.
- **Voladoras**: polilla y pez flotan contigo hacia abajo; murciélago, cuervo y búho se quedan arriba si caes.
- **Ayudan de vez en cuando** (máx. 4 por nivel): gato (avisa pinchos/pisones/paredes/empujones) · rana (marca suelos falsos) · slime (se come el cebo «?») · rata (señala orbes) · polilla (guía hacia la salida verdadera) · pez (deshace puertas falsas) · murciélago (eco: revela avisos) · cuervo (te trae un orbe) · búho (tras 3 muertes te recuerda lo que te mató).
- Si el Escudo o un respawn te teletransporta, la mascota se recoloca a tu lado. La tienda muestra qué hace cada una.

### Tests
`node test/smoke.js` ahora también comprueba mascotas (9 × niveles con trampas: no se adelanta con peligro, no baja en caídas, ≤4 ayudas) y el director de música (menú → tema → nana → circo → ritmo → suspense → jefe → ajuste desactivado).

## Nuevo en v3.2 — Habilidades, música adaptativa y memoria del Observador

**Habilidades** (Tienda → pestaña *Habilidades*; **solo se aplican fuera de Historia**), cada una con su inconveniente:
Doble salto (el *empujón* te lanza ×1,5) · Imán de orbes 80 px (el cebo «?» también te atrae) · Vista de grieta (avisos siempre visibles; −20 % CAOS) · Escudo espectral (1 muerte gratis por nivel; cuenta doble para el logro de muertes) · Aire controlado (mantén salto = caída lenta) · Dash (**Shift / K / LB / RB**, enfriamiento 1,5 s).

**Música adaptativa** (`EO.Music` en `game.js`): cuna si te quedas quieto, circo tras 5 muertes, triste tras 3, pánico/épica en jefes. Solo suena jugando, con la partida sin pausar.

**Perfil:** nuevo dato *Nivel más duro*. **Stats por nivel:** intentos, muertes y tiempo (`save.stats`).
**`js/observe.js` (nuevo):** el Observador comenta primera muerte, pausa, reinicio, ayuda, puerta falsa, mando y «te fuiste» si cierras la pestaña a media partida.

### Corregido en v3.2
| Problema | Solución |
|---|---|
| `EO.Observe` no existía: las llamadas de `game.js` no hacían nada | Creado `js/observe.js` |
| **Dash anulado**: el tope de velocidad lo cortaba al siguiente fotograma | Sin tope ni fricción durante el impulso (0,15 s) |
| Doble salto no disponible tras caer de un borde sin saltar | Cuenta como primer salto |
| Aire controlado dependía de los FPS (`vy *= 0.85` por paso) | Tope de caída estable |
| Habilidades sin su inconveniente anunciado (empujón, cebo, vista, escudo) | Implementados |
| La música sonaba en el menú, en pausa y antes del primer clic | Solo en partida activa; el tono «normal» respeta el del nivel/jefe |
| Escudo dejaba proyectiles activos al reaparecer | Se limpian |
| `stats.intentos` nunca se incrementaba | Ahora sí |
| Versión mostrada v3.0/v3.1 en menú y ajustes | v3.2 |

Prueba nueva: `node test/smoke.js` (7 modos × 5 niveles con todas las habilidades, dash y doble salto; sin navegador).
Nota (v4.0): los `test/t0,t2,t3,t5.js` citados más abajo nunca existieron; las referencias se han sustituido por las pruebas reales.

## Nuevo en v3.1 — Tienda y personalización

Archivo nuevo: **`js/shop.js`**. Menú → **Tienda y personaje** (también desde Pausa y desde la pantalla de resultado).

**Cómo se ganan CAOS:** nivel (10–20, sube con el nivel) · sin morir +6 · sin ayudas +4 · orbes +2 c/u · jefe +25 · cada logro +15 · bono diario +10.
Modos Diablo/Diario ×1,5 · Descenso ×1,25. Repetir un nivel paga menos (anti-granja).

**Qué se compra (36 objetos, 4 rarezas):** personaje (Cubo, Fantasma, Slime, Robot, Gato, Calavera, **Observador** = se desbloquea al derrotar al Jefe VI) · color (9 + Arcoíris animado) · ojos (6 estilos) · accesorio (antena, gafas, cuernos, mago, halo, corona) · estela (brillo, píxeles, fuego, estrellas, arcoíris).
Toca un objeto para **probarlo** en la vista previa; tócalo otra vez para comprarlo. Botón **Aleatorio** para equipar algo al azar de lo que ya tienes.
El aspecto no cambia la hitbox: todos los personajes miden lo mismo.

Archivos tocados: `game.js` (recompensas, logros, repetición), `index.html` (botones y pantalla), `css/style.css`. Guardado compatible con v3.0.

**Mando:** stick izquierdo/cruceta mueve · A/B/X/Y salta (mantén = salto alto) · Start pausa · Select ayuda · en menús A/Start = jugar/siguiente. Pulsa un botón del mando con la página abierta si no lo detecta.

## Nuevo en v3.0 — estilo Level Devil, pero psicológico

Archivo nuevo: **`js/trolls.js`** (Director de Trampas). Cada nivel recibe trampas sembradas al azar, y **cambian tras cada muerte**.

| Trampa | Qué hace | Cómo se salva (siempre hay forma) |
|---|---|---|
| **Suelo falso** (`trapdoor`) | Un trozo de suelo se abre al pisarlo, al acercarte o *después* de pasar (te cierra la vuelta) | Hay un retardo de décimas: salta al notar el temblor. Huecos ≤ 112 px |
| **Hueco con suelo** (`fakefloor`) | Un hueco que se dibuja como suelo sólido | Salta el hueco |
| **Pinchos sorpresa** (`popspike`) | Brotan delante de ti, o **donde ibas a aterrizar** | Salta antes / corrige en el aire |
| **Pisón** (`thwomp`) | Cae un bloque cuando pasas debajo; sombra de aviso | Frena o corre; se retira solo |
| **Empujón** (`shove`) | Una mano te empuja (normalmente hacia atrás) | Reacciona y salta |
| **Puerta que huye** (`runaway`) | La salida se aparta 2–4 veces al acercarte, y al final se rinde | Persevera |
| **Pared sorpresa** (`wall`) | Brota una pared ≤ 108 px delante de la puerta | Salta |
| **Cebo** (`bait`) | Estrella con «?»: te maldice (mandos en espejo / sin salto unos segundos) | No la cojas |
| **Eventos** | Falso «NIVEL SUPERADO», falso «HAS MUERTO», interferencia, mandos en espejo, salto «en huelga» | Sólo fastidian |
| **Carteles** | Los hay que mienten («SEGURO ✓»), los hay que dicen la verdad y los hay señuelo («⚠ TRAMPA ⚠» sin nada) | Desconfía de todos |

**Burlas:** burbujas sobre tu cabeza al activarse una trampa y una frase distinta del Observador según la trampa que te mató.

**El nivel aprende:** tras 2 muertes en la misma trampa se muda y cambia de disparador; cada 3 muertes aparece una nueva. **Misericordia:** a las 7 muertes los avisos (grietas, sombras) se ven más; a las 12 se retira la trampa que más te mata.

**Nuevo modo «El Diablo»:** niveles generados con el máximo de trampas, sin límite de niveles. Récord propio.

Cantidad de trampas: Historia 1 (nivel 1) → 9 (nivel 30) · Infinito/Diario: crece con el nivel (máx. 16) · Diablo: 5 → 18. No hay trampas en los jefes ni en los niveles que dependen de otra regla (gravedad invertida, sin salto, inacción, gemelo).

## Corregido en v3.0

| Problema | Solución |
|---|---|
| **Nivel 2 imposible**: pedía un salto de 290 px; el máximo real medido es ~280 | Plataforma acercada (hueco de 230 px) |
| **Cuchillas con hitbox invisible**: `game.js` mataba en la posición *inicial* de la cuchilla además de la real | Eliminado el bloque antiguo; sólo mata `render.js` |
| **Continuar en el nivel >15 cargaba antes el jefe 15** (doble intro, doble jefe) | `game.js` usa `STORY_END` (30) |
| `loadLevel` generaba el nivel dos veces al reintentar | Una sola vez |
| **Desafío diario no era igual para todos** (el pasillo de caos usaba semilla aleatoria) | Semilla diaria fija, sin intento |
| El logro «Derrota al Jefe I» se daba con cualquier jefe | Sólo con el Jefe I |
| Reiniciar con R sumaba una muerte que se borraba al instante | Quitado |
| La tecla P abría Ajustes sin pausar (el juego seguía corriendo) | P ahora pausa |
| El HTML traía un script de analítica externa (Cloudflare) ajeno al juego | Eliminado: 100 % offline |

## Probar sin jugar 30 niveles

`el-observador.html#level=15` (Jefe I) · `#level=20` · `#level=22` · `#level=25` · `#level=30`
`el-observador.html#mode=infinito&level=12` · `#mode=diablo&level=5&skip=1`

## Pruebas automáticas (opcionales, requieren Node)

```
node test/coop.js             # cooperativo: niveles alcanzables, física, flujo de rondas completo
node test/smoke.js            # 7 modos × 5 niveles con habilidades, mascotas y director musical
node test/reach.js            # la salida es alcanzable con la física real en todos los modos
node test/observer.js         # NUEVO v4.0 · causalidad del Observador (nadie ríe sin causa)

npm install && node server/test/run.js   # servidor de salas (lógica + WebSocket/HTTP reales)
python3 test/e2e-online.py               # NUEVO v4.1 · online con 2 navegadores reales
```

## Estructura

```
el-observador.html   juego completo en un archivo (recomendado)
index.html           versión modular (mismo contenido)
build.py             regenera el archivo único
css/style.css
js/data.js           niveles 1–15, frases, logros, familias
js/levels2.js        niveles 16–30
js/ui.js             guardado, audio, pantallas, dispositivo
js/game.js           física, reglas, flujo
js/render.js         dibujo + generador procedural
js/bosses.js         jefes II–VI
js/engine2.js        suelos que ceden, pisones, láseres, perseguidor, pasillo de caos
js/shop.js           economía, tienda, habilidades y dibujo del personaje
js/observe.js        memoria y comentarios del Observador
js/illusion.js       NUEVO v3.4 · puertas-ilusión
js/fx.js             NUEVO v3.4 · el Observador se ríe
js/coop.js           NUEVO v3.4 · cooperativo local
server/              NUEVO v4.0 · servidor de salas (Node + ws, reconstruido y probado)
server/test/run.js   NUEVO v4.0 · pruebas del protocolo de salas (lógica + WS real)
test/reach.js        NUEVO v3.4 · puertas alcanzables
test/coop.js         NUEVO v3.4 · pruebas del cooperativo
js/score.js          NUEVO v3.3 · director de la banda sonora adaptativa
js/pets.js           NUEVO v3.3 · mascotas con vida propia
js/music_data.js     GENERADO · pistas OGG en base64 (tools/make_music.py)
tools/make_music.py  NUEVO v3.3 · compositor en Python
js/trolls.js         director de trampas, burlas y eventos
test/                banco de pruebas sin navegador
```
