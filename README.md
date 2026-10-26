# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, datos y experiencias digitales junto a Craft Studio. HTML, CSS y módulos JavaScript; Three.js y transform feedback para el núcleo.

## Desarrollo y publicación

Node.js 20+: `npm install`, `npm run dev` (http://127.0.0.1:4173), `npm run check`, `npm test`, `npm run build`.

El build empaqueta Three.js/addons y copia una lista explícita a `dist/`. No publica pruebas, perfiles, node_modules ni lil-gui. `IS_DEVELOPMENT=false` evita cargar el panel en producción. Vercel CLI publica en https://juan-pablo-craft-portfolio.vercel.app/, equipo `juans-projects-079dba21`. El repositorio no despliega automáticamente al hacer push.

Checkpoint antes de esta iteración: **b7b4984**. La versión anterior del sitio permanece recuperable en ese commit.

## Diagnóstico móvil y respaldo

La simulación usa transform feedback, no texturas float de posición ni MRT. Sin embargo, el composer y el bloom anteriores creaban targets HalfFloat sin comprobar si podían renderizarse. Poder muestrear una textura float no garantiza que sea un framebuffer renderizable: ver [EXT_color_buffer_float de Khronos](https://registry.khronos.org/webgl/extensions/EXT_color_buffer_float/). Había cuatro contextos WebGL, presupuestos mayores en móvil, reconstrucciones por cambios de viewport y ningún respaldo procedural del núcleo. No se atribuye una falla concreta de Safari físico a las pruebas de escritorio.

`js/render-quality.js` comprueba WebGL2, precisión highp, transform feedback, dimensiones máximas y completitud real de framebuffers RGBA8/RGBA16F mediante un target de 4×4. Solo usa HDR/bloom HalfFloat cuando es renderizable. Los perfiles son:

| Perfil | Núcleo + fotones precargados | Presupuesto de píxeles | Brillo |
|---|---:|---:|---|
| Escritorio HDR | 7.526 + 2.600 | 650.000 | Bloom reducido |
| Móvil HDR | 1.800 + 1.200 | 220.000 | Bloom reducido |
| Móvil compatible | 1.000 + 650 | 150.000 | RGBA8 y glow analítico, sin targets float de bloom |
| Respaldo Canvas2D | Hasta 620 IDs | 160.000 | Núcleo procedural simplificado |

El DPR móvil nunca supera 1,2 y además queda limitado por el presupuesto y las dimensiones máximas de la GPU. Galaxia y aurora reducen sus cantidades/resolución en móvil. Las variaciones pequeñas de altura de la barra del navegador no reconstruyen la simulación.

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

`big-bang.js` proporciona las trayectorias a los shaders de simulación y dibujo. Los IDs y los dos slots de buffers GPU se mantienen durante toda la secuencia y al retroceder; la transición final conserva velocidad y entra gradualmente al resorte. Las partículas adicionales del rayo B también participan del Big Bang. En A permanecen precargadas y se desvanecen al completar la formación.

Antes de mostrar la singularidad se esperan fuentes, se preparan glifos, shaders (`compile`/`compileAsync`), ambos slots de buffers, todos los pases y un fence GPU asíncrono. No hay creación de geometrías ni buffers por cambio de fase o de versión A/B. Se anima autónomamente el pulso, los cielos y el núcleo; solo se pausa el render al ocultarse la pestaña.

Los cambios de opacidad del cielo se aplican directamente a sus tres canvases. Las barras de progreso se actualizan localmente y los textos solo cuando cambia su fase: se evita invalidar estilos heredados de toda la página en cada frame.

## Luz A y B, profundidad y dimensiones

`beamVariant` selecciona **A, luz pura**, o **B, rayo de partículas**. El panel lil-gui local permite alternarlas sin recompilar ni reasignar buffers. También se pueden comparar en producción con `?beam=A` y `?beam=B`.

A evalúa por píxel la distancia entre el rayo de cámara y el eje finito del haz en unidades del mundo: núcleo HDR fino casi blanco, caída exponencial del resplandor y bruma tenue. No hay superficie, normal, fresnel ni límites concéntricos visibles. Las variaciones orgánicas son menores al 3%.

B usa miles de puntos pequeños precargados, con velocidades axiales diferentes, densidad gaussiana hacia el eje y algunos escapes hacia el remolino. La emisión HDR genera un filamento continuo a distancia y detalle puntual de cerca. Ambas versiones se desvanecen en el último 18% de cada extremo y aparecen durante la absorción.

La cámara es PerspectiveCamera de 48°, a distancia fija 1,12. Un cilindro invisible (`colorWrite:false`, `depthWrite:true`) conserva la profundidad del eje. La luz se compone primero, después su proxy, y las esferas de anillo/remolino prueban el mismo depth buffer con alfa normal. Las superficies esféricas escriben su profundidad mediante gl_FragDepth. No hay máscara de render target ni clasificación manual de mitades en producción. El bloom acompaña la composición visible. En RGBA8 la conversión a sRGB respeta el alfa premultiplicado para evitar un borde artificial en el halo.

Los radios de las C aumentan de 0,30 a 0,354 solo en escritorio; aumenta proporcionalmente su cantidad de partículas para conservar densidad. El grosor, la textura esférica, el encastre, el remolino sutil y las fórmulas de movimiento se conservan. El alcance del rayo se adapta una vez al perfil de escritorio para mantener ambos cruces con los anillos mayores. Durante el ciclo, radios, largo, grosor y centro Z=0 permanecen constantes: solo cambia la orientación, con retrasos independientes y acotados para las C. La perspectiva cambia el tamaño relativo de los extremos, no la escala de todo el grupo.

Tras la formación, el scroll acelera el ciclo hasta 3,6× y añade hasta 12° de inclinación lateral, con retorno suave de 1,25 s. No traslada el grupo en Z ni arriba/abajo por scroll. El ciclo verde #3DDC97 ↔ azul #3B9EFF sigue en OKLab durante 11 s; matrices de [Björn Ottosson](https://bottosson.github.io/posts/oklab/).

## Verificación de esta iteración

`npm run check`, `npm test` (28 pruebas), `npm run build`. Los tests cubren perfiles, formación reversible, encastre, dimensión constante, cámara, color, puntero pasivo y encuadre móvil de las C y extremos del rayo en 48 poses con impulso máximo de scroll.

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

Se liberan buffers TF, geometrías compartidas, materiales, proxy, programas, VAO, composer, targets, pases de bloom, fences, listeners, observadores, panel y RAF. La ruta GPU no tiene bucles JS por partícula por frame; solo el respaldo Canvas2D usa un presupuesto CPU acotado.

Se mantienen la galaxia frontal/de fondo, aurora procedural, interacción mouse/touch, encabezado, contacto, perfil y prisma con Craft Studio, Animanía y Showroom 3D.
