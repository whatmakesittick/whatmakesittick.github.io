import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { InstancedMesh, Mesh, Object3D } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState, OdorantId } from '../../../ids';
import { TONGUE_BITE, TONGUE_SURFACE_Y, puddleRadius, scoopRadius } from '../../../model/layout';
import { ODORANT_COLOURS } from '../../../theme';
import { DETAIL } from '../../constants';
import { scoopGeometry } from '../../geometry/blob';
import { addMesh, instanced, label, namedGroup, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { seededRandom } from '../random';

const HALF = 0.5;
const UP = new Vector3(0, 1, 0);

const SCOOP = { squash: 0.82, meltSquash: 0.35, sink: 0.55 } as const;
const PUDDLE = { y: TONGUE_SURFACE_Y + 0.35, segments: 96, wobble: 0.06, waves: 7 } as const;

const CRYSTALS = {
  count: 42,
  seed: 41,
  size: [0.7, 0.6],
  length: 1.7,
  melt: [0, 0.55],
  span: 0.3,
} as const;
const DROPLETS = {
  count: 20,
  seed: 53,
  size: [0.55, 0.45],
  settle: [0.35, 1],
  ring: [0.45, 0.9],
} as const;
const BUBBLES = {
  count: 22,
  seed: 67,
  size: [0.45, 0.65],
  burst: [0.05, 0.8],
  swell: 0.06,
  grow: 0.5,
} as const;
const HELD = {
  perDroplet: 6,
  fullFat: 20,
  size: 2.2,
  orbit: 0.9,
  speed: 1.4,
  odorants: ['linalool', 'eugenol', 'ionone', 'benzaldehyde'] as readonly OdorantId[],
  settled: 0.002,
} as const;

interface Spot {
  readonly direction: Vector3;
  readonly size: number;
  readonly threshold: number;
  readonly spin: number;
}

function spots(
  count: number,
  seed: number,
  size: readonly [number, number],
  range: readonly [number, number],
): Spot[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => {
    const direction = new Vector3(
      random() - HALF,
      random() * 1.1 - 0.15,
      random() - HALF,
    ).normalize();
    return {
      direction,
      size: size[0] + random() * size[1],
      threshold: lerp(range[0], range[1], random()),
      spin: random() * Math.PI * 2,
    };
  });
}

function wavyDisc(): CircleGeometry {
  const disc = new CircleGeometry(1, PUDDLE.segments);
  const position = disc.getAttribute('position');
  for (let index = 1; index < position.count; index += 1) {
    const angle = Math.atan2(position.getY(index), position.getX(index));
    const wobble = 1 + PUDDLE.wobble * Math.sin(angle * PUDDLE.waves) * Math.cos(angle * 3);
    position.setXY(index, position.getX(index) * wobble, position.getY(index) * wobble);
  }
  disc.rotateX(-Math.PI * HALF);
  return disc;
}

export class Scoop {
  private readonly scoop: Mesh;
  private readonly puddle: Mesh;
  private readonly crystals: InstancedMesh;
  private readonly droplets: InstancedMesh;
  private readonly bubbles: InstancedMesh;
  private readonly held: PointCloud;
  private readonly crystalSpots = spots(
    CRYSTALS.count,
    CRYSTALS.seed,
    CRYSTALS.size,
    CRYSTALS.melt,
  );
  private readonly dropletSpots = spots(
    DROPLETS.count,
    DROPLETS.seed,
    DROPLETS.size,
    DROPLETS.settle,
  );
  private readonly bubbleSpots = spots(BUBBLES.count, BUBBLES.seed, BUBBLES.size, BUBBLES.burst);
  private readonly anchors: Record<'iceCrystal' | 'fatDroplet' | 'airBubble', Object3D>;
  private readonly centre = new Vector3();
  private readonly dropletAt: Vector3[] = [];
  private readonly matrix = new Matrix4();
  private readonly turn = new Quaternion();
  private readonly point = new Vector3();
  private readonly size = new Vector3();
  private radius: number = TONGUE_BITE.radius;
  private squash: number = SCOOP.squash;
  private heldTarget = 0;
  private heldShown = 0;
  private age = 0;

  constructor(context: PartContext, parent: Object3D) {
    const group = namedGroup('scoop', parent);
    this.scoop = addMesh(context, group, scoopGeometry(DETAIL.blob + 1), 'bite', 'iceCream');
    this.puddle = addMesh(context, group, wavyDisc(), 'melt', 'puddle');
    this.puddle.renderOrder = 1;
    label(context, 'melt', this.puddle, [0.92, 0, 0.25]);
    const prism = new CylinderGeometry(0.26, 0.34, CRYSTALS.length, 6);
    prism.translate(0, CRYSTALS.length * 0.2, 0);
    this.crystals = instanced(
      context,
      group,
      context.tracker.track(prism),
      'iceCrystal',
      'ice',
      CRYSTALS.count,
    );
    const drop = context.tracker.track(new SphereGeometry(1, ...DETAIL.smallSphere));
    this.droplets = instanced(context, group, drop, 'fatDroplet', 'fat', DROPLETS.count);
    this.bubbles = instanced(context, group, drop, 'airBubble', 'bubble', BUBBLES.count);
    this.anchors = {
      iceCrystal: label(context, 'iceCrystal', this.crystals, [0, 0, 0]),
      fatDroplet: label(context, 'fatDroplet', this.droplets, [0, 0, 0]),
      airBubble: label(context, 'airBubble', this.bubbles, [0, 0, 0]),
    };
    this.dropletSpots.forEach(() => this.dropletAt.push(new Vector3()));
    const glow = registeredMaterial(
      context,
      'aromaCloud',
      createPointMaterial(context.textures.glow, HELD.size, AdditiveBlending),
    );
    this.held = new PointCloud(DROPLETS.count * HELD.perDroplet, glow);
    context.tracker.track(this.held);
    group.add(this.held.points);
  }

