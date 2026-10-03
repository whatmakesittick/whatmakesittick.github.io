import { withAlpha } from '@core/color';
import { currentLanguage, t } from '@core/i18n';
import { FULL_TURN, clamp } from '@core/math';
import { CanvasSurface, canvasFont } from '@core/ui/canvasSurface';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import type { SeaStateId } from '../ids';
import {
  DETECTION_KM,
  RADAR_HEIGHT_M,
  RADAR_K,
  detectionCovered,
  radarLineOfSightKm,
  seaAt,
  surfaceDropM,
} from '../model';
import { THEME } from '../theme';
import { placeText, segmentBoxes, shiftInto, textBox } from './canvasLabels';
import type { Anchor, Box, Placed, TextAlign, TextMetrics } from './canvasLabels';
import { formatCanvasKm } from './format';

export interface HorizonScene {
  radarHeight: number;
  seaState: SeaStateId;
}

export interface HorizonLayout {
  metrics: TextMetrics;
  bounds: Box;
  plot: Box;
  pxPerKm: number;
  pxPerMetre: number;
  tickBaseline: number;
}

interface LabelPainter {
  context: CanvasRenderingContext2D;
  layout: HorizonLayout;
  taken: Box[];
}

type Candidates = (width: number) => readonly Anchor[];

export const AXIS_KM = 35;
export const TICKS_KM = [0, 10, 20, 30] as const;

const MAST_HEADROOM_M = 6;
const SEA_MARGIN_M = 4;
const SKY_TOP_M = RADAR_HEIGHT_M.max + MAST_HEADROOM_M;
const SEA_FLOOR_M = -surfaceDropM(AXIS_KM) - SEA_MARGIN_M;
const FONT = { min: 11, max: 13, perWidth: 0.02 } as const;
const TEXT = { ascent: 0.78, descent: 0.24 } as const;
const SPACE = { pad: 6, gap: 4, shipGutter: 18, tick: 3 } as const;
const SHIP = { aft: 14, bow: 10, deckM: 4, minHullPx: 5, antenna: 5 } as const;
const BOAT_ICON = { length: 10, height: 4 } as const;
const WAVE = { pxPerMetre: 1.5, periodPx: 9, stepPx: 1.5 } as const;
const LINE = { surface: 1.5, sight: 1.8, mast: 1.5, tick: 1, halo: 3, dash: [4, 4] } as const;
const OBSTACLE = { stepPx: 12, slackPx: 2 } as const;
const SEA_FILL_ALPHA = 0.32;
const SIGHT_SHARES = [0, 0.18, 0.36, 0.5, 0.62, 0.74] as const;
const SEA_ROWS = [0, 1, 2, 3] as const;
const NOTE_ROWS = [0, 1, 2] as const;
const SKY_ROWS = [0, 1, 2] as const;
const TANGENT_SLOPE = 2 / RADAR_K;

const COLORS = {
  sea: withAlpha(THEME.waterWall, SEA_FILL_ALPHA),
  surface: THEME.waterWall,
  ship: THEME.ship,
  antenna: THEME.text,
  sight: THEME.sprint,
  detection: THEME.hump,
  boat: THEME.panel,
  muted: THEME.muted,
  halo: THEME.background,
} as const;

export function horizonLayout(width: number, height: number): HorizonLayout {
  const font = clamp(Math.round(width * FONT.perWidth), FONT.min, FONT.max);
  const tickBaseline = height - SPACE.pad - font * TEXT.descent;
  const plot = {
    left: SPACE.pad + SPACE.shipGutter,
    top: SPACE.pad + font + SPACE.gap,
    right: width - SPACE.pad,
    bottom: tickBaseline - font * TEXT.ascent - SPACE.gap - SPACE.tick,
  };
  return {
    metrics: { font, ...TEXT },
    bounds: { left: SPACE.pad, top: SPACE.pad, right: width - SPACE.pad, bottom: plot.bottom },
    plot,
    pxPerKm: (plot.right - plot.left) / AXIS_KM,
    pxPerMetre: (plot.bottom - plot.top) / (SKY_TOP_M - SEA_FLOOR_M),
    tickBaseline,
  };
}

export function xOfKm(layout: HorizonLayout, km: number): number {
  return layout.plot.left + km * layout.pxPerKm;
}

export function yOfMetres(layout: HorizonLayout, metres: number): number {
  return layout.plot.top + (SKY_TOP_M - metres) * layout.pxPerMetre;
}

export function surfaceY(layout: HorizonLayout, km: number): number {
  return yOfMetres(layout, -surfaceDropM(km));
}

