import { Group } from 'three';
import type { Object3D } from 'three';
import { VALVE_IDS } from '../../../ids';
import type { ValveId } from '../../../ids';
import { SOUNDS, VALVES, heartSound, shareOf, valveOpening, wrapTime } from '../../../model';
import { VALVE_DESIGN, VALVE_DETAIL } from '../../constants';
import type { Contraction } from '../../geometry/contraction';
import { cylinder, union } from '../../geometry/field';
import type { Field, Vec3 } from '../../geometry/field';
import type { PartContext } from '../context';
import { ChordaePart } from './chordae';
import { ValvePart } from './valve';

const ATRIOVENTRICULAR: readonly ValveId[] = ['tricuspid', 'mitral'];
const SOUND_VALVES = { s1: ATRIOVENTRICULAR, s2: ['aortic', 'pulmonary'] } as const;
const LABELLED_VALVE: ValveId = 'mitral';

export function guardField(id: ValveId, cavity: Field): Field {
  const { centre, normal, radius } = VALVES[id];
  const size = Math.hypot(...normal);
  const along = (distance: number): Vec3 => [
    centre[0] + (normal[0] / size) * distance,
    centre[1] + (normal[1] / size) * distance,
    centre[2] + (normal[2] / size) * distance,
  ];
  const orifice = cylinder(
    along(-VALVE_DETAIL.guardNeckUpMm),
    along(VALVE_DETAIL.guardNeckDownMm),
    radius - VALVE_DETAIL.guardNeckInsetMm,
  );
  return union([cavity, orifice]);
}

export class ValvesPart {
  readonly object = new Group();
  readonly valves = new Map<ValveId, ValvePart>();
  readonly chordae: ChordaePart;

  constructor(
    context: PartContext,
    cavities: Readonly<Record<'left' | 'right', Field>>,
    motion: Contraction,
  ) {
    const cavityOf: Partial<Record<ValveId, Field>> = {
      mitral: cavities.left,
      tricuspid: cavities.right,
    };
    for (const id of VALVE_IDS) {
      const valve = new ValvePart(context, id, VALVE_DESIGN[id], cavityOf[id]);
      this.valves.set(id, valve);
      this.object.add(valve.object);
    }
    const hinged = ATRIOVENTRICULAR.map((id) => this.valve(id));
    this.chordae = new ChordaePart(
      context,
      hinged,
      (valve) => (valve.id === 'mitral' ? cavities.left : cavities.right),
      motion,
      LABELLED_VALVE,
    );
    this.object.add(this.chordae.object);
  }

  valve(id: ValveId): ValvePart {
    const valve = this.valves.get(id);
    if (!valve) throw new Error(`Unknown valve ${id}`);
    return valve;
  }

  anchor(id: ValveId): Object3D {
    return this.valve(id).anchor;
  }

  setCutaway(cutaway: boolean): void {
    this.chordae.setCutaway(cutaway);
    for (const valve of this.valves.values()) valve.setCutaway(cutaway);
  }

  setTime(time: number, squeeze: number, emptying: number): void {
    for (const [id, valve] of this.valves) valve.setOpening(valveOpening(id, time));
    this.chordae.update(squeeze, emptying);
    this.applyPulse(time);
  }

  private applyPulse(time: number): void {
    const sound = heartSound(time);
    const level = sound ? 1 - shareOf(SOUNDS[sound], wrapTime(time)) : 0;
    for (const [id, valve] of this.valves) {
      const ringing = sound !== null && (SOUND_VALVES[sound] as readonly ValveId[]).includes(id);
      valve.setPulse(ringing ? level : 0);
    }
  }
}
