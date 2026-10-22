import { MOTTLE } from '../palette';
import { seededRandom } from '../random';
import type { Random } from '../random';
import { grey } from './colour';
import { drawSmooth } from './painter';
import type { Painter } from './painter';

const MOTTLE_SEED = 4_211;
const MIDDLE_GREY = 0.5;

function paintNoise(
  context: CanvasRenderingContext2D,
  [columns, rows]: readonly [number, number],
  amount: number,
  random: Random,
): void {
  const values = Array.from({ length: columns * rows }, () => (random() * 2 - 1) * amount);
  for (let row = 0; row < rows; row += 1)
    for (let column = -1; column <= columns; column += 1) {
      const wrapped = (column + columns) % columns;
      context.fillStyle = grey(MIDDLE_GREY + values[row * columns + wrapped]);
      context.fillRect(column + 1, row, 1, 1);
    }
}

export function paintMottle(painter: Painter): void {
  const random = seededRandom(MOTTLE_SEED);
  MOTTLE.forEach(({ cells, amount }) => {
    const cellWidth = painter.width / cells[0];
    drawSmooth(
      painter,
      [cells[0] + 2, cells[1]],
      (context) => paintNoise(context, cells, amount, random),
      { globalCompositeOperation: 'soft-light' },
      [-cellWidth, painter.width + cellWidth * 2],
    );
  });
}
