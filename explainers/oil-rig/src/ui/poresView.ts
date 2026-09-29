import { currentLanguage } from '@core/i18n';
import { FULL_TURN, toRadians } from '@core/math';
import { CanvasSurface, canvasFont } from '@core/ui/canvasSurface';
import type { CanvasFrame } from '@core/ui/canvasSurface';
import type { FluidId, LayerId } from '../ids';
import { ROCKS, fluidLeg, layPlates, layerAt, packSand, placeBubbles, poreFluidAt } from '../model';
import type { Bubble, Grain, Plate, PlateBed, PlateFabric } from '../model';
import { CANVAS_COLORS } from './canvasColors';
import { formatScaleLength } from './format';

type Fabric = 'sand' | 'clay' | 'shale' | 'organic';
type PlateKind = Exclude<Fabric, 'sand'>;

export interface PoreScene {
  porosity: number;
  fluid: FluidId;
  fabric: Fabric;
}

export interface PoreColors {
  grain: string;
  fluid: string;
}

interface ScaleBar {
  lengthMm: number;
  viewWidthMm: number;
}

const FABRIC_OF_LAYER: Record<LayerId, Fabric> = {
  seabed: 'clay',
  claystone: 'clay',
  aquifer: 'sand',
  shaleSands: 'shale',
  seal: 'shale',
  reservoir: 'sand',
  base: 'shale',
  sourceRock: 'organic',
};

const PLATE_FABRICS: Record<PlateKind, PlateFabric> = {
  clay: { length: 70, thickness: 12, tilt: toRadians(-7) },
  shale: { length: 90, thickness: 10, tilt: toRadians(-5) },
  organic: { length: 80, thickness: 10, tilt: toRadians(-6) },
};

const GRAIN_COLORS: Record<Fabric, string> = {
  sand: CANVAS_COLORS.sand,
  clay: CANVAS_COLORS.clay,
  shale: CANVAS_COLORS.shale,
  organic: CANVAS_COLORS.organic,
};

const FLUID_COLORS: Record<FluidId, string> = {
  gas: CANVAS_COLORS.gasPore,
  oil: CANVAS_COLORS.oil,
  water: CANVAS_COLORS.brine,
};

const LIGHT_FLUIDS: ReadonlySet<FluidId> = new Set<FluidId>(['gas']);
const FILMED_FLUIDS: ReadonlySet<FluidId> = new Set<FluidId>(['gas', 'oil']);

const SCALE_BARS: Record<'grains' | 'plates', ScaleBar> = {
  grains: { lengthMm: 0.5, viewWidthMm: 2 },
  plates: { lengthMm: 0.002, viewWidthMm: 0.008 },
};

const VIEW = { width: 480, height: 240 } as const;
const SEED = 20260928;
const BUBBLE_COUNT = 7;
const LINE = { outline: 1, film: 4, bubble: 1.2 } as const;
const SHADE = { offset: 0.35, inner: 0.1, variation: 0.12 } as const;
const SCALE_BAR = { inset: 10, padding: 7, tick: 4, font: 11, line: 1.5, gap: 6 } as const;
const OIL_LEG = fluidLeg('oil');

const scenes = new Map<string, PoreScene>();
const sandPackings = new Map<number, readonly Grain[]>();
const bubbleSets = new Map<number, readonly Bubble[]>();
const plateBeds = new Map<string, PlateBed>();

function cached<K, V>(cache: Map<K, V>, key: K, build: () => V): V {
  const hit = cache.get(key);
  if (hit) return hit;
  const value = build();
  cache.set(key, value);
  return value;
}

function layerScene(layer: LayerId, fluid: FluidId): PoreScene {
  return cached(scenes, `${layer}:${fluid}`, () => ({
    porosity: ROCKS[layer].porosity,
    fluid,
    fabric: FABRIC_OF_LAYER[layer],
  }));
}

export function poreSceneAt(depth: number): PoreScene {
  const layer = layerAt(depth);
  const fluid = poreFluidAt(depth);
  return layer && fluid ? layerScene(layer.id, fluid) : poreSceneAt(OIL_LEG.top);
}

export function poreColors(scene: PoreScene): PoreColors {
  const shaded = LIGHT_FLUIDS.has(scene.fluid);
  return {
    grain: shaded ? CANVAS_COLORS.sandShaded : GRAIN_COLORS[scene.fabric],
    fluid: FLUID_COLORS[scene.fluid],
  };
}

function sandFor(porosity: number): readonly Grain[] {
  return cached(sandPackings, porosity, () => packSand(VIEW, porosity, SEED));
}

function bubblesFor(porosity: number): readonly Bubble[] {
  return cached(bubbleSets, porosity, () => placeBubbles(sandFor(porosity), VIEW, BUBBLE_COUNT));
}

function platesFor(kind: PlateKind, porosity: number): PlateBed {
  return cached(plateBeds, `${kind}:${porosity}`, () =>
    layPlates(VIEW, PLATE_FABRICS[kind], porosity, SEED),
  );
}