export function sightHeightM(radarHeight: number, km: number): number {
  return radarHeight - TANGENT_SLOPE * Math.sqrt(radarHeight) * km;
}

function kmOfX(layout: HorizonLayout, x: number): number {
  return (x - layout.plot.left) / layout.pxPerKm;
}

export function sightY(layout: HorizonLayout, radarHeight: number, x: number): number {
  return yOfMetres(layout, sightHeightM(radarHeight, kmOfX(layout, x)));
}

function surfaceYAtX(layout: HorizonLayout, x: number): number {
  return surfaceY(layout, kmOfX(layout, x));
}

function waveAmplitude(scene: HorizonScene): number {
  return seaAt(scene.seaState).waveHeight * WAVE.pxPerMetre;
}

function seaClearance(scene: HorizonScene): number {
  return OBSTACLE.slackPx + waveAmplitude(scene);
}

function waveOffset(x: number, amplitude: number): number {
  return -amplitude * Math.abs(Math.sin((Math.PI * x) / WAVE.periodPx));
}

function traceSurface(
  context: CanvasRenderingContext2D,
  layout: HorizonLayout,
  amplitude: number,
): void {
  const end = layout.plot.right + SPACE.pad;
  context.beginPath();
  context.moveTo(0, surfaceYAtX(layout, 0));
  for (let x = WAVE.stepPx; x <= end; x += WAVE.stepPx) {
    context.lineTo(x, surfaceYAtX(layout, x) + waveOffset(x, amplitude));
  }
}

function paintSea(
  context: CanvasRenderingContext2D,
  layout: HorizonLayout,
  scene: HorizonScene,
): void {
  const amplitude = waveAmplitude(scene);
  traceSurface(context, layout, amplitude);
  context.lineTo(layout.plot.right + SPACE.pad, layout.plot.bottom);
  context.lineTo(0, layout.plot.bottom);
  context.closePath();
  context.fillStyle = COLORS.sea;
  context.fill();
  traceSurface(context, layout, amplitude);
  context.strokeStyle = COLORS.surface;
  context.lineWidth = LINE.surface;
  context.stroke();
}

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  placed: Placed,
  color: string,
): void {
  context.textAlign = placed.align;
  context.lineJoin = 'round';
  context.lineWidth = LINE.halo;
  context.strokeStyle = COLORS.halo;
  context.strokeText(text, placed.x, placed.baseline);
  context.fillStyle = color;
  context.fillText(text, placed.x, placed.baseline);
}

function paintTicks(context: CanvasRenderingContext2D, layout: HorizonLayout): void {
  context.strokeStyle = COLORS.muted;
  context.lineWidth = LINE.tick;
  TICKS_KM.forEach((km) => {
    const x = xOfKm(layout, km);
    context.beginPath();
    context.moveTo(x, layout.plot.bottom);
    context.lineTo(x, layout.plot.bottom + SPACE.tick);
    context.stroke();
    const text = formatCanvasKm(km);
    const anchor: Anchor = { x, baseline: layout.tickBaseline, align: 'center' };
    const box = textBox(context.measureText(text).width, anchor, layout.metrics);
    drawText(context, text, shiftInto(box, anchor, layout.bounds), COLORS.muted);
  });
}

function shipBox(layout: HorizonLayout, radarHeight: number): Box {
  const mastX = xOfKm(layout, 0);
  return {
    left: mastX - SHIP.aft,
    right: mastX + SHIP.bow,
    top: yOfMetres(layout, radarHeight) - SHIP.antenna,
    bottom: yOfMetres(layout, 0),
  };
}

function paintShip(
  context: CanvasRenderingContext2D,
  layout: HorizonLayout,
  radarHeight: number,
): void {
  const mastX = xOfKm(layout, 0);
  const water = yOfMetres(layout, 0);
  const deck = Math.min(yOfMetres(layout, SHIP.deckM), water - SHIP.minHullPx);
  context.fillStyle = COLORS.ship;
  context.beginPath();
  context.moveTo(mastX - SHIP.aft, deck);
  context.lineTo(mastX + SHIP.bow, deck);
  context.lineTo(mastX + SHIP.bow - SHIP.minHullPx, water);
  context.lineTo(mastX - SHIP.aft, water);
  context.closePath();
  context.fill();
  const antenna = yOfMetres(layout, radarHeight);
  context.strokeStyle = COLORS.ship;
  context.lineWidth = LINE.mast;
  context.beginPath();
  context.moveTo(mastX, deck);
  context.lineTo(mastX, antenna);
  context.stroke();
  context.strokeStyle = COLORS.antenna;
  context.beginPath();
  context.moveTo(mastX - SHIP.antenna, antenna);
  context.lineTo(mastX + SHIP.antenna, antenna);
  context.stroke();
}

