import { currentLanguage } from '@core/i18n';
import { CanvasSurface, canvasFont } from '@core/ui/canvasSurface';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import type { EngineId } from '../ids';
import { CANVAS_COLORS } from './canvasColors';
import { CYCLE_DIAGRAMS, DIAGRAM_SIZE } from './cycleDiagrams';
import type {
  CycleDiagram,
  DiagramLink,
  DiagramNode,
  DiagramPoint,
  DiagramStream,
  NodeKind,
} from './cycleDiagrams';
import { formatCycleBox } from './format';

interface BoxStyle {
  stroke: string;
  fill: string;
  radius: number;
}

interface Mapper {
  scale: number;
  point(point: DiagramPoint): DiagramPoint;
}

const FONT = { max: 12, min: 7, step: 0.5 } as const;
const LINE = { main: 2.2, thin: 1.2, box: 1.4, shaft: 4, overboard: 2.4 } as const;
const ARROW = { length: 7, halfWidth: 4, minSegment: 14 } as const;
const LABEL_PAD = 5;
const LINE_GAP = 1.15;
const OVERBOARD_DASH = [5, 3] as const;
const NOZZLE = { throat: 0.22, exit: 0.83, length: 1.25, labelAt: 0.55, labelWidth: 0.8 } as const;
const TANK_LABEL_INSET = 0.3;
const PILL = 0.5;
const CORNER = 5;
const WORD_BREAK = ' ';
const OVERBOARD_LABEL = { width: 96, height: 34 } as const;

const STREAM_COLORS: Readonly<Record<DiagramStream, string>> = {
  oxygen: CANVAS_COLORS.oxygen,
  fuel: CANVAS_COLORS.fuel,
  oxygenRichGas: CANVAS_COLORS.oxygenRichGas,
  fuelRichGas: CANVAS_COLORS.fuelRichGas,
  overboard: CANVAS_COLORS.overboard,
};

const BOX_STYLES: Readonly<Record<Exclude<NodeKind, 'tank'>, BoxStyle>> = {
  pump: { stroke: CANVAS_COLORS.pump, fill: CANVAS_COLORS.pumpFill, radius: CORNER },
  boostPump: { stroke: CANVAS_COLORS.pump, fill: CANVAS_COLORS.pumpFill, radius: CORNER },
  burner: { stroke: CANVAS_COLORS.burner, fill: CANVAS_COLORS.burnerFill, radius: CORNER },
  turbine: { stroke: CANVAS_COLORS.turbine, fill: CANVAS_COLORS.turbineFill, radius: CORNER },
  chamber: { stroke: CANVAS_COLORS.chamber, fill: CANVAS_COLORS.chamberFill, radius: CORNER },
};

function mapperFor(frame: CanvasFrame): Mapper {
  const scale = frame.width / DIAGRAM_SIZE.width;
  return { scale, point: ([x, y]) => [x * scale, y * scale] };
}

function fitLines(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  text: string,
  width: number,
  height: number,
): { lines: readonly string[]; size: number } {
  const split = text.lastIndexOf(WORD_BREAK);
  const candidates: (readonly string[])[] =
    split > 0 ? [[text], [text.slice(0, split), text.slice(split + 1)]] : [[text]];
  for (let size = FONT.max; size >= FONT.min; size -= FONT.step) {
    context.font = canvasFont(frame, size);
    const fits = candidates.find(
      (lines) =>
        lines.length * size * LINE_GAP <= height &&
        lines.every((line) => context.measureText(line).width <= width),
    );
    if (fits) return { lines: fits, size };
  }
  context.font = canvasFont(frame, FONT.min);
  return { lines: candidates.at(-1) ?? [text], size: FONT.min };
}

function paintLabel(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  text: string,
  centre: DiagramPoint,
  box: { width: number; height: number },
  color: string,
): void {
  const { lines, size } = fitLines(
    context,
    frame,
    text,
    box.width - 2 * LABEL_PAD,
    box.height - LABEL_PAD,
  );
  const lineHeight = size * LINE_GAP;
  const top = centre[1] - (lineHeight * (lines.length - 1)) / 2;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  lines.forEach((line, index) => context.fillText(line, centre[0], top + index * lineHeight));
}

function roundedBox(
  context: CanvasRenderingContext2D,
  [x, y]: DiagramPoint,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x - width / 2, y - height / 2, width, height, radius);
  context.fillStyle = CANVAS_COLORS.backdrop;
  context.fill();
}

function paintNozzle(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  [x, y]: DiagramPoint,
  width: number,
  height: number,
): void {
  const start = x + width / 2;
  const length = height * NOZZLE.length;
  context.beginPath();
  context.moveTo(start, y - height * NOZZLE.throat);
  context.lineTo(start + length, y - height * NOZZLE.exit);
  context.lineTo(start + length, y + height * NOZZLE.exit);
  context.lineTo(start, y + height * NOZZLE.throat);
  context.closePath();
  context.fillStyle = CANVAS_COLORS.chamberFill;
  context.fill();
  context.strokeStyle = CANVAS_COLORS.chamber;
  context.stroke();
  paintLabel(
    context,
    frame,
    formatCycleBox('nozzle'),
    [start + length * NOZZLE.labelAt, y],
    { width: length * NOZZLE.labelWidth, height },
    CANVAS_COLORS.lit,
  );
}

