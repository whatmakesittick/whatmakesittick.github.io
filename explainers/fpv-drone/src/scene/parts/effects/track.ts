import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  ShaderMaterial,
} from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { FlightReading } from '../../../ids';
import { THEME } from '../../../theme';
import { TRACK } from '../../constants';
import { TrailSamples } from '../../geometry/trail';
import type { TrailSample } from '../../geometry/trail';
import { registered } from '../context';
import type { PartContext } from '../context';

const VERTEX = /* glsl */ `
attribute float aAge;
attribute float aSide;
varying float vAge;
varying float vSide;
void main() {
  vAge = aAge;
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform float uFade;
uniform float uFloor;
varying float vAge;
varying float vSide;
void main() {
  float trail = uFloor + (1.0 - uFloor) * exp(-vAge / uFade);
  float edge = 1.0 - vSide * vSide;
  gl_FragColor = vec4(uColour, uOpacity * trail * edge);
  #include <colorspace_fragment>
}
`;

const XYZ = 3;
const VERTICES_PER_SAMPLE = 2;
const SIDES = [-1, 1] as const;

export class TrackEffect {
  readonly mesh: Mesh;
  private readonly samples = new TrailSamples(TRACK.step, TRACK.capacity, TRACK.maxGap);
  private readonly geometry = new BufferGeometry();
  private readonly positions: Float32Array;
  private readonly ages: Float32Array;

  constructor(context: PartContext) {
    const vertices = (TRACK.capacity + 1) * VERTICES_PER_SAMPLE;
    this.positions = new Float32Array(vertices * XYZ);
    this.ages = new Float32Array(vertices);
    const sides = new Float32Array(vertices);
    const indices: number[] = [];
    for (let vertex = 0; vertex < vertices; vertex += 1) sides[vertex] = SIDES[vertex % 2];
    for (let sample = 0; sample < TRACK.capacity; sample += 1) {
      const a = sample * VERTICES_PER_SAMPLE;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const position = new BufferAttribute(this.positions, XYZ);
    position.setUsage(DynamicDrawUsage);
    const age = new BufferAttribute(this.ages, 1);
    age.setUsage(DynamicDrawUsage);
    this.geometry.setAttribute('position', position);
    this.geometry.setAttribute('aAge', age);
    this.geometry.setAttribute('aSide', new BufferAttribute(sides, 1));
    this.geometry.setIndex(indices);
    this.geometry.setDrawRange(0, 0);
    context.tracker.track(this.geometry);
    const material = registered(
      context,
      STRUCTURE_GROUP,
      new ShaderMaterial({
        uniforms: {
          uColour: { value: new Color(THEME.transit) },
          uOpacity: { value: TRACK.opacity },
          uFade: { value: TRACK.fadeSeconds },
          uFloor: { value: TRACK.floor },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
    );
    this.mesh = new Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
  }

  setState(phase: number, flight: FlightReading, shown: boolean): void {
    const head: TrailSample = { point: flight.position, heading: flight.heading };
    this.samples.record(phase, head);
    const run = this.samples.run(phase);
    const count = run.to - run.from;
    this.mesh.visible = shown && count > 0;
    if (!this.mesh.visible) return;
    for (let slot = run.from; slot < run.to; slot += 1) {
      const sample = this.samples.sampleAt(slot);
      if (sample) this.writeSample(slot - run.from, sample, (run.to - slot) * TRACK.step);
    }
    this.writeSample(count, head, 0);
    this.geometry.setDrawRange(0, count * 6);
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('aAge').needsUpdate = true;
  }

  private writeSample(index: number, sample: TrailSample, age: number): void {
    const across = [-Math.sin(sample.heading), Math.cos(sample.heading)];
    SIDES.forEach((side, offset) => {
      const vertex = index * VERTICES_PER_SAMPLE + offset;
      this.positions.set(
        [
          sample.point[0] + (across[0] * side * TRACK.width) / 2,
          sample.point[1] - TRACK.drop,
          sample.point[2] + (across[1] * side * TRACK.width) / 2,
        ],
        vertex * XYZ,
      );
      this.ages[vertex] = age;
    });
  }
}