function boatBox(layout: HorizonLayout, km: number): Box {
  const x = xOfKm(layout, km);
  const water = surfaceY(layout, km);
  const half = BOAT_ICON.length / 2;
  return { left: x - half, right: x + half, top: water - BOAT_ICON.height, bottom: water };
}

function paintBoat(context: CanvasRenderingContext2D, box: Box): void {
  context.fillStyle = COLORS.boat;
  context.beginPath();
  context.moveTo(box.left, box.top);
  context.lineTo(box.right, box.top + BOAT_ICON.height / 2);
  context.lineTo(box.right - BOAT_ICON.height, box.bottom);
  context.lineTo(box.left, box.bottom);
  context.closePath();
  context.fill();
}

function detectionBox(layout: HorizonLayout): Box {
  const x = xOfKm(layout, DETECTION_KM);
  return {
    left: x - LINE.tick,
    right: x + LINE.tick,
    top: layout.plot.top,
    bottom: layout.plot.bottom,
  };
}

function paintDetection(context: CanvasRenderingContext2D, box: Box): void {
  const x = (box.left + box.right) / 2;
  context.strokeStyle = COLORS.detection;
  context.lineWidth = LINE.tick;
  context.setLineDash(LINE.dash);
  context.beginPath();
  context.moveTo(x, box.top);
  context.lineTo(x, box.bottom);
  context.stroke();
  context.setLineDash([]);
}

function paintSight(
  context: CanvasRenderingContext2D,
  layout: HorizonLayout,
  radarHeight: number,
  boatKm: number,
): void {
  const startX = xOfKm(layout, 0);
  const startY = yOfMetres(layout, radarHeight);
  context.strokeStyle = COLORS.sight;
  context.lineWidth = LINE.sight;
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(xOfKm(layout, boatKm), yOfMetres(layout, sightHeightM(radarHeight, boatKm)));
  context.stroke();
  context.beginPath();
  context.arc(startX, startY, LINE.sight, 0, FULL_TURN);
  context.fillStyle = COLORS.sight;
  context.fill();
}

export function blockedBoxes(layout: HorizonLayout, scene: HorizonScene): Box[] {
  const { stepPx, slackPx } = OBSTACLE;
  const boatKm = radarLineOfSightKm(scene.radarHeight);
  const sight = segmentBoxes(
    xOfKm(layout, 0),
    xOfKm(layout, boatKm),
    stepPx,
    (x) => sightY(layout, scene.radarHeight, x),
    slackPx,
  );
  const surface = segmentBoxes(
    layout.bounds.left,
    layout.bounds.right,
    stepPx,
    (x) => surfaceYAtX(layout, x),
    seaClearance(scene),
  );
  const marks = [shipBox(layout, scene.radarHeight), boatBox(layout, boatKm)];
  return [...marks, ...sight, ...surface];
}

function lineHeight(layout: HorizonLayout): number {
  return layout.metrics.font + SPACE.gap;
}

function baselineAbove(layout: HorizonLayout, y: number): number {
  return y - SPACE.gap - layout.metrics.font * TEXT.descent;
}

function baselineBelow(layout: HorizonLayout, y: number, row: number): number {
  return y + SPACE.gap + layout.metrics.font * TEXT.ascent + row * lineHeight(layout);
}

function radarCandidates(layout: HorizonLayout, radarHeight: number): Candidates {
  const ship = shipBox(layout, radarHeight);
  const baseline = baselineAbove(layout, ship.top);
  return () => [
    { x: xOfKm(layout, 0), baseline, align: 'center' },
    { x: ship.right + SPACE.gap, baseline, align: 'left' },
  ];
}

function skyAbove(layout: HorizonLayout, scene: HorizonScene, x: number): number {
  const from = x - OBSTACLE.stepPx;
  const crest = surfaceYAtX(layout, from) - seaClearance(scene);
  return Math.min(sightY(layout, scene.radarHeight, from) - OBSTACLE.slackPx, crest);
}

function skyRows(layout: HorizonLayout, x: number, align: TextAlign): Anchor[] {
  return SKY_ROWS.map((row) => ({
    x,
    baseline: layout.plot.top + layout.metrics.font + row * lineHeight(layout),
    align,
  }));
}

