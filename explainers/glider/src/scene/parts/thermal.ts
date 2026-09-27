import { Color, CylinderGeometry, Group, Object3D } from 'three';
import type { BufferGeometry } from 'three';
import { FULL_TURN } from '@core/math';
import { createPointMaterial, PointCloud } from '@core/scene/pointCloud';
import { FIELD, THERMAL_CIRCLE, thermalAxisX } from '../../model';
import {
  AIR_TONES,
  CLOUD_BASE_Y,
  COLUMN,
  METRES_PER_UNIT,
  PARTICLES,
  RENDER_ORDER,
} from '../constants';
import { edgeFade } from '../streams';
import { partMesh } from './context';
import type { PartContext } from './context';

interface Particle {
  angle: number;
  reach: number;
  progress: number;
}

const COLUMN_TOP = CLOUD_BASE_Y;
const DRIFT_PER_UNIT = THERMAL_CIRCLE.driftPerMetre * METRES_PER_UNIT;
const LABEL_HEIGHT_SHARE = 0.55;
const RISING = new Color(AIR_TONES.rising);

function columnRadius(y: number): number {
  return COLUMN.bottomRadius + (COLUMN.topRadius - COLUMN.bottomRadius) * (y / COLUMN_TOP);
}

function axisX(y: number): number {
  return thermalAxisX(y * METRES_PER_UNIT);
}

function columnGeometry(): BufferGeometry {
  const geometry = new CylinderGeometry(
    COLUMN.topRadius,
    COLUMN.bottomRadius,
    COLUMN_TOP,
    COLUMN.radialSegments,
    COLUMN.heightSegments,
    true,
  );
  geometry.translate(0, COLUMN_TOP / 2, 0);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index++) {
    position.setX(index, position.getX(index) + DRIFT_PER_UNIT * position.getY(index));
  }
  geometry.translate(FIELD.x, 0, FIELD.z);
  geometry.computeVertexNormals();
  return geometry;
}

function seedParticle(progress: number): Particle {
  return {
    angle: Math.random() * FULL_TURN,
    reach: Math.sqrt(Math.random()) * PARTICLES.thermal.spread,
    progress,
  };
}

export class ThermalPart {
  readonly object = new Group();
  readonly anchor = new Object3D();
  private readonly air: PointCloud;
  private readonly particles: Particle[];

  constructor(context: PartContext) {
    const column = partMesh(context, columnGeometry(), 'thermal', 'column');
    column.renderOrder = RENDER_ORDER.column;
    const material = context.tracker.track(
      createPointMaterial(context.textures.dot, PARTICLES.thermal.size),
    );
    context.materials.register('thermal', material);
    this.air = context.tracker.track(
      new PointCloud(PARTICLES.thermal.count, material, RENDER_ORDER.particles),
    );
    this.particles = Array.from({ length: PARTICLES.thermal.count }, (_, index) =>
      seedParticle(index / PARTICLES.thermal.count),
    );
    const labelY = COLUMN_TOP * LABEL_HEIGHT_SHARE;
    this.anchor.position.set(axisX(labelY), labelY, FIELD.z + columnRadius(labelY));
    this.object.add(column, this.air.points, this.anchor);
  }

  setAirVisible(visible: boolean): void {
    this.air.points.visible = visible;
  }

  update(lift: number, deltaSeconds: number): void {
    if (!this.air.points.visible) return;
    const step = (lift / METRES_PER_UNIT / COLUMN_TOP) * deltaSeconds;
    this.particles.forEach((particle, index) => {
      particle.progress += step;
      if (particle.progress >= 1 || particle.progress < 0) {
        Object.assign(particle, seedParticle(particle.progress - Math.floor(particle.progress)));
      }
      this.place(index, particle);
    });
    this.air.commit();
  }

  private place(index: number, particle: Particle): void {
    const y = particle.progress * COLUMN_TOP;
    const radius = columnRadius(y) * particle.reach;
    this.air.setPoint(
      index,
      axisX(y) + radius * Math.cos(particle.angle),
      y,
      FIELD.z + radius * Math.sin(particle.angle),
    );
    const alpha = edgeFade(particle.progress, PARTICLES.thermal.fade) * PARTICLES.thermal.opacity;
    this.air.setColor(index, RISING.r, RISING.g, RISING.b, alpha);
  }
}
