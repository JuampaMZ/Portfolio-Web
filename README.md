# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales. HTML, CSS y JavaScript sin dependencias de ejecución. Identidad personal en azul noche, marfil y verde salvia junto a Craft Studio.

## Desarrollo

Node.js 20 o posterior. `npm run dev` inicia http://127.0.0.1:4173. `npm run check` comprueba trece módulos, `npm test` verifica geometría, entrada, presupuestos e interacción de las partículas, y `npm run build` prepara `dist/` con una lista explícita de recursos públicos.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni demostraciones retiradas. Los archivos históricos se conservan en el repositorio.

## Dos C entrelazadas, rayo 3D y aurora

Se conserva la entrada escalonada: el rayo aparece lentamente, las partículas se unen y después se revelan los textos. El movimiento autónomo mantiene el ritmo calmo.

El núcleo usa 32.000 partículas en escritorio y 10.000 en móvil, repartidas entre dos C, un flujo escaso en sus aberturas y un vórtice independiente junto al rayo. Las C comparten radio nominal, planos perpendiculares y huecos en cruces opuestos. El rayo sigue la bisectriz de sus normales. Las partículas de cada C fluyen en sentidos opuestos; las interiores avanzan más rápido. Las puntas afinan su sección y desvanecen la opacidad, permitiendo reducir la apertura a unos 48 grados conservando un margen físico.

El flujo de las aberturas tiene por defecto el 4,5% de densidad por unidad de arco respecto de la banda, partículas más chicas y 20% de opacidad. Cruza el hueco sin detenerse en el anillo opuesto. Su población depende de la apertura y no supera el presupuesto total. Las puntas se reciclan invisibles, considerando el intervalo real entre frames.

El vórtice ocupa 3.400 partículas en escritorio y 1.100 en móvil, dentro del mismo presupuesto. Usa una base perpendicular al rayo, radio de 0,085 y giro más rápido que las C, con turbulencia curl, espirales de entrada y salida y mayor brillo cerca del centro. No participa del movimiento ni de los colores principales de las C. Su cantidad, radio, giro y turbulencia son configurables.

Cada C mantiene retraso, bamboleo y respiración propios. La envolvente calcula el grosor total y el afinado de las puntas, amplía una apertura demasiado pequeña y limita el movimiento relativo según el espacio libre. El rayo conserva su ciclo de reloj de arena de 50 segundos y el centro proyectado estable. La luz tiene shader independiente. Posiciones, velocidades y perturbaciones se integran en GPU con Transform Feedback, sin recorridos por partícula en JS.

El cielo cubre toda la página con 2.200 cuerpos pequeños, 420 medianos y 24 frontales; en móvil son 700, 120 y 8. Cada viaje cruza el viewport en una línea larga, con dirección y velocidad constantes durante su recorrido. Al llegar al borde se desvanece, aparece desde otro borde y toma un rumbo nuevo. Un 35% viaja también en profundidad: crece y gana brillo al acercarse, y disminuye al alejarse. Los grandes tienen halo suave, estela tenue, más velocidad y parallax. Velocidad de viaje, proporción en profundidad, halo y estela están en el config, junto a cantidades, tamaños y opacidades.

El fondo tiene z-index negativo y la capa frontal pointer-events desactivados. Las máscaras permiten como máximo una candidata frontal tenue por bloque de texto y desvanecen las demás mientras lo cruzan. Mouse y touch provocan esquiva con inercia y retorno a la trayectoria de viaje. Continúan el giroscopio y los eventos pasivos, con touchmove para conservar la estela durante el scroll nativo.

La aurora es otro canvas debajo de las estrellas, generado con un fragment shader de ruido fBm de cuatro octavas y hasta cuatro cortinas. Ondula de forma autónoma; el scroll suavizado cambia su posición, orientación y paleta entre verde, turquesa, violeta y azul. El puntero genera una ondulación local y las máscaras reducen su intensidad detrás del texto. Se renderiza por defecto a 25% de resolución CSS en escritorio y 22% en móvil, configurable hasta media resolución, y se escala suavemente. No usa imágenes ni videos.

El giroscopio solo se activa en dispositivos móviles detectados. Toma la primera orientación válida como referencia, aplica límites y un filtro temporal. El frente se desplaza más que el núcleo, el fondo y la aurora. La inclinación también se suma al ciclo del rayo, sin reemplazarlo. En iOS, requestPermission se invoca dentro del primer gesto táctil válido; no hay botones ni diálogos propios. Android escucha directamente. Si falta el sensor o se rechaza el permiso, el efecto conserva su movimiento normal. Se recalibra al rotar la pantalla. Las pruebas de sensor son simuladas; requieren confirmación adicional en un teléfono físico.

- js/particle-config.js centraliza cantidades, densidad, radios, espesores, velocidades, ciclo 3D, inclinación, colores, opacidades y parámetros de aurora.
- js/cinema-renderer.js simula las C, el flujo de los huecos y el vórtice, dibuja la luz y ofrece el panel lil-gui solo en desarrollo. Un solo pase de puntos combina centro y halo.
- js/particle-motion.js calcula las dos bases, el margen de encastre, los movimientos independientes y la proyección del rayo.
- js/particle-orientation.js controla permisos, referencia, suavizado y limpieza del sensor.
- js/atmosphere.js calcula los viajes en shaders y administra las capas, máscaras y scroll suavizado.
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

Las 18 pruebas de Node cubren navegación y prisma, entrada, presupuestos, estela táctil pasiva, ciclo 3D cerrado, planos perpendiculares, bisectriz, margen de los tubos durante el ciclo, límites de configuración, pivote estable, detección móvil, referencia relativa, límites y suavizado, permiso iOS, rechazo y ausencia de sensor. La página local tests/gpu-preview.html verifica GPU, volumen de las dos C, huecos opuestos abiertos, flujo tenue y vórtice independiente, velocidad constante durante el viaje, profundidad, reciclado con rumbo nuevo, halo, estela, bokeh y máscaras de texto, autonomía, perturbación y retorno, rayo, aurora visible, cambio con tiempo y scroll, ondulación, máscaras, resolución reducida y liberación de recursos. Sus lecturas de buffers solo existen en las pruebas y no se publican.

La revisión manual comprueba consola, interacción fuera del núcleo, distintas secciones y viewport móvil. Un viewport no valida un giroscopio físico ni la presentación real del permiso de Safari. El rendimiento depende del hardware y de cuántas escenas se estén renderizando simultáneamente.

## Publicación

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Vercel CLI publica al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. `vercel.json` usa framework Other, `npm run build` y salida `dist`. No hay sincronización automática con GitHub.
