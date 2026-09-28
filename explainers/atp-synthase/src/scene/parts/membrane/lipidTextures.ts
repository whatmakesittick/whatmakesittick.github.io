import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { ColorSpace, Wrapping } from 'three';
import { MEMBRANE, spanLength } from '../../../model/scale';
import { MEMBRANE_FORM } from '../../constants';
import { edgeField, faceField, normalPixels, tintPixels } from '../../geometry/lipidField';
import type { Field } from '../../geometry/lipidField';
import { seededRandom } from '../../geometry/random';
import type { Random } from '../../geometry/random';

export interface LipidSurface {
  readonly map: DataTexture;
  readonly normalMap: DataTexture;
}

const HALF = 0.5;

function dataTexture(
  pixels: Uint8Array,
  size: number,
  colorSpace: ColorSpace,
  wrapT: Wrapping,
): DataTexture {
  const texture = new DataTexture(pixels, size, size, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = wrapT;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = colorSpace;
  texture.needsUpdate = true;
  return texture;
}

function surface(field: Field, wrapT: Wrapping): LipidSurface {
  const size = field.width;
  return {
    map: dataTexture(tintPixels(field), size, SRGBColorSpace, wrapT),
    normalMap: dataTexture(
      normalPixels(field, MEMBRANE_FORM.normalStrength),
      size,
      NoColorSpace,
      wrapT,
    ),
  };
}

function faceSurface(random: Random): LipidSurface {
  const field = faceField(
    {
      size: MEMBRANE_FORM.textureSize,
      headsPerSide: MEMBRANE_FORM.faceHeadsPerTile,
      radiusShare: MEMBRANE_FORM.headRadiusShare,
      radiusVariation: MEMBRANE_FORM.headRadiusVariation,
      jitterShare: MEMBRANE_FORM.headJitterShare,
    },
    random,
  );
  return surface(field, RepeatWrapping);
}

function edgeSurface(random: Random): LipidSurface {
  const field = edgeField(
    {
      size: MEMBRANE_FORM.textureSize,
      headsPerTile: MEMBRANE_FORM.edgeHeadsPerTile,
      thicknessNm: spanLength(MEMBRANE.bilayer),
      coreNm: MEMBRANE.core[1],
      radiusShare: MEMBRANE_FORM.headRadiusShare,
      jitterShare: MEMBRANE_FORM.headJitterShare * HALF,
      tailOffsetNm: MEMBRANE_FORM.tailOffsetNm,
      tailWidthNm: MEMBRANE_FORM.tailWidthNm,
      tailWaveNm: MEMBRANE_FORM.tailWaveNm,
      tailWaveLengthNm: MEMBRANE_FORM.tailWaveLengthNm,
      tailGapNm: MEMBRANE_FORM.tailGapNm,
    },
    random,
  );
  return surface(field, ClampToEdgeWrapping);
}

export function lipidSurfaces(): { face: LipidSurface; edge: LipidSurface } {
  const random = seededRandom(MEMBRANE_FORM.seed);
  return { face: faceSurface(random), edge: edgeSurface(random) };
}
