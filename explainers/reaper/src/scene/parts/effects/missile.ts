import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Object3D,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { clamp, smoothstep } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { StrikeReading } from '../../../ids';
import { LAUNCH_UNITS } from '../../../model/strike';
import { flightAt } from '../../../model/flight';
import { HELLFIRE } from '../../../model/layout';
import { applyFlightPose } from '../../pose';
import { LAUNCHED_STAGES, MISSILE_FX } from '../../constants';
import { GLOW_SPRITE } from '../../finishes';
import { missileClock, missileDirection, missilePosition } from '../../geometry/missilePath';
import { hash2 } from '../../geometry/noise';
import type { HellfireGeometry } from '../aircraft/weapons';
import { hellfireMeshes } from '../aircraft/weapons';
import { registered } from '../context';
import type { PartContext } from '../context';

const X_AXIS = new Vector3(1, 0, 0);
const QUARTER_TURN = Math.PI / 2;
const TAIL_GAP = 0.15;
const DRIFT_SEEDS = { x: 1, y: 2, z: 3 } as const;
const FLICKER_PERIOD = 600;
const FLICKER_BEAT = 0.37;
const PLUME_START = 0.3;
const PLUME_GROWTH_SHARE = 0.3;

export function launchRailOffset(railLocal: Vector3): Vector3 {
  const pose = new Object3D();
  const flight = flightAt(LAUNCH_UNITS);
  applyFlightPose(pose, flight);
  pose.updateMatrixWorld(true);
  return pose.localToWorld(railLocal.clone()).sub(new Vector3(...flight.position));
}

function sprite(
  context: PartContext,
  colour: string,
  size: number,
  opacity = 1,
  sizeAttenuation = true,
): Sprite {
  const material = registered(
    context,
    'missile',
    new SpriteMaterial({
      ...GLOW_SPRITE,
      map: context.textures.glow,
      color: colour,
      opacity,
      sizeAttenuation,
    }),
  );
  const glow = new Sprite(material);
  glow.scale.setScalar(size);
  return glow;
}

class SmokeTrail {
  readonly cloud: PointCloud;
  private readonly drift: Float32Array;
  private readonly tint = new Color(MISSILE_FX.trail.colour);
  private readonly point = new Vector3();

  constructor(context: PartContext) {
    const { count, size } = MISSILE_FX.trail;
    const material = registered(
      context,
      'missile',
      createPointMaterial(context.textures.dot, size, NormalBlending),
    );
    this.cloud = context.tracker.track(new PointCloud(count, material));
    this.drift = Float32Array.from({ length: count * 3 }, (_, index) => {
      const seed = [DRIFT_SEEDS.x, DRIFT_SEEDS.y, DRIFT_SEEDS.z][index % 3];
      return hash2(Math.floor(index / 3), seed) * 2 - 1;
    });
  }

  place(clock: number, railOffset: Vector3): void {
    const { count, opacity, drift, rise, lifetime } = MISSILE_FX.trail;
    for (let index = 0; index < count; index += 1) {
      const born = index / (count - 1);
      const age = clock - born;
      const alive = age >= 0 && age < lifetime;
      const share = alive ? 1 - age / lifetime : 0;
      missilePosition(born, railOffset, this.point);
      const spread = drift * Math.sqrt(Math.max(age, 0));
      this.cloud.setPoint(
        index,
        this.point.x + this.drift[index * 3] * spread,
        this.point.y + this.drift[index * 3 + 1] * spread + rise * Math.max(age, 0),
        this.point.z + this.drift[index * 3 + 2] * spread,
      );
      this.cloud.setColor(index, this.tint.r, this.tint.g, this.tint.b, opacity * share * share);
    }
    this.cloud.commit();
  }
}

export class MissileEffect {
  readonly object = new Group();
  readonly missile = new Group();
  private readonly plume = new Group();
  private readonly core: Sprite;
  private readonly glow: Sprite;
  private readonly trail: SmokeTrail;
  private readonly railOffset: Vector3;
  private readonly direction = new Vector3();
  private time = 0;

  constructor(context: PartContext, geometry: HellfireGeometry, railLocal: Vector3) {
    this.railOffset = launchRailOffset(railLocal);
    const { core, glow, flame, beacon } = MISSILE_FX;
    this.core = sprite(context, core.colour, core.size);
    this.glow = sprite(context, glow.colour, glow.size, glow.opacity);
    const marker = sprite(context, core.colour, beacon.size, beacon.opacity, false);
    const cone = context.tracker.track(
      new ConeGeometry(flame.radius, flame.length, flame.segments, 1, true),
    );
    cone.rotateZ(QUARTER_TURN);
    const flameMaterial = registered(
      context,
      'missile',
      new MeshBasicMaterial({
        color: glow.colour,
        transparent: true,
        opacity: glow.opacity,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    const flameMesh = new Mesh(cone, flameMaterial);
    flameMesh.position.x = -flame.length / 2;
    this.plume.position.x = -HELLFIRE.length / 2 - TAIL_GAP;
    this.plume.add(flameMesh, this.glow, this.core, marker);
    this.missile.add(...hellfireMeshes(context, geometry, 'missile'), this.plume);
    this.missile.visible = false;
    this.trail = new SmokeTrail(context);
    this.object.add(this.missile, this.trail.cloud.points);
  }

  setState(phase: number, strike: StrikeReading, rail: Vector3): void {
    const clock = Math.max(missileClock(phase), 0);
    const launched = LAUNCHED_STAGES.includes(strike.stage);
    this.missile.visible = strike.stage === 'flying';
    this.trail.cloud.points.visible = launched && clock < 1 + MISSILE_FX.trail.lifetime;
    if (!launched) {
      this.missile.position.copy(rail);
      return;
    }
    const share = clamp(strike.share, 0, 1);
    missilePosition(share, this.railOffset, this.missile.position);
    missileDirection(share, this.railOffset, this.direction);
    this.missile.quaternion.setFromUnitVectors(X_AXIS, this.direction);
    const growth = smoothstep(share, 0, MISSILE_FX.railBlend * PLUME_GROWTH_SHARE);
    this.plume.scale.setScalar(PLUME_START + (1 - PLUME_START) * growth);
    if (this.trail.cloud.points.visible) this.trail.place(clock, this.railOffset);
  }

  advance(deltaSeconds: number): void {
    if (!this.missile.visible) return;
    this.time = (this.time + deltaSeconds) % FLICKER_PERIOD;
    const { rate, depth } = MISSILE_FX.flicker;
    const flicker =
      1 + depth * Math.sin(this.time * rate) * Math.sin(this.time * rate * FLICKER_BEAT);
    this.core.scale.setScalar(MISSILE_FX.core.size * flicker);
    this.glow.scale.setScalar(MISSILE_FX.glow.size * (2 - flicker));
  }
}
