import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  CapsuleGeometry,
  CatmullRomCurve3,
  Color,
  LineBasicMaterial,
  LineSegments,
  BufferGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { InstancedMesh, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FULL_TURN } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import {
  MUCUS,
  NEURON_BOTTOM_Y,
  RECEPTOR_GRID,
  RECEPTOR_PLANE_Y,
  receptorCell,
} from '../../../model/layout';
import { RECEPTOR_TYPES } from '../../../model/receptorCodes';
import { THEME } from '../../../theme';
import { DETAIL, LOOK } from '../../constants';
import { addMesh, instanced, label, registeredMaterial } from '../context';
import type { PartContext } from '../context';

const HALF = 0.5;
const RGB = 3;
const CELL = { radius: 1.05, length: 1.5, knob: 0.62, knobLift: 0.35 } as const;
const CILIA = { count: 6, length: 2.2, spread: 1.3 } as const;
const AXON = { radius: 0.2, segments: 14, radial: 5, bundles: 4, bundleSpread: 7 } as const;
const MUCUS_MARGIN = 2;
const GLOW = { size: 7, pulseSize: 2.2, pulseRate: 0.9, pulseStagger: 0.37 } as const;

export const CELL_TOP_Y = RECEPTOR_PLANE_Y + CELL.knobLift + CELL.knob;

const CELL_BODY_Y = RECEPTOR_PLANE_Y - CELL.length * HALF - CELL.radius;

export class ReceptorGrid {
  private readonly bodies: InstancedMesh;
  private readonly knobs: InstancedMesh;
  private readonly cilia: BufferAttribute;
  private readonly axonColours: BufferAttribute;
  private readonly axonCurves: CatmullRomCurve3[] = [];
  private readonly axonVertices: number;
  private readonly glow: PointCloud;
  private readonly pulses: PointCloud;
  private readonly off = new Color(LOOK.receptorOff);
  private readonly on = new Color(THEME.firing);
  private readonly rest = new Color(LOOK.neuron);
  private readonly colour = new Color();
  private readonly point = new Vector3();
  private readonly painted: number[] = Array.from({ length: RECEPTOR_TYPES }, () => Number.NaN);

  constructor(context: PartContext, parent: Object3D) {
    const body = new CapsuleGeometry(CELL.radius, CELL.length, 6, 14);
    this.bodies = instanced(
      context,
      parent,
      context.tracker.track(body),
      'receptors',
      'receptor',
      RECEPTOR_TYPES,
    );
    const knob = new SphereGeometry(CELL.knob, ...DETAIL.smallSphere);
    this.knobs = instanced(
      context,
      parent,
      context.tracker.track(knob),
      'receptors',
      'receptor',
      RECEPTOR_TYPES,
    );
    const matrix = new Matrix4();
    const turn = new Quaternion();
    const unit = new Vector3(1, 1, 1);
    for (let index = 0; index < RECEPTOR_TYPES; index += 1) {
      const [x, , z] = receptorCell(index);
      matrix.compose(new Vector3(x, CELL_BODY_Y, z), turn, unit);
      this.bodies.setMatrixAt(index, matrix);
      matrix.compose(new Vector3(x, RECEPTOR_PLANE_Y + CELL.knobLift, z), turn, unit);
      this.knobs.setMatrixAt(index, matrix);
      this.bodies.setColorAt(index, this.off);
      this.knobs.setColorAt(index, this.off);
    }
    this.bodies.count = RECEPTOR_TYPES;
    this.knobs.count = RECEPTOR_TYPES;
    label(context, 'receptors', this.knobs, receptorCell(RECEPTOR_GRID.columns - 1));
    this.cilia = this.buildCilia(context, parent);
    const axons = this.buildAxons(context, parent);
    this.axonColours = axons.colours;
    this.axonVertices = axons.perCell;
    this.buildMucus(context, parent);
    const glowMaterial = registeredMaterial(
      context,
      'receptors',
      createPointMaterial(context.textures.glow, GLOW.size, AdditiveBlending),
    );
    this.glow = new PointCloud(RECEPTOR_TYPES, glowMaterial);
    const pulseMaterial = registeredMaterial(
      context,
      'neuron',
      createPointMaterial(context.textures.glow, GLOW.pulseSize, AdditiveBlending),
    );
    this.pulses = new PointCloud(RECEPTOR_TYPES, pulseMaterial);
    context.tracker.track(this.glow);
    context.tracker.track(this.pulses);
    parent.add(this.glow.points, this.pulses.points);
    for (let index = 0; index < RECEPTOR_TYPES; index += 1) {
      const [x, , z] = receptorCell(index);
      this.glow.setPoint(index, x, RECEPTOR_PLANE_Y + CELL.knobLift, z);
    }
  }

  draw(activation: readonly number[], seconds: number): void {
    let repainted = false;
    for (let index = 0; index < RECEPTOR_TYPES; index += 1) {
      const level = activation[index] ?? 0;
      if (level !== this.painted[index]) {
        this.paint(index, level);
        repainted = true;
      }
      this.pulse(index, level, seconds);
    }
    if (repainted) this.commitColours();
    this.pulses.commit();
  }

