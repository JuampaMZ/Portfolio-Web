# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales, junto a Craft Studio. HTML, CSS y módulos JavaScript; Three.js y transform feedback para el núcleo.

## Desarrollo y publicación

Node.js 20+: `npm install`, `npm run dev` (http://127.0.0.1:4173), `npm run check`, `npm test`, `npm run build`.

El build empaqueta Three.js y sus addons con esbuild y copia una lista explícita de archivos públicos a `dist/`. No publica pruebas, mediciones, node_modules ni lil-gui. Escribe `IS_DEVELOPMENT=false`; el panel solo se importa en localhost/desarrollo. Vercel CLI publica el proyecto `juan-pablo-craft-portfolio`, equipo `juans-projects-079dba21`, en https://juan-pablo-craft-portfolio.vercel.app/. No hay sincronización automática con GitHub.

`4575106` guarda el estado anterior a la transición perceptual y las esferas. Los controles están en `js/particle-config.js` y el panel local.

## Color y ritmo

El rayo interpola de #3DDC97 a #3B9EFF y vuelve en 11 segundos. `js/beam-colors.js` convierte sRGB a lineal, interpola en OKLab y calcula cuerpo, núcleo casi blanco y tono del bloom. Usa las matrices públicas de [Björn Ottosson](https://bottosson.github.io/posts/oklab/). La interpolación sinusoidal evita cortes al invertir el recorrido.

El flujo de las C, su respiración/bamboleo y el remolino axial bajan al 65% de su velocidad anterior; la opacidad de las bandas es 0,90. Se conserva el ciclo de reloj de arena de 50 segundos y el encastre geométrico. El remolino sigue siendo un reloj axial sutil: 800/250 partículas, sin la mezcla de hélices eliminada anteriormente.

## Esferas y profundidad

La cámara sigue siendo PerspectiveCamera de 48°. El rayo conserva CylinderGeometry de 48 segmentos, radio en unidades del mundo, orientación y escritura de profundidad. No hay máscaras de oclusión, clasificación manual delantera/trasera ni ajuste de grosor en pantalla.

`js/particle-sphere.js` sustituye los puntos planos por sphere impostors. El fragment shader intersecta el rayo de cámara con una esfera en view space, calcula normal, luz difusa del cilindro, reflejo especular y rim blanco fino. Proyecta la intersección y escribe `gl_FragDepth`: la superficie es curva también para el depth test. Conserva base #FFFFFF, NormalBlending, depthTest, depthWrite y toneMapped:false. La sombra y el leve tinte proceden de la iluminación, no de una base gris.

Los tamaños se proyectan desde radios del mundo. El LOD simplifica el reflejo de las partículas pequeñas; móvil usa un umbral mayor. Un desenfoque aproximado y pequeño según distancia suaviza resaltados y añade un borde tenue fuera del foco, sin convertirlo en manchas. Ese borde no escribe una superficie que pueda ocultar al cilindro.

RenderPass resuelve la profundidad antes de UnrealBloomPass y OutputPass. La salida es sRGB y NoToneMapping. Una selección de cromaticidad deja los centros blancos fuera del halo coloreado del rayo. El bloom difunde la imagen ya ocluida; no recupera fuentes ocultas, aunque puede extender luz visible desde píxeles vecinos.

## Interacción y recursos

Transform feedback integra posición y velocidad en GPU. La onda del puntero incluye repulsión XY, giro y fuerzas Z con ambos signos. Cada semilla tiene una constante de resorte y amortiguación distinta, por lo que la recuperación no ocurre a la vez. La velocidad aumenta ligeramente el brillo. No hay bucles por partícula en JavaScript por frame ni transferencias de posiciones a CPU en producción.

Mouse y touch usan la misma entrada pasiva, sin bloquear scroll. Se mantienen inclinación relativa del móvil, parallax, límites y permiso de iOS mediante gesto. La animación autónoma solo se pausa cuando la pestaña está oculta.

El desmontaje libera buffers, VAO, transform feedback, geometrías, materiales, programas, targets y pases, y cierra el contexto exclusivo del núcleo para liberar auxiliares internos. El controlador elimina RAF, listeners, observadores, entrada, sensores y medidor local.

## Rendimiento medido

Se prioriza el detalle por partícula: 6.500 en escritorio y 3.200 en móvil, incluidas las del remolino. El presupuesto físico del núcleo es de 650.000 píxeles; DPR máximo 2. El bloom usa 50% de la resolución física en escritorio y 35% en móvil. La interfaz y las otras capas conservan su resolución.

La instrumentación local `?benchmark=1` espera seis segundos de entrada y registra ocho segundos de RAF de la página completa, con una sola pestaña animada. No es un temporizador GPU. El tiempo de comando JS y los percentiles se guardan en `tests/performance-results.json`. Las capturas de prueba no se usan para medir fps.

| Viewport | Antes: media / p95 / fps | Después: media / p95 / fps |
| --- | --- | --- |
| 1280×800 | 21,13 / 33,50 ms / 47,32 | 17,72 / 33,10 ms / 56,43 |
| 390×844 | 16,65 / 16,90 ms / 60,05 | 16,65 / 16,90 ms / 60,05 |

Equipo de prueba: navegador integrado, 8 núcleos lógicos y 16 GB declarados por el navegador. DPR del núcleo antes/después: escritorio 1/0,80; móvil 1/1. En escritorio bajan los cuadros de más de 25 ms de 100 a 28 por ventana. No se alcanzan 60 fps estables en este equipo de escritorio; la medición móvil corresponde a un viewport, no a un teléfono físico ni una garantía para todo hardware.

## Verificación

- `npm test`: 24 pruebas de geometría, encastre, presupuestos, entrada pasiva, sensores, cámara, textos y conversión/ciclo OKLab.
- `tests/sphere-gpu.html`: lectura de velocidades Z positivas/negativas, recuperación amortiguada y profundidad de superficie contrastada con una intersección analítica. Error GPU observado menor a 8×10⁻⁸; el centro es más cercano que los bordes.
- `tests/mesh-depth.html`: anillo aislado y `?full=1`, debug rojo/azul y cruces en 50/58/75 segundos. Neutraliza solo el color del rayo durante la lectura para que el ciclo azul no confunda el debug. Mide oclusión y grosor rasterizados, sin alterar matrices, materiales de profundidad ni orden de render. Con menos partículas detalladas se verifica cobertura de las esferas que realmente se superponen, no una banda opaca continua.
- `tests/colors-preview.html`: salida sRGB, materiales sin tone mapping, base blanca, color/bloom OKLab, píxeles claros y 54 verificaciones de cruces.
- `tests/mesh-gpu.html`: ensamblado, remolino, interacción e inercia, resize sin acumulación de targets y liberación real de recursos.
- `tests/detail-preview.html`: captura reproducible de detalle y onda del puntero.
- `?scene-capture=50`, `58`, `75`: poses locales para capturas. No cambia la reproducción de producción.

Revisión visual en escritorio y viewport 390×844, incluyendo puntero y navegación. No se verifican sensores físicos ni el diálogo de permisos de Safari con una emulación de viewport.

## Contenido conservado

Galaxia de fondo/frente, aurora fBm, viajes lentos y sus interacciones siguen funcionando. Se mantienen los textos, encabezado fijo, contacto, entradas animadas y prisma con Craft Studio, Animanía y Showroom 3D. Continúan retiradas la foto, las primeras tarjetas repetidas y las demostraciones de Power BI y automatización.
