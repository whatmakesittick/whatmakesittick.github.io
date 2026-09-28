import { readFileSync, writeFileSync } from 'node:fs';
import { encodeIco } from '../vite/ico.ts';

const [output, ...images] = process.argv.slice(2);
if (!output || images.length === 0) {
  throw new Error('Usage: node scripts/favicon-ico.ts <output.ico> <image.png>...');
}
writeFileSync(output, encodeIco(images.map((image) => readFileSync(image))));
