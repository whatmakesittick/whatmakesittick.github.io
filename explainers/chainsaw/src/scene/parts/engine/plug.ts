import {
  AdditiveBlending,
  BoxGeometry,
  CylinderGeometry,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Sprite,
  SpriteMaterial,
} from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { AssemblyState } from '../../../ids';
import { ENGINE_GEOMETRY, crownY } from '../../../model';
import { THEME } from '../../../theme';
import { CYLINDER, PLUG, SPARK, SPARK_LIGHT } from '../../constants';
import { mergeParts } from '../../geometry/merge';
import { addPart, label, namedGroup, registeredMaterial } from '../context';
import type { PartContext } from '../context';

const ROUND = 20;
const HEX = 6;
const GROUND_ELECTRODE = { width: 0.0016, drop: 0.0016, reach: 0.0032 } as const;
const BOOT_BOTTOM = 0.255;
const SPARK_HEIGHT = ENGINE_GEOMETRY.plugTip - 0.0012;
const GLOW_RADIUS = CYLINDER.bore - 0.0012;
const GLOW_OPACITY = 0.5;
const HAZE_OPACITY = 0.85;

function yCylinder(radius: number, bottom: number, top: number, segments = ROUND): BufferGeometry {
  const geometry = new CylinderGeometry(radius, radius, top - bottom, segments);
  geometry.translate(0, (bottom + top) / 2, 0);
  return geometry;
}

function metalParts(): BufferGeometry {
  const ground = new BoxGeometry(
    GROUND_ELECTRODE.reach,
    GROUND_ELECTRODE.width,
    GROUND_ELECTRODE.width,
  );
  ground.translate(
    GROUND_ELECTRODE.reach / 2 - 0.0008,
    ENGINE_GEOMETRY.plugTip - GROUND_ELECTRODE.drop,
    0,
  );
  return mergeParts([
    yCylinder(PLUG.tip, ENGINE_GEOMETRY.plugTip, CYLINDER.headInner + 0.002),
    yCylinder(PLUG.body, CYLINDER.headInner + 0.001, CYLINDER.headTop),
    yCylinder(PLUG.hex, CYLINDER.headTop, PLUG.hexTop, HEX),
    ground,
  ]);
}

export interface PlugParts {
  setState(state: AssemblyState, chamberShown: boolean): void;
}

export function buildPlug(context: PartContext, parent: Object3D, glowParent: Object3D): PlugParts {
  const plug = namedGroup('sparkPlug', parent);
  addPart(context, plug, metalParts(), 'sparkPlug', 'steel');
  addPart(
    context,
    plug,
    yCylinder(PLUG.body - 0.0004, PLUG.hexTop, ENGINE_GEOMETRY.plugTop),
    'sparkPlug',
  );
  addPart(
    context,
    plug,
    yCylinder(PLUG.hex - 0.001, BOOT_BOTTOM, PLUG.bootTop),
    'sparkPlug',
    'plugBoot',
  );
  label(context, 'sparkPlug', plug, [0, PLUG.hexTop + 0.006, PLUG.body]);

  const sparkMaterial = registeredMaterial(
    context,
    'sparkPlug',
    new SpriteMaterial({
      map: context.textures.glow,
      color: THEME.spark,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
  );
  const spark = new Sprite(sparkMaterial);
  spark.position.set(0, SPARK_HEIGHT, 0);
  spark.renderOrder = 2;
  plug.add(spark);

  const light = new PointLight(SPARK_LIGHT.color, 0, SPARK_LIGHT.distance, SPARK_LIGHT.decay);
  light.position.set(0, SPARK_HEIGHT, CYLINDER.bore);
  plug.add(light);

  const glowMaterial = registeredMaterial(
    context,
    'exhaustGas',
    new MeshBasicMaterial({
      color: THEME.burn,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  const chamber = new Mesh(
    context.tracker.track(yCylinder(GLOW_RADIUS, 0, 1, ROUND * 2)),
    glowMaterial,
  );
  glowParent.add(chamber);
  const hazeMaterial = registeredMaterial(
    context,
    'exhaustGas',
    new SpriteMaterial({
      map: context.textures.glow,
      color: THEME.burn,
      blending: AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    }),
  );
  const haze = new Sprite(hazeMaterial);
  haze.renderOrder = 1;
  glowParent.add(haze);

  return {
    setState: (state, chamberShown) => {
      const { sparkGlow, flows, angle } = state.crank;
      spark.visible = sparkGlow > 0;
      spark.scale.setScalar(SPARK.size * Math.max(sparkGlow, 0.001));
      const lit = chamberShown ? sparkGlow + flows.burn * SPARK_LIGHT.burnShare : 0;
      light.intensity = SPARK_LIGHT.intensity * lit;
      const crown = crownY(angle);
      const height = CYLINDER.headInner - crown;
      chamber.visible = flows.burn > 0;
      chamber.position.y = crown;
      chamber.scale.set(1, height, 1);
      glowMaterial.opacity = GLOW_OPACITY * flows.burn;
      haze.visible = flows.burn > 0;
      haze.position.set(0, crown + height / 2, 0);
      haze.scale.setScalar(SPARK.burnSize * (0.6 + 0.4 * flows.burn));
      hazeMaterial.opacity = HAZE_OPACITY * flows.burn;
    },
  };
}
