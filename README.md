# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales. HTML, CSS y JavaScript sin dependencias de ejecución. Identidad personal en azul noche, marfil y verde salvia junto a Craft Studio.

## Desarrollo

Node.js 20 o posterior. `npm run dev` inicia http://127.0.0.1:4173. `npm run check` comprueba trece módulos, `npm test` verifica geometría, entrada, presupuestos e interacción de las partículas, y `npm run build` prepara `dist/` con una lista explícita de recursos públicos.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni demostraciones retiradas. Los archivos históricos se conservan en el repositorio.

## Dos C entrelazadas, rayo 3D y aurora

Se conserva la entrada escalonada: el rayo aparece lentamente, las partículas se unen y después se revelan los textos. El movimiento autónomo mantiene el ritmo calmo.

El núcleo usa 60.000 partículas en escritorio y 19.000 en móvil. Las dos C aumentan su grosor radial y vertical un 40%, hasta 0,084 y 0,0728. Su población casi se duplica para conservar la densidad por sección, con centro brillante y bordes difusos. La abertura pasa a 25 grados para acompañar el nuevo grosor. Los cuellos junto a los cruces y el límite del movimiento relativo mantienen el encastre durante el ciclo. Los hilos de unión siguen siendo tenues y escasos.

El rayo es un volumen cilíndrico en la misma escena WebGL 2. Radio del núcleo (0,0038) y escala del glow (0,020) están en unidades del mundo, afectadas por la proyección perspectiva. El shader calcula la distancia de cada rayo de cámara al eje 3D y su superficie frontal. En reposo el extremo superior está más cerca; el grosor proyectado, brillo y halo cambian con la profundidad durante el ciclo. La atenuación máxima del extremo lejano es configurable (0,48). Los extremos se recortan suavemente al área visible sin cambiar el radio del objeto.

Se reemplaza el pase anterior de cobertura por un render target RGBA8: rojo para bandas e hilos, verde para hélices. Cada fragmento se clasifica por su profundidad respecto de la superficie del rayo; la clasificación se evalúa de nuevo en cada frame. Se dibujan partículas traseras, rayo y partículas delanteras. La textura atenúa tanto el núcleo como el glow antes de la composición; el núcleo conserva profundidad y cobertura opaca para ocultar las partículas traseras. Las delanteras ganan un poco de opacidad solo sobre la luz. Fuera de esa región se mantiene el material aditivo. La orientación inicial muestra la mitad superior de ambos anillos detrás y la inferior delante. Textura y framebuffer se redimensionan y liberan junto al resto de los recursos.

El reloj de arena contiene seis hélices entrelazadas: radios distintos dentro de su envolvente, velocidades variables, tres en cada sentido por defecto, pitch diferente y curl noise continuo. Antes estaban creadas pero apenas se veían: 18% de opacidad, puntos pequeños y un tono parecido al glow. Ahora tienen color rosado contrastante, opacidad configurable 0,70 y 2.800/1.000 partículas de escritorio/móvil dentro del mismo presupuesto total. La cintura y los extremos se amplían ligeramente para que la trama rodee el halo y se vea a lo largo del eje. Sus extremos siguen el largo visible del rayo. La máscara verde atenúa la luz bajo las hélices delanteras, mientras el núcleo tapa las traseras. Cantidad de hélices, radios, velocidades, contragiro, turbulencia, opacidad y color están en el config y el panel local.

La secuencia de entrada, el ciclo de reloj de arena de 50 segundos, las interacciones y la simulación GPU se conservan. No hay recorridos por partícula en JS de producción. Los pases de luz y cobertura se recortan a su área visible para reducir trabajo de fragmentos.

El cielo cubre toda la página con 2.200 cuerpos pequeños, 420 medianos y 24 frontales; en móvil son 700, 120 y 8. Cada viaje cruza el viewport en una línea larga, con dirección y velocidad constantes durante su recorrido. Al llegar al borde se desvanece, aparece desde otro borde y toma un rumbo nuevo. Un 35% viaja también en profundidad: crece y gana brillo al acercarse, y disminuye al alejarse. Los grandes tienen halo suave, estela tenue, más velocidad y parallax. Velocidad de viaje, proporción en profundidad, halo y estela están en el config, junto a cantidades, tamaños y opacidades.

El fondo tiene z-index negativo y la capa frontal pointer-events desactivados. Las máscaras permiten como máximo una candidata frontal tenue por bloque de texto y desvanecen las demás mientras lo cruzan. Mouse y touch provocan esquiva con inercia y retorno a la trayectoria de viaje. Continúan el giroscopio y los eventos pasivos, con touchmove para conservar la estela durante el scroll nativo.

La aurora es otro canvas debajo de las estrellas, generado con un fragment shader de ruido fBm de cuatro octavas y hasta cuatro cortinas. Ondula de forma autónoma; el scroll suavizado cambia su posición, orientación y paleta entre verde, turquesa, violeta y azul. El puntero genera una ondulación local y las máscaras reducen su intensidad detrás del texto. Se renderiza por defecto a 25% de resolución CSS en escritorio y 22% en móvil, configurable hasta media resolución, y se escala suavemente. No usa imágenes ni videos.

