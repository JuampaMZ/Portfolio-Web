import { mkdir, cp, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(projectRoot, 'dist');
if (resolve(process.cwd()) !== projectRoot || dirname(output) !== projectRoot) {
  throw new Error('El build debe ejecutarse desde la raíz del portfolio.');
}
// Only remove the verified build directory inside this project.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'css/portfolio.css', 'css/scroll-story.css', 'js/portfolio.js', 'js/motion.js', 'js/scroll-story.js', 'js/scroll-math.js', 'js/cinema-renderer.js', 'js/particle-config.js', 'js/particle-input.js', 'js/particle-gpu.js', 'js/environment.js', 'js/atmosphere.js',
  'assets/animania.png', 'assets/craft-logo.svg', 'assets/craft-mark.svg',
  'assets/craft.jpg', 'assets/showroom.jpg', 'assets/favicon.svg']) {
  const destination = resolve(output, path);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(projectRoot, path), destination);
}
await writeFile(resolve(output,'js/environment.js'),'export const IS_DEVELOPMENT=false;\n');
console.log('Portfolio construido en dist/');
