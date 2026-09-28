import {
  AdditiveBlending,
  Group,
  LatheGeometry,
  Quaternion,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { FLAME, RENDER_ORDER } from '../../constants';
import { THEME } from '../../../theme';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const PROFILE_STEPS = 14;
const LATHE_SEGMENTS = 14;
const BULGE_POWER = 0.55;
const TIP_POWER = 0.8;
const CORE_LIFT = 0.08;
const GLOW_LIFT = 0.35;
const SWAY = 0.06;
const PHASES = [0, 1.7, 4.1];
const UP = new Vector3(0, 1, 0);

function teardrop(length: number, radius: number): BufferGeometry {
  const points = Array.from({ length: PROFILE_STEPS + 1 }, (_, index) => {
    const share = index / PROFILE_STEPS;
    const width = radius * Math.sin(Math.PI * share ** BULGE_POWER) * (1 - share) ** TIP_POWER;
    return new Vector2(Math.max(width, 0), share * length);
  });
  return new LatheGeometry(points, LATHE_SEGMENTS);
}

function flameAxis(direction: Vector3): Vector3 {
  const outward = new Vector3(direction.x, 0, direction.z).normalize();
  return outward.multiplyScalar(Math.cos(FLAME.rise)).addScaledVector(UP, Math.sin(FLAME.rise));
}

export class FlamePart {
  readonly object = new Group();
  readonly anchor: Object3D;
  private readonly body = new Group();
  private readonly flicker = new Group();
  private readonly glow: Sprite;

  constructor(context: PartContext, tip: Vector3, direction: Vector3) {
    const outer = partMesh(context, teardrop(FLAME.length, FLAME.radius), 'flare', 'flameOuter');
    const core = partMesh(
      context,
      teardrop(FLAME.length * FLAME.coreShare, FLAME.radius * FLAME.coreShare),
      'flare',
      'flameCore',
    );
    core.position.y = FLAME.length * CORE_LIFT;
    outer.renderOrder = RENDER_ORDER.glow;
    this.flicker.add(core, outer, ...this.tongues(context));
    this.body.add(this.flicker);
    const axis = flameAxis(direction);
    this.body.quaternion.copy(new Quaternion().setFromUnitVectors(UP, axis));
    const glowAt = axis.multiplyScalar(FLAME.length * GLOW_LIFT);
    this.glow = this.createGlow(context, glowAt);
    this.object.position.copy(tip);
    this.object.add(this.body, this.glow);
    this.anchor = anchorAt(this.object, glowAt.x, glowAt.y, glowAt.z);
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  update(time: number): void {
    if (!this.object.visible) return;
    let pulse = 0;
    for (let index = 0; index < FLAME.flicker.length; index++) {
      const wave = FLAME.flicker[index];
      pulse += wave.depth * Math.sin(wave.rate * time + PHASES[index]);
    }
    this.flicker.scale.set(1 - pulse / 2, 1 + pulse, 1 - pulse / 2);
    this.flicker.rotation.z = SWAY * Math.sin(FLAME.flicker[2].rate * time);
    this.glow.scale.setScalar(FLAME.glowSize * (1 + pulse));
  }

  private tongues(context: PartContext): Mesh[] {
    return FLAME.tongues.map((tongue) => {
      const mesh = partMesh(
        context,
        teardrop(FLAME.length * tongue.share, FLAME.radius * tongue.share),
        'flare',
        'flameOuter',
      );
      mesh.position.y = FLAME.length * tongue.lift;
      mesh.rotation.set(tongue.tilt, tongue.yaw, 0);
      mesh.renderOrder = RENDER_ORDER.glow;
      return mesh;
    });
  }

  private createGlow(context: PartContext, at: Vector3): Sprite {
    const material = new SpriteMaterial({
      map: context.textures.glow,
      color: THEME.flame,
      blending: AdditiveBlending,
      transparent: true,
      opacity: FLAME.glowOpacity,
      depthWrite: false,
    });
    context.materials.register('flare', context.tracker.track(material));
    const sprite = new Sprite(material);
    sprite.position.copy(at);
    sprite.scale.setScalar(FLAME.glowSize);
    sprite.renderOrder = RENDER_ORDER.glow;
    return sprite;
  }
}
