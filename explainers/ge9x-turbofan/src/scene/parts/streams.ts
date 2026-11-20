import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { Group, Object3D, WebGLRenderer } from 'three';
import { FULL_TURN, clamp, lerp, smoothstep, toRadians } from '@core/math';
import type { PartId } from '../../ids';
import { LIP_X, SPIN_SENSE } from '../../model/scale';
import { CUT, LOOK, STREAMS } from '../constants';
import type { StreamTable } from '../geometry/streamPaths';
import { radiusAtX } from '../geometry/streamPaths';
import type { PartContext } from './context';
import { label, namedGroup, polar, registered } from './context';
import { createStreakUniforms, streakMaterial } from './effects';
import type { StreakUniforms } from './effects';

const QUAD_CORNERS = [0, -1, 1, -1, 1, 1, 0, 1];
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];
const XYZ = 3;
const RGBA = 4;
const HALF_TURN = Math.PI;
const QUARTER_TURN = Math.PI / 2;

export interface StreamLook {
  readonly part: Extract<PartId, 'coldStream' | 'hotStream'>;
  readonly buffer: number;
  readonly width: number;
  readonly length: number;
  readonly alpha: number;
  readonly speed: number;
  readonly marker: string;
  readonly gather: boolean;
  readonly reversedAlpha: number;
}

export interface StreamFrame {
  readonly playing: boolean;
  readonly deltaSeconds: number;
  readonly speed: number;
  readonly blend: number;
  readonly gap: number;
  readonly count: number;
  readonly markerX: number;
}

function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function cutWindow(x: number): number {
  return (
    smoothstep(x, LIP_X - STREAMS.cutFade, LIP_X) *
    (1 - smoothstep(x, STREAMS.cutEnd, STREAMS.cutEnd + STREAMS.cutFade))
  );
}

const CENTRE = QUARTER_TURN - CUT.centre;

function wrapped(around: number): number {
  return around - FULL_TURN * Math.floor((around + HALF_TURN) / FULL_TURN);
}

function avoided(around: number, gap: number): number {
  if (gap <= 0) return around;
  return Math.sign(around || 1) * (gap + (Math.abs(around) * (HALF_TURN - gap)) / HALF_TURN);
}

function gathered(angle: number, swirl: number, gap: number): number {
  const free = wrapped(angle + swirl - CENTRE);
  if (gap <= 0) return free;
  const inside =
    wrapped(angle - CENTRE) * ((gap * STREAMS.gatherShare) / HALF_TURN) +
    Math.sin(swirl) * gap * STREAMS.gatherDrift;
  return lerp(free, inside, Math.min(1, gap / CUT.coreHalfAngle));
}

interface Sample {
  mapped: number;
  x: number;
  r: number;
  swirl: number;
  speed: number;
  red: number;
  green: number;
  blue: number;
}

function sampleTable(table: StreamTable, along: number, share: number, target: Sample): Sample {
  const scaled = clamp(along, 0, 1) * (table.samples - 1);
  const index = Math.min(table.samples - 2, Math.floor(scaled));
  const f = scaled - index;
  const next = index + 1;
  const offset = (share * 2 - 1) * lerp(table.half[index], table.half[next], f);
  target.x =
    lerp(table.x[index], table.x[next], f) + lerp(table.nx[index], table.nx[next], f) * offset;
  target.r =
    lerp(table.r[index], table.r[next], f) + lerp(table.nr[index], table.nr[next], f) * offset;
  target.swirl = lerp(table.swirl[index], table.swirl[next], f);
  target.speed = lerp(table.speed[index], table.speed[next], f);
  target.red = lerp(table.colour[index * 3], table.colour[next * 3], f);
  target.green = lerp(table.colour[index * 3 + 1], table.colour[next * 3 + 1], f);
  target.blue = lerp(table.colour[index * 3 + 2], table.colour[next * 3 + 2], f);
  return target;
}

