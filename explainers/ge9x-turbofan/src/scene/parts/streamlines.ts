import {
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  DoubleSide,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import type { Group, IUniform, WebGLRenderer } from 'three';
import { FULL_TURN, clamp, lerp, smoothstep, toRadians } from '@core/math';
import { AXIS_HEIGHT_M, LIP_X, SPIN_SENSE } from '../../model/scale';
import { HEAT_LOOK, LOOK, STREAMS } from '../constants';
import type { StreamTable } from '../geometry/streamPaths';
import type { PartContext, EmphasisGroup } from './context';
import { UNDIMMED_GROUP, namedGroup, registered } from './context';
import { HEAT_RAMP_GLSL, heatProfileAt } from './heat';
import type { HeatUniforms } from './heat';
import { glslFloat } from './shaderChunks';
import { CORE_CENTRE, SHELL_CENTRE, avoided, gathered, sampleTable, wrapped } from './streams';
import type { Sample, StreamFrame, StreamLook } from './streams';

const POINTS = 96;
const VERTICES_PER_POINT = 2;
const XYZ = 3;
const RGBA = 4;
const POINT_STRIDE = XYZ * VERTICES_PER_POINT;
const INDICES_PER_SEGMENT = 6;
const GOLDEN_ANGLE = 2.399963229728653;
const PLASTIC_STEP = 0.7548776662466927;
const TANGENT_REACH = 0.05;
const DIRTY_EPSILON = 1e-4;

const RIBBONS = {
  coldLines: 48,
  hotLines: 14,
  spacing: 1.1,
  base: 0.4,
  coldAlphaScale: 3.4,
  hotAlphaScale: 1.6,
  coldWidthScale: 1.9,
  hotWidthScale: 1.2,
  minOpen: 0.02,
  approach: 1.8,
  minPixels: 2,
  thinFloor: 0.5,
  fadeIn: 0.07,
  fadeOut: 0.05,
  markerWidth: 1.5,
  flareMix: 1,
  flareAlpha: 1.4,
  flareGain: 0.7,
  hotGlow: 1.25,
  seed: 20260,
} as const;

const DUST = {
  lines: 14,
  points: 48,
  fromX: -7,
  floorDrop: 0.1,
  toX: -2.9,
  toY: -1.1,
  zFrom: -1.3,
  zTo: 0.1,
  rise: 0.5,
  width: 0.05,
  alpha: 0.5,
  speed: 2.2,
  spacing: 1.6,
  threshold: 0.7,
  full: 0.95,
  colourDark: [0.62, 0.64, 0.68],
  colourLight: [0.34, 0.36, 0.4],
  seed: 777,
} as const;

export function lineLayout(
  count: number,
  markerAngle: number,
): { readonly shares: Float32Array; readonly angles: Float32Array } {
  const shares = new Float32Array(count);
  const angles = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    shares[index] = index === 0 ? 0.5 : (0.5 + index * PLASTIC_STEP) % 1;
    angles[index] = (markerAngle + index * GOLDEN_ANGLE) % FULL_TURN;
  }
  return { shares, angles };
}

export function visibleLines(total: number, count: number, buffer: number): number {
  if (count <= 0 || buffer <= 0) return 0;
  return clamp(Math.ceil((total * count) / buffer), 1, total);
}

export function travelCoordinates(speeds: ArrayLike<number>, length: number): Float32Array {
  const travel = new Float32Array(speeds.length);
  const step = length / (speeds.length - 1);
  for (let index = 1; index < speeds.length; index += 1) {
    const pace = Math.max(0.05, (speeds[index] + speeds[index - 1]) * 0.5);
    travel[index] = travel[index - 1] + step / pace;
  }
  return travel;
}

export function isTorn(from: number, to: number, splits: boolean, open: number): boolean {
  if (Math.abs(wrapped(to - from)) > STREAMS.tearAngle) return true;
  return splits && open > RIBBONS.minOpen && from * to < 0 && Math.abs(to - from) < Math.PI;
}

