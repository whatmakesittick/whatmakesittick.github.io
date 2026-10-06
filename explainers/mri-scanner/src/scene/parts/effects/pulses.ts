import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { BufferGeometry, Object3D, ShaderMaterial } from 'three';
import { lerp } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import type { PartId, PhaseId, SequenceReading } from '../../../ids';
import { BODY_COIL, HEAD_COIL, ISOCENTRE, PATIENT, SLICE_THICKNESS } from '../../../model/layout';
import { registered } from '../context';
import type { PartContext } from '../context';
import { ringMaterial, slabMaterial } from './glow';
import { ECHO_RINGS, HALO, RF_RINGS, SLICE } from './looks';
import { ringWaves } from './paths';

type PulseKind = 90 | 180;

const SLICE_STEPS: readonly PhaseId[] = ['excite', 'refocus'];
const DIAGONAL = Math.SQRT1_2;
const MAX_RF_RINGS = Math.max(...Object.values(RF_RINGS.rings));

function isPulse(rf: SequenceReading['rf']): rf is PulseKind {
  return rf === 90 || rf === 180;
}

function wrap(value: number): number {
  return value - Math.floor(value);
}

export function easeToward(current: number, target: number, rate: number, delta: number): number {
  return target + (current - target) * Math.exp(-rate * delta);
}

class RingSet {
  readonly group = new Group();
  private readonly rings: {
    mesh: Mesh;
    material: ShaderMaterial;
    halo: Mesh;
    glow: ShaderMaterial;
  }[];

  constructor(
    context: PartContext,
    id: PartId,
    geometry: BufferGeometry,
    look: { colour: string; edge: number },
    count: number,
  ) {
    this.group.name = id;
    this.group.position.set(...ISOCENTRE);
    this.rings = Array.from({ length: count }, () => {
      const material = registered(context, id, ringMaterial(look.colour, look.edge));
      const glow = registered(context, id, ringMaterial(look.colour, look.edge));
      const mesh = new Mesh(geometry, material);
      const halo = new Mesh(geometry, glow);
      this.group.add(mesh, halo);
      return { mesh, material, halo, glow };
    });
  }

  place(index: number, radius: number, width: number, opacity: number): void {
    const ring = this.rings[index];
    ring.mesh.visible = opacity > 0;
    ring.halo.visible = ring.mesh.visible;
    ring.mesh.scale.set(radius, radius, width);
    ring.halo.scale.set(radius, radius, width * HALO.width);
    ring.material.uniforms.uOpacity.value = opacity;
    ring.glow.uniforms.uOpacity.value = opacity * HALO.opacity;
  }

  hideFrom(index: number): void {
    this.rings.slice(index).forEach(({ mesh, halo }) => {
      mesh.visible = false;
      halo.visible = false;
    });
  }
}

export class Pulses {
  readonly rf: RingSet;
  readonly echo: RingSet;
  readonly slab = new Group();
  readonly labels: Readonly<Record<'rfWave' | 'echoWave' | 'sliceSlab', Object3D>>;
  private readonly slabMaterials: { material: ShaderMaterial; opacity: number }[];
  private glow = 0;
  private glowTarget = 0;
  private reading: SequenceReading | null = null;
  private rfTime = 0;
  private echoTime = 0;

  constructor(context: PartContext) {
    const hoop = context.tracker.track(
      new CylinderGeometry(1, 1, 1, RF_RINGS.segments, 1, true).rotateX(Math.PI / 2),
    );
    this.rf = new RingSet(context, 'rfWave', hoop, RF_RINGS, MAX_RF_RINGS);
    this.echo = new RingSet(context, 'echoWave', hoop, ECHO_RINGS, ECHO_RINGS.rings);
    this.slab.name = 'sliceSlab';
    this.slab.position.set(...ISOCENTRE);
    this.slabMaterials = [
      { thickness: SLICE_THICKNESS, opacity: SLICE.coreOpacity },
      { thickness: SLICE.haloThickness, opacity: SLICE.haloOpacity },
    ].map(({ thickness, opacity }) => {
      const material = registered(context, 'sliceSlab', slabMaterial(SLICE.colour, SLICE.soft));
      const geometry = context.tracker.track(new BoxGeometry(SLICE.span, SLICE.span, thickness));
      this.slab.add(new Mesh(geometry, material));
      return { material, opacity };
    });
    this.slab.visible = false;
    this.labels = {
      rfWave: anchorAt(this.rf.group, BODY_COIL.radius * DIAGONAL, BODY_COIL.radius * DIAGONAL, 0),
      echoWave: anchorAt(
        this.echo.group,
        HEAD_COIL.radius * DIAGONAL,
        HEAD_COIL.radius * DIAGONAL,
        0,
      ),
      sliceSlab: anchorAt(this.slab, SLICE.span / 2, 0, 0),
    };
  }

  setState(sequence: SequenceReading): void {
    this.reading = sequence;
    this.placeRings();
    this.glowTarget = SLICE_STEPS.includes(sequence.step) ? 1 : 0;
  }

  advance(deltaSeconds: number, playing: boolean): boolean {
    const travelling = playing && (this.rf.group.visible || this.echo.group.visible);
    if (travelling) {
      this.rfTime = wrap(this.rfTime + deltaSeconds * RF_RINGS.speed);
      this.echoTime = wrap(this.echoTime + deltaSeconds * ECHO_RINGS.speed);
      this.placeRings();
    }
    return this.easeSlab(deltaSeconds) || travelling;
  }

  private easeSlab(deltaSeconds: number): boolean {
    const settled = Math.abs(this.glow - this.glowTarget) < SLICE.settle;
    this.glow = settled
      ? this.glowTarget
      : easeToward(this.glow, this.glowTarget, SLICE.easeRate, deltaSeconds);
    this.slab.visible = this.glow > 0;
    this.slabMaterials.forEach(({ material, opacity }) => {
      material.uniforms.uOpacity.value = opacity * this.glow;
    });
    return !settled;
  }

  private placeRings(): void {
    if (!this.reading) return;
    this.placeRf(this.reading.rf);
    this.placeEcho(this.reading.echo);
  }

  private placeRf(rf: SequenceReading['rf']): void {
    this.rf.group.visible = isPulse(rf);
    if (!isPulse(rf)) return;
    const count = RF_RINGS.rings[rf];
    ringWaves(this.rfTime, count).forEach(({ travel, strength }, index) =>
      this.rf.place(
        index,
        lerp(BODY_COIL.radius, RF_RINGS.innerRadius, travel),
        RF_RINGS.band[rf],
        strength * RF_RINGS.strength[rf],
      ),
    );
    this.rf.hideFrom(count);
  }

  private placeEcho(echo: number): void {
    this.echo.group.visible = echo > 0;
    if (!this.echo.group.visible) return;
    ringWaves(this.echoTime, ECHO_RINGS.rings).forEach(({ travel, strength }, index) =>
      this.echo.place(
        index,
        lerp(PATIENT.headRadius + ECHO_RINGS.skinGap, HEAD_COIL.radius + ECHO_RINGS.reach, travel),
        ECHO_RINGS.band * (1 + echo) * HEAD_COIL.length,
        strength * lerp(ECHO_RINGS.floor, 1, Math.min(echo, 1)),
      ),
    );
  }
}
