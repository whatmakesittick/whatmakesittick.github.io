import { FULL_TURN } from '@core/math';
import type { FluidId, LayerId } from '../ids';
import { LAYERS, RESERVOIR_FLUIDS, ROCKS, fluidAt, layerAt, packGrains } from '../model';
import type { GrainPacking } from '../model';
import { CANVAS_COLORS } from './canvasColors';
import { CanvasSurface } from './canvasSurface';
import type { CanvasFrame } from './canvasSurface';

type GrainKind = 'clay' | 'sand' | 'shale' | 'organic';

export interface PoreScene {
  porosity: number;
  fluid: FluidId;
  grain: GrainKind | null;
}

const GRAIN_OF_LAYER: Record<LayerId, GrainKind> = {
  seabed: 'clay',
  claystone: 'clay',
  aquifer: 'sand',
  shaleSands: 'shale',
  seal: 'shale',
  reservoir: 'sand',
  base: 'shale',
  sourceRock: 'organic',
};

const PACKINGS: Record<GrainKind, GrainPacking> = {
  clay: { spacing: 18, flatten: 0.75 },
  sand: { spacing: 40, flatten: 1 },
  shale: { spacing: 26, flatten: 0.5 },
  organic: { spacing: 22, flatten: 0.55 },
};

const GLOSSY: ReadonlySet<GrainKind> = new Set<GrainKind>(['sand']);

const GRAIN_COLORS: Record<GrainKind, string> = {
  clay: CANVAS_COLORS.clay,
  sand: CANVAS_COLORS.sand,
  shale: CANVAS_COLORS.shale,
  organic: CANVAS_COLORS.organic,
};

const FLUID_COLORS: Record<FluidId, string> = {
  gas: CANVAS_COLORS.gas,
  oil: CANVAS_COLORS.oil,
  water: CANVAS_COLORS.brine,
};

const REFERENCE_WIDTH = 480;
const GRAIN_SEED = 20260928;
const SHADE_STRENGTH = 0.35;
const HIGHLIGHT = { offset: 0.3, radius: 0.35 } as const;

const SEA_SCENE: PoreScene = { porosity: 1, fluid: 'water', grain: null };

function layerScene(layer: LayerId, fluid: FluidId): PoreScene {
  return { porosity: ROCKS[layer].porosity, fluid, grain: GRAIN_OF_LAYER[layer] };
}

const LAYER_SCENES = new Map<LayerId, PoreScene>(
  LAYERS.map((layer) => [layer.id, layerScene(layer.id, ROCKS[layer.id].fluid)]),
);
const RESERVOIR_SCENES = new Map<FluidId, PoreScene>(
  RESERVOIR_FLUIDS.map((leg) => [leg.id, layerScene('reservoir', leg.id)]),
);

export function poreSceneAt(depth: number): PoreScene {
  const layer = layerAt(depth);
  if (!layer) return SEA_SCENE;
  const fluid = fluidAt(depth);
  return (fluid && RESERVOIR_SCENES.get(fluid)) || LAYER_SCENES.get(layer.id) || SEA_SCENE;
}

function paintGloss(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  const offset = radius * HIGHLIGHT.offset;
  context.beginPath();
  context.arc(x - offset, y - offset, radius * HIGHLIGHT.radius, 0, FULL_TURN);
  context.fillStyle = CANVAS_COLORS.grainLight;
  context.fill();
}

function paintGrains(
  context: CanvasRenderingContext2D,
  frame: CanvasFrame,
  scene: PoreScene,
  grain: GrainKind,
): void {
  const base = PACKINGS[grain];
  const packing = { ...base, spacing: (base.spacing * frame.width) / REFERENCE_WIDTH };
  const grains = packGrains(frame.width, frame.height, packing, scene.porosity, GRAIN_SEED);
  for (const { x, y, radius, shade } of grains) {
    context.beginPath();
    context.ellipse(x, y, radius, radius * packing.flatten, 0, 0, FULL_TURN);
    context.globalAlpha = 1;
    context.fillStyle = GRAIN_COLORS[grain];
    context.fill();
    context.globalAlpha = Math.abs(shade - 0.5) * SHADE_STRENGTH;
    context.fillStyle = shade > 0.5 ? CANVAS_COLORS.grainLight : CANVAS_COLORS.grainDark;
    context.fill();
    context.globalAlpha = 1;
    if (GLOSSY.has(grain)) paintGloss(context, x, y, radius);
  }
}

function paintPores(context: CanvasRenderingContext2D, frame: CanvasFrame, scene: PoreScene): void {
  context.fillStyle = FLUID_COLORS[scene.fluid];
  context.fillRect(0, 0, frame.width, frame.height);
  if (scene.grain) paintGrains(context, frame, scene, scene.grain);
}

export class PoresView {
  private readonly surface: CanvasSurface;
  private painted: PoreScene | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.surface = new CanvasSurface(canvas);
  }

  draw(scene: PoreScene): void {
    if (scene === this.painted) return;
    this.painted = scene;
    this.surface.paint((context, frame) => paintPores(context, frame, scene));
  }

  dispose(): void {
    this.surface.dispose();
  }
}
