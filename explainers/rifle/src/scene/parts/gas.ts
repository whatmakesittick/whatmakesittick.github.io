import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Shape,
  ShapeGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
} from 'three';
import type { BufferGeometry, PointsMaterial } from 'three';
import { clamp } from '@core/math';
import { latheAlongX, sampleProfile } from '@core/scene/geometry/lathe';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState } from '../../ids';
import {
  BARREL,
  BULLET_SEAT_X,
  CARTRIDGE,
  GAS_CYLINDER,
  GAS_TUBE,
  PISTON,
} from '../../model/layout';
import { THEME } from '../../theme';
import {
  BORE_RADIUS,
  COMPENSATOR,
  CUT_DECAL_LIFT,
  GAS_GLOW,
  GAS_PORT_DECAL,
  MUZZLE_FLASH,
  TRAIL,
  VENT_HOLE,
  VENT_WISPS,
} from '../constants';
import { FINISHES } from '../finishes';
import { seededRandom } from '../geometry/random';
import type { Random } from '../geometry/random';
import { markDynamic, partMesh, registered } from './context';
import type { PartContext } from './context';

const WHITE_HOT = new Color(THEME.flame);
const HOT = new Color(THEME.gas);
const EMBER = new Color(THEME.pressure);
const FULL_TURN = Math.PI * 2;
const VISIBLE = 0.004;
const FLICKER = { rate: 30, depth: 0.15 } as const;
const FLASH_LIGHT = { intensity: 90000, decay: 2, reach: 18 } as const;
const PROFILE_SAMPLES = 20;
const FLASH_TONES = { core: THEME.flame, flame: THEME.gas, ember: THEME.pressure } as const;
const PLUG_SHARE = 0.55;

interface Seeds {
  along: Float32Array;
  radius: Float32Array;
  angle: Float32Array;
}

interface Hole {
  x: number;
  y: number;
  z: number;
  normalY: number;
  normalZ: number;
}

function seeds(count: number, random: Random): Seeds {
  const fill = (pick: () => number) => Float32Array.from({ length: count }, pick);
  return {
    along: fill(random),
    radius: fill(() => Math.sqrt(random())),
    angle: fill(() => random() * FULL_TURN),
  };
}

function ventHoles(): Hole[] {
  const { xs, elevation } = VENT_HOLE;
  return xs.flatMap((x) =>
    [1, -1].map((side) => {
      const normalY = Math.sin(elevation);
      const normalZ = side * Math.cos(elevation);
      return {
        x,
        y: GAS_TUBE.axisY + GAS_TUBE.radius * normalY,
        z: GAS_TUBE.radius * normalZ,
        normalY,
        normalZ,
      };
    }),
  );
}

function glowMaterial(color: string): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

function glowPoints(context: PartContext, size: number): PointsMaterial {
  const material = createPointMaterial(context.textures.dot, size, AdditiveBlending);
  material.toneMapped = false;
  return registered(context, 'hotGas', material);
}

function portLine(): { from: Vector2; to: Vector2 } {
  const { x, angle, top } = GAS_PORT_DECAL;
  const run = (top - BORE_RADIUS) / Math.tan(angle);
  return { from: new Vector2(x, BORE_RADIUS), to: new Vector2(x + run, top) };
}

function plugGeometry(): BufferGeometry {
  const { from, to } = portLine();
  const end = from.clone().lerp(to, PLUG_SHARE);
  const half = GAS_PORT_DECAL.width / 2;
  const shape = new Shape([
    new Vector2(from.x - half, from.y),
    new Vector2(from.x + half, from.y),
    new Vector2(end.x + half, end.y),
    new Vector2(end.x - half, end.y),
  ]);
  return new ShapeGeometry(shape).translate(0, 0, 2 * CUT_DECAL_LIFT);
}

function pressureGlow(pressure: number): number {
  return clamp(pressure / GAS_GLOW.referencePressure, 0, 1) ** GAS_GLOW.falloff;
}

class Wisps {
  readonly cloud: PointCloud;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly velocity: Float32Array;
  private readonly holes = ventHoles();
  private readonly random = seededRandom(VENT_WISPS.seed);
  private readonly color = new Color();
  private pending = 0;
  private alive = 0;

