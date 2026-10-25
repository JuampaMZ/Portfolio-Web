# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales. HTML, CSS y JavaScript sin dependencias de ejecución. Identidad personal en azul noche, marfil y verde salvia junto a Craft Studio.

## Desarrollo

Node.js 20 o posterior. `npm run dev` inicia http://127.0.0.1:4173. `npm run check` comprueba siete módulos, `npm test` verifica geometría, movimiento, daño y física de las partículas, y `npm run build` prepara `dist/` con una lista explícita de recursos públicos.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni demostraciones retiradas. Los archivos históricos se conservan en el repositorio.

## Apertura y simulación de fragmentos

La apertura ocupa toda la pantalla con dos cintas orgánicas entrelazadas y una barra luminosa central. El acabado metálico y el eje salvia mantienen la referencia sutil a Craft Studio. El scroll cambia la orientación de la pieza y presenta tres titulares.

La fragmentación usa un sistema de partículas con estado persistente: cada fragmento tiene posición, velocidad, masa, radio y anclaje a la superficie. Se reemplazaron los recorridos calculados directamente con senos y el rebote que recolocaba puntos en una circunferencia.

- `js/particle-physics.js`: muestreo irregular de las cintas, integración a paso fijo de 1/60 s, inercia, resortes amortiguados, núcleo esférico localizado sobre la superficie original, choques que reflejan la velocidad relativa al núcleo, y contactos entre fragmentos mediante una rejilla espacial. Incluye intercambio local de velocidad, cohesión suave y absorción final en la superficie. Es una simulación de partículas; no un solver completo de fluidos.
- `js/cinema-renderer.js`: superficie implícita y fragmentos WebGL. Los fragmentos reciben posiciones y velocidades calculadas por el simulador. Se usa un búfer de profundidad mediante EXT_frag_depth cuando está disponible, para ocultar los que pasan detrás de la pieza. Sin esa extensión se conserva una alternativa por distancia a la superficie.
- `js/cinema-particles.js`: impacto según velocidad del cursor y memoria de cinco zonas de daño. La recuperación visual de la superficie también tiene en cuenta cuánto se han separado los fragmentos de sus anclajes.
- `js/scroll-story.js`: captura del cursor, scroll nativo, pausa, movimiento reducido y aparición de contenido con IntersectionObserver.
- `js/scroll-math.js`: capítulos y transiciones sin titulares superpuestos.

La velocidad del mouse modifica el alcance y la fuerza del impacto. El núcleo permanece activo al detenerlo y las partículas chocan con su volumen en 3D. Al apartarlo, las fuerzas elásticas las devuelven a los anclajes móviles de la pieza. El muestreo irregular evita las filas repetidas del sistema anterior.

El banco contiene 18.000 muestras en escritorio y 6.000 en móvil. Se limita a 3.200 y 1.200 fragmentos activos, respectivamente; solo se envían al render los activos. La simulación duerme cuando no hay daño ni fragmentos pendientes. El render tiene resolución limitada y un objetivo aproximado de 30 fps; la integración física es independiente de la frecuencia de dibujo.

La pausa conserva posiciones y velocidades. Fuera de vista o con la pestaña oculta se detiene el render. Con movimiento reducido la escena es estática. Sin WebGL se presenta el logo SVG. En ventanas de hasta 520 px de alto se elimina el tramo de scroll prolongado. Los gestos táctiles no generan destrucción ni interfieren con el desplazamiento.

## Contenido y proyectos

Los títulos y elementos entran con desplazamiento, escala y desenfoque progresivo. Los títulos se revelan por líneas. La navegación permanece visible e incluye proyectos, perfil y contacto; flechas y asteriscos son SVG.

El prisma conserva solo Craft Studio, Animanía y Showroom 3D. Continúan retiradas la sección de tarjetas «Una mirada propia. En cada proyecto.» y las demostraciones de Power BI y automatización.

Las caras se repiten visualmente para mantener vecinos visibles, con contador de tres proyectos únicos y foco solo en la cara activa. La separación es de 18 a 36 px. El ancho de tarjeta es 48% con máximo de 560 px en escritorio, 52% en tablet y 68% con máximo de 360 px en móvil. Las tarjetas móviles conservan 340 px de alto.

El giro automático es lento; el centro del cursor lo detiene y los bordes aumentan la velocidad hasta 72 grados por segundo. Hay flechas, teclado, gestos y pausa. El perfil conserva desarrollo, análisis de datos, automatización e IA con Claude y ChatGPT. El contacto ofrece email y LinkedIn con navegación suave.

## Validación

Las pruebas verifican las transiciones, la respuesta a la velocidad y la memoria de daño, además de muestreo de superficie, inercia, restitución con pérdida de energía, exclusión del núcleo, reconstrucción completa con la pieza en movimiento, pausa y estabilidad entre frecuencias de dibujo. La revisión visual comprueba oclusión, interacción, composición móvil y controles del portfolio.

## Publicación

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Vercel CLI publica al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. `vercel.json` usa framework Other, `npm run build` y salida `dist`. No hay sincronización automática con GitHub.
