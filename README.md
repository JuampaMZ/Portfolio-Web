# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos, automatizaciones y dashboards interactivos. HTML, CSS y JavaScript sin dependencias de ejecución. Identidad personal en azul noche, marfil y verde salvia junto al logo de Craft Studio.

## Desarrollo

Node.js 20 o posterior. `npm run dev` abre el servidor en http://127.0.0.1:4173. `npm run check` comprueba la sintaxis de los módulos, `npm test` verifica el movimiento del polígono y las transiciones del recorrido, y `npm run build` prepara `dist/` con los recursos públicos actuales.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni proyectos históricos. Las fotos originales y la edición anterior permanecen en el repositorio para una posible actualización futura.

## Interacciones

- Portada: tarjetas con una zona de enlace fija y un contenedor visual que hace zoom. El zoom no modifica la zona que detecta el mouse.
- Proyectos: un polígono muestra cinco tarjetas únicas. Para filtros con dos o tres tarjetas se repiten caras visualmente, manteniendo el contador de elementos únicos. Solo la cara activa recibe foco.
- Giro automático: lento fuera de la interacción. Al mover el mouse dentro, el centro detiene el giro; hacia los bordes aumenta gradualmente la velocidad, en el sentido correspondiente. Las flechas, el teclado y los gestos permiten avanzar. Hay botón de pausa y soporte de movimiento reducido.
- Franja: movimiento continuo sin cortes, con velocidad y dirección controladas por el cursor. Se detiene fuera de pantalla, con la pestaña oculta o con preferencia de movimiento reducido.
- Contacto: botones visibles, desplazamiento suave y animación de llegada.

## Recorrido por scroll

El enlace «Recorrido» abre una escena sticky en tres capítulos: software, datos y automatización. El desplazamiento nativo controla la perspectiva, el cubo de Craft Studio, las ventanas flotantes, la entrada de cada línea de texto y el indicador de avance. Al retroceder, la secuencia vuelve con el scroll. Las escenas se construyen con CSS 3D y recursos propios del portfolio; no se copian imágenes ni código de la referencia visual.

`css/scroll-story.css` define las escenas y su composición vertical para móvil. `js/scroll-story.js` actualiza la escena con eventos pasivos y requestAnimationFrame, y revela textos del resto de la página con IntersectionObserver. `js/scroll-math.js` calcula los capítulos y evita textos superpuestos durante los cambios. No se intercepta la rueda ni los gestos de desplazamiento.

Sin JavaScript, con preferencia de movimiento reducido o en ventanas de hasta 520 px de alto, los tres capítulos se muestran como contenido estático legible. Los accesos a trabajo y contacto permiten saltar el recorrido. La navegación permanece visible e incorpora una línea de progreso general.

## Contenidos y publicación

Editar textos y enlaces en `index.html`, estilos en `css/portfolio.css`, comportamiento en `js/portfolio.js` y cálculos de movimiento en `js/motion.js`. Los recursos de Craft Studio y Animanía pertenecen al usuario; el destino del showroom se verificó en Craft Studio.

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Publicación directa con Vercel CLI al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. Configuración en `vercel.json`: framework Other, `npm run build`, salida `dist`. No hay sincronización automática con GitHub.

Las caras del polígono tienen una separación adaptable de 18 a 36 px, con borde y sombras de espesor. La detección del cursor cubre todo el ancho de la pantalla mientras está a la altura del carrusel, incluidos los márgenes exteriores. La velocidad máxima llega a 72 grados por segundo; el centro conserva su zona de pausa.

En pantallas de hasta 700 px, las tarjetas del prisma miden 340 px y muestran solo título, resumen breve y acceso al proyecto. Los asteriscos decorativos son SVG para evitar la representación como emoji en celulares. «Analista de datos» se presenta en la etiqueta profesional y el perfil; el título principal se concentra en desarrollo de software.

La navegación permanece visible al desplazarse. En móvil incluye un acceso permanente «Hablemos», menú compacto y botones de contacto de ancho completo. Las flechas y los controles usan SVG para mantener el mismo aspecto en todos los dispositivos. Los textos de portada, proyectos, perfil y contacto se reescribieron con un enfoque directo en software, datos y automatización.

## Demostraciones visuales

Se agregaron dos tarjetas autorizadas por el usuario como demostraciones, sin atribuirles datos reales, clientes o integraciones activas:

- `assets/dashboard-demo.svg`: diseño vectorial original inspirado en Power BI. Datos ficticios consistentes: 128.400 USD, 642 pedidos y ticket medio de 200 USD. Gráficos mensuales, categorías y regiones.
- `assets/automation-demo.jpg`: ilustración creada con la herramienta integrada ImageGen y optimizada a JPEG. Prompt final: ilustración editorial 3D horizontal, fondo azul noche, acentos verde salvia y cian, cinco módulos de vidrio y metal unidos por conexiones luminosas; entrada por email, validación, núcleo de IA, registro y confirmación; perspectiva isométrica e iluminación cinematográfica; sin texto, marcas ni personas. Es una ilustración conceptual, no una captura de un sistema real.

Ambas se amplían en diálogos accesibles y cuentan con filtros propios. El giro del prisma se pausa mientras la ampliación está abierta. El bloque de contacto restaura «¿Hacemos algo que se destaque?» y la portada presenta «Desarrollo de software. Ideas que toman forma».