  constructor(context: PartContext) {
    this.cloud = new PointCloud(VENT_WISPS.count, glowPoints(context, VENT_WISPS.size));
    this.age = new Float32Array(VENT_WISPS.count).fill(Infinity);
    this.life = new Float32Array(VENT_WISPS.count).fill(1);
    this.velocity = new Float32Array(VENT_WISPS.count * 3);
    this.cloud.commit();
  }

  get active(): boolean {
    return this.alive > 0;
  }

  advance(deltaSeconds: number, venting: number): void {
    this.pending += VENT_WISPS.rate * venting * deltaSeconds;
    let alive = 0;
    for (let index = 0; index < VENT_WISPS.count; index += 1) {
      if (this.age[index] >= this.life[index] && this.pending >= 1) {
        this.spawn(index);
        this.pending -= 1;
      }
      if (this.move(index, deltaSeconds)) alive += 1;
    }
    this.pending = Math.min(this.pending, 1);
    this.alive = alive;
    this.cloud.commit();
  }

  private spawn(index: number): void {
    const hole = this.holes[Math.floor(this.random() * this.holes.length)];
    const speed = VENT_WISPS.speed * (0.6 + 0.4 * this.random());
    this.cloud.setPoint(index, hole.x + (this.random() - 0.5) * 3, hole.y, hole.z);
    this.velocity.set(
      [(this.random() - 0.5) * 8, hole.normalY * speed, hole.normalZ * speed],
      index * 3,
    );
    this.age[index] = 0;
    this.life[index] = VENT_WISPS.life * (0.7 + 0.3 * this.random());
  }

  private move(index: number, deltaSeconds: number): boolean {
    if (this.age[index] >= this.life[index]) {
      this.cloud.setColor(index, 0, 0, 0, 0);
      return false;
    }
    this.age[index] += deltaSeconds;
    const damping = Math.exp(-VENT_WISPS.drag * deltaSeconds);
    const offset = index * 3;
    const positions = this.cloud.positions;
    for (let axis = 0; axis < 3; axis += 1) {
      this.velocity[offset + axis] *= damping;
      positions[offset + axis] += this.velocity[offset + axis] * deltaSeconds;
    }
    positions[offset + 1] += VENT_WISPS.rise * deltaSeconds;
    const share = clamp(this.age[index] / this.life[index], 0, 1);
    this.color.copy(HOT).lerp(EMBER, share);
    const alpha = VENT_WISPS.alpha * (1 - share) ** 1.5;
    this.cloud.setColor(index, this.color.r, this.color.g, this.color.b, alpha);
    return true;
  }
}

export class GasPart {
  readonly object = new Group();
  readonly labelHost = new Group();
  private readonly bore: PointCloud;
  private readonly port: PointCloud;
  private readonly chamber: PointCloud;
  private readonly puffs: PointCloud;
  private readonly wisps: Wisps;
  private readonly boreSeeds: Seeds;
  private readonly portSeeds: Seeds;
  private readonly chamberSeeds: Seeds;
  private readonly holes = ventHoles();
  private readonly flash = new Group();
  private readonly flashSprites: {
    sprite: Sprite;
    weight: number;
    length: number;
    width: number;
  }[] = [];
  private readonly flashLight = new PointLight(THEME.gas, 0, 0, FLASH_LIGHT.decay);
  private readonly trail = new Group();
  private readonly trailMaterial: MeshBasicMaterial;
  private readonly plug = new Group();
  private readonly color = new Color();
  private venting = 0;
  private playing = false;

