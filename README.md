# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales junto a Craft Studio. HTML, CSS y módulos JavaScript; Three.js y transform feedback para el núcleo.

## Desarrollo

Node.js 20+: `npm install`, `npm run dev` (http://127.0.0.1:4173), `npm run check`, `npm test`, `npm run build`.

El build empaqueta Three.js y addons con esbuild y copia una lista explícita a `dist/`. No publica pruebas, perfiles, node_modules ni lil-gui. Escribe `IS_DEVELOPMENT=false`; el panel solo se importa en localhost/desarrollo. Vercel CLI publica en https://juan-pablo-craft-portfolio.vercel.app/, proyecto `juan-pablo-craft-portfolio`, equipo `juans-projects-079dba21`. No hay sincronización automática con GitHub.

Checkpoint previo a esta iteración: `035453b`. El aspecto de los anillos, el remolino y las partículas de página conserva materiales, colores, tamaños, cantidades, iluminación y fórmulas orbitales. No se modificaron los shaders esféricos ni los de galaxia/aurora.

## Entrada preparada y continua

La revisión encontró preparación diferida en los primeros renders de Three.js/postprocesado, importación del panel durante la entrada y una transición del ensamblado al resorte que reiniciaba la velocidad de las partículas. El perfil anterior no registró Long Tasks dentro de la intro, pero sí Long Animation Frames de 61 y 77,8 ms; uno incluyó trabajo del panel y de la galaxia. No se atribuye todo el tiempo del cuadro a JavaScript.

El controlador espera el layout de las fuentes y precalienta sus glifos con opacidad imperceptible. Prepara el panel local antes del reloj, ejecuta `renderer.compile` y `compileAsync`, recorre todos los pases del composer y ambos pares de buffers externos, y espera un fence GPU sin bloquear el hilo principal. La galaxia ya ha ejecutado sus primeros cuadros durante esa preparación. Solo después se muestra el canvas y empieza el reloj.

`js/animation-clock.js` usa tiempo real visible, sin contar frames ni limitar el delta del reloj. Solo excluye tiempo con la pestaña oculta. La integración física conserva un delta acotado por estabilidad; la progresión del ensamblado usa el tiempo absoluto. La transición conserva la velocidad calculada en GPU al entrar al resorte.

La llegada dispersa termina a los 3,9 s (0,2 de espera + 3,7 de ensamblado). El texto empieza a los 0,55 s y termina junto al elemento, con fade, blur leve y escalonado de 0,18 s por línea. No espera al final del ensamblado. No hay imágenes/texturas subidas al comenzar la entrada visible ni cálculos CPU por partícula.

## Centro y dimensiones constantes

PerspectiveCamera de 48°, distancia fija 1,12. El centro de rayo, anillos y remolino permanece en Z=0. Se elimina la traslación periódica de ±0,30, el desplazamiento vertical por progreso de scroll y el ajuste de largo de cada punta según la pose. Los dos radios de anillo permanecen en 0,30, sin respiración de escala. Se conservan el volumen, los huecos y el margen geométrico del encastre.

El rayo tiene largo y radio base constantes por viewport. En escritorio, escala de escena 0,82: largo 1,0168 y radio 0,006724 en unidades del mundo. Una inclinación base de 45° acerca un extremo mientras aleja el opuesto; la cámara produce el cambio relativo de grosor. La ondulación local del plasma es pequeña y no escala el grupo. Una rotación puede cambiar el contorno proyectado o el largo aparente por acortamiento perspectivo; no se simula una igualdad artificial en píxeles.

## Impulso por scroll

`js/scroll-drive.js` mide velocidad absoluta de scroll respecto de la altura del viewport. El impulso aumenta la velocidad del ciclo hasta 3,6× y suma hasta 12° de inclinación lateral; no empuja el núcleo arriba/abajo ni hacia la cámara. La inclinación máxima en profundidad conserva el encuadre y el cruce. Los anillos siguen el mismo eje con sus retrasos, bamboleo y límites de seguridad; el remolino permanece alineado con el rayo.

El ataque se suaviza en 0,12 s y el retorno usa una constante de 1,25 s. La fase se integra continuamente, sin reiniciarla cuando termina el gesto. Una prueba real de scroll pasó de 1× a 2,19× y volvió a 1,00002× manteniendo centro, Z, largo y radios idénticos. Controles: `scrollAcceleration`, `scrollExtraAngle`, `scrollReturn`, `scrollAttack`, `scrollVelocityReference`.

## Haz de energía 3D

`js/energy-beam.js` sustituye el material casi uniforme del cilindro anterior por tres cilindros concéntricos de 64 segmentos radiales y 96 longitudinales: núcleo fino casi blanco, cuerpo coloreado y envoltura translúcida. La normal y la dirección real a la cámara producen sombreado redondo y fresnel. Ruido fBm y corrientes axiales mueven el plasma; una ondulación pequeña de la geometría evita el tubo perfecto. Un pulso orgánico de baja amplitud y puntas afinadas/desvanecidas con emisión local completan el haz.

El núcleo y el cuerpo escriben profundidad. El cuerpo usa alfa normal; la envoltura prueba profundidad sin escribirla. Las partículas conservan NormalBlending, depthTest, depthWrite y gl_FragDepth de su superficie esférica. La oclusión usa el mismo buffer, sin máscaras ni clasificación manual de mitades de los anillos. El bloom sigue a la composición visible y no recupera fuentes ocultas.

El ciclo esmeralda #3DDC97 ↔ azul #3B9EFF sigue siendo OKLab de 11 s, con núcleo casi blanco, salida sRGB y sin tone mapping. Las matrices OKLab proceden de [Björn Ottosson](https://bottosson.github.io/posts/oklab/). Configuración y panel local exponen fresnel, velocidad/escala del ruido, ondulación de grosor, pulso y envoltura.

## Verificación

`npm test`: 27 pruebas de reloj visible, impulso/retorno, invariancia de dimensiones, encastre, perspectiva, entrada pasiva, sensores, colores y textos. La perspectiva se verifica también durante el impulso por scroll.

`tests/intro-profile.html` instala PerformanceObserver antes de los módulos y recoge Long Tasks y Long Animation Frames en una ventana de 5,5 s desde el inicio visible. La preparación queda separada de la intro. Perfiles finales medidos en escritorio 1280×800 y viewport móvil 390×844: **0 Long Tasks >50 ms y 0 Long Animation Frames >50 ms** en ambos. Preparación observada: 466 ms / 245 ms. Es una medición de estas ejecuciones, no una garantía para cualquier equipo.

`tests/animation-results.json` conserva perfiles antes/después, las tres poses capturadas (58, 63 y 75 s) y la prueba real de scroll. Las tres poses mantienen radios 0,30/0,30, largo 1,0168, radio base 0,006724 y Z=0; intercambian el extremo cercano como corresponde.

`tests/colors-preview.html` pasó en ambos viewports: salida sRGB, materiales, blanco de las esferas, color/bloom y 54 comprobaciones de cruce. El muestreo admite el núcleo afinado/translúcido en las puntas y mide la cobertura real de las esferas, no una banda opaca continua. `tests/mesh-depth.html` permite aislar un anillo, debug rojo/azul y tres momentos.

`tests/mesh-gpu.html` verifica precompilación, ensamblado, remolino, puntero, inercia, resize y liberación real de recursos, incluidos los nuevos materiales. `tests/sphere-gpu.html` mantiene la comprobación analítica de profundidad (error observado <8e-8), velocidades Z en ambos sentidos y amortiguación. Los readbacks solo existen en pruebas.

`?scene-capture=58`, `63` o `75` fija poses locales para capturas, sin transición de opacidad del canvas; no modifica la reproducción publicada. La revisión móvil usa viewport, no hardware ni sensores físicos. `tests/performance-results.json` conserva la medición histórica de fps de la iteración f575f81; no representa un benchmark del nuevo haz.

## Recursos y contenido conservado

Simulación en GPU, 6.500/3.200 partículas de núcleo, presupuesto físico de 650.000 píxeles, DPR máximo 2, LOD y bloom a resolución reducida. No hay bucles por partícula en JS por frame. Se liberan geometrías compartidas, tres materiales de rayo, materiales de partículas, programas, buffers, VAO, transform feedback, fences, targets, pases, listeners, observadores y RAF; se cierra el contexto exclusivo al desmontar.

Se mantienen la galaxia de fondo/frente, aurora fBm, interacción pasiva con mouse/touch, parallax e inclinación relativa del móvil. El contenido, encabezado, contacto y prisma con Craft Studio, Animanía y Showroom 3D no cambian.
