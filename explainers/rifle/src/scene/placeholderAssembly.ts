import { BoxGeometry, CylinderGeometry, Group, Mesh, Object3D } from 'three';
import type { Box3, BufferGeometry } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import {
  BARREL,
  BOLT,
  BULLET_SEAT_X,
  CARRIER,
  CARTRIDGE,
  FREE_TRAVEL,
  GAS_BLOCK,
  GAS_TUBE,
  HAMMER,
  MAGAZINE,
  RECEIVER,
  RIFLE_EXTENT,
  STOCK,
} from '../model/layout';
import type { Box } from '../model/scale';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';

const QUARTER_TURN = Math.PI / 2;
const MAGAZINE_DEPTH = 120;
const HAMMER_LENGTH = 40;
const HAMMER_THICKNESS = 8;
const SCENE_MARGIN = 120;
const GAS_PORT_CENTRE_X = (GAS_BLOCK.x[0] + GAS_BLOCK.x[1]) / 2;

const REGIONS: Readonly<Record<RegionId, Box>> = {
  scene: {
    x: [RIFLE_EXTENT.x[0] - SCENE_MARGIN, RIFLE_EXTENT.x[1] + SCENE_MARGIN],
    y: [RIFLE_EXTENT.y[0] - SCENE_MARGIN, RIFLE_EXTENT.y[1] + SCENE_MARGIN],
    z: [-SCENE_MARGIN, SCENE_MARGIN],
  },
  rifle: RIFLE_EXTENT,
  receiver: RECEIVER,
  chamber: { x: [-20, 80], y: [-30, 40], z: [-20, 20] },
  barrel: { x: [0, BARREL.x[1]], y: [-30, 50], z: [-30, 30] },
  gasSystem: { x: [CARRIER.x[0], GAS_BLOCK.x[1]], y: [-20, 50], z: [-30, 30] },
  reloadBay: { x: [RECEIVER.x[0], 40], y: [-MAGAZINE_DEPTH, 40], z: [-30, 40] },
};

function boxGeometry(box: Box): BufferGeometry {
  const size = (extent: readonly [number, number]) => extent[1] - extent[0];
  const geometry = new BoxGeometry(size(box.x), size(box.y), size(box.z));
  geometry.translate(
    (box.x[0] + box.x[1]) / 2,
    (box.y[0] + box.y[1]) / 2,
    (box.z[0] + box.z[1]) / 2,
  );
  return geometry;
}

function tubeGeometry(x: readonly [number, number], radius: number, axisY: number): BufferGeometry {
  const length = x[1] - x[0];
  const geometry = new CylinderGeometry(radius, radius, length, 16);
  geometry.rotateZ(-QUARTER_TURN);
  geometry.translate((x[0] + x[1]) / 2, axisY, 0);
  return geometry;
}

export class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly anchors = new Map<PartId, Object3D>();
  private readonly namedAnchors = new Map<AnchorId, Object3D>();
  private readonly carrier = new Group();
  private readonly bolt = new Group();
  private readonly bullet: Mesh;
  private readonly hammer = new Group();

  private readonly resources: AssemblyResources;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    this.part('barrel', tubeGeometry(BARREL.x, BARREL.radius, BARREL.axisY), THEME.bluedSteel);
    this.part('receiver', boxGeometry(RECEIVER), THEME.bluedSteel);
    this.part('gasTube', tubeGeometry(GAS_TUBE.x, GAS_TUBE.radius, GAS_TUBE.axisY), THEME.steel);
    this.part('gasBlock', boxGeometry(GAS_BLOCK), THEME.bluedSteel);
    this.part('stock', boxGeometry(STOCK), THEME.wood);
    this.part(
      'magazine',
      boxGeometry({
        x: MAGAZINE.well.x,
        y: [MAGAZINE.well.y[0] - MAGAZINE_DEPTH, MAGAZINE.well.y[1]],
        z: MAGAZINE.well.z,
      }),
      THEME.bluedSteel,
    );
    this.carrier.add(this.part('carrier', boxGeometry(CARRIER), THEME.brightSteel));
    this.bolt.add(this.part('bolt', tubeGeometry(BOLT.x, BOLT.radius, 0), THEME.brightSteel));
    this.bullet = this.part(
      'bullet',
      tubeGeometry([0, CARTRIDGE.bulletLength], CARTRIDGE.bulletRadius, 0),
      THEME.copper,
    );
    const hammerBox: Box = {
      x: [-HAMMER_THICKNESS / 2, HAMMER_THICKNESS / 2],
      y: [0, HAMMER_LENGTH],
      z: [-6, 6],
    };
    this.hammer.add(this.part('hammer', boxGeometry(hammerBox), THEME.steel));
    this.hammer.position.set(...HAMMER.centre);
    this.root.add(this.carrier, this.bolt, this.bullet, this.hammer);
    this.nameAnchors();
    this.setState(state);
  }

  private part(id: PartId, geometry: BufferGeometry, color: string): Mesh {
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, this.resources.materials.get(id, { color }));
    this.anchors.set(id, mesh);
    this.root.add(mesh);
    return mesh;
  }

  private nameAnchors(): void {
    const at = (id: AnchorId, position: readonly [number, number, number]) => {
      const anchor = new Object3D();
      anchor.position.set(...position);
      this.root.add(anchor);
      this.namedAnchors.set(id, anchor);
    };
    at('muzzle', [BARREL.x[1], 0, 0]);
    at('chamber', [20, 0, 0]);
    at('gasBlock', [GAS_PORT_CENTRE_X, GAS_BLOCK.y[1], 0]);
    at('magazine', [MAGAZINE.well.x[0], MAGAZINE.well.y[0] - MAGAZINE_DEPTH / 2, 0]);
    at('ejectionPort', [-80, 10, RECEIVER.z[1]]);
    at('hammer', HAMMER.centre);
    this.namedAnchors.set('carrier', this.carrier);
    this.namedAnchors.set('bolt', this.bolt);
    this.namedAnchors.set('bullet', this.bullet);
  }

  setState(state: AssemblyState): void {
    const { shot, motion } = state;
    this.carrier.position.x = -motion.carrier;
    this.bolt.position.x = -Math.max(0, motion.carrier - FREE_TRAVEL);
    this.bolt.rotation.x = motion.bolt;
    this.hammer.rotation.z = motion.hammer;
    this.bullet.visible = shot.stage !== 'gone';
    this.bullet.position.x = BULLET_SEAT_X + shot.travel;
    this.bullet.rotation.x = shot.turns * 2 * Math.PI;
  }

  update(): boolean {
    return false;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.anchors;
  }

  anchor(id: AnchorId): Object3D {
    const anchor = this.namedAnchors.get(id);
    if (!anchor) throw new Error(`Unknown anchor ${id}`);
    return anchor;
  }

  region(id: RegionId): Box3 {
    return regionFromSpec(REGIONS[id] as RegionSpec);
  }

  dispose(): void {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.root.clear();
  }
}
