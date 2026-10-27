# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, datos y experiencias digitales junto a Craft Studio. HTML, CSS y módulos JavaScript; Three.js y transform feedback para el núcleo.

## Desarrollo y publicación

Node.js 20+: `npm install`, `npm run dev` (http://127.0.0.1:4173), `npm run check`, `npm test`, `npm run build`.

El build empaqueta Three.js/addons y copia una lista explícita a `dist/`. No publica pruebas, perfiles, node_modules ni lil-gui. `IS_DEVELOPMENT=false` evita cargar el panel en producción. Vercel CLI publica en https://juan-pablo-craft-portfolio.vercel.app/, equipo `juans-projects-079dba21`. El repositorio no despliega automáticamente al hacer push.

La versión anterior a este pulido permanece recuperable en **357a4d8**; el checkpoint previo al Big Bang es **b7b4984**.

## Diagnóstico móvil y respaldo

La simulación usa transform feedback, no texturas float de posición ni MRT. Sin embargo, el composer y el bloom anteriores creaban targets HalfFloat sin comprobar si podían renderizarse. Poder muestrear una textura float no garantiza que sea un framebuffer renderizable: ver [EXT_color_buffer_float de Khronos](https://registry.khronos.org/webgl/extensions/EXT_color_buffer_float/). Había cuatro contextos WebGL, presupuestos mayores en móvil, reconstrucciones por cambios de viewport y ningún respaldo procedural del núcleo. No se atribuye una falla concreta de Safari físico a las pruebas de escritorio.

`js/render-quality.js` comprueba WebGL2, precisión highp, transform feedback, dimensiones máximas y completitud real de framebuffers RGBA8/RGBA16F mediante un target de 4×4. Solo usa HDR/bloom HalfFloat cuando es renderizable. Los perfiles son:

| Perfil | Núcleo + fotones precargados | Presupuesto de píxeles | Brillo |
|---|---:|---:|---|
| Escritorio HDR | 7.526 + 2.600 | 1.200.000 | Bloom reducido |
| Móvil HDR | 1.800 + 1.200 | 350.000 | Bloom reducido |
| Móvil compatible | 1.000 + 650 | 150.000 | RGBA8 y glow analítico, sin targets float de bloom |
| Respaldo Canvas2D | Hasta 620 IDs | 160.000 | Núcleo procedural simplificado |

El DPR móvil nunca supera 1,2 y además queda limitado por el presupuesto y las dimensiones máximas de la GPU. Galaxia y aurora reducen sus cantidades/resolución en móvil. La aurora ahora usa un framebuffer RGBA8 pequeño dentro del contexto de las estrellas traseras: son tres contextos WebGL, en lugar de cuatro. Las variaciones pequeñas de altura de la barra del navegador no reconstruyen la simulación.

Si no hay WebGL2, precisión o framebuffer compatibles, se muestra un núcleo Canvas2D con las dos C, rayo y secuencia de formación. Es un respaldo deliberadamente más simple, con ordenación aproximada por profundidad; la ruta principal conserva oclusión GPU real. Un último respaldo CSS protege incluso la carga fallida de módulos, sin imágenes ni logo grande.

`webglcontextlost` activa inmediatamente Canvas2D en el mismo progreso y tiempo visible. `webglcontextrestored` precalienta una nueva escena, reduce calidad y vuelve a GPU cuando está preparada. La prueba con WEBGL_lose_context verificó la transición HDR → Canvas2D → RGBA8 sin pantalla vacía.

Se eliminó `particle-orientation.js`, sus listeners, permisos y parámetros. No existe DeviceOrientationEvent ni requestPermission en el runtime. Se conservan los punteros pasivos y el parallax por puntero/scroll.

## Big Bang por scroll

El logo grande era un SVG en `.cinema-fallback img`; no formaba parte de las partículas. Se eliminó. El logo pequeño junto a JPM permanece.

La sección mide 290vh, con un escenario sticky de altura estable. El scroll recorre la secuencia hasta el 82% del recorrido útil y deja un tramo final con el núcleo completo. `createBangProgress` suaviza el progreso con inercia en ambos sentidos. No hay temporizador que salte fases al no desplazarse.

- 0–10%: singularidad tenue, pulso autónomo e indicación discreta para desplazarse.
- 10–30%: destello localizado y onda expansiva; las partículas salen en 3D.
- 30–60%: enfriamiento hacia blanco/turquesa y agrupaciones espirales; aparecen gradualmente aurora y partículas de página.
- 60–90%: se enciende el rayo y las mismas partículas se atraen en espiral hacia las C y el remolino axial.
- 90–100%: núcleo completo, texto escalonado con fade y desenfoque leve; transición a la composición del hero.

`big-bang.js` proporciona las trayectorias a los shaders de simulación y dibujo. Los IDs y los dos slots de buffers GPU se mantienen durante toda la secuencia y al retroceder; cada slot incluye posición, velocidad de perturbación y ancla analítica. El resorte conserva su desplazamiento al avanzar o retroceder cualquier fase, sin mezclar la velocidad de la trayectoria con la fuerza del puntero. Las partículas adicionales del rayo B también participan del Big Bang. En A permanecen precargadas y se desvanecen al completar la formación.

Antes de mostrar la singularidad se esperan fuentes, se preparan glifos, shaders (`compile`/`compileAsync`), ambos slots de buffers, todos los pases y un fence GPU asíncrono. No hay creación de geometrías ni buffers por cambio de fase o de versión A/B. Se anima autónomamente el pulso, los cielos y el núcleo; solo se pausa el render al ocultarse la pestaña.

Los cambios de opacidad del cielo se aplican directamente a sus tres canvases. Las barras de progreso se actualizan localmente y los textos solo cuando cambia su fase: se evita invalidar estilos heredados de toda la página en cada frame.

## Luz A y B, profundidad y dimensiones

`beamVariant` selecciona **A, luz pura**, o **B, rayo de partículas**. El panel lil-gui local permite alternarlas sin recompilar ni reasignar buffers. También se pueden comparar en producción con `?beam=A` y `?beam=B`.

A evalúa por píxel la distancia entre el rayo de cámara y el eje finito del haz en unidades del mundo: núcleo HDR fino casi blanco, caída exponencial del resplandor y bruma tenue. No hay superficie, normal, fresnel ni límites concéntricos visibles. Las variaciones orgánicas son menores al 3%.

B usa miles de puntos pequeños precargados, con velocidades axiales diferentes, densidad gaussiana hacia el eje y algunos escapes hacia el remolino. La emisión HDR genera un filamento continuo a distancia y detalle puntual de cerca. Ambas versiones se desvanecen en el último 18% de cada extremo y aparecen durante la absorción.

La cámara es PerspectiveCamera de 48°, a distancia fija 1,12. Un cilindro invisible (`colorWrite:false`, `depthWrite:true`) conserva la profundidad del eje. La luz se compone primero, después su proxy, y las esferas de anillo/remolino prueban el mismo depth buffer con alfa normal. Las superficies esféricas escriben su profundidad mediante gl_FragDepth. No hay máscara de render target ni clasificación manual de mitades en producción. El bloom acompaña la composición visible del núcleo formado; durante las fases iniciales se usa el glow analítico y el bloom entra gradualmente junto al texto. Su resolución se acota independientemente del canvas principal. En RGBA8 la conversión a sRGB respeta el alfa premultiplicado para evitar un borde artificial en el halo.

Los radios de las C aumentan de 0,30 a 0,354 solo en escritorio; aumenta proporcionalmente su cantidad de partículas para conservar densidad. El grosor, la textura esférica, el encastre, el remolino sutil y las fórmulas de movimiento se conservan. El alcance del rayo se adapta una vez al perfil de escritorio para mantener ambos cruces con los anillos mayores. Durante el ciclo, radios, largo, grosor y centro Z=0 permanecen constantes: solo cambia la orientación, con retrasos independientes y acotados para las C. La perspectiva cambia el tamaño relativo de los extremos, no la escala de todo el grupo.

Tras la formación, el scroll acelera el ciclo hasta 3,6× y añade hasta 12° de inclinación lateral, con retorno suave de 1,25 s. No traslada el grupo en Z ni arriba/abajo por scroll. El ciclo verde #3DDC97 ↔ azul #3B9EFF sigue en OKLab durante 11 s; matrices de [Björn Ottosson](https://bottosson.github.io/posts/oklab/).

## Verificación de esta iteración

`npm run check`, `npm test` (31 pruebas), `npm run build`. Los tests cubren perfiles, formación reversible, encastre, dimensión constante, cámara, color, puntero pasivo y encuadre móvil de las C y extremos del rayo en 48 poses con impulso máximo de scroll.

- `tests/cosmic-gpu.html`: posiciones finitas en cinco fases y al regresar; mismos IDs/buffers, sin reasignaciones; A/B precargados; oclusión real en 50/58/75 s; resize y liberación del contexto. Pasó en escritorio HDR y viewport móvil con RGBA8 forzado. Los readbacks y colores rojo/azul existen solo en pruebas.
- `tests/colors-preview.html`: salida sRGB, blanco de las esferas, ciclo OKLab y 54 verificaciones de los dos cruces en tres poses; pasó en escritorio y móvil.
- `tests/sphere-gpu.html`: desviación Z en ambos sentidos y amortiguación; profundidad curva con error observado menor de 8e-8.
- `tests/cosmic-context-results.json`: respaldo y recuperación de contexto comprobados.

`tests/cosmic-profile.html` instala PerformanceObserver antes de los módulos. Su botón recorre mediante scroll real las cinco fases y el regreso durante 10,4 s, incluyendo texto y fondos. Se mide después del precalentamiento:

| Ejecución final | Long Tasks >50 ms | Long Animation Frames >50 ms | Intervalo medio de frame |
|---|---:|---:|---:|
| Escritorio 1280×800, HDR A | 0 | 0 | 20,06 ms |
| Viewport iPhone 390×844, HDR B | 0 | 0 | 16,64 ms |
| Viewport Android 412×915, RGBA8 A | 0 | 0 | 16,65 ms |

Los JSON `cosmic-*-profile.json` conservan las mediciones; escritorio incluye la ejecución previa con picos de 56/58 ms y la final tras limitar invalidaciones de estilo. Son resultados de estas ejecuciones, no una garantía universal de 60fps. El navegador disponible permite viewport, no emular Safari ni una GPU móvil física: falta validación en teléfonos reales. No se detectaron pedidos de permisos en las pruebas y el código de sensores está eliminado.

`?bang-capture=.05|.14|.55|.76|1&scene-capture=58` congela las cinco fases en localhost para capturas. `?quality=low` fuerza RGBA8 y `?safe=1` fuerza Canvas2D solo en desarrollo. Las capturas A/B usan el mismo tiempo 58 s. Estas opciones de diagnóstico no alteran el scroll publicado.

## Recursos y contenido conservado

Se liberan los tres buffers TF de cada slot, framebuffer/textura de aurora compartida, geometrías compartidas, materiales, proxy, programas, VAO, composer, targets, pases de bloom, fences, listeners, observadores, panel y RAF. La ruta GPU no tiene bucles JS por partícula por frame; solo el respaldo Canvas2D usa un presupuesto CPU acotado.

Se mantienen la galaxia frontal/de fondo, aurora procedural, interacción mouse/touch, encabezado, contacto, perfil y prisma con Craft Studio, Animanía y Showroom 3D.

## Pulido de fluidez y partículas — 27 de octubre de 2026

La comparación encontró eventos de rueda grandes/irregulares y trabajo de render/layout innecesario para algunas fases. La referencia local tuvo cero Long Tasks, pero ocho Long Animation Frames y 22,30 ms de intervalo medio.

- `intro-scroll.js` interpola la rueda solo dentro de la intro, con puntero fino/hover. Usa tiempo real, acumula distancia, elimina viaje pendiente al invertir la rueda y cancela al usar teclado, enlaces o puntero. No interviene en touch, zoom, desplazamiento horizontal, menú o controles. El progreso y la escena usan el mismo RAF.
- El escenario usa medidas cacheadas de layout; no lee dimensiones de la página en cada cuadro. El prisma no consulta su posición durante la intro fuera de pantalla. Se observan los textos visibles para las máscaras de legibilidad.
- Aurora y estrellas traseras comparten contexto; la aurora conserva su target pequeño y se compone antes de las estrellas. Los fondos lentos se actualizan a 30 Hz en escritorio, manteniendo su reloj continuo; el núcleo y la rueda siguen a la frecuencia del display. En móvil se mantiene la frecuencia previa.
- Se omite el cálculo orbital cuando todavía no hace falta y se usan puntos sencillos durante la expansión sin rayo. Las esferas y su profundidad real se conservan al formar el núcleo. El bloom no ejecuta sus pases costosos en fases con glow analítico.
- Radios de esfera: 0,0038 → 0,0027 en escritorio y 0,0028 → 0,0020 en móvil, aproximadamente 29% menos. Desenfoque 0,04/0,025, borde más definido, más resolución del canvas y bloom separado con umbral 2,1 para no engordar los puntos blancos.
- El puntero usa un desplazamiento y velocidad independientes del ancla analítica, enteramente en GPU. Esquiva y recupera durante todas las fases visibles; el cambio de progreso no borra la perturbación. Conserva alfa normal, sphere impostors y gl_FragDepth, sin cambiar el proxy del rayo ni el encastre.

Configuración: `desktopWheelSmoothing=.12`, `desktopProgressSmoothing=.09`, `desktopBackgroundFps=30`, radios/DOF y presupuestos en `particle-config.js`. Los tiempos de rueda/progreso también se exponen en lil-gui.

Comparación en el mismo Edge headless local, 1440×900, recorrido de 10,4 s:

| Medición | Intervalo medio | FPS calculados | Long Tasks | Long Animation Frames |
|---|---:|---:|---:|---:|
| Estado 357a4d8 | 22,30 ms | 44,84 | 0 | 8 (máximo 161 ms) |
| Pulido | 16,86 ms | 59,31 | 0 | 2 (62/74 ms) |

Los perfiles completos están en `tests/scroll-polish-performance.json`. Son mediciones locales, no una garantía para todo hardware; se conservan los dos cuadros aislados del perfil final.

`tests/intro-pointer-gpu.html` verificó repulsión, conservación al retroceder y retorno amortiguado en 20/45/76/95/100%. Pasaron cosmic-gpu, sphere-gpu y colors-preview: cruces A/B, profundidad curva y liberación. `tests/wheel-scroll.test.mjs` verifica continuidad temporal, acumulación, inversión y cancelación.

`tests/scroll-polish-results.json` conserva los tests GPU, rueda real hasta 99,8% y regreso a 71,3%, ancla de contacto y dos perfiles con viewport/touch emulados y DPR 2: iPhone 390×844 HDR y Android 412×915 RGBA8, ambos 16,66 ms, sin Long Tasks ni Long Animation Frames. No equivale a probar Safari o teléfonos físicos.

La primera ronda del harness encontró un favicon ausente en páginas de prueba; se agregó su enlace explícito. `tests/scroll-polish-smoke.json` confirma consola limpia, inversión rápida de rueda (467 → 413 px) y recuperación del fondo compartido y del núcleo. Los resultados históricos anteriores permanecen identificados por su iteración.
