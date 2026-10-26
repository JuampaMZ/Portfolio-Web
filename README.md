# Juan Pablo Muttoni — Portfolio

Portfolio en español de desarrollo de software, análisis de datos y experiencias digitales. Identidad personal en azul noche, marfil y verde salvia junto a Craft Studio. HTML, CSS y módulos JavaScript; Three.js para el núcleo 3D.

## Desarrollo

Node.js 20 o posterior. `npm install`, `npm run dev` (http://127.0.0.1:4173), `npm run check`, `npm test` y `npm run build`.

El build empaqueta Three.js y los addons usados con esbuild en `assets/three-runtime.js`, sin CDN ni imports externos en el sitio. Solo copia una lista explícita de recursos públicos a `dist/`, tras verificar la ruta absoluta. El build escribe `IS_DEVELOPMENT=false`; las pruebas y dependencias de desarrollo no se publican. lil-gui solo se carga en localhost y desarrollo.

## Núcleo 3D y profundidad

El commit `562cd6d` guarda el estado anterior a esta reconstrucción. Se eliminan el rayo calculado en pantalla, la textura de máscara, la clasificación manual delantera/trasera y todos los parámetros y shaders de la mezcla de hélices reciente.

La escena usa una `PerspectiveCamera` real de 48°, frente a la proyección manual anterior equivalente a unos 21,5°. El rayo es un `CylinderGeometry` cerrado de 48 segmentos radiales y 20 longitudinales, con radio constante en el mundo. Se orienta con una quaternion sobre el eje del ciclo de reloj de arena. Arranca con el extremo superior hacia la cámara (45°); la perspectiva cambia el tamaño aparente al acercar o alejar los extremos. Solo se ajusta el largo de los extremos para encuadrarlos; el radio no depende de píxeles ni de su profundidad.

El material brillante del cilindro escribe en el buffer de profundidad. Las partículas usan las mismas matrices de cámara, `depthTest`, `depthWrite` y `NormalBlending`. Los fragmentos fuera del pequeño cuerpo circular se descartan. Los puntos traseros fallan el depth test contra el rayo; los delanteros lo cubren por composición alfa. No se ordenan manualmente según su posición frente al rayo, ni se atenúa su luz mediante máscaras.

`RenderPass` resuelve primero color y profundidad. `UnrealBloomPass` extrae y difumina solo la luz visible de esa imagen; `OutputPass` convierte la salida lineal a sRGB, sin curva de tone mapping en este renderer. El bloom no puede recuperar una fuente oculta, aunque su difusión puede extender luz desde píxeles vecinos visibles. Se calcula a resolución reducida (50% del tamaño físico en escritorio, 35% en móvil) mientras la geometría conserva su resolución. Las partículas mantienen un centro blanco plano y un borde suave muy pequeño, dentro del mismo punto con alfa normal. El umbral de bloom deja sus centros blancos fuera de la extracción; el rayo es la fuente del halo verde.

El remolino restaura la función `beamDustLocal` y los parámetros de `7b12045`: 2.200/750 partículas, largo 0,84, cintura 0,006, radio de extremos 0,045, giro 0,8, flujo axial 0,045 y opacidad 0,20. Es un reloj axial tenue, con semillas aleatorias y flujo en ambos sentidos. Desaparecen las trenzas y el color rosado añadido después. La integración cambia la cámara y el material de profundidad, conservando la fórmula del remolino.

Las dos C conservan el volumen, el centro denso, los bordes difusos, el flujo opuesto, las aberturas pequeñas y el hilo tenue entre extremos. La cota geométrica de sus cuellos mantiene la separación durante retrasos, bamboleo e inclinación. Comparten el ciclo de 50 segundos del rayo. La entrada sigue mostrando primero el rayo, después el ensamblado gradual y luego los textos.

## Blanco limpio y rayo nuclear

El commit e07c3d0 guarda el estado previo a los cambios de color. El gris anterior provenía de mezclar azul y violeta, aplicar sombreado esférico y multiplicar la emisión por 0,60, además del ACES global del OutputPass. Ahora los dos anillos usan particleColor #FFFFFF y un centro de intensidad 1,04, sin sombreado gris ni cambio de tono por puntero. El tamaño de sus puntos se reduce un 10% para separar visualmente los núcleos; se conserva el kernel alfa, depthTest y depthWrite.

Los materiales de partículas y rayo tienen toneMapped:false. El renderer exclusivo del núcleo usa NoToneMapping: eso también evita que el OutputPass transforme de nuevo la imagen completa. Los hexadecimales sRGB del config se convierten a lineal mediante Three.Color y vuelven una sola vez a sRGB en la salida. Las otras capas y la interfaz conservan su tratamiento de color.

El cilindro conserva geometría, radio, cámara, orientación y profundidad. Su material distingue el núcleo #EFFFE6 y el cuerpo #39FF14 mediante las normales de la malla; la variación es de emisión, no de geometría. El bloom sigue calculándose después de la oclusión y su composición usa el tono lima #7CFF3A. El remolino recibe un matiz verde suave según su distancia al eje; los centros blancos de los anillos permanecen blancos.

particleColor, particleIntensity, ringPointScale, beamCoreColor, beamColor, beamGlowColor, beamDustColor y beamCoreStart viven en particle-config.js y en el panel de desarrollo. No se introducen máscaras de profundidad, orden manual de bandas ni sprites de halo encima del rayo.

## Simulación y recursos

Transform feedback integra posiciones, velocidades, resortes y fuerzas del puntero en GPU. Hay como máximo un paso por frame, con delta acotado a 1/30 s, para evitar duplicar trabajo cuando baja la frecuencia. Dos pares de buffers separados se alternan; Three.js lee el buffer activo mediante `GLBufferAttribute`. No hay copias de posición a CPU ni recorridos por partícula en JS por frame. Las lecturas de píxeles y buffers pertenecen exclusivamente a las páginas locales de prueba.

El presupuesto total sigue en 60.000 partículas para escritorio y 19.000 para móvil; se reduce en dispositivos con poca memoria. El DPR nunca supera 2. Mouse y touch comparten una estela pasiva; el desplazamiento natural de la página permanece disponible. La animación autónoma solo se suspende al ocultar la pestaña. La inclinación móvil conserva referencia relativa, límites, suavizado y permiso de iOS dentro del primer gesto válido.

El desmontaje libera geometrías, materiales, programas, buffers, VAO, transform feedback, targets y pases. También cierra el contexto exclusivo del núcleo después de `dispose`, para liberar las texturas vacías y framebuffers auxiliares que Three.js mantiene internamente. Se abortan listeners, RAF y observadores desde el controlador de la página. El contexto perdido por el navegador puede recrearse mediante el flujo de restauración existente.

## Cielo, contenido y navegación

La galaxia mantiene 2.200 cuerpos pequeños, 420 medianos y 24 frontales (700/120/8 en móvil), con viajes largos, profundidad, halo, estela, parallax e interacción con el puntero. El fondo cubre toda la página y el frente tiene `pointer-events:none`; las máscaras de texto de estas capas protegen la lectura. Estas máscaras de legibilidad son independientes de la solución de profundidad retirada del núcleo.

La aurora sigue generándose con ruido fBm en GPU a resolución reducida. El tiempo mueve las cortinas; scroll, puntero e inclinación añaden variaciones suaves. Ninguna sección depende del scroll para mantener su animación autónoma.

Se conservan textos, encabezado fijo, contacto, entradas animadas y el prisma de Craft Studio, Animanía y Showroom 3D. Continúan retiradas la foto, las primeras tarjetas repetidas y las demostraciones de Power BI y automatización.

## Verificación

`npm test` ejecuta 21 pruebas de lógica, geometría, entrada, presupuestos y orientación. `tests/mesh-depth.html` muestra solo un anillo y el cilindro; `?full=1` incluye las dos C y el remolino. El debug rojo/azul cambia únicamente el color, nunca el orden de render ni el depth test. El botón de tres momentos comprueba 50, 58 y 75 segundos: cámara, malla, alfa normal, cruces, ancho rasterizado de los extremos y errores WebGL. En la escena completa, otra C delantera puede ocultar un cruce trasero de la primera; eso se evalúa como oclusión válida.

`tests/colors-preview.html` mide la salida sRGB final, comprueba blanco RGB [255,255,255] de una partícula aislada, extensión de su halo, núcleo claro, cuerpo y bloom verdes, y repite los cruces en tres momentos. La lectura se hace en la misma tarea de render y solo existe en pruebas.

`tests/mesh-gpu.html` comprueba ensamblado, reloj axial, interacción, inercia, posiciones finitas, resize, presupuesto móvil y liberación real de recursos. `tests/gpu-preview.html` verifica viajes, galaxia, frente, aurora, máscaras de lectura e interacción.

Solo en localhost/desarrollo, `?scene-capture=50`, `58` y `75` fijan poses reproducibles para las capturas de la portada, sin alterar la reproducción de producción. La revisión manual cubre escritorio y viewport 390×844; no valida sensores físicos ni el diálogo nativo de Safari. El rendimiento depende del equipo, resolución y escenas simultáneas.

## Publicación

https://juan-pablo-craft-portfolio.vercel.app/

Vercel CLI publica `dist/` en el proyecto `juan-pablo-craft-portfolio`, equipo `juans-projects-079dba21`. No hay sincronización automática con GitHub.
