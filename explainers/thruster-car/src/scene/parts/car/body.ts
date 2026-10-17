import { Group } from 'three';
import type { BufferGeometry, Material, Mesh, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { PartId } from '../../../ids';
import { BODY_FINISHES } from '../../finishes';
import type { CarSwatch } from '../../finishes';
import { bodyDetails } from '../../geometry/body/details';
import { bodyLines, rightDoorLines } from '../../geometry/body/lines';
import type { BodyRegion } from '../../geometry/body/regions';
import { buildShell } from '../../geometry/body/shell';
import { bodyStations } from '../../geometry/body/stations';
import { BodySurface } from '../../geometry/body/surface';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import type { CarLook } from './look';

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

type RegionLook = CarSwatch | 'glass';

const BODY_PART: PartId = 'body';

const REGION_LOOK: Readonly<Record<BodyRegion, RegionLook>> = {
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

const CUTAWAY_REGIONS: readonly BodyRegion[] = ['roof', 'doorRight', 'windowRight'];
const LABEL_SPOT = [1.25, 0.7, 0.86] as const;

class Body implements BodyUnit {
  readonly object = new Group();
  readonly label: Object3D;
  private readonly context: PartContext;
  private readonly look: CarLook;
  private readonly ghost: Material;
  private readonly cutaway: CutawayPanel[] = [];
  private readonly meshes: Mesh[] = [];
  private open = false;

  constructor(context: PartContext, look: CarLook) {
    this.context = context;
    this.look = look;
    this.ghost = context.materials.get(BODY_PART, BODY_FINISHES.ghost);
    const surface = new BodySurface();
    const shell = buildShell(bodyStations());
    const painted = this.add(mergeParts(this.staticParts(shell, surface)), look.finish);
    this.add(mergeParts(this.regions(shell, ['glass'])), BODY_FINISHES.glass);
    CUTAWAY_REGIONS.forEach((region) => this.addPanel(shell, region, surface));
    this.label = anchorAt(painted, ...LABEL_SPOT);
  }

  setCutaway(open: boolean): void {
    if (open === this.open) return;
    this.open = open;
    for (let index = 0; index < this.cutaway.length; index += 1) {
      const panel = this.cutaway[index];
      panel.mesh.material = open ? this.ghost : panel.solid;
    }
  }

  silhouetteParts(): BufferGeometry[] {
    return this.meshes.map((mesh) => mesh.geometry.clone());
  }

  private staticParts(
    shell: ReadonlyMap<BodyRegion, BufferGeometry>,
    surface: BodySurface,
  ): BufferGeometry[] {
    const { palette } = this.look;
    const fixed = [...shell].filter(
      ([region]) => !CUTAWAY_REGIONS.includes(region) && REGION_LOOK[region] !== 'glass',
    );
    const extras = [...bodyDetails(surface), ...bodyLines(surface)];
    return [
      ...fixed.map(([region, geometry]) =>
        palette.paint(geometry, REGION_LOOK[region] as CarSwatch),
      ),
      ...extras.flatMap(([swatch, parts]) => parts.map((part) => palette.paint(part, swatch))),
    ];
  }

  private regions(
    shell: ReadonlyMap<BodyRegion, BufferGeometry>,
    regions: readonly BodyRegion[],
  ): BufferGeometry[] {
    return regions.flatMap((region) => shell.get(region) ?? []);
  }

  private addPanel(
    shell: ReadonlyMap<BodyRegion, BufferGeometry>,
    region: BodyRegion,
    surface: BodySurface,
  ): void {
    const geometry = shell.get(region);
    if (!geometry) return;
    const look = REGION_LOOK[region];
    const mesh =
      look === 'glass'
        ? this.add(geometry, BODY_FINISHES.glass)
        : this.add(mergeParts(this.panelParts(geometry, look, region, surface)), this.look.finish);
    this.cutaway.push({ mesh, solid: mesh.material as Material });
  }

  private panelParts(
    geometry: BufferGeometry,
    look: CarSwatch,
    region: BodyRegion,
    surface: BodySurface,
  ): BufferGeometry[] {
    const { palette } = this.look;
    const trim = region === 'doorRight' ? rightDoorLines(surface) : [];
    return [palette.paint(geometry, look), ...trim.map((part) => palette.paint(part, 'frame'))];
  }

  private add(geometry: BufferGeometry, finish: MaterialFinish): Mesh {
    const mesh = partMesh(this.context, geometry, BODY_PART, finish);
    this.object.add(mesh);
    this.meshes.push(mesh);
    return mesh;
  }
}

export function createBody(context: PartContext, look: CarLook): BodyUnit {
  return new Body(context, look);
}