function boatCandidates(layout: HorizonLayout, scene: HorizonScene, boat: Box): Candidates {
  const x = (boat.left + boat.right) / 2;
  const clearance = seaClearance(scene);
  return (width) => [
    ...SEA_ROWS.map((row) => ({
      x,
      baseline: baselineBelow(layout, surfaceYAtX(layout, x + width / 2) + clearance, row),
      align: 'center' as const,
    })),
    ...SEA_ROWS.map((row) => ({
      x: boat.left,
      baseline: baselineBelow(layout, surfaceYAtX(layout, boat.left + width) + clearance, row),
      align: 'left' as const,
    })),
    {
      x: boat.right,
      baseline: baselineAbove(layout, skyAbove(layout, scene, boat.right - width)),
      align: 'right' as const,
    },
  ];
}

function sightCandidates(layout: HorizonLayout, scene: HorizonScene, boatKm: number): Candidates {
  return () =>
    SIGHT_SHARES.map((share) => {
      const x = xOfKm(layout, share * boatKm) + SHIP.bow + SPACE.gap;
      return {
        x,
        baseline: baselineAbove(layout, skyAbove(layout, scene, x)),
        align: 'left' as const,
      };
    });
}

function detectionCandidates(layout: HorizonLayout, scene: HorizonScene): Candidates {
  const line = xOfKm(layout, DETECTION_KM);
  const right = line + SPACE.gap;
  const left = line - SPACE.gap;
  const clearance = seaClearance(scene);
  return (width) => [
    ...SEA_ROWS.flatMap((row) => [
      {
        x: right,
        baseline: baselineBelow(layout, surfaceYAtX(layout, right + width) + clearance, row),
        align: 'left' as const,
      },
      {
        x: left,
        baseline: baselineBelow(layout, surfaceYAtX(layout, left) + clearance, row),
        align: 'right' as const,
      },
    ]),
    ...skyRows(layout, right, 'left'),
    ...skyRows(layout, left, 'right'),
  ];
}

function noteCandidates(layout: HorizonLayout): Candidates {
  return () =>
    NOTE_ROWS.map((row) => ({
      x: layout.bounds.right,
      baseline: layout.plot.top - SPACE.gap + row * lineHeight(layout),
      align: 'right' as const,
    }));
}

function label(painter: LabelPainter, key: string, candidates: Candidates, color: string): void {
  const { context, layout, taken } = painter;
  const text = t(key);
  const width = context.measureText(text).width;
  drawText(
    context,
    text,
    placeText(width, candidates(width), taken, layout.bounds, layout.metrics),
    color,
  );
}

function paintLabels(painter: LabelPainter, scene: HorizonScene, boatKm: number): void {
  const { layout } = painter;
  const boat = boatBox(layout, boatKm);
  label(
    painter,
    'horizon.canvas.radar',
    radarCandidates(layout, scene.radarHeight),
    COLORS.antenna,
  );
  if (detectionCovered(scene.seaState)) painter.taken.push(detectionBox(layout));
  label(painter, 'horizon.canvas.boat', boatCandidates(layout, scene, boat), COLORS.boat);
  label(
    painter,
    'horizon.canvas.lineOfSight',
    sightCandidates(layout, scene, boatKm),
    COLORS.sight,
  );
  if (detectionCovered(scene.seaState)) {
    label(
      painter,
      'horizon.canvas.detection',
      detectionCandidates(layout, scene),
      COLORS.detection,
    );
  }
  label(painter, 'horizon.canvas.note', noteCandidates(layout), COLORS.muted);
}

export function paintHorizon(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  scene: HorizonScene,
): void {
  const layout = horizonLayout(frame.width, frame.height);
  const boatKm = radarLineOfSightKm(scene.radarHeight);
  const covered = detectionCovered(scene.seaState);
  const boat = boatBox(layout, boatKm);
  context.font = canvasFont(frame, layout.metrics.font);
  context.textBaseline = 'alphabetic';
  paintSea(context, layout, scene);
  paintTicks(context, layout);
  if (covered) paintDetection(context, detectionBox(layout));
  paintShip(context, layout, scene.radarHeight);
  paintSight(context, layout, scene.radarHeight, boatKm);
  paintBoat(context, boat);
  paintLabels({ context, layout, taken: blockedBoxes(layout, scene) }, scene, boatKm);
}

export class HorizonView {
  private readonly surface: CanvasSurface;
  private painted: HorizonScene | null = null;
  private language = currentLanguage();

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
  }

  draw(scene: HorizonScene): void {
    const language = currentLanguage();
    if (this.isPainted(scene) && language === this.language) return;
    this.painted = { ...scene };
    this.language = language;
    this.surface.paint((context, frame) => paintHorizon(context, frame, scene));
  }

  dispose(): void {
    this.surface.dispose();
  }

  private isPainted(scene: HorizonScene): boolean {
    return (
      this.painted?.radarHeight === scene.radarHeight && this.painted.seaState === scene.seaState
    );
  }
}
