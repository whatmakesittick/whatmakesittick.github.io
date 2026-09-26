import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  LatheGeometry,
  Object3D,
  Sprite,
  SpriteMaterial,
  Vector2,
} from 'three';
import type { BufferGeometry, Texture } from 'three';
import { RADIAL_SEGMENTS, RENDER_ORDER, SPARK_PLUG } from '../constants';
import { createFinish } from '../finishes';
import { withCreasedNormals } from '../geometry/prism';
import { verticalCylinder } from '../geometry/primitives';
import { sharedMesh } from './context';
import type { PartContext } from './context';

export interface SparkPlugPart {
  object: Group;
  labelAnchor: Object3D;
  setSpark(intensity: number): void;
}

const SPARK_COLOR = new Color('#cfe6ff');
const SPARK_EMISSIVE_GAIN = 6;
const HEX_SIDES = 6;
const GROUND_ARM_DEPTH = 0.6;
const GROUND_ARM_OFFSET = 3.2;
const CENTER_ELECTRODE_LENGTH = 1.4;

function insulatorProfile(): Vector2[] {
  const { hexTop, insulatorTop, insulatorRadius, ribCount, ribDepth } = SPARK_PLUG;
  const ribPitch = (insulatorTop - hexTop) / (ribCount * 2 + 1);
  const points = [new Vector2(0, hexTop), new Vector2(insulatorRadius, hexTop)];
  for (let rib = 0; rib < ribCount * 2 + 1; rib++) {
    const radius = rib % 2 === 1 ? insulatorRadius - ribDepth : insulatorRadius;
    points.push(
      new Vector2(radius, hexTop + ribPitch * rib),
      new Vector2(radius, hexTop + ribPitch * (rib + 1)),
    );
  }
  points.push(new Vector2(0, insulatorTop));
  return points;
}

interface PlugGeometries {
  shell: BufferGeometry;
  hex: BufferGeometry;
  insulator: BufferGeometry;
  terminal: BufferGeometry;
  centerElectrode: BufferGeometry;
  groundArm: BufferGeometry;
  groundLeg: BufferGeometry;
}

function buildGeometries(context: PartContext): PlugGeometries {
  const { tracker } = context;
  const p = SPARK_PLUG;
  const legHeight = p.tipDrop;
  const groundLeg = new BoxGeometry(p.groundWidth / 2, legHeight, p.groundWidth);
  groundLeg.translate(GROUND_ARM_OFFSET, -legHeight / 2, 0);
  const groundArm = new BoxGeometry(GROUND_ARM_OFFSET, GROUND_ARM_DEPTH, p.groundWidth);
  groundArm.translate(GROUND_ARM_OFFSET / 2, -p.tipDrop + GROUND_ARM_DEPTH / 2, 0);
  return {
    shell: tracker.track(verticalCylinder(p.shellRadius, 0, p.shellTop, RADIAL_SEGMENTS / 2)),
    hex: tracker.track(verticalCylinder(p.hexRadius, p.shellTop, p.hexTop, HEX_SIDES)),
    insulator: tracker.track(
      withCreasedNormals(new LatheGeometry(insulatorProfile(), RADIAL_SEGMENTS / 2)),
    ),
    terminal: tracker.track(
      verticalCylinder(p.terminalRadius, p.insulatorTop, p.terminalTop, RADIAL_SEGMENTS / 4),
    ),
    centerElectrode: tracker.track(
      verticalCylinder(p.electrodeRadius, -CENTER_ELECTRODE_LENGTH, 0, RADIAL_SEGMENTS / 4),
    ),
    groundArm: tracker.track(groundArm),
    groundLeg: tracker.track(groundLeg),
  };
}

function createGlow(texture: Texture, context: PartContext): Sprite {
  const material = context.tracker.track(
    new SpriteMaterial({
      map: texture,
      color: SPARK_COLOR,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    }),
  );
  const glow = new Sprite(material);
  glow.renderOrder = RENDER_ORDER.overlay;
  glow.position.y = -SPARK_PLUG.tipDrop / 2;
  glow.scale.setScalar(SPARK_PLUG.glowSize);
  glow.visible = false;
  return glow;
}

export function sparkPlugFactory(
  context: PartContext,
  glowTexture: Texture,
): (z: number) => SparkPlugPart {
  const geometries = buildGeometries(context);
  return (z) => {
    const object = new Group();
    object.position.z = z;
    const electrodeMaterial = context.tracker.track(createFinish('polished'));
    electrodeMaterial.emissive = SPARK_COLOR.clone();
    electrodeMaterial.emissiveIntensity = 0;
    context.materials.register('sparkPlug', electrodeMaterial);
    object.add(
      sharedMesh(context, geometries.shell, 'sparkPlug', 'forged'),
      sharedMesh(context, geometries.hex, 'sparkPlug', 'polished'),
      sharedMesh(context, geometries.insulator, 'sparkPlug', 'ceramic'),
      sharedMesh(context, geometries.terminal, 'sparkPlug', 'polished'),
    );
    [geometries.centerElectrode, geometries.groundArm, geometries.groundLeg].forEach((geometry) => {
      object.add(new Mesh(geometry, electrodeMaterial));
    });
    const glow = createGlow(glowTexture, context);
    object.add(glow);
    const labelAnchor = new Object3D();
    labelAnchor.position.set(SPARK_PLUG.insulatorRadius, SPARK_PLUG.insulatorTop, 0);
    object.add(labelAnchor);
    return {
      object,
      labelAnchor,
      setSpark: (intensity) => {
        electrodeMaterial.emissiveIntensity = intensity * SPARK_EMISSIVE_GAIN;
        glow.visible = intensity > 0;
        glow.material.opacity = intensity;
      },
    };
  };
}