export function pointAtX(
  positions: ArrayLike<number>,
  stride: number,
  points: number,
  x: number,
  target: Vector3,
): Vector3 {
  for (let index = 1; index < points; index += 1) {
    const before = (index - 1) * stride;
    const after = index * stride;
    const x0 = positions[before];
    const x1 = positions[after];
    if ((x0 - x) * (x1 - x) <= 0 && x0 !== x1) {
      const f = (x - x0) / (x1 - x0);
      return target.set(
        x,
        lerp(positions[before + 1], positions[after + 1], f),
        lerp(positions[before + 2], positions[after + 2], f),
      );
    }
  }
  const edge = x < positions[0] ? 0 : (points - 1) * stride;
  return target.set(positions[edge], positions[edge + 1], positions[edge + 2]);
}

function openWindow(x: number): number {
  return (
    smoothstep(x, LIP_X - RIBBONS.approach, LIP_X) *
    (1 - smoothstep(x, STREAMS.cutEnd, STREAMS.cutEnd + STREAMS.cutFade))
  );
}

function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

interface RibbonUniforms {
  readonly uViewport: IUniform<Vector2>;
  readonly uMinPixels: IUniform<number>;
  readonly uWidth: IUniform<number>;
  readonly uAlpha: IUniform<number>;
  readonly uGain: IUniform<number>;
  readonly uPhase: IUniform<number>;
  readonly uSpacing: IUniform<number>;
  readonly uBase: IUniform<number>;
  readonly uFlare: IUniform<number>;
  readonly uMarkerX: IUniform<number>;
  readonly uMarkerBoost: IUniform<number>;
  readonly uHeat: IUniform<number>;
}

function ribbonUniforms(spacing: number, heat: HeatUniforms, flare: number): RibbonUniforms {
  return {
    uViewport: { value: new Vector2(1, 1) },
    uMinPixels: { value: RIBBONS.minPixels },
    uWidth: { value: 0 },
    uAlpha: { value: 0 },
    uGain: { value: LOOK.streakGain },
    uPhase: { value: 0 },
    uSpacing: { value: spacing },
    uBase: { value: RIBBONS.base },
    uFlare: { value: flare },
    uMarkerX: { value: 0 },
    uMarkerBoost: { value: 0 },
    uHeat: heat.uHeat,
  };
}

function ribbonMaterial(uniforms: RibbonUniforms): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    uniforms: { ...uniforms },
    vertexShader: /* glsl */ `
      attribute vec3 tangent;
      attribute vec2 edge;
      attribute float travel;
      attribute vec4 tint;
      attribute vec4 lineData;
      uniform vec2 uViewport;
      uniform float uMinPixels;
      uniform float uWidth;
      varying vec4 vTint;
      varying vec4 vLine;
      varying vec2 vEdge;
      varying float vTravel;
      varying float vThin;
      varying float vX;
      void main() {
        mat4 transform = projectionMatrix * modelViewMatrix;
        vec4 clip = transform * vec4(position, 1.0);
        vec4 clipAhead = transform * vec4(position + tangent * ${glslFloat(TANGENT_REACH)}, 1.0);
        vec2 screen = clip.xy / clip.w * uViewport;
        vec2 ahead = clipAhead.xy / clipAhead.w * uViewport;
        vec2 along = ahead - screen;
        float span = length(along);
        vec2 direction = span > 0.0001 ? along / span : vec2(1.0, 0.0);
        vec2 side = vec2(-direction.y, direction.x);
        float pixelsPerUnit = projectionMatrix[1][1] * uViewport.y / max(clip.w, 0.001);
        float real = uWidth * lineData.y * pixelsPerUnit;
        float pixels = max(uMinPixels, real);
        clip.xy += side * edge.x * pixels * 0.5 / uViewport * clip.w;
        vThin = clamp(real / uMinPixels, ${glslFloat(RIBBONS.thinFloor)}, 1.0);
        vTint = tint;
        vLine = lineData;
        vEdge = edge;
        vTravel = travel;
        vX = position.x;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uGain;
      uniform float uAlpha;
      uniform float uPhase;
      uniform float uSpacing;
      uniform float uBase;
      uniform float uFlare;
      uniform float uHeat;
      uniform float uMarkerX;
      uniform float uMarkerBoost;
      varying vec4 vTint;
      varying vec4 vLine;
      varying vec2 vEdge;
      varying float vTravel;
      varying float vThin;
      varying float vX;
      ${HEAT_RAMP_GLSL}
      void main() {
        float cycle = fract((vTravel - uPhase) / uSpacing + vLine.x);
        float dash = pow(cycle, 2.2) * (1.0 - smoothstep(0.93, 1.0, cycle));
        float pulse = uBase + (1.0 - uBase) * dash;
        float ends = smoothstep(0.0, ${glslFloat(RIBBONS.fadeIn)}, vEdge.y)
          * (1.0 - smoothstep(${glslFloat(1 - RIBBONS.fadeOut)}, 1.0, vEdge.y));
        float across = 1.0 - abs(vEdge.x);
        float heatNow = clamp(vLine.w * uHeat, 0.0, 1.0);
        float flare = pow(heatNow, ${glslFloat(HEAT_LOOK.curve)}) * uFlare;
        float reach = (vX - uMarkerX) / ${glslFloat(STREAMS.markerReach)};
        float marker = 1.0 + uMarkerBoost * exp(-reach * reach);
        vec3 colour = vTint.rgb * marker;
        vec3 hot = heatRamp(min(heatNow, ${glslFloat(HEAT_LOOK.rampCap)})) * ${glslFloat(RIBBONS.flareGain)} + colour * 0.35;
        colour = mix(colour, hot, clamp(flare * ${glslFloat(RIBBONS.flareMix)}, 0.0, 1.0));
        float alpha = vTint.a * uAlpha * uGain * vLine.z * pulse * ends * vThin
          * smoothstep(0.0, 0.7, across) * (1.0 + flare * ${glslFloat(RIBBONS.flareAlpha)});
        float cover = clamp(alpha, 0.0, 1.0);
        gl_FragColor = vec4(colour, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor = vec4(gl_FragColor.rgb * cover, cover * ${glslFloat(LOOK.streakCover)});
      }
    `,
  });
}