  top(out: Vector3): Vector3 {
    return out.set(this.centre.x, this.centre.y + this.radius * this.squash, this.centre.z);
  }

  setState(state: AssemblyState): void {
    const { melt, inMouth, released } = state.reading;
    this.radius = scoopRadius(melt);
    this.squash = SCOOP.squash * (1 - SCOOP.meltSquash * melt);
    const [cx, cy, cz] = TONGUE_BITE.centre;
    this.centre.set(cx, cy - (TONGUE_BITE.radius - this.radius) * SCOOP.sink, cz);
    this.scoop.position.copy(this.centre);
    this.scoop.scale.set(this.radius, this.radius * this.squash, this.radius);
    const spread = puddleRadius(melt);
    this.puddle.visible = melt > 0;
    this.puddle.position.set(cx, PUDDLE.y, cz);
    this.puddle.scale.setScalar(spread * smoothstep(melt, 0, 0.08));
    this.placeCrystals(melt);
    this.placeDroplets(melt, spread);
    this.placeBubbles(melt);
    const fat = clamp(state.fatPercent / HELD.fullFat, 0, 1);
    this.heldTarget = inMouth ? fat * smoothstep(released, 0, 0.05) : 0;
  }

  update(deltaSeconds: number): boolean {
    this.age += deltaSeconds;
    const gap = this.heldTarget - this.heldShown;
    this.heldShown += gap * Math.min(1, deltaSeconds * 4);
    this.drawHeld();
    return this.heldShown > HELD.settled || Math.abs(gap) > HELD.settled;
  }

  private surface(direction: Vector3, outset: number, out: Vector3): Vector3 {
    return out
      .set(direction.x, direction.y * this.squash, direction.z)
      .multiplyScalar(this.radius * (1 + outset))
      .add(this.centre);
  }

  private placeCrystals(melt: number): void {
    this.crystalSpots.forEach((spot, index) => {
      const left = 1 - smoothstep(melt, spot.threshold, spot.threshold + CRYSTALS.span);
      this.surface(spot.direction, 0, this.point);
      this.turn.setFromUnitVectors(UP, spot.direction);
      this.size.set(spot.size, spot.size * left, spot.size).multiplyScalar(Math.max(left, 0.001));
      this.matrix.compose(this.point, this.turn, this.size);
      this.crystals.setMatrixAt(index, this.matrix);
      if (index === 0) this.anchors.iceCrystal.position.copy(this.point);
    });
    this.crystals.count = CRYSTALS.count;
    this.crystals.instanceMatrix.needsUpdate = true;
    this.crystals.visible = melt < CRYSTALS.melt[1] + CRYSTALS.span;
  }

  private placeDroplets(melt: number, spread: number): void {
    this.dropletSpots.forEach((spot, index) => {
      const settle = smoothstep(melt, spot.threshold - 0.3, spot.threshold);
      this.surface(spot.direction, -0.02, this.point);
      const ring = lerp(DROPLETS.ring[0], DROPLETS.ring[1], (index % 5) / 4) * spread;
      const angle = spot.spin;
      const pool = new Vector3(
        this.centre.x + Math.cos(angle) * ring,
        PUDDLE.y + spot.size * 0.35,
        this.centre.z + Math.sin(angle) * ring,
      );
      this.point.lerp(pool, settle);
      this.dropletAt[index].copy(this.point);
      this.size.setScalar(spot.size);
      this.matrix.compose(this.point, this.turn.identity(), this.size);
      this.droplets.setMatrixAt(index, this.matrix);
      if (index === 0) this.anchors.fatDroplet.position.copy(this.point);
    });
    this.droplets.count = DROPLETS.count;
    this.droplets.instanceMatrix.needsUpdate = true;
  }

  private placeBubbles(melt: number): void {
    let shown = 0;
    this.bubbleSpots.forEach((spot) => {
      const swell = smoothstep(melt, spot.threshold - BUBBLES.swell, spot.threshold);
      if (melt >= spot.threshold) return;
      this.surface(spot.direction, 0.02, this.point);
      this.size.setScalar(spot.size * (1 + BUBBLES.grow * swell));
      this.matrix.compose(this.point, this.turn.identity(), this.size);
      this.bubbles.setMatrixAt(shown, this.matrix);
      if (shown === 0) this.anchors.airBubble.position.copy(this.point);
      shown += 1;
    });
    this.bubbles.count = shown;
    this.bubbles.visible = shown > 0;
    this.bubbles.instanceMatrix.needsUpdate = true;
  }

  private drawHeld(): void {
    const perDroplet = Math.round(HELD.perDroplet * this.heldShown);
    const colour = new Color();
    this.dropletSpots.forEach((spot, droplet) => {
      for (let slot = 0; slot < HELD.perDroplet; slot += 1) {
        const index = droplet * HELD.perDroplet + slot;
        if (slot >= perDroplet) {
          this.held.setColor(index, 0, 0, 0, 0);
          continue;
        }
        const angle = spot.spin + (slot / HELD.perDroplet) * Math.PI * 2 + this.age * HELD.speed;
        const radius = spot.size + HELD.orbit;
        const at = this.dropletAt[droplet];
        this.held.setPoint(
          index,
          at.x + Math.cos(angle) * radius,
          at.y + Math.sin(angle * 2 + slot) * radius * 0.4,
          at.z + Math.sin(angle) * radius,
        );
        colour.set(ODORANT_COLOURS[HELD.odorants[slot % HELD.odorants.length]]);
        this.held.setColor(index, colour.r, colour.g, colour.b, this.heldShown);
      }
    });
    this.held.commit();
  }
}