function paintTank(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  node: DiagramNode,
  mapper: Mapper,
): void {
  const centre = mapper.point(node.centre);
  const width = node.width * mapper.scale;
  const height = node.height * mapper.scale;
  const isOxygen = node.side === 'oxygen';
  roundedBox(context, centre, width, height, height * PILL);
  context.fillStyle = isOxygen ? CANVAS_COLORS.oxygenTankFill : CANVAS_COLORS.fuelTankFill;
  context.fill();
  context.strokeStyle = isOxygen ? CANVAS_COLORS.oxygen : CANVAS_COLORS.fuel;
  context.stroke();
  const half = height / 4;
  const box = { width: width - height * TANK_LABEL_INSET, height: height / 2 };
  paintLabel(
    context,
    frame,
    formatCycleBox(node.label),
    [centre[0], centre[1] - half],
    box,
    CANVAS_COLORS.lit,
  );
  paintLabel(
    context,
    frame,
    formatCycleBox('tank'),
    [centre[0], centre[1] + half],
    box,
    CANVAS_COLORS.tick,
  );
}

function paintNode(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  node: DiagramNode,
  mapper: Mapper,
): void {
  context.lineWidth = LINE.box;
  if (node.kind === 'tank') {
    paintTank(context, frame, node, mapper);
    return;
  }
  const style = BOX_STYLES[node.kind];
  const centre = mapper.point(node.centre);
  const width = node.width * mapper.scale;
  const height = node.height * mapper.scale;
  if (node.kind === 'chamber') paintNozzle(context, frame, centre, width, height);
  context.lineWidth = LINE.box;
  roundedBox(context, centre, width, height, style.radius);
  context.fillStyle = style.fill;
  context.fill();
  context.strokeStyle = style.stroke;
  context.stroke();
  paintLabel(
    context,
    frame,
    formatCycleBox(node.label),
    centre,
    { width, height },
    CANVAS_COLORS.lit,
  );
}

function paintArrowHead(
  context: CanvasRenderingContext2D,
  from: DiagramPoint,
  to: DiagramPoint,
): void {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const baseX = to[0] - ARROW.length * cos;
  const baseY = to[1] - ARROW.length * sin;
  context.beginPath();
  context.moveTo(to[0], to[1]);
  context.lineTo(baseX - ARROW.halfWidth * sin, baseY + ARROW.halfWidth * cos);
  context.lineTo(baseX + ARROW.halfWidth * sin, baseY - ARROW.halfWidth * cos);
  context.closePath();
  context.fill();
}

function segmentLength(from: DiagramPoint, to: DiagramPoint): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1]);
}

function paintLink(context: CanvasRenderingContext2D, link: DiagramLink, mapper: Mapper): void {
  const points = link.points.map((point) => mapper.point(point));
  const overboard = link.stream === 'overboard';
  const color = STREAM_COLORS[link.stream];
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = overboard ? LINE.overboard : link.thin ? LINE.thin : LINE.main;
  context.lineJoin = 'round';
  context.setLineDash(overboard ? OVERBOARD_DASH : []);
  context.beginPath();
  points.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
  context.stroke();
  context.setLineDash([]);
  const [from, to] = points.slice(-2);
  if (segmentLength(from, to) >= ARROW.minSegment) paintArrowHead(context, from, to);
}

function paintShafts(
  context: CanvasRenderingContext2D,
  diagram: CycleDiagram,
  mapper: Mapper,
): void {
  context.strokeStyle = CANVAS_COLORS.shaft;
  context.lineWidth = LINE.shaft;
  context.lineCap = 'round';
  diagram.shafts.forEach(([from, to]) => {
    const [startX, startY] = mapper.point(from);
    const [endX, endY] = mapper.point(to);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
  });
  context.lineCap = 'butt';
}

function paintOverboardLabel(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  diagram: CycleDiagram,
  mapper: Mapper,
): void {
  if (!diagram.overboardLabel) return;
  const width = OVERBOARD_LABEL.width * mapper.scale;
  const height = OVERBOARD_LABEL.height * mapper.scale;
  paintLabel(
    context,
    frame,
    formatCycleBox('overboard'),
    mapper.point(diagram.overboardLabel),
    { width, height },
    CANVAS_COLORS.overboard,
  );
}

export function paintCycle(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  engine: EngineId,
): void {
  const diagram = CYCLE_DIAGRAMS[engine];
  const mapper = mapperFor(frame);
  paintShafts(context, diagram, mapper);
  diagram.nodes.forEach((node) => paintNode(context, frame, node, mapper));
  diagram.links.forEach((link) => paintLink(context, link, mapper));
  paintOverboardLabel(context, frame, diagram, mapper);
}

export class CycleView {
  private readonly surface: CanvasSurface;
  private painted = '';

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
  }

  draw(engine: EngineId): void {
    const key = [engine, currentLanguage()].join('|');
    if (key === this.painted) return;
    this.painted = key;
    this.surface.paint((context, frame) => paintCycle(context, frame, engine));
  }

  dispose(): void {
    this.surface.dispose();
  }
}