class RibbonBuffers {
  readonly geometry = new BufferGeometry();
  readonly position: Float32Array;
  private readonly tangent: Float32Array;
  private readonly travel: Float32Array;
  private readonly tint: Float32Array;
  private readonly lineData: Float32Array;
  private readonly attributes: BufferAttribute[] = [];
  private readonly lines: number;
  private readonly points: number;

  constructor(lines: number, points: number) {
    this.lines = lines;
    this.points = points;
    const vertices = lines * points * VERTICES_PER_POINT;
    this.position = new Float32Array(vertices * XYZ);
    this.tangent = new Float32Array(vertices * XYZ);
    this.travel = new Float32Array(vertices);
    this.tint = new Float32Array(vertices * RGBA);
    this.lineData = new Float32Array(vertices * RGBA);
    const edge = new Float32Array(vertices * 2);
    for (let index = 0; index < vertices; index += 1) {
      const point = Math.floor(index / VERTICES_PER_POINT) % points;
      edge[index * 2] = index % VERTICES_PER_POINT === 0 ? -1 : 1;
      edge[index * 2 + 1] = point / (points - 1);
    }
    this.dynamic('position', this.position, XYZ);
    this.dynamic('tangent', this.tangent, XYZ);
    this.dynamic('travel', this.travel, 1);
    this.dynamic('tint', this.tint, RGBA);
    this.dynamic('lineData', this.lineData, RGBA);
    this.geometry.setAttribute('edge', new BufferAttribute(edge, 2));
    this.geometry.setIndex(new BufferAttribute(this.indices(), 1));
    this.setLineCount(lines);
  }

  fillLineData(line: number, phase: number, width: number, alpha: number): void {
    for (let point = 0; point < this.points; point += 1) {
      const first = (line * this.points + point) * VERTICES_PER_POINT;
      for (let side = 0; side < VERTICES_PER_POINT; side += 1) {
        const at = (first + side) * RGBA;
        this.lineData[at] = phase;
        this.lineData[at + 1] = width;
        this.lineData[at + 2] = alpha;
      }
    }
  }

  setHeat(line: number, point: number, heat: number): void {
    const first = (line * this.points + point) * VERTICES_PER_POINT;
    this.lineData[first * RGBA + 3] = heat;
    this.lineData[(first + 1) * RGBA + 3] = heat;
  }