El giroscopio solo se activa en dispositivos móviles detectados. Toma la primera orientación válida como referencia, aplica límites y un filtro temporal. El frente se desplaza más que el núcleo, el fondo y la aurora. La inclinación también se suma al ciclo del rayo, sin reemplazarlo. En iOS, requestPermission se invoca dentro del primer gesto táctil válido; no hay botones ni diálogos propios. Android escucha directamente. Si falta el sensor o se rechaza el permiso, el efecto conserva su movimiento normal. Se recalibra al rotar la pantalla. Las pruebas de sensor son simuladas; requieren confirmación adicional en un teléfono físico.

- js/particle-config.js centraliza cantidades, densidad, radios, espesores, velocidades, ciclo 3D, inclinación, colores, opacidades y parámetros de aurora.
- js/cinema-renderer.js simula las C, los hilos de unión y el reloj axial, dibuja la luz y ofrece el panel lil-gui solo en desarrollo. Cada pase de puntos combina centro y halo.
- js/particle-motion.js calcula las dos bases, el margen de encastre, los movimientos independientes y la proyección del rayo.
- js/particle-orientation.js controla permisos, referencia, suavizado y limpieza del sensor.
- js/atmosphere.js calcula los viajes en shaders y administra las capas, máscaras y scroll suavizado.
- js/aurora-renderer.js crea la aurora con resolución reducida.
- js/particle-gpu.js comparte programas, buffers y fuerzas; js/particle-input.js mantiene una estela acotada de puntero.
- js/scroll-story.js conserva la secuencia y la navegación; js/environment.js excluye el panel de producción.

La animación continúa sin scroll ni interacción y fuera de la portada. Solo se suspende al ocultar la pestaña. Al desmontar se abortan listeners, permisos pendientes quedan sin efecto, se cancelan RAF y se liberan observadores, canvas, programas, shaders, buffers, VAO, transform feedback, textura de máscara y framebuffer. El DPR está limitado a 2 y el rayo usa recorte de render para reducir costo. Sin WebGL 2 se conserva la alternativa gráfica.

## Contenido y proyectos

Los títulos y elementos entran con desplazamiento, escala y desenfoque progresivo. Los títulos se revelan por líneas. La navegación permanece visible e incluye proyectos, perfil y contacto; flechas y asteriscos son SVG.

El prisma conserva solo Craft Studio, Animanía y Showroom 3D. Continúan retiradas la sección de tarjetas «Una mirada propia. En cada proyecto.» y las demostraciones de Power BI y automatización.

Las caras se repiten visualmente para mantener vecinos visibles, con contador de tres proyectos únicos y foco solo en la cara activa. La separación es de 18 a 36 px. El ancho de tarjeta es 48% con máximo de 560 px en escritorio, 52% en tablet y 68% con máximo de 360 px en móvil. Las tarjetas móviles conservan 340 px de alto.

El giro automático es lento; el centro del cursor lo detiene y los bordes aumentan la velocidad hasta 72 grados por segundo. Hay flechas, teclado, gestos y pausa. El perfil conserva desarrollo, análisis de datos, automatización e IA con Claude y ChatGPT. El contacto ofrece email y LinkedIn con navegación suave.

## Validación

Las 22 pruebas de Node cubren navegación y prisma, entrada, presupuestos, estela táctil pasiva, ciclo 3D cerrado, planos perpendiculares, bisectriz, margen de los tubos durante el ciclo, límites de configuración, pivote estable, detección móvil, referencia relativa, límites y suavizado, permiso iOS, rechazo y ausencia de sensor. La página local tests/gpu-preview.html verifica GPU, volumen de las dos C, huecos opuestos abiertos, hilo fino y reloj axial de cintura angosta, flujo en ambos sentidos, contragiro y turbulencia de hélices, 71 comprobaciones en total, incluyendo oclusión con posiciones 3D delante y detrás en tres momentos del ciclo, lectura de los dos canales de máscara, atenuación del núcleo y glow, radio proyectado y visibilidad de píxeles de las hélices, velocidad constante durante el viaje, profundidad, reciclado con rumbo nuevo, halo, estela, bokeh y máscaras de texto, autonomía, perturbación y retorno, rayo, aurora visible, cambio con tiempo y scroll, ondulación, máscaras, resolución reducida y liberación de recursos. Sus lecturas de buffers solo existen en las pruebas y no se publican.

Para capturas reproducibles, solo en localhost y modo desarrollo, ?scene-capture=50, ?scene-capture=66.67 y ?scene-capture=83.33 muestran tres poses exactas con interacción neutra. La opción se ignora en producción y no altera su reproducción autónoma.

La revisión manual comprueba consola, interacción fuera del núcleo, distintas secciones y viewport móvil. Un viewport no valida un giroscopio físico ni la presentación real del permiso de Safari. El rendimiento depende del hardware y de cuántas escenas se estén renderizando simultáneamente.

## Publicación

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Vercel CLI publica al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. `vercel.json` usa framework Other, `npm run build` y salida `dist`. No hay sincronización automática con GitHub.
