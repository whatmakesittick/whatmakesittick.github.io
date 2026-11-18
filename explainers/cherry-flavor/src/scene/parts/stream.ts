import { AdditiveBlending, CatmullRomCurve3, Color, Vector3 } from 'three';
import type { Object3D, Texture } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { ODORANT_IDS } from '../../ids';
import type { OdorantId, OdorantLevels } from '../../ids';
import { ODORANT_COLOURS } from '../../theme';
import { registeredMaterial } from './context';
import type { EmphasisGroup, PartContext } from './context';
import { seededRandom } from './random';

export interface StreamLook {
  readonly perOdorant: number;
  readonly size: number;
  readonly width: number;
  readonly speed: number;
  readonly gain: number;
  readonly seed: number;
  readonly wobble: number;
  readonly fadeIn: number;
  readonly fadeOut: number;
  readonly texture?: Texture;
}

interface Particle {
  readonly odorant: OdorantId;
  readonly start: number;
  readonly pace: number;
  readonly threshold: number;
  readonly offset: Vector3;
  readonly spin: number;
}

const PATH_SAMPLES = 64;
const EASE_RATE = 4;
const SETTLED = 0.002;
const VISIBLE = 0.004;
const PACE_SPREAD = 0.35;
const STOP_FADE = 0.06;

function zeroLevels(): OdorantLevels {
  return { benzaldehyde: 0, hexenal: 0, linalool: 0, eugenol: 0, ionone: 0 };
}

export class AromaStream {
  readonly cloud: PointCloud;
  private readonly look: StreamLook;
  private readonly particles: Particle[] = [];
  private readonly colours: Record<OdorantId, Color>;
  private readonly target = zeroLevels();
  private readonly shown = zeroLevels();
  private readonly lut: Vector3[] = [];
  private readonly point = new Vector3();
  private readonly tangent = new Vector3();
  private readonly side = new Vector3();
  private readonly up = new Vector3();
  private stop = 1;
  private age = 0;

  constructor(context: PartContext, parent: Object3D, group: EmphasisGroup, look: StreamLook) {
    this.look = look;
    const random = seededRandom(look.seed);
    ODORANT_IDS.forEach((odorant) => {
      for (let index = 0; index < look.perOdorant; index += 1) {
        this.particles.push({
          odorant,
          start: random(),
          pace: 1 + (random() - 0.5) * PACE_SPREAD,
          threshold: (index + random()) / look.perOdorant,
          offset: new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(2),
          spin: random() * Math.PI * 2,
        });
      }
    });
    this.colours = Object.fromEntries(
      ODORANT_IDS.map((id) => [id, new Color(ODORANT_COLOURS[id])]),
    ) as Record<OdorantId, Color>;
    const pointMaterial = registeredMaterial(
      context,
      group,
      createPointMaterial(look.texture ?? context.textures.glow, look.size, AdditiveBlending),
    );
    this.cloud = new PointCloud(this.particles.length, pointMaterial);
    this.cloud.points.name = `${group}Stream`;
    context.tracker.track(this.cloud);
    parent.add(this.cloud.points);
  }

  setPath(points: readonly Vector3[]): void {
    const curve = new CatmullRomCurve3([...points], false, 'centripetal');
    const spaced = curve.getSpacedPoints(PATH_SAMPLES);
    spaced.forEach((point, index) => {
      if (this.lut[index]) this.lut[index].copy(point);
      else this.lut[index] = point;
    });
  }

  setLevels(levels: Readonly<OdorantLevels>, stop = 1): void {
    ODORANT_IDS.forEach((id) => (this.target[id] = clamp(levels[id] * this.look.gain, 0, 1)));
    this.stop = stop;
  }

  update(deltaSeconds: number): boolean {
    this.age += deltaSeconds;
    let moving = false;
    ODORANT_IDS.forEach((id) => {
      const gap = this.target[id] - this.shown[id];
      this.shown[id] += gap * Math.min(1, deltaSeconds * EASE_RATE);
      if (Math.abs(gap) > SETTLED) moving = true;
      if (this.shown[id] > VISIBLE) moving = true;
    });
    this.draw();
    return moving;
  }

  private sample(share: number, out: Vector3): Vector3 {
    const at = clamp(share, 0, 1) * PATH_SAMPLES;
    const index = Math.min(PATH_SAMPLES - 1, Math.floor(at));
    return out.copy(this.lut[index]).lerp(this.lut[index + 1], at - index);
  }

  private draw(): void {
    const { look } = this;
    this.particles.forEach((particle, index) => {
      const level = this.shown[particle.odorant];
      const share = (particle.start + this.age * look.speed * particle.pace) % 1;
      const presence = smoothstep(level, particle.threshold, particle.threshold + 0.08);
      const travel = share * this.stop;
      const fade =
        smoothstep(share, 0, look.fadeIn) *
        (1 - smoothstep(share, 1 - look.fadeOut, 1)) *
        (this.stop < 1 ? 1 - smoothstep(share, 1 - STOP_FADE, 1) : 1);
      const alpha = presence * fade;
      if (alpha <= 0 || this.lut.length === 0) {
        this.cloud.setColor(index, 0, 0, 0, 0);
        return;
      }
      this.sample(travel, this.point);
      this.sample(Math.min(1, travel + 0.02), this.tangent)
        .sub(this.point)
        .normalize();
      this.side.set(-this.tangent.y, this.tangent.x, 0).normalize();
      this.up.crossVectors(this.tangent, this.side);
      const swirl = particle.spin + this.age * look.wobble;
      const width = look.width * lerp(0.4, 1, Math.sin(share * Math.PI));
      this.point
        .addScaledVector(this.side, (particle.offset.x + Math.sin(swirl) * 0.3) * width)
        .addScaledVector(this.up, (particle.offset.z + Math.cos(swirl) * 0.3) * width);
      this.cloud.setPoint(index, this.point.x, this.point.y, this.point.z);
      const colour = this.colours[particle.odorant];
      this.cloud.setColor(index, colour.r, colour.g, colour.b, alpha);
    });
    this.cloud.commit();
  }
}
