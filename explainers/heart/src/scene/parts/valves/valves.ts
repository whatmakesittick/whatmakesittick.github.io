import { Group } from 'three';
import type { Object3D } from 'three';
import { VALVE_IDS } from '../../../ids';
import type { ValveId } from '../../../ids';
import { SOUNDS, heartSound, shareOf, valveOpening, wrapTime } from '../../../model';
import { VALVE_DESIGN } from '../../constants';
import type { Contraction } from '../../geometry/contraction';
import type { Field } from '../../geometry/field';
import type { PartContext } from '../context';
import { ChordaePart } from './chordae';
import { ValvePart } from './valve';

const ATRIOVENTRICULAR: readonly ValveId[] = ['tricuspid', 'mitral'];
const SOUND_VALVES = { s1: ATRIOVENTRICULAR, s2: ['aortic', 'pulmonary'] } as const;

export class ValvesPart {
  readonly object = new Group();
  readonly valves = new Map<ValveId, ValvePart>();
  readonly chordae: ChordaePart;

  constructor(
    context: PartContext,
    cavities: Readonly<Record<'left' | 'right', Field>>,
    motion: Contraction,
  ) {
    for (const id of VALVE_IDS) {
      const valve = new ValvePart(context, id, VALVE_DESIGN[id]);
      this.valves.set(id, valve);
      this.object.add(valve.object);
    }
    const hinged = ATRIOVENTRICULAR.map((id) => this.valve(id));
    this.chordae = new ChordaePart(
      context,
      hinged,
      (valve) => (valve.id === 'mitral' ? cavities.left : cavities.right),
      motion,
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
