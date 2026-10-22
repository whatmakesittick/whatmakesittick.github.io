import type { InstancedMesh } from 'three';
import { instancesOf } from '../../context';
import type { PartContext } from '../../context';
import { DECAL_LAYER, groundQuad, overlayMaterial } from '../overlay';
import { SHADOW_SLOPE } from '../shadow';
import { HOUSE_DESIGNS } from './houseGeometry';
import { placement } from './instances';
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
const CONE_SHADOW_SHARE = 0.8;
const SLOPE = Math.hypot(...SHADOW_SLOPE);
const DIRECTION = [SHADOW_SLOPE[0] / SLOPE, SHADOW_SLOPE[1] / SLOPE] as const;
const HEADING = Math.atan2(DIRECTION[0], DIRECTION[1]);

export function boxCaster(
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

export function shadowCentre(caster: ShadowCaster): [number, number] {
  return [caster.x + caster.height * SHADOW_SLOPE[0], caster.z + caster.height * SHADOW_SLOPE[1]];
}

export function shadowDecals(
  context: PartContext,
  casters: readonly ShadowCaster[],
  name: string,
): InstancedMesh {
  const material = overlayMaterial(context, {
    color: SHADOW_DECAL.colour,
    map: context.textures.shadow,
    opacity: SHADOW_DECAL.opacity,
    ...DECAL_LAYER,
  });
  const { lift, spread } = SHADOW_DECAL;
  const matrices = casters.map((caster) => {
    const [x, z] = shadowCentre(caster);
    return placement([x, lift, z], HEADING, [caster.across * spread, 1, caster.along * spread]);
  });
  const mesh = instancesOf(context, groundQuad(), material, matrices);
  mesh.name = name;
  mesh.renderOrder = 1;
  return mesh;
}
