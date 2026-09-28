import { currentLanguage } from '@core/i18n';
import { clamp } from '@core/math';
import { RIG_TYPES, RIG_TYPE_IDS, canWorkIn } from '../model';
import type { RigTypeId } from '../model';
import { WATER_DEPTH_RANGE } from '../state';
import { CANVAS_COLORS } from './canvasColors';
import { CanvasSurface, canvasFont, widestText } from './canvasSurface';
import type { CanvasFrame } from './canvasSurface';
import { formatMetres } from './format';

interface Column {
  x: number;
  surface: number;
  reach: number;
  seabed: number;
  scale: number;
}

interface Plot {
  left: number;
  right: number;
  surface: number;
  bottom: number;
}

type Silhouette = (context: CanvasRenderingContext2D, column: Column) => void;

const LAYOUT = { rightPad: 8, surfaceShare: 0.24, bottomPad: 6, font: 11, tickGap: 6 };
const REFERENCE_COLUMN = 96;
const LINE_WIDTH = 1.6;
const LIMIT_DASH = [3, 3];
const LIMIT_HALF_SHARE = 0.3;
const TICKS_M = [100, 500, 1000, 2000, 3000] as const;

const DERRICK = { halfBase: 5, height: 20 } as const;
const JACK_UP = {
  hullHalf: 22,
  hullLift: 12,
  hullHeight: 8,
  legs: [-16, 0, 16],
  legRise: 14,
  padHalf: 3,
  padHeight: 2,
} as const;
const JACKET = { deckHalf: 20, deckLift: 12, deckHeight: 7, topHalf: 12, splay: 0.12, levels: 4 };
const TLP = {
  deckHalf: 20,
  deckTop: 12,
  deckBottom: 5,
  columnInner: 10,
  columnOuter: 16,
  pontoonHalf: 18,
  pontoonTop: 8,
  pontoonBottom: 12,
  tendon: 13,
} as const;
const SPAR = {
  hullHalf: 7,
  hullTop: 6,
  hullBottom: 44,
  deckHalf: 16,
  deckTop: 14,
  fairlead: 30,
  bend: 14,
  spread: 34,
} as const;
const SEMI = {
  deckHalf: 22,
  deckTop: 14,
  deckBottom: 6,
  columnInner: 12,
  columnOuter: 18,
  pontoonHalf: 21,
  pontoonTop: 10,
  pontoonBottom: 15,
  anchor: 47,
  fairleadPull: { outShare: 0.6, downShare: 0.2 },
  touchdownShare: 0.8,
} as const;
const RISER_WIDTH_SHARE = 0.5;
const DRILLSHIP = {
  stern: 34,
  bow: 38,
  keelHalf: 30,
  sternRise: 5,
  bowRise: 8,
  keel: 5,
  derrick: 6,
};
const SIDES = [-1, 1] as const;

function rect(context: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  context.fillRect(x0, y0, x1 - x0, y1 - y0);
}

function line(context: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.stroke();
}

function block(
  context: CanvasRenderingContext2D,
  { x, scale }: Column,
  half: number,
  top: number,
  bottom: number,
): void {
  rect(context, x - half * scale, top, x + half * scale, bottom);
}

function mirroredLines(
  context: CanvasRenderingContext2D,
  { x, scale }: Column,
  from: { half: number; y: number },
  to: { half: number; y: number },
): void {
  SIDES.forEach((side) =>
    line(context, x + side * from.half * scale, from.y, x + side * to.half * scale, to.y),
  );
}

function mirroredBlocks(
  context: CanvasRenderingContext2D,
  { x, scale }: Column,
  inner: number,
  outer: number,
  top: number,
  bottom: number,
): void {
  rect(context, x - outer * scale, top, x - inner * scale, bottom);
  rect(context, x + inner * scale, top, x + outer * scale, bottom);
}

function derrick(context: CanvasRenderingContext2D, { x, scale }: Column, base: number): void {
  context.beginPath();
  context.moveTo(x - DERRICK.halfBase * scale, base);
  context.lineTo(x + DERRICK.halfBase * scale, base);
  context.lineTo(x, base - DERRICK.height * scale);
  context.closePath();
  context.fill();
}

function jackUp(context: CanvasRenderingContext2D, column: Column): void {
  const { x, surface, reach, seabed, scale: s } = column;
  const hull = surface - JACK_UP.hullLift * s;
  const deck = hull - JACK_UP.hullHeight * s;
  JACK_UP.legs.forEach((offset) => {
    const legX = x + offset * s;
    line(context, legX, hull - JACK_UP.legRise * s, legX, reach);
    if (reach < seabed) return;
    const pad = JACK_UP.padHalf * s;
    rect(context, legX - pad, seabed - JACK_UP.padHeight * s, legX + pad, seabed);
  });
  block(context, column, JACK_UP.hullHalf, deck, hull);
  derrick(context, column, deck);
}

