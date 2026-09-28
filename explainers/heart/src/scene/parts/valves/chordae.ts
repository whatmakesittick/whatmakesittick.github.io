import { CylinderGeometry, Group, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { Mesh } from 'three';
import { VALVE_DETAIL } from '../../constants';
import { FINISHES } from '../../finishes';
import { displace } from '../../geometry/contraction';
import type { Contraction, Offset } from '../../geometry/contraction';
import type { Field } from '../../geometry/field';
import { mergeParts } from '../../geometry/merge';
import { addMorphTargets } from '../../geometry/morph';
import { spokes, wallBase } from '../../geometry/papillary';
import { taperedTube } from '../../geometry/taperedTube';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import type { ChordAttachment, ValvePart } from './valve';

interface Chord {
  readonly valve: ValvePart;
  readonly attachment: ChordAttachment;
  readonly tip: number;
}

const UP = new Vector3(0, 1, 0);

function attachments(valve: ValvePart): ChordAttachment[] {
  const { chordsPerLeaflet, leaflets } = valve.design;
  const margin = VALVE_DETAIL.chordMargin;
  return leaflets.flatMap((_, leaflet) =>
    Array.from({ length: chordsPerLeaflet }, (__, chord) => ({
      leaflet,
      share: margin + ((1 - 2 * margin) * chord) / Math.max(chordsPerLeaflet - 1, 1),
    })),
  );
}

export class ChordaePart {
  readonly object = new Group();
  readonly anchor: Vector3;
  private readonly chords: Chord[] = [];
  private readonly tips: Vector3[] = [];
  private readonly movedTips: Vector3[] = [];
  private readonly strings: InstancedMesh;
  private readonly muscles: Mesh;
  private readonly motion: Contraction;
  private readonly matrix = new Matrix4();
  private readonly turn = new Quaternion();
  private readonly start = new Vector3();
  private readonly offset: Offset = [0, 0, 0];

  constructor(
    context: PartContext,
    valves: readonly ValvePart[],
    cavityOf: (valve: ValvePart) => Field,
    motion: Contraction,
  ) {
    this.motion = motion;
    const muscles = valves.flatMap((valve) => this.buildMuscles(valve, cavityOf(valve)));
    const merged = mergeParts(muscles);
    addMorphTargets(merged, [motion.squeeze, motion.emptying]);
    this.muscles = partMesh(context, merged, 'chordae', FINISHES.papillary);
    const cylinder = new CylinderGeometry(
      VALVE_DETAIL.chordRadiusMm,
      VALVE_DETAIL.chordRadiusMm,
      1,
      VALVE_DETAIL.chordSegments,
      1,
      true,
    );
    cylinder.translate(0, 0.5, 0);
    this.strings = new InstancedMesh(
      context.tracker.track(cylinder),
      context.materials.get('chordae', FINISHES.chorda),
      this.chords.length,
    );
    this.strings.frustumCulled = false;
    context.tracker.track(this.strings);
    this.object.add(this.muscles, this.strings);
    this.anchor = this.tips
      .reduce((sum, tip) => sum.add(tip), new Vector3())
      .divideScalar(this.tips.length);
    this.movedTips.push(...this.tips.map((tip) => tip.clone()));
    this.update(0, 0);
  }

  update(squeeze: number, emptying: number): void {
    const influences = this.muscles.morphTargetInfluences;
    if (influences) {
      influences[0] = squeeze;
      influences[1] = emptying;
    }
    this.tips.forEach((tip, index) => {
      displace(this.motion, [tip.x, tip.y, tip.z], squeeze, emptying, this.offset);
      this.movedTips[index].set(...this.offset);
    });
    this.chords.forEach((chord, index) => {
      chord.valve.edgePoint(chord.attachment, this.start);
      const end = this.movedTips[chord.tip];
      const span = end.clone().sub(this.start);
      const length = span.length();
      this.turn.setFromUnitVectors(UP, span.divideScalar(length || 1));
      this.matrix.compose(this.start, this.turn, new Vector3(1, length, 1));
      this.strings.setMatrixAt(index, this.matrix);
    });
    this.strings.instanceMatrix.needsUpdate = true;
  }

  private buildMuscles(valve: ValvePart, cavity: Field) {
    const [baseRadius, tipRadius] = VALVE_DETAIL.papillaryRadius;
    const first = this.tips.length;
    const geometries = valve.design.papillaries.map((papillary) => {
      const tip = new Vector3(...papillary.tip);
      const base = wallBase(
        cavity,
        papillary.tip,
        papillary.toward,
        VALVE_DETAIL.papillaryWallMm,
        VALVE_DETAIL.papillaryStepMm,
      );
      this.tips.push(tip);
      return taperedTube({
        points: spokes(base, tip, VALVE_DETAIL.papillaryRings),
        radius: (share) => baseRadius + (tipRadius - baseRadius) * share,
        radialSegments: VALVE_DETAIL.papillarySegments,
      });
    });
    for (const attachment of attachments(valve)) {
      const edge = valve.closedEdgePoint(attachment);
      let nearest = first;
      for (let tip = first; tip < this.tips.length; tip += 1) {
        if (this.tips[tip].distanceTo(edge) < this.tips[nearest].distanceTo(edge)) nearest = tip;
      }
      this.chords.push({ valve, attachment, tip: nearest });
    }
    return geometries;
  }
}