  setPoint(
    line: number,
    point: number,
    x: number,
    y: number,
    z: number,
    travel: number,
    red: number,
    green: number,
    blue: number,
  ): void {
    const first = (line * this.points + point) * VERTICES_PER_POINT;
    for (let side = 0; side < VERTICES_PER_POINT; side += 1) {
      const vertex = first + side;
      this.position[vertex * XYZ] = x;
      this.position[vertex * XYZ + 1] = y;
      this.position[vertex * XYZ + 2] = z;
      this.travel[vertex] = travel;
      this.tint[vertex * RGBA] = red;
      this.tint[vertex * RGBA + 1] = green;
      this.tint[vertex * RGBA + 2] = blue;
      this.tint[vertex * RGBA + 3] = 1;
    }
  }

  hidePoint(line: number, point: number): void {
    const first = (line * this.points + point) * VERTICES_PER_POINT;
    this.tint[first * RGBA + 3] = 0;
    this.tint[(first + 1) * RGBA + 3] = 0;
  }

  finishLine(line: number): void {
    const base = line * this.points;
    for (let point = 0; point < this.points; point += 1) {
      const before = (base + Math.max(0, point - 1)) * POINT_STRIDE;
      const after = (base + Math.min(this.points - 1, point + 1)) * POINT_STRIDE;
      const dx = this.position[after] - this.position[before];
      const dy = this.position[after + 1] - this.position[before + 1];
      const dz = this.position[after + 2] - this.position[before + 2];
      const length = Math.hypot(dx, dy, dz) || 1;
      const at = (base + point) * POINT_STRIDE;
      for (let side = 0; side < VERTICES_PER_POINT; side += 1) {
        this.tangent[at + side * XYZ] = dx / length;
        this.tangent[at + side * XYZ + 1] = dy / length;
        this.tangent[at + side * XYZ + 2] = dz / length;
      }
    }
  }

  touch(): void {
    for (const attribute of this.attributes) attribute.needsUpdate = true;
  }

  setLineCount(count: number): void {
    this.geometry.setDrawRange(0, count * (this.points - 1) * INDICES_PER_SEGMENT);
  }

  private dynamic(name: string, array: Float32Array, size: number): void {
    const attribute = new BufferAttribute(array, size);
    this.attributes.push(attribute);
    this.geometry.setAttribute(name, attribute);
  }

  private indices(): Uint32Array {
    const result = new Uint32Array(this.lines * (this.points - 1) * INDICES_PER_SEGMENT);
    let at = 0;
    for (let line = 0; line < this.lines; line += 1) {
      for (let point = 0; point < this.points - 1; point += 1) {
        const a = (line * this.points + point) * VERTICES_PER_POINT;
        result.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], at);
        at += INDICES_PER_SEGMENT;
      }
    }
    return result;
  }
}

function ribbonMesh(
  context: PartContext,
  group: EmphasisGroup,
  buffers: RibbonBuffers,
  uniforms: RibbonUniforms,
  name: string,
): Mesh {
  const drawSize = new Vector2();
  const shader = registered(context, group, ribbonMaterial(uniforms));
  const mesh = new Mesh(context.tracker.track(buffers.geometry), shader);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.onBeforeRender = (renderer: WebGLRenderer) => {
    renderer.getDrawingBufferSize(drawSize);
    uniforms.uViewport.value.set(drawSize.x / 2, drawSize.y / 2);
    uniforms.uMinPixels.value = RIBBONS.minPixels * renderer.getPixelRatio();
  };
  return mesh;
}

function emptySample(): Sample {
  return { mapped: 0, x: 0, r: 0, swirl: 0, speed: 0, red: 0, green: 0, blue: 0 };
}

export class StreamRibbons {
  readonly root: Group;
  private readonly look: StreamLook;
  private readonly tables: readonly StreamTable[];
  private readonly lines: number;
  private readonly buffers: RibbonBuffers;
  private readonly uniforms: RibbonUniforms;
  private readonly shares: Float32Array;
  private readonly angles: Float32Array;
  private readonly speeds = new Float32Array(POINTS);
  private readonly sample = emptySample();
  private readonly other = emptySample();
  private readonly widthScale: number;
  private readonly alphaScale: number;
  private phase = 0;
  private builtGap = Number.NaN;
  private builtBlend = Number.NaN;

