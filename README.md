# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales. HTML, CSS y JavaScript sin dependencias de ejecución. Identidad personal en azul noche, marfil y verde salvia junto a Craft Studio.

## Desarrollo

Node.js 20 o posterior. `npm run dev` inicia http://127.0.0.1:4173. `npm run check` comprueba siete módulos, `npm test` verifica geometría, movimiento y muestreo de las partículas, y `npm run build` prepara `dist/` con una lista explícita de recursos públicos.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni demostraciones retiradas. Los archivos históricos se conservan en el repositorio.

## Apertura de partículas en GPU

La silueta de las cintas entrelazadas está formada por 40.000 partículas azules y violetas, con brillo suave y mezcla aditiva. Una imagen de la escultura se rasteriza en un canvas fuera de pantalla y sus píxeles visibles se convierten en anclajes, conservando los huecos de la forma. Este muestreo ocurre solo al iniciar o redimensionar.

La simulación usa WebGL 2 Transform Feedback con dos buffers alternados de posición y velocidad. El vertex shader hace el ensamblado de dos segundos, el curl noise analítico sutil, la repulsión del cursor, la inercia, el resorte amortiguado y el impulso radial al hacer clic. No se recorren partículas ni se leen sus estados desde JavaScript durante los frames de producción. La intensidad y el tamaño dependen de la imagen y la profundidad.

- js/cinema-renderer.js: PARTICLE_CONFIG al inicio del archivo expone cantidad, tamaño, radio y fuerza de repulsión, resorte, amortiguación, respiración, explosión, colores, brillo y límite de DPR. La API ofrece resize, draw, explode y dispose.
- js/particle-shape.js: rasterización de la escultura y muestreo reproducible de píxeles visibles.
- js/scroll-story.js: scroll, textos animados, cursor, clic, pausa y ciclo de vida. Devuelve una función de desmontaje que aborta listeners, desconecta observadores, cancela los RAF y libera el renderer.
- js/environment.js: modo de desarrollo explícito. El build genera false en producción. lil-gui es una dependencia de desarrollo y se importa dinámicamente solo en local y en ese modo; no se copia a dist.

En móvil se usan 14.000 partículas; en móviles con poca memoria, 10.000. El DPR nunca supera 2 y también se limita la superficie de render. El objetivo es 60 fps; el rendimiento final depende del hardware. El panel local permite probar entre 20.000 y 60.000 partículas de escritorio y ajustar los parámetros sin editar el código.

La forma se recalcula al cambiar el tamaño. Con prefers-reduced-motion se dibuja ensamblada, sin simulación continua ni explosión. Sin WebGL 2 se conserva el logo SVG estático. La pausa detiene el estado; fuera de vista o con la pestaña oculta se suspende el RAF. El desmontaje elimina buffers, VAO, transform feedback, programas, shaders y el panel con sus listeners. Los gestos táctiles conservan el desplazamiento normal y el toque genera la explosión.

## Contenido y proyectos

Los títulos y elementos entran con desplazamiento, escala y desenfoque progresivo. Los títulos se revelan por líneas. La navegación permanece visible e incluye proyectos, perfil y contacto; flechas y asteriscos son SVG.

El prisma conserva solo Craft Studio, Animanía y Showroom 3D. Continúan retiradas la sección de tarjetas «Una mirada propia. En cada proyecto.» y las demostraciones de Power BI y automatización.

Las caras se repiten visualmente para mantener vecinos visibles, con contador de tres proyectos únicos y foco solo en la cara activa. La separación es de 18 a 36 px. El ancho de tarjeta es 48% con máximo de 560 px en escritorio, 52% en tablet y 68% con máximo de 360 px en móvil. Las tarjetas móviles conservan 340 px de alto.

El giro automático es lento; el centro del cursor lo detiene y los bordes aumentan la velocidad hasta 72 grados por segundo. Hay flechas, teclado, gestos y pausa. El perfil conserva desarrollo, análisis de datos, automatización e IA con Claude y ChatGPT. El contacto ofrece email y LinkedIn con navegación suave.

## Validación

Las 10 pruebas de Node verifican transiciones, prisma, muestreo de píxeles con huecos, reproducibilidad y reducción de carga móvil. Después de npm run dev, tests/gpu-preview.html ofrece 12 comprobaciones reales de WebGL: compilación, ensamblado, repulsión, resorte, explosión y retorno, pausa, forma estática, resize, ausencia de errores GPU y liberación de recursos. Solo esa página de prueba lee muestras del estado GPU para verificar los resultados; no se publica.

La revisión visual en local comprobó la interacción y el panel, con aproximadamente 60 fps en el navegador de prueba con 40.000 y 60.000 partículas. La vista móvil de 390 px reduce la cantidad a 14.000 y no tiene desborde horizontal. Esa emulación no sustituye una medición de rendimiento sobre un teléfono físico.

## Publicación

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Vercel CLI publica al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. `vercel.json` usa framework Other, `npm run build` y salida `dist`. No hay sincronización automática con GitHub.