  private paint(index: number, level: number): void {
    this.painted[index] = level;
    this.colour.copy(this.off).lerp(this.on, level);
    this.bodies.setColorAt(index, this.colour);
    this.knobs.setColorAt(index, this.colour);
    this.glow.setColor(index, this.on.r, this.on.g, this.on.b, level);
    const ciliaVertices = CILIA.count * 2;
    for (let vertex = 0; vertex < ciliaVertices; vertex += 1) {
      this.cilia.setXYZ(
        index * ciliaVertices + vertex,
        this.colour.r,
        this.colour.g,
        this.colour.b,
      );
    }
    const axonColour = this.colour.copy(this.rest).lerp(this.on, level);
    for (let vertex = 0; vertex < this.axonVertices; vertex += 1) {
      this.axonColours.setXYZ(
        index * this.axonVertices + vertex,
        axonColour.r,
        axonColour.g,
        axonColour.b,
      );
    }
  }

  private pulse(index: number, level: number, seconds: number): void {
    const cycle = seconds * GLOW.pulseRate + index * GLOW.pulseStagger;
    const travel = cycle - Math.floor(cycle);
    this.axonCurves[index].getPointAt(travel, this.point);
    this.pulses.setPoint(index, this.point.x, this.point.y, this.point.z);
    this.pulses.setColor(
      index,
      this.on.r,
      this.on.g,
      this.on.b,
      level * Math.sin(Math.PI * travel),
    );
  }

  private commitColours(): void {
    if (this.bodies.instanceColor) this.bodies.instanceColor.needsUpdate = true;
    if (this.knobs.instanceColor) this.knobs.instanceColor.needsUpdate = true;
    this.cilia.needsUpdate = true;
    this.axonColours.needsUpdate = true;
    this.glow.commit();
  }

  private buildCilia(context: PartContext, parent: Object3D): BufferAttribute {
    const positions: number[] = [];
    for (let index = 0; index < RECEPTOR_TYPES; index += 1) {
      const [x, , z] = receptorCell(index);
      const base = RECEPTOR_PLANE_Y + CELL.knobLift + CELL.knob * HALF;
      for (let hair = 0; hair < CILIA.count; hair += 1) {
        const angle = (hair / CILIA.count) * FULL_TURN + index;
        positions.push(
          x,
          base,
          z,
          x + Math.cos(angle) * CILIA.spread,
          base + CILIA.length,
          z + Math.sin(angle) * CILIA.spread,
        );
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), RGB));
    const colours = new BufferAttribute(new Float32Array(positions.length), RGB);
    geometry.setAttribute('color', colours);
    const lines = new LineSegments(
      context.tracker.track(geometry),
      registeredMaterial(context, 'receptors', new LineBasicMaterial({ vertexColors: true })),
    );
    lines.name = 'cilia';
    parent.add(lines);
    return colours;
  }

  private buildAxons(
    context: PartContext,
    parent: Object3D,
  ): { colours: BufferAttribute; perCell: number } {
    const tubes = Array.from({ length: RECEPTOR_TYPES }, (_, index) => {
      const [x, , z] = receptorCell(index);
      const bundle = Math.floor(
        ((x + RECEPTOR_GRID.columns * RECEPTOR_GRID.spacing * HALF) /
          (RECEPTOR_GRID.columns * RECEPTOR_GRID.spacing)) *
          AXON.bundles,
      );
      const bundleX = (bundle - (AXON.bundles - 1) * HALF) * AXON.bundleSpread;
      const curve = new CatmullRomCurve3([
        new Vector3(x, CELL_BODY_Y - CELL.length * HALF - CELL.radius * HALF, z),
        new Vector3(x * 0.8 + bundleX * 0.2, CELL_BODY_Y - 3, z * 0.6),
        new Vector3(bundleX, NEURON_BOTTOM_Y, z * 0.15),
      ]);
      this.axonCurves.push(curve);
      return new TubeGeometry(curve, AXON.segments, AXON.radius, AXON.radial, false);
    });
    const perCell = tubes[0].getAttribute('position').count;
    const merged = mergeGeometries(tubes);
    tubes.forEach((tube) => tube.dispose());
    const colours = new BufferAttribute(new Float32Array(perCell * RECEPTOR_TYPES * RGB), RGB);
    merged.setAttribute('color', colours);
    const mesh = addMesh(context, parent, merged, 'neuron', 'neuronLit');
    label(context, 'neuron', mesh, [receptorCell(0)[0] - 1, NEURON_BOTTOM_Y + 2.5, 0]);
    return { colours, perCell };
  }

  private buildMucus(context: PartContext, parent: Object3D): void {
    const first = receptorCell(0);
    const last = receptorCell(RECEPTOR_TYPES - 1);
    const width = last[0] - first[0] + RECEPTOR_GRID.spacing + MUCUS_MARGIN;
    const depth = last[2] - first[2] + RECEPTOR_GRID.spacing + MUCUS_MARGIN;
    const height = MUCUS.y[1] - MUCUS.y[0];
    const slab = new BoxGeometry(width, height, depth, 1, 1, 1);
    slab.translate(0, (MUCUS.y[0] + MUCUS.y[1]) * HALF, 0);
    const mesh = addMesh(context, parent, slab, 'mucus', 'mucus');
    mesh.renderOrder = 2;
    label(context, 'mucus', mesh, [width * HALF, MUCUS.y[1], depth * 0.2]);
  }
}
