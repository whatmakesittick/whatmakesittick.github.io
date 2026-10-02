import {
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import type { BufferGeometry } from 'three';
import { FULL_TURN, smoothstep } from '@core/math';
import { MOTOR_PART_IDS } from '../../../ids';
import type { MotorPartId, SpinDirection } from '../../../ids';
import { MOTOR_POSITIONS, MOTOR_SPIN } from '../../../model/layout';
import { PROP } from '../../constants';
import { FINISHES } from '../../finishes';
import { bladeGeometry, spinSign } from '../../geometry/blade';
import { discTexture } from '../../geometry/surfaceMaps';
import { mergeParts, partMesh, registered } from '../context';
import type { PartContext } from '../context';
import { motorLevels } from './motor';

const DISC_TINT = '#9aa1aa';
const QUARTER_TURN = Math.PI / 2;
const DISC_LIFT = 0.003;

export function propName(id: MotorPartId): string {
  return `prop:${id}`;
}

function bladesGeometry(direction: SpinDirection): BufferGeometry {
  return mergeParts(
    Array.from({ length: PROP.blades }, (_, index) => {
      const blade = bladeGeometry(PROP, direction);
      blade.rotateY((index / PROP.blades) * FULL_TURN);
      return blade;
    }),
  );
}

function hubGeometry(): BufferGeometry {
  const { hub } = PROP;
  return new CylinderGeometry(hub.radius, hub.radius, hub.height, hub.segments);
}

export class PropellerPart {
  readonly object = new Group();
  readonly spinner = new Group();
  readonly sign: 1 | -1;
  private readonly disc: Mesh;
  private readonly discMaterial: MeshBasicMaterial;
  private rate = 0;

  constructor(context: PartContext, id: MotorPartId, discMap: ReturnType<typeof discTexture>) {
    const levels = motorLevels();
    const direction = MOTOR_SPIN[id];
    this.sign = spinSign(direction);
    const [x, , z] = MOTOR_POSITIONS[id];
    this.object.position.set(x, levels.bell + PROP.lift + PROP.hub.height / 2, z);
    this.spinner.name = propName(id);
    this.spinner.add(
      partMesh(context, bladesGeometry(direction), 'propellers', FINISHES.prop),
      partMesh(context, hubGeometry(), 'propellers', FINISHES.propHub),
    );
    this.discMaterial = registered(
      context,
      'propellers',
      new MeshBasicMaterial({
        color: DISC_TINT,
        map: discMap,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    const disc = context.tracker.track(new CircleGeometry(PROP.radius, PROP.discSegments));
    disc.rotateX(-QUARTER_TURN);
    disc.translate(0, DISC_LIFT, 0);
    this.disc = new Mesh(disc, this.discMaterial);
    this.disc.visible = false;
    this.object.add(this.spinner, this.disc);
  }

  setRate(rate: number): void {
    this.rate = rate;
    const blur = smoothstep(rate, PROP.blurFrom, 1);
    this.discMaterial.opacity = PROP.blurOpacity * blur;
    this.disc.visible = blur > 0;
  }

  advance(deltaSeconds: number): void {
    const turn = this.sign * PROP.spinRate * this.rate * deltaSeconds;
    this.spinner.rotation.y = (this.spinner.rotation.y + turn) % FULL_TURN;
  }
}

export class PropellerSet {
  readonly object = new Group();
  readonly parts: ReadonlyMap<MotorPartId, PropellerPart>;

  constructor(context: PartContext) {
    const discMap = context.tracker.track(discTexture(PROP.disc));
    const parts = new Map<MotorPartId, PropellerPart>();
    for (const id of MOTOR_PART_IDS) {
      const part = new PropellerPart(context, id, discMap);
      parts.set(id, part);
      this.object.add(part.object);
    }
    this.parts = parts;
  }

  setRate(rate: number): void {
    this.parts.forEach((part) => part.setRate(rate));
  }

  advance(deltaSeconds: number): void {
    this.parts.forEach((part) => part.advance(deltaSeconds));
  }

  of(id: MotorPartId): PropellerPart {
    const part = this.parts.get(id);
    if (!part) throw new Error(`No propeller for ${id}`);
    return part;
  }
}
