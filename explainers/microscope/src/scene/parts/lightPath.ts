import { AdditiveBlending, Color, Group, SRGBColorSpace } from 'three';
import type { PointsMaterial } from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { createPointMaterial, PointCloud } from '@core/scene/pointCloud';
import { axialPosition, lateralAt, lightRays, spectralColor, stationBounds } from '../../model';
import type { LightRays, OpticalLayout, Ray, RayPoint, StationBounds } from '../../model';
import { PULSE, RAYS, RAY_LATERAL_TO_Z, RENDER_ORDER } from '../constants';
import type { PartContext } from './context';

type RaySetId = 'lit' | 'blocked' | 'virtual';

interface RaySet {
  line: LineSegments2;
  material: LineMaterial;
}

interface Trace {
  rays: LightRays;
  bounds: StationBounds;
  pulsed: readonly Ray[];
}

interface RayStyle {
  width: number;
  opacity: number;
  dashed: boolean;
}

const RAY_STYLES: Record<RaySetId, RayStyle> = {
  lit: { width: RAYS.width, opacity: RAYS.litOpacity, dashed: false },
  blocked: { width: RAYS.blockedWidth, opacity: RAYS.blockedOpacity, dashed: false },
  virtual: { width: RAYS.virtualWidth, opacity: RAYS.virtualOpacity, dashed: true },
};

const PULSE_WHITENING = 0.35;
const WHITE = new Color(1, 1, 1);

function scenePoint(point: RayPoint): [number, number, number] {
  return [0, point.axial, point.lateral * RAY_LATERAL_TO_Z];
}

function traceOf(layout: OpticalLayout): Trace {
  const rays = lightRays(layout);
  return {
    rays,
    bounds: stationBounds(layout),
    pulsed: [...rays.illumination, ...rays.blocked, ...rays.image],
  };
}

function segmentPositions(rays: readonly Ray[]): number[] {
  return rays.flatMap((ray) =>
    ray.slice(1).flatMap((point, index) => [...scenePoint(ray[index]), ...scenePoint(point)]),
  );
}

function raySet(context: PartContext, style: RayStyle): RaySet {
  const material = context.tracker.track(
    new LineMaterial({
      linewidth: style.width,
      transparent: true,
      opacity: style.opacity,
      depthWrite: false,
      dashed: style.dashed,
      dashSize: RAYS.dash,
      gapSize: RAYS.gap,
    }),
  );
  const line = new LineSegments2(context.tracker.track(new LineSegmentsGeometry()), material);
  line.renderOrder = RENDER_ORDER.rays;
  return { line, material };
}

export class LightPathPart {
  readonly object = new Group();
  private readonly sets: Record<RaySetId, RaySet>;
  private readonly pulse: PointCloud;
  private readonly pulseMaterial: PointsMaterial;
  private readonly rayColor = new Color();
  private readonly pulseColor = new Color();
  private trace: Trace;

  constructor(context: PartContext, layout: OpticalLayout) {
    this.sets = {
      lit: raySet(context, RAY_STYLES.lit),
      blocked: raySet(context, RAY_STYLES.blocked),
      virtual: raySet(context, RAY_STYLES.virtual),
    };
    this.trace = traceOf(layout);
    this.pulseMaterial = context.tracker.track(
      createPointMaterial(context.textures.glow, 1, AdditiveBlending),
    );
    this.pulse = context.tracker.track(
      new PointCloud(
        this.trace.pulsed.length * PULSE.trail,
        this.pulseMaterial,
        RENDER_ORDER.pulse,
      ),
    );
    Object.values(this.sets).forEach((set) => this.object.add(set.line));
    this.object.add(this.pulse.points);
    this.drawRays();
  }

  setLayout(layout: OpticalLayout): void {
    this.trace = traceOf(layout);
    this.drawRays();
  }

  setWavelength(wavelength: number): void {
    this.rayColor.setRGB(...spectralColor(wavelength), SRGBColorSpace);
    this.pulseColor.copy(this.rayColor).lerp(WHITE, PULSE_WHITENING);
    Object.values(this.sets).forEach((set) => set.material.color.copy(this.rayColor));
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  update(position: number, cameraDistance: number): void {
    if (!this.object.visible) return;
    this.pulseMaterial.size = cameraDistance * PULSE.sizePerDistance;
    let index = 0;
    for (const ray of this.trace.pulsed) {
      for (let step = 0; step < PULSE.trail; step++) {
        this.placePulse(index++, ray, position - step * PULSE.spacing, PULSE.fade ** step);
      }
    }
    this.pulse.commit();
  }

  private placePulse(index: number, ray: Ray, position: number, brightness: number): void {
    const axial = axialPosition(position, this.trace.bounds);
    const lateral = position < 0 ? null : lateralAt(ray, axial);
    if (lateral === null) {
      this.pulse.setColor(index, 0, 0, 0, 0);
      return;
    }
    const { r, g, b } = this.pulseColor;
    this.pulse.setPoint(index, 0, axial, lateral * RAY_LATERAL_TO_Z);
    this.pulse.setColor(index, r, g, b, brightness);
  }

  private drawRays(): void {
    const { rays } = this.trace;
    this.setRays('lit', [...rays.illumination, ...rays.image]);
    this.setRays('blocked', rays.blocked);
    this.setRays('virtual', rays.virtual);
  }

  private setRays(id: RaySetId, rays: readonly Ray[]): void {
    const { line } = this.sets[id];
    line.geometry.setPositions(segmentPositions(rays));
    if (RAY_STYLES[id].dashed) line.computeLineDistances();
  }
}
