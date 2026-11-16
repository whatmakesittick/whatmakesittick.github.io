import { Quaternion, Vector3 } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import { SPECIES_IDS } from '../../../ids';
import type { AssemblyState, SpeciesId } from '../../../ids';
import {
  DRAWN_PER_MOLAR,
  HELIX_AXIS,
  MAX_DRAWN_COUNTS,
  REGION_SPECS,
  SOLUTION_BOX,
} from '../../../model';
import { CROWD, HELIX_LOOK, THEME_GLOW } from '../../constants';
import { seededRandom } from '../random';
import type { DrawContext } from './draw';
import { SHAPES } from './shapes';

interface Ion {
  readonly home: Vector3;
  readonly phases: readonly [number, number, number];
  readonly speeds: readonly [number, number, number];
  readonly axis: Vector3;
  readonly spin: number;
  readonly turn: number;
  readonly mouth: number;
}

const PLACEMENT_TRIES = 80;
const MIN_GAP = 3.6;
const FULL_TURN = Math.PI * 2;
const LABEL_PRIORITY = 1;
const ARRIVE = [0.1, 0.85] as const;
const VANISH = [0.72, 0.94] as const;
const HALF = 0.5;
const AXES = 3;

const MOLAR_OF: Readonly<Record<SpeciesId, (state: AssemblyState) => number>> = {
  iodate: ({ clock }) => clock.iodateM,
  bisulfite: ({ clock }) => clock.bisulfiteM,
  sulfate: ({ clock }) => clock.sulfateM,
  iodide: ({ clock }) => clock.iodideM,
  hydrogenIon: ({ clock }) => clock.acidM,
  iodine: ({ clock }) => clock.iodineM,
};

function inEvent(point: Vector3): boolean {
  const { x, y, z } = REGION_SPECS.event;
  const pad = CROWD.eventClear;
  return (
    point.x > x[0] - pad &&
    point.x < x[1] + pad &&
    point.y > y[0] - pad &&
    point.y < y[1] + pad &&
    point.z > z[0] - pad &&
    point.z < CROWD.eventFront
  );
}

function inFront(point: Vector3): boolean {
  const { x, y, z } = CROWD.frontClear;
  return point.x > x[0] && point.x < x[1] && point.y > y[0] && point.y < y[1] && point.z > z[0];
}

function nearHelix(point: Vector3): boolean {
  return Math.hypot(point.x - HELIX_AXIS.x, point.z - HELIX_AXIS.z) < CROWD.helixClear;
}

function placeHomes(count: number, random: () => number): Vector3[] {
  const homes: Vector3[] = [];
  const range = ([min, max]: readonly [number, number]) =>
    lerp(min + CROWD.margin, max - CROWD.margin, random());
  for (let index = 0; index < count; index += 1) {
    let best = new Vector3();
    let bestGap = -1;
    for (let attempt = 0; attempt < PLACEMENT_TRIES; attempt += 1) {
      const point = new Vector3(
        range(SOLUTION_BOX.x),
        range(SOLUTION_BOX.y),
        range(SOLUTION_BOX.z),
      );
      if (inEvent(point) || inFront(point) || nearHelix(point)) continue;
      const gap = homes.reduce(
        (nearest, home) => Math.min(nearest, home.distanceTo(point)),
        Infinity,
      );
      if (gap > bestGap) {
        best = point;
        bestGap = gap;
      }
      if (gap >= MIN_GAP) break;
    }
    homes.push(best);
  }
  return homes;
}

export class Crowd {
  private readonly ions: Readonly<Record<SpeciesId, readonly Ion[]>>;
  private readonly position = new Vector3();
  private readonly target = new Vector3();
  private readonly rotation = new Quaternion();

  constructor() {
    const random = seededRandom(CROWD.seed);
    const total = SPECIES_IDS.reduce((sum, species) => sum + MAX_DRAWN_COUNTS[species], 0);
    const homes = placeHomes(total, random);
    let next = 0;
    const speed = () => lerp(CROWD.speedMin, CROWD.speedMax, random());
    const ion = (): Ion => {
      const home = homes[next];
      next += 1;
      return {
        home,
        phases: [random() * FULL_TURN, random() * FULL_TURN, random() * FULL_TURN],
        speeds: [speed(), speed(), speed()],
        axis: new Vector3(random() - HALF, random() - HALF, random() - HALF).normalize(),
        spin: lerp(CROWD.spinMin, CROWD.spinMax, random()),
        turn: random() * FULL_TURN,
        mouth: random() < HALF ? 1 : -1,
      };
    };
    const pools = (species: SpeciesId) =>
      Array.from({ length: MAX_DRAWN_COUNTS[species] }, () => ion());
    this.ions = {
      iodate: pools('iodate'),
      bisulfite: pools('bisulfite'),
      sulfate: pools('sulfate'),
      iodide: pools('iodide'),
      hydrogenIon: pools('hydrogenIon'),
      iodine: pools('iodine'),
    };
  }

  draw(draw: DrawContext, state: AssemblyState): void {
    const seconds = state.clock.seconds;
    SPECIES_IDS.forEach((species) => {
      const drawn = MOLAR_OF[species](state) * DRAWN_PER_MOLAR;
      const count = state.clock.counts[species];
      this.ions[species].forEach((ion, index) => {
        if (index >= count) return;
        const grow = index < count - 1 ? 1 : clamp((drawn - index - HALF) * 2, CROWD.growFloor, 1);
        this.drift(ion, seconds);
        let presence = grow;
        if (species === 'iodine') presence *= this.towardHelix(ion, state.clock.complex);
        if (presence <= 0) return;
        const pose = { position: this.position, rotation: this.rotation, scale: 1 };
        draw.batch.molecule(species, SHAPES[species], pose, presence);
        draw.labels.offer(species, this.position, LABEL_PRIORITY - index / count);
        if (species === 'hydrogenIon') draw.halos.add(this.position, THEME_GLOW.proton, presence);
      });
    });
  }

  private drift(ion: Ion, seconds: number): void {
    const offset = (axis: number) =>
      Math.sin(ion.speeds[axis] * seconds + ion.phases[axis]) * CROWD.drift;
    this.position.set(offset(0), offset(1), offset(AXES - 1)).add(ion.home);
    this.rotation.setFromAxisAngle(ion.axis, ion.turn + ion.spin * seconds);
  }

  private towardHelix(ion: Ion, complex: number): number {
    const mouthY = ion.mouth * (HELIX_AXIS.y[1] + HELIX_LOOK.mouthGap);
    this.target.set(HELIX_AXIS.x, mouthY, HELIX_AXIS.z);
    this.position.lerp(this.target, smoothstep(complex, ...ARRIVE));
    return 1 - smoothstep(complex, ...VANISH);
  }
}
