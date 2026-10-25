# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos, automatizaciones y dashboards interactivos. HTML, CSS y JavaScript sin dependencias de ejecución. Identidad personal en azul noche, marfil y verde salvia junto al logo de Craft Studio.

## Desarrollo

Node.js 20 o posterior. `npm run dev` abre el servidor en http://127.0.0.1:4173. `npm run check` comprueba la sintaxis, `npm test` verifica la velocidad del cursor y la geometría del polígono, y `npm run build` prepara `dist/` con los recursos públicos actuales.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni proyectos históricos. Las fotos originales y la edición anterior permanecen en el repositorio para una posible actualización futura.

## Interacciones

- Portada: tarjetas con una zona de enlace fija y un contenedor visual que hace zoom. El zoom no modifica la zona que detecta el mouse.
- Proyectos: polígono de seis caras que repite los tres proyectos para mantener visibles las caras vecinas. La repetición es visual; los filtros y el contador conservan tres proyectos únicos. Solo la cara activa recibe foco.
- Giro automático: lento fuera de la interacción. Al mover el mouse dentro, el centro detiene el giro; hacia los bordes aumenta gradualmente la velocidad, en el sentido correspondiente. Las flechas, el teclado y los gestos permiten avanzar. Hay botón de pausa y soporte de movimiento reducido.
- Franja: movimiento continuo sin cortes, con velocidad y dirección controladas por el cursor. Se detiene fuera de pantalla, con la pestaña oculta o con preferencia de movimiento reducido.
- Contacto: botones visibles, desplazamiento suave y animación de llegada.

## Contenidos y publicación

Editar textos y enlaces en `index.html`, estilos en `css/portfolio.css`, comportamiento en `js/portfolio.js` y cálculos de movimiento en `js/motion.js`. Los recursos de Craft Studio y Animanía pertenecen al usuario; el destino del showroom se verificó en Craft Studio.

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Publicación directa con Vercel CLI al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. Configuración en `vercel.json`: framework Other, `npm run build`, salida `dist`. No hay sincronización automática con GitHub.
