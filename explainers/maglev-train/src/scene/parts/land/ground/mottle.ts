import { MOTTLE } from '../palette';
import { seededRandom } from '../random';
import type { Random } from '../random';
import { grey } from './colour';
import type { Painter } from './painter';

const MOTTLE_SEED = 4_211;
const MIDDLE_GREY = 0.5;

function noiseCanvas([columns, rows]: readonly [number, number], amount: number, random: Random) {
  const canvas = document.createElement('canvas');
  canvas.width = columns + 2;
  canvas.height = rows;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const values = Array.from({ length: columns * rows }, () => (random() * 2 - 1) * amount);
  for (let row = 0; row < rows; row += 1)
    for (let column = -1; column <= columns; column += 1) {
      const wrapped = (column + columns) % columns;
      context.fillStyle = grey(MIDDLE_GREY + values[row * columns + wrapped]);
      context.fillRect(column + 1, row, 1, 1);
    }
  return canvas;
}

export function paintMottle(painter: Painter): void {
  const random = seededRandom(MOTTLE_SEED);
  const { context, width, height } = painter;
  MOTTLE.forEach(({ cells, amount }) => {
    const canvas = noiseCanvas(cells, amount, random);
    if (!canvas) return;
    const cellWidth = width / cells[0];
    context.save();
    context.globalCompositeOperation = 'soft-light';
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(canvas, -cellWidth, 0, width + cellWidth * 2, height);
    context.restore();
  });
}
