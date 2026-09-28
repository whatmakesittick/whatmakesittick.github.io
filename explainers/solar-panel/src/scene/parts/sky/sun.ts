import {
  AdditiveBlending,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import type { Texture } from 'three';
import { smoothstep } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { sunDirection, sunElevationDeg } from '../../../model';
import { THEME } from '../../../theme';
import { RAYS, RENDER_ORDER, SUN_DISC, SUN_GLOW } from '../../constants';
import { sunPosition } from '../../geometry/sunArc';
import { mergeParts } from '../../geometry/merge';
import { registered } from '../context';
import type { PartContext } from '../context';
import type { SkyPalette } from './palette';
import { createSunPath } from './sunPath';
import { rayDashTexture, rayFadeTexture, sunDiscTexture } from './sunTextures';

const UP = new Vector3(0, 1, 0);
const QUARTER_TURN = Math.PI / 2;

function rayGeometry() {
  const flat = new PlaneGeometry(RAYS.width, 1);
  flat.translate(0, 1 / 2, 0);
  const crossed = flat.clone().rotateY(QUARTER_TURN);
  return mergeParts([flat, crossed]);
}

export class SunPart {
  readonly object = new Group();
  readonly sun = new Group();
  readonly path = new Group();
  readonly rays: InstancedMesh;
  private readonly disc: SpriteMaterial;
  private readonly glow: SpriteMaterial;
  private readonly dashes: Texture;
  private readonly matrix = new Matrix4();
  private readonly turn = new Quaternion();
  private readonly scale = new Vector3();
  private readonly direction = new Vector3();
  private elevation = 0;
  private pathShown = true;

  constructor(context: PartContext) {
    this.disc = registered(
      context,
      UNDIMMED_GROUP,
      new SpriteMaterial({
        map: context.tracker.track(sunDiscTexture()),
        transparent: true,
        depthWrite: false,
        sizeAttenuation: false,
        toneMapped: false,
        fog: false,
      }),
    );
    this.glow = registered(
      context,
      UNDIMMED_GROUP,
      new SpriteMaterial({
        map: context.textures.glow,
        transparent: true,
        depthWrite: false,
        sizeAttenuation: false,
        blending: AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
    );
    const disc = new Sprite(this.disc);
    disc.scale.setScalar(SUN_DISC.screenScale);
    const halo = new Sprite(this.glow);
    halo.scale.setScalar(SUN_GLOW.screenScale);
    halo.renderOrder = RENDER_ORDER.glow;
    this.sun.add(halo, disc);
    this.path.add(createSunPath(context));
    this.dashes = context.tracker.track(rayDashTexture());
    this.rays = this.buildRays(context);
    this.object.add(this.sun, this.path, this.rays);
  }

  setMinute(minute: number, palette: SkyPalette): void {
    sunPosition(minute, this.sun.position);
    this.elevation = sunElevationDeg(minute);
    this.sun.visible = this.elevation > SUN_DISC.hideBelowDeg;
    this.disc.color.copy(palette.sun);
    this.glow.color.copy(palette.glow);
    this.glow.opacity =
      SUN_GLOW.opacity * smoothstep(this.elevation, SUN_GLOW.fadeBelowDeg, SUN_GLOW.fullAboveDeg);
    this.updateRayVisibility();
  }

  setPathVisible(visible: boolean): void {
    this.pathShown = visible;
    this.path.visible = visible;
    this.updateRayVisibility();
  }

  aimRays(targets: readonly Vector3[], minute: number): void {
    const [x, y, z] = sunDirection(minute);
    this.direction.set(x, y, z);
    this.turn.setFromUnitVectors(UP, this.direction);
    this.scale.set(1, RAYS.length, 1);
    targets.forEach((target, index) => {
      this.matrix.compose(target, this.turn, this.scale);
      this.rays.setMatrixAt(index, this.matrix);
    });
    this.rays.instanceMatrix.needsUpdate = true;
  }

  update(deltaSeconds: number): boolean {
    if (!this.rays.visible) return false;
    this.dashes.offset.y -= RAYS.speed * deltaSeconds;
    return true;
  }

  private updateRayVisibility(): void {
    this.rays.visible = this.pathShown && this.elevation > 0;
  }

  private buildRays(context: PartContext): InstancedMesh {
    const material = registered(
      context,
      UNDIMMED_GROUP,
      new MeshBasicMaterial({
        color: THEME.sun,
        map: this.dashes,
        alphaMap: context.tracker.track(rayFadeTexture()),
        transparent: true,
        opacity: RAYS.opacity,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
    );
    const count = RAYS.columns * RAYS.rows;
    const rays = context.tracker.track(
      new InstancedMesh(context.tracker.track(rayGeometry()), material, count),
    );
    rays.frustumCulled = false;
    rays.renderOrder = RENDER_ORDER.rays;
    return rays;
  }
}