export class StreakStream {
  readonly root: Group;
  readonly mesh: Mesh;
  private readonly look: StreamLook;
  private readonly tables: readonly StreamTable[];
  private readonly geometry = new InstancedBufferGeometry();
  private readonly head: InstancedBufferAttribute;
  private readonly tail: InstancedBufferAttribute;
  private readonly tint: InstancedBufferAttribute;
  private readonly along: Float32Array;
  private readonly share: Float32Array;
  private readonly angle: Float32Array;
  private readonly stretch: Float32Array;
  private readonly uniforms: StreakUniforms = createStreakUniforms();
  private readonly drawSize = new Vector2();
  private readonly first: Sample = {
    mapped: 0,
    x: 0,
    r: 0,
    swirl: 0,
    speed: 0,
    red: 0,
    green: 0,
    blue: 0,
  };
  private readonly second: Sample = {
    mapped: 0,
    x: 0,
    r: 0,
    swirl: 0,
    speed: 0,
    red: 0,
    green: 0,
    blue: 0,
  };
  private readonly point = new Vector3();

  constructor(
    context: PartContext,
    parent: Group,
    look: StreamLook,
    tables: readonly StreamTable[],
    seed: number,
  ) {
    this.look = look;
    this.tables = tables;
    this.root = namedGroup(look.part, parent);
    const next = random(seed);
    const count = look.buffer;
    this.along = Float32Array.from({ length: count }, () => next());
    this.share = Float32Array.from({ length: count }, () => next());
    this.angle = Float32Array.from({ length: count }, () => next() * FULL_TURN);
    this.stretch = Float32Array.from({ length: count }, () => lerp(0.7, 1.3, next()));
    const widths = Float32Array.from(
      { length: count },
      () => look.width * lerp(0.75, 1.25, next()),
    );
    this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(12), XYZ));
    this.geometry.setAttribute('corner', new BufferAttribute(new Float32Array(QUAD_CORNERS), 2));
    this.geometry.setIndex(QUAD_INDEX);
    this.head = new InstancedBufferAttribute(new Float32Array(count * XYZ), XYZ);
    this.tail = new InstancedBufferAttribute(new Float32Array(count * XYZ), XYZ);
    this.tint = new InstancedBufferAttribute(new Float32Array(count * RGBA), RGBA);
    this.geometry.setAttribute('head', this.head);
    this.geometry.setAttribute('tail', this.tail);
    this.geometry.setAttribute('tint', this.tint);
    this.geometry.setAttribute('width', new InstancedBufferAttribute(widths, 1));
    this.geometry.instanceCount = 0;
    const shader = registered(context, look.part, streakMaterial(this.uniforms));
    this.mesh = new Mesh(context.tracker.track(this.geometry), shader);
    this.mesh.name = `${look.part}Streaks`;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.mesh.onBeforeRender = (renderer: WebGLRenderer) => this.fitViewport(renderer);
    this.root.add(this.mesh);
  }

  update(frame: StreamFrame): void {
    const count = Math.min(frame.count, this.look.buffer);
    this.geometry.instanceCount = count;
    if (count === 0) return;
    const primary = this.tables[0];
    const step = frame.playing
      ? (frame.deltaSeconds * this.look.speed * frame.speed) / primary.length
      : 0;
    for (let index = 0; index < count; index += 1) {
      this.advance(index, step);
      this.write(index, frame);
    }
    this.head.needsUpdate = true;
    this.tail.needsUpdate = true;
    this.tint.needsUpdate = true;
  }

  private advance(index: number, step: number): void {
    if (step === 0) return;
    const here = sampleTable(this.tables[0], this.along[index], this.share[index], this.first);
    const moved = this.along[index] + step * here.speed;
    this.along[index] = moved >= 1 ? moved - 1 : moved;
  }

  private position(
    along: number,
    share: number,
    angle: number,
    frame: StreamFrame,
    out: Sample,
  ): Vector3 {
    sampleTable(this.tables[0], along, share, out);
    const alternate = this.tables[1];
    if (alternate && frame.blend > 0) {
      const { x, r, swirl, speed, red, green, blue } = out;
      sampleTable(alternate, along, share, out);
      out.x = lerp(x, out.x, frame.blend);
      out.r = lerp(r, out.r, frame.blend);
      out.swirl = lerp(swirl, out.swirl, frame.blend);
      out.speed = lerp(speed, out.speed, frame.blend);
      out.red = lerp(red, out.red, frame.blend);
      out.green = lerp(green, out.green, frame.blend);
      out.blue = lerp(blue, out.blue, frame.blend);
    }
    const gap = frame.gap * cutWindow(out.x);
    const swirl = SPIN_SENSE * out.swirl;
    const mapped = this.look.gather
      ? gathered(angle, swirl, gap)
      : avoided(wrapped(angle + swirl - CENTRE), gap);
    out.mapped = mapped;
    const spun = mapped + CENTRE;
    return this.point.set(out.x, out.r * Math.cos(spun), out.r * Math.sin(spun));
  }

  private write(index: number, frame: StreamFrame): void {
    const along = this.along[index];
    const share = this.share[index];
    const angle = this.angle[index];
    const head = this.position(along, share, angle, frame, this.first);
    this.head.setXYZ(index, head.x, head.y, head.z);
    const length =
      (this.look.length * this.stretch[index] * (0.5 + 0.5 * this.first.speed * frame.speed)) /
      this.tables[0].length;
    const tail = this.position(Math.max(0, along - length), share, angle, frame, this.second);
    const torn = Math.abs(this.first.mapped - this.second.mapped) > STREAMS.tearAngle;
    if (torn) this.tail.setXYZ(index, head.x, head.y, head.z);
    else this.tail.setXYZ(index, tail.x, tail.y, tail.z);
    const glow =
      1 +
      STREAMS.markerBoost *
        Math.exp(-(((this.first.x - frame.markerX) / STREAMS.markerReach) ** 2));
    const fadeIn =
      smoothstep(along, 0, STREAMS.fadeIn) * (1 - smoothstep(along, 1 - STREAMS.fadeOut, 1));
    const alpha = this.look.alpha * fadeIn * lerp(1, this.look.reversedAlpha, frame.blend);
    this.tint.setXYZW(
      index,
      this.first.red * glow,
      this.first.green * glow,
      this.first.blue * glow,
      alpha,
    );
  }

  private fitViewport(renderer: WebGLRenderer): void {
    renderer.getDrawingBufferSize(this.drawSize);
    this.uniforms.uViewport.value.set(this.drawSize.x / 2, this.drawSize.y / 2);
    this.uniforms.uMinPixels.value = STREAMS.minPixels * renderer.getPixelRatio();
  }
}

