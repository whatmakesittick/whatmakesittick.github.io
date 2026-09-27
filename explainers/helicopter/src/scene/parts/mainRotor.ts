import { BoxGeometry, CylinderGeometry, Group, Object3D, SphereGeometry, Vector3 } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import { toRadians } from '@core/math';
import { bladeGeometry } from '@core/scene/geometry/airfoil';
import { CYCLIC_PITCH_DEGREES, ROTOR, bladeAzimuth, bladeFlap, bladePitch } from '../../model';
import { HUB, MAIN_BLADE, MAST, PITCH_LINK, SWASHPLATE } from '../constants';
import { unitRod, verticalCylinder } from '../geometry/primitives';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface RotorPose {
  azimuth: number;
  collective: number;
  forward: number;
}

export interface MainRotorAnchors {
  mainRotor: Object3D;
  markedBlade: Object3D;
  swashplate: Object3D;
}

interface Blade {
  flap: Group;
  pitch: Group;
  hornTip: Object3D;
}

interface PitchLink {
  mesh: Mesh;
  lug: Object3D;
  hornTip: Object3D;
}

const MARKED_BLADE = 0;
const LINK_SEGMENTS = 8;
const LUG_SEGMENTS = 10;
const GRIP_START_SHARE = 0.6;
const GRIP_OVERLAP = 0.1;
const HORN_WIDTH = 0.05;
const HORN_HEIGHT = 0.03;
const BLADE_SPACING = (Math.PI * 2) / ROTOR.bladeCount;
const HORN_ANGLE = Math.atan2(PITCH_LINK.hornLead, PITCH_LINK.hornSpan);
const UP = new Vector3(0, 1, 0);
const bottom = new Vector3();
const top = new Vector3();
const direction = new Vector3();

function gripGeometry(): BufferGeometry {
  const start = HUB.radius * GRIP_START_SHARE;
  const end = MAIN_BLADE.root + GRIP_OVERLAP;
  const geometry = new CylinderGeometry(HUB.gripRadius, HUB.gripRadius, end - start, LUG_SEGMENTS);
  geometry.rotateZ(Math.PI / 2);
  geometry.translate((start + end) / 2, 0, 0);
  return geometry;
}

function hornGeometry(): BufferGeometry {
  const geometry = new BoxGeometry(HORN_WIDTH, HORN_HEIGHT, PITCH_LINK.hornLead);
  geometry.translate(PITCH_LINK.hornSpan, 0, -PITCH_LINK.hornLead / 2);
  return geometry;
}

function swashplateHeight(collective: number): number {
  return SWASHPLATE.lowest - HUB.height + SWASHPLATE.travel * collective;
}

function swashplateTilt(forward: number): number {
  return toRadians(SWASHPLATE.tiltPerCyclicDegree * CYCLIC_PITCH_DEGREES * forward);
}

export class MainRotor {
  readonly object = new Group();
  readonly anchors: MainRotorAnchors;
  private readonly spin = new Group();
  private readonly swashplate = new Group();
  private readonly swashplateRotor = new Group();
  private readonly blades: Blade[];
  private readonly links: PitchLink[];

  constructor(context: PartContext) {
    this.object.position.y = HUB.height;
    this.object.add(this.createMast(context), this.swashplate, this.spin);
    this.buildSwashplate(context);
    this.buildHub(context);
    this.blades = this.buildBlades(context);
    const lugs = this.buildLugs(context);
    this.links = this.buildLinks(context, lugs);
    this.anchors = this.createAnchors();
  }

  setPose({ azimuth, collective, forward }: RotorPose): void {
    const spin = toRadians(azimuth) + Math.PI;
    this.spin.rotation.y = spin;
    this.swashplateRotor.rotation.y = spin;
    this.swashplate.position.y = swashplateHeight(collective);
    this.swashplate.rotation.z = -swashplateTilt(forward);
    this.blades.forEach((blade, index) => {
      const bladeAngle = bladeAzimuth(azimuth, index);
      blade.flap.rotation.z = toRadians(bladeFlap(bladeAngle, collective, forward));
      blade.pitch.rotation.x = toRadians(bladePitch(bladeAngle, collective, forward));
    });
    this.fitLinks();
  }

  private createMast(context: PartContext): Mesh {
    const geometry = verticalCylinder(MAST.radius, MAST.bottom - HUB.height, 0);
    return partMesh(context, geometry, 'mainRotor', 'forged');
  }

