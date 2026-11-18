import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Object3D, Mesh } from 'three';
import { clamp, smoothstep } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState, Point } from '../../../ids';
import { BITE_RADIUS_CM, BITE_SPOT } from '../../../model/layout';
import { THEME } from '../../../theme';
import { DETAIL } from '../../constants';
import { scoopGeometry } from '../../geometry/blob';
import { bitePose, spoonPose } from '../../pose';
import type { BitePose, SpoonPose } from '../../pose';
import { addMesh, label, namedGroup, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { seededRandom } from '../random';

const BOWL_SIZE: Point = [1.2, 0.42, 0.9];
const HANDLE: readonly Point[] = [
  [1.05, 0.02, 0],
  [3, 0.35, 0],
  [6, 1, 0],
  [8.6, 1.5, 0],
];
const HANDLE_RADIUS = 0.15;
const HANDLE_FLATTEN = 0.45;
const HANDLE_END = { radius: 0.36, size: [1.3, 0.45, 1] as Point };

const BITE_LOOK = { squash: 0.66, lift: 0.28 } as const;

const FILM = {
  centre: [BITE_SPOT[0], -1.27, -0.85] as Point,
  radius: { start: 0.5, grow: 1.1 },
  height: 0.13,
  depth: 0.9,
} as const;

const FROST = {
  count: 46,
  size: 0.75,
  shell: 1.18,
  twinkle: 7,
  warmEnd: 0.5,
  coldRange: 4,
  meltDim: 0.7,
} as const;

function buildSpoon(context: PartContext, parent: Object3D): Object3D {
  const spoon = namedGroup('spoon', parent);
  const bowl = new SphereGeometry(1, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  bowl.scale(...BOWL_SIZE);
  addMesh(context, spoon, bowl, 'spoon', 'steel');
  const handle = new TubeGeometry(
    new CatmullRomCurve3(HANDLE.map((point) => new Vector3(...point))),
    24,
    HANDLE_RADIUS,
    DETAIL.tube,
    false,
  );
  handle.scale(1, 1, 1 / HANDLE_FLATTEN);
  addMesh(context, spoon, handle, 'spoon', 'steel');
  const end = new SphereGeometry(HANDLE_END.radius, ...DETAIL.smallSphere);
  end.scale(...HANDLE_END.size);
  end.translate(...HANDLE[HANDLE.length - 1]);
  addMesh(context, spoon, end, 'spoon', 'steelDark');
  label(context, 'spoon', spoon, HANDLE[2]);
  return spoon;
}

export class SpoonAndBite {
  readonly bite: Object3D;
  private readonly spoon: Object3D;
  private readonly scoop: Mesh;
  private readonly film: Mesh;
  private readonly frost: PointCloud;
  private readonly sparks: Vector3[] = [];
  private readonly phases: number[] = [];
  private readonly frostColour = new Color(THEME.ice);
  private readonly spoonPose: SpoonPose = { position: [0, 0, 0], tilt: 0, visible: true };
  private readonly bitePose: BitePose = { position: [0, 0, 0], scale: 1, visible: true };

  constructor(context: PartContext, parent: Object3D, tongue: Object3D) {
    this.spoon = buildSpoon(context, parent);
    this.bite = namedGroup('bite', parent);
    this.scoop = addMesh(context, this.bite, scoopGeometry(DETAIL.blob), 'bite', 'iceCream');
    label(context, 'bite', this.bite, [0, 0, 0]);
    const film = new SphereGeometry(1, ...DETAIL.sphere);
    this.film = addMesh(context, tongue, film, 'bite', 'puddle');
    this.film.position.set(...FILM.centre);
    const random = seededRandom(31);
    for (let index = 0; index < FROST.count; index += 1) {
      const direction = new Vector3(random() - 0.5, random() - 0.2, random() - 0.5).normalize();
      this.sparks.push(direction);
      this.phases.push(random() * Math.PI * 2);
    }
    const sparkle = registeredMaterial(
      context,
      'bite',
      createPointMaterial(context.textures.glow, FROST.size, AdditiveBlending),
    );
    this.frost = new PointCloud(FROST.count, sparkle);
    context.tracker.track(this.frost);
    this.bite.add(this.frost.points);
  }

  setState(state: AssemblyState): void {
    const { seconds, melt, temperatureC, swallow } = state.reading;
    spoonPose(seconds, this.spoonPose);
    this.spoon.position.set(...this.spoonPose.position);
    this.spoon.rotation.z = this.spoonPose.tilt;
    this.spoon.visible = this.spoonPose.visible;
    bitePose(seconds, melt, this.bitePose);
    this.bite.position.set(...this.bitePose.position);
    this.bite.visible = this.bitePose.visible;
    const radius = BITE_RADIUS_CM * this.bitePose.scale;
    this.scoop.scale.set(radius, radius * BITE_LOOK.squash, radius);
    this.scoop.position.y = radius * BITE_LOOK.lift;
    const onTongue = seconds >= 0 ? melt * (1 - swallow) : 0;
    this.film.visible = onTongue > 0;
    const spread = FILM.radius.start + FILM.radius.grow * melt;
    this.film.scale.set(spread, FILM.height * smoothstep(onTongue, 0, 0.2), FILM.depth);
    this.drawFrost(seconds, temperatureC, melt, radius);
  }

  private drawFrost(seconds: number, temperatureC: number, melt: number, radius: number): void {
    const cold = clamp((FROST.warmEnd - temperatureC) / FROST.coldRange, 0, 1);
    const strength = cold * (1 - FROST.meltDim * melt);
    this.frost.points.visible = strength > 0;
    this.sparks.forEach((direction, index) => {
      const twinkle = Math.max(0, Math.sin(seconds * FROST.twinkle + this.phases[index]));
      const at = direction.clone().multiplyScalar(radius * FROST.shell);
      this.frost.setPoint(index, at.x, at.y * BITE_LOOK.squash + radius * BITE_LOOK.lift, at.z);
      const { r, g, b } = this.frostColour;
      this.frost.setColor(index, r, g, b, strength * twinkle * twinkle);
    });
    this.frost.commit();
  }
}