  constructor(
    context: PartContext,
    parent: Group,
    look: StreamLook,
    tables: readonly StreamTable[],
  ) {
    this.look = look;
    this.tables = tables;
    this.root = namedGroup(look.part, parent);
    this.lines = look.gather ? RIBBONS.hotLines : RIBBONS.coldLines;
    this.widthScale = look.gather ? RIBBONS.hotWidthScale : RIBBONS.coldWidthScale;
    this.alphaScale = look.gather ? RIBBONS.hotAlphaScale : RIBBONS.coldAlphaScale;
    const layout = lineLayout(this.lines, toRadians(STREAMS.markerAngle));
    this.shares = layout.shares;
    this.angles = layout.angles;
    this.buffers = new RibbonBuffers(this.lines, POINTS);
    this.uniforms = ribbonUniforms(
      RIBBONS.spacing,
      context.heat,
      look.gather ? RIBBONS.hotGlow : 0,
    );
    this.fillStatics();
    this.root.add(ribbonMesh(context, look.part, this.buffers, this.uniforms, `${look.part}Lines`));
  }

  update(frame: StreamFrame): void {
    const shown = visibleLines(this.lines, frame.count, this.look.buffer);
    this.buffers.setLineCount(shown);
    if (shown === 0) return;
    if (frame.playing) {
      this.phase =
        (this.phase + frame.deltaSeconds * this.look.speed * frame.speed) % RIBBONS.spacing;
    }
    const power = STREAMS.alphaBase + (1 - STREAMS.alphaBase) * Math.min(1, frame.speed);
    this.uniforms.uPhase.value = this.phase;
    this.uniforms.uMarkerX.value = frame.markerX;
    this.uniforms.uMarkerBoost.value = STREAMS.markerBoost;
    this.uniforms.uWidth.value =
      this.look.width * this.widthScale * lerp(1, this.look.reversedWidth, frame.blend);
    this.uniforms.uAlpha.value =
      this.look.alpha * this.alphaScale * power * lerp(1, this.look.reversedAlpha, frame.blend);
    const blend = this.tables.length > 1 ? frame.blend : 0;
    if (
      Math.abs(frame.gap - this.builtGap) > DIRTY_EPSILON ||
      Math.abs(blend - this.builtBlend) > DIRTY_EPSILON
    ) {
      this.build(frame.gap, blend);
    }
  }

  markerPoint(x: number, target: Vector3): Vector3 {
    return pointAtX(this.buffers.position, POINT_STRIDE, POINTS, x, target);
  }

  private fillStatics(): void {
    const next = random(RIBBONS.seed + (this.look.gather ? 1 : 0));
    for (let line = 0; line < this.lines; line += 1) {
      const marker = line === 0;
      this.buffers.fillLineData(
        line,
        next(),
        marker ? RIBBONS.markerWidth : lerp(0.8, 1.25, next()),
        marker ? 1 : lerp(0.55, 1, next()),
      );
    }
    if (this.look.gather) this.fillHeat();
    this.build(0, 0);
  }

  private fillHeat(): void {
    for (let point = 0; point < POINTS; point += 1) {
      const x = sampleTable(this.tables[0], point / (POINTS - 1), 0.5, this.sample).x;
      const heat = heatProfileAt(x);
      for (let line = 0; line < this.lines; line += 1) this.buffers.setHeat(line, point, heat);
    }
  }

  private build(gap: number, blend: number): void {
    this.builtGap = gap;
    this.builtBlend = blend;
    const travel = this.travelFor(blend);
    for (let line = 0; line < this.lines; line += 1) {
      let previous = Number.NaN;
      for (let point = 0; point < POINTS; point += 1) {
        const mapped = this.place(line, point, travel[point], gap, blend);
        if (point > 0 && isTorn(previous, mapped, !this.look.gather, gap)) {
          this.buffers.hidePoint(line, point - 1);
          this.buffers.hidePoint(line, point);
        }
        previous = mapped;
      }
      this.buffers.finishLine(line);
    }
    this.buffers.touch();
  }

