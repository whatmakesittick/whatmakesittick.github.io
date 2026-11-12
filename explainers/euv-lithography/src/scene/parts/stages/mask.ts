import { MeshStandardMaterial, PlaneGeometry } from 'three';
import type { Object3D } from 'three';
import { MASK } from '../../../model/layout';
import { mesh, registeredMaterial, registeredMesh } from '../context';
import type { PartContext } from '../context';
import { Bin, rod, slab } from '../optics/geo';
import {
  MASK_AT,
  PATTERN_GAP,
  PELLICLE,
  PELLICLE_Y,
  PLATE_BOTTOM,
  PLATE_HALF,
  PLATE_TOP,
} from './dims';
import { maskPatternTexture } from './textures';

const PLATE_RADIUS = 0.002;
const SIDES = [-1, 1] as const;
const MEMBRANE_SLACK = 0.004;
const PATTERN_ROUGHNESS = 0.3;
const PATTERN_METALNESS = 0.25;
const PATTERN_GLOW = 0.9;
const POST_SIDES = 6;

export function buildMask(context: PartContext, carriage: Object3D): void {
  const [x, , z] = MASK_AT;
  const plate = mesh(
    context,
    slab(
      [x - PLATE_HALF, PLATE_BOTTOM, z - PLATE_HALF],
      [x + PLATE_HALF, PLATE_TOP, z + PLATE_HALF],
      PLATE_RADIUS,
    ),
    'mask',
    'maskPlate',
  );
  const texture = maskPatternTexture(context);
  const material = registeredMaterial(
    context,
    'mask',
    new MeshStandardMaterial({
      color: '#ffffff',
      roughness: PATTERN_ROUGHNESS,
      metalness: PATTERN_METALNESS,
      map: texture,
      emissive: '#ffffff',
      emissiveMap: texture,
      emissiveIntensity: PATTERN_GLOW,
    }),
  );
  const pattern = registeredMesh(
    context,
    new PlaneGeometry(MASK.patternM.height, MASK.patternM.width)
      .rotateX(Math.PI / 2)
      .translate(x, PLATE_BOTTOM - PATTERN_GAP, z),
    'mask',
    material,
  );
  carriage.add(plate, pattern);
}

export function buildPellicle(context: PartContext, carriage: Object3D): void {
  const [x, , z] = MASK_AT;
  const { x: width, z: depth, bar, tall, post } = PELLICLE;
  const bin = new Bin();
  SIDES.forEach((side) => {
    const zAt = z + side * (depth / 2 - bar / 2);
    const xAt = x + side * (width / 2 - bar / 2);
    bin.add(
      'frame',
      slab(
        [x - width / 2, PELLICLE_Y - tall / 2, zAt - bar / 2],
        [x + width / 2, PELLICLE_Y + tall / 2, zAt + bar / 2],
      ),
      slab(
        [xAt - bar / 2, PELLICLE_Y - tall / 2, z - depth / 2 + bar],
        [xAt + bar / 2, PELLICLE_Y + tall / 2, z + depth / 2 - bar],
      ),
    );
    SIDES.forEach((other) => {
      const px = x + side * (width / 2 - bar / 2);
      const pz = z + other * (depth / 2 - bar / 2);
      bin.add(
        'flange',
        rod([px, PELLICLE_Y + tall / 2, pz], [px, PLATE_BOTTOM, pz], post, post, POST_SIDES),
      );
    });
  });
  bin.build(context, 'pellicle', carriage);
  const film = mesh(
    context,
    new PlaneGeometry(width - bar * 2 + MEMBRANE_SLACK, depth - bar * 2 + MEMBRANE_SLACK)
      .rotateX(Math.PI / 2)
      .translate(x, PELLICLE_Y, z),
    'pellicle',
    'membrane',
  );
  carriage.add(film);
}
