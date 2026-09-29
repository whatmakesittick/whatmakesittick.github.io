import { CylinderGeometry, Group } from 'three';
import type { Canister, PumpSide } from '../../../model';
import type { PartId } from '../../../ids';
import { PUMP_TEMPLATE, ROTOR, SEGMENTS } from '../../constants';
import { revolveShell } from '../../geometry/revolve';
import { bladeRow, impeller, inducer } from '../../geometry/rotor';
import { scaleProfile, smoothShell } from '../../geometry/shells';
import type { TemplateScale } from '../../geometry/shells';
import { markDynamic, partMesh, shellMeshes } from '../context';
import type { PartContext } from '../context';

const PROFILE_SAMPLES = 90;
const HELIX_STEPS = 24;
const TURBINE_PITCH = 0.55;
const VANE_SWEEP = 0.12;

export const PUMP_GROUPS: Readonly<Record<PumpSide, PartId>> = {
  oxygen: 'oxygenPump',
  methane: 'methanePump',
};

export function pumpScale(canister: Canister): TemplateScale {
  return {
    radius: canister.radius / PUMP_TEMPLATE.radius,
    from: [PUMP_TEMPLATE.top, PUMP_TEMPLATE.bottom],
    to: [canister.top, canister.bottom],
  };
}

function mapHeight(y: number, scale: TemplateScale): number {
  const share = (y - scale.from[0]) / (scale.from[1] - scale.from[0]);
  return scale.to[0] + (scale.to[1] - scale.to[0]) * share;
}

export class TurbopumpPart {
  readonly object = new Group();
  private readonly rotor = new Group();

  constructor(context: PartContext, side: PumpSide, canister: Canister) {
    const { finishes, cutaway } = context;
    const group = PUMP_GROUPS[side];
    const scale = pumpScale(canister);
    this.object.position.set(canister.centre[0], 0, canister.centre[2]);
    const shell = revolveShell(
      smoothShell(
        {
          outer: scaleProfile(PUMP_TEMPLATE.outer, scale),
          inner: scaleProfile(PUMP_TEMPLATE.inner, scale),
        },
        PROFILE_SAMPLES,
      ),
      { segments: SEGMENTS.part },
    );
    shellMeshes(context, this.object, shell, group, { outer: finishes.coat });
    this.buildRotor(context, group, scale);
    this.object.add(cutaway.opened(markDynamic(this.rotor)));
  }

  setAngle(angle: number): void {
    this.rotor.rotation.y = angle;
  }

  private buildRotor(context: PartContext, group: PartId, scale: TemplateScale): void {
    const { finishes } = context;
    const size = scale.radius;
    const y = (value: number) => mapHeight(value, scale);
    const top = y(ROTOR.inducer.top);
    const bottom = y(ROTOR.turbine.bottom);
    const shaft = new CylinderGeometry(
      ROTOR.shaftRadius * size,
      ROTOR.shaftRadius * size,
      top - bottom,
      SEGMENTS.small,
    );
    shaft.translate(0, (top + bottom) / 2, 0);
    const inducerGeometry = inducer(
      {
        top: y(ROTOR.inducer.top),
        bottom: y(ROTOR.inducer.bottom),
        hub: ROTOR.hubRadius * size,
        tip: ROTOR.inducer.tip * size,
        blades: ROTOR.inducer.blades,
        twist: ROTOR.inducer.twist,
        thickness: ROTOR.bladeThickness,
      },
      HELIX_STEPS,
    );
    const impellerGeometry = impeller({
      top: y(ROTOR.impeller.top),
      bottom: y(ROTOR.impeller.bottom),
      hub: ROTOR.impeller.hubTop * size,
      tip: ROTOR.impeller.tip * size,
      count: ROTOR.impeller.vanes,
      sweep: VANE_SWEEP,
      thickness: ROTOR.bladeThickness,
    });
    const turbineGeometry = bladeRow({
      top: y(ROTOR.turbine.top),
      bottom: y(ROTOR.turbine.bottom),
      disc: ROTOR.turbine.disc * size,
      tip: ROTOR.turbine.tip * size,
      count: ROTOR.turbine.blades,
      pitch: TURBINE_PITCH,
      thickness: ROTOR.bladeThickness,
    });
    this.rotor.add(
      partMesh(context, shaft, group, finishes.steel),
      partMesh(context, inducerGeometry, group, finishes.rotor),
      partMesh(context, impellerGeometry, group, finishes.rotor),
      partMesh(context, turbineGeometry, group, finishes.inconel),
    );
  }
}