function jacket(context: CanvasRenderingContext2D, column: Column): void {
  const { surface, reach, scale: s } = column;
  const deck = surface - JACKET.deckLift * s;
  const halfAt = (y: number) => JACKET.topHalf + ((y - deck) * JACKET.splay) / s;
  mirroredLines(
    context,
    column,
    { half: halfAt(deck), y: deck },
    { half: halfAt(reach), y: reach },
  );
  for (let level = 0; level < JACKET.levels; level++) {
    const top = deck + ((reach - deck) * level) / JACKET.levels;
    const bottom = deck + ((reach - deck) * (level + 1)) / JACKET.levels;
    mirroredLines(
      context,
      column,
      { half: -halfAt(top), y: top },
      { half: halfAt(bottom), y: bottom },
    );
  }
  block(context, column, JACKET.deckHalf, deck - JACKET.deckHeight * s, deck);
  derrick(context, column, deck - JACKET.deckHeight * s);
}

function tensionLeg(context: CanvasRenderingContext2D, column: Column): void {
  const { surface, reach, scale: s } = column;
  const pontoonBottom = surface + TLP.pontoonBottom * s;
  const deckBottom = surface - TLP.deckBottom * s;
  mirroredLines(
    context,
    column,
    { half: TLP.tendon, y: pontoonBottom },
    { half: TLP.tendon, y: reach },
  );
  block(context, column, TLP.pontoonHalf, surface + TLP.pontoonTop * s, pontoonBottom);
  mirroredBlocks(context, column, TLP.columnInner, TLP.columnOuter, deckBottom, pontoonBottom);
  block(context, column, TLP.deckHalf, surface - TLP.deckTop * s, deckBottom);
  derrick(context, column, surface - TLP.deckTop * s);
}

function spar(context: CanvasRenderingContext2D, column: Column): void {
  const { x, surface, reach, scale: s } = column;
  SIDES.forEach((side) => {
    context.beginPath();
    context.moveTo(x + side * SPAR.hullHalf * s, surface + SPAR.fairlead * s);
    context.quadraticCurveTo(x + side * SPAR.bend * s, reach, x + side * SPAR.spread * s, reach);
    context.stroke();
  });
  block(context, column, SPAR.hullHalf, surface - SPAR.hullTop * s, surface + SPAR.hullBottom * s);
  block(context, column, SPAR.deckHalf, surface - SPAR.deckTop * s, surface - SPAR.hullTop * s);
  derrick(context, column, surface - SPAR.deckTop * s);
}

function riser(context: CanvasRenderingContext2D, { x, reach }: Column, top: number): void {
  const width = context.lineWidth;
  context.lineWidth = width * RISER_WIDTH_SHARE;
  line(context, x, top, x, reach);
  context.lineWidth = width;
}

function catenaryMoorings(context: CanvasRenderingContext2D, column: Column, fairlead: number) {
  const { x, reach, scale: s } = column;
  const { columnOuter, anchor, fairleadPull, touchdownShare } = SEMI;
  const pullX = columnOuter + (anchor - columnOuter) * fairleadPull.outShare;
  const pullY = fairlead + (reach - fairlead) * fairleadPull.downShare;
  const touchdownX = columnOuter + (anchor - columnOuter) * touchdownShare;
  SIDES.forEach((side) => {
    context.beginPath();
    context.moveTo(x + side * columnOuter * s, fairlead);
    context.bezierCurveTo(
      x + side * pullX * s,
      pullY,
      x + side * touchdownX * s,
      reach,
      x + side * anchor * s,
      reach,
    );
    context.stroke();
  });
}

function semi(context: CanvasRenderingContext2D, column: Column): void {
  const { surface, scale: s } = column;
  const pontoonTop = surface + SEMI.pontoonTop * s;
  const pontoonBottom = surface + SEMI.pontoonBottom * s;
  const deckBottom = surface - SEMI.deckBottom * s;
  catenaryMoorings(context, column, pontoonTop);
  riser(context, column, pontoonBottom);
  block(context, column, SEMI.pontoonHalf, pontoonTop, pontoonBottom);
  mirroredBlocks(context, column, SEMI.columnInner, SEMI.columnOuter, deckBottom, pontoonTop);
  block(context, column, SEMI.deckHalf, surface - SEMI.deckTop * s, deckBottom);
  derrick(context, column, surface - SEMI.deckTop * s);
}

function drillship(context: CanvasRenderingContext2D, column: Column): void {
  const { x, surface, scale: s } = column;
  const keel = surface + DRILLSHIP.keel * s;
  riser(context, column, keel);
  context.beginPath();
  context.moveTo(x - DRILLSHIP.stern * s, surface - DRILLSHIP.sternRise * s);
  context.lineTo(x + DRILLSHIP.bow * s, surface - DRILLSHIP.bowRise * s);
  context.lineTo(x + DRILLSHIP.keelHalf * s, keel);
  context.lineTo(x - DRILLSHIP.keelHalf * s, keel);
  context.closePath();
  context.fill();
  derrick(context, column, surface - DRILLSHIP.derrick * s);
}