  private travelFor(blend: number): Float32Array {
    const alternate = this.tables[1];
    for (let point = 0; point < POINTS; point += 1) {
      const along = point / (POINTS - 1);
      const base = sampleTable(this.tables[0], along, 0.5, this.sample).speed;
      this.speeds[point] =
        alternate && blend > 0
          ? lerp(base, sampleTable(alternate, along, 0.5, this.other).speed, blend)
          : base;
    }
    return travelCoordinates(this.speeds, this.tables[0].length);
  }

  private place(line: number, point: number, travel: number, gap: number, blend: number): number {
    const along = point / (POINTS - 1);
    const out = sampleTable(this.tables[0], along, this.shares[line], this.sample);
    const alternate = this.tables[1];
    if (alternate && blend > 0) {
      const { x, r, swirl, red, green, blue } = out;
      sampleTable(alternate, along, this.shares[line], out);
      out.x = lerp(x, out.x, blend);
      out.r = lerp(r, out.r, blend);
      out.swirl = lerp(swirl, out.swirl, blend);
      out.red = lerp(red, out.red, blend);
      out.green = lerp(green, out.green, blend);
      out.blue = lerp(blue, out.blue, blend);
    }
    const open = gap * openWindow(out.x);
    const swirl = SPIN_SENSE * out.swirl;
    const angle = this.angles[line];
    const mapped = this.look.gather
      ? gathered(angle, swirl, open)
      : avoided(wrapped(angle + swirl - SHELL_CENTRE), open);
    const spun = mapped + (this.look.gather ? CORE_CENTRE : SHELL_CENTRE);
    this.buffers.setPoint(
      line,
      point,
      out.x,
      out.r * Math.cos(spun),
      out.r * Math.sin(spun),
      travel,
      out.red,
      out.green,
      out.blue,
    );
    return mapped;
  }
}

export class DustStream {
  readonly root: Group;
  private readonly buffers: RibbonBuffers;
  private readonly uniforms: RibbonUniforms;
  private phase = 0;

  constructor(context: PartContext, parent: Group) {
    this.root = namedGroup('dust', parent);
    this.buffers = new RibbonBuffers(DUST.lines, DUST.points);
    this.uniforms = ribbonUniforms(DUST.spacing, context.heat, 0);
    this.uniforms.uBase.value = 0.5;
    this.uniforms.uWidth.value = DUST.width;
    this.fill();
    this.root.add(ribbonMesh(context, UNDIMMED_GROUP, this.buffers, this.uniforms, 'dustLines'));
    this.root.visible = false;
  }

  update(frame: StreamFrame, fanSpeed: number): void {
    const strength = smoothstep(fanSpeed, DUST.threshold, DUST.full);
    this.root.visible = strength > 0;
    if (strength === 0) return;
    if (frame.playing) {
      this.phase = (this.phase + frame.deltaSeconds * DUST.speed * (0.5 + fanSpeed)) % DUST.spacing;
    }
    this.uniforms.uPhase.value = this.phase;
    this.uniforms.uAlpha.value = DUST.alpha * strength;
  }

  private fill(): void {
    const next = random(DUST.seed);
    const [red, green, blue] = LOOK.additive ? DUST.colourDark : DUST.colourLight;
    const floor = -AXIS_HEIGHT_M + DUST.floorDrop;
    const last = new Vector3();
    const here = new Vector3();
    for (let line = 0; line < DUST.lines; line += 1) {
      const z = lerp(DUST.zFrom, DUST.zTo, next());
      const lift = next() * DUST.rise;
      const sway = (next() * 2 - 1) * 0.3;
      this.buffers.fillLineData(line, next(), lerp(0.7, 1.4, next()), lerp(0.5, 1, next()));
      let travel = 0;
      for (let point = 0; point < DUST.points; point += 1) {
        const t = point / (DUST.points - 1);
        const y = lerp(floor + lift * (1 - t), DUST.toY, t * t * (3 - 2 * t));
        const bent = z * (1 - t * 0.8) + Math.sin(t * 9 + line) * sway * (1 - t);
        here.set(lerp(DUST.fromX, DUST.toX, t), y, bent);
        if (point > 0) travel += here.distanceTo(last);
        last.copy(here);
        this.buffers.setPoint(line, point, here.x, here.y, here.z, travel, red, green, blue);
      }
      this.buffers.finishLine(line);
    }
    this.buffers.touch();
  }
}
