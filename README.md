# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos, automatizaciones y dashboards interactivos. HTML, CSS y JavaScript sin dependencias de ejecución. Identidad personal en azul noche, marfil y verde salvia junto al logo de Craft Studio.

## Desarrollo

Node.js 20 o posterior. `npm run dev` abre el servidor en http://127.0.0.1:4173. `npm run check` comprueba la sintaxis, `npm test` verifica la velocidad del cursor y la geometría del polígono, y `npm run build` prepara `dist/` con los recursos públicos actuales.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni proyectos históricos. Las fotos originales y la edición anterior permanecen en el repositorio para una posible actualización futura.

## Interacciones

- Portada: tarjetas con una zona de enlace fija y un contenedor visual que hace zoom. El zoom no modifica la zona que detecta el mouse.
- Proyectos: un polígono muestra cinco tarjetas únicas. Para filtros con dos o tres tarjetas se repiten caras visualmente, manteniendo el contador de elementos únicos. Solo la cara activa recibe foco.
- Giro automático: lento fuera de la interacción. Al mover el mouse dentro, el centro detiene el giro; hacia los bordes aumenta gradualmente la velocidad, en el sentido correspondiente. Las flechas, el teclado y los gestos permiten avanzar. Hay botón de pausa y soporte de movimiento reducido.
- Franja: movimiento continuo sin cortes, con velocidad y dirección controladas por el cursor. Se detiene fuera de pantalla, con la pestaña oculta o con preferencia de movimiento reducido.
- Contacto: botones visibles, desplazamiento suave y animación de llegada.

## Contenidos y publicación

Editar textos y enlaces en `index.html`, estilos en `css/portfolio.css`, comportamiento en `js/portfolio.js` y cálculos de movimiento en `js/motion.js`. Los recursos de Craft Studio y Animanía pertenecen al usuario; el destino del showroom se verificó en Craft Studio.

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Publicación directa con Vercel CLI al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. Configuración en `vercel.json`: framework Other, `npm run build`, salida `dist`. No hay sincronización automática con GitHub.

Las caras del polígono tienen una separación adaptable de 18 a 36 px, con borde y sombras de espesor. La detección del cursor cubre todo el ancho de la pantalla mientras está a la altura del carrusel, incluidos los márgenes exteriores. La velocidad máxima llega a 72 grados por segundo; el centro conserva su zona de pausa.

En pantallas de hasta 700 px, las tarjetas del prisma miden 340 px y muestran solo título, resumen breve y acceso al proyecto. Los asteriscos decorativos son SVG para evitar la representación como emoji en celulares. El título principal incluye «Analista de datos».

La navegación permanece visible al desplazarse. En móvil incluye un acceso permanente «Hablemos», menú compacto y botones de contacto de ancho completo. Las flechas y los controles usan SVG para mantener el mismo aspecto en todos los dispositivos. Los textos de portada, proyectos, perfil y contacto se reescribieron con un enfoque directo en software, datos y automatización.

## Demostraciones visuales

Se agregaron dos tarjetas autorizadas por el usuario como demostraciones, sin atribuirles datos reales, clientes o integraciones activas:

- `assets/dashboard-demo.svg`: diseño vectorial original inspirado en Power BI. Datos ficticios consistentes: 128.400 USD, 642 pedidos y ticket medio de 200 USD. Gráficos mensuales, categorías y regiones.
- `assets/automation-demo.jpg`: ilustración creada con la herramienta integrada ImageGen y optimizada a JPEG. Prompt final: ilustración editorial 3D horizontal, fondo azul noche, acentos verde salvia y cian, cinco módulos de vidrio y metal unidos por conexiones luminosas; entrada por email, validación, núcleo de IA, registro y confirmación; perspectiva isométrica e iluminación cinematográfica; sin texto, marcas ni personas. Es una ilustración conceptual, no una captura de un sistema real.

Ambas se amplían en diálogos accesibles y cuentan con filtros propios. El giro del prisma se pausa mientras la ampliación está abierta. El bloque de contacto restaura «¿Hacemos algo que se destaque?» y la portada presenta «Desarrollo de software. Ideas que toman forma».