function traceGrain(context: CanvasRenderingContext2D, grain: Grain): void {
  context.beginPath();
  grain.outline.forEach((point, index) => {
    const x = grain.x + point.x * grain.radius;
    const y = grain.y + point.y * grain.radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
}

function grainShade(context: CanvasRenderingContext2D, grain: Grain): CanvasGradient {
  const { x, y, radius } = grain;
  const offset = radius * SHADE.offset;
  const shade = context.createRadialGradient(
    x - offset,
    y - offset,
    radius * SHADE.inner,
    x,
    y,
    radius,
  );
  shade.addColorStop(0, CANVAS_COLORS.grainLight);
  shade.addColorStop(1, CANVAS_COLORS.grainDark);
  return shade;
}

function paintGrain(context: CanvasRenderingContext2D, grain: Grain, color: string): void {
  traceGrain(context, grain);
  context.fillStyle = color;
  context.fill();
  context.globalAlpha = Math.abs(grain.shade - 0.5) * 2 * SHADE.variation;
  context.fillStyle = grain.shade > 0.5 ? CANVAS_COLORS.grainLight : CANVAS_COLORS.grainDark;
  context.fill();
  context.globalAlpha = 1;
  context.fillStyle = grainShade(context, grain);
  context.fill();
  context.strokeStyle = CANVAS_COLORS.grainOutline;
  context.lineWidth = LINE.outline;
  context.stroke();
}

function paintFilms(context: CanvasRenderingContext2D, grains: readonly Grain[]): void {
  context.strokeStyle = CANVAS_COLORS.brine;
  context.lineWidth = LINE.film;
  context.lineJoin = 'round';
  grains.forEach((grain) => {
    traceGrain(context, grain);
    context.stroke();
  });
}

function paintBubbles(context: CanvasRenderingContext2D, bubbles: readonly Bubble[]): void {
  context.strokeStyle = CANVAS_COLORS.bubble;
  context.lineWidth = LINE.bubble;
  bubbles.forEach(({ x, y, radius }) => {
    context.beginPath();
    context.arc(x, y, radius, 0, FULL_TURN);
    context.stroke();
  });
}

function paintSand(context: CanvasRenderingContext2D, scene: PoreScene, color: string): void {
  const grains = sandFor(scene.porosity);
  if (FILMED_FLUIDS.has(scene.fluid)) paintFilms(context, grains);
  grains.forEach((grain) => paintGrain(context, grain, color));
  if (LIGHT_FLUIDS.has(scene.fluid)) paintBubbles(context, bubblesFor(scene.porosity));
}

function plateShade(context: CanvasRenderingContext2D, top: number, bottom: number) {
  const shade = context.createLinearGradient(0, top, 0, bottom);
  shade.addColorStop(0, CANVAS_COLORS.grainLight);
  shade.addColorStop(1, CANVAS_COLORS.grainDark);
  return shade;
}

function paintPlate(context: CanvasRenderingContext2D, plate: Plate, color: string): void {
  const top = plate.y - plate.thickness / 2;
  const left = plate.x - plate.length / 2;
  context.beginPath();
  context.roundRect(left, top, plate.length, plate.thickness, plate.cornerRadius);
  context.fillStyle = color;
  context.fill();
  context.fillStyle = plateShade(context, top, top + plate.thickness);
  context.fill();
  context.strokeStyle = CANVAS_COLORS.grainOutline;
  context.lineWidth = LINE.outline;
  context.stroke();
}

function paintPlates(context: CanvasRenderingContext2D, bed: PlateBed, color: string): void {
  context.save();
  context.translate(VIEW.width / 2, VIEW.height / 2);
  context.rotate(bed.tilt);
  bed.plates.forEach((plate) => paintPlate(context, plate, color));
  context.restore();
}

function scaleBarOf(scene: PoreScene): ScaleBar {
  return scene.fabric === 'sand' ? SCALE_BARS.grains : SCALE_BARS.plates;
}

function paintScaleBar(context: CanvasRenderingContext2D, frame: CanvasFrame, scene: PoreScene) {
  const bar = scaleBarOf(scene);
  const length = (bar.lengthMm / bar.viewWidthMm) * frame.width;
  const label = formatScaleLength(bar.lengthMm);
  context.font = canvasFont(frame, SCALE_BAR.font);
  const { padding, inset, gap, tick } = SCALE_BAR;
  const width = padding + length + gap + context.measureText(label).width + padding;
  const height = SCALE_BAR.font + 2 * padding;
  const left = inset;
  const top = frame.height - inset - height;
  const middle = top + height / 2;
  context.beginPath();
  context.roundRect(left, top, width, height, height / 2);
  context.fillStyle = CANVAS_COLORS.scaleBack;
  context.fill();
  context.beginPath();
  context.moveTo(left + padding, middle - tick);
  context.lineTo(left + padding, middle + tick);
  context.moveTo(left + padding, middle);
  context.lineTo(left + padding + length, middle);
  context.moveTo(left + padding + length, middle - tick);
  context.lineTo(left + padding + length, middle + tick);
  context.strokeStyle = CANVAS_COLORS.scaleInk;
  context.lineWidth = SCALE_BAR.line;
  context.stroke();
  context.fillStyle = CANVAS_COLORS.scaleInk;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(label, left + padding + length + gap, middle);
}

function paintPores(context: CanvasRenderingContext2D, frame: CanvasFrame, scene: PoreScene) {
  const colors = poreColors(scene);
  const scale = frame.width / VIEW.width;
  context.save();
  context.scale(scale, scale);
  context.fillStyle = colors.fluid;
  context.fillRect(0, 0, VIEW.width, VIEW.height);
  if (scene.fabric === 'sand') paintSand(context, scene, colors.grain);
  else paintPlates(context, platesFor(scene.fabric, scene.porosity), colors.grain);
  context.restore();
  paintScaleBar(context, frame, scene);
}

export class PoresView {
  private readonly surface: CanvasSurface;
  private painted: { scene: PoreScene | null; language: string } = { scene: null, language: '' };

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
  }

  draw(scene: PoreScene): void {
    const language = currentLanguage();
    if (scene === this.painted.scene && language === this.painted.language) return;
    this.painted = { scene, language };
    this.surface.paint((context, frame) => paintPores(context, frame, scene));
  }

  dispose(): void {
    this.surface.dispose();
  }
}
