import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  RingGeometry,
  Sprite,
  SpriteMaterial,
} from 'three';
import { lerp, smoothstep } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { StrikeReading } from '../../../ids';
import { TARGET } from '../../../model/layout';
import { IMPACT_UNITS } from '../../../model/strike';
import { IMPACT_FX, STRUCK_STAGES } from '../../constants';
import { GLOW_SPRITE } from '../../finishes';
import { hash2 } from '../../geometry/noise';
import { registered } from '../context';
import type { PartContext } from '../context';

const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
const VISIBLE = 0.002;
const GROUND_LIFT = 0.15;
const SEEDS = { angle: 1, reach: 2, height: 3, shade: 4 } as const;
const SETTLE = 0.3;
const CORE_REST = 0.35;
const GLOW_REST = 0.6;
const HEIGHT_TINT = 0.7;

function additive(context: PartContext, colour: string, opacity: number): MeshBasicMaterial {
  return registered(
    context,
    'missile',
    new MeshBasicMaterial({
      color: colour,
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    }),
  );
}

interface Grain {
  angle: number;
  reach: number;
  height: number;
  shade: number;
}

class DustCloud {
  readonly cloud: PointCloud;
  private readonly grains: Grain[];
  private readonly light = new Color(IMPACT_FX.dust.colour);
  private readonly dark = new Color(IMPACT_FX.dust.shade);
  private readonly tint = new Color();

  constructor(context: PartContext) {
    const { count, size, seed } = IMPACT_FX.dust;
    const material = registered(
      context,
      'missile',
      createPointMaterial(context.textures.dot, size, NormalBlending),
    );
    this.cloud = context.tracker.track(new PointCloud(count, material));
    this.grains = Array.from({ length: count }, (_, index) => ({
      angle: hash2(index, seed + SEEDS.angle) * FULL_TURN,
      reach: Math.sqrt(hash2(index, seed + SEEDS.reach)),
      height: hash2(index, seed + SEEDS.height),
      shade: hash2(index, seed + SEEDS.shade),
    }));
  }

  place(age: number): void {
    const { rise, column, surge, cap, drift, riseTime, fadeTime, opacity, linger } = IMPACT_FX.dust;
    const lift = 1 - Math.exp(-age / riseTime);
    const widen = 1 - Math.exp(-age / (riseTime * 2));
    const presence = smoothstep(age, 0, SETTLE) * lerp(1, linger, smoothstep(age, 0, fadeTime));
    const wind = drift * age;
    this.grains.forEach((grain, index) => {
      const ground = grain.shade < surge.share;
      const height = ground
        ? surge.lift + surge.height * grain.height * widen
        : rise * lift * Math.sqrt(grain.height);
      const swell = ground ? surge.spread : rise * column * (1 + cap * grain.height * grain.height);
      const reach = swell * widen * grain.reach;
      this.cloud.setPoint(
        index,
        TARGET[0] + Math.cos(grain.angle) * reach + wind * grain.height,
        TARGET[1] + height + GROUND_LIFT,
        TARGET[2] + Math.sin(grain.angle) * reach,
      );
      this.tint.copy(ground ? this.light : this.dark).lerp(this.light, grain.height * HEIGHT_TINT);
      this.cloud.setColor(index, this.tint.r, this.tint.g, this.tint.b, opacity * presence);
    });
    this.cloud.commit();
  }
}

export class ImpactEffect {
  readonly object = new Group();
  private readonly flash = new Group();
  private readonly core: Sprite;
  private readonly glow: Sprite;
  private readonly beacon: Sprite;
  private readonly ground: Mesh;
  private readonly ring: Mesh;
  private readonly ringMaterial: MeshBasicMaterial;
  private readonly groundMaterial: MeshBasicMaterial;
  private readonly dust: DustCloud;

  constructor(context: PartContext) {
    const { core, glow, ground, ring, lift } = IMPACT_FX;
    const spriteOf = (colour: string, size: number, opacity: number, sizeAttenuation = true) => {
      const material = registered(
        context,
        'missile',
        new SpriteMaterial({
          ...GLOW_SPRITE,
          map: context.textures.glow,
          color: colour,
          opacity,
          sizeAttenuation,
          depthTest: false,
        }),
      );
      const flare = new Sprite(material);
      flare.scale.setScalar(size);
      flare.position.set(TARGET[0], TARGET[1] + lift, TARGET[2]);
      return flare;
    };
    this.core = spriteOf(core.colour, core.size, 1);
    this.glow = spriteOf(glow.colour, glow.size, glow.opacity);
    this.beacon = spriteOf(IMPACT_FX.beacon.colour, IMPACT_FX.beacon.size, 1, false);
    this.groundMaterial = additive(context, ground.colour, ground.opacity);
    this.groundMaterial.map = context.textures.glow;
    const disc = context.tracker.track(new PlaneGeometry(ground.size, ground.size));
    disc.rotateX(-QUARTER_TURN);
    this.ground = new Mesh(disc, this.groundMaterial);
    this.ground.position.set(TARGET[0], TARGET[1] + GROUND_LIFT, TARGET[2]);
    this.ringMaterial = additive(context, ring.colour, ring.opacity);
    const band = context.tracker.track(new RingGeometry(1 - ring.width, 1, ring.segments));
    band.rotateX(-QUARTER_TURN);
    this.ring = new Mesh(band, this.ringMaterial);
    this.ring.position.copy(this.ground.position);
    this.flash.add(this.glow, this.core, this.beacon, this.ground, this.ring);
    this.dust = new DustCloud(context);
    this.object.add(this.flash, this.dust.cloud.points);
    this.flash.visible = false;
    this.dust.cloud.points.visible = false;
  }

  setState(phase: number, strike: StrikeReading): void {
    const flash = strike.flash;
    this.flash.visible = flash > VISIBLE;
    if (this.flash.visible) this.showFlash(flash);
    const age = phase - IMPACT_UNITS;
    const struck = STRUCK_STAGES.includes(strike.stage) && age > 0;
    this.dust.cloud.points.visible = struck;
    if (struck) this.dust.place(age);
  }

  private showFlash(flash: number): void {
    const { core, glow, ring } = IMPACT_FX;
    const burst = flash * flash;
    this.core.scale.setScalar(core.size * (CORE_REST + (1 - CORE_REST) * flash));
    this.core.material.opacity = burst;
    this.glow.scale.setScalar(glow.size * (GLOW_REST + (1 - GLOW_REST) * flash));
    this.glow.material.opacity = glow.opacity * flash;
    this.beacon.scale.setScalar(IMPACT_FX.beacon.size * flash);
    this.beacon.material.opacity = burst;
    this.groundMaterial.opacity = IMPACT_FX.ground.opacity * flash;
    this.ring.scale.setScalar(lerp(ring.from, ring.to, 1 - flash));
    this.ringMaterial.opacity = ring.opacity * flash;
  }
}
