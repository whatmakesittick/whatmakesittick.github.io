import { Group, Matrix4 } from 'three';
import type { BufferGeometry, InstancedMesh, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { ALPHA_AZIMUTH_DEG, HUMAN_BLADE_COUNT } from '../../../model/rotor';
import { HEAD, rowOffsetZ, spanMiddle } from '../../../model/scale';
import { DETAIL, ROW_FORM } from '../../constants';
import { FINISHES, rowPaint } from '../../finishes';
import { mergeParts } from '../../geometry/merge';
import { painted } from '../../geometry/paint';
import { ringLayout } from '../../geometry/ringLayout';
import { polar } from '../../geometry/solids';
import { instancedMesh } from '../context';
import type { PartContext } from '../context';
import { BETA_LOBE_AZIMUTHS, lobesGeometry } from '../motor/head';
import { axleGeometry, carboxylGeometry, ringGeometry } from '../motor/rotor';
import { gateGeometry, oscpGeometry, stalkGeometry } from '../motor/stator';

const HUMAN_RING = ringLayout(HUMAN_BLADE_COUNT);
const FIRST_NEIGHBOUR = 1;

function bodyGeometry(): BufferGeometry {
  const detail = DETAIL.row;
  return mergeParts([
    painted(lobesGeometry(ALPHA_AZIMUTH_DEG, detail), rowPaint('alpha')),
    painted(lobesGeometry(BETA_LOBE_AZIMUTHS, detail), rowPaint('beta')),
    painted(oscpGeometry(detail), rowPaint('stator')),
    painted(stalkGeometry(HUMAN_RING, detail), rowPaint('stator')),
    painted(gateGeometry(HUMAN_RING, detail), rowPaint('gate')),
  ]);
}

function rotorGeometry(): BufferGeometry {
  const detail = DETAIL.row;
  return mergeParts([
    painted(ringGeometry(HUMAN_RING, detail), rowPaint('ring')),
    painted(carboxylGeometry(HUMAN_RING, detail), rowPaint('carboxyl')),
    painted(axleGeometry(detail), rowPaint('axle')),
  ]);
}

export class RowPart {
  readonly object = new Group();
  readonly label: Object3D;
  private readonly bodies: InstancedMesh;
  private readonly rotors: InstancedMesh;
  private readonly labelHolder = new Group();
  private readonly matrix = new Matrix4();

  constructor(context: PartContext) {
    const count = ROW_FORM.maxNeighbours;
    this.bodies = instancedMesh(context, bodyGeometry(), 'neighbourMotors', FINISHES.row, count);
    this.rotors = instancedMesh(context, rotorGeometry(), 'neighbourMotors', FINISHES.row, count);
    [this.bodies, this.rotors].forEach((mesh) => (mesh.frustumCulled = false));
    for (let index = 0; index < count; index += 1) {
      this.bodies.setMatrixAt(index, this.matrix.makeTranslation(0, 0, this.offsetOf(index)));
    }
    const at = polar(ROW_FORM.labelDeg, HEAD.radius - ROW_FORM.labelSink, spanMiddle(HEAD.span));
    this.label = anchorAt(this.labelHolder, at.x, at.y, at.z + rowOffsetZ(FIRST_NEIGHBOUR));
    this.object.add(this.bodies, this.rotors, this.labelHolder);
  }

  place(rotorDeg: number, motorCount: number): void {
    const shown = Math.min(ROW_FORM.maxNeighbours, Math.max(0, motorCount - FIRST_NEIGHBOUR));
    this.bodies.count = shown;
    this.rotors.count = shown;
    this.object.visible = shown > 0;
    for (let index = 0; index < shown; index += 1) {
      const turn = toRadians(rotorDeg + ROW_FORM.offsetDeg * (index + FIRST_NEIGHBOUR));
      this.matrix.makeRotationY(turn).setPosition(0, 0, this.offsetOf(index));
      this.rotors.setMatrixAt(index, this.matrix);
    }
    this.rotors.instanceMatrix.needsUpdate = true;
  }

  private offsetOf(index: number): number {
    return rowOffsetZ(index + FIRST_NEIGHBOUR);
  }
}
