import { Euler, Group, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { InstancedMesh, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { FULL_TURN_DEG } from '../../../model/rotor';
import { DETAIL, OXYGEN_FORM } from '../../constants';
import { FINISHES } from '../../finishes';
import type { GlyphPose } from '../../flow/molecules';
import { poseOxygen } from '../../flow/oxygen';
import type { OxygenPose } from '../../flow/oxygen';
import { beadPose } from '../../flow/points';
import { oxygenPeriodDeg } from '../../flow/rates';
import { streamProgress } from '../../flow/stream';
import { instancedMesh } from '../context';
import type { PartContext } from '../context';

const TRAVEL_DEG = OXYGEN_FORM.travelLaps * FULL_TURN_DEG;
const ATOMS = 4;
const WATER_FIRST_ATOM = 2;
const SIDES = [-1, 1] as const;

function glyphPose(): GlyphPose {
  return { ...beadPose(), turn: 0 };
}

function atomGeometry(radius: number): SphereGeometry {
  return new SphereGeometry(radius, DETAIL.hero.sphere, DETAIL.hero.sphere / 2);
}

export class OxygenPart {
  readonly object = new Group();
  readonly label: Object3D;
  private readonly atoms: InstancedMesh;
  private readonly hydrogens: InstancedMesh;
  private readonly pose: OxygenPose = { pair: glyphPose(), waters: [glyphPose(), glyphPose()] };
  private readonly matrix = new Matrix4();
  private readonly offset = new Matrix4();
  private readonly atom = new Matrix4();
  private readonly rotation = new Quaternion();
  private readonly euler = new Euler();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();

  constructor(context: PartContext) {
    const { atomRadius, hydrogenRadius, dock } = OXYGEN_FORM;
    this.atoms = instancedMesh(context, atomGeometry(atomRadius), 'oxygen', FINISHES.oxygen, ATOMS);
    this.hydrogens = instancedMesh(
      context,
      atomGeometry(hydrogenRadius),
      'oxygen',
      FINISHES.hydrogen,
      ATOMS,
    );
    [this.atoms, this.hydrogens].forEach((mesh) => {
      mesh.frustumCulled = false;
      this.object.add(mesh);
    });
    this.label = anchorAt(this.object, dock.x, dock.y, dock.z);
  }

  place(clockDeg: number, bladeCount: number, presence: number): void {
    const progress = streamProgress(clockDeg, oxygenPeriodDeg(bladeCount), TRAVEL_DEG, 0);
    poseOxygen(progress, this.pose);
    this.compose(this.pose.pair, presence);
    for (let index = 0; index < SIDES.length; index += 1) {
      this.setAtom(this.atoms, index, SIDES[index] * OXYGEN_FORM.bondHalf, 0);
    }
    this.placeWater(this.pose.waters[0], 0, presence);
    this.placeWater(this.pose.waters[1], 1, presence);
    this.atoms.instanceMatrix.needsUpdate = true;
    this.hydrogens.instanceMatrix.needsUpdate = true;
  }

  private placeWater(water: GlyphPose, index: number, presence: number): void {
    const { hydrogen } = OXYGEN_FORM;
    this.compose(water, presence);
    this.setAtom(this.atoms, WATER_FIRST_ATOM + index, 0, 0);
    for (let side = 0; side < SIDES.length; side += 1) {
      this.setAtom(
        this.hydrogens,
        index * SIDES.length + side,
        SIDES[side] * hydrogen.x,
        hydrogen.y,
      );
    }
  }

  private setAtom(mesh: InstancedMesh, index: number, x: number, y: number): void {
    this.atom.multiplyMatrices(this.matrix, this.offset.makeTranslation(x, y, 0));
    mesh.setMatrixAt(index, this.atom);
  }

  private compose(pose: GlyphPose, presence: number): void {
    const { x, y, z } = pose.position;
    this.rotation.setFromEuler(this.euler.set(pose.turn, pose.turn, 0));
    this.scale.setScalar(pose.scale * presence);
    this.matrix.compose(this.position.set(x, y, z), this.rotation, this.scale);
  }
}
