import {
  Euler,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Path,
  PointLight,
  Quaternion,
  Shape,
  Vector3,
} from 'three';
import type { BufferGeometry, Material, MeshStandardMaterial, ShaderMaterial } from 'three';
import { toRadians } from '@core/math';
import { BOOSTER, BOOSTER_AXIS, NOZZLE_EXIT, THRUST_MOUNT, clusterEngines } from '../../../model';
import type { ClusterEngine, Gimbal } from '../../../model';
import { THEME } from '../../../theme';
import { BOOSTER_PARTS, GLOW, MOUNT, PLUME } from '../../constants';
import { lineStrand } from '../../geometry/profile';
import { revolveStrand } from '../../geometry/revolve';
import type { ProfilePoint } from '../../geometry/revolve';
import { notchedDisc } from '../engine/mount';
import { plumeGeometry } from '../flame/plume';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { engineCopyGeometry } from './engineCopy';

const PLUME_INSET = 3;
const LIGHT_DECAY = 2;
const RING_DEPTH = 1.2;
const RING_HEIGHT = 3;
const HOLE_STEPS = 36;

export function skirtProfile(): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  const height = BOOSTER.skirtTop - BOOSTER.baseY;
  const step = height / BOOSTER_PARTS.ringCount;
  for (let ring = 0; ring < BOOSTER_PARTS.ringCount; ring += 1) {
    const top = BOOSTER.skirtTop - ring * step;
    points.push(
      [BOOSTER.radius, top],
      [BOOSTER.radius + RING_DEPTH, top - RING_HEIGHT / 2],
      [BOOSTER.radius, top - RING_HEIGHT],
    );
  }
  points.push(
    ...lineStrand([BOOSTER.radius, BOOSTER.baseY + 20], [BOOSTER.radius - 10, BOOSTER.baseY], 2),
  );
  return points;
}

function shieldGeometry(engines: readonly ClusterEngine[]): BufferGeometry {
  const shape = new Shape();
  shape.absarc(0, 0, BOOSTER.radius - 8, 0, Math.PI * 2, false);
  for (const engine of engines) {
    const [x, , z] = engine.position;
    const hole = new Path();
    hole.absarc(
      x - BOOSTER_AXIS.x,
      -(z - BOOSTER_AXIS.z),
      THRUST_MOUNT.radius + BOOSTER_PARTS.shieldHoleMargin,
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(hole);
  }
  const geometry = new ExtrudeGeometry(shape, {
    depth: BOOSTER_PARTS.shieldThickness,
    bevelEnabled: false,
    curveSegments: HOLE_STEPS,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(BOOSTER_AXIS.x, BOOSTER.baseY, BOOSTER_AXIS.z);
  return geometry;
}

function plateGeometry(): BufferGeometry {
  const geometry = new ExtrudeGeometry(
    new Shape(notchedDisc(MOUNT.radius, MOUNT.notchCentre, MOUNT.notchRadius, 64)),
    { depth: MOUNT.top - MOUNT.bottom, bevelEnabled: false },
  );
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export class ClusterPart {
  readonly object = new Group();
  readonly light: PointLight;
  private readonly engines: ClusterEngine[];
  private readonly tilting: InstancedMesh[] = [];
  private readonly plumes: InstancedMesh;
  private readonly glow: MeshStandardMaterial;
  private readonly matrix = new Matrix4();
  private readonly offset = new Matrix4().makeTranslation(0, NOZZLE_EXIT.y + PLUME_INSET, 0);
  private readonly rotation = new Quaternion();
  private readonly euler = new Euler();
  private readonly position = new Vector3();
  private readonly unit = new Vector3(1, 1, 1);

  constructor(context: PartContext, plumeMaterial: ShaderMaterial) {
    const { finishes, materials, tracker } = context;
    this.engines = clusterEngines().filter((engine) => !engine.isModelEngine);
    const skirt = revolveStrand(skirtProfile(), { segments: BOOSTER_PARTS.skirtSegments });
    skirt.translate(BOOSTER_AXIS.x, 0, BOOSTER_AXIS.z);
    this.object.add(
      partMesh(context, skirt, 'booster', finishes.booster),
      partMesh(context, shieldGeometry(clusterEngines()), 'booster', finishes.shield),
    );
    const copy = engineCopyGeometry();
    const instanced = (geometry: BufferGeometry, material: Material) => {
      const mesh = new InstancedMesh(tracker.track(geometry), material, this.engines.length);
      this.object.add(mesh);
      return mesh;
    };
    this.tilting.push(
      instanced(copy.coat, materials.get('booster', finishes.coat)),
      instanced(copy.bellOuter, materials.get('booster', finishes.bellOuter)),
      instanced(copy.bellInner, materials.get('booster', finishes.clusterInner)),
      instanced(copy.steel, materials.get('booster', finishes.brightSteel)),
    );
    const plates = instanced(plateGeometry(), materials.get('booster', finishes.steel));
    this.engines.forEach((engine, index) => {
      this.position.set(engine.position[0], MOUNT.bottom, engine.position[2]);
      plates.setMatrixAt(index, this.matrix.compose(this.position, this.rotation, this.unit));
    });
    this.glow = materials.get('booster', finishes.clusterInner);
    this.plumes = new InstancedMesh(
      tracker.track(plumeGeometry(PLUME.clusterRadialSegments, PLUME.clusterLengthSegments)),
      plumeMaterial,
      this.engines.length,
    );
    this.plumes.frustumCulled = false;
    this.plumes.renderOrder = 2;
    this.object.add(this.plumes);
    this.light = new PointLight(THEME.flame, 0, 0, LIGHT_DECAY);
    this.light.position.set(BOOSTER_AXIS.x, -PLUME.clusterLightDepth, BOOSTER_AXIS.z);
  }

  setGimbal(gimbal: Gimbal): void {
    this.engines.forEach((engine, index) => {
      const pitch = engine.gimbals ? toRadians(gimbal.pitch) : 0;
      const yaw = engine.gimbals ? toRadians(gimbal.yaw) : 0;
      this.rotation.setFromEuler(this.euler.set(pitch, 0, yaw));
      this.position.set(engine.position[0], 0, engine.position[2]);
      this.matrix.compose(this.position, this.rotation, this.unit);
      this.tilting.forEach((mesh) => mesh.setMatrixAt(index, this.matrix));
      this.plumes.setMatrixAt(index, this.matrix.multiply(this.offset));
    });
    this.rotation.identity();
    this.tilting.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
    this.plumes.instanceMatrix.needsUpdate = true;
  }

  setFire(glow: number, brightness: number, flame: boolean): void {
    this.glow.emissiveIntensity = glow * GLOW.cluster;
    this.plumes.visible = flame && brightness > 0;
    this.light.intensity = flame ? PLUME.clusterLightIntensity * brightness : 0;
  }

  setShown(shown: boolean): void {
    this.object.visible = shown;
  }

  get shown(): boolean {
    return this.object.visible;
  }
}
