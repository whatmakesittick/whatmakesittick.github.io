import {
  AdditiveBlending,
  BackSide,
  Color,
  Group,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
} from 'three';
import type { Camera, Material, Texture } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState } from '../../../ids';
import { THEME } from '../../../theme';
import { BACKDROP, COMPENSATOR } from '../../constants';
import { seededRandom } from '../../geometry/random';
import { REGIONS, RIFLE_BOUNDS } from '../../regions';
import type { PartContext } from '../context';
import { laneLights } from './backdropPalette';

const DOME_VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DOME_FRAGMENT = /* glsl */ `
const int STOPS = ${BACKDROP.dome.stops.length};
uniform vec3 uColours[STOPS];
uniform float uHeights[STOPS];
varying vec3 vDirection;
void main() {
  float height = normalize(vDirection).y;
  vec3 colour = uColours[0];
  for (int index = 1; index < STOPS; index++) {
    float share = clamp((height - uHeights[index - 1]) / (uHeights[index] - uHeights[index - 1]), 0.0, 1.0);
    colour = mix(colour, uColours[index], share);
  }
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;

const FLOOR_VERTEX = /* glsl */ `
varying vec2 vPlan;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPlan = world.xz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FLOOR_FRAGMENT = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uPool;
uniform vec3 uFlashColour;
uniform vec2 uCentre;
uniform vec2 uPoolRadius;
uniform vec2 uFade;
uniform vec2 uFlashCentre;
uniform float uPoolStrength;
uniform float uFlash;
uniform float uFlashRadius;
varying vec2 vPlan;
void main() {
  vec2 pool = (vPlan - uCentre) / uPoolRadius;
  vec3 colour = mix(uBase, uPool, exp(-dot(pool, pool) * 1.6) * uPoolStrength);
  float reach = length(vPlan - uFlashCentre) / uFlashRadius;
  colour += uFlashColour * exp(-reach * reach) * uFlash;
  float alpha = 1.0 - smoothstep(uFade.x, uFade.y, length(vPlan - uCentre));
  gl_FragColor = vec4(colour, alpha);
  #include <colorspace_fragment>
}
`;

const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
const VISIBLE = 0.004;
const MOTE_TONE = new Color('#c9c2b4');

function backdropMaterial<T extends Material>(context: PartContext, material: T): T {
  context.materials.register(UNDIMMED_GROUP, context.tracker.track(material));
  return material;
}

function glowSprite(
  context: PartContext,
  map: Texture,
  colour: string,
  opacity: number,
): SpriteMaterial {
  return backdropMaterial(
    context,
    new SpriteMaterial({
      map,
      color: colour,
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
}

class Motes {
  readonly cloud: PointCloud;
  private readonly base: Float32Array;
  private readonly phase: Float32Array;
  private time = 0;

  constructor(context: PartContext) {
    const { count, size, seed } = BACKDROP.motes;
    const material = createPointMaterial(context.textures.dot, size, NormalBlending);
    material.toneMapped = false;
    this.cloud = new PointCloud(count, backdropMaterial(context, material));
    const random = seededRandom(seed);
    const { x, y, z } = BACKDROP.motes.box;
    const span = (extent: readonly [number, number]) =>
      extent[0] + random() * (extent[1] - extent[0]);
    this.base = Float32Array.from({ length: count * 3 }, (_, index) => span([x, y, z][index % 3]));
    this.phase = Float32Array.from({ length: count }, () => random() * FULL_TURN);
    for (let index = 0; index < count; index += 1) {
      const alpha = BACKDROP.motes.alpha * (0.4 + 0.6 * random());
      this.cloud.setColor(index, MOTE_TONE.r, MOTE_TONE.g, MOTE_TONE.b, alpha);
    }
    this.place();
  }

  advance(deltaSeconds: number): void {
    this.time += deltaSeconds;
    this.place();
  }

  private place(): void {
    const { count, rise, sway, box } = BACKDROP.motes;
    const height = box.y[1] - box.y[0];
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      const phase = this.phase[index];
      const lifted = this.base[offset + 1] - box.y[0] + this.time * rise;
      this.cloud.setPoint(
        index,
        this.base[offset] + sway * Math.sin(this.time * 0.4 + phase),
        box.y[0] + (lifted % height),
        this.base[offset + 2] + sway * Math.cos(this.time * 0.3 + phase),
      );
    }
    this.cloud.commit();
  }
}

export class BackdropPart {
  readonly object = new Group();
  private readonly dome: Mesh;
  private readonly floor: ShaderMaterial;
  private readonly haze: Sprite;
  private readonly motes: Motes;
  private playing = false;

  constructor(context: PartContext) {
    this.dome = this.buildDome(context);
    this.floor = this.buildFloor(context);
    this.haze = new Sprite(glowSprite(context, context.textures.glow, THEME.gas, 0));
    this.haze.position.set(COMPENSATOR.x[1] + BACKDROP.haze.offset, 0, 0);
    this.haze.scale.set(...BACKDROP.haze.size, 1);
    this.motes = new Motes(context);
    this.addLaneLights(context);
    this.object.add(this.dome, this.haze, this.motes.cloud.points);
  }

  setState(state: AssemblyState): void {
    this.playing = state.playing;
    const flash = state.view.gas ? state.shot.muzzleFlash : 0;
    this.floor.uniforms.uFlash.value = flash * BACKDROP.floor.flash.strength;
    this.haze.visible = flash > VISIBLE;
    this.haze.material.opacity = flash * BACKDROP.haze.opacity;
  }

  update(deltaSeconds: number): boolean {
    if (!this.playing) return false;
    this.motes.advance(deltaSeconds);
    return true;
  }

  private buildDome(context: PartContext): Mesh {
    const { radius, widthSegments, heightSegments, stops, renderOrder } = BACKDROP.dome;
    const material = backdropMaterial(
      context,
      new ShaderMaterial({
        uniforms: {
          uColours: { value: stops.map((stop) => new Color(stop.colour)) },
          uHeights: { value: stops.map((stop) => stop.height) },
        },
        vertexShader: DOME_VERTEX,
        fragmentShader: DOME_FRAGMENT,
        side: BackSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    const geometry = context.tracker.track(
      new SphereGeometry(radius, widthSegments, heightSegments),
    );
    const dome = new Mesh(geometry, material);
    dome.frustumCulled = false;
    dome.renderOrder = renderOrder;
    dome.onBeforeRender = (_renderer, _scene, camera: Camera) => {
      dome.position.copy(camera.position);
      dome.parent?.worldToLocal(dome.position);
      dome.updateMatrixWorld();
    };
    return dome;
  }

  private buildFloor(context: PartContext): ShaderMaterial {
    const { size, base, pool, poolRadius, poolStrength, fade, flash, renderOrder } = BACKDROP.floor;
    const centre = new Vector2((RIFLE_BOUNDS.x[0] + RIFLE_BOUNDS.x[1]) / 2, 0);
    const material = backdropMaterial(
      context,
      new ShaderMaterial({
        uniforms: {
          uBase: { value: new Color(base) },
          uPool: { value: new Color(pool) },
          uFlashColour: { value: new Color(THEME.gas) },
          uCentre: { value: centre },
          uPoolRadius: { value: new Vector2(...poolRadius) },
          uFade: { value: new Vector2(...fade) },
          uFlashCentre: { value: new Vector2(COMPENSATOR.x[1] + BACKDROP.haze.offset, 0) },
          uPoolStrength: { value: poolStrength },
          uFlash: { value: 0 },
          uFlashRadius: { value: flash.radius },
        },
        vertexShader: FLOOR_VERTEX,
        fragmentShader: FLOOR_FRAGMENT,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    const geometry = context.tracker.track(
      new PlaneGeometry(size, size)
        .rotateX(-QUARTER_TURN)
        .translate(centre.x, REGIONS.scene.y[0], 0),
    );
    const floor = new Mesh(geometry, material);
    floor.renderOrder = renderOrder;
    floor.frustumCulled = false;
    this.object.add(floor);
    return material;
  }

  private addLaneLights(context: PartContext): void {
    const { colour, bokeh, glow } = BACKDROP.lights;
    const bokehMaterial = glowSprite(context, context.textures.dot, colour, bokeh.opacity);
    const glowMaterial = glowSprite(context, context.textures.glow, colour, glow.opacity);
    for (const [x, y, z] of laneLights()) {
      for (const [material, size] of [
        [glowMaterial, glow.size],
        [bokehMaterial, bokeh.size],
      ] as const) {
        const sprite = new Sprite(material);
        sprite.position.set(x, y, z);
        sprite.scale.setScalar(size);
        this.object.add(sprite);
      }
    }
  }
}
