import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { ANCHOR_POINTS, PART_SPANS, REGION_BOUNDS, partAnchorPoint } from '../model/layout';
import { AXIS_HEIGHT_M, PERSON_HEIGHT_M, PERSON_POSITION, xAt } from '../model/scale';
import { THEME } from '../theme';
import type { Assembly } from './assembly';

const PERSON_WIDTH_M = 0.5;
const BODY_PARTS: readonly Exclude<PartId, 'person'>[] = [
  'nacelle',
  'fanBlades',
  'compressor',
  'combustor',
  'hpTurbine',
  'lpTurbine',
  'coldNozzle',
  'hotNozzle',
];

function placed(id: AnchorId | PartId, point: readonly [number, number, number]): Object3D {
  const object = new Object3D();
  object.name = id;
  object.position.set(...point);
  return object;
}

function spanBox(id: Exclude<PartId, 'person'>, material: MeshStandardMaterial): Mesh {
  const { from, to, radius } = PART_SPANS[id];
  const mesh = new Mesh(new BoxGeometry(xAt(to) - xAt(from), radius * 2, radius * 2), material);
  mesh.position.set((xAt(from) + xAt(to)) / 2, AXIS_HEIGHT_M, 0);
  return mesh;
}

class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly anchors = new Map<AnchorId, Object3D>();
  private readonly parts = new Map<PartId, Object3D>();
  private readonly regions = new Map<RegionId, Box3>();
  private readonly material = new MeshStandardMaterial({ color: THEME.steel });
  private readonly person: Mesh;
  private readonly hotMarker: Object3D;
  private readonly coldMarker: Object3D;

  constructor() {
    BODY_PARTS.forEach((id) => this.root.add(spanBox(id, this.material)));
    this.person = new Mesh(
      new BoxGeometry(PERSON_WIDTH_M, PERSON_HEIGHT_M, PERSON_WIDTH_M),
      new MeshStandardMaterial({ color: THEME.person }),
    );
    this.person.position.set(PERSON_POSITION[0], PERSON_HEIGHT_M / 2, PERSON_POSITION[2]);
    this.root.add(this.person);
    ANCHOR_IDS.forEach((id) => {
      const anchor = placed(id, ANCHOR_POINTS[id]);
      this.anchors.set(id, anchor);
      this.root.add(anchor);
    });
    PART_IDS.forEach((id) => {
      const anchor = placed(id, partAnchorPoint(id));
      this.parts.set(id, anchor);
      this.root.add(anchor);
    });
    REGION_IDS.forEach((id) => {
      const { min, max } = REGION_BOUNDS[id];
      this.regions.set(id, new Box3(new Vector3(...min), new Vector3(...max)));
    });
    this.hotMarker = this.anchor('hotMarker');
    this.coldMarker = this.anchor('coldMarker');
  }

  setState(state: AssemblyState): void {
    this.person.visible = state.view.person;
    const x = xAt(state.reading.axialFraction);
    this.hotMarker.position.x = x;
    this.coldMarker.position.x = x;
  }

  update(): boolean {
    return false;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.parts;
  }

  anchor(id: AnchorId): Object3D {
    const anchor = this.anchors.get(id);
    if (!anchor) throw new Error(`Missing anchor ${id}`);
    return anchor;
  }

  region(id: RegionId): Box3 {
    const box = this.regions.get(id);
    if (!box) throw new Error(`Missing region ${id}`);
    return box;
  }

  dispose(): void {
    this.root.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    this.material.dispose();
  }
}

export function createPlaceholderAssembly(): Assembly {
  return new PlaceholderAssembly();
}
