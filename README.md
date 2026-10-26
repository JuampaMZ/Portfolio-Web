# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales. HTML, CSS y JavaScript sin dependencias de ejecución. Identidad personal en azul noche, marfil y verde salvia junto a Craft Studio.

## Desarrollo

Node.js 20 o posterior. `npm run dev` inicia http://127.0.0.1:4173. `npm run check` comprueba diez módulos, `npm test` verifica geometría, entrada, presupuestos e interacción de las partículas, y `npm run build` prepara `dist/` con una lista explícita de recursos públicos.

El build verifica su ruta absoluta antes de limpiar únicamente `dist/`. No publica fotos, CV, certificados ni demostraciones retiradas. Los archivos históricos se conservan en el repositorio.

## Núcleo orbital y galaxia en GPU

La entrada enciende el rayo progresivamente, ensambla partículas dispersas en las órbitas y revela los textos al terminar el ensamblado. Por defecto el rayo tarda 1,7 s; las partículas llegan entre 0,65 y 3,45 s; el texto aparece de 3,55 a 4,6 s. La navegación permanece disponible desde el inicio. Un resize conserva el avance de la entrada.

El núcleo tiene 32.000 partículas en escritorio y 10.000 en móvil. Cuatro anillos con radios, inclinaciones, ejes y velocidades diferentes rodean el rayo fijo. Una nube volumétrica gira con curl noise analítico. Ciclos individuales de duración y fase distintas hacen que grupos entren en espiral y salgan para reincorporarse. El rayo tiene un shader óptico independiente, halo y pulso suave.

Todas las posiciones y velocidades se integran en GPU mediante WebGL 2 Transform Feedback y buffers alternados. Los destinos orbitales cambian con el tiempo; una fuerza de resorte amortiguada permite perturbaciones y retorno continuo a esas trayectorias móviles. Las semillas se generan en el shader. No hay bucles por partícula ni lectura de sus estados en JavaScript durante la producción.

La galaxia usa 1.800 partículas de fondo y 24 cercanas; en móvil se reduce a 600 y 8, también en dispositivos con puntero táctil de mayor ancho. El canvas trasero es fijo y tiene z-index negativo dentro del contexto aislado del body. El frontal tiene pointer-events desactivados, baja opacidad y puntos grandes desenfocados. Una distribución por celdas y máscaras calculadas sobre los textos limitan la superposición. Hay deriva, parpadeo lento, parallax por profundidad y nebulosas muy tenues.

- js/particle-config.js centraliza todos los parámetros: cantidades por capa, radios, velocidades, inclinaciones, colores, opacidades, interacción y tiempos de entrada.
- js/cinema-renderer.js dibuja y simula el núcleo y su rayo; su panel lil-gui solo se importa en desarrollo.
- js/atmosphere.js simula las estrellas en GPU, protege los textos y administra las capas y nebulosas.
- js/particle-gpu.js comparte matemáticas, programas y buffers de simulación con limpieza explícita.
- js/particle-input.js mantiene hasta ocho muestras de puntero. Mouse y dedo comparten el campo de repulsión; una estela decae tras retirar el dedo. Los listeners son pasivos, con touchmove como continuidad del gesto cuando el navegador toma el scroll nativo. No se captura el puntero ni se bloquea el desplazamiento.
- js/scroll-story.js coordina la entrada, los textos y el scroll, y devuelve la función de desmontaje.
- js/environment.js tiene un indicador explícito que el build cambia a false. El panel y las pruebas no se copian a producción.

El núcleo y la galaxia se animan autónomamente aunque no haya scroll, interacción o estén fuera de la portada. El efecto no tiene botón de pausa ni pausa por preferencias de movimiento. Solo se suspende su render cuando document.hidden es verdadero; al volver se conserva el tiempo de simulación. El resto de controles del prisma pertenece a sus proyectos y conserva su funcionamiento.

El DPR nunca supera 2; se limita además la superficie de render y se dibuja la luz dentro de un rectángulo estrecho para evitar sombrear toda la pantalla. El objetivo es 60 fps, según el hardware. Sin WebGL 2 permanece el logo como alternativa. Al desmontar se abortan listeners, se cancelan RAF, se desconectan observadores y se eliminan canvas, nebulosas, programas, shaders, buffers, VAO y transform feedback.

## Contenido y proyectos

Los títulos y elementos entran con desplazamiento, escala y desenfoque progresivo. Los títulos se revelan por líneas. La navegación permanece visible e incluye proyectos, perfil y contacto; flechas y asteriscos son SVG.

El prisma conserva solo Craft Studio, Animanía y Showroom 3D. Continúan retiradas la sección de tarjetas «Una mirada propia. En cada proyecto.» y las demostraciones de Power BI y automatización.

Las caras se repiten visualmente para mantener vecinos visibles, con contador de tres proyectos únicos y foco solo en la cara activa. La separación es de 18 a 36 px. El ancho de tarjeta es 48% con máximo de 560 px en escritorio, 52% en tablet y 68% con máximo de 360 px en móvil. Las tarjetas móviles conservan 340 px de alto.

El giro automático es lento; el centro del cursor lo detiene y los bordes aumentan la velocidad hasta 72 grados por segundo. Hay flechas, teclado, gestos y pausa. El perfil conserva desarrollo, análisis de datos, automatización e IA con Claude y ChatGPT. El contacto ofrece email y LinkedIn con navegación suave.

## Validación

Las 9 pruebas de Node cubren prisma, transiciones, secuencia de entrada, presupuestos de escritorio y móvil, listeners pasivos, estela táctil y limpieza de la entrada. Con npm run dev, tests/gpu-preview.html ejecuta 22 comprobaciones reales de GPU: movimiento autónomo, perturbación con inercia, recuperación de órbitas móviles, rayo independiente, resize sin reiniciar la entrada, valores finitos, galaxia y liberación completa de recursos. Solo esa página lee muestras de buffers para verificar resultados; no se publica.

La revisión visual verifica escritorio, móvil, legibilidad del perfil y continuidad del reloj del núcleo al navegar fuera de la portada. El navegador local rondó los 60 fps con la configuración por defecto; el rendimiento de un teléfono físico requiere medir en ese dispositivo.

## Publicación

Sitio: https://juan-pablo-craft-portfolio.vercel.app/

Vercel CLI publica al proyecto `juan-pablo-craft-portfolio` del equipo `juans-projects-079dba21`. `vercel.json` usa framework Other, `npm run build` y salida `dist`. No hay sincronización automática con GitHub.
