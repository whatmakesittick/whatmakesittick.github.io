import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  PlaneGeometry,
  PointLight,
  Quaternion,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { toRadians } from '@core/math';
import { NOZZLE_EXIT } from '../../../model';
import type { PlumeShape } from '../../../model';
import { THEME } from '../../../theme';
import { PLUME } from '../../constants';
import { registered } from '../context';
import type { PartContext } from '../context';
import { DIAMOND_FRAGMENT, DIAMOND_VERTEX, PLUME_FRAGMENT, PLUME_VERTEX } from './shaders';

const TRANSLUCENT = 0.99;
const EXIT_SHARE = 0.95;
const START_INSET = 3;
const SEA_LEVEL_PA = 101325;
const LIGHT_DECAY = 2;
const DIAMOND_LABEL_STRENGTH = 0.05;

export type PlumeUniforms = {
  uLength: { value: number };
  uExitRadius: { value: number };
  uSpread: { value: number };
  uWaist: { value: number };
  uSpacing: { value: number };
  uGrowth: { value: number };
  uTime: { value: number };
  uBrightness: { value: number };
  uAir: { value: number };
  uOpacity: { value: number };
  uFirst: { value: number };
  uCore: { value: Color };
  uSheath: { value: Color };
  uFlame: { value: Color };
};

export function plumeUniforms(): PlumeUniforms {
  return {
    uLength: { value: PLUME.minLength },
    uExitRadius: { value: NOZZLE_EXIT.radius * EXIT_SHARE },
    uSpread: { value: 0 },
    uWaist: { value: 1 },
    uSpacing: { value: 1 },
    uGrowth: { value: PLUME.growth },
    uTime: { value: 0 },
    uBrightness: { value: 0 },
    uAir: { value: 1 },
    uOpacity: { value: 1 },
    uFirst: { value: PLUME.firstDiamond },
    uCore: { value: new Color(THEME.flameCore) },
    uSheath: { value: new Color(THEME.plume) },
    uFlame: { value: new Color(THEME.flame) },
  };
}

export function applyShape(uniforms: PlumeUniforms, shape: PlumeShape, airPa: number): void {
  uniforms.uLength.value = Math.max(PLUME.minLength, shape.length);
  uniforms.uSpread.value = Math.tan(toRadians(shape.spreadDeg));
  uniforms.uWaist.value = shape.waist;
  uniforms.uSpacing.value = shape.diamondSpacing;
  uniforms.uBrightness.value = shape.brightness;
  uniforms.uAir.value = Math.min(1, airPa / SEA_LEVEL_PA);
}

export function plumeGeometry(
  radial: number = PLUME.radialSegments,
  length: number = PLUME.lengthSegments,
): CylinderGeometry {
  const geometry = new CylinderGeometry(1, 1, 1, radial, length, true);
  geometry.translate(0, -0.5, 0);
  return geometry;
}

function additive(material: ShaderMaterial | SpriteMaterial): void {
  material.blending = AdditiveBlending;
  material.forceSinglePass = true;
  material.transparent = true;
  material.depthWrite = false;
  material.opacity = TRANSLUCENT;
}

export function diamondCentre(shape: PlumeShape, index: number): number {
  return shape.diamondSpacing * (index + PLUME.firstDiamond);
}

export class PlumePart {
  readonly object = new Group();
  readonly material: ShaderMaterial;
  readonly uniforms = plumeUniforms();
  readonly light: PointLight;
  readonly labelHost = new Group();
  readonly diamondHost = new Group();
  private readonly plume: Mesh;
  private readonly glow: Sprite;
  private readonly diamonds: InstancedMesh;
  private readonly diamondMaterial: ShaderMaterial;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly strength = new Color();

  constructor(context: PartContext) {
    this.object.position.y = NOZZLE_EXIT.y + START_INSET;
    this.material = registered(
      context,
      'plume',
      new ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: PLUME_VERTEX,
        fragmentShader: PLUME_FRAGMENT,
        side: DoubleSide,
      }),
    );
    additive(this.material);
    this.plume = new Mesh(context.tracker.track(plumeGeometry()), this.material);
    this.plume.frustumCulled = false;
    this.plume.renderOrder = 2;
    const glowMaterial = registered(
      context,
      'plume',
      new SpriteMaterial({ map: context.textures.glow, color: THEME.flame }),
    );
    additive(glowMaterial);
    this.glow = new Sprite(glowMaterial);
    this.glow.renderOrder = 3;
    this.diamondMaterial = registered(
      context,
      'shockDiamonds',
      new ShaderMaterial({
        uniforms: { uTime: this.uniforms.uTime, uColour: { value: new Color(THEME.diamond) } },
        vertexShader: DIAMOND_VERTEX,
        fragmentShader: DIAMOND_FRAGMENT,
      }),
    );
    additive(this.diamondMaterial);
    this.diamonds = new InstancedMesh(
      context.tracker.track(new PlaneGeometry(1, 1)),
      this.diamondMaterial,
      PLUME.maxDiamonds,
    );
    this.diamonds.frustumCulled = false;
    this.diamonds.renderOrder = 3;
    this.diamonds.setColorAt(0, this.strength);
    this.light = new PointLight(THEME.flame, 0, 0, LIGHT_DECAY);
    this.light.position.y = -PLUME.lightOffset;
    this.object.add(this.plume, this.glow, this.diamonds, this.light, this.labelHost);
    this.labelHost.add(this.diamondHost);
  }

  setShape(shape: PlumeShape, airPa: number, shown: boolean, crowded: boolean): void {
    applyShape(this.uniforms, shape, airPa);
    this.uniforms.uOpacity.value = crowded ? PLUME.clusterShare : 1;
    const lit = shown && shape.brightness > 0;
    this.plume.visible = lit;
    this.labelHost.visible = lit;
    this.glow.visible = lit;
    this.glow.scale.setScalar(PLUME.exitGlowSize * (0.4 + 0.6 * shape.brightness));
    this.light.intensity = lit ? PLUME.lightIntensity * shape.brightness : 0;
    this.placeDiamonds(shape, lit, crowded ? PLUME.crowdedDiamonds : 1);
  }

  advance(deltaSeconds: number): void {
    this.uniforms.uTime.value += deltaSeconds;
  }

  get lit(): boolean {
    return this.plume.visible;
  }

  private placeDiamonds(shape: PlumeShape, lit: boolean, share: number): void {
    const count = lit && shape.diamondStrength > 0 ? shape.diamondCount : 0;
    this.diamonds.visible = count > 0;
    this.diamondHost.visible = count > 0 && shape.diamondStrength * share > DIAMOND_LABEL_STRENGTH;
    this.diamonds.count = count;
    const radius = NOZZLE_EXIT.radius * shape.waist * PLUME.diamondRadius;
    const height = NOZZLE_EXIT.radius * 2 * PLUME.diamondLength;
    for (let index = 0; index < count; index += 1) {
      const fading = 1 - index / (shape.diamondCount + 1.5);
      this.position.set(0, -diamondCentre(shape, index), 0);
      this.scale.set(2 * radius * fading, height * (0.7 + 0.3 * fading), 1);
      this.matrix.compose(this.position, this.rotation, this.scale);
      this.diamonds.setMatrixAt(index, this.matrix);
      this.strength.setScalar(shape.diamondStrength * shape.brightness * fading * share);
      this.diamonds.setColorAt(index, this.strength);
    }
    this.diamonds.instanceMatrix.needsUpdate = true;
    if (this.diamonds.instanceColor) this.diamonds.instanceColor.needsUpdate = true;
  }
}
