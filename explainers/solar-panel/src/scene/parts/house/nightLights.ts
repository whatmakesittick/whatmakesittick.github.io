import { Group, MeshStandardMaterial } from 'three';
import type { BufferGeometry } from 'three';
import { smoothstep } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { NIGHT_LIGHTS } from '../../constants';
import { FINISHES } from '../../finishes';
import { mergeParts } from '../../geometry/merge';
import { registeredMesh } from '../context';
import type { PartContext } from '../context';

export class NightLightsPart {
  readonly object = new Group();
  private readonly panes: MeshStandardMaterial;
  private readonly lamps: MeshStandardMaterial;

  constructor(context: PartContext, panes: BufferGeometry[], lamps: BufferGeometry[]) {
    this.panes = new MeshStandardMaterial({
      ...FINISHES.windowGlass,
      emissive: NIGHT_LIGHTS.color,
    });
    this.lamps = new MeshStandardMaterial(FINISHES.lamp);
    this.object.add(
      registeredMesh(context, mergeParts(panes), STRUCTURE_GROUP, this.panes),
      registeredMesh(context, mergeParts(lamps), STRUCTURE_GROUP, this.lamps),
    );
  }

  setSunElevation(elevationDeg: number): void {
    const dark = 1 - smoothstep(elevationDeg, NIGHT_LIGHTS.fullBelowDeg, NIGHT_LIGHTS.darkAboveDeg);
    this.panes.emissiveIntensity = dark * NIGHT_LIGHTS.window;
    this.lamps.emissiveIntensity = dark * NIGHT_LIGHTS.lamp;
  }
}
