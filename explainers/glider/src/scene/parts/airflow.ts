import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import type { PointsMaterial } from 'three';
import { createPointMaterial, PointCloud } from '@core/scene/pointCloud';
import type { ResourceTracker } from '@core/scene/resources';
import { lerp } from '../../model';
import { METRES_PER_UNIT, PARTICLES, RENDER_ORDER, RIDGE_FLOW, WAVE } from '../constants';
import {
  SLOPE_STEP,
  WAVE_STEEPEST,
  WINDWARD_SLOPE,
  airTone,
  edgeFade,
  ridgeFlowY,
  slopeOf,
  waveY,
} from '../streams';
import type { EmphasisGroup, PartContext } from './context';

export interface AirLifts {
  ridge: number;
  wave: number;
}

interface Drifter {
  progress: number;
  height: number;
  z: number;
}

interface StreamSpec {
  startX: number;
  endX: number;
  fade: number;
  opacity: number;
  y(x: number, drifter: Drifter): number;
}

const XYZ = 3;
const RGB = 3;
const tone = new Color();

function pick<T>(options: readonly T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

class StreamParticles {
  readonly cloud: PointCloud;
  private readonly drifters: Drifter[];
  private readonly spec: StreamSpec;

  constructor(
    spec: StreamSpec,
    material: PointsMaterial,
    drifters: Drifter[],
    tracker: ResourceTracker,
  ) {
    this.spec = spec;
    this.drifters = drifters;
    this.cloud = tracker.track(new PointCloud(drifters.length, material, RENDER_ORDER.particles));
  }

  update(speed: number, deltaSeconds: number): void {
    const step = (speed * deltaSeconds) / (this.spec.endX - this.spec.startX);
    this.drifters.forEach((drifter, index) => {
      drifter.progress = (((drifter.progress + step) % 1) + 1) % 1;
      this.place(index, drifter);
    });
    this.cloud.commit();
  }

  private place(index: number, drifter: Drifter): void {
    const { startX, endX, fade, opacity, y } = this.spec;
    const x = lerp(startX, endX, drifter.progress);
    const slope = (y(x + SLOPE_STEP, drifter) - y(x - SLOPE_STEP, drifter)) / (2 * SLOPE_STEP);
    airTone(slope, tone);
    this.cloud.setPoint(index, x, y(x, drifter), drifter.z);
    this.cloud.setColor(index, tone.r, tone.g, tone.b, edgeFade(drifter.progress, fade) * opacity);
  }
}

function pointMaterial(context: PartContext, group: EmphasisGroup, size: number): PointsMaterial {
  const material = context.tracker.track(createPointMaterial(context.textures.dot, size));
  context.materials.register(group, material);
  return material;
}

interface StreamLine {
  z: number;
  y(x: number): number;
}

function ridgeDrifters(): Drifter[] {
  return Array.from({ length: PARTICLES.ridge.count }, (_, index) => ({
    progress: index / PARTICLES.ridge.count,
    height: pick(RIDGE_FLOW.heights),
    z: pick(RIDGE_FLOW.lanes) + (Math.random() * 2 - 1) * RIDGE_FLOW.laneJitter,
  }));
}

function waveDrifters(): Drifter[] {
  const [nearest, farthest] = WAVE.particleDepth;
  return Array.from({ length: PARTICLES.wave.count }, (_, index) => ({
    progress: index / PARTICLES.wave.count,
    height: lerp(WAVE.lowest, WAVE.highest, Math.random()),
    z: lerp(nearest, farthest, Math.random()),
  }));
}

function ridgeLines(): StreamLine[] {
  return RIDGE_FLOW.lanes.flatMap((z) =>
    RIDGE_FLOW.heights.map((height) => ({ z, y: (x: number) => ridgeFlowY(x, z, height) })),
  );
}

function waveLines(): StreamLine[] {
  const heights = Array.from({ length: WAVE.lines }, (_, index) =>
    lerp(WAVE.lowest, WAVE.highest, index / (WAVE.lines - 1)),
  );
  return heights.flatMap((height) =>
    WAVE.depths.map((z) => ({ z, y: (x: number) => waveY(x, height) })),
  );
}

function linesGeometry(lines: readonly StreamLine[], startX: number, endX: number): BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const step = (endX - startX) / PARTICLES.lineSamples;
  const push = (line: StreamLine, x: number) => {
    positions.push(x, line.y(x), line.z);
    airTone(slopeOf(line.y, x), tone).toArray(colors, colors.length);
  };
  lines.forEach((line) => {
    for (let sample = 0; sample < PARTICLES.lineSamples; sample++) {
      const x = startX + sample * step;
      push(line, x);
      push(line, x + step);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), XYZ));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), RGB));
  return geometry;
}

function lineSegments(
  context: PartContext,
  group: EmphasisGroup,
  geometry: BufferGeometry,
): LineSegments {
  const material = context.tracker.track(
    new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: PARTICLES.lineOpacity,
      depthWrite: false,
    }),
  );
  context.materials.register(group, material);
  const segments = new LineSegments(context.tracker.track(geometry), material);
  segments.renderOrder = RENDER_ORDER.lines;
  return segments;
}

export class AirflowPart {
  readonly object = new Group();
  private readonly ridge: StreamParticles;
  private readonly wave: StreamParticles;

  constructor(context: PartContext) {
    this.ridge = new StreamParticles(
      {
        startX: RIDGE_FLOW.startX,
        endX: RIDGE_FLOW.endX,
        fade: PARTICLES.ridge.fade,
        opacity: PARTICLES.ridge.opacity,
        y: (x, drifter) => ridgeFlowY(x, drifter.z, drifter.height),
      },
      pointMaterial(context, 'wind', PARTICLES.ridge.size),
      ridgeDrifters(),
      context.tracker,
    );
    this.wave = new StreamParticles(
      {
        startX: WAVE.startX,
        endX: WAVE.endX,
        fade: PARTICLES.wave.fade,
        opacity: PARTICLES.wave.opacity,
        y: (x, drifter) => waveY(x, drifter.height),
      },
      pointMaterial(context, 'wave', PARTICLES.wave.size),
      waveDrifters(),
      context.tracker,
    );
    this.object.add(
      this.ridge.cloud.points,
      this.wave.cloud.points,
      lineSegments(
        context,
        'wind',
        linesGeometry(ridgeLines(), RIDGE_FLOW.startX, RIDGE_FLOW.endX),
      ),
      lineSegments(context, 'wave', linesGeometry(waveLines(), WAVE.startX, WAVE.endX)),
    );
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  update(lifts: AirLifts, deltaSeconds: number): void {
    if (!this.object.visible) return;
    this.ridge.update(lifts.ridge / METRES_PER_UNIT / WINDWARD_SLOPE, deltaSeconds);
    this.wave.update(lifts.wave / METRES_PER_UNIT / WAVE_STEEPEST, deltaSeconds);
  }
}
