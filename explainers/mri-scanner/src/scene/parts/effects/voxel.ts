import {
  BackSide,
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  GreaterDepth,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { MeshStandardMaterial, Object3D, BufferGeometry } from 'three';
import { clamp } from '@core/math';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { Point, SpinReading, TissueId } from '../../../ids';
import { TISSUE_IDS } from '../../../ids';
import { DISPLAY_TURNS_PER_S } from '../../../model/constants';
import {
  FIELD_DIRECTION,
  MAIN_FIELD_ARROW,
  VOXEL,
  VOXEL_ARROWS,
  VOXEL_LEADER,
} from '../../../model/layout';
import { TISSUE_TONES } from '../../../theme';
import { mergeParts, partMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { FIELD_ARROW, NET_ARROW, VOXEL_LOOK } from './looks';

interface ArrowLook {
  shaftRadius: number;
  headRadius: number;
  headLength: number;
  segments: number;
  emissiveIntensity: number;
  colour: string;
}

interface Arrow {
  shaft: Object3D;
  pivot: Group;
  setLength(length: number): void;
}

interface TissueMaterials {
  arrow: MeshStandardMaterial;
  glass: MeshStandardMaterial;
}

interface TissueFinish {
  arrow: MaterialFinish;
  glass: MaterialFinish;
}

const UP = new Vector3(0, 1, 0);
const AXIS = new Vector3(...FIELD_DIRECTION);
const FULL_TURN = 2 * Math.PI;
const PRECESSION_RATE = DISPLAY_TURNS_PER_S * FULL_TURN;
const MIN_LENGTH = 1e-4;
const SHAFT_MIDDLE = 0.5;
const ROUGHNESS = 0.4;
const CELL = VOXEL.size / VOXEL.perSide;

const TISSUE_FINISHES = Object.fromEntries(
  TISSUE_IDS.map((tissue) => {
    const color = TISSUE_TONES[tissue];
    return [
      tissue,
      {
        arrow: {
          color,
          emissive: color,
          emissiveIntensity: VOXEL_LOOK.emissiveIntensity,
          roughness: ROUGHNESS,
        },
        glass: {
          color: VOXEL_LOOK.backdrop,
          emissive: color,
          emissiveIntensity: VOXEL_LOOK.glassGlow,
          transparent: true,
          opacity: VOXEL_LOOK.glassOpacity,
          depthWrite: false,
          side: BackSide,
        },
      },
    ];
  }),
) as Record<TissueId, TissueFinish>;

function solidFinish(look: ArrowLook): MaterialFinish {
  return {
    color: look.colour,
    emissive: look.colour,
    emissiveIntensity: look.emissiveIntensity,
    roughness: ROUGHNESS,
  };
}

const NET_FINISH = solidFinish(NET_ARROW);
const NET_GHOST_FINISH: MaterialFinish = {
  ...NET_FINISH,
  transparent: true,
  opacity: NET_ARROW.ghostOpacity,
  depthFunc: GreaterDepth,
  depthWrite: false,
};
const FIELD_FINISH = solidFinish(FIELD_ARROW);
const EDGE_FINISH: MaterialFinish = {
  color: VOXEL_LOOK.edgeColour,
  emissive: VOXEL_LOOK.edgeColour,
  emissiveIntensity: VOXEL_LOOK.edgeGlow,
  roughness: ROUGHNESS,
};
const CORE_FINISH: MaterialFinish = { color: VOXEL_LOOK.leaderCore, roughness: ROUGHNESS };
const CORNER_SIGNS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;
const AXES = [0, 1, 2] as const;
const LEADER_FROM = new Vector3(...VOXEL_LEADER.from);
const LEADER_TO = new Vector3(...VOXEL_LEADER.to);

function rod(from: Vector3, to: Vector3, radius: number): BufferGeometry {
  const span = new Vector3().subVectors(to, from);
  const middle = from.clone().add(to).multiplyScalar(0.5);
  return new CylinderGeometry(radius, radius, span.length(), VOXEL_LOOK.edgeSegments, 1, true)
    .applyQuaternion(new Quaternion().setFromUnitVectors(UP, span.normalize()))
    .translate(middle.x, middle.y, middle.z);
}

function frameEdges(): BufferGeometry[] {
  const centre = new Vector3(...VOXEL.centre);
  const half = VOXEL.size / 2;
  const reach = half + VOXEL_LOOK.edgeRadius;
  return AXES.flatMap((axis) =>
    CORNER_SIGNS.map(([first, second]) => {
      const [across, up] = AXES.filter((other) => other !== axis);
      const end = (sign: number) =>
        new Vector3()
          .setComponent(axis, sign * reach)
          .setComponent(across, first * half)
          .setComponent(up, second * half)
          .add(centre);
      return rod(end(-1), end(1), VOXEL_LOOK.edgeRadius);
    }),
  );
}

function leaderDashes(): BufferGeometry[] {
  const length = LEADER_FROM.distanceTo(LEADER_TO);
  const period = VOXEL_LOOK.leaderDash + VOXEL_LOOK.leaderGap;
  return Array.from({ length: Math.floor(length / period) }, (_, index) => {
    const start = (index * period) / length;
    const end = start + VOXEL_LOOK.leaderDash / length;
    return rod(
      LEADER_FROM.clone().lerp(LEADER_TO, start),
      LEADER_FROM.clone().lerp(LEADER_TO, end),
      VOXEL_LOOK.leaderRadius,
    );
  });
}

function leaderTarget(): BufferGeometry {
  const { targetRadius, targetSegments } = VOXEL_LOOK;
  return new SphereGeometry(targetRadius, targetSegments, targetSegments / 2).translate(
    LEADER_TO.x,
    LEADER_TO.y,
    LEADER_TO.z,
  );
}

function spinArrowGeometry(): BufferGeometry {
  const length = CELL * VOXEL_LOOK.arrowFill;
  const head = length * VOXEL_LOOK.arrowHeadShare;
  const shaft = length - head;
  const { arrowShaftRadius, arrowHeadRadius, arrowSegments } = VOXEL_LOOK;
  return mergeParts([
    new CylinderGeometry(
      arrowShaftRadius,
      arrowShaftRadius,
      shaft,
      arrowSegments,
      1,
      true,
    ).translate(0, shaft / 2 - length / 2, 0),
    new ConeGeometry(arrowHeadRadius, head, arrowSegments).translate(0, length / 2 - head / 2, 0),
  ]);
}

function gridOffsets(): Vector3[] {
  const side = Array.from(
    { length: VOXEL.perSide },
    (_, index) => (index + 0.5) * CELL - VOXEL.size / 2,
  );
  return side.flatMap((x) => side.flatMap((y) => side.map((z) => new Vector3(x, y, z))));
}

function buildArrow(
  context: PartContext,
  group: EmphasisGroup,
  look: ArrowLook,
  finish: MaterialFinish,
  ghostFinish?: MaterialFinish,
): Arrow {
  const pivot = new Group();
  const shaft = partMesh(
    context,
    new CylinderGeometry(look.shaftRadius, look.shaftRadius, 1, look.segments).translate(
      0,
      SHAFT_MIDDLE,
      0,
    ),
    group,
    finish,
  );
  const head = partMesh(
    context,
    new ConeGeometry(look.headRadius, look.headLength, look.segments).translate(
      0,
      look.headLength / 2,
      0,
    ),
    group,
    finish,
  );
  pivot.add(shaft, head);
  if (ghostFinish) {
    const ghost = context.materials.get(group, ghostFinish);
    shaft.add(new Mesh(shaft.geometry, ghost));
    head.add(new Mesh(head.geometry, ghost));
  }
  return {
    pivot,
    shaft,
    setLength(length: number) {
      const stem = Math.max(length - look.headLength, MIN_LENGTH);
      shaft.scale.y = stem;
      head.position.y = length > look.headLength ? stem : 0;
      head.scale.setScalar(clamp(length / look.headLength, MIN_LENGTH, 1));
    },
  };
}

export class VoxelInset {
  readonly spins = new Group();
  readonly net = new Group();
  readonly field = new Group();
  readonly labels: Readonly<Record<'spinArrows' | 'netMagnet' | 'mainField', Object3D>>;
  private readonly arrows: InstancedMesh;
  private readonly glass: Mesh;
  private readonly tissueMaterials: Record<TissueId, TissueMaterials>;
  private readonly netArrow: Arrow;
  private readonly offsets = gridOffsets();
  private readonly matrix = new Matrix4();
  private readonly turn = new Quaternion();
  private readonly orient = new Quaternion();
  private readonly direction = new Vector3();
  private readonly scale = new Vector3();
  private reading: SpinReading = { net: [0, 0, 0], arrows: [], precession: 0 };
  private angle = 0;

  constructor(context: PartContext) {
    this.spins.name = 'spinArrows';
    this.net.name = 'netMagnet';
    this.field.name = 'mainField';
    this.tissueMaterials = Object.fromEntries(
      TISSUE_IDS.map((tissue) => [
        tissue,
        {
          arrow: context.materials.get('spinArrows', TISSUE_FINISHES[tissue].arrow),
          glass: context.materials.get('spinArrows', TISSUE_FINISHES[tissue].glass),
        },
      ]),
    ) as Record<TissueId, TissueMaterials>;
    const inset = new Group();
    inset.position.set(...VOXEL.centre);
    this.arrows = new InstancedMesh(
      context.tracker.track(spinArrowGeometry()),
      this.tissueMaterials.fat.arrow,
      VOXEL_ARROWS,
    );
    this.arrows.frustumCulled = false;
    this.glass = new Mesh(
      context.tracker.track(new BoxGeometry(VOXEL.size, VOXEL.size, VOXEL.size)),
      this.tissueMaterials.fat.glass,
    );
    this.glass.renderOrder = 1;
    inset.add(this.arrows, this.glass);
    this.spins.add(
      inset,
      partMesh(
        context,
        mergeParts([...frameEdges(), ...leaderDashes(), leaderTarget()]),
        'spinArrows',
        EDGE_FINISH,
      ),
      partMesh(
        context,
        rod(LEADER_FROM, LEADER_TO, VOXEL_LOOK.leaderCoreRadius),
        'spinArrows',
        CORE_FINISH,
      ),
    );
    this.netArrow = buildArrow(context, 'netMagnet', NET_ARROW, NET_FINISH, NET_GHOST_FINISH);
    this.netArrow.pivot.position.set(...VOXEL.centre);
    this.netArrow.pivot.traverse((part) => {
      part.renderOrder = NET_ARROW.renderOrder;
    });
    this.net.add(this.netArrow.pivot);
    const fieldArrow = buildArrow(context, 'mainField', FIELD_ARROW, FIELD_FINISH);
    fieldArrow.pivot.position.set(...MAIN_FIELD_ARROW.tail);
    fieldArrow.pivot.quaternion.setFromUnitVectors(UP, AXIS);
    fieldArrow.setLength(MAIN_FIELD_ARROW.length);
    this.field.add(fieldArrow.pivot);
    const [x, y, z] = VOXEL.centre;
    const half = VOXEL.size / 2;
    this.labels = {
      spinArrows: anchorAt(this.spins, x - half, y, z),
      netMagnet: anchorAt(this.netArrow.shaft, 0, SHAFT_MIDDLE, 0),
      mainField: anchorAt(this.field, ...MAIN_FIELD_ARROW.tail),
    };
  }

  show(visible: boolean): void {
    this.spins.visible = visible;
    this.net.visible = visible;
    this.field.visible = visible;
  }

  setState(spins: SpinReading, tissue: TissueId): void {
    this.reading = spins;
    this.arrows.material = this.tissueMaterials[tissue].arrow;
    this.glass.material = this.tissueMaterials[tissue].glass;
    this.place();
  }

  advance(deltaSeconds: number, playing: boolean): boolean {
    if (!playing || !this.spins.visible) return false;
    this.angle = (this.angle + deltaSeconds * PRECESSION_RATE) % FULL_TURN;
    this.place();
    return true;
  }

  private place(): void {
    this.turn.setFromAxisAngle(AXIS, this.angle);
    this.offsets.forEach((offset, index) => {
      const length = this.orientAlong(this.reading.arrows[index] ?? [0, 0, 0]);
      this.scale.set(1, Math.max(length, MIN_LENGTH), 1);
      this.arrows.setMatrixAt(index, this.matrix.compose(offset, this.orient, this.scale));
    });
    this.arrows.instanceMatrix.needsUpdate = true;
    const length = this.orientAlong(this.reading.net);
    this.netArrow.pivot.quaternion.copy(this.orient);
    this.netArrow.setLength(length * VOXEL.size * NET_ARROW.scale);
  }

  private orientAlong(vector: Point): number {
    this.direction.set(...vector);
    const length = this.direction.length();
    if (length < MIN_LENGTH) return 0;
    this.direction.divideScalar(length).applyQuaternion(this.turn);
    this.orient.setFromUnitVectors(UP, this.direction);
    return length;
  }
}
