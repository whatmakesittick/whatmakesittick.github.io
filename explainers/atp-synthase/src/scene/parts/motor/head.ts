import { Group } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { toRadians } from '@core/math';
import { BETA_INDICES } from '../../../ids';
import type { PartId } from '../../../ids';
import { ALPHA_AZIMUTH_DEG, BETA_AZIMUTH_DEG } from '../../../model/rotor';
import { HEAD, spanLength, spanMiddle } from '../../../model/scale';
import { DETAIL, LOBE } from '../../constants';
import type { Detail } from '../../constants';
import { bendEndsInward } from '../../geometry/bend';
import { mergeParts } from '../../geometry/merge';
import { latheY } from '../../geometry/solids';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { FINISHES } from '../../finishes';

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

export function lobesGeometry(azimuths: readonly number[], detail: Detail): BufferGeometry {
  return mergeParts(azimuths.map((azimuth) => lobeGeometry(azimuth, detail)));
}

interface Lobes {
  readonly mesh: Mesh;
  readonly group: PartId;
  readonly solid: MaterialFinish;
  readonly glass: MaterialFinish;
}

export class HeadPart {
  readonly object = new Group();
  private readonly context: PartContext;
  private readonly lobes: readonly Lobes[];

  constructor(context: PartContext) {
    this.context = context;
    this.lobes = [
      this.buildLobes(ALPHA_AZIMUTH_DEG, 'alphaSubunits', FINISHES.alpha, FINISHES.alphaGlass),
      this.buildLobes(BETA_LOBE_AZIMUTHS, 'betaSubunits', FINISHES.beta, FINISHES.betaGlass),
    ];
    this.lobes.forEach(({ mesh }) => this.object.add(mesh));
  }

  setCutaway(cutaway: boolean): void {
    this.lobes.forEach(({ mesh, group, solid, glass }) => {
      mesh.material = this.context.materials.get(group, cutaway ? glass : solid);
    });
  }

  private buildLobes(
    azimuths: readonly number[],
    group: PartId,
    solid: MaterialFinish,
    glass: MaterialFinish,
  ): Lobes {
    const geometry = lobesGeometry(azimuths, DETAIL.hero);
    return { mesh: finishMesh(this.context, geometry, group, solid), group, solid, glass };
  }
}
