import { ExtrudeGeometry, Group, Mesh, Shape, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { GLIDERS } from '../../model';
import type { GliderType } from '../../model';
import { FINISHES } from '../finishes';
import { FUSELAGE, GLIDER_UNITS_PER_METRE, TAIL, WING } from '../constants';
import { latheAlongX, sampleProfile } from '../geometry/lathe';
import { wingPanel } from '../geometry/wing';
import type { WingPlan } from '../geometry/wing';
import { anchorAt, partMesh } from './context';
import type { PartContext } from './context';

export interface GliderAnchors {
  wing: Object3D;
  fuselage: Object3D;
  tail: Object3D;
}

export interface Attitude {
  heading: number;
  pitch: number;
  bank: number;
}

type Outline = readonly (readonly [number, number])[];

interface WingHalf {
  panel: Mesh;
  tip: Mesh;
}

interface WingGeometry {
  panel: BufferGeometry;
  tip: BufferGeometry;
}

const MIRROR = -1;
const CANOPY_CENTER = Math.PI * 1.5;
const ATTITUDE_ORDER = 'YZX';
const FUSELAGE_LABEL = { x: 1.6, side: 0.54 } as const;

function bodyGeometry(profile: readonly Vector2[]): BufferGeometry {
  const geometry = latheAlongX(profile, FUSELAGE.radialSegments);
  geometry.scale(1, FUSELAGE.heightScale * FUSELAGE.girth, FUSELAGE.girth);
  return geometry;
}

function canopyGeometry(profile: readonly Vector2[]): BufferGeometry {
  const glazed = profile
    .filter((point) => point.y >= FUSELAGE.canopyStart && point.y <= FUSELAGE.canopyEnd)
    .map((point) => point.clone().setX(point.x * FUSELAGE.canopyInflate));
  const geometry = latheAlongX(glazed, FUSELAGE.radialSegments, {
    start: CANOPY_CENTER - FUSELAGE.canopyArc / 2,
    length: FUSELAGE.canopyArc,
  });
  geometry.scale(1, FUSELAGE.heightScale * FUSELAGE.girth, FUSELAGE.girth);
  geometry.translate(0, FUSELAGE.canopyRaise, 0);
  return geometry;
}

function noseGeometry(profile: readonly Vector2[]): BufferGeometry {
  const nose = profile
    .filter((point) => point.y >= FUSELAGE.noseFrom)
    .map((point) => point.clone().setX(point.x * FUSELAGE.noseInflate));
  const geometry = latheAlongX(nose, FUSELAGE.radialSegments);
  geometry.scale(1, FUSELAGE.heightScale * FUSELAGE.girth, FUSELAGE.girth);
  return geometry;
}

function finGeometry(outline: Outline, thickness: number): BufferGeometry {
  const shape = new Shape(outline.map(([x, y]) => new Vector2(x, y)));
  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}

function stabilizerPlan(): WingPlan {
  return {
    rootChord: TAIL.stabilizerChord,
    tipChord: TAIL.stabilizerChord * WING.tipChordShare,
    thickness: TAIL.stabilizerThickness,
    halfSpan: TAIL.stabilizerSpan / 2,
  };
}

function wingPlan(type: GliderType): WingPlan {
  const { span, chord } = GLIDERS[type];
  return {
    rootChord: chord * WING.chordEmphasis * WING.rootChordShare,
    tipChord: chord * WING.chordEmphasis * WING.tipChordShare,
    thickness: WING.thickness,
    halfSpan: span / 2,
  };
}

function wingGeometry(type: GliderType): WingGeometry {
  const plan = wingPlan(type);
  return { panel: wingPanel(plan, 0, WING.tipShare), tip: wingPanel(plan, WING.tipShare, 1) };
}

function mirrored(mesh: Mesh): Group {
  const group = new Group();
  mesh.scale.z = MIRROR;
  group.add(mesh);
  return group;
}

export class GliderModel {
  readonly object = new Group();
  readonly anchors: GliderAnchors;
  private readonly body = new Group();
  private readonly halves: WingHalf[];
  private type: GliderType;

  constructor(context: PartContext, type: GliderType) {
    this.type = type;
    this.object.scale.setScalar(GLIDER_UNITS_PER_METRE);
    this.body.rotation.order = ATTITUDE_ORDER;
    this.object.add(this.body);
    const profile = sampleProfile(FUSELAGE.profile, FUSELAGE.profileSamples);
    this.body.add(
      partMesh(context, bodyGeometry(profile), 'fuselage', 'gelcoat'),
      partMesh(context, canopyGeometry(profile), 'fuselage', 'glass'),
      partMesh(context, noseGeometry(profile), 'fuselage', 'tip'),
    );
    this.buildTail(context);
    this.halves = this.buildWings(context, wingGeometry(type));
    this.anchors = {
      wing: anchorAt(this.body, WING.rootX, WING.rootY, this.wingLabelZ()),
      fuselage: anchorAt(this.body, FUSELAGE_LABEL.x, 0, -FUSELAGE_LABEL.side),
      tail: anchorAt(this.body, TAIL.stabilizerX, TAIL.stabilizerY, 0),
    };
  }

  setType(type: GliderType): void {
    if (type === this.type) return;
    this.type = type;
    const geometry = wingGeometry(type);
    this.replaceGeometry((half) => half.panel, geometry.panel);
    this.replaceGeometry((half) => half.tip, geometry.tip);
    this.anchors.wing.position.z = this.wingLabelZ();
  }

  setAttitude({ heading, pitch, bank }: Attitude): void {
    this.body.rotation.set(bank, -heading, pitch);
  }

  dispose(): void {
    this.halves.forEach((half) => {
      half.panel.geometry.dispose();
      half.tip.geometry.dispose();
    });
  }

  private wingLabelZ(): number {
    return (GLIDERS[this.type].span / 2) * WING.labelShare;
  }

  private replaceGeometry(select: (half: WingHalf) => Mesh, geometry: BufferGeometry): void {
    const previous = select(this.halves[0]).geometry;
    this.halves.forEach((half) => {
      select(half).geometry = geometry;
    });
    previous.dispose();
  }

  private buildTail(context: PartContext): void {
    const plan = stabilizerPlan();
    const stabilizer = wingPanel(plan, 0, 1);
    const right = partMesh(context, stabilizer, 'tail', 'gelcoat');
    const left = new Mesh(stabilizer, right.material);
    const stabilizerGroup = new Group();
    stabilizerGroup.position.set(TAIL.stabilizerX, TAIL.stabilizerY, 0);
    stabilizerGroup.add(right, mirrored(left));
    this.body.add(
      partMesh(context, finGeometry(TAIL.fin, TAIL.finThickness), 'tail', 'gelcoat'),
      partMesh(context, finGeometry(TAIL.finTip, TAIL.finTipThickness), 'tail', 'tip'),
      stabilizerGroup,
    );
  }

  private buildWings(context: PartContext, geometry: WingGeometry): WingHalf[] {
    const panelMaterial = context.materials.get('wing', FINISHES.gelcoat);
    const tipMaterial = context.materials.get('wing', FINISHES.tip);
    return [1, MIRROR].map((side) => {
      const half = {
        panel: new Mesh(geometry.panel, panelMaterial),
        tip: new Mesh(geometry.tip, tipMaterial),
      };
      const group = new Group();
      group.position.set(WING.rootX, WING.rootY, 0);
      group.rotation.x = -side * WING.dihedral;
      const holder = new Group();
      holder.scale.z = side;
      holder.add(half.panel, half.tip);
      group.add(holder);
      this.body.add(group);
      return half;
    });
  }
}
