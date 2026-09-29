import { Group, SphereGeometry } from 'three';
import type { MeshStandardMaterial } from 'three';
import type { Canister, PumpSide } from '../../../model';
import type { PartId } from '../../../ids';
import { GLOW, PREBURNER_TEMPLATE, SEGMENTS } from '../../constants';
import { revolveShell } from '../../geometry/revolve';
import { scaleProfile, smoothShell } from '../../geometry/shells';
import { partMesh, shellMeshes } from '../context';
import type { PartContext } from '../context';

const PROFILE_SAMPLES = 70;
const IGNITER_RADIUS = 2.4;

export const PREBURNER_GROUPS: Readonly<Record<PumpSide, PartId>> = {
  oxygen: 'oxygenPreburner',
  methane: 'methanePreburner',
};

export function ignitionFlash(time: number, light: number, seconds: number): number {
  if (time < light) return 0;
  return Math.max(0, 1 - (time - light) / seconds);
}

export class PreburnerPart {
  readonly object = new Group();
  private readonly shell: MeshStandardMaterial;
  private readonly cavity: MeshStandardMaterial;

  constructor(context: PartContext, side: PumpSide, canister: Canister) {
    const { finishes, materials } = context;
    const group = PREBURNER_GROUPS[side];
    const flame = side === 'oxygen' ? finishes.oxygenFlame : finishes.methaneFlame;
    this.object.position.set(canister.centre[0], 0, canister.centre[2]);
    const scale = {
      radius: canister.radius / PREBURNER_TEMPLATE.radius,
      from: [PREBURNER_TEMPLATE.top, PREBURNER_TEMPLATE.bottom] as const,
      to: [canister.top, canister.bottom] as const,
    };
    const shell = revolveShell(
      smoothShell(
        {
          outer: scaleProfile(PREBURNER_TEMPLATE.outer, scale),
          inner: scaleProfile(PREBURNER_TEMPLATE.inner, scale),
        },
        PROFILE_SAMPLES,
      ),
      { segments: SEGMENTS.part },
    );
    shellMeshes(context, this.object, shell, group, {
      outer: finishes.preburnerShell,
      cavity: flame,
    });
    const igniter = new SphereGeometry(IGNITER_RADIUS, SEGMENTS.small, SEGMENTS.small / 2);
    igniter.translate(0, canister.top + 1.2, 0);
    this.object.add(partMesh(context, igniter, group, finishes.steel));
    this.shell = materials.get(group, finishes.preburnerShell);
    this.cavity = materials.get(group, flame);
  }

  setGlow(flash: number, glow: number): void {
    this.shell.emissiveIntensity = flash * GLOW.preburnerFlash;
    this.cavity.emissiveIntensity = glow * GLOW.preburnerCavity;
  }
}
