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
import { formatCanvasKm } from './format';

export interface HorizonScene {
  radarHeight: number;
  seaState: SeaStateId;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface HorizonLayout {
  font: number;
  bounds: Box;
  plot: Box;
  pxPerKm: number;
  pxPerMetre: number;
  tickBaseline: number;
}

interface Anchor {
  x: number;
  baseline: number;
  align: 'left' | 'right' | 'center';
}

interface Placed extends Anchor {
  box: Box;
}

export const AXIS_KM = 35;
export const TICKS_KM = [0, 10, 20, 30] as const;

const MAST_HEADROOM_M = 6;
const SEA_MARGIN_M = 4;
const SKY_TOP_M = RADAR_HEIGHT_M.max + MAST_HEADROOM_M;
const SEA_FLOOR_M = -surfaceDropM(AXIS_KM) - SEA_MARGIN_M;
const FONT = { min: 11, max: 13, perWidth: 0.02 } as const;
const SPACE = { pad: 6, gap: 4, shipGutter: 18, tick: 3 } as const;
const TEXT = { ascent: 0.78, descent: 0.24 } as const;
const SHIP = { aft: 14, bow: 10, deckM: 4, minHullPx: 5, antenna: 5 } as const;
const BOAT_ICON = { length: 10, height: 4 } as const;
const WAVE = { pxPerMetre: 1.5, periodPx: 9, stepPx: 1.5 } as const;
const LINE = { surface: 1.5, sight: 1.8, mast: 1.5, tick: 1, dash: [4, 4] } as const;
const SEA_FILL_ALPHA = 0.32;
const LOS_START_SHARES = [0, 0.18, 0.36, 0.5, 0.62, 0.74] as const;
const DETECTION_LINES = [0, 1, 2] as const;
const NOTE_ROWS = [0, 1, 2] as const;

const COLORS = {
  sea: withAlpha(THEME.waterWall, SEA_FILL_ALPHA),
  surface: THEME.waterWall,
  ship: THEME.ship,
  antenna: THEME.text,
  sight: THEME.sprint,
  detection: THEME.hump,
  boat: THEME.panel,
  muted: THEME.muted,
} as const;

export function horizonLayout(width: number, height: number): HorizonLayout {
  const font = clamp(Math.round(width * FONT.perWidth), FONT.min, FONT.max);
  const bounds = { left: SPACE.pad, top: SPACE.pad, right: width - SPACE.pad, bottom: height };
  const tickBaseline = height - SPACE.pad - font * TEXT.descent;
  const plot = {
    left: SPACE.pad + SPACE.shipGutter,
    top: SPACE.pad + font + SPACE.gap,
    right: width - SPACE.pad,
    bottom: tickBaseline - font * TEXT.ascent - SPACE.gap - SPACE.tick,
  };
  return {
    font,
    bounds,
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
  return radarHeight - ((2 * Math.sqrt(radarHeight)) / RADAR_K) * km;
}

function kmOfX(layout: HorizonLayout, x: number): number {
  return (x - layout.plot.left) / layout.pxPerKm;
}

function sightY(layout: HorizonLayout, radarHeight: number, x: number): number {
  return yOfMetres(layout, sightHeightM(radarHeight, kmOfX(layout, x)));
}

export function intersects(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function isInside(box: Box, bounds: Box): boolean {
  return box.top >= bounds.top && box.bottom <= bounds.bottom;
}

function textBox(
  context: CanvasRenderingContext2D,
  text: string,
  anchor: Anchor,
  font: number,
): Box {
  const width = context.measureText(text).width;
  const offset = { left: 0, center: width / 2, right: width }[anchor.align];
  const left = anchor.x - offset;
  return {
    left,
    right: left + width,
    top: anchor.baseline - font * TEXT.ascent,
    bottom: anchor.baseline + font * TEXT.descent,
  };
}

function shiftInto(box: Box, anchor: Anchor, bounds: Box): Placed {
  const shift = clamp(0, bounds.left - box.left, bounds.right - box.right);
  return {
    ...anchor,
    x: anchor.x + shift,
    box: { ...box, left: box.left + shift, right: box.right + shift },
  };
}

export function placeLabel(
  context: CanvasRenderingContext2D,
  text: string,
  candidates: readonly Anchor[],
  taken: Box[],
  layout: HorizonLayout,
): Placed {
  const placed = candidates.map((anchor) =>
    shiftInto(textBox(context, text, anchor, layout.font), anchor, layout.bounds),
  );
  const free = placed.find(
    (spot) => isInside(spot.box, layout.bounds) && !taken.some((box) => intersects(box, spot.box)),
  );
  const chosen = free ?? placed[0];
  taken.push(chosen.box);
  return chosen;
}

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  placed: Placed,
  color: string,
): void {
  context.fillStyle = color;
  context.textAlign = placed.align;
  context.fillText(text, placed.x, placed.baseline);
}

function waveOffset(x: number, amplitude: number): number {
  return -amplitude * Math.abs(Math.sin((Math.PI * x) / WAVE.periodPx));
}

function traceSurface(context: CanvasRenderingContext2D, layout: HorizonLayout, amplitude: number) {
  const from = layout.bounds.left - SPACE.pad;
  const to = layout.plot.right + SPACE.pad;
  context.beginPath();
  for (let x = from; x <= to; x += WAVE.stepPx) {
    const y = surfaceY(layout, kmOfX(layout, x)) + waveOffset(x, amplitude);
    if (x === from) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
}

function paintSea(context: CanvasRenderingContext2D, layout: HorizonLayout, scene: HorizonScene) {
  const amplitude = seaAt(scene.seaState).waveHeight * WAVE.pxPerMetre;
  traceSurface(context, layout, amplitude);
  context.lineTo(layout.plot.right + SPACE.pad, layout.plot.bottom);
  context.lineTo(layout.bounds.left - SPACE.pad, layout.plot.bottom);
  context.closePath();
  context.fillStyle = COLORS.sea;
  context.fill();
  traceSurface(context, layout, amplitude);
  context.strokeStyle = COLORS.surface;
  context.lineWidth = LINE.surface;
  context.stroke();
}

function paintTicks(context: CanvasRenderingContext2D, layout: HorizonLayout): void {
  context.strokeStyle = COLORS.muted;
  context.fillStyle = COLORS.muted;
  context.lineWidth = LINE.tick;
  TICKS_KM.forEach((km) => {
    const x = xOfKm(layout, km);
    context.beginPath();
    context.moveTo(x, layout.plot.bottom);
    context.lineTo(x, layout.plot.bottom + SPACE.tick);
    context.stroke();
    const text = formatCanvasKm(km);
    const anchor: Anchor = { x, baseline: layout.tickBaseline, align: 'center' };
    const placed = shiftInto(textBox(context, text, anchor, layout.font), anchor, layout.bounds);
    drawText(context, text, placed, COLORS.muted);
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

function paintShip(context: CanvasRenderingContext2D, layout: HorizonLayout, radarHeight: number) {
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
  context.strokeStyle = COLORS.sight;
  context.lineWidth = LINE.sight;
  context.beginPath();
  context.moveTo(xOfKm(layout, 0), yOfMetres(layout, radarHeight));
  context.lineTo(xOfKm(layout, boatKm), yOfMetres(layout, sightHeightM(radarHeight, boatKm)));
  context.stroke();
  context.beginPath();
  context.arc(xOfKm(layout, 0), yOfMetres(layout, radarHeight), LINE.sight, 0, FULL_TURN);
  context.fillStyle = COLORS.sight;
  context.fill();
}

function below(box: Box, layout: HorizonLayout, lines: number): number {
  return box.bottom + SPACE.gap + layout.font * TEXT.ascent + lines * (layout.font + SPACE.gap);
}

function above(box: Box, layout: HorizonLayout): number {
  return box.top - SPACE.gap - layout.font * TEXT.descent;
}

function sightAnchors(layout: HorizonLayout, scene: HorizonScene, boatKm: number): Anchor[] {
  return LOS_START_SHARES.map((share) => {
    const x = xOfKm(layout, share * boatKm) + SHIP.bow + SPACE.gap;
    const baseline = sightY(layout, scene.radarHeight, x) - SPACE.gap - layout.font * TEXT.descent;
    return { x, baseline, align: 'left' as const };
  });
}

interface LabelPainter {
  context: CanvasRenderingContext2D;
  layout: HorizonLayout;
  taken: Box[];
}

function label(
  painter: LabelPainter,
  key: string,
  candidates: readonly Anchor[],
  color: string,
): void {
  const { context, layout, taken } = painter;
  const text = t(key);
  drawText(context, text, placeLabel(context, text, candidates, taken, layout), color);
}

function radarAnchors(layout: HorizonLayout, radarHeight: number): Anchor[] {
  const ship = shipBox(layout, radarHeight);
  return [
    { x: xOfKm(layout, 0), baseline: above(ship, layout), align: 'center' },
    { x: ship.right + SPACE.gap, baseline: above(ship, layout) + layout.font, align: 'left' },
  ];
}

function boatAnchors(layout: HorizonLayout, boat: Box): Anchor[] {
  return [
    { x: (boat.left + boat.right) / 2, baseline: below(boat, layout, 0), align: 'center' },
    { x: boat.right, baseline: above(boat, layout), align: 'right' },
  ];
}

function detectionAnchors(layout: HorizonLayout): Anchor[] {
  const x = xOfKm(layout, DETECTION_KM) + SPACE.gap;
  const water = surfaceY(layout, DETECTION_KM);
  const surface = { left: x, right: x, top: water, bottom: water };
  return DETECTION_LINES.map((lines) => ({
    x,
    baseline: below(surface, layout, lines),
    align: 'left',
  }));
}

function noteAnchors(layout: HorizonLayout): Anchor[] {
  return NOTE_ROWS.map((row) => ({
    x: layout.bounds.right,
    baseline: layout.plot.top - SPACE.gap + row * (layout.font + SPACE.gap),
    align: 'right',
  }));
}

function paintLabels(painter: LabelPainter, scene: HorizonScene, boatKm: number): void {
  const { layout } = painter;
  label(painter, 'horizon.canvas.radar', radarAnchors(layout, scene.radarHeight), COLORS.antenna);
  label(painter, 'horizon.canvas.boat', boatAnchors(layout, boatBox(layout, boatKm)), COLORS.boat);
  label(painter, 'horizon.canvas.lineOfSight', sightAnchors(layout, scene, boatKm), COLORS.sight);
  if (detectionCovered(scene.seaState)) {
    label(painter, 'horizon.canvas.detection', detectionAnchors(layout), COLORS.detection);
  }
  label(painter, 'horizon.canvas.note', noteAnchors(layout), COLORS.muted);
}

export function paintHorizon(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  scene: HorizonScene,
): void {
  const layout = horizonLayout(frame.width, frame.height);
  const boatKm = radarLineOfSightKm(scene.radarHeight);
  const covered = detectionCovered(scene.seaState);
  context.font = canvasFont(frame, layout.font);
  context.textBaseline = 'alphabetic';
  paintSea(context, layout, scene);
  paintTicks(context, layout);
  if (covered) paintDetection(context, detectionBox(layout));
  paintShip(context, layout, scene.radarHeight);
  paintSight(context, layout, scene.radarHeight, boatKm);
  const boat = boatBox(layout, boatKm);
  paintBoat(context, boat);
  const taken = [shipBox(layout, scene.radarHeight), boat];
  if (covered) taken.push(detectionBox(layout));
  paintLabels({ context, layout, taken }, scene, boatKm);
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
