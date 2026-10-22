import { Group } from 'three';
import type { AssemblyState } from '../../../ids';
import { INSET, INSET_CENTRE, REST_GAP_MM } from '../../../model';
import type { Frame, NudgeSample, PartContext } from '../context';
import { label } from '../context';
import { Ease } from '../ease';
import { RESTING_NUDGE } from '../nudge';
import { FieldBands } from './field';
import { GapGauge } from './gapGauge';
import { gustShift, magnetTop } from './layout';
import { MagnetDrawing } from './magnet';
import { fieldLead, insetPace, patternOffset } from './pace';
import { buildPanel } from './panel';
import { buildStator } from './stator';
import { ThrustArrow } from './thrust';
import type { Thrust } from './thrust';

const FACING_MINUS_Z = Math.PI;

interface Reading {
  readonly gapMm: number;
  readonly speedMs: number;
}

function thrustFor(state: AssemblyState): Thrust {
  if (!state.wave.on || state.motion.speedMs <= 0) return 'none';
  return state.wave.reversed ? 'backward' : 'forward';
}

export class InsetDrawing {
  readonly panel = new Group();
  private readonly field: FieldBands;
  private readonly magnet: MagnetDrawing;
  private readonly gauge: GapGauge;
  private readonly thrust: ThrustArrow;
  private reading: Reading = { gapMm: REST_GAP_MM, speedMs: 0 };
  private nudge: NudgeSample = RESTING_NUDGE;
  private lead: Ease | null = null;
  private strength: Ease | null = null;
  private shift = 0;

  constructor(context: PartContext) {
    this.panel.name = 'gapInsetPanel';
    this.panel.position.set(...INSET_CENTRE);
    this.panel.rotation.y = FACING_MINUS_Z;
    this.field = new FieldBands(context);
    this.magnet = new MagnetDrawing(context);
    this.gauge = new GapGauge(context);
    this.thrust = new ThrustArrow(context);
    this.panel.add(...buildPanel(context));
    buildStator(context, this.panel);
    this.panel.add(this.field.mesh, this.magnet.group, this.gauge.group, this.thrust.group);
    label(context, 'gapInset', this.panel, [0, INSET.height / 2, 0]);
  }

  get moving(): boolean {
    return this.reading.speedMs > 0 || this.nudge.active || this.easing;
  }

  apply(state: AssemblyState): void {
    this.reading = { gapMm: state.motion.gapMm, speedMs: state.motion.speedMs };
    this.aim(fieldLead(state.wave.reversed), state.wave.on ? 1 : 0);
    this.thrust.point(thrustFor(state));
    this.draw();
  }

  advance(frame: Frame): boolean {
    this.shift += insetPace(this.reading.speedMs) * frame.delta;
    this.lead?.step(frame.delta);
    this.strength?.step(frame.delta);
    this.nudge = frame.nudge;
    this.draw();
    return this.moving;
  }

  private get easing(): boolean {
    return Boolean(this.lead?.running || this.strength?.running);
  }

  private aim(lead: number, strength: number): void {
    if (!this.lead || !this.strength) {
      this.lead = new Ease(lead);
      this.strength = new Ease(strength);
      return;
    }
    this.lead.aim(lead);
    this.strength.aim(strength);
  }

  private draw(): void {
    const gapMm = this.reading.gapMm + this.nudge.gapMm;
    const top = magnetTop(gapMm);
    this.magnet.place(top);
    this.thrust.place(top);
    this.gauge.show(gapMm);
    this.magnet.scroll(patternOffset(this.shift + gustShift(this.nudge.lateralMm)));
    this.field.scroll(patternOffset(this.shift + (this.lead?.value ?? 0)));
    this.field.fade(this.strength?.value ?? 0);
  }
}
