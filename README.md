# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales, con la identidad de Craft Studio en azul noche, marfil y verde salvia. HTML, CSS y JavaScript sin dependencias de ejecución.

## Desarrollo

Node.js 20 o posterior. `npm run dev` inicia el servidor en http://127.0.0.1:4173. `npm run check` comprueba los seis módulos, `npm test` verifica el movimiento del prisma y las transiciones de texto, y `npm run build` prepara `dist/` con una lista explícita de recursos públicos.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni recursos de demostraciones retiradas. Los archivos históricos se conservan en el repositorio.

## Apertura y efecto holográfico

La apertura ocupa toda la pantalla y presenta una versión tridimensional del emblema de Craft Studio: dos semianillos enfrentados y un eje vertical, con proporciones tomadas de `assets/craft-mark.svg`. El volumen tiene biseles, acabado metálico y un eje iluminado. El scroll controla la vuelta del emblema y el avance de tres titulares, con oscilación lenta e iluminación que responde al mouse.

- `js/cinema-renderer.js`: geometría e iluminación en WebGL, sin bibliotecas o modelos externos. Resolución limitada y render de aproximadamente 30 fps.
- `js/cinema-particles.js`: efecto holográfico de tres órbitas segmentadas, pulsos cuadrados que recorren los trazados y una pequeña retícula en perspectiva. El cursor ilumina segmentos cercanos y produce pulsos breves con un indicador abierto. Reemplaza el campo anterior de puntos flotantes y estelas.
- `js/scroll-story.js`: scroll nativo, texto por líneas y aparición de secciones con IntersectionObserver. La animación se detiene fuera de vista o con la pestaña oculta. El botón de pausa afecta al emblema y al holograma.
- `js/scroll-math.js`: cálculo de capítulos y transiciones sin superponer los titulares.
- `css/scroll-story.css`: composición adaptable y alternativa estática con el logo SVG.

Las capas decorativas no interceptan enlaces ni gestos táctiles. Con movimiento reducido se muestra una escena estática; sin WebGL se usa el logo vectorial. En ventanas de hasta 520 px de alto se elimina el tramo de scroll prolongado. La navegación permanece visible y permite saltar directamente a proyectos y contacto.

## Proyectos

El prisma presenta exactamente tres proyectos: Craft Studio, Animanía y Showroom 3D. Los filtros son todos, sitios web y espacios 3D. Se retiraron la sección de tarjetas de portada «Una mirada propia. En cada proyecto.», las demostraciones de Power BI y automatización, sus diálogos y sus recursos de la publicación.

Con tres proyectos se repiten caras visuales para mantener vecinos visibles en el polígono; el contador representa los tres proyectos únicos. Solo la cara activa recibe foco. Las caras tienen una separación adaptable de 18 a 36 px y sombras de profundidad.

El giro automático es lento. El centro del cursor lo detiene y los bordes de la pantalla aumentan gradualmente la velocidad hasta 72 grados por segundo, con dirección correspondiente. También hay flechas, teclado, gestos y control de pausa. En móvil, las tarjetas miden 340 px y muestran título, resumen breve y acceso al proyecto.

Los asteriscos y las flechas usan SVG para conservar su aspecto en celulares. El contacto incluye email y LinkedIn con navegación suave y animación de llegada. El perfil conserva la presentación de desarrollo, análisis de datos, automatización e IA con Claude y ChatGPT.

## Publicación

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Publicación directa con Vercel CLI al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. `vercel.json` usa framework Other, `npm run build` y salida `dist`. No hay sincronización automática con GitHub.
