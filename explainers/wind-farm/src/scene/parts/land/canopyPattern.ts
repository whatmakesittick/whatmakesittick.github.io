import { CANOPY_TILE } from './fieldConstants';
import { between, seededRandom } from './random';

const FULL_TURN = Math.PI * 2;
const WRAPS = [-1, 0, 1];

function crown(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  const { size, shadow, light, lift } = CANOPY_TILE;
  WRAPS.forEach((dx) =>
    WRAPS.forEach((dy) => {
      const [cx, cy] = [x + dx * size, y + dy * size];
      context.fillStyle = shadow;
      context.beginPath();
      context.arc(cx + lift, cy + lift, radius, 0, FULL_TURN);
      context.fill();
      context.fillStyle = light;
      context.beginPath();
      context.arc(cx - lift, cy - lift, radius * CANOPY_TILE.highlight, 0, FULL_TURN);
      context.fill();
    }),
  );
}

export function canopyPattern(context: CanvasRenderingContext2D): CanvasPattern | null {
  const { size, crowns, radius, seed } = CANOPY_TILE;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const drawing = tile.getContext('2d');
  if (!drawing) return null;
  const random = seededRandom(seed);
  for (let index = 0; index < crowns; index += 1)
    crown(drawing, random() * size, random() * size, between(random, radius));
  return context.createPattern(tile, 'repeat');
}
