import fs from 'fs';
import path from 'path';

const candidates = [
  path.resolve('artifacts/pentecostal-matrimony/dist/public'),
  path.resolve('artifacts/pentecostal-matrimony/dist'),
];

const src = candidates.find((c) => fs.existsSync(path.join(c, 'index.html')));

if (src) {
  const destinations = [
    path.resolve('public'),
    path.resolve('dist'),
    path.resolve('artifacts/pentecostal-matrimony/dist/public'),
    path.resolve('artifacts/pentecostal-matrimony/dist'),
  ];

  for (const dest of destinations) {
    if (path.resolve(src) !== path.resolve(dest)) {
      fs.mkdirSync(dest, { recursive: true });
      fs.cpSync(src, dest, { recursive: true, force: true });
      console.log(`[Deploy Sync] Copied build output to ${dest}`);
    }
  }
} else {
  console.warn('[Deploy Sync] No built index.html found in candidates:', candidates);
}
