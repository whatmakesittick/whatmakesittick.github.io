import { AdditiveBlending, Color, Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import { clamp, smoothstep } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { ODORANT_IDS } from '../../../ids';
import type { AssemblyState, OdorantId } from '../../../ids';
import { COLUMN_SCATTER, LINEUP_Y, ODORANT_COLUMN_X, receptorCell } from '../../../model/layout';
import { RECEPTOR_CODES, RECEPTOR_TYPES } from '../../../model/receptorCodes';
import { MAX_COPIES } from '../../../model/scale';
import { ODORANT_COLOURS } from '../../../theme';
import { label, registeredMaterial } from '../context';
import type { PartContext, Section } from '../context';
import { seededRandom } from '../random';
import { OdorantBatch } from './batch';
import type { Pose } from './batch';
import { CELL_TOP_Y, ReceptorGrid } from './receptorGrid';
import { MOLECULE_SHAPES } from './shapes';

const HALF = 0.5;
const LINEUP = { bottom: LINEUP_Y - 6.5, step: 1.45, turn: 2.4, tumble: 0.35 } as const;
const SETTLE = {
  scale: 0.62,
  spawnLift: 3.2,
  rest: 1.1,
  gain: 3.3,
  from: 0.1,
  to: 0.3,
  full: 0.9,
} as const;
const HALO = { size: 10, lineup: 0.28, settled: 0.5 } as const;
const EASE = { rate: 5, settled: 0.002 } as const;
const LABEL_LIFT = 3.5;

interface Slot {
  readonly pose: Pose;
  readonly home: Vector3;
  readonly axis: Vector3;
  readonly phase: number;
  readonly speed: number;
  target: number;
  shown: number;
}

interface OdorantSlots {
  readonly batch: OdorantBatch;
  readonly anchor: Object3D;
  readonly lineup: Slot[];
  readonly settled: Slot[];
}

function slot(home: Vector3, random: () => number): Slot {
  return {
    pose: { position: home.clone(), rotation: new Quaternion(), scale: 0 },
    home,
    axis: new Vector3(random() - HALF, random() - HALF, random() - HALF).normalize(),
    phase: random() * Math.PI * 2,
    speed: (HALF + random()) * LINEUP.tumble,
    target: 0,
    shown: 0,
  };
}

function lineupSlots(id: OdorantId, random: () => number): Slot[] {
  return Array.from({ length: MAX_COPIES }, (_, index) => {
    const angle = index * LINEUP.turn;
    const reach = COLUMN_SCATTER * (0.45 + 0.55 * random());
    return slot(
      new Vector3(
        ODORANT_COLUMN_X[id] + Math.cos(angle) * reach * HALF,
        LINEUP.bottom + index * LINEUP.step,
        Math.sin(angle) * reach,
      ),
      random,
    );
  });
}

function settledSlots(id: OdorantId, random: () => number): Slot[] {
  return RECEPTOR_CODES[id].map((cell, index) => {
    const [x, , z] = receptorCell(cell);
    const offset = (index % 2 === 0 ? 1 : -1) * HALF;
    return slot(new Vector3(x + offset, CELL_TOP_Y + SETTLE.rest, z - offset), random);
  });
}

class MoleculeWorld implements Section {
  readonly root: Object3D;
  private readonly odorants: Record<OdorantId, OdorantSlots>;
  private readonly grid: ReceptorGrid;
  private readonly halos: PointCloud;
  private readonly colours: Record<OdorantId, Color>;
  private readonly activationTarget: number[] = Array.from({ length: RECEPTOR_TYPES }, () => 0);
  private readonly activation: number[] = Array.from({ length: RECEPTOR_TYPES }, () => 0);
  private seconds = 0;
  private first = true;

  constructor(context: PartContext, root: Object3D) {
    this.root = root;
    this.grid = new ReceptorGrid(context, root);
    const random = seededRandom(91);
    this.odorants = Object.fromEntries(
      ODORANT_IDS.map((id) => {
        const capacity = MAX_COPIES + RECEPTOR_CODES[id].length;
        const batch = new OdorantBatch(context, root, id, MOLECULE_SHAPES[id], capacity);
        const anchor = label(context, id, batch.group, [ODORANT_COLUMN_X[id], LINEUP_Y, 0]);
        const slots: OdorantSlots = {
          batch,
          anchor,
          lineup: lineupSlots(id, random),
          settled: settledSlots(id, random),
        };
        return [id, slots];
      }),
    ) as Record<OdorantId, OdorantSlots>;
    this.colours = Object.fromEntries(
      ODORANT_IDS.map((id) => [id, new Color(ODORANT_COLOURS[id])]),
    ) as Record<OdorantId, Color>;
    const haloCount = ODORANT_IDS.reduce(
      (sum, id) => sum + this.odorants[id].lineup.length + this.odorants[id].settled.length,
      0,
    );
    const haloMaterial = registeredMaterial(
      context,
      'aromaCloud',
      createPointMaterial(context.textures.glow, HALO.size, AdditiveBlending),
    );
    this.halos = new PointCloud(haloCount, haloMaterial);
    this.halos.points.name = 'odorantHalos';
    context.tracker.track(this.halos);
    root.add(this.halos.points);
  }

  setState(state: AssemblyState): void {
    const { reading, copies, sniff } = state;
    this.seconds = reading.seconds;
    ODORANT_IDS.forEach((id) => {
      const slots = this.odorants[id];
      slots.lineup.forEach((entry, index) => (entry.target = index < copies[id] ? 1 : 0));
      const share = this.settleShare(id, sniff, reading.nose[id]);
      slots.settled.forEach((entry) => (entry.target = share));
    });
    for (let index = 0; index < RECEPTOR_TYPES; index += 1) {
      this.activationTarget[index] = reading.receptors[index] ?? 0;
    }
    if (this.first) this.snap();
    this.first = false;
    this.draw();
  }

  update(deltaSeconds: number): boolean {
    const share = Math.min(1, deltaSeconds * EASE.rate);
    let moving = false;
    const ease = (entry: Slot) => {
      const gap = entry.target - entry.shown;
      entry.shown = Math.abs(gap) < EASE.settled ? entry.target : entry.shown + gap * share;
      if (entry.shown !== entry.target) moving = true;
    };
    ODORANT_IDS.forEach((id) => {
      this.odorants[id].lineup.forEach(ease);
      this.odorants[id].settled.forEach(ease);
    });
    for (let index = 0; index < RECEPTOR_TYPES; index += 1) {
      const gap = this.activationTarget[index] - this.activation[index];
      if (Math.abs(gap) < EASE.settled) {
        this.activation[index] = this.activationTarget[index];
      } else {
        this.activation[index] += gap * share;
        moving = true;
      }
    }
    this.draw();
    return moving;
  }

  private settleShare(id: OdorantId, sniff: AssemblyState['sniff'], nose: number): number {
    if (sniff !== 'mix') return sniff === id ? 1 : 0;
    const level = clamp((nose * SETTLE.gain) / SETTLE.full, 0, 1);
    return smoothstep(level, SETTLE.from, SETTLE.to);
  }

  private snap(): void {
    ODORANT_IDS.forEach((id) => {
      this.odorants[id].lineup.forEach((entry) => (entry.shown = entry.target));
      this.odorants[id].settled.forEach((entry) => (entry.shown = entry.target));
    });
    this.activation.splice(0, RECEPTOR_TYPES, ...this.activationTarget);
  }

  private turn(entry: Slot): void {
    entry.pose.rotation.setFromAxisAngle(entry.axis, entry.phase + this.seconds * entry.speed);
  }

  private draw(): void {
    let halo = 0;
    const glow = (entry: Slot, colour: Color, strength: number) => {
      const { x, y, z } = entry.pose.position;
      this.halos.setPoint(halo, x, y, z);
      this.halos.setColor(halo, colour.r, colour.g, colour.b, strength * entry.shown);
      halo += 1;
    };
    ODORANT_IDS.forEach((id) => {
      const { batch, anchor, lineup, settled } = this.odorants[id];
      const colour = this.colours[id];
      batch.begin();
      let top: Vector3 | null = null;
      lineup.forEach((entry) => {
        this.turn(entry);
        entry.pose.scale = smoothstep(entry.shown, 0, 1);
        entry.pose.position.copy(entry.home);
        batch.draw(entry.pose);
        glow(entry, colour, HALO.lineup);
        if (entry.target > 0) top = entry.home;
      });
      settled.forEach((entry) => {
        this.turn(entry);
        const arrive = smoothstep(entry.shown, 0, 1);
        entry.pose.scale = SETTLE.scale * arrive;
        entry.pose.position.copy(entry.home).setY(entry.home.y + SETTLE.spawnLift * (1 - arrive));
        batch.draw(entry.pose);
        glow(entry, colour, HALO.settled);
      });
      batch.end();
      const spot: Vector3 = top ?? settled[0].pose.position;
      anchor.position.set(spot.x, spot.y + (top ? LABEL_LIFT : 0), spot.z);
    });
    this.halos.commit();
    this.grid.draw(this.activation, this.seconds);
  }
}

export function buildMoleculeWorld(context: PartContext, root: Object3D): Section {
  return new MoleculeWorld(context, root);
}