  constructor(context: PartContext) {
    const random = seededRandom(GAS_GLOW.seed);
    const cloud = (count: number, size: number) => new PointCloud(count, glowPoints(context, size));
    this.bore = cloud(GAS_GLOW.bore.count, GAS_GLOW.bore.size);
    this.port = cloud(GAS_GLOW.port.count, GAS_GLOW.port.size);
    this.chamber = cloud(GAS_GLOW.chamber.count, GAS_GLOW.chamber.size);
    this.puffs = cloud(this.holes.length, GAS_GLOW.puffs.size);
    this.boreSeeds = seeds(GAS_GLOW.bore.count, random);
    this.portSeeds = seeds(GAS_GLOW.port.count, random);
    this.chamberSeeds = seeds(GAS_GLOW.chamber.count, random);
    this.wisps = new Wisps(context);
    this.trailMaterial = registered(context, 'hotGas', glowMaterial(THEME.flame));
    this.buildFlash(context);
    this.buildTrail(context);
    this.buildPlug(context);
    this.object.add(
      this.bore.points,
      this.port.points,
      this.chamber.points,
      this.puffs.points,
      this.wisps.cloud.points,
      this.flash,
      this.trail,
      this.plug,
      this.labelHost,
    );
    markDynamic(this.object);
  }

  setState(state: AssemblyState): void {
    const { shot, motion, view } = state;
    this.playing = state.playing;
    const gasShown = view.gas;
    this.placeBore(state, gasShown ? pressureGlow(shot.pressure) : 0);
    this.placePort(
      state,
      gasShown ? shot.gas * clamp(shot.pressure / GAS_GLOW.port.pressure, 0, 1) : 0,
    );
    this.placeChamber(state, gasShown ? shot.gas : 0);
    this.venting = gasShown && motion.carrier > GAS_GLOW.ventOpenTravel ? shot.gas : 0;
    this.placePuffs(this.venting);
    this.placeFlash(gasShown ? shot.muzzleFlash : 0);
    this.placeTrail(state);
    this.plug.visible = state.gasPort === 'blocked';
    if (!gasShown) this.wisps.cloud.points.visible = false;
  }

  update(deltaSeconds: number): boolean {
    const spawning = this.playing && this.venting > VISIBLE;
    if (!this.playing || (!spawning && !this.wisps.active)) return false;
    this.wisps.cloud.points.visible = true;
    this.wisps.advance(deltaSeconds, this.venting);
    return this.wisps.active || spawning;
  }

  private placeBore({ shot, time }: AssemblyState, glow: number): void {
    const points = this.bore.points;
    points.visible = glow > VISIBLE;
    if (!points.visible) return;
    const { start, caseRadius, radius, swirl } = GAS_GLOW.bore;
    const end = shot.stage === 'gone' ? BARREL.x[1] : BULLET_SEAT_X + shot.travel;
    const { along, radius: spread, angle } = this.boreSeeds;
    for (let index = 0; index < along.length; index += 1) {
      const share = along[index];
      const x = start + share * (end - start);
      const reach = (x < CARTRIDGE.caseLength ? caseRadius : radius) * spread[index];
      const turn = angle[index] + time * swirl * (1 + share);
      this.bore.setPoint(index, x, reach * Math.cos(turn), reach * Math.sin(turn));
      this.boreTone(share);
      const flicker =
        1 - FLICKER.depth + FLICKER.depth * Math.sin(time * FLICKER.rate + angle[index] * 7);
      this.bore.setColor(
        index,
        this.color.r,
        this.color.g,
        this.color.b,
        GAS_GLOW.bore.alpha * glow * (0.35 + 0.65 * share) * flicker,
      );
    }
    this.labelHost.position.x = (start + end) / 2;
    this.bore.commit();
  }

  private boreTone(share: number): void {
    if (share < 0.5) this.color.copy(EMBER).lerp(HOT, share * 2);
    else this.color.copy(HOT).lerp(WHITE_HOT, (share - 0.5) * 2);
  }

  private placePort({ time }: AssemblyState, glow: number): void {
    const points = this.port.points;
    points.visible = glow > VISIBLE;
    if (!points.visible) return;
    const { from, to } = portLine();
    const { along, radius, angle } = this.portSeeds;
    for (let index = 0; index < along.length; index += 1) {
      const share = (along[index] + time * GAS_GLOW.port.flow) % 1;
      const wobble = GAS_GLOW.port.radius * radius[index];
      this.port.setPoint(
        index,
        from.x + (to.x - from.x) * share,
        from.y + (to.y - from.y) * share,
        wobble * Math.cos(angle[index]),
      );
      this.color.copy(WHITE_HOT).lerp(HOT, share);
      this.port.setColor(
        index,
        this.color.r,
        this.color.g,
        this.color.b,
        GAS_GLOW.port.alpha * glow * (1 - 0.4 * share),
      );
    }
    this.port.commit();
  }

