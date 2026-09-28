import {
  AdditiveBlending,
  CatmullRomCurve3,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Texture } from 'three';
import { smoothstep } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import {
  MINUTES_PER_HOUR,
  SOLAR_NOON_MIN,
  SUN_ARC_RADIUS_CM,
  SUN_DISC_RADIUS_CM,
  SUNRISE_MIN,
  SUNSET_MIN,
  sunDirection,
  sunElevationDeg,
} from '../../../model';
import { THEME } from '../../../theme';
import { ARC_CENTRE, RAYS, RENDER_ORDER, SUN_ARC, SUN_DISC, SUN_GLOW } from '../../constants';
import { mergeParts } from '../../geometry/merge';
import { registered, registeredMesh } from '../context';
import type { PartContext } from '../context';
import type { SkyPalette } from './palette';
import { rayDashTexture, rayFadeTexture, sunDiscTexture } from './sunTextures';

const UP = new Vector3(0, 1, 0);
const ARC_ORIGIN = new Vector3(ARC_CENTRE.x, ARC_CENTRE.y, ARC_CENTRE.z);
const QUARTER_TURN = Math.PI / 2;

export function sunPosition(minute: number, target = new Vector3()): Vector3 {
  const [x, y, z] = sunDirection(minute);
  return target.set(x, y, z).multiplyScalar(SUN_ARC_RADIUS_CM).add(ARC_ORIGIN);
}

function arcGeometry(): TubeGeometry {
  const points: Vector3[] = [];
  for (let minute = SUNRISE_MIN; minute <= SUNSET_MIN; minute += SUN_ARC.stepMinutes) {
    points.push(sunPosition(minute));
  }
  const curve = new CatmullRomCurve3(points);
  return new TubeGeometry(curve, points.length * 2, SUN_ARC.radius, SUN_ARC.radialSegments);
}

function tickGeometry() {
  const ticks = [];
  for (let minute = SUNRISE_MIN; minute <= SUNSET_MIN; minute += MINUTES_PER_HOUR) {
    const { tick } = SUN_ARC;
    const radius = minute === SOLAR_NOON_MIN ? tick.noonRadius : tick.radius;
    const sphere = new SphereGeometry(radius, tick.segments, tick.segments / 2);
    const at = sunPosition(minute);
    sphere.translate(at.x, at.y, at.z);
    ticks.push(sphere);
  }
  return mergeParts(ticks);
}

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
        blending: AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
    );
    const disc = new Sprite(this.disc);
    disc.scale.setScalar(SUN_DISC_RADIUS_CM * 2);
    const halo = new Sprite(this.glow);
    halo.scale.setScalar(SUN_GLOW.size);
    halo.renderOrder = RENDER_ORDER.glow;
    this.sun.add(halo, disc);
    this.path.add(
      registeredMesh(context, arcGeometry(), UNDIMMED_GROUP, this.pathMaterial()),
      registeredMesh(context, tickGeometry(), UNDIMMED_GROUP, this.pathMaterial()),
    );
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

  update(deltaSeconds: number): void {
    if (this.rays.visible) this.dashes.offset.y -= RAYS.speed * deltaSeconds;
  }

  private updateRayVisibility(): void {
    this.rays.visible = this.pathShown && this.elevation > 0;
  }

  private pathMaterial(): MeshBasicMaterial {
    return new MeshBasicMaterial({
      color: THEME.sun,
      transparent: true,
      opacity: SUN_ARC.opacity,
      depthWrite: false,
      toneMapped: false,
    });
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
