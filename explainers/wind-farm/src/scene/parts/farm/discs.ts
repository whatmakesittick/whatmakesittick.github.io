import { CircleGeometry, InstancedMesh } from 'three';
import type { DataTexture, Matrix4, MeshStandardMaterial } from 'three';
import { clamp } from '@core/math';
import { MAX_RPM, ROTOR_RADIUS_M, TURBINE_COUNT } from '../../../model';
import type { PartContext } from '../context';
import { tiltTowardEye } from './rotors';
import { DISC, DISC_FINISH } from './turbineConstants';
import { discTexture } from './textures';

const PART = 'farmTurbines';
const NAME = 'turbineDiscs';
const QUARTER_TURN = Math.PI / 2;
const CACHE_KEY = 'farmRotorDisc';
const EDGE_FRAGMENT = `#include <normal_fragment_maps>
diffuseColor.a /= max(abs(dot(normal, normalize(vViewPosition))), ${(1 / DISC.edgeBoost).toFixed(3)});`;

export function discOpacity(rpm: number): number {
  if (rpm <= 0) return 0;
  const opacity = DISC.maxOpacity * clamp(rpm / MAX_RPM, 0, 1);
  return Math.max(DISC.opacityStep, Math.round(opacity / DISC.opacityStep) * DISC.opacityStep);
}

function discGeometry(): CircleGeometry {
  const geometry = new CircleGeometry(ROTOR_RADIUS_M, DISC.segments);
  return geometry.rotateY(QUARTER_TURN);
}

export class RotorDiscs {
  readonly mesh: InstancedMesh;
  private readonly context: PartContext;
  private readonly blur: DataTexture;
  private readonly materials = new Map<number, MeshStandardMaterial>();

  constructor(context: PartContext) {
    this.context = context;
    this.blur = context.tracker.track(discTexture());
    this.mesh = context.tracker.track(
      new InstancedMesh(
        context.tracker.track(discGeometry()),
        this.materialFor(DISC.opacityStep),
        TURBINE_COUNT,
      ),
    );
    this.mesh.name = NAME;
    this.mesh.visible = false;
  }

  setMatrixAt(index: number, rotor: Matrix4): void {
    this.mesh.setMatrixAt(index, rotor);
  }

  spin(rpm: number): void {
    const opacity = discOpacity(rpm);
    this.mesh.visible = opacity > 0;
    if (this.mesh.visible) this.mesh.material = this.materialFor(opacity);
  }

  private materialFor(opacity: number): MeshStandardMaterial {
    const key = Math.round(opacity / DISC.opacityStep);
    let material = this.materials.get(key);
    if (!material) {
      material = this.context.materials.get(PART, { ...DISC_FINISH, opacity, alphaMap: this.blur });
      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <normal_fragment_maps>',
          EDGE_FRAGMENT,
        );
      };
      tiltTowardEye(material, CACHE_KEY);
      this.materials.set(key, material);
    }
    return material;
  }
}
