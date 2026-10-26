# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales. HTML, CSS y JavaScript sin dependencias de ejecución. Identidad personal en azul noche, marfil y verde salvia junto a Craft Studio.

## Desarrollo

Node.js 20 o posterior. `npm run dev` inicia http://127.0.0.1:4173. `npm run check` comprueba trece módulos, `npm test` verifica geometría, entrada, presupuestos e interacción de las partículas, y `npm run build` prepara `dist/` con una lista explícita de recursos públicos.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni demostraciones retiradas. Los archivos históricos se conservan en el repositorio.

## Dos C entrelazadas, rayo 3D y aurora

Se conserva la entrada escalonada: el rayo aparece lentamente, las partículas se unen y después se revelan los textos. El movimiento autónomo mantiene el ritmo calmo.

El núcleo usa 32.000 partículas en escritorio y 10.000 en móvil. El 98% forma dos C gruesas de igual radio nominal, con planos perpendiculares, huecos en cruces opuestos y matices azul y violeta. El rayo se orienta sobre la bisectriz de las normales. Las partículas fluyen en sentidos opuestos; las interiores avanzan más rápido. Las puntas se desvanecen antes de reciclar la posición al extremo contrario, sin integrar una trayectoria por el hueco. El resto conserva una nube tenue.

Cada C tiene retraso, bamboleo y respiración propios. Una envolvente calcula el grosor completo de los tubos, abre el hueco mínimo necesario y limita el movimiento relativo según el espacio libre. La separación conserva un margen adicional durante el ciclo, incluso con los máximos configurables. El rayo pivota en un ciclo cerrado de 50 segundos, con inclinación de hasta 28 grados y movimiento en profundidad; el centro proyectado queda estable. La luz se dibuja con un shader independiente. Posiciones, velocidades y perturbaciones se integran en GPU con Transform Feedback, sin recorridos por partícula en JS.

La galaxia fija cubre toda la página con tres tamaños: 2.200 estrellas pequeñas, 420 medianas y 24 frontales con bokeh; en móvil son 700, 120 y 8. Las medianas y grandes tienen más velocidad y parallax. Los rangos de tamaño, cantidades, opacidades y brillo son independientes en el config. El fondo tiene z-index negativo y el frente pointer-events desactivados. Una distribución por celdas y máscaras de texto permite como máximo una candidata frontal atenuada por bloque, desvaneciendo las demás mientras lo cruzan. Mouse y touch provocan repulsión con inercia y retorno. Los eventos siguen siendo pasivos y touchmove mantiene la estela durante el scroll nativo.

La aurora es otro canvas debajo de las estrellas, generado con un fragment shader de ruido fBm de cuatro octavas y hasta cuatro cortinas. Ondula de forma autónoma; el scroll suavizado cambia su posición, orientación y paleta entre verde, turquesa, violeta y azul. El puntero genera una ondulación local y las máscaras reducen su intensidad detrás del texto. Se renderiza por defecto a 25% de resolución CSS en escritorio y 22% en móvil, configurable hasta media resolución, y se escala suavemente. No usa imágenes ni videos.

El giroscopio solo se activa en dispositivos móviles detectados. Toma la primera orientación válida como referencia, aplica límites y un filtro temporal. El frente se desplaza más que el núcleo, el fondo y la aurora. La inclinación también se suma al ciclo del rayo, sin reemplazarlo. En iOS, requestPermission se invoca dentro del primer gesto táctil válido; no hay botones ni diálogos propios. Android escucha directamente. Si falta el sensor o se rechaza el permiso, el efecto conserva su movimiento normal. Se recalibra al rotar la pantalla. Las pruebas de sensor son simuladas; requieren confirmación adicional en un teléfono físico.

- js/particle-config.js centraliza cantidades, densidad, radios, espesores, velocidades, ciclo 3D, inclinación, colores, opacidades y parámetros de aurora.
- js/cinema-renderer.js simula las dos C, dibuja la luz y ofrece el panel lil-gui solo en desarrollo. Un solo pase de puntos combina centro y halo.
- js/particle-motion.js calcula las dos bases, el margen de encastre, los movimientos independientes y la proyección del rayo.
- js/particle-orientation.js controla permisos, referencia, suavizado y limpieza del sensor.
- js/atmosphere.js administra las capas, máscaras y el scroll suavizado.
- js/aurora-renderer.js crea la aurora con resolución reducida.
- js/particle-gpu.js comparte programas, buffers y fuerzas; js/particle-input.js mantiene una estela acotada de puntero.
- js/scroll-story.js conserva la secuencia y la navegación; js/environment.js excluye el panel de producción.

La animación continúa sin scroll ni interacción y fuera de la portada. Solo se suspende al ocultar la pestaña. Al desmontar se abortan listeners, permisos pendientes quedan sin efecto, se cancelan RAF y se liberan observadores, canvas, programas, shaders, buffers, VAO y transform feedback. El DPR está limitado a 2 y el rayo usa recorte de render para reducir costo. Sin WebGL 2 se conserva la alternativa gráfica.

## Contenido y proyectos

Los títulos y elementos entran con desplazamiento, escala y desenfoque progresivo. Los títulos se revelan por líneas. La navegación permanece visible e incluye proyectos, perfil y contacto; flechas y asteriscos son SVG.

El prisma conserva solo Craft Studio, Animanía y Showroom 3D. Continúan retiradas la sección de tarjetas «Una mirada propia. En cada proyecto.» y las demostraciones de Power BI y automatización.

Las caras se repiten visualmente para mantener vecinos visibles, con contador de tres proyectos únicos y foco solo en la cara activa. La separación es de 18 a 36 px. El ancho de tarjeta es 48% con máximo de 560 px en escritorio, 52% en tablet y 68% con máximo de 360 px en móvil. Las tarjetas móviles conservan 340 px de alto.

El giro automático es lento; el centro del cursor lo detiene y los bordes aumentan la velocidad hasta 72 grados por segundo. Hay flechas, teclado, gestos y pausa. El perfil conserva desarrollo, análisis de datos, automatización e IA con Claude y ChatGPT. El contacto ofrece email y LinkedIn con navegación suave.

## Validación

Las 16 pruebas de Node cubren navegación y prisma, entrada, presupuestos, estela táctil pasiva, ciclo 3D cerrado, planos perpendiculares, bisectriz, margen de los tubos durante el ciclo, límites de configuración, pivote estable, detección móvil, referencia relativa, límites y suavizado, permiso iOS, rechazo y ausencia de sensor. La página local tests/gpu-preview.html verifica GPU, volumen de las dos C, huecos opuestos abiertos, bokeh y máscaras de texto, autonomía, perturbación y retorno, rayo, aurora visible, cambio con tiempo y scroll, ondulación, máscaras, resolución reducida y liberación de recursos. Sus lecturas de buffers solo existen en las pruebas y no se publican.

La revisión manual comprueba consola, interacción fuera del núcleo, distintas secciones y viewport móvil. Un viewport no valida un giroscopio físico ni la presentación real del permiso de Safari. El rendimiento depende del hardware y de cuántas escenas se estén renderizando simultáneamente.

## Publicación

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Vercel CLI publica al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. `vercel.json` usa framework Other, `npm run build` y salida `dist`. No hay sincronización automática con GitHub.