export class StreamMarker {
  readonly bead: Mesh;
  private readonly table: StreamTable;

  constructor(context: PartContext, parent: Group, look: StreamLook, table: StreamTable) {
    this.table = table;
    const colour = new Color(look.marker);
    const blending = LOOK.additive ? AdditiveBlending : NormalBlending;
    const beadMaterial = registered(
      context,
      look.part,
      new MeshBasicMaterial({ color: colour, toneMapped: false }),
    );
    this.bead = new Mesh(
      context.tracker.track(new SphereGeometry(STREAMS.beadRadius, 16, 12)),
      beadMaterial,
    );
    this.bead.name = `${look.part}Marker`;
    const ringMaterial = registered(
      context,
      look.part,
      new MeshBasicMaterial({
        color: colour,
        transparent: true,
        opacity: STREAMS.ringOpacity,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    const ring = new Mesh(
      context.tracker.track(new TorusGeometry(STREAMS.ringRadius, STREAMS.ringTube, 6, 40)),
      ringMaterial,
    );
    const glowMaterial = registered(
      context,
      look.part,
      new SpriteMaterial({
        map: context.textures.glow,
        color: colour,
        blending,
        depthWrite: false,
        transparent: true,
        opacity: STREAMS.glowOpacity,
      }),
    );
    const glow = new Sprite(glowMaterial);
    glow.scale.setScalar(STREAMS.glowSize);
    this.bead.add(ring, glow);
    parent.add(this.bead);
  }

  place(x: number): void {
    const radius = radiusAtX(this.table, x);
    const [px, py, pz] = polar(x, radius, toRadians(STREAMS.markerAngle));
    this.bead.position.set(px, py, pz);
  }

  get anchor(): Object3D {
    return this.bead;
  }
}

export function streamLabel(
  context: PartContext,
  stream: StreakStream,
  x: number,
  radius: number,
): void {
  label(
    context,
    stream.root.name as PartId,
    stream.root,
    polar(x, radius, toRadians(STREAMS.labelAngle)),
  );
}
