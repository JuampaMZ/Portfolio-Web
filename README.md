# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales. HTML, CSS y JavaScript sin dependencias de ejecución. Identidad personal en azul noche, marfil y verde salvia junto a Craft Studio.

## Desarrollo

Node.js 20 o posterior. `npm run dev` inicia http://127.0.0.1:4173. `npm run check` comprueba seis módulos, `npm test` verifica el movimiento del prisma, las transiciones de texto y la memoria de desintegración, y `npm run build` prepara `dist/` con una lista explícita de recursos públicos.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni recursos de demostraciones retiradas. Los archivos históricos se conservan en el repositorio.

## Apertura orgánica e interacción líquida

La apertura ocupa toda la pantalla. Se recupera la forma orgánica original de dos cintas entrelazadas, con superficie metálica. Una barra luminosa vertical atraviesa el centro y aporta una referencia sutil al eje de la marca Craft Studio; incluye núcleo claro, halo salvia y un pulso luminoso que recorre su altura. El scroll modifica la orientación de la pieza y presenta tres titulares.

La interacción desintegra la superficie situada bajo el mouse. Los fragmentos nacen de los parámetros de las mismas cintas y se desplazan en un campo de flujo continuo. El material y sus fragmentos comparten una memoria de zonas afectadas, de modo que la superficie se abre, deja salir las partículas y se recompone al retirar el cursor. La rotura sigue la posición directa del mouse; la inclinación general conserva suavizado.

- `js/cinema-renderer.js`: render WebGL en dos pasadas, superficie con desintegración local y puntos anclados a la geometría. Banco de 48.000 muestras en escritorio y 24.000 en móvil; solo se dibujan fragmentos de las zonas afectadas. La barra tiene iluminación y halo con oclusión por la superficie.
- `js/cinema-particles.js`: memoria limitada a cinco zonas de daño, con crecimiento y recuperación gradual. No hay puntos flotantes decorativos, órbitas ni retículas del efecto anterior.
- `js/scroll-story.js`: scroll nativo, texto por líneas y aparición de secciones con IntersectionObserver. Detiene el render fuera de vista o con la pestaña oculta. La pausa conserva la forma y el estado de los fragmentos.
- `js/scroll-math.js`: capítulos y transiciones sin superponer titulares.
- `css/scroll-story.css`: composición adaptable y alternativa estática con el logo SVG.

El efecto es una animación visual de flujo y reconstrucción, sin simulación física de fluidos. No usa servicios externos de IA, videos ni modelos descargados. El render tiene resolución acotada y un objetivo aproximado de 30 fps. En móvil conserva la pieza y la luz con una carga menor; los gestos táctiles no generan destrucción ni interfieren con el scroll.

Con movimiento reducido la escena es estática. Sin WebGL se presenta el logo vectorial. En ventanas de hasta 520 px de alto se elimina el tramo de scroll prolongado. Las capas decorativas no bloquean enlaces ni navegación.

## Proyectos y perfil

El prisma presenta únicamente Craft Studio, Animanía y Showroom 3D. Los filtros son todos, sitios web y espacios 3D. Se retiraron la sección de tarjetas de portada «Una mirada propia. En cada proyecto.» y las demostraciones de Power BI y automatización.

Con tres proyectos se repiten caras visuales para mantener vecinos visibles en el polígono; el contador representa tres proyectos únicos. Solo la cara activa recibe foco. Las caras tienen una separación adaptable de 18 a 36 px y sombras de profundidad.

El giro automático es lento. El centro del cursor lo detiene y los bordes aumentan la velocidad hasta 72 grados por segundo, en la dirección correspondiente. También hay flechas, teclado, gestos y pausa. En móvil las tarjetas miden 340 px y muestran título, resumen breve y acceso al proyecto.

La navegación permanece visible e incluye acceso directo a proyectos, perfil y contacto. Flechas y asteriscos son SVG. El contacto ofrece email y LinkedIn con navegación suave. El perfil conserva desarrollo, análisis de datos, automatización e IA con Claude y ChatGPT.

## Publicación

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Publicación directa con Vercel CLI al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. `vercel.json` usa framework Other, `npm run build` y salida `dist`. No hay sincronización automática con GitHub.
