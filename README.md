# Juan Pablo Muttoni — Craft Portfolio

Portfolio estático en español, con identidad visual de Craft Studio, tarjetas en perspectiva y proyectos filtrables. HTML semántico, CSS responsive y JavaScript sin dependencias de ejecución.

## Desarrollo

Requiere Node.js 20 o posterior. `npm run dev` sirve el sitio en http://127.0.0.1:4173. `npm run check` valida la sintaxis JavaScript. `npm run build` genera `dist/` con los únicos recursos necesarios para publicar.

## Vercel

Importar este repositorio, seleccionar la rama del rediseño y usar la configuración incluida en `vercel.json`: framework Other, comando `npm run build`, directorio `dist`. No requiere variables de entorno ni servicios de pago.

## Contenidos

Editar textos, enlaces y proyectos en `index.html`; estilos en `css/portfolio.css`; menú y filtros en `js/portfolio.js`. Los recursos de Craft Studio y Animanía se copiaron de sus sitios públicos, pertenecientes al usuario. El showroom se enlaza desde el destino publicado en Craft Studio. La imagen de perfil se conserva del portfolio original.

El build excluye los archivos históricos: CV, certificados y proyectos anteriores permanecen en el repositorio, pero no se publican. Se retiraron Buscando Salud y el examen Front End de la selección visible. El perfil se enfoca en desarrollo web y Craft Studio.

## Accesibilidad

Navegación por teclado, enlace para saltar al contenido, foco visible, menú con Escape, filtros con `aria-pressed` y anuncio de resultados. La preferencia de movimiento reducido desactiva animaciones y transiciones. Los enlaces externos se abren con `noopener noreferrer`.

## Actualización visual
Paleta azul noche, marfil y verde salvia. Logo Craft junto a JPM. Proyectos en carrusel de tarjetas superpuestas con botones, teclado y gestos táctiles; filtros por categoría y enlaces directos. Contenido en español e incorporación de Claude y ChatGPT al proceso de trabajo.

Sitio publicado: https://juan-pablo-craft-portfolio.vercel.app/ (despliegue directo, sin sincronización Git automática).
