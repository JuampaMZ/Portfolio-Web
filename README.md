# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales. HTML, CSS y JavaScript sin dependencias de ejecución. Identidad personal en azul noche, marfil y verde salvia junto a Craft Studio.

## Desarrollo

Node.js 20 o posterior. `npm run dev` inicia http://127.0.0.1:4173. `npm run check` comprueba siete módulos, `npm test` verifica geometría, movimiento, daño y física de las partículas, y `npm run build` prepara `dist/` con una lista explícita de recursos públicos.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni demostraciones retiradas. Los archivos históricos se conservan en el repositorio.

## Apertura y fragmentación sólida

La apertura ocupa toda la pantalla con dos cintas orgánicas entrelazadas y una barra luminosa central. La superficie conserva su forma y su acabado metálico. El scroll cambia la orientación de la pieza y presenta tres titulares.

Solo el desplazamiento real del mouse sobre la superficie original genera rotura. La rotación de la pieza, un cursor quieto y los cráteres existentes no emiten fragmentos. Los cortes están anclados al espacio de la pieza, con bordes definidos y sin deformación líquida. Las trayectorias rápidas se muestrean en hasta 16 contactos por frame para evitar saltos entre posiciones del cursor.

- js/particle-physics.js: muestras irregulares sobre las cintas, posición y velocidad persistentes, integración a paso fijo de 1/120 s y gravedad de cuadrado inverso suavizada. Los fragmentos reciben momento tangencial al romperse; su órbita surge de la integración, sin trayectoria circular impuesta. El núcleo esférico refleja la velocidad de los fragmentos que lo golpean. Al salir el cursor, una fase de captura los devuelve a sus anclajes móviles y se cierran los cortes.
- js/cinema-renderer.js: superficie implícita con hasta 24 cortes locales. Los fragmentos son mallas de ocho caras planas, con rotación, iluminación metálica y profundidad. ANGLE_instanced_arrays dibuja las mallas en una llamada; sin esa extensión se expanden los mismos triángulos. EXT_frag_depth permite ocultarlos detrás de la pieza; sin esa extensión hay una alternativa por distancia a la superficie.
- js/cinema-particles.js: impacto según velocidad del mouse y núcleo compacto de 16 a 26 píxeles CSS. La velocidad amplía la fractura y el impulso inicial.
- js/scroll-story.js: captura del cursor, scroll nativo, pausa, movimiento reducido y aparición de contenido con IntersectionObserver.
- js/scroll-math.js: capítulos y transiciones sin titulares superpuestos.

El centro de gravedad sigue al mouse sobre un plano de profundidad estable, fijado al primer contacto. No hay viscosidad, cohesión ni ruido que deforme o rompa la pieza. La gravedad actúa únicamente sobre los fragmentos desprendidos. Mantener el cursor quieto conserva el núcleo y las órbitas.

El banco contiene 26.000 muestras en escritorio y 9.000 en móvil. Se limita a 2.000 y 700 fragmentos activos, respectivamente; solo se envían al render los activos. El render tiene resolución limitada y un objetivo aproximado de 30 fps; la integración física es independiente de la frecuencia de dibujo.

La pausa conserva posiciones, velocidades y cortes. Fuera de vista o con la pestaña oculta se detiene el render. Con movimiento reducido la escena es estática. Sin WebGL se presenta el logo SVG. En ventanas de hasta 520 px de alto se elimina el tramo de scroll prolongado. Los gestos táctiles no generan destrucción ni interfieren con el desplazamiento.

## Contenido y proyectos

Los títulos y elementos entran con desplazamiento, escala y desenfoque progresivo. Los títulos se revelan por líneas. La navegación permanece visible e incluye proyectos, perfil y contacto; flechas y asteriscos son SVG.

El prisma conserva solo Craft Studio, Animanía y Showroom 3D. Continúan retiradas la sección de tarjetas «Una mirada propia. En cada proyecto.» y las demostraciones de Power BI y automatización.

Las caras se repiten visualmente para mantener vecinos visibles, con contador de tres proyectos únicos y foco solo en la cara activa. La separación es de 18 a 36 px. El ancho de tarjeta es 48% con máximo de 560 px en escritorio, 52% en tablet y 68% con máximo de 360 px en móvil. Las tarjetas móviles conservan 340 px de alto.

El giro automático es lento; el centro del cursor lo detiene y los bordes aumentan la velocidad hasta 72 grados por segundo. Hay flechas, teclado, gestos y pausa. El perfil conserva desarrollo, análisis de datos, automatización e IA con Claude y ChatGPT. El contacto ofrece email y LinkedIn con navegación suave.

## Validación

Las 19 pruebas verifican transiciones y prisma, núcleo compacto, muestreo sobre la superficie, contacto exclusivo para emitir fragmentos, alcance según velocidad, gravedad y órbita libre, inercia, restitución, exclusión del núcleo, reconstrucción con la pieza en movimiento, pausa y estabilidad entre frecuencias de dibujo. La revisión visual comprueba fragmentos con volumen, oclusión, interacción y composición móvil.

## Publicación

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Vercel CLI publica al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. `vercel.json` usa framework Other, `npm run build` y salida `dist`. No hay sincronización automática con GitHub.