  private buildSwashplate(context: PartContext): void {
    const lower = verticalCylinder(SWASHPLATE.radius, -SWASHPLATE.ringHeight, 0);
    const upper = verticalCylinder(
      SWASHPLATE.radius - SWASHPLATE.ringGap,
      SWASHPLATE.ringGap,
      SWASHPLATE.ringGap + SWASHPLATE.ringHeight,
    );
    this.swashplate.add(partMesh(context, lower, 'swashplate', 'darkSteel'), this.swashplateRotor);
    this.swashplateRotor.add(partMesh(context, upper, 'swashplate', 'polished'));
  }

  private buildHub(context: PartContext): void {
    const half = HUB.thickness / 2;
    this.spin.add(
      partMesh(context, verticalCylinder(HUB.radius, -half, half), 'mainRotor', 'polished'),
      partMesh(
        context,
        verticalCylinder(HUB.capRadius, half, half + HUB.capHeight),
        'mainRotor',
        'forged',
      ),
    );
  }

  private buildBlades(context: PartContext): Blade[] {
    const section = { chord: MAIN_BLADE.chord, thickness: MAIN_BLADE.thickness };
    const stripeStart = ROTOR.radiusMetres - MAIN_BLADE.tipStripe;
    const span = bladeGeometry(section, MAIN_BLADE.root, stripeStart);
    const tip = bladeGeometry(section, stripeStart, ROTOR.radiusMetres);
    const grip = gripGeometry();
    const horn = hornGeometry();
    return Array.from({ length: ROTOR.bladeCount }, (_, index) => {
      const arm = new Group();
      arm.rotation.y = index * BLADE_SPACING;
      const flap = new Group();
      const pitch = new Group();
      const hornTip = new Object3D();
      hornTip.position.set(PITCH_LINK.hornSpan, 0, -PITCH_LINK.hornLead);
      const marked = index === MARKED_BLADE;
      pitch.add(
        partMesh(context, grip, 'mainRotor', 'forged'),
        partMesh(context, horn, 'mainRotor', 'forged'),
        partMesh(context, span, 'mainRotor', 'blade'),
        partMesh(
          context,
          tip,
          marked ? 'markedBlade' : 'mainRotor',
          marked ? 'paint' : 'tipStripe',
        ),
        hornTip,
      );
      flap.add(pitch);
      arm.add(flap);
      this.spin.add(arm);
      return { flap, pitch, hornTip };
    });
  }

  private buildLugs(context: PartContext): Object3D[] {
    const lug = new SphereGeometry(SWASHPLATE.lugRadius, LUG_SEGMENTS, LUG_SEGMENTS);
    const height = SWASHPLATE.ringGap + SWASHPLATE.ringHeight;
    return this.blades.map((_, index) => {
      const angle = index * BLADE_SPACING + HORN_ANGLE;
      const mesh = partMesh(context, lug, 'swashplate', 'forged');
      mesh.position.set(
        SWASHPLATE.radius * Math.cos(angle),
        height,
        -SWASHPLATE.radius * Math.sin(angle),
      );
      this.swashplateRotor.add(mesh);
      return mesh;
    });
  }

  private buildLinks(context: PartContext, lugs: Object3D[]): PitchLink[] {
    const rod = unitRod(PITCH_LINK.radius, LINK_SEGMENTS);
    return this.blades.map((blade, index) => {
      const mesh = partMesh(context, rod, 'swashplate', 'forged');
      this.object.add(mesh);
      return { mesh, lug: lugs[index], hornTip: blade.hornTip };
    });
  }

  private createAnchors(): MainRotorAnchors {
    const mainRotor = new Object3D();
    mainRotor.position.y = HUB.thickness / 2 + HUB.capHeight;
    this.object.add(mainRotor);
    const swashplate = new Object3D();
    swashplate.position.z = -SWASHPLATE.radius;
    this.swashplate.add(swashplate);
    const markedBlade = new Object3D();
    markedBlade.position.x = ROTOR.radiusMetres - MAIN_BLADE.tipStripe / 2;
    this.blades[MARKED_BLADE].pitch.add(markedBlade);
    return { mainRotor, markedBlade, swashplate };
  }

  private fitLinks(): void {
    this.object.updateWorldMatrix(true, true);
    this.links.forEach(({ mesh, lug, hornTip }) => {
      this.object.worldToLocal(lug.getWorldPosition(bottom));
      this.object.worldToLocal(hornTip.getWorldPosition(top));
      direction.subVectors(top, bottom);
      const length = direction.length();
      mesh.position.copy(bottom);
      mesh.quaternion.setFromUnitVectors(UP, direction.divideScalar(length));
      mesh.scale.set(1, length, 1);
    });
  }
}
