import { Group } from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { PartId } from '../../../ids';
import { BODY_FINISHES } from '../../finishes';
import { bodyDetails } from '../../geometry/body/details';
import { bodyLines, rightDoorLines } from '../../geometry/body/lines';
import type { BodyRegion } from '../../geometry/body/regions';
import { buildShell } from '../../geometry/body/shell';
import { bodyStations } from '../../geometry/body/stations';
import { BodySurface } from '../../geometry/body/surface';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

type BodyFinish = keyof typeof BODY_FINISHES;

export interface BodyUnit {
  readonly object: Group;
  readonly label: Object3D;
  setCutaway(open: boolean): void;
  silhouetteParts(): BufferGeometry[];
}

interface CutawayPanel {
  mesh: Mesh;
  solid: Material;
}

const BODY_PART: PartId = 'body';

const REGION_FINISH: Readonly<Record<BodyRegion, BodyFinish>> = {
  paint: 'paint',
  roof: 'paint',
  doorRight: 'paint',
  doorLeft: 'paint',
  glass: 'glass',
  windowRight: 'glass',
  frame: 'frame',
  trim: 'trim',
  dark: 'under',
};

const OWN_MESH_REGIONS: readonly BodyRegion[] = ['roof', 'doorRight', 'doorLeft', 'windowRight'];
const CUTAWAY_REGIONS: ReadonlySet<BodyRegion> = new Set(['roof', 'doorRight', 'windowRight']);
const SHARED_FINISHES: readonly BodyFinish[] = [
  'paint',
  'glass',
  'frame',
  'trim',
  'under',
  'mirror',
  'lampFront',
  'lampRear',
];
const LABEL_SPOT = [1.25, 0.7, 0.86] as const;

function collect(
  shell: ReadonlyMap<BodyRegion, BufferGeometry>,
  extras: readonly ReadonlyMap<string, BufferGeometry[]>[],
): Map<BodyFinish, BufferGeometry[]> {
  const byFinish = new Map<BodyFinish, BufferGeometry[]>(SHARED_FINISHES.map((id) => [id, []]));
  shell.forEach((geometry, region) => {
    if (!OWN_MESH_REGIONS.includes(region)) byFinish.get(REGION_FINISH[region])?.push(geometry);
  });
  extras.forEach((parts) =>
    parts.forEach((geometries, finish) => byFinish.get(finish as BodyFinish)?.push(...geometries)),
  );
  return byFinish;
}

class Body implements BodyUnit {
  readonly object = new Group();
  readonly label: Object3D;
  private readonly cutaway: CutawayPanel[] = [];
  private readonly ghost: Material;
  private readonly doorTrim: Mesh;
  private readonly meshes: Mesh[] = [];
  private readonly context: PartContext;
  private open = false;

  constructor(context: PartContext) {
    this.context = context;
    const surface = new BodySurface();
    const shell = buildShell(bodyStations());
    this.ghost = context.materials.get(BODY_PART, BODY_FINISHES.ghost);
    collect(shell, [bodyDetails(surface), bodyLines(surface)]).forEach((parts, finish) => {
      if (parts.length > 0) this.add(mergeParts(parts), finish);
    });
    OWN_MESH_REGIONS.forEach((region) => {
      const geometry = shell.get(region);
      if (!geometry) return;
      const mesh = this.add(geometry, REGION_FINISH[region]);
      if (CUTAWAY_REGIONS.has(region))
        this.cutaway.push({ mesh, solid: mesh.material as Material });
    });
    this.doorTrim = this.add(mergeParts(rightDoorLines(surface)), 'frame');
    this.label = anchorAt(this.meshes[0], ...LABEL_SPOT);
  }

  setCutaway(open: boolean): void {
    if (open === this.open) return;
    this.open = open;
    this.cutaway.forEach(({ mesh, solid }) => (mesh.material = open ? this.ghost : solid));
    this.doorTrim.visible = !open;
  }

  silhouetteParts(): BufferGeometry[] {
    return this.meshes.map((mesh) => mesh.geometry.clone());
  }

  private add(geometry: BufferGeometry, finish: BodyFinish): Mesh {
    const mesh = partMesh(this.context, geometry, BODY_PART, BODY_FINISHES[finish]);
    this.object.add(mesh);
    this.meshes.push(mesh);
    return mesh;
  }
}

export function createBody(context: PartContext): BodyUnit {
  return new Body(context);
}
