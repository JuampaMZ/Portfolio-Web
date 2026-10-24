import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'css/portfolio.css', 'js/portfolio.js', 'assets', 'img/profile.jpg']) {
  await cp(path, `dist/${path}`, { recursive: true });
}
console.log('Portfolio construido en dist/');
