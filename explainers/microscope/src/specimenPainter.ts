import { FULL_TURN, clamp, lerp } from '@core/math';
import { cellsInWindow } from './model';
import type { Rgb, SpecimenCell } from './model';
import { THEME } from './theme';
import { HALF_TURN } from './turns';
import { cssColor } from './ui/colors';

export interface SpecimenPaint {
  fieldUm: number;
  tint: Rgb;
  turned: boolean;
}

const MEMBRANE_UM = 1.2;
const LINE_PX = { min: 0.6, max: 2.5 } as const;
const TINT_SOFTENING = 0.35;

function traceOutline(context: CanvasRenderingContext2D, cell: SpecimenCell): void {
  const corners = cell.outline.map((stretch, index) => {
    const angle = cell.rotation + (index / cell.outline.length) * FULL_TURN;
    const reach = cell.radius * stretch;
    return [cell.x + reach * Math.cos(angle), cell.y + reach * Math.sin(angle)] as const;
  });
  const midpoint = (index: number) => {
    const [ax, ay] = corners[index % corners.length];
    const [bx, by] = corners[(index + 1) % corners.length];
    return [(ax + bx) / 2, (ay + by) / 2] as const;
  };
  context.beginPath();
  context.moveTo(...midpoint(0));
  corners.forEach((_, index) => {
    const [cx, cy] = corners[(index + 1) % corners.length];
    context.quadraticCurveTo(cx, cy, ...midpoint(index + 1));
  });
  context.closePath();
}

function paintCell(context: CanvasRenderingContext2D, cell: SpecimenCell): void {
  traceOutline(context, cell);
  context.fillStyle = THEME.cytoplasm;
  context.fill();
  context.stroke();
  context.beginPath();
  context.arc(cell.nucleus.x, cell.nucleus.y, cell.nucleus.radius, 0, FULL_TURN);
  context.fillStyle = THEME.nucleus;
  context.fill();
}

function softened(tint: Rgb): Rgb {
  const [red, green, blue] = tint.map((channel) => lerp(channel, 1, TINT_SOFTENING));
  return [red, green, blue];
}

export function paintSpecimen(
  context: CanvasRenderingContext2D,
  size: number,
  paint: SpecimenPaint,
): void {
  const pixelsPerUm = size / paint.fieldUm;
  context.save();
  context.globalCompositeOperation = 'source-over';
  context.fillStyle = THEME.slide;
  context.fillRect(0, 0, size, size);
  context.translate(size / 2, size / 2);
  if (paint.turned) context.rotate(HALF_TURN);
  context.scale(pixelsPerUm, pixelsPerUm);
  context.strokeStyle = THEME.membrane;
  context.lineWidth = clamp(MEMBRANE_UM * pixelsPerUm, LINE_PX.min, LINE_PX.max) / pixelsPerUm;
  cellsInWindow({ centerX: 0, centerY: 0, size: paint.fieldUm }).forEach((cell) =>
    paintCell(context, cell),
  );
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = 'multiply';
  context.fillStyle = cssColor(softened(paint.tint));
  context.fillRect(0, 0, size, size);
  context.restore();
}
