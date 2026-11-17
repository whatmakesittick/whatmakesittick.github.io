import { Group, Mesh } from 'three';
import type { Box3, BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import { ANCHOR_IDS, ANCHOR_SCALE, ODORANT_IDS, PART_IDS, PART_SCALE, SCALE_IDS } from '../ids';
import type { AnchorId, AssemblyState, OdorantId, PartId, Point, RegionId, ScaleId } from '../ids';
import {
  AIRWAY,
  ANCHOR_POINTS,
  BITE_RADIUS_CM,
  CUT_PAPILLA,
  HARD_PALATE,
  LINEUP_Y,
  MUCUS,
  NASAL_CAVITY,
  NERVE_Y,
  NEURON_BOTTOM_Y,
  NOSTRILS,
  ODORANT_COLUMN_X,
  OLFACTORY_BULB,
  PAPILLA_SPACING_MM,
  RECEPTOR_GRID,
  RECEPTOR_PLANE_Y,
  REGION_SPECS,
  SMELL_PATCH,
  SOFT_PALATE,
  THROAT,
  TONGUE,
  TONGUE_BITE,
  TONGUE_PATCH,
  TONGUE_SURFACE_Y,
  puddleRadius,
  receptorCell,
  scoopRadius,
} from '../model/layout';
import { RECEPTOR_TYPES } from '../model/receptorCodes';
import { ODORANT_COLOURS, THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';
import { bitePose, spoonPose, tongueLiftCm } from './pose';
import type { BitePose, SpoonPose } from './pose';

const HALF = 0.5;
const THIN = 0.3;
const CUT_DEPTH_CM = 2;
const TONGUE_DEPTH_CM = 3;
const SPOON_SIZE: Point = [1.6, 0.3, 1];
const SMALL_PART = 1;
const SMALL_CUBE: Point = [SMALL_PART, SMALL_PART, SMALL_PART];
const ODORANT_SIZE = 2;
const NEURON_HALF = 1;
const PAPILLA_HEIGHT = 1.2;
const PAPILLA_STEPS = 2;
const PART_FINISH = { roughness: 0.6, metalness: 0.1 } as const;

const TONGUE_REST_Y = (TONGUE.hump[1] + TONGUE.root[1]) * HALF;

const DYNAMIC_PARTS = ['spoon', 'bite', 'tongue', 'melt', ...ODORANT_IDS] as const;

type DynamicPartId = (typeof DYNAMIC_PARTS)[number];
type StaticPartId = Exclude<PartId, DynamicPartId>;

function isStatic(id: PartId): id is StaticPartId {
  return !(DYNAMIC_PARTS as readonly PartId[]).includes(id);
}

function centred([x, y, z]: Point, [width, height, depth]: Point): RegionSpec {
  return {
    x: [x - width * HALF, x + width * HALF],
    y: [y - height * HALF, y + height * HALF],
    z: [z - depth * HALF, z + depth * HALF],
  };
}

function offset([x, y, z]: Point, [dx, dy, dz]: Point): Point {
  return [x + dx, y + dy, z + dz];
}

function cutHalf(x: readonly [number, number], y: readonly [number, number]): RegionSpec {
  return { x, y, z: [-CUT_DEPTH_CM, 0] };
}

const FIRST_CELL = receptorCell(0);
const LAST_CELL = receptorCell(RECEPTOR_TYPES - 1);
const CELL_HALF = RECEPTOR_GRID.spacing * HALF;
const GRID_X = [FIRST_CELL[0] - CELL_HALF, LAST_CELL[0] + CELL_HALF] as const;
const GRID_Z = [FIRST_CELL[2] - CELL_HALF, LAST_CELL[2] + CELL_HALF] as const;

const SCOOP_SPOTS = {
  iceCrystal: [-3, 0, 3],
  fatDroplet: [3, -2, -3],
  airBubble: [0, 3, 4],
  aromaCloud: [5, 7, 0],
} as const satisfies Record<string, Point>;

const STATIC_BOXES: Readonly<Record<StaticPartId, RegionSpec>> = {
  palate: cutHalf([SOFT_PALATE.back[0], HARD_PALATE.x[1]], [HARD_PALATE.y - THIN, HARD_PALATE.y]),
  airway: cutHalf(
    [AIRWAY.bottom[0] - THIN, AIRWAY.bottom[0] + THIN],
    [AIRWAY.bottom[1], AIRWAY.top[1]],
  ),
  throat: cutHalf([THROAT.bottom[0], THROAT.top[0]], [THROAT.bottom[1], THROAT.top[1]]),
  nostrils: centred(NOSTRILS, SMALL_CUBE),
  nasalCavity: cutHalf(NASAL_CAVITY.x, NASAL_CAVITY.y),
  smellPatch: centred(SMELL_PATCH.centre, [SMELL_PATCH.width, THIN, SMALL_PART]),
  olfactoryBulb: centred(OLFACTORY_BULB, SMALL_CUBE),
  papilla: centred(
    [
      PAPILLA_STEPS * PAPILLA_SPACING_MM,
      PAPILLA_HEIGHT * HALF,
      -PAPILLA_STEPS * PAPILLA_SPACING_MM,
    ],
    [SMALL_PART, PAPILLA_HEIGHT, SMALL_PART],
  ),
  tasteBud: centred(CUT_PAPILLA.centre, [
    CUT_PAPILLA.magnify,
    CUT_PAPILLA.magnify,
    CUT_PAPILLA.magnify,
  ]),
  nerve: { x: TONGUE_PATCH.x, y: [NERVE_Y - THIN, NERVE_Y + THIN], z: [-THIN, THIN] },
  iceCrystal: centred(offset(TONGUE_BITE.centre, SCOOP_SPOTS.iceCrystal), SMALL_CUBE),
  fatDroplet: centred(offset(TONGUE_BITE.centre, SCOOP_SPOTS.fatDroplet), SMALL_CUBE),
  airBubble: centred(offset(TONGUE_BITE.centre, SCOOP_SPOTS.airBubble), SMALL_CUBE),
  aromaCloud: centred(offset(TONGUE_BITE.centre, SCOOP_SPOTS.aromaCloud), SMALL_CUBE),
  receptors: { x: GRID_X, y: [RECEPTOR_PLANE_Y - THIN, RECEPTOR_PLANE_Y], z: GRID_Z },
  mucus: { x: GRID_X, y: MUCUS.y, z: GRID_Z },
  neuron: {
    x: [-NEURON_HALF, NEURON_HALF],
    y: [NEURON_BOTTOM_Y, RECEPTOR_PLANE_Y - THIN],
    z: [-NEURON_HALF, NEURON_HALF],
  },
};

const UNIT_BOX: RegionSpec = { x: [-HALF, HALF], y: [-HALF, HALF], z: [-HALF, HALF] };

const PART_COLOURS: Readonly<Record<PartId, string>> = {
  spoon: THEME.metalLight,
  bite: THEME.iceCream,
  tongue: THEME.innerMouth,
  palate: THEME.palate,
  airway: THEME.cavityAir,
  throat: THEME.innerMouth,
  nostrils: THEME.skin,
  nasalCavity: THEME.cavityAir,
  smellPatch: THEME.firing,
  olfactoryBulb: THEME.firing,
  papilla: THEME.innerMouth,
  tasteBud: THEME.sweetGlow,
  nerve: THEME.coldGlow,
  melt: THEME.iceCream,
  iceCrystal: THEME.ice,
  fatDroplet: THEME.fat,
  airBubble: THEME.ice,
  aromaCloud: THEME.cherry,
  ...ODORANT_COLOURS,
  receptors: THEME.firing,
  neuron: THEME.cream,
  mucus: THEME.ice,
};

function specBox({ x, y, z }: RegionSpec): BufferGeometry {
  return box({ minX: x[0], maxX: x[1], minY: y[0], maxY: y[1], minZ: z[0], maxZ: z[1] });
}

class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly roots: Record<ScaleId, Group> = {
    head: new Group(),
    tongue: new Group(),
    molecules: new Group(),
  };
  private readonly labels = new Map<PartId, Object3D>();
  private readonly anchors = new Map<AnchorId, Object3D>();
  private readonly geometries: BufferGeometry[] = [];
  private readonly meshes = new Map<PartId, Mesh>();
  private readonly scoop: Mesh;
  private readonly spoon: SpoonPose = { position: [0, 0, 0], tilt: 0, visible: true };
  private readonly bite: BitePose = { position: [0, 0, 0], scale: 1, visible: true };
  private readonly resources: AssemblyResources;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    SCALE_IDS.forEach((scale) => this.root.add(this.roots[scale]));
    const unit = this.track(specBox(UNIT_BOX));
    PART_IDS.forEach((id) => {
      const geometry = isStatic(id) ? this.track(specBox(STATIC_BOXES[id])) : unit;
      this.addPart(id, geometry);
    });
    this.scoop = this.addMesh('bite', unit, THEME.iceCream, this.roots.tongue);
    this.placeFixedParts();
    ANCHOR_IDS.forEach((id) =>
      this.anchors.set(
        id,
        id === 'bite'
          ? this.part('bite')
          : anchorAt(this.roots[ANCHOR_SCALE[id]], ...ANCHOR_POINTS[id]),
      ),
    );
    this.setState(state);
  }

  private track(geometry: BufferGeometry): BufferGeometry {
    this.geometries.push(geometry);
    return geometry;
  }

  private addMesh(group: string, geometry: BufferGeometry, color: string, parent: Object3D): Mesh {
    const mesh = new Mesh(geometry, this.resources.materials.get(group, { color, ...PART_FINISH }));
    parent.add(mesh);
    return mesh;
  }

  private part(id: PartId): Mesh {
    const mesh = this.meshes.get(id);
    if (!mesh) throw new Error(`Missing part ${id}`);
    return mesh;
  }

  private addPart(id: PartId, geometry: BufferGeometry): void {
    const mesh = this.addMesh(id, geometry, PART_COLOURS[id], this.roots[PART_SCALE[id]]);
    this.meshes.set(id, mesh);
    this.labels.set(id, mesh);
  }

  private placeFixedParts(): void {
    const tongue = this.part('tongue');
    tongue.scale.set(
      TONGUE.tip[0] - TONGUE.root[0],
      TONGUE.hump[1] - TONGUE.root[1],
      TONGUE_DEPTH_CM,
    );
    tongue.position.set(
      (TONGUE.tip[0] + TONGUE.root[0]) * HALF,
      TONGUE_REST_Y,
      -TONGUE_DEPTH_CM * HALF,
    );
    this.part('spoon').scale.set(...SPOON_SIZE);
    ODORANT_IDS.forEach((id) => {
      const mesh = this.part(id);
      mesh.position.set(ODORANT_COLUMN_X[id], LINEUP_Y, 0);
      mesh.scale.setScalar(ODORANT_SIZE);
    });
  }

  private placeHead(seconds: number, melt: number): void {
    spoonPose(seconds, this.spoon);
    const spoon = this.part('spoon');
    spoon.position.set(...this.spoon.position);
    spoon.rotation.z = this.spoon.tilt;
    spoon.visible = this.spoon.visible;
    bitePose(seconds, melt, this.bite);
    const bite = this.part('bite');
    bite.position.set(...this.bite.position);
    bite.scale.setScalar(BITE_RADIUS_CM * 2 * this.bite.scale);
    bite.visible = this.bite.visible;
    this.part('tongue').position.y = TONGUE_REST_Y + tongueLiftCm(seconds);
  }

  private placeTongue(melt: number): void {
    const scoop = scoopRadius(melt) * 2;
    this.scoop.position.set(...TONGUE_BITE.centre);
    this.scoop.scale.setScalar(scoop);
    const puddle = this.part('melt');
    const width = puddleRadius(melt) * 2;
    puddle.position.set(TONGUE_BITE.centre[0], TONGUE_SURFACE_Y, TONGUE_BITE.centre[2]);
    puddle.scale.set(width, THIN, width);
    puddle.visible = melt > 0;
  }

  private placeCopies(copies: Readonly<Record<OdorantId, number>>): void {
    ODORANT_IDS.forEach((id) => {
      this.part(id).visible = copies[id] > 0;
    });
  }

  setState(state: AssemblyState): void {
    SCALE_IDS.forEach((scale) => (this.roots[scale].visible = state.scale === scale));
    const { seconds, melt } = state.reading;
    this.placeHead(seconds, melt);
    this.placeTongue(melt);
    this.placeCopies(state.copies);
  }

  update(): boolean {
    return false;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    const found = this.anchors.get(id);
    if (!found) throw new Error(`Missing anchor ${id}`);
    return found;
  }

  region(id: RegionId): Box3 {
    return regionFromSpec(REGION_SPECS[id]);
  }

  dispose(): void {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.root.removeFromParent();
  }
}

export function createPlaceholderAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Assembly {
  return new PlaceholderAssembly(resources, state);
}