  private placeChamber({ motion, time }: AssemblyState, glow: number): void {
    const points = this.chamber.points;
    points.visible = glow > VISIBLE;
    if (!points.visible) return;
    const { radius, swirl, frontGap } = GAS_GLOW.chamber;
    const back = PISTON.headFrontX - motion.carrier + frontGap;
    const front = GAS_CYLINDER.x[1] - frontGap;
    const { along, radius: spread, angle } = this.chamberSeeds;
    for (let index = 0; index < along.length; index += 1) {
      const share = along[index];
      const turn = angle[index] + time * swirl;
      const reach = radius * spread[index];
      this.chamber.setPoint(
        index,
        back + share * (front - back),
        GAS_CYLINDER.axisY + reach * Math.cos(turn),
        reach * Math.sin(turn),
      );
      this.color.copy(EMBER).lerp(HOT, 0.4 + 0.6 * share);
      this.chamber.setColor(
        index,
        this.color.r,
        this.color.g,
        this.color.b,
        GAS_GLOW.chamber.alpha * glow,
      );
    }
    this.chamber.commit();
  }

  private placePuffs(venting: number): void {
    const points = this.puffs.points;
    points.visible = venting > VISIBLE;
    if (!points.visible) return;
    const reach = GAS_GLOW.puffs.reach;
    this.holes.forEach((hole, index) => {
      this.puffs.setPoint(
        index,
        hole.x,
        hole.y + hole.normalY * reach,
        hole.z + hole.normalZ * reach,
      );
      this.puffs.setColor(index, HOT.r, HOT.g, HOT.b, GAS_GLOW.puffs.alpha * venting);
    });
    this.puffs.commit();
  }

  private placeFlash(flash: number): void {
    this.flash.visible = flash > VISIBLE;
    this.flashLight.intensity = flash * FLASH_LIGHT.intensity;
    if (!this.flash.visible) return;
    const spread = 1 + MUZZLE_FLASH.grow * (1 - flash);
    for (const { sprite, weight, length, width } of this.flashSprites) {
      sprite.material.opacity = flash * weight;
      sprite.scale.set(length * spread, width * spread, 1);
    }
  }

  private placeTrail({ shot, view }: AssemblyState): void {
    this.trail.visible = view.trail && shot.stage === 'moving';
    if (!this.trail.visible) return;
    this.trail.position.x = BULLET_SEAT_X + shot.travel;
    this.trailMaterial.opacity = TRAIL.opacity;
  }

  private buildFlash(context: PartContext): void {
    const { plumes, lean, offset } = MUZZLE_FLASH;
    for (const plume of plumes) {
      const material = new SpriteMaterial({
        map: context.textures.glow,
        color: FLASH_TONES[plume.tone],
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const sprite = new Sprite(registered(context, 'hotGas', material));
      sprite.position.x = plume.x;
      this.flashSprites.push({
        sprite,
        weight: plume.weight,
        length: plume.length,
        width: plume.width,
      });
      this.flash.add(sprite);
    }
    this.flash.position.set(COMPENSATOR.x[1] - offset, 0, 0);
    this.flash.rotation.set(0, -lean, lean);
    this.object.add(this.flashLight);
    this.flashLight.position.set(COMPENSATOR.x[1] + FLASH_LIGHT.reach, 0, 0);
  }

  private buildTrail(context: PartContext): void {
    const profile = sampleProfile(
      [
        [0, 0],
        [TRAIL.length * 0.6, TRAIL.radius * 0.5],
        [TRAIL.length, TRAIL.radius],
      ],
      PROFILE_SAMPLES,
    );
    const geometry = latheAlongX(profile, TRAIL.segments).translate(-TRAIL.length, 0, 0);
    this.trail.add(new Mesh(context.tracker.track(geometry), this.trailMaterial));
  }

  private buildPlug(context: PartContext): void {
    const plug = partMesh(context, plugGeometry(), 'gasPort', FINISHES.bright);
    this.plug.add(context.cutaway.opened(plug));
  }
}
