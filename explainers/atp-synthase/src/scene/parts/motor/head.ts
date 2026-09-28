import { Group } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { toRadians } from '@core/math';
import { BETA_INDICES } from '../../../ids';
import { ALPHA_AZIMUTH_DEG, BETA_AZIMUTH_DEG } from '../../../model/rotor';
import { HEAD, spanLength, spanMiddle } from '../../../model/scale';
import { LOBE } from '../../constants';
import type { Detail } from '../../constants';
import { bendEndsInward } from '../../geometry/bend';
import { mergeParts } from '../../geometry/merge';
import { latheY } from '../../geometry/solids';
import { finishMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import type { MotorFinishes } from '../../finishes';
import type { MotorLook, MotorPartId } from './look';

const HALF = 0.5;

export const BETA_LOBE_AZIMUTHS: readonly number[] = BETA_INDICES.map(
  (beta) => BETA_AZIMUTH_DEG[beta],
);

export function lobeGeometry(azimuthDeg: number, detail: Detail): BufferGeometry {
  const height = spanLength(HEAD.span);
  const lobe = latheY(LOBE.profile, height, HEAD.lobeRadius, detail);
  lobe.translate(0, -height * HALF, 0);
  lobe.scale(1, 1, LOBE.tangentialSquash);
  bendEndsInward(lobe, height * HALF, LOBE.endBend);
  lobe.translate(HEAD.lobeRing, spanMiddle(HEAD.span), 0);
  return lobe.rotateY(toRadians(azimuthDeg));
}

function lobesGeometry(azimuths: readonly number[], detail: Detail): BufferGeometry {
  return mergeParts(azimuths.map((azimuth) => lobeGeometry(azimuth, detail)));
}

interface LobeSet {
  readonly azimuths: readonly number[];
  readonly part: MotorPartId;
  readonly solid: keyof MotorFinishes;
  readonly glass: keyof MotorFinishes;
}

const LOBE_SETS: readonly LobeSet[] = [
  { azimuths: ALPHA_AZIMUTH_DEG, part: 'alphaSubunits', solid: 'alpha', glass: 'alphaGlass' },
  { azimuths: BETA_LOBE_AZIMUTHS, part: 'betaSubunits', solid: 'beta', glass: 'betaGlass' },
];

interface Lobes {
  readonly mesh: Mesh;
  readonly group: EmphasisGroup;
  readonly solid: MaterialFinish;
  readonly glass: MaterialFinish;
}

export class HeadPart {
  readonly object = new Group();
  private readonly context: PartContext;
  private readonly lobes: readonly Lobes[];

  constructor(context: PartContext, look: MotorLook) {
    this.context = context;
    this.lobes = LOBE_SETS.map((set) => this.buildLobes(set, look));
    this.lobes.forEach(({ mesh }) => this.object.add(mesh));
  }

  setCutaway(cutaway: boolean): void {
    this.lobes.forEach(({ mesh, group, solid, glass }) => {
      mesh.material = this.context.materials.get(group, cutaway ? glass : solid);
    });
  }

  private buildLobes(set: LobeSet, look: MotorLook): Lobes {
    const group = look.group(set.part);
    const solid = look.finishes[set.solid];
    const geometry = lobesGeometry(set.azimuths, look.detail);
    return {
      mesh: finishMesh(this.context, geometry, group, solid),
      group,
      solid,
      glass: look.finishes[set.glass],
    };
  }
}