const SILHOUETTES: Record<RigTypeId, Silhouette> = {
  jackUp,
  jacket,
  tlp: tensionLeg,
  spar,
  semi,
  drillship,
};

function tickLabels(): string[] {
  return TICKS_M.map((depth) => formatMetres(depth));
}

function plotOf(context: CanvasRenderingContext2D, frame: CanvasFrame, labels: string[]): Plot {
  context.font = canvasFont(LAYOUT.font);
  return {
    left: widestText(context, labels) + 2 * LAYOUT.tickGap,
    right: frame.width - LAYOUT.rightPad,
    surface: frame.height * LAYOUT.surfaceShare,
    bottom: frame.height - LAYOUT.bottomPad,
  };
}

function depthToY(plot: Plot, depth: number): number {
  const share = Math.sqrt(clamp(depth / WATER_DEPTH_RANGE.max, 0, 1));
  return plot.surface + (plot.bottom - plot.surface) * share;
}

function paintSea(context: CanvasRenderingContext2D, plot: Plot, seabed: number): void {
  const water = context.createLinearGradient(0, plot.surface, 0, plot.bottom);
  water.addColorStop(0, CANVAS_COLORS.waterTop);
  water.addColorStop(1, CANVAS_COLORS.waterBottom);
  context.fillStyle = water;
  rect(context, plot.left, plot.surface, plot.right, seabed);
  context.fillStyle = CANVAS_COLORS.sediment;
  rect(context, plot.left, seabed, plot.right, plot.bottom);
  context.lineWidth = LINE_WIDTH;
  context.strokeStyle = CANVAS_COLORS.seabedLine;
  line(context, plot.left, seabed, plot.right, seabed);
  context.strokeStyle = CANVAS_COLORS.surfaceLine;
  line(context, plot.left, plot.surface, plot.right, plot.surface);
}

function paintTicks(context: CanvasRenderingContext2D, plot: Plot, labels: string[]): void {
  context.font = canvasFont(LAYOUT.font);
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  context.lineWidth = 1;
  TICKS_M.forEach((depth, index) => {
    const y = depthToY(plot, depth);
    context.strokeStyle = CANVAS_COLORS.grid;
    line(context, plot.left, y, plot.right, y);
    context.fillStyle = CANVAS_COLORS.tick;
    context.fillText(labels[index], plot.left - LAYOUT.tickGap, y);
  });
}

function paintLimit(context: CanvasRenderingContext2D, column: Column, width: number, y: number) {
  const half = width * LIMIT_HALF_SHARE;
  context.setLineDash(LIMIT_DASH);
  context.strokeStyle = CANVAS_COLORS.limit;
  context.lineWidth = 1;
  line(context, column.x - half, y, column.x + half, y);
  context.setLineDash([]);
}

function paintSilhouette(
  context: CanvasRenderingContext2D,
  rig: RigTypeId,
  column: Column,
  width: number,
  lit: boolean,
): void {
  const color = lit ? CANVAS_COLORS.lit : CANVAS_COLORS.dim;
  context.save();
  context.beginPath();
  context.rect(column.x - width / 2, 0, width, column.seabed);
  context.clip();
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = LINE_WIDTH * column.scale;
  SILHOUETTES[rig](context, column);
  context.restore();
}

function paintRig(
  context: CanvasRenderingContext2D,
  plot: Plot,
  rig: RigTypeId,
  index: number,
  waterDepth: number,
): void {
  const width = (plot.right - plot.left) / RIG_TYPE_IDS.length;
  const seabed = depthToY(plot, waterDepth);
  const limit = depthToY(plot, RIG_TYPES[rig].maxWaterDepth);
  const column = {
    x: plot.left + width * (index + 0.5),
    surface: plot.surface,
    seabed,
    reach: Math.min(seabed, limit),
    scale: width / REFERENCE_COLUMN,
  };
  paintLimit(context, column, width, limit);
  paintSilhouette(context, rig, column, width, canWorkIn(rig, waterDepth));
}

function paintRigPicker(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  waterDepth: number,
): void {
  const labels = tickLabels();
  const plot = plotOf(context, frame, labels);
  paintSea(context, plot, depthToY(plot, waterDepth));
  paintTicks(context, plot, labels);
  RIG_TYPE_IDS.forEach((rig, index) => paintRig(context, plot, rig, index, waterDepth));
}

export class RigPicker {
  private readonly surface: CanvasSurface;
  private painted = { depth: NaN, language: '' };

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
  }

  draw(waterDepth: number): void {
    const language = currentLanguage();
    if (waterDepth === this.painted.depth && language === this.painted.language) return;
    this.painted = { depth: waterDepth, language };
    this.surface.paint((context, frame) => paintRigPicker(context, frame, waterDepth));
  }

  dispose(): void {
    this.surface.dispose();
  }
}
