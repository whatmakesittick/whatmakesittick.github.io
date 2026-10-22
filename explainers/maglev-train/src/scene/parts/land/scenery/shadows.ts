import {
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { LINE_GROUP, registeredMaterial } from '../../context';
import type { PartContext } from '../../context';
import { SHADOW_SLOPE } from '../shadow';
import { HOUSE_DESIGNS } from './houseGeometry';
import { TREE_SHAPES } from './treeGeometry';
import type { TreeSpot } from './treePlacement';
import type { HouseSpot } from './villagePlacement';

export interface ShadowCaster {
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly along: number;
  readonly across: number;
}

const SHADOW_DECAL = { opacity: 0.62, lift: 0.08, colour: '#1d2430', spread: 1.2 } as const;
const QUARTER_TURN = Math.PI / 2;
const CONE_SHADOW_SHARE = 0.8;
const SLOPE = Math.hypot(...SHADOW_SLOPE);
const DIRECTION = [SHADOW_SLOPE[0] / SLOPE, SHADOW_SLOPE[1] / SLOPE] as const;
const HEADING = Math.atan2(DIRECTION[0], DIRECTION[1]);

function boxCaster(
  x: number,
  z: number,
  length: number,
  depth: number,
  height: number,
): ShadowCaster {
  const [ux, uz] = DIRECTION;
  return {
    x,
    z,
    height: height / 2,
    along: height * SLOPE + length * Math.abs(ux) + depth * Math.abs(uz),
    across: length * Math.abs(uz) + depth * Math.abs(ux),
  };
}

function blobCaster(
  x: number,
  z: number,
  [a, b]: readonly [number, number],
  centre: number,
): ShadowCaster {
  return { x, z, height: centre, along: 2 * Math.hypot(a, b * SLOPE), across: 2 * a };
}

export function treeCaster(spot: TreeSpot, heightScale: number): ShadowCaster {
  if (spot.kind === 'conifer') {
    const { radius, base, height } = TREE_SHAPES.conifer.crown;
    const reach = (base + height) * heightScale;
    return {
      x: spot.x,
      z: spot.z,
      height: reach / 2,
      along: reach * SLOPE * CONE_SHADOW_SHARE,
      across: 2 * radius * spot.scale,
    };
  }
  const { radius, centre } = TREE_SHAPES[spot.kind].crown;
  return blobCaster(
    spot.x,
    spot.z,
    [radius[0] * spot.scale, radius[1] * heightScale],
    centre * heightScale,
  );
}

export function houseCaster(spot: HouseSpot): ShadowCaster {
  const design = HOUSE_DESIGNS[spot.kind];
  return boxCaster(spot.x, spot.z, spot.length, spot.depth, spot.height + design.rise / 2);
}

export function tunnelCaster(
  x: number,
  z: number,
  width: number,
  length: number,
  height: number,
): ShadowCaster {
  return boxCaster(x, z, width, length, height);
}

export function shadowCentre(caster: ShadowCaster): [number, number] {
  return [caster.x + caster.height * SHADOW_SLOPE[0], caster.z + caster.height * SHADOW_SLOPE[1]];
}

function decalGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(1, 1);
  geometry.rotateX(-QUARTER_TURN);
  return geometry;
}

function decalMaterial(context: PartContext): MeshBasicMaterial {
  return registeredMaterial(
    context,
    LINE_GROUP,
    new MeshBasicMaterial({
      color: SHADOW_DECAL.colour,
      map: context.textures.shadow,
      transparent: true,
      opacity: SHADOW_DECAL.opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
  );
}

export function shadowDecals(
  context: PartContext,
  casters: readonly ShadowCaster[],
  name: string,
): InstancedMesh {
  const mesh = context.tracker.track(
    new InstancedMesh(
      context.tracker.track(decalGeometry()),
      decalMaterial(context),
      Math.max(1, casters.length),
    ),
  );
  mesh.name = name;
  mesh.count = casters.length;
  const matrix = new Matrix4();
  const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), HEADING);
  const position = new Vector3();
  const scale = new Vector3();
  casters.forEach((caster, index) => {
    const [x, z] = shadowCentre(caster);
    position.set(x, SHADOW_DECAL.lift, z);
    scale.set(caster.across * SHADOW_DECAL.spread, 1, caster.along * SHADOW_DECAL.spread);
    mesh.setMatrixAt(index, matrix.compose(position, turn, scale));
  });
  mesh.renderOrder = 1;
  mesh.computeBoundingSphere();
  return mesh;
}
