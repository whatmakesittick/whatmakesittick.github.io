import { AdditiveBlending, Color, Group, PlaneGeometry } from 'three';
import type { Mesh, Object3D, Texture } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { createPointMaterial, PointCloud } from '@core/scene/pointCloud';
import { CAR } from '../../../model/layout';
import { THEME } from '../../../theme';
import { partMesh, registered } from '../context';
import type { PartContext } from '../context';
import type { CarView } from '../types';
import { FAN_GLOW, POINT_SIZE_PER_METRE } from './constants';

const FLAT = -Math.PI / 2;
const UNLIT = '#000000';
const SPOTS = FAN_GLOW.rows.flatMap((z) => FAN_GLOW.columns.map((x) => [x, z] as const));

function poolFinish(glow: Texture): MaterialFinish {
  const { opacity, glow: intensity } = FAN_GLOW.pool;
  return {
    color: UNLIT,
    map: glow,
    emissive: THEME.fanGlow,
    emissiveIntensity: intensity,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: AdditiveBlending,
  };
}

function poolGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(
    CAR.length * FAN_GLOW.pool.length,
    CAR.width * FAN_GLOW.pool.width,
  );
  geometry.rotateX(FLAT);
  return geometry;
}

function pulse(seconds: number, phase: number): number {
  const { rate, depth } = FAN_GLOW.pulse;
  return 1 - depth * (0.5 + 0.5 * Math.sin(seconds * rate - phase));
}

export class FanGlow {
  readonly object = new Group();
  readonly label: Object3D;
  private readonly spots: PointCloud;
  private readonly pool: Mesh;
  private readonly colour = new Color(THEME.fanGlow);
  private time = 0;

  constructor(context: PartContext, car: CarView) {
    const size = FAN_GLOW.diameter * POINT_SIZE_PER_METRE;
    const material = registered(
      context,
      'fans',
      createPointMaterial(context.textures.glow, size, AdditiveBlending),
    );
    this.spots = context.tracker.track(new PointCloud(SPOTS.length, material));
    SPOTS.forEach(([x, z], index) => this.spots.setPoint(index, x, -FAN_GLOW.drop, z));
    this.pool = partMesh(context, poolGeometry(), 'fans', poolFinish(context.textures.glow));
    this.pool.position.y = FAN_GLOW.pool.lift - CAR.rideHeight;
    this.label = anchorAt(this.object, ...FAN_GLOW.label);
    this.object.add(this.spots.points, this.pool);
    this.object.visible = false;
    car.object.add(this.object);
    this.paint();
  }

  setState(running: boolean): void {
    this.object.visible = running;
  }

  advance(deltaSeconds: number): boolean {
    if (!this.object.visible) return false;
    this.time += deltaSeconds;
    this.paint();
    return true;
  }

  private paint(): void {
    const { r, g, b } = this.colour;
    SPOTS.forEach(([x], index) => {
      const alpha = FAN_GLOW.opacity * pulse(this.time, x * FAN_GLOW.pulse.wave);
      this.spots.setColor(index, r, g, b, alpha);
    });
    this.spots.commit();
    this.pool.scale.setScalar(1 + FAN_GLOW.pool.swell * (pulse(this.time, 0) - 1));
  }
}
